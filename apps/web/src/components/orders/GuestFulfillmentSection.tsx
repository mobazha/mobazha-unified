'use client';

import { Copy, Info, Link2 } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import type { GuestOrderAdminDetail } from '@mobazha/core/services/api/guestCheckout';
import { AdminShippingDecrypt } from '@/components/GuestCheckout/AdminShippingDecrypt';
import { SellerDigitalDeliveryStatus } from '@/components/Order/SellerDigitalDeliveryStatus';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import type { useGuestDigitalDelivery } from '@mobazha/core';
import { isGuestOrderPhysical, truncateOrderToken, type GuestOrderKind } from './guestOrderDisplay';
import { hasGuestTrackingInfo } from './guestOrderStages';

type GuestDigitalDeliveryState = ReturnType<typeof useGuestDigitalDelivery>;

function ShippingAddressBlock({ address }: { address: Record<string, string> }) {
  const locality = [address.city, address.state].filter(Boolean).join(', ');
  const localityLine = [locality, address.postalCode].filter(Boolean).join(' ');
  const known = new Set([
    'name',
    'company',
    'address',
    'addressLineOne',
    'addressLineTwo',
    'city',
    'state',
    'postalCode',
    'country',
    'addressNotes',
  ]);
  const extra = Object.entries(address).filter(([key, value]) => value && !known.has(key));
  return (
    <div className="space-y-0.5 rounded-md bg-muted p-3 font-mono text-xs">
      {address.name && <p>{address.name}</p>}
      {address.company && <p>{address.company}</p>}
      {(address.address || address.addressLineOne) && (
        <p>{address.address || address.addressLineOne}</p>
      )}
      {address.addressLineTwo && <p>{address.addressLineTwo}</p>}
      {localityLine && <p>{localityLine}</p>}
      {address.country && <p>{address.country}</p>}
      {address.addressNotes && <p className="text-muted-foreground">{address.addressNotes}</p>}
      {extra.map(([key, value]) => (
        <p key={key}>{value}</p>
      ))}
    </div>
  );
}

interface GuestFulfillmentSectionProps {
  detail: GuestOrderAdminDetail;
  orderKind: GuestOrderKind;
  digitalDelivery: GuestDigitalDeliveryState;
  onCopyOrderToken?: () => void;
}

function buildGuestOrderPageUrl(orderToken: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/guest-order/${encodeURIComponent(orderToken)}`;
}

export function GuestFulfillmentSection({
  detail,
  orderKind,
  digitalDelivery,
  onCopyOrderToken,
}: GuestFulfillmentSectionProps) {
  const { t } = useI18n();
  const { toast } = useToast();

  const postFunded = ['FUNDED', 'SHIPPED', 'COMPLETED'].includes(detail.state);
  const hasAddress = isGuestOrderPhysical(detail);
  const isPhysical = orderKind === 'physical';
  const isUnknown = orderKind === 'unknown';

  if (isUnknown && postFunded) {
    return (
      <div
        className="space-y-2 rounded-lg border border-amber-300/60 bg-amber-50/70 p-4 text-sm dark:border-amber-900/60 dark:bg-amber-950/30"
        data-testid="guest-fulfillment-unknown"
      >
        <p className="font-medium text-amber-900 dark:text-amber-100">
          {t('admin.orders.guestContractTypeMissingTitle')}
        </p>
        <p className="text-xs text-amber-800/90 dark:text-amber-200/80">
          {t('admin.orders.guestContractTypeMissingHelp')}
        </p>
      </div>
    );
  }

  if (!postFunded && !hasAddress) {
    return null;
  }

  const showDigitalStatus = orderKind === 'digital' && postFunded;
  const showPhysicalAddress = isPhysical && hasAddress;
  const showReadonlyTracking =
    isPhysical &&
    (detail.state === 'SHIPPED' || detail.state === 'COMPLETED') &&
    hasGuestTrackingInfo(detail);
  const showSharePanel = !detail.contactEmail?.trim() && postFunded;

  const handleCopyOrderLink = async () => {
    try {
      await navigator.clipboard.writeText(buildGuestOrderPageUrl(detail.orderToken));
      toast({ title: t('common.copied'), variant: 'success' });
    } catch {
      toast({ title: t('admin.orders.guestActionFailed'), variant: 'destructive' });
    }
  };

  return (
    <div
      className="space-y-4 rounded-lg border border-border bg-card p-4"
      data-testid="guest-fulfillment-section"
    >
      <div>
        <p className="font-medium">{t('admin.orders.guestFulfillmentTitle')}</p>
        {showDigitalStatus && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('admin.orders.guestFulfillmentDigitalHint')}
          </p>
        )}
      </div>

      {showDigitalStatus && (
        <SellerDigitalDeliveryStatus
          {...digitalDelivery.sellerDigitalProps}
          isDigitalOrder
          actionLayout="stacked"
          className="border-0 bg-muted/40 p-3 shadow-none"
        />
      )}

      {showPhysicalAddress && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t('admin.orders.shippingAddress')}
          </p>
          {detail.addressEncrypted && detail.shippingAddressCiphertext ? (
            <AdminShippingDecrypt
              ciphertext={detail.shippingAddressCiphertext}
              expectedFingerprint={detail.shippingAddressKeyFingerprint}
            />
          ) : detail.shippingAddress ? (
            <ShippingAddressBlock address={detail.shippingAddress} />
          ) : null}
        </div>
      )}

      {showReadonlyTracking && (
        <div className="space-y-1 rounded-md bg-muted/50 p-3 text-xs">
          <p className="font-medium text-foreground">{t('admin.orders.guestTrackingReadonly')}</p>
          {detail.shippingCarrier?.trim() && (
            <p className="text-muted-foreground">
              <span className="text-foreground">{detail.shippingCarrier}</span>
            </p>
          )}
          {detail.trackingNumber?.trim() && (
            <p className="font-mono text-foreground">{detail.trackingNumber}</p>
          )}
        </div>
      )}

      {showSharePanel && (
        <div
          className="space-y-3 rounded-md border border-border/60 bg-muted/30 p-3"
          data-testid="guest-no-contact"
        >
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-foreground">
                {t('admin.orders.guestShareWithBuyerTitle')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('admin.orders.guestNoContactHint')}
              </p>
            </div>
          </div>
          {onCopyOrderToken && (
            <div className="flex items-center gap-2 rounded-md bg-background/60 px-2 py-1.5">
              <span className="shrink-0 text-xs text-muted-foreground">
                {t('admin.orders.tokenLabel')}
              </span>
              <span
                className="min-w-0 flex-1 truncate font-mono text-xs text-foreground"
                title={detail.orderToken}
              >
                {truncateOrderToken(detail.orderToken)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={onCopyOrderToken}
                aria-label={t('admin.orders.guestCopyOrderToken')}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[44px] w-full justify-center"
            onClick={() => {
              void handleCopyOrderLink();
            }}
          >
            <Link2 className="mr-1.5 h-3.5 w-3.5" />
            {t('admin.orders.guestCopyOrderLink')}
          </Button>
        </div>
      )}
    </div>
  );
}
