"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { AdminActionBar, AdminPanelHeader, AdminSectionCard } from "@/components/admin/AdminPrimitives";

type ArticleRow = {
  id: string;
  title_sk: string | null;
  title_en: string | null;
  slug: string | null;
  status: string | null;
  is_published: boolean | null;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
};

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  review: "bg-blue-100 text-blue-700",
  scheduled: "bg-amber-100 text-amber-700",
  published: "bg-emerald-100 text-emerald-700",
};

const statusLabel = (row: ArticleRow) => {
  const status = row.status || (row.is_published ? "published" : "draft");
  return status;
};

const toLabel = (row: ArticleRow) => row.title_sk || row.title_en || row.slug || "Untitled";

const getDateKey = (value: string) => value.slice(0, 10);

const buildMonthGrid = (baseDate: Date) => {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const firstDay = (first.getDay() + 6) % 7; // Monday start
  const totalCells = Math.ceil((firstDay + last.getDate()) / 7) * 7;
  const days: Array<{ date: Date; inMonth: boolean }> = [];
  for (let i = 0; i < totalCells; i += 1) {
    const dayNum = i - firstDay + 1;
    const date = new Date(year, month, dayNum);
    days.push({ date, inMonth: dayNum >= 1 && dayNum <= last.getDate() });
  }
  return days;
};

type BentoSize = "sm" | "md" | "lg" | "full";
type CalendarLayoutKey = "summary" | "calendar" | "pipeline";

const CALENDAR_LAYOUT_STORAGE_KEY = "admin:calendar:bento-layout:v1";
const BENTO_SIZE_CLASS: Record<BentoSize, string> = {
  sm: "xl:col-span-4",
  md: "xl:col-span-6",
  lg: "xl:col-span-8",
  full: "xl:col-span-12",
};
const CALENDAR_LAYOUT_DEFAULTS: Record<CalendarLayoutKey, BentoSize> = {
  summary: "full",
  calendar: "lg",
  pipeline: "md",
};

export default function PublishingCalendar() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [visibleStatuses, setVisibleStatuses] = useState<Record<string, boolean>>({
    draft: true,
    review: true,
    scheduled: true,
    published: true,
  });
  const [layout, setLayout] = useState<Record<CalendarLayoutKey, BentoSize>>(CALENDAR_LAYOUT_DEFAULTS);

  const baseDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(CALENDAR_LAYOUT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Record<CalendarLayoutKey, BentoSize>>;
      setLayout((prev) => ({ ...prev, ...parsed }));
    } catch {
      // ignore invalid persisted layout
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(CALENDAR_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    } catch {
      // ignore storage failures
    }
  }, [layout]);

  const { data: articles = [], error } = useQuery({
    queryKey: ["calendar-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title_sk, title_en, slug, status, is_published, scheduled_at, published_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ArticleRow[];
    },
    retry: false,
  });

  const { calendarMap, upcoming, reviewQueue, draftCount } = useMemo(() => {
    const calendarMap: Record<string, ArticleRow[]> = {};
    const upcoming: ArticleRow[] = [];
    const reviewQueue: ArticleRow[] = [];
    let draftCount = 0;
    const now = new Date();

    articles.forEach((row) => {
      const status = statusLabel(row);
      if (status === "review") reviewQueue.push(row);
      if (status === "draft") draftCount += 1;

      const dateValue =
        (status === "scheduled" ? row.scheduled_at : row.published_at) ||
        row.published_at ||
        row.created_at;

      if (dateValue) {
        const key = getDateKey(dateValue);
        calendarMap[key] = calendarMap[key] || [];
        calendarMap[key].push(row);
        if (status === "scheduled" && new Date(dateValue) >= now) {
          upcoming.push(row);
        }
      }
    });

    upcoming.sort((a, b) => String(a.scheduled_at).localeCompare(String(b.scheduled_at)));
    reviewQueue.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    return { calendarMap, upcoming: upcoming.slice(0, 8), reviewQueue: reviewQueue.slice(0, 8), draftCount };
  }, [articles]);

  const statusTotals = useMemo(() => {
    const totals = { total: articles.length, draft: 0, review: 0, scheduled: 0, published: 0 };
    articles.forEach((row) => {
      const status = statusLabel(row);
      if (status === "published") totals.published += 1;
      else if (status === "scheduled") totals.scheduled += 1;
      else if (status === "review") totals.review += 1;
      else totals.draft += 1;
    });
    return totals;
  }, [articles]);

  const toggleStatus = (status: string) => {
    setVisibleStatuses((prev) => ({ ...prev, [status]: !prev[status] }));
  };
  const updateLayoutSize = (key: CalendarLayoutKey, size: BentoSize) => {
    setLayout((prev) => ({ ...prev, [key]: size }));
  };

  const days = useMemo(() => buildMonthGrid(baseDate), [baseDate]);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Publishing Calendar</CardTitle>
          <CardDescription>Schedule, review, and publishing overview.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-amber-700">
          Unable to load calendar. Please run `supabase/articles_workflow.sql`.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPanelHeader
        title="Publishing Calendar"
        description="Plan release dates and keep review/scheduled work visible."
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <AdminSectionCard className={`space-y-3 ${BENTO_SIZE_CLASS[layout.summary]}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Summary</p>
            <div className="flex items-center gap-2">
              <label htmlFor="calendarSummarySize" className="text-xs text-muted-foreground">Size</label>
              <select
                id="calendarSummarySize"
                value={layout.summary}
                onChange={(e) => updateLayoutSize("summary", e.target.value as BentoSize)}
                className="h-8 rounded-md border bg-white px-2 text-xs"
              >
                <option value="sm">S</option>
                <option value="md">M</option>
                <option value="lg">L</option>
                <option value="full">Full</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <div className="rounded-xl border bg-white px-4 py-3">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="mt-1 text-2xl font-semibold">{statusTotals.total}</div>
            </div>
            <div className="rounded-xl border bg-white px-4 py-3">
              <div className="text-xs text-muted-foreground">Draft</div>
              <div className="mt-1 text-2xl font-semibold">{statusTotals.draft}</div>
            </div>
            <div className="rounded-xl border bg-white px-4 py-3">
              <div className="text-xs text-muted-foreground">Review</div>
              <div className="mt-1 text-2xl font-semibold">{statusTotals.review}</div>
            </div>
            <div className="rounded-xl border bg-white px-4 py-3">
              <div className="text-xs text-muted-foreground">Scheduled</div>
              <div className="mt-1 text-2xl font-semibold">{statusTotals.scheduled}</div>
            </div>
            <div className="rounded-xl border bg-white px-4 py-3">
              <div className="text-xs text-muted-foreground">Published</div>
              <div className="mt-1 text-2xl font-semibold">{statusTotals.published}</div>
            </div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard className={`space-y-4 ${BENTO_SIZE_CLASS[layout.calendar]}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Calendar</p>
            <div className="flex items-center gap-2">
              <label htmlFor="calendarMainSize" className="text-xs text-muted-foreground">Size</label>
              <select
                id="calendarMainSize"
                value={layout.calendar}
                onChange={(e) => updateLayoutSize("calendar", e.target.value as BentoSize)}
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
            <div className="flex w-full flex-col items-start justify-between gap-3 lg:flex-row lg:items-center">
              <div className="text-sm text-muted-foreground">
                {baseDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(["draft", "review", "scheduled", "published"] as const).map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={visibleStatuses[status] ? "default" : "outline"}
                    onClick={() => toggleStatus(status)}
                    className="h-8"
                  >
                    {status}
                  </Button>
                ))}
                <Button size="sm" variant="outline" aria-label="Previous month" onClick={() => setMonthOffset((m) => m - 1)}>
                  ←
                </Button>
                <Button size="sm" variant="outline" onClick={() => setMonthOffset(0)}>
                  Today
                </Button>
                <Button size="sm" variant="outline" aria-label="Next month" onClick={() => setMonthOffset((m) => m + 1)}>
                  →
                </Button>
              </div>
            </div>
          </AdminActionBar>

          <Card>
            <CardHeader>
              <CardTitle>Publishing Calendar</CardTitle>
              <CardDescription>Track scheduled launches and reviews.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-2 grid grid-cols-7 gap-2 text-[11px] text-muted-foreground">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <div key={day} className="text-center uppercase tracking-widest">{day}</div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <div className="grid min-w-[860px] grid-cols-7 gap-2">
                  {days.map(({ date, inMonth }) => {
                    const key = getDateKey(date.toISOString());
                    const entries = (calendarMap[key] || []).filter((row) => visibleStatuses[statusLabel(row)]);
                    return (
                      <div
                        key={key}
                        className={`min-h-[96px] rounded-xl border p-2 ${inMonth ? "bg-white" : "bg-muted/40 text-muted-foreground"}`}
                      >
                        <div className="mb-2 text-xs font-semibold">{date.getDate()}</div>
                        <div className="space-y-1">
                          {entries.slice(0, 2).map((row) => {
                            const status = statusLabel(row);
                            return (
                              <Link
                                key={row.id}
                                href={`/admin?workspace=publishing&tab=article-studio&edit=${row.id}`}
                                className="w-full rounded-md border bg-white px-2 py-1 text-left text-[10px] line-clamp-2 hover:bg-muted/40"
                              >
                                <span className={`mr-1 inline-block rounded-full px-1.5 py-0.5 text-[9px] ${statusColors[status] || "bg-muted"}`}>
                                  {status}
                                </span>
                                {toLabel(row)}
                              </Link>
                            );
                          })}
                          {entries.length > 2 && (
                            <div className="text-[10px] text-muted-foreground">+{entries.length - 2} more</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </AdminSectionCard>

        <AdminSectionCard className={`space-y-4 ${BENTO_SIZE_CLASS[layout.pipeline]}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Queues</p>
            <div className="flex items-center gap-2">
              <label htmlFor="calendarPipelineSize" className="text-xs text-muted-foreground">Size</label>
              <select
                id="calendarPipelineSize"
                value={layout.pipeline}
                onChange={(e) => updateLayoutSize("pipeline", e.target.value as BentoSize)}
                className="h-8 rounded-md border bg-white px-2 text-xs"
              >
                <option value="sm">S</option>
                <option value="md">M</option>
                <option value="lg">L</option>
                <option value="full">Full</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Upcoming Scheduled</CardTitle>
                <CardDescription>Next queued releases</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcoming.filter((row) => visibleStatuses[statusLabel(row)]).length === 0 ? (
                  <div className="text-xs text-muted-foreground">No scheduled articles.</div>
                ) : (
                  upcoming.filter((row) => visibleStatuses[statusLabel(row)]).map((row) => (
                    <div key={row.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <div className="text-sm font-medium line-clamp-1">{toLabel(row)}</div>
                      <Badge variant="secondary">{row.scheduled_at ? new Date(row.scheduled_at).toLocaleString() : "TBD"}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Review Queue</CardTitle>
                <CardDescription>Waiting for approval</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {reviewQueue.filter((row) => visibleStatuses[statusLabel(row)]).length === 0 ? (
                  <div className="text-xs text-muted-foreground">No articles in review.</div>
                ) : (
                  reviewQueue.filter((row) => visibleStatuses[statusLabel(row)]).map((row) => (
                    <div key={row.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <div className="text-sm font-medium line-clamp-1">{toLabel(row)}</div>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin?workspace=publishing&tab=article-studio&edit=${row.id}`}>
                          Review
                        </Link>
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Draft Backlog</CardTitle>
                <CardDescription>Unpublished drafts</CardDescription>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{draftCount}</CardContent>
            </Card>
          </div>
        </AdminSectionCard>
      </div>
    </div>
  );
}
