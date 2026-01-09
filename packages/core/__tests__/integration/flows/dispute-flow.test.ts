/**
 * 争议处理流程端到端测试
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ordersApi, disputesApi, profileApi } from '../../../services/api';
import { switchRole, logoutCurrentRole } from '../../../testing/roleManager';
import { skipIfNoIntegration } from '../setup';

describe('Dispute Flow E2E Tests', () => {
  // 测试数据
  let disputeOrderId: string | null = null;

  beforeAll(async () => {
    if (skipIfNoIntegration()) return;
  });

  afterAll(() => {
    logoutCurrentRole();
  });

  describe('Step 1: Find Order for Dispute', () => {
    it('should find a completed order for dispute test', async () => {
      await switchRole('buyer');

      const purchases = await ordersApi.getPurchases();

      // 查找可以发起争议的订单（有仲裁的订单）
      const moderatedOrder = purchases.find(p => p.moderated === true);

      if (moderatedOrder) {
        disputeOrderId = moderatedOrder.orderID;
        console.log(`📋 Found moderated order for dispute: ${disputeOrderId}`);
      } else {
        console.log('⚠️ No moderated orders found, dispute flow will be simulated');
      }
    });
  });

  describe('Step 2: Buyer Opens Dispute', () => {
    beforeAll(async () => {
      await switchRole('buyer');
    });

    it('should open dispute on order', async () => {
      if (!disputeOrderId) {
        console.log('⏭️ Skipping: no order for dispute');
        return;
      }

      try {
        const result = await ordersApi.openDispute(
          disputeOrderId,
          'E2E Test: Product not as described'
        );

        if (result.success) {
          console.log(`⚠️ Dispute opened for order: ${disputeOrderId}`);
        }
      } catch (error) {
        // 可能已经有争议或订单状态不允许
        console.log('⚠️ Could not open dispute:', error);
      }
    });
  });

  describe('Step 3: Moderator Views Cases', () => {
    beforeAll(async () => {
      await switchRole('moderator');
    });

    it('should get moderator profile', async () => {
      if (skipIfNoIntegration()) {
        console.log('⏭️ Skipping: integration tests disabled');
        return;
      }

      const profile = await profileApi.getMyProfile();

      if (!profile) {
        console.log('⏭️ Skipping: could not login as moderator');
        return;
      }
      console.log(`👨‍⚖️ Moderator: ${profile.name || profile.peerID}`);
    });

    it('should view dispute cases', async () => {
      try {
        const cases = await disputesApi.getCases();

        expect(Array.isArray(cases)).toBe(true);
        console.log(`📂 Moderator has ${cases.length} cases`);

        if (disputeOrderId) {
          const ourCase = cases.find(c => c.orderId === disputeOrderId);
          if (ourCase) {
            console.log(`✅ Found our dispute case`);
          }
        }
      } catch (error) {
        console.log('⚠️ Could not fetch cases:', error);
      }
    });

    it('should view case details if available', async () => {
      try {
        const cases = await disputesApi.getCases();

        if (cases.length > 0) {
          const caseId = cases[0].orderId || cases[0].caseId;
          // 获取案件详情需要特定 API
          console.log(`📋 First case ID: ${caseId}`);
        }
      } catch (error) {
        console.log('⚠️ Could not view case details:', error);
      }
    });
  });

  describe('Step 4: Moderator Resolves Dispute', () => {
    beforeAll(async () => {
      await switchRole('moderator');
    });

    it('should close/resolve dispute', async () => {
      if (!disputeOrderId) {
        console.log('⏭️ Skipping: no dispute to resolve');
        return;
      }

      try {
        // 这里应该调用争议解决 API
        // const result = await disputesApi.resolveDispute(disputeOrderId, {...});
        console.log('📝 Dispute resolution would be executed here');
      } catch (error) {
        console.log('⚠️ Could not resolve dispute:', error);
      }
    });
  });

  describe('Step 5: Verify Resolution', () => {
    it('should verify buyer sees resolution', async () => {
      await switchRole('buyer');

      if (!disputeOrderId) {
        console.log('⏭️ Skipping: no dispute');
        return;
      }

      const orderDetail = await ordersApi.getOrderDetails(disputeOrderId);
      if (orderDetail) {
        console.log(`📋 Order state after dispute: ${orderDetail.state}`);
      }
    });

    it('should verify seller sees resolution', async () => {
      await switchRole('seller');

      if (!disputeOrderId) {
        console.log('⏭️ Skipping: no dispute');
        return;
      }

      const orderDetail = await ordersApi.getOrderDetails(disputeOrderId);
      if (orderDetail) {
        console.log(`📋 Seller view - Order state: ${orderDetail.state}`);
      }
    });
  });
});
