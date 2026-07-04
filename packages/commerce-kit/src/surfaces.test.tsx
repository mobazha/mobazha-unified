import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CommerceCartSummary } from './cart';
import { CommerceProductActions } from './product';
import { CommerceStorefrontShell } from './storefront';

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
      <CommerceProductActions price="10 USD" onAddToCart={vi.fn()} onBuyNow={vi.fn()} />
    );
    const cart = renderToStaticMarkup(
      <CommerceCartSummary itemCount={2} total="20 USD" onCheckout={vi.fn()} />
    );

    expect(product).toContain('Add to cart');
    expect(product).toContain('Buy now');
    expect(cart).toContain('20 USD');
    expect(cart).toContain('Checkout');
  });
});
