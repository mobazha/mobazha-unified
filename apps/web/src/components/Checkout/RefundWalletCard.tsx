'use client';

import { useI18n } from '@mobazha/core';
import { Card, CardContent } from '@/components/ui/card';

interface RefundWalletCardProps {
  value: string;
  onChange: (value: string) => void;
  connectedAddress?: string | null;
  compact?: boolean;
}

export function RefundWalletCard({
  value,
  onChange,
  connectedAddress,
  compact = false,
}: RefundWalletCardProps) {
  const { t } = useI18n();
  const padding = compact ? 'p-4' : 'p-6';

  return (
    <Card>
      <CardContent className={padding}>
        <div className="space-y-3">
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

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">
              {t('checkout.refundWalletAddress')}
            </span>
            <input
              value={value}
              onChange={event => onChange(event.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t('checkout.refundWalletPlaceholder')}
              autoComplete="off"
              data-testid="checkout-refund-wallet"
            />
          </label>

          {connectedAddress && value !== connectedAddress && (
            <button
              type="button"
              onClick={() => onChange(connectedAddress)}
              className="text-xs font-medium text-primary hover:underline"
            >
              {t('checkout.useConnectedWallet')}
            </button>
          )}

          <p className="rounded-lg border border-warning/20 bg-warning/8 px-3 py-2 text-xs text-warning">
            {t('checkout.refundWalletCexWarning')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
