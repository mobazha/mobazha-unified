import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CommerceCartSummary } from './cart';
import { CommerceProductActions } from './product';
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
