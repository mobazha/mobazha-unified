'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Copy,
  Check,
} from 'lucide-react';
import { useI18n, walletApi } from '@mobazha/core';
import { cn } from '@/lib/utils';

const BACKUP_DONE_KEY = 'mnemonicBackupCompleted';

function isBackupDone(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(BACKUP_DONE_KEY) === 'true';
  } catch {
    return false;
  }
}

type Step = 'banner' | 'reveal' | 'verify' | 'done';

export function MnemonicBackupBanner() {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(isBackupDone);
  const [step, setStep] = useState<Step>('banner');
  const [words, setWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const [blanks, setBlanks] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [verifyError, setVerifyError] = useState(false);

  const handleStart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const mnemonic = await walletApi.getMnemonic();
      if (!mnemonic) {
        setError(t('admin.backup.fetchError'));
        return;
      }
      setWords(mnemonic.split(' '));
      setStep('reveal');
    } catch {
      setError(t('admin.backup.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const selectedBlanks = useMemo(() => {
    if (words.length === 0) return [];
    const indices = Array.from({ length: words.length }, (_, i) => i);
    const shuffled = indices.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3).sort((a, b) => a - b);
  }, [words]);

  const startVerify = useCallback(() => {
    setBlanks(selectedBlanks);
    setAnswers({});
    setVerifyError(false);
    setStep('verify');
  }, [selectedBlanks]);

  const handleVerify = useCallback(() => {
    const correct = blanks.every(
      idx => answers[idx]?.trim().toLowerCase() === words[idx].toLowerCase()
    );
    if (correct) {
      try {
        localStorage.setItem(BACKUP_DONE_KEY, 'true');
      } catch {
        /* noop */
      }
      setWords([]);
      setBlanks([]);
      setAnswers({});
      setStep('done');
    } else {
      setVerifyError(true);
    }
  }, [blanks, answers, words]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(words.join(' '));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text for manual copy if clipboard API fails
    }
  }, [words]);

  useEffect(() => {
    if (step === 'done') {
      const timer = setTimeout(() => setDismissed(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  if (dismissed) return null;

  if (step === 'done') {
    return (
      <div className="mb-4 flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/20">
        <CheckCircle className="w-5 h-5 text-success shrink-0" />
        <p className="text-sm font-medium text-success">{t('admin.backup.doneTitle')}</p>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="mb-4 rounded-xl border bg-card p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">
          {t('admin.backup.verifyTitle')}
        </h3>
        <p className="text-xs text-muted-foreground mb-4">{t('admin.backup.verifyDesc')}</p>
        <div className="space-y-3 mb-4">
          {blanks.map(idx => (
            <div key={idx} className="flex items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground w-8 text-right shrink-0">
                #{idx + 1}
              </span>
              <input
                type="text"
                autoComplete="off"
                value={answers[idx] ?? ''}
                onChange={e => {
                  setVerifyError(false);
                  setAnswers(prev => ({ ...prev, [idx]: e.target.value }));
                }}
                className={cn(
                  'flex-1 h-9 px-3 rounded-lg text-sm font-mono',
                  'border bg-background',
                  'focus:outline-none focus:ring-2 focus:ring-primary/30',
                  verifyError
                    ? 'border-destructive focus:border-destructive focus:ring-destructive/30'
                    : 'border-border focus:border-primary'
                )}
                placeholder={t('admin.backup.wordPlaceholder', { n: String(idx + 1) })}
              />
            </div>
          ))}
        </div>
        {verifyError && (
          <p className="text-xs text-destructive mb-3 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {t('admin.backup.verifyFailed')}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStep('reveal')}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted/50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t('common.back', { defaultValue: 'Back' })}
          </button>
          <button
            type="button"
            onClick={handleVerify}
            disabled={blanks.some(idx => !answers[idx]?.trim())}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg',
              'bg-primary text-primary-foreground text-xs font-medium',
              'active:scale-[0.98] transition-all',
              blanks.some(idx => !answers[idx]?.trim()) && 'opacity-50 cursor-not-allowed'
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {t('admin.backup.verifyBtn')}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'reveal') {
    return (
      <div className="mb-4 rounded-xl border bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">{t('admin.backup.revealTitle')}</h3>
          <button
            type="button"
            onClick={() => {
              setStep('banner');
              setWords([]);
              setRevealed(false);
            }}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 mb-4">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-warning leading-relaxed">
            {t('admin.backup.securityWarning')}
          </p>
        </div>

        <div
          className={cn(
            'grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4 select-none',
            !revealed && 'blur-md pointer-events-none'
          )}
        >
          {words.map((word, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-muted/50 text-sm min-w-0"
            >
              <span className="text-[10px] font-mono text-muted-foreground w-5 text-right shrink-0">
                {i + 1}.
              </span>
              <span className="font-mono text-foreground truncate">{word}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          {!revealed ? (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg',
                'border border-border text-xs font-medium text-foreground',
                'hover:bg-muted/50 transition-colors'
              )}
            >
              <Eye className="w-3.5 h-3.5" />
              {t('admin.backup.reveal')}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setRevealed(false)}
                className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted/50"
              >
                <EyeOff className="w-3.5 h-3.5" />
                {t('admin.backup.hide')}
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted/50"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-success" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copied
                  ? t('common.copied', { defaultValue: 'Copied' })
                  : t('common.copy', { defaultValue: 'Copy' })}
              </button>
              <button
                type="button"
                onClick={startVerify}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg',
                  'bg-primary text-primary-foreground text-xs font-medium',
                  'active:scale-[0.98] transition-all'
                )}
              >
                {t('admin.backup.continueToVerify')}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
      <ShieldAlert className="w-5 h-5 text-warning shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{t('admin.backup.bannerTitle')}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{t('admin.backup.bannerDesc')}</p>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        <button
          type="button"
          onClick={handleStart}
          disabled={loading}
          className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-primary hover:underline"
        >
          {loading
            ? t('common.loading', { defaultValue: 'Loading...' })
            : t('admin.backup.startBackup')}
          {!loading && <ArrowRight className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
