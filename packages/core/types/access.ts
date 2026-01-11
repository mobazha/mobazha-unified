/**
 * Access Control Types
 * 权限控制类型定义
 *
 * 与 mobazha_hosting 后端 API 对齐
 */

// ============ 用户组 (User Group) ============

/**
 * 用户组
 * 商家创建的用户分组，用于管理哪些用户可以访问特定内容
 */
export interface UserGroup {
  id: number;
  ownerPeerID: string;
  name: string;
  description?: string;
  memberCount?: number;
  createdAt: string;
  updatedAt?: string;
}

/**
 * 用户组成员
 */
export interface UserGroupMember {
  id: number;
  groupId: number;
  peerID: string;
  addedAt: string;
}

/**
 * 创建用户组请求
 */
export interface CreateUserGroupRequest {
  ownerPeerID: string;
  name: string;
  description?: string;
}

/**
 * 更新用户组请求
 */
export interface UpdateUserGroupRequest {
  name?: string;
  description?: string;
}

// ============ 产品组 (Product Group) ============

/**
 * 产品组
 * 商品分组，用于组织商品并配置访问权限
 */
export interface ProductGroup {
  id: number;
  userID: string; // Telegram User ID 或其他平台 User ID
  ownerPeerID?: string;
  name: string;
  description?: string;
  itemCount?: number;
  createdAt: string;
  updatedAt?: string;
}

/**
 * 产品组中的商品
 */
export interface ProductGroupItem {
  id: number;
  groupId: number;
  listingSlug: string;
  peerID: string;
  addedAt: string;
}

/**
 * 创建产品组请求
 */
export interface CreateProductGroupRequest {
  userID: string;
  name: string;
  description?: string;
}

/**
 * 更新产品组请求
 */
export interface UpdateProductGroupRequest {
  name?: string;
  description?: string;
}

// ============ 产品组授权 (Product Group Authorization) ============

/**
 * 授权类型
 */
export type AuthorizationType = 'group_marketplace' | 'user_group';

/**
 * 产品组授权规则
 * 控制谁可以访问产品组中的商品
 */
export interface ProductGroupAuthorization {
  id: number;
  productGroupId: number;
  authType: AuthorizationType;
  /** 群组平台 (group_marketplace 时使用) */
  groupPlatform?: string;
  /** 群组 Chat ID (group_marketplace 时使用) */
  groupChatID?: string;
  /** 用户组 ID (user_group 时使用) */
  userGroupID?: number;
  /** 用户组名称 (响应中返回) */
  userGroupName?: string;
  createdAt: string;
}

/**
 * 添加产品组授权请求
 */
export interface AddProductGroupAuthorizationRequest {
  authType: AuthorizationType;
  /** 群组平台 (group_marketplace 时必填) */
  groupPlatform?: string;
  /** 群组 Chat ID (group_marketplace 时必填) */
  groupChatID?: string;
  /** 用户组 ID (user_group 时必填) */
  userGroupID?: number;
}

// ============ 店铺访问控制 (Store Access Control) ============

/**
 * 访问申请状态
 */
export type AccessRequestStatus = 'pending' | 'approved' | 'rejected';

/**
 * 店铺访问申请
 */
/**
 * 申请人的 Profile 信息（从后端获取）
 */
export interface RequestorProfile {
  peerID: string;
  name?: string;
  avatarHashes?: {
    tiny?: string;
    small?: string;
    medium?: string;
    large?: string;
    original?: string;
  };
  handle?: string;
}

export interface StoreAccessRequest {
  id: number;
  storePeerID: string;
  requestorPeerID: string;
  /** @deprecated 使用 requestorProfile.name */
  requestorName?: string;
  /** @deprecated 使用 requestorProfile.avatarHashes */
  requestorAvatar?: string;
  /** 申请人的完整 profile 信息 */
  requestorProfile?: RequestorProfile;
  note?: string;
  status: AccessRequestStatus;
  reviewedAt?: string;
  reviewNote?: string;
  assignedUserGroupID?: number;
  /** 批准时分配的用户组信息 */
  userGroup?: {
    id: number;
    name: string;
  };
  createdAt: string;
}

/**
 * 提交访问申请请求
 */
export interface SubmitAccessRequestData {
  storePeerID: string;
  requestorPeerID: string;
  note?: string;
}

/**
 * 审核访问申请请求
 */
export interface ReviewAccessRequestData {
  status: 'approved' | 'rejected';
  userGroupID?: number;
}

/**
 * 店铺访问设置
 */
export interface StoreAccessSettings {
  peerID: string;
  allowExternalApplications: boolean;
  autoApprove?: boolean;
  /** 是否为私密店铺 */
  isPrivateStore?: boolean;
  /** 是否允许访问申请 */
  allowAccessRequests?: boolean;
  /** 是否自动批准申请 */
  autoApproveRequests?: boolean;
  /** 欢迎消息 */
  welcomeMessage?: string;
}

/**
 * 访问权限检查结果
 */
export interface StoreAccessCheckResult {
  /** 是否有完整访问权限（白名单） */
  hasFullAccess: boolean;
  /** 是否有群组集市访问权限（受限） */
  hasGroupAccess: boolean;
  /** 访问类型 */
  accessType: 'whitelist' | 'group_marketplace' | 'none';
  /** 是否需要申请 */
  needsRequest: boolean;
  /** 申请状态 */
  requestStatus?: AccessRequestStatus;
  /** 群组信息（如果是群组访问） */
  groupInfo?: {
    platform: string;
    chatId: string;
    chatTitle?: string;
  };
}

/**
 * 白名单用户
 */
export interface StoreAccessListItem {
  id: number;
  storePeerID: string;
  requestorPeerID: string;
  addedAt: string;
  /** 用户的完整 profile 信息 */
  userProfile?: RequestorProfile;
}

// ============ 群组集市 (Group Marketplace) ============

/**
 * 群组平台类型
 */
export type GroupPlatform = 'telegram' | 'discord';

/**
 * 群组上下文
 * 用于标识用户当前所在的群组环境
 */
export interface GroupContext {
  platform: GroupPlatform;
  chatId: string;
  chatType?: string;
  chatTitle?: string;
  chatUsername?: string;
  /** 是否需要服务端验证 */
  needsVerification?: boolean;
}

/**
 * 群组集市信息
 */
export interface GroupMarketplace {
  id: number;
  platform: GroupPlatform;
  chatID: string;
  chatType?: string;
  chatTitle?: string;
  chatUsername?: string;
  isActive: boolean;
  createdAt: string;
}

/**
 * 群组卖家
 */
export interface GroupSeller {
  id: number;
  groupMarketplaceId: number;
  userID: string;
  peerID?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  isVisible: boolean;
  productGroupIDs?: number[];
  createdAt: string;
  updatedAt?: string;
}

/**
 * 申请成为卖家请求
 */
export interface ApplyAsSellerRequest {
  userID: string;
  productGroupIDs?: number[];
}

/**
 * 审核卖家请求
 */
export interface ReviewSellerRequest {
  status: 'approved' | 'rejected' | 'suspended';
  platformUserID: string;
}

// ============ 旧版兼容类型 (Deprecated) ============

/**
 * @deprecated 使用 UserGroup 替代
 * 分组权限（旧版设计，保留用于兼容）
 */
export interface GroupPermissions {
  canViewStore: boolean;
  canViewProducts: boolean;
  canViewPrices: boolean;
  canPurchase: boolean;
  canAccessChat: boolean;
  canViewDiscounts: boolean;
  productGroupAccess: string[];
  specialPricing?: {
    discountPercentage?: number;
    priceMultiplier?: number;
  };
}

/**
 * @deprecated 使用 StoreAccessSettings 替代
 * 店铺隐私设置（旧版设计）
 */
export interface StorePrivacySettings {
  storeId: string;
  isPrivate: boolean;
  requireApproval: boolean;
  defaultUserGroup?: string;
  welcomeMessage?: string;
  blockedUsers: string[];
  allowedCountries?: string[];
  deniedCountries?: string[];
}

/**
 * 商品分组可见性
 */
export enum ProductGroupVisibility {
  PUBLIC = 'public',
  MEMBERS_ONLY = 'members_only',
  GROUP_ONLY = 'group_only',
  HIDDEN = 'hidden',
}

// ============ 常量 ============

/**
 * 预设颜色
 */
export const GROUP_COLORS = [
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#6366F1', // Indigo
  '#14B8A6', // Teal
];
