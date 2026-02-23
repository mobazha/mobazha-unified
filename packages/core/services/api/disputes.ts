/**
 * 争议/仲裁 API 服务
 */

import { withMockFallback } from './mode';
import { NODE_API } from '../../config/apiPaths';
import { authGet, authPost, authSafeGet } from './helpers';

// 争议状态
export type DisputeState =
  | 'OPEN'
  | 'PENDING'
  | 'RESOLVED'
  | 'EXPIRED'
  | 'DECIDED'
  | 'PAYMENT_FINALIZED';

// 争议案件
export interface DisputeCase {
  caseId: string;
  orderId: string;
  state: DisputeState;
  timestamp: string;
  buyerContract: {
    orderOpen: {
      pricingCoin: string;
      amount: number;
      listings: Array<{
        listing: {
          item: {
            title: string;
            images: Array<{ medium: string }>;
          };
          slug: string;
        };
        vendorID: {
          peerID: string;
          handle: string;
        };
      }>;
    };
    paymentSent?: {
      coin: string;
      amount: number;
    };
  };
  claim: string;
  resolution?: {
    buyerPercentage: number;
    vendorPercentage: number;
    moderatorPercentage: number;
    resolution: string;
    timestamp: string;
  };
  buyerOpened: boolean;
  read: boolean;
  unreadChatMessages: number;
}

// 案件列表项（简化）
export interface CaseListItem {
  caseId: string;
  orderId: string;
  state: DisputeState;
  timestamp: string;
  read: boolean;
  buyerOpened: boolean;
  total: number;
  coin: string;
  title: string;
  thumbnail: string;
  vendorHandle: string;
  vendorPeerID: string;
}

// Mock 案件数据
const mockCases: CaseListItem[] = [
  {
    caseId: 'CASE-001',
    orderId: 'ORD-003',
    state: 'OPEN',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    read: false,
    buyerOpened: true,
    total: 189.99,
    coin: 'USDT',
    title: 'Vintage Film Camera',
    thumbnail: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=200&h=200&fit=crop',
    vendorHandle: 'Retro Finds',
    vendorPeerID: 'QmVendor789',
  },
];

/**
 * 获取仲裁案件列表
 */
export async function getCases(limit = '', offsetId = ''): Promise<CaseListItem[]> {
  const realFn = async () => {
    return authSafeGet<CaseListItem[]>(`${NODE_API.CASES}?limit=${limit}&offsetId=${offsetId}`, []);
  };

  const mockFn = async () => {
    return mockCases;
  };

  return withMockFallback(realFn, mockFn, '/cases');
}

/**
 * 获取案件详情
 */
export async function getCaseDetails(orderId: string): Promise<DisputeCase | null> {
  const realFn = async () => {
    try {
      return await authGet<DisputeCase>(NODE_API.CASE(orderId));
    } catch {
      return null;
    }
  };

  const mockFn = async () => {
    // Mock: 返回详细案件信息
    const caseItem = mockCases.find(c => c.orderId === orderId);
    if (!caseItem) return null;

    return {
      caseId: caseItem.caseId,
      orderId: caseItem.orderId,
      state: caseItem.state,
      timestamp: caseItem.timestamp,
      buyerContract: {
        orderOpen: {
          pricingCoin: caseItem.coin,
          amount: caseItem.total,
          listings: [
            {
              listing: {
                item: {
                  title: caseItem.title,
                  images: [{ medium: caseItem.thumbnail }],
                },
                slug: 'product-slug',
              },
              vendorID: {
                peerID: caseItem.vendorPeerID,
                handle: caseItem.vendorHandle,
              },
            },
          ],
        },
        paymentSent: {
          coin: caseItem.coin,
          amount: caseItem.total,
        },
      },
      claim:
        'Item not as described. The product arrived damaged and differs significantly from the listing photos.',
      buyerOpened: caseItem.buyerOpened,
      read: caseItem.read,
      unreadChatMessages: 2,
    } as DisputeCase;
  };

  return withMockFallback(realFn, mockFn, `/cases/${orderId}`);
}

/**
 * 开启争议
 */
export async function openDispute(
  orderId: string,
  claim: string
): Promise<{ success: boolean; error?: string }> {
  return authPost(NODE_API.DISPUTE_OPEN, { orderID: orderId, claim });
}

/**
 * 关闭争议（撤回）
 */
export async function closeDispute(orderId: string): Promise<{ success: boolean; error?: string }> {
  return authPost(NODE_API.DISPUTE_CLOSE, { orderID: orderId });
}

/**
 * 仲裁人裁决 - 释放资金
 */
export async function resolveDispute(
  orderId: string,
  buyerPercentage: number,
  vendorPercentage: number,
  resolution: string
): Promise<{ success: boolean; error?: string }> {
  return authPost(NODE_API.DISPUTE_RELEASE, {
    orderID: orderId,
    buyerPercentage,
    vendorPercentage,
    resolution,
  });
}

/**
 * 接受裁决 - 释放托管资金
 */
export async function acceptDisputeResolution(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  return authPost(NODE_API.DISPUTE_RELEASE, { orderID: orderId });
}

/**
 * 超时后释放资金（无需双方同意）
 */
export async function releaseEscrowAfterTimeout(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  return authPost(NODE_API.DISPUTE_RELEASE_AFTER_TIMEOUT, { orderID: orderId });
}

/**
 * 获取裁决执行指令
 */
export async function getReleaseFundsInstructions(
  orderId: string,
  buyerPercentage: number,
  vendorPercentage: number,
  resolution: string
): Promise<{
  instructions?: string;
  signature?: string;
  error?: string;
}> {
  return authPost(NODE_API.INSTRUCTIONS_DISPUTE_RELEASE, {
    orderID: orderId,
    buyerPercentage,
    vendorPercentage,
    resolution,
  });
}

/**
 * 争议 API 导出对象
 */
export const disputesApi = {
  getCases,
  getCaseDetails,
  openDispute,
  closeDispute,
  resolveDispute,
  acceptDisputeResolution,
  releaseEscrowAfterTimeout,
  getReleaseFundsInstructions,
};
