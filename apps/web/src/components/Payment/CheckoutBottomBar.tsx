'use client';

import React from 'react';
import { Loader2, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n, useCurrency } from '@mobazha/core';
import { Button } from '@/components/ui/button';

// UTXO 链（不需要钱包连接，使用外部钱包扫码支付）
const UTXO_CHAINS = ['BTC', 'LTC', 'BCH'];

export interface CheckoutBottomBarProps {
  totalAmount: number;
  currency: string;
  cryptoAmount?: string;
  cryptoCurrency?: string;
  paymentMethod?: string; // 支付方式，如 BTC、ETH、USDT 等
  onPay: () => void;
  onConnect?: () => void;
  isLoading?: boolean;
  isConnected?: boolean;
  isConnecting?: boolean;
  disabled?: boolean;
  className?: string;
}

export const CheckoutBottomBar: React.FC<CheckoutBottomBarProps> = ({
  totalAmount,
  currency,
  cryptoAmount,
  cryptoCurrency,
  paymentMethod,
  onPay,
  onConnect,
  isLoading = false,
  isConnected = true,
  isConnecting = false,
  disabled = false,
  className,
}) => {
  const { t } = useI18n();
  const { formatPrice } = useCurrency();

  const formattedTotal = formatPrice(totalAmount, currency);

  // 检查是否是开放的 UTXO 支付链（BTC/LTC/BCH），这些链不需要连接钱包
  const isUTXOChain = paymentMethod && UTXO_CHAINS.includes(paymentMethod.toUpperCase());

  // 对于 UTXO 链，不需要检查钱包连接状态
  const needsWalletConnection = !isUTXOChain && !isConnected;

  // 根据钱包连接状态决定按钮行为
  const handleButtonClick = () => {
    if (needsWalletConnection && onConnect) {
      onConnect();
    } else {
      onPay();
    }
  };

  // 根据状态渲染按钮文案
  const renderButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          {t('checkout.processing')}
        </>
      );
    }

    if (isConnecting && !isUTXOChain) {
      return (
        <>
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          {t('wallet.connecting')}
        </>
      );
    }

    // UTXO 链直接显示 Pay，不需要连接钱包
    if (needsWalletConnection) {
      return (
        <>
          <Wallet className="w-4 h-4 mr-2" />
          {t('wallet.connect')}
        </>
      );
    }

    return t('checkout.pay');
  };

  // 计算按钮禁用状态
  // UTXO 链：只检查 disabled 和 isLoading
  // 非 UTXO 链：还需要检查钱包连接状态
  const isButtonDisabled = isLoading || (isUTXOChain ? disabled : disabled || isConnecting);

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'bg-surface/95 backdrop-blur-sm border-t border-border',
        'p-4 pb-[max(1rem,env(safe-area-inset-bottom))]',
        'md:hidden', // 仅在移动端显示
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        {/* 价格信息 */}
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{t('checkout.total')}</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-foreground">{formattedTotal}</span>
            {cryptoAmount && cryptoCurrency && (
              <span className="text-sm text-muted-foreground">
                ≈ {cryptoAmount} {cryptoCurrency}
              </span>
            )}
          </div>
        </div>

        {/* 支付按钮 */}
        <Button
          size="lg"
          onClick={handleButtonClick}
          disabled={isButtonDisabled}
          className="min-w-[120px]"
        >
          {renderButtonContent()}
        </Button>
      </div>
    </div>
  );
};

export default CheckoutBottomBar;
