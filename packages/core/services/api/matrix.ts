/**
 * Matrix API 服务层
 * 与 Hosting 后端交互获取 Matrix 配置和凭据
 */

import { getHostingUrl, getGatewayUrl, getAuthHeaders } from './config';

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
 * 通用错误处理
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || error.message || error.reason || 'Request failed');
  }
  return response.json();
}

/**
 * 获取 Matrix 服务器配置
 * @returns Matrix 配置 { enabled, homeserverURL, serverName, presenceEnabled }
 */
export async function getMatrixConfig(): Promise<MatrixServerConfig> {
  const hostingUrl = getHostingUrl();
  const response = await fetch(`${hostingUrl}/api/matrix/config`, {
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
    const gatewayUrl = getGatewayUrl();
    const response = await fetch(`${gatewayUrl}/matrix/credentials`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      return null;
    }
    return response.json();
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
    const gatewayUrl = getGatewayUrl();
    const response = await fetch(`${gatewayUrl}/matrix/credentials`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ matrixUserId, serverName }),
    });
    if (!response.ok) {
      throw new Error(`Failed to save credentials: ${response.status}`);
    }
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
    const gatewayUrl = getGatewayUrl();
    const response = await fetch(`${gatewayUrl}/matrix/password`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
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

  const response = await fetch(`${hostingUrl}/api/matrix/auto-register`, {
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

  const response = await fetch(`${hostingUrl}/api/matrix/sync-profile`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Failed to sync profile');
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
  const response = await fetch(`${hostingUrl}/api/matrix/store/create-space`, {
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
  const response = await fetch(`${hostingUrl}/api/matrix/store/invite`, {
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
  const response = await fetch(`${hostingUrl}/api/matrix/store/kick`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ spaceId, userPeerID, reason }),
  });
  await handleResponse<unknown>(response);
}
