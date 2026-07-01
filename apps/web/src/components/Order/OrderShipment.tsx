'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VStack, HStack } from '@/components/layouts';
import { useI18n, type DisplayShipmentInfo, type DisplayUserRole } from '@mobazha/core';
import { Copy, ExternalLink, Eye, EyeOff, KeyRound, PackageCheck } from 'lucide-react';
import { formatOrderDate, copyToClipboard } from './utils';

export interface OrderShipmentProps {
  shipments: DisplayShipmentInfo[];
  orderId?: string;
  userRole?: DisplayUserRole;
  className?: string;
}

function isManagedDigitalAssetsURL(url: string, orderId?: string): boolean {
  const path = normalizePathname(url);
  const expected = orderId ? `/v1/orders/${encodeURIComponent(orderId)}/digital-assets` : undefined;
  return expected ? path === expected : /^\/v1\/orders\/[^/]+\/digital-assets$/.test(path);
}

function normalizePathname(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith('/')) {
    return trimmed.split(/[?#]/, 1)[0] || '/';
  }
  try {
    return new URL(trimmed).pathname;
  } catch {
    return trimmed.split(/[?#]/, 1)[0] || trimmed;
  }
}

/**
 * Extract the earliest delivery timestamp from managed digital asset shipments.
 * Useful for displaying "delivered at" in BuyerDigitalAssetsSection.
 */
export function getDigitalDeliveryTimestamp(
  shipments: DisplayShipmentInfo[] | undefined,
  orderId?: string
): string | undefined {
  if (!shipments?.length) return undefined;
  for (const row of shipments) {
    if (row.type === 'digital' && row.fileUrl && isManagedDigitalAssetsURL(row.fileUrl, orderId)) {
      return row.timestamp;
    }
  }
  return undefined;
}

/**
 * 发货信息展示组件
 */
export const OrderShipment: React.FC<OrderShipmentProps> = ({
  shipments,
  orderId,
  userRole,
  className = '',
}) => {
  const { t } = useI18n();
  const [showPassword, setShowPassword] = useState<Record<number, boolean>>({});

  const handleCopy = useCallback((text: string) => {
    copyToClipboard(text);
  }, []);

  const handleOpenDigitalDownloads = useCallback(() => {
    const section = document.getElementById('digital-downloads');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.replaceState(null, '', '#digital-downloads');
    }
  }, []);

  // Hide shipment rows that merely point to the managed digital downloads
  // endpoint — for buyers, BuyerDigitalAssetsSection already covers them;
  // for sellers, SellerDigitalDeliveryStatus already communicates delivery.
  const visibleShipments = useMemo(() => {
    return shipments.filter(row => {
      if (row.type !== 'digital') return true;
      if (!row.fileUrl || !isManagedDigitalAssetsURL(row.fileUrl, orderId)) return true;
      if (row.password || row.note) return true;
      return false;
    });
  }, [shipments, orderId]);

  if (!visibleShipments.length) {
    return null;
  }

  return (
    <Card className={`p-4 sm:p-6 ${className}`}>
      <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
        <PackageCheck className="w-5 h-5 text-primary" />
        {t('order.shipment.title')}
      </h3>

      <VStack gap="md">
        {visibleShipments.map((row, index) => (
          <div key={index} className={`${index > 0 ? 'pt-4 border-t border-border' : ''}`}>
            {/* Timestamp */}
            <p className="text-xs text-muted-foreground mb-3">{formatOrderDate(row.timestamp)}</p>

            {/* Physical Delivery */}
            {row.type === 'physical' && (
              <VStack gap="sm">
                {row.shipper && (
                  <HStack justify="between" align="start">
                    <span className="text-sm text-muted-foreground">
                      {t('order.shipment.carrier')}
                    </span>
                    <span className="text-sm text-foreground">{row.shipper}</span>
                  </HStack>
                )}
                {row.trackingNumber && (
                  <HStack justify="between" align="center">
                    <span className="text-sm text-muted-foreground">
                      {t('order.shipment.trackingNumber')}
                    </span>
                    <HStack gap="xs">
                      <span className="text-sm font-mono text-foreground">
                        {row.trackingNumber}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleCopy(row.trackingNumber!)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </HStack>
                  </HStack>
                )}
              </VStack>
            )}

            {/* Digital Delivery */}
            {row.type === 'digital' && (
              <VStack gap="sm">
                {row.fileUrl && isManagedDigitalAssetsURL(row.fileUrl, orderId) ? (
                  <div>
                    <span className="text-sm text-muted-foreground block mb-1">
                      {t('order.shipment.digitalAccess')}
                    </span>
                    {userRole === 'buyer' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleOpenDigitalDownloads}
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1" />
                        {t('order.shipment.viewDigitalDownloads')}
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t('order.shipment.managedDigitalDelivery')}
                      </p>
                    )}
                  </div>
                ) : row.fileUrl ? (
                  <div>
                    <span className="text-sm text-muted-foreground block mb-1">
                      {t('order.shipment.downloadUrl')}
                    </span>
                    <div className="flex items-center gap-2 min-w-0">
                      <a
                        href={row.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline break-all min-w-0 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        {row.fileUrl}
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 flex-shrink-0"
                        onClick={() => handleCopy(row.fileUrl!)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}
                {row.password && (
                  <HStack justify="between" align="center">
                    <span className="text-sm text-muted-foreground">
                      {t('order.shipment.password')}
                    </span>
                    <HStack gap="xs">
                      <span className="text-sm font-mono text-foreground">
                        {showPassword[index] ? row.password : '••••••••'}
                      </span>
                      <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() =>
                          setShowPassword(prev => ({ ...prev, [index]: !prev[index] }))
                        }
                      >
                        {showPassword[index] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </HStack>
                  </HStack>
                )}
              </VStack>
            )}

            {/* Cryptocurrency Delivery */}
            {row.type === 'cryptocurrency' && row.transactionID && (
              <div>
                <span className="text-sm text-muted-foreground block mb-1">
                  {t('order.shipment.transactionId')}
                </span>
                <HStack gap="xs" className="break-all">
                  <span className="text-xs font-mono text-foreground">{row.transactionID}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 flex-shrink-0"
                    onClick={() => handleCopy(row.transactionID!)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </HStack>
              </div>
            )}

            {/* Note */}
            {row.note && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">{t('order.shipment.note')}</p>
                <p className="text-sm text-foreground">{row.note}</p>
              </div>
            )}
          </div>
        ))}
      </VStack>
    </Card>
  );
};

export default OrderShipment;
