/**
 * API 路径常量 — 按后端服务分组（兼容层）
 *
 * 基础路径由 apiPaths.generated.ts 自动生成（源自合并 OpenAPI spec）。
 * 本文件在生成路径之上叠加：
 *   - 向后兼容别名（如 ORDER → ORDERS_BY_ORDER_ID）
 *   - 带默认参数的函数（如 PROFILE_AVATAR size='medium'）
 *   - @deprecated 条目
 *   - 包含 query string 的自定义 helper
 *
 * 使用方式不变：
 *   import { NODE_API, HOSTING_API, SEARCH_API } from '../../config/apiPaths';
 *   const url = `${getGatewayUrl()}${NODE_API.PROFILES}`;
 *   const url = `${getPlatformUrl()}${HOSTING_API.MATRIX_CONFIG}`;
 *   const url = `${getSearchUrl()}${SEARCH_API.SEARCH_LISTINGS}`;
 */
import { NODE_API_PATHS, HOSTING_API_PATHS, SEARCH_API_PATHS } from './apiPaths.generated';

/** Backend settlement action path segment. */
export type SettlementActionKind = 'confirm' | 'cancel' | 'complete' | 'dispute-release';

// ============================================================
// 节点 API（mobazha，经 hosting 反向代理）
// 与 getGatewayUrl() 拼接（getGatewayUrl 已含 /v1 前缀）
// 后端注册：mobazha/internal/api/gateway.go → newV1Router()
// ============================================================
export const NODE_API = {
  ...NODE_API_PATHS,
  // Public, versioned product capability snapshot.
  RUNTIME_CONFIG: '/runtime-config',

  // --- Profiles ---
  PROFILES: '/profiles',
  PROFILE_AVATAR: (peerID: string, size: string = 'medium') => `/profiles/${peerID}/avatar/${size}`,
  PROFILE_HEADER: (peerID: string, size: string = 'large') => `/profiles/${peerID}/header/${size}`,
  PROFILES_BATCH: '/profiles/batch',
  PEER_ID: '/peerid',

  // --- Preferences ---
  PREFERENCES: '/preferences',
  PREFERENCES_CURRENCY: '/preferences/currency',

  // --- Store policy ---
  STORE_POLICY: '/store-policy',
  STORE_POLICY_MODERATORS: '/store-policy/moderators',
  STORE_POLICY_MODERATOR: (peerID: string) => `/store-policy/moderators/${peerID}`,
  STORE_POLICY_PUBLISHED: (peerID: string) => `/store-policy/${peerID}/published`,

  // --- Listings ---
  LISTINGS: '/listings',
  LISTING: (slug: string) => `/listings/${slug}`,
  LISTING_PEER: (peerID: string, slug: string) => `/listings/${peerID}/${slug}`,
  LISTINGS_INDEX: '/listings/index',
  LISTINGS_INDEX_PEER: (peerID: string) => `/listings/index/${peerID}`,
  LISTINGS_SUPPLY_SUMMARY: '/listings/supply-summary',

  // --- Ratings ---
  RATINGS_INDEX: '/ratings/index',
  RATINGS_INDEX_PEER: (peerID: string) => `/ratings/index/${peerID}`,
  RATINGS_INDEX_SLUG: (slug: string) => `/ratings/index/${slug}`,
  RATINGS_INDEX_PEER_SLUG: (peerID: string, slug: string) => `/ratings/index/${peerID}/${slug}`,
  RATINGS_BATCH: '/ratings/batch',

  // --- Orders ---
  PURCHASES: '/purchases',
  SALES: '/sales',
  ORDERS: '/orders',

  // --- Data export (DG-1.10 — "Your store, your data, your customers") ---
  // CSV/JSON downloads of vendor-side listings, sales, and aggregated buyer
  // lists. Frontend appends ?format=csv|json (default csv).
  EXPORTS_LISTINGS: '/exports/listings',
  EXPORTS_SALES: '/exports/sales',
  EXPORTS_CUSTOMERS: '/exports/customers',

  // --- Seller Affiliate (store-local source of truth) ---
  SELLER_AFFILIATE_PROGRAM: '/seller-affiliate/program',
  SELLER_AFFILIATE_CAPABILITIES: '/seller-affiliate/capabilities',
  SELLER_AFFILIATE_LINKS: '/seller-affiliate/links',
  SELLER_AFFILIATE_LINK_REVOKE: (linkID: string) =>
    `/seller-affiliate/links/${encodeURIComponent(linkID)}/revoke`,
  SELLER_AFFILIATE_LINK_REISSUE: (linkID: string) =>
    `/seller-affiliate/links/${encodeURIComponent(linkID)}/reissue`,
  SELLER_AFFILIATE_STATEMENTS_SELLER: '/seller-affiliate/statements/seller',

  // --- Vendor migration (DG-1.9 — "Storefront creators can leave with") ---
  // Single endpoint handles both dry-run preview and actual import via the
  // request body's `dryRun` flag. SaaS / Standalone only — Sovereign build
  // omits the handler entirely.
  LISTINGS_IMPORT_GUMROAD: '/listings/import/gumroad',
  ORDER: (orderId: string) => `/orders/${orderId}`,
  /** @deprecated Use ORDERS (POST /v1/orders) instead. '/purchase' does not exist in backend. */
  PURCHASE: '/orders',
  ORDERS_ESTIMATE: '/orders/estimate',
  ORDERS_CHECKOUT_BREAKDOWN: '/orders/checkout-breakdown',
  ORDERS_SUPPLY_QUOTE: '/orders/supply-quote',
  ORDER_CONFIRM: (orderId: string) => `/orders/${orderId}/confirm`,
  ORDER_SHIP: (orderId: string) => `/orders/${orderId}/ship`,
  ORDER_COMPLETE: (orderId: string) => `/orders/${orderId}/complete`,
  ORDER_CANCEL: (orderId: string) => `/orders/${orderId}/cancel`,
  ORDER_EXTEND_PROTECTION: (orderId: string) => `/orders/${orderId}/extend-protection`,
  ORDER_REFUND: (orderId: string) => `/orders/${orderId}/refund`,
  ORDER_REFUND_ADDRESS: (orderId: string) => `/orders/${orderId}/refund-address`,
  ORDER_PAYMENT: (orderId: string) => `/orders/${orderId}/payment`,
  ORDER_PAYMENT_SESSION: (orderId: string) => `/orders/${orderId}/payment-session`,
  ORDER_PAYMENT_SESSION_ONRAMP: (orderId: string) => `/orders/${orderId}/payment-session/onramp`,
  ORDER_PAYMENT_SESSION_ONRAMP_REFRESH: (orderId: string) =>
    `/orders/${orderId}/payment-session/onramp/refresh`,
  ORDER_PAYMENT_SELECTION_QUOTES: (orderId: string) =>
    `/orders/${orderId}/payment-selection-quotes`,
  ORDER_RATE: (orderId: string) => `/orders/${orderId}/rate`,
  ORDER_SPEND: (orderId: string) => `/orders/${orderId}/spend`,
  ORDER_PAYMENT_REMAINING: (orderId: string) => `/orders/${orderId}/payment/remaining`,
  ORDER_SETTLEMENT_ACTION: (orderId: string, action: SettlementActionKind) =>
    `/orders/${orderId}/settlement-actions/${action}`,
  ORDER_SETTLEMENT_ACTION_STATUS: (
    orderId: string,
    action: SettlementActionKind,
    actionId: string
  ) =>
    `/orders/${orderId}/settlement-actions/${action}/status?actionId=${encodeURIComponent(actionId)}`,
  // --- Disputes (orderID in URL) ---
  DISPUTE_OPEN: (orderId: string) => `/disputes/${orderId}/open`,
  DISPUTE_AFTER_SALE: (orderId: string) => `/disputes/${orderId}/after-sale`,
  DISPUTE_CLOSE: (orderId: string) => `/disputes/${orderId}/close`,
  DISPUTE_RELEASE: (orderId: string) => `/disputes/${orderId}/release`,
  DISPUTE_RELEASE_AFTER_TIMEOUT: (orderId: string) => `/disputes/${orderId}/release-after-timeout`,
  CASES: '/cases',
  CASE: (orderId: string) => `/cases/${orderId}`,

  // --- Notifications ---
  NOTIFICATIONS: '/notifications',
  NOTIFICATIONS_COUNT: '/notifications/count',
  NOTIFICATION_READ: (id: string) => `/notifications/${id}/read`,
  NOTIFICATIONS_READ: '/notifications/read',
  NOTIFICATIONS_BATCH: '/notifications/batch',

  // --- Notification Channels (Telegram, Discord, etc.) ---
  NOTIFICATION_CHANNELS: '/notifications/channels',
  NOTIFICATION_CHANNEL: (id: string) => `/notifications/channels/${id}`,
  NOTIFICATION_CHANNEL_TEST: (id: string) => `/notifications/channels/${id}/test`,
  NOTIFICATION_CHANNEL_TYPES: '/notifications/channel-types',
  NOTIFICATION_CHANNELS_DETECT_CHAT: '/notifications/channels/detect-chat',

  // --- Webhooks ---
  WEBHOOKS: '/webhooks',
  WEBHOOK: (id: string) => `/webhooks/${id}`,
  WEBHOOK_DELIVERIES: (id: string) => `/webhooks/${id}/deliveries`,
  WEBHOOK_TEST: (id: string) => `/webhooks/${id}/test`,

  // --- AI ---
  AI_GENERATE: '/ai/generate',
  AI_STATUS: '/ai/status',
  AI_CONFIG: '/settings/ai',
  AI_PROVIDERS: '/settings/ai/providers',
  AI_TEST_CONNECTION: '/settings/ai/test',
  AGENT_CHAT_SESSION: NODE_API_PATHS.AGENT_CHAT_BY_SESSION_ID,
  /** Smart product import — multipart ingest (full-service distributions only). */
  AGENT_PRODUCT_IMPORT_INGEST: '/agent/product-import/ingest',
  AGENT_PRODUCT_IMPORT_RUNS_ADVANCE: (runId: string) =>
    `/agent/product-import/runs/${encodeURIComponent(runId)}/advance`,
  AGENT_PRODUCT_IMPORT_RUNS_WORKBENCH: (runId: string) =>
    `/agent/product-import/runs/${encodeURIComponent(runId)}/workbench`,
  AGENT_PRODUCT_IMPORT_RUNS_APPROVALS: (runId: string) =>
    `/agent/product-import/runs/${encodeURIComponent(runId)}/approvals`,
  AGENT_PRODUCT_IMPORT_RUNS_APPROVAL_DECISIONS: (runId: string) =>
    `/agent/product-import/runs/${encodeURIComponent(runId)}/approval-decisions`,
  AGENT_PRODUCT_IMPORT_RUNS_APPROVAL_APPLICATIONS: (runId: string) =>
    `/agent/product-import/runs/${encodeURIComponent(runId)}/approval-applications`,
  AGENT_ARTIFACT: (artifactId: string) => `/agent/artifacts/${encodeURIComponent(artifactId)}`,
  AGENT_ARTIFACT_CONTENT: (artifactId: string) =>
    `/agent/artifacts/${encodeURIComponent(artifactId)}/content`,
  AGENT_ARTIFACTS_APPROVAL: (artifactId: string) =>
    `/agent/artifacts/${encodeURIComponent(artifactId)}/approval`,

  // --- Social / Follow ---
  FOLLOW: (peerID: string) => `/following/${peerID}`,
  FOLLOWING: '/following',
  FOLLOWING_PEER: (peerID: string) => `/following/${peerID}`,
  FOLLOWERS: '/followers',
  FOLLOWERS_PEER: (peerID: string) => `/followers/${peerID}`,
  FOLLOWERS_CHECK: (peerID: string) => `/followers/${peerID}/check`,

  // --- Moderator (self) ---
  SELF_MODERATOR: '/moderators',

  // --- Cart ---
  CARTS: '/carts',
  CARTS_COUNT: '/carts/count',
  CART_ITEMS: (peerID: string) => `/carts/${peerID}/items`,

  // --- Media ---
  MEDIA_PRODUCT_IMAGES: '/media/product-images',
  MEDIA_IMAGES: '/media/images',
  MEDIA_IMAGE: (hash: string) => `/media/images/${hash}`,
  MEDIA_AVATAR: '/media/avatar',
  MEDIA_HEADER: '/media/header',

  // --- Wallet ---
  WALLET_BALANCE: (coin: string) => `/wallet/balance/${coin}`,
  WALLET_BALANCE_ALL: '/wallet/balance',
  WALLET_TRANSACTIONS: (coin: string) => `/wallet/transactions/${coin}`,
  WALLET_ADDRESS: (coin: string) => `/wallet/address/${coin}`,
  WALLET_ESTIMATE_FEE: (coin: string) => `/wallet/estimate-fee/${coin}`,
  WALLET_SPEND: '/wallet/spend',
  WALLET_STATUS: '/wallet/status',
  WALLET_MNEMONIC: '/wallet/mnemonic',
  WALLET_RESTORE: '/wallet/restore',
  WALLET_VALIDATE: (coin: string) => `/wallet/validate/${coin}`,
  WALLET_RECEIVING_ACCOUNTS: '/wallet/receiving-accounts',
  EXCHANGE_RATES: '/exchange-rates',
  /** @deprecated Use WALLET_RECEIVING_ACCOUNTS instead. Old paths don't exist in backend. */
  RECEIVE_ADDRESSES: '/wallet/receiving-accounts',
  /** @deprecated Use WALLET_RECEIVING_ACCOUNTS with POST instead. */
  RECEIVE_ADDRESS: '/wallet/receiving-accounts',
  /** @deprecated Backend uses id-based DELETE /wallet/receiving-accounts/{id}, not coin-based. */
  RECEIVE_ADDRESS_COIN: (coin: string) => `/wallet/receiving-accounts/${coin}`,

  // --- Chat (node-side Matrix, mautrix-go backed) ---
  CHAT_SETTINGS: '/chat/settings',
  CHAT_VERIFICATION_REQUEST: '/chat/verification/request',
  CHAT_VERIFICATION_ACCEPT: (txnId: string) => `/chat/verification/${txnId}/accept`,
  CHAT_VERIFICATION_START_SAS: (txnId: string) => `/chat/verification/${txnId}/start-sas`,
  CHAT_VERIFICATION_CONFIRM: (txnId: string) => `/chat/verification/${txnId}/confirm`,
  CHAT_VERIFICATION_CANCEL: (txnId: string) => `/chat/verification/${txnId}/cancel`,
  CHAT_STATUS: '/chat/status',
  CHAT_ROOMS: '/chat/rooms',
  CHAT_INVITES: '/chat/invites',
  CHAT_ROOM_JOIN: (roomId: string) => `/chat/rooms/${encodeURIComponent(roomId)}/join`,
  CHAT_ROOM_LEAVE: (roomId: string) => `/chat/rooms/${encodeURIComponent(roomId)}/leave`,
  CHAT_ROOM_MESSAGES: (roomId: string) => `/chat/rooms/${encodeURIComponent(roomId)}/messages`,
  CHAT_ROOM_MESSAGE: (roomId: string, eventId: string) =>
    `/chat/rooms/${encodeURIComponent(roomId)}/messages/${encodeURIComponent(eventId)}`,
  CHAT_ROOM_REACTION: (roomId: string, eventId: string) =>
    `/chat/rooms/${encodeURIComponent(roomId)}/messages/${encodeURIComponent(eventId)}/reactions`,
  CHAT_ROOM_TYPING: (roomId: string) => `/chat/rooms/${encodeURIComponent(roomId)}/typing`,
  CHAT_ROOM_READ: (roomId: string) => `/chat/rooms/${encodeURIComponent(roomId)}/read`,
  CHAT_ROOM_MEMBERS: (roomId: string) => `/chat/rooms/${encodeURIComponent(roomId)}/members`,
  CHAT_ROOM_INVITE: (roomId: string) => `/chat/rooms/${encodeURIComponent(roomId)}/invite`,
  CHAT_ROOM_KICK: (roomId: string) => `/chat/rooms/${encodeURIComponent(roomId)}/kick`,
  CHAT_ROOM_SETTINGS: (roomId: string) => `/chat/rooms/${encodeURIComponent(roomId)}/settings`,
  CHAT_MEDIA_UPLOAD: '/chat/media/upload',
  CHAT_MEDIA: (serverName: string, mediaId: string) => `/chat/media/${serverName}/${mediaId}`,
  CHAT_USER_BLOCK: (userId: string) => `/chat/users/${encodeURIComponent(userId)}/block`,
  CHAT_PRESENCE: '/chat/presence',

  // --- Shipping ---
  SHIPPING_PROFILES: '/shipping/profiles',
  SHIPPING_PROFILE: (profileID: string) => `/shipping/profiles/${profileID}`,
  SHIPPING_PROFILE_SET_DEFAULT: (profileID: string) =>
    `/shipping/profiles/${profileID}/set-default`,
  SHIPPING_PROFILE_LISTINGS: (profileID: string) => `/shipping/profiles/${profileID}/listings`,
  SHIPPING_LOCATIONS: '/shipping/locations',
  SHIPPING_LOCATION: (locationID: string) => `/shipping/locations/${locationID}`,
  SHIPPING_STALE_LISTINGS: '/shipping/stale-listings',
  SHIPPING_REFRESH_SNAPSHOTS: '/shipping/refresh-snapshots',

  // --- Discounts ---
  DISCOUNTS: '/discounts',
  DISCOUNT: (discountID: string) => `/discounts/${discountID}`,
  DISCOUNT_CODES: (discountID: string) => `/discounts/${discountID}/codes`,
  DISCOUNT_CODE: (discountID: string, codeID: string) => `/discounts/${discountID}/codes/${codeID}`,
  DISCOUNT_REDEMPTIONS: (discountID: string) => `/discounts/${discountID}/redemptions`,
  DISCOUNTS_VALIDATE: (peerID: string) => `/discounts/${peerID}/validate`,
  DISCOUNTS_APPLICABLE: (peerID: string) => `/discounts/${peerID}/applicable`,
  DISCOUNTS_CALCULATE: (peerID: string) => `/discounts/${peerID}/calculate`,

  // --- Collections ---
  COLLECTIONS: '/collections',
  COLLECTION: (collectionID: string) => `/collections/${collectionID}`,
  COLLECTION_PRODUCTS: (collectionID: string) => `/collections/${collectionID}/products`,
  COLLECTION_PRODUCT: (collectionID: string, slug: string) =>
    `/collections/${collectionID}/products/${slug}`,
  COLLECTION_PRODUCTS_REORDER: (collectionID: string) =>
    `/collections/${collectionID}/products/reorder`,
  COLLECTIONS_PUBLISHED: (peerID: string) => `/collections/${peerID}/published`,
  COLLECTION_PUBLISHED: (peerID: string, collectionID: string) =>
    `/collections/${peerID}/published/${collectionID}`,

  // --- Wishlists ---
  WISHLISTS: '/wishlists',
  WISHLIST_ITEM: (peerID: string, slug: string) => `/wishlists/${peerID}/${slug}`,

  // --- Payment Methods (unified public endpoint) ---
  PAYMENT_METHODS_PUBLIC: (peerID: string) => `/payment-methods/${peerID}`,

  // --- Fiat Payments ---
  FIAT_PROVIDERS: '/fiat/providers',
  FIAT_PROVIDERS_PUBLIC: (peerID: string) => `/fiat/${peerID}/providers`,
  FIAT_PROVIDER_STATUS: (provider: string) => `/fiat/${provider}/status`,
  FIAT_CREATE_PAYMENT: (peerID: string, provider: string) => `/fiat/${peerID}/${provider}/payments`,
  FIAT_CAPTURE_PAYMENT: (peerID: string | undefined, provider: string, sessionID: string) =>
    peerID
      ? `/fiat/${peerID}/${provider}/payments/${sessionID}/capture`
      : `/fiat/${provider}/payments/${sessionID}/capture`,
  FIAT_REFUND_PAYMENT: (provider: string, paymentID: string) =>
    `/fiat/${provider}/payments/${paymentID}/refund`,
  FIAT_PROVIDER_CONFIG: (provider: string) => `/fiat/${provider}/config`,
  FIAT_PROVIDER_VERIFY: (provider: string) => `/fiat/${provider}/verify`,
  FIAT_SETUP_WEBHOOK: (provider: string) => `/fiat/${provider}/setup-webhook`,

  // --- Storefront (PG-201) ---
  SETTINGS_STOREFRONT: '/settings/storefront',
  SETTINGS_STOREFRONT_PEER: (peerID: string) => `/settings/storefront/${peerID}`,

  // --- Analytics (visitor tracking) ---
  ANALYTICS_EVENTS: (peerID: string) => `/analytics/${peerID}/events`,
  ANALYTICS_STATS: '/analytics/stats',

  // --- System ---
  SYSTEM_SETUP: '/system/setup',
  SYSTEM_CONNECT_PLATFORM: '/system/connect-platform',
  SYSTEM_REFRESH_PLATFORM_CREDENTIAL: '/system/refresh-platform-credential',
  SYSTEM_CLAIM_STORE: '/system/claim-store',
  SYSTEM_HEALTH: '/system/health',
  SYSTEM_RPC_STATUS: '/system/rpc-status',
  SYSTEM_SALES_CHANNELS: '/system/sales-channels',
  SYSTEM_LOGS: '/system/logs',
  SYSTEM_INFO: '/system/info',
  SYSTEM_NETWORK: '/system/network',
  SYSTEM_DOCTOR: '/system/doctor',
  SYSTEM_DIAGNOSTICS: '/system/diagnostics',
  SYSTEM_DOMAIN: '/system/domain',
  SYSTEM_UPDATE_TRIGGER: '/system/update-trigger',
  SYSTEM_UPDATE_CONFIG: '/system/update-config',

  // --- Auth Tokens (standalone local token management) ---
  AUTH_TOKENS: '/auth/tokens',
  AUTH_TOKEN: (tokenID: string) => `/auth/tokens/${tokenID}`,
  AUTH_SCOPES: '/auth/scopes',
  AUTH_IDENTITY: '/auth/identity',

  // --- MCP Auto-Connect (standalone only) ---
  SYSTEM_MCP_CAPABILITY: '/system/mcp/capability',
  SYSTEM_MCP_CONNECT: '/system/mcp/connect',
  SYSTEM_MCP_CONNECT_CLIENT: (client: string) => `/system/mcp/connect/${client}`,
  SYSTEM_MCP_CLIENTS: '/system/mcp/clients',
  SYSTEM_MCP_DISCONNECT: '/system/mcp/disconnect',
  SYSTEM_MCP_DISCONNECT_CLIENT: (client: string) => `/system/mcp/disconnect/${client}`,

  // --- Guest Checkout (anonymous direct-payment orders) ---
  GUEST_ORDERS: '/guest/orders',
  GUEST_ORDERS_QUOTE: '/guest/orders/quote',
  GUEST_ORDER: (token: string) => `/guest/orders/${encodeURIComponent(token)}`,
  GUEST_ORDER_SHIP: (token: string) => `/guest/orders/${encodeURIComponent(token)}/ship`,
  GUEST_ORDER_COMPLETE: (token: string) => `/guest/orders/${encodeURIComponent(token)}/complete`,
  // PM-3a: Admin-only full order detail (includes shipping address ciphertext)
  GUEST_ORDER_ADMIN_DETAIL: (token: string) => `/guest/orders/${encodeURIComponent(token)}/detail`,
  GUEST_CHECKOUT_SETTINGS: '/settings/guest-checkout',

  /** Edition capability manifest (safe fallback when absent) */
  SETTINGS_PAYMENT_POLICY: '/settings/payment-policy',
  // PM-3a: Vendor PGP public key (public endpoint for buyer encryption)
  SETTINGS_PGP_KEY: '/settings/pgp-key',
  SETTINGS_PGP_KEY_VAULT: '/settings/pgp-key/vault',

  // --- Fulfillment (Supply Chain) ---
  FULFILLMENT_PROVIDERS: '/fulfillment/providers',
  FULFILLMENT_CONNECT: (providerID: string) => `/fulfillment/${providerID}/connect`,
  FULFILLMENT_DISCONNECT: (providerID: string) => `/fulfillment/${providerID}/disconnect`,
  FULFILLMENT_STATUS: (providerID: string) => `/fulfillment/${providerID}/status`,
  FULFILLMENT_CATALOG: (providerID: string) => `/fulfillment/${providerID}/catalog`,
  FULFILLMENT_CATALOG_PRODUCT: (providerID: string, productID: string) =>
    `/fulfillment/${providerID}/catalog/${productID}`,
  FULFILLMENT_IMPORT: (providerID: string) => `/fulfillment/${providerID}/import`,
  FULFILLMENT_SYNCED_PRODUCTS: (providerID: string) => `/fulfillment/${providerID}/synced-products`,
  FULFILLMENT_SYNC_PRODUCT: (slug: string) => `/fulfillment/products/${slug}/sync`,
  FULFILLMENT_ORDER_STATUS: (orderID: string) => `/fulfillment/orders/${orderID}/status`,
  FULFILLMENT_STORE_PRODUCTS: (providerID: string) => `/fulfillment/${providerID}/store-products`,
  FULFILLMENT_STORE_PRODUCT: (providerID: string, syncProductID: string) =>
    `/fulfillment/${providerID}/store-products/${syncProductID}`,

  // --- Fulfillment Alerts & Rules (FF-4) ---
  FULFILLMENT_ALERTS: '/fulfillment/alerts',
  FULFILLMENT_ALERT: (alertID: string) => `/fulfillment/alerts/${alertID}`,
  FULFILLMENT_RULES: '/fulfillment/rules',
  FULFILLMENT_RULE: (ruleID: string) => `/fulfillment/rules/${ruleID}`,

  // --- Digital Assets — Seller management (Phase 1.0 Core MVP) ---
  // Path helpers accept RAW (unencoded) param values. encodeURIComponent is
  // applied internally so callers don't pre-encode — this matches the
  // contract used by apiPaths.generated.ts. orderID for guest checkout
  // (gst_<64-hex>) is safe either way; including it here keeps the helper
  // contract uniform across all params.
  DIGITAL_ASSETS: '/digital-assets',
  DIGITAL_ASSET: (assetID: string) => `/digital-assets/${encodeURIComponent(assetID)}`,
  DIGITAL_ASSET_UPLOAD_STREAM: '/digital-assets/upload-stream',
  DIGITAL_ASSET_CREATE_LINK: '/digital-assets/link',
  DIGITAL_ASSET_CREATE_LICENSE_KEY: '/digital-assets/license-key',
  DIGITAL_ASSET_LICENSE_KEYS: '/digital-assets/license-keys',
  DIGITAL_ASSET_LICENSE_KEY_STATS: '/digital-assets/license-keys/stats',
  DIGITAL_ASSET_LICENSE_KEY_REVOKE: (keyID: string) =>
    `/digital-assets/license-keys/${encodeURIComponent(keyID)}/revoke`,

  // --- Digital Assets — Buyer Portal (guest token or authenticated buyer/admin) ---
  ORDER_DIGITAL_ASSETS: (orderID: string) =>
    `/orders/${encodeURIComponent(orderID)}/digital-assets`,
  ORDER_DIGITAL_DELIVERY_STATUS: (orderID: string) =>
    `/orders/${encodeURIComponent(orderID)}/digital-delivery`,
  ORDER_DIGITAL_DELIVERY_RETRY: (orderID: string) =>
    `/orders/${encodeURIComponent(orderID)}/digital-delivery/retry`,
  ORDER_DIGITAL_DOWNLOAD: (orderID: string) =>
    `/orders/${encodeURIComponent(orderID)}/digital-download`,

  // --- Digital Assets — Public license validation (per-store) ---
  LICENSE_VALIDATE: (storeID: string) => `/stores/${encodeURIComponent(storeID)}/licenses/validate`,
  LICENSE_ACTIVATE: (storeID: string) => `/stores/${encodeURIComponent(storeID)}/licenses/activate`,
  LICENSE_DEACTIVATE: (storeID: string) =>
    `/stores/${encodeURIComponent(storeID)}/licenses/deactivate`,

  // --- Misc (deprecated — no backend routes exist) ---
  /** @deprecated Backend has no /resendordermessage route. Feature removed. */
  RESEND_ORDER_MESSAGE: '/resendordermessage',
  /** @deprecated Backend has no /markorderasread route. Feature removed. */
  MARK_ORDER_AS_READ: '/markorderasread',
} as const;

// ============================================================
// Hosting API（mobazha_hosting 平台路由）
// 与 getPlatformUrl() 或 getBaseUrl() 拼接
// 后端注册：mobazha_hosting/api/gateway.go → newHostingRouter()
// ============================================================
/** `POST .../mini-app-signin` 查询串中与 initData 并列的可选参数（选择卖家 Bot Token 验签），勿与 Telegram 内置字段混淆 */
export const HOSTING_TELEGRAM_MINI_APP_SIGNIN_QUERY = {
  STORE_PEER_ID: 'store_peer_id',
  PEER_ID: 'peer_id',
  STORE_HOST: 'store_host',
  STORE_SHORT_CODE: 'store_short_code',
} as const;

export const HOSTING_API = {
  ...HOSTING_API_PATHS,
  // --- Deal Link orders + close (seller view; newer than the merged OpenAPI spec) ---
  DEAL_LINKS_ORDERS: (id: string) => `/platform/v1/deal-links/${encodeURIComponent(id)}/orders`,
  DEAL_LINKS_CLOSE: (id: string) => `/platform/v1/deal-links/${encodeURIComponent(id)}/close`,
  // Seller-authenticated authoritative fee quote for an active link (201 created,
  // 200 when reusing the current unexpired quote).
  DEAL_LINKS_FEE_QUOTES: (id: string) =>
    `/platform/v1/deal-links/${encodeURIComponent(id)}/fee-quotes`,
  // --- Seller Affiliate (automation-first; no review or settlement queue) ---
  SELLER_AFFILIATE_PROGRAM: '/platform/v1/seller-affiliate/program',
  SELLER_AFFILIATE_CAPABILITIES: '/platform/v1/seller-affiliate/capabilities',
  SELLER_AFFILIATE_PROGRAM_LINKS: (id: string) =>
    `/platform/v1/seller-affiliate/programs/${encodeURIComponent(id)}/links`,
  SELLER_AFFILIATE_PROGRAM_LINK: (id: string, linkID: string) =>
    `/platform/v1/seller-affiliate/programs/${encodeURIComponent(id)}/links/${encodeURIComponent(linkID)}`,
  PUBLIC_SELLER_AFFILIATE_LINK: (token: string) =>
    `/platform/v1/public/seller-affiliate-links/${encodeURIComponent(token)}`,
  PUBLIC_SELLER_AFFILIATE_SESSIONS: (token: string) =>
    `/platform/v1/public/seller-affiliate-links/${encodeURIComponent(token)}/sessions`,
  SELLER_AFFILIATE_STATEMENTS_SELLER: '/platform/v1/seller-affiliate/statements/seller',
  SELLER_AFFILIATE_STATEMENTS_PROMOTER: '/platform/v1/seller-affiliate/statements/promoter',

  // --- Auth ---
  AUTH_SIGNIN: '/platform/v1/auth/signin',
  AUTH_TELEGRAM_SIGNIN: '/platform/v1/auth/telegram/signin',
  AUTH_TELEGRAM_MINI_APP_SIGNIN: '/platform/v1/auth/telegram/mini-app-signin',
  AUTH_TELEGRAM_CHECK_MINI_APP_USER: '/platform/v1/auth/telegram/check-mini-app-user',
  AUTH_DISCORD_MINI_APP_SIGNIN: '/platform/v1/auth/discord/mini-app-signin',
  AUTH_DISCORD_OAUTH2_TOKEN: '/platform/v1/auth/discord/oauth2-token',
  AUTH_DISCORD_CHECK_USER: '/platform/v1/auth/discord/check-user',
  AUTH_DISCORD_OAUTH_CALLBACK: '/platform/v1/auth/discord/oauth-callback',

  // --- Mini App Binding ---
  AUTH_TELEGRAM_BIND_START: '/platform/v1/auth/telegram/bind-start',
  AUTH_TELEGRAM_BIND_RESULT: '/platform/v1/auth/telegram/bind-result',

  // --- Accounts ---
  ACCOUNTS_ME: '/platform/v1/accounts/me',
  ACCOUNTS_LINKED: '/platform/v1/accounts/linked',
  ACCOUNTS_UNLINK: '/platform/v1/accounts/unlink',
  ACCOUNTS_LINK_CONFIG: '/platform/v1/accounts/link/config',
  ACCOUNTS_LINK_TELEGRAM: '/platform/v1/accounts/link/telegram',
  ACCOUNTS_LINK_URL: '/platform/v1/accounts/link-url',
  ACCOUNTS_LINK_CALLBACK: '/platform/v1/accounts/link-callback',

  // --- Server ---
  SERVER_INFO: '/platform/v1/server/info',

  // --- IPNS ---
  IPNS: '/platform/v1/ipns',
  IPNS_PEER: (peerID: string) => `/platform/v1/ipns/${peerID}`,

  // --- Stream ---
  STREAM_AUTH: '/platform/v1/stream/auth',

  // --- Integrations ---
  INTEGRATIONS_TELEGRAM_WEBHOOK: '/platform/v1/integrations/telegram/webhook',

  // --- Relay ---
  RELAY_EXECUTE: '/platform/v1/relay/execute',
  RELAY_STATUS: '/platform/v1/relay/status',

  // --- Matrix (hosting-level, 集中式注册/管理) ---
  MATRIX_CONFIG: '/platform/v1/matrix/config',
  MATRIX_PEER_ID: '/platform/v1/matrix/peer-id',
  MATRIX_STORE_CREATE_SPACE: '/platform/v1/matrix/store/spaces',
  MATRIX_STORE_INVITE: '/platform/v1/matrix/store/invite',
  MATRIX_STORE_KICK: '/platform/v1/matrix/store/kick',

  // --- Moderators ---
  MODERATOR: (id: string) => `/platform/v1/moderators/${id}`,
  MODERATOR_BY_PEER: (peerID: string) => `/platform/v1/moderators/peer/${peerID}`,
  MODERATORS_RECOMMENDED: '/platform/v1/moderators/recommended',
  MODERATOR_REVIEWS: (id: string) => `/platform/v1/moderators/${id}/reviews`,
  MODERATORS_REGISTER: '/platform/v1/moderators/register',
  MODERATORS_ME: '/platform/v1/moderators/me',

  // --- Disputes (hosting-level) ---
  DISPUTES: '/platform/v1/disputes',
  DISPUTE: (id: string) => `/platform/v1/disputes/${id}`,
  DISPUTES_ME: '/platform/v1/disputes/me',
  DISPUTE_RESPOND: (id: string) => `/platform/v1/disputes/${id}/respond`,
  DISPUTE_EVIDENCE: (id: string) => `/platform/v1/disputes/${id}/evidence`,
  DISPUTE_RESOLVE: (id: string) => `/platform/v1/disputes/${id}/resolve`,

  // --- User Groups ---
  USER_GROUPS: '/platform/v1/user-groups',
  USER_GROUP: (id: string) => `/platform/v1/user-groups/${id}`,
  USER_GROUP_MEMBERS: (id: string) => `/platform/v1/user-groups/${id}/members`,
  USER_GROUP_MEMBERS_BATCH: (id: string) => `/platform/v1/user-groups/${id}/members/batch`,
  USER_GROUP_MEMBER: (groupId: string, memberId: string) =>
    `/platform/v1/user-groups/${groupId}/members/${memberId}`,

  // --- Product Groups ---
  PRODUCT_GROUPS: '/platform/v1/product-groups',
  PRODUCT_GROUP: (id: string) => `/platform/v1/product-groups/${id}`,
  PRODUCT_GROUP_ITEMS: (id: string) => `/platform/v1/product-groups/${id}/items`,
  PRODUCT_GROUP_ITEM: (groupId: string, slug: string) =>
    `/platform/v1/product-groups/${groupId}/items/${slug}`,
  PRODUCT_GROUP_AUTHORIZATIONS: (id: string) => `/platform/v1/product-groups/${id}/authorizations`,
  PRODUCT_GROUP_AUTHORIZATION: (groupId: string, authId: string) =>
    `/platform/v1/product-groups/${groupId}/authorizations/${authId}`,

  // --- Store Access ---
  STORE_ACCESS_REQUESTS: '/platform/v1/store-access-requests',
  STORE_ACCESS_REQUEST: (id: string) => `/platform/v1/store-access-requests/${id}`,
  STORE_ACCESS_CHECK: '/platform/v1/store-access/check',
  STORE_ACCESS_SETTINGS: '/platform/v1/store-access-settings',
  STORE_ACCESS_LIST: '/platform/v1/store-access-list',

  // --- Marketplaces ---
  MARKETPLACES: '/platform/v1/marketplaces',
  MARKETPLACE: (id: string) => `/platform/v1/marketplaces/${id}`,
  MARKETPLACE_PREVIEW: (id: string) => `/platform/v1/marketplaces/${id}/preview`,
  MARKETPLACE_PUBLISH: (id: string) => `/platform/v1/marketplaces/${id}/publish`,
  MARKETPLACE_SUSPEND: (id: string) => `/platform/v1/marketplaces/${id}/suspend`,
  MARKETPLACES_MINE: '/platform/v1/marketplaces/mine',
  MARKETPLACE_CONFIG: (id: string) => `/platform/v1/marketplaces/${id}/config`,
  MARKETPLACE_CONFIG_CURRENT: '/platform/v1/marketplaces/current/config',
  MARKETPLACE_LINK: (id: string) => `/platform/v1/marketplaces/${id}/link`,
  MARKETPLACE_CUSTOM_DOMAIN_VERIFY: (id: string) =>
    `/platform/v1/marketplaces/${id}/domains/custom/verify`,
  MARKETPLACE_SELLERS: (id: string) => `/platform/v1/marketplaces/${id}/sellers`,
  MARKETPLACE_SELLER_RESOLVE: (id: string) => `/platform/v1/marketplaces/${id}/sellers/resolve`,
  MARKETPLACE_SELLER_INVITE: (id: string) => `/platform/v1/marketplaces/${id}/sellers/invite`,
  MARKETPLACE_SELLER: (marketplaceId: string, peerID: string) =>
    `/platform/v1/marketplaces/${marketplaceId}/sellers/${encodeURIComponent(peerID)}`,
  MARKETPLACE_SELLER_ACCEPT: (marketplaceId: string, peerID: string) =>
    `/platform/v1/marketplaces/${marketplaceId}/sellers/${encodeURIComponent(peerID)}/accept`,
  MARKETPLACE_SELLER_REVIEW_EVENTS: (marketplaceId: string) =>
    `/platform/v1/marketplaces/${marketplaceId}/seller-review-events`,
  MARKETPLACE_MEMBERSHIPS_MINE: '/platform/v1/marketplace-memberships/mine',
  MARKETPLACE_MEMBERSHIPS_REVIEW_EVENTS: '/platform/v1/marketplace-memberships/review-events',
  MARKETPLACE_MEMBERSHIPS_REVIEW_EVENTS_READ_ALL:
    '/platform/v1/marketplace-memberships/review-events/read-all',
  MARKETPLACE_MEMBERSHIP_REVIEW_EVENTS: (marketplaceId: string) =>
    `/platform/v1/marketplace-memberships/${marketplaceId}/review-events`,
  MARKETPLACE_MEMBERSHIP_REVIEW_EVENT_READ: (marketplaceId: string, eventId: string | number) =>
    `/platform/v1/marketplace-memberships/${marketplaceId}/review-events/${encodeURIComponent(String(eventId))}/read`,
  MARKETPLACE_MEMBERSHIP_DECLINE: (marketplaceId: string) =>
    `/platform/v1/marketplace-memberships/${marketplaceId}/decline`,
  MARKETPLACE_MEMBERSHIP_LEAVE: (marketplaceId: string) =>
    `/platform/v1/marketplace-memberships/${marketplaceId}/leave`,
  PUBLIC_MARKETPLACES: '/platform/v1/public-marketplaces',
  PUBLIC_MARKETPLACE_DETAIL: (identifier: string) =>
    `/platform/v1/public-marketplaces/${encodeURIComponent(identifier)}`,
  PUBLIC_MARKETPLACE_SELLER_APPLICATIONS: (identifier: string) =>
    `/platform/v1/public-marketplaces/${encodeURIComponent(identifier)}/seller-applications`,
  PUBLIC_MARKETPLACE_SELLER_APPLICATION_MINE: (identifier: string) =>
    `/platform/v1/public-marketplaces/${encodeURIComponent(identifier)}/seller-applications/mine`,
  PUBLIC_MARKETPLACE_ATTRIBUTION_EVENTS: (identifier: string) =>
    `/platform/v1/public-marketplaces/${encodeURIComponent(identifier)}/attribution-events`,
  MARKETPLACE_ATTRIBUTION_SUMMARY: (id: string) =>
    `/platform/v1/marketplaces/${encodeURIComponent(id)}/attribution-summary`,
  MARKETPLACE_CURATION: (id: string) =>
    `/platform/v1/marketplaces/${encodeURIComponent(id)}/curation`,
  MARKETPLACE_CURATION_CANDIDATES: (id: string) =>
    `/platform/v1/marketplaces/${encodeURIComponent(id)}/curation/candidates`,
  MARKETPLACE_CURATION_REORDER: (id: string) =>
    `/platform/v1/marketplaces/${encodeURIComponent(id)}/curation/reorder`,
  MARKETPLACE_CURATION_ITEM: (id: string, itemID: number | string) =>
    `/platform/v1/marketplaces/${encodeURIComponent(id)}/curation/${encodeURIComponent(String(itemID))}`,
  COMMUNITY_MARKETPLACES_BY_PLATFORM: (platform: string) =>
    `/platform/v1/community-marketplaces/${encodeURIComponent(platform)}`,
  COMMUNITY_MARKETPLACES_VERIFY_MEMBER: (platform: string, instanceId: string) =>
    `/platform/v1/community-marketplaces/${encodeURIComponent(platform)}/${encodeURIComponent(instanceId)}/verify-member`,
  COMMUNITY_MARKETPLACES_TELEGRAM_VERIFY_MEMBER: (instanceId: string) =>
    `/platform/v1/community-marketplaces/telegram/${encodeURIComponent(instanceId)}/verify-member`,
  COMMUNITY_MARKETPLACES_DISCORD_VERIFY_MEMBER: (instanceId: string) =>
    `/platform/v1/community-marketplaces/discord/${encodeURIComponent(instanceId)}/verify-member`,
  COMMUNITY_MARKETPLACE_PLATFORM_LISTINGS: (platform: string, instanceId: string) =>
    `/platform/v1/community-marketplaces/${platform}/${instanceId}/listings`,
  COMMUNITY_MARKETPLACE_PLATFORM_SELLERS: (platform: string, instanceId: string) =>
    `/platform/v1/community-marketplaces/${platform}/${instanceId}/sellers`,
  COMMUNITY_MARKETPLACE_PLATFORM_SELLERS_APPLY: (platform: string, instanceId: string) =>
    `/platform/v1/community-marketplaces/${platform}/${instanceId}/sellers/apply`,
  COMMUNITY_MARKETPLACE_PLATFORM_SELLER_REVIEW: (
    platform: string,
    instanceId: string,
    sellerId: string
  ) => `/platform/v1/community-marketplaces/${platform}/${instanceId}/sellers/${sellerId}/review`,
  COMMUNITY_MARKETPLACE_PLATFORM_CHECK_ADMIN: (platform: string, instanceId: string) =>
    `/platform/v1/community-marketplaces/${platform}/${instanceId}/check-admin`,
  COMMUNITY_MARKETPLACE_GROUPS: '/platform/v1/community-marketplaces/groups',
  COMMUNITY_MARKETPLACE_PUBLIC_DETAIL: (identifier: string) =>
    `/platform/v1/community-marketplaces/public/${encodeURIComponent(identifier)}`,
  // --- Auth Tokens (MCP / API) ---
  AUTH_TOKENS: '/platform/v1/auth/tokens',
  AUTH_TOKEN: (tokenID: string) => `/platform/v1/auth/tokens/${tokenID}`,
  AUTH_SCOPES: '/platform/v1/auth/scopes',
  AUTH_IDENTITY: '/platform/v1/auth/identity',

  // --- Fiat Payment Onboarding (SaaS) ---
  FIAT_ONBOARDING_START: (provider: string) => `/platform/v1/fiat/providers/${provider}/onboarding`,
  FIAT_ONBOARDING_STATUS: (provider: string) => `/platform/v1/fiat/providers/${provider}/status`,
  FIAT_ONBOARDING_CONNECTION: (provider: string) =>
    `/platform/v1/fiat/providers/${provider}/connection`,

  // --- Sales Channels: Store Links ---
  STORE_LINKS: '/platform/v1/store-links',
  STORE_LINKS_RESOLVE: (shortCode: string) => `/platform/v1/store-links/resolve/${shortCode}`,
  STORE_LINKS_REGENERATE: '/platform/v1/store-links/regenerate',

  // --- Store Branded Domains ---
  STORE_DOMAIN: (peerID: string) => `/platform/v1/stores/${peerID}/domain`,
  STORE_DOMAIN_CHECK: '/platform/v1/store-domains/check',

  // --- Sales Channels: Store Bots ---
  STORE_BOTS: '/platform/v1/store-bots',
  // MS2b.2 Wave 4 — 诊断 / 修复
  STORE_BOTS_WEBHOOK_STATUS: '/platform/v1/store-bots/webhook-status',
  STORE_BOTS_REPAIR_WEBHOOK: '/platform/v1/store-bots/repair-webhook',
  STORE_BOTS_SYNC_MENU_BUTTON: '/platform/v1/store-bots/sync-menu-button',

  // --- Multi-Store (Phase MS1) ---
  // Canonical MS1.1 endpoint: aggregates SaaS + standalone stores a user manages.
  STORES_MY: '/platform/v1/stores/my',
  // Legacy alias (keeps pre-MS callers compiling). Backend routes both to the
  // same handler — remove after confirming no in-tree usage remains.
  STORES_MY_STORES: '/platform/v1/stores/my-stores',
  // MS1.3 — user-initiated claim of a standalone store.
  STORES_CLAIM: '/platform/v1/stores/claim',
  // MS1.4 — public owner-reputation aggregate by peer_id.
  STORES_OWNER_REPUTATION: '/platform/v1/stores/owner-reputation',
  STORES_BIND_START: '/platform/v1/stores/bind/start',
  STORES_BIND_STATUS: '/platform/v1/stores/bind/status',
  STORES_STATUS: (peerID: string) => `/platform/v1/stores/${peerID}/status`,

  // --- Storefront Lite (Phase MS2a) ---
  // MS2a.2a: per-store storefront CRUD. Owner-only; backed by
  // store_registry.storefronts JSONB.
  STORES_STOREFRONTS: (peerID: string) => `/platform/v1/stores/${peerID}/storefronts`,
  STORES_STOREFRONT: (peerID: string, sfID: string) =>
    `/platform/v1/stores/${peerID}/storefronts/${sfID}`,
  // MS2a.2b: public slug → (peerID, storefront) resolver.
  STOREFRONTS_BY_SLUG: (slug: string) => `/platform/v1/storefronts/by-slug/${slug}`,

  // --- Collectibles Hub+NFT (P1 · SaaS only · collectiblesHubEnabled) ---
  // Compatibility aliases retain the original singular names while every
  // canonical path comes from the generated Hosting OpenAPI contract above.
  COLLECTIBLES_HUB_SLOT: HOSTING_API_PATHS.COLLECTIBLES_HUB_SLOTS_BY_ID,
  COLLECTIBLES_HUB_SLOT_REJECT: HOSTING_API_PATHS.COLLECTIBLES_HUB_SLOTS_REJECT,
  COLLECTIBLES_HUB_SLOT_MINT: HOSTING_API_PATHS.COLLECTIBLES_HUB_SLOTS_MINT,
  COLLECTIBLES_NFT: HOSTING_API_PATHS.COLLECTIBLES_NFTS_BY_MINT,
  COLLECTIBLES_NFT_BURN_TX: HOSTING_API_PATHS.COLLECTIBLES_NFTS_BURN_TX,
  COLLECTIBLES_NFT_TRANSFER_TX: HOSTING_API_PATHS.COLLECTIBLES_NFTS_TRANSFER_TX,
  COLLECTIBLES_WALLET_CHALLENGES: HOSTING_API_PATHS.COLLECTIBLES_WALLETS_CHALLENGES,
  COLLECTIBLES_REDEMPTION: HOSTING_API_PATHS.COLLECTIBLES_REDEMPTIONS_BY_ID,
  COLLECTIBLES_REDEMPTION_SHIP: HOSTING_API_PATHS.COLLECTIBLES_REDEMPTIONS_SHIP,
  COLLECTIBLES_REDEMPTION_SETTLE: HOSTING_API_PATHS.COLLECTIBLES_REDEMPTIONS_SETTLE,
  COLLECTIBLES_PRIMARY_SALE_BY_ORDER: HOSTING_API_PATHS.COLLECTIBLES_PRIMARY_SALES_BY_ORDER,
  COLLECTIBLES_MY_SOURCE_DEPOSIT_SHIP: HOSTING_API_PATHS.COLLECTIBLES_MY_SOURCE_DEPOSITS_SHIP,
  COLLECTIBLES_SOURCE_DEPOSIT: HOSTING_API_PATHS.COLLECTIBLES_SOURCE_DEPOSITS_BY_ID,
  COLLECTIBLES_SOURCE_DEPOSIT_APPROVE: HOSTING_API_PATHS.COLLECTIBLES_SOURCE_DEPOSITS_APPROVE,
  COLLECTIBLES_SOURCE_DEPOSIT_REJECT: HOSTING_API_PATHS.COLLECTIBLES_SOURCE_DEPOSITS_REJECT,
  COLLECTIBLES_SOURCE_DEPOSIT_MINT: HOSTING_API_PATHS.COLLECTIBLES_SOURCE_DEPOSITS_MINT,
  COLLECTIBLES_SOURCE_DEPOSIT_FIRST_SALE: HOSTING_API_PATHS.COLLECTIBLES_SOURCE_DEPOSITS_FIRST_SALE,
  COLLECTIBLES_SOURCE_DEPOSIT_SHIP: HOSTING_API_PATHS.COLLECTIBLES_SOURCE_DEPOSITS_SHIP,
  COLLECTIBLES_SOURCE_DEPOSIT_SETTLE: HOSTING_API_PATHS.COLLECTIBLES_SOURCE_DEPOSITS_SETTLE,
  COLLECTIBLES_SOURCE_DEPOSIT_DEFAULT: HOSTING_API_PATHS.COLLECTIBLES_SOURCE_DEPOSITS_DEFAULT,
} as const;

// ============================================================
// 搜索 API（mobazha.info）
// 与 getSearchUrl() 拼接
// 后端注册：mobazha.info/backend/internal/api/server.go → setupRoutes()
// ============================================================
export const SEARCH_API = {
  ...SEARCH_API_PATHS,
  SEARCH_LISTINGS: '/search/v1/listings',
  SEARCH_PROFILES: '/search/v1/profiles',
  LISTINGS_FRESH: (limit: number) => `/search/v1/listings/fresh?limit=${limit}`,
  LISTINGS_HOT: (limit: number) => `/search/v1/listings/hot?limit=${limit}`,
  PROFILE_LISTINGS: (peerID: string) => `/search/v1/profiles/${peerID}/listings`,
  PROFILE_RAW: (peerID: string) => `/search/v1/profiles/${peerID}/raw`,
  REPORTS: '/search/v1/reports',
  STORE_METADATA: (peerID: string, types?: string[]) => {
    const base = `/search/v1/stores/${peerID}/metadata`;
    return types?.length ? `${base}?type=${types.join(',')}` : base;
  },
  VERIFIED_MODERATORS: '/search/v1/moderators/verified',
} as const;
