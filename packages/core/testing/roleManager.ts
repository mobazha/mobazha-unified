/**
 * 测试角色管理器
 * 用于在端到端测试中切换不同的用户角色
 */

import { TEST_ACCOUNTS, type TestRole } from '../config/testAccounts';
import { saveToken, clearAuth } from '../services/auth';
import { basicAuthService } from '../services/auth/basicAuth';
import { profileApi } from '../services/api';
import type { UserProfile } from '../types';

interface RoleSession {
  role: TestRole;
  token: string;
  profile: UserProfile | null;
  loginTime: number;
}

// 当前角色会话
let currentSession: RoleSession | null = null;

// 角色会话缓存（避免重复登录）
const sessionCache = new Map<TestRole, RoleSession>();

/**
 * 获取当前角色
 */
export function getCurrentRole(): TestRole | null {
  return currentSession?.role ?? null;
}

/**
 * 获取当前会话
 */
export function getCurrentSession(): RoleSession | null {
  return currentSession;
}

/**
 * 切换到指定角色
 * @param role - 目标角色
 * @param forceLogin - 是否强制重新登录（忽略缓存）
 */
export async function switchRole(role: TestRole, forceLogin = false): Promise<UserProfile | null> {
  // 如果已经是该角色且不强制登录，直接返回
  if (currentSession?.role === role && !forceLogin) {
    console.log(`✅ Already logged in as ${role}`);
    return currentSession.profile;
  }

  // 检查缓存
  if (!forceLogin && sessionCache.has(role)) {
    const cached = sessionCache.get(role)!;
    // 检查缓存是否过期（1小时）
    if (Date.now() - cached.loginTime < 3600000) {
      currentSession = cached;
      saveToken(cached.token);
      console.log(`✅ Restored session for ${role} from cache`);
      return cached.profile;
    }
    // 缓存过期，删除
    sessionCache.delete(role);
  }

  // 执行登录（使用 Basic Auth）
  const account = TEST_ACCOUNTS[role];
  console.log(`🔄 Switching to ${role}: ${account.username}`);

  try {
    const result = await basicAuthService.login({
      username: account.username,
      password: account.password,
    });

    if (!result.success || !result.token) {
      console.error(`❌ Failed to login as ${role}: ${result.error}`);
      return null;
    }

    // 保存 Token
    saveToken(result.token);

    // 获取用户资料
    let profile: UserProfile | null = null;
    try {
      profile = await profileApi.getMyProfile();
    } catch {
      console.warn(`⚠️ Failed to fetch profile for ${role}, continuing anyway`);
    }

    // 创建会话
    const session: RoleSession = {
      role,
      token: result.token,
      profile,
      loginTime: Date.now(),
    };

    // 更新当前会话和缓存
    currentSession = session;
    sessionCache.set(role, session);

    console.log(`✅ Logged in as ${role}: ${account.username}`);
    if (profile) {
      console.log(`   PeerID: ${profile.peerID}`);
    }

    return profile;
  } catch (error) {
    console.error(`❌ Error switching to ${role}:`, error);
    return null;
  }
}

/**
 * 登出当前角色
 */
export function logoutCurrentRole(): void {
  if (currentSession) {
    console.log(`👋 Logging out ${currentSession.role}`);
  }
  clearAuth();
  currentSession = null;
}

/**
 * 清除所有角色缓存
 */
export function clearRoleCache(): void {
  sessionCache.clear();
  currentSession = null;
  clearAuth();
  console.log('🧹 Cleared all role sessions');
}

/**
 * 以指定角色执行操作
 * 执行完后恢复原角色
 */
export async function asRole<T>(role: TestRole, action: () => Promise<T>): Promise<T> {
  const previousRole = currentSession?.role;

  await switchRole(role);

  try {
    return await action();
  } finally {
    // 恢复原角色
    if (previousRole && previousRole !== role) {
      await switchRole(previousRole);
    }
  }
}

/**
 * 批量执行多角色操作
 */
export async function withRoles<T>(
  actions: Array<{ role: TestRole; action: () => Promise<T> }>
): Promise<T[]> {
  const results: T[] = [];

  for (const { role, action } of actions) {
    await switchRole(role);
    const result = await action();
    results.push(result);
  }

  return results;
}
