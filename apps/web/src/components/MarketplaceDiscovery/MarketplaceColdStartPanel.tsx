'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/layouts';
import { useI18n, type MarketplaceSellerEntryMode } from '@mobazha/core';
import { PackageOpen, AlertTriangle, ShieldCheck } from 'lucide-react';

/**
 * Cold-start panel — shown ONLY when the marketplace loaded successfully and the
 * shelf is genuinely empty (WP-C). The CTA branches on sellerEntryMode: self-serve
 * points to the application flow; invite-only shows neutral copy and NO CTA (the
 * self-serve /sell flow would reject the buyer). See REMEDIATION_OPENING_UX §7.3.
 */
export function MarketplaceColdStartPanel({
  sellerEntryMode,
  sellHref,
}: {
  sellerEntryMode: MarketplaceSellerEntryMode;
  sellHref: string;
}) {
  const { t } = useI18n();
  const isSelfServe = sellerEntryMode === 'seller_self_serve';

  return (
    <section className="py-12 sm:py-16" data-testid="marketplace-cold-start">
      <Container size="sm" className="text-center space-y-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <PackageOpen className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">
            {t('marketplaceStarter.coldStart.inventoryPreparing', {
              defaultValue: 'Inventory is being prepared',
            })}
          </h2>
          <p className="text-muted-foreground">
            {t('marketplaceStarter.coldStart.subtitle', {
              defaultValue:
                'This marketplace is just getting started. Check back soon for listings.',
            })}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 text-left space-y-3">
          <p className="text-sm font-medium text-foreground">
            {t('marketplaceStarter.coldStart.howItWorksTitle', {
              defaultValue: 'How this marketplace works',
            })}
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {t('marketplaceStarter.coldStart.howItWorks1', {
                defaultValue: 'Every order stays with the seller you choose.',
              })}
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {t('marketplaceStarter.coldStart.howItWorks2', {
                defaultValue: 'Buyer protection and secure payments apply store by store.',
              })}
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {t('marketplaceStarter.coldStart.howItWorks3', {
                defaultValue: 'Sellers are reviewed before their products appear here.',
              })}
            </li>
          </ul>
        </div>

        {isSelfServe ? (
          <Button asChild>
            <Link href={sellHref} data-testid="marketplace-cold-start-sell-cta">
              {t('marketplaceStarter.coldStart.becomeSeller', {
                defaultValue: 'Apply to become a seller',
              })}
            </Link>
          </Button>
        ) : (
          <p
            className="text-sm text-muted-foreground"
            data-testid="marketplace-cold-start-invite-only"
          >
            {t('marketplaceStarter.coldStart.inviteOnly', {
              defaultValue: 'This marketplace onboards sellers by invitation.',
            })}
          </p>
        )}
      </Container>
    </section>
  );
}

/**
 * Degraded panel — shown when the shelf is empty because a feed/enrichment request
 * FAILED (not because it is genuinely empty). Offers a retry and never claims the
 * marketplace is "preparing inventory".
 */
export function MarketplaceDegradedPanel({ onRetry }: { onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <section className="py-12 sm:py-16" data-testid="marketplace-degraded">
      <Container size="sm" className="text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <AlertTriangle className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">
          {t('marketplaceStarter.degraded.title', {
            defaultValue: 'We could not load listings',
          })}
        </h2>
        <p className="text-muted-foreground">
          {t('marketplaceStarter.degraded.description', {
            defaultValue: 'Something went wrong loading this marketplace. Please try again.',
          })}
        </p>
        {onRetry ? (
          <Button onClick={onRetry} data-testid="marketplace-degraded-retry">
            {t('common.retry', { defaultValue: 'Retry' })}
          </Button>
        ) : null}
      </Container>
    </section>
  );
}

/** Light, non-blocking hint for `sparse` — products exist but no operator curation. */
export function MarketplaceSparseNotice() {
  const { t } = useI18n();
  return (
    <div className="border-b border-border bg-muted/30" data-testid="marketplace-sparse-notice">
      <Container size="xl" className="py-2">
        <p className="text-sm text-muted-foreground">
          {t('marketplaceStarter.sparse.notice', {
            defaultValue:
              'Showing available listings while this marketplace builds out its featured picks.',
          })}
        </p>
      </Container>
    </div>
  );
}
