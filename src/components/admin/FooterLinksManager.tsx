"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Add01Icon, Delete01Icon, PencilEdit01Icon, Cancel01Icon, Tick01Icon, Link01Icon } from 'hugeicons-react';
import { AdminActionBar, AdminPanelHeader, AdminSectionCard } from '@/components/admin/AdminPrimitives';

interface FooterLink {
  id?: string;
  section: 'solutions' | 'social';
  label_sk: string;
  label_en: string;
  label_de: string;
  label_cn: string;
  url: string;
  is_external: boolean;
  enabled: boolean;
  sort_order: number;
}

const emptyLink: FooterLink = {
  section: 'solutions',
  label_sk: '',
  label_en: '',
  label_de: '',
  label_cn: '',
  url: '',
  is_external: false,
  enabled: true,
  sort_order: 0,
};

export default function FooterLinksManager() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FooterLink>(emptyLink);
  const [isAdding, setIsAdding] = useState(false);
  const [newLink, setNewLink] = useState<FooterLink>(emptyLink);

  const { data: links, isLoading } = useQuery({
    queryKey: ['footer-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('footer_links')
        .select('*')
        .order('section', { ascending: true })
        .order('sort_order', { ascending: true });
      if (error) {
        console.warn('Could not fetch footer links:', error);
        return [] as FooterLink[];
      }
      return data as FooterLink[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (link: FooterLink) => {
      const { error } = await supabase.from('footer_links').insert(link);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Footer link added');
      queryClient.invalidateQueries({ queryKey: ['footer-links'] });
      setIsAdding(false);
      setNewLink(emptyLink);
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (link: FooterLink) => {
      if (!link.id) return;
      const { error } = await supabase.from('footer_links').update(link).eq('id', link.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Footer link updated');
      queryClient.invalidateQueries({ queryKey: ['footer-links'] });
      setEditingId(null);
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('footer_links').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Footer link deleted');
      queryClient.invalidateQueries({ queryKey: ['footer-links'] });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const startEdit = (link: FooterLink) => {
    setEditingId(link.id || null);
    setEditForm({ ...link });
  };

  const handleSave = () => {
    if (editingId) updateMutation.mutate({ ...editForm });
  };

  const handleAdd = () => {
    const nextOrder = (links?.length || 0) + 1;
    createMutation.mutate({ ...newLink, sort_order: nextOrder });
  };

  if (isLoading) return <div className="p-4 text-muted-foreground">Loading footer links...</div>;

  return (
    <div className="space-y-6">
      <AdminPanelHeader
        title="Footer Links"
        description="Edit multilingual links for solutions and social sections."
        actions={(
          <>
            <Badge variant="secondary">{links?.length || 0}</Badge>
            {!isAdding && (
              <Button size="sm" onClick={() => setIsAdding(true)}>
                <Add01Icon size={14} className="mr-1" />
                Add Link
              </Button>
            )}
          </>
        )}
      />

      <AdminActionBar>
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Link01Icon size={14} className="text-primary" />
          Group links by section and keep labels short for mobile.
        </span>
      </AdminActionBar>

      {isAdding && (
        <AdminSectionCard className="space-y-4 bg-muted/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Section</Label>
              <select
                value={newLink.section}
                onChange={(e) => setNewLink({ ...newLink, section: e.target.value as FooterLink['section'] })}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="solutions">Solutions</option>
                <option value="social">Social</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">URL</Label>
              <Input value={newLink.url} onChange={(e) => setNewLink({ ...newLink, url: e.target.value })} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Label (SK)</Label>
              <Input value={newLink.label_sk} onChange={(e) => setNewLink({ ...newLink, label_sk: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Label (EN)</Label>
              <Input value={newLink.label_en} onChange={(e) => setNewLink({ ...newLink, label_en: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Label (DE)</Label>
              <Input value={newLink.label_de} onChange={(e) => setNewLink({ ...newLink, label_de: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Label (CN)</Label>
              <Input value={newLink.label_cn} onChange={(e) => setNewLink({ ...newLink, label_cn: e.target.value })} className="mt-1" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Switch checked={newLink.is_external} onCheckedChange={(v) => setNewLink({ ...newLink, is_external: v })} />
              <Label className="text-xs">Open in new tab</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newLink.enabled} onCheckedChange={(v) => setNewLink({ ...newLink, enabled: v })} />
              <Label className="text-xs">Enabled</Label>
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
        {(links || []).map((link) => (
          <div key={link.id || link.url} className="border rounded-lg px-4 py-3 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{link.label_sk}</div>
                <div className="text-xs text-muted-foreground">{link.section} • {link.url}</div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={link.enabled} onCheckedChange={(v) => updateMutation.mutate({ ...link, enabled: v })} />
                <Button size="sm" variant="outline" onClick={() => startEdit(link)}>
                  <PencilEdit01Icon size={14} className="mr-1" />
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(link.id as string)}>
                  <Delete01Icon size={14} />
                </Button>
              </div>
            </div>

            {editingId === link.id && (
              <div className="mt-4 space-y-4 border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Section</Label>
                    <select
                      value={editForm.section}
                      onChange={(e) => setEditForm({ ...editForm, section: e.target.value as FooterLink['section'] })}
                      className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    >
                      <option value="solutions">Solutions</option>
                      <option value="social">Social</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">URL</Label>
                    <Input value={editForm.url} onChange={(e) => setEditForm({ ...editForm, url: e.target.value })} className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Label (SK)</Label>
                    <Input value={editForm.label_sk} onChange={(e) => setEditForm({ ...editForm, label_sk: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Label (EN)</Label>
                    <Input value={editForm.label_en} onChange={(e) => setEditForm({ ...editForm, label_en: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Label (DE)</Label>
                    <Input value={editForm.label_de} onChange={(e) => setEditForm({ ...editForm, label_de: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Label (CN)</Label>
                    <Input value={editForm.label_cn} onChange={(e) => setEditForm({ ...editForm, label_cn: e.target.value })} className="mt-1" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={editForm.is_external} onCheckedChange={(v) => setEditForm({ ...editForm, is_external: v })} />
                    <Label className="text-xs">Open in new tab</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={editForm.enabled} onCheckedChange={(v) => setEditForm({ ...editForm, enabled: v })} />
                    <Label className="text-xs">Enabled</Label>
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
