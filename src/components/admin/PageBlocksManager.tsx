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
import { Add01Icon, Delete01Icon, PencilEdit01Icon, Cancel01Icon, Tick01Icon, FileBlockIcon } from 'hugeicons-react';
import PageBlockItemsManager from './PageBlockItemsManager';

interface PageBlock {
  id?: string;
  page: string;
  block_type: 'callout' | 'testimonials' | 'faq';
  title_sk?: string | null;
  title_en?: string | null;
  title_de?: string | null;
  title_cn?: string | null;
  body_sk?: string | null;
  body_en?: string | null;
  body_de?: string | null;
  body_cn?: string | null;
  button_label_sk?: string | null;
  button_label_en?: string | null;
  button_label_de?: string | null;
  button_label_cn?: string | null;
  button_url?: string | null;
  button_external?: boolean;
  enabled: boolean;
}

const emptyBlock: PageBlock = {
  page: 'home',
  block_type: 'callout',
  title_sk: '',
  title_en: '',
  title_de: '',
  title_cn: '',
  body_sk: '',
  body_en: '',
  body_de: '',
  body_cn: '',
  button_label_sk: '',
  button_label_en: '',
  button_label_de: '',
  button_label_cn: '',
  button_url: '',
  button_external: false,
  enabled: true,
};

export default function PageBlocksManager() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PageBlock>(emptyBlock);
  const [isAdding, setIsAdding] = useState(false);
  const [newBlock, setNewBlock] = useState<PageBlock>(emptyBlock);

  const { data: blocks, isLoading } = useQuery({
    queryKey: ['page-blocks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_blocks')
        .select('*')
        .eq('page', 'home')
        .order('created_at', { ascending: true });
      if (error) {
        console.warn('Could not fetch page blocks:', error);
        return [] as PageBlock[];
      }
      return data as PageBlock[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (block: PageBlock) => {
      const { data, error } = await supabase
        .from('page_blocks')
        .insert(block)
        .select('*')
        .single();
      if (error) throw error;

      const { data: orderRows } = await supabase
        .from('page_sections')
        .select('sort_order')
        .eq('page', 'home')
        .order('sort_order', { ascending: false })
        .limit(1);
      const nextOrder = (orderRows?.[0]?.sort_order || 0) + 1;
      const label = block.title_en || block.title_sk || 'Callout Block';

      const { error: sectionError } = await supabase
        .from('page_sections')
        .insert({
          page: 'home',
          section_key: `block:${data.id}`,
          label,
          enabled: true,
          sort_order: nextOrder,
        });
      if (sectionError) throw sectionError;
    },
    onSuccess: () => {
      toast.success('Block added');
      queryClient.invalidateQueries({ queryKey: ['page-blocks'] });
      queryClient.invalidateQueries({ queryKey: ['page-sections'] });
      setIsAdding(false);
      setNewBlock(emptyBlock);
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (block: PageBlock) => {
      if (!block.id) return;
      const { error } = await supabase
        .from('page_blocks')
        .update({
          ...block,
          updated_at: new Date().toISOString(),
        })
        .eq('id', block.id);
      if (error) throw error;

      const label = block.title_en || block.title_sk || 'Callout Block';
      await supabase
        .from('page_sections')
        .update({ label })
        .eq('page', 'home')
        .eq('section_key', `block:${block.id}`);
    },
    onSuccess: () => {
      toast.success('Block updated');
      queryClient.invalidateQueries({ queryKey: ['page-blocks'] });
      queryClient.invalidateQueries({ queryKey: ['page-sections'] });
      setEditingId(null);
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (block: PageBlock) => {
      if (!block.id) return;
      const { error } = await supabase.from('page_blocks').delete().eq('id', block.id);
      if (error) throw error;
      await supabase.from('page_sections').delete().eq('page', 'home').eq('section_key', `block:${block.id}`);
    },
    onSuccess: () => {
      toast.success('Block deleted');
      queryClient.invalidateQueries({ queryKey: ['page-blocks'] });
      queryClient.invalidateQueries({ queryKey: ['page-sections'] });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const startEdit = (block: PageBlock) => {
    setEditingId(block.id || null);
    setEditForm({ ...block });
  };

  const handleSave = () => {
    if (editingId) updateMutation.mutate({ ...editForm });
  };

  const handleAdd = () => {
    createMutation.mutate({ ...newBlock });
  };

  if (isLoading) return <div className="p-4 text-muted-foreground">Loading blocks...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileBlockIcon size={18} className="text-primary" />
          <h3 className="text-sm font-semibold">Homepage Blocks</h3>
          <Badge variant="secondary">{blocks?.length || 0}</Badge>
        </div>
        {!isAdding && (
          <Button size="sm" onClick={() => setIsAdding(true)}>
            <Add01Icon size={14} className="mr-1" />
            Add Block
          </Button>
        )}
      </div>

      {isAdding && (
        <BlockForm
          values={newBlock}
          onChange={setNewBlock}
          onSave={handleAdd}
          onCancel={() => setIsAdding(false)}
          isNew
        />
      )}

      <div className="space-y-3">
        {(blocks || []).map((block) => (
          <div key={block.id} className="border rounded-lg px-4 py-3 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{block.title_en || block.title_sk || 'Callout Block'}</div>
                <div className="text-xs text-muted-foreground">{block.block_type}</div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={block.enabled} onCheckedChange={(v) => updateMutation.mutate({ ...block, enabled: v })} />
                <Button size="sm" variant="outline" onClick={() => startEdit(block)}>
                  <PencilEdit01Icon size={14} className="mr-1" />
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(block)}>
                  <Delete01Icon size={14} />
                </Button>
              </div>
            </div>

            {editingId === block.id && (
              <div className="mt-4 space-y-4">
                <BlockForm
                  values={editForm}
                  onChange={setEditForm}
                  onSave={handleSave}
                  onCancel={() => setEditingId(null)}
                />
                {editForm.block_type !== 'callout' && editForm.id && (
                  <PageBlockItemsManager blockId={editForm.id} blockType={editForm.block_type} />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BlockForm({
  values,
  onChange,
  onSave,
  onCancel,
  isNew = false,
}: {
  values: PageBlock;
  onChange: (values: PageBlock) => void;
  onSave: () => void;
  onCancel: () => void;
  isNew?: boolean;
}) {
  return (
    <div className="p-4 border rounded-lg bg-muted/40 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Block Type</Label>
          <select
            value={values.block_type}
            onChange={(e) => onChange({ ...values, block_type: e.target.value as PageBlock['block_type'] })}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="callout">Callout</option>
            <option value="testimonials">Testimonials</option>
            <option value="faq">FAQ</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Title (SK)</Label>
          <Input value={values.title_sk || ''} onChange={(e) => onChange({ ...values, title_sk: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Title (EN)</Label>
          <Input value={values.title_en || ''} onChange={(e) => onChange({ ...values, title_en: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Title (DE)</Label>
          <Input value={values.title_de || ''} onChange={(e) => onChange({ ...values, title_de: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Title (CN)</Label>
          <Input value={values.title_cn || ''} onChange={(e) => onChange({ ...values, title_cn: e.target.value })} className="mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Body (SK)</Label>
          <Textarea value={values.body_sk || ''} onChange={(e) => onChange({ ...values, body_sk: e.target.value })} className="mt-1" rows={4} />
        </div>
        <div>
          <Label className="text-xs">Body (EN)</Label>
          <Textarea value={values.body_en || ''} onChange={(e) => onChange({ ...values, body_en: e.target.value })} className="mt-1" rows={4} />
        </div>
        <div>
          <Label className="text-xs">Body (DE)</Label>
          <Textarea value={values.body_de || ''} onChange={(e) => onChange({ ...values, body_de: e.target.value })} className="mt-1" rows={4} />
        </div>
        <div>
          <Label className="text-xs">Body (CN)</Label>
          <Textarea value={values.body_cn || ''} onChange={(e) => onChange({ ...values, body_cn: e.target.value })} className="mt-1" rows={4} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Button Label (SK)</Label>
          <Input value={values.button_label_sk || ''} onChange={(e) => onChange({ ...values, button_label_sk: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Button Label (EN)</Label>
          <Input value={values.button_label_en || ''} onChange={(e) => onChange({ ...values, button_label_en: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Button Label (DE)</Label>
          <Input value={values.button_label_de || ''} onChange={(e) => onChange({ ...values, button_label_de: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Button Label (CN)</Label>
          <Input value={values.button_label_cn || ''} onChange={(e) => onChange({ ...values, button_label_cn: e.target.value })} className="mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Button URL</Label>
          <Input value={values.button_url || ''} onChange={(e) => onChange({ ...values, button_url: e.target.value })} className="mt-1" />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Switch checked={values.button_external || false} onCheckedChange={(v) => onChange({ ...values, button_external: v })} />
          <Label className="text-xs">Open in new tab</Label>
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
          {isNew ? 'Add Block' : 'Save Changes'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <Cancel01Icon size={14} className="mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
