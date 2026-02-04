"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Cancel01Icon, Tick01Icon } from "hugeicons-react";

type CropAspect = "square" | "landscape";

const ASPECTS: Record<CropAspect, number> = {
  square: 1,
  landscape: 3 / 2,
};

const PREVIEW_WIDTH = 360;
const OUTPUT_WIDTH = 1200;

export default function ImageCropperModal({
  open,
  imageUrl,
  initialAspect = "landscape",
  aspectOptions = ["square", "landscape"],
  label,
  tags,
  folder = "cropped",
  enableEnhancements = false,
  enableTextOverlay = false,
  defaultOverlayText = "",
  onClose,
  onComplete,
}: {
  open: boolean;
  imageUrl: string;
  initialAspect?: CropAspect;
  aspectOptions?: CropAspect[];
  label?: string;
  tags?: string[];
  folder?: string;
  enableEnhancements?: boolean;
  enableTextOverlay?: boolean;
  defaultOverlayText?: string;
  onClose: () => void;
  onComplete: (url: string) => void;
}) {
  const [aspect, setAspect] = useState<CropAspect>(initialAspect);
  const [zoom, setZoom] = useState(1);
  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(50);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [saturation, setSaturation] = useState(1);
  const [overlayText, setOverlayText] = useState("");
  const [overlaySize, setOverlaySize] = useState(42);
  const [overlayColor, setOverlayColor] = useState("#ffffff");
  const [overlayAlign, setOverlayAlign] = useState<"left" | "center" | "right">("center");
  const [overlayPosY, setOverlayPosY] = useState(70);
  const [overlayShadow, setOverlayShadow] = useState(true);

  useEffect(() => {
    if (!open) return;
    setAspect(initialAspect);
    setZoom(1);
    setPosX(50);
    setPosY(50);
    setBrightness(1);
    setContrast(1);
    setSaturation(1);
    setOverlayText(defaultOverlayText || "");
    setOverlaySize(42);
    setOverlayColor("#ffffff");
    setOverlayAlign("center");
    setOverlayPosY(70);
    setOverlayShadow(true);
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImgEl(img);
    img.onerror = () => setImgEl(null);
    img.src = imageUrl;
  }, [open, imageUrl, initialAspect, defaultOverlayText]);

  const aspectRatio = ASPECTS[aspect];
  const previewHeight = Math.round(PREVIEW_WIDTH / aspectRatio);

  const previewBackground = useMemo(() => {
    if (!imgEl) return {};
    const coverScale = Math.max(PREVIEW_WIDTH / imgEl.width, previewHeight / imgEl.height);
    const drawW = imgEl.width * coverScale * zoom;
    const drawH = imgEl.height * coverScale * zoom;
    return {
      backgroundImage: `url(${imageUrl})`,
      backgroundSize: `${drawW}px ${drawH}px`,
      backgroundPosition: `${posX}% ${posY}%`,
    };
  }, [imgEl, imageUrl, previewHeight, zoom, posX, posY]);

  const handleSave = async () => {
    if (!imgEl) {
      toast.error("Image not loaded yet.");
      return;
    }
    setIsSaving(true);
    try {
      const outputHeight = Math.round(OUTPUT_WIDTH / aspectRatio);
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_WIDTH;
      canvas.height = outputHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported.");

      const coverScale = Math.max(OUTPUT_WIDTH / imgEl.width, outputHeight / imgEl.height);
      const drawW = imgEl.width * coverScale * zoom;
      const drawH = imgEl.height * coverScale * zoom;
      const offsetX = (OUTPUT_WIDTH - drawW) * (posX / 100);
      const offsetY = (outputHeight - drawH) * (posY / 100);

      if (enableEnhancements) {
        ctx.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
      }
      ctx.drawImage(imgEl, offsetX, offsetY, drawW, drawH);
      ctx.filter = "none";

      if (enableTextOverlay && overlayText.trim()) {
        const safeText = overlayText.trim();
        ctx.fillStyle = overlayColor;
        ctx.textAlign = overlayAlign;
        ctx.textBaseline = "middle";
        ctx.font = `600 ${overlaySize}px "Avenir Next", "Segoe UI", sans-serif`;

        if (overlayShadow) {
          ctx.shadowColor = "rgba(0,0,0,0.45)";
          ctx.shadowBlur = 12;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 4;
        } else {
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
        }

        const lines = safeText.split("\n").map((line) => line.trim()).filter(Boolean);
        const lineHeight = overlaySize * 1.2;
        const totalHeight = lines.length * lineHeight;
        const baseY = outputHeight * (overlayPosY / 100) - totalHeight / 2;
        const x =
          overlayAlign === "left" ? OUTPUT_WIDTH * 0.08 :
          overlayAlign === "right" ? OUTPUT_WIDTH * 0.92 :
          OUTPUT_WIDTH * 0.5;
        lines.forEach((line, idx) => {
          ctx.fillText(line, x, baseY + idx * lineHeight);
        });
      }

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.92));
      if (!blob) throw new Error("Could not create cropped image.");

      const filePath = `${folder}/crop-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(filePath, blob, { contentType: "image/png" });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("images").getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      try {
        await supabase.from("media_library").insert({
          title: label || "Cropped image",
          file_path: filePath,
          public_url: publicUrl,
          bucket: "images",
          tags: tags || [],
        });
      } catch (error) {
        console.warn("Could not insert into media library:", error);
      }

      toast.success("Crop saved");
      onComplete(publicUrl);
    } catch (error: any) {
      if (String(error?.message || "").includes("tainted")) {
        toast.error("Cannot crop this image (CORS blocked). Upload it first.");
      } else {
        toast.error(error?.message || "Crop failed.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold">
            {enableEnhancements || enableTextOverlay ? "Edit Image" : "Crop Image"}
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <Cancel01Icon size={14} />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[auto,1fr] gap-6">
          <div className="flex flex-col items-center gap-3">
            <div
              className="relative rounded-lg border bg-muted overflow-hidden"
              style={{ width: PREVIEW_WIDTH, height: previewHeight }}
            >
              <div
                className="absolute inset-0"
                style={{
                  ...previewBackground,
                  filter: enableEnhancements
                    ? `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`
                    : undefined,
                }}
              />
              {enableTextOverlay && overlayText.trim() && (
                <div
                  className="absolute left-0 right-0 flex items-center px-6 text-center"
                  style={{
                    top: `${overlayPosY}%`,
                    transform: "translateY(-50%)",
                    color: overlayColor,
                    fontSize: `${overlaySize}px`,
                    fontWeight: 600,
                    textShadow: overlayShadow ? "0 6px 18px rgba(0,0,0,0.45)" : "none",
                    justifyContent: overlayAlign === "left" ? "flex-start" : overlayAlign === "right" ? "flex-end" : "center",
                    textAlign: overlayAlign as any,
                  }}
                >
                  <div className="whitespace-pre-line">{overlayText}</div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {aspectOptions.map((option) => (
                <Button
                  key={option}
                  size="sm"
                  variant={aspect === option ? "default" : "outline"}
                  onClick={() => setAspect(option)}
                >
                  {option === "square" ? "Square" : "Landscape"}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Zoom</Label>
              <input
                type="range"
                min="1"
                max="2.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Horizontal Position</Label>
              <input
                type="range"
                min="0"
                max="100"
                value={posX}
                onChange={(e) => setPosX(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Vertical Position</Label>
              <input
                type="range"
                min="0"
                max="100"
                value={posY}
                onChange={(e) => setPosY(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
            {enableEnhancements && (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                <div className="text-xs font-semibold text-muted-foreground">Enhance</div>
                <div className="space-y-2">
                  <Label className="text-xs">Brightness</Label>
                  <input
                    type="range"
                    min="0.7"
                    max="1.3"
                    step="0.05"
                    value={brightness}
                    onChange={(e) => setBrightness(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Contrast</Label>
                  <input
                    type="range"
                    min="0.7"
                    max="1.3"
                    step="0.05"
                    value={contrast}
                    onChange={(e) => setContrast(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Saturation</Label>
                  <input
                    type="range"
                    min="0.6"
                    max="1.4"
                    step="0.05"
                    value={saturation}
                    onChange={(e) => setSaturation(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setBrightness(1);
                    setContrast(1);
                    setSaturation(1);
                  }}
                >
                  Reset adjustments
                </Button>
              </div>
            )}
            {enableTextOverlay && (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                <div className="text-xs font-semibold text-muted-foreground">Text Overlay</div>
                <div className="space-y-2">
                  <Label className="text-xs">Overlay Text</Label>
                  <textarea
                    value={overlayText}
                    onChange={(e) => setOverlayText(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="Add a short headline or caption"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Text Size</Label>
                    <input
                      type="range"
                      min="18"
                      max="72"
                      step="2"
                      value={overlaySize}
                      onChange={(e) => setOverlaySize(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Color</Label>
                    <input
                      type="color"
                      value={overlayColor}
                      onChange={(e) => setOverlayColor(e.target.value)}
                      className="h-9 w-full rounded-md border"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Alignment</Label>
                    <div className="flex gap-2">
                      {(["left", "center", "right"] as const).map((align) => (
                        <Button
                          key={align}
                          type="button"
                          size="sm"
                          variant={overlayAlign === align ? "default" : "outline"}
                          onClick={() => setOverlayAlign(align)}
                        >
                          {align}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Vertical Position</Label>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      value={overlayPosY}
                      onChange={(e) => setOverlayPosY(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="overlay-shadow"
                    type="checkbox"
                    checked={overlayShadow}
                    onChange={(e) => setOverlayShadow(e.target.checked)}
                  />
                  <Label htmlFor="overlay-shadow" className="text-xs">Text shadow</Label>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 pt-2">
              <Button onClick={handleSave} disabled={isSaving || !imgEl}>
                <Tick01Icon size={14} className="mr-1" />
                {isSaving ? "Saving..." : enableEnhancements || enableTextOverlay ? "Save Image" : "Save Crop"}
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Tip: If cropping fails for a URL, upload the image first (avoids CORS issues).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
