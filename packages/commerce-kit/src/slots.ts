export const COMMERCE_SLOTS = {
  STOREFRONT_HEADER_AFTER: 'storefront.header.after',
  STOREFRONT_FOOTER_BEFORE: 'storefront.footer.before',
  PRODUCT_DETAIL_ACTIONS_AFTER: 'product.detail.actions.after',
  CART_SUMMARY_AFTER: 'cart.summary.after',
  CHECKOUT_PAYMENT_METHODS_AFTER: 'checkout.payment-methods.after',
  ADMIN_DASHBOARD_STATUS_AFTER: 'admin.dashboard.status.after',
  ADMIN_SYSTEM_AFTER: 'admin.system.after',
  ADMIN_SETTINGS_AFTER: 'admin.settings.after',
} as const;

export type CommerceSlot = (typeof COMMERCE_SLOTS)[keyof typeof COMMERCE_SLOTS];
