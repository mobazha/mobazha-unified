'use client';

import { useEffect, useRef, useState } from 'react';
import { getImageUrl, useI18n } from '@mobazha/core';
import type { GuestOrderAdminDetail } from '@mobazha/core/services/api/guestCheckout';
import { resolveTokenIdForDisplay } from '@mobazha/core/data/tokens';
import { Copy, Package } from 'lucide-react';
import { AdminShippingDecrypt } from '@/components/GuestCheckout/AdminShippingDecrypt';
import { TokenIcon } from '@/components/Payment/TokenIcon';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useToast } from '@/components/ui/use-toast';
import { formatGuestPaymentAmount } from '@/components/admin/orders/utils';
import {
  formatGuestStateLabel,
  guestActionHelpText,
  guestStateBadgeClass,
  isGuestOrderPhysical,
  truncateOrderToken,
} from './guestOrderDisplay';

interface GuestOrderDetailDrawerProps {
  open: boolean;
  loading: boolean;
  loadError: boolean;
  detail: GuestOrderAdminDetail | null;
  shipCarrier: string;
  shipTracking: string;
  actionLoading: 'ship' | 'complete' | null;
  onClose: () => void;
  onRetry: () => void;
  onShipCarrierChange: (value: string) => void;
  onShipTrackingChange: (value: string) => void;
  onShip: () => void;
  onComplete: () => void;
}

function formatOrderDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function GuestShippingFields({
  shipCarrier,
  shipTracking,
  actionLoading,
  onShipCarrierChange,
  onShipTrackingChange,
}: {
  shipCarrier: string;
  shipTracking: string;
  actionLoading: 'ship' | 'complete' | null;
  onShipCarrierChange: (value: string) => void;
  onShipTrackingChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(Boolean(shipCarrier.trim() || shipTracking.trim()));

  if (!expanded) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full justify-start"
        onClick={() => setExpanded(true)}
        disabled={actionLoading !== null}
      >
        {t('admin.orders.guestToggleTracking')}
      </Button>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Input
        value={shipCarrier}
        onChange={event => onShipCarrierChange(event.target.value)}
        placeholder={t('admin.orders.guestCarrierPlaceholder')}
        disabled={actionLoading !== null}
      />
      <Input
        value={shipTracking}
        onChange={event => onShipTrackingChange(event.target.value)}
        placeholder={t('admin.orders.guestTrackingPlaceholder')}
        disabled={actionLoading !== null}
      />
    </div>
  );
}

export function GuestOrderDetailDrawer({
  open,
  loading,
  loadError,
  detail,
  shipCarrier,
  shipTracking,
  actionLoading,
  onClose,
  onRetry,
  onShipCarrierChange,
  onShipTrackingChange,
  onShip,
  onComplete,
}: GuestOrderDetailDrawerProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  const isPhysical = detail ? isGuestOrderPhysical(detail) : false;
  const isFunded = detail?.state === 'FUNDED';
  const isShipped = detail?.state === 'SHIPPED';
  const showStickyAction = Boolean(detail && (isFunded || isShipped));

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: 0 });
  }, [detail?.orderToken, open]);

  const fundedHelpText = isPhysical
    ? t('admin.orders.guestPhysicalShipHelp')
    : t('admin.orders.guestDigitalDeliverHelp');

  const fundedActionLabel =
    actionLoading === 'ship'
      ? t('common.processing')
      : isPhysical
        ? t('admin.orders.guestMarkShipped')
        : t('admin.orders.guestMarkDelivered');

  const completeActionLabel =
    actionLoading === 'complete' ? t('common.processing') : t('admin.orders.guestCompleteOrder');

  const handleCopyToken = async () => {
    if (!detail?.orderToken) return;
    try {
      await navigator.clipboard.writeText(detail.orderToken);
      toast({ title: t('common.copied'), variant: 'success' });
    } catch {
      toast({ title: t('admin.orders.guestActionFailed'), variant: 'destructive' });
    }
  };

  const renderPrimaryAction = (className?: string) => {
    if (!detail) return null;

    if (isFunded) {
      return (
        <Button
          type="button"
          className={className ?? 'w-full'}
          onClick={onShip}
          disabled={actionLoading !== null}
        >
          {fundedActionLabel}
        </Button>
      );
    }

    if (isShipped) {
      return (
        <Button
          type="button"
          className={className ?? 'w-full'}
          onClick={onComplete}
          disabled={actionLoading !== null}
        >
          {completeActionLabel}
        </Button>
      );
    }

    return null;
  };

  const renderDesktopActionSection = () => {
    if (!detail) return null;

    if (isFunded) {
      return (
        <div className="hidden space-y-3 sm:block">
          <p className="text-xs text-muted-foreground">{fundedHelpText}</p>
          {isPhysical && (
            <GuestShippingFields
              key={detail.orderToken}
              shipCarrier={shipCarrier}
              shipTracking={shipTracking}
              actionLoading={actionLoading}
              onShipCarrierChange={onShipCarrierChange}
              onShipTrackingChange={onShipTrackingChange}
            />
          )}
          {renderPrimaryAction()}
        </div>
      );
    }

    if (isShipped) {
      return (
        <div className="hidden space-y-3 sm:block">
          <p className="text-xs text-muted-foreground">{t('admin.orders.guestCompleteHelp')}</p>
          {renderPrimaryAction()}
        </div>
      );
    }

    return <p className="text-xs text-muted-foreground">{guestActionHelpText(detail.state, t)}</p>;
  };

  const primaryItem = detail?.items[0];
  const primaryThumb = primaryItem?.thumbnail?.trim();
  const primaryThumbSrc = primaryThumb ? getImageUrl(primaryThumb) : '';

  return (
    <Sheet open={open} onOpenChange={nextOpen => !nextOpen && onClose()}>
      <SheetContent
        side="right"
        showCloseButton
        className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="shrink-0 border-b border-border px-4 py-4 text-left sm:px-6">
          <SheetTitle className="text-base">{t('admin.orders.guestOrderDetail')}</SheetTitle>
          <SheetDescription className="sr-only">
            {t('admin.orders.guestActionsTitle')}
          </SheetDescription>
        </SheetHeader>

        <div
          ref={scrollRef}
          className={`min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 ${
            showStickyAction ? 'pb-28 sm:pb-6' : ''
          }`}
        >
          {loading && (
            <div className="flex h-24 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {!loading && loadError && !detail && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm font-medium text-foreground">{t('common.loadFailed')}</p>
              <p className="text-xs text-muted-foreground">
                {t('admin.orders.guestDetailLoadFailed')}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                {t('common.retry')}
              </Button>
            </div>
          )}

          {!loading && detail && (
            <div className="space-y-5 text-sm">
              <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={guestStateBadgeClass(detail.state, t)}>
                    {formatGuestStateLabel(detail.state, t)}
                  </Badge>
                  <Badge variant="secondary">
                    {isPhysical
                      ? t('admin.orders.guestOrderTypePhysical')
                      : t('admin.orders.guestOrderTypeDigital')}
                  </Badge>
                </div>

                {primaryItem && (
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {primaryThumbSrc ? (
                        <img src={primaryThumbSrc} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {primaryItem.listingTitle}
                      </p>
                      {detail.items.length > 1 && (
                        <p className="text-xs text-muted-foreground">
                          {t('admin.orders.orderItemCount', { count: detail.items.length })}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <TokenIcon token={resolveTokenIdForDisplay(detail.paymentCoin)} size={22} />
                  <span>{formatGuestPaymentAmount(detail)}</span>
                </div>

                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-muted-foreground">
                  <dt>{t('admin.orders.timeLabel')}</dt>
                  <dd className="text-foreground">{formatOrderDateTime(detail.createdAt)}</dd>
                  <dt>{t('admin.orders.contactLabel')}</dt>
                  <dd className="text-foreground">{detail.contactEmail || t('common.none')}</dd>
                </dl>
              </div>

              <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                <p className="font-medium">{t('admin.orders.guestActionsTitle')}</p>
                {showStickyAction ? (
                  <p className="text-xs text-muted-foreground sm:hidden">
                    {isFunded ? fundedHelpText : t('admin.orders.guestCompleteHelp')}
                  </p>
                ) : null}
                {renderDesktopActionSection()}
              </div>

              {detail.items.length > 1 && (
                <div>
                  <p className="mb-2 font-medium">{t('admin.orders.guestOrderItems')}</p>
                  <div className="space-y-2">
                    {detail.items.map((item, index) => {
                      const thumb = item.thumbnail?.trim();
                      const thumbSrc = thumb ? getImageUrl(thumb) : '';
                      return (
                        <div
                          key={`${item.listingHash}-${index}`}
                          className="flex items-center justify-between gap-2 text-muted-foreground"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
                              {thumbSrc ? (
                                <img src={thumbSrc} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <span className="truncate">{item.listingTitle}</span>
                          </div>
                          <span className="shrink-0">×{item.quantity}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isPhysical && (
                <div>
                  <p className="mb-2 font-medium">{t('admin.orders.shippingAddress')}</p>
                  {detail.addressEncrypted && detail.shippingAddressCiphertext ? (
                    <AdminShippingDecrypt ciphertext={detail.shippingAddressCiphertext} />
                  ) : detail.shippingAddress ? (
                    <div className="space-y-0.5 rounded-md bg-muted p-3 font-mono">
                      {Object.entries(detail.shippingAddress)
                        .filter(([, value]) => value)
                        .map(([key, value]) => (
                          <p key={key}>{value}</p>
                        ))}
                    </div>
                  ) : null}
                </div>
              )}

              <Accordion type="single" collapsible>
                <AccordionItem value="technical" className="border-border">
                  <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                    {t('admin.orders.technicalInfo')}
                  </AccordionTrigger>
                  <AccordionContent>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-muted-foreground">
                      <dt>{t('admin.orders.paymentRailLabel')}</dt>
                      <dd className="break-all font-mono text-[11px] leading-snug text-foreground">
                        {detail.paymentCoin}
                      </dd>
                      <dt>{t('admin.orders.listingCurrencyLabel')}</dt>
                      <dd className="font-medium text-foreground">
                        {(
                          detail.priceCurrency || resolveTokenIdForDisplay(detail.paymentCoin)
                        ).trim() || '—'}
                      </dd>
                      <dt>{t('admin.orders.tokenLabel')}</dt>
                      <dd className="flex items-start gap-2">
                        <span
                          className="break-all font-mono text-xs text-foreground"
                          title={detail.orderToken}
                        >
                          {truncateOrderToken(detail.orderToken)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={handleCopyToken}
                          aria-label={t('common.copy')}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </dd>
                    </dl>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}
        </div>

        {showStickyAction && (
          <div className="shrink-0 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
            {isFunded && isPhysical && (
              <div className="mb-3">
                <GuestShippingFields
                  key={detail?.orderToken}
                  shipCarrier={shipCarrier}
                  shipTracking={shipTracking}
                  actionLoading={actionLoading}
                  onShipCarrierChange={onShipCarrierChange}
                  onShipTrackingChange={onShipTrackingChange}
                />
              </div>
            )}
            {renderPrimaryAction('w-full min-h-[44px]')}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
