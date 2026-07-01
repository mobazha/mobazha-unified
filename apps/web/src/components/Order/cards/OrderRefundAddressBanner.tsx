'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@mobazha/core';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefundWalletCard } from '@/components/Checkout/RefundWalletCard';

interface OrderRefundAddressBannerProps {
  initialAddress?: string;
  isSaving?: boolean;
  onSave: (address: string, options?: { saveAsDefault?: boolean }) => Promise<void>;
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
  const [saveAsDefault, setSaveAsDefault] = useState(false);

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
            <Link
              href="/settings/refunds"
              className="text-xs font-medium text-primary hover:underline"
            >
              {t('order.refundAddress.manageDefaults')}
            </Link>
          </div>
        </div>

        <RefundWalletCard
          compact
          embedded
          value={refundAddress}
          onChange={setRefundAddress}
          showCexWarning={false}
        />

        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
            checked={saveAsDefault}
            onChange={event => setSaveAsDefault(event.target.checked)}
            data-testid="order-refund-save-as-default"
          />
          <span className="text-xs text-muted-foreground">
            {t('order.refundAddress.saveAsDefault')}
          </span>
        </label>

        <Button
          type="button"
          className="w-full sm:w-auto"
          disabled={!canSave}
          onClick={() => void onSave(trimmed, { saveAsDefault })}
          data-testid="order-refund-address-save"
        >
          {isSaving ? t('common.saving') : t('order.refundAddress.save')}
        </Button>
      </CardContent>
    </Card>
  );
}
