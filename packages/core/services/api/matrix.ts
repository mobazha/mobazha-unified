/**
 * Matrix API 服务层
 * 与 Hosting 后端交互获取 Matrix 配置和凭据
 */

import { getHostingUrl, getAuthHeaders } from './config';
import { NODE_API, HOSTING_API } from '../../config/apiPaths';
import { authGet, authPost } from './helpers';

// ============= 辅助函数 =============

/**
 * Unwrap {data: T} envelope from backend JSON responses.
 */
function unwrapData<T>(json: unknown): T {
  if (json !== null && typeof json === 'object' && 'data' in json) {
    return (json as Record<string, unknown>).data as T;
  }
  return json as T;
}

/**
 * Extract error message from error response body.
 * Supports both old format {error: string} and new format {error: {code, message}}.
 */
function extractErrorMessage(errBody: unknown): string {
  if (errBody == null || typeof errBody !== 'object') return 'Request failed';
  const o = errBody as Record<string, unknown>;
  const err = o.error;
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const msg = (err as Record<string, unknown>).message;
    return typeof msg === 'string' ? msg : 'Request failed';
  }
  if (typeof o.message === 'string') return o.message;
  return 'Request failed';
}

// ============= 类型定义 =============

export interface MatrixServerConfig {
  enabled: boolean;
  homeserverURL: string;
  serverName: string;
  presenceEnabled?: boolean;
}

export interface MatrixCredentials {
  registered: boolean;
  matrixUserId?: string;
  homeserverUrl?: string;
  password?: string;
  serverName?: string;
}

export interface MatrixAutoRegisterResponse {
  registered: boolean;
  userID: string;
  homeServer: string;
  serverName?: string;
}

// ============= API 函数 =============

/**
 * 通用响应处理：解析 JSON、解包 data 信封、统一错误格式
 */
async function handleResponse<T>(response: Response): Promise<T> {
  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(response.statusText || 'Request failed');
    }
    throw new Error('Invalid JSON response');
  }
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  return unwrapData<T>(raw);
}

/**
 * 获取 Matrix 服务器配置
 * @returns Matrix 配置 { enabled, homeserverURL, serverName, presenceEnabled }
 */
export async function getMatrixConfig(): Promise<MatrixServerConfig> {
  const hostingUrl = getHostingUrl();
  const response = await fetch(`${hostingUrl}${HOSTING_API.MATRIX_CONFIG}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse<MatrixServerConfig>(response);
}

/**
 * 从节点获取 Matrix 凭据
 * @returns 凭据信息（如果已注册）
 */
export async function getMatrixCredentials(): Promise<MatrixCredentials | null> {
  try {
    return await authGet<MatrixCredentials>(NODE_API.MATRIX_CREDENTIALS);
  } catch (error) {
    console.warn('[Matrix API] Failed to get credentials:', error);
    return null;
  }
}

/**
 * 保存 Matrix 凭据到节点
 * @param matrixUserId Matrix 用户 ID
 * @param serverName Matrix 服务器名称
 */
export async function saveMatrixCredentials(
  matrixUserId: string,
  serverName: string
): Promise<void> {
  try {
    await authPost(NODE_API.MATRIX_CREDENTIALS, { matrixUserId, serverName });
  } catch (error) {
    console.warn('[Matrix API] Failed to save credentials:', error);
  }
}

/**
 * 从节点获取派生密码
 * @returns 派生的 Matrix 密码
 */
export async function getDerivedPassword(): Promise<string | null> {
  try {
    const data = await authGet<{ password: string }>(NODE_API.MATRIX_PASSWORD);
    return data.password;
  } catch (error) {
    console.warn('[Matrix API] Failed to get password:', error);
    return null;
  }
}

/**
 * Matrix 用户自动注册
 * @param peerID 用户的 peerID
 * @param password 可选：客户端派生的密码
 * @returns 注册结果 { registered, userID, homeServer }
 */
export async function autoRegisterMatrix(
  peerID: string,
  password?: string
): Promise<MatrixAutoRegisterResponse> {
  const hostingUrl = getHostingUrl();
  const body: { peerID: string; password?: string } = { peerID };
  if (password) {
    body.password = password;
  }

  const response = await fetch(`${hostingUrl}${HOSTING_API.MATRIX_AUTO_REGISTER}`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return handleResponse<MatrixAutoRegisterResponse>(response);
}

/**
 * 同步用户资料到 Matrix
 * @param displayName 显示名称
 * @param avatarHash 头像 IPFS hash（可选）
 */
export async function syncProfileToMatrix(displayName: string, avatarHash?: string): Promise<void> {
  const hostingUrl = getHostingUrl();
  const body: { displayName: string; avatarHash?: string } = { displayName };
  if (avatarHash) {
    body.avatarHash = avatarHash;
  }

  const response = await fetch(`${hostingUrl}${HOSTING_API.MATRIX_SYNC_PROFILE}`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const raw = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(extractErrorMessage(raw));
  }
}

// ============= 店铺空间 API =============

export interface StoreSpaceCreateResponse {
  spaceId: string;
  generalRoomId: string;
}

/**
 * 创建店铺空间
 */
export async function createStoreSpace(data: {
  storePeerID: string;
  storeName: string;
  isPrivate?: boolean;
}): Promise<StoreSpaceCreateResponse> {
  const hostingUrl = getHostingUrl();
  const response = await fetch(`${hostingUrl}${HOSTING_API.MATRIX_STORE_CREATE_SPACE}`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<StoreSpaceCreateResponse>(response);
}

/**
 * 邀请用户到店铺空间
 */
export async function inviteToStoreSpace(spaceId: string, userPeerID: string): Promise<void> {
  const hostingUrl = getHostingUrl();
  const response = await fetch(`${hostingUrl}${HOSTING_API.MATRIX_STORE_INVITE}`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ spaceId, userPeerID }),
  });
  await handleResponse<unknown>(response);
}

/**
 * 从店铺空间踢出用户
 */
export async function kickFromStoreSpace(
  spaceId: string,
  userPeerID: string,
  reason?: string
): Promise<void> {
  const hostingUrl = getHostingUrl();
  const response = await fetch(`${hostingUrl}${HOSTING_API.MATRIX_STORE_KICK}`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ spaceId, userPeerID, reason }),
  });
  await handleResponse<unknown>(response);
}
