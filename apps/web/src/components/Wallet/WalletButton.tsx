'use client';

import { useCallback, useState } from 'react';
import { Check, ChevronDown, Copy, Loader2, LogOut, Settings2, Wallet } from 'lucide-react';
import { useI18n, useWallet } from '@mobazha/core';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useToast } from '../ui/use-toast';

export interface WalletButtonProps {
  className?: string;
  /** Retained for compatibility; balance rendering belongs in account details. */
  showBalance?: boolean;
}

function compactAddress(address: string): string {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Wallet entry point in the site header.
 *
 * Connected state opens a menu instead of disconnecting on the first click:
 * the old behaviour made a single click on the address drop the connection,
 * with no visible way to switch wallets or accounts.
 */
export function WalletButton({ className = '' }: WalletButtonProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { isConnected, isConnecting, walletInfo, connect, disconnect, openModal } = useWallet();
  const [copied, setCopied] = useState(false);

  const address = walletInfo?.address ?? '';
  const isWalletReady = isConnected && Boolean(address);

  const handleConnect = useCallback(async () => {
    await connect();
  }, [connect]);

  const handleCopy = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast({ title: t('wallet.addressCopied') });
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable (insecure context); the address stays
      // visible in the menu, so no destructive fallback is attempted here.
    }
  }, [address, t, toast]);

  const handleOpenAccount = useCallback(async () => {
    await openModal({ view: 'Account' });
  }, [openModal]);

  const handleSwitchWallet = useCallback(async () => {
    await openModal({ view: 'Connect' });
  }, [openModal]);

  const handleDisconnect = useCallback(async () => {
    await disconnect();
  }, [disconnect]);

  if (!isWalletReady) {
    return (
      <Button
        type="button"
        size="sm"
        variant="default"
        className={className}
        disabled={isConnecting}
        onClick={() => void handleConnect()}
        aria-label={t('wallet.connect')}
        title={t('wallet.connect')}
      >
        {isConnecting ? <Loader2 className="animate-spin" /> : <Wallet />}
        <span className="max-w-28 truncate">{t('wallet.connect')}</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={className}
          aria-label={`${t('wallet.connected')}: ${compactAddress(address)}`}
          title={compactAddress(address)}
        >
          <Wallet />
          <span className="max-w-28 truncate">{compactAddress(address)}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={() => void handleCopy()}>
          {copied ? <Check /> : <Copy />}
          <span>{t('wallet.copyAddress')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void handleOpenAccount()}>
          <Settings2 />
          <span>{t('wallet.accountAndNetworks')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void handleSwitchWallet()}>
          <Wallet />
          <span>{t('wallet.switchWallet')}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void handleDisconnect()}>
          <LogOut />
          <span>{t('wallet.disconnect')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default WalletButton;
