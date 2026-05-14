'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@mobazha/core';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getXMRMnemonic,
  getXMRViewOnlyKeys,
  type MoneroMnemonicResult,
  type MoneroViewOnlyKeysResult,
} from '@mobazha/core/services/api/monero';

/**
 * XMR Secrets export (Outpost only) — OP-MP-6
 *
 * Two independent panels on one page so the operator can self-serve both
 * "back up the wallet" and "hand a view-only copy to a bookkeeper" flows
 * without having to dig through the CLI:
 *
 *   1. Mnemonic — 25-word seed. Spend authority. Reveal-only, no copy
 *      helper, mirrors the seed display in the setup wizard so muscle
 *      memory transfers.
 *   2. View-only keys — primary address + private view key + restore
 *      height. Half-private: leak gives full audit visibility but no
 *      ability to spend. Reveal + copy are both allowed because the
 *      bookkeeper has to paste these into another wallet.
 *
 * Both panels fetch lazily on user gesture. Nothing is requested
 * up-front and nothing is cached client-side once hidden — the next
 * reveal hits the wallet-rpc again. This way "Hide" actually deletes
 * the secret from React state, not just visually masks it.
 *
 * The backend is gated by adminOnlyAuthSecurity (no API tokens) and
 * sends Cache-Control: no-store on every response.
 */

const SEED_WORD_COUNT = 25;

function NotOutpostPlaceholder() {
  const { t } = useI18n();
  return (
    <div>
      <SettingsPageHeader
        title={t('outpost.xmrSecrets.title', { defaultValue: 'Monero Wallet Secrets' })}
        backHref="/admin/settings/payments"
      />
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {t('outpost.xmrSecrets.notApplicable', {
            defaultValue: 'This page is only available on Outpost builds.',
          })}
        </CardContent>
      </Card>
    </div>
  );
}

export default function XMRSecretsPage() {
  const { t } = useI18n();

  if (!__OUTPOST__) {
    return <NotOutpostPlaceholder />;
  }

  return (
    <div data-testid="admin-xmr-secrets" className="space-y-6">
      <SettingsPageHeader
        title={t('outpost.xmrSecrets.title', { defaultValue: 'Monero Wallet Secrets' })}
        description={t('outpost.xmrSecrets.description', {
          defaultValue:
            'Export your seed for offline backup, or share view-only keys with a trusted bookkeeper. Both panels reveal data on demand and never persist anything in your browser.',
        })}
        backHref="/admin/settings/payments"
      />

      <MnemonicPanel />
      <ViewOnlyPanel />

      <Link
        to="/admin/settings/payments"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t('outpost.xmrSecrets.backToPayments', { defaultValue: 'Back to payment settings' })}
      </Link>
    </div>
  );
}

// =====================================================================
// Mnemonic panel
// =====================================================================

function MnemonicPanel() {
  const { t } = useI18n();
  const [data, setData] = useState<MoneroMnemonicResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReveal = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await getXMRMnemonic();
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('outpost.xmrSecrets.mnemonicFetchError', {
              defaultValue: 'Failed to fetch mnemonic',
            })
      );
    } finally {
      setBusy(false);
    }
  }, [t]);

  // "Hide" actually drops the secret from state — not just visually
  // masking it — so screenshots, react devtools, and component re-renders
  // can't leak the value once the operator has stepped away.
  const handleHide = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  const revealed = data !== null;

  return (
    <Card data-testid="xmr-mnemonic-panel">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              {t('outpost.xmrSecrets.mnemonicTitle', {
                defaultValue: '25-word recovery seed',
              })}
            </CardTitle>
            <CardDescription className="mt-1">
              {t('outpost.xmrSecrets.mnemonicDesc', {
                defaultValue:
                  'The full deterministic seed for this wallet. Anyone with these 25 words can spend every coin in it, now or in the future.',
              })}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <p className="flex items-center gap-2 font-medium text-destructive">
            <AlertTriangle className="w-4 h-4" />
            {t('outpost.xmrSecrets.mnemonicWarningTitle', {
              defaultValue: 'Spend authority — keep offline',
            })}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-destructive/90 list-disc pl-5">
            <li>
              {t('outpost.xmrSecrets.mnemonicWarning1', {
                defaultValue: 'Write it down on paper. Do not paste it into any digital tool.',
              })}
            </li>
            <li>
              {t('outpost.xmrSecrets.mnemonicWarning2', {
                defaultValue:
                  'No copy button on purpose — clipboard sync, browser extensions, and screen-share apps can capture it.',
              })}
            </li>
            <li>
              {t('outpost.xmrSecrets.mnemonicWarning3', {
                defaultValue: 'Check that nobody is shoulder-surfing before revealing.',
              })}
            </li>
          </ul>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {!revealed ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {t('outpost.xmrSecrets.mnemonicHiddenHint', {
                defaultValue:
                  'The seed is hidden by default. It is fetched fresh from your wallet when you reveal it.',
              })}
            </p>
            <Button
              type="button"
              variant="destructive"
              onClick={handleReveal}
              disabled={busy}
              data-testid="xmr-mnemonic-reveal"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Eye className="w-4 h-4 mr-1" />
              )}
              {t('outpost.xmrSecrets.revealSeed', { defaultValue: 'Reveal seed' })}
            </Button>
          </div>
        ) : (
          <RevealedMnemonic data={data} onHide={handleHide} />
        )}
      </CardContent>
    </Card>
  );
}

function RevealedMnemonic({ data, onHide }: { data: MoneroMnemonicResult; onHide: () => void }) {
  const { t } = useI18n();
  const words = useMemo(() => data.mnemonic.trim().split(/\s+/), [data.mnemonic]);
  const wordCountMismatch = words.length !== SEED_WORD_COUNT;

  return (
    <div className="space-y-3" data-testid="xmr-mnemonic-revealed">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {t('outpost.xmrSecrets.seedShown', { defaultValue: 'Seed shown — copy it offline' })}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onHide}
          data-testid="xmr-mnemonic-hide"
        >
          <EyeOff className="w-3.5 h-3.5 mr-1" />
          {t('outpost.xmrSecrets.hide', { defaultValue: 'Hide' })}
        </Button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 p-3 rounded-lg bg-muted/50 font-mono text-sm">
        {words.map((word, i) => (
          <div key={i} className="flex items-baseline gap-1">
            <span className="text-xs text-muted-foreground tabular-nums w-5">{i + 1}.</span>
            <span>{word}</span>
          </div>
        ))}
      </div>

      {wordCountMismatch && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {t('outpost.xmrSecrets.mnemonicCountWarning', {
            defaultValue:
              'Wallet returned {{got}} words instead of the expected {{n}}. Verify your wallet integrity.',
            got: words.length,
            n: SEED_WORD_COUNT,
          })}
        </p>
      )}

      {data.address && (
        <div className="space-y-1 p-3 rounded-lg bg-muted/50">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" />
            {t('outpost.xmrSecrets.primaryAddressLabel', { defaultValue: 'Primary address' })}
          </p>
          <p className="text-xs font-mono break-all">{data.address}</p>
        </div>
      )}

      {data.createdAt ? (
        <p className="text-xs text-muted-foreground">
          {t('outpost.xmrSecrets.createdAt', {
            defaultValue: 'Wallet created on {{date}}',
            date: new Date(data.createdAt * 1000).toLocaleString(),
          })}
        </p>
      ) : null}
    </div>
  );
}

// =====================================================================
// View-only keys panel
// =====================================================================

function ViewOnlyPanel() {
  const { t } = useI18n();
  const [data, setData] = useState<MoneroViewOnlyKeysResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReveal = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await getXMRViewOnlyKeys();
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('outpost.xmrSecrets.viewOnlyFetchError', {
              defaultValue: 'Failed to fetch view-only keys',
            })
      );
    } finally {
      setBusy(false);
    }
  }, [t]);

  const handleRefresh = useCallback(async () => {
    // Same as reveal but does not toggle the visibility state — used
    // when the operator wants the latest currentHeight without a
    // hide/reveal round trip.
    await handleReveal();
  }, [handleReveal]);

  const handleHide = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  const revealed = data !== null;

  return (
    <Card data-testid="xmr-view-only-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" />
          {t('outpost.xmrSecrets.viewOnlyTitle', { defaultValue: 'View-only keys' })}
        </CardTitle>
        <CardDescription className="mt-1">
          {t('outpost.xmrSecrets.viewOnlyDesc', {
            defaultValue:
              'Hand these three values to a trusted bookkeeper to give them read-only access to every payment. They will not be able to spend any funds.',
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <p className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4" />
            {t('outpost.xmrSecrets.viewOnlyWarningTitle', {
              defaultValue: 'Half-private — share only with trusted parties',
            })}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-amber-900 dark:text-amber-300 list-disc pl-5">
            <li>
              {t('outpost.xmrSecrets.viewOnlyWarning1', {
                defaultValue:
                  'A leaked view key permanently de-anonymises every past and future incoming payment.',
              })}
            </li>
            <li>
              {t('outpost.xmrSecrets.viewOnlyWarning2', {
                defaultValue:
                  'Funds remain safe — view keys cannot sign transactions, only see them.',
              })}
            </li>
          </ul>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {!revealed ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {t('outpost.xmrSecrets.viewOnlyHiddenHint', {
                defaultValue: 'Keys are fetched fresh from your wallet when you reveal them.',
              })}
            </p>
            <Button
              type="button"
              onClick={handleReveal}
              disabled={busy}
              data-testid="xmr-view-only-reveal"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Eye className="w-4 h-4 mr-1" />
              )}
              {t('outpost.xmrSecrets.revealKeys', { defaultValue: 'Reveal keys' })}
            </Button>
          </div>
        ) : (
          <RevealedViewOnly data={data} busy={busy} onHide={handleHide} onRefresh={handleRefresh} />
        )}
      </CardContent>
    </Card>
  );
}

function RevealedViewOnly({
  data,
  busy,
  onHide,
  onRefresh,
}: {
  data: MoneroViewOnlyKeysResult;
  busy: boolean;
  onHide: () => void;
  onRefresh: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="space-y-3" data-testid="xmr-view-only-revealed">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" />
          {t('outpost.xmrSecrets.viewOnlyShown', {
            defaultValue: 'Keys shown — copy each value into your bookkeeper wallet',
          })}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={busy}
            data-testid="xmr-view-only-refresh"
          >
            {busy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
            )}
            {t('outpost.xmrSecrets.refreshHeight', { defaultValue: 'Refresh height' })}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onHide}
            data-testid="xmr-view-only-hide"
          >
            <EyeOff className="w-3.5 h-3.5 mr-1" />
            {t('outpost.xmrSecrets.hide', { defaultValue: 'Hide' })}
          </Button>
        </div>
      </div>

      <KeyRow
        label={t('outpost.xmrSecrets.primaryAddressLabel', { defaultValue: 'Primary address' })}
        value={data.primaryAddress}
        testId="xmr-view-only-address"
      />
      <KeyRow
        label={t('outpost.xmrSecrets.privateViewKeyLabel', {
          defaultValue: 'Private view key',
        })}
        value={data.privateViewKey}
        testId="xmr-view-only-viewkey"
        secret
      />
      <KeyRow
        label={t('outpost.xmrSecrets.restoreHeightLabel', { defaultValue: 'Restore height' })}
        value={String(data.restoreHeight)}
        hint={
          data.restoreHeight === 0
            ? t('outpost.xmrSecrets.restoreHeightZeroHint', {
                defaultValue: '0 = full rescan (slow). Recipient may take hours to catch up.',
              })
            : undefined
        }
        testId="xmr-view-only-restore-height"
      />

      <div className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/30">
        {t('outpost.xmrSecrets.currentHeightFooter', {
          defaultValue:
            'Your wallet is currently scanned to block {{h}}. The bookkeeper will see every confirmed payment up to this height.',
          h: data.currentHeight.toLocaleString(),
        })}
      </div>
    </div>
  );
}

function KeyRow({
  label,
  value,
  hint,
  secret,
  testId,
}: {
  label: string;
  value: string;
  hint?: string;
  secret?: boolean;
  testId?: string;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can reject (insecure context, permission denied
      // in some browsers). Silently swallow — the user can still
      // select-all + copy manually from the visible text.
    }
  }, [value]);

  return (
    <div
      className={`p-3 rounded-lg border ${
        secret ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-muted/30'
      }`}
      data-testid={testId}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 px-2"
          aria-label={t('outpost.xmrSecrets.copyValue', {
            defaultValue: 'Copy {{label}}',
            label,
          })}
        >
          <Copy className="w-3 h-3 mr-1" />
          {copied
            ? t('outpost.xmrSecrets.copied', { defaultValue: 'Copied' })
            : t('outpost.xmrSecrets.copy', { defaultValue: 'Copy' })}
        </Button>
      </div>
      <p className="text-xs font-mono break-all">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
