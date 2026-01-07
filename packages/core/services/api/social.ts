/**
 * 社交 API 服务
 *
 * Follow/Unfollow、粉丝/关注列表
 */

import { get, post, safeRequest } from './client';
import { getGatewayUrl, getAuthHeaders, getHeadersWithContext } from './config';
import { withMockFallback } from './mode';
import { mockUsers } from '../mock/data';

/**
 * 关注用户
 */
export async function followUser(
  peerID: string,
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const url = `${getGatewayUrl()}/ob/follow/${peerID}`;
  return post(url, {}, getAuthHeaders(username, password));
}

/**
 * 取消关注用户
 */
export async function unfollowUser(
  peerID: string,
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const url = `${getGatewayUrl()}/ob/unfollow/${peerID}`;
  return post(url, {}, getAuthHeaders(username, password));
}

/**
 * 获取粉丝列表
 */
export async function getFollowers(
  peerID?: string,
  username?: string,
  password?: string
): Promise<string[]> {
  const realFn = async () => {
    const timestamp = Date.now();
    const url = peerID
      ? `${getGatewayUrl()}/ob/followers/${peerID}?usecache=true&${timestamp}`
      : `${getGatewayUrl()}/ob/followers`;
    return safeRequest<string[]>(url, { headers: getHeadersWithContext(username, password) }, []);
  };

  const mockFn = async () => {
    // Mock: 返回一些模拟的 peerID
    return mockUsers.map(u => u.peerID);
  };

  return withMockFallback(realFn, mockFn, `/ob/followers/${peerID || 'self'}`);
}

/**
 * 获取关注列表
 */
export async function getFollowing(
  peerID?: string,
  username?: string,
  password?: string
): Promise<string[]> {
  const realFn = async () => {
    const timestamp = Date.now();
    const url = peerID
      ? `${getGatewayUrl()}/ob/following/${peerID}?usecache=true&${timestamp}`
      : `${getGatewayUrl()}/ob/following`;
    return safeRequest<string[]>(url, { headers: getHeadersWithContext(username, password) }, []);
  };

  const mockFn = async () => {
    // Mock: 返回一些模拟的 peerID
    return mockUsers.slice(0, 2).map(u => u.peerID);
  };

  return withMockFallback(realFn, mockFn, `/ob/following/${peerID || 'self'}`);
}

/**
 * 检查用户是否关注我
 */
export async function isFollowingMe(
  peerID: string,
  username?: string,
  password?: string
): Promise<boolean> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/ob/followsme/${peerID}`;
    const result = await get<{ followsMe: boolean }>(url, getAuthHeaders(username, password));
    return result.followsMe;
  };

  const mockFn = async () => {
    // Mock: 随机返回
    return Math.random() > 0.5;
  };

  return withMockFallback(realFn, mockFn, `/ob/followsme/${peerID}`);
}

/**
 * 检查是否已关注用户
 */
export async function isFollowing(
  peerID: string,
  username?: string,
  password?: string
): Promise<boolean> {
  const following = await getFollowing(undefined, username, password);
  return following.includes(peerID);
}

/**
 * 批量获取用户资料
 */
export async function fetchProfiles(
  peerIDs: string[],
  username?: string,
  password?: string
): Promise<
  Array<{
    peerID: string;
    name: string;
    avatarHashes?: { medium?: string };
    shortDescription?: string;
  }>
> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/ob/fetchprofiles`;
    return post<Array<{
      peerID: string;
      name: string;
      avatarHashes?: { medium?: string };
      shortDescription?: string;
    }>>(url, peerIDs, getAuthHeaders(username, password));
  };

  const mockFn = async () => {
    // Mock: 返回模拟的用户资料
    return peerIDs.map(peerID => {
      const user = mockUsers.find(u => u.peerID === peerID);
      return (
        user || {
          peerID,
          name: `User ${peerID.slice(-6)}`,
          shortDescription: 'Mock user profile',
        }
      );
    });
  };

  return withMockFallback(realFn, mockFn, '/ob/fetchprofiles');
}

