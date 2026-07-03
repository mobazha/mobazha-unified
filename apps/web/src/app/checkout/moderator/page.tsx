'use client';

import React, { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@mobazha/core';
import { ModeratorSelector, Moderator } from '@/components/Payment';
import { useModerators } from '@/hooks';
import { CheckoutSubpageHeader } from '@/components/Checkout/CheckoutSubpageHeader';
import { useCheckoutSubpageReturn } from '@/hooks/useCheckoutSubpageReturn';

/**
 * 移动端仲裁员选择页面
 * 点击即选择并自动返回（符合移动端体验）
 */
export default function ModeratorPage() {
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { navigateBack } = useCheckoutSubpageReturn('/checkout');

  const selectedModeratorId = searchParams.get('selected') || undefined;
  const vendorPeerID = searchParams.get('vendor') || undefined;

  const { moderators, isLoading } = useModerators({ autoFetch: true, vendorPeerID });

  const currentModerator = selectedModeratorId
    ? moderators.find(m => m.peerID === selectedModeratorId)
    : undefined;

  const handleSelect = useCallback(
    (moderator: Moderator) => {
      sessionStorage.setItem('checkout_selected_moderator', JSON.stringify(moderator));
      navigateBack();
    },
    [navigateBack]
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CheckoutSubpageHeader title={t('payment.selectModerator')} onBack={navigateBack} />

      <main className="flex-1 p-3">
        <ModeratorSelector
          selectedModerator={currentModerator}
          onSelect={handleSelect}
          moderatorList={moderators}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
}
