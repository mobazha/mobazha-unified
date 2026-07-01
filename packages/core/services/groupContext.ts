/**
 * Group Context Service
 * 群组上下文管理服务
 *
 * 用于检测、保存和管理群组集市的上下文信息
 * 支持 Telegram Mini App、Deep Link 等多种入口方式
 */

import type { GroupContext, GroupPlatform } from '../types/access';
import { getEnvConfig } from '../config/env';

// 调试日志（仅在开发环境输出）
const debug = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[GroupContext]', ...args);
  }
};

// 存储 key
const GROUP_CONTEXT_KEY = 'current_group_context';
const USER_PEER_ID_KEY = 'user_peer_id';

// 当前用户的 peerID（内存缓存）
let currentUserPeerID: string | null = null;

/**
 * 检测当前群组上下文
 * 支持多种检测方式：
 * 1. Telegram Mini App (WebApp API)
 * 2. URL 参数 (?group=xxx)
 * 3. start_param (Telegram Bot Link)
 *
 * @returns 群组上下文，如果不在群组环境则返回 null
 */
export async function detectGroupContext(): Promise<GroupContext | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // 方法1: Telegram WebApp API
    const telegramWebApp = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } })
      .Telegram?.WebApp;

    if (telegramWebApp) {
      const initData = telegramWebApp.initDataUnsafe;

      // 从 start_param 检测群组 ID
      // 格式: start_param=group_-123456789
      const startParam = initData?.start_param;
      if (startParam && startParam.startsWith('group_')) {
        const chatId = startParam.replace('group_', '');
        return {
          platform: 'telegram',
          chatId,
          needsVerification: true,
        };
      }

      // 从 chat 对象检测（群组内直接打开时）
      const chat = initData?.chat;
      if (chat && chat.id) {
        return {
          platform: 'telegram',
          chatId: String(chat.id),
          chatType: chat.type,
          chatTitle: chat.title,
          chatUsername: chat.username,
          needsVerification: false, // 直接从 WebApp 获取的不需要额外验证
        };
      }
    }

    // 方法2: URL 参数
    const urlParams = new URLSearchParams(window.location.search);
    const groupParam = urlParams.get('group');
    const platformParam = (urlParams.get('platform') as GroupPlatform) || 'telegram';

    if (groupParam) {
      return {
        platform: platformParam,
        chatId: groupParam,
        needsVerification: true,
      };
    }

    // 方法3: 从本地存储恢复
    const savedContext = localStorage.getItem(GROUP_CONTEXT_KEY);
    if (savedContext) {
      return JSON.parse(savedContext) as GroupContext;
    }

    return null;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[GroupContext] Detection error:', error);
    }
    return null;
  }
}

/**
 * 保存群组上下文到本地存储
 */
export async function saveGroupContext(context: GroupContext): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(GROUP_CONTEXT_KEY, JSON.stringify(context));
    debug('Saved:', context.platform, context.chatId);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[GroupContext] Save error:', error);
    }
  }
}

/**
 * 获取当前保存的群组上下文
 */
export function getCurrentGroupContext(): GroupContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const jsonValue = localStorage.getItem(GROUP_CONTEXT_KEY);
    return jsonValue ? (JSON.parse(jsonValue) as GroupContext) : null;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[GroupContext] Get error:', error);
    }
    return null;
  }
}

/**
 * 同步获取群组上下文（用于同步代码）
 */
export function getCurrentGroupContextSync(): GroupContext | null {
  return getCurrentGroupContext();
}

/**
 * 清除群组上下文
 */
export function clearGroupContext(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(GROUP_CONTEXT_KEY);
    debug('Cleared');
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[GroupContext] Clear error:', error);
    }
  }
}

/**
 * 设置当前用户的 peerID
 */
export function setUserPeerID(peerID: string): void {
  currentUserPeerID = peerID;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(USER_PEER_ID_KEY, peerID);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[GroupContext] Set peerID error:', error);
      }
    }
  }
}

/**
 * 获取当前用户的 peerID
 */
export function getUserPeerID(): string | null {
  if (currentUserPeerID) {
    return currentUserPeerID;
  }

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(USER_PEER_ID_KEY);
      if (saved) {
        currentUserPeerID = saved;
        return saved;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * 生成包含群组上下文的 HTTP headers
 * 用于 API 请求时自动携带群组信息
 */
export function getGroupHeaders(context?: GroupContext | null): Record<string, string> {
  const headers: Record<string, string> = {};

  const ctx = context || getCurrentGroupContext();
  if (ctx) {
    if (ctx.platform) {
      headers['X-Group-Platform'] = ctx.platform;
    }
    if (ctx.chatId) {
      headers['X-Group-ChatID'] = ctx.chatId;
    }
  }

  const peerID = getUserPeerID();
  if (peerID) {
    headers['X-Requestor-PeerID'] = peerID;
  }

  return headers;
}

/**
 * 从 Deep Link 参数设置群组上下文
 * 用于移动端从 Deep Link 入口进入
 */
export async function setGroupContextFromDeepLink(params: {
  platform?: string;
  chatId?: string;
  chatTitle?: string;
}): Promise<void> {
  if (!params.chatId) {
    return;
  }

  const context: GroupContext = {
    platform: (params.platform as GroupPlatform) || 'telegram',
    chatId: params.chatId,
    chatTitle: params.chatTitle,
    needsVerification: true,
  };

  await saveGroupContext(context);
}

/**
 * 验证群组成员资格
 * 通过服务端 API 验证用户是否是指定群组的成员
 */
export async function verifyGroupMembership(
  platform: string,
  chatId: string
): Promise<{ verified: boolean; chatTitle?: string }> {
  try {
    const baseUrl = getEnvConfig().api.baseUrl;
    const response = await fetch(
      `${baseUrl}/api/v1/group-marketplace/${platform}/${chatId}/verify-member`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getGroupHeaders(),
        },
      }
    );

    if (!response.ok) {
      return { verified: false };
    }

    const data = await response.json();
    return {
      verified: data.isMember || false,
      chatTitle: data.chatTitle,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[GroupContext] Verify error:', error);
    }
    return { verified: false };
  }
}

/**
 * 初始化群组集市
 * 完整的初始化流程：检测 → 保存 → 注册 → 验证
 */
export async function initializeGroupMarketplace(): Promise<GroupContext | null> {
  try {
    // 1. 检测群组上下文
    const context = await detectGroupContext();

    if (!context) {
      debug('Not in group context');
      return null;
    }

    // 2. 保存群组上下文
    await saveGroupContext(context);

    // 3. 如果需要验证，进行服务端验证
    if (context.needsVerification) {
      const result = await verifyGroupMembership(context.platform, context.chatId);
      if (!result.verified) {
        debug('Membership verification failed');
        clearGroupContext();
        return null;
      }

      // 更新群组标题（如果有）
      if (result.chatTitle) {
        context.chatTitle = result.chatTitle;
        context.needsVerification = false;
        await saveGroupContext(context);
      }
    }

    // 4. 注册群组集市
    await registerGroupMarketplace(context);

    debug('Initialized:', context.platform, context.chatId);
    return context;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[GroupContext] Initialize error:', error);
    }
    return null;
  }
}

/**
 * 注册群组集市到服务端
 */
async function registerGroupMarketplace(context: GroupContext): Promise<boolean> {
  try {
    const baseUrl = getEnvConfig().api.baseUrl;
    const response = await fetch(`${baseUrl}/api/v1/group-marketplace/${context.platform}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getGroupHeaders(context),
      },
      body: JSON.stringify({
        chatID: context.chatId,
        chatType: context.chatType,
        chatTitle: context.chatTitle,
        chatUsername: context.chatUsername || '',
      }),
    });

    if (!response.ok) {
      if (process.env.NODE_ENV !== 'production') {
        const error = await response.text();
        console.error('[GroupContext] Register failed:', error);
      }
      return false;
    }

    debug('Registered:', context.chatTitle || context.chatId);
    return true;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[GroupContext] Register error:', error);
    }
    return false;
  }
}

// Telegram WebApp 类型定义
interface TelegramWebApp {
  initDataUnsafe?: {
    start_param?: string;
    chat?: {
      id: number;
      type: string;
      title?: string;
      username?: string;
    };
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
  };
}

// 导出服务对象
export const groupContextService = {
  detectGroupContext,
  saveGroupContext,
  getCurrentGroupContext,
  getCurrentGroupContextSync,
  clearGroupContext,
  setUserPeerID,
  getUserPeerID,
  getGroupHeaders,
  setGroupContextFromDeepLink,
  verifyGroupMembership,
  initializeGroupMarketplace,
};

export default groupContextService;
