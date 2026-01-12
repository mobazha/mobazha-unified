'use client';

/**
 * 钱包连接按钮
 *
 * 使用 AppKit 的 Web Component 显示钱包连接 UI
 */

import { useState } from 'react';
import { useAppKit, useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Wallet, ChevronDown, LogOut, Copy, ExternalLink, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getAddressUrl } from '@mobazha/core';

// 格式化地址显示
function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export interface WalletConnectButtonProps {
  /** 按钮大小 */
  size?: 'sm' | 'default' | 'lg';
  /** 变体 */
  variant?: 'default' | 'outline' | 'ghost';
  /** 自定义类名 */
  className?: string;
  /** 是否显示完整地址 */
  showFullAddress?: boolean;
}

export function WalletConnectButton({
  size = 'default',
  variant = 'default',
  className = '',
  showFullAddress = false,
}: WalletConnectButtonProps) {
  const { isConnected, address, chain, connect, disconnect, openModal, isInitializing } =
    useAppKit();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  // 复制地址
  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 在浏览器中查看
  const handleViewInExplorer = () => {
    if (address) {
      const chainId = typeof chain?.id === 'number' ? chain.id : undefined;
      window.open(getAddressUrl(address, chainId), '_blank');
    }
  };

  // 未连接状态
  if (!isConnected) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => connect()}
        disabled={isInitializing}
      >
        <Wallet className="w-4 h-4 mr-2" />
        {isInitializing ? t('wallet.initializing') : t('wallet.connectWallet')}
      </Button>
    );
  }

  // 已连接状态
  const displayAddress = showFullAddress ? address : formatAddress(address || '');
  const networkName = chain?.name || t('wallet.unknownNetwork');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-mono text-sm">{displayAddress}</span>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* 网络信息 */}
        <div className="px-2 py-1.5">
          <div className="text-xs text-muted-foreground">{t('wallet.network')}</div>
          <div className="text-sm font-medium">{networkName}</div>
        </div>
        <DropdownMenuSeparator />

        {/* 复制地址 */}
        <DropdownMenuItem onClick={handleCopy}>
          {copied ? (
            <Check className="w-4 h-4 mr-2 text-emerald-500" />
          ) : (
            <Copy className="w-4 h-4 mr-2" />
          )}
          {copied ? t('wallet.copied') : t('wallet.copyAddress')}
        </DropdownMenuItem>

        {/* 在浏览器中查看 */}
        <DropdownMenuItem onClick={handleViewInExplorer}>
          <ExternalLink className="w-4 h-4 mr-2" />
          {t('wallet.viewInExplorer')}
        </DropdownMenuItem>

        {/* 打开钱包详情 */}
        <DropdownMenuItem onClick={() => openModal({ view: 'Account' })}>
          <Wallet className="w-4 h-4 mr-2" />
          {t('wallet.walletDetails')}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* 断开连接 */}
        <DropdownMenuItem onClick={() => disconnect()} className="text-destructive">
          <LogOut className="w-4 h-4 mr-2" />
          {t('wallet.disconnect')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default WalletConnectButton;
