/**
 * 订单数据转换函数
 * 将 API 返回的订单数据转换为 UI 展示格式
 */

import type { Order as CoreOrder, OrderState } from '../../types/order';
import type {
  DisplayOrder,
  DisplayOrderItem,
  DisplayModerator,
  DisplayTimelineEvent,
  DisplayOrderStatus,
  DisplayUserRole,
  TransformOrderOptions,
} from '../../types/orderDisplay';
import { getImageUrl } from '../../services/api/config';
import { formatTokenAmount } from '../../data/tokens';

// ============ Internal Types ============

/**
 * 后端实际返回的订单数据结构
 * 这是内部类型，不对外导出
 */
interface RealOrderData {
  state: string;
  funded?: boolean;
  read?: boolean;
  unreadChatMessages?: number;
  paymentAddressTransactions?: { txid: string; value: number; confirmations: number }[];
  contract: {
    orderOpen?: {
      timestamp?: string;
      buyerID?: { peerID?: string; handle?: string };
      listings?: Array<{
        vendorID?: { peerID?: string };
        listing?: {
          slug?: string;
          metadata?: {
            contractType?: string;
            pricingCurrency?: { divisibility?: number };
            rwaEscrowTimeoutSeconds?: number;
            escrowTimeoutSeconds?: number;
          };
          item?: {
            title?: string;
            images?: Array<{
              tiny?: string;
              small?: string;
              medium?: string;
              large?: string;
              original?: string;
            }>;
            price?: number;
            blockchain?: string;
          };
          vendorID?: { peerID?: string; handle?: string };
          shippingOptions?: Array<{ regions?: string[] }>;
        };
      }>;
      items?: Array<{ quantity?: number; memo?: string }>;
      shipping?: {
        name?: string;
        company?: string;
        addressLineOne?: string;
        addressLineTwo?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
      pricingCoin?: string;
      amount?: number;
      alternateContactInfo?: string;
    };
    paymentSent?: {
      moderator?: string;
      coin?: string;
      amount?: number;
      method?: string | number;
      address?: string;
      transactionID?: string;
      timestamp?: string;
      buyerReceiveAddress?: string;
    };
    orderConfirmation?: {
      timestamp?: string;
      paymentAddress?: string;
    };
    orderFulfillments?: Array<{
      timestamp?: string;
      physicalDelivery?: Array<{ shipper?: string; trackingNumber?: string }>;
      note?: string;
    }>;
    orderComplete?: {
      timestamp?: string;
    };
    disputeOpen?: {
      timestamp?: string;
    };
    disputeClose?: {
      timestamp?: string;
      verdict?: string;
    };
  };
}

// ============ Helper Functions ============

/**
 * 将后端订单状态映射到 UI 状态
 * 参考桌面端逻辑：PENDING 表示已支付等待确认，AWAITING_PAYMENT 才是未支付
 */
export function mapOrderState(state: OrderState): DisplayOrderStatus {
  const stateMap: Record<string, DisplayOrderStatus> = {
    // PENDING 表示订单已创建且已支付，等待卖家确认（参考桌面端）
    PENDING: 'paid',
    AWAITING_PAYMENT: 'awaiting_payment',
    AWAITING_PICKUP: 'processing',
    AWAITING_FULFILLMENT: 'processing',
    PARTIALLY_FULFILLED: 'processing',
    FULFILLED: 'shipped',
    COMPLETED: 'completed',
    CANCELED: 'cancelled',
    DECLINED: 'cancelled',
    REFUNDED: 'refunded',
    DISPUTED: 'disputed',
    DECIDED: 'disputed',
    RESOLVED: 'completed',
    // PAYMENT_FINALIZED: 托管已释放（超时后），等待买家评价后变成 COMPLETE
    // 参考移动端/桌面端，此状态表示交易已完成，与 COMPLETED 同级
    PAYMENT_FINALIZED: 'completed',
    PROCESSING_ERROR: 'awaiting_payment',
  };
  return stateMap[state] || 'awaiting_payment';
}

/**
 * 格式化价格金额（使用统一的 token 配置）
 */
function formatPriceAmount(amount: number, divisibility: number = 2, coin?: string): string {
  // 如果提供了 coin，使用统一配置中的 decimals
  if (coin) {
    return formatTokenAmount(amount, coin);
  }
  // 否则使用传入的 divisibility
  const normalAmount = amount / Math.pow(10, divisibility);
  const displayDecimals = divisibility >= 6 ? 2 : Math.min(divisibility, 8);
  return normalAmount.toFixed(displayDecimals);
}

/**
 * 从图片对象获取 URL
 */
function getThumbnailUrl(
  image:
    | { tiny?: string; small?: string; medium?: string; large?: string; original?: string }
    | undefined
): string {
  if (!image) return '';
  const hash = image.medium || image.small || image.tiny || image.large || image.original || '';
  return getImageUrl(hash) || '';
}

/**
 * 格式化收货地址
 */
function formatShippingAddress(shipping?: {
  name?: string;
  company?: string;
  addressLineOne?: string;
  addressLineTwo?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}): string {
  if (!shipping) return 'No shipping address';
  const parts = [
    shipping.name,
    shipping.company,
    shipping.addressLineOne,
    shipping.addressLineTwo,
    [shipping.city, shipping.state, shipping.postalCode].filter(Boolean).join(', '),
    shipping.country,
  ].filter(Boolean);
  return parts.join('\n') || 'No shipping address';
}

/**
 * 根据实际订单数据生成时间线
 */
function generateTimelineFromRealData(data: RealOrderData): DisplayTimelineEvent[] {
  const timeline: DisplayTimelineEvent[] = [];
  const contract = data.contract;

  const orderOpen = contract.orderOpen;
  const orderTimestamp = orderOpen?.timestamp;

  // 订单创建
  if (orderTimestamp) {
    timeline.push({
      status: 'created',
      timestamp: orderTimestamp,
      description: 'Order placed',
      actor: 'buyer',
    });
  }

  // 资金到账 (使用 PaymentSent 统一消息)
  if (
    data.funded ||
    contract.paymentSent ||
    (data.paymentAddressTransactions && data.paymentAddressTransactions.length > 0)
  ) {
    const confirmTimestamp = contract.orderConfirmation?.timestamp || orderTimestamp || '';
    timeline.push({
      status: 'paid',
      timestamp: confirmTimestamp,
      description: 'Payment confirmed',
      actor: 'system',
    });
  }

  // 卖家确认
  const orderConfirmation = contract.orderConfirmation;
  if (orderConfirmation) {
    timeline.push({
      status: 'processing',
      timestamp: orderConfirmation.timestamp || '',
      description: 'Vendor confirmed order',
      actor: 'seller',
    });
  }

  // 发货
  const fulfillments = contract.orderFulfillments;
  if (fulfillments?.length) {
    const fulfillment = fulfillments[0];
    const trackingInfo = fulfillment.physicalDelivery?.[0];
    timeline.push({
      status: 'shipped',
      timestamp: fulfillment.timestamp || '',
      description: trackingInfo
        ? `Package shipped - ${trackingInfo.shipper}: ${trackingInfo.trackingNumber}`
        : 'Package shipped',
      actor: 'seller',
    });
  }

  // 完成
  const orderComplete = contract.orderComplete;
  if (orderComplete) {
    timeline.push({
      status: 'completed',
      timestamp: orderComplete.timestamp || '',
      description: 'Order completed - Funds released to seller',
      actor: 'buyer',
    });
  }

  // 争议
  if (contract.disputeOpen) {
    timeline.push({
      status: 'disputed',
      timestamp: contract.disputeOpen.timestamp || '',
      description: 'Dispute opened',
      actor: 'buyer',
    });
  }

  // 争议关闭
  if (contract.disputeClose) {
    timeline.push({
      status: 'resolved',
      timestamp: contract.disputeClose.timestamp || '',
      description: `Dispute closed: ${contract.disputeClose.verdict || 'N/A'}`,
      actor: 'moderator',
    });
  }

  return timeline;
}

/**
 * 确定用户角色
 * 优先通过 peerID 匹配，如果不匹配则使用 viewingContext 作为后备
 */
function determineUserRole(
  currentUserPeerID: string | null,
  vendorPeerID: string,
  buyerPeerID: string,
  moderatorId: string,
  viewingContext?: 'sale' | 'purchase'
): DisplayUserRole {
  let userRole: DisplayUserRole = 'buyer';

  if (currentUserPeerID) {
    if (currentUserPeerID === vendorPeerID) {
      userRole = 'seller';
    } else if (currentUserPeerID === buyerPeerID) {
      userRole = 'buyer';
    } else if (moderatorId === currentUserPeerID) {
      userRole = 'moderator';
    }
  }

  // 如果 peerID 匹配失败，使用 viewingContext 作为后备（参考桌面端的 type 参数）
  if (userRole === 'buyer' && viewingContext === 'sale') {
    userRole = 'seller';
  } else if (userRole === 'seller' && viewingContext === 'purchase') {
    userRole = 'buyer';
  }

  return userRole;
}

// ============ Main Transform Function ============

/**
 * 将核心订单数据转换为 UI 展示格式
 *
 * @param coreOrder - 从 API 获取的核心订单数据
 * @param options - 转换选项
 * @returns DisplayOrder 或 null（如果数据无效）
 *
 * @example
 * ```typescript
 * const displayOrder = transformCoreOrder(coreOrder, {
 *   currentUserPeerID: user?.peerID || null,
 *   viewingContext: 'sale',
 * });
 * ```
 */
export function transformCoreOrder(
  coreOrder: CoreOrder | null,
  options: TransformOrderOptions
): DisplayOrder | null {
  if (!coreOrder || !coreOrder.contract) {
    return null;
  }

  const { currentUserPeerID, viewingContext } = options;
  const data = coreOrder as unknown as RealOrderData;
  const contract = data.contract;

  const orderOpen = contract.orderOpen;

  // 提取 listing 数据
  type ListingType = NonNullable<
    NonNullable<RealOrderData['contract']['orderOpen']>['listings']
  >[0]['listing'];
  let listingData: ListingType | undefined;
  let vendorPeerID = '';
  let vendorHandle = '';

  if (orderOpen?.listings?.length) {
    const firstListing = orderOpen.listings[0];
    listingData = firstListing.listing;
    vendorPeerID = firstListing.listing?.vendorID?.peerID || firstListing.vendorID?.peerID || '';
    vendorHandle = firstListing.listing?.vendorID?.handle || '';
  }

  const buyerPeerID = orderOpen?.buyerID?.peerID || '';
  const buyerHandle = orderOpen?.buyerID?.handle || '';

  // 支持 PaymentSent (统一消息)
  const paymentSent = contract.paymentSent;
  // 判断是否为 RWA 托管模式：method === 3 (RWA_ESCROW)
  const isRwaEscrow =
    paymentSent?.method === 3 ||
    paymentSent?.method === 'RWA_ESCROW' ||
    paymentSent?.method === 'RWA_LOCKED';
  // 判断是否为 RWA 即时模式：method === 4 (RWA_INSTANT)
  const isRwaInstant = paymentSent?.method === 4 || paymentSent?.method === 'RWA_INSTANT';
  const coin = paymentSent?.coin || orderOpen?.pricingCoin || 'ETH';
  // 使用显式的 !== undefined 检查，避免 "0" 被当作 falsy 值处理
  const amount =
    paymentSent?.amount !== undefined
      ? paymentSent.amount
      : orderOpen?.amount !== undefined
        ? orderOpen.amount
        : (listingData?.item?.price ?? 0);
  const paymentMethod = paymentSent?.method || '';
  const moderatorId = paymentSent?.moderator || '';

  const divisibility = listingData?.metadata?.pricingCurrency?.divisibility || 2;
  const timestamp = orderOpen?.timestamp || '';
  const fulfillments = contract.orderFulfillments;
  const trackingInfo = fulfillments?.[0]?.physicalDelivery?.[0];
  const shipping = orderOpen?.shipping;

  const paymentAddress = paymentSent?.address || contract.orderConfirmation?.paymentAddress;

  const notes = orderOpen?.alternateContactInfo;
  const orderOpenItems = orderOpen?.items || [];

  // 判断用户角色
  const userRole = determineUserRole(
    currentUserPeerID,
    vendorPeerID,
    buyerPeerID,
    moderatorId,
    viewingContext
  );

  const itemImages = listingData?.item?.images || [];
  const itemImageUrl = itemImages.length > 0 ? getThumbnailUrl(itemImages[0]) : '';

  const orderId = listingData?.slug || '';
  const itemTitle = listingData?.item?.title || 'Unknown Item';
  const itemPrice = listingData?.item?.price || 0;

  const orderItems: DisplayOrderItem[] =
    orderOpenItems.length > 0
      ? orderOpenItems.map((item, index) => ({
          id: `item-${index}`,
          title: itemTitle,
          image: itemImageUrl,
          quantity: item.quantity || 1,
          price: formatPriceAmount(itemPrice, divisibility, coin),
          currency: coin,
        }))
      : [
          {
            id: 'item-0',
            title: itemTitle,
            image: itemImageUrl,
            quantity: 1,
            price: formatPriceAmount(itemPrice, divisibility, coin),
            currency: coin,
          },
        ];

  const moderator: DisplayModerator | undefined =
    paymentMethod === 'MODERATED' && moderatorId
      ? {
          id: moderatorId,
          name: moderatorId.slice(0, 12) + '...',
          avatar: '',
          fee: 1,
        }
      : undefined;

  // 计算 RWA 托管的过期时间
  let paymentLocked: DisplayOrder['paymentLocked'] | undefined;
  if (isRwaEscrow && paymentSent) {
    // 从 listing metadata 获取 escrowTimeoutSeconds
    const metadata = listingData?.metadata as
      | { rwaEscrowTimeoutSeconds?: number; escrowTimeoutSeconds?: number }
      | undefined;
    const escrowTimeoutSeconds = (metadata?.rwaEscrowTimeoutSeconds ||
      metadata?.escrowTimeoutSeconds ||
      900) as number; // 默认 15 分钟

    // 计算过期时间
    let expiresAt: string | undefined;
    if (paymentSent.timestamp) {
      const lockedTime = new Date(paymentSent.timestamp).getTime();
      expiresAt = new Date(lockedTime + escrowTimeoutSeconds * 1000).toISOString();
    }

    paymentLocked = {
      amount: String(paymentSent.amount || ''),
      coin: paymentSent.coin || '',
      buyerReceiveAddress: paymentSent.buyerReceiveAddress || '',
      lockTxHash: paymentSent.transactionID || '',
      timestamp: paymentSent.timestamp,
      escrowTimeoutSeconds,
      expiresAt,
    };
  }

  const result: DisplayOrder = {
    id: orderId,
    orderId: orderId,
    status: mapOrderState(data.state as OrderState),
    items: orderItems,
    total: formatPriceAmount(amount, divisibility, coin),
    currency: coin,
    paymentCoin: coin,
    createdAt: timestamp,
    vendor: {
      id: vendorPeerID,
      name: vendorHandle || (vendorPeerID ? vendorPeerID.slice(0, 12) + '...' : 'Unknown'),
      avatar: '',
      peerID: vendorPeerID,
    },
    buyer: {
      id: buyerPeerID,
      name: buyerHandle || (buyerPeerID ? buyerPeerID.slice(0, 12) + '...' : 'Unknown'),
      avatar: '',
      peerID: buyerPeerID,
    },
    moderator,
    trackingNumber: trackingInfo?.trackingNumber,
    shippingAddress: formatShippingAddress(shipping),
    // 支持 RWA 模式和传统交易
    paymentTx: paymentSent?.transactionID || data.paymentAddressTransactions?.[0]?.txid,
    // RWA 标识
    isRwaInstant,
    isRwaEscrow,
    // RWA 支付锁定信息（仅用于托管模式）
    paymentLocked,
    escrowAddress: paymentAddress,
    notes: notes,
    timeline: generateTimelineFromRealData(data),
    userRole,
  };

  return result;
}
