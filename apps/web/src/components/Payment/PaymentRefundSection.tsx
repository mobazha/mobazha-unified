'use client';

import { useI18n, truncateAddress } from '@mobazha/core';
import { RefundWalletCard } from '@/components/Checkout/RefundWalletCard';
import { Card, CardContent } from '@/components/ui/card';

interface PaymentRefundSectionProps {
  resolvedAddress?: string;
  refundAddress: string;
  onRefundAddressChange: (value: string) => void;
  payFromCustodial: boolean;
  onPayFromCustodialChange: (value: boolean) => void;
  compact?: boolean;
}

export function PaymentRefundSection({
  resolvedAddress,
  refundAddress,
  onRefundAddressChange,
  payFromCustodial,
  onPayFromCustodialChange,
  compact = false,
}: PaymentRefundSectionProps) {
  const { t } = useI18n();
  const padding = compact ? 'p-4' : 'p-6';
  const trimmedResolved = resolvedAddress?.trim();
  const showResolvedDestination = Boolean(trimmedResolved) && !payFromCustodial;

  return (
    <div className="space-y-4" data-testid="payment-refund-section">
      {showResolvedDestination && (
        <Card data-testid="payment-refund-destination">
          <CardContent className={padding}>
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">
                {t('payment.refundDestination.title')}
              </h2>
              <p className="text-xs text-muted-foreground">{t('payment.refundDestination.desc')}</p>
              <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-sm text-foreground">
                {truncateAddress(trimmedResolved ?? '', 8, 6)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="payment-custodial-option">
        <CardContent className={padding}>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
              checked={payFromCustodial}
              onChange={event => onPayFromCustodialChange(event.target.checked)}
              data-testid="payment-custodial-checkbox"
            />
            <span className="space-y-1">
              <span className="block text-sm font-medium text-foreground">
                {t('payment.custodialPayment.label')}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t('payment.custodialPayment.desc')}
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      {payFromCustodial && (
        <RefundWalletCard compact value={refundAddress} onChange={onRefundAddressChange} />
      )}
    </div>
  );
}
