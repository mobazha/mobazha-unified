'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useI18n, walletApi } from '@mobazha/core';
import type { ReceivingAccount } from '@mobazha/core/services/api/wallet';

export interface ReceivingAccountSelectorProps {
  /** 区块链类型，用于筛选匹配的收款账户 */
  blockchain?: string;
  /** 默认选中的账户 ID */
  defaultAccountId?: number;
  /** 选中账户变化回调 */
  onAccountChange?: (account: ReceivingAccount | null) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否必填 */
  required?: boolean;
}

/**
 * 收款账户选择器组件
 * 用于在发货时选择收款地址
 */
export const ReceivingAccountSelector: React.FC<ReceivingAccountSelectorProps> = ({
  blockchain,
  defaultAccountId,
  onAccountChange,
  disabled = false,
  required = false,
}) => {
  const { t } = useI18n();
  const [accounts, setAccounts] = useState<ReceivingAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>(defaultAccountId);
  const [isLoading, setIsLoading] = useState(false);

  // 格式化地址显示
  const formatAddress = useCallback((address: string) => {
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  }, []);

  // 加载收款账户列表
  useEffect(() => {
    const loadAccounts = async () => {
      setIsLoading(true);
      try {
        const allAccounts = await walletApi.getReceivingAccounts();
        // 只显示激活的账户
        let activeAccounts = allAccounts.filter(acc => acc.isActive);

        // 如果指定了区块链类型，进一步筛选
        if (blockchain) {
          const blockchainLower = blockchain.toLowerCase();
          // 定义区块链类型映射（参考桌面端 BLOCKCHAIN_MAPPING）
          const blockchainMapping: Record<string, string[]> = {
            ethereum: ['ethereum', 'eth', 'evm'],
            solana: ['solana', 'sol'],
          };

          // 找到匹配的链类型列表
          let validChainTypes: string[] = [blockchainLower];
          for (const [, aliases] of Object.entries(blockchainMapping)) {
            if (aliases.some(alias => alias.toLowerCase() === blockchainLower)) {
              validChainTypes = aliases;
              break;
            }
          }

          activeAccounts = activeAccounts.filter(acc =>
            validChainTypes.some(type => acc.chainType.toLowerCase() === type.toLowerCase())
          );
        }

        setAccounts(activeAccounts);

        // 如果有账户且没有默认选择，选择第一个
        if (activeAccounts.length > 0 && !selectedAccountId) {
          const firstAccount = activeAccounts[0];
          setSelectedAccountId(firstAccount.id);
          onAccountChange?.(firstAccount);
        }
      } catch (error) {
        console.error('Failed to load receiving accounts:', error);
        setAccounts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAccounts();
  }, [blockchain, onAccountChange, selectedAccountId]);

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
      <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          {t('order.fulfill.noReceivingAccount')}
        </p>
      </div>
    );
  }

  return (
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 block">
        {t('order.fulfill.receivingAccount')} {required && '*'}
      </label>
      <select
        value={selectedAccountId || ''}
        onChange={handleChange}
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
        disabled={disabled || isLoading}
      >
        <option value="">{t('order.fulfill.selectReceivingAccount')}</option>
        {accounts.map(account => (
          <option key={account.id} value={account.id}>
            {account.name} ({account.chainType}) - {formatAddress(account.address)}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground mt-1">
        {t('order.fulfill.receivingAccountHint')}
      </p>
    </div>
  );
};

export default ReceivingAccountSelector;
