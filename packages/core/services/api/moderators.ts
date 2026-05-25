/**
 * Moderators API Service
 * 仲裁员 API 服务
 *
 * 店铺仲裁人策略来自 StorePolicy；仲裁员目录仍通过 Node/Search
 * profile 能力补齐展示信息。
 */

import { apiClient } from './client';
import { NODE_API, HOSTING_API } from '../../config/apiPaths';
import { truncatePeerId } from '../../utils/identity';
import { fetchVerifiedModerators } from '../verifiedModerators';
import { authGet, authPost, authPut, authDel, publicGet, publicPost, nodeAuthGet } from './helpers';
import { fetchStoreMetadata, getMetadataEntry } from './storeMetadata';

// Types
export interface Moderator {
  id: string;
  peerID: string;
  enabled?: boolean;
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

interface StorePolicyModeratorEntry {
  peerID: string;
  enabled?: boolean;
  position?: number;
}

interface StorePolicyPublic {
  revision: number;
  moderators?: StorePolicyModeratorEntry[];
}

function normalizeStoreModeratorEntries(
  value: StorePolicyModeratorEntry[] | StorePolicyPublic | null | undefined
): StorePolicyModeratorEntry[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === 'object' && Array.isArray(value.moderators)) {
    return value.moderators;
  }
  return [];
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
  vendorPeerID?: string;
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
function isModeratorProfile(profile: BackendProfile): boolean {
  return Boolean(profile.moderator || profile.moderatorInfo);
}

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
 * 获取 StorePolicy 中的店铺仲裁人列表。
 *
 * buyer checkout 使用 seller public StorePolicy；seller admin 使用当前节点
 * admin StorePolicy。Profile、Listing、Preferences 都不是当前策略来源。
 */
async function getStoreModeratorEntries(
  vendorPeerID?: string
): Promise<StorePolicyModeratorEntry[]> {
  try {
    if (vendorPeerID) {
      const policy = await publicGet<StorePolicyPublic>(
        NODE_API.STORE_POLICY_PUBLISHED(vendorPeerID)
      );
      return normalizeStoreModeratorEntries(policy);
    }
    const response = await authGet<StorePolicyModeratorEntry[] | StorePolicyPublic>(
      NODE_API.STORE_POLICY_MODERATORS
    );
    return normalizeStoreModeratorEntries(response);
  } catch (error) {
    if (vendorPeerID) {
      const metadata = await fetchStoreMetadata(vendorPeerID, ['store_policy']);
      const policy = getMetadataEntry<StorePolicyPublic>(metadata, 'store_policy');
      const entries = normalizeStoreModeratorEntries(policy);
      if (policy || entries.length > 0) {
        return entries;
      }
    }
    console.warn('Error fetching store policy moderators:', error);
    return [];
  }
}

async function getStoreModerators(vendorPeerID?: string): Promise<string[]> {
  const entries = await getStoreModeratorEntries(vendorPeerID);
  return entries.map(entry => entry.peerID).filter(Boolean);
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
 * 获取仲裁员列表。
 *
 * seller admin 读取当前节点 StorePolicy；buyer checkout 读取 seller public
 * StorePolicy，然后用 profiles/batch 补齐展示信息。
 */
export async function getModerators(
  params: ModeratorListParams = {}
): Promise<ModeratorListResponse> {
  const moderatorEntries = (await getStoreModeratorEntries(params.vendorPeerID)).filter(
    entry => !params.vendorPeerID || entry.enabled !== false
  );
  const moderatorPeerIDs = moderatorEntries.map(entry => entry.peerID).filter(Boolean);

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

  // 既然这些 peerID 来自 StorePolicy，我们就显示所有成功获取的 profile
  // 即使没有 moderatorInfo，也显示（可能是用户还没设置调解员信息）
  const moderatorProfiles = profiles.filter(p => p && p.peerID);
  const profileByPeer = new Map(moderatorProfiles.map(p => [p.peerID, p]));

  // 转换格式；profile 拉取失败时仍保留 peerID 占位，避免列表与 StorePolicy 不一致
  let moderators: Moderator[] = moderatorEntries.map(entry => {
    const peerID = entry.peerID;
    const profile = profileByPeer.get(peerID);
    if (profile) {
      return {
        ...convertProfileToModerator(profile),
        enabled: entry.enabled ?? true,
      };
    }
    return {
      id: peerID,
      peerID,
      enabled: entry.enabled ?? true,
      name: truncatePeerId(peerID, 6),
      languages: [],
      fee: { percentage: 0, feeType: 'percentage' },
      acceptedCurrencies: [],
      verified: false,
      stats: {
        rating: 0,
        ratingCount: 0,
        disputesHandled: 0,
        averageResolutionTime: 0,
        successRate: 0,
      },
      createdAt: '',
      updatedAt: '',
    };
  });

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
 * 覆盖保存店铺仲裁人 peerID 列表
 */
export async function setStoreModerators(
  peerIDs: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const unique = [...new Set(peerIDs.map(id => id.trim()).filter(Boolean))];
    await authPut(NODE_API.STORE_POLICY_MODERATORS, {
      moderators: unique.map((peerID, position) => ({
        peerID,
        enabled: true,
        position,
      })),
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update store moderators',
    };
  }
}

/**
 * 添加店铺仲裁人（写入 StorePolicy）
 */
export async function addStoreModerator(
  peerID: string
): Promise<{ success: boolean; error?: string; moderator?: Moderator }> {
  const trimmed = peerID.trim();
  if (!trimmed) {
    return { success: false, error: 'Peer ID is required' };
  }

  const current = await getStoreModerators();
  if (current.includes(trimmed)) {
    return { success: false, error: 'Moderator already added' };
  }

  const profiles = await fetchProfiles([trimmed]);
  if (profiles.length === 0) {
    return { success: false, error: 'Moderator profile not found' };
  }
  if (!isModeratorProfile(profiles[0])) {
    return { success: false, error: 'Profile is not a moderator' };
  }

  const saveResult = await setStoreModerators([...current, trimmed]);
  if (!saveResult.success) {
    return saveResult;
  }

  const moderator = convertProfileToModerator(profiles[0]);
  return { success: true, moderator };
}

/**
 * 从店铺仲裁人列表移除
 */
export async function removeStoreModerator(
  peerID: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const trimmed = peerID.trim();
    if (!trimmed) {
      return { success: false, error: 'Peer ID is required' };
    }
    await authDel(NODE_API.STORE_POLICY_MODERATOR(trimmed));
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove store moderator',
    };
  }
}

/**
 * 发现网络中的候选仲裁员（目录页）
 *
 * 1. 本地节点 GET /v1/moderators?include=profile（仅 Search 认证列表；DHT 扫描已移除）
 * 2. 合并 Search verified moderators 中尚未出现的 peerID（profiles/batch）
 * 3. 标记 verified 状态
 *
 * 未列入 Search 认证列表的调解员（如 E2E testuser3）需通过 Peer ID 直接 lookup。
 */
export async function discoverModerators(): Promise<Moderator[]> {
  const verifiedSet = await fetchVerifiedModerators();
  const profileByPeer = new Map<string, BackendProfile>();

  try {
    const networkProfiles = await nodeAuthGet<BackendProfile[]>(
      `${NODE_API.SELF_MODERATOR}?include=profile`
    );
    if (Array.isArray(networkProfiles)) {
      for (const profile of networkProfiles) {
        if (profile?.peerID) {
          profileByPeer.set(profile.peerID, profile);
        }
      }
    }
  } catch (error) {
    console.warn('Network moderator discovery unavailable:', error);
  }

  const missingVerified = Array.from(verifiedSet).filter(peerID => !profileByPeer.has(peerID));
  if (missingVerified.length > 0) {
    const verifiedProfiles = await fetchProfiles(missingVerified);
    for (const profile of verifiedProfiles) {
      if (profile.peerID) {
        profileByPeer.set(profile.peerID, profile);
      }
    }
  }

  if (profileByPeer.size === 0) {
    try {
      const recommended = await getRecommendedModerators(20);
      return recommended.map(mod => ({
        ...mod,
        verified: verifiedSet.has(mod.peerID),
      }));
    } catch {
      return [];
    }
  }

  return Array.from(profileByPeer.values())
    .filter(isModeratorProfile)
    .map(profile => {
      const mod = convertProfileToModerator(profile);
      mod.verified = verifiedSet.has(profile.peerID);
      return mod;
    });
}

export type ModeratorLookupResult =
  | { status: 'found'; moderator: Moderator }
  | { status: 'not_found' }
  | { status: 'not_moderator'; profileName?: string };

/**
 * 按 Peer ID 查找调解员候选（目录搜索 / 手动添加预览）
 */
export async function lookupModeratorCandidate(peerID: string): Promise<ModeratorLookupResult> {
  const trimmed = peerID.trim();
  if (!trimmed) {
    return { status: 'not_found' };
  }

  const verifiedSet = await fetchVerifiedModerators();
  const profiles = await fetchProfiles([trimmed]);

  if (profiles.length === 0) {
    return { status: 'not_found' };
  }

  const profile = profiles[0];
  if (!isModeratorProfile(profile)) {
    return {
      status: 'not_moderator',
      profileName: profile.name || profile.handle,
    };
  }

  const mod = convertProfileToModerator(profile);
  mod.verified = verifiedSet.has(trimmed);
  return { status: 'found', moderator: mod };
}

/**
 * 通过 PeerID 获取仲裁员详情（优先 profiles/batch，fallback hosting API）
 */
export async function getModeratorDetail(peerID: string): Promise<Moderator | null> {
  const trimmed = peerID.trim();
  if (!trimmed) return null;

  const lookup = await lookupModeratorCandidate(trimmed);
  if (lookup.status === 'found') {
    return lookup.moderator;
  }

  const verifiedSet = await fetchVerifiedModerators();

  try {
    const mod = await getModeratorByPeerId(trimmed);
    mod.verified = verifiedSet.has(trimmed);
    return mod;
  } catch {
    return null;
  }
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
 * 成为仲裁员（注册）— 调用 Node API
 * POST /v1/moderators
 * Body: ModeratorInfo (description, termsAndConditions, languages, acceptedCurrencies, fee)
 */
export interface SetModeratorRequest {
  description: string;
  termsAndConditions: string;
  languages: string[];
  acceptedCurrencies: string[];
  fee: {
    fixedFee?: {
      amount: number;
      currencyCode: string;
    };
    percentage: number;
    feeType: 'FIXED' | 'PERCENTAGE' | 'FIXED_PLUS_PERCENTAGE';
  };
}

export async function setAsModerator(data: SetModeratorRequest): Promise<void> {
  await authPost(NODE_API.SELF_MODERATOR, data);
}

/**
 * 取消仲裁员身份 — 调用 Node API
 * DELETE /v1/moderators
 */
export async function unsetAsModerator(): Promise<void> {
  await authDel(NODE_API.SELF_MODERATOR);
}
