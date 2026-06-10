'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n, getAdminFinancePath } from '@mobazha/core';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  confirmXMRWalletBackup,
  createXMRWallet,
  getXMRWalletSetupStatus,
  restoreXMRWallet,
  type MoneroWalletSetupStatus,
} from '@mobazha/core/services/api/monero';

/**
 * XMR Wallet Setup Wizard (Outpost only) — OP-MP-2.5
 *
 * Flow:
 *   Step 0  Loading — fetch /v1/system/setup-wizard/xmr-wallet
 *   Step 1  Mode select   (create vs restore)
 *   Step 2a Display seed  (after create)        → Step 3
 *   Step 2b Enter seed    (restore)             → Step 4
 *   Step 3  Backup verify (type 3 random words) → Step 4
 *   Step 4  Done — show address + back link
 *
 * If status.exists is true on mount, the wizard refuses to run and
 * renders an "already provisioned" panel. This matches the server-side
 * ErrXMRWalletAlreadyExists safeguard (we never auto-clobber wallet
 * metadata on disk).
 */

type WizardStep =
  | { kind: 'loading' }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'already-provisioned'; status: MoneroWalletSetupStatus }
  | { kind: 'mode-select' }
  | {
      kind: 'display-seed';
      mnemonic: string;
      address: string;
      seedRevealed: boolean;
    }
  | {
      kind: 'verify-backup';
      mnemonic: string;
      address: string;
      challenges: VerifyChallenge[];
      answers: string[];
    }
  | { kind: 'restore-form' }
  | { kind: 'done'; address: string; via: 'create' | 'restore' };

interface VerifyChallenge {
  /** 1-based word index in the 25-word seed */
  index: number;
}

const SEED_WORD_COUNT = 25;
const VERIFY_CHALLENGE_COUNT = 3;

function chooseChallenges(): VerifyChallenge[] {
  // Three distinct word positions, avoiding word 1 (most-memorised) so the
  // verification actually tests the operator's backup rather than recency.
  const picks = new Set<number>();
  while (picks.size < VERIFY_CHALLENGE_COUNT) {
    const idx = 2 + Math.floor(Math.random() * (SEED_WORD_COUNT - 1));
    picks.add(idx);
  }
  return Array.from(picks)
    .sort((a, b) => a - b)
    .map(index => ({ index }));
}

function NotOutpostPlaceholder() {
  const { t } = useI18n();
  return (
    <div>
      <SettingsPageHeader
        title={t('outpost.xmrWallet.title', { defaultValue: 'Monero Wallet Setup' })}
        backHref={getAdminFinancePath()}
      />
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {t('outpost.xmrWallet.notApplicable', {
            defaultValue: 'This page is only available on Outpost builds.',
          })}
        </CardContent>
      </Card>
    </div>
  );
}

export default function XMRWalletSetupPage() {
  const { t } = useI18n();
  const [step, setStep] = useState<WizardStep>({ kind: 'loading' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [seedInput, setSeedInput] = useState('');
  const [restoreHeight, setRestoreHeight] = useState('');

  const refresh = useCallback(async () => {
    try {
      const status = await getXMRWalletSetupStatus();
      if (status.exists) {
        setStep({ kind: 'already-provisioned', status });
      } else {
        setStep({ kind: 'mode-select' });
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      setStep({ kind: 'unavailable', reason });
    }
  }, []);

  useEffect(() => {
    if (!__OUTPOST__) return;
    refresh();
  }, [refresh]);

  const handleCreate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await createXMRWallet();
      setStep({
        kind: 'display-seed',
        mnemonic: result.mnemonic,
        address: result.address,
        seedRevealed: false,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('outpost.xmrWallet.createError', { defaultValue: 'Failed to create wallet' })
      );
    } finally {
      setBusy(false);
    }
  }, [t]);

  const handleRestoreSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedSeed = seedInput.trim().replace(/\s+/g, ' ');
      const wordCount = trimmedSeed.split(' ').filter(Boolean).length;
      if (wordCount !== SEED_WORD_COUNT) {
        setError(
          t('outpost.xmrWallet.seedWordCountError', {
            defaultValue: 'Seed must be exactly {{n}} words (got {{got}})',
            n: SEED_WORD_COUNT,
            got: wordCount,
          })
        );
        return;
      }
      const heightNum = restoreHeight.trim() === '' ? 0 : Number(restoreHeight);
      if (!Number.isFinite(heightNum) || heightNum < 0 || !Number.isInteger(heightNum)) {
        setError(
          t('outpost.xmrWallet.restoreHeightError', {
            defaultValue: 'Restore height must be a non-negative integer (0 = full rescan)',
          })
        );
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const result = await restoreXMRWallet({
          seed: trimmedSeed,
          restoreHeight: heightNum,
        });
        setStep({ kind: 'done', address: result.address, via: 'restore' });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t('outpost.xmrWallet.restoreError', { defaultValue: 'Failed to restore wallet' })
        );
      } finally {
        setBusy(false);
      }
    },
    [seedInput, restoreHeight, t]
  );

  const handleProceedToVerify = useCallback(() => {
    if (step.kind !== 'display-seed') return;
    setStep({
      kind: 'verify-backup',
      mnemonic: step.mnemonic,
      address: step.address,
      challenges: chooseChallenges(),
      answers: Array(VERIFY_CHALLENGE_COUNT).fill(''),
    });
    setError(null);
  }, [step]);

  // handleMarkBackupVerified is the escape hatch for the "create + skip
  // verify" dead-end: an operator who closed the tab during the seed
  // display step lands on AlreadyProvisionedCard with backupConfirmed=false
  // and no way to re-enter the verify flow (server doesn't persist the
  // mnemonic). Trusting the operator's self-attestation here is the same
  // implicit promise the rest of the wizard makes — backupConfirmed gates
  // dashboard nags only, not functionality.
  const handleMarkBackupVerified = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await confirmXMRWalletBackup();
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('outpost.xmrWallet.confirmError', {
              defaultValue: 'Failed to confirm backup',
            })
      );
    } finally {
      setBusy(false);
    }
  }, [refresh, t]);

  const handleVerifySubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (step.kind !== 'verify-backup') return;
      const seedWords = step.mnemonic.trim().split(/\s+/);
      const correct = step.challenges.every((ch, i) => {
        const expected = seedWords[ch.index - 1]?.toLowerCase().trim() ?? '';
        const got = step.answers[i]?.toLowerCase().trim() ?? '';
        return expected !== '' && expected === got;
      });
      if (!correct) {
        setError(
          t('outpost.xmrWallet.verifyMismatch', {
            defaultValue: "One or more words don't match. Please double-check your backup.",
          })
        );
        return;
      }
      setBusy(true);
      setError(null);
      try {
        await confirmXMRWalletBackup();
        setStep({ kind: 'done', address: step.address, via: 'create' });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t('outpost.xmrWallet.confirmError', {
                defaultValue: 'Failed to confirm backup',
              })
        );
      } finally {
        setBusy(false);
      }
    },
    [step, t]
  );

  // Non-outpost build: render placeholder (no fetch).
  if (!__OUTPOST__) {
    return <NotOutpostPlaceholder />;
  }

  return (
    <div data-testid="admin-xmr-wallet-setup">
      <SettingsPageHeader
        title={t('outpost.xmrWallet.title', { defaultValue: 'Monero Wallet Setup' })}
        description={t('outpost.xmrWallet.description', {
          defaultValue:
            'Provision the Monero wallet that backs incoming XMR payments. You only run this once per outpost.',
        })}
        backHref={getAdminFinancePath()}
      />

      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {step.kind === 'loading' && (
          <Card>
            <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('outpost.xmrWallet.loading', { defaultValue: 'Checking wallet status…' })}
            </CardContent>
          </Card>
        )}

        {step.kind === 'unavailable' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                {t('outpost.xmrWallet.unavailableTitle', {
                  defaultValue: 'Wallet RPC not available',
                })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                {t('outpost.xmrWallet.unavailableDesc', {
                  defaultValue:
                    'monero-wallet-rpc is not configured or not reachable. Start the node with --xmrwalletrpc=http://127.0.0.1:18082/json_rpc and try again.',
                })}
              </p>
              <p className="text-xs text-muted-foreground font-mono">{step.reason}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={refresh}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  {t('outpost.xmrWallet.retry', { defaultValue: 'Retry' })}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step.kind === 'already-provisioned' && (
          <AlreadyProvisionedCard
            status={step.status}
            busy={busy}
            onMarkVerified={handleMarkBackupVerified}
          />
        )}

        {step.kind === 'mode-select' && (
          <ModeSelectCard
            onCreate={handleCreate}
            onRestore={() => {
              setStep({ kind: 'restore-form' });
              setError(null);
            }}
            busy={busy}
          />
        )}

        {step.kind === 'display-seed' && (
          <DisplaySeedCard
            mnemonic={step.mnemonic}
            address={step.address}
            revealed={step.seedRevealed}
            onToggleReveal={() => setStep({ ...step, seedRevealed: !step.seedRevealed })}
            onContinue={handleProceedToVerify}
            busy={busy}
          />
        )}

        {step.kind === 'verify-backup' && (
          <VerifyBackupCard
            challenges={step.challenges}
            answers={step.answers}
            onChangeAnswer={(i, v) => {
              const next = [...step.answers];
              next[i] = v;
              setStep({ ...step, answers: next });
              setError(null);
            }}
            onSubmit={handleVerifySubmit}
            busy={busy}
          />
        )}

        {step.kind === 'restore-form' && (
          <RestoreFormCard
            seed={seedInput}
            onSeedChange={setSeedInput}
            restoreHeight={restoreHeight}
            onRestoreHeightChange={setRestoreHeight}
            onSubmit={handleRestoreSubmit}
            onBack={() => {
              setStep({ kind: 'mode-select' });
              setError(null);
            }}
            busy={busy}
          />
        )}

        {step.kind === 'done' && <DoneCard address={step.address} via={step.via} />}
      </div>
    </div>
  );
}

function AlreadyProvisionedCard({
  status,
  busy,
  onMarkVerified,
}: {
  status: MoneroWalletSetupStatus;
  busy: boolean;
  onMarkVerified: () => void;
}) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <CheckCircle2 className="w-5 h-5" />
          {t('outpost.xmrWallet.alreadyProvisionedTitle', {
            defaultValue: 'Wallet already provisioned',
          })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          {t('outpost.xmrWallet.alreadyProvisionedDesc', {
            defaultValue:
              'Your Monero wallet is already set up. The setup wizard cannot be re-run from the UI to prevent accidental overwrite.',
          })}
        </p>
        {status.address && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
            <Wallet className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                {t('outpost.xmrWallet.primaryAddress', { defaultValue: 'Primary address' })}
              </p>
              <p className="text-xs font-mono break-all">{status.address}</p>
            </div>
          </div>
        )}
        {!status.walletOpen && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {t('outpost.xmrWallet.walletNotOpen', {
              defaultValue:
                'Wallet metadata exists on disk but wallet-rpc is not currently serving it. Restart the node to auto-open the wallet.',
            })}
          </p>
        )}
        {!status.backupConfirmed && (
          <div className="space-y-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {t('outpost.xmrWallet.backupNotConfirmed', {
                defaultValue:
                  "Seed backup has not been verified yet. If you've recorded your 25-word seed somewhere safe, mark the backup as verified to clear this reminder.",
              })}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onMarkVerified}
              disabled={busy}
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {t('outpost.xmrWallet.markVerified', {
                defaultValue: 'I have my backup — mark as verified',
              })}
            </Button>
          </div>
        )}
        <Link
          to={getAdminFinancePath()}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t('outpost.xmrWallet.backToPayments', { defaultValue: 'Back to Funds' })}
        </Link>
      </CardContent>
    </Card>
  );
}

function ModeSelectCard({
  onCreate,
  onRestore,
  busy,
}: {
  onCreate: () => void;
  onRestore: () => void;
  busy: boolean;
}) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          {t('outpost.xmrWallet.modeSelectTitle', { defaultValue: 'Set up your Monero wallet' })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('outpost.xmrWallet.modeSelectDesc', {
            defaultValue:
              'Choose whether to create a brand-new wallet or restore an existing one from a 25-word seed.',
          })}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCreate}
            disabled={busy}
            className="text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-muted/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2 mb-1">
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4 text-primary" />
              )}
              <span className="font-medium">
                {t('outpost.xmrWallet.modeCreate', { defaultValue: 'Create new wallet' })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('outpost.xmrWallet.modeCreateDesc', {
                defaultValue:
                  "Generates a fresh 25-word seed. You'll be shown the seed once for backup.",
              })}
            </p>
          </button>
          <button
            type="button"
            onClick={onRestore}
            disabled={busy}
            className="text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-muted/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2 mb-1">
              <RefreshCw className="w-4 h-4 text-primary" />
              <span className="font-medium">
                {t('outpost.xmrWallet.modeRestore', { defaultValue: 'Restore from seed' })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('outpost.xmrWallet.modeRestoreDesc', {
                defaultValue:
                  'Enter your existing 25-word seed. Optionally specify a restore height to skip earlier blocks.',
              })}
            </p>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function DisplaySeedCard({
  mnemonic,
  address,
  revealed,
  onToggleReveal,
  onContinue,
  busy,
}: {
  mnemonic: string;
  address: string;
  revealed: boolean;
  onToggleReveal: () => void;
  onContinue: () => void;
  busy: boolean;
}) {
  const { t } = useI18n();
  const words = useMemo(() => mnemonic.trim().split(/\s+/), [mnemonic]);

  // Note: no clipboard helper here on purpose. The seed grants spend
  // authority over every future deposit; writing it to the OS clipboard
  // exposes it to other apps, browser extensions, and remote-desktop
  // sync agents. The wizard text below explicitly tells the operator to
  // write it down on paper — we keep that promise.

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-5 h-5" />
          {t('outpost.xmrWallet.seedTitle', { defaultValue: 'Back up your seed now' })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            {t('outpost.xmrWallet.seedWarningTitle', {
              defaultValue: 'This seed will be shown only once',
            })}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-amber-900 dark:text-amber-300 list-disc pl-5">
            <li>
              {t('outpost.xmrWallet.seedWarning1', {
                defaultValue: 'Write it down on paper — do not store it digitally.',
              })}
            </li>
            <li>
              {t('outpost.xmrWallet.seedWarning2', {
                defaultValue: 'Anyone with this seed can spend your funds.',
              })}
            </li>
            <li>
              {t('outpost.xmrWallet.seedWarning3', {
                defaultValue: 'Losing this seed means losing access to your funds.',
              })}
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              {t('outpost.xmrWallet.seedLabel', { defaultValue: '25-word recovery seed' })}
            </label>
            <Button variant="ghost" size="sm" onClick={onToggleReveal} type="button">
              {revealed ? (
                <EyeOff className="w-3.5 h-3.5 mr-1" />
              ) : (
                <Eye className="w-3.5 h-3.5 mr-1" />
              )}
              {revealed
                ? t('outpost.xmrWallet.hide', { defaultValue: 'Hide' })
                : t('outpost.xmrWallet.reveal', { defaultValue: 'Reveal' })}
            </Button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 p-3 rounded-lg bg-muted/50 font-mono text-sm">
            {words.map((word, i) => (
              <div key={i} className="flex items-baseline gap-1">
                <span className="text-xs text-muted-foreground tabular-nums w-5">{i + 1}.</span>
                <span className={revealed ? '' : 'blur-sm select-none'}>
                  {revealed ? word : '••••'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1 p-3 rounded-lg bg-muted/50">
          <p className="text-xs font-medium text-muted-foreground">
            {t('outpost.xmrWallet.primaryAddress', { defaultValue: 'Primary address' })}
          </p>
          <p className="text-xs font-mono break-all">{address}</p>
        </div>

        <div className="flex justify-end">
          <Button onClick={onContinue} disabled={busy || !revealed} type="button">
            {t('outpost.xmrWallet.iveSavedIt', { defaultValue: "I've saved my seed" })}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function VerifyBackupCard({
  challenges,
  answers,
  onChangeAnswer,
  onSubmit,
  busy,
}: {
  challenges: VerifyChallenge[];
  answers: string[];
  onChangeAnswer: (i: number, v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  busy: boolean;
}) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          {t('outpost.xmrWallet.verifyTitle', { defaultValue: 'Verify your backup' })}
        </CardTitle>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('outpost.xmrWallet.verifyDesc', {
              defaultValue:
                "To confirm you've recorded the seed correctly, enter the following words from your backup.",
            })}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {challenges.map((ch, i) => (
              <div key={ch.index} className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('outpost.xmrWallet.wordN', {
                    defaultValue: 'Word #{{n}}',
                    n: ch.index,
                  })}
                </label>
                <input
                  type="text"
                  value={answers[i]}
                  onChange={e => onChangeAnswer(i, e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background font-mono"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={busy || answers.some(a => a.trim() === '')}>
              {busy && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {t('outpost.xmrWallet.verifyConfirm', { defaultValue: 'Confirm backup' })}
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}

function RestoreFormCard({
  seed,
  onSeedChange,
  restoreHeight,
  onRestoreHeightChange,
  onSubmit,
  onBack,
  busy,
}: {
  seed: string;
  onSeedChange: (v: string) => void;
  restoreHeight: string;
  onRestoreHeightChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  busy: boolean;
}) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          {t('outpost.xmrWallet.restoreTitle', {
            defaultValue: 'Restore wallet from seed',
          })}
        </CardTitle>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">
              {t('outpost.xmrWallet.seedInputLabel', {
                defaultValue: '25-word recovery seed (English)',
              })}
            </label>
            <textarea
              value={seed}
              onChange={e => onSeedChange(e.target.value)}
              rows={4}
              autoComplete="off"
              spellCheck={false}
              placeholder={t('outpost.xmrWallet.seedInputPlaceholder', {
                defaultValue: 'Paste or type the 25 words, separated by spaces',
              })}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {t('outpost.xmrWallet.seedInputHelp', {
                defaultValue:
                  'Whitespace is normalised. Only English (default Monero) wordlist is supported.',
              })}
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">
              {t('outpost.xmrWallet.restoreHeightLabel', {
                defaultValue: 'Restore height (optional)',
              })}
            </label>
            <input
              type="number"
              min={0}
              value={restoreHeight}
              onChange={e => onRestoreHeightChange(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {t('outpost.xmrWallet.restoreHeightHelp', {
                defaultValue:
                  "Block height to start scanning from. 0 = full rescan (slow). Use the height of your wallet's first transaction to speed up restore.",
              })}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" type="button" onClick={onBack} disabled={busy}>
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              {t('outpost.xmrWallet.back', { defaultValue: 'Back' })}
            </Button>
            <Button type="submit" disabled={busy || !seed.trim()}>
              {busy && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {t('outpost.xmrWallet.restoreSubmit', { defaultValue: 'Restore wallet' })}
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}

function DoneCard({ address, via }: { address: string; via: 'create' | 'restore' }) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <CheckCircle2 className="w-5 h-5" />
          {via === 'create'
            ? t('outpost.xmrWallet.doneCreateTitle', { defaultValue: 'Wallet created' })
            : t('outpost.xmrWallet.doneRestoreTitle', { defaultValue: 'Wallet restored' })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          {via === 'create'
            ? t('outpost.xmrWallet.doneCreateDesc', {
                defaultValue:
                  'Your Monero wallet is ready to accept payments. The wallet will auto-open on every node restart.',
              })
            : t('outpost.xmrWallet.doneRestoreDesc', {
                defaultValue:
                  'Your existing wallet has been restored. Scanning may take a while depending on the restore height.',
              })}
        </p>
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
          <Wallet className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              {t('outpost.xmrWallet.primaryAddress', { defaultValue: 'Primary address' })}
            </p>
            <p className="text-xs font-mono break-all">{address}</p>
          </div>
        </div>
        <Link
          to={getAdminFinancePath()}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t('outpost.xmrWallet.backToPayments', { defaultValue: 'Back to Funds' })}
        </Link>
      </CardContent>
    </Card>
  );
}
