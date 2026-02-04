"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { generateAIImage } from "@/lib/aiService";
import { fetchAISettings, fetchGeminiModels, filterImageModels, resolveImageKey } from "@/lib/aiSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import ImageCropperModal from "@/components/admin/ImageCropperModal";
import { toast } from "sonner";
import {
  AiMagicIcon,
  Image01Icon,
  Copy01Icon,
  FloppyDiskIcon,
  Settings01Icon,
  Cancel01Icon,
} from "hugeicons-react";

type GeneratedItem = {
  id: string;
  url?: string;
  prompt: string;
  model: string;
  engine: string;
  aspect: string;
  width: number;
  height: number;
  seed?: number;
  createdAt: string;
  error?: string;
};

type ImageGenerationRow = {
  id: string;
  prompt: string;
  negative_prompt: string | null;
  style_preset: string | null;
  model: string | null;
  engine: string | null;
  aspect_ratio: string | null;
  width: number | null;
  height: number | null;
  seed: number | null;
  image_url: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
};

const STYLE_PRESETS = [
  { value: "Editorial", description: "Realistic, professional, no text overlay." },
  { value: "Minimal", description: "Clean, airy, restrained palette." },
  { value: "Modern Corporate", description: "Sharp lighting, glass + steel motifs." },
  { value: "Abstract", description: "Conceptual visuals with symbolic forms." },
  { value: "Social Card", description: "Shareable composition, bold focal area." },
];

const MOOD_TAGS = ["Trust", "Precision", "Innovation", "Stability", "Discretion", "Growth", "Protection"];
const NEGATIVE_PRESETS = ["No text overlay", "No people", "No logos", "No watermarks", "No busy background"];

const SOCIAL_TEMPLATES = [
  {
    id: "blog-cover",
    name: "Blog Cover",
    description: "Wide editorial hero image with space for headline.",
    aspect: "16:9",
    style: "Editorial",
    mood: ["Trust", "Precision"],
    palette: "deep navy, warm neutrals",
    basePrompt: "Create a professional editorial cover image for a law firm article. Emphasize sophistication and clarity.",
    negative: "No embedded text, no logos",
  },
  {
    id: "linkedin-post",
    name: "LinkedIn Card",
    description: "Social share card with clear focal area.",
    aspect: "1.91:1",
    style: "Social Card",
    mood: ["Stability", "Growth"],
    palette: "cool gray, soft blue accents",
    basePrompt: "Design a modern corporate social card background for a legal update.",
    negative: "No text, no people",
  },
  {
    id: "announcement",
    name: "Announcement",
    description: "Square or tall layout for announcements.",
    aspect: "1:1",
    style: "Modern Corporate",
    mood: ["Innovation", "Trust"],
    palette: "midnight blue, silver highlights",
    basePrompt: "Create an announcement graphic background that feels premium and trustworthy.",
    negative: "No text overlay",
  },
  {
    id: "event-invite",
    name: "Event Invite",
    description: "Tall layout with space for event details.",
    aspect: "3:4",
    style: "Minimal",
    mood: ["Discretion", "Precision"],
    palette: "soft ivory, muted slate",
    basePrompt: "Minimalist backdrop for a legal event invite, calm and refined.",
    negative: "No text, no busy patterns",
  },
];

const ASPECT_PRESETS: Record<string, { label: string; width: number; height: number }> = {
  "1:1": { label: "Square 1:1", width: 1024, height: 1024 },
  "16:9": { label: "Landscape 16:9", width: 1280, height: 720 },
  "9:16": { label: "Portrait 9:16", width: 720, height: 1280 },
  "4:3": { label: "Classic 4:3", width: 1024, height: 768 },
  "3:4": { label: "Tall 3:4", width: 768, height: 1024 },
  "1.91:1": { label: "Social 1.91:1", width: 1200, height: 630 },
};

const clampBatch = (value: number) => Math.max(1, Math.min(6, value));

const buildPrompt = ({
  basePrompt,
  stylePreset,
  mood,
  palette,
  negative,
  extra,
}: {
  basePrompt: string;
  stylePreset: string;
  mood: string[];
  palette: string;
  negative: string;
  extra: string;
}) => {
  const parts: string[] = [];
  if (basePrompt.trim()) parts.push(basePrompt.trim());
  if (stylePreset) parts.push(`Style: ${stylePreset}.`);
  if (mood.length > 0) parts.push(`Mood: ${mood.join(", ")}.`);
  if (palette.trim()) parts.push(`Palette: ${palette.trim()}.`);
  if (extra.trim()) parts.push(extra.trim());
  if (negative.trim()) parts.push(`Avoid: ${negative.trim()}.`);
  return parts.join("\n");
};

const dataUrlToBlob = async (dataUrl: string) => {
  const response = await fetch(dataUrl);
  return await response.blob();
};

const fetchBlob = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not fetch image");
  return await response.blob();
};

export default function ImageStudio() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [stylePreset, setStylePreset] = useState(STYLE_PRESETS[0].value);
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [palette, setPalette] = useState("");
  const [extraNotes, setExtraNotes] = useState("");
  const [overlayDraftText, setOverlayDraftText] = useState("");
  const [aspectPreset, setAspectPreset] = useState("16:9");
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");
  const [batchCount, setBatchCount] = useState(3);
  const [engineOverride, setEngineOverride] = useState<"settings" | "turbo" | "gemini">("settings");
  const [modelOverride, setModelOverride] = useState("");
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [seedBase, setSeedBase] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedItem[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [cropTarget, setCropTarget] = useState<GeneratedItem | null>(null);

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [aiSettings, setAiSettings] = useState<Awaited<ReturnType<typeof fetchAISettings>> | null>(null);
  const [imageModels, setImageModels] = useState<Array<{ name: string; displayName: string; description: string }>>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const snapshot = await fetchAISettings();
      setAiSettings(snapshot);
      const { data } = await supabase.from("settings").select("key, value");
      const map: Record<string, string> = {};
      (data || []).forEach((row: any) => {
        if (row.key) map[row.key] = row.value;
      });
      setSettings(map);
      const imageKey = resolveImageKey(snapshot);
      if (imageKey) {
        try {
          setModelsLoading(true);
          const models = await fetchGeminiModels(imageKey);
          setImageModels(filterImageModels(models).map((model) => ({
            name: model.name,
            displayName: model.displayName,
            description: model.description,
          })));
        } catch {
          setImageModels([]);
        } finally {
          setModelsLoading(false);
        }
      }
    };
    loadSettings();
  }, []);

  const { data: history = [], error: historyError } = useQuery({
    queryKey: ["image-generations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("image_generations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return (data || []) as ImageGenerationRow[];
    },
    retry: false,
  });

  const aspectConfig = useMemo(() => {
    if (aspectPreset === "custom") {
      const width = Number(customWidth) || 1024;
      const height = Number(customHeight) || 1024;
      return { width, height, label: "Custom" };
    }
    const preset = ASPECT_PRESETS[aspectPreset];
    return preset ? { width: preset.width, height: preset.height, label: preset.label } : { width: 1024, height: 1024, label: "Custom" };
  }, [aspectPreset, customWidth, customHeight]);

  const resolvedEngine = useMemo(() => {
    if (engineOverride === "settings") {
      if (!settings.image_model) return "turbo";
      return settings.image_model === "turbo" ? "turbo" : "gemini";
    }
    return engineOverride;
  }, [engineOverride, settings.image_model]);

  const resolvedModel = useMemo(() => {
    if (resolvedEngine === "turbo") return "turbo";
    if (useCustomModel && modelOverride.trim()) return modelOverride.trim();
    return settings.gemini_image_model || "imagen-3.0-generate-001";
  }, [resolvedEngine, useCustomModel, modelOverride, settings.gemini_image_model]);

  const finalPrompt = useMemo(() => {
    const overlayHint = overlayDraftText.trim()
      ? "Leave clear negative space for headline text. Do not render any text."
      : "";
    return buildPrompt({
      basePrompt: prompt,
      stylePreset,
      mood: moodTags,
      palette,
      negative: negativePrompt,
      extra: [extraNotes, overlayHint].filter(Boolean).join(" ").trim(),
    });
  }, [prompt, stylePreset, moodTags, palette, negativePrompt, extraNotes, overlayDraftText]);

  const toggleMood = (tag: string) => {
    setMoodTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const appendNegative = (value: string) => {
    if (!value) return;
    const existing = negativePrompt.trim();
    if (!existing) {
      setNegativePrompt(value);
      return;
    }
    if (existing.toLowerCase().includes(value.toLowerCase())) return;
    setNegativePrompt(`${existing}; ${value}`);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt first.");
      return;
    }
    if (resolvedEngine === "gemini" && !(settings.gemini_image_api_key || settings.gemini_api_key)) {
      toast.error("Gemini image key is missing. Add it in Settings or switch to Turbo.");
      return;
    }
    setGenerating(true);
    const count = clampBatch(batchCount);
    const batchId = crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const baseSeed = seedBase ? Number(seedBase) : undefined;

    for (let i = 0; i < count; i += 1) {
      const seed = typeof baseSeed === "number" ? baseSeed + i : undefined;
      try {
        const url = await generateAIImage(finalPrompt, {
          turbo: resolvedEngine === "turbo",
          width: aspectConfig.width,
          height: aspectConfig.height,
          aspectRatio: aspectPreset,
          model: resolvedEngine === "gemini" ? resolvedModel : undefined,
          seed,
        });
        const item: GeneratedItem = {
          id: `${batchId}-${i}`,
          url,
          prompt: finalPrompt,
          model: resolvedModel,
          engine: resolvedEngine,
          aspect: aspectPreset,
          width: aspectConfig.width,
          height: aspectConfig.height,
          seed,
          createdAt: new Date().toISOString(),
        };
        setGenerated((prev) => [item, ...prev]);
        try {
          const { error } = await supabase.from("image_generations").insert({
            batch_id: batchId,
            prompt: finalPrompt,
            negative_prompt: negativePrompt || null,
            style_preset: stylePreset,
            model: resolvedModel,
            engine: resolvedEngine,
            aspect_ratio: aspectPreset,
            width: aspectConfig.width,
            height: aspectConfig.height,
            seed,
            image_url: url,
            status: "success",
            created_by: user?.id ?? null,
            metadata: {
              mood: moodTags,
              palette: palette || null,
            },
          });
          if (error) throw error;
        } catch {
          // non-blocking logging
        }
      } catch (error: any) {
        const message = error?.message || "Generation failed.";
        const failedItem: GeneratedItem = {
          id: `${batchId}-${i}`,
          prompt: finalPrompt,
          model: resolvedModel,
          engine: resolvedEngine,
          aspect: aspectPreset,
          width: aspectConfig.width,
          height: aspectConfig.height,
          seed,
          createdAt: new Date().toISOString(),
          error: message,
        };
        setGenerated((prev) => [failedItem, ...prev]);
        try {
          const { error } = await supabase.from("image_generations").insert({
            batch_id: batchId,
            prompt: finalPrompt,
            negative_prompt: negativePrompt || null,
            style_preset: stylePreset,
            model: resolvedModel,
            engine: resolvedEngine,
            aspect_ratio: aspectPreset,
            width: aspectConfig.width,
            height: aspectConfig.height,
            seed,
            status: "error",
            error_message: message,
            created_by: user?.id ?? null,
          });
          if (error) throw error;
        } catch {
          // non-blocking logging
        }
      }
    }
    setGenerating(false);
    queryClient.invalidateQueries({ queryKey: ["image-generations"] });
    toast.success("Generation complete.");
  };

  const saveToLibrary = async (item: GeneratedItem) => {
    if (!item.url) return;
    try {
      const blob = item.url.startsWith("data:") ? await dataUrlToBlob(item.url) : await fetchBlob(item.url);
      const filePath = `library/ai-${Date.now()}-${item.id}.png`;
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(filePath, blob, { contentType: blob.type || "image/png" });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("images").getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      const tags = ["ai-generated", stylePreset.toLowerCase().replace(/\s+/g, "-")];
      await supabase.from("media_library").insert({
        title: `AI Studio - ${stylePreset}`,
        file_path: filePath,
        public_url: publicUrl,
        bucket: "images",
        tags,
        alt_text: prompt.trim() || null,
      });
      toast.success("Saved to Media Library");
      queryClient.invalidateQueries({ queryKey: ["media-library"] });
    } catch (error: any) {
      toast.error(error?.message || "Failed to save image.");
    }
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(finalPrompt);
      toast.success("Prompt copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const compareItems = compareIds
    .map((id) => generated.find((item) => item.id === id))
    .filter(Boolean) as GeneratedItem[];

  const applyTemplate = (template: typeof SOCIAL_TEMPLATES[number]) => {
    setPrompt(template.basePrompt);
    setStylePreset(template.style);
    setMoodTags(template.mood);
    setPalette(template.palette);
    setNegativePrompt(template.negative);
    setAspectPreset(template.aspect);
    setOverlayDraftText("");
    toast.success(`Template applied: ${template.name}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold flex items-center gap-2">
            <AiMagicIcon size={16} />
            Image Studio
          </div>
          <p className="text-xs text-muted-foreground">
            Generate, compare, and curate on-brand visuals with prompt guidance and batch controls.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={copyPrompt}>
          <Copy01Icon size={14} className="mr-1" />
          Copy Prompt
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.05fr,1.3fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prompt Builder</CardTitle>
            <CardDescription>Craft a clear, repeatable visual direction.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Social Templates</Label>
                <span className="text-[11px] text-muted-foreground">One-click layout presets</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SOCIAL_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className="text-left rounded-lg border bg-white p-3 hover:border-primary/60 hover:shadow-sm transition"
                  >
                    <div className="text-sm font-semibold">{template.name}</div>
                    <div className="text-[11px] text-muted-foreground">{template.description}</div>
                    <div className="mt-2 text-[10px] text-muted-foreground">
                      {template.aspect} · {template.style}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Core Prompt</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the subject, setting, and intent of the image."
                className="min-h-[120px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Style Preset</Label>
                <Select value={stylePreset} onValueChange={setStylePreset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a style" />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLE_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {STYLE_PRESETS.find((preset) => preset.value === stylePreset)?.description}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Palette / Color Notes</Label>
                <Input
                  value={palette}
                  onChange={(e) => setPalette(e.target.value)}
                  placeholder="e.g. deep navy, silver highlights"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Mood Tags</Label>
              <div className="flex flex-wrap gap-2">
                {MOOD_TAGS.map((tag) => (
                  <Button
                    key={tag}
                    type="button"
                    variant={moodTags.includes(tag) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleMood(tag)}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Additional Notes</Label>
              <Input
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
                placeholder="Camera angle, lighting style, composition notes"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Headline / Overlay Text (optional)</Label>
              <Input
                value={overlayDraftText}
                onChange={(e) => setOverlayDraftText(e.target.value)}
                placeholder="Used in editor overlay. Leave empty to skip."
              />
              <p className="text-[11px] text-muted-foreground">
                If set, the prompt will reserve space for this text and the editor will preload it.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Negative Prompt (Avoid)</Label>
              <Input
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="e.g. no text overlay, no people"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {NEGATIVE_PRESETS.map((preset) => (
                  <Button key={preset} type="button" size="sm" variant="outline" onClick={() => appendNegative(preset)}>
                    {preset}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generation Controls</CardTitle>
            <CardDescription>Choose engine, model, and output layout.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Aspect Ratio</Label>
                <Select value={aspectPreset} onValueChange={setAspectPreset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ratio" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ASPECT_PRESETS).map(([key, preset]) => (
                      <SelectItem key={key} value={key}>
                        {preset.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom Size</SelectItem>
                  </SelectContent>
                </Select>
                {aspectPreset === "custom" && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={customWidth}
                      onChange={(e) => setCustomWidth(e.target.value)}
                      placeholder="Width"
                    />
                    <Input
                      value={customHeight}
                      onChange={(e) => setCustomHeight(e.target.value)}
                      placeholder="Height"
                    />
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Output: {aspectConfig.width} × {aspectConfig.height}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Batch Count</Label>
                <Slider
                  value={[batchCount]}
                  onValueChange={(value) => setBatchCount(clampBatch(value[0] || 1))}
                  min={1}
                  max={6}
                  step={1}
                />
                <p className="text-[11px] text-muted-foreground">{batchCount} images per run</p>
              </div>
            </div>

              <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold flex items-center gap-2">
                  <Settings01Icon size={14} />
                  Engine & Model
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Default engine: {settings.image_model || "turbo"}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Engine</Label>
                  <Select value={engineOverride} onValueChange={(value) => setEngineOverride(value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Engine" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="settings">Use Settings</SelectItem>
                      <SelectItem value="turbo">Turbo (Pollinations)</SelectItem>
                      <SelectItem value="gemini">Gemini / Imagen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs">Gemini Image Model</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Switch checked={useCustomModel} onCheckedChange={setUseCustomModel} />
                    <span className="text-xs text-muted-foreground">Custom model</span>
                  </div>
                  {useCustomModel ? (
                    <Input
                      value={modelOverride}
                      onChange={(e) => setModelOverride(e.target.value)}
                      placeholder="imagen-3.0-generate-001"
                    />
                  ) : (
                    <Select value={modelOverride || settings.gemini_image_model || ""} onValueChange={setModelOverride}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={settings.gemini_image_model || "imagen-3.0-generate-001"}>
                          Default ({settings.gemini_image_model || "imagen-3.0-generate-001"})
                        </SelectItem>
                        {imageModels.map((model) => (
                          <SelectItem key={model.name} value={model.name}>
                            {model.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                    {modelsLoading ? (
                      <span>Loading models…</span>
                    ) : (
                      <span>{imageModels.length} models available</span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const apiKey = aiSettings ? resolveImageKey(aiSettings) : '';
                        if (!apiKey) {
                          toast.error("No Gemini image key configured.");
                          return;
                        }
                        try {
                          setModelsLoading(true);
                          const models = await fetchGeminiModels(apiKey);
                          setImageModels(filterImageModels(models).map((model) => ({
                            name: model.name,
                            displayName: model.displayName,
                            description: model.description,
                          })));
                          toast.success("Image models refreshed");
                        } catch {
                          toast.error("Could not refresh models.");
                        } finally {
                          setModelsLoading(false);
                        }
                      }}
                    >
                      Refresh
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Seed (optional)</Label>
                  <Input
                    value={seedBase}
                    onChange={(e) => setSeedBase(e.target.value)}
                    placeholder="e.g. 42"
                  />
                  <p className="text-[11px] text-muted-foreground">Turbo only. Leave blank for random seeds.</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Resolved Model</Label>
                  <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground bg-muted/40">
                    {resolvedEngine === "turbo" ? "Turbo (Pollinations Flux)" : resolvedModel}
                  </div>
                </div>
              </div>
            </div>

            {resolvedEngine === "gemini" && !(settings.gemini_image_api_key || settings.gemini_api_key) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Gemini image key not configured. Add it in Settings or switch to Turbo.
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleGenerate} disabled={generating}>
                <AiMagicIcon size={16} className="mr-2" />
                {generating ? "Generating..." : "Generate Images"}
              </Button>
              <Button
                variant="outline"
                disabled={generating}
                onClick={() => {
                  setPrompt("");
                  setNegativePrompt("");
                  setExtraNotes("");
                  setOverlayDraftText("");
                  setMoodTags([]);
                  setPalette("");
                  toast.success("Prompt cleared");
                }}
              >
                Clear
              </Button>
              <div className="text-xs text-muted-foreground">
                Engine: {resolvedEngine.toUpperCase()} · {aspectConfig.width}×{aspectConfig.height}
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-2">
              <div className="font-semibold text-muted-foreground">Prompt Preview</div>
              <pre className="whitespace-pre-wrap text-[11px] text-muted-foreground">{finalPrompt || "Start typing to preview the final prompt."}</pre>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle className="text-base">Generated Gallery</CardTitle>
            <CardDescription>Preview, compare, crop, and save to Media Library.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={compareMode} onCheckedChange={setCompareMode} />
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              Compare mode
            </span>
            {compareMode && compareIds.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setCompareIds([])}>
                <Cancel01Icon size={14} className="mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {compareMode && compareItems.length === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {compareItems.map((item) => (
                <div key={item.id} className="border rounded-xl overflow-hidden bg-white shadow-sm">
                  <div className="aspect-video bg-muted">
                    {item.url ? (
                      <img src={item.url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-1">
                    <div className="text-xs font-semibold">Model: {item.model}</div>
                    <div className="text-[11px] text-muted-foreground line-clamp-2">{item.prompt}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {generated.length === 0 ? (
            <div className="text-xs text-muted-foreground">No generated images yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {generated.map((item) => (
                <div key={item.id} className="border rounded-xl overflow-hidden bg-white shadow-sm">
                  <div className="aspect-[4/3] bg-muted relative">
                    {item.url ? (
                      <img src={item.url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                        {item.error || "No image"}
                      </div>
                    )}
                    {compareMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setCompareIds((prev) => {
                            if (prev.includes(item.id)) return prev.filter((id) => id !== item.id);
                            if (prev.length >= 2) return [prev[1], item.id];
                            return [...prev, item.id];
                          });
                        }}
                        className={`absolute top-2 left-2 text-xs px-2 py-1 rounded-full border ${
                          compareIds.includes(item.id) ? "bg-primary text-white border-primary" : "bg-white/80"
                        }`}
                      >
                        {compareIds.includes(item.id) ? "Selected" : "Compare"}
                      </button>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-[10px]">{item.engine}</Badge>
                      <Badge variant="outline" className="text-[10px]">{item.aspect}</Badge>
                      {item.seed ? <Badge variant="outline" className="text-[10px]">Seed {item.seed}</Badge> : null}
                    </div>
                    <div className="text-[11px] text-muted-foreground line-clamp-2">{item.prompt}</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => saveToLibrary(item)} disabled={!item.url}>
                        <FloppyDiskIcon size={14} className="mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => item.url && setCropTarget(item)} disabled={!item.url}>
                        <Image01Icon size={14} className="mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generation History</CardTitle>
          <CardDescription>Recently generated images and prompts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {historyError ? (
            <div className="text-xs text-amber-600">
              History table not available. Run `supabase/image_generations.sql` to enable logs.
            </div>
          ) : history.length === 0 ? (
            <div className="text-xs text-muted-foreground">No history yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((row) => (
                <div key={row.id} className="border rounded-lg overflow-hidden bg-white">
                  <div className="aspect-[4/3] bg-muted">
                    {row.image_url ? (
                      <img src={row.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                        {row.status === "error" ? "Failed" : "No image"}
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {row.engine && <Badge variant="secondary" className="text-[10px]">{row.engine}</Badge>}
                      {row.aspect_ratio && <Badge variant="outline" className="text-[10px]">{row.aspect_ratio}</Badge>}
                    </div>
                    <div className="text-[11px] text-muted-foreground line-clamp-2">{row.prompt}</div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setPrompt(row.prompt);
                        setStylePreset(row.style_preset || STYLE_PRESETS[0].value);
                        setNegativePrompt(row.negative_prompt || "");
                        if (row.aspect_ratio) setAspectPreset(row.aspect_ratio);
                        toast.success("Prompt loaded");
                      }}
                    >
                      Reuse Prompt
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ImageCropperModal
        open={!!cropTarget}
        imageUrl={cropTarget?.url || ""}
        enableEnhancements
        enableTextOverlay
        defaultOverlayText={overlayDraftText}
        onClose={() => setCropTarget(null)}
        onComplete={() => setCropTarget(null)}
        label="Image Studio Crop"
        tags={["ai-generated", "cropped"]}
      />
    </div>
  );
}
