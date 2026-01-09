'use client';

import React, { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { PaymentCryptoSelector } from '@/components/Payment';

/**
 * 移动端支付方式选择页面
 * 点击即选择并自动返回（符合移动端体验）
 */
export default function PaymentMethodPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  // 从 URL 获取当前选中的支付方式
  const initialTokenId = searchParams.get('selected') || undefined;
  const returnUrl = searchParams.get('returnUrl') || '/checkout';

  // 处理选择 - 点击即选择并自动返回
  const handleSelect = useCallback(
    (tokenId: string) => {
      // 使用 sessionStorage 存储选择的支付方式
      sessionStorage.setItem('checkout_selected_token', tokenId);
      // 自动返回上一页
      router.push(returnUrl);
    },
    [returnUrl, router]
  );

  // 处理返回
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 头部 */}
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 text-foreground touch-feedback"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">{t('payment.selectPaymentMethod')}</span>
          </button>
        </div>
      </header>

      {/* 内容区域 - 使用紧凑间距 */}
      <main className="flex-1 p-3">
        <PaymentCryptoSelector
          selectedTokenId={initialTokenId}
          onSelect={handleSelect}
          showFiatMethods={true}
        />
      </main>
    </div>
  );
}
