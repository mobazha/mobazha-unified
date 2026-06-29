/**
 * Marketplace Types
 * 社区集市类型定义
 */

// 集市状态
export enum MarketplaceStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
}

// 卖家状态
export enum SellerStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

// 商品审核状态
export enum ProductApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged',
}

// 集市成员角色
export enum MarketplaceRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  SELLER = 'seller',
  MEMBER = 'member',
}

export type MarketplacePlatform = 'native' | 'telegram' | 'discord' | 'slack' | string;
export type MarketplaceVisibility = 'draft' | 'active' | 'hidden' | 'suspended';
export type MarketplaceJoinMode = 'open' | 'approval' | 'invite';
export type MarketplaceCatalogMode = 'open' | 'curated';
export type MarketplaceDiscoverability = 'public' | 'unlisted';
export type MarketplaceSellerEntryMode = 'operator_invited' | 'seller_self_serve';
export type MarketplaceSellerWhitelistStatus = 'pending' | 'approved' | 'rejected';

export interface NativeMarketplace {
  id: string;
  platform: MarketplacePlatform;
  name: string;
  publicID?: string;
  slug?: string;
  visibility: MarketplaceVisibility;
  publicDescription?: string;
  logoURL?: string;
  bannerURL?: string;
  isFeatured?: boolean;
  sortOrder?: number;
  ownerUserID?: string;
  joinMode: MarketplaceJoinMode;
  catalogMode: MarketplaceCatalogMode;
  discoverability: MarketplaceDiscoverability;
  sellerEntryMode: MarketplaceSellerEntryMode;
  vertical: string;
  domain?: string;
  subdomain?: string;
  catalogQuery?: string;
  themeJSON?: string;
  attribution?: string;
  subStatus?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateNativeMarketplaceRequest {
  name: string;
  vertical?: string;
  slug?: string;
  publicDescription?: string;
  logoURL?: string;
  bannerURL?: string;
  joinMode?: MarketplaceJoinMode;
  catalogMode?: MarketplaceCatalogMode;
  discoverability?: MarketplaceDiscoverability;
  domain?: string;
  subdomain?: string;
  catalogQuery?: string;
  theme?: Record<string, unknown>;
  themeJSON?: string;
  attribution?: string;
  sellerEntryMode?: MarketplaceSellerEntryMode;
  visibility?: MarketplaceVisibility;
}

export type UpdateNativeMarketplaceRequest = Partial<CreateNativeMarketplaceRequest>;

export interface MarketplaceSellerWhitelistEntry {
  id: number;
  tenantID: string;
  marketplaceID: string;
  userID: string;
  peerID: string;
  status: MarketplaceSellerWhitelistStatus;
  isVisible: boolean;
  appliedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InviteMarketplaceSellerRequest {
  peerID: string;
  userID?: string;
  tenantID?: string;
  status?: MarketplaceSellerWhitelistStatus;
  visible?: boolean;
}

export interface UpdateMarketplaceSellerRequest {
  status?: MarketplaceSellerWhitelistStatus;
  visible?: boolean;
}

export interface MarketplaceCurationFeaturedItem {
  type: 'seller' | 'listing' | string;
  peerID?: string;
  slug?: string;
  sortOrder: number;
}

export interface MarketplaceCurationBrand {
  name: string;
  tagline?: string;
  logo?: string;
  banner?: string;
  theme?: Record<string, unknown>;
}

export interface MarketplaceCurationConfig {
  id: string;
  vertical: string;
  joinMode: MarketplaceJoinMode;
  catalogMode: MarketplaceCatalogMode;
  discoverability: MarketplaceDiscoverability;
  sellerEntryMode: MarketplaceSellerEntryMode;
  catalogQuery?: string;
  allowedPeers: string[];
  sellers: string[];
  featured: MarketplaceCurationFeaturedItem[];
  brand: MarketplaceCurationBrand;
  taxonomy: Array<Record<string, string>>;
  policy: Record<string, string>;
  attribution: {
    utmSource: string;
    marketplaceId: string;
  };
  subdomain?: string;
  domain?: string;
}

export interface MarketplaceShareLink {
  url: string;
  qrText: string;
  domain?: string;
  subdomain?: string;
}

// 集市信息
export interface Marketplace {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  logo?: string;
  banner?: string;
  owner: {
    id: string;
    peerID: string;
    name: string;
    avatar?: string;
  };
  status: MarketplaceStatus;
  settings: MarketplaceSettings;
  stats: MarketplaceStats;
  categories: string[];
  tags: string[];
  chatRoomId?: string; // Matrix room ID
  createdAt: string;
  updatedAt: string;
}

// 集市设置
export interface MarketplaceSettings {
  // 成员设置
  requireSellerApproval: boolean; // 卖家是否需要审核
  requireProductApproval: boolean; // 商品是否需要审核
  allowPublicJoin: boolean; // 是否允许公开加入
  memberLimit?: number; // 成员上限
  sellerLimit?: number; // 卖家上限

  // 费用设置
  commissionRate?: number; // 集市佣金比例
  listingFee?: {
    amount: number;
    currency: string;
  };

  // 商品设置
  allowedCategories?: string[]; // 允许的商品分类
  prohibitedKeywords?: string[]; // 禁止的关键词
  maxProductsPerSeller?: number;
  minPrice?: number;
  maxPrice?: number;

  // 显示设置
  showSellerInfo: boolean;
  showSellerRating: boolean;
  customTheme?: {
    primaryColor?: string;
    accentColor?: string;
  };

  // 规则
  rules?: string;
  sellerAgreement?: string;
}

// 集市统计
export interface MarketplaceStats {
  memberCount: number;
  sellerCount: number;
  productCount: number;
  orderCount: number;
  totalVolume: {
    amount: number;
    currency: string;
  };
  averageRating: number;
  reviewCount: number;
}

// 集市成员
export interface MarketplaceMember {
  id: string;
  marketplaceId: string;
  userId: string;
  peerID: string;
  name: string;
  avatar?: string;
  role: MarketplaceRole;
  sellerStatus?: SellerStatus;
  sellerProfile?: SellerProfile;
  joinedAt: string;
  lastActiveAt?: string;
}

// 卖家资料
export interface SellerProfile {
  bio?: string;
  location?: string;
  contactEmail?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    telegram?: string;
  };
  businessInfo?: {
    businessName?: string;
    businessType?: string;
    registrationNumber?: string;
  };
  stats: {
    productCount: number;
    orderCount: number;
    totalSales: number;
    rating: number;
    reviewCount: number;
  };
  verificationStatus: 'none' | 'pending' | 'verified';
  verifiedAt?: string;
}

// 集市商品
export interface MarketplaceProduct {
  id: string;
  productId: string; // 原始商品 ID
  marketplaceId: string;
  sellerId: string;
  approvalStatus: ProductApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  featured: boolean;
  featuredUntil?: string;
  sortOrder?: number;
  categories?: string[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// 集市申请（卖家申请加入）
export interface MarketplaceApplication {
  id: string;
  marketplaceId: string;
  applicantId: string;
  applicantPeerID: string;
  applicantName: string;
  applicantAvatar?: string;
  message?: string;
  sellerProfile: Partial<SellerProfile>;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
}

// 集市邀请
export interface MarketplaceInvitation {
  id: string;
  marketplaceId: string;
  invitedBy: string;
  email?: string;
  peerID?: string;
  role: MarketplaceRole;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: string;
  createdAt: string;
}

// 集市公告
export interface MarketplaceAnnouncement {
  id: string;
  marketplaceId: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

// 集市活动日志
export interface MarketplaceActivityLog {
  id: string;
  marketplaceId: string;
  actorId: string;
  actorName: string;
  action:
    | 'member_joined'
    | 'member_left'
    | 'seller_approved'
    | 'seller_rejected'
    | 'product_approved'
    | 'product_rejected'
    | 'settings_updated'
    | 'announcement_posted'
    | 'member_role_changed';
  targetId?: string;
  targetType?: 'member' | 'product' | 'settings' | 'announcement';
  details?: Record<string, unknown>;
  createdAt: string;
}

// 列表请求参数
export interface MarketplaceListParams {
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'memberCount' | 'productCount';
  sortOrder?: 'asc' | 'desc';
  status?: MarketplaceStatus;
  category?: string;
  search?: string;
  featured?: boolean;
}

// 列表响应
export interface MarketplaceListResponse {
  marketplaces: Marketplace[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// 真实群组社区市场公开投影（来自 mobazha_hosting group-marketplace v1）
export interface PublicGroupMarketplace {
  publicID: string;
  slug?: string;
  platform: 'telegram' | 'discord' | string;
  /** Marketplace vertical preset (e.g. general, collectible, collectibles). */
  vertical?: string;
  name: string;
  publicDescription?: string;
  logoURL?: string;
  bannerURL?: string;
  sellerCount: number;
  productCount: number;
  joinMode: 'group_member' | string;
  visibility: 'active' | string;
  isFeatured: boolean;
  sortOrder: number;
  updatedAt?: string;
}

export interface PublicGroupMarketplaceListResponse {
  groups: PublicGroupMarketplace[];
  count: number;
}

export interface PublicMarketplaceListingRef {
  slug: string;
  peerID: string;
}

export interface PublicMarketplaceProductGroup {
  id: number;
  name: string;
  description?: string;
  sortOrder: number;
  itemCount: number;
}

export interface PublicMarketplaceSeller {
  sellerID: number;
  peerID: string;
  productGroups: PublicMarketplaceProductGroup[];
  sortOrder: number;
  updatedAt?: string;
}

export interface PublicMarketplaceBanner {
  slug: string;
  peerID: string;
  sortOrder: number;
}

export interface PublicMarketplaceListings {
  listings: PublicMarketplaceListingRef[];
  total: number;
  page: number;
  pageSize: number;
  totalPage: number;
}

export interface PublicGroupMarketplaceDetail {
  marketplace: PublicGroupMarketplace;
  sellers: PublicMarketplaceSeller[];
  featured: PublicMarketplaceSeller[];
  banners: PublicMarketplaceBanner[];
  listings: PublicMarketplaceListings;
}

/** Current tenant's seller application for a public community marketplace. */
export interface PublicMarketplaceSellerApplication {
  hasApplication: boolean;
  status?: 'pending' | 'approved' | 'rejected' | 'suspended' | string;
  productGroupIDs?: number[];
}

// 商品列表参数
export interface MarketplaceProductListParams {
  marketplaceId: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'price' | 'rating' | 'sales' | 'featured';
  sortOrder?: 'asc' | 'desc';
  category?: string;
  sellerId?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  approvalStatus?: ProductApprovalStatus;
}

// 成员列表参数
export interface MarketplaceMemberListParams {
  marketplaceId: string;
  page?: number;
  limit?: number;
  role?: MarketplaceRole;
  sellerStatus?: SellerStatus;
  search?: string;
}

// 创建集市请求
export interface CreateMarketplaceRequest extends CreateNativeMarketplaceRequest {
  slug?: string;
  description?: string;
  shortDescription?: string;
  logo?: string;
  banner?: string;
  categories?: string[];
  tags?: string[];
  settings?: Partial<MarketplaceSettings>;
}

// 更新集市请求
export interface UpdateMarketplaceRequest extends UpdateNativeMarketplaceRequest {
  description?: string;
  shortDescription?: string;
  logo?: string;
  banner?: string;
  categories?: string[];
  tags?: string[];
  settings?: Partial<MarketplaceSettings>;
}

// 卖家申请请求
export interface SellerApplicationRequest {
  marketplaceId: string;
  message?: string;
  sellerProfile?: Partial<SellerProfile>;
}

// 商品上架请求
export interface ListProductRequest {
  marketplaceId: string;
  productId: string;
  categories?: string[];
  tags?: string[];
}
