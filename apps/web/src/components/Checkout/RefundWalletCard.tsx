'use client';

import { useI18n } from '@mobazha/core';
import { Card, CardContent } from '@/components/ui/card';
import { RefundAddressField } from '@/components/Checkout/RefundAddressField';

interface RefundWalletCardProps {
  value: string;
  onChange: (value: string) => void;
  connectedAddress?: string | null;
  compact?: boolean;
  embedded?: boolean;
  showCexWarning?: boolean;
}

export function RefundWalletCard({
  value,
  onChange,
  connectedAddress,
  compact = false,
  embedded = false,
  showCexWarning = true,
}: RefundWalletCardProps) {
  const { t } = useI18n();
  const padding = compact ? 'p-4' : 'p-6';
  const spacing = compact ? 'space-y-2' : 'space-y-3';

  const content = (
    <div className={spacing}>
      {!embedded && (
        <div>
          <h2
            className={
              compact
                ? 'text-base font-semibold text-foreground'
                : 'text-lg font-semibold text-foreground'
            }
          >
            {t('checkout.refundWallet')}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{t('checkout.refundWalletHint')}</p>
        </div>
      )}

      <RefundAddressField
        value={value}
        onChange={onChange}
        label={t('checkout.refundWalletAddress')}
        placeholder={t('checkout.refundWalletPlaceholder')}
        warning={showCexWarning ? t('checkout.refundWalletCexWarning') : undefined}
      />

      {connectedAddress && value !== connectedAddress && (
        <button
          type="button"
          onClick={() => onChange(connectedAddress)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {t('checkout.useConnectedWallet')}
        </button>
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <Card>
      <CardContent className={padding}>{content}</CardContent>
    </Card>
  );
}
