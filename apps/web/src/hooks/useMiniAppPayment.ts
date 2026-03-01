'use client';

import { useMemo } from 'react';
import { useTGMiniApp } from '@/components/TGMiniAppProvider';
import { useDiscordActivity } from '@/components/DiscordActivityProvider';

export interface MiniAppPaymentCapabilities {
  isEmbedded: boolean;
  /** WalletConnect v2 relay — works in all environments */
  walletConnectAvailable: boolean;
  /** Browser extension wallets (MetaMask, etc.) — NOT available in iframes */
  browserExtensionAvailable: boolean;
  /** Stripe Elements inline form — may need openLink fallback in some iframes */
  stripeInlineAvailable: boolean;
  /** PayPal button — needs redirect mode in iframes */
  paypalInlineAvailable: boolean;
  /** Can open external links (for payment fallback) */
  canOpenExternalLink: boolean;
}

/**
 * Detects which payment methods are available in the current environment.
 *
 * Mini Apps (TG/Discord) run inside iframes where:
 * - Browser extension wallets are NOT accessible
 * - WalletConnect QR works (relay-based, no direct deep link needed)
 * - Stripe Elements may need external link fallback
 * - PayPal should use redirect mode, not popup
 */
export function useMiniAppPayment(): MiniAppPaymentCapabilities {
  const { isAvailable: isTG } = useTGMiniApp();
  const { isAvailable: isDiscord } = useDiscordActivity();

  return useMemo(() => {
    const isEmbedded = isTG || isDiscord;

    return {
      isEmbedded,
      walletConnectAvailable: true,
      browserExtensionAvailable: !isEmbedded,
      stripeInlineAvailable: !isEmbedded,
      paypalInlineAvailable: !isEmbedded,
      canOpenExternalLink: true,
    };
  }, [isTG, isDiscord]);
}
