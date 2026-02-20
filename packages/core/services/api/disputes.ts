/**
 * 争议/仲裁 API 服务
 */

import { get, post, safeRequest } from './client';
import { getGatewayUrl, getAuthHeaders } from './config';
import { withMockFallback } from './mode';

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
export async function getCases(
  username?: string,
  password?: string,
  limit = '',
  offsetId = ''
): Promise<CaseListItem[]> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/cases?limit=${limit}&offsetId=${offsetId}`;
    return safeRequest<CaseListItem[]>(url, { headers: getAuthHeaders(username, password) }, []);
  };

  const mockFn = async () => {
    return mockCases;
  };

  return withMockFallback(realFn, mockFn, '/cases');
}

/**
 * 获取案件详情
 */
export async function getCaseDetails(
  orderId: string,
  username?: string,
  password?: string
): Promise<DisputeCase | null> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/cases/${orderId}`;
    try {
      return await get<DisputeCase>(url, getAuthHeaders(username, password));
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
  claim: string,
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const url = `${getGatewayUrl()}/dispute/open`;
  return post(url, { orderID: orderId, claim }, getAuthHeaders(username, password));
}

/**
 * 关闭争议（撤回）
 */
export async function closeDispute(
  orderId: string,
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const url = `${getGatewayUrl()}/dispute/close`;
  return post(url, { orderID: orderId }, getAuthHeaders(username, password));
}

/**
 * 仲裁人裁决 - 释放资金
 */
export async function resolveDispute(
  orderId: string,
  buyerPercentage: number,
  vendorPercentage: number,
  resolution: string,
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const url = `${getGatewayUrl()}/dispute/release`;
  return post(
    url,
    {
      orderID: orderId,
      buyerPercentage,
      vendorPercentage,
      resolution,
    },
    getAuthHeaders(username, password)
  );
}

/**
 * 接受裁决 - 释放托管资金
 */
export async function acceptDisputeResolution(
  orderId: string,
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const url = `${getGatewayUrl()}/dispute/release`;
  return post(url, { orderID: orderId }, getAuthHeaders(username, password));
}

/**
 * 超时后释放资金（无需双方同意）
 */
export async function releaseEscrowAfterTimeout(
  orderId: string,
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const url = `${getGatewayUrl()}/dispute/releaseAfterTimeout`;
  return post(url, { orderID: orderId }, getAuthHeaders(username, password));
}

/**
 * 获取裁决执行指令
 */
export async function getReleaseFundsInstructions(
  orderId: string,
  buyerPercentage: number,
  vendorPercentage: number,
  resolution: string,
  username?: string,
  password?: string
): Promise<{
  instructions?: string;
  signature?: string;
  error?: string;
}> {
  const url = `${getGatewayUrl()}/instructions/dispute/release`;
  return post(
    url,
    {
      orderID: orderId,
      buyerPercentage,
      vendorPercentage,
      resolution,
    },
    getAuthHeaders(username, password)
  );
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
