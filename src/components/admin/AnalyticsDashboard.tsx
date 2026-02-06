"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AdminActionBar, AdminPanelHeader } from "@/components/admin/AdminPrimitives";

type ArticleRow = {
  id: string;
  title_sk: string | null;
  title_en: string | null;
  slug: string | null;
  is_published: boolean | null;
};

type ViewRow = {
  article_id: string;
  viewed_at: string;
};

const daysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

const formatDate = (value: string) => {
  try {
    return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return value;
  }
};

export default function AnalyticsDashboard() {
  const sinceIso = useMemo(() => daysAgo(30), []);
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(14);

  const { data: articles = [] } = useQuery({
    queryKey: ["analytics-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title_sk, title_en, slug, is_published");
      if (error) throw error;
      return (data || []) as ArticleRow[];
    },
    retry: false,
  });

  const { data: views = [], error: viewsError } = useQuery({
    queryKey: ["article-views-30d"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("article_views")
        .select("article_id, viewed_at")
        .gte("viewed_at", sinceIso);
      if (error) throw error;
      return (data || []) as ViewRow[];
    },
    retry: false,
  });

  const { totals, topArticles, dailyCounts } = useMemo(() => {
    const totals: Record<string, number> = {};
    views.forEach((view) => {
      totals[view.article_id] = (totals[view.article_id] || 0) + 1;
    });
    const topArticles = Object.entries(totals)
      .map(([articleId, count]) => ({ articleId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const dailyCounts: Record<string, number> = {};
    views.forEach((view) => {
      const day = view.viewed_at.slice(0, 10);
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    });

    return { totals, topArticles, dailyCounts };
  }, [views]);

  const totalViews = views.length;
  const publishedCount = articles.filter((a) => a.is_published).length;
  const viewedArticleCount = Object.keys(totals).length;
  const maxDaily = Math.max(1, ...Object.values(dailyCounts));

  const chartDays = useMemo(() => {
    const days: string[] = [];
    const now = new Date();
    for (let i = rangeDays - 1; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }, [rangeDays]);

  if (viewsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
          <CardDescription>Article performance overview.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-amber-700">
          Analytics tables not available yet. Run `supabase/article_views.sql` to enable tracking.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPanelHeader
        title="Analytics"
        description="View article performance and recent traffic trends."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Views (30d)</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{totalViews}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Published Articles</CardTitle>
            <CardDescription>Currently live</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{publishedCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Avg. Views / Article</CardTitle>
            <CardDescription>30 day average</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {publishedCount ? Math.round(totalViews / publishedCount) : 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Viewed Articles</CardTitle>
            <CardDescription>At least one view in 30d</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{viewedArticleCount}</CardContent>
        </Card>
      </div>

      <AdminActionBar>
        <div className="flex w-full items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">Chart window</div>
          <div className="flex items-center gap-2">
            {[7, 14, 30].map((days) => (
              <Button
                key={days}
                size="sm"
                variant={rangeDays === days ? "default" : "outline"}
                className="h-8"
                onClick={() => setRangeDays(days as 7 | 14 | 30)}
              >
                {days}d
              </Button>
            ))}
          </div>
        </div>
      </AdminActionBar>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Daily Views ({rangeDays}d)</CardTitle>
          <CardDescription>Recent traffic trend</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="grid min-w-[700px] grid-cols-7 gap-2 text-[10px] text-muted-foreground lg:min-w-0 lg:grid-cols-14">
              {chartDays.map((day) => {
                const count = dailyCounts[day] || 0;
                const barHeight = Math.max(8, Math.round((count / maxDaily) * 100));
                return (
                  <div key={day} className="flex flex-col items-center gap-2">
                    <div className="w-full h-16 rounded bg-muted/40 flex items-end">
                      <div
                        className="w-full rounded bg-primary/70"
                        style={{ height: `${barHeight}%` }}
                      />
                    </div>
                    <span>{formatDate(day)}</span>
                    <span className="text-xs font-semibold text-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top Articles (30d)</CardTitle>
            <CardDescription>Most viewed content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topArticles.length === 0 ? (
              <div className="text-xs text-muted-foreground">No views yet.</div>
            ) : (
              topArticles.map((entry) => {
                const article = articles.find((a) => a.id === entry.articleId);
                const label = article?.title_sk || article?.title_en || article?.slug || "Untitled";
                return (
                  <div key={entry.articleId} className="flex items-center justify-between border rounded-lg px-3 py-2">
                    <div className="text-sm font-medium truncate">{label}</div>
                    <Badge variant="secondary">{entry.count} views</Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Content Block Engagement</CardTitle>
            <CardDescription>Coming next</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground">
              We’ll track CTA clicks and block views once the tracking script is enabled.
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.info("Block analytics will ship in the next step.")}
            >
              Enable tracking
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
