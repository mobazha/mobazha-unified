import type { Image, Address, CryptoType } from './common';

/**
 * 用户角色
 */
export type UserRole = 'buyer' | 'seller' | 'moderator';

/**
 * 用户/店铺资料
 */
export interface UserProfile {
  peerID: string;
  handle?: string;
  name: string;
  location?: string;
  about?: string;
  shortDescription?: string;
  nsfw?: boolean;
  vendor?: boolean;
  moderator?: boolean;
  /** 是否为私密店铺（仅授权用户可访问） */
  private?: boolean;
  avatarHashes?: Image;
  headerHashes?: Image;
  stats?: ProfileStats;
  bitcoinPubkey?: string;
  lastModified?: string;
  currencies?: CryptoType[];
  contactInfo?: ContactInfo;
}

/**
 * 店铺统计
 */
export interface ProfileStats {
  followerCount: number;
  followingCount: number;
  listingCount: number;
  ratingCount: number;
  postCount: number;
  averageRating: number;
}

/**
 * 联系方式
 */
export interface ContactInfo {
  website?: string;
  email?: string;
  phoneNumber?: string;
  social?: SocialAccounts;
}

/**
 * 社交账号
 */
export interface SocialAccounts {
  twitter?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
}

/**
 * 满额免邮配置
 */
export interface FreeShippingThresholdSetting {
  enabled: boolean;
  minAmount: string;
}

/**
 * 配送选项配置（店铺设置）
 * 与后端 ShippingOption 结构对齐
 */
export interface ShippingOptionSetting {
  id?: number;
  name: string;
  type: 'FIXED_PRICE' | 'LOCAL_PICKUP';
  currency: string;
  serviceType: 'FIRST_RENEWAL_FEE' | 'SAME_WEIGHT_SAME_FEE';
  regions: string[];
  services: ShippingServiceSetting[];
  freeShippingThreshold?: FreeShippingThresholdSetting;
}

/**
 * 配送服务设置
 */
export interface ShippingServiceSetting {
  name: string;
  estimatedDelivery: string;
  startWeight: number;
  endWeight: number;
  firstWeight: number;
  firstFreight: string;
  renewalUnitWeight: number;
  renewalUnitPrice: string;
  registrationFee: string;
}

/**
 * 用户设置
 */
export interface UserSettings {
  paymentDataInQR?: boolean;
  showNotifications?: boolean;
  showNsfw?: boolean;
  shippingAddresses?: Address[];
  shippingOptions?: ShippingOptionSetting[];
  localCurrency?: string;
  country?: string;
  language?: string;
  termsAndConditions?: string;
  refundPolicy?: string;
  blockedNodes?: string[];
  storeModerators?: string[];
  smtpSettings?: SmtpSettings;
}

/**
 * SMTP 设置
 */
export interface SmtpSettings {
  notifications?: boolean;
  serverAddress?: string;
  username?: string;
  password?: string;
  senderEmail?: string;
  recipientEmail?: string;
}

/**
 * 认证信息
 */
export interface AuthCredentials {
  username: string;
  password: string;
}

/**
 * 用户别名 (兼容 Mock 数据)
 */
export type User = UserProfile;
