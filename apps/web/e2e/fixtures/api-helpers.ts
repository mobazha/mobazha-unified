/**
 * API Helper Functions for Playwright E2E Tests
 * 在 Playwright 测试中直接调用后端 API 进行数据准备和清理
 */

import type { APIRequestContext } from '@playwright/test';

const BACKEND_URL = process.env.E2E_BACKEND_URL || 'http://localhost:8080';

/**
 * Create an API request helper with Bearer token authorization.
 */
export function createApiHelper(request: APIRequestContext, token: string) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  return {
    /**
     * GET request to the hosting backend API.
     */
    async get(path: string) {
      const resp = await request.get(`${BACKEND_URL}${path}`, { headers });
      return resp;
    },

    /**
     * POST request to the hosting backend API.
     */
    async post(path: string, data?: Record<string, unknown>) {
      const resp = await request.post(`${BACKEND_URL}${path}`, {
        headers,
        data,
      });
      return resp;
    },

    /**
     * PUT request to the hosting backend API.
     */
    async put(path: string, data?: Record<string, unknown>) {
      const resp = await request.put(`${BACKEND_URL}${path}`, {
        headers,
        data,
      });
      return resp;
    },

    /**
     * DELETE request to the hosting backend API.
     */
    async delete(path: string) {
      const resp = await request.delete(`${BACKEND_URL}${path}`, { headers });
      return resp;
    },

    // ------ Business-level helpers ------

    /**
     * Create a group marketplace.
     */
    async createMarketplace(platform: string, chatID: string, title?: string) {
      return this.post(`/api/v1/group-marketplace/${platform}`, {
        chatID,
        chatType: 'group',
        chatTitle: title || `E2E Test Marketplace ${chatID}`,
        chatUsername: `e2e_${chatID}`,
      });
    },

    /**
     * Apply as seller in a marketplace.
     */
    async applySeller(platform: string, chatID: string, productGroupIDs?: number[]) {
      return this.post(`/api/v1/group-marketplace/${platform}/${chatID}/sellers/apply`, {
        productGroupIDs: productGroupIDs || [],
      });
    },

    /**
     * Review (approve/reject) a seller application.
     */
    async reviewSeller(
      platform: string,
      chatID: string,
      sellerID: string,
      status: 'approved' | 'rejected',
      platformUserID: string,
    ) {
      return this.put(
        `/api/v1/group-marketplace/${platform}/${chatID}/sellers/${sellerID}/review`,
        { status, platformUserID },
      );
    },

    /**
     * Create a product group.
     */
    async createProductGroup(userID: string, name: string, description?: string) {
      return this.post('/api/v1/product-groups', {
        userID,
        name,
        description: description || `E2E test product group: ${name}`,
        sortOrder: 1,
      });
    },

    /**
     * Delete a product group.
     */
    async deleteProductGroup(groupID: string) {
      return this.delete(`/api/v1/product-groups/${groupID}`);
    },

    /**
     * Get user info for the authenticated user.
     */
    async getUserInfo() {
      const resp = await this.get('/api/userinfo');
      const data = await resp.json();
      return data?.data || data;
    },
  };
}
