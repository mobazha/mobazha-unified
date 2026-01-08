/**
 * 商品 API 集成测试
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { productsApi } from '../../services/api';
import { switchRole, logoutCurrentRole } from '../../testing/roleManager';
import { skipIfNoIntegration } from './setup';

describe('Products API Integration Tests', () => {
  beforeAll(() => {
    if (skipIfNoIntegration()) return;
  });

  afterAll(() => {
    logoutCurrentRole();
  });

  describe('Public Listings', () => {
    it('should fetch trending listings', async () => {
      const listings = await productsApi.fetchTrendingListings();

      expect(Array.isArray(listings)).toBe(true);
      // 可能为空，但应该返回数组
    });

    it('should fetch featured listings', async () => {
      const listings = await productsApi.fetchFeaturedListings();

      expect(Array.isArray(listings)).toBe(true);
    });
  });

  describe('Seller Listings', () => {
    beforeAll(async () => {
      await switchRole('seller');
    });

    it('should get seller listing index', async () => {
      const listings = await productsApi.getListingIndex();

      expect(Array.isArray(listings)).toBe(true);
    });

    it('should get listing details if any exist', async () => {
      const listings = await productsApi.getListingIndex();

      if (listings.length > 0) {
        const firstListing = listings[0];
        const detail = await productsApi.getListing(firstListing.slug);

        expect(detail).toBeTruthy();
        expect(detail?.slug).toBe(firstListing.slug);
      }
    });
  });

  describe('Buyer View Listings', () => {
    let sellerPeerID: string;
    let sellerListings: Awaited<ReturnType<typeof productsApi.getListingIndex>>;

    beforeAll(async () => {
      // 先获取 seller 的商品
      await switchRole('seller');
      const profile = await import('../../services/api').then(m => m.profileApi.getMyProfile());
      sellerPeerID = profile?.peerID || '';
      sellerListings = await productsApi.getListingIndex();

      // 切换到 buyer
      await switchRole('buyer');
    });

    it('should view seller store listings', async () => {
      if (!sellerPeerID) {
        console.log('⏭️ Skipping: no seller peerID');
        return;
      }

      const listings = await productsApi.getStoreListingIndex(sellerPeerID);

      expect(Array.isArray(listings)).toBe(true);
    });

    it('should view public listing detail', async () => {
      if (sellerListings.length === 0) {
        console.log('⏭️ Skipping: seller has no listings');
        return;
      }

      const firstListing = sellerListings[0];
      const detail = await productsApi.getPublicListing(firstListing.slug, sellerPeerID);

      expect(detail).toBeTruthy();
    });
  });

  describe('Listing Ratings', () => {
    it('should get rating index', async () => {
      await switchRole('seller');
      const profile = await import('../../services/api').then(m => m.profileApi.getMyProfile());

      if (profile?.peerID) {
        const ratings = await productsApi.getRatingIndex(profile.peerID);
        expect(Array.isArray(ratings)).toBe(true);
      }
    });
  });
});
