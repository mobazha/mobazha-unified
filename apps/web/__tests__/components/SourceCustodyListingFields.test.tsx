import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SourceCustodyListingFields } from '@/components/Listing/SourceCustodyListingFields';
import { mustAssetIdFromTokenId } from '@mobazha/core';

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
    }),
  };
});

describe('SourceCustodyListingFields', () => {
  const prefill = {
    sourceDepositID: 'dep-1',
    certNumber: 'PSA-9',
    hubSlotID: 'slot-9',
  };

  it('defaults accepted payment currency to canonical ETH', () => {
    render(
      <SourceCustodyListingFields
        prefill={prefill}
        price="10"
        pricingCurrency="USD"
        acceptedCurrencies={[mustAssetIdFromTokenId('ETH')]}
        onPriceChange={() => {}}
        onPricingCurrencyChange={() => {}}
        onAcceptedCurrenciesChange={() => {}}
      />
    );

    expect(screen.getByTestId('source-custody-listing-fields')).toBeInTheDocument();
    expect(screen.getByText('ETH (Ethereum)')).toBeInTheDocument();
  });
});
