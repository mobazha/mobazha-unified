/**
 * Matrix 存储模块 — v1.2 Stub
 *
 * 在 v1.2 中，所有 Matrix 凭据和密钥由后端节点管理，
 * 前端不再需要存储 access_token / device_id / crypto 密钥。
 *
 * 保留导出签名以维持 index.ts 的编译兼容性。
 */

import type { MatrixStorage } from './types';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@matrix_access_token',
  REFRESH_TOKEN: '@matrix_refresh_token',
  USER_ID: '@matrix_user_id',
  DEVICE_ID: '@matrix_device_id',
  CRYPTO_DEVICE: '@matrix_crypto_device',
  SYNC_TOKEN: '@matrix_sync_token',
} as const;

const noopStorage: MatrixStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

export function getStorage(): MatrixStorage {
  return noopStorage;
}
export function setStorage(_storage: MatrixStorage): void {
  /* no-op */
}
export async function saveCredentials(
  _accessToken: string,
  _userId: string,
  _deviceId: string,
  _refreshToken?: string
): Promise<void> {
  /* no-op */
}
export async function updateTokens(_accessToken: string, _refreshToken?: string): Promise<void> {
  /* no-op */
}
export async function getCredentials(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  deviceId: string | null;
}> {
  return { accessToken: null, refreshToken: null, userId: null, deviceId: null };
}
export async function clearCredentials(): Promise<void> {
  /* no-op */
}
export async function clearCredentialsKeepDevice(): Promise<void> {
  /* no-op */
}
export async function clearAllCredentials(): Promise<void> {
  /* no-op */
}
