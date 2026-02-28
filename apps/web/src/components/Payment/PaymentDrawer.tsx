'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { PaymentCryptoSelector } from './PaymentCryptoSelector';
import { ModeratorSelector } from './ModeratorSelector';
import { Moderator } from './types';

export interface PaymentDrawerProps {
  type: 'payment' | 'moderator';
  isOpen: boolean;
  onClose: () => void;
  selectedTokenId?: string;
  onSelectToken?: (tokenId: string) => void;
  selectedFiatProvider?: string;
  onSelectFiat?: (providerID: string) => void;
  availableFiatProviders?: string[];
  selectedModerator?: Moderator;
  onSelectModerator?: (moderator: Moderator) => void;
  moderatorList?: Moderator[];
  isLoadingModerators?: boolean;
  className?: string;
}

export const PaymentDrawer: React.FC<PaymentDrawerProps> = ({
  type,
  isOpen,
  onClose,
  selectedTokenId,
  onSelectToken,
  selectedFiatProvider,
  onSelectFiat,
  availableFiatProviders,
  selectedModerator,
  onSelectModerator,
  moderatorList,
  isLoadingModerators = false,
  className,
}) => {
  const { t } = useI18n();

  const handleTokenSelect = (tokenId: string) => {
    onSelectToken?.(tokenId);
    onClose();
  };

  const handleFiatSelect = (providerID: string) => {
    onSelectFiat?.(providerID);
    onClose();
  };

  const handleModeratorSelect = (moderator: Moderator) => {
    onSelectModerator?.(moderator);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
      <SheetContent side="right" className={cn('w-full sm:max-w-md', className)}>
        <SheetHeader>
          <SheetTitle>
            {type === 'payment' ? t('payment.selectPaymentMethod') : t('payment.selectModerator')}
          </SheetTitle>
          <SheetDescription>
            {type === 'payment'
              ? t('payment.selectPaymentMethodDesc')
              : t('payment.selectModeratorDesc')}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {type === 'payment' ? (
            <PaymentCryptoSelector
              selectedTokenId={selectedTokenId}
              onSelect={handleTokenSelect}
              selectedFiatProvider={selectedFiatProvider}
              onSelectFiat={handleFiatSelect}
              availableFiatProviders={availableFiatProviders}
              showFiatMethods={true}
            />
          ) : (
            <ModeratorSelector
              selectedModerator={selectedModerator}
              onSelect={handleModeratorSelect}
              moderatorList={moderatorList}
              isLoading={isLoadingModerators}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PaymentDrawer;
