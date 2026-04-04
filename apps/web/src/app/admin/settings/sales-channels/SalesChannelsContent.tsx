'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useI18n, useUserStore } from '@mobazha/core';
import { useSalesChannels } from '@mobazha/core/hooks/useSalesChannels';
import type { UseSalesChannelsReturn } from '@mobazha/core/hooks/useSalesChannels';
import { useStoreDomain } from '@mobazha/core/hooks/useStoreDomain';
import { getStoreSubdomainBase } from '@mobazha/core/config/env';
import type { UseStoreDomainReturn } from '@mobazha/core/hooks/useStoreDomain';
import type { StoreBotInfo } from '@mobazha/core/types/salesChannels';
import { getLinkedAccounts } from '@mobazha/core/services/auth';
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
  Send,
  Smartphone,
  Globe,
  ChevronDown,
  AlertTriangle,
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
              className="text-xs text-muted-foreground hover:text-destructive transition-colors underline-offset-2 hover:underline"
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

function hasBrandDomain(
  subdomainUrl: string | null | undefined,
  directLink: string | undefined
): boolean {
  if (!subdomainUrl?.trim() || !directLink?.trim()) return false;
  try {
    const sub = new URL(subdomainUrl.includes('://') ? subdomainUrl : `https://${subdomainUrl}`);
    const dir = new URL(directLink);
    return sub.hostname !== dir.hostname;
  } catch {
    return Boolean(subdomainUrl.trim());
  }
}

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

  const hasBrand = hasBrandDomain(subdomainUrl, storeLink.directLink);
  const hasBrandBot = Boolean(brandBotLink);
  const hasTelegram = Boolean(storeLink.telegramLink);
  const hasDeepLink = Boolean(storeLink.deepLink);

  const primaryWebLink = hasBrand ? subdomainUrl! : storeLink.directLink;
  const primaryWebLabel = hasBrand
    ? t('admin.salesChannels.brandWebLink')
    : t('admin.salesChannels.webLink');

  const primaryTelegramLink = hasBrandBot ? brandBotLink : storeLink.telegramLink;
  const primaryTelegramLabel = hasBrandBot
    ? t('admin.salesChannels.yourTelegramBot')
    : t('admin.salesChannels.telegramLink');

  const hasPlatformFallbackLinks = hasBrand || (hasBrandBot && hasTelegram);

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
            {hasBrand && storeLink.directLink && (
              <LinkRow
                icon={Link2}
                label={t('admin.salesChannels.platformWebLink')}
                value={storeLink.directLink}
                href={storeLink.directLink}
              />
            )}
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
        {!hasBrand && (
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

  return (
    <div className="space-y-4">
      {/* Telegram binding guard */}
      {!telegramLinkChecking && !telegramLinked && (
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
            <a
              href="/settings/account"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline mt-1"
            >
              {t('admin.salesChannels.telegramBindingAction')}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

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

// --- Main Component ---

export default function SalesChannelsContent() {
  const { t } = useI18n();
  const { toast } = useToast();
  const profile = useUserStore(s => s.profile);
  const peerID = profile?.peerID || '';

  const salesChannels = useSalesChannels({ peerID, autoLoad: true });
  const storeDomain = useStoreDomain({ peerID, autoLoad: true });

  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramLinkChecking, setTelegramLinkChecking] = useState(true);

  useEffect(() => {
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
  }, []);

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

  const brandBotLink =
    salesChannels.storeBot && !salesChannels.storeBotNotFound
      ? `https://t.me/${salesChannels.storeBot.botUsername}`
      : undefined;

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
            subdomainUrl={storeDomain.domain?.subdomainUrl}
            brandBotLink={brandBotLink}
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
            domain={storeDomain.domain}
            telegramLinked={telegramLinked}
            telegramLinkChecking={telegramLinkChecking}
          />
        </div>
      </SettingsSection>
    </div>
  );
}
