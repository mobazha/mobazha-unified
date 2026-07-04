import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CartSummaryAdapter } from '@/components/Cart/CartSummaryAdapter';

vi.mock('@mobazha/core', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe('CartSummaryAdapter', () => {
  it('keeps host rendering while wiring the normalized checkout action', () => {
    const checkout = vi.fn();

    render(
      <CartSummaryAdapter
        itemCount={2}
        total="$20.00"
        checkoutLabel="Continue"
        onCheckout={checkout}
        renderSummary={({ total, checkoutLabel, checkoutDisabled, onCheckout }) => (
          <div>
            <output>{total}</output>
            <button type="button" disabled={checkoutDisabled} onClick={onCheckout}>
              {checkoutLabel}
            </button>
          </div>
        )}
      />
    );

    expect(screen.getByText('$20.00')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(checkout).toHaveBeenCalledOnce();
  });
});
