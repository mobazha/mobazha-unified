/**
 * 工具函数导出
 */

// 性能优化工具
export * from './performance';

// 订单操作工具
export * from './orderActions';

// 履约文案 i18n key 选择（按商品类型）
export * from './orderFulfillmentLabels';

// 争议裁决展示
export * from './disputeRulingDisplay';

// 订单列表缩略图（API 可能返回 string CID 或 Image 对象）
export * from './orderListItemThumbnail';

// Matrix 事件文本生成
export * from './matrixEventText';

// Token 唯一标识工具
export * from './tokenIdentifier';

// RWA 资产解析工具
export * from './rwaAssetResolver';

// 国家名称国际化工具
export * from './countryUtils';

// 商品导入工作台行状态
export * from './productImportRowState';

// 数据转换函数
export * from './transforms';

// HTML 处理工具
export * from './htmlUtils';
export * from './artListingMetadata';

// 变体工具
export * from './variantUtils';

// 价格工具
export * from './priceUtils';
export * from './listingDisplayPrice';

// 身份展示工具
export * from './identity';

// 社区市场展示工具
export * from './communityMarketplace';
export * from './nativeMarketplaceSell';

// 商品链接
export * from './productUrl';
export * from './homepageFeeds';
export * from './storeRelatedListings';

// JSON *ID 字段 ingress 归一化
export * from './normalizeIds';

// 通知展示（聚合、数据质量、CTA）
export * from './notificationDisplay';

// 店铺品牌化主题工具 (PG-201)
export * from './theme';

// AI StoreConfig 验证 (PG-202)
export * from './storeConfigValidator';

// 物流商配置与追踪 URL 工具
export * from './shipping';

// 结账 contractType 校验（购物车可混放，单笔订单须同类）
export * from './contractTypeCheckout';

// Guest 订单实物/数字类型推断
export * from './guestOrderKind';

// Guest checkout supply availability quote helpers
export * from './guestSupplyQuote';
export * from './productSupplyDisplay';
export * from './bulkProductSupplyActions';

// Payment readiness gate UX helpers
export * from './paymentReadinessState';

// Order payment amount display (cross-currency listing vs settlement)
export * from './orderPaymentDisplay';

// Buyer-declared crypto refund routing helpers
export * from './buyerRefundAddress';
export * from './cryptoAddressFormat';
export * from './paymentCoinIngress';
export * from './refundReceivingPreferences';
export * from './refundReceivingAddressValidation';

// 扫码结果解析
export * from './scanResult';

// AI chat session title derivation
export * from './chatSessionTitle';

// 仲裁人裁决表单
export * from './moderatorDisputeRuling';

export * from './orderSettlement';

// TODO: 后续迁移添加
// export * from './format';
// export * from './validation';
// export * from './crypto';
