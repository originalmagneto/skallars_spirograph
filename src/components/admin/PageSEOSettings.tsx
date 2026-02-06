"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { AdminActionBar } from '@/components/admin/AdminPrimitives';

const DEFAULTS = {
  seo_home_title: 'SKALLARS | Modern Legal Solutions',
  seo_home_description: 'Forward-thinking legal expertise across Central Europe.',
  seo_home_og_image: '',
  seo_blog_title: 'Blog | Skallars',
  seo_blog_description: 'Latest legal updates, commentary, and insights from Skallars.',
  seo_blog_og_image: '',
};

export default function PageSEOSettings() {
  const [form, setForm] = useState(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const keys = Object.keys(DEFAULTS);
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', keys);
      if (error) return;
      const next = { ...DEFAULTS };
      (data || []).forEach((row) => {
        if (row.key in next) {
          (next as any)[row.key] = row.value ?? '';
        }
      });
      setForm(next);
    };
    fetchSettings();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const payload = Object.entries(form).map(([key, value]) => ({ key, value }));
      const { error } = await supabase
        .from('settings')
        .upsert(payload, { onConflict: 'key' });
      if (error) throw error;
      toast.success('SEO settings saved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save SEO settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Page SEO Settings</CardTitle>
        <CardDescription>
          Configure OpenGraph and structured metadata for key pages.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="space-y-4 rounded-xl border bg-muted/10 p-4">
            <div className="text-sm font-semibold">Home Page</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Title</Label>
                <Input
                  value={form.seo_home_title}
                  onChange={(e) => setForm((prev) => ({ ...prev, seo_home_title: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={form.seo_home_description}
                  onChange={(e) => setForm((prev) => ({ ...prev, seo_home_description: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>OpenGraph Image URL</Label>
                <Input
                  value={form.seo_home_og_image}
                  onChange={(e) => setForm((prev) => ({ ...prev, seo_home_og_image: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border bg-muted/10 p-4">
            <div className="text-sm font-semibold">Blog Index</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Title</Label>
                <Input
                  value={form.seo_blog_title}
                  onChange={(e) => setForm((prev) => ({ ...prev, seo_blog_title: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={form.seo_blog_description}
                  onChange={(e) => setForm((prev) => ({ ...prev, seo_blog_description: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>OpenGraph Image URL</Label>
                <Input
                  value={form.seo_blog_og_image}
                  onChange={(e) => setForm((prev) => ({ ...prev, seo_blog_og_image: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>
        </div>

        <AdminActionBar>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? 'Saving...' : 'Save SEO Settings'}
          </Button>
          <span className="text-sm text-muted-foreground">
            Keep SEO defaults concise. Per-article SEO overrides should stay in the article editor flow.
          </span>
        </AdminActionBar>
      </CardContent>
    </Card>
  );
}
