/**
 * 订单数据转换函数
 * 将 API 返回的订单数据转换为 UI 展示格式
 */

import type { Order as CoreOrder, OrderState } from '../../types/order';
import type {
  DisplayOrder,
  DisplayOrderItem,
  DisplayModerator,
  DisplayFiatPayment,
  DisplayTimelineEvent,
  DisplayOrderStatus,
  DisplayUserRole,
  TransformOrderOptions,
} from '../../types/orderDisplay';
import { getImageUrl } from '../../services/api/config';
import { formatTokenAmount, getTokenById } from '../../data/tokens';
import { formatUserName } from '../identity';

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
    OrderID?: string;
    orderOpen?: {
      timestamp?: string;
      buyerID?: { peerID?: string; handle?: string };
      listings?: Array<{
        vendorID?: { peerID?: string };
        listing?: {
          slug?: string;
          metadata?: {
            contractType?: string;
            pricingCurrency?: { code?: string; divisibility?: number };
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
      items?: Array<{
        quantity?: number;
        memo?: string;
        shippingOption?: { name?: string; service?: string };
      }>;
      shipping?: {
        name?: string;
        shipTo?: string;
        company?: string;
        address?: string;
        addressLineOne?: string;
        addressLineTwo?: string;
        addressNotes?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
      pricingCoin?: string;
      amount?: number;
      alternateContactInfo?: string;
      fiatProvider?: string;
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
      paymentMethod?: { type?: string; brand?: string; last4?: string };
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
  // 如果提供了 coin，且是已知的加密货币 token，使用 token 配置的 decimals
  if (coin && getTokenById(coin)) {
    return formatTokenAmount(amount, coin);
  }
  // 法币（如 USD）或未知 coin，使用 listing metadata 中的 divisibility
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
  shipTo?: string;
  company?: string;
  address?: string;
  addressLineOne?: string;
  addressLineTwo?: string;
  addressNotes?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}): string {
  if (!shipping) return 'No shipping address';
  const line1 = shipping.address || shipping.addressLineOne;
  const parts = [
    shipping.shipTo || shipping.name,
    shipping.company,
    line1,
    shipping.addressLineTwo,
    [shipping.city, shipping.state, shipping.postalCode].filter(Boolean).join(', '),
    shipping.country,
  ].filter(Boolean);
  return parts.join('\n') || 'No shipping address';
}

/**
 * 根据实际订单数据生成时间线
 * 返回的 descriptionKey 用于 UI 层 i18n 翻译
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
      descriptionKey: 'order.timeline.orderPlaced',
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
      descriptionKey: 'order.timeline.paymentConfirmed',
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
      descriptionKey: 'order.timeline.vendorConfirmed',
      actor: 'seller',
    });
  }

  // 发货
  const fulfillments = contract.orderFulfillments;
  if (fulfillments?.length) {
    const fulfillment = fulfillments[0];
    const trackingInfo = fulfillment.physicalDelivery?.[0];
    if (trackingInfo) {
      timeline.push({
        status: 'shipped',
        timestamp: fulfillment.timestamp || '',
        description: `Package shipped - ${trackingInfo.shipper}: ${trackingInfo.trackingNumber}`,
        descriptionKey: 'order.timeline.packageShippedWithTracking',
        descriptionParams: {
          shipper: trackingInfo.shipper || '',
          trackingNumber: trackingInfo.trackingNumber || '',
        },
        actor: 'seller',
      });
    } else {
      timeline.push({
        status: 'shipped',
        timestamp: fulfillment.timestamp || '',
        description: 'Package shipped',
        descriptionKey: 'order.timeline.packageShipped',
        actor: 'seller',
      });
    }
  }

  // 完成
  const orderComplete = contract.orderComplete;
  if (orderComplete) {
    timeline.push({
      status: 'completed',
      timestamp: orderComplete.timestamp || '',
      description: 'Order completed - Funds released to seller',
      descriptionKey: 'order.timeline.orderCompleted',
      actor: 'buyer',
    });
  }

  // 争议
  if (contract.disputeOpen) {
    timeline.push({
      status: 'disputed',
      timestamp: contract.disputeOpen.timestamp || '',
      description: 'Dispute opened',
      descriptionKey: 'order.timeline.disputeOpened',
      actor: 'buyer',
    });
  }

  // Fiat dispute (no crypto disputeOpen but order is DISPUTED)
  if (!contract.disputeOpen && data.state === 'DISPUTED') {
    timeline.push({
      status: 'disputed',
      timestamp: new Date().toISOString(),
      description: 'Payment disputed by buyer',
      descriptionKey: 'order.timeline.fiatDisputeOpened',
      actor: 'buyer',
    });
  }

  // 争议关闭
  if (contract.disputeClose) {
    timeline.push({
      status: 'resolved',
      timestamp: contract.disputeClose.timestamp || '',
      description: `Dispute closed: ${contract.disputeClose.verdict || 'N/A'}`,
      descriptionKey: 'order.timeline.disputeClosed',
      descriptionParams: {
        verdict: contract.disputeClose.verdict || 'N/A',
      },
      actor: 'moderator',
    });
  }

  // Refund (order state is REFUNDED)
  if (data.state === 'REFUNDED') {
    timeline.push({
      status: 'refunded',
      timestamp: new Date().toISOString(),
      description: 'Order refunded',
      descriptionKey: 'order.timeline.refunded',
      actor: 'seller',
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
  const paymentMethod = paymentSent?.method || '';
  const moderatorId = paymentSent?.moderator || '';

  // --- 货币与 divisibility 解析 ---
  // listing 的定价货币（卖家设定的价格货币，如 USD）
  const listingCurrencyCode = listingData?.metadata?.pricingCurrency?.code || 'USD';
  const listingDivisibility = listingData?.metadata?.pricingCurrency?.divisibility || 2;
  // 订单的支付币种（买家实际支付的加密货币，如 ETHUSDT）
  const pricingCoin = orderOpen?.pricingCoin || listingCurrencyCode;
  // 支付币种的 divisibility（优先从 token 配置取 decimals）
  const paymentTokenConfig = getTokenById(pricingCoin);
  const paymentDivisibility = paymentTokenConfig
    ? paymentTokenConfig.decimals
    : listingDivisibility;
  // 判断是否为跨币种订单（定价货币 ≠ 支付币种）
  const isCrossCurrency = listingCurrencyCode.toUpperCase() !== pricingCoin.toUpperCase();
  const timestamp = orderOpen?.timestamp || '';
  const fulfillments = contract.orderFulfillments;
  const trackingInfo = fulfillments?.[0]?.physicalDelivery?.[0];
  const shipping = orderOpen?.shipping;

  const paymentAddress = paymentSent?.address || contract.orderConfirmation?.paymentAddress;

  const orderOpenItems = orderOpen?.items || [];
  // memo 来自第一个 item 的 memo 字段
  const memo = orderOpenItems[0]?.memo;
  // 额外联系方式
  const alternateContactInfo = orderOpen?.alternateContactInfo;
  // 发货商信息
  const shipper = trackingInfo?.shipper;
  // 商品类型：PHYSICAL_GOOD | SERVICE | DIGITAL_GOOD
  const contractType = listingData?.metadata?.contractType;

  const shippingRecipient = shipping?.shipTo || shipping?.name;
  const shippingAddressLine1 = shipping?.address || shipping?.addressLineOne;
  const shippingAddressLine2 = shipping?.addressLineTwo;
  const shippingCity = shipping?.city;
  const shippingState = shipping?.state;
  const shippingPostalCode = shipping?.postalCode;
  const shippingCountryCode = shipping?.country;

  // 提取运费选项和服务（从第一个 item）
  const firstItem = orderOpenItems[0];
  const shippingOption = firstItem?.shippingOption?.name || '';
  const shippingService = firstItem?.shippingOption?.service || '';

  // 获取交易确认数
  const txConfirmations = data.paymentAddressTransactions?.[0]?.confirmations;

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

  // 从 contract.OrderID 获取完整订单 ID，而非商品 slug
  const fullOrderId = contract.OrderID || '';
  const listingSlug = listingData?.slug || '';
  const itemTitle = listingData?.item?.title || 'Unknown Item';
  const itemPrice = listingData?.item?.price || 0;

  // 原始定价信息（从 orderOpen 获取，pricingCoin 已在上方定义）
  const pricingAmount = orderOpen?.amount !== undefined ? orderOpen.amount : itemPrice;

  // 实际支付信息（从 paymentSent 获取）
  const paymentCoin = paymentSent?.coin || pricingCoin;
  const paymentAmount = paymentSent?.amount;

  // 单价使用 listing 的定价货币（如 USD）和 divisibility
  const formattedItemPrice = formatPriceAmount(itemPrice, listingDivisibility);
  const orderItems: DisplayOrderItem[] =
    orderOpenItems.length > 0
      ? orderOpenItems.map((item, index) => ({
          id: `item-${index}`,
          title: itemTitle,
          image: itemImageUrl,
          quantity: item.quantity || 1,
          price: formattedItemPrice,
          currency: listingCurrencyCode,
        }))
      : [
          {
            id: 'item-0',
            title: itemTitle,
            image: itemImageUrl,
            quantity: 1,
            price: formattedItemPrice,
            currency: listingCurrencyCode,
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

  // 运费计算：
  // 1. 非物理商品（SERVICE / DIGITAL_GOOD / RWA_TOKEN）不显示运费
  // 2. 跨币种订单（如 USD 定价 + ETHUSDT 支付）无法通过差值计算运费
  // 3. 仅同币种物理商品订单可通过 pricingAmount - itemPrice * qty 推算运费
  const totalQuantity = orderOpenItems.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1;
  const isPhysicalGood = contractType === 'PHYSICAL_GOOD';
  let formattedShippingAmount: string | undefined;
  if (isPhysicalGood && !isCrossCurrency) {
    const shippingCost = Number(pricingAmount) - Number(itemPrice) * totalQuantity;
    formattedShippingAmount =
      shippingCost > 0 ? formatPriceAmount(shippingCost, listingDivisibility) : undefined;
  }

  // 格式化定价总额（listing 货币，用于概要「总计」）
  // 同币种：直接用 orderOpen.amount（包含运费等完整金额）
  // 跨币种：使用 itemPrice * qty（仅商品小计，运费和总额在不同编码下无法混算）
  const listingTotal = isCrossCurrency ? Number(itemPrice) * totalQuantity : Number(pricingAmount);
  const formattedPricingAmount = formatPriceAmount(listingTotal, listingDivisibility);

  // 格式化实际支付金额（支付币种，用于「已付款」显示）
  const formattedOrderAmount = formatPriceAmount(pricingAmount, paymentDivisibility, pricingCoin);
  const formattedPaymentAmount =
    paymentAmount !== undefined
      ? formatPriceAmount(paymentAmount, paymentDivisibility, paymentCoin)
      : formattedOrderAmount;

  // Fiat payment detection: method === 5 or "FIAT"
  const isFiatPayment =
    paymentSent?.method === 5 || paymentSent?.method === 'FIAT' || !!orderOpen?.fiatProvider;
  let fiatPayment: DisplayFiatPayment | undefined;
  if (isFiatPayment) {
    const provider = (orderOpen?.fiatProvider || 'stripe') as 'stripe' | 'paypal';
    const pm = paymentSent?.paymentMethod;
    const brand = pm?.brand || pm?.type || '';
    const last4 = pm?.last4 || '';
    const methodLabel = last4 ? `${brand} •••• ${last4}` : brand || provider;
    fiatPayment = {
      provider,
      paymentID: paymentSent?.transactionID || '',
      methodLabel,
      brand: brand || undefined,
      last4: last4 || undefined,
    };
  }

  // Fiat dispute: order is DISPUTED with no crypto disputeOpen, synthesize DisplayDispute
  const isFiatDispute = data.state === 'DISPUTED' && !contract.disputeOpen && isFiatPayment;
  const dispute: DisplayOrder['dispute'] = contract.disputeOpen
    ? {
        id: fullOrderId,
        claim: '',
        status: contract.disputeClose ? 'resolved' : 'open',
        initiator: 'buyer',
        resolution: contract.disputeClose?.verdict as 'buyer' | 'seller' | 'split' | undefined,
      }
    : isFiatDispute
      ? {
          id: fullOrderId,
          claim: `${(orderOpen?.fiatProvider || 'stripe').toUpperCase()} dispute`,
          status: 'open',
          initiator: 'buyer',
        }
      : undefined;

  const result: DisplayOrder = {
    id: fullOrderId,
    orderId: fullOrderId,
    slug: listingSlug,
    status: mapOrderState(data.state as OrderState),
    items: orderItems, // items[].price 使用 listing 定价货币, items[].currency = listingCurrencyCode
    // total：实际支付金额（支付币种，用于订单列表等场景）
    total: formattedPaymentAmount,
    currency: paymentCoin,
    // 定价总额（listing 货币，用于订单详情概要「总计」）
    pricingAmount: formattedPricingAmount,
    pricingCurrency: listingCurrencyCode,
    // 支付信息（支付币种，用于订单详情「已付款」）
    paymentCoin: paymentCoin,
    paymentAmount: formattedPaymentAmount,
    createdAt: timestamp,
    vendor: {
      id: vendorPeerID,
      name: formatUserName({ name: vendorHandle, peerID: vendorPeerID }, { fallback: 'Seller' }),
      avatar: '',
      peerID: vendorPeerID,
    },
    buyer: {
      id: buyerPeerID,
      name: formatUserName({ name: buyerHandle, peerID: buyerPeerID }, { fallback: 'Buyer' }),
      avatar: '',
      peerID: buyerPeerID,
    },
    moderator,
    trackingNumber: trackingInfo?.trackingNumber,
    shippingAddress: formatShippingAddress(shipping),
    shippingRecipient,
    shippingAddressLine1,
    shippingAddressLine2,
    shippingCity,
    shippingState,
    shippingPostalCode,
    shippingCountryCode,
    shippingAmount: formattedShippingAmount,
    shippingOption: shippingOption || undefined,
    shippingService: shippingService || undefined,
    // 支持 RWA 模式和传统交易
    paymentTx: paymentSent?.transactionID || data.paymentAddressTransactions?.[0]?.txid,
    txConfirmations,
    // RWA 标识
    isRwaInstant,
    isRwaEscrow,
    // RWA 支付锁定信息（仅用于托管模式）
    paymentLocked,
    escrowAddress: paymentAddress,
    notes: memo,
    alternateContactInfo: alternateContactInfo,
    shipper: shipper,
    contractType: contractType,
    timeline: generateTimelineFromRealData(data),
    userRole,
    fiatPayment,
    dispute,
  };

  return result;
}
