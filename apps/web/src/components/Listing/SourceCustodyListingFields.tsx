'use client';

import React, { useCallback, useMemo } from 'react';
import { Plus, X } from 'lucide-react';
import type { SourceDepositListingPrefillInput } from '@mobazha/core';
import { mustAssetIdFromTokenId, useI18n } from '@mobazha/core';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SOURCE_CUSTODY_PAYMENT_CURRENCIES = [
  { code: mustAssetIdFromTokenId('ETH'), name: 'ETH (Ethereum)' },
  { code: mustAssetIdFromTokenId('SOLUSDC'), name: 'USDC (Solana)' },
  { code: mustAssetIdFromTokenId('SOLUSDT'), name: 'USDT (Solana)' },
];

const PRICING_CURRENCIES = [
  { value: 'USD', label: 'USD' },
  { value: 'USDT', label: 'USDT' },
  { value: 'USDC', label: 'USDC' },
];

export interface SourceCustodyListingFieldsProps {
  prefill: SourceDepositListingPrefillInput;
  price: string;
  pricingCurrency: string;
  acceptedCurrencies: string[];
  onPriceChange: (value: string) => void;
  onPricingCurrencyChange: (value: string) => void;
  onAcceptedCurrenciesChange: (value: string[]) => void;
  errors?: {
    price?: string;
    acceptedCurrencies?: string;
  };
  className?: string;
}

export function SourceCustodyListingFields({
  prefill,
  price,
  pricingCurrency,
  acceptedCurrencies,
  onPriceChange,
  onPricingCurrencyChange,
  onAcceptedCurrenciesChange,
  errors = {},
  className = '',
}: SourceCustodyListingFieldsProps) {
  const { t } = useI18n();

  const summaryRows = useMemo(
    () =>
      [
        { label: t('listing.sourceDeposit.certNumber'), value: prefill.certNumber },
        prefill.grade ? { label: t('listing.sourceDeposit.grade'), value: prefill.grade } : null,
        prefill.serial ? { label: t('listing.sourceDeposit.serial'), value: prefill.serial } : null,
        { label: t('listing.sourceDeposit.hubSlot'), value: prefill.hubSlotID },
        {
          label: t('listing.sourceDeposit.sourceDepositId'),
          value: prefill.sourceDepositID,
        },
      ].filter((row): row is { label: string; value: string } => row !== null),
    [prefill, t]
  );

  const handleAddCurrency = useCallback(() => {
    if (acceptedCurrencies.length < 5) {
      const defaultCurrency = SOURCE_CUSTODY_PAYMENT_CURRENCIES[0]?.code || mustAssetIdFromTokenId('ETH');
      onAcceptedCurrenciesChange([...acceptedCurrencies, defaultCurrency]);
    }
  }, [acceptedCurrencies, onAcceptedCurrenciesChange]);

  const handleRemoveCurrency = useCallback(
    (index: number) => {
      if (acceptedCurrencies.length > 1) {
        onAcceptedCurrenciesChange(acceptedCurrencies.filter((_, i) => i !== index));
      }
    },
    [acceptedCurrencies, onAcceptedCurrenciesChange]
  );

  const handleCurrencyChange = useCallback(
    (index: number, value: string) => {
      const next = [...acceptedCurrencies];
      next[index] = value;
      onAcceptedCurrenciesChange(next);
    },
    [acceptedCurrencies, onAcceptedCurrenciesChange]
  );

  return (
    <div className={`space-y-6 ${className}`} data-testid="source-custody-listing-fields">
      <Card className="border-primary/20 bg-primary/5 p-4 sm:p-6">
        <h3 className="text-base font-semibold text-foreground">
          {t('listing.sourceDeposit.summaryTitle')}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('listing.sourceDeposit.summarySubtitle')}
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {summaryRows.map(row => (
            <div key={row.label}>
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd className="mt-0.5 break-all text-sm font-medium text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          {t('listing.sourceDeposit.mintOnFirstSaleNote')}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {t('listing.sourceDeposit.escrowCryptoPaymentNote')}
        </p>
      </Card>

      <Card className="p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
              {t('listing.price')} <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={e => onPriceChange(e.target.value)}
                placeholder="0.00"
                className={`flex-1 ${errors.price ? 'border-destructive' : ''}`}
              />
              <Select value={pricingCurrency} onValueChange={onPricingCurrencyChange}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICING_CURRENCIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {errors.price ? <p className="mt-1 text-sm text-destructive">{errors.price}</p> : null}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
              {t('cart.quantity')}
            </label>
            <Input value="1" readOnly disabled aria-readonly className="bg-muted" />
            <p className="mt-1 text-xs text-muted-foreground">
              {t('listing.sourceDeposit.quantityLocked')}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
            {t('listing.acceptedCurrencies')} <span className="text-destructive">*</span>
          </label>
          {errors.acceptedCurrencies ? (
            <p className="mb-2 text-sm text-destructive">{errors.acceptedCurrencies}</p>
          ) : null}
          <div className="space-y-2">
            {acceptedCurrencies.map((currency, index) => (
              <div key={`${currency}-${index}`} className="flex gap-2">
                <Select value={currency} onValueChange={v => handleCurrencyChange(index, v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_CUSTODY_PAYMENT_CURRENCIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {acceptedCurrencies.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCurrency(index)}
                    className="text-destructive hover:text-destructive"
                    aria-label={t('common.remove')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ))}
            {acceptedCurrencies.length < 5 ? (
              <Button type="button" variant="outline" size="sm" onClick={handleAddCurrency}>
                <Plus className="mr-2 h-4 w-4" />
                {t('listing.addPaymentCurrency')}
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}
