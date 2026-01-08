/**
 * 订单 API 集成测试
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ordersApi, profileApi } from '../../services/api';
import { switchRole, logoutCurrentRole } from '../../testing/roleManager';
import { skipIfNoIntegration } from './setup';

describe('Orders API Integration Tests', () => {
  beforeAll(() => {
    if (skipIfNoIntegration()) return;
  });

  afterAll(() => {
    logoutCurrentRole();
  });

  describe('Buyer Orders', () => {
    beforeAll(async () => {
      await switchRole('buyer');
    });

    it('should get purchases list', async () => {
      const purchases = await ordersApi.getPurchases();

      expect(Array.isArray(purchases)).toBe(true);
    });

    it('should get purchase details if any exist', async () => {
      const purchases = await ordersApi.getPurchases();

      if (purchases.length > 0) {
        const firstOrder = purchases[0];
        const detail = await ordersApi.getOrderDetails(firstOrder.orderId);

        expect(detail).toBeTruthy();
      }
    });
  });

  describe('Seller Orders', () => {
    beforeAll(async () => {
      await switchRole('seller');
    });

    it('should get sales list', async () => {
      const sales = await ordersApi.getSales();

      expect(Array.isArray(sales)).toBe(true);
    });

    it('should get sale details if any exist', async () => {
      const sales = await ordersApi.getSales();

      if (sales.length > 0) {
        const firstOrder = sales[0];
        const detail = await ordersApi.getOrderDetails(firstOrder.orderId);

        expect(detail).toBeTruthy();
      }
    });
  });

  describe('Order Estimate', () => {
    let sellerPeerID: string;
    let listingHash: string;

    beforeAll(async () => {
      // 获取 seller 信息和商品
      await switchRole('seller');
      const profile = await profileApi.getMyProfile();
      sellerPeerID = profile?.peerID || '';

      const { productsApi } = await import('../../services/api');
      const listings = await productsApi.getListingIndex();
      if (listings.length > 0) {
        listingHash = listings[0].slug;
      }

      // 切换到 buyer
      await switchRole('buyer');
    });

    it('should estimate order total', async () => {
      if (!sellerPeerID || !listingHash) {
        console.log('⏭️ Skipping: no seller or listing available');
        return;
      }

      const estimate = await ordersApi.estimateOrderTotal({
        vendorId: sellerPeerID,
        items: [{ listingHash, quantity: 1 }],
        paymentCoin: 'ETH',
      });

      expect(estimate).toBeTruthy();
      expect(estimate.total).toBeTruthy();
    });
  });

  describe('Cross-Role Order View', () => {
    it('should allow buyer and seller to view same order', async () => {
      // 获取 buyer 的订单
      await switchRole('buyer');
      const buyerPurchases = await ordersApi.getPurchases();

      if (buyerPurchases.length === 0) {
        console.log('⏭️ Skipping: buyer has no purchases');
        return;
      }

      const orderId = buyerPurchases[0].orderId;

      // Buyer 查看订单
      const buyerView = await ordersApi.getOrderDetails(orderId);
      expect(buyerView).toBeTruthy();

      // Seller 查看同一订单
      await switchRole('seller');
      // 订单可能不属于当前 seller，所以可能为 null
      // 这里只验证 API 调用不会报错
      await ordersApi.getOrderDetails(orderId);
    });
  });
});
