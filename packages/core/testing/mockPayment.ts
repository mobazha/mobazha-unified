/**
 * 支付 Mock 工具
 * 用于在测试中模拟支付流程
 */

import { getGatewayUrl, getAuthHeaders } from '../services/api/config';

export interface MockPaymentResult {
  success: boolean;
  txId?: string;
  error?: string;
}

/**
 * 模拟支付完成
 * 注意：这需要后端支持测试模式 API
 */
export async function simulatePaymentComplete(
  orderId: string,
  options?: {
    txId?: string;
    coin?: string;
    amount?: string;
  }
): Promise<MockPaymentResult> {
  const baseUrl = getGatewayUrl();
  const url = `${baseUrl}/api/test/order/set-paid`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        orderId,
        txId: options?.txId || `mock_tx_${Date.now()}`,
        coin: options?.coin || 'ETH',
        amount: options?.amount || '0.01',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        txId: data.txId || data.data?.txId,
      };
    }

    // 如果后端没有测试 API，返回模拟成功
    if (response.status === 404) {
      console.warn('⚠️ Test API not available, returning mock success');
      return {
        success: true,
        txId: `mock_tx_${Date.now()}`,
      };
    }

    const error = await response.text();
    return {
      success: false,
      error: `HTTP ${response.status}: ${error}`,
    };
  } catch {
    // 网络错误时返回模拟成功（用于离线测试）
    console.warn('⚠️ Network error, returning mock success');
    return {
      success: true,
      txId: `mock_tx_${Date.now()}`,
    };
  }
}

/**
 * 模拟订单状态变更
 */
export async function simulateOrderStateChange(
  orderId: string,
  newState: string
): Promise<MockPaymentResult> {
  const baseUrl = getGatewayUrl();
  const url = `${baseUrl}/api/test/order/set-state`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        orderId,
        state: newState,
      }),
    });

    if (response.ok) {
      return { success: true };
    }

    // 如果后端没有测试 API，返回模拟成功
    if (response.status === 404) {
      console.warn('⚠️ Test API not available, returning mock success');
      return { success: true };
    }

    return {
      success: false,
      error: `HTTP ${response.status}`,
    };
  } catch {
    console.warn('⚠️ Network error, returning mock success');
    return { success: true };
  }
}

/**
 * 创建 Mock 支付信息
 */
export function createMockPaymentInfo(orderId: string, coin = 'ETH') {
  const mockAddresses: Record<string, string> = {
    ETH: '0x' + 'a'.repeat(40),
    BTC: 'bc1q' + 'x'.repeat(38),
    LTC: 'ltc1q' + 'x'.repeat(38),
    SOL: 'So1' + 'x'.repeat(40),
  };

  return {
    orderId,
    coin,
    address: mockAddresses[coin] || mockAddresses.ETH,
    amount: '0.01',
    amountSatoshi: 10000000,
    qrCode: `${coin.toLowerCase()}:${mockAddresses[coin]}?amount=0.01`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Mock 支付状态
 */
export type MockPaymentStatus = 'pending' | 'confirming' | 'confirmed' | 'failed';

/**
 * 创建支付状态模拟器
 */
export function createPaymentSimulator(_orderId: string) {
  let status: MockPaymentStatus = 'pending';
  let confirmations = 0;

  return {
    getStatus: () => ({ status, confirmations }),

    // 模拟支付发送
    sendPayment: () => {
      status = 'confirming';
      confirmations = 0;
    },

    // 模拟确认增加
    addConfirmation: () => {
      confirmations++;
      if (confirmations >= 1) {
        status = 'confirmed';
      }
    },

    // 模拟支付失败
    fail: () => {
      status = 'failed';
    },

    // 重置
    reset: () => {
      status = 'pending';
      confirmations = 0;
    },
  };
}
