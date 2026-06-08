/**
 * Standard API success envelope: {"data": T}
 */
export interface DataEnvelope<T = unknown> {
  data: T;
}

/**
 * Standard API list envelope: {"data": T[], "meta": {...}}
 */
export interface ListEnvelope<T = unknown> {
  data: T[];
  meta: ListMeta;
}

export interface ListMeta {
  total: number;
  limit?: number;
  offset?: number;
  nextCursor?: string;
}

/**
 * Standard API error envelope: {"error": {...}}
 */
export interface ErrorEnvelope {
  error: ApiErrorDetail;
}

export interface ApiErrorDetail {
  code: ApiErrorCode;
  message: string;
  detail?: string;
  traceID?: string;
  details?: FieldError[];
}

export interface FieldError {
  field: string;
  message: string;
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'PROVIDER_ERROR'
  | 'REFUND_ADDRESS_REQUIRED';

/**
 * @deprecated Use DataEnvelope<T> instead. Kept for backward compatibility during migration.
 */
export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * @deprecated Use ListEnvelope<T> instead.
 */
export interface PaginatedResponse<T> {
  results: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * 分页请求参数
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  limit?: number;
  offsetId?: string;
}

/**
 * 图片类型
 */
export interface Image {
  tiny: string;
  small: string;
  medium: string;
  large: string;
  original: string;
  filename?: string;
  /** Alt text for accessibility and SEO */
  alt?: string;
}

/**
 * 价格中的货币信息（后端 API 格式）
 */
export interface PriceCurrency {
  code: string;
  divisibility: number;
}

/**
 * 价格类型（后端 API 格式）
 * amount 是最小单位（如美分、聪），需要除以 10^divisibility 得到标准显示值
 */
export interface Price {
  amount: number;
  currency: PriceCurrency;
}

/**
 * 地址类型
 */
export interface Address {
  name: string;
  company?: string;
  addressLineOne: string;
  addressLineTwo?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  addressNotes?: string;
}

/**
 * 加密货币类型
 */
export type CryptoType = 'BTC' | 'ETH' | 'TETH' | 'LTC' | 'BCH' | 'ZEC' | 'BSC' | 'USDT';

/**
 * 法币类型
 */
export type FiatType = 'USD' | 'CNY' | 'EUR' | 'GBP' | 'JPY';

/**
 * 货币类型
 */
export type CurrencyType = CryptoType | FiatType;
