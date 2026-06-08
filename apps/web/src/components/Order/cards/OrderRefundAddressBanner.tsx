'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@mobazha/core';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefundWalletCard } from '@/components/Checkout/RefundWalletCard';

interface OrderRefundAddressBannerProps {
  initialAddress?: string;
  isSaving?: boolean;
  onSave: (address: string) => Promise<void>;
  className?: string;
}

export function OrderRefundAddressBanner({
  initialAddress = '',
  isSaving = false,
  onSave,
  className,
}: OrderRefundAddressBannerProps) {
  const { t } = useI18n();
  const [refundAddress, setRefundAddress] = useState(initialAddress);

  useEffect(() => {
    setRefundAddress(initialAddress);
  }, [initialAddress]);

  const trimmed = refundAddress.trim();
  const canSave = trimmed.length > 0 && !isSaving;

  return (
    <Card
      className={`border-warning/30 bg-warning/8 ${className ?? ''}`}
      data-testid="order-refund-address-banner"
    >
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              {t('order.refundAddress.bannerTitle')}
            </h3>
            <p className="text-xs text-muted-foreground">{t('order.refundAddress.bannerDesc')}</p>
          </div>
        </div>

        <RefundWalletCard
          compact
          value={refundAddress}
          onChange={setRefundAddress}
          showCexWarning={false}
        />

        <Button
          type="button"
          className="w-full sm:w-auto"
          disabled={!canSave}
          onClick={() => void onSave(trimmed)}
          data-testid="order-refund-address-save"
        >
          {isSaving ? t('common.saving') : t('order.refundAddress.save')}
        </Button>
      </CardContent>
    </Card>
  );
}
