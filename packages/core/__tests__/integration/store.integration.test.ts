/**
 * 店铺功能集成测试
 *
 * 测试 Profile 页面和 Store 页面的核心功能：
 * - Profile API (获取/更新资料)
 * - 商品列表 API
 * - 关注/取消关注功能
 * - 图片上传 API
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { profileApi, socialApi, imagesApi } from '../../services/api';
import { productDataService } from '../../services/dataService';
import { switchRole, logoutCurrentRole } from '../../testing/roleManager';
import { skipIfNoIntegration } from './setup';

describe('Store Module Integration Tests', () => {
  beforeAll(() => {
    if (skipIfNoIntegration()) return;
  });

  afterAll(() => {
    logoutCurrentRole();
  });

  describe('Profile API', () => {
    beforeAll(async () => {
      await switchRole('seller');
    });

    it('should get my profile with all required fields', async () => {
      const profile = await profileApi.getMyProfile();

      expect(profile).toBeTruthy();
      expect(profile?.peerID).toBeTruthy();
      expect(typeof profile?.peerID).toBe('string');
    });

    it('should have profile stats', async () => {
      const profile = await profileApi.getMyProfile();

      // stats 可能存在也可能不存在，但如果存在应该有正确结构
      if (profile?.stats) {
        expect(typeof profile.stats.followerCount).toBe('number');
        expect(typeof profile.stats.followingCount).toBe('number');
        expect(typeof profile.stats.listingCount).toBe('number');
      }
    });

    it('should update profile successfully', async () => {
      const testDescription = `Test store description ${Date.now()}`;
      const updateData = {
        shortDescription: testDescription,
      };

      const result = await profileApi.setProfile(updateData);
      expect(result.success).toBe(true);

      // 验证更新生效
      const profile = await profileApi.getMyProfile();
      expect(profile?.shortDescription).toBe(testDescription);
    });

    it('should update contact info', async () => {
      const updateData = {
        contactInfo: {
          email: 'test@example.com',
          website: 'https://test.com',
        },
      };

      const result = await profileApi.setProfile(updateData);
      expect(result.success).toBe(true);
    });
  });

  describe('Store Listings', () => {
    let sellerPeerID: string;

    beforeAll(async () => {
      await switchRole('seller');
      const profile = await profileApi.getMyProfile();
      sellerPeerID = profile?.peerID || '';
    });

    it('should get my listings', async () => {
      const listings = await productDataService.getMyListings();

      expect(Array.isArray(listings)).toBe(true);
      // 商品列表可能为空，但应该是数组
    });

    it('should get store listings by peerID', async () => {
      if (!sellerPeerID) {
        console.warn('Skipping: No seller peerID available');
        return;
      }

      const listings = await productDataService.getStoreListings(sellerPeerID);

      expect(Array.isArray(listings)).toBe(true);
    });

    it('listing items should have correct structure', async () => {
      const listings = await productDataService.getMyListings();

      if (listings.length > 0) {
        const listing = listings[0];
        expect(listing.slug).toBeTruthy();
        expect(listing.title).toBeTruthy();
        // price 和 thumbnail 可能存在
      }
    });
  });

  describe('Social API - Follow/Unfollow', () => {
    let targetPeerID: string;

    beforeAll(async () => {
      // 获取 seller 的 peerID 作为关注目标
      await switchRole('seller');
      const profile = await profileApi.getMyProfile();
      targetPeerID = profile?.peerID || '';

      // 切换到 buyer 进行关注操作
      await switchRole('buyer');
    });

    it('should check follow status', async () => {
      if (!targetPeerID) {
        console.warn('Skipping: No target peerID available');
        return;
      }

      const isFollowing = await socialApi.isFollowing(targetPeerID);

      expect(typeof isFollowing).toBe('boolean');
    });

    it('should follow a user', async () => {
      if (!targetPeerID) {
        console.warn('Skipping: No target peerID available');
        return;
      }

      const result = await socialApi.followUser(targetPeerID);

      expect(result).toBeTruthy();
      // API 可能返回 { success: true } 或其他格式
    });

    it('should get following list', async () => {
      const following = await socialApi.getFollowing();

      expect(Array.isArray(following)).toBe(true);
    });

    it('should get followers list', async () => {
      const followers = await socialApi.getFollowers();

      expect(Array.isArray(followers)).toBe(true);
    });

    it('should unfollow a user', async () => {
      if (!targetPeerID) {
        console.warn('Skipping: No target peerID available');
        return;
      }

      const result = await socialApi.unfollowUser(targetPeerID);

      expect(result).toBeTruthy();
    });
  });

  describe('Image Upload API', () => {
    it('should export fileToBase64 utility', () => {
      expect(typeof imagesApi.fileToBase64).toBe('function');
    });

    it('should export uploadAvatarImage function', () => {
      expect(typeof imagesApi.uploadAvatarImage).toBe('function');
    });

    it('should export uploadHeaderImage function', () => {
      expect(typeof imagesApi.uploadHeaderImage).toBe('function');
    });

    it('should export uploadProductImages function', () => {
      expect(typeof imagesApi.uploadProductImages).toBe('function');
    });
  });

  describe('Cross-Role Store Access', () => {
    it('should access seller store as buyer', async () => {
      // 获取 seller peerID
      await switchRole('seller');
      const sellerProfile = await profileApi.getMyProfile();
      const sellerPeerID = sellerProfile?.peerID;

      if (!sellerPeerID) {
        console.warn('Skipping: No seller peerID available');
        return;
      }

      // 切换到 buyer 访问 seller 店铺
      await switchRole('buyer');
      const storeProfile = await profileApi.getProfile(sellerPeerID);

      expect(storeProfile).toBeTruthy();
      expect(storeProfile?.peerID).toBe(sellerPeerID);
    });

    it('should get store listings as buyer', async () => {
      // 获取 seller peerID
      await switchRole('seller');
      const sellerProfile = await profileApi.getMyProfile();
      const sellerPeerID = sellerProfile?.peerID;

      if (!sellerPeerID) {
        console.warn('Skipping: No seller peerID available');
        return;
      }

      // 切换到 buyer 获取 seller 的商品列表
      await switchRole('buyer');
      const listings = await productDataService.getStoreListings(sellerPeerID);

      expect(Array.isArray(listings)).toBe(true);
    });
  });
});
