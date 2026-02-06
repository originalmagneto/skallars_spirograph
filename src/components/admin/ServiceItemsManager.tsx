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
import { Add01Icon, Delete01Icon, PencilEdit01Icon, Cancel01Icon, Tick01Icon, ArrowUp01Icon, ArrowDown01Icon, ListViewIcon } from 'hugeicons-react';
import { AdminActionBar, AdminPanelHeader, AdminSectionCard } from '@/components/admin/AdminPrimitives';

interface ServiceItem {
  id?: string;
  slug: string;
  title_sk: string;
  title_en: string;
  title_de: string;
  title_cn: string;
  description_sk: string;
  description_en: string;
  description_de: string;
  description_cn: string;
  icon?: string | null;
  enabled: boolean;
  sort_order: number;
}

const emptyItem: ServiceItem = {
  slug: '',
  title_sk: '',
  title_en: '',
  title_de: '',
  title_cn: '',
  description_sk: '',
  description_en: '',
  description_de: '',
  description_cn: '',
  icon: '',
  enabled: true,
  sort_order: 0,
};

export default function ServiceItemsManager() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ServiceItem>(emptyItem);
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<ServiceItem>(emptyItem);

  const { data: items, isLoading } = useQuery({
    queryKey: ['service-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_items')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) {
        console.warn('Could not fetch service items:', error);
        return [] as ServiceItem[];
      }
      return data as ServiceItem[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (item: ServiceItem) => {
      const { error } = await supabase.from('service_items').insert(item);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Service item added');
      queryClient.invalidateQueries({ queryKey: ['service-items'] });
      setIsAdding(false);
      setNewItem(emptyItem);
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (item: ServiceItem) => {
      if (!item.id) return;
      const { error } = await supabase.from('service_items').update(item).eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Service item updated');
      queryClient.invalidateQueries({ queryKey: ['service-items'] });
      setEditingId(null);
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('service_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Service item deleted');
      queryClient.invalidateQueries({ queryKey: ['service-items'] });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const reorderMutation = useMutation({
    mutationFn: async (rows: ServiceItem[]) => {
      const payload = rows.map((row, index) => ({
        id: row.id,
        sort_order: index + 1,
      }));
      const { error } = await supabase.from('service_items').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-items'] });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const startEdit = (item: ServiceItem) => {
    setEditingId(item.id || null);
    setEditForm({ ...item });
  };

  const handleSave = () => {
    if (editingId) {
      updateMutation.mutate({ ...editForm });
    }
  };

  const handleAdd = () => {
    const nextOrder = (items?.length || 0) + 1;
    createMutation.mutate({ ...newItem, sort_order: nextOrder });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (!items) return;
    const next = [...items];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= next.length) return;
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    reorderMutation.mutate(next);
  };

  const toggleEnabled = (item: ServiceItem, value: boolean) => {
    updateMutation.mutate({ ...item, enabled: value });
  };

  if (isLoading) return <div className="p-4 text-muted-foreground">Loading services...</div>;

  return (
    <div className="space-y-6">
      <AdminPanelHeader
        title="Service Items"
        description="Manage multilingual service cards shown on the homepage."
        actions={(
          <>
            <Badge variant="secondary">{items?.length || 0}</Badge>
            {!isAdding && (
              <Button size="sm" onClick={() => setIsAdding(true)}>
                <Add01Icon size={14} className="mr-1" />
                Add Service
              </Button>
            )}
          </>
        )}
      />

      <AdminActionBar>
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ListViewIcon size={16} className="text-primary" />
          Reorder with arrows and toggle visibility per service.
        </div>
      </AdminActionBar>

      {isAdding && (
        <AdminSectionCard className="space-y-4 bg-muted/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Slug</Label>
              <Input
                value={newItem.slug}
                onChange={(e) => setNewItem({ ...newItem, slug: e.target.value })}
                placeholder="corporate"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Icon (Emoji or Short Label)</Label>
              <Input
                value={newItem.icon || ''}
                onChange={(e) => setNewItem({ ...newItem, icon: e.target.value })}
                placeholder="⚖️"
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Title (SK)</Label>
              <Input value={newItem.title_sk} onChange={(e) => setNewItem({ ...newItem, title_sk: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Title (EN)</Label>
              <Input value={newItem.title_en} onChange={(e) => setNewItem({ ...newItem, title_en: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Title (DE)</Label>
              <Input value={newItem.title_de} onChange={(e) => setNewItem({ ...newItem, title_de: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Title (CN)</Label>
              <Input value={newItem.title_cn} onChange={(e) => setNewItem({ ...newItem, title_cn: e.target.value })} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Description (SK)</Label>
              <Textarea value={newItem.description_sk} onChange={(e) => setNewItem({ ...newItem, description_sk: e.target.value })} rows={4} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Description (EN)</Label>
              <Textarea value={newItem.description_en} onChange={(e) => setNewItem({ ...newItem, description_en: e.target.value })} rows={4} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Description (DE)</Label>
              <Textarea value={newItem.description_de} onChange={(e) => setNewItem({ ...newItem, description_de: e.target.value })} rows={4} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Description (CN)</Label>
              <Textarea value={newItem.description_cn} onChange={(e) => setNewItem({ ...newItem, description_cn: e.target.value })} rows={4} className="mt-1" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleAdd}>
              <Tick01Icon size={14} className="mr-1" />
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
              <Cancel01Icon size={14} className="mr-1" />
              Cancel
            </Button>
          </div>
        </AdminSectionCard>
      )}

      <AdminSectionCard className="space-y-3">
        {(items || []).map((item, index) => (
          <div key={item.id || item.slug} className="border rounded-lg px-4 py-3 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <Button size="icon" variant="ghost" onClick={() => moveItem(index, 'up')} disabled={index === 0}>
                    <ArrowUp01Icon size={16} />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => moveItem(index, 'down')} disabled={index === (items?.length || 1) - 1}>
                    <ArrowDown01Icon size={16} />
                  </Button>
                </div>
                <div>
                  <div className="text-sm font-medium flex items-center gap-2">
                    {item.icon ? <span>{item.icon}</span> : null}
                    {item.title_sk}
                  </div>
                  <div className="text-xs text-muted-foreground">{item.slug}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={item.enabled} onCheckedChange={(value) => toggleEnabled(item, value)} />
                <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                  <PencilEdit01Icon size={14} className="mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm('Delete this service item?')) deleteMutation.mutate(item.id as string);
                  }}
                >
                  <Delete01Icon size={14} />
                </Button>
              </div>
            </div>

            {editingId === item.id && (
              <div className="mt-4 space-y-4 border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Slug</Label>
                    <Input value={editForm.slug} disabled className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Icon (Emoji or Short Label)</Label>
                    <Input value={editForm.icon || ''} onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })} className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Title (SK)</Label>
                    <Input value={editForm.title_sk} onChange={(e) => setEditForm({ ...editForm, title_sk: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Title (EN)</Label>
                    <Input value={editForm.title_en} onChange={(e) => setEditForm({ ...editForm, title_en: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Title (DE)</Label>
                    <Input value={editForm.title_de} onChange={(e) => setEditForm({ ...editForm, title_de: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Title (CN)</Label>
                    <Input value={editForm.title_cn} onChange={(e) => setEditForm({ ...editForm, title_cn: e.target.value })} className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Description (SK)</Label>
                    <Textarea value={editForm.description_sk} onChange={(e) => setEditForm({ ...editForm, description_sk: e.target.value })} rows={4} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Description (EN)</Label>
                    <Textarea value={editForm.description_en} onChange={(e) => setEditForm({ ...editForm, description_en: e.target.value })} rows={4} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Description (DE)</Label>
                    <Textarea value={editForm.description_de} onChange={(e) => setEditForm({ ...editForm, description_de: e.target.value })} rows={4} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Description (CN)</Label>
                    <Textarea value={editForm.description_cn} onChange={(e) => setEditForm({ ...editForm, description_cn: e.target.value })} rows={4} className="mt-1" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleSave}>
                    <Tick01Icon size={14} className="mr-1" />
                    Save Changes
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    <Cancel01Icon size={14} className="mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </AdminSectionCard>
    </div>
  );
}
