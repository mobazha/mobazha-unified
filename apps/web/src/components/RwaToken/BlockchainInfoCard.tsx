'use client';

import React, { useState } from 'react';
import { Copy, ExternalLink, Check, Link } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { shortenAddress, etherscanUrls } from '@mobazha/core';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface BlockchainInfoCardProps {
  blockchain: string;
  contractAddress: string;
  tokenId?: string;
  slotId?: string;
  tokenStandard?: string;
  className?: string;
  compact?: boolean;
}

/**
 * 区块链信息卡片
 * 展示合约地址、Token ID、区块链网络等信息
 * 提供复制地址和 Etherscan 链接功能
 */
export function BlockchainInfoCard({
  blockchain,
  contractAddress,
  tokenId,
  slotId,
  tokenStandard,
  className = '',
  compact = false,
}: BlockchainInfoCardProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(contractAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleOpenEtherscan = () => {
    window.open(etherscanUrls.contract(contractAddress), '_blank', 'noopener,noreferrer');
  };

  const networkDisplayName = blockchain.charAt(0).toUpperCase() + blockchain.slice(1);

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-3 p-2 bg-muted/50 rounded-lg text-sm',
          className
        )}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <Link className="w-4 h-4" />
          <span className="font-mono text-xs">{shortenAddress(contractAddress)}</span>
          <span className="text-xs">({networkDisplayName})</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleCopy}
            title={t('common.copy')}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-success" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleOpenEtherscan}
            title="Etherscan"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('p-4 bg-muted/50 rounded-lg', className)}>
      <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
        <Link className="w-4 h-4 text-primary" />
        {t('listing.rwa.blockchainInfo')}
      </h5>
      <div className="space-y-2 text-sm">
        {/* 网络 */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t('listing.rwa.network')}:</span>
          <span className="font-medium">{networkDisplayName}</span>
        </div>

        {/* Token 标准 */}
        {tokenStandard && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('listing.rwa.tokenStandard')}:</span>
            <span className="font-medium">{tokenStandard}</span>
          </div>
        )}

        {/* 合约地址 */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t('listing.rwa.contractAddress')}:</span>
          <div className="flex items-center gap-1">
            <span className="font-mono text-xs">{shortenAddress(contractAddress)}</span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCopy}>
              {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleOpenEtherscan}>
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Token ID */}
        {tokenId && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Token ID:</span>
            <span className="font-mono text-xs">{tokenId}</span>
          </div>
        )}

        {/* Slot ID (ERC3525) */}
        {slotId && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Slot ID:</span>
            <span className="font-mono text-xs">{slotId}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default BlockchainInfoCard;
