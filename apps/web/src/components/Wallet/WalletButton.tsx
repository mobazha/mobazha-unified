'use client';

import { Loader2, Wallet } from 'lucide-react';
import { useWallet } from '@mobazha/core';
import { Button } from '../ui/button';

export interface WalletButtonProps {
  className?: string;
  /** Retained for compatibility; balance rendering belongs in account details. */
  showBalance?: boolean;
}

function compactAddress(address: string): string {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletButton({ className = '' }: WalletButtonProps) {
  const { isConnected, isConnecting, walletInfo, connect, disconnect } = useWallet();

  const handleClick = async () => {
    if (isConnected) {
      await disconnect();
      return;
    }
    await connect();
  };

  const label = isConnected && walletInfo?.address ? compactAddress(walletInfo.address) : 'Connect';

  return (
    <Button
      type="button"
      size="sm"
      variant={isConnected ? 'outline' : 'default'}
      className={className}
      disabled={isConnecting}
      onClick={() => void handleClick()}
      aria-label={isConnected ? 'Disconnect wallet' : 'Connect wallet'}
      title={isConnected ? 'Disconnect wallet' : 'Connect an injected wallet'}
    >
      {isConnecting ? <Loader2 className="animate-spin" /> : <Wallet />}
      <span className="max-w-28 truncate">{label}</span>
    </Button>
  );
}

export default WalletButton;
