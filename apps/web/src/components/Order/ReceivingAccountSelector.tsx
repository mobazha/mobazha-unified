'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useI18n, walletApi } from '@mobazha/core';
import { parseCanonicalPaymentCoin } from '@mobazha/core/data/tokens';
import type { ReceivingAccount } from '@mobazha/core/services/api/wallet';

export interface ReceivingAccountSelectorProps {
  /** 区块链类型，用于筛选匹配的收款账户 (legacy fallback) */
  blockchain?: string;
  /** 支付币种 canonical asset ID，优先用于判断兼容链 */
  paymentCoin?: string;
  /** 默认选中的账户 ID */
  defaultAccountId?: number;
  /** 选中账户变化回调 */
  onAccountChange?: (account: ReceivingAccount | null) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否必填 */
  required?: boolean;
}

const NAMESPACE_TO_CHAIN_TYPES: Record<string, string[]> = {
  eip155: ['ethereum', 'eth', 'evm'],
  solana: ['solana', 'sol'],
  bip122: ['bitcoin', 'btc'],
  bitcoincash: ['bitcoincash', 'bch'],
  zcash: ['zcash', 'zec'],
  tron: ['tron', 'trx'],
};

const BLOCKCHAIN_MAPPING: Record<string, string[]> = {
  ethereum: ['ethereum', 'eth', 'evm'],
  solana: ['solana', 'sol'],
  bitcoin: ['bitcoin', 'btc'],
};

function getCompatibleChainTypes(paymentCoin?: string, blockchain?: string): string[] | null {
  if (paymentCoin) {
    const lower = paymentCoin.toLowerCase();
    if (lower.startsWith('fiat:')) {
      const provider = lower.split(':')[1];
      if (provider) return [`fiat:${provider}`];
      return ['fiat'];
    }
    const parsed = parseCanonicalPaymentCoin(paymentCoin);
    if (parsed) {
      return NAMESPACE_TO_CHAIN_TYPES[parsed.namespace] ?? null;
    }
  }
  if (blockchain) {
    const lower = blockchain.toLowerCase();
    for (const aliases of Object.values(NAMESPACE_TO_CHAIN_TYPES)) {
      if (aliases.some(a => a === lower)) return aliases;
    }
    for (const aliases of Object.values(BLOCKCHAIN_MAPPING)) {
      if (aliases.some(a => a === lower)) return aliases;
    }
    return [lower];
  }
  return null;
}

/**
 * 收款账户选择器组件
 * 用于在接受订单或发货时选择收款地址
 */
export const ReceivingAccountSelector: React.FC<ReceivingAccountSelectorProps> = ({
  blockchain,
  paymentCoin,
  defaultAccountId,
  onAccountChange,
  disabled = false,
  required = false,
}) => {
  const { t } = useI18n();
  const [accounts, setAccounts] = useState<ReceivingAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>(defaultAccountId);
  const [isLoading, setIsLoading] = useState(false);

  const formatAddress = useCallback((address: string) => {
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  }, []);

  useEffect(() => {
    const loadAccounts = async () => {
      setIsLoading(true);
      try {
        const allAccounts = await walletApi.getReceivingAccounts();
        let activeAccounts = allAccounts.filter(acc => acc.isActive);

        const validChainTypes = getCompatibleChainTypes(paymentCoin, blockchain);
        if (validChainTypes) {
          activeAccounts = activeAccounts.filter(acc =>
            validChainTypes.some(type => acc.chainType.toLowerCase() === type.toLowerCase())
          );
        }

        setAccounts(activeAccounts);

        setSelectedAccountId(prevId => {
          const isCurrentSelectionValid =
            prevId !== undefined && activeAccounts.some(acc => acc.id === prevId);

          if (isCurrentSelectionValid) {
            return prevId;
          } else if (activeAccounts.length > 0) {
            const firstAccount = activeAccounts[0];
            onAccountChange?.(firstAccount);
            return firstAccount.id;
          } else {
            onAccountChange?.(null);
            return undefined;
          }
        });
      } catch (error) {
        console.error('Failed to load receiving accounts:', error);
        setAccounts([]);
        setSelectedAccountId(undefined);
        onAccountChange?.(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadAccounts();
  }, [blockchain, paymentCoin, onAccountChange]);

  // 处理账户选择变化
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newId = e.target.value ? Number(e.target.value) : undefined;
      setSelectedAccountId(newId);

      if (newId) {
        const selectedAccount = accounts.find(acc => acc.id === newId);
        onAccountChange?.(selectedAccount || null);
      } else {
        onAccountChange?.(null);
      }
    },
    [accounts, onAccountChange]
  );

  // 如果没有账户且不在加载中，显示警告
  if (!isLoading && accounts.length === 0) {
    return (
      <div className="p-3 rounded-lg bg-warning/15 border border-warning/20">
        <p className="text-sm text-warning">{t('order.ship.noReceivingAccount')}</p>
      </div>
    );
  }

  return (
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 block">
        {t('order.ship.receivingAccount')} {required && '*'}
      </label>
      <select
        value={selectedAccountId || ''}
        onChange={handleChange}
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
        disabled={disabled || isLoading}
      >
        <option value="">{t('order.ship.selectReceivingAccount')}</option>
        {accounts.map(account => (
          <option key={account.id} value={account.id}>
            {account.name} ({account.chainType}) - {formatAddress(account.address)}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground mt-1">{t('order.ship.receivingAccountHint')}</p>
    </div>
  );
};

export default ReceivingAccountSelector;
