/**
 * 订单 API 服务
 */

import type { Order, OrderListItem } from '../../types';
import { get, post, safeRequest } from './client';
import { getGatewayUrl, getAuthHeaders } from './config';

/**
 * 获取购买订单列表
 */
export async function getPurchases(
  username?: string,
  password?: string,
  limit = '',
  offsetId = ''
): Promise<OrderListItem[]> {
  const url = `${getGatewayUrl()}/ob/purchases?limit=${limit}&offsetId=${offsetId}`;
  return safeRequest<OrderListItem[]>(url, { headers: getAuthHeaders(username, password) }, []);
}

/**
 * 获取销售订单列表
 */
export async function getSales(
  username?: string,
  password?: string,
  limit = '',
  offsetId = ''
): Promise<OrderListItem[]> {
  const url = `${getGatewayUrl()}/ob/sales?limit=${limit}&offsetId=${offsetId}`;
  return safeRequest<OrderListItem[]>(url, { headers: getAuthHeaders(username, password) }, []);
}

/**
 * 获取订单详情
 */
export async function getOrderDetails(
  orderId: string,
  username?: string,
  password?: string
): Promise<Order | null> {
  const url = `${getGatewayUrl()}/ob/order/${orderId}`;
  try {
    return await get<Order>(url, getAuthHeaders(username, password));
  } catch {
    return null;
  }
}

/**
 * 确认订单（卖家）
 */
export async function confirmOrder(
  payload: { orderId: string; reject?: boolean; note?: string },
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const url = `${getGatewayUrl()}/order/confirm`;
  return post(url, payload, getAuthHeaders(username, password));
}

/**
 * 发货（卖家）
 */
export async function fulfillOrder(
  fulfillObj: {
    orderId: string;
    physicalDelivery?: { shipper: string; trackingNumber: string }[];
    digitalDelivery?: { url?: string; password?: string };
    note?: string;
  },
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const url = `${getGatewayUrl()}/order/fulfill`;
  return post(url, fulfillObj, getAuthHeaders(username, password));
}

/**
 * 完成订单（买家）
 */
export async function completeOrder(
  payload: {
    orderId: string;
    ratings?: Array<{
      slug: string;
      overall: number;
      quality?: number;
      description?: number;
      deliverySpeed?: number;
      customerService?: number;
      review?: string;
      anonymous?: boolean;
    }>;
  },
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const url = `${getGatewayUrl()}/order/complete`;
  return post(url, payload, getAuthHeaders(username, password));
}

/**
 * 取消订单
 */
export async function cancelOrder(
  orderId: string,
  transactionId = '',
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const url = `${getGatewayUrl()}/order/cancel`;
  return post(
    url,
    { orderID: orderId, transactionID: transactionId },
    getAuthHeaders(username, password)
  );
}

/**
 * 退款订单
 */
export async function refundOrder(
  orderId: string,
  transactionId = '',
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const url = `${getGatewayUrl()}/order/refund`;
  return post(
    url,
    { orderID: orderId, transactionID: transactionId },
    getAuthHeaders(username, password)
  );
}

/**
 * 支付订单
 */
export async function fundOrder(
  payload: {
    coin: string;
    address: string;
    amount: number;
    orderId: string;
    memo?: string;
  },
  username?: string,
  password?: string
): Promise<{ success: boolean; txid?: string; error?: string }> {
  const url = `${getGatewayUrl()}/ob/orderspend`;
  return post(
    url,
    {
      coinType: payload.coin,
      orderID: payload.orderId,
      address: payload.address,
      amount: payload.amount,
      feeLevel: 'ECONOMIC',
      memo: payload.memo,
      requireAssociateOrder: true,
    },
    getAuthHeaders(username, password)
  );
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
 * 接受争议裁决
 */
export async function acceptDispute(
  orderId: string,
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const url = `${getGatewayUrl()}/dispute/release`;
  return post(url, { orderID: orderId }, getAuthHeaders(username, password));
}

/**
 * 获取支付指令
 */
export async function getPaymentInstructions(
  requestData: { orderId: string; coin: string },
  username?: string,
  password?: string
): Promise<{ address?: string; amount?: number; error?: string }> {
  const url = `${getGatewayUrl()}/instructions/order/payment`;
  return post(url, requestData, getAuthHeaders(username, password));
}

/**
 * 获取剩余支付金额
 */
export async function getPaymentRemaining(
  orderId: string,
  username?: string,
  password?: string
): Promise<{ remaining?: number; paid?: number; error?: string }> {
  const url = `${getGatewayUrl()}/order/${orderId}/payment/remaining`;
  return get(url, getAuthHeaders(username, password));
}

/**
 * 重发订单消息
 */
export async function resendOrderMessage(
  orderId: string,
  messageType: string,
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const url = `${getGatewayUrl()}/ob/resendordermessage`;
  return post(url, { orderID: orderId, messageType }, getAuthHeaders(username, password));
}
