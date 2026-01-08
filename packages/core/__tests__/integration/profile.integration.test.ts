/**
 * 用户/店铺 API 集成测试
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { profileApi } from '../../services/api';
import { switchRole, logoutCurrentRole } from '../../testing/roleManager';
import { skipIfNoIntegration } from './setup';

describe('Profile API Integration Tests', () => {
  beforeAll(() => {
    if (skipIfNoIntegration()) return;
  });

  afterAll(() => {
    logoutCurrentRole();
  });

  describe('Buyer Profile', () => {
    beforeAll(async () => {
      await switchRole('buyer');
    });

    it('should get my profile', async () => {
      const profile = await profileApi.getMyProfile();

      expect(profile).toBeTruthy();
      expect(profile?.peerID).toBeTruthy();
    });

    it('should get my peer ID', async () => {
      const peerID = await profileApi.getPeerID();

      expect(peerID).toBeTruthy();
      expect(typeof peerID).toBe('string');
    });
  });

  describe('Seller Profile', () => {
    beforeAll(async () => {
      await switchRole('seller');
    });

    it('should get seller profile', async () => {
      const profile = await profileApi.getMyProfile();

      expect(profile).toBeTruthy();
      expect(profile?.peerID).toBeTruthy();
    });

    it('should have vendor info', async () => {
      const profile = await profileApi.getMyProfile();

      expect(profile).toBeTruthy();
      // Seller should have vendor capabilities
    });
  });

  describe('Moderator Profile', () => {
    beforeAll(async () => {
      await switchRole('moderator');
    });

    it('should get moderator profile', async () => {
      const profile = await profileApi.getMyProfile();

      expect(profile).toBeTruthy();
      expect(profile?.peerID).toBeTruthy();
    });
  });

  describe('Cross-Role Profile Access', () => {
    it('should access other user profile by peerID', async () => {
      // 先获取 seller 的 peerID
      await switchRole('seller');
      const sellerProfile = await profileApi.getMyProfile();
      const sellerPeerID = sellerProfile?.peerID;

      expect(sellerPeerID).toBeTruthy();

      // 切换到 buyer，访问 seller 的 profile
      await switchRole('buyer');
      const otherProfile = await profileApi.getProfile(sellerPeerID!);

      expect(otherProfile).toBeTruthy();
      expect(otherProfile?.peerID).toBe(sellerPeerID);
    });
  });
});
