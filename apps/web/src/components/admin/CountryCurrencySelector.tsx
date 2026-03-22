'use client';

import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import {
  useI18n,
  getAllCountries,
  POPULAR_COUNTRIES,
  FIAT_CURRENCIES,
  getPopularCurrencies,
  getDefaultCurrencyForCountry,
  getCurrencyFlag,
} from '@mobazha/core';
import type { CurrencyInfo } from '@mobazha/core';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CountryCurrencySelectorProps {
  country: string;
  currency: string;
  onCountryChange: (country: string) => void;
  onCurrencyChange: (currency: string) => void;
  disabled?: boolean;
  autoLinkCurrency?: boolean;
}

export default function CountryCurrencySelector({
  country,
  currency,
  onCountryChange,
  onCurrencyChange,
  disabled = false,
  autoLinkCurrency = true,
}: CountryCurrencySelectorProps) {
  const { t, locale } = useI18n();
  const userOverrodeCurrency = useRef(false);

  const allCountries = useMemo(() => getAllCountries(locale), [locale]);
  const popularCountryCodes = useMemo(() => new Set(POPULAR_COUNTRIES), []);
  const popularCountries = useMemo(
    () => allCountries.filter(c => popularCountryCodes.has(c.code)),
    [allCountries, popularCountryCodes]
  );
  const otherCountries = useMemo(
    () => allCountries.filter(c => !popularCountryCodes.has(c.code)),
    [allCountries, popularCountryCodes]
  );

  const popularCurrencies = useMemo(() => getPopularCurrencies(), []);
  const otherFiatCurrencies = useMemo(() => {
    const popularCodes = new Set(popularCurrencies.map(c => c.code));
    return FIAT_CURRENCIES.filter(c => !popularCodes.has(c.code));
  }, [popularCurrencies]);

  useEffect(() => {
    if (!autoLinkCurrency || !country || userOverrodeCurrency.current) return;
    const suggested = getDefaultCurrencyForCountry(country);
    if (suggested !== currency) {
      onCurrencyChange(suggested);
    }
  }, [country, autoLinkCurrency, currency, onCurrencyChange]);

  const handleCurrencyChange = useCallback(
    (val: string) => {
      userOverrodeCurrency.current = true;
      onCurrencyChange(val);
    },
    [onCurrencyChange]
  );

  const currencyLabel = useCallback((c: CurrencyInfo) => {
    if (c.type === 'crypto') return c.code;
    const flag = getCurrencyFlag(c.code);
    return flag ? `${flag} ${c.code}` : c.code;
  }, []);

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5 sm:space-y-2">
        <Label className="text-xs sm:text-sm font-medium text-foreground">
          {t('onboarding.country')}
        </Label>
        <Select value={country} onValueChange={onCountryChange} disabled={disabled}>
          <SelectTrigger className="w-full" data-testid="country-select">
            <SelectValue placeholder={t('onboarding.countryPlaceholder')} />
          </SelectTrigger>
          <SelectContent className="max-w-[min(320px,calc(100vw-2rem))]">
            <SelectGroup>
              <SelectLabel>{t('onboarding.popularCountries') || 'Popular'}</SelectLabel>
              {popularCountries.map(c => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>{t('onboarding.allCountries') || 'All Countries'}</SelectLabel>
              {otherCountries.map(c => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        <Label className="text-xs sm:text-sm font-medium text-foreground">
          {t('onboarding.currency') || 'Display Currency'}
        </Label>
        <Select value={currency} onValueChange={handleCurrencyChange} disabled={disabled}>
          <SelectTrigger className="w-full" data-testid="currency-select">
            <SelectValue placeholder={t('onboarding.currencyPlaceholder') || 'Select'} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>{t('onboarding.popularCurrencies') || 'Popular'}</SelectLabel>
              {popularCurrencies.map(c => (
                <SelectItem key={c.code} value={c.code}>
                  {currencyLabel(c)}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>{t('onboarding.fiatCurrencies') || 'Fiat'}</SelectLabel>
              {otherFiatCurrencies.map(c => (
                <SelectItem key={c.code} value={c.code}>
                  {currencyLabel(c)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
