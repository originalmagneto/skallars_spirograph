"use client";

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { LayoutGridIcon, ArrowUp01Icon, ArrowDown01Icon, FilterResetIcon, SaveEnergy01Icon } from 'hugeicons-react';

interface PageSectionRow {
  id?: string;
  page: string;
  section_key: string;
  label: string;
  enabled: boolean;
  sort_order: number;
}

const DEFAULT_SECTIONS: PageSectionRow[] = [
  { page: 'home', section_key: 'hero', label: 'Hero', enabled: true, sort_order: 1 },
  { page: 'home', section_key: 'services', label: 'Services', enabled: true, sort_order: 2 },
  { page: 'home', section_key: 'countries', label: 'Countries', enabled: true, sort_order: 3 },
  { page: 'home', section_key: 'team', label: 'Team', enabled: true, sort_order: 4 },
  { page: 'home', section_key: 'clients', label: 'Clients', enabled: true, sort_order: 5 },
  { page: 'home', section_key: 'news', label: 'News', enabled: true, sort_order: 6 },
  { page: 'home', section_key: 'contact', label: 'Contact', enabled: true, sort_order: 7 },
  { page: 'home', section_key: 'footer', label: 'Footer', enabled: true, sort_order: 8 },
];

export default function PageLayoutManager() {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<PageSectionRow[]>([]);
  const [dirty, setDirty] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['page-sections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_sections')
        .select('*')
        .eq('page', 'home')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as PageSectionRow[];
    },
  });

  useEffect(() => {
    if (!data) return;
    if (data.length > 0) {
      setItems(data);
      setDirty(false);
    } else {
      setItems(DEFAULT_SECTIONS);
      setDirty(false);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (rows: PageSectionRow[]) => {
      const payload = rows.map((row, idx) => ({
        page: row.page,
        section_key: row.section_key,
        label: row.label,
        enabled: row.enabled,
        sort_order: idx + 1,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from('page_sections').upsert(payload, { onConflict: 'page,section_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Layout saved');
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['page-sections'] });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const layoutItems = useMemo(() => {
    if (items.length > 0) return items;
    return DEFAULT_SECTIONS;
  }, [items]);

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const next = [...layoutItems];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= next.length) return;
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    setItems(next.map((row, idx) => ({ ...row, sort_order: idx + 1 })));
    setDirty(true);
  };

  const toggleEnabled = (index: number, value: boolean) => {
    const next = [...layoutItems];
    next[index] = { ...next[index], enabled: value };
    setItems(next);
    setDirty(true);
  };

  const resetToDefault = () => {
    setItems(DEFAULT_SECTIONS.map((row) => ({ ...row })));
    setDirty(true);
  };

  const saveLayout = () => {
    saveMutation.mutate(layoutItems);
  };

  const hasData = (data && data.length > 0) || items.length > 0;

  if (isLoading) return <div className="p-4 text-muted-foreground">Loading layout...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGridIcon size={20} className="text-primary" />
          <h2 className="text-lg font-semibold">Homepage Layout</h2>
          <Badge variant="secondary">{layoutItems.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={resetToDefault}>
            <FilterResetIcon size={14} className="mr-1" />
            Reset Default
          </Button>
          <Button size="sm" onClick={saveLayout} disabled={!dirty || saveMutation.isPending}>
            <SaveEnergy01Icon size={14} className="mr-1" />
            {saveMutation.isPending ? 'Saving...' : 'Save Layout'}
          </Button>
        </div>
      </div>

      {!hasData && isError && (
        <div className="text-sm text-muted-foreground">
          Layout table not found. Please run the Phase 2 SQL setup.
        </div>
      )}

      <div className="space-y-2">
        {layoutItems.map((item, index) => (
          <div key={item.section_key} className="flex items-center justify-between border rounded-lg px-4 py-3 bg-white">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <Button size="icon" variant="ghost" onClick={() => moveItem(index, 'up')} disabled={index === 0}>
                  <ArrowUp01Icon size={16} />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => moveItem(index, 'down')} disabled={index === layoutItems.length - 1}>
                  <ArrowDown01Icon size={16} />
                </Button>
              </div>
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.section_key}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={item.enabled} onCheckedChange={(value) => toggleEnabled(index, value)} />
              <span className="text-xs text-muted-foreground">{item.enabled ? 'Visible' : 'Hidden'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
