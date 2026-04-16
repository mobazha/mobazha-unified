'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useI18n, useUserStore, hasSaaSToken } from '@mobazha/core';
import { isStandaloneMode } from '@mobazha/core/config/env';
import { useSalesChannels } from '@mobazha/core/hooks/useSalesChannels';
import type { UseSalesChannelsReturn } from '@mobazha/core/hooks/useSalesChannels';
import { useStoreDomain } from '@mobazha/core/hooks/useStoreDomain';
import { getStoreSubdomainBase } from '@mobazha/core/config/env';
import type { UseStoreDomainReturn } from '@mobazha/core/hooks/useStoreDomain';
import { useStandaloneStoreInfo } from '@mobazha/core/hooks/useStandaloneStoreInfo';
import type { StoreBotInfo } from '@mobazha/core/types/salesChannels';
import { getLinkedAccounts, startLinkAccount } from '@mobazha/core/services/auth';
import { getSetupStatus } from '@mobazha/core/services/api/system';
import { SettingsSection } from '@/components/SettingsLayout';
import { ConnectPlatformCard } from '@/components/ConnectPlatformCard';
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
  Copy,
  RefreshCw,
  Bot,
  Check,
  ExternalLink,
  Loader2,
  Send,
  Smartphone,
  Globe,
  ChevronDown,
  AlertTriangle,
  Settings,
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
  const { t } = useI18n();
  const openLabel = t('admin.salesChannels.linkOpenInNewTab');
  return (
    <div className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="text-sm text-foreground font-mono break-all sm:break-words">{value}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0 self-center">
        <CopyButton text={value} />
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={openLabel}
            aria-label={openLabel}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group rounded-lg border border-border bg-muted/20 open:bg-muted/30"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-border px-3 pb-2">{children}</div>
    </details>
  );
}

// --- Section 1: Store Address ---

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

  const serverHandle = domain?.handle ?? '';
  const [inputValue, setInputValue] = useState(() => serverHandle);
  const [saving, setSaving] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setInputValue(serverHandle);
  }, [serverHandle]);

  const handleInputChange = useCallback(
    (value: string) => {
      const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
      setInputValue(normalized);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (normalized.length >= 3 && normalized !== serverHandle) {
        debounceRef.current = setTimeout(() => {
          checkAvailability(normalized);
        }, 500);
      }
    },
    [serverHandle, checkAvailability]
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

  const isChanged = inputValue !== serverHandle;
  const isValid = inputValue.length >= 3 && inputValue.length <= 32;

  return (
    <div className="space-y-4">
      {domain?.subdomainUrl && (
        <div className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg sm:flex-row sm:items-center sm:gap-3">
          <Globe className="w-5 h-5 text-primary shrink-0 hidden sm:block" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground mb-0.5">
              {t('admin.salesChannels.handleCurrentUrl')}
            </div>
            <div className="text-sm font-mono text-foreground break-all sm:truncate">
              {domain.subdomainUrl}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <CopyButton text={domain.subdomainUrl} />
            <a
              href={domain.subdomainUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              {t('admin.salesChannels.viewStorefront')}
              <ExternalLink className="w-3.5 h-3.5" aria-hidden />
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
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
            <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
            {t('admin.salesChannels.checkingAvailability')}
          </div>
        )}
      </div>

      <div className="space-y-2 pt-1">
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
          <div className="space-y-1">
            <button
              onClick={() => setShowRemoveConfirm(true)}
              className="text-xs text-destructive/80 hover:text-destructive transition-colors underline-offset-2 hover:underline"
            >
              {t('admin.salesChannels.handleRemoveButton')}
            </button>
            <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
              {t('admin.salesChannels.handleRemoveHint')}
            </p>
          </div>
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

// --- Section 2: Share Links (brand-priority) ---

function StoreLinkSection({
  storeLink,
  storeLinkLoading,
  loadStoreLink,
  regenerateLink,
  subdomainUrl,
  brandBotLink,
}: Pick<
  UseSalesChannelsReturn,
  'storeLink' | 'storeLinkLoading' | 'loadStoreLink' | 'regenerateLink'
> & {
  subdomainUrl?: string | null;
  brandBotLink?: string;
}) {
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

  const webLink = subdomainUrl || undefined;
  const hasBrandBot = Boolean(brandBotLink);
  const hasTelegram = Boolean(storeLink.telegramLink);
  const hasDeepLink = Boolean(storeLink.deepLink);

  const primaryWebLink = webLink;
  const primaryWebLabel = webLink
    ? t('admin.salesChannels.brandWebLink')
    : t('admin.salesChannels.webLink');

  const primaryTelegramLink = hasBrandBot ? brandBotLink : storeLink.telegramLink;
  const primaryTelegramLabel = hasBrandBot
    ? t('admin.salesChannels.yourTelegramBot')
    : t('admin.salesChannels.telegramLink');

  const hasPlatformFallbackLinks = webLink && hasBrandBot && hasTelegram;

  return (
    <>
      <div className="space-y-4">
        {/* Primary links */}
        <div className="divide-y divide-border rounded-lg border border-border">
          {primaryWebLink && (
            <div className="px-3">
              <LinkRow
                icon={Globe}
                label={primaryWebLabel}
                value={primaryWebLink}
                href={
                  primaryWebLink.startsWith('http') ? primaryWebLink : `https://${primaryWebLink}`
                }
              />
            </div>
          )}
          {primaryTelegramLink && (
            <div className="px-3">
              <LinkRow
                icon={Send}
                label={primaryTelegramLabel}
                value={primaryTelegramLink}
                href={primaryTelegramLink}
              />
            </div>
          )}
        </div>

        {/* Platform fallback links (only when brand links exist) */}
        {hasPlatformFallbackLinks && (
          <CollapsibleSection title={t('admin.salesChannels.platformCompatLinks')}>
            {hasBrandBot && hasTelegram && (
              <LinkRow
                icon={Send}
                label={t('admin.salesChannels.platformTelegramLink')}
                value={storeLink.telegramLink!}
                href={storeLink.telegramLink}
              />
            )}
          </CollapsibleSection>
        )}

        {/* Advanced options */}
        <CollapsibleSection title={t('admin.salesChannels.advancedOptions')}>
          {hasDeepLink && (
            <div className="pb-2 border-b border-border mb-2">
              <LinkRow
                icon={Smartphone}
                label={t('admin.salesChannels.appDirectLink')}
                value={storeLink.deepLink!}
              />
              <p className="text-xs text-muted-foreground mt-1 ml-7">
                {t('admin.salesChannels.appDirectLinkHint')}
              </p>
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between py-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {t('admin.salesChannels.shortCode')}
                </span>
                {': '}
                <span className="font-mono">{storeLink.shortCode}</span>
              </p>
              <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
                {t('admin.salesChannels.shortCodeHint')}
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-1 sm:items-end shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRegenConfirm(true)}
                className="gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {t('admin.salesChannels.regenerate')}
              </Button>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 text-right max-w-[220px]">
                {t('admin.salesChannels.regenerateHelper')}
              </p>
            </div>
          </div>
        </CollapsibleSection>

        {/* Upgrade hint when no brand domain */}
        {!webLink && (
          <p className="text-xs text-muted-foreground italic">
            {t('admin.salesChannels.brandUpgradeHint')}
          </p>
        )}
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

// --- Section 3: Telegram Bot ---

function normalizeStorefrontRootUrl(raw: string): string {
  return raw.trim().replace(/\/$/, '');
}

function collectRecommendedWebAppRoots(
  storeBot: StoreBotInfo,
  domain: {
    subdomainUrl?: string;
    customDomain?: string | null;
    verified?: boolean;
  } | null
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (raw?: string | null) => {
    if (!raw?.trim()) return;
    const n = normalizeStorefrontRootUrl(raw);
    if (seen.has(n)) return;
    seen.add(n);
    out.push(n);
  };
  for (const u of storeBot.recommendedWebAppUrls ?? []) push(u);
  if (domain) {
    push(domain.subdomainUrl);
    if (domain.verified && domain.customDomain) {
      const d = domain.customDomain.trim();
      push(d.startsWith('http') ? d : `https://${d}`);
    }
  }
  return out;
}

function TelegramBotSection({
  storeBot,
  storeBotLoading,
  storeBotNotFound,
  bindBot,
  unbindBot,
  domain,
  telegramLinked,
  telegramLinkChecking,
}: Pick<
  UseSalesChannelsReturn,
  'storeBot' | 'storeBotLoading' | 'storeBotNotFound' | 'bindBot' | 'unbindBot'
> & {
  domain: UseStoreDomainReturn['domain'];
  telegramLinked: boolean;
  telegramLinkChecking: boolean;
}) {
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

  const hasStoreHandle = Boolean(domain?.handle);

  if (storeBot && !storeBotNotFound) {
    const recommendedRoots = collectRecommendedWebAppRoots(storeBot, domain);
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
              {t('admin.salesChannels.unbind')}
            </Button>
          </div>
        </div>

        {recommendedRoots.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-foreground">
              {t('admin.salesChannels.recommendedWebAppUrlsTitle')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('admin.salesChannels.recommendedWebAppUrlsBody')}
            </p>
            <div className="space-y-0 divide-y divide-border rounded-md border border-border overflow-hidden">
              {recommendedRoots.map(url => (
                <LinkRow
                  key={url}
                  icon={Globe}
                  label={t('admin.salesChannels.recommendedWebAppUrlRow')}
                  value={url}
                  href={url}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('admin.salesChannels.botFatherHttpsExactNote')}
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

  if (!telegramLinkChecking && !telegramLinked) {
    return (
      <div
        className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5"
        role="status"
      >
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {t('admin.salesChannels.telegramBindingRequired')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('admin.salesChannels.telegramBindingRequiredDesc')}
          </p>
          <button
            type="button"
            onClick={() =>
              startLinkAccount('telegram', undefined, {
                returnTo: '/admin/settings/sales-channels',
              })
            }
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline mt-1"
          >
            {t('admin.salesChannels.telegramBindingAction')}
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Store address prerequisite */}
      {!hasStoreHandle && (
        <div
          className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5"
          role="status"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">
            {t('admin.salesChannels.setupPrerequisiteNoHandle')}
          </p>
        </div>
      )}

      {/* Setup guide */}
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

      {/* Token input */}
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

// --- Standalone: Unconnected Share Links (dual-path design) ---

function UnconnectedShareSection({
  connectivity,
  domain,
  dockerManaged,
}: {
  connectivity: string;
  domain: string;
  dockerManaged: boolean;
}) {
  const { t } = useI18n();

  if (domain) {
    const fullUrl = domain.startsWith('http') ? domain : `https://${domain}`;
    return (
      <div className="divide-y divide-border rounded-lg border border-border">
        <div className="px-3">
          <LinkRow
            icon={Globe}
            label={t('admin.salesChannels.standalone.localDomain', { defaultValue: 'Store URL' })}
            value={fullUrl}
            href={fullUrl}
          />
        </div>
      </div>
    );
  }

  if (connectivity === 'nat') {
    return (
      <div className="space-y-4 py-2">
        <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <Globe className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {t('admin.salesChannels.standalone.quickPathTitle', {
                defaultValue: 'Quick: Connect to Platform',
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('admin.salesChannels.standalone.natQuickPathDesc', {
                defaultValue:
                  'Connect to the Mobazha Platform above to get a branded share link ({handle}.mymbz.org) that works even behind NAT.',
              })}
            </p>
          </div>
        </div>

        <details className="group text-sm">
          <summary className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden list-none">
            <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
            {t('admin.salesChannels.standalone.advancedNat', {
              defaultValue: 'Advanced: Make your store publicly accessible',
            })}
          </summary>
          <div className="mt-2 ml-5 space-y-1.5 text-xs text-muted-foreground">
            <p>
              {t('admin.salesChannels.standalone.tunnelHint', {
                defaultValue:
                  'Set up a Cloudflare Tunnel or similar service to expose your store to the internet, then configure a domain in System Settings.',
              })}
            </p>
            <a
              href="/admin/system#domain"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <Settings className="w-3 h-3" />
              {t('admin.salesChannels.standalone.goToSystem', { defaultValue: 'System Settings' })}
            </a>
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
        <Globe className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {t('admin.salesChannels.standalone.quickPathTitle', {
              defaultValue: 'Quick: Connect to Platform',
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('admin.salesChannels.standalone.quickPathDesc', {
              defaultValue:
                'Connect above to get a branded {handle}.mymbz.org link and short URLs instantly.',
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex-1 border-t border-border" />
        <span>{t('common.or', { defaultValue: 'or' })}</span>
        <div className="flex-1 border-t border-border" />
      </div>

      <div className="flex items-start gap-3">
        <Settings className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">
            {t('admin.salesChannels.standalone.customDomainTitle', {
              defaultValue: 'Custom Domain',
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            {dockerManaged
              ? t('admin.salesChannels.standalone.customDomainDockerDesc', {
                  defaultValue:
                    'Use your own domain for a professional storefront with automatic HTTPS.',
                })
              : t('admin.salesChannels.standalone.customDomainNativeDesc', {
                  defaultValue:
                    'Set up a reverse proxy (Nginx/Caddy) pointing to your store, then register your domain.',
                })}
          </p>
          <a
            href="/admin/system#domain"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            {t('admin.salesChannels.standalone.configureDomain', {
              defaultValue: 'Configure Domain',
            })}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

// --- Standalone: Unconnected Telegram Bot (dual-path design) ---

function UnconnectedBotSection({ connectivity, domain }: { connectivity: string; domain: string }) {
  const { t } = useI18n();

  if (connectivity === 'nat') {
    return (
      <div className="space-y-3 py-2">
        <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <Bot className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {t('admin.salesChannels.standalone.natBotTitle', {
                defaultValue: 'Connect to Platform for Telegram Bot',
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('admin.salesChannels.standalone.natBotDesc', {
                defaultValue:
                  'Use @MbzBridgeBot to let buyers access your store via Telegram even behind NAT. Connect to the Mobazha Platform above to set this up.',
              })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!domain) {
    return (
      <div className="space-y-3 py-2">
        <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <Bot className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {t('admin.salesChannels.standalone.botNeedsDomain', {
                defaultValue: 'Domain Required',
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('admin.salesChannels.standalone.botNeedsDomainDesc', {
                defaultValue:
                  'Connect to the Platform above for a branded bot, or configure a custom domain first to create your own Telegram Bot.',
              })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const fullUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  return (
    <div className="space-y-4">
      <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
        <p className="text-sm font-medium text-foreground">
          {t('admin.salesChannels.standalone.selfBotGuideTitle', {
            defaultValue: 'Create Your Own Telegram Bot',
          })}
        </p>
        <ol className="space-y-1.5 text-sm text-muted-foreground list-decimal list-inside">
          <li>
            {t('admin.salesChannels.standalone.selfBotStep1', {
              defaultValue: 'Open @BotFather in Telegram and send /newbot',
            })}
          </li>
          <li>
            {t('admin.salesChannels.standalone.selfBotStep2', {
              defaultValue: 'Follow the prompts to name your bot',
            })}
          </li>
          <li>
            {t('admin.salesChannels.standalone.selfBotStep3', {
              defaultValue: 'Send /newapp to create a Web App, then set the URL to:',
            })}
          </li>
        </ol>
        <div className="rounded-md border border-border bg-muted/50 px-3 py-2 flex items-center gap-2">
          <code className="text-sm font-mono text-foreground flex-1 break-all">{fullUrl}</code>
          <CopyButton text={fullUrl} />
        </div>
        <p className="text-xs text-muted-foreground">
          {t('admin.salesChannels.standalone.selfBotNote', {
            defaultValue:
              'After creating the bot, you can come back here to bind it once connected to the platform, or manage it directly via BotFather.',
          })}
        </p>
      </div>
    </div>
  );
}

// --- Main Component ---

export default function SalesChannelsContent() {
  const { t } = useI18n();
  const { toast } = useToast();
  const profile = useUserStore(s => s.profile);
  const peerID = profile?.peerID || '';

  const standalone = useMemo(() => isStandaloneMode(), []);
  const [platformConnected, setPlatformConnected] = useState<boolean | null>(() =>
    standalone ? null : true
  );

  // Standalone: check persistent binding (owner_user_id) from the node.
  // The SaaS backend supports API Key-only auth (X-Standalone-Store-Key),
  // so platform API calls work without a SaaS JWT in the browser session.
  useEffect(() => {
    if (!standalone) return;
    let cancelled = false;
    (async () => {
      try {
        const status = await getSetupStatus();
        if (cancelled) return;
        setPlatformConnected(!!status.ownerUserId?.trim());
      } catch {
        setPlatformConnected(hasSaaSToken());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [standalone]);

  const storeInfo = useStandaloneStoreInfo({ enabled: standalone });

  const salesChannels = useSalesChannels({ peerID, autoLoad: platformConnected === true });
  const storeDomain = useStoreDomain({ peerID, autoLoad: platformConnected === true });

  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramLinkChecking, setTelegramLinkChecking] = useState(true);

  useEffect(() => {
    if (platformConnected === null) return;
    if (platformConnected === false) {
      setTelegramLinkChecking(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const accounts = await getLinkedAccounts();
        if (cancelled) return;
        const linked = accounts.accounts?.some(a => a.provider?.toLowerCase() === 'telegram');
        setTelegramLinked(Boolean(linked));
      } catch {
        if (!cancelled) setTelegramLinked(false);
      } finally {
        if (!cancelled) setTelegramLinkChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [platformConnected]);

  // Suppress error toasts briefly after platform connect — the SaaS-side
  // claim is async and the first load attempt may fail transiently.
  const suppressErrorToastRef = useRef(false);

  const handlePlatformConnected = useCallback(() => {
    setPlatformConnected(true);
    suppressErrorToastRef.current = true;
    salesChannels.loadStoreLink();
    if (peerID) salesChannels.loadStoreBot();
    storeDomain.loadDomain();
    setTimeout(() => {
      suppressErrorToastRef.current = false;
    }, 5000);
  }, [salesChannels, storeDomain, peerID]);

  const prevSCErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (salesChannels.error && salesChannels.error !== prevSCErrorRef.current) {
      if (!suppressErrorToastRef.current) {
        toast({ variant: 'destructive', title: salesChannels.error });
      }
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

  const brandBotLink =
    salesChannels.storeBot && !salesChannels.storeBotNotFound
      ? `https://t.me/${salesChannels.storeBot.botUsername}`
      : undefined;

  const connectivity = storeInfo.info?.connectivity ?? 'public';
  const localDomain = storeInfo.info?.domain ?? '';
  const dockerManaged = storeInfo.info?.dockerManaged ?? false;

  return (
    <div className="space-y-8">
      {/* Section 1: Store Handle — unconnected standalone shows ConnectPlatformCard */}
      <SettingsSection
        title={t('admin.salesChannels.storeHandleTitle')}
        description={t('admin.salesChannels.storeHandleDesc')}
      >
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 max-w-xl">
          {standalone && platformConnected === null ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : standalone && platformConnected === false ? (
            <ConnectPlatformCard
              onConnected={handlePlatformConnected}
              title={t('admin.salesChannels.standalone.connectTitle', {
                defaultValue: 'Connect to Mobazha Platform',
              })}
              description={t('admin.salesChannels.standalone.connectDesc', {
                defaultValue:
                  'Get a branded subdomain ({handle}.mymbz.org), share links, and Telegram Bot — works even behind NAT.',
              })}
              featureList={[
                t('admin.salesChannels.standalone.featureBrandedDomain', {
                  defaultValue: 'Branded subdomain ({handle}.mymbz.org)',
                }),
                t('admin.salesChannels.standalone.featureShortLinks', {
                  defaultValue: 'Short links for sharing',
                }),
                t('admin.salesChannels.standalone.featureTelegramBot', {
                  defaultValue: 'Telegram Bot binding',
                }),
              ]}
            />
          ) : (
            <StoreHandleSection
              domain={storeDomain.domain}
              loading={storeDomain.loading}
              availability={storeDomain.availability}
              checking={storeDomain.checking}
              setHandle={storeDomain.setHandle}
              removeDomain={storeDomain.removeDomain}
              checkAvailability={storeDomain.checkAvailability}
            />
          )}
        </div>
      </SettingsSection>

      {/* Section 2: Share Links */}
      <SettingsSection
        title={t('admin.salesChannels.storeLinksTitle')}
        description={t('admin.salesChannels.storeLinksDesc')}
      >
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 max-w-xl">
          {standalone && platformConnected !== true ? (
            <UnconnectedShareSection
              connectivity={connectivity}
              domain={localDomain}
              dockerManaged={dockerManaged}
            />
          ) : (
            <StoreLinkSection
              storeLink={salesChannels.storeLink}
              storeLinkLoading={salesChannels.storeLinkLoading}
              loadStoreLink={salesChannels.loadStoreLink}
              regenerateLink={salesChannels.regenerateLink}
              subdomainUrl={storeDomain.domain?.subdomainUrl}
              brandBotLink={brandBotLink}
            />
          )}
        </div>
      </SettingsSection>

      {/* Section 3: Telegram Bot */}
      <SettingsSection
        title={t('admin.salesChannels.telegramBotTitle')}
        description={t('admin.salesChannels.telegramBotDesc')}
      >
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 max-w-xl">
          {standalone && platformConnected === false ? (
            <UnconnectedBotSection connectivity={connectivity} domain={localDomain} />
          ) : (
            <TelegramBotSection
              storeBot={salesChannels.storeBot}
              storeBotLoading={salesChannels.storeBotLoading}
              storeBotNotFound={salesChannels.storeBotNotFound}
              bindBot={salesChannels.bindBot}
              unbindBot={salesChannels.unbindBot}
              domain={storeDomain.domain}
              telegramLinked={telegramLinked}
              telegramLinkChecking={telegramLinkChecking}
            />
          )}
        </div>
      </SettingsSection>
    </div>
  );
}
