'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  CreditCard,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  Eye,
  EyeOff,
  CircleDot,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { useI18n, fiatApi, isStandaloneMode } from '@mobazha/core';
import type {
  FiatProviderConfigView,
  FiatProviderConfigInput,
  FiatAccountStatus,
} from '@mobazha/core';

interface ProviderSnapshot {
  configs: FiatProviderConfigView[];
  statuses: Record<string, FiatAccountStatus>;
}

type SaaSConnectMode = 'connected' | 'direct';

let providerSnapshotInFlight: Promise<ProviderSnapshot> | null = null;
let providerSnapshotStandaloneMode: boolean | null = null;

const PROVIDERS = [
  {
    id: 'stripe' as const,
    name: 'Stripe',
    color: '#6772e5',
    iconPath: '/icons/brands/stripe.svg',
    dashboardUrl: 'https://dashboard.stripe.com',
    descKey: 'admin.integrations.stripeDesc' as const,
    descDefault: 'Accept credit/debit cards, Apple Pay, and Google Pay',
    fields: [
      {
        key: 'secretKey',
        labelKey: 'admin.integrations.secretKey',
        labelDefault: 'Secret Key',
        placeholder: 'sk_live_...',
      },
      {
        key: 'publishableKey',
        labelKey: 'admin.integrations.publishableKey',
        labelDefault: 'Publishable Key',
        placeholder: 'pk_live_...',
      },
      {
        key: 'webhookSecret',
        labelKey: 'admin.integrations.webhookSecret',
        labelDefault: 'Webhook Secret',
        placeholder: 'whsec_...',
      },
    ],
  },
  {
    id: 'paypal' as const,
    name: 'PayPal',
    color: '#0070ba',
    iconPath: '/icons/brands/paypal.svg',
    dashboardUrl: 'https://www.paypal.com/businessmanage/account/aboutBusiness',
    descKey: 'admin.integrations.paypalDesc' as const,
    descDefault: 'Accept PayPal payments',
    fields: [
      {
        key: 'publishableKey',
        labelKey: 'admin.integrations.clientId',
        labelDefault: 'Client ID',
        placeholder: 'AX...',
      },
      {
        key: 'secretKey',
        labelKey: 'admin.integrations.clientSecret',
        labelDefault: 'Client Secret',
        placeholder: 'EL...',
      },
      {
        key: 'webhookSecret',
        labelKey: 'admin.integrations.webhookId',
        labelDefault: 'Webhook ID',
        placeholder: '',
      },
    ],
  },
];

const WEBHOOK_REQUIRED_EVENTS: Record<string, string[]> = {
  stripe: [
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'payment_intent.canceled',
    'charge.refunded',
    'charge.dispute.created',
    'charge.dispute.closed',
    'account.updated',
  ],
  paypal: [
    'CHECKOUT.ORDER.COMPLETED',
    'PAYMENT.CAPTURE.COMPLETED',
    'PAYMENT.CAPTURE.DENIED',
    'CHECKOUT.ORDER.DECLINED',
    'CUSTOMER.DISPUTE.CREATED',
    'CUSTOMER.DISPUTE.RESOLVED',
    'PAYMENT.SALE.REFUNDED',
    'PAYMENT.CAPTURE.REFUNDED',
    'MERCHANT.ONBOARDING.COMPLETED',
  ],
};

const ProviderBrandIcon: React.FC<{ provider: (typeof PROVIDERS)[number] }> = ({ provider }) => {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <img
        src={provider.iconPath}
        alt={`${provider.name} logo`}
        width={24}
        height={24}
        className="w-6 h-6 object-contain"
        onError={() => setFailed(true)}
        loading="lazy"
      />
    );
  }

  return <CreditCard className="w-5 h-5" style={{ color: provider.color }} />;
};

function hasDirectConfig(config?: FiatProviderConfigView): boolean {
  if (!config) return false;
  const secretKey = config.secretKey || '';
  const publicKey = config.publicKey || '';
  return secretKey.trim().length > 0 || publicKey.trim().length > 0;
}

function deriveSaaSMode(config?: FiatProviderConfigView): SaaSConnectMode {
  return hasDirectConfig(config) ? 'direct' : 'connected';
}

function getConfigHint(providerID: string, fieldKey: string): { text: string; url?: string } {
  if (providerID === 'stripe') {
    if (fieldKey === 'secretKey')
      return {
        text: 'Stripe Dashboard > API keys > Secret key',
        url: 'https://dashboard.stripe.com/apikeys',
      };
    if (fieldKey === 'publishableKey')
      return {
        text: 'Stripe Dashboard > API keys > Publishable key',
        url: 'https://dashboard.stripe.com/apikeys',
      };
    if (fieldKey === 'webhookSecret')
      return {
        text: 'Stripe Dashboard > Webhooks > Signing secret',
        url: 'https://dashboard.stripe.com/webhooks',
      };
  }
  if (providerID === 'paypal') {
    if (fieldKey === 'publishableKey')
      return {
        text: 'PayPal Developer > Apps & Credentials > Client ID',
        url: 'https://developer.paypal.com/dashboard/applications',
      };
    if (fieldKey === 'secretKey')
      return {
        text: 'PayPal Developer > Apps & Credentials > Client Secret',
        url: 'https://developer.paypal.com/dashboard/applications',
      };
    if (fieldKey === 'webhookSecret')
      return {
        text: 'PayPal Developer > Webhooks > Webhook ID',
        url: 'https://developer.paypal.com/dashboard/applications',
      };
  }
  return { text: '' };
}

function getWebhookUrl(providerID: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/v1/fiat/${providerID}/webhooks`;
}

function isLocalhostUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function getProviderDocsLink(providerID: string): string | null {
  if (providerID === 'stripe') return 'https://dashboard.stripe.com/test/apikeys';
  if (providerID === 'paypal') return 'https://developer.paypal.com/dashboard/applications';
  return null;
}

async function fetchProviderSnapshot(standalone: boolean): Promise<ProviderSnapshot> {
  const cfgs = (await fiatApi.getConfig()) || [];
  const statusMap: Record<string, FiatAccountStatus> = {};

  if (!standalone) {
    const providersNeedOnboardingStatus = PROVIDERS.filter(provider => {
      const cfg = cfgs.find(item => item.providerID === provider.id);
      return !hasDirectConfig(cfg);
    });
    const statusResults = await Promise.allSettled(
      providersNeedOnboardingStatus.map(provider => fiatApi.getOnboardingStatus(provider.id))
    );
    statusResults.forEach((result, i) => {
      if (result.status !== 'fulfilled') return;
      const status = result.value;
      if (!status?.accountID) return;
      const providerID = providersNeedOnboardingStatus[i].id;
      statusMap[providerID] = status;
      const existing = cfgs.find(c => c.providerID === providerID);
      if (existing && !hasDirectConfig(existing)) {
        existing.isActive = status.chargesEnabled;
        existing.accountID = status.accountID;
      } else {
        cfgs.push({
          providerID,
          accountID: status.accountID,
          isActive: status.chargesEnabled,
        });
      }
    });
  }

  return { configs: cfgs, statuses: statusMap };
}

function loadProviderSnapshot(standalone: boolean): Promise<ProviderSnapshot> {
  if (providerSnapshotInFlight && providerSnapshotStandaloneMode === standalone) {
    return providerSnapshotInFlight;
  }

  providerSnapshotStandaloneMode = standalone;
  providerSnapshotInFlight = fetchProviderSnapshot(standalone).finally(() => {
    providerSnapshotInFlight = null;
    providerSnapshotStandaloneMode = null;
  });
  return providerSnapshotInFlight;
}

function truncateAccountID(id?: string) {
  if (!id) return '';
  if (id.length <= 16) return id;
  return `${id.slice(0, 10)}...${id.slice(-4)}`;
}

function StatusBadge({ status }: { status?: string }) {
  const { t } = useI18n();
  const map: Record<string, { color: string; labelKey: string; labelDefault: string }> = {
    active: {
      color: 'text-success bg-success/10',
      labelKey: 'admin.integrations.statusActive',
      labelDefault: 'Active',
    },
    restricted: {
      color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20',
      labelKey: 'admin.integrations.statusRestricted',
      labelDefault: 'Restricted',
    },
    pending: {
      color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20',
      labelKey: 'admin.integrations.statusPending',
      labelDefault: 'Pending',
    },
  };
  const entry = map[status || ''] || map.pending;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
        entry.color
      )}
    >
      <CircleDot className="w-3 h-3" />
      {t(entry.labelKey, { defaultValue: entry.labelDefault })}
    </span>
  );
}

interface ProviderCardProps {
  provider: (typeof PROVIDERS)[number];
  config?: FiatProviderConfigView;
  accountStatus?: FiatAccountStatus;
  isStandalone: boolean;
  saasMode: SaaSConnectMode;
  isOnboarding: boolean;
  onboardingError?: string | null;
  onModeChange: (providerID: string, mode: SaaSConnectMode) => void;
  onSave: (providerID: string, input: FiatProviderConfigInput) => Promise<void>;
  onDelete: (providerID: string, mode: SaaSConnectMode) => Promise<void>;
  onStartOnboarding: (
    providerID: string,
    opts?: {
      clearDirectConfig?: boolean;
    }
  ) => Promise<void>;
  onRefresh: () => void;
}

const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  config,
  accountStatus,
  isStandalone,
  saasMode,
  isOnboarding,
  onboardingError,
  onModeChange,
  onSave,
  onDelete,
  onStartOnboarding,
  onRefresh,
}) => {
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>();
  const [verifyMsg, setVerifyMsg] = useState<string>();
  const [verifyOK, setVerifyOK] = useState<boolean | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [webhookRetrying, setWebhookRetrying] = useState(false);
  const [webhookMsg, setWebhookMsg] = useState<string>();
  const [webhookMsgOK, setWebhookMsgOK] = useState<boolean | null>(null);
  const [manualWebhookSecret, setManualWebhookSecret] = useState('');
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [showManualWebhook, setShowManualWebhook] = useState(false);
  const isManualMode = isStandalone || saasMode === 'direct';
  const isConnected = isManualMode
    ? Boolean(config?.isActive)
    : Boolean(accountStatus?.chargesEnabled);
  const linkedAccountID = isManualMode ? config?.accountID || '' : accountStatus?.accountID || '';
  const hasLinkedAccount = linkedAccountID.length > 0;
  const needsSetup = !isConnected && hasLinkedAccount;
  const canShowSaaSDetails = !isManualMode && hasLinkedAccount;

  useEffect(() => {
    if (!canShowSaaSDetails) {
      setDetailsOpen(false);
    }
  }, [canShowSaaSDetails]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setErrorMsg(undefined);
    setVerifyMsg(undefined);
    setVerifyOK(null);
    try {
      await onSave(provider.id, {
        providerID: provider.id,
        secretKey: formData.secretKey || '',
        publicKey: formData.publishableKey || '',
        webhookSecret: '',
      });
      try {
        setVerifying(true);
        await fiatApi.verifyConfig(provider.id);
        setVerifyOK(true);
        setVerifyMsg(t('fiat.verifySuccess'));
        setIsEditing(false);
        setFormData({});
      } catch (verifyErr) {
        setVerifyOK(false);
        setVerifyMsg(verifyErr instanceof Error ? verifyErr.message : t('fiat.verifyFailed'));
      } finally {
        setVerifying(false);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('fiat.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [onSave, provider.id, formData, t]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    setErrorMsg(undefined);
    try {
      await onDelete(provider.id, isManualMode ? 'direct' : 'connected');
      onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('fiat.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  }, [onDelete, provider.id, t, onRefresh, isManualMode]);

  const handleCopyAccountID = useCallback(async () => {
    if (!linkedAccountID || !navigator?.clipboard?.writeText) {
      return;
    }
    try {
      await navigator.clipboard.writeText(linkedAccountID);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [linkedAccountID]);

  const webhookConfigured = Boolean(config?.webhookAutoConfigured);

  const handleRetryWebhook = useCallback(async () => {
    setWebhookRetrying(true);
    setWebhookMsg(undefined);
    setWebhookMsgOK(null);
    try {
      await fiatApi.setupWebhook(provider.id);
      setWebhookMsgOK(true);
      setWebhookMsg(t('fiat.webhookRetrySuccess'));
      onRefresh();
    } catch (err) {
      setWebhookMsgOK(false);
      setWebhookMsg(err instanceof Error ? err.message : t('fiat.webhookRetryFailed'));
    } finally {
      setWebhookRetrying(false);
    }
  }, [provider.id, t, onRefresh]);

  const handleSaveManualWebhook = useCallback(async () => {
    if (!manualWebhookSecret.trim()) return;
    setSavingWebhook(true);
    setWebhookMsg(undefined);
    setWebhookMsgOK(null);
    try {
      await fiatApi.saveConfig(provider.id, {
        providerID: provider.id,
        secretKey: '',
        publicKey: '',
        webhookSecret: manualWebhookSecret.trim(),
      });
      setWebhookMsgOK(true);
      setWebhookMsg(t('fiat.webhookRetrySuccess'));
      setManualWebhookSecret('');
      setShowManualWebhook(false);
      onRefresh();
    } catch (err) {
      setWebhookMsgOK(false);
      setWebhookMsg(err instanceof Error ? err.message : t('fiat.saveFailed'));
    } finally {
      setSavingWebhook(false);
    }
  }, [provider.id, manualWebhookSecret, t, onRefresh]);

  const saasStatus = isConnected
    ? {
        color: 'text-success',
        label: t('fiat.connected', { defaultValue: '已连接' }),
        icon: <CheckCircle className="w-3.5 h-3.5" />,
      }
    : needsSetup
      ? {
          color: 'text-amber-600 dark:text-amber-400',
          label: t('admin.integrations.statusPending', { defaultValue: '待完善' }),
          icon: <AlertCircle className="w-3.5 h-3.5" />,
        }
      : {
          color: 'text-muted-foreground',
          label: t('fiat.notConnected', { defaultValue: '未连接' }),
          icon: <AlertCircle className="w-3.5 h-3.5" />,
        };

  const saasPrimaryLabel = isOnboarding
    ? t('fiat.connecting', { defaultValue: '连接中...' })
    : !hasLinkedAccount
      ? t('fiat.connectProvider', {
          provider: provider.name,
          defaultValue: `连接 ${provider.name}`,
        })
      : needsSetup
        ? t('fiat.continueSetup', { defaultValue: '继续完善' })
        : detailsOpen
          ? t('fiat.collapseDetails', { defaultValue: '收起详情' })
          : t('fiat.manageDetails', { defaultValue: '管理详情' });
  const isConnectCTA = !hasLinkedAccount || needsSetup;

  const capabilityText = (enabled?: boolean) => {
    if (typeof enabled !== 'boolean') {
      return t('common.unknown', { defaultValue: '--' });
    }
    return enabled ? t('fiat.enabled') : t('fiat.disabled');
  };

  return (
    <div className="group border border-border/80 bg-background/80 rounded-2xl p-4 sm:p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border">
      <div className="flex items-start justify-between gap-3 min-h-[40px]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-border/40 bg-background">
            <ProviderBrandIcon provider={provider} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground tracking-tight">{provider.name}</h3>
            <p className="text-xs text-muted-foreground max-w-[28rem]">
              {t(provider.descKey, { defaultValue: provider.descDefault })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isStandalone ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full',
                isConnected
                  ? 'bg-success/10 text-success'
                  : needsSetup
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {saasStatus.icon}
              {saasStatus.label}
            </span>
          ) : isConnected ? (
            <span className="inline-flex items-center gap-1 text-xs text-success bg-success/10 px-2.5 py-1 rounded-full">
              <CheckCircle className="w-3.5 h-3.5" />
              {t('fiat.connected', { defaultValue: '已连接' })}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              <AlertCircle className="w-3.5 h-3.5" />
              {t('fiat.notConnected', { defaultValue: '未连接' })}
            </span>
          )}
        </div>
      </div>

      {!isStandalone &&
        (() => {
          const modeLocked = isConnected;
          return (
            <div className="mt-3 inline-flex items-center rounded-xl border border-border/70 bg-muted/20 p-1">
              <button
                type="button"
                onClick={() => !modeLocked && onModeChange(provider.id, 'connected')}
                disabled={modeLocked && saasMode !== 'connected'}
                className={cn(
                  'h-8 px-3 rounded-lg text-xs font-medium transition-colors',
                  saasMode === 'connected'
                    ? 'bg-background text-foreground shadow-sm'
                    : modeLocked
                      ? 'text-muted-foreground/40 cursor-not-allowed'
                      : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t('fiat.modeConnectStandard', { defaultValue: 'Connect Standard' })}
              </button>
              <button
                type="button"
                onClick={() => !modeLocked && onModeChange(provider.id, 'direct')}
                disabled={modeLocked && saasMode !== 'direct'}
                className={cn(
                  'h-8 px-3 rounded-lg text-xs font-medium transition-colors',
                  saasMode === 'direct'
                    ? 'bg-background text-foreground shadow-sm'
                    : modeLocked
                      ? 'text-muted-foreground/40 cursor-not-allowed'
                      : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t('fiat.modeDirectApi', { defaultValue: 'Direct API' })}
              </button>
            </div>
          );
        })()}

      {!isStandalone && saasMode === 'direct' && !isConnected && (
        <div className="mt-3 rounded-lg border border-amber-300/40 bg-amber-500/10 px-3 py-2">
          <p className="text-xs text-amber-700 dark:text-amber-300">{t('fiat.directModeHint')}</p>
        </div>
      )}

      {/* SaaS mode: unified overview + actions */}
      {!isManualMode && (
        <div className="mt-4 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {hasLinkedAccount
                ? `${t('fiat.accountId', { defaultValue: '账户' })}: ${truncateAccountID(linkedAccountID)}`
                : t('fiat.connectHint', { defaultValue: '连接后即可查看账户状态与收款能力' })}
            </p>
            <button
              type="button"
              onClick={() => {
                if (!hasLinkedAccount || needsSetup) {
                  onStartOnboarding(provider.id, { clearDirectConfig: hasDirectConfig(config) });
                  return;
                }
                setDetailsOpen(prev => !prev);
              }}
              disabled={isOnboarding}
              className={cn(
                'w-full sm:w-auto sm:min-w-[164px] sm:px-4 flex items-center justify-center gap-2 h-9 rounded-lg',
                'text-sm font-medium active:scale-[0.98] transition-all',
                isConnectCTA
                  ? 'bg-primary text-primary-foreground border border-transparent hover:opacity-90'
                  : 'border border-border bg-background text-foreground hover:bg-muted/40',
                isOnboarding && 'opacity-70 cursor-wait'
              )}
            >
              {isOnboarding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {saasPrimaryLabel}
                </>
              ) : (
                <>
                  {!hasLinkedAccount || needsSetup ? (
                    <ExternalLink className="w-4 h-4" />
                  ) : detailsOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  {saasPrimaryLabel}
                </>
              )}
            </button>
          </div>
          {onboardingError && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <div>
                <p>{onboardingError}</p>
                <button
                  type="button"
                  onClick={() =>
                    onStartOnboarding(provider.id, { clearDirectConfig: hasDirectConfig(config) })
                  }
                  className="mt-1 font-medium underline hover:no-underline"
                >
                  {t('common.retry', { defaultValue: 'Retry' })}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual mode (standalone / SaaS direct): API key form */}
      {isManualMode && !isConnected && !isEditing && (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">{t('fiat.directSetupHint')}</p>
            {getProviderDocsLink(provider.id) && (
              <a
                href={getProviderDocsLink(provider.id)!}
                target="_blank"
                rel="noreferrer"
                className="inline-flex mt-1.5 text-[11px] font-medium text-primary underline hover:no-underline"
              >
                {t('fiat.openProviderConsole', {
                  provider: provider.name,
                  defaultValue: 'Open {{provider}} developer console',
                })}
              </a>
            )}
          </div>
          <div className="flex justify-start sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setVerifyMsg(undefined);
                setVerifyOK(null);
                setIsEditing(true);
              }}
              className={cn(
                'w-full sm:w-auto sm:min-w-[172px] sm:px-4 flex items-center justify-center gap-2 h-10 rounded-lg',
                'border border-border text-sm font-medium text-foreground',
                'hover:bg-muted/50 active:scale-[0.98] transition-all'
              )}
            >
              {t('fiat.configureApiKeys')}
            </button>
          </div>
        </div>
      )}

      {/* Edit form */}
      {isManualMode && isEditing && (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">{t('fiat.directFieldGuide')}</p>
          </div>
          {provider.fields
            .filter(f => f.key !== 'webhookSecret')
            .map(field => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  {t(field.labelKey, { defaultValue: field.labelDefault })}
                </label>
                <div className="relative">
                  <input
                    type={showSecrets ? 'text' : 'password'}
                    placeholder={field.placeholder}
                    value={formData[field.key] || ''}
                    onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className={cn(
                      'w-full h-10 px-3 pr-10 rounded-lg text-sm',
                      'border border-border bg-background',
                      'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecrets(prev => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  >
                    {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {(() => {
                  const hint = getConfigHint(provider.id, field.key);
                  if (!hint.text) return null;
                  return (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {hint.url ? (
                        <a
                          href={hint.url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline decoration-muted-foreground/40 hover:decoration-foreground hover:text-foreground transition-colors"
                        >
                          {hint.text}
                        </a>
                      ) : (
                        hint.text
                      )}
                    </p>
                  );
                })()}
              </div>
            ))}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || verifying || !formData.secretKey || !formData.publishableKey}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 h-10 rounded-lg',
                'bg-primary text-primary-foreground text-sm font-medium',
                'active:scale-[0.98] transition-all',
                (saving || verifying || !formData.secretKey || !formData.publishableKey) &&
                  'opacity-50 cursor-not-allowed'
              )}
            >
              {(saving || verifying) && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('fiat.saveAndVerify')}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setFormData({});
                setVerifyMsg(undefined);
                setVerifyOK(null);
              }}
              className="px-4 h-10 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted/50"
            >
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </button>
          </div>
          {verifyMsg && (
            <div
              className={cn(
                'px-3 py-2 rounded-lg text-xs',
                verifyOK ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
              )}
            >
              {verifyMsg}
            </div>
          )}
        </div>
      )}

      {/* SaaS mode: collapsible details */}
      {!isManualMode && canShowSaaSDetails && detailsOpen && (
        <div className="mt-4 space-y-3 animate-in fade-in duration-200">
          <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5 space-y-2.5">
            {accountStatus?.email && (
              <div className="flex items-center justify-between gap-3 min-h-6">
                <span className="text-xs text-muted-foreground">{t('fiat.email')}</span>
                <span className="text-xs text-foreground">{accountStatus.email}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 min-h-6">
              <span className="text-xs text-muted-foreground">{t('fiat.accountId')}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-foreground">
                  {truncateAccountID(linkedAccountID)}
                </span>
                <button
                  type="button"
                  onClick={handleCopyAccountID}
                  title={t('common.copy', { defaultValue: '复制' })}
                  className="p-1 text-muted-foreground hover:text-foreground rounded border border-border/50 hover:border-border"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                {copied && (
                  <span className="text-[10px] text-success">
                    {t('common.copied', { defaultValue: '已复制' })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 min-h-6">
              <span className="text-xs text-muted-foreground">{t('fiat.accountStatus')}</span>
              <StatusBadge status={accountStatus?.status || (isConnected ? 'active' : 'pending')} />
            </div>
            <div className="flex items-center justify-between gap-3 min-h-6">
              <span className="text-xs text-muted-foreground">{t('fiat.charges')}</span>
              <span
                className={cn(
                  'text-xs font-medium px-2 py-0.5 rounded-full',
                  accountStatus?.chargesEnabled
                    ? 'text-success bg-success/10'
                    : 'text-muted-foreground bg-muted'
                )}
              >
                {capabilityText(accountStatus?.chargesEnabled)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 min-h-6">
              <span className="text-xs text-muted-foreground">{t('fiat.payouts')}</span>
              <span
                className={cn(
                  'text-xs font-medium px-2 py-0.5 rounded-full',
                  accountStatus?.payoutsEnabled
                    ? 'text-success bg-success/10'
                    : 'text-muted-foreground bg-muted'
                )}
              >
                {capabilityText(accountStatus?.payoutsEnabled)}
              </span>
            </div>
          </div>

          {accountStatus?.requirements && accountStatus.requirements.length > 0 && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 p-3">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1.5">
                {t('fiat.pendingRequirements')}
              </p>
              <ul className="space-y-1">
                {accountStatus.requirements.map((req, i) => (
                  <li
                    key={i}
                    className="text-[11px] text-amber-600 dark:text-amber-400/80 leading-relaxed"
                  >
                    • {req}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={provider.dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex-1 min-w-[140px] flex items-center justify-center gap-1.5 h-9 rounded-lg',
                  'bg-primary text-primary-foreground border border-transparent text-xs font-medium',
                  'hover:opacity-90 transition-colors'
                )}
              >
                {t('fiat.manageDashboard', { provider: provider.name })}
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
                className={cn(
                  'flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg min-w-[110px]',
                  'border border-destructive/40 bg-background text-xs font-medium text-destructive',
                  'hover:bg-destructive/5 transition-colors'
                )}
              >
                {deleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {t('fiat.disconnect')}
              </button>
            </div>
            {accountStatus?.email && (
              <p className="text-[11px] text-muted-foreground text-center">
                {t('fiat.dashboardLoginHint', {
                  provider: provider.name,
                  email: accountStatus.email,
                })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Connected: Manual mode — masked config + actions */}
      {isConnected && isManualMode && !isEditing && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{config?.secretKey || '••••••••'}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setVerifyMsg(undefined);
                  setVerifyOK(null);
                  setIsEditing(true);
                }}
                className="inline-flex items-center gap-1 text-xs text-foreground hover:text-foreground/80"
              >
                {t('common.edit', { defaultValue: '编辑' })}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
                className="inline-flex items-center gap-1 text-xs text-destructive hover:text-destructive/80"
              >
                {deleting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
                {t('fiat.disconnect')}
              </button>
            </div>
          </div>

          {/* Webhook status */}
          {webhookConfigured ? (
            <div className="flex items-center gap-1.5 text-xs text-success">
              <CheckCircle className="w-3.5 h-3.5" />
              {t('fiat.webhookAutoConfigured')}
            </div>
          ) : (
            <div className="rounded-lg border border-amber-300/40 bg-amber-500/10 p-3 space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    {t('fiat.webhookNeedsSetup')}
                  </p>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                    {t('fiat.webhookNeedsSetupDesc')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRetryWebhook}
                  disabled={webhookRetrying}
                  className={cn(
                    'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium',
                    'border border-border bg-background text-foreground hover:bg-muted/50 transition-colors',
                    webhookRetrying && 'opacity-60 cursor-wait'
                  )}
                >
                  {webhookRetrying ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  {webhookRetrying ? t('fiat.webhookRetrying') : t('fiat.webhookRetryAuto')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualWebhook(prev => !prev)}
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showManualWebhook
                    ? t('common.collapse', { defaultValue: 'Collapse' })
                    : t('fiat.webhookManualSetup', { defaultValue: 'Manual setup' })}
                </button>
              </div>

              {webhookMsg && (
                <div
                  className={cn(
                    'px-3 py-2 rounded-lg text-xs',
                    webhookMsgOK
                      ? 'bg-success/10 text-success'
                      : 'bg-destructive/10 text-destructive'
                  )}
                >
                  {webhookMsg}
                </div>
              )}

              {showManualWebhook && (
                <div className="space-y-2.5 pt-1 border-t border-amber-300/30">
                  {/* Webhook URL */}
                  {(() => {
                    const webhookUrl = getWebhookUrl(provider.id);
                    const isLocal = isLocalhostUrl(webhookUrl);
                    return (
                      <div className="space-y-1">
                        <label className="block text-[11px] font-medium text-muted-foreground">
                          {t('fiat.webhookEndpointUrl')}
                        </label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs font-mono text-foreground bg-background rounded px-2 py-1.5 border border-border/50 truncate select-all">
                            {webhookUrl}
                          </code>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(webhookUrl);
                              } catch {
                                /* noop */
                              }
                            }}
                            className="shrink-0 p-1.5 rounded border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                            title={t('common.copy', { defaultValue: 'Copy' })}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {isLocal && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400">
                            {t('fiat.webhookLocalhostWarning')}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Required events */}
                  {WEBHOOK_REQUIRED_EVENTS[provider.id] && (
                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-muted-foreground">
                        {t('fiat.webhookRequiredEvents')}
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {WEBHOOK_REQUIRED_EVENTS[provider.id].map(evt => (
                          <code
                            key={evt}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background border border-border/50 text-muted-foreground"
                          >
                            {evt}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-muted-foreground">
                    {t('fiat.webhookManualHint', { provider: provider.name })}
                  </p>

                  {/* Manual webhook secret input */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-medium text-muted-foreground">
                      {provider.id === 'paypal'
                        ? t('admin.integrations.webhookId', { defaultValue: 'Webhook ID' })
                        : t('admin.integrations.webhookSecret', { defaultValue: 'Webhook Secret' })}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={provider.id === 'paypal' ? '' : 'whsec_...'}
                        value={manualWebhookSecret}
                        onChange={e => setManualWebhookSecret(e.target.value)}
                        className={cn(
                          'flex-1 h-9 px-3 rounded-lg text-sm',
                          'border border-border bg-background',
                          'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
                        )}
                      />
                      <button
                        type="button"
                        onClick={handleSaveManualWebhook}
                        disabled={savingWebhook || !manualWebhookSecret.trim()}
                        className={cn(
                          'inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium',
                          'bg-primary text-primary-foreground hover:opacity-90 transition-all',
                          (savingWebhook || !manualWebhookSecret.trim()) &&
                            'opacity-50 cursor-not-allowed'
                        )}
                      >
                        {savingWebhook && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {t('fiat.webhookSecretSave')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs">
          {errorMsg}
        </div>
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('fiat.disconnectConfirmTitle', { provider: provider.name })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('fiat.disconnectConfirmDesc', { provider: provider.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', { defaultValue: 'Cancel' })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDeleteConfirm(false);
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('fiat.disconnect')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export const PaymentProvidersSection: React.FC = () => {
  const { t } = useI18n();
  const standalone = isStandaloneMode();
  const [configs, setConfigs] = useState<FiatProviderConfigView[]>([]);
  const [statuses, setStatuses] = useState<Record<string, FiatAccountStatus>>({});
  const [saasModes, setSaasModes] = useState<Record<string, SaaSConnectMode>>({});
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [onboardingProvider, setOnboardingProvider] = useState<string | null>(null);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [errorProvider, setErrorProvider] = useState<string | null>(null);

  const loadConfigs = useCallback(
    async (silent = false) => {
      if (silent) {
        setLoadingRefresh(true);
      } else {
        setLoadingInitial(true);
      }
      try {
        const snapshot = await loadProviderSnapshot(standalone);
        setConfigs(snapshot.configs);
        setStatuses(snapshot.statuses);
        if (!standalone) {
          setSaasModes(prev => {
            const next = { ...prev };
            for (const provider of PROVIDERS) {
              const cfg = snapshot.configs.find(item => item.providerID === provider.id);
              const hasPlatformAccount = Boolean(snapshot.statuses[provider.id]?.accountID);
              if (hasDirectConfig(cfg)) {
                next[provider.id] = 'direct';
                continue;
              }
              if (hasPlatformAccount) {
                next[provider.id] = 'connected';
                continue;
              }
              next[provider.id] = next[provider.id] ?? deriveSaaSMode(cfg);
            }
            return next;
          });
        }
      } catch {
        setConfigs([]);
        setStatuses({});
      } finally {
        setLoadingInitial(false);
        setLoadingRefresh(false);
      }
    },
    [standalone]
  );

  useEffect(() => {
    loadConfigs(false);
  }, [loadConfigs]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !standalone) {
        loadConfigs(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadConfigs, standalone]);

  const handleSave = useCallback(
    async (providerID: string, input: FiatProviderConfigInput) => {
      await fiatApi.saveConfig(providerID, input);
      await loadConfigs(true);
    },
    [loadConfigs]
  );

  const handleDelete = useCallback(
    async (providerID: string, mode: SaaSConnectMode) => {
      if (standalone || mode === 'direct') {
        await fiatApi.deleteConfig(providerID);
      } else {
        await fiatApi.disconnectProvider(providerID);
      }
      await loadConfigs(true);
    },
    [loadConfigs, standalone]
  );

  const handleModeChange = useCallback((providerID: string, mode: SaaSConnectMode) => {
    setSaasModes(prev => ({ ...prev, [providerID]: mode }));
  }, []);

  const handleStartOnboarding = useCallback(
    async (
      providerID: string,
      opts?: {
        clearDirectConfig?: boolean;
      }
    ) => {
      const currentUrl = window.location.href;
      setOnboardingProvider(providerID);
      setOnboardingError(null);
      setErrorProvider(null);
      try {
        if (opts?.clearDirectConfig) {
          await fiatApi.deleteConfig(providerID);
        }
        const result = await fiatApi.startOnboarding(providerID, {
          returnURL: currentUrl,
          refreshURL: currentUrl,
        });
        if (result?.url) {
          window.location.href = result.url;
        } else {
          setOnboardingProvider(null);
        }
      } catch (err) {
        setOnboardingProvider(null);
        setErrorProvider(providerID);
        setOnboardingError(err instanceof Error ? err.message : t('fiat.onboardingFailed'));
      }
    },
    [t]
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          {t('admin.integrations.paymentProviders.title', { defaultValue: 'Payment Providers' })}
          {loadingRefresh && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('admin.integrations.paymentProviders.subtitle', {
            defaultValue: 'Accept fiat payments from your customers',
          })}
        </p>
        {!standalone && (
          <p className="text-xs text-muted-foreground mt-1.5">
            {t('fiat.modeRecommendation', {
              defaultValue:
                'Recommended: Connect Standard for most merchants. Use Direct API only if you already manage provider API credentials.',
            })}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {loadingInitial
          ? PROVIDERS.map(provider => (
              <div
                key={provider.id}
                className="border border-border/80 bg-background/80 rounded-2xl p-4 sm:p-5 shadow-sm animate-pulse"
              >
                <div className="flex items-start justify-between gap-3 min-h-[40px]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted/70" />
                    <div className="space-y-2">
                      <div className="h-4 w-28 rounded bg-muted/70" />
                      <div className="h-3 w-52 rounded bg-muted/60" />
                    </div>
                  </div>
                  <div className="h-6 w-16 rounded-full bg-muted/60" />
                </div>
                <div className="mt-4 h-9 w-full rounded-lg bg-muted/50" />
              </div>
            ))
          : PROVIDERS.map(provider => {
              const config = configs.find(c => c.providerID === provider.id);
              const saasMode = standalone
                ? ('direct' as const)
                : (saasModes[provider.id] ?? deriveSaaSMode(config));
              return (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  config={config}
                  accountStatus={statuses[provider.id]}
                  isStandalone={standalone}
                  saasMode={saasMode}
                  isOnboarding={onboardingProvider === provider.id}
                  onboardingError={errorProvider === provider.id ? onboardingError : null}
                  onModeChange={handleModeChange}
                  onSave={handleSave}
                  onDelete={handleDelete}
                  onStartOnboarding={handleStartOnboarding}
                  onRefresh={() => loadConfigs(true)}
                />
              );
            })}
      </div>
    </div>
  );
};

export default PaymentProvidersSection;
