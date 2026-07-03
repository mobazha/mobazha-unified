/**
 * WebSocket 服务
 * 连接后端并接收实时消息
 */

/// <reference lib="dom" />

import { getEnvConfig, isSovereignMode, isStandaloneMode } from '../../config/env';
import { getStoredToken } from '../auth/token';

// WebSocket 类型（兼容浏览器和 Node.js）
type WebSocketImpl = globalThis.WebSocket;

export type WebSocketStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp?: number;
}

export interface WebSocketConfig {
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
}

type MessageHandler = (message: WebSocketMessage) => void;
type StatusHandler = (status: WebSocketStatus) => void;

const DEFAULT_CONFIG: Required<WebSocketConfig> = {
  reconnectDelay: 2000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
  connectionTimeout: 15000,
};

const WEBSOCKET_AUTH_PROTOCOL = 'mbz.auth.v1';
const WEBSOCKET_AUTH_TOKEN_PROTOCOL_PREFIX = 'mbz.auth.b64.';

function encodeWebSocketTokenProtocol(token: string): string {
  const bytes = new TextEncoder().encode(token);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Direct mobazha node connections (standalone/sovereign seller, local dev)
 * authenticate via ?token= because Basic Auth uses ?token=basic:... and the
 * node historically did not read Sec-WebSocket-Protocol. SaaS hosting resolves
 * auth from the protocol header instead.
 */
export function shouldUseQueryTokenWebSocketAuth(wsUrl: string, token: string): boolean {
  if (token.startsWith('basic:')) {
    return true;
  }

  if (isStandaloneMode() || isSovereignMode()) {
    try {
      const url = new URL(wsUrl, window.location.origin);
      // /buyer-api/ws proxies to SaaS hosting — protocol auth is preferred there.
      if (url.pathname.includes('/buyer-api/')) {
        return false;
      }
    } catch {
      if (!wsUrl.includes('buyer-api')) {
        return true;
      }
    }
    return true;
  }

  if (typeof window !== 'undefined') {
    try {
      const ws = new URL(wsUrl.replace(/^ws(s)?:/, 'http$1:'));
      const pageHost = window.location.hostname;
      if (
        (ws.hostname === 'localhost' || ws.hostname === '127.0.0.1') &&
        (pageHost === 'localhost' || pageHost === '127.0.0.1') &&
        ws.port &&
        window.location.port &&
        ws.port !== window.location.port
      ) {
        return true;
      }
    } catch {
      // fall through to protocol auth
    }
  }

  return false;
}

export function appendWebSocketTokenQuery(wsUrl: string, token: string): string {
  const separator = wsUrl.includes('?') ? '&' : '?';
  return `${wsUrl}${separator}token=${encodeURIComponent(token)}`;
}

function resolveWebSocketConnection(
  wsUrl: string,
  token: string
): { url: string; protocols?: string[] } {
  if (shouldUseQueryTokenWebSocketAuth(wsUrl, token)) {
    return { url: appendWebSocketTokenQuery(wsUrl, token) };
  }
  return { url: wsUrl, protocols: getWebSocketProtocols(token) };
}

function getWebSocketProtocols(token: string): string[] {
  return [
    WEBSOCKET_AUTH_PROTOCOL,
    `${WEBSOCKET_AUTH_TOKEN_PROTOCOL_PREFIX}${encodeWebSocketTokenProtocol(token)}`,
  ];
}

class WebSocketService {
  private socket: WebSocketImpl | null = null;
  private status: WebSocketStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private connectionTimer: ReturnType<typeof setTimeout> | null = null;
  private config: Required<WebSocketConfig>;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private lastMessageTime = 0;
  private wsUrlOverride: string | null = null;

  constructor(config: WebSocketConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Override the WebSocket base URL. Used by standalone buyers to route
   * through /buyer-api/ws to the SaaS platform instead of the local node.
   * Pass null to reset to the default env-based URL.
   */
  setBaseUrl(url: string | null): void {
    this.wsUrlOverride = url;
  }

  /**
   * 获取 WebSocket URL
   */
  private getWebSocketUrl(): string {
    return this.wsUrlOverride ?? getEnvConfig().api.websocket;
  }

  /**
   * 获取当前状态
   */
  getStatus(): WebSocketStatus {
    return this.status;
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    // WebSocket.OPEN = 1
    return this.status === 'connected' && this.socket?.readyState === 1;
  }

  /**
   * 连接 WebSocket
   */
  async connect(): Promise<boolean> {
    // 检查是否有 token
    const token = getStoredToken();
    if (!token) {
      console.warn('⚠️ No token available, WebSocket connection requires authentication');
      return false;
    }

    // 如果已连接，直接返回
    if (this.isConnected()) {
      console.log('✅ WebSocket already connected');
      return true;
    }

    return new Promise(resolve => {
      try {
        this.setStatus('connecting');
        const { url: wsUrl, protocols } = resolveWebSocketConnection(this.getWebSocketUrl(), token);

        console.log('🔌 Connecting WebSocket:', wsUrl);

        this.socket =
          protocols != null
            ? new globalThis.WebSocket(wsUrl, protocols)
            : new globalThis.WebSocket(wsUrl);

        // 连接超时
        this.connectionTimer = setTimeout(() => {
          console.error('❌ WebSocket connection timeout');
          this.socket?.close();
          this.setStatus('error');
          resolve(false);
        }, this.config.connectionTimeout);

        this.socket.onopen = () => {
          this.clearConnectionTimer();
          console.log('✅ WebSocket connected');
          this.setStatus('connected');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve(true);
        };

        this.socket.onclose = event => {
          this.clearConnectionTimer();
          console.log(`🔴 WebSocket closed: code=${event.code}, reason=${event.reason || 'none'}`);
          this.stopHeartbeat();

          if (this.status !== 'disconnected') {
            this.setStatus('disconnected');
            this.scheduleReconnect();
          }
        };

        this.socket.onerror = error => {
          this.clearConnectionTimer();
          console.error('❌ WebSocket error:', error);
          this.setStatus('error');
        };

        this.socket.onmessage = event => {
          this.lastMessageTime = Date.now();
          this.handleMessage(event.data);
        };
      } catch (error) {
        console.error('❌ WebSocket connect error:', error);
        this.setStatus('error');
        resolve(false);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    console.log('👋 Disconnecting WebSocket');
    this.setStatus('disconnected');
    this.stopHeartbeat();
    this.clearReconnectTimer();
    this.clearConnectionTimer();

    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }
  }

  /**
   * 发送消息
   */
  send(message: WebSocketMessage): boolean {
    if (!this.isConnected()) {
      console.warn('⚠️ Cannot send message: WebSocket not connected');
      return false;
    }

    try {
      this.socket!.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      return false;
    }
  }

  /**
   * 订阅消息
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * 订阅状态变化
   */
  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  private setStatus(status: WebSocketStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.statusHandlers.forEach(handler => handler(status));
    }
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as WebSocketMessage;
      this.messageHandlers.forEach(handler => handler(message));
    } catch (error) {
      console.warn('⚠️ Failed to parse WebSocket message:', error);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.lastMessageTime = Date.now();

    this.heartbeatTimer = setInterval(() => {
      // 如果超过心跳间隔没有收到消息，发送 ping
      const now = Date.now();
      if (now - this.lastMessageTime > this.config.heartbeatInterval) {
        if (this.isConnected()) {
          this.send({ type: 'ping', data: null });
        }
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.log('❌ Max reconnect attempts reached');
      return;
    }

    // 检查是否有 token（用户可能已登出）
    if (!getStoredToken()) {
      console.log('⚠️ No token, skipping reconnect');
      return;
    }

    this.clearReconnectTimer();
    this.reconnectAttempts++;

    // 指数退避
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );

    console.log(
      `🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`
    );
    this.setStatus('reconnecting');

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearConnectionTimer(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }
}

// 单例实例
let wsService: WebSocketService | null = null;

/**
 * 获取 WebSocket 服务实例
 */
export function getWebSocketService(config?: WebSocketConfig): WebSocketService {
  if (!wsService) {
    wsService = new WebSocketService(config);
  }
  return wsService;
}

/**
 * 连接 WebSocket（便捷方法）
 */
export async function connectWebSocket(): Promise<boolean> {
  return getWebSocketService().connect();
}

/**
 * 断开 WebSocket（便捷方法）
 */
export function disconnectWebSocket(): void {
  wsService?.disconnect();
}

/**
 * Override the WebSocket base URL (convenience wrapper).
 * Standalone buyers use this to route through /buyer-api/ws to SaaS.
 * Pass null to reset to the default URL.
 */
export function setWebSocketBaseUrl(url: string | null): void {
  getWebSocketService().setBaseUrl(url);
}

/**
 * 订阅 WebSocket 消息（便捷方法）
 */
export function onWebSocketMessage(handler: MessageHandler): () => void {
  return getWebSocketService().onMessage(handler);
}

/**
 * 订阅 WebSocket 状态变化（便捷方法）
 */
export function onWebSocketStatusChange(handler: StatusHandler): () => void {
  return getWebSocketService().onStatusChange(handler);
}

export { WebSocketService };
export default getWebSocketService;
