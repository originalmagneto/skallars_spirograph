"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Add01Icon, Delete01Icon, PencilEdit01Icon, Cancel01Icon, Tick01Icon, ArrowUp01Icon, ArrowDown01Icon } from 'hugeicons-react';

interface PageBlockItem {
  id?: string;
  block_id: string;
  title_sk?: string | null;
  title_en?: string | null;
  title_de?: string | null;
  title_cn?: string | null;
  subtitle_sk?: string | null;
  subtitle_en?: string | null;
  subtitle_de?: string | null;
  subtitle_cn?: string | null;
  body_sk?: string | null;
  body_en?: string | null;
  body_de?: string | null;
  body_cn?: string | null;
  enabled: boolean;
  sort_order: number;
}

const emptyItem = (blockId: string): PageBlockItem => ({
  block_id: blockId,
  title_sk: '',
  title_en: '',
  title_de: '',
  title_cn: '',
  subtitle_sk: '',
  subtitle_en: '',
  subtitle_de: '',
  subtitle_cn: '',
  body_sk: '',
  body_en: '',
  body_de: '',
  body_cn: '',
  enabled: true,
  sort_order: 0,
});

export default function PageBlockItemsManager({
  blockId,
  blockType,
}: {
  blockId: string;
  blockType: 'testimonials' | 'faq';
}) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PageBlockItem>(emptyItem(blockId));
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<PageBlockItem>(emptyItem(blockId));

  const { data: items, isLoading } = useQuery({
    queryKey: ['page-block-items', blockId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_block_items')
        .select('*')
        .eq('block_id', blockId)
        .order('sort_order', { ascending: true });
      if (error) {
        console.warn('Could not fetch block items:', error);
        return [] as PageBlockItem[];
      }
      return data as PageBlockItem[];
    },
    enabled: Boolean(blockId),
  });

  const createMutation = useMutation({
    mutationFn: async (item: PageBlockItem) => {
      const { error } = await supabase.from('page_block_items').insert(item);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Item added');
      queryClient.invalidateQueries({ queryKey: ['page-block-items', blockId] });
      setIsAdding(false);
      setNewItem(emptyItem(blockId));
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (item: PageBlockItem) => {
      if (!item.id) return;
      const { error } = await supabase
        .from('page_block_items')
        .update({ ...item, updated_at: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Item updated');
      queryClient.invalidateQueries({ queryKey: ['page-block-items', blockId] });
      setEditingId(null);
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('page_block_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Item deleted');
      queryClient.invalidateQueries({ queryKey: ['page-block-items', blockId] });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const reorderMutation = useMutation({
    mutationFn: async (rows: PageBlockItem[]) => {
      const payload = rows.map((row, index) => ({
        id: row.id,
        sort_order: index + 1,
      }));
      const { error } = await supabase.from('page_block_items').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-block-items', blockId] });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const startEdit = (item: PageBlockItem) => {
    setEditingId(item.id || null);
    setEditForm({ ...item });
  };

  const handleSave = () => {
    if (editingId) updateMutation.mutate({ ...editForm });
  };

  const handleAdd = () => {
    const nextOrder = (items?.length || 0) + 1;
    createMutation.mutate({ ...newItem, sort_order: nextOrder, block_id: blockId });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (!items) return;
    const next = [...items];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= next.length) return;
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    reorderMutation.mutate(next);
  };

  if (isLoading) return <div className="text-xs text-muted-foreground">Loading items...</div>;

  const titleLabel = blockType === 'faq' ? 'Question' : 'Name';
  const subtitleLabel = blockType === 'faq' ? 'Optional Subtitle' : 'Role/Company';
  const bodyLabel = blockType === 'faq' ? 'Answer' : 'Quote';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{blockType === 'faq' ? 'FAQ Items' : 'Testimonials'}</div>
        {!isAdding && (
          <Button size="sm" variant="outline" onClick={() => setIsAdding(true)}>
            <Add01Icon size={14} className="mr-1" />
            Add Item
          </Button>
        )}
      </div>

      {isAdding && (
        <ItemForm
          values={newItem}
          onChange={setNewItem}
          onSave={handleAdd}
          onCancel={() => setIsAdding(false)}
          titleLabel={titleLabel}
          subtitleLabel={subtitleLabel}
          bodyLabel={bodyLabel}
          isNew
        />
      )}

      <div className="space-y-2">
        {(items || []).map((item, index) => (
          <div key={item.id} className="border rounded-lg px-3 py-3 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{item.title_en || item.title_sk || 'Untitled'}</div>
                <div className="text-xs text-muted-foreground">{item.subtitle_en || item.subtitle_sk || ''}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <Button size="icon" variant="ghost" onClick={() => moveItem(index, 'up')} disabled={index === 0}>
                    <ArrowUp01Icon size={14} />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => moveItem(index, 'down')} disabled={index === (items?.length || 1) - 1}>
                    <ArrowDown01Icon size={14} />
                  </Button>
                </div>
                <Switch checked={item.enabled} onCheckedChange={(v) => updateMutation.mutate({ ...item, enabled: v })} />
                <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                  <PencilEdit01Icon size={14} className="mr-1" />
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(item.id as string)}>
                  <Delete01Icon size={14} />
                </Button>
              </div>
            </div>

            {editingId === item.id && (
              <div className="mt-3">
                <ItemForm
                  values={editForm}
                  onChange={setEditForm}
                  onSave={handleSave}
                  onCancel={() => setEditingId(null)}
                  titleLabel={titleLabel}
                  subtitleLabel={subtitleLabel}
                  bodyLabel={bodyLabel}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ItemForm({
  values,
  onChange,
  onSave,
  onCancel,
  titleLabel,
  subtitleLabel,
  bodyLabel,
  isNew = false,
}: {
  values: PageBlockItem;
  onChange: (values: PageBlockItem) => void;
  onSave: () => void;
  onCancel: () => void;
  titleLabel: string;
  subtitleLabel: string;
  bodyLabel: string;
  isNew?: boolean;
}) {
  return (
    <div className="p-3 border rounded-lg bg-muted/40 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">{titleLabel} (SK)</Label>
          <Input value={values.title_sk || ''} onChange={(e) => onChange({ ...values, title_sk: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">{titleLabel} (EN)</Label>
          <Input value={values.title_en || ''} onChange={(e) => onChange({ ...values, title_en: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">{titleLabel} (DE)</Label>
          <Input value={values.title_de || ''} onChange={(e) => onChange({ ...values, title_de: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">{titleLabel} (CN)</Label>
          <Input value={values.title_cn || ''} onChange={(e) => onChange({ ...values, title_cn: e.target.value })} className="mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">{subtitleLabel} (SK)</Label>
          <Input value={values.subtitle_sk || ''} onChange={(e) => onChange({ ...values, subtitle_sk: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">{subtitleLabel} (EN)</Label>
          <Input value={values.subtitle_en || ''} onChange={(e) => onChange({ ...values, subtitle_en: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">{subtitleLabel} (DE)</Label>
          <Input value={values.subtitle_de || ''} onChange={(e) => onChange({ ...values, subtitle_de: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">{subtitleLabel} (CN)</Label>
          <Input value={values.subtitle_cn || ''} onChange={(e) => onChange({ ...values, subtitle_cn: e.target.value })} className="mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">{bodyLabel} (SK)</Label>
          <Textarea value={values.body_sk || ''} onChange={(e) => onChange({ ...values, body_sk: e.target.value })} rows={3} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">{bodyLabel} (EN)</Label>
          <Textarea value={values.body_en || ''} onChange={(e) => onChange({ ...values, body_en: e.target.value })} rows={3} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">{bodyLabel} (DE)</Label>
          <Textarea value={values.body_de || ''} onChange={(e) => onChange({ ...values, body_de: e.target.value })} rows={3} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">{bodyLabel} (CN)</Label>
          <Textarea value={values.body_cn || ''} onChange={(e) => onChange({ ...values, body_cn: e.target.value })} rows={3} className="mt-1" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <Switch checked={values.enabled} onCheckedChange={(v) => onChange({ ...values, enabled: v })} />
          <Label className="text-xs">Enabled</Label>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onSave}>
          <Tick01Icon size={14} className="mr-1" />
          {isNew ? 'Add Item' : 'Save Item'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <Cancel01Icon size={14} className="mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
