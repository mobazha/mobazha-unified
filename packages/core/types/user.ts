import type { Image, Address, CryptoType } from './common';

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
