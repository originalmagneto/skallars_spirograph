"use client";

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Globe02Icon, SaveEnergy01Icon } from 'hugeicons-react';
import { AdminActionBar, AdminPanelHeader, AdminSectionCard } from '@/components/admin/AdminPrimitives';

interface CountriesSettingsRow {
  id?: string;
  show_stats: boolean;
  show_connections: boolean;
  show_labels: boolean;
  show_controls: boolean;
  default_focus: 'centralEurope' | 'europe' | 'global';
}

const defaultSettings: CountriesSettingsRow = {
  show_stats: true,
  show_connections: true,
  show_labels: true,
  show_controls: true,
  default_focus: 'centralEurope',
};

export default function CountriesSettingsPanel() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CountriesSettingsRow>(defaultSettings);

  const { data, isLoading } = useQuery({
    queryKey: ['countries-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('countries_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);
      if (error) {
        console.warn('Could not fetch countries settings:', error);
        return null;
      }
      return data?.[0] as CountriesSettingsRow | null;
    },
  });

  useEffect(() => {
    if (!data) {
      setForm(defaultSettings);
      return;
    }
    setForm({
      id: data.id,
      show_stats: data.show_stats ?? true,
      show_connections: data.show_connections ?? true,
      show_labels: data.show_labels ?? true,
      show_controls: data.show_controls ?? true,
      default_focus: (data.default_focus as CountriesSettingsRow['default_focus']) || 'centralEurope',
    });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: CountriesSettingsRow) => {
      const { error } = await supabase
        .from('countries_settings')
        .upsert({
          id: payload.id,
          show_stats: payload.show_stats,
          show_connections: payload.show_connections,
          show_labels: payload.show_labels,
          show_controls: payload.show_controls,
          default_focus: payload.default_focus,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Countries settings saved');
      queryClient.invalidateQueries({ queryKey: ['countries-settings'] });
    },
    onError: (error: any) => toast.error(error.message),
  });

  if (isLoading) return <div className="p-4 text-muted-foreground">Loading countries settings...</div>;

  return (
    <div className="space-y-6">
      <AdminPanelHeader
        title="Countries Section Settings"
        description="Configure what appears in the countries map module and which view users see first."
        actions={<Badge variant="secondary">Global Network</Badge>}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <AdminSectionCard className="space-y-4 bg-muted/10 xl:col-span-8">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Globe02Icon size={16} className="text-primary" />
            Visibility
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-md border bg-white p-3">
              <Switch checked={form.show_stats} onCheckedChange={(v) => setForm({ ...form, show_stats: v })} />
              <Label className="text-sm">Show stats</Label>
            </div>
            <div className="flex items-center gap-2 rounded-md border bg-white p-3">
              <Switch checked={form.show_connections} onCheckedChange={(v) => setForm({ ...form, show_connections: v })} />
              <Label className="text-sm">Show connections list</Label>
            </div>
            <div className="flex items-center gap-2 rounded-md border bg-white p-3">
              <Switch checked={form.show_labels} onCheckedChange={(v) => setForm({ ...form, show_labels: v })} />
              <Label className="text-sm">Show country labels</Label>
            </div>
            <div className="flex items-center gap-2 rounded-md border bg-white p-3">
              <Switch checked={form.show_controls} onCheckedChange={(v) => setForm({ ...form, show_controls: v })} />
              <Label className="text-sm">Show focus controls</Label>
            </div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard className="space-y-4 bg-muted/10 xl:col-span-4">
          <div className="text-sm font-semibold">Default Focus</div>
          <div className="rounded-md border bg-white p-3">
            <Label className="text-xs">Initial map view</Label>
            <Select
              value={form.default_focus}
              onValueChange={(value) => setForm({ ...form, default_focus: value as CountriesSettingsRow['default_focus'] })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="centralEurope">Central Europe</SelectItem>
                <SelectItem value="europe">Europe</SelectItem>
                <SelectItem value="global">Global</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Keep this on Central Europe for local-first storytelling. Switch to Global for broader map-first narratives.
          </p>
        </AdminSectionCard>
      </div>

      <AdminActionBar>
        <Button size="sm" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
          <SaveEnergy01Icon size={14} className="mr-1" />
          {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
        <span className="text-sm text-muted-foreground">
          Use concise defaults and expose advanced map behavior only when needed.
        </span>
      </AdminActionBar>
    </div>
  );
}
