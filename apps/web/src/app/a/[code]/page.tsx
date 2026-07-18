// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { resolveAffiliateShortLink } from '@mobazha/core';
import { Header } from '@/components';
import { Container } from '@/components/layouts';
import { DealLinkStatusPanel } from '@/components/DealLink/DealLinkStatusPanel';

type ShortLinkPhase = 'loading' | 'not_found' | 'error';

/**
 * Platform short-link landing (/a/<code>, Phase A of the affiliate share
 * surface). Resolves the code against the platform and client-side replaces
 * to the canonical /promo/:sellerPeerID/:token entry, which owns the referral
 * session. A replace (not a redirect) keeps this a single SPA navigation so
 * any query params/UTM survive in history.
 */
export default function AffiliateShortLinkPage() {
  const params = useParams<{ code: string }>();
  const code = typeof params?.code === 'string' ? params.code : undefined;
  const router = useRouter();
  const [phase, setPhase] = useState<ShortLinkPhase>('loading');

  const resolveAndReplace = useCallback(async () => {
    if (!code) {
      setPhase('not_found');
      return;
    }
    setPhase('loading');
    try {
      const resolution = await resolveAffiliateShortLink(code);
      router.replace(
        `/promo/${encodeURIComponent(resolution.sellerPeerID)}/${encodeURIComponent(resolution.token)}`
      );
    } catch (cause) {
      // The platform answers 404 both for unknown codes and while short links
      // are disabled; everything else is a transient failure worth retrying.
      const message = cause instanceof Error ? cause.message.toLowerCase() : '';
      setPhase(message.includes('not found') ? 'not_found' : 'error');
    }
  }, [code, router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void resolveAndReplace(), 0);
    return () => window.clearTimeout(timeout);
  }, [resolveAndReplace]);

  if (phase === 'not_found') {
    return (
      <div className="min-h-dvh bg-background" data-testid="affiliate-short-link-not-found">
        <Header />
        <Container className="py-8">
          <DealLinkStatusPanel kind="not_found" />
        </Container>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-dvh bg-background" data-testid="affiliate-short-link-error">
        <Header />
        <Container className="py-8">
          <DealLinkStatusPanel kind="unknown" onRetry={resolveAndReplace} />
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background" data-testid="affiliate-short-link-loading">
      <Header />
      <Container className="py-8">
        <DealLinkStatusPanel kind="loading" />
      </Container>
    </div>
  );
}
