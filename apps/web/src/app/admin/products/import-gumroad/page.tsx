'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Info,
  Package,
} from 'lucide-react';
import { useI18n, gumroadImportApi } from '@mobazha/core';
import type { GumroadImportResponse, GumroadImportPreviewItem } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

// DG-1.9 — Gumroad Import Wizard
//
// Three-step flow:
//   1. Token  — paste Gumroad personal access token, click Preview
//   2. Review — see what will be imported / skipped, confirm or back out
//   3. Done   — import results + reminder to upload digital files
//
// We deliberately keep the UI plain — no fancy multi-page wizard with
// progress bars. The whole flow is on one page and we just swap the
// section that's shown. Fewer surprises that way.

type Step = 'token' | 'review' | 'done';

export default function ImportGumroadPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('token');
  const [accessToken, setAccessToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<GumroadImportResponse | null>(null);
  const [importResult, setImportResult] = useState<GumroadImportResponse | null>(null);

  const handlePreview = async () => {
    if (!accessToken.trim()) {
      setError(
        t('admin.gumroadImport.errors.tokenRequired', {
          defaultValue: 'Please paste your Gumroad access token first.',
        })
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await gumroadImportApi.previewGumroadImport({
        accessToken: accessToken.trim(),
        asDraft: true,
      });
      setPreview(res);
      setStep('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await gumroadImportApi.runGumroadImport({
        accessToken: accessToken.trim(),
        asDraft: true,
      });
      setImportResult(res);
      setStep('done');
      toast({
        title: t('admin.gumroadImport.toast.successTitle', {
          defaultValue: 'Import complete',
        }),
        description: t('admin.gumroadImport.toast.successDesc', {
          count: res.importedCount,
          defaultValue: 'Imported {{count}} listings as drafts.',
        }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    setStep('token');
    setPreview(null);
    setImportResult(null);
    setError(null);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">
      <div className="mb-6">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('admin.gumroadImport.backToProducts', { defaultValue: 'Back to Products' })}
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-3 flex items-center gap-2">
          <Download className="w-6 h-6 text-primary" />
          {t('admin.gumroadImport.title', { defaultValue: 'Import from Gumroad' })}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {t('admin.gumroadImport.subtitle', {
            defaultValue:
              'Bring your Gumroad catalog over as draft listings — review, attach digital files, then publish.',
          })}
        </p>
      </div>

      {step === 'token' && (
        <TokenStep
          accessToken={accessToken}
          onChange={setAccessToken}
          onSubmit={handlePreview}
          loading={loading}
          error={error}
        />
      )}

      {step === 'review' && preview && (
        <ReviewStep
          preview={preview}
          loading={loading}
          error={error}
          onBack={() => setStep('token')}
          onConfirm={handleConfirm}
        />
      )}

      {step === 'done' && importResult && (
        <DoneStep
          result={importResult}
          onStartOver={handleStartOver}
          onGoToProducts={() => router.push('/admin/products')}
        />
      )}
    </div>
  );
}

// ---------- Step 1: paste token ----------

interface TokenStepProps {
  accessToken: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
}

function TokenStep({ accessToken, onChange, onSubmit, loading, error }: TokenStepProps) {
  const { t } = useI18n();
  return (
    <div className="bg-card border border-border rounded-xl p-5 md:p-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="gumroad-token" className="text-sm font-medium">
            {t('admin.gumroadImport.tokenLabel', { defaultValue: 'Gumroad access token' })}
          </Label>
          <Input
            id="gumroad-token"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={accessToken}
            onChange={e => onChange(e.target.value)}
            placeholder="••••••••"
            className="mt-2"
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {t('admin.gumroadImport.tokenHint', {
              defaultValue:
                'We only use it for this import — nothing is stored. Generate a personal access token in Gumroad → Advanced.',
            })}
          </p>
          <a
            href="https://help.gumroad.com/article/280-creating-application-api"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
          >
            {t('admin.gumroadImport.tokenHelpLink', {
              defaultValue: 'How to create a Gumroad token',
            })}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="bg-muted/50 border border-border rounded-lg p-3 flex gap-2 text-xs text-muted-foreground">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <p>
              {t('admin.gumroadImport.scopeNote', {
                defaultValue:
                  'We import: title, description, price, tags, and the public thumbnail.',
              })}
            </p>
            <p>
              {t('admin.gumroadImport.fileNote', {
                defaultValue:
                  'Gumroad protects your downloadable files behind authenticated URLs we cannot fetch — you will re-upload each file to its draft listing before publishing.',
              })}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button onClick={onSubmit} disabled={loading || !accessToken.trim()}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('admin.gumroadImport.previewButton', { defaultValue: 'Preview Import' })}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------- Step 2: review ----------

interface ReviewStepProps {
  preview: GumroadImportResponse;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onConfirm: () => void;
}

function ReviewStep({ preview, loading, error, onBack, onConfirm }: ReviewStepProps) {
  const { t } = useI18n();
  const eligible = preview.items.filter(i => i.willImport);
  const skipped = preview.items.filter(i => !i.willImport);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard
          label={t('admin.gumroadImport.summary.fetched', { defaultValue: 'Fetched' })}
          value={preview.totalFetched}
        />
        <SummaryCard
          label={t('admin.gumroadImport.summary.eligible', { defaultValue: 'Will import' })}
          value={preview.eligibleCount}
          tone="success"
        />
        <SummaryCard
          label={t('admin.gumroadImport.summary.skipped', { defaultValue: 'Skipped' })}
          value={preview.skippedCount}
          tone="warning"
        />
      </div>

      {preview.warnings && preview.warnings.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-200 space-y-1">
          {preview.warnings.map((w, i) => (
            <div key={i} className="flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {eligible.length > 0 && (
        <ItemList
          title={t('admin.gumroadImport.review.eligibleTitle', {
            count: eligible.length,
            defaultValue: 'Will import ({{count}})',
          })}
          items={eligible}
        />
      )}

      {skipped.length > 0 && (
        <ItemList
          title={t('admin.gumroadImport.review.skippedTitle', {
            count: skipped.length,
            defaultValue: 'Skipped ({{count}})',
          })}
          items={skipped}
          showSkipReason
        />
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-2 justify-between pt-2">
        <Button variant="ghost" onClick={onBack} disabled={loading}>
          {t('common.back', { defaultValue: 'Back' })}
        </Button>
        <Button onClick={onConfirm} disabled={loading || eligible.length === 0}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {t('admin.gumroadImport.review.confirmButton', {
            count: eligible.length,
            defaultValue: 'Import {{count}} as drafts',
          })}
        </Button>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'success' | 'warning';
}) {
  const colorClass =
    tone === 'success'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'warning'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-foreground';
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${colorClass}`}>{value}</div>
    </div>
  );
}

function ItemList({
  title,
  items,
  showSkipReason = false,
}: {
  title: string;
  items: GumroadImportPreviewItem[];
  showSkipReason?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border text-sm font-medium text-foreground">
        {title}
      </div>
      <ul className="divide-y divide-border max-h-96 overflow-y-auto">
        {items.map(item => (
          <li key={item.externalId} className="px-4 py-3 flex gap-3 items-start">
            <div className="w-12 h-12 shrink-0 bg-muted rounded-md overflow-hidden flex items-center justify-center">
              {item.thumbnailUrl ? (
                <img
                  src={item.thumbnailUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{item.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {item.formattedPrice || `${item.priceMinor} ${item.currency}`}
              </div>
              {showSkipReason && item.skipReason && (
                <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  {item.skipReason}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Step 3: done ----------

interface DoneStepProps {
  result: GumroadImportResponse;
  onStartOver: () => void;
  onGoToProducts: () => void;
}

function DoneStep({ result, onStartOver, onGoToProducts }: DoneStepProps) {
  const { t } = useI18n();
  const r = result.importResult;
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-5 md:p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          {t('admin.gumroadImport.done.title', { defaultValue: 'Imported as drafts' })}
        </h2>
        {r ? (
          <p className="text-sm text-muted-foreground mt-2">
            {t('admin.gumroadImport.done.summary', {
              created: r.created,
              updated: r.updated,
              failed: r.failed,
              defaultValue: '{{created}} created, {{updated}} updated, {{failed}} failed.',
            })}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-2">
            {t('admin.gumroadImport.done.fallback', {
              count: result.importedCount,
              defaultValue: '{{count}} listings imported.',
            })}
          </p>
        )}
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-200">
        <div className="font-medium mb-1.5 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {t('admin.gumroadImport.done.fileReminderTitle', {
            defaultValue: 'Next: upload your digital files',
          })}
        </div>
        <p>{result.fileUploadReminder}</p>
      </div>

      {r && r.errors.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border text-sm font-medium text-foreground">
            {t('admin.gumroadImport.done.errorsTitle', { defaultValue: 'Errors' })}
          </div>
          <ul className="divide-y divide-border">
            {r.errors.map((e, i) => (
              <li key={i} className="px-4 py-3 text-sm">
                <div className="font-medium text-foreground">{e.title || `#${e.row}`}</div>
                <div className="text-xs text-destructive mt-0.5">{e.error}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2 justify-between pt-2">
        <Button variant="ghost" onClick={onStartOver}>
          {t('admin.gumroadImport.done.importMore', { defaultValue: 'Import another batch' })}
        </Button>
        <Button onClick={onGoToProducts}>
          {t('admin.gumroadImport.done.goToProducts', { defaultValue: 'Go to Products' })}
        </Button>
      </div>
    </div>
  );
}
