"use client";

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { NewsIcon, SaveEnergy01Icon } from 'hugeicons-react';
import { AdminActionBar, AdminPanelHeader, AdminSectionCard, BENTO_SIZE_CLASS, BentoSize, useBentoLayout } from '@/components/admin/AdminPrimitives';

interface NewsSettingsRow {
  id?: string;
  limit_count: number;
  show_view_all: boolean;
  autoplay: boolean;
  autoplay_interval_ms: number;
  scroll_step: number;
}

const defaultSettings: NewsSettingsRow = {
  limit_count: 9,
  show_view_all: true,
  autoplay: true,
  autoplay_interval_ms: 6000,
  scroll_step: 1,
};

export default function NewsSettingsManager() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<NewsSettingsRow>(defaultSettings);
  const { layout, updateLayoutSize } = useBentoLayout<'feed' | 'playback'>(
    'admin:news-settings:bento-layout:v1',
    { feed: 'lg', playback: 'md' }
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['news-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] as NewsSettingsRow | undefined;
    },
  });

  useEffect(() => {
    if (!data) {
      setForm(defaultSettings);
      return;
    }
    setForm({
      id: data.id,
      limit_count: data.limit_count ?? defaultSettings.limit_count,
      show_view_all: data.show_view_all ?? defaultSettings.show_view_all,
      autoplay: data.autoplay ?? defaultSettings.autoplay,
      autoplay_interval_ms: data.autoplay_interval_ms ?? defaultSettings.autoplay_interval_ms,
      scroll_step: data.scroll_step ?? defaultSettings.scroll_step,
    });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: NewsSettingsRow) => {
      const { error } = await supabase
        .from('news_settings')
        .upsert({
          id: payload.id,
          limit_count: payload.limit_count,
          show_view_all: payload.show_view_all,
          autoplay: payload.autoplay,
          autoplay_interval_ms: payload.autoplay_interval_ms,
          scroll_step: payload.scroll_step,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('News settings saved');
      queryClient.invalidateQueries({ queryKey: ['news-settings'] });
    },
    onError: (error: any) => toast.error(error.message),
  });

  if (isLoading) return <div className="p-4 text-muted-foreground">Loading news settings...</div>;

  return (
    <div className="space-y-6">
      <AdminPanelHeader
        title="News Section Settings"
        description="Configure carousel behavior and limits for the public news module."
        actions={<Badge variant="secondary">{form.limit_count} posts</Badge>}
      />

      {isError && (
        <AdminActionBar className="text-sm text-muted-foreground">
          Settings table not found. Please run the Phase 2 SQL setup.
        </AdminActionBar>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <AdminSectionCard className={`space-y-4 bg-muted/10 ${BENTO_SIZE_CLASS[layout.feed]}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">Feed Limits</div>
            <div className="flex items-center gap-2">
              <label htmlFor="newsFeedSize" className="text-xs text-muted-foreground">Size</label>
              <select
                id="newsFeedSize"
                value={layout.feed}
                onChange={(e) => updateLayoutSize('feed', e.target.value as BentoSize)}
                className="h-8 rounded-md border bg-white px-2 text-xs"
              >
                <option value="sm">S</option>
                <option value="md">M</option>
                <option value="lg">L</option>
                <option value="full">Full</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-md border bg-white p-3">
              <Label className="text-xs">Posts to show</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={form.limit_count}
                onChange={(e) => setForm({ ...form, limit_count: parseInt(e.target.value) || 1 })}
                className="mt-1"
              />
            </div>
            <div className="rounded-md border bg-white p-3">
              <Label className="text-xs">Scroll Step Override (px)</Label>
              <Input
                type="number"
                min={1}
                max={1200}
                value={form.scroll_step}
                onChange={(e) => setForm({ ...form, scroll_step: parseInt(e.target.value) || 1 })}
                className="mt-1"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Leave small values (1-40) to auto-shift one article at a time.
              </p>
            </div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard className={`space-y-4 bg-muted/10 ${BENTO_SIZE_CLASS[layout.playback]}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">Playback</div>
            <div className="flex items-center gap-2">
              <label htmlFor="newsPlaybackSize" className="text-xs text-muted-foreground">Size</label>
              <select
                id="newsPlaybackSize"
                value={layout.playback}
                onChange={(e) => updateLayoutSize('playback', e.target.value as BentoSize)}
                className="h-8 rounded-md border bg-white px-2 text-xs"
              >
                <option value="sm">S</option>
                <option value="md">M</option>
                <option value="lg">L</option>
                <option value="full">Full</option>
              </select>
            </div>
          </div>
          <div className="rounded-md border bg-white p-3">
            <Label className="text-xs">Autoplay Interval (ms)</Label>
            <Input
              type="number"
              min={1000}
              max={20000}
              value={form.autoplay_interval_ms}
              onChange={(e) => setForm({ ...form, autoplay_interval_ms: parseInt(e.target.value) || 6000 })}
              className="mt-1"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Recommended: 4000-8000 ms for a slow, readable carousel.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-md border bg-white p-3">
              <Switch checked={form.show_view_all} onCheckedChange={(value) => setForm({ ...form, show_view_all: value })} />
              <span className="text-sm">Show “View all”</span>
            </div>
            <div className="flex items-center gap-2 rounded-md border bg-white p-3">
              <Switch checked={form.autoplay} onCheckedChange={(value) => setForm({ ...form, autoplay: value })} />
              <span className="text-sm">Enable autoplay</span>
            </div>
          </div>
        </AdminSectionCard>
      </div>

      <AdminActionBar>
        <Button size="sm" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
          <SaveEnergy01Icon size={14} className="mr-1" />
          {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <NewsIcon size={14} className="text-primary" />
          Keep defaults simple for non-technical editors.
        </span>
      </AdminActionBar>
    </div>
  );
}
