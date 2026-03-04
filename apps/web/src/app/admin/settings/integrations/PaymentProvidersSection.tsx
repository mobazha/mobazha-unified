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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n, fiatApi, isStandaloneMode } from '@mobazha/core';
import type {
  FiatProviderConfigView,
  FiatProviderConfigInput,
  FiatAccountStatus,
} from '@mobazha/core';

const PROVIDERS = [
  {
    id: 'stripe',
    name: 'Stripe',
    color: '#6772e5',
    dashboardUrl: 'https://dashboard.stripe.com',
    description: 'Accept credit cards, Apple Pay, and Google Pay',
    fields: [
      { key: 'secretKey', label: 'Secret Key', placeholder: 'sk_live_...' },
      { key: 'publishableKey', label: 'Publishable Key', placeholder: 'pk_live_...' },
      { key: 'webhookSecret', label: 'Webhook Secret', placeholder: 'whsec_...' },
    ],
  },
  {
    id: 'paypal',
    name: 'PayPal',
    color: '#0070ba',
    dashboardUrl: 'https://www.paypal.com/businessmanage/account/aboutBusiness',
    description: 'Accept PayPal payments',
    fields: [
      { key: 'publishableKey', label: 'Client ID', placeholder: 'AX...' },
      { key: 'secretKey', label: 'Client Secret', placeholder: 'EL...' },
      { key: 'webhookSecret', label: 'Webhook ID', placeholder: '' },
    ],
  },
] as const;

function truncateAccountID(id?: string) {
  if (!id) return '';
  if (id.length <= 16) return id;
  return `${id.slice(0, 10)}...${id.slice(-4)}`;
}

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, { color: string; label: string }> = {
    active: { color: 'text-success bg-success/10', label: 'Active' },
    restricted: {
      color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20',
      label: 'Restricted',
    },
    pending: {
      color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20',
      label: 'Pending',
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
      {entry.label}
    </span>
  );
}

interface ProviderCardProps {
  provider: (typeof PROVIDERS)[number];
  config?: FiatProviderConfigView;
  accountStatus?: FiatAccountStatus;
  isStandalone: boolean;
  onSave: (providerID: string, input: FiatProviderConfigInput) => Promise<void>;
  onDelete: (providerID: string) => Promise<void>;
  onStartOnboarding: (providerID: string) => Promise<void>;
  onRefresh: () => void;
}

const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  config,
  accountStatus,
  isStandalone,
  onSave,
  onDelete,
  onStartOnboarding,
  onRefresh,
}) => {
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>();
  const isConnected = config?.isActive;

  const handleSave = useCallback(async () => {
    setSaving(true);
    setErrorMsg(undefined);
    try {
      await onSave(provider.id, {
        providerID: provider.id,
        secretKey: formData.secretKey || '',
        publishableKey: formData.publishableKey || '',
        webhookSecret: formData.webhookSecret || '',
      });
      setIsEditing(false);
      setFormData({});
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : t('fiat.saveFailed', { defaultValue: 'Failed to save configuration' })
      );
    } finally {
      setSaving(false);
    }
  }, [onSave, provider.id, formData, t]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    setErrorMsg(undefined);
    try {
      await onDelete(provider.id);
      onRefresh();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : t('fiat.deleteFailed', { defaultValue: 'Failed to disconnect' })
      );
    } finally {
      setDeleting(false);
    }
  }, [onDelete, provider.id, t, onRefresh]);

  return (
    <div className="border border-border rounded-xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${provider.color}15` }}
          >
            <CreditCard className="w-5 h-5" style={{ color: provider.color }} />
          </div>
          <div>
            <h3 className="font-medium text-foreground">{provider.name}</h3>
            <p className="text-xs text-muted-foreground">{provider.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isConnected ? (
            <span className="inline-flex items-center gap-1 text-xs text-success">
              <CheckCircle className="w-3.5 h-3.5" />
              {t('fiat.connected', { defaultValue: 'Connected' })}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <AlertCircle className="w-3.5 h-3.5" />
              {t('fiat.notConnected', { defaultValue: 'Not connected' })}
            </span>
          )}
        </div>
      </div>

      {/* SaaS mode: OAuth connect */}
      {!isStandalone && !isConnected && (
        <button
          type="button"
          onClick={() => onStartOnboarding(provider.id)}
          className={cn(
            'mt-4 w-full flex items-center justify-center gap-2 h-10 rounded-lg',
            'bg-primary text-primary-foreground text-sm font-medium',
            'active:scale-[0.98] transition-all'
          )}
        >
          <ExternalLink className="w-4 h-4" />
          {t('fiat.connectProvider', {
            defaultValue: `Connect ${provider.name}`,
            provider: provider.name,
          })}
        </button>
      )}

      {/* Standalone mode: API key form */}
      {isStandalone && !isConnected && !isEditing && (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className={cn(
            'mt-4 w-full flex items-center justify-center gap-2 h-10 rounded-lg',
            'border border-border text-sm font-medium text-foreground',
            'hover:bg-muted/50 active:scale-[0.98] transition-all'
          )}
        >
          {t('fiat.configureApiKeys', { defaultValue: 'Configure API Keys' })}
        </button>
      )}

      {/* Edit form */}
      {isStandalone && isEditing && (
        <div className="mt-4 space-y-3">
          {provider.fields.map(field => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {field.label}
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
            </div>
          ))}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !formData.secretKey || !formData.publishableKey}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 h-10 rounded-lg',
                'bg-primary text-primary-foreground text-sm font-medium',
                'active:scale-[0.98] transition-all',
                (saving || !formData.secretKey || !formData.publishableKey) &&
                  'opacity-50 cursor-not-allowed'
              )}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('common.save', { defaultValue: 'Save' })}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setFormData({});
              }}
              className="px-4 h-10 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted/50"
            >
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </button>
          </div>
        </div>
      )}

      {/* Connected: SaaS mode — account details */}
      {isConnected && !isStandalone && accountStatus && (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg bg-muted/40 p-3 space-y-2.5">
            {accountStatus.email && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {t('fiat.email', { defaultValue: 'Email' })}
                </span>
                <span className="text-xs text-foreground">{accountStatus.email}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {t('fiat.accountId', { defaultValue: 'Account' })}
              </span>
              <span className="text-xs font-mono text-foreground">
                {truncateAccountID(accountStatus.accountID)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {t('fiat.accountStatus', { defaultValue: 'Status' })}
              </span>
              <StatusBadge status={accountStatus.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {t('fiat.charges', { defaultValue: 'Charges' })}
              </span>
              <span
                className={cn(
                  'text-xs font-medium',
                  accountStatus.chargesEnabled ? 'text-success' : 'text-muted-foreground'
                )}
              >
                {accountStatus.chargesEnabled
                  ? t('fiat.enabled', { defaultValue: 'Enabled' })
                  : t('fiat.disabled', { defaultValue: 'Disabled' })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {t('fiat.payouts', { defaultValue: 'Payouts' })}
              </span>
              <span
                className={cn(
                  'text-xs font-medium',
                  accountStatus.payoutsEnabled ? 'text-success' : 'text-muted-foreground'
                )}
              >
                {accountStatus.payoutsEnabled
                  ? t('fiat.enabled', { defaultValue: 'Enabled' })
                  : t('fiat.disabled', { defaultValue: 'Disabled' })}
              </span>
            </div>
          </div>

          {accountStatus.requirements && accountStatus.requirements.length > 0 && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 p-3">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1.5">
                {t('fiat.pendingRequirements', { defaultValue: 'Action needed' })}
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
            <div className="flex items-center gap-2">
              <a
                href={provider.dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg',
                  'border border-border text-xs font-medium text-foreground',
                  'hover:bg-muted/50 transition-colors'
                )}
              >
                {t('fiat.manageDashboard', { defaultValue: `${provider.name} Dashboard` })}
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className={cn(
                  'flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg',
                  'border border-destructive/30 text-xs font-medium text-destructive',
                  'hover:bg-destructive/5 transition-colors'
                )}
              >
                {deleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {t('fiat.disconnect', { defaultValue: 'Disconnect' })}
              </button>
            </div>
            {accountStatus.email && (
              <p className="text-[11px] text-muted-foreground text-center">
                {t('fiat.dashboardLoginHint', {
                  defaultValue: `Sign in to ${provider.name} with ${accountStatus.email}`,
                  provider: provider.name,
                  email: accountStatus.email,
                })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Connected: Standalone mode — masked config + disconnect */}
      {isConnected && isStandalone && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {config?.maskedSecretKey || '••••••••'}
          </span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1 text-xs text-destructive hover:text-destructive/80"
          >
            {deleting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Trash2 className="w-3 h-3" />
            )}
            {t('fiat.disconnect', { defaultValue: 'Disconnect' })}
          </button>
        </div>
      )}

      {/* Connected: SaaS mode fallback (no detailed status) */}
      {isConnected && !isStandalone && !accountStatus && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-mono">
            {truncateAccountID(config?.accountID)}
          </span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1 text-xs text-destructive hover:text-destructive/80"
          >
            {deleting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Trash2 className="w-3 h-3" />
            )}
            {t('fiat.disconnect', { defaultValue: 'Disconnect' })}
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs">
          {errorMsg}
        </div>
      )}
    </div>
  );
};

export const PaymentProvidersSection: React.FC = () => {
  const { t } = useI18n();
  const standalone = isStandaloneMode();
  const [configs, setConfigs] = useState<FiatProviderConfigView[]>([]);
  const [statuses, setStatuses] = useState<Record<string, FiatAccountStatus>>({});
  const [loading, setLoading] = useState(true);

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const allConfigs = await fiatApi.getConfig();
      const cfgs = allConfigs || [];
      const statusMap: Record<string, FiatAccountStatus> = {};

      if (!standalone) {
        const statusResults = await Promise.allSettled(
          PROVIDERS.map(p => fiatApi.getOnboardingStatus(p.id))
        );
        statusResults.forEach((result, i) => {
          if (result.status !== 'fulfilled') return;
          const status = result.value;
          if (!status?.accountID) return;
          const providerID = PROVIDERS[i].id;
          statusMap[providerID] = status;
          const existing = cfgs.find(c => c.providerID === providerID);
          if (existing) {
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

      setConfigs(cfgs);
      setStatuses(statusMap);
    } catch {
      setConfigs([]);
      setStatuses({});
    } finally {
      setLoading(false);
    }
  }, [standalone]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const handleSave = useCallback(
    async (providerID: string, input: FiatProviderConfigInput) => {
      await fiatApi.saveConfig(providerID, input);
      await loadConfigs();
    },
    [loadConfigs]
  );

  const handleDelete = useCallback(
    async (providerID: string) => {
      await fiatApi.deleteConfig(providerID);
      await loadConfigs();
    },
    [loadConfigs]
  );

  const handleStartOnboarding = useCallback(async (providerID: string) => {
    const currentUrl = window.location.href;
    try {
      const result = await fiatApi.startOnboarding(providerID, {
        returnURL: currentUrl,
        refreshURL: currentUrl,
      });
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch {
      // Onboarding start failed
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {t('admin.integrations.paymentProviders.title', { defaultValue: 'Payment Providers' })}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('admin.integrations.paymentProviders.subtitle', {
            defaultValue: 'Accept fiat payments from your customers',
          })}
        </p>
      </div>

      <div className="space-y-3">
        {PROVIDERS.map(provider => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            config={configs.find(c => c.providerID === provider.id)}
            accountStatus={statuses[provider.id]}
            isStandalone={standalone}
            onSave={handleSave}
            onDelete={handleDelete}
            onStartOnboarding={handleStartOnboarding}
            onRefresh={loadConfigs}
          />
        ))}
      </div>
    </div>
  );
};

export default PaymentProvidersSection;
