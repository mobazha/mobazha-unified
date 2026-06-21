'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useI18n, notificationChannelsApi, isStandaloneMode } from '@mobazha/core';
import type { ChannelConfig, ChannelTypeInfo, ChannelFieldSchema } from '@mobazha/core';
import { Plus, Trash2, Send, Pencil, Bell } from 'lucide-react';
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
import {
  EventFilterSection,
  eventFilterToCategories,
  categoriesToEventFilter,
  formatEventFilterDisplay,
  type EventCategory,
} from './EventFilterSection';
import { TelegramSetupGuide } from './TelegramSetupGuide';
import { ChatDetector } from './ChatDetector';

interface FieldMeta {
  placeholder?: string;
  help?: string;
}

const CHANNEL_FIELD_META: Record<string, Record<string, FieldMeta>> = {
  telegram: {
    bot_token: {
      placeholder: '123456789:ABCdefGHI-jklMNOpqrSTUvwxYZ',
      help: 'admin.integrations.telegramBotTokenHelp',
    },
    chat_id: {
      placeholder: '-1001234567890',
      help: 'admin.integrations.telegramChatIdHelp',
    },
  },
  email: {
    recipient_email: {
      placeholder: 'you@example.com',
      help: 'admin.integrations.emailRecipientHelp',
    },
    sender_email: {
      placeholder: 'Mobazha <notifications@mobazha.org>',
      help: 'admin.integrations.emailSenderHelp',
    },
    api_key: {
      placeholder: 're_xxxxxxxx',
      help: 'admin.integrations.emailApiKeyHelp',
    },
    smtp_server: {
      placeholder: 'smtp.gmail.com',
      help: 'admin.integrations.emailSmtpServerHelp',
    },
    smtp_port: {
      placeholder: '587',
    },
    smtp_username: {
      placeholder: 'you@example.com',
    },
    smtp_password: {
      placeholder: '••••••••',
    },
  },
};

const FALLBACK_CHANNEL_TYPES: ChannelTypeInfo[] = [
  {
    type: 'telegram',
    label: 'Telegram',
    fields: [
      { key: 'bot_token', label: 'Bot Token', type: 'password', required: true },
      { key: 'chat_id', label: 'Chat ID', type: 'text', required: true },
    ],
  },
  {
    type: 'email',
    label: 'Email',
    fields: [
      { key: 'recipient_email', label: 'Recipient Email', type: 'text', required: true },
      { key: 'sender_email', label: 'Sender Email / Name', type: 'text', required: false },
      { key: 'api_key', label: 'Resend API Key', type: 'password', required: false },
      { key: 'smtp_server', label: 'SMTP Server', type: 'text', required: false },
      { key: 'smtp_port', label: 'SMTP Port', type: 'text', required: false },
      { key: 'smtp_username', label: 'SMTP Username', type: 'text', required: false },
      { key: 'smtp_password', label: 'SMTP Password', type: 'password', required: false },
    ],
  },
];

/**
 * Merge API-returned channel types with fallback definitions.
 * API types take priority; fallback types are appended for any missing type keys.
 */
function mergeChannelTypes(
  apiTypes: ChannelTypeInfo[],
  fallback: ChannelTypeInfo[]
): ChannelTypeInfo[] {
  if (apiTypes.length === 0) return fallback;
  const seen = new Set(apiTypes.map(t => t.type));
  const merged = [...apiTypes];
  for (const fb of fallback) {
    if (!seen.has(fb.type)) {
      merged.push(fb);
    }
  }
  return merged;
}

interface ChannelFormData {
  type: string;
  name: string;
  enabled: boolean;
  settings: Record<string, string>;
}

const emptyForm: ChannelFormData = {
  type: '',
  name: '',
  enabled: true,
  settings: {},
};

export function NotificationChannelsSection() {
  const { t } = useI18n();
  const { toast } = useToast();

  const [channels, setChannels] = useState<ChannelConfig[]>([]);
  const [channelTypes, setChannelTypes] = useState<ChannelTypeInfo[]>([]);
  const [eventCategories, setEventCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ChannelFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [filterMode, setFilterMode] = useState<'all' | 'custom'>('all');
  const [selectedCategories, setSelectedCategories] = useState<Set<EventCategory>>(new Set());

  const [deleteTarget, setDeleteTarget] = useState<ChannelConfig | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [emailMode, setEmailMode] = useState<'resend' | 'smtp'>('resend');
  const [dialogStep, setDialogStep] = useState(1);
  const standalone = isStandaloneMode();
  const isEmailStepper = form.type === 'email' && standalone;

  const fetchData = useCallback(async () => {
    setLoading(true);
    let loadedChannels: ChannelConfig[] = [];
    let loadedTypes: ChannelTypeInfo[] = [];
    let loadedCategories: string[] = [];

    try {
      const [ch, typesResp] = await Promise.all([
        notificationChannelsApi.getNotificationChannels().catch(() => []),
        notificationChannelsApi.getNotificationChannelTypes().catch(() => ({
          channel_types: [] as ChannelTypeInfo[],
          event_categories: [] as string[],
        })),
      ]);
      loadedChannels = ch ?? [];
      const apiTypes = typesResp.channel_types ?? [];
      loadedTypes = mergeChannelTypes(apiTypes, FALLBACK_CHANNEL_TYPES);
      loadedCategories = typesResp.event_categories ?? [];
    } catch {
      loadedTypes = FALLBACK_CHANNEL_TYPES;
    }

    setChannels(loadedChannels);
    setChannelTypes(loadedTypes);
    setEventCategories(loadedCategories);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedTypeInfo = channelTypes.find(ct => ct.type === form.type);

  function getFieldMeta(channelType: string, fieldKey: string): FieldMeta {
    return CHANNEL_FIELD_META[channelType]?.[fieldKey] ?? {};
  }

  function initFilterState(eventFilter: string) {
    if (!eventFilter.trim()) {
      setFilterMode('all');
      setSelectedCategories(new Set());
    } else {
      setFilterMode('custom');
      setSelectedCategories(eventFilterToCategories(eventFilter));
    }
  }

  function openAddDialog() {
    const defaultType = channelTypes[0]?.type ?? '';
    const autoName =
      !standalone && defaultType === 'email' ? t('admin.integrations.emailDefaultName') : '';
    setEditingId(null);
    setForm({ ...emptyForm, type: defaultType, name: autoName });
    setEmailMode('resend');
    setDialogStep(1);
    initFilterState('');
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
      settings,
    });
    if (ch.type === 'email') {
      setEmailMode(settings['smtp_server'] ? 'smtp' : 'resend');
    }
    setDialogStep(1);
    initFilterState(ch.event_filter ?? '');
    setDialogOpen(true);
  }

  function buildEventFilter(): string {
    if (filterMode === 'all') return '';
    return categoriesToEventFilter(selectedCategories);
  }

  const EMAIL_RESEND_KEYS = new Set(['api_key']);
  const EMAIL_SMTP_KEYS = new Set(['smtp_server', 'smtp_port', 'smtp_username', 'smtp_password']);

  async function handleSave() {
    if (!form.name.trim() || !form.type) return;
    setSaving(true);
    try {
      const settings: Record<string, string> = {};
      const skipKeys =
        form.type === 'email'
          ? emailMode === 'resend'
            ? EMAIL_SMTP_KEYS
            : EMAIL_RESEND_KEYS
          : undefined;
      for (const [k, v] of Object.entries(form.settings)) {
        if (v && !skipKeys?.has(k)) settings[k] = v;
      }

      const eventFilter = buildEventFilter();

      if (editingId) {
        await notificationChannelsApi.updateNotificationChannel(editingId, {
          name: form.name,
          enabled: form.enabled,
          event_filter: eventFilter,
          settings,
        });
      } else {
        await notificationChannelsApi.addNotificationChannel({
          type: form.type,
          name: form.name,
          enabled: form.enabled,
          event_filter: eventFilter,
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
      const message = err instanceof Error ? err.message : t('admin.integrations.deleteFailed');
      toast({
        variant: 'destructive',
        title: t('admin.integrations.deleteFailed'),
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

  function toggleCategory(cat: EventCategory) {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }

  function renderFieldWithHelp(field: ChannelFieldSchema) {
    const meta = getFieldMeta(form.type, field.key);
    const isEditing = !!editingId;
    const isPassword = field.type === 'password';
    const isChatId = field.key === 'chat_id' && form.type === 'telegram';

    return (
      <div key={field.key} className="space-y-1.5">
        <Label>
          {field.label}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        <div className={isChatId ? 'flex gap-2' : ''}>
          <Input
            type={isPassword ? 'password' : 'text'}
            value={form.settings[field.key] ?? ''}
            onChange={e => updateSetting(field.key, e.target.value)}
            placeholder={
              isEditing && isPassword
                ? t('admin.integrations.passwordUnchanged')
                : (meta.placeholder ?? '')
            }
            className={isChatId ? 'flex-1' : ''}
          />
          {isChatId && (
            <ChatDetector
              botToken={form.settings['bot_token'] ?? ''}
              onSelectChat={chatId => updateSetting('chat_id', chatId)}
            />
          )}
        </div>
        {meta.help && <p className="text-xs text-muted-foreground">{t(meta.help)}</p>}
      </div>
    );
  }

  function renderEmailStep1(fields: ChannelFieldSchema[]) {
    const recipientField = fields.find(f => f.key === 'recipient_email');
    return recipientField ? renderFieldWithHelp(recipientField) : null;
  }

  function renderEmailStep2(fields: ChannelFieldSchema[]) {
    const senderField = fields.find(f => f.key === 'sender_email');
    const resend = fields.filter(f => EMAIL_RESEND_KEYS.has(f.key));
    const smtpServer = fields.find(f => f.key === 'smtp_server');
    const smtpPort = fields.find(f => f.key === 'smtp_port');
    const smtpUser = fields.find(f => f.key === 'smtp_username');
    const smtpPass = fields.find(f => f.key === 'smtp_password');

    return (
      <>
        {senderField && renderFieldWithHelp(senderField)}

        <div className="space-y-2 pt-1">
          <Label>{t('admin.integrations.emailDeliveryMethod')}</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setEmailMode('resend')}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                emailMode === 'resend'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              Resend API
              <span className="block text-xs font-normal mt-0.5 opacity-70">
                {t('admin.integrations.emailResendHint')}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setEmailMode('smtp')}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                emailMode === 'smtp'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              SMTP
              <span className="block text-xs font-normal mt-0.5 opacity-70">
                {t('admin.integrations.emailSmtpHint')}
              </span>
            </button>
          </div>
        </div>

        {emailMode === 'resend' ? (
          resend.map(field => renderFieldWithHelp(field))
        ) : (
          <>
            <div className="grid grid-cols-[1fr_100px] gap-2">
              {smtpServer && renderCompactField(smtpServer)}
              {smtpPort && renderCompactField(smtpPort)}
            </div>
            {smtpUser && renderFieldWithHelp(smtpUser)}
            {smtpPass && renderFieldWithHelp(smtpPass)}
          </>
        )}
      </>
    );
  }

  function renderCompactField(field: ChannelFieldSchema) {
    const meta = getFieldMeta(form.type, field.key);
    const isEditing = !!editingId;
    const isPassword = field.type === 'password';
    return (
      <div key={field.key} className="space-y-1.5">
        <Label className="text-xs">
          {field.label}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        <Input
          type={isPassword ? 'password' : 'text'}
          value={form.settings[field.key] ?? ''}
          onChange={e => updateSetting(field.key, e.target.value)}
          placeholder={
            isEditing && isPassword
              ? t('admin.integrations.passwordUnchanged')
              : (meta.placeholder ?? '')
          }
        />
      </div>
    );
  }

  return (
    <>
      {!loading && channels.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium text-foreground">{t('admin.integrations.channels')}</h3>
            <p className="text-sm text-muted-foreground">{t('admin.integrations.channelsDesc')}</p>
          </div>
          <Button onClick={openAddDialog} size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            {t('admin.integrations.addChannel')}
          </Button>
        </div>
      )}

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
          <Button onClick={openAddDialog} size="sm" className="mt-4 gap-1.5">
            <Plus className="w-4 h-4" />
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
                    {' · '}
                    {formatEventFilterDisplay(ch.event_filter, t)}
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
                  aria-label={t('admin.integrations.testChannel')}
                >
                  <Send className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditDialog(ch)}
                  title={t('admin.integrations.editChannel')}
                  aria-label={t('admin.integrations.editChannel')}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget(ch)}
                  title={t('admin.integrations.deleteChannel')}
                  aria-label={t('admin.integrations.deleteChannel')}
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
              {editingId
                ? t('admin.integrations.editChannel')
                : isEmailStepper && dialogStep === 2
                  ? t('admin.integrations.emailStepDelivery')
                  : t('admin.integrations.addChannel')}
            </DialogTitle>
            {isEmailStepper && (
              <div className="flex items-center gap-1.5 pt-1">
                <div
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    dialogStep >= 1 ? 'bg-primary' : 'bg-muted'
                  }`}
                />
                <div
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    dialogStep >= 2 ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              </div>
            )}
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Step 1: Basic info (all types) or Email step 1 */}
            {(!isEmailStepper || dialogStep === 1) && (
              <>
                {!editingId && (
                  <div className="space-y-1.5">
                    <Label>{t('admin.integrations.type')}</Label>
                    {channelTypes.length === 1 ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md text-sm">
                        <span className="font-medium">{channelTypes[0].label}</span>
                      </div>
                    ) : (
                      <Select
                        value={form.type}
                        onValueChange={v => {
                          const autoName =
                            !standalone && v === 'email' && !form.name.trim()
                              ? t('admin.integrations.emailDefaultName')
                              : form.name;
                          setForm(prev => ({ ...prev, type: v, name: autoName, settings: {} }));
                          setDialogStep(1);
                        }}
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
                    )}
                  </div>
                )}

                {form.type === 'telegram' && !editingId && <TelegramSetupGuide />}

                <div className="space-y-1.5">
                  <Label>
                    {t('admin.integrations.name')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={t('admin.integrations.namePlaceholder')}
                  />
                </div>

                {form.type === 'email' && selectedTypeInfo
                  ? renderEmailStep1(selectedTypeInfo.fields)
                  : selectedTypeInfo?.fields.map(field => renderFieldWithHelp(field))}
              </>
            )}

            {/* Step 2: Email delivery config */}
            {isEmailStepper &&
              dialogStep === 2 &&
              selectedTypeInfo &&
              renderEmailStep2(selectedTypeInfo.fields)}

            {/* Event filter + Enable: show on step 2 for email, always for others */}
            {(!isEmailStepper || dialogStep === 2) && (
              <>
                <EventFilterSection
                  filterMode={filterMode}
                  selectedCategories={selectedCategories}
                  availableCategories={eventCategories}
                  onFilterModeChange={setFilterMode}
                  onToggleCategory={toggleCategory}
                />

                <div className="flex items-center justify-between">
                  <Label htmlFor="channel-enabled">{t('admin.integrations.enabled')}</Label>
                  <Switch
                    id="channel-enabled"
                    checked={form.enabled}
                    onCheckedChange={v => setForm(prev => ({ ...prev, enabled: v }))}
                  />
                </div>
              </>
            )}

            {/* Footer buttons */}
            <div className="flex justify-end gap-2 pt-2">
              {isEmailStepper && dialogStep === 2 ? (
                <>
                  <Button variant="outline" onClick={() => setDialogStep(1)}>
                    {t('admin.integrations.back')}
                  </Button>
                  <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
                    {saving ? t('admin.integrations.saving') : t('admin.integrations.save')}
                  </Button>
                </>
              ) : isEmailStepper && dialogStep === 1 ? (
                <>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    {t('admin.integrations.cancel')}
                  </Button>
                  <Button
                    onClick={() => setDialogStep(2)}
                    disabled={!form.name.trim() || !form.settings['recipient_email']?.trim()}
                  >
                    {t('admin.integrations.next')}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    {t('admin.integrations.cancel')}
                  </Button>
                  <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
                    {saving ? t('admin.integrations.saving') : t('admin.integrations.save')}
                  </Button>
                </>
              )}
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
    </>
  );
}
