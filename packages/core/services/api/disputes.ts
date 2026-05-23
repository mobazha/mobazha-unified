/**
 * 争议/仲裁 API 服务
 */

import { withMockFallback } from './mode';
import { NODE_API } from '../../config/apiPaths';
import { getImageUrl } from './config';
import { authGet, authPost, authSafeGet } from './helpers';
import { readStringField } from '../../utils/normalizeIds';
import { getPaymentCoinDisplayLabel } from '../../data/tokens';
import {
  formatMinimalUnitAmountString,
  formatMinimalUnitExactAmountString,
} from '../../utils/transforms/minimalUnit';
import { parsePriceFields } from '../../utils/transforms/priceTransform';
import type { Price } from '../../types';

// 争议状态
export type DisputeState =
  | 'OPEN'
  | 'PENDING'
  | 'RESOLVED'
  | 'EXPIRED'
  | 'DECIDED'
  | 'DISPUTED'
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
          name: string;
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
  /** Minimal-unit amount (string for bigint-safe sort) */
  amountMinimal: string;
  /** User-facing amount + currency, e.g. "1.001 ETH" */
  totalDisplay: string;
  /** @deprecated Prefer totalDisplay; kept for legacy callers */
  total: number;
  /** @deprecated Prefer totalDisplay; display currency label */
  coin: string;
  title: string;
  thumbnail: string;
  buyerName?: string;
  buyerAvatar?: string;
  buyerPeerID?: string;
  vendorName: string;
  vendorAvatar?: string;
  vendorPeerID: string;
  unreadChatMessages?: number;
}

interface BackendCaseListItem {
  caseID: string;
  slug?: string;
  timestamp?: string;
  title?: string;
  thumbnail?: string;
  total?: Price | { amount?: number | string; currencyCode?: string; currency?: Price['currency'] };
  buyerID?: string;
  buyerName?: string;
  buyerAvatar?: string;
  vendorID?: string;
  vendorName?: string;
  vendorAvatar?: string;
  coinType?: string;
  paymentCoin?: string;
  buyerOpened?: boolean;
  state?: string;
  read?: boolean;
  unreadChatMessages?: number;
}

/** Format case list price from API CurrencyValue envelope */
export function formatCaseListAmount(
  totalRaw: BackendCaseListItem['total'],
  paymentCoin?: string,
  coinType?: string
): { amountMinimal: string; totalDisplay: string; total: number; coin: string } {
  const coinId = paymentCoin || coinType || '';
  const parsed = parsePriceFields(
    typeof totalRaw === 'object' && totalRaw !== null ? (totalRaw as Price) : undefined
  );

  let amountMinimal = '0';
  if (typeof totalRaw === 'number' && Number.isFinite(totalRaw)) {
    amountMinimal = String(Math.trunc(totalRaw));
  } else if (parsed.amount > 0 || totalRaw) {
    const rawAmount =
      typeof totalRaw === 'object' && totalRaw !== null && 'amount' in totalRaw
        ? String((totalRaw as Price).amount ?? parsed.amount)
        : String(parsed.amount);
    amountMinimal = rawAmount.replace(/\D/g, '') || '0';
  }

  const divisibility = parsed.divisibility ?? 2;
  const currencyCode = parsed.currencyCode || '';
  const coinKey = coinId || currencyCode;
  const isHighPrecisionCrypto =
    divisibility >= 8 || coinKey.toLowerCase().includes('crypto:') || coinKey.includes(':');

  const formattedAmount = isHighPrecisionCrypto
    ? (formatMinimalUnitExactAmountString(amountMinimal, coinKey) ??
      formatMinimalUnitAmountString(amountMinimal, divisibility, coinKey) ??
      amountMinimal)
    : (formatMinimalUnitAmountString(amountMinimal, divisibility, coinKey) ??
      formatMinimalUnitAmountString(amountMinimal, divisibility, currencyCode) ??
      amountMinimal);

  const coinLabel = getPaymentCoinDisplayLabel(coinId || currencyCode) || currencyCode || coinId;
  const totalDisplay = coinLabel ? `${formattedAmount} ${coinLabel}` : formattedAmount;

  let total = 0;
  try {
    total = Number(amountMinimal);
    if (!Number.isSafeInteger(total)) {
      total = Number(BigInt(amountMinimal) / BigInt(10 ** Math.min(divisibility, 15)));
    }
  } catch {
    total = parsed.amount;
  }

  return { amountMinimal, totalDisplay, total, coin: coinLabel };
}

interface CasesListResponse {
  queryCount?: number;
  cases?: BackendCaseListItem[];
}

function mapBackendCaseToListItem(item: BackendCaseListItem): CaseListItem {
  const orderId = item.caseID;
  const { amountMinimal, totalDisplay, total, coin } = formatCaseListAmount(
    item.total,
    item.paymentCoin,
    item.coinType
  );
  const thumb = item.thumbnail ? getImageUrl(item.thumbnail) || item.thumbnail : '';

  return {
    caseId: orderId,
    orderId,
    state: (item.state || 'OPEN') as DisputeState,
    timestamp: item.timestamp || new Date().toISOString(),
    read: item.read ?? false,
    buyerOpened: item.buyerOpened ?? false,
    amountMinimal,
    totalDisplay,
    total,
    coin,
    title: item.title || '',
    thumbnail: thumb,
    buyerName: item.buyerName,
    buyerAvatar: item.buyerAvatar,
    buyerPeerID: item.buyerID,
    vendorName: item.vendorName || '',
    vendorAvatar: item.vendorAvatar,
    vendorPeerID: item.vendorID || '',
    unreadChatMessages: item.unreadChatMessages ?? 0,
  };
}

function normalizeCasesListResponse(data: CasesListResponse | CaseListItem[]): CaseListItem[] {
  if (Array.isArray(data)) {
    return data;
  }
  return (data.cases || []).map(mapBackendCaseToListItem);
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
    amountMinimal: '189990000',
    totalDisplay: '189.99 USDT',
    total: 189.99,
    coin: 'USDT',
    title: 'Vintage Film Camera',
    thumbnail: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=200&h=200&fit=crop',
    vendorName: 'Retro Finds',
    vendorPeerID: 'QmVendor789',
    unreadChatMessages: 0,
  },
];

/**
 * 获取仲裁案件列表
 */
export async function getCases(limit = '', offsetId = ''): Promise<CaseListItem[]> {
  const realFn = async () => {
    const data = await authSafeGet<CasesListResponse | CaseListItem[]>(
      `${NODE_API.CASES}?limit=${limit}&offsetId=${offsetId}`,
      { cases: [] }
    );
    return normalizeCasesListResponse(data);
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
      const raw = await authGet<Record<string, unknown>>(NODE_API.CASE(orderId));
      const resolvedOrderId =
        readStringField(raw, 'orderID', 'orderId', 'caseID', 'caseId') || orderId;
      return {
        caseId: resolvedOrderId,
        orderId: resolvedOrderId,
        state: (readStringField(raw, 'state') || 'OPEN') as DisputeState,
        timestamp:
          readStringField(raw, 'timestamp') ||
          (raw.buyerContract as { orderOpen?: { timestamp?: string } } | undefined)?.orderOpen
            ?.timestamp ||
          new Date().toISOString(),
        buyerContract: (raw.buyerContract || raw.buyer_contract) as DisputeCase['buyerContract'],
        claim:
          readStringField(
            raw.disputeOpen as Record<string, unknown>,
            'reason',
            'claim',
            'description'
          ) ||
          readStringField(raw, 'claim') ||
          '',
        buyerOpened: Boolean(
          (raw.disputeOpen as { openedBy?: string } | undefined)?.openedBy === 'BUYER' ||
          raw.buyerOpened
        ),
        read: Boolean(raw.read),
        unreadChatMessages: typeof raw.unreadChatMessages === 'number' ? raw.unreadChatMessages : 0,
        resolution: raw.resolution as DisputeCase['resolution'],
      };
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
                name: caseItem.vendorName,
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
  evidenceHashes?: string[]
): Promise<{ success: boolean; error?: string }> {
  return authPost(NODE_API.DISPUTE_OPEN(orderId), {
    claim,
    ...(evidenceHashes?.length ? { evidenceHashes } : {}),
  });
}

/**
 * 售后争议（已完成订单在售后窗口内）
 */
export async function openAfterSaleDispute(
  orderId: string,
  reason: string,
  description: string
): Promise<void> {
  await authPost(NODE_API.DISPUTE_AFTER_SALE(orderId), { reason, description });
}

/**
 * 关闭争议（撤回）
 */
export async function closeDispute(orderId: string): Promise<{ success: boolean; error?: string }> {
  return authPost(NODE_API.DISPUTE_CLOSE(orderId), {});
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
  return authPost(NODE_API.DISPUTE_RELEASE(orderId), {
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
  return authPost(NODE_API.DISPUTE_RELEASE(orderId), {});
}

/**
 * 超时后释放资金（无需双方同意）
 */
export async function releaseEscrowAfterTimeout(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  return authPost(NODE_API.DISPUTE_RELEASE_AFTER_TIMEOUT(orderId), {});
}

/**
 * 争议 API 导出对象
 */
export const disputesApi = {
  getCases,
  getCaseDetails,
  openDispute,
  openAfterSaleDispute,
  closeDispute,
  resolveDispute,
  acceptDisputeResolution,
  releaseEscrowAfterTimeout,
};
