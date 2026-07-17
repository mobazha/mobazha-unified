// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n } from '@mobazha/core';
import { getMarketplaceEarnings } from '@mobazha/core/services/api/marketplace';
import type { MarketplaceEarnings } from '@mobazha/core/types/marketplace';
import { Coins } from 'lucide-react';

/**
 * Format an integer minor-unit amount string with its divisibility, trimming
 * trailing zeros ("1005" @2 -> "10.05", "1000" @2 -> "10").
 */
export function formatMinorUnits(amount: string, divisibility: number): string {
  const digitsOnly = /^\d+$/.test(amount) ? amount : '';
  if (!digitsOnly) return amount;
  if (divisibility <= 0) return digitsOnly;
  const padded = digitsOnly.padStart(divisibility + 1, '0');
  const whole = padded.slice(0, -divisibility);
  const frac = padded.slice(-divisibility).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
}

/**
 * Operator commission estimate ledger (V1). Amounts are estimates until the
 * settlement-layer payout leg verifies them — the copy says so explicitly.
 */
function formatBpsPercent(bps: number): string {
  return (bps / 100).toFixed(bps % 100 === 0 ? 0 : 2);
}

export function OperatorEarningsCard({
  marketplaceId,
  commissionBps,
  windowDays = 30,
}: {
  marketplaceId: string;
  /** Working-draft rate — shown only until the ledger reports the published one. */
  commissionBps: number;
  /** Same window the Performance card's selector governs, so the two commission
   * figures on the page can never disagree about their time span. */
  windowDays?: number;
}) {
  const { t } = useI18n();
  const [earnings, setEarnings] = useState<MarketplaceEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    void (async () => {
      try {
        const from = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
        const result = await getMarketplaceEarnings(marketplaceId, { from });
        if (!cancelled) setEarnings(result);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [marketplaceId, windowDays, reloadKey]);

  const retry = useCallback(() => setReloadKey(key => key + 1), []);
  // The ledger snapshots the PUBLISHED rate; showing the draft value next to
  // ledger rows would let the card contradict itself after an unpublished
  // Settings edit. Fall back to the prop only until the ledger answers.
  const publishedBps = earnings?.commissionBps ?? commissionBps;
  const ratePercent = formatBpsPercent(publishedBps);
  const draftDiffers = earnings != null && earnings.commissionBps !== commissionBps;

  return (
    <Card className="mt-6" data-testid="operator-earnings-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-4 w-4" />
          {t('marketplace.operator.earningsTitle', { defaultValue: 'Commission earnings' })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">
            {t('marketplace.operator.earningsCurrentRate', { defaultValue: 'Current rate' })}
          </span>
          <span data-testid="operator-earnings-rate">
            {ratePercent}%
            {draftDiffers ? (
              <span className="ml-2 text-xs text-muted-foreground">
                {t('marketplace.operator.earningsRatePendingPublish', {
                  defaultValue: `${formatBpsPercent(commissionBps)}% after next publish`,
                })}
              </span>
            ) : null}
          </span>
        </div>

        {loading ? (
          <p className="text-muted-foreground" data-testid="operator-earnings-loading">
            {t('marketplace.operator.earningsLoading', { defaultValue: 'Loading earnings…' })}
          </p>
        ) : failed ? (
          <div
            className="rounded-md border border-destructive/30 bg-destructive/5 p-3"
            data-testid="operator-earnings-error"
          >
            <p className="text-xs text-destructive">
              {t('marketplace.operator.earningsLoadFailed', {
                defaultValue: 'Could not load the earnings ledger.',
              })}
            </p>
            <Button size="sm" variant="outline" className="mt-2" onClick={retry}>
              {t('common.retry')}
            </Button>
          </div>
        ) : earnings && earnings.hasData ? (
          <div className="overflow-x-auto" data-testid="operator-earnings-totals">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 pr-3 font-normal">
                    {t('marketplace.operator.earningsCurrency', { defaultValue: 'Currency' })}
                  </th>
                  <th className="py-1 pr-3 font-normal">
                    {t('marketplace.operator.earningsOrders', { defaultValue: 'Orders' })}
                  </th>
                  <th className="py-1 pr-3 font-normal">
                    {t('marketplace.operator.earningsGross', { defaultValue: 'Gross' })}
                  </th>
                  <th className="py-1 font-normal">
                    {t('marketplace.operator.earningsCommission', { defaultValue: 'Commission' })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {earnings.totals.map(total => (
                  <tr
                    key={`${total.pricingCoin}-${total.status}`}
                    className="border-t border-border"
                  >
                    <td className="py-1.5 pr-3">{total.pricingCoin}</td>
                    <td className="py-1.5 pr-3">{total.orderCount}</td>
                    <td className="py-1.5 pr-3">
                      {formatMinorUnits(total.grossAmount, total.currencyDivisibility)}
                    </td>
                    <td className="py-1.5 font-medium">
                      {formatMinorUnits(total.commissionAmount, total.currencyDivisibility)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground" data-testid="operator-earnings-empty">
            {t('marketplace.operator.earningsEmpty', {
              defaultValue: 'No attributed orders in this window yet.',
            })}
          </p>
        )}

        <p className="text-xs text-muted-foreground" data-testid="operator-earnings-estimate-note">
          {t('marketplace.operator.earningsEstimateNote', {
            defaultValue:
              'Figures are estimates recorded at checkout and are confirmed at settlement. They are not a payable balance yet.',
          })}
        </p>
      </CardContent>
    </Card>
  );
}
