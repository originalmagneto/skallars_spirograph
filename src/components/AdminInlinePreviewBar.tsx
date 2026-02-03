"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type DraftRow = {
  key: string;
  draft_value_sk: string | null;
  draft_value_en: string | null;
  draft_value_de: string | null;
  draft_value_cn: string | null;
};

export default function AdminInlinePreviewBar() {
  const { isAdmin, isEditor, user } = useAuth();
  const canView = isAdmin || isEditor;

  const { data: drafts, isFetching, refetch } = useQuery({
    queryKey: ["site-content-drafts"],
    enabled: Boolean(canView && user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select("key, draft_value_sk, draft_value_en, draft_value_de, draft_value_cn");
      if (error) throw error;
      return (data as DraftRow[]) || [];
    },
    staleTime: 20 * 1000,
  });

  const draftSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!drafts) return counts;
    drafts.forEach((row) => {
      const hasDraft =
        (row.draft_value_sk && row.draft_value_sk.trim().length > 0) ||
        (row.draft_value_en && row.draft_value_en.trim().length > 0) ||
        (row.draft_value_de && row.draft_value_de.trim().length > 0) ||
        (row.draft_value_cn && row.draft_value_cn.trim().length > 0);
      if (!hasDraft) return;
      const section = row.key.split(".")[0] || "general";
      counts[section] = (counts[section] || 0) + 1;
    });
    return counts;
  }, [drafts]);

  if (!canView) return null;

  const sections = Object.entries(draftSummary).sort((a, b) => b[1] - a[1]);
  const totalDrafts = sections.reduce((sum, [, count]) => sum + count, 0);

  const handleHighlight = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("admin:highlight-sections", { detail: true }));
  };

  const handleFocusEdit = (section: string) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("admin:focus-section", { detail: section }));
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[320px] rounded-xl border bg-white/95 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="text-sm font-semibold">Admin Preview</div>
        <Badge variant={totalDrafts > 0 ? "secondary" : "outline"}>
          {totalDrafts > 0 ? `${totalDrafts} drafts` : "No drafts"}
        </Badge>
      </div>
      <div className="px-4 py-3 space-y-2">
        {sections.length === 0 && (
          <div className="text-xs text-muted-foreground">
            Drafts will show here once saved in Content Manager.
          </div>
        )}
        {sections.map(([section, count]) => (
          <button
            key={section}
            type="button"
            onClick={() => handleFocusEdit(section)}
            className="flex w-full items-center justify-between rounded-md px-2 py-1 text-xs hover:bg-muted"
          >
            <span className="capitalize">{section}</span>
            <Badge variant="outline">{count}</Badge>
          </button>
        ))}
      </div>
      <div className="px-4 py-3 border-t flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? "Refreshing..." : "Refresh"}
        </Button>
        <Button size="sm" variant="outline" onClick={handleHighlight}>
          Highlight
        </Button>
        <Button size="sm" asChild>
          <Link href="/admin">Open Admin</Link>
        </Button>
      </div>
    </div>
  );
}
