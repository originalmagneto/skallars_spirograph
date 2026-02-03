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
  onClose: () => void;
  onComplete: (url: string) => void;
}) {
  const [aspect, setAspect] = useState<CropAspect>(initialAspect);
  const [zoom, setZoom] = useState(1);
  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(50);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAspect(initialAspect);
    setZoom(1);
    setPosX(50);
    setPosY(50);
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImgEl(img);
    img.onerror = () => setImgEl(null);
    img.src = imageUrl;
  }, [open, imageUrl, initialAspect]);

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

      ctx.drawImage(imgEl, offsetX, offsetY, drawW, drawH);

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
          <div className="text-sm font-semibold">Crop Image</div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <Cancel01Icon size={14} />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[auto,1fr] gap-6">
          <div className="flex flex-col items-center gap-3">
            <div
              className="rounded-lg border bg-muted overflow-hidden"
              style={{ width: PREVIEW_WIDTH, height: previewHeight, ...previewBackground }}
            />
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
            <div className="flex items-center gap-2 pt-2">
              <Button onClick={handleSave} disabled={isSaving || !imgEl}>
                <Tick01Icon size={14} className="mr-1" />
                {isSaving ? "Saving..." : "Save Crop"}
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
