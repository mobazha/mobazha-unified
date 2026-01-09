'use client';

import React from 'react';
import { Pencil, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@mobazha/core';
import { getChainById, getTokenById } from './config';
import { TokenIcon } from './TokenIcon';

export interface PaymentMethodSummaryProps {
  selectedTokenId?: string;
  onEdit: () => void;
  disabled?: boolean;
  className?: string;
}

export const PaymentMethodSummary: React.FC<PaymentMethodSummaryProps> = ({
  selectedTokenId,
  onEdit,
  disabled = false,
  className,
}) => {
  const { t } = useI18n();

  const token = selectedTokenId ? getTokenById(selectedTokenId) : undefined;
  const chain = token ? getChainById(token.chain) : undefined;

  // 判断是否需要显示链图标
  const showChainBadge = token && !token.isNative && token.chain !== token.token;

  return (
    <button
      type="button"
      onClick={onEdit}
      disabled={disabled}
      className={cn(
        'flex items-center justify-between w-full p-3 rounded-lg',
        'border border-border bg-surface',
        'hover:bg-muted/50 transition-colors',
        'text-left',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {/* 代币图标 */}
        {token ? (
          <TokenIcon
            token={token.id}
            size={32}
            showChainBadge={showChainBadge}
            chainId={token.chain}
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
          </div>
        )}

        {/* 支付方式信息 */}
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{t('payment.paymentMethod')}</span>
          {token ? (
            <span className="font-medium text-foreground">
              {token.token}
              {chain && token.type && (
                <span className="text-muted-foreground ml-1 text-sm">({chain.name})</span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">{t('payment.selectPaymentMethod')}</span>
          )}
        </div>
      </div>

      {/* 编辑按钮 */}
      <div className="flex items-center gap-1 text-primary">
        <Pencil className="w-3.5 h-3.5" />
        <span className="text-sm">{t('common.edit')}</span>
      </div>
    </button>
  );
};

export default PaymentMethodSummary;
