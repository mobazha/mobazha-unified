/**
 * 订单操作状态机
 * 根据订单状态和用户角色确定可用的操作
 * 参考: mobazha-mobile/utils/order.js 和 config/orderStatus.json
 */

import type { OrderState, UserRole } from '../types';

/**
 * 订单操作类型
 */
export type OrderAction =
  | 'Pay' // 买家支付
  | 'Cancel' // 买家取消
  | 'Dispute' // 发起争议
  | 'Complete' // 买家确认收货
  | 'WriteReview' // 写评价
  | 'Accept' // 卖家接受订单
  | 'Decline' // 卖家拒绝订单
  | 'Fulfill' // 卖家发货
  | 'Refund' // 卖家退款
  | 'Claim' // 卖家领取超时资金
  | 'AcceptPayout'; // 接受争议裁决

/**
 * 订单状态配置
 */
interface OrderStatusConfig {
  label: string;
  description: string;
  actions: {
    buyer: OrderAction[];
    seller: OrderAction[];
  };
}

/**
 * 订单状态配置映射
 * 参考: mobazha-mobile/config/orderStatus.json
 */
const ORDER_STATUS_CONFIG: Record<OrderState, OrderStatusConfig> = {
  AWAITING_PAYMENT: {
    label: 'Awaiting Payment',
    description: 'Awaiting payment from the buyer',
    actions: {
      buyer: ['Pay'],
      seller: [],
    },
  },
  PENDING: {
    label: 'Pending',
    description: 'Waiting to be accepted',
    actions: {
      buyer: ['Cancel', 'Dispute'],
      seller: ['Decline', 'Accept'],
    },
  },
  AWAITING_PICKUP: {
    label: 'Awaiting Pickup',
    description: 'Waiting for pickup',
    actions: {
      buyer: ['Dispute'],
      seller: ['Fulfill'],
    },
  },
  AWAITING_FULFILLMENT: {
    label: 'Awaiting Fulfillment',
    description: 'Waiting to be fulfilled',
    actions: {
      buyer: ['Dispute'],
      seller: ['Refund', 'Fulfill'],
    },
  },
  PARTIALLY_FULFILLED: {
    label: 'Partially Fulfilled',
    description: 'Order partially fulfilled',
    actions: {
      buyer: ['Dispute'],
      seller: ['Fulfill'],
    },
  },
  FULFILLED: {
    label: 'Fulfilled',
    description: 'Item shipped, file sent, in transit, etc',
    actions: {
      buyer: ['Dispute', 'Complete'],
      seller: ['Dispute'],
    },
  },
  COMPLETED: {
    label: 'Completed',
    description: 'Order completed successfully',
    actions: {
      buyer: [],
      seller: [],
    },
  },
  CANCELED: {
    label: 'Canceled',
    description: 'Order was canceled',
    actions: {
      buyer: [],
      seller: [],
    },
  },
  DECLINED: {
    label: 'Declined',
    description: 'Order was declined by seller',
    actions: {
      buyer: [],
      seller: [],
    },
  },
  REFUNDED: {
    label: 'Refunded',
    description: 'Order was refunded',
    actions: {
      buyer: [],
      seller: [],
    },
  },
  DISPUTED: {
    label: 'In Dispute',
    description: 'Order in dispute with a moderator',
    actions: {
      buyer: [],
      seller: [],
    },
  },
  DECIDED: {
    label: 'Dispute Decided',
    description: 'Moderator has made a decision',
    actions: {
      buyer: ['AcceptPayout'],
      seller: ['AcceptPayout'],
    },
  },
  RESOLVED: {
    label: 'Resolved',
    description: 'Dispute has been resolved',
    actions: {
      buyer: ['WriteReview'],
      seller: [],
    },
  },
  PAYMENT_FINALIZED: {
    label: 'Payment Claimed',
    description: 'Payment has been finalized',
    actions: {
      buyer: ['WriteReview'],
      seller: [],
    },
  },
  PROCESSING_ERROR: {
    label: 'Processing Error',
    description: 'An error occurred during processing',
    actions: {
      buyer: ['Cancel', 'Dispute'],
      seller: ['Dispute'],
    },
  },
  DISPUTE_EXPIRED: {
    label: 'Dispute Expired',
    description: 'The dispute period has expired',
    actions: {
      buyer: [],
      seller: ['Claim'],
    },
  },
};

/**
 * 托管超时时间（小时）- 默认 45 天
 */
export const ESCROW_TIMEOUT_HOURS = 45 * 24;

/**
 * 检查订单是否已过托管超时期
 */
export function isOrderExpired(
  timestamp: string,
  timeoutHours: number = ESCROW_TIMEOUT_HOURS
): boolean {
  const orderTime = new Date(timestamp).getTime();
  const now = Date.now();
  const timeDiffHours = (now - orderTime) / (1000 * 60 * 60);
  return timeDiffHours > timeoutHours;
}

/**
 * 获取订单剩余时间（格式化字符串）
 */
export function getTimeRemaining(
  timestamp: string,
  timeoutHours: number = ESCROW_TIMEOUT_HOURS
): string {
  const orderTime = new Date(timestamp).getTime();
  const now = Date.now();
  const endTime = orderTime + timeoutHours * 60 * 60 * 1000;
  const remainingMs = endTime - now;

  if (remainingMs <= 0) {
    return 'Expired';
  }

  const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  return `${hours}h`;
}

/**
 * 获取争议超时详情（包括剩余区块数和天数）
 * 参考桌面端 TimeoutInfo.vue 的显示方式
 */
export function getDisputeTimeoutDetails(
  timestamp: string,
  timeoutHours: number = ESCROW_TIMEOUT_HOURS
): {
  blocksRemaining: number;
  daysRemaining: number;
  hoursRemaining: number;
  isExpired: boolean;
  timeRemainingStr: string;
} {
  const orderTime = new Date(timestamp).getTime();
  const now = Date.now();
  const endTime = orderTime + timeoutHours * 60 * 60 * 1000;
  const remainingMs = endTime - now;

  if (remainingMs <= 0) {
    return {
      blocksRemaining: 0,
      daysRemaining: 0,
      hoursRemaining: 0,
      isExpired: true,
      timeRemainingStr: 'Expired',
    };
  }

  const daysRemaining = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  // 区块数估算：以太坊约每 12 秒一个区块
  const blocksRemaining = Math.floor(remainingMs / (12 * 1000));

  let timeRemainingStr = '';
  if (daysRemaining > 0) {
    timeRemainingStr = `${daysRemaining} days`;
  } else if (hoursRemaining > 0) {
    timeRemainingStr = `${hoursRemaining} hours`;
  } else {
    timeRemainingStr = 'Less than 1 hour';
  }

  return {
    blocksRemaining,
    daysRemaining,
    hoursRemaining,
    isExpired: false,
    timeRemainingStr,
  };
}

/**
 * 获取订单状态信息
 */
export function getOrderStatusInfo(state: OrderState): { label: string; description: string } {
  const config = ORDER_STATUS_CONFIG[state];
  if (!config) {
    return { label: state, description: '' };
  }
  return { label: config.label, description: config.description };
}

/**
 * 检查订单是否已发货
 */
export function isOrderFulfilled(orderDetails: {
  contract?: { orderFulfillments?: unknown[] };
}): boolean {
  const fulfillments = orderDetails?.contract?.orderFulfillments;
  return Array.isArray(fulfillments) && fulfillments.length > 0;
}

/**
 * 检查订单是否已关闭（最终状态）
 */
export function isOrderClosed(state: OrderState): boolean {
  const closedStates: OrderState[] = [
    'COMPLETED',
    'CANCELED',
    'DECLINED',
    'REFUNDED',
    'RESOLVED',
    'PAYMENT_FINALIZED',
  ];
  return closedStates.includes(state);
}

/**
 * 检查订单是否处于争议状态
 */
export function isOrderInDispute(state: OrderState): boolean {
  return state === 'DISPUTED' || state === 'DECIDED';
}

/**
 * 获取订单可用操作
 * @param state 订单状态
 * @param role 用户角色
 * @param options 额外选项
 */
export function getOrderActions(
  state: OrderState,
  role: UserRole,
  options: {
    isModerated?: boolean;
    isFulfilled?: boolean;
    isExpired?: boolean;
    paymentMethod?: string;
  } = {}
): OrderAction[] {
  const { isModerated = false, isFulfilled = false, isExpired = false, paymentMethod } = options;

  const config = ORDER_STATUS_CONFIG[state];
  if (!config) {
    return [];
  }

  // 根据角色获取基础操作列表
  let actions: OrderAction[] = [];
  if (role === 'buyer') {
    actions = [...config.actions.buyer];
  } else if (role === 'seller') {
    actions = [...config.actions.seller];
  }

  // 根据条件过滤操作
  actions = actions.filter(action => {
    // Dispute 操作需要是仲裁订单
    if (action === 'Dispute') {
      if (!isModerated) return false;

      // 买家：超时后不能发起争议
      if (role === 'buyer' && isExpired && ['AWAITING_FULFILLMENT', 'FULFILLED'].includes(state)) {
        return false;
      }

      // 卖家：只有发货后才能发起争议
      if (role === 'seller' && !isFulfilled) {
        return false;
      }
    }

    // Cancel 操作：仲裁订单不能直接取消
    if (action === 'Cancel' && isModerated) {
      return false;
    }

    // Refund 操作：CANCELABLE 支付方式下不能自动退款
    if (action === 'Refund' && paymentMethod === 'CANCELABLE') {
      return false;
    }

    return true;
  });

  // 特殊情况：卖家在发货后超时可以领取资金
  if (role === 'seller' && state === 'FULFILLED' && isExpired && isFulfilled) {
    // 将 Dispute 替换为 Claim
    const disputeIndex = actions.indexOf('Dispute');
    if (disputeIndex !== -1) {
      actions[disputeIndex] = 'Claim';
    } else if (!actions.includes('Claim')) {
      actions.push('Claim');
    }
  }

  return actions;
}

/**
 * 获取主要操作（用于突出显示）
 */
export function getPrimaryAction(actions: OrderAction[]): OrderAction | null {
  // 优先级：Pay > Complete > Accept > Fulfill > AcceptPayout
  const priorityOrder: OrderAction[] = ['Pay', 'Complete', 'Accept', 'Fulfill', 'AcceptPayout'];

  for (const action of priorityOrder) {
    if (actions.includes(action)) {
      return action;
    }
  }

  // 如果没有高优先级操作，返回最后一个操作（如果有的话）
  return actions.length > 0 ? actions[actions.length - 1] : null;
}

/**
 * 获取次要操作（用于次要按钮或菜单）
 */
export function getSecondaryActions(actions: OrderAction[]): OrderAction[] {
  const primaryAction = getPrimaryAction(actions);
  return actions.filter(action => action !== primaryAction);
}

/**
 * 操作按钮配置
 */
export interface ActionButtonConfig {
  label: string;
  variant: 'primary' | 'secondary' | 'danger' | 'outline';
  icon?: string;
  confirmRequired?: boolean;
  confirmTitle?: string;
  confirmMessage?: string;
}

/**
 * 获取操作按钮配置
 */
export function getActionButtonConfig(action: OrderAction, _role: UserRole): ActionButtonConfig {
  const configs: Record<OrderAction, ActionButtonConfig> = {
    Pay: {
      label: 'Pay Now',
      variant: 'primary',
      icon: 'credit-card',
    },
    Cancel: {
      label: 'Cancel Order',
      variant: 'danger',
      icon: 'x-circle',
      confirmRequired: true,
      confirmTitle: 'Cancel Order',
      confirmMessage: 'Are you sure you want to cancel this order? This action cannot be undone.',
    },
    Dispute: {
      label: 'Open Dispute',
      variant: 'outline',
      icon: 'alert-triangle',
    },
    Complete: {
      label: 'Confirm Receipt',
      variant: 'primary',
      icon: 'check-circle',
    },
    WriteReview: {
      label: 'Write Review',
      variant: 'outline',
      icon: 'star',
    },
    Accept: {
      label: 'Accept Order',
      variant: 'primary',
      icon: 'check',
    },
    Decline: {
      label: 'Decline',
      variant: 'danger',
      icon: 'x',
      confirmRequired: true,
      confirmTitle: 'Decline Order',
      confirmMessage: 'Are you sure you want to decline this order?',
    },
    Fulfill: {
      label: 'Ship Order',
      variant: 'primary',
      icon: 'package',
    },
    Refund: {
      label: 'Refund',
      variant: 'danger',
      icon: 'refresh-ccw',
      confirmRequired: true,
      confirmTitle: 'Refund Order',
      confirmMessage:
        'Are you sure you want to refund this order? The funds will be returned to the buyer.',
    },
    Claim: {
      label: 'Claim Payment',
      variant: 'primary',
      icon: 'dollar-sign',
      confirmRequired: true,
      confirmTitle: 'Claim Payment',
      confirmMessage: 'Are you sure you want to claim the payment? The escrow period has expired.',
    },
    AcceptPayout: {
      label: 'Accept Payout',
      variant: 'primary',
      icon: 'check-circle',
      confirmRequired: true,
      confirmTitle: 'Accept Payout',
      confirmMessage: 'Are you sure you want to accept this payout decision?',
    },
  };

  return configs[action];
}

/**
 * 订单状态颜色配置
 */
export function getOrderStatusColor(state: OrderState): {
  bg: string;
  text: string;
  border: string;
} {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    AWAITING_PAYMENT: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
    PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
    AWAITING_PICKUP: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    AWAITING_FULFILLMENT: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    PARTIALLY_FULFILLED: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    FULFILLED: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
    COMPLETED: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
    CANCELED: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
    DECLINED: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
    REFUNDED: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
    DISPUTED: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
    DECIDED: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    RESOLVED: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
    PAYMENT_FINALIZED: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      border: 'border-emerald-300',
    },
    PROCESSING_ERROR: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  };

  return colorMap[state] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' };
}
