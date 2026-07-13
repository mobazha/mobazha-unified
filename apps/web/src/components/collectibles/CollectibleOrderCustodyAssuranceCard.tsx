// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { AlertCircle, Package, Shield } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  resolveCollectibleOrderCustodyAssurance,
  useI18n,
  type CollectibleOrderCustodyAssurancePhase,
  type Order,
} from '@mobazha/core';

export interface CollectibleOrderCustodyAssuranceCardProps {
  orderId: string;
  coreOrder?: Order | null;
  enabled?: boolean;
  className?: string;
}

const PHASE_TITLE_KEYS: Record<CollectibleOrderCustodyAssurancePhase, string> = {
  invalid_binding: 'collectibles.custody.order.invalidTitle',
  cancelled_unpaid: 'collectibles.custody.order.cancelledUnpaidTitle',
  cancelled_paid: 'collectibles.custody.order.cancelledPaidTitle',
  pending_payment: 'collectibles.custody.order.pendingPaymentTitle',
  custody_active: 'collectibles.custody.order.activeTitle',
};

const PHASE_BODY_KEYS: Record<CollectibleOrderCustodyAssurancePhase, string> = {
  invalid_binding: 'collectibles.custody.order.invalidBody',
  cancelled_unpaid: 'collectibles.custody.order.cancelledUnpaidBody',
  cancelled_paid: 'collectibles.custody.order.cancelledPaidBody',
  pending_payment: 'collectibles.custody.order.pendingPaymentBody',
  custody_active: 'collectibles.custody.order.activeBody',
};

const CUSTODY_KIND_BADGE_KEYS = {
  source: 'collectibles.catalog.custody.sourceCustody',
  hub: 'collectibles.catalog.custody.inHub',
} as const;

export function CollectibleOrderCustodyAssuranceCard({
  coreOrder,
  enabled = true,
  className,
}: CollectibleOrderCustodyAssuranceCardProps) {
  const { t } = useI18n();
  const assurance = useMemo(() => resolveCollectibleOrderCustodyAssurance(coreOrder), [coreOrder]);

  if (!enabled || !assurance.visible) {
    return null;
  }

  const isInvalid = assurance.phase === 'invalid_binding';
  const isTerminalInactive =
    assurance.phase === 'cancelled_unpaid' || assurance.phase === 'cancelled_paid';
  const Icon = isInvalid ? AlertCircle : isTerminalInactive ? Package : Shield;
  const iconClass = isInvalid
    ? 'text-destructive'
    : isTerminalInactive
      ? 'text-muted-foreground'
      : 'text-primary';

  const technicalFields = [
    assurance.certNumber
      ? { label: t('collectibles.primarySale.certNumber'), value: assurance.certNumber }
      : null,
    assurance.hubSlotId ? { label: t('collectibles.hubSlot'), value: assurance.hubSlotId } : null,
    assurance.nftMint
      ? { label: t('collectibles.custody.order.technicalMint'), value: assurance.nftMint }
      : null,
  ].filter((entry): entry is { label: string; value: string } => entry !== null);

  const custodyBadgeKey =
    assurance.phase === 'custody_active' && assurance.custodyKind === 'source'
      ? CUSTODY_KIND_BADGE_KEYS.source
      : assurance.phase === 'custody_active' && assurance.custodyKind === 'hub'
        ? CUSTODY_KIND_BADGE_KEYS.hub
        : assurance.phase === 'custody_active'
          ? 'collectibles.custody.order.custodyBackedBadge'
          : null;

  return (
    <Card
      className={cn('p-4', isInvalid && 'border-destructive/30 bg-destructive/5', className)}
      data-testid="collectible-order-custody-assurance"
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', iconClass)} aria-hidden />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-foreground">
                {t(PHASE_TITLE_KEYS[assurance.phase])}
              </p>
              {custodyBadgeKey ? (
                <span
                  className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                  data-testid="collectible-order-custody-badge"
                >
                  {t(custodyBadgeKey)}
                </span>
              ) : null}
            </div>
            <p
              className={cn('text-xs', isInvalid ? 'text-destructive' : 'text-muted-foreground')}
              data-testid="collectible-order-custody-body"
            >
              {t(PHASE_BODY_KEYS[assurance.phase])}
            </p>
          </div>

          {assurance.phase === 'custody_active' && assurance.nftMint ? (
            <Button asChild variant="link" className="h-auto p-0 text-primary" size="sm">
              <Link
                href={`/collectibles/${encodeURIComponent(assurance.nftMint)}`}
                data-testid="collectible-order-custody-view-card"
              >
                {t('collectibles.custody.order.viewCardCta')}
              </Link>
            </Button>
          ) : null}

          {technicalFields.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="technical" className="border-0">
                <AccordionTrigger className="py-1 text-xs text-muted-foreground hover:no-underline">
                  {t('collectibles.custody.order.technicalDetails')}
                </AccordionTrigger>
                <AccordionContent>
                  <dl className="space-y-2 text-xs">
                    {technicalFields.map(field => (
                      <div key={field.label}>
                        <dt className="text-muted-foreground">{field.label}</dt>
                        <dd className="break-all font-medium text-foreground">{field.value}</dd>
                      </div>
                    ))}
                  </dl>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
