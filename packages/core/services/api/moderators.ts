/**
 * Moderators API Service
 * 仲裁员 API 服务
 *
 * 后端 API：GET /v1/moderators?include=profile
 * 返回 Profile[] 数组，每个 Profile 包含 moderatorInfo 字段
 */

import { apiClient } from './client';
import { NODE_API, HOSTING_API } from '../../config/apiPaths';
import { authGet, publicPost } from './helpers';

// Types
export interface Moderator {
  id: string;
  peerID: string;
  name: string;
  handle?: string;
  avatar?: string;
  avatarHashes?: {
    tiny?: string;
    small?: string;
    medium?: string;
    large?: string;
    original?: string;
  };
  location?: string;
  shortDescription?: string;
  description?: string;
  languages: string[];
  fee: {
    percentage: number;
    feeType: 'percentage' | 'fixed' | 'fixed_plus_percentage';
    fixedFee?: {
      amount: number;
      currency: string;
    };
  };
  termsAndConditions?: string;
  acceptedCurrencies: string[];
  verified: boolean;
  stats: {
    rating: number;
    ratingCount: number;
    disputesHandled: number;
    averageResolutionTime: number; // in hours
    successRate: number; // percentage
  };
  contactInfo?: {
    email?: string;
    website?: string;
    social?: {
      twitter?: string;
      telegram?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * 后端返回的 Profile 结构
 */
interface BackendProfile {
  peerID: string;
  name: string;
  handle?: string;
  location?: string;
  about?: string;
  shortDescription?: string;
  moderator: boolean;
  moderatorInfo?: {
    description?: string;
    termsAndConditions?: string;
    languages?: string[];
    acceptedCurrencies?: string[];
    fee: {
      fixedFee?: {
        amount: string | number;
        currencyCode: string;
      };
      percentage: number;
      feeType: string; // "FIXED" | "PERCENTAGE" | "FIXED_PLUS_PERCENTAGE"
    };
  };
  avatarHashes?: {
    tiny?: string;
    small?: string;
    medium?: string;
    large?: string;
    original?: string;
  };
  stats?: {
    averageRating?: number;
    ratingCount?: number;
  };
  contactInfo?: {
    website?: string;
    email?: string;
    social?: { type: string; username: string }[];
  };
}

export interface ModeratorListParams {
  page?: number;
  limit?: number;
  sortBy?: 'rating' | 'disputes' | 'fee' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  verified?: boolean;
  language?: string;
  currency?: string;
  maxFee?: number;
  search?: string;
}

export interface ModeratorListResponse {
  moderators: Moderator[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface DisputeSubmission {
  orderId: string;
  claim: string;
  evidence?: string[];
}

export interface DisputeResolution {
  disputeId: string;
  decision: 'buyer' | 'seller' | 'split';
  buyerPercentage: number;
  sellerPercentage: number;
  reason: string;
}

export interface Dispute {
  id: string;
  orderId: string;
  moderatorId: string;
  buyerId: string;
  sellerId: string;
  claim: string;
  response?: string;
  evidence: {
    party: 'buyer' | 'seller';
    content: string;
    attachments?: string[];
    timestamp: string;
  }[];
  status: 'open' | 'in_progress' | 'resolved' | 'expired';
  resolution?: {
    decision: 'buyer' | 'seller' | 'split';
    buyerPercentage: number;
    sellerPercentage: number;
    reason: string;
    timestamp: string;
  };
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

/**
 * 将后端的 feeType 字符串转换为前端格式
 */
function convertFeeType(backendFeeType: string): 'percentage' | 'fixed' | 'fixed_plus_percentage' {
  switch (backendFeeType?.toUpperCase()) {
    case 'FIXED':
      return 'fixed';
    case 'PERCENTAGE':
      return 'percentage';
    case 'FIXED_PLUS_PERCENTAGE':
      return 'fixed_plus_percentage';
    default:
      return 'percentage';
  }
}

/**
 * 将后端的 Profile 转换为前端的 Moderator
 */
function convertProfileToModerator(profile: BackendProfile): Moderator {
  const modInfo = profile.moderatorInfo;
  const fee = modInfo?.fee;

  return {
    id: profile.peerID,
    peerID: profile.peerID,
    name: profile.name || profile.handle || profile.peerID.slice(0, 8),
    handle: profile.handle,
    avatar: profile.avatarHashes?.medium || profile.avatarHashes?.small,
    avatarHashes: profile.avatarHashes,
    location: profile.location,
    shortDescription: profile.shortDescription,
    description: modInfo?.description || profile.about,
    languages: modInfo?.languages || [],
    fee: {
      percentage: fee?.percentage || 0,
      feeType: convertFeeType(fee?.feeType || 'PERCENTAGE'),
      fixedFee: fee?.fixedFee
        ? {
            amount: Number(fee.fixedFee.amount) || 0,
            currency: fee.fixedFee.currencyCode || 'USD',
          }
        : undefined,
    },
    termsAndConditions: modInfo?.termsAndConditions,
    acceptedCurrencies: modInfo?.acceptedCurrencies || [],
    verified: false, // 后端没有直接返回，需要从 verifiedMods 列表判断
    stats: {
      rating: profile.stats?.averageRating || 0,
      ratingCount: profile.stats?.ratingCount || 0,
      disputesHandled: 0, // 后端未提供
      averageResolutionTime: 0, // 后端未提供
      successRate: 0, // 后端未提供
    },
    contactInfo: profile.contactInfo
      ? {
          email: profile.contactInfo.email,
          website: profile.contactInfo.website,
          social: profile.contactInfo.social?.reduce(
            (acc, s) => {
              if (s.type === 'twitter') acc.twitter = s.username;
              if (s.type === 'telegram') acc.telegram = s.username;
              return acc;
            },
            {} as { twitter?: string; telegram?: string }
          ),
        }
      : undefined,
    createdAt: '',
    updatedAt: '',
  };
}

// API Functions

/**
 * 获取用户偏好设置中的 storeModerators 列表
 */
async function getStoreModerators(): Promise<string[]> {
  try {
    const preferences = await authGet<{ storeModerators?: string[] }>(NODE_API.PREFERENCES);
    return preferences.storeModerators || [];
  } catch (error) {
    console.warn('Error fetching store moderators:', error);
    return [];
  }
}

/**
 * 批量获取 profile 信息
 * POST /v1/profiles/batch
 */
/**
 * fetchprofiles API 返回的数据结构
 */
interface FetchProfilesResponse {
  id: string;
  peerID: string;
  profile: BackendProfile;
}

async function fetchProfiles(peerIDs: string[]): Promise<BackendProfile[]> {
  if (peerIDs.length === 0) {
    return [];
  }

  try {
    const data = await publicPost<FetchProfilesResponse[]>(NODE_API.PROFILES_BATCH, peerIDs);

    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .map((item: FetchProfilesResponse) => {
        if (item.profile) {
          return {
            ...item.profile,
            peerID: item.profile.peerID || item.peerID,
          };
        }
        return null;
      })
      .filter((p): p is BackendProfile => p !== null);
  } catch (error) {
    console.warn('Error fetching profiles:', error);
    return [];
  }
}

/**
 * 获取仲裁员列表
 *
 * 实现逻辑（参考桌面端）：
 * 1. 从 GET /v1/preferences 获取 storeModerators 列表（peerID 数组）
 * 2. 用 POST /v1/profiles/batch 批量获取这些 peerID 的 profile 信息
 * 3. 转换为前端 Moderator 格式
 */
export async function getModerators(
  params: ModeratorListParams = {}
): Promise<ModeratorListResponse> {
  // 步骤 1: 获取 storeModerators 列表
  const moderatorPeerIDs = await getStoreModerators();

  if (moderatorPeerIDs.length === 0) {
    return {
      moderators: [],
      total: 0,
      page: 1,
      limit: params.limit || 20,
      hasMore: false,
    };
  }

  // 步骤 2: 批量获取 profile 信息
  const profiles = await fetchProfiles(moderatorPeerIDs);

  // 既然这些 peerID 来自 storeModerators，我们就显示所有成功获取的 profile
  // 即使没有 moderatorInfo，也显示（可能是用户还没设置调解员信息）
  const moderatorProfiles = profiles.filter(p => p && p.peerID);

  // 转换格式
  let moderators = moderatorProfiles.map(convertProfileToModerator);

  // 前端过滤（后端 API 不支持这些参数）
  if (params.language) {
    moderators = moderators.filter(m => m.languages.includes(params.language!));
  }
  if (params.currency) {
    moderators = moderators.filter(m => m.acceptedCurrencies.includes(params.currency!));
  }
  if (params.search) {
    const searchLower = params.search.toLowerCase();
    moderators = moderators.filter(
      m =>
        m.name.toLowerCase().includes(searchLower) ||
        m.handle?.toLowerCase().includes(searchLower) ||
        m.description?.toLowerCase().includes(searchLower)
    );
  }

  // 排序
  if (params.sortBy) {
    moderators.sort((a, b) => {
      let comparison = 0;
      switch (params.sortBy) {
        case 'rating':
          comparison = b.stats.rating - a.stats.rating;
          break;
        case 'fee':
          comparison = a.fee.percentage - b.fee.percentage;
          break;
        default:
          comparison = 0;
      }
      return params.sortOrder === 'asc' ? -comparison : comparison;
    });
  }

  // 分页
  const limit = params.limit || 20;
  const page = params.page || 1;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedModerators = moderators.slice(startIndex, endIndex);

  return {
    moderators: paginatedModerators,
    total: moderators.length,
    page,
    limit,
    hasMore: endIndex < moderators.length,
  };
}

/**
 * 获取单个仲裁员详情
 */
export async function getModerator(moderatorId: string): Promise<Moderator> {
  return apiClient.get<Moderator>(HOSTING_API.MODERATOR(moderatorId));
}

/**
 * 获取仲裁员详情（通过 PeerID）
 */
export async function getModeratorByPeerId(peerID: string): Promise<Moderator> {
  return apiClient.get<Moderator>(HOSTING_API.MODERATOR_BY_PEER(peerID));
}

/**
 * 搜索仲裁员
 */
export async function searchModerators(
  query: string,
  params: Omit<ModeratorListParams, 'search'> = {}
): Promise<ModeratorListResponse> {
  return getModerators({ ...params, search: query });
}

/**
 * 获取推荐仲裁员
 */
export async function getRecommendedModerators(limit: number = 5): Promise<Moderator[]> {
  return apiClient.get<Moderator[]>(`${HOSTING_API.MODERATORS_RECOMMENDED}?limit=${limit}`);
}

/**
 * 提交争议
 */
export async function submitDispute(submission: DisputeSubmission): Promise<Dispute> {
  return apiClient.post<Dispute>(HOSTING_API.DISPUTES, submission);
}

/**
 * 获取争议详情
 */
export async function getDispute(disputeId: string): Promise<Dispute> {
  return apiClient.get<Dispute>(HOSTING_API.DISPUTE(disputeId));
}

/**
 * 获取用户相关的争议列表
 */
export async function getMyDisputes(params: {
  role?: 'buyer' | 'seller' | 'moderator';
  status?: 'open' | 'in_progress' | 'resolved' | 'expired';
  page?: number;
  limit?: number;
}): Promise<{ disputes: Dispute[]; total: number }> {
  const queryParams = new URLSearchParams();

  if (params.role) queryParams.set('role', params.role);
  if (params.status) queryParams.set('status', params.status);
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());

  const query = queryParams.toString();
  return apiClient.get<{ disputes: Dispute[]; total: number }>(
    `${HOSTING_API.DISPUTES_ME}${query ? `?${query}` : ''}`
  );
}

/**
 * 响应争议（作为卖家）
 */
export async function respondToDispute(
  disputeId: string,
  response: string,
  evidence?: string[]
): Promise<Dispute> {
  return apiClient.post<Dispute>(HOSTING_API.DISPUTE_RESPOND(disputeId), {
    response,
    evidence,
  });
}

/**
 * 添加争议证据
 */
export async function addDisputeEvidence(
  disputeId: string,
  content: string,
  attachments?: string[]
): Promise<Dispute> {
  return apiClient.post<Dispute>(HOSTING_API.DISPUTE_EVIDENCE(disputeId), {
    content,
    attachments,
  });
}

/**
 * 解决争议（仲裁员）
 */
export async function resolveDispute(resolution: DisputeResolution): Promise<Dispute> {
  return apiClient.post<Dispute>(HOSTING_API.DISPUTE_RESOLVE(resolution.disputeId), {
    decision: resolution.decision,
    buyerPercentage: resolution.buyerPercentage,
    sellerPercentage: resolution.sellerPercentage,
    reason: resolution.reason,
  });
}

/**
 * 获取仲裁员评价
 */
export async function getModeratorReviews(
  moderatorId: string,
  params: { page?: number; limit?: number } = {}
): Promise<{
  reviews: {
    id: string;
    orderId: string;
    rating: number;
    comment: string;
    reviewer: {
      peerID: string;
      name: string;
    };
    createdAt: string;
  }[];
  total: number;
}> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());

  const query = queryParams.toString();
  return apiClient.get(`${HOSTING_API.MODERATOR_REVIEWS(moderatorId)}${query ? `?${query}` : ''}`);
}

/**
 * 评价仲裁员
 */
export async function reviewModerator(
  moderatorId: string,
  orderId: string,
  rating: number,
  comment: string
): Promise<void> {
  return apiClient.post(HOSTING_API.MODERATOR_REVIEWS(moderatorId), {
    orderId,
    rating,
    comment,
  });
}

/**
 * 成为仲裁员（注册）
 */
export async function registerAsModerator(data: {
  shortDescription: string;
  description: string;
  languages: string[];
  fee: Moderator['fee'];
  termsAndConditions: string;
  acceptedCurrencies: string[];
  contactInfo?: Moderator['contactInfo'];
}): Promise<Moderator> {
  return apiClient.post<Moderator>(HOSTING_API.MODERATORS_REGISTER, data);
}

/**
 * 更新仲裁员资料
 */
export async function updateModeratorProfile(
  data: Partial<{
    shortDescription: string;
    description: string;
    languages: string[];
    fee: Moderator['fee'];
    termsAndConditions: string;
    acceptedCurrencies: string[];
    contactInfo: Moderator['contactInfo'];
  }>
): Promise<Moderator> {
  return apiClient.put<Moderator>(HOSTING_API.MODERATORS_ME, data);
}

/**
 * 获取我的仲裁员资料
 */
export async function getMyModeratorProfile(): Promise<Moderator | null> {
  try {
    return await apiClient.get<Moderator>(HOSTING_API.MODERATORS_ME);
  } catch {
    return null;
  }
}

/**
 * 停用仲裁员身份
 */
export async function deactivateModerator(): Promise<void> {
  return apiClient.delete(HOSTING_API.MODERATORS_ME);
}
