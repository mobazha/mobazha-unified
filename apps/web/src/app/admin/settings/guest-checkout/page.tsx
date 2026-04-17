'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useI18n } from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import {
  getGuestCheckoutSettings,
  updateGuestCheckoutSettings,
  type GuestCheckoutSettings,
} from '@mobazha/core/services/api/guestCheckout';
import { cn } from '@/lib/utils';
import { TokenIcon } from '@/components/Payment/TokenIcon';
import { GUEST_CHECKOUT_COINS } from '@mobazha/core/config/guestCheckoutCoins';
import { HelpPopover } from '@/components/GuestCheckout/HelpPopover';

export default function GuestCheckoutSettingsPage() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<GuestCheckoutSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getGuestCheckoutSettings()
      .then(res => setSettings(res))
      .catch(() => setError(t('admin.guestCheckout.loadError')));
  }, [t]);

  const handleToggleEnabled = useCallback(() => {
    if (!settings) return;
    setSettings(prev => prev ? { ...prev, enabled: !prev.enabled } : prev);
  }, [settings]);

  const handleToggleCoin = useCallback((coinCode: string) => {
    if (!settings) return;
    setSettings(prev => {
      if (!prev) return prev;
      const coins = prev.acceptedCoins.includes(coinCode)
        ? prev.acceptedCoins.filter(c => c !== coinCode)
        : [...prev.acceptedCoins, coinCode];
      return { ...prev, acceptedCoins: coins };
    });
  }, [settings]);

  const handleTimeoutChange = useCallback((value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 5 || num > 120) return;
    setSettings(prev => prev ? { ...prev, paymentTimeoutMinutes: num } : prev);
  }, []);

  const handleSave = useCallback(async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await updateGuestCheckoutSettings(settings);
      setSettings(res);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.guestCheckout.saveError'));
    } finally {
      setSaving(false);
    }
  }, [settings, t]);

  if (!settings && !error) {
    return (
      <div>
        <SettingsPageHeader
          title={t('admin.guestCheckout.title')}
          description={t('admin.guestCheckout.description')}
          backHref="/admin/settings"
        />
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div data-testid="admin-guest-checkout">
      <SettingsPageHeader
        title={t('admin.guestCheckout.title')}
        description={t('admin.guestCheckout.description')}
        backHref="/admin/settings"
      />

      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-500/50 bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-700 dark:text-green-400">
            {t('admin.guestCheckout.saveSuccess')}
          </div>
        )}

        {settings && (
          <>
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium">{t('admin.guestCheckout.enableToggle')}</p>
                    <HelpPopover
                      title={t('admin.guestCheckout.enableHelpTitle')}
                      body={t('admin.guestCheckout.enableHelpBody')}
                      ariaLabel={t('admin.guestCheckout.enableHelpTitle')}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t('admin.guestCheckout.enableDescription')}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.enabled}
                  onClick={handleToggleEnabled}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    settings.enabled ? 'bg-primary' : 'bg-muted-foreground/30',
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      settings.enabled ? 'translate-x-6' : 'translate-x-1',
                    )}
                  />
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border p-4 space-y-4">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-medium">{t('admin.guestCheckout.acceptedCoins')}</p>
                  <HelpPopover
                    title={t('admin.guestCheckout.acceptedCoinsHelpTitle')}
                    body={t('admin.guestCheckout.acceptedCoinsHelpBody')}
                    ariaLabel={t('admin.guestCheckout.acceptedCoinsHelpTitle')}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t('admin.guestCheckout.acceptedCoinsDescription')}
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {GUEST_CHECKOUT_COINS.map(coin => {
                  const selected = settings.acceptedCoins.includes(coin.paymentCoin);
                  return (
                    <button
                      key={coin.paymentCoin}
                      type="button"
                      onClick={() => handleToggleCoin(coin.paymentCoin)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border p-3 text-sm transition-colors',
                        selected
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-border text-muted-foreground hover:border-muted-foreground/50',
                      )}
                    >
                      <TokenIcon token={coin.paymentCoin} size={24} />
                      <div className="text-left">
                        <p className={cn('font-medium', selected && 'text-primary')}>{coin.paymentCoin}</p>
                        <p className="text-xs opacity-70">{coin.chain.name}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-border p-4 space-y-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-medium">{t('admin.guestCheckout.paymentTimeout')}</p>
                  <HelpPopover
                    title={t('admin.guestCheckout.paymentTimeoutHelpTitle')}
                    body={t('admin.guestCheckout.paymentTimeoutHelpBody')}
                    ariaLabel={t('admin.guestCheckout.paymentTimeoutHelpTitle')}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t('admin.guestCheckout.paymentTimeoutDescription')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={settings.paymentTimeoutMinutes}
                  onChange={e => handleTimeoutChange(e.target.value)}
                  className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <span className="text-sm text-muted-foreground">{t('admin.guestCheckout.minutes')}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  'rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors',
                  saving ? 'bg-primary/50 cursor-not-allowed' : 'bg-primary hover:bg-primary/90',
                )}
              >
                {saving ? t('admin.guestCheckout.saving') : t('admin.guestCheckout.saveSettings')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
