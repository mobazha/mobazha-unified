'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useI18n, webhooksApi } from '@mobazha/core';
import type { WebhookEndpoint } from '@mobazha/core';
import {
  Plus,
  Trash2,
  Send,
  Pencil,
  Webhook,
  Copy,
  Check,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Loader2,
  BookOpen,
} from 'lucide-react';
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
import { useToast } from '@/components/ui/use-toast';
import {
  EventFilterSection,
  FALLBACK_CATEGORIES,
  eventFilterToCategories,
  categoriesToEventFilter,
  formatEventFilterDisplay,
  type EventCategory,
} from './EventFilterSection';

function isValidWebhookUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function WebhookSection() {
  const { t } = useI18n();
  const { toast } = useToast();

  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WebhookEndpoint | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [secretVisible, setSecretVisible] = useState(false);

  const [selectedCategories, setSelectedCategories] = useState<Set<EventCategory>>(new Set());
  const [filterMode, setFilterMode] = useState<'all' | 'custom'>('all');

  const fetchEndpoints = useCallback(async () => {
    try {
      const data = await webhooksApi.listWebhooks();
      setEndpoints(Array.isArray(data) ? data : []);
    } catch {
      setEndpoints([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEndpoints();
  }, [fetchEndpoints]);

  function openCreate() {
    setEditingId(null);
    setUrl('');
    setSelectedCategories(new Set());
    setFilterMode('all');
    setNewSecret(null);
    setSecretVisible(false);
    setDialogOpen(true);
  }

  function openEdit(ep: WebhookEndpoint) {
    setEditingId(ep.id);
    setUrl(ep.url);
    const cats = eventFilterToCategories(ep.event_types);
    if (cats.size === 0) {
      setFilterMode('all');
      setSelectedCategories(new Set());
    } else {
      setFilterMode('custom');
      setSelectedCategories(cats);
    }
    setNewSecret(null);
    setSecretVisible(false);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!isValidWebhookUrl(url)) return;
    setSaving(true);
    try {
      const eventTypes = filterMode === 'all' ? '' : categoriesToEventFilter(selectedCategories);

      if (editingId) {
        await webhooksApi.updateWebhook(editingId, {
          url,
          event_types: eventTypes,
        });
        toast({
          title: t('admin.integrations.webhookSaved'),
          variant: 'default',
        });
        await fetchEndpoints();
        setDialogOpen(false);
      } else {
        const created = await webhooksApi.createWebhook({
          url,
          event_types: eventTypes,
        });
        await fetchEndpoints();
        if (created.secret) {
          setNewSecret(created.secret);
          setSecretVisible(true);
        } else {
          toast({
            title: t('admin.integrations.webhookSaved'),
            variant: 'default',
          });
          setDialogOpen(false);
        }
      }
    } catch {
      toast({
        title: t('admin.integrations.webhookSaveFailed'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await webhooksApi.deleteWebhook(deleteTarget.id);
      toast({ title: t('admin.integrations.webhookDeleted'), variant: 'default' });
      setDeleteTarget(null);
      await fetchEndpoints();
    } catch {
      toast({
        title: t('admin.integrations.webhookDeleteFailed'),
        variant: 'destructive',
      });
    }
  }

  async function handleToggleActive(ep: WebhookEndpoint) {
    try {
      await webhooksApi.updateWebhook(ep.id, { active: !ep.active });
      fetchEndpoints();
    } catch {
      toast({
        title: t('admin.integrations.webhookSaveFailed'),
        variant: 'destructive',
      });
    }
  }

  async function handleTest(id: string) {
    setTestingId(id);
    try {
      await webhooksApi.testWebhook(id);
      toast({ title: t('admin.integrations.webhookTestSuccess'), variant: 'default' });
    } catch {
      toast({
        title: t('admin.integrations.webhookTestFailed'),
        variant: 'destructive',
      });
    } finally {
      setTestingId(null);
    }
  }

  async function handleCopy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  const urlValid = isValidWebhookUrl(url);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {t('admin.integrations.webhooks')}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('admin.integrations.webhooksDesc')}
          </p>
        </div>
        {endpoints.length > 0 && (
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            {t('admin.integrations.addWebhook')}
          </Button>
        )}
      </div>

      {endpoints.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Webhook className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {t('admin.integrations.noWebhooks')}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {t('admin.integrations.noWebhooksDesc')}
          </p>
          <Button onClick={openCreate} size="sm" className="mt-4 gap-1.5">
            <Plus className="w-4 h-4" />
            {t('admin.integrations.addWebhook')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {endpoints.map(ep => (
            <div
              key={ep.id}
              className="border border-border rounded-xl p-4 bg-card hover:border-primary/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-sm font-mono text-foreground truncate block max-w-md">
                      {ep.url}
                    </code>
                    <Badge variant={ep.active ? 'default' : 'secondary'} className="shrink-0">
                      {ep.active
                        ? t('admin.integrations.enabled')
                        : t('admin.integrations.disabled')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatEventFilterDisplay(ep.event_types, t)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch
                    checked={ep.active}
                    onCheckedChange={() => handleToggleActive(ep)}
                    aria-label={t('admin.integrations.enabled')}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleTest(ep.id)}
                    disabled={testingId === ep.id}
                    title={t('admin.integrations.webhookTest')}
                  >
                    {testingId === ep.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setExpandedId(expandedId === ep.id ? null : ep.id)}
                    title={t('admin.integrations.webhookDetails')}
                  >
                    {expandedId === ep.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(ep)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(ep)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {expandedId === ep.id && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-12 shrink-0">ID</span>
                    <code className="text-xs font-mono text-muted-foreground">{ep.id}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => handleCopy(ep.id, `id-${ep.id}`)}
                    >
                      {copiedId === `id-${ep.id}` ? (
                        <Check className="w-3 h-3 text-primary" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('admin.integrations.webhookCreatedAt')}:{' '}
                    {new Date(ep.created_at).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <details className="group rounded-xl border border-border bg-muted/30">
        <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground select-none">
          <BookOpen className="w-4 h-4" />
          {t('admin.integrations.webhookGuideTitle')}
          <ChevronDown className="w-4 h-4 ml-auto transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-4 pb-4 space-y-3 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground mb-1">
              {t('admin.integrations.webhookGuidePayload')}
            </p>
            <p>{t('admin.integrations.webhookGuidePayloadDesc')}</p>
            <pre className="mt-1.5 p-2.5 bg-muted rounded-lg text-xs font-mono overflow-x-auto">
              {`{
  "specversion": "1.0",
  "type": "order.funded",
  "source": "urn:mobazha:store:<peerID>",
  "id": "<uuid>",
  "time": "2026-03-05T12:00:00Z",
  "data": { ... }
}`}
            </pre>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">
              {t('admin.integrations.webhookGuideSignature')}
            </p>
            <p>{t('admin.integrations.webhookGuideSignatureDesc')}</p>
            <pre className="mt-1.5 p-2.5 bg-muted rounded-lg text-xs font-mono overflow-x-auto">
              {`X-Webhook-Signature: sha256=<HMAC-SHA256(secret, body)>`}
            </pre>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">
              {t('admin.integrations.webhookGuideRetry')}
            </p>
            <p>{t('admin.integrations.webhookGuideRetryDesc')}</p>
          </div>
        </div>
      </details>

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={open => {
          if (!open) {
            setNewSecret(null);
            setSecretVisible(false);
          }
          setDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? t('admin.integrations.editWebhook') : t('admin.integrations.addWebhook')}
            </DialogTitle>
          </DialogHeader>

          {newSecret ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm font-medium text-foreground mb-2">
                  {t('admin.integrations.webhookSecretTitle')}
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  {t('admin.integrations.webhookSecretWarning')}
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-muted px-2 py-1.5 rounded flex-1 break-all">
                    {secretVisible ? newSecret : '••••••••••••••••••••'}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setSecretVisible(!secretVisible)}
                  >
                    {secretVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => handleCopy(newSecret, 'secret')}
                  >
                    {copiedId === 'secret' ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              <Button onClick={() => setDialogOpen(false)} className="w-full">
                {t('admin.integrations.webhookSecretDone')}
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>{t('admin.integrations.webhookUrl')}</Label>
                <Input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://example.com/webhooks/mobazha"
                />
                {url.trim() && !urlValid && (
                  <p className="text-xs text-destructive">
                    {t('admin.integrations.webhookUrlInvalid')}
                  </p>
                )}
              </div>

              <EventFilterSection
                filterMode={filterMode}
                selectedCategories={selectedCategories}
                availableCategories={FALLBACK_CATEGORIES}
                onFilterModeChange={setFilterMode}
                onToggleCategory={cat => {
                  setSelectedCategories(prev => {
                    const next = new Set(prev);
                    if (next.has(cat)) {
                      next.delete(cat);
                    } else {
                      next.add(cat);
                    }
                    return next;
                  });
                }}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {t('admin.integrations.cancel')}
                </Button>
                <Button onClick={handleSave} disabled={saving || !urlValid}>
                  {saving ? t('admin.integrations.saving') : t('admin.integrations.save')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.integrations.deleteWebhook')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.integrations.deleteWebhookConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.integrations.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('admin.integrations.deleteWebhook')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
