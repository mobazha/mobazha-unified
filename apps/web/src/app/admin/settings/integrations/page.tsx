'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useI18n, notificationChannelsApi } from '@mobazha/core';
import type { ChannelConfig, ChannelTypeInfo } from '@mobazha/core';
import { Plus, Trash2, Send, Pencil, Bell, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';

interface ChannelFormData {
  type: string;
  name: string;
  enabled: boolean;
  event_filter: string;
  settings: Record<string, string>;
}

const emptyForm: ChannelFormData = {
  type: '',
  name: '',
  enabled: true,
  event_filter: '',
  settings: {},
};

export default function AdminIntegrationsPage() {
  const { t } = useI18n();
  const { toast } = useToast();

  const [channels, setChannels] = useState<ChannelConfig[]>([]);
  const [channelTypes, setChannelTypes] = useState<ChannelTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ChannelFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ChannelConfig | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ch, types] = await Promise.all([
        notificationChannelsApi.getNotificationChannels(),
        notificationChannelsApi.getNotificationChannelTypes(),
      ]);
      setChannels(ch ?? []);
      setChannelTypes(types ?? []);
    } catch {
      toast({ variant: 'destructive', title: t('admin.integrations.saveFailed') });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedTypeInfo = channelTypes.find(ct => ct.type === form.type);

  function openAddDialog() {
    const defaultType = channelTypes[0]?.type ?? '';
    setEditingId(null);
    setForm({ ...emptyForm, type: defaultType });
    setDialogOpen(true);
  }

  function openEditDialog(ch: ChannelConfig) {
    setEditingId(ch.id);
    const settings: Record<string, string> = {};
    for (const [k, v] of Object.entries(ch.settings)) {
      settings[k] = typeof v === 'boolean' ? '' : String(v);
    }
    setForm({
      type: ch.type,
      name: ch.name,
      enabled: ch.enabled,
      event_filter: ch.event_filter ?? '',
      settings,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.type) return;
    setSaving(true);
    try {
      const settings: Record<string, string> = {};
      for (const [k, v] of Object.entries(form.settings)) {
        if (v) settings[k] = v;
      }

      if (editingId) {
        await notificationChannelsApi.updateNotificationChannel(editingId, {
          name: form.name,
          enabled: form.enabled,
          event_filter: form.event_filter,
          settings,
        });
      } else {
        await notificationChannelsApi.addNotificationChannel({
          type: form.type,
          name: form.name,
          enabled: form.enabled,
          event_filter: form.event_filter,
          settings,
        });
      }
      toast({ title: t('admin.integrations.saved') });
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('admin.integrations.saveFailed');
      toast({
        variant: 'destructive',
        title: t('admin.integrations.saveFailed'),
        description: message,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await notificationChannelsApi.deleteNotificationChannel(deleteTarget.id);
      toast({ title: t('admin.integrations.deleted') });
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      toast({
        variant: 'destructive',
        title: t('admin.integrations.saveFailed'),
        description: message,
      });
    }
  }

  async function handleTest(id: string) {
    setTestingId(id);
    try {
      await notificationChannelsApi.testNotificationChannel(id);
      toast({ title: t('admin.integrations.testSuccess') });
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      toast({
        variant: 'destructive',
        title: t('admin.integrations.testFailed'),
        description: message,
      });
    } finally {
      setTestingId(null);
    }
  }

  function updateSetting(key: string, value: string) {
    setForm(prev => ({
      ...prev,
      settings: { ...prev.settings, [key]: value },
    }));
  }

  function channelTypeLabel(type: string): string {
    return channelTypes.find(ct => ct.type === type)?.label ?? type;
  }

  return (
    <div data-testid="admin-integrations">
      <div className="mb-6">
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('admin.settings.title')}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('admin.integrations.title')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t('admin.integrations.subtitle')}</p>
          </div>
          <Button onClick={openAddDialog} size="sm" disabled={channelTypes.length === 0}>
            <Plus className="w-4 h-4 mr-1.5" />
            {t('admin.integrations.addChannel')}
          </Button>
        </div>
      </div>

      {/* Channels list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : channels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Bell className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-foreground">{t('admin.integrations.noChannels')}</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {t('admin.integrations.noChannelsDesc')}
          </p>
          <Button onClick={openAddDialog} variant="outline" size="sm" className="mt-4">
            <Plus className="w-4 h-4 mr-1.5" />
            {t('admin.integrations.addChannel')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {channels.map(ch => (
            <div
              key={ch.id}
              className="flex items-center justify-between p-4 bg-card border border-border rounded-lg"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate">{ch.name}</span>
                    <Badge
                      variant={ch.enabled ? 'default' : 'secondary'}
                      className="text-xs shrink-0"
                    >
                      {ch.enabled
                        ? t('admin.integrations.enabled')
                        : t('admin.integrations.disabled')}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    {channelTypeLabel(ch.type)}
                    {ch.event_filter && ` · ${ch.event_filter}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTest(ch.id)}
                  disabled={!ch.enabled || testingId === ch.id}
                  title={t('admin.integrations.testChannel')}
                >
                  <Send className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditDialog(ch)}
                  title={t('admin.integrations.editChannel')}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget(ch)}
                  title={t('admin.integrations.deleteChannel')}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? t('admin.integrations.editChannel') : t('admin.integrations.addChannel')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {!editingId && (
              <div className="space-y-1.5">
                <Label>{t('admin.integrations.type')}</Label>
                <Select
                  value={form.type}
                  onValueChange={v => setForm(prev => ({ ...prev, type: v, settings: {} }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {channelTypes.map(ct => (
                      <SelectItem key={ct.type} value={ct.type}>
                        {ct.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>{t('admin.integrations.name')}</Label>
              <Input
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('admin.integrations.namePlaceholder')}
              />
            </div>

            {selectedTypeInfo?.fields.map(field => (
              <div key={field.key} className="space-y-1.5">
                <Label>
                  {field.label}
                  {field.required && <span className="text-destructive ml-0.5">*</span>}
                </Label>
                <Input
                  type={field.type === 'password' ? 'password' : 'text'}
                  value={form.settings[field.key] ?? ''}
                  onChange={e => updateSetting(field.key, e.target.value)}
                  placeholder={
                    editingId && field.type === 'password'
                      ? t('admin.integrations.passwordUnchanged')
                      : ''
                  }
                />
              </div>
            ))}

            <div className="space-y-1.5">
              <Label>{t('admin.integrations.eventFilter')}</Label>
              <Input
                value={form.event_filter}
                onChange={e => setForm(prev => ({ ...prev, event_filter: e.target.value }))}
                placeholder={t('admin.integrations.eventFilterPlaceholder')}
              />
              <p className="text-xs text-muted-foreground">
                {t('admin.integrations.eventFilterHelp')}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="channel-enabled">{t('admin.integrations.enabled')}</Label>
              <Switch
                id="channel-enabled"
                checked={form.enabled}
                onCheckedChange={v => setForm(prev => ({ ...prev, enabled: v }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t('admin.integrations.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving ? t('admin.integrations.saving') : t('admin.integrations.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.integrations.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.integrations.deleteConfirmDesc', { name: deleteTarget?.name ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.integrations.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('admin.integrations.deleteChannel')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
