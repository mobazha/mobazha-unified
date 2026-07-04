import { isCommerceHttpError, type CommerceHttpErrorKind } from './http';

export const COMMERCE_LABEL_KEYS = {
  product: {
    actions: 'commerce.product.actions',
    addToCart: 'commerce.product.addToCart',
    buyNow: 'commerce.product.buyNow',
  },
  cart: {
    summary: 'commerce.cart.summary',
    items: 'commerce.cart.items',
    total: 'commerce.cart.total',
    checkout: 'commerce.cart.checkout',
  },
  checkout: {
    title: 'commerce.checkout.title',
    description: 'commerce.checkout.description',
    paymentRequested: 'commerce.checkout.paymentRequested',
    sendExactly: 'commerce.checkout.sendExactly',
    order: 'commerce.checkout.order',
    expires: 'commerce.checkout.expires',
    quantity: 'commerce.checkout.quantity',
    paymentMethod: 'commerce.checkout.paymentMethod',
    selectPaymentMethod: 'commerce.checkout.selectPaymentMethod',
    contactEmailOptional: 'commerce.checkout.contactEmailOptional',
    creatingOrder: 'commerce.checkout.creatingOrder',
    createOrder: 'commerce.checkout.createOrder',
    noItems: 'commerce.checkout.noItems',
  },
  errors: {
    http: 'commerce.error.http',
    network: 'commerce.error.network',
    timeout: 'commerce.error.timeout',
    aborted: 'commerce.error.aborted',
    invalidResponse: 'commerce.error.invalidResponse',
    unknown: 'commerce.error.unknown',
  },
} as const;

type NestedValue<T> = T extends string ? T : { [K in keyof T]: NestedValue<T[K]> }[keyof T];

export type CommerceLabelKey = NestedValue<typeof COMMERCE_LABEL_KEYS>;
export type CommerceLabelValues = Readonly<Record<string, string | number | undefined>>;

/** Host-owned adapter for i18n, branding and product-specific wording. */
export type CommerceLabelResolver = (key: CommerceLabelKey, values?: CommerceLabelValues) => string;

const ERROR_LABEL_KEYS: Record<CommerceHttpErrorKind, CommerceLabelKey> = {
  http: COMMERCE_LABEL_KEYS.errors.http,
  network: COMMERCE_LABEL_KEYS.errors.network,
  timeout: COMMERCE_LABEL_KEYS.errors.timeout,
  aborted: COMMERCE_LABEL_KEYS.errors.aborted,
  'invalid-response': COMMERCE_LABEL_KEYS.errors.invalidResponse,
};

/** Convert transport failures into stable label keys without leaking backend error text into UI. */
export function resolveCommerceErrorLabel(error: unknown, labels: CommerceLabelResolver): string {
  if (isCommerceHttpError(error)) {
    return labels(ERROR_LABEL_KEYS[error.kind], {
      requestId: error.requestId,
      status: error.status,
    });
  }
  return labels(COMMERCE_LABEL_KEYS.errors.unknown);
}
