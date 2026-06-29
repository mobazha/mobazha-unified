'use client';

import React from 'react';
import { Loader2, Wallet } from 'lucide-react';
import { truncateAddress, useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';

export interface CollectibleCheckoutHolderWalletProps {
  requiresHolderWallet: boolean;
  holderWallet: string | null;
  isReady: boolean;
  isWrongNamespace: boolean;
  isConnecting: boolean;
  onConnect: () => void;
  compact?: boolean;
}

export function CollectibleCheckoutHolderWallet({
  requiresHolderWallet,
  holderWallet,
  isReady,
  isWrongNamespace,
  isConnecting,
  onConnect,
  compact = false,
}: CollectibleCheckoutHolderWalletProps) {
  const { t } = useI18n();

  if (!requiresHolderWallet) return null;

  return (
    <div
      className="space-y-3 border-t border-primary/10 pt-3"
      data-testid="collectible-checkout-holder-wallet"
    >
      <div>
        <p className={`font-medium text-foreground ${compact ? 'text-sm' : 'text-sm'}`}>
          {t('collectibles.checkout.holderWalletTitle')}
        </p>
        <p className={`mt-1 text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
          {t('collectibles.checkout.holderWalletDesc')}
        </p>
      </div>

      {isReady && holderWallet ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-background/80 px-3 py-2">
          <Wallet className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="font-mono text-xs text-foreground sm:text-sm">
            {truncateAddress(holderWallet)}
          </span>
          <span className="ml-auto text-xs text-success">
            {t('collectibles.checkout.holderWalletConnected')}
          </span>
        </div>
      ) : (
        <div className="space-y-2">
          {isWrongNamespace ? (
            <p className="text-xs text-destructive" role="status">
              {t('collectibles.checkout.holderWalletWrongNamespace')}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground" role="status">
              {t('collectibles.checkout.holderWalletMissing')}
            </p>
          )}
          <Button
            type="button"
            size={compact ? 'sm' : 'default'}
            variant="outline"
            onClick={onConnect}
            disabled={isConnecting}
            data-testid="collectible-checkout-connect-solana"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                {t('collectibles.checkout.connectingWallet')}
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-4 w-4" aria-hidden />
                {isWrongNamespace
                  ? t('collectibles.checkout.switchSolanaWallet')
                  : t('collectibles.checkout.connectSolanaWallet')}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
