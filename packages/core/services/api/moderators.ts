/**
 * Moderators API Service
 * 仲裁员 API 服务
 */

import { apiClient } from './client';

// Types
export interface Moderator {
  id: string;
  peerID: string;
  name: string;
  handle?: string;
  avatar?: string;
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

// API Functions

/**
 * 获取仲裁员列表
 */
export async function getModerators(
  params: ModeratorListParams = {}
): Promise<ModeratorListResponse> {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.set('page', params.page.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.sortBy) queryParams.set('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
  if (params.verified !== undefined) queryParams.set('verified', params.verified.toString());
  if (params.language) queryParams.set('language', params.language);
  if (params.currency) queryParams.set('currency', params.currency);
  if (params.maxFee) queryParams.set('maxFee', params.maxFee.toString());
  if (params.search) queryParams.set('search', params.search);

  const query = queryParams.toString();
  const url = `/api/v1/moderators${query ? `?${query}` : ''}`;

  return apiClient.get<ModeratorListResponse>(url);
}

/**
 * 获取单个仲裁员详情
 */
export async function getModerator(moderatorId: string): Promise<Moderator> {
  return apiClient.get<Moderator>(`/api/v1/moderators/${moderatorId}`);
}

/**
 * 获取仲裁员详情（通过 PeerID）
 */
export async function getModeratorByPeerId(peerID: string): Promise<Moderator> {
  return apiClient.get<Moderator>(`/api/v1/moderators/peer/${peerID}`);
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
  return apiClient.get<Moderator[]>(`/api/v1/moderators/recommended?limit=${limit}`);
}

/**
 * 提交争议
 */
export async function submitDispute(submission: DisputeSubmission): Promise<Dispute> {
  return apiClient.post<Dispute>('/api/v1/disputes', submission);
}

/**
 * 获取争议详情
 */
export async function getDispute(disputeId: string): Promise<Dispute> {
  return apiClient.get<Dispute>(`/api/v1/disputes/${disputeId}`);
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
    `/api/v1/disputes/me${query ? `?${query}` : ''}`
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
  return apiClient.post<Dispute>(`/api/v1/disputes/${disputeId}/respond`, {
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
  return apiClient.post<Dispute>(`/api/v1/disputes/${disputeId}/evidence`, {
    content,
    attachments,
  });
}

/**
 * 解决争议（仲裁员）
 */
export async function resolveDispute(resolution: DisputeResolution): Promise<Dispute> {
  return apiClient.post<Dispute>(`/api/v1/disputes/${resolution.disputeId}/resolve`, {
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
  return apiClient.get(`/api/v1/moderators/${moderatorId}/reviews${query ? `?${query}` : ''}`);
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
  return apiClient.post(`/api/v1/moderators/${moderatorId}/reviews`, {
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
  return apiClient.post<Moderator>('/api/v1/moderators/register', data);
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
  return apiClient.put<Moderator>('/api/v1/moderators/me', data);
}

/**
 * 获取我的仲裁员资料
 */
export async function getMyModeratorProfile(): Promise<Moderator | null> {
  try {
    return await apiClient.get<Moderator>('/api/v1/moderators/me');
  } catch {
    return null;
  }
}

/**
 * 停用仲裁员身份
 */
export async function deactivateModerator(): Promise<void> {
  return apiClient.delete('/api/v1/moderators/me');
}
