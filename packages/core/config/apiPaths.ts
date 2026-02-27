/**
 * API 路径常量 — 按后端服务分组
 *
 * 三个后端服务，三组常量，一一对应：
 *
 *   NODE_API    → mobazha3.0 节点 API（经 hosting 反向代理，/v1/* 前缀）
 *   HOSTING_API → mobazha_hosting 平台 API（/platform/v1/* 前缀）
 *   SEARCH_API  → mobazha.info 搜索服务（/api/* 前缀）
 *
 * 使用方式：
 *   import { NODE_API, HOSTING_API, SEARCH_API } from '../../config/apiPaths';
 *   const url = `${getGatewayUrl()}${NODE_API.PROFILES}`;
 *   const url = `${getPlatformUrl()}${HOSTING_API.MATRIX_CONFIG}`;
 *   const url = `${getSearchUrl()}${SEARCH_API.SEARCH}`;
 */

// ============================================================
// 节点 API（mobazha3.0，经 hosting 反向代理）
// 与 getGatewayUrl() 拼接（getGatewayUrl 已含 /v1 前缀）
// 后端注册：mobazha3.0/internal/api/gateway.go → newV1Router()
// ============================================================
export const NODE_API = {
  // --- Profiles ---
  PROFILES: '/profiles',
  PROFILE_AVATAR: (peerID: string) => `/profiles/${peerID}/avatar`,
  PROFILE_HEADER: (peerID: string) => `/profiles/${peerID}/header`,
  PROFILES_BATCH: '/profiles/batch',
  PEER_ID: '/peerid',

  // --- Preferences ---
  PREFERENCES: '/preferences',
  PREFERENCES_CURRENCY: '/preferences/currency',

  // --- Listings ---
  LISTINGS: '/listings',
  LISTING: (slug: string) => `/listings/${slug}`,
  LISTING_PEER: (peerID: string, slug: string) => `/listings/${peerID}/${slug}`,
  LISTINGS_INDEX: '/listings/index',
  LISTINGS_INDEX_PEER: (peerID: string) => `/listings/index/${peerID}`,

  // --- Ratings ---
  RATINGS_INDEX: '/ratings/index',
  RATINGS_INDEX_PEER: (peerID: string) => `/ratings/index/${peerID}`,
  RATINGS_INDEX_SLUG: (slug: string) => `/ratings/index/${slug}`,
  RATINGS_INDEX_PEER_SLUG: (peerID: string, slug: string) => `/ratings/index/${peerID}/${slug}`,
  RATINGS_BATCH: '/ratings/batch',

  // --- Orders ---
  PURCHASES: '/purchases',
  SALES: '/sales',
  ORDER: (orderId: string) => `/orders/${orderId}`,
  ORDERS_PURCHASE: '/orders/purchase',
  PURCHASE: '/purchase',
  ORDERS_ESTIMATE: '/orders/estimate',
  ORDERS_CHECKOUT_BREAKDOWN: '/orders/checkout-breakdown',
  ORDERS_CONFIRM: '/orders/confirm',
  ORDERS_FULFILL: '/orders/fulfill',
  ORDERS_COMPLETE: '/orders/complete',
  ORDERS_CANCEL: '/orders/cancel',
  ORDERS_REFUND: '/orders/refund',
  ORDERS_PAYMENT: '/orders/payment',
  ORDERS_SPEND: '/orders/spend',
  ORDER_PAYMENT_REMAINING: (orderId: string) => `/orders/${orderId}/payment/remaining`,

  // --- Order Instructions ---
  INSTRUCTIONS_ORDER_COMPLETE: '/instructions/order/complete',
  INSTRUCTIONS_ORDER_CONFIRM: '/instructions/order/confirm',
  INSTRUCTIONS_ORDER_CANCEL: '/instructions/order/cancel',
  INSTRUCTIONS_ORDER_REFUND: '/instructions/order/refund',
  INSTRUCTIONS_ORDER_PAYMENT: '/instructions/order/payment',
  INSTRUCTIONS_DISPUTE_RELEASE: '/instructions/dispute/release',

  // --- Disputes ---
  DISPUTE_OPEN: '/dispute/open',
  DISPUTE_CLOSE: '/dispute/close',
  DISPUTE_RELEASE: '/dispute/release',
  DISPUTE_RELEASE_AFTER_TIMEOUT: '/dispute/releaseAfterTimeout',
  CASES: '/cases',
  CASE: (orderId: string) => `/cases/${orderId}`,
  RELEASE_AFTER_TIMEOUT: '/releaseAfterTimeout',

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

  // --- AI ---
  AI_GENERATE: '/ai/generate',
  AI_CONFIG: '/settings/ai',
  AI_PROVIDERS: '/settings/ai/providers',
  AI_TEST_CONNECTION: '/settings/ai/test',

  // --- Social / Follow ---
  FOLLOW: (peerID: string) => `/follow/${peerID}`,
  FOLLOWING: '/following',
  FOLLOWING_PEER: (peerID: string) => `/following/${peerID}`,
  FOLLOWERS: '/followers',
  FOLLOWERS_PEER: (peerID: string) => `/followers/${peerID}`,
  FOLLOWERS_CHECK: (peerID: string) => `/followers/${peerID}/check`,

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
  WALLET_ESTIMATE_FEE: (coin: string) => `/wallet/estimatefee/${coin}`,
  WALLET_SPEND: '/wallet/spend',
  WALLET_STATUS: '/wallet/status',
  WALLET_MNEMONIC: '/wallet/mnemonic',
  WALLET_RESTORE: '/wallet/restore',
  WALLET_VALIDATE: (coin: string) => `/wallet/validate/${coin}`,
  WALLET_RECEIVING_ACCOUNT_LIST: '/wallet/receivingaccountlist',
  EXCHANGE_RATES: '/exchangerates',
  RECEIVE_ADDRESSES: '/receiveaddresses',
  RECEIVE_ADDRESS: '/receiveaddress',
  RECEIVE_ADDRESS_COIN: (coin: string) => `/receiveaddress/${coin}`,

  // --- Matrix (node-level, 节点本地存储) ---
  MATRIX_CREDENTIALS: '/matrix/credentials',
  MATRIX_PASSWORD: '/matrix/password',

  // --- Misc ---
  RESEND_ORDER_MESSAGE: '/resendordermessage',
  MARK_ORDER_AS_READ: '/markorderasread',
} as const;

// ============================================================
// Hosting API（mobazha_hosting 平台路由）
// 与 getPlatformUrl() 或 getBaseUrl() 拼接
// 后端注册：mobazha_hosting/api/gateway.go → newHostingRouter()
// ============================================================
export const HOSTING_API = {
  // --- Auth ---
  AUTH_SIGNIN: '/platform/v1/auth/signin',
  AUTH_TELEGRAM_SIGNIN: '/platform/v1/auth/telegram/signin',
  AUTH_TELEGRAM_MINI_APP_SIGNIN: '/platform/v1/auth/telegram/mini-app-signin',
  AUTH_TELEGRAM_CHECK_MINI_APP_USER: '/platform/v1/auth/telegram/check-mini-app-user',
  AUTH_DISCORD_MINI_APP_SIGNIN: '/platform/v1/auth/discord/mini-app-signin',
  AUTH_DISCORD_OAUTH2_TOKEN: '/platform/v1/auth/discord/oauth2-token',
  AUTH_DISCORD_CHECK_USER: '/platform/v1/auth/discord/check-user',
  AUTH_DISCORD_OAUTH_CALLBACK: '/platform/v1/auth/discord/oauth-callback',

  // --- Accounts ---
  ACCOUNTS_ME: '/platform/v1/accounts/me',
  ACCOUNTS_LINKED: '/platform/v1/accounts/linked',
  ACCOUNTS_UNLINK: '/platform/v1/accounts/unlink',
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
  INTEGRATIONS_STRIPE_ACCOUNT: (peerID: string) =>
    `/platform/v1/integrations/stripe/accounts/${peerID}`,
  INTEGRATIONS_TELEGRAM_WEBHOOK: '/platform/v1/integrations/telegram/webhook',

  // --- Relay ---
  RELAY_EXECUTE: '/platform/v1/relay/execute',
  RELAY_STATUS: '/platform/v1/relay/status',

  // --- Matrix (hosting-level, 集中式注册/管理) ---
  MATRIX_CONFIG: '/platform/v1/matrix/config',
  MATRIX_AUTO_REGISTER: '/platform/v1/matrix/auto-register',
  MATRIX_SYNC_PROFILE: '/platform/v1/matrix/sync-profile',
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

  // --- Group Marketplace ---
  GROUP_MARKETPLACE_LISTINGS: (platform: string, chatId: string) =>
    `/platform/v1/group-marketplace/${platform}/${chatId}/listings`,
  GROUP_MARKETPLACE_SELLERS: (platform: string, chatId: string) =>
    `/platform/v1/group-marketplace/${platform}/${chatId}/sellers`,
  GROUP_MARKETPLACE_SELLERS_APPLY: (platform: string, chatId: string) =>
    `/platform/v1/group-marketplace/${platform}/${chatId}/sellers/apply`,
  GROUP_MARKETPLACE_SELLER_REVIEW: (platform: string, chatId: string, sellerId: string) =>
    `/platform/v1/group-marketplace/${platform}/${chatId}/sellers/${sellerId}/review`,
  GROUP_MARKETPLACE_CHECK_ADMIN: (platform: string, chatId: string) =>
    `/platform/v1/group-marketplace/${platform}/${chatId}/check-admin`,

  // --- Marketplaces ---
  MARKETPLACES: '/platform/v1/marketplaces',
  MARKETPLACE: (id: string) => `/platform/v1/marketplaces/${id}`,
  MARKETPLACE_BY_SLUG: (slug: string) => `/platform/v1/marketplaces/slug/${slug}`,
  MARKETPLACES_ME_OWNED: '/platform/v1/marketplaces/me/owned',
  MARKETPLACES_ME_JOINED: '/platform/v1/marketplaces/me/joined',
  MARKETPLACES_FEATURED: '/platform/v1/marketplaces/featured',
  MARKETPLACE_MEMBERS: (id: string) => `/platform/v1/marketplaces/${id}/members`,
  MARKETPLACE_JOIN: (id: string) => `/platform/v1/marketplaces/${id}/join`,
  MARKETPLACE_LEAVE: (id: string) => `/platform/v1/marketplaces/${id}/leave`,
  MARKETPLACE_MEMBER_ROLE: (marketplaceId: string, memberId: string) =>
    `/platform/v1/marketplaces/${marketplaceId}/members/${memberId}/role`,
  MARKETPLACE_MEMBER: (marketplaceId: string, memberId: string) =>
    `/platform/v1/marketplaces/${marketplaceId}/members/${memberId}`,
  MARKETPLACE_SELLER_APPLICATIONS: (id: string) =>
    `/platform/v1/marketplaces/${id}/seller-applications`,
  MARKETPLACE_SELLER_APPLICATION_REVIEW: (marketplaceId: string, applicationId: string) =>
    `/platform/v1/marketplaces/${marketplaceId}/seller-applications/${applicationId}/review`,
  MARKETPLACE_SELLER_STATUS: (marketplaceId: string, sellerId: string) =>
    `/platform/v1/marketplaces/${marketplaceId}/sellers/${sellerId}/status`,
  MARKETPLACE_PRODUCTS: (id: string) => `/platform/v1/marketplaces/${id}/products`,
  MARKETPLACE_PRODUCT: (marketplaceId: string, productId: string) =>
    `/platform/v1/marketplaces/${marketplaceId}/products/${productId}`,
  MARKETPLACE_PRODUCT_REVIEW: (marketplaceId: string, productId: string) =>
    `/platform/v1/marketplaces/${marketplaceId}/products/${productId}/review`,
  MARKETPLACE_PRODUCT_FEATURED: (marketplaceId: string, productId: string) =>
    `/platform/v1/marketplaces/${marketplaceId}/products/${productId}/featured`,
  MARKETPLACE_ANNOUNCEMENTS: (id: string) => `/platform/v1/marketplaces/${id}/announcements`,
  MARKETPLACE_ANNOUNCEMENT: (marketplaceId: string, announcementId: string) =>
    `/platform/v1/marketplaces/${marketplaceId}/announcements/${announcementId}`,
  MARKETPLACE_ACTIVITY: (id: string) => `/platform/v1/marketplaces/${id}/activity`,
} as const;

// ============================================================
// 搜索 API（mobazha.info）
// 与 getSearchUrl() 拼接
// 后端注册：mobazha.info/backend/internal/api/server.go → setupRoutes()
// ============================================================
export const SEARCH_API = {
  LISTINGS_FRESH: (limit: number) => `/api/listings/fresh/${limit}`,
  LISTINGS_HOT: (hours: number, limit: number) => `/api/listings/hot/${hours}/${limit}`,
  PROFILE_LISTINGS: '/profile/listings',
  PROFILE_RAW: '/api/profile/raw',
  SEARCH: '/api/search',
  SEARCH_PROFILES: '/api/search/profile_m',
  REPORTS: '/api/reports',
} as const;
