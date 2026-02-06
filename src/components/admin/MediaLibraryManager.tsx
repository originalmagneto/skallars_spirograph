"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Delete01Icon, Copy01Icon, Upload01Icon, Image01Icon } from "hugeicons-react";
import { AdminActionBar, AdminPanelHeader, AdminSectionCard } from "@/components/admin/AdminPrimitives";

type MediaItem = {
  id: string;
  title: string | null;
  file_path: string;
  public_url: string;
  bucket: string;
  tags: string[] | null;
  alt_text: string | null;
  created_at: string;
};

const sanitizeFileName = (name: string) => name.replace(/[^a-z0-9._-]+/gi, "-").toLowerCase();

export default function MediaLibraryManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["media-library"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_library")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("Could not fetch media library:", error);
        return [] as MediaItem[];
      }
      return (data as MediaItem[]) ?? [];
    },
  });

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => {
      const titleMatch = (item.title || "").toLowerCase().includes(term);
      const tagMatch = (item.tags || []).some((tag) => tag.toLowerCase().includes(term));
      return titleMatch || tagMatch;
    });
  }, [items, search]);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Select an image first.");
      setUploading(true);
      const safeName = sanitizeFileName(file.name);
      const filePath = `library/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("images").getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      const tagList = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const { error: insertError } = await supabase.from("media_library").insert({
        title: title || file.name,
        file_path: filePath,
        public_url: publicUrl,
        bucket: "images",
        tags: tagList,
      });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      toast.success("Image added to library");
      setFile(null);
      setTitle("");
      setTags("");
      queryClient.invalidateQueries({ queryKey: ["media-library"] });
    },
    onError: (error: any) => toast.error(error.message || "Upload failed"),
    onSettled: () => setUploading(false),
  });

  const deleteMutation = useMutation({
    mutationFn: async (item: MediaItem) => {
      await supabase.storage.from("images").remove([item.file_path]);
      const { error } = await supabase.from("media_library").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Image removed");
      queryClient.invalidateQueries({ queryKey: ["media-library"] });
    },
    onError: (error: any) => toast.error(error.message || "Delete failed"),
  });

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="space-y-6">
      <AdminPanelHeader
        title="Media Library"
        description="Upload and manage reusable images for content and articles."
      />

      <AdminSectionCard className="space-y-4">
        <div className="text-sm font-semibold flex items-center gap-2">
          <Image01Icon size={16} />
          Upload Image
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Optional name" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Tags</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. hero, services, team" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">File</Label>
            <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => uploadMutation.mutate()} disabled={!file || uploading}>
            <Upload01Icon size={14} className="mr-1" />
            {uploading ? "Uploading..." : "Upload Image"}
          </Button>
          <span className="text-xs text-muted-foreground">Uploads go to the `images` bucket.</span>
        </div>
      </AdminSectionCard>

      <AdminActionBar className="bg-white">
        <div className="flex w-full items-center justify-between gap-4">
          <div className="text-sm font-semibold">Library Items</div>
          <div className="w-full max-w-xs">
            <Input
              placeholder="Search by title or tag"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </AdminActionBar>

      {isLoading ? (
        <div className="text-xs text-muted-foreground">Loading media...</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-xs text-muted-foreground">No images yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div key={item.id} className="border rounded-lg overflow-hidden bg-white">
              <div className="aspect-[4/3] bg-muted">
                <img src={item.public_url} alt={item.title || ""} className="h-full w-full object-cover" />
              </div>
              <div className="p-3 space-y-2">
                <div className="text-sm font-medium">{item.title || "Untitled"}</div>
                <div className="flex flex-wrap gap-1">
                  {(item.tags || []).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyUrl(item.public_url)}>
                    <Copy01Icon size={14} className="mr-1" />
                    Copy URL
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(item)}>
                    <Delete01Icon size={14} />
                  </Button>
                </div>
                <div className="text-[10px] text-muted-foreground break-all">{item.public_url}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
