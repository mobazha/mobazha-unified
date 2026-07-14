// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { useMemo } from 'react';
import {
  CHAINS,
  getChainById,
  getPaymentCoinDisplayLabel,
  getTokenByPaymentCoin,
  useI18n,
} from '@mobazha/core';
import { TokenIcon } from '@/components/Payment/TokenIcon';

export interface AffiliateRailChipItem {
  railID: string;
  /** Backend-provided display name; used when the rail is unknown locally. */
  railLabel?: string;
  guestSupport?: boolean;
}

interface RailChipView {
  railID: string;
  label: string;
  iconToken: string;
  guestSupport: boolean;
  isNative: boolean;
}

interface ChainGroupView {
  chainID: string | null;
  chainLabel: string | null;
  rails: RailChipView[];
}

/**
 * Settlement rails grouped by chain. Rails are one per chain × asset, so the
 * same stablecoin legitimately exists once per chain — grouping under a chain
 * header keeps that from reading as duplicate entries.
 */
export function AffiliateRailChips({ rails }: { rails: AffiliateRailChipItem[] }) {
  const { t } = useI18n();

  const groups = useMemo((): ChainGroupView[] => {
    const byChain = new Map<string | null, RailChipView[]>();
    for (const rail of rails) {
      const token = getTokenByPaymentCoin(rail.railID);
      const chainID = token?.chain ?? null;
      const view: RailChipView = {
        railID: rail.railID,
        label: token?.token ?? rail.railLabel ?? getPaymentCoinDisplayLabel(rail.railID),
        iconToken: token?.id ?? rail.railID,
        guestSupport: rail.guestSupport === true,
        isNative: token?.isNative === true,
      };
      const bucket = byChain.get(chainID);
      if (bucket) bucket.push(view);
      else byChain.set(chainID, [view]);
    }
    const chainOrder = (chainID: string | null): number => {
      if (chainID === null) return Number.MAX_SAFE_INTEGER;
      const index = CHAINS.findIndex(chain => chain.id === chainID);
      return index === -1 ? Number.MAX_SAFE_INTEGER - 1 : index;
    };
    return [...byChain.entries()]
      .sort(([a], [b]) => chainOrder(a) - chainOrder(b))
      .map(([chainID, chainRails]) => ({
        chainID,
        chainLabel: chainID ? (getChainById(chainID)?.name ?? chainID) : null,
        rails: chainRails.sort((a, b) => {
          if (a.isNative !== b.isNative) return a.isNative ? -1 : 1;
          return a.label.localeCompare(b.label);
        }),
      }));
  }, [rails]);

  if (!groups.length) return null;

  return (
    <div className="space-y-2">
      {groups.map(group => (
        <div
          key={group.chainID ?? 'other'}
          className="flex flex-wrap items-center gap-x-3 gap-y-1.5"
          data-testid="affiliate-rail-chain-group"
        >
          <span className="inline-flex w-24 shrink-0 items-center gap-1.5 text-xs font-medium text-foreground">
            {group.chainID ? <TokenIcon token={group.chainID} size={16} /> : null}
            {group.chainLabel ?? t('sellerAffiliate.railChainOther')}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {group.rails.map(rail => (
              <span
                key={rail.railID}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
              >
                <TokenIcon token={rail.iconToken} size={14} />
                {rail.label}
                {rail.guestSupport ? ` · ${t('sellerAffiliate.guestSupported')}` : ''}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
