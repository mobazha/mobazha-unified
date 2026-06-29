'use client';

import React from 'react';
import Link from 'next/link';
import { useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HStack, VStack } from '@/components/layouts';
import {
  ArrowDown,
  ClipboardList,
  CreditCard,
  Eye,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
} from 'lucide-react';

export interface CollectibleMarketplaceSignalProps {
  sellHref: string;
  listingsSectionId: string;
}

export function CollectibleMarketplaceSignal({
  sellHref,
  listingsSectionId,
}: CollectibleMarketplaceSignalProps) {
  const { t } = useI18n();

  const buyerSteps = [
    { icon: Search, label: t('marketplace.detail.collectibles.buyerStepBrowse') },
    { icon: Eye, label: t('marketplace.detail.collectibles.buyerStepInspect') },
    { icon: CreditCard, label: t('marketplace.detail.collectibles.buyerStepOwn') },
    { icon: PackageCheck, label: t('marketplace.detail.collectibles.buyerStepRedeem') },
  ] as const;

  const sellerSteps = [
    { icon: Store, label: t('marketplace.detail.collectibles.sellerStepLogin') },
    { icon: ClipboardList, label: t('marketplace.detail.collectibles.sellerStepApply') },
    { icon: ShoppingBag, label: t('marketplace.detail.collectibles.sellerStepList') },
    { icon: PackageCheck, label: t('marketplace.detail.collectibles.sellerStepCustody') },
  ] as const;

  const trustItems = [
    t('marketplace.detail.collectibles.trustWhitelist'),
    t('marketplace.detail.collectibles.trustDisclaimer'),
    t('marketplace.detail.collectibles.trustCustody'),
  ];

  const scrollToListings = () => {
    const target = document.getElementById(listingsSectionId);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.focus({ preventScroll: true });
  };

  return (
    <section
      data-testid="collectible-marketplace-signal"
      className="mb-6 rounded-lg border border-border bg-muted/30 p-4 sm:p-5"
    >
      <VStack gap="md">
        <div>
          <HStack gap="sm" align="center" className="mb-2 flex-wrap">
            <Badge>{t('marketplace.detail.collectibles.badge')}</Badge>
          </HStack>
          <p className="text-sm text-muted-foreground sm:text-base">
            {t('marketplace.detail.collectibles.intro')}
          </p>
        </div>

        <HStack gap="sm" align="center" className="flex-wrap">
          <Button type="button" size="sm" onClick={scrollToListings}>
            <ArrowDown className="mr-2 h-4 w-4" aria-hidden />
            {t('marketplace.detail.collectibles.browseListingsCta')}
          </Button>
          <Button asChild variant="default" size="sm">
            <Link href={sellHref}>{t('marketplace.detail.collectibles.applySellerCta')}</Link>
          </Button>
        </HStack>

        <HStack gap="sm" align="center" className="flex-wrap text-sm">
          <Link
            href="/collectibles"
            className="font-medium text-primary hover:underline"
            data-testid="collectible-catalog-link"
          >
            {t('marketplace.detail.collectibles.catalogCta')}
          </Link>
          <span className="text-muted-foreground" aria-hidden>
            ·
          </span>
          <Link
            href="/collectibles/redemptions"
            className="font-medium text-primary hover:underline"
            data-testid="collectible-redemptions-link"
          >
            {t('marketplace.detail.collectibles.myCardsCta')}
          </Link>
        </HStack>

        <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              {t('marketplace.detail.collectibles.buyerPathTitle')}
            </h2>
            <ol className="space-y-3">
              {buyerSteps.map(({ icon: Icon, label }, index) => (
                <li key={label} className="flex items-start gap-3">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary"
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Icon className="mb-1 h-4 w-4 text-primary" aria-hidden />
                    <p className="text-sm text-foreground">{label}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              {t('marketplace.detail.collectibles.sellerPathTitle')}
            </h2>
            <ol className="space-y-3">
              {sellerSteps.map(({ icon: Icon, label }, index) => (
                <li key={label} className="flex items-start gap-3">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary"
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Icon className="mb-1 h-4 w-4 text-primary" aria-hidden />
                    <p className="text-sm text-foreground">{label}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              {t('marketplace.detail.collectibles.sellerCustodyNote')}
            </p>
          </div>
        </div>

        <div
          className="border-t border-border pt-4"
          data-testid="collectible-marketplace-trust"
        >
          <HStack gap="sm" align="center" className="mb-3">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
            <p className="text-xs font-medium text-muted-foreground">
              {t('marketplace.detail.trustSignals')}
            </p>
          </HStack>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {trustItems.map(item => (
              <li key={item} className="flex gap-2">
                <span aria-hidden className="text-primary">
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            {t('marketplace.detail.collectibles.poweredBy')}
          </p>
        </div>
      </VStack>
    </section>
  );
}
