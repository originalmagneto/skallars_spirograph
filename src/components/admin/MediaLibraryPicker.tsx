"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy01Icon } from "hugeicons-react";

type MediaItem = {
  id: string;
  title: string | null;
  public_url: string;
  tags: string[] | null;
  created_at: string;
};

export default function MediaLibraryPicker({
  onSelect,
  onClose,
}: {
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["media-library"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_library")
        .select("id, title, public_url, tags, created_at")
        .order("created_at", { ascending: false });
      if (error) return [] as MediaItem[];
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

  return (
    <div className="mt-3 border rounded-lg p-3 bg-white space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Media Library</div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
      <Input
        placeholder="Search by title or tag"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {isLoading ? (
        <div className="text-xs text-muted-foreground">Loading...</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-xs text-muted-foreground">No images found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredItems.map((item) => (
            <div key={item.id} className="border rounded-lg overflow-hidden">
              <div className="aspect-[4/3] bg-muted">
                <img src={item.public_url} alt={item.title || ""} className="h-full w-full object-cover" />
              </div>
              <div className="p-2 space-y-2">
                <div className="text-xs font-medium">{item.title || "Untitled"}</div>
                <div className="flex flex-wrap gap-1">
                  {(item.tags || []).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => onSelect(item.public_url)}>
                    Use Image
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await navigator.clipboard.writeText(item.public_url);
                    }}
                  >
                    <Copy01Icon size={12} className="mr-1" />
                    Copy URL
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
