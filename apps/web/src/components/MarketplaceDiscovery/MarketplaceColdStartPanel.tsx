'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Container } from '@/components/layouts';
import { useI18n, type MarketplaceSellerEntryMode } from '@mobazha/core';
import { submitMarketplaceInterestSignup } from '@mobazha/core/services/api/marketplace';
import { PackageOpen, AlertTriangle, ShieldCheck, BellRing } from 'lucide-react';

/**
 * Demand capture for a pre-inventory marketplace: "notify me when it opens".
 * Banked signups reach the operator's dashboard, so cold-start traffic is not
 * simply lost.
 */
function MarketplaceInterestForm({ marketplaceIdentifier }: { marketplaceIdentifier: string }) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const submit = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed || state === 'sending') return;
    setState('sending');
    try {
      await submitMarketplaceInterestSignup(marketplaceIdentifier, trimmed, 'cold_start');
      setState('done');
    } catch {
      setState('error');
    }
  }, [email, marketplaceIdentifier, state]);

  if (state === 'done') {
    return (
      <p className="text-sm text-muted-foreground" data-testid="marketplace-interest-done">
        {t('marketplaceStarter.coldStart.notifyDone', {
          defaultValue: "You're on the list — we'll let you know when this market opens.",
        })}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-sm space-y-2" data-testid="marketplace-interest-form">
      <div className="flex items-center gap-2">
        <Input
          type="email"
          inputMode="email"
          placeholder={t('marketplaceStarter.coldStart.notifyPlaceholder', {
            defaultValue: 'you@example.com',
          })}
          value={email}
          onChange={event => {
            setEmail(event.target.value);
            if (state === 'error') setState('idle');
          }}
          data-testid="marketplace-interest-email"
        />
        <Button
          variant="outline"
          onClick={() => void submit()}
          disabled={state === 'sending' || !email.trim()}
          data-testid="marketplace-interest-submit"
        >
          <BellRing className="mr-2 h-4 w-4" />
          {t('marketplaceStarter.coldStart.notifyCta', { defaultValue: 'Notify me' })}
        </Button>
      </div>
      {state === 'error' ? (
        <p className="text-xs text-destructive" data-testid="marketplace-interest-error">
          {t('marketplaceStarter.coldStart.notifyFailed', {
            defaultValue: 'That did not work — check the address and try again.',
          })}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t('marketplaceStarter.coldStart.notifyHint', {
            defaultValue: 'Get one email when products go live. No spam.',
          })}
        </p>
      )}
    </div>
  );
}

/**
 * Cold-start panel — shown ONLY when the marketplace loaded successfully and the
 * shelf is genuinely empty (WP-C). The CTA branches on sellerEntryMode: self-serve
 * points to the application flow; invite-only shows neutral copy and NO CTA (the
 * self-serve /sell flow would reject the buyer). See REMEDIATION_OPENING_UX §7.3.
 */
export function MarketplaceColdStartPanel({
  sellerEntryMode,
  sellHref,
  marketplaceIdentifier,
}: {
  sellerEntryMode: MarketplaceSellerEntryMode;
  sellHref: string;
  /** Enables the "notify me" demand capture when provided. */
  marketplaceIdentifier?: string;
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

        {marketplaceIdentifier ? (
          <MarketplaceInterestForm marketplaceIdentifier={marketplaceIdentifier} />
        ) : null}
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
