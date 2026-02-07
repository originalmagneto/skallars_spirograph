"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AdminActionBar, AdminPanelHeader, AdminSectionCard } from "@/components/admin/AdminPrimitives";

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

type BentoSize = "sm" | "md" | "lg" | "full";
type AnalyticsLayoutKey = "overview" | "trend" | "insights";

const ANALYTICS_LAYOUT_STORAGE_KEY = "admin:analytics:bento-layout:v1";
const BENTO_SIZE_CLASS: Record<BentoSize, string> = {
  sm: "xl:col-span-4",
  md: "xl:col-span-6",
  lg: "xl:col-span-8",
  full: "xl:col-span-12",
};
const ANALYTICS_LAYOUT_DEFAULTS: Record<AnalyticsLayoutKey, BentoSize> = {
  overview: "full",
  trend: "lg",
  insights: "md",
};

export default function AnalyticsDashboard() {
  const sinceIso = useMemo(() => daysAgo(30), []);
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(14);
  const [layout, setLayout] = useState<Record<AnalyticsLayoutKey, BentoSize>>(ANALYTICS_LAYOUT_DEFAULTS);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(ANALYTICS_LAYOUT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Record<AnalyticsLayoutKey, BentoSize>>;
      setLayout((prev) => ({ ...prev, ...parsed }));
    } catch {
      // ignore invalid persisted layout
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(ANALYTICS_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    } catch {
      // ignore storage failures
    }
  }, [layout]);

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
  const updateLayoutSize = (key: AnalyticsLayoutKey, size: BentoSize) => {
    setLayout((prev) => ({ ...prev, [key]: size }));
  };

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
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <AdminSectionCard className={`space-y-3 ${BENTO_SIZE_CLASS[layout.overview]}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Overview</p>
            <div className="flex items-center gap-2">
              <label htmlFor="analyticsOverviewSize" className="text-xs text-muted-foreground">Size</label>
              <select
                id="analyticsOverviewSize"
                value={layout.overview}
                onChange={(e) => updateLayoutSize("overview", e.target.value as BentoSize)}
                className="h-8 rounded-md border bg-white px-2 text-xs"
              >
                <option value="sm">S</option>
                <option value="md">M</option>
                <option value="lg">L</option>
                <option value="full">Full</option>
              </select>
            </div>
          </div>
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
        </AdminSectionCard>

        <AdminSectionCard className={`space-y-4 ${BENTO_SIZE_CLASS[layout.trend]}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Trend</p>
            <div className="flex items-center gap-2">
              <label htmlFor="analyticsTrendSize" className="text-xs text-muted-foreground">Size</label>
              <select
                id="analyticsTrendSize"
                value={layout.trend}
                onChange={(e) => updateLayoutSize("trend", e.target.value as BentoSize)}
                className="h-8 rounded-md border bg-white px-2 text-xs"
              >
                <option value="sm">S</option>
                <option value="md">M</option>
                <option value="lg">L</option>
                <option value="full">Full</option>
              </select>
            </div>
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
                        <div className="flex h-16 w-full items-end rounded bg-muted/40">
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
        </AdminSectionCard>

        <AdminSectionCard className={`space-y-4 ${BENTO_SIZE_CLASS[layout.insights]}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Insights</p>
            <div className="flex items-center gap-2">
              <label htmlFor="analyticsInsightsSize" className="text-xs text-muted-foreground">Size</label>
              <select
                id="analyticsInsightsSize"
                value={layout.insights}
                onChange={(e) => updateLayoutSize("insights", e.target.value as BentoSize)}
                className="h-8 rounded-md border bg-white px-2 text-xs"
              >
                <option value="sm">S</option>
                <option value="md">M</option>
                <option value="lg">L</option>
                <option value="full">Full</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
                      <div key={entry.articleId} className="flex items-center justify-between rounded-lg border px-3 py-2">
                        <div className="truncate text-sm font-medium">{label}</div>
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
                  We&apos;ll track CTA clicks and block views once the tracking script is enabled.
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
        </AdminSectionCard>
      </div>
    </div>
  );
}
