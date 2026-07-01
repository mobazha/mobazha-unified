'use client';

import React, { useMemo, useState } from 'react';
import { ExternalLink, ShieldCheck, AlertTriangle, Sparkles } from 'lucide-react';
import {
  PROCESSORS,
  calculateAll,
  comparisonHighlight,
  type ProcessorKey,
} from '@mobazha/core/data/digitalGoodsPricing';
import { useI18n } from '@mobazha/core';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

const PRICE_MIN = 1;
const PRICE_MAX = 500;
const SALES_MIN = 1;
const SALES_MAX = 1000;

function formatUsd(value: number, fractionDigits = 2): string {
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function DigitalCostCalculator() {
  const { t } = useI18n();
  const [unitPrice, setUnitPrice] = useState(50);
  const [monthlySales, setMonthlySales] = useState(50);
  const [processorKey, setProcessorKey] = useState<ProcessorKey>('stripe');

  const results = useMemo(
    () =>
      calculateAll({
        unitPriceUsd: unitPrice,
        monthlySales,
        processorKey,
      }),
    [unitPrice, monthlySales, processorKey]
  );

  // Sorted descending by net per month so the best deal is on top.
  const sortedResults = useMemo(
    () => [...results].sort((a, b) => b.netPerMonth - a.netPerMonth),
    [results]
  );

  const highlight = useMemo(() => comparisonHighlight(results), [results]);

  return (
    <div className="space-y-8">
      {/* ==== Inputs ==== */}
      <Card className="p-5 md:p-6">
        <h2 className="text-base md:text-lg font-semibold text-foreground mb-4">
          {t('costCalc.inputsTitle')}
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="cost-calc-price" className="text-sm font-medium text-foreground">
                {t('costCalc.unitPriceLabel')}
              </label>
              <Input
                id="cost-calc-price"
                type="number"
                min={PRICE_MIN}
                max={PRICE_MAX}
                step={1}
                value={unitPrice}
                onChange={e =>
                  setUnitPrice(clamp(parseFloat(e.target.value), PRICE_MIN, PRICE_MAX))
                }
                className="w-24 h-8 text-right"
                aria-label={t('costCalc.unitPriceLabel')}
              />
            </div>
            <Slider
              value={[unitPrice]}
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={1}
              onValueChange={([v]) => setUnitPrice(v)}
              data-testid="cost-calc-price-slider"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="cost-calc-sales" className="text-sm font-medium text-foreground">
                {t('costCalc.monthlySalesLabel')}
              </label>
              <Input
                id="cost-calc-sales"
                type="number"
                min={SALES_MIN}
                max={SALES_MAX}
                step={1}
                value={monthlySales}
                onChange={e =>
                  setMonthlySales(clamp(parseInt(e.target.value, 10), SALES_MIN, SALES_MAX))
                }
                className="w-24 h-8 text-right"
                aria-label={t('costCalc.monthlySalesLabel')}
              />
            </div>
            <Slider
              value={[monthlySales]}
              min={SALES_MIN}
              max={SALES_MAX}
              step={1}
              onValueChange={([v]) => setMonthlySales(v)}
              data-testid="cost-calc-sales-slider"
            />
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <label className="text-sm font-medium text-foreground block">
            {t('costCalc.processorLabel')}
          </label>
          <Tabs value={processorKey} onValueChange={v => setProcessorKey(v as ProcessorKey)}>
            <TabsList className="w-full md:w-auto">
              {Object.values(PROCESSORS).map(p => (
                <TabsTrigger
                  key={p.key}
                  value={p.key}
                  className="flex-1 md:flex-none"
                  data-testid={`cost-calc-processor-${p.key}`}
                >
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <p className="text-xs text-muted-foreground">{PROCESSORS[processorKey].note}</p>
        </div>
      </Card>

      {/* ==== Highlight strip ==== */}
      {highlight && highlight.monthlyDiff > 0 && (
        <div
          className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4"
          data-testid="cost-calc-highlight"
        >
          <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">
            {t('costCalc.highlightLine', {
              worst: highlight.worstCompetitor.platform.label,
              diff: formatUsd(highlight.monthlyDiff),
              best: highlight.best.platform.label,
            })}
          </p>
        </div>
      )}

      {/* ==== Results ==== */}
      <section>
        <h2 className="text-base md:text-lg font-semibold text-foreground mb-3">
          {t('costCalc.resultsTitle')}
        </h2>
        <div className="space-y-3">
          {sortedResults.map((r, idx) => {
            const isBest = idx === 0;
            return (
              <Card
                key={r.platform.key}
                className={`p-4 md:p-5 ${
                  r.platform.isMobazha
                    ? 'border-primary/40 bg-primary/5'
                    : isBest
                      ? 'border-emerald-500/40'
                      : ''
                }`}
                data-testid={`cost-calc-row-${r.platform.key}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm md:text-base font-semibold text-foreground">
                      {r.platform.label}
                    </h3>
                    {r.platform.isMor === true && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                        <ShieldCheck className="w-3 h-3" />
                        {t('costCalc.morBadge')}
                      </span>
                    )}
                    {r.platform.isMor === 'partial' && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300">
                        {t('costCalc.morPartial')}
                      </span>
                    )}
                    {r.platform.isMor === false && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-warning/10 text-warning">
                        <AlertTriangle className="w-3 h-3" />
                        {t('costCalc.youHandle')}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div
                      className="text-xl md:text-2xl font-bold tabular-nums text-foreground"
                      data-testid={`cost-calc-monthly-${r.platform.key}`}
                    >
                      {formatUsd(r.netPerMonth)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {t('costCalc.perMonth')}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>
                      {formatUsd(r.netPerSale)} {t('costCalc.perSale')}
                    </span>
                    <span>
                      {t('costCalc.feeRate')}: {formatPercent(r.effectiveFeeRate)}
                    </span>
                  </div>
                  <a
                    href={r.platform.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    {t('costCalc.sourceLink')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="mt-2 text-[11px] text-muted-foreground">
                  {t('costCalc.asOfNote', { date: r.platform.asOf })}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ==== Honest trade-off ==== */}
      <Card className="p-5 md:p-6 border-warning/30 bg-warning/5">
        <h2 className="text-base md:text-lg font-semibold text-foreground mb-2">
          {t('costCalc.honestyTitle')}
        </h2>
        <p className="text-sm text-foreground">{t('costCalc.honestyBody')}</p>
        <a
          href="/admin/settings/responsibilities"
          className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-primary hover:underline"
        >
          {t('costCalc.learnMoreResponsibilities')}
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </Card>

      {/* ==== Disclaimer ==== */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">{t('costCalc.disclaimerTitle')}</p>
        <p>{t('costCalc.disclaimerBody')}</p>
      </div>
    </div>
  );
}
