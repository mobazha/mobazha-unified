// Common types
export type {
  DataEnvelope,
  ListEnvelope,
  ListMeta,
  ErrorEnvelope,
  ApiErrorDetail,
  FieldError,
  ApiErrorCode,
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  Image,
  Price,
  PriceCurrency,
  Address,
  CryptoType,
  FiatType,
  CurrencyType,
} from './common';

// User types
export type {
  UserRole,
  UserProfile,
  ProfileStats,
  ContactInfo,
  SocialAccounts,
  UserSettings,
  SmtpSettings,
  AuthCredentials,
} from './user';

// Product types
export { CONTRACT_TYPES } from './product';
export type {
  ProductListItem,
  Product,
  VendorID,
  ProductMetadata,
  ContractType,
  ListingFormat,
  ListingStatus,
  WeightUnit,
  InventoryPolicy,
  DimensionUnit,
  ProductItem,
  ProductCondition,
  ProductOption,
  ProductVariant,
  SkuSelection,
  ProductSku,
  ShippingOption,
  ShippingType,
  ShippingService,
  Tax,
  ProductRating,
  RatingIndex,
  RatingDetail,
  // RWA Token types
  BlockchainNetwork,
  BlockchainInfo,
  RwaTokenType,
  RwaTokenInfo,
  AcceptedCurrency,
} from './product';

// Order types (API)
export type {
  OrderState,
  OrderRole,
  OrderListItem,
  Order,
  OrderContract,
  ContractListing,
  OrderOpen,
  // 订单操作相关
  OrderReject,
  OrderCancel,
  OrderConfirmation,
  OrderComplete,
  OrderFulfillment,
  // 支付相关
  PaymentSent,
  PaymentMethod,
  PaymentFinalized,
  PaymentLocked,
  Refund,
  EscrowRelease,
  // 争议相关
  DisputeOpen,
  DisputeClose,
  DisputeUpdate,
  DisputeAccept,
  // 其他
  ContractTransaction,
  OrderItem,
  OrderItemOption,
  OrderShippingOption,
  PaymentTransaction,
  RatingSignature,
  PhysicalDelivery,
  DigitalDelivery,
  FulfilledItem,
  CryptocurrencyDelivery,
  OrderRating,
  Cart,
  CartItem,
} from './order';

// Order Display types (UI)
export type {
  DisplayOrder,
  DisplayOrderItem,
  DisplayOrderParticipant,
  DisplayModerator,
  DisplayTimelineEvent,
  DisplayDispute,
  DisplayFiatPayment,
  DisplayPaymentLocked,
  DisplayOrderStatus,
  DisplayUserRole,
  TransformOrderOptions,
} from './orderDisplay';

// Wallet types
export type {
  WalletBalance,
  MultiWalletBalance,
  Transaction,
  TransactionStatus,
  FeeLevel,
  FeeEstimate,
  SendTransactionRequest,
  SendTransactionResponse,
  WalletAddress,
  ExchangeRate,
  ExternalWallet,
} from './wallet';

// Currency types
export type {
  CurrencyKind,
  CurrencyInfo,
  ExchangeRates,
  ExchangeRateDetail,
  ExchangeRatesDetailed,
  CurrencyPrice,
  FormatPriceOptions,
  ConvertCurrencyOptions,
  CurrencyState,
  CurrencyActions,
  CurrencyStore,
} from './currency';

export {
  POPULAR_FIAT_CURRENCIES,
  SUPPORTED_CRYPTO_CURRENCIES,
  DEFAULT_LOCAL_CURRENCY,
  EXCHANGE_RATE_REFRESH_INTERVAL,
} from './currency';

// Notification types
export type {
  OrderNotificationType,
  DisputeNotificationType,
  SocialNotificationType,
  PaymentNotificationType,
  NotificationEventType,
  NotificationCategory,
  SoundNotificationType,
  SoundPriority,
  SoundConfig,
  BaseNotificationData,
  OrderNotificationData,
  DisputeNotificationData,
  SocialNotificationData,
  PaymentNotificationData,
  NotificationData,
  NotificationRecord,
  NotificationWrapper,
  ChatMessageWrapper,
  MessageReadWrapper,
  MessageTypingWrapper,
  WalletWrapper,
  StatusWrapper,
  WebSocketNotificationMessage,
  NotificationDisplayData,
  NotificationSettings,
} from './notification';

export {
  DEFAULT_NOTIFICATION_SETTINGS,
  ORDER_NOTIFICATION_TYPES,
  DISPUTE_NOTIFICATION_TYPES,
  SOCIAL_NOTIFICATION_TYPES,
  PAYMENT_NOTIFICATION_TYPES,
  SOUND_CONFIGS,
  getNotificationCategory,
  isOrderNotification,
  isDisputeNotification,
  isSocialNotification,
  isPaymentNotification,
  eventTypeToSoundType,
  isValidNotificationEventType,
  normalizeNotificationType,
} from './notification';

// Access control types
export type {
  UserGroup,
  UserGroupMember,
  CreateUserGroupRequest,
  UpdateUserGroupRequest,
  ProductGroup,
  ProductGroupItem,
  CreateProductGroupRequest,
  UpdateProductGroupRequest,
  AuthorizationType,
  ProductGroupAuthorization,
  AddProductGroupAuthorizationRequest,
  AccessRequestStatus,
  StoreAccessRequest,
  SubmitAccessRequestData,
  ReviewAccessRequestData,
  StoreAccessSettings,
  StoreAccessCheckResult,
  StoreAccessListItem,
  GroupPlatform,
  GroupContext,
  GroupMarketplace,
  GroupSeller,
  ApplyAsSellerRequest,
  ReviewSellerRequest,
  GroupPermissions,
  StorePrivacySettings,
} from './access';

export { ProductGroupVisibility, GROUP_COLORS } from './access';

// Account binding types
export type {
  OAuthProvider,
  LinkedAccount,
  LinkedAccountsResponse,
  LinkUrlResponse,
  UnlinkRequest,
  UnlinkResponse,
  LinkCallbackResponse,
  ProviderInfo,
} from './account';

export { SUPPORTED_PROVIDERS, getProviderInfo } from './account';

// RWA types
export type {
  TokenStandard,
  OrderStatus,
  AssetTypeCode,
  AssetType,
  MembershipInfo,
  PerformanceInfo,
  NftMetadata,
  PredefinedAsset,
  UniversalSwapConfig,
  CreateOrderData,
  OrderInfo,
  RwaTransactionResult,
  RwaCreateOrderResult,
  OrderValidationResult,
  PlatformFeeInfo,
  RwaListingData,
  ChainConfig,
} from './rwa';

export {
  TokenStandardEnum,
  OrderStatusEnum,
  SEPOLIA_CONFIG,
  SUPPORTED_CHAINS,
  getChainConfig,
} from './rwa';

// Collection types
export type {
  CollectionType,
  CollectionSortOrder,
  CollectionProduct,
  Collection,
  CollectionListResponse,
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from './collection';

// Shipping Config types (店铺配送选项设置)
export type {
  // 新版 Shopify 风格类型
  ShippingLocation,
  RateConditionType,
  RateCondition,
  FreeShippingThreshold,
  ShippingRate,
  ShippingZone,
  LocationGroup,
  ShippingProfile,
  ShippingData,
  // 旧版类型（已废弃，用于迁移）
  ShippingServiceConfig,
  ShippingOptionConfig,
} from './shippingConfig';

export {
  // 新版工厂函数
  generateId,
  createEmptyLocation,
  createEmptyRate,
  createEmptyZone,
  createEmptyLocationGroup,
  createEmptyShippingProfile,
  // 新版辅助函数
  getAllZones,
  getAllRates,
  getPriceRange,
  getAllRegions,
  hasMultipleLocations,
  // 旧版函数（已废弃）
  createEmptyShippingService,
  createEmptyShippingOption,
} from './shippingConfig';

// Fiat payment types
export type {
  CaptureMode,
  StripeSessionData,
  PayPalSessionData,
  FiatPaymentSession,
  PaymentMethodInfo,
  FiatPaymentResult,
  FiatPaymentDetail,
  FiatProviderInfo,
  PaymentMethodsResponse,
  FiatAccountStatus,
  FiatProviderConfigView,
  FiatProviderConfigInput,
  CreateFiatPaymentParams,
  FiatProviderID,
  FiatPaymentStatus,
  FiatRefundParams,
  FiatRefundResult,
} from './fiat';

// Store branding types (PG-201)
export type {
  StoreConfig,
  StoreTheme,
  StoreSection,
  SectionType,
  SectionLayout,
  SpacingSize,
  ThemePalette,
  FontFamily,
  BorderRadius,
  HeaderStyle,
  HeroSectionProps,
  AnnouncementBarProps,
  FeaturedProductsProps,
  ProductGridProps,
  AboutSectionProps,
  TrustBadge,
  TrustBadgesProps,
  TestimonialsProps,
  FaqSectionProps,
  CollectionsSectionProps,
  GallerySectionProps,
  RichTextSectionProps,
  ContactSectionProps,
  StoreTabsProps,
  VideoSectionProps,
  CountdownSectionProps,
} from './storeConfig';

export {
  MAX_SECTIONS,
  WEB3_TRUST_KIT,
  SECTION_TYPE_LIST,
  SYSTEM_SECTION_TYPES,
  ADDABLE_SECTION_TYPES,
} from './storeConfig';

// OpenAPI auto-generated types (from hosting openapi.yaml)
export type { paths as ApiPaths, components as ApiComponents } from './api-generated';
