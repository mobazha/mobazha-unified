'use client';

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui';
import {
  useI18n,
  ordersApi,
  CONTRACT_TYPES,
  CARRIERS,
  filterCarriersGrouped,
  detectCarrier,
  type CarrierConfig,
} from '@mobazha/core';
import { useToast } from '@/components/ui/use-toast';
import type { ReceivingAccount } from '@mobazha/core/services/api/wallet';
import { ReceivingAccountSelector } from './ReceivingAccountSelector';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ShipOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  contractType?: string;
  blockchain?: string;
  itemCount?: number;
  onSuccess?: () => void;
}

type DeliveryMode = 'physical' | 'digital' | 'service' | 'rwa';

function getDeliveryMode(contractType?: string): DeliveryMode {
  switch (contractType) {
    case CONTRACT_TYPES.DIGITAL_GOOD:
      return 'digital';
    case CONTRACT_TYPES.SERVICE:
      return 'service';
    case CONTRACT_TYPES.RWA_TOKEN:
      return 'rwa';
    case CONTRACT_TYPES.PHYSICAL_GOOD:
    default:
      return 'physical';
  }
}

export const ShipOrderDialog: React.FC<ShipOrderDialogProps> = ({
  open,
  onOpenChange,
  orderId,
  contractType,
  blockchain,
  itemCount = 1,
  onSuccess,
}) => {
  const { t } = useI18n();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const lastCarrier = useMemo(() => {
    try {
      return localStorage.getItem('mbz_last_carrier') ?? '';
    } catch {
      return '';
    }
  }, []);

  const [trackingInfo, setTrackingInfo] = useState({
    shipper: lastCarrier,
    trackingNumber: '',
    note: '',
    fileUrl: '',
    filePassword: '',
  });

  // Carrier dropdown state
  const [carrierDropdownOpen, setCarrierDropdownOpen] = useState(false);
  const [carrierQuery, setCarrierQuery] = useState(() => {
    if (!lastCarrier) return '';
    const found = CARRIERS.find(c => c.id === lastCarrier);
    return found ? found.name : lastCarrier;
  });
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const carrierInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const carrierGroups = useMemo(() => filterCarriersGrouped(carrierQuery), [carrierQuery]);

  const filteredCarriers = useMemo(() => carrierGroups.flatMap(g => g.carriers), [carrierGroups]);

  const selectedAccountRef = useRef<ReceivingAccount | null>(null);
  const deliveryMode = getDeliveryMode(contractType);

  const handleAccountChange = useCallback((account: ReceivingAccount | null) => {
    selectedAccountRef.current = account;
  }, []);

  const handleCarrierSelect = useCallback((carrier: CarrierConfig) => {
    setTrackingInfo(prev => ({ ...prev, shipper: carrier.id }));
    setCarrierQuery(carrier.name);
    setCarrierDropdownOpen(false);
    setHighlightedIdx(-1);
  }, []);

  const handleCarrierInputChange = useCallback((value: string) => {
    setCarrierQuery(value);
    setTrackingInfo(prev => ({ ...prev, shipper: value }));
    setCarrierDropdownOpen(true);
    setHighlightedIdx(-1);
  }, []);

  const handleCarrierBlur = useCallback(() => {
    clearTimeout(blurTimeoutRef.current);
    blurTimeoutRef.current = setTimeout(() => {
      setCarrierDropdownOpen(false);
      setHighlightedIdx(-1);
    }, 150);
  }, []);

  const hasCustomOption = useMemo(
    () =>
      carrierQuery.trim() !== '' &&
      !filteredCarriers.some(c => c.name.toLowerCase() === carrierQuery.toLowerCase()),
    [carrierQuery, filteredCarriers]
  );

  const totalOptions = filteredCarriers.length + (hasCustomOption ? 1 : 0);

  const handleCarrierKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!carrierDropdownOpen) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          setCarrierDropdownOpen(true);
          setHighlightedIdx(0);
          e.preventDefault();
        }
        return;
      }
      if (totalOptions === 0) return;
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIdx(prev => (prev + 1) % totalOptions);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIdx(prev => (prev <= 0 ? totalOptions - 1 : prev - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIdx >= 0 && highlightedIdx < filteredCarriers.length) {
            handleCarrierSelect(filteredCarriers[highlightedIdx]);
          } else {
            setCarrierDropdownOpen(false);
            setHighlightedIdx(-1);
          }
          break;
        case 'Escape':
          setCarrierDropdownOpen(false);
          setHighlightedIdx(-1);
          break;
      }
    },
    [carrierDropdownOpen, filteredCarriers, totalOptions, highlightedIdx, handleCarrierSelect]
  );

  const handleSubmit = useCallback(async () => {
    if (deliveryMode === 'physical' && !trackingInfo.trackingNumber.trim()) {
      toast({
        title: t('order.actions.error'),
        description: t('order.ship.trackingRequired'),
        variant: 'destructive',
      });
      return;
    }

    if (deliveryMode === 'digital' && !trackingInfo.fileUrl.trim()) {
      toast({
        title: t('order.actions.error'),
        description: t('order.ship.urlRequired'),
        variant: 'destructive',
      });
      return;
    }

    if (deliveryMode === 'rwa' && !selectedAccountRef.current) {
      toast({
        title: t('order.actions.error'),
        description: t('order.ship.receivingAccountRequired'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const payload: Parameters<typeof ordersApi.shipOrder>[0] = {
        orderID: orderId,
        shipments: [],
      };

      if (deliveryMode === 'physical') {
        payload.shipments = [
          {
            itemIndex: 0,
            note: trackingInfo.note || '',
            physicalDelivery: {
              shipper: trackingInfo.shipper || '',
              trackingNumber: trackingInfo.trackingNumber,
            },
          },
        ];
      }

      if (deliveryMode === 'digital') {
        const count = Math.max(itemCount, 1);
        payload.shipments = Array.from({ length: count }, (_, itemIndex) => ({
          itemIndex,
          note: trackingInfo.note || '',
          digitalDelivery: {
            url: trackingInfo.fileUrl,
            password: trackingInfo.filePassword || undefined,
          },
        }));
      }

      if (deliveryMode === 'rwa' && selectedAccountRef.current) {
        payload.receivingAccountID = selectedAccountRef.current.id;
        payload.shipments = [
          {
            itemIndex: 0,
            note: trackingInfo.note || '',
          },
        ];
      }

      const result = await ordersApi.shipOrder(payload);

      if (result.success) {
        if (deliveryMode === 'physical' && trackingInfo.shipper) {
          try {
            localStorage.setItem('mbz_last_carrier', trackingInfo.shipper);
          } catch {
            /* noop */
          }
        }
        toast({
          title: t('order.actions.shipSuccess'),
          description: t('order.actions.shipSuccessDesc'),
        });
        setTrackingInfo({
          shipper: '',
          trackingNumber: '',
          note: '',
          fileUrl: '',
          filePassword: '',
        });
        setCarrierQuery('');
        selectedAccountRef.current = null;
        onOpenChange(false);
        setTimeout(() => {
          onSuccess?.();
        }, 500);
      } else {
        throw new Error(result.error || 'Failed to ship order');
      }
    } catch (error) {
      toast({
        title: t('order.actions.error'),
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [orderId, trackingInfo, deliveryMode, itemCount, onOpenChange, onSuccess, t, toast]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setTrackingInfo({
          shipper: '',
          trackingNumber: '',
          note: '',
          fileUrl: '',
          filePassword: '',
        });
        setCarrierQuery('');
        selectedAccountRef.current = null;
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {deliveryMode === 'physical' && t('order.dialogs.shipOrder.title')}
            {deliveryMode === 'digital' && t('order.dialogs.shipOrder.digitalTitle')}
            {deliveryMode === 'service' && t('order.dialogs.shipOrder.serviceTitle')}
            {deliveryMode === 'rwa' && t('order.dialogs.shipOrder.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {deliveryMode === 'physical' && t('order.dialogs.shipOrder.description')}
            {deliveryMode === 'digital' && t('order.dialogs.shipOrder.digitalDescription')}
            {deliveryMode === 'service' && t('order.dialogs.shipOrder.serviceDescription')}
            {deliveryMode === 'rwa' && t('order.dialogs.shipOrder.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {deliveryMode === 'rwa' && (
            <ReceivingAccountSelector
              blockchain={blockchain}
              onAccountChange={handleAccountChange}
              disabled={isLoading}
              required
            />
          )}

          {deliveryMode === 'physical' && (
            <>
              {/* Carrier selector with autocomplete */}
              <div className="relative" ref={dropdownRef}>
                <label
                  className="text-sm font-medium text-foreground mb-1.5 block"
                  id="carrier-label"
                >
                  {t('order.ship.carrier')}
                </label>
                <div className="relative">
                  <input
                    ref={carrierInputRef}
                    type="text"
                    role="combobox"
                    aria-expanded={carrierDropdownOpen}
                    aria-controls="carrier-listbox"
                    aria-labelledby="carrier-label"
                    aria-activedescendant={
                      highlightedIdx >= 0 ? `carrier-option-${highlightedIdx}` : undefined
                    }
                    value={carrierQuery}
                    onChange={e => handleCarrierInputChange(e.target.value)}
                    onFocus={() => setCarrierDropdownOpen(true)}
                    onBlur={handleCarrierBlur}
                    onKeyDown={handleCarrierKeyDown}
                    className="w-full px-3 py-2 pr-8 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    placeholder={t('order.ship.carrierPlaceholder')}
                    disabled={isLoading}
                    autoComplete="off"
                  />
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>

                {carrierDropdownOpen && (filteredCarriers.length > 0 || carrierQuery.trim()) && (
                  <div
                    id="carrier-listbox"
                    role="listbox"
                    aria-labelledby="carrier-label"
                    className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto"
                  >
                    {(() => {
                      let flatIdx = 0;
                      return carrierGroups.map((group, gi) => (
                        <div key={group.region}>
                          {carrierGroups.length > 1 && (
                            <div
                              className={cn(
                                'px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50 sticky top-0',
                                gi > 0 && 'border-t border-border'
                              )}
                            >
                              {group.label}
                            </div>
                          )}
                          {group.carriers.map(carrier => {
                            const idx = flatIdx++;
                            return (
                              <button
                                key={carrier.id}
                                id={`carrier-option-${idx}`}
                                role="option"
                                aria-selected={highlightedIdx === idx}
                                type="button"
                                className={cn(
                                  'w-full px-3 py-1.5 text-left text-sm transition-colors',
                                  highlightedIdx === idx ? 'bg-muted' : 'hover:bg-muted'
                                )}
                                onMouseDown={e => {
                                  e.preventDefault();
                                  handleCarrierSelect(carrier);
                                }}
                                onMouseEnter={() => setHighlightedIdx(idx)}
                              >
                                {carrier.name}
                              </button>
                            );
                          })}
                        </div>
                      ));
                    })()}
                    {hasCustomOption && (
                      <button
                        type="button"
                        role="option"
                        aria-selected={highlightedIdx === filteredCarriers.length}
                        className={cn(
                          'w-full px-3 py-1.5 text-left text-sm transition-colors border-t border-border italic text-muted-foreground',
                          highlightedIdx === filteredCarriers.length
                            ? 'bg-muted'
                            : 'hover:bg-muted',
                          filteredCarriers.length === 0 && 'border-t-0'
                        )}
                        onMouseDown={e => {
                          e.preventDefault();
                          setCarrierDropdownOpen(false);
                          setHighlightedIdx(-1);
                        }}
                      >
                        {t('common.use')}: &ldquo;{carrierQuery.trim()}&rdquo;
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  {t('order.ship.trackingNumber')} *
                </label>
                <input
                  type="text"
                  value={trackingInfo.trackingNumber}
                  onChange={e => {
                    const val = e.target.value;
                    setTrackingInfo(prev => ({ ...prev, trackingNumber: val }));
                    if (!trackingInfo.shipper.trim() && val.trim().length >= 8) {
                      const detected = detectCarrier(val);
                      if (detected) {
                        setTrackingInfo(prev => ({
                          ...prev,
                          shipper: detected.id,
                          trackingNumber: val,
                        }));
                        setCarrierQuery(detected.name);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  placeholder={t('order.ship.trackingPlaceholder')}
                  disabled={isLoading}
                />
                {trackingInfo.trackingNumber.trim() && !trackingInfo.shipper.trim() && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('order.ship.carrierHint')}
                  </p>
                )}
              </div>
            </>
          )}

          {deliveryMode === 'digital' && (
            <>
              <p className="text-sm text-muted-foreground">{t('order.ship.digitalFallbackHint')}</p>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  {t('order.ship.fileUrl')} *
                </label>
                <input
                  type="url"
                  value={trackingInfo.fileUrl}
                  onChange={e => setTrackingInfo(prev => ({ ...prev, fileUrl: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  placeholder={t('order.ship.fileUrlPlaceholder')}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  {t('order.ship.password')}
                </label>
                <input
                  type="text"
                  value={trackingInfo.filePassword}
                  onChange={e =>
                    setTrackingInfo(prev => ({ ...prev, filePassword: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  placeholder={t('order.ship.passwordPlaceholder')}
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          {deliveryMode === 'service' && (
            <p className="text-sm text-muted-foreground">{t('order.ship.serviceHint')}</p>
          )}

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              {t('order.ship.note')}
            </label>
            <textarea
              value={trackingInfo.note}
              onChange={e => setTrackingInfo(prev => ({ ...prev, note: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
              placeholder={t('order.ship.notePlaceholder')}
              disabled={isLoading}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={isLoading}>
            {isLoading
              ? t('common.processing')
              : deliveryMode === 'digital'
                ? t('order.ship.deliverNow')
                : t('order.ship.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ShipOrderDialog;
