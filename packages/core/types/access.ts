/**
 * Access Control Types
 * 权限控制类型定义
 */

// 用户分组
export interface UserGroup {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  permissions: GroupPermissions;
  memberCount: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// 分组权限
export interface GroupPermissions {
  canViewStore: boolean;
  canViewProducts: boolean;
  canViewPrices: boolean;
  canPurchase: boolean;
  canAccessChat: boolean;
  canViewDiscounts: boolean;
  productGroupAccess: string[]; // 可访问的商品分组 ID
  specialPricing?: {
    discountPercentage?: number;
    priceMultiplier?: number;
  };
}

// 商品分组
export interface ProductGroup {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  color?: string;
  productCount: number;
  visibility: ProductGroupVisibility;
  accessUserGroups: string[]; // 可访问此分组的用户组 ID
  createdAt: string;
  updatedAt: string;
}

// 商品分组可见性
export enum ProductGroupVisibility {
  PUBLIC = 'public', // 所有人可见
  MEMBERS_ONLY = 'members_only', // 仅店铺成员可见
  GROUP_ONLY = 'group_only', // 仅指定用户组可见
  HIDDEN = 'hidden', // 隐藏
}

// 用户组成员
export interface UserGroupMember {
  id: string;
  groupId: string;
  userId: string;
  peerID: string;
  name: string;
  avatar?: string;
  addedAt: string;
  addedBy: string;
  expiresAt?: string;
}

// 商品分组关联
export interface ProductGroupItem {
  id: string;
  groupId: string;
  productId: string;
  addedAt: string;
  sortOrder?: number;
}

// 店铺访问请求
export interface StoreAccessRequest {
  id: string;
  storeId: string;
  requesterId: string;
  requesterPeerID: string;
  requesterName: string;
  requesterAvatar?: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  assignedGroups?: string[];
  createdAt: string;
}

// 店铺隐私设置
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

// 访问日志
export interface AccessLog {
  id: string;
  storeId: string;
  userId: string;
  userName: string;
  action:
    | 'view_store'
    | 'view_product'
    | 'access_granted'
    | 'access_denied'
    | 'group_added'
    | 'group_removed';
  targetType?: 'store' | 'product' | 'group';
  targetId?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

// 创建用户组请求
export interface CreateUserGroupRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  permissions: GroupPermissions;
  isDefault?: boolean;
}

// 更新用户组请求
export interface UpdateUserGroupRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  permissions?: Partial<GroupPermissions>;
}

// 创建商品分组请求
export interface CreateProductGroupRequest {
  name: string;
  description?: string;
  color?: string;
  visibility: ProductGroupVisibility;
  accessUserGroups?: string[];
}

// 更新商品分组请求
export interface UpdateProductGroupRequest {
  name?: string;
  description?: string;
  color?: string;
  visibility?: ProductGroupVisibility;
  accessUserGroups?: string[];
}

// 审核访问请求
export interface ReviewAccessRequestData {
  approved: boolean;
  note?: string;
  assignedGroups?: string[];
}

// 默认权限模板
export const DEFAULT_GROUP_PERMISSIONS: GroupPermissions = {
  canViewStore: true,
  canViewProducts: true,
  canViewPrices: true,
  canPurchase: true,
  canAccessChat: false,
  canViewDiscounts: false,
  productGroupAccess: [],
};

// VIP 权限模板
export const VIP_GROUP_PERMISSIONS: GroupPermissions = {
  canViewStore: true,
  canViewProducts: true,
  canViewPrices: true,
  canPurchase: true,
  canAccessChat: true,
  canViewDiscounts: true,
  productGroupAccess: [],
  specialPricing: {
    discountPercentage: 10,
  },
};

// 预设颜色
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
