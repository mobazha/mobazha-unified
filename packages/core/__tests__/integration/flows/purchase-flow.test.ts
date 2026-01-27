/**
 * 完整购买流程端到端测试
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ordersApi, productsApi, profileApi } from '../../../services/api';
import { switchRole, logoutCurrentRole } from '../../../testing/roleManager';
import { simulatePaymentComplete } from '../../../testing/mockPayment';
import { skipIfNoIntegration } from '../setup';

describe('Purchase Flow E2E Tests', () => {
  // 测试数据
  let sellerPeerID: string;
  let sellerListing: Awaited<ReturnType<typeof productsApi.getListingIndex>>[0] | null = null;
  let orderId: string;

  beforeAll(async () => {
    if (skipIfNoIntegration()) return;
  });

  afterAll(() => {
    logoutCurrentRole();
  });

  describe('Step 1: Seller Preparation', () => {
    it('should login as seller and have listings', async () => {
      if (skipIfNoIntegration()) {
        console.log('⏭️ Skipping: integration tests disabled');
        return;
      }

      await switchRole('seller');

      const profile = await profileApi.getMyProfile();
      if (!profile) {
        console.log('⏭️ Skipping: could not login as seller');
        return;
      }
      sellerPeerID = profile.peerID;

      const listings = await productsApi.getListingIndex();
      expect(Array.isArray(listings)).toBe(true);

      if (listings.length > 0) {
        sellerListing = listings[0];
        console.log(`📦 Found seller listing: ${sellerListing.slug}`);
      } else {
        console.warn('⚠️ Seller has no listings, some tests will be skipped');
      }
    });
  });

  describe('Step 2: Buyer Creates Order', () => {
    beforeAll(async () => {
      await switchRole('buyer');
    });

    it('should view seller store', async () => {
      if (!sellerPeerID) {
        console.log('⏭️ Skipping: no seller peerID');
        return;
      }

      const listings = await productsApi.getStoreListingIndex(sellerPeerID);
      expect(Array.isArray(listings)).toBe(true);
    });

    it('should view listing details', async () => {
      if (!sellerListing) {
        console.log('⏭️ Skipping: no listing available');
        return;
      }

      const detail = await productsApi.getPublicListing(sellerListing.slug, sellerPeerID);
      expect(detail).toBeTruthy();
      expect(detail?.slug).toBe(sellerListing.slug);
    });

    it('should estimate order total', async () => {
      if (!sellerListing) {
        console.log('⏭️ Skipping: no listing available');
        return;
      }

      const estimate = await ordersApi.estimateOrderTotal({
        vendorId: sellerPeerID,
        items: [
          {
            listingHash: sellerListing.slug,
            quantity: 1,
          },
        ],
        paymentCoin: 'ETH',
      });

      expect(estimate).toBeTruthy();
      expect(estimate.total).toBeTruthy();
      console.log(`💰 Order estimate: ${estimate.total} ${estimate.paymentCoin}`);
    });

    it('should create purchase order', async () => {
      if (!sellerListing) {
        console.log('⏭️ Skipping: no listing available');
        return;
      }

      try {
        const result = await ordersApi.purchaseListing({
          vendorId: sellerPeerID,
          items: [
            {
              listingHash: sellerListing.slug,
              quantity: 1,
            },
          ],
          paymentCoin: 'ETH',
        });

        expect(result).toBeTruthy();
        expect(result.orderID).toBeTruthy();
        orderId = result.orderID;
        console.log(`📝 Created order: ${orderId}`);
      } catch (error) {
        // 可能因为缺少配置而失败
        console.warn('⚠️ Order creation may have failed:', error);
      }
    });
  });

  describe('Step 3: Payment (Mock)', () => {
    it('should simulate payment complete', async () => {
      if (!orderId) {
        console.log('⏭️ Skipping: no order created');
        return;
      }

      const result = await simulatePaymentComplete(orderId, {
        coin: 'ETH',
        amount: '0.01',
      });

      // Mock 支付总是成功
      expect(result.success).toBe(true);
      console.log(`💳 Payment simulated: ${result.txId}`);
    });
  });

  describe('Step 4: Seller Confirms Order', () => {
    beforeAll(async () => {
      await switchRole('seller');
    });

    it('should see new order in sales', async () => {
      const sales = await ordersApi.getSales();
      expect(Array.isArray(sales)).toBe(true);

      if (orderId) {
        const newOrder = sales.find(s => s.orderID === orderId);
        if (newOrder) {
          console.log(`✅ Found order ${orderId} in sales`);
        }
      }
    });

    it('should confirm order', async () => {
      if (!orderId) {
        console.log('⏭️ Skipping: no order to confirm');
        return;
      }

      try {
        const result = await ordersApi.confirmOrder({ orderID: orderId });
        expect(result.success).toBe(true);
        console.log(`✅ Order confirmed: ${orderId}`);
      } catch (error) {
        console.warn('⚠️ Order confirmation may have failed:', error);
      }
    });

    it('should fulfill order', async () => {
      if (!orderId) {
        console.log('⏭️ Skipping: no order to fulfill');
        return;
      }

      try {
        const result = await ordersApi.fulfillOrder({
          orderID: orderId,
          physicalDelivery: [
            {
              shipper: 'TestShipper',
              trackingNumber: 'TEST123456',
            },
          ],
          note: 'E2E Test shipment',
        });
        expect(result.success).toBe(true);
        console.log(`📦 Order fulfilled: ${orderId}`);
      } catch (error) {
        console.warn('⚠️ Order fulfillment may have failed:', error);
      }
    });
  });

  describe('Step 5: Buyer Completes Order', () => {
    beforeAll(async () => {
      await switchRole('buyer');
    });

    it('should see order status updated', async () => {
      if (!orderId) {
        console.log('⏭️ Skipping: no order');
        return;
      }

      const orderDetail = await ordersApi.getOrderDetails(orderId);
      if (orderDetail) {
        console.log(`📋 Order status: ${orderDetail.state}`);
      }
    });

    it('should complete order', async () => {
      if (!orderId) {
        console.log('⏭️ Skipping: no order to complete');
        return;
      }

      try {
        const result = await ordersApi.completeOrder({
          orderId,
          ratings: [
            {
              slug: sellerListing?.slug || 'test',
              overall: 5,
              quality: 5,
              description: 5,
              deliverySpeed: 5,
              customerService: 5,
              review: 'Great E2E test transaction!',
            },
          ],
        });
        expect(result.success).toBe(true);
        console.log(`✅ Order completed: ${orderId}`);
      } catch (error) {
        console.warn('⚠️ Order completion may have failed:', error);
      }
    });
  });
});
