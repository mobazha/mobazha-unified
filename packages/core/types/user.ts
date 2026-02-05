import type { Image, Address, CryptoType } from './common';
import type { ShippingProfile, ShippingLocation, ShippingOptionConfig } from './shippingConfig';

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
 * 用户设置
 */
export interface UserSettings {
  paymentDataInQR?: boolean;
  showNotifications?: boolean;
  showNsfw?: boolean;
  shippingAddresses?: Address[];
  /** @deprecated 传统模式：配送选项列表（用于迁移） */
  shippingOptions?: ShippingOptionConfig[];
  /** 配送档案列表（Shopify 风格） */
  shippingProfiles?: ShippingProfile[];
  /** 发货地点列表 */
  shippingLocations?: ShippingLocation[];
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
