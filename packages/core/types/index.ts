// Common types
export type {
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
  ShippingOptionSetting,
  ShippingServiceSetting,
  ShippingProfileSetting,
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
  ProductItem,
  ProductCondition,
  ProductOption,
  ProductVariant,
  ProductSku,
  ShippingOption,
  ShippingType,
  ShippingService,
  Tax,
  Coupon,
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
  SystemNotificationType,
  NotificationEventType,
  NotificationCategory,
  SoundNotificationType,
  SoundPriority,
  SoundConfig,
  BaseNotificationData,
  OrderNotificationData,
  DisputeNotificationData,
  SocialNotificationData,
  SystemNotificationData,
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
  ApiNotificationCategory,
} from './notification';

export {
  DEFAULT_NOTIFICATION_SETTINGS,
  ORDER_NOTIFICATION_TYPES,
  DISPUTE_NOTIFICATION_TYPES,
  SOCIAL_NOTIFICATION_TYPES,
  SYSTEM_NOTIFICATION_TYPES,
  SOUND_CONFIGS,
  getNotificationCategory,
  isOrderNotification,
  isDisputeNotification,
  isSocialNotification,
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

// Shipping Config types (店铺配送选项设置)
export type {
  ShippingServiceType,
  ShippingOptionConfig,
  ShippingService as ShippingServiceConfig,
  ShippingProfile,
  ShippingData,
  FreeShippingThreshold,
} from './shippingConfig';

export {
  createEmptyShippingService,
  createEmptyShippingOption,
  createEmptyShippingProfile,
  isUsingProfileMode,
  SHIPPING_TYPE_LABELS,
  SERVICE_TYPE_LABELS,
} from './shippingConfig';

// 重新导出 ShippingType 用于配送设置（与 product.ts 中的相同）
export type { ShippingType as ShippingConfigType } from './shippingConfig';
