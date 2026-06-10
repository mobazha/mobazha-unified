'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, ShieldCheck, Zap } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import {
  getStorePaymentPolicy,
  updateStorePaymentPolicy,
  type UtxoConfirmationPolicy,
} from '@mobazha/core/services/api/paymentPolicy';
import { cn } from '@/lib/utils';

const POLICY_OPTIONS: {
  value: UtxoConfirmationPolicy;
  icon: React.ReactNode;
  titleKey: string;
  descKey: string;
}[] = [
  {
    value: 'chain_confirmed',
    icon: <ShieldCheck className="w-5 h-5 text-primary" />,
    titleKey: 'admin.paymentPolicy.chainConfirmedTitle',
    descKey: 'admin.paymentPolicy.chainConfirmedDesc',
  },
  {
    value: 'mempool_accepted',
    icon: <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
    titleKey: 'admin.paymentPolicy.mempoolAcceptedTitle',
    descKey: 'admin.paymentPolicy.mempoolAcceptedDesc',
  },
];

export function PaymentConfirmationSection() {
  const { t } = useI18n();
  const [policy, setPolicy] = useState<UtxoConfirmationPolicy | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getStorePaymentPolicy()
      .then(res => setPolicy(res.utxoConfirmationPolicy ?? 'chain_confirmed'))
      .catch(() => setError(t('admin.paymentPolicy.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  const handleSelect = useCallback(
    async (next: UtxoConfirmationPolicy) => {
      if (!policy || next === policy || saving) return;
      setSaving(true);
      setError(null);
      setSuccess(false);
      try {
        const res = await updateStorePaymentPolicy({ utxoConfirmationPolicy: next });
        setPolicy(res.utxoConfirmationPolicy);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('admin.paymentPolicy.saveError'));
      } finally {
        setSaving(false);
      }
    },
    [policy, saving, t]
  );

  if (loading) {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('common.loading')}
        </div>
      </section>
    );
  }

  return (
    <section
      className="rounded-xl border border-border bg-card p-4 md:p-6 space-y-4"
      data-testid="payment-confirmation-policy"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {POLICY_OPTIONS.map(option => {
          const selected = policy === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={saving}
              onClick={() => handleSelect(option.value)}
              className={cn(
                'flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors',
                selected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border hover:border-primary/40 hover:bg-muted/40',
                saving && 'opacity-70 cursor-wait'
              )}
              aria-pressed={selected}
            >
              <div className="flex items-center gap-2">
                {option.icon}
                <span className="text-sm font-medium text-foreground">{t(option.titleKey)}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{t(option.descKey)}</p>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">{t('admin.paymentPolicy.scopeNote')}</p>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-success" role="status">
          {t('admin.paymentPolicy.saveSuccess')}
        </p>
      )}
    </section>
  );
}
