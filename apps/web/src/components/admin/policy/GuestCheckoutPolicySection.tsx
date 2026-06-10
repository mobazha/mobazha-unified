'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { useI18n, getAdminStorePaymentsPath, useReceivingAccounts } from '@mobazha/core';
import {
  getGuestCheckoutSettings,
  updateGuestCheckoutSettings,
  getPGPPublicKey,
  updatePGPPublicKey,
  deletePGPPublicKey,
  type GuestCheckoutSettings,
} from '@mobazha/core/services/api/guestCheckout';
import { cn } from '@/lib/utils';
import { TokenIcon } from '@/components/Payment/TokenIcon';
import { GUEST_CHECKOUT_COINS, type GuestCoinInfo } from '@mobazha/core/config/guestCheckoutCoins';
import { HelpPopover } from '@/components/GuestCheckout/HelpPopover';
import { isOutpostMode } from '@mobazha/core/config/env';
import { Textarea } from '@/components/ui/textarea';
import type { ReceivingAccount } from '@mobazha/core/services/api/wallet';

interface GuestCheckoutPolicySectionProps {
  /** When true, hides the cross-page link to store payments (same page). */
  embedded?: boolean;
}

function hasActiveReceivingAccount(coin: GuestCoinInfo, accounts: ReceivingAccount[]): boolean {
  return accounts.some(
    acc => acc.chainType === coin.chainId && acc.isActive && Boolean(acc.address?.trim())
  );
}

export function GuestCheckoutPolicySection({ embedded = false }: GuestCheckoutPolicySectionProps) {
  const { t } = useI18n();
  const { data: receivingAccounts = [] } = useReceivingAccounts();
  const [settings, setSettings] = useState<GuestCheckoutSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [pgpKey, setPgpKey] = useState<string>('');
  const [pgpKeyDraft, setPgpKeyDraft] = useState<string>('');
  const [pgpSaving, setPgpSaving] = useState(false);
  const [pgpError, setPgpError] = useState<string | null>(null);
  const [pgpSuccess, setPgpSuccess] = useState(false);
  const showPGPSection = isOutpostMode();

  useEffect(() => {
    getGuestCheckoutSettings()
      .then(res => setSettings(res))
      .catch(() => setError(t('admin.guestCheckout.loadError')));

    if (isOutpostMode()) {
      getPGPPublicKey()
        .then(key => {
          setPgpKey(key);
          setPgpKeyDraft(key);
        })
        .catch(() => {
          // 404 = not configured yet
        });
    }
  }, [t]);

  const handleSavePGPKey = useCallback(async () => {
    setPgpSaving(true);
    setPgpError(null);
    setPgpSuccess(false);
    try {
      if (pgpKeyDraft.trim()) {
        await updatePGPPublicKey(pgpKeyDraft.trim());
        setPgpKey(pgpKeyDraft.trim());
      } else {
        await deletePGPPublicKey();
        setPgpKey('');
        setPgpKeyDraft('');
      }
      setPgpSuccess(true);
      setTimeout(() => setPgpSuccess(false), 3000);
    } catch (err) {
      setPgpError(err instanceof Error ? err.message : 'Failed to update PGP key');
    } finally {
      setPgpSaving(false);
    }
  }, [pgpKeyDraft]);

  const handleToggleEnabled = useCallback(() => {
    if (!settings) return;
    setSettings(prev => (prev ? { ...prev, enabled: !prev.enabled } : prev));
  }, [settings]);

  const handleToggleCoin = useCallback(
    (coinCode: string) => {
      if (!settings) return;
      setSettings(prev => {
        if (!prev) return prev;
        const coins = prev.acceptedCoins.includes(coinCode)
          ? prev.acceptedCoins.filter(c => c !== coinCode)
          : [...prev.acceptedCoins, coinCode];
        return { ...prev, acceptedCoins: coins };
      });
    },
    [settings]
  );

  const handleTimeoutChange = useCallback((value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 5 || num > 120) return;
    setSettings(prev => (prev ? { ...prev, paymentTimeoutMinutes: num } : prev));
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

  const coinsMissingAccounts = useMemo(() => {
    if (!settings) return [];
    return settings.acceptedCoins
      .map(paymentCoin => GUEST_CHECKOUT_COINS.find(c => c.paymentCoin === paymentCoin))
      .filter((coin): coin is GuestCoinInfo => coin !== undefined)
      .filter(coin => !hasActiveReceivingAccount(coin, receivingAccounts));
  }, [settings, receivingAccounts]);

  if (!settings && !error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-guest-checkout">
      {!embedded && (
        <p className="text-sm text-muted-foreground">
          {t('admin.guestCheckout.receivingAccountsNote')}{' '}
          <Link href={getAdminStorePaymentsPath()} className="text-primary hover:underline">
            {t('admin.guestCheckout.receivingAccountsLink')}
          </Link>
        </p>
      )}
      {embedded && (
        <p className="text-sm text-muted-foreground">
          {t('admin.guestCheckout.receivingAccountsInlineNote')}
        </p>
      )}

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
                  settings.enabled ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    settings.enabled ? 'translate-x-6' : 'translate-x-1'
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
                const missingAccount =
                  selected && !hasActiveReceivingAccount(coin, receivingAccounts);
                return (
                  <button
                    key={coin.paymentCoin}
                    type="button"
                    onClick={() => handleToggleCoin(coin.paymentCoin)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border p-3 text-sm transition-colors',
                      selected
                        ? missingAccount
                          ? 'border-amber-500/60 bg-amber-500/5 text-foreground'
                          : 'border-primary bg-primary/5 text-foreground'
                        : 'border-border text-muted-foreground hover:border-muted-foreground/50'
                    )}
                    data-testid={`guest-coin-${coin.paymentCoin}`}
                    data-missing-account={missingAccount ? 'true' : 'false'}
                  >
                    <TokenIcon token={coin.paymentCoin} size={24} />
                    <div className="text-left">
                      <p className={cn('font-medium', selected && 'text-primary')}>
                        {coin.paymentCoin}
                      </p>
                      <p className="text-xs opacity-70">{coin.chain.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            {coinsMissingAccounts.length > 0 && (
              <div
                className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/40 p-3 space-y-1"
                data-testid="guest-checkout-missing-accounts"
                role="alert"
              >
                {coinsMissingAccounts.map(coin => (
                  <p
                    key={coin.paymentCoin}
                    className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {t('admin.guestCheckout.missingAccountWarning', { coin: coin.paymentCoin })}
                  </p>
                ))}
              </div>
            )}
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
              <span className="text-sm text-muted-foreground">
                {t('admin.guestCheckout.minutes')}
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={cn(
                'rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors',
                saving ? 'bg-primary/50 cursor-not-allowed' : 'bg-primary hover:bg-primary/90'
              )}
            >
              {saving ? t('admin.guestCheckout.saving') : t('admin.guestCheckout.saveSettings')}
            </button>
          </div>

          {showPGPSection && (
            <div className="rounded-xl border border-border p-4 mt-4 space-y-3">
              <div>
                <p className="font-medium">
                  {t('admin.guestCheckout.pgpKeyTitle', {
                    defaultValue: '🔒 PGP Address Encryption',
                  })}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t('admin.guestCheckout.pgpKeyDescription', {
                    defaultValue:
                      'Upload your PGP public key so buyers can encrypt their shipping address before submitting. Your private key stays on your device and is used for decryption in the browser only.',
                  })}
                </p>
              </div>

              {pgpKey && (
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <span>✅</span>
                  <span>
                    {t('admin.guestCheckout.pgpKeyConfigured', {
                      defaultValue:
                        'PGP public key is configured. Buyers can encrypt their address.',
                    })}
                  </span>
                </div>
              )}

              <Textarea
                rows={6}
                placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----"
                value={pgpKeyDraft}
                onChange={e => setPgpKeyDraft(e.target.value)}
                className="font-mono text-xs"
                spellCheck={false}
              />

              {pgpError && <p className="text-xs text-destructive">{pgpError}</p>}
              {pgpSuccess && (
                <p className="text-xs text-green-700 dark:text-green-400">
                  {t('admin.guestCheckout.pgpKeySaved', { defaultValue: 'PGP key updated.' })}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSavePGPKey}
                  disabled={pgpSaving}
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
                    pgpSaving
                      ? 'bg-primary/50 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary/90'
                  )}
                >
                  {pgpKeyDraft.trim()
                    ? t('admin.guestCheckout.pgpKeySave', { defaultValue: 'Save PGP Key' })
                    : t('admin.guestCheckout.pgpKeyRemove', { defaultValue: 'Remove PGP Key' })}
                </button>
                {pgpKeyDraft !== pgpKey && (
                  <button
                    type="button"
                    onClick={() => setPgpKeyDraft(pgpKey)}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t('cancel', { defaultValue: 'Cancel' })}
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
