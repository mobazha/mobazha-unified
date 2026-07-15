// API 配置
export {
  setApiConfig,
  resetApiConfig,
  getApiConfig,
  getHostingUrl,
  getGatewayUrl,
  getBuyerGatewayUrl,
  getBuyerWebSocketUrl,
  getSellerWebSocketUrl,
  getMyGatewayUrl,
  getSearchUrl,
  getMbzGatewayUrl,
  setGroupContext,
  setStoreContextHeaders,
  getHeadersWithContext,
  getImageUrl,
  getAbsoluteImageUrl,
  getMediaBaseURL,
  setStandaloneBuyerAuth,
  isStandaloneBuyerAuth,
} from './config';

// API 模式管理
export {
  setApiMode,
  getApiMode,
  setApiModeConfig,
  getApiModeConfig,
  shouldUseMock,
  shouldFallbackToMock,
  withMockFallback,
  type ApiMode,
} from './mode';

// API 客户端
export {
  ApiError,
  isStoreUnavailableError,
  request,
  get,
  post,
  put,
  del,
  safeRequest,
} from './client';

// 三层 API helpers（推荐使用，自动处理路由和认证）
export {
  authGet,
  authPost,
  authPut,
  authDel,
  authSafeGet,
  authRequest,
  nodeAuthGet,
  nodeAuthPost,
  nodeAuthPut,
  nodeAuthPatch,
  nodeAuthDel,
  nodeAuthSafeGet,
  nodeAuthRequest,
  publicGet,
  publicPost,
  publicSafeGet,
  hostingGet,
  hostingPost,
  hostingPut,
  hostingPatch,
  hostingDel,
  searchGet,
  searchPost,
  searchSafeGet,
} from './helpers';

// Type-safe OpenAPI client (openapi-fetch)
export {
  createNodeClient,
  createHostingClient,
  createSearchClient,
  onOpenApiUnauthorized,
} from './openapi-client';

export { refreshRuntimeConfig } from './runtimeConfig';

// Local Node administrator authentication (standalone + sovereign).
export * as adminAuthApi from './adminAuth';
export type { ChangeAdminPasswordRequest, ChangeAdminPasswordResponse } from './adminAuth';

// 商品 API
export * as productsApi from './products';
export type { StoreListingsResult } from './products';
export type { StoreRelatedListingsOptions } from './products';

// 订单 API
export * as ordersApi from './orders';
export type { AcceptDisputeSettlementContext } from './orders';

// 用户/店铺 API
export * as profileApi from './profile';

// 钱包 API
export * as walletApi from './wallet';

// 仲裁员 API
export * as moderatorsApi from './moderators';

// 集市 API
export * as marketplaceApi from './marketplace';

// Collectibles Hub+NFT API (P1)
export * as collectiblesApi from './collectibles';

// Core-owned resource collateral operator API
export * as collateralApi from './collateral';

// 权限控制 API
export * as accessApi from './access';

// 社交 API (Follow/Unfollow)
export * as socialApi from './social';

// 购物车 API
export * as cartApi from './cart';

// 收藏/愿望单 API
export * as wishlistApi from './wishlist';
export type { WishlistItem, AddWishlistParams } from './wishlist';

// 折扣 API
export * as discountsApi from './discounts';
export type {
  Discount,
  DiscountCode,
  DiscountRedemption,
  ValidateDiscountResponse,
  ApplicableDiscount,
} from './discounts';

// Collection API
export * as collectionsApi from './collections';
export type {
  Collection,
  CollectionProduct,
  CollectionListResponse,
  CollectionType,
  CollectionSortOrder,
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from './collections';

// 通知 API
export * as notificationsApi from './notifications';
export type {
  Notification,
  NotificationFilter,
  NotificationsResult,
  NotificationSource,
  MarketplaceReviewStatus,
  MarketplaceReviewEventsResult,
} from './notifications';
export { getNotificationRoute, NOTIFICATION_FILTER_TYPES } from './notifications';

// 争议/仲裁 API
export * as disputesApi from './disputes';
export type { CaseListItem } from './disputes';

// 图片上传 API
export * as imagesApi from './images';

// Matrix 聊天 API
export * as matrixApi from './matrix';

// 通知渠道 API (Telegram, Discord, etc.)
export * as notificationChannelsApi from './notificationChannels';

// 法币支付 API
export * as fiatApi from './fiat';

// 履约供应商 API (Supply Chain FF-1d)
export * as fulfillmentApi from './fulfillment';

// 数字商品 API (Supply Chain Phase 1.0 — Core MVP)
export * as digitalAssetsApi from './digitalAssets';
export { MAX_DIGITAL_ASSET_UPLOAD_BYTES, uploadDigitalFileStream } from './digitalAssets';
export type { UploadDigitalFileStreamInput, UploadDigitalFileStreamOptions } from './digitalAssets';

// Storefront Config API (PG-201)
export * as storefrontApi from './storefront';

// Storefronts Lite API (Phase MS2a — per-store named storefront CRUD)
export * as storefrontsLiteApi from './storefrontsLite';
export { DEFAULT_STOREFRONT_ID } from './storefrontsLite';
export type {
  Storefront,
  StorefrontFilter,
  StorefrontPriceRule,
  StorefrontPriceRuleType,
  StorefrontAccessRule,
  StorefrontAccessRuleType,
  StorefrontTelegram,
  StorefrontTheme,
  StorefrontVisibility,
  StorefrontCreateRequest,
  StorefrontUpdateRequest,
  PublicStorefrontBySlug,
} from './storefrontsLite';

// Store Metadata API (cross-store routing offline fallback)
export * as storeMetadataApi from './storeMetadata';
export type { StoreMetadataType, StoreMetadataEntry, StoreMetadataResponse } from './storeMetadata';

// Standalone Stores API (legacy shim, kept for AuthProvider + settings page)
export * as standaloneStoresApi from './standaloneStores';
export type { StandaloneStore } from './standaloneStores';

// Multi-Store (Phase MS1) — canonical multi-store surface
export * as myStoresApi from './myStores';
export type {
  MyStoreItem,
  StoreNodeType,
  StoreConnectivity,
  StoreLifecycleStatus,
  ClaimStoreRequest,
  ClaimStoreResponse,
  OwnerReputationStore,
  OwnerReputationResponse,
} from './myStores';

// Server Info + feature flags
export * as serverInfoApi from './serverInfo';
export type { ServerInfo, FeatureFlags } from './serverInfo';
export { isFeatureEnabled } from './serverInfo';

// Webhooks API
export * as webhooksApi from './webhooks';
export type { WebhookEndpoint, WebhookDelivery, WebhookDeliveriesResponse } from './webhooks';

// System API (standalone setup)
export * as systemApi from './system';
export type { SetupStatusResponse, SetupCompletedSteps, InitialSetupResponse } from './system';

// Data export API (DG-1.10 — listings/sales/customers CSV+JSON downloads)
export * as exportsApi from './exports';
export type { ExportKind, ExportFormat, ExportResult } from './exports';

// Gumroad import API (DG-1.9 — vendor migration tool)
export * as gumroadImportApi from './gumroadImport';
export type {
  GumroadImportResponse,
  GumroadImportPreviewItem,
  GumroadImportListingResult,
  GumroadImportedItem,
  GumroadImportError,
} from './gumroadImport';

// Sales Channels API (Store Links + Store Bot)
export { resolveStoreShortCode } from './salesChannels';

// Guest Checkout API
export * as guestCheckoutApi from './guestCheckout';

// Deal Link API (buyer-facing public hosting endpoints)
export * as dealLinkApi from './dealLink';
export type {
  PublicDealLink,
  DealLinkFeeQuote,
  DealLinkAcceptanceRequest,
  DealLinkAcceptanceResult,
} from '../../types/dealLink';
export { getPublicDealLink, createDealLinkFeeQuote, acceptPublicDealLink } from './dealLink';

// Seller affiliate API (automation-first referral and three-state ledger)
export * as sellerAffiliateApi from './sellerAffiliate';
export type {
  PublicSellerAffiliateLink,
  SellerAffiliateLink,
  SellerAffiliateCapabilities,
  SellerAffiliateProgram,
  SellerAffiliateProgramRequest,
  SellerAffiliateReferralSession,
  SellerAffiliateStatementLine,
  SellerAffiliateStatementPage,
} from '../../types/sellerAffiliate';
export {
  createSellerAffiliateLink,
  createSellerAffiliateReferralSession,
  getPublicSellerAffiliateLink,
  getSellerAffiliateProgram,
  getSellerAffiliateCapabilities,
  getPublicSellerAffiliateProgram,
  listSellerAffiliateStatements,
  putSellerAffiliateProgram,
  reissueSellerAffiliateLink,
} from './sellerAffiliate';

// Seller Deal Link API (authenticated hosting endpoints)
export * as sellerDealLinkApi from './sellerDealLink';
export type {
  SellerDealLink,
  SellerDealLinkOrder,
  SellerDealLinkOrdersPage,
  SellerDealLinkRequest,
} from '../../types/sellerDealLink';
export {
  activateSellerDealLink,
  closeSellerDealLink,
  createSellerDealLink,
  createSellerDealLinkFeeQuote,
  getSellerDealLink,
  listSellerDealLinkOrders,
  listSellerDealLinks,
  pauseSellerDealLink,
  updateSellerDealLink,
} from './sellerDealLink';

// Store payment policy API
export * as paymentPolicyApi from './paymentPolicy';
export type { StorePaymentPolicy, UtxoConfirmationPolicy } from './paymentPolicy';

export type {
  GuestCartItem as GuestCartItemApi,
  CreateGuestOrderRequest,
  GuestOrderResponse,
  GuestOrderStatus,
  GuestOrderSummary,
  GuestCheckoutSettings,
  GuestOrderSupplyQuoteItem,
  GuestOrderSupplyQuoteResponse,
  QuoteGuestOrderSupplyRequest,
  SupplyAvailabilityStatus,
} from './guestCheckout';

// API Tokens (MCP / programmatic access)
export * as apiTokensApi from './apiTokens';
export type { ApiTokenInfo, CreateTokenRequest, CreateTokenResponse, ScopeInfo } from './apiTokens';

// MCP Auto-Connect (standalone only)
export * as mcpConnectApi from './mcpConnect';
export type {
  MCPClientStatus,
  MCPConnectResult,
  MCPConnectResponse,
  MCPCapability,
} from './mcpConnect';

// AI Settings API
export * as aiSettingsApi from './aiSettings';
export type {
  AIConfig,
  AIConfigInput,
  AIProviderInfo,
  AIProviderState,
  AIStatus,
  AITestConnectionResult,
} from './aiSettings';
export { aiStatusSupportsVision } from './aiSettings';
export type {
  ChannelConfig,
  ChannelFieldSchema,
  ChannelTypeInfo,
  ChannelTypesResponse,
  DetectedChat,
} from './notificationChannels';
