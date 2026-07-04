import { renderToStaticMarkup } from 'react-dom/server';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CommerceCartSummary, CommerceCartSummaryContent } from './cart';
import { CommerceProductActionButtons, CommerceProductActions } from './product';
import { CommerceStorefrontShell } from './storefront';
import { CommerceConfirmDialog } from './ui';

const labels = (key: string): string => key;

function ExtensionBadge() {
  return <span>Extension</span>;
}

describe('public commerce surfaces', () => {
  it('renders storefront slots without knowing the contributing application', () => {
    const markup = renderToStaticMarkup(
      <CommerceStorefrontShell
        header={<strong>Store</strong>}
        footer={<small>Footer</small>}
        headerAfter={[
          { id: 'extension', slot: 'storefront.header.after', component: ExtensionBadge },
        ]}
      >
        Catalog
      </CommerceStorefrontShell>
    );

    expect(markup).toContain('Store');
    expect(markup).toContain('Extension');
    expect(markup).toContain('Catalog');
  });

  it('renders neutral product and cart actions', () => {
    const product = renderToStaticMarkup(
      <CommerceProductActions
        price="10 USD"
        labels={labels}
        onAddToCart={vi.fn()}
        onBuyNow={vi.fn()}
      />
    );
    const cart = renderToStaticMarkup(
      <CommerceCartSummary itemCount={2} total="20 USD" labels={labels} onCheckout={vi.fn()} />
    );

    expect(product).toContain('commerce.product.addToCart');
    expect(product).toContain('commerce.product.buyNow');
    expect(cart).toContain('20 USD');
    expect(cart).toContain('commerce.cart.checkout');
  });

  it('lets a host render product controls without changing action semantics', () => {
    const addToCart = vi.fn();
    const buyNow = vi.fn();
    const renderAction = vi.fn(
      ({
        action,
        label,
        disabled,
      }: Parameters<
        NonNullable<ComponentProps<typeof CommerceProductActionButtons>['renderAction']>
      >[0]) => (
        <button type="button" data-host-action={action} disabled={disabled}>
          {label}
        </button>
      )
    );

    const markup = renderToStaticMarkup(
      <CommerceProductActionButtons
        labels={labels}
        disabled
        renderAction={renderAction}
        onAddToCart={addToCart}
        onBuyNow={buyNow}
      />
    );

    expect(markup).toContain('data-host-action="add-to-cart"');
    expect(markup).toContain('data-host-action="buy-now"');
    expect(markup.match(/disabled=""/g)).toHaveLength(2);
    expect(renderAction).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        action: 'add-to-cart',
        disabled: true,
        onAction: addToCart,
      })
    );
    expect(renderAction).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ action: 'buy-now', disabled: true, onAction: buyNow })
    );
  });

  it('lets a host render normalized cart summary state without forcing a card', () => {
    const checkout = vi.fn();
    const renderSummary = vi.fn(
      ({
        itemCount,
        total,
        checkoutDisabled,
      }: Parameters<
        NonNullable<ComponentProps<typeof CommerceCartSummaryContent>['renderSummary']>
      >[0]) => (
        <output data-items={itemCount} data-checkout-disabled={checkoutDisabled}>
          {total}
        </output>
      )
    );

    const markup = renderToStaticMarkup(
      <CommerceCartSummaryContent
        itemCount={0}
        total="0 USD"
        labels={labels}
        renderSummary={renderSummary}
        onCheckout={checkout}
      />
    );

    expect(markup).toContain('data-items="0"');
    expect(markup).toContain('data-checkout-disabled="true"');
    expect(renderSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        itemCount: 0,
        total: '0 USD',
        checkoutDisabled: true,
        onCheckout: checkout,
      })
    );
  });

  it('renders dialog semantics and blocks actions while busy', () => {
    const dialog = renderToStaticMarkup(
      <CommerceConfirmDialog
        open
        busy
        title="Confirm"
        confirmLabel="Continue"
        cancelLabel="Cancel"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(dialog).toContain('role="dialog"');
    expect(dialog).toContain('aria-modal="true"');
    expect(dialog).toContain('aria-busy="true"');
    expect(dialog.match(/disabled=""/g)).toHaveLength(2);
  });
});
