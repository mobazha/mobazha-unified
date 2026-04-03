'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useI18n, useUserStore } from '@mobazha/core';
import { useSalesChannels } from '@mobazha/core/hooks/useSalesChannels';
import type { UseSalesChannelsReturn } from '@mobazha/core/hooks/useSalesChannels';
import { useStoreDomain } from '@mobazha/core/hooks/useStoreDomain';
import { getStoreSubdomainBase } from '@mobazha/core/config/env';
import type { UseStoreDomainReturn } from '@mobazha/core/hooks/useStoreDomain';
import { SettingsSection } from '@/components/SettingsLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
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
  Link2,
  Copy,
  RefreshCw,
  Bot,
  Check,
  ExternalLink,
  Loader2,
  Trash2,
  Send,
  Smartphone,
  Globe,
} from 'lucide-react';

function CopyButton({ text }: { text: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      aria-label={copied ? t('common.copied') : t('common.copy')}
      title={copied ? t('common.copied') : t('common.copy')}
    >
      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

function LinkRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
        <div className="text-sm text-foreground font-mono truncate">{value}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <CopyButton text={value} />
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}

function StoreHandleSection({
  domain,
  loading,
  availability,
  checking,
  setHandle,
  removeDomain,
  checkAvailability,
}: Pick<
  UseStoreDomainReturn,
  | 'domain'
  | 'loading'
  | 'availability'
  | 'checking'
  | 'setHandle'
  | 'removeDomain'
  | 'checkAvailability'
>) {
  const { t } = useI18n();
  const { toast } = useToast();

  const [inputValue, setInputValue] = useState(domain?.handle || '');
  const [saving, setSaving] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevHandle = useRef(domain?.handle);

  if (domain?.handle !== prevHandle.current) {
    prevHandle.current = domain?.handle;
    if (domain?.handle && domain.handle !== inputValue) {
      setInputValue(domain.handle);
    }
  }

  const handleInputChange = useCallback(
    (value: string) => {
      const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
      setInputValue(normalized);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (normalized.length >= 3 && normalized !== domain?.handle) {
        debounceRef.current = setTimeout(() => {
          checkAvailability(normalized);
        }, 500);
      }
    },
    [domain?.handle, checkAvailability]
  );

  const handleSave = useCallback(async () => {
    if (!inputValue || inputValue.length < 3) return;
    setSaving(true);
    const result = await setHandle(inputValue);
    setSaving(false);
    if (result) {
      toast({ variant: 'success', title: t('admin.salesChannels.handleSaved') });
    }
  }, [inputValue, setHandle, toast, t]);

  const handleRemove = useCallback(async () => {
    setRemoving(true);
    const success = await removeDomain();
    setRemoving(false);
    setShowRemoveConfirm(false);
    if (success) {
      setInputValue('');
      toast({ variant: 'success', title: t('admin.salesChannels.handleRemoved') });
    }
  }, [removeDomain, toast, t]);

  if (loading && !domain) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        {t('common.loading')}
      </div>
    );
  }

  const isChanged = inputValue !== (domain?.handle || '');
  const isValid = inputValue.length >= 3 && inputValue.length <= 32;

  return (
    <div className="space-y-4">
      {domain?.subdomainUrl && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Globe className="w-5 h-5 text-primary shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground mb-0.5">
              {t('admin.salesChannels.handleCurrentUrl')}
            </div>
            <div className="text-sm font-mono text-foreground truncate">{domain.subdomainUrl}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <CopyButton text={domain.subdomainUrl} />
            <a
              href={domain.subdomainUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          {t('admin.salesChannels.handleLabel')}
        </label>
        <div className="flex items-center gap-0">
          <Input
            value={inputValue}
            onChange={e => handleInputChange(e.target.value)}
            placeholder={t('admin.salesChannels.handlePlaceholder')}
            className="rounded-r-none border-r-0"
            maxLength={32}
          />
          <div className="flex items-center px-3 h-9 bg-muted border border-input rounded-r-md text-sm text-muted-foreground whitespace-nowrap">
            .{getStoreSubdomainBase()}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t('admin.salesChannels.handleHint')}</p>

        {isChanged && isValid && !checking && availability && (
          <p
            className={`text-xs ${availability.available ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}
          >
            {availability.available
              ? t('admin.salesChannels.handleAvailable')
              : availability.reason || t('admin.salesChannels.handleTaken')}
          </p>
        )}
        {checking && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            Checking...
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          onClick={handleSave}
          disabled={
            !isChanged || !isValid || saving || (availability != null && !availability.available)
          }
          className="gap-1.5"
          size="sm"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {t('admin.salesChannels.handleSaveButton')}
        </Button>
        {domain?.handle && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRemoveConfirm(true)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t('admin.salesChannels.handleRemoveButton')}
          </Button>
        )}
      </div>

      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.salesChannels.handleRemoveConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.salesChannels.handleRemoveConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StoreLinkSection({
  storeLink,
  storeLinkLoading,
  loadStoreLink,
  regenerateLink,
}: Pick<
  UseSalesChannelsReturn,
  'storeLink' | 'storeLinkLoading' | 'loadStoreLink' | 'regenerateLink'
>) {
  const { t } = useI18n();
  const { toast } = useToast();

  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    const result = await regenerateLink();
    setRegenerating(false);
    setShowRegenConfirm(false);
    if (result) {
      toast({ variant: 'success', title: t('admin.salesChannels.linkRegenerated') });
    }
  }, [regenerateLink, toast, t]);

  if (storeLinkLoading && !storeLink) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        {t('common.loading')}
      </div>
    );
  }

  if (!storeLink) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground mb-3">{t('admin.salesChannels.noLink')}</p>
        <Button onClick={loadStoreLink} variant="outline" size="sm">
          {t('admin.salesChannels.generateLink')}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-0 divide-y divide-border">
        {storeLink.telegramLink && (
          <LinkRow
            icon={Send}
            label={t('admin.salesChannels.telegramLink')}
            value={storeLink.telegramLink}
            href={storeLink.telegramLink}
          />
        )}
        {storeLink.directLink && (
          <LinkRow
            icon={Link2}
            label={t('admin.salesChannels.directLink')}
            value={storeLink.directLink}
            href={storeLink.directLink}
          />
        )}
        {storeLink.deepLink && (
          <LinkRow
            icon={Smartphone}
            label={t('admin.salesChannels.mobileDeepLink')}
            value={storeLink.deepLink}
          />
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground">
          {t('admin.salesChannels.shortCode')}:{' '}
          <span className="font-mono">{storeLink.shortCode}</span>
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRegenConfirm(true)}
          className="gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t('admin.salesChannels.regenerate')}
        </Button>
      </div>

      <AlertDialog open={showRegenConfirm} onOpenChange={setShowRegenConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.salesChannels.regenerateConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.salesChannels.regenerateConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerate} disabled={regenerating}>
              {regenerating && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function TelegramBotSection({
  storeBot,
  storeBotLoading,
  storeBotNotFound,
  bindBot,
  unbindBot,
}: Pick<
  UseSalesChannelsReturn,
  'storeBot' | 'storeBotLoading' | 'storeBotNotFound' | 'bindBot' | 'unbindBot'
>) {
  const { t } = useI18n();
  const { toast } = useToast();

  const [botToken, setBotToken] = useState('');
  const [binding, setBinding] = useState(false);
  const [showUnbindConfirm, setShowUnbindConfirm] = useState(false);
  const [unbinding, setUnbinding] = useState(false);

  const handleBind = useCallback(async () => {
    if (!botToken.trim()) return;
    setBinding(true);
    const result = await bindBot(botToken.trim());
    setBinding(false);
    if (result) {
      setBotToken('');
      toast({ variant: 'success', title: t('admin.salesChannels.botBound') });
    }
  }, [botToken, bindBot, toast, t]);

  const handleUnbind = useCallback(async () => {
    setUnbinding(true);
    const success = await unbindBot();
    setUnbinding(false);
    setShowUnbindConfirm(false);
    if (success) {
      toast({ variant: 'success', title: t('admin.salesChannels.botUnbound') });
    }
  }, [unbindBot, toast, t]);

  if (storeBotLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        {t('common.loading')}
      </div>
    );
  }

  if (storeBot && !storeBotNotFound) {
    return (
      <>
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Bot className="w-5 h-5 text-primary" />
            <div>
              <div className="text-sm font-medium text-foreground">@{storeBot.botUsername}</div>
              <div className="text-xs text-muted-foreground">Bot ID: {storeBot.botID}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0"
            >
              {t('admin.salesChannels.connected')}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUnbindConfirm(true)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {storeBot.directLink && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-1.5">
              {t('admin.salesChannels.botWebAppUrl')}
            </p>
            <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
              <code className="text-xs font-mono text-foreground flex-1 truncate">
                {storeBot.directLink}
              </code>
              <CopyButton text={storeBot.directLink} />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {t('admin.salesChannels.botWebAppUrlHint')}
            </p>
          </div>
        )}

        <AlertDialog open={showUnbindConfirm} onOpenChange={setShowUnbindConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('admin.salesChannels.unbindConfirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('admin.salesChannels.unbindConfirmDesc', { botUsername: storeBot.botUsername })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleUnbind}
                disabled={unbinding}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {unbinding && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                {t('admin.salesChannels.unbind')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
        <p className="text-sm font-medium text-foreground">
          {t('admin.salesChannels.setupGuideTitle')}
        </p>
        <ol className="space-y-1.5 text-sm text-muted-foreground list-decimal list-inside">
          <li>{t('admin.salesChannels.setupStep1')}</li>
          <li>{t('admin.salesChannels.setupStep2')}</li>
          <li>{t('admin.salesChannels.setupStep3')}</li>
          <li>{t('admin.salesChannels.setupStep4')}</li>
        </ol>
      </div>

      <div className="space-y-2">
        <Input
          type="password"
          placeholder={t('admin.salesChannels.botTokenPlaceholder')}
          value={botToken}
          onChange={e => setBotToken(e.target.value)}
          autoComplete="off"
        />
        <Button
          onClick={handleBind}
          disabled={!botToken.trim() || binding}
          className="w-full gap-1.5"
        >
          {binding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
          {t('admin.salesChannels.connectBot')}
        </Button>
      </div>
    </div>
  );
}

export default function SalesChannelsContent() {
  const { t } = useI18n();
  const { toast } = useToast();
  const profile = useUserStore(s => s.profile);
  const peerID = profile?.peerID || '';

  const salesChannels = useSalesChannels({ peerID, autoLoad: true });
  const storeDomain = useStoreDomain({ peerID, autoLoad: true });

  const prevSCErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (salesChannels.error && salesChannels.error !== prevSCErrorRef.current) {
      toast({ variant: 'destructive', title: salesChannels.error });
    }
    prevSCErrorRef.current = salesChannels.error;
  }, [salesChannels.error, toast]);

  const prevDomainErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (storeDomain.error && storeDomain.error !== prevDomainErrorRef.current) {
      toast({ variant: 'destructive', title: storeDomain.error });
    }
    prevDomainErrorRef.current = storeDomain.error;
  }, [storeDomain.error, toast]);

  return (
    <div className="space-y-8">
      <SettingsSection
        title={t('admin.salesChannels.storeHandleTitle')}
        description={t('admin.salesChannels.storeHandleDesc')}
      >
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <StoreHandleSection
            domain={storeDomain.domain}
            loading={storeDomain.loading}
            availability={storeDomain.availability}
            checking={storeDomain.checking}
            setHandle={storeDomain.setHandle}
            removeDomain={storeDomain.removeDomain}
            checkAvailability={storeDomain.checkAvailability}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title={t('admin.salesChannels.storeLinksTitle')}
        description={t('admin.salesChannels.storeLinksDesc')}
      >
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <StoreLinkSection
            storeLink={salesChannels.storeLink}
            storeLinkLoading={salesChannels.storeLinkLoading}
            loadStoreLink={salesChannels.loadStoreLink}
            regenerateLink={salesChannels.regenerateLink}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title={t('admin.salesChannels.telegramBotTitle')}
        description={t('admin.salesChannels.telegramBotDesc')}
      >
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <TelegramBotSection
            storeBot={salesChannels.storeBot}
            storeBotLoading={salesChannels.storeBotLoading}
            storeBotNotFound={salesChannels.storeBotNotFound}
            bindBot={salesChannels.bindBot}
            unbindBot={salesChannels.unbindBot}
          />
        </div>
      </SettingsSection>
    </div>
  );
}
