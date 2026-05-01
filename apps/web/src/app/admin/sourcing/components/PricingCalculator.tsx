'use client';

import React, { useMemo } from 'react';
import { TrendingUp, DollarSign, Percent, Sparkles, Loader2 } from 'lucide-react';
import { useI18n } from '@mobazha/core';

interface PricingCalculatorProps {
  supplierCost: number;
  currency: string;
  markup: number;
  onMarkupChange: (value: number) => void;
  suggestedMarkup?: number;
  onRequestAiSuggestion?: () => void;
  aiLoading?: boolean;
}

const PRESET_MARKUPS = [30, 50, 75, 100, 150];
const MAX_MARKUP = 500;

export function PricingCalculator({
  supplierCost,
  currency,
  markup,
  onMarkupChange,
  suggestedMarkup,
  onRequestAiSuggestion,
  aiLoading,
}: PricingCalculatorProps) {
  const { t } = useI18n();

  const { retailPrice, profit, margin } = useMemo(() => {
    const retail = supplierCost * (1 + markup / 100);
    const prof = retail - supplierCost;
    const marg = retail > 0 ? (prof / retail) * 100 : 0;
    return { retailPrice: retail, profit: prof, margin: marg };
  }, [supplierCost, markup]);

  return (
    <div className="rounded-lg border p-5">
      <h3 className="font-medium mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        {t('admin.sourcing.pricingStrategy')}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Markup Controls */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('admin.sourcing.markupLabel')}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={MAX_MARKUP}
                value={Math.min(markup, MAX_MARKUP)}
                onChange={e => onMarkupChange(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={markup}
                  onChange={e =>
                    onMarkupChange(Math.max(0, Math.min(MAX_MARKUP, Number(e.target.value))))
                  }
                  min={0}
                  max={MAX_MARKUP}
                  className="w-16 px-2 py-1.5 rounded-md border bg-background text-sm text-right"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-1.5">
            {PRESET_MARKUPS.map(preset => (
              <button
                key={preset}
                onClick={() => onMarkupChange(preset)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  markup === preset
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-muted border-border'
                }`}
              >
                {preset}%
              </button>
            ))}
          </div>

          {/* AI Suggestion */}
          {onRequestAiSuggestion && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRequestAiSuggestion}
                disabled={aiLoading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md font-medium transition-all bg-muted hover:bg-muted/80 text-foreground disabled:opacity-50"
              >
                {aiLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                {t('admin.sourcing.smartPreset')}
              </button>
              {suggestedMarkup != null && (
                <button
                  type="button"
                  onClick={() => onMarkupChange(suggestedMarkup)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                >
                  {t('admin.sourcing.categoryRecommended')}: {suggestedMarkup}%
                </button>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">{t('admin.sourcing.markupHint')}</p>
        </div>

        {/* Profit Preview Panel */}
        <div className="space-y-3 p-4 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              {t('admin.sourcing.supplierCost')}
            </span>
            <span className="font-mono">
              {supplierCost.toFixed(2)} {currency}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              {t('admin.sourcing.retailPriceLabel')}
            </span>
            <span className="font-mono font-medium">
              {retailPrice.toFixed(2)} {currency}
            </span>
          </div>

          <div className="border-t pt-2.5 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                {t('admin.sourcing.yourProfit')}
              </span>
              <span className="font-mono font-medium text-green-600 dark:text-green-400">
                +{profit.toFixed(2)} {currency}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5" />
                {t('admin.sourcing.margin')}
              </span>
              <span className="font-mono text-muted-foreground">{margin.toFixed(1)}%</span>
            </div>
          </div>

          {/* Visual Margin Bar */}
          <div className="pt-1">
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-200"
                style={{ width: `${Math.min(margin, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
