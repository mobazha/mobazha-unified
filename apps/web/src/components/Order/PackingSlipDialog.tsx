'use client';

import React, { useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useI18n, type DisplayOrder } from '@mobazha/core';

interface PackingSlipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: DisplayOrder;
}

export function PackingSlipDialog({ open, onOpenChange, order }: PackingSlipDialogProps) {
  const { t } = useI18n();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${t('order.packingSlip.title')} - ${order.orderId}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1a1a1a; font-size: 13px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #111; }
          .header h1 { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
          .header .meta { text-align: right; font-size: 12px; color: #666; }
          .header .meta strong { color: #1a1a1a; font-size: 13px; }
          .section { margin-bottom: 20px; }
          .section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 8px; }
          .address { font-size: 13px; line-height: 1.6; }
          table { width: 100%; border-collapse: collapse; margin-top: 4px; }
          th { text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #888; padding: 8px 0; border-bottom: 1px solid #ddd; }
          th:last-child, td:last-child { text-align: right; }
          td { padding: 10px 0; border-bottom: 1px solid #eee; font-size: 13px; vertical-align: top; }
          .item-title { font-weight: 500; }
          .item-variant { font-size: 12px; color: #666; margin-top: 2px; }
          .item-cell { display: flex; gap: 10px; align-items: flex-start; }
          .item-thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #eee; flex-shrink: 0; }
          .total-row td { border-top: 2px solid #111; border-bottom: none; font-weight: 600; font-size: 14px; padding-top: 12px; }
          .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 11px; color: #999; text-align: center; }
          @media print { body { padding: 0; } @page { margin: 1.5cm; } }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }, [order.orderId, t]);

  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const shippingLines = [
    order.shippingRecipient,
    order.shippingAddressLine1,
    order.shippingAddressLine2,
    [order.shippingCity, order.shippingState, order.shippingPostalCode].filter(Boolean).join(', '),
    order.shippingCountryCode,
  ].filter(Boolean);

  const hasShipping = shippingLines.length > 0 || order.shippingAddress;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t('order.packingSlip.title')}</span>
            <Button onClick={handlePrint} size="sm" className="gap-2">
              <Printer className="w-4 h-4" />
              {t('order.packingSlip.print')}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="p-4">
          {/* Header */}
          <div
            className="header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 24,
              paddingBottom: 16,
              borderBottom: '2px solid currentColor',
            }}
          >
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700 }}>{t('order.packingSlip.title')}</h1>
              {order.vendor?.name && (
                <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{order.vendor.name}</div>
              )}
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: '#666' }}>
              <div>
                <strong style={{ fontSize: 13, color: '#1a1a1a' }}>
                  {t('order.packingSlip.orderNumber')}
                </strong>
              </div>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  marginTop: 2,
                  maxWidth: 200,
                  wordBreak: 'break-all',
                }}
              >
                {order.orderId}
              </div>
              {orderDate && <div style={{ marginTop: 6 }}>{orderDate}</div>}
            </div>
          </div>

          {/* Ship To */}
          {hasShipping && (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#888',
                  marginBottom: 8,
                }}
              >
                {t('order.shipTo')}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                {shippingLines.length > 0 ? (
                  shippingLines.map((line, i) => <div key={i}>{line}</div>)
                ) : (
                  <div>{order.shippingAddress}</div>
                )}
              </div>
            </div>
          )}

          {/* Items Table */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#888',
                marginBottom: 8,
              }}
            >
              {t('order.orderItems')}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#888',
                      padding: '8px 0',
                      borderBottom: '1px solid #ddd',
                    }}
                  >
                    {t('order.packingSlip.item')}
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#888',
                      padding: '8px 0',
                      borderBottom: '1px solid #ddd',
                    }}
                  >
                    {t('order.quantity')}
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#888',
                      padding: '8px 0',
                      borderBottom: '1px solid #ddd',
                    }}
                  >
                    {t('order.packingSlip.price')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => (
                  <tr key={idx}>
                    <td
                      style={{
                        padding: '10px 0',
                        borderBottom: '1px solid #eee',
                        verticalAlign: 'top',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.title}
                            style={{
                              width: 40,
                              height: 40,
                              objectFit: 'cover',
                              borderRadius: 4,
                              flexShrink: 0,
                              border: '1px solid #eee',
                            }}
                          />
                        )}
                        <div>
                          <div style={{ fontWeight: 500 }}>
                            {item.title || t('order.unknownItem')}
                          </div>
                          {item.options && item.options.length > 0 && (
                            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                              {item.options.map(o => `${o.name}: ${o.value}`).join(' · ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '10px 0',
                        borderBottom: '1px solid #eee',
                        textAlign: 'center',
                        verticalAlign: 'top',
                      }}
                    >
                      {item.quantity}
                    </td>
                    <td
                      style={{
                        padding: '10px 0',
                        borderBottom: '1px solid #eee',
                        textAlign: 'right',
                        verticalAlign: 'top',
                      }}
                    >
                      {item.price} {item.currency}
                    </td>
                  </tr>
                ))}

                {/* Shipping row */}
                {order.shippingAmount && (
                  <tr>
                    <td style={{ padding: '10px 0', borderBottom: '1px solid #eee' }} colSpan={2}>
                      {t('order.shipping')}
                      {order.shippingOption && (
                        <span style={{ color: '#666' }}> ({order.shippingOption})</span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: '10px 0',
                        borderBottom: '1px solid #eee',
                        textAlign: 'right',
                      }}
                    >
                      {order.shippingAmount} {order.pricingCurrency || order.currency}
                    </td>
                  </tr>
                )}

                {/* Total row */}
                <tr>
                  <td
                    style={{
                      borderTop: '2px solid #111',
                      borderBottom: 'none',
                      fontWeight: 600,
                      fontSize: 14,
                      paddingTop: 12,
                    }}
                    colSpan={2}
                  >
                    {t('order.total')}
                  </td>
                  <td
                    style={{
                      borderTop: '2px solid #111',
                      borderBottom: 'none',
                      fontWeight: 600,
                      fontSize: 14,
                      paddingTop: 12,
                      textAlign: 'right',
                    }}
                  >
                    {order.pricingAmount && order.pricingCurrency
                      ? `${order.pricingAmount} ${order.pricingCurrency}`
                      : `${order.total} ${order.currency}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Notes */}
          {order.notes && (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#888',
                  marginBottom: 8,
                }}
              >
                {t('order.orderNotes')}
              </div>
              <div style={{ fontSize: 13, color: '#444' }}>{order.notes}</div>
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              marginTop: 32,
              paddingTop: 16,
              borderTop: '1px solid #eee',
              fontSize: 11,
              color: '#999',
              textAlign: 'center',
            }}
          >
            {t('order.packingSlip.thankYou')}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
