'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@mobazha/core';
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Wallet,
  AlertTriangle,
} from 'lucide-react';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  getXMRBalance,
  piconeroToXMR,
  sweepAllXMR,
  withdrawXMR,
  xmrToPiconero,
  type MoneroBalance,
  type MoneroSweepAllResult,
  type MoneroWithdrawResult,
  type Piconero,
} from '@mobazha/core/services/api/monero';

/**
 * XMR Withdraw / Sweep page (Outpost only)
 *
 * Two flows on a single page:
 *   - Withdraw: single recipient, explicit XMR amount, optional priority.
 *   - Sweep all: empties the unlocked balance to a single address.
 *
 * Why one page instead of two routes:
 *   The forms share 80% of state (recipient, priority, accountIndex). A
 *   toggle keeps the muscle memory intact and matches how most Monero
 *   wallets present the same operation.
 *
 * The confirmation dialog is mandatory — Monero transfers are irreversible
 * and there is no chargeback. The dialog re-renders the destination,
 * amount, and fee estimate so the operator has one final visual check.
 *
 * Amounts in the form are XMR (decimal). On the wire we send piconero
 * strings — JS Number cannot safely hold balances over ~9007 XMR.
 */

type Mode = 'send' | 'sweep';

type PostResult =
  | { kind: 'send'; data: MoneroWithdrawResult; sentTo: string }
  | { kind: 'sweep'; data: MoneroSweepAllResult; sentTo: string };

// Priority 0 = wallet-rpc decides. 1..4 = increasing fee/confirmation speed.
// We intentionally do not expose 4 ("blink") — it's rarely useful on XMR
// and operators occasionally pick the highest option assuming faster is
// always better, which inflates fees unnecessarily.
const PRIORITY_OPTIONS = [
  { value: 0, label: 'priorityDefault' },
  { value: 1, label: 'priorityLow' },
  { value: 2, label: 'priorityMedium' },
  { value: 3, label: 'priorityHigh' },
] as const;

function NotOutpostPlaceholder() {
  const { t } = useI18n();
  return (
    <div>
      <SettingsPageHeader
        title={t('outpost.xmrWithdraw.title', { defaultValue: 'Withdraw Monero' })}
        backHref="/admin/finance"
      />
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {t('outpost.xmrWithdraw.notApplicable', {
            defaultValue: 'This page is only available on Outpost builds.',
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function shortenAddress(addr: string): string {
  if (addr.length <= 24) return addr;
  return `${addr.slice(0, 12)}…${addr.slice(-12)}`;
}

function BalanceCard({
  balance,
  loading,
  onRefresh,
}: {
  balance: MoneroBalance | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            {t('outpost.xmrWithdraw.balanceTitle', { defaultValue: 'Wallet balance' })}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading} type="button">
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
            )}
            {t('outpost.xmrWithdraw.refresh', { defaultValue: 'Refresh' })}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {balance ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('outpost.xmrWithdraw.unlockedBalance', { defaultValue: 'Available now' })}
              </p>
              <p className="text-2xl font-semibold tabular-nums">
                {piconeroToXMR(balance.unlockedBalance)}{' '}
                <span className="text-base font-normal text-muted-foreground">XMR</span>
              </p>
              {balance.blocksToUnlock != null && balance.blocksToUnlock > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {t('outpost.xmrWithdraw.blocksToUnlock', {
                    defaultValue: '~{{n}} blocks until next portion unlocks',
                    n: balance.blocksToUnlock,
                  })}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('admin.finance.walletTotalBalance', { defaultValue: 'Wallet total' })}
              </p>
              <p className="text-2xl font-semibold tabular-nums text-muted-foreground">
                {piconeroToXMR(balance.balance)} <span className="text-base font-normal">XMR</span>
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('admin.finance.walletTotalBalanceHint', {
                  defaultValue:
                    'Includes funds still confirming on-chain. Only "Available now" can be spent or withdrawn.',
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('outpost.xmrWithdraw.account', {
                  defaultValue: 'Account #{{n}}',
                  n: balance.accountIndex,
                })}
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="h-16 bg-muted animate-pulse rounded" />
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('outpost.xmrWithdraw.balanceUnavailable', {
              defaultValue: 'Balance unavailable — see the error message above.',
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SuccessCard({ result, onReset }: { result: PostResult; onReset: () => void }) {
  const { t } = useI18n();
  const { hashes, amounts, fees } = useMemo(() => {
    if (result.kind === 'send') {
      return {
        hashes: [result.data.txHash],
        amounts: [result.data.amount],
        fees: [result.data.fee],
      };
    }
    return {
      hashes: result.data.txHashes,
      amounts: result.data.amounts,
      fees: result.data.fees,
    };
  }, [result]);

  const totalSent = amounts.reduce(
    (acc, a) => (acc + BigInt(a || '0')).toString(),
    '0' as Piconero
  );
  const totalFee = fees.reduce((acc, f) => (acc + BigInt(f || '0')).toString(), '0' as Piconero);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <CheckCircle2 className="w-5 h-5" />
          {result.kind === 'send'
            ? t('outpost.xmrWithdraw.successSendTitle', { defaultValue: 'Transfer broadcast' })
            : t('outpost.xmrWithdraw.successSweepTitle', { defaultValue: 'Sweep broadcast' })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          {t('outpost.xmrWithdraw.successDesc', {
            defaultValue:
              'The transaction is propagating across the Monero network. It typically takes 10-20 minutes for the recipient to see the first confirmation.',
          })}
        </p>

        <div className="grid sm:grid-cols-2 gap-4 p-3 rounded-lg bg-muted/50">
          <div>
            <p className="text-xs text-muted-foreground">
              {t('outpost.xmrWithdraw.recipient', { defaultValue: 'Recipient' })}
            </p>
            <p className="text-xs font-mono break-all">{result.sentTo}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {t('outpost.xmrWithdraw.totalSent', { defaultValue: 'Total sent' })}
            </p>
            <p className="font-semibold tabular-nums">
              {piconeroToXMR(totalSent)}{' '}
              <span className="text-xs font-normal text-muted-foreground">XMR</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {t('outpost.xmrWithdraw.networkFeeLabel', { defaultValue: 'Network fee' })}:{' '}
              {piconeroToXMR(totalFee)} XMR
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {t('outpost.xmrWithdraw.txHashes', {
              defaultValue: 'Transaction hashes ({{n}})',
              n: hashes.length,
            })}
          </p>
          <ul className="space-y-1">
            {hashes.map((h, i) => (
              <li key={h} className="flex items-center gap-2 text-xs font-mono">
                <span className="text-muted-foreground tabular-nums w-6">{i + 1}.</span>
                <span className="break-all">{h}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            {t('outpost.xmrWithdraw.txHashNote', {
              defaultValue:
                'Keep these hashes for your records — they are the only proof of payment until the recipient confirms.',
            })}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Link
            to="/admin/finance"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t('outpost.xmrWithdraw.backToPayments', { defaultValue: 'Back to Funds' })}
          </Link>
          <Button variant="outline" size="sm" onClick={onReset} type="button">
            {t('outpost.xmrWithdraw.sendAnother', { defaultValue: 'Send another' })}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface FormState {
  address: string;
  amountXMR: string;
  priority: number;
  accountIndexRaw: string; // empty = use node default
}

const INITIAL_FORM: FormState = {
  address: '',
  amountXMR: '',
  priority: 0,
  accountIndexRaw: '',
};

// Loose client-side guard — full network-byte + checksum validation is
// performed by wallet-rpc on submit, so we only catch obvious typos here.
// We intentionally do NOT pin the leading char (mainnet 4/8 vs testnet
// 9/B vs stagenet 5/7) so a single build stays compatible with all
// three networks; backend ValidateAddress mirrors this looseness.
function isValidXMRAddress(addr: string): boolean {
  const trimmed = addr.trim();
  if (trimmed.length < 95 || trimmed.length > 110) return false;
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(trimmed);
}

export default function XMRWithdrawPage() {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('send');
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [balance, setBalance] = useState<MoneroBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PostResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const refreshBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const acct = form.accountIndexRaw.trim();
      const parsed = acct === '' ? null : Number(acct);
      const data = await getXMRBalance(parsed != null && Number.isFinite(parsed) ? parsed : null);
      setBalance(data);
      setError(null);
    } catch (err) {
      setBalance(null);
      setError(
        err instanceof Error
          ? err.message
          : t('outpost.xmrWithdraw.balanceError', { defaultValue: 'Failed to fetch balance' })
      );
    } finally {
      setBalanceLoading(false);
    }
  }, [form.accountIndexRaw, t]);

  useEffect(() => {
    if (!__OUTPOST__) return;
    refreshBalance();
  }, [refreshBalance]);

  const accountIndexNum = useMemo(() => {
    const raw = form.accountIndexRaw.trim();
    if (raw === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || Math.floor(n) !== n) return undefined; // invalid
    return n;
  }, [form.accountIndexRaw]);

  const validate = useCallback(
    (m: Mode, f: FormState): string | null => {
      const addr = f.address.trim();
      if (!addr) {
        return t('outpost.xmrWithdraw.errAddressRequired', {
          defaultValue: 'Recipient address is required',
        });
      }
      if (!isValidXMRAddress(addr)) {
        return t('outpost.xmrWithdraw.errAddressInvalid', {
          defaultValue: 'Recipient does not look like a valid Monero address',
        });
      }
      if (accountIndexNum === undefined) {
        return t('outpost.xmrWithdraw.errAccountIndex', {
          defaultValue: 'Account index must be a non-negative integer',
        });
      }
      if (m === 'send') {
        try {
          xmrToPiconero(f.amountXMR);
        } catch (e) {
          return e instanceof Error
            ? e.message
            : t('outpost.xmrWithdraw.errAmountInvalid', { defaultValue: 'Invalid amount' });
        }
      }
      return null;
    },
    [accountIndexNum, t]
  );

  const handleReview = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const v = validate(mode, form);
      if (v) {
        setValidationError(v);
        return;
      }
      setValidationError(null);
      setConfirmOpen(true);
    },
    [form, mode, validate]
  );

  const handleConfirm = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const acct =
        accountIndexNum === null || accountIndexNum === undefined ? undefined : accountIndexNum;
      if (mode === 'send') {
        const data = await withdrawXMR({
          address: form.address.trim(),
          amount: xmrToPiconero(form.amountXMR),
          priority: form.priority,
          accountIndex: acct,
        });
        setResult({ kind: 'send', data, sentTo: form.address.trim() });
      } else {
        const data = await sweepAllXMR({
          address: form.address.trim(),
          priority: form.priority,
          accountIndex: acct,
        });
        setResult({ kind: 'sweep', data, sentTo: form.address.trim() });
      }
      // Refresh balance after a successful broadcast so the page reflects
      // the new spendable amount.
      refreshBalance();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('outpost.xmrWithdraw.errSubmit', { defaultValue: 'Transfer failed' })
      );
    } finally {
      setSubmitting(false);
    }
  }, [accountIndexNum, form, mode, refreshBalance, t]);

  const handleReset = useCallback(() => {
    setResult(null);
    setForm(INITIAL_FORM);
    setError(null);
    setValidationError(null);
  }, []);

  if (!__OUTPOST__) {
    return <NotOutpostPlaceholder />;
  }

  if (result) {
    return (
      <div data-testid="admin-xmr-withdraw-success">
        <SettingsPageHeader
          title={t('outpost.xmrWithdraw.title', { defaultValue: 'Withdraw Monero' })}
          backHref="/admin/finance"
        />
        <SuccessCard result={result} onReset={handleReset} />
      </div>
    );
  }

  const sweepUnlocked = balance ? piconeroToXMR(balance.unlockedBalance) : '—';
  // Important wording: in send mode the fee is deducted ON TOP of `amount`,
  // so the user must leave headroom. The "Send all" shortcut intentionally
  // routes to sweep mode instead — sweep_all subtracts the fee from the
  // swept total automatically, which is the only way to empty the wallet.
  const networkFeeNote = t('outpost.xmrWithdraw.feeNote', {
    defaultValue:
      'Network fee is paid in XMR on top of this amount. To empty the wallet use "Send all" (switches to Sweep mode).',
  });

  return (
    <div data-testid="admin-xmr-withdraw">
      <SettingsPageHeader
        title={t('outpost.xmrWithdraw.title', { defaultValue: 'Withdraw Monero' })}
        description={t('outpost.xmrWithdraw.description', {
          defaultValue:
            'Send XMR from this outpost to another wallet. Monero transfers are irreversible — double-check the recipient.',
        })}
        backHref="/admin/finance"
      />

      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <BalanceCard balance={balance} loading={balanceLoading} onRefresh={refreshBalance} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5" />
              {t('outpost.xmrWithdraw.formTitle', { defaultValue: 'Transfer details' })}
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleReview}>
            <CardContent className="space-y-4">
              {/* Mode toggle */}
              <div className="inline-flex p-1 bg-muted rounded-lg" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'send'}
                  onClick={() => setMode('send')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    mode === 'send'
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('outpost.xmrWithdraw.modeSend', { defaultValue: 'Send amount' })}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'sweep'}
                  onClick={() => setMode('sweep')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    mode === 'sweep'
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('outpost.xmrWithdraw.modeSweep', { defaultValue: 'Sweep all' })}
                </button>
              </div>

              {/* Recipient */}
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="xmr-recipient">
                  {t('outpost.xmrWithdraw.addressLabel', { defaultValue: 'Recipient address' })}
                </label>
                <textarea
                  id="xmr-recipient"
                  value={form.address}
                  onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                  rows={2}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={t('outpost.xmrWithdraw.addressPlaceholder', {
                    defaultValue: '4... or 8... (standard or subaddress; 95-110 characters)',
                  })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background font-mono"
                />
              </div>

              {/* Amount (send mode) */}
              {mode === 'send' ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium" htmlFor="xmr-amount">
                      {t('outpost.xmrWithdraw.amountLabel', { defaultValue: 'Amount (XMR)' })}
                    </label>
                    {balance && (
                      <button
                        type="button"
                        // Routes "send everything" intent to sweep mode instead
                        // of pre-filling unlockedBalance — in send mode the
                        // network fee is deducted ON TOP of `amount`, so
                        // `amount = unlocked` is guaranteed to fail with
                        // "not enough money". sweep_all is the only correct
                        // way to empty the wallet (it subtracts the fee
                        // from the swept amount automatically).
                        onClick={() => {
                          setMode('sweep');
                          setForm(prev => ({ ...prev, amountXMR: '' }));
                          setValidationError(null);
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        {t('outpost.xmrWithdraw.sendAll', {
                          defaultValue: 'Send all ({{x}} XMR) →',
                          x: sweepUnlocked,
                        })}
                      </button>
                    )}
                  </div>
                  <input
                    id="xmr-amount"
                    type="text"
                    inputMode="decimal"
                    value={form.amountXMR}
                    onChange={e => setForm(prev => ({ ...prev, amountXMR: e.target.value }))}
                    autoComplete="off"
                    placeholder="0.000000000000"
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('outpost.xmrWithdraw.amountHelp', {
                      defaultValue: 'Decimal with up to 12 fractional digits. {{fee}}',
                      fee: networkFeeNote,
                    })}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm">
                  <p className="font-medium text-amber-900 dark:text-amber-200">
                    {t('outpost.xmrWithdraw.sweepWarningTitle', {
                      defaultValue: 'Sweep empties your unlocked balance',
                    })}
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                    {t('outpost.xmrWithdraw.sweepWarningBody', {
                      defaultValue:
                        'All {{x}} XMR of unlocked balance will be sent to the recipient minus network fees. Locked funds (if any) stay in the wallet.',
                      x: sweepUnlocked,
                    })}
                  </p>
                </div>
              )}

              {/* Priority */}
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="xmr-priority">
                  {t('outpost.xmrWithdraw.priorityLabel', { defaultValue: 'Priority' })}
                </label>
                <select
                  id="xmr-priority"
                  value={form.priority}
                  onChange={e => setForm(prev => ({ ...prev, priority: Number(e.target.value) }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                >
                  {PRIORITY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {t(`outpost.xmrWithdraw.${opt.label}`, {
                        defaultValue:
                          opt.label === 'priorityDefault'
                            ? 'Default (wallet decides)'
                            : opt.label === 'priorityLow'
                              ? 'Low (cheaper, slower)'
                              : opt.label === 'priorityMedium'
                                ? 'Medium'
                                : 'High (faster, costlier)',
                      })}
                    </option>
                  ))}
                </select>
              </div>

              {/* Advanced */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(v => !v)}
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                >
                  {showAdvanced
                    ? t('outpost.xmrWithdraw.hideAdvanced', { defaultValue: 'Hide advanced' })
                    : t('outpost.xmrWithdraw.showAdvanced', { defaultValue: 'Advanced options' })}
                </button>
                {showAdvanced && (
                  <div className="mt-2 space-y-1">
                    <label className="text-sm font-medium" htmlFor="xmr-account">
                      {t('outpost.xmrWithdraw.accountLabel', {
                        defaultValue: 'Account index (optional)',
                      })}
                    </label>
                    <input
                      id="xmr-account"
                      type="text"
                      inputMode="numeric"
                      value={form.accountIndexRaw}
                      onChange={e =>
                        setForm(prev => ({ ...prev, accountIndexRaw: e.target.value }))
                      }
                      placeholder={t('outpost.xmrWithdraw.accountPlaceholder', {
                        defaultValue: 'Leave empty to use the node default',
                      })}
                      className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('outpost.xmrWithdraw.accountHelp', {
                        defaultValue:
                          'Non-negative integer. Most operators leave this empty — the node is launched with --xmraccount.',
                      })}
                    </p>
                  </div>
                )}
              </div>

              {validationError && (
                <p className="text-sm text-destructive flex items-start gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{validationError}</span>
                </p>
              )}

              <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                  {mode === 'send'
                    ? t('outpost.xmrWithdraw.review', { defaultValue: 'Review and send' })
                    : t('outpost.xmrWithdraw.reviewSweep', {
                        defaultValue: 'Review and sweep',
                      })}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        variant="destructive"
        title={
          mode === 'send'
            ? t('outpost.xmrWithdraw.confirmSendTitle', {
                defaultValue: 'Confirm Monero transfer',
              })
            : t('outpost.xmrWithdraw.confirmSweepTitle', {
                defaultValue: 'Confirm sweep — empty unlocked balance',
              })
        }
        description={
          <div className="space-y-2 text-left">
            <p>
              {t('outpost.xmrWithdraw.confirmIrreversible', {
                defaultValue:
                  'Monero transfers cannot be reversed. Verify the recipient one more time.',
              })}
            </p>
            <div className="rounded-md bg-muted p-2 space-y-1 font-mono text-xs">
              <div>
                <span className="text-muted-foreground">
                  {t('outpost.xmrWithdraw.recipient', { defaultValue: 'Recipient' })}:{' '}
                </span>
                <span title={form.address.trim()}>{shortenAddress(form.address.trim())}</span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t('outpost.xmrWithdraw.amountLabel', { defaultValue: 'Amount (XMR)' })}:{' '}
                </span>
                <span>{mode === 'send' ? form.amountXMR : `≤ ${sweepUnlocked} (sweep)`}</span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t('outpost.xmrWithdraw.priorityLabel', { defaultValue: 'Priority' })}:{' '}
                </span>
                <span>{form.priority}</span>
              </div>
            </div>
          </div>
        }
        confirmLabel={
          mode === 'send'
            ? t('outpost.xmrWithdraw.confirmSend', { defaultValue: 'Send XMR' })
            : t('outpost.xmrWithdraw.confirmSweep', { defaultValue: 'Sweep wallet' })
        }
        cancelLabel={t('outpost.xmrWithdraw.cancel', { defaultValue: 'Cancel' })}
        onConfirm={handleConfirm}
        isLoading={submitting}
      />
    </div>
  );
}
