// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container } from '@/components/layouts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { useI18n, useUserStore } from '@mobazha/core';
import {
  acceptMarketplaceInviteLink,
  getPublicMarketplaceInviteLink,
} from '@mobazha/core/services/api/marketplace';
import type {
  NativeMarketplaceSellerApplication,
  PublicMarketplaceInviteLink,
} from '@mobazha/core/types/marketplace';
import { Store } from 'lucide-react';

/**
 * Seller invite-link landing: resolves the token to the marketplace terms
 * (including the published operator commission) and lets the signed-in seller
 * join in one step. The link IS the invitation, so this page never requires
 * the operator to know the seller's peerID.
 */
export default function MarketplaceInviteLandingPage() {
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === 'string' ? params.token : '';
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const { isAuthenticated } = useUserStore();

  const [link, setLink] = useState<PublicMarketplaceInviteLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<'gone' | 'failed' | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [result, setResult] = useState<NativeMarketplaceSellerApplication | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setLoadError('gone');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const resolved = await getPublicMarketplaceInviteLink(token);
        if (!cancelled) setLink(resolved);
      } catch (error) {
        if (cancelled) return;
        const status = (error as { status?: number })?.status;
        setLoadError(status === 404 || status === 410 ? 'gone' : 'failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const commissionPercent = useMemo(() => {
    const bps = link?.operatorCommissionBps ?? 0;
    return (bps / 100).toFixed(bps % 100 === 0 ? 0 : 2);
  }, [link]);

  const handleAccept = useCallback(async () => {
    if (!token || accepting) return;
    setAccepting(true);
    try {
      const acceptance = await acceptMarketplaceInviteLink(token);
      setResult(acceptance);
      toast({
        description:
          acceptance.membership?.status === 'approved'
            ? t('marketplace.invite.acceptedApproved', {
                defaultValue: 'You joined the marketplace.',
              })
            : t('marketplace.invite.acceptedPending', {
                defaultValue: 'Request sent — the operator will review it.',
              }),
      });
    } catch (error) {
      const status = (error as { status?: number })?.status;
      toast({
        variant: 'destructive',
        description:
          status === 410
            ? t('marketplace.invite.exhausted', {
                defaultValue: 'This invite link is no longer valid.',
              })
            : t('marketplace.invite.acceptFailed', {
                defaultValue: 'Could not join with this link. Please try again.',
              }),
      });
    } finally {
      setAccepting(false);
    }
  }, [accepting, t, toast, token]);

  const membershipStatus = result?.membership?.status;

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-10">
        <Container size="sm">
          {loading ? (
            <Card className="p-6" data-testid="invite-loading">
              <p className="text-sm text-muted-foreground">
                {t('marketplace.invite.loading', { defaultValue: 'Checking your invitation…' })}
              </p>
            </Card>
          ) : loadError ? (
            <Card className="p-6" data-testid="invite-error">
              <h1 className="text-lg font-semibold">
                {loadError === 'gone'
                  ? t('marketplace.invite.invalidTitle', {
                      defaultValue: 'This invite link is not valid',
                    })
                  : t('marketplace.invite.loadFailedTitle', {
                      defaultValue: 'Could not load this invitation',
                    })}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {loadError === 'gone'
                  ? t('marketplace.invite.invalidBody', {
                      defaultValue:
                        'It may have expired, been revoked, or reached its usage limit. Ask the marketplace operator for a new link.',
                    })
                  : t('marketplace.invite.loadFailedBody', {
                      defaultValue: 'Please retry in a moment.',
                    })}
              </p>
            </Card>
          ) : link ? (
            <Card className="p-6" data-testid="invite-card">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {link.logoURL ? <AvatarImage src={link.logoURL} alt={link.name} /> : null}
                  <AvatarFallback>
                    <Store className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t('marketplace.invite.headline', {
                      defaultValue: 'You are invited to sell on',
                    })}
                  </p>
                  <h1 className="text-lg font-semibold" data-testid="invite-marketplace-name">
                    {link.name}
                  </h1>
                </div>
              </div>

              {link.description ? (
                <p className="mt-3 text-sm text-muted-foreground">{link.description}</p>
              ) : null}

              <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
                  <dt className="text-xs text-muted-foreground">
                    {t('marketplace.invite.commissionLabel', {
                      defaultValue: 'Operator commission',
                    })}
                  </dt>
                  <dd className="mt-1 text-sm font-medium" data-testid="invite-commission">
                    {commissionPercent}%
                  </dd>
                </div>
                <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
                  <dt className="text-xs text-muted-foreground">
                    {t('marketplace.invite.approvalLabel', { defaultValue: 'Joining' })}
                  </dt>
                  <dd className="mt-1 text-sm">
                    {link.autoApprove
                      ? t('marketplace.invite.autoApprove', {
                          defaultValue: 'Approved immediately',
                        })
                      : t('marketplace.invite.manualReview', {
                          defaultValue: 'Reviewed by the operator',
                        })}
                  </dd>
                </div>
              </dl>

              <p className="mt-3 text-xs text-muted-foreground">
                {t('marketplace.invite.termsNote', {
                  defaultValue:
                    'The commission is charged on orders the marketplace brings you, from your proceeds. Joining never transfers your store, listings, or funds to the operator.',
                })}
              </p>

              <div className="mt-5">
                {membershipStatus ? (
                  <div data-testid="invite-result">
                    <p className="text-sm font-medium">
                      {membershipStatus === 'approved'
                        ? t('marketplace.invite.resultApproved', {
                            defaultValue: 'You are in! Your store is now a member.',
                          })
                        : t('marketplace.invite.resultPending', {
                            defaultValue: 'Request sent. The operator will review it.',
                          })}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button asChild variant="outline">
                        <Link href={`/marketplace/${encodeURIComponent(link.slug)}/sell`}>
                          {t('marketplace.invite.goToSellPage', {
                            defaultValue: 'Manage my participation',
                          })}
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : isAuthenticated ? (
                  <Button
                    onClick={() => void handleAccept()}
                    disabled={accepting}
                    data-testid="invite-accept"
                  >
                    {accepting
                      ? t('marketplace.invite.accepting', { defaultValue: 'Joining…' })
                      : t('marketplace.invite.accept', { defaultValue: 'Join as a seller' })}
                  </Button>
                ) : (
                  <Button
                    onClick={() =>
                      router.push(
                        `/login?redirect=${encodeURIComponent(`/join/marketplace/${token}`)}`
                      )
                    }
                    data-testid="invite-login"
                  >
                    {t('marketplace.invite.loginToAccept', {
                      defaultValue: 'Sign in to accept the invitation',
                    })}
                  </Button>
                )}
              </div>
            </Card>
          ) : null}
        </Container>
      </main>
      <Footer />
    </div>
  );
}
