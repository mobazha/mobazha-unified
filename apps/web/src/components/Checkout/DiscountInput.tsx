'use client';

import React, { useState } from 'react';
import { HStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useI18n, useCurrency } from '@mobazha/core';
import type { AppliedDiscount } from '@mobazha/core/utils/discountUtils';
import type { ApplicableDiscount } from '@mobazha/core/services/api/discounts';
import { formatDiscountValue, proximityToDiscount } from '@mobazha/core/utils/discountUtils';

interface DiscountInputProps {
  appliedDiscounts: AppliedDiscount[];
  applicableDiscounts: ApplicableDiscount[];
  subtotal: number;
  currency: string;
  isValidating: boolean;
  onApplyCode: (code: string) => Promise<void>;
  onRemoveDiscount: (id: string) => void;
}

export function DiscountInput({
  appliedDiscounts,
  applicableDiscounts,
  subtotal,
  currency,
  isValidating,
  onApplyCode,
  onRemoveDiscount,
}: DiscountInputProps) {
  const { t } = useI18n();
  const { renderPairedPrice } = useCurrency();
  const [code, setCode] = useState('');

  const handleApply = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    await onApplyCode(trimmed);
    setCode('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  const nearbyDiscount = applicableDiscounts.find(d => {
    const remaining = proximityToDiscount(d, subtotal);
    const minAmt = Number(d.minAmount) || 0;
    return remaining > 0 && minAmt > 0 && remaining <= minAmt * 0.3;
  });

  return (
    <div className="space-y-3" data-testid="discount-section">
      <h3 className="text-sm font-semibold text-foreground">{t('checkout.discount.title')}</h3>

      {/* Code input */}
      <HStack gap="xs" align="stretch">
        <Input
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('checkout.discount.codePlaceholder')}
          className="flex-1"
          data-testid="discount-code-input"
        />
        <Button
          variant="outline"
          size="default"
          onClick={handleApply}
          disabled={!code.trim() || isValidating}
          data-testid="discount-apply-btn"
        >
          {isValidating ? t('checkout.discount.applying') : t('checkout.discount.apply')}
        </Button>
      </HStack>

      {/* Applied discounts */}
      {appliedDiscounts.length > 0 && (
        <div className="space-y-2">
          {appliedDiscounts.map(d => (
            <div
              key={d.id}
              className="flex items-center justify-between p-2.5 bg-success/8 border border-success/20 rounded-lg"
              data-testid="applied-discount"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="success" className="text-xs flex-shrink-0">
                  {formatDiscountValue(d.valueType, d.value, d.currency)}
                </Badge>
                <span className="text-sm text-foreground truncate">
                  {d.code ? d.code.toUpperCase() : d.title}
                </span>
              </div>
              <HStack gap="sm" align="center" className="flex-shrink-0">
                <span className="text-sm font-medium text-success">
                  -{renderPairedPrice(d.savedAmount, d.currency || currency)}
                </span>
                <button
                  onClick={() => onRemoveDiscount(d.id)}
                  className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center hover:bg-destructive/10 rounded transition-colors"
                  aria-label={t('checkout.discount.remove')}
                  data-testid="discount-remove-btn"
                >
                  <svg
                    className="w-3.5 h-3.5 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </HStack>
            </div>
          ))}
        </div>
      )}

      {/* Proximity message */}
      {nearbyDiscount && (
        <p className="text-xs text-primary" data-testid="discount-proximity">
          {t('checkout.discount.proximityHint', {
            amount: renderPairedPrice(
              proximityToDiscount(nearbyDiscount, subtotal),
              nearbyDiscount.currency || currency
            ),
            reward: formatDiscountValue(
              nearbyDiscount.valueType,
              Number(nearbyDiscount.value) || 0,
              nearbyDiscount.currency
            ),
          })}
        </p>
      )}
    </div>
  );
}
