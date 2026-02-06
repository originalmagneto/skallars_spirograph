"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AdminActionBar } from '@/components/admin/AdminPrimitives';

const DEFAULTS = {
  template_hero: 'classic',
  template_services: 'sticky',
  template_team: 'cards',
  template_testimonials: 'grid',
  template_contact: 'classic',
};

const OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  template_hero: [
    { value: 'classic', label: 'Classic (Centered)' },
    { value: 'split', label: 'Split (Text + Card)' },
  ],
  template_services: [
    { value: 'sticky', label: 'Sticky (Image + List)' },
    { value: 'grid', label: 'Grid Cards' },
  ],
  template_team: [
    { value: 'cards', label: 'Cards (Default)' },
    { value: 'compact', label: 'Compact Grid' },
  ],
  template_testimonials: [
    { value: 'grid', label: 'Grid' },
    { value: 'spotlight', label: 'Spotlight' },
  ],
  template_contact: [
    { value: 'classic', label: 'Classic Footer' },
    { value: 'compact', label: 'Compact Footer' },
  ],
};

export default function SectionTemplatesPanel() {
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

  const save = async () => {
    setSaving(true);
    try {
      const payload = Object.entries(form).map(([key, value]) => ({ key, value }));
      const { error } = await supabase
        .from('settings')
        .upsert(payload, { onConflict: 'key' });
      if (error) throw error;
      toast.success('Section templates saved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save templates');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Section Templates</CardTitle>
        <CardDescription>
          Choose layout styles for key homepage sections.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Object.entries(OPTIONS).map(([key, options]) => (
            <div key={key} className="space-y-2 rounded-lg border bg-muted/10 p-3">
              <Label className="text-xs uppercase text-muted-foreground">{key.replace('template_', '')}</Label>
              <Select
                value={(form as any)[key]}
                onValueChange={(value) => setForm((prev) => ({ ...prev, [key]: value }))}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <AdminActionBar className="justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save Templates'}
          </Button>
        </AdminActionBar>
      </CardContent>
    </Card>
  );
}
