"use client";

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Mail01Icon, SaveEnergy01Icon } from 'hugeicons-react';

interface FooterSettingsRow {
  id?: string;
  show_newsletter: boolean;
  show_social: boolean;
  show_solutions: boolean;
  show_contact: boolean;
}

const defaultSettings: FooterSettingsRow = {
  show_newsletter: true,
  show_social: true,
  show_solutions: true,
  show_contact: true,
};

export default function FooterSettingsManager() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FooterSettingsRow>(defaultSettings);

  const { data, isLoading } = useQuery({
    queryKey: ['footer-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('footer_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);
      if (error) {
        console.warn('Could not fetch footer settings:', error);
        return null;
      }
      return data?.[0] as FooterSettingsRow | null;
    },
  });

  useEffect(() => {
    if (!data) {
      setForm(defaultSettings);
      return;
    }
    setForm({
      id: data.id,
      show_newsletter: data.show_newsletter ?? true,
      show_social: data.show_social ?? true,
      show_solutions: data.show_solutions ?? true,
      show_contact: data.show_contact ?? true,
    });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: FooterSettingsRow) => {
      const { error } = await supabase
        .from('footer_settings')
        .upsert({
          id: payload.id,
          show_newsletter: payload.show_newsletter,
          show_social: payload.show_social,
          show_solutions: payload.show_solutions,
          show_contact: payload.show_contact,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Footer settings saved');
      queryClient.invalidateQueries({ queryKey: ['footer-settings'] });
    },
    onError: (error: any) => toast.error(error.message),
  });

  if (isLoading) return <div className="p-4 text-muted-foreground">Loading footer settings...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Mail01Icon size={20} className="text-primary" />
        <h2 className="text-lg font-semibold">Footer Settings</h2>
        <Badge variant="secondary">Sections</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <Switch checked={form.show_contact} onCheckedChange={(v) => setForm({ ...form, show_contact: v })} />
          <Label className="text-sm">Show Contact Column</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.show_solutions} onCheckedChange={(v) => setForm({ ...form, show_solutions: v })} />
          <Label className="text-sm">Show Solutions Column</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.show_newsletter} onCheckedChange={(v) => setForm({ ...form, show_newsletter: v })} />
          <Label className="text-sm">Show Newsletter Column</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.show_social} onCheckedChange={(v) => setForm({ ...form, show_social: v })} />
          <Label className="text-sm">Show Social Icons</Label>
        </div>
      </div>

      <Button size="sm" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
        <SaveEnergy01Icon size={14} className="mr-1" />
        {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  );
}
