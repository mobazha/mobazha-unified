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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n, fiatApi, isStandaloneMode } from '@mobazha/core';
import type { FiatProviderConfigView, FiatProviderConfigInput } from '@mobazha/core';

const PROVIDERS = [
  {
    id: 'stripe',
    name: 'Stripe',
    color: '#6772e5',
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
    description: 'Accept PayPal payments',
    fields: [
      { key: 'publishableKey', label: 'Client ID', placeholder: 'AX...' },
      { key: 'secretKey', label: 'Client Secret', placeholder: 'EL...' },
      { key: 'webhookSecret', label: 'Webhook ID', placeholder: '' },
    ],
  },
] as const;

interface ProviderCardProps {
  provider: (typeof PROVIDERS)[number];
  config?: FiatProviderConfigView;
  isStandalone: boolean;
  onSave: (providerID: string, input: FiatProviderConfigInput) => Promise<void>;
  onDelete: (providerID: string) => Promise<void>;
  onStartOnboarding: (providerID: string) => Promise<void>;
}

const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  config,
  isStandalone,
  onSave,
  onDelete,
  onStartOnboarding,
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
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : t('fiat.deleteFailed', { defaultValue: 'Failed to disconnect' })
      );
    } finally {
      setDeleting(false);
    }
  }, [onDelete, provider.id, t]);

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

      {/* Connected: show masked config + disconnect */}
      {isConnected && (
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
  const [loading, setLoading] = useState(true);

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const allConfigs = await fiatApi.getConfig();
      setConfigs(allConfigs || []);
    } catch {
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
    const result = await fiatApi.startOnboarding(providerID, {
      returnURL: currentUrl,
      refreshURL: currentUrl,
    });
    if (result?.url) {
      window.open(result.url, '_blank', 'noopener');
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
            isStandalone={standalone}
            onSave={handleSave}
            onDelete={handleDelete}
            onStartOnboarding={handleStartOnboarding}
          />
        ))}
      </div>
    </div>
  );
};

export default PaymentProvidersSection;
