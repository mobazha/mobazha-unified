'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export interface Transaction {
  txid: string;
  value: number;
  confirmations: number;
}

export interface PaymentDetailsProps {
  /** 支付金额 */
  amount: string;
  /** 币种 */
  currency: string;
  /** 交易列表 */
  transactions?: Transaction[];
  /** 托管地址 */
  escrowAddress?: string;
  /** 区块链浏览器基础URL */
  blockExplorerUrl?: string;
  /** 是否已完全支付 */
  funded?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 复制按钮组件
 */
function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn('p-1 rounded hover:bg-muted transition-colors', className)}
      title={copied ? 'Copied!' : 'Copy'}
    >
      {copied ? (
        <Check className="w-3 h-3 text-primary" />
      ) : (
        <Copy className="w-3 h-3 text-muted-foreground" />
      )}
    </button>
  );
}

/**
 * 截断哈希显示
 */
function truncateHash(hash: string, startChars = 8, endChars = 6): string {
  if (hash.length <= startChars + endChars) return hash;
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}

/**
 * 支付详情组件
 *
 * 显示支付金额、交易确认数、交易哈希等信息
 */
export const PaymentDetails = memo(function PaymentDetails({
  amount,
  currency,
  transactions = [],
  escrowAddress,
  blockExplorerUrl,
  funded = true,
  className,
}: PaymentDetailsProps) {
  // 计算总确认数（取最小值）
  const minConfirmations =
    transactions.length > 0 ? Math.min(...transactions.map(t => t.confirmations)) : 0;

  // 获取交易链接
  const getTxUrl = (txid: string) => {
    if (!blockExplorerUrl) return null;
    return `${blockExplorerUrl}/tx/${txid}`;
  };

  // 获取地址链接
  const getAddressUrl = (address: string) => {
    if (!blockExplorerUrl) return null;
    return `${blockExplorerUrl}/address/${address}`;
  };

  return (
    <div className={cn('', className)}>
      <h3 className="text-sm font-semibold text-foreground mb-2">Payment Details</h3>

      <Card className="p-3 bg-muted/30">
        {/* 金额和状态 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-foreground">
              {amount} {currency}
            </span>
            {funded && (
              <span className="text-xs px-1.5 py-0.5 bg-primary/10 dark:bg-primary/20 text-primary rounded">
                Paid
              </span>
            )}
          </div>
          {minConfirmations > 0 && (
            <span className="text-xs text-muted-foreground">
              {minConfirmations} confirmation{minConfirmations !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* 交易列表 */}
        {transactions.length > 0 && (
          <div className="space-y-1.5">
            {transactions.map((tx, index) => (
              <div key={tx.txid} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">
                  {transactions.length > 1 ? `TX ${index + 1}:` : 'TX:'}
                </span>
                <span className="font-mono text-foreground">{truncateHash(tx.txid)}</span>
                <CopyButton text={tx.txid} />
                {blockExplorerUrl && (
                  <a
                    href={getTxUrl(tx.txid) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded hover:bg-muted transition-colors"
                    title="View on blockchain"
                  >
                    <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-primary" />
                  </a>
                )}
                <span className="text-muted-foreground ml-auto">{tx.confirmations} conf.</span>
              </div>
            ))}
          </div>
        )}

        {/* 托管地址 */}
        {escrowAddress && (
          <div className="flex items-center gap-2 text-xs mt-2 pt-2 border-t border-border">
            <span className="text-muted-foreground">Escrow:</span>
            <span className="font-mono text-foreground">{truncateHash(escrowAddress, 10, 8)}</span>
            <CopyButton text={escrowAddress} />
            {blockExplorerUrl && (
              <a
                href={getAddressUrl(escrowAddress) || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded hover:bg-muted transition-colors"
                title="View on blockchain"
              >
                <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-primary" />
              </a>
            )}
          </div>
        )}
      </Card>
    </div>
  );
});

export default PaymentDetails;
