/**
 * Matrix 客户端服务 — Facade（v1.2 REST + WS 实现）
 *
 * 所有 Matrix 协议交互由后端 mautrix-go 处理。
 * 前端通过 REST API 操作，通过 WebSocket 接收实时事件。
 * E2EE 由后端透明处理，前端始终收发明文。
 *
 * 公共方法签名与 v1.1 保持一致，UI 组件无需改动。
 */

import type { MatrixRoom, MatrixMessage, InvitePolicy, ChatStatusResponse } from './types';
import { MATRIX_EVENTS } from './types';
import { matrixEvents } from './events';
import { NODE_API } from '../../config/apiPaths';
import { authGet, authPost, authDel } from '../api/helpers';

import * as msgModule from './messages';
import * as roomModule from './rooms';
import * as verificationModule from './verification';
import { setupChatEventListeners } from './event-listeners';

function looksLikePeerID(value?: string): boolean {
  if (!value) return false;
  const v = value.trim();
  if (!v) return false;
  return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|12D3Koo[1-9A-HJ-NP-Za-km-z]{20,})$/.test(v);
}

class MatrixClientService {
  private _isInitialized = false;
  private _isConnected = false;
  private _currentPeerID: string | null = null;
  private _userId: string | null = null;
  private _serverName: string | null = null;
  private _invitePolicy: InvitePolicy = 'auto_mobazha';
  private _initPromise: Promise<boolean> | null = null;
  private _wsCleanup: (() => void) | null = null;
  private _processedMessageIds = new Set<string>();

  // ============= Init & Auth =============

  async initializeWithPeerID(peerID: string): Promise<boolean> {
    if (this._initPromise) return this._initPromise;
    if (this._isInitialized && this._currentPeerID === peerID) return true;
    if (this._isInitialized && this._currentPeerID !== peerID) {
      await this.logout();
    }
    if (!this._isInitialized && this._currentPeerID === peerID) {
      // Previous init returned false (backend not ready); allow re-attempt
    }
    this._initPromise = this._doInit(peerID);
    try {
      return await this._initPromise;
    } finally {
      this._initPromise = null;
    }
  }

  private async _doInit(peerID: string): Promise<boolean> {
    try {
      const status = await authGet<ChatStatusResponse>(NODE_API.CHAT_STATUS);
      if (!status?.connected && !status?.syncRunning) {
        console.warn('[Chat] Backend chat service not ready');
        this._currentPeerID = peerID;
        this._isInitialized = false;
        return false;
      }

      this._currentPeerID = peerID;
      this._userId = status?.userId || null;
      this._serverName = status?.serverName || null;
      this._isInitialized = true;
      this._invitePolicy = await roomModule.loadInvitePolicy();

      return true;
    } catch (error: unknown) {
      const isRateLimited =
        error instanceof Error &&
        (error.message.includes('429') || error.message.includes('RATE_LIMITED'));
      if (isRateLimited) {
        console.warn('[Chat] Rate limited during init, will retry later');
      } else {
        console.error('[Chat] Initialization failed:', error);
      }
      matrixEvents.emit(MATRIX_EVENTS.ERROR, { error });
      return false;
    }
  }

  /**
   * @deprecated Use initializeWithPeerID instead.
   * Kept for backward compatibility during migration.
   */
  async initialize(_config?: unknown): Promise<boolean> {
    if (this._isInitialized) return true;
    console.warn('[Chat] initialize() is deprecated, use initializeWithPeerID()');
    return false;
  }

  /**
   * @deprecated Login is handled by the backend node.
   */
  async login(_username: string, _password: string): Promise<boolean> {
    console.warn('[Chat] login() is deprecated, backend handles authentication');
    return false;
  }

  async logout(clearDevice = false): Promise<void> {
    void clearDevice;
    await this.stopSync();
    this._isInitialized = false;
    this._isConnected = false;
    this._currentPeerID = null;
    this._userId = null;
    this._serverName = null;
    this._processedMessageIds.clear();
    msgModule.resetPaginationState();
    matrixEvents.emit(MATRIX_EVENTS.DISCONNECTED);
  }

  // ============= Sync lifecycle =============

  async startSync(): Promise<void> {
    if (!this._isInitialized) throw new Error('Not initialized');

    this._wsCleanup = setupChatEventListeners({
      processedMessageIds: this._processedMessageIds,
      onSyncStateChange: connected => {
        this._isConnected = connected;
      },
    });

    this._isConnected = true;
    matrixEvents.emit(MATRIX_EVENTS.CONNECTED);
  }

  async stopSync(): Promise<void> {
    if (this._wsCleanup) {
      this._wsCleanup();
      this._wsCleanup = null;
    }
    this._isConnected = false;
    matrixEvents.emit(MATRIX_EVENTS.DISCONNECTED);
  }

  // ============= Status getters =============

  isClientConnected(): boolean {
    return this._isConnected;
  }

  getUserId(): string | null {
    return this._userId;
  }

  getDeviceId(): string | null {
    return null;
  }

  // ============= Messages (delegated) =============

  async getMessages(roomId: string, limit = 50): Promise<MatrixMessage[]> {
    return msgModule.getMessages(roomId, limit, this._processedMessageIds);
  }

  async loadOlderMessages(roomId: string, limit = 50): Promise<MatrixMessage[]> {
    return msgModule.loadOlderMessages(roomId, limit, this._processedMessageIds);
  }

  async sendMessage(roomId: string, content: string): Promise<MatrixMessage | null> {
    const result = await msgModule.sendMessage(roomId, content, this._userId);
    if (result?.id) this._processedMessageIds.add(result.id);
    return result;
  }

  async sendImage(
    roomId: string,
    file: File,
    externalLocalId?: string
  ): Promise<MatrixMessage | null> {
    const result = await msgModule.sendImage(roomId, file, this._userId, externalLocalId);
    if (result?.id) this._processedMessageIds.add(result.id);
    return result;
  }

  async sendFile(
    roomId: string,
    file: File,
    externalLocalId?: string
  ): Promise<MatrixMessage | null> {
    const result = await msgModule.sendFile(roomId, file, this._userId, externalLocalId);
    if (result?.id) this._processedMessageIds.add(result.id);
    return result;
  }

  async sendTyping(roomId: string, isTyping: boolean, _timeout = 5000): Promise<void> {
    return msgModule.sendTyping(roomId, isTyping);
  }

  async markRoomAsRead(roomId: string, eventId?: string): Promise<boolean> {
    return msgModule.markRoomAsRead(roomId, eventId);
  }

  async getReadReceiptForRoom(_roomId: string): Promise<Record<string, string>> {
    return {};
  }

  async redactEvent(roomId: string, eventId: string, _reason?: string): Promise<void> {
    return msgModule.redactEvent(roomId, eventId);
  }

  async editMessage(roomId: string, originalEventId: string, newContent: string): Promise<void> {
    return msgModule.editMessage(roomId, originalEventId, newContent);
  }

  async sendReaction(roomId: string, eventId: string, emoji: string): Promise<void> {
    return msgModule.sendReaction(roomId, eventId, emoji);
  }

  mxcToHttp(mxcUrl: string | null | undefined, _width = 48, _height = 48): string | undefined {
    return msgModule.mxcToHttp(mxcUrl);
  }

  async downloadAuthenticatedImage(url: string): Promise<string | null> {
    return msgModule.downloadAuthenticatedImage(url);
  }

  // ============= Rooms (delegated) =============

  /**
   * Pre-seed processedMessageIds with known event IDs from rooms loaded via
   * REST, so that duplicate WS events arriving after initialization won't
   * cause double-counting of unread messages.
   */
  seedProcessedIds(rooms: Array<{ lastMessage?: { id?: string } | null }>): void {
    for (const room of rooms) {
      if (room.lastMessage?.id) {
        this._processedMessageIds.add(room.lastMessage.id);
      }
    }
  }

  async getRooms(): Promise<MatrixRoom[]> {
    return roomModule.getRooms(this._userId);
  }

  async getRoomsByType(
    type: 'direct' | 'group' | 'order' | 'store' | 'moderator'
  ): Promise<MatrixRoom[]> {
    return roomModule.getRoomsByType(type);
  }

  async getOrCreateDirectRoom(peerID: string, displayName?: string): Promise<string | null> {
    return roomModule.getOrCreateDirectRoom(peerID, this._serverName, displayName);
  }

  async createDirectRoom(userId: string, displayNameOrPeerID?: string): Promise<string | null> {
    const userIdOrPeerID = userId?.trim();
    if (looksLikePeerID(userIdOrPeerID)) {
      return roomModule.createDirectRoom('', userIdOrPeerID);
    }

    const inferredPeerID = looksLikePeerID(displayNameOrPeerID)
      ? displayNameOrPeerID?.trim()
      : undefined;
    if (inferredPeerID) {
      return roomModule.createDirectRoom('', inferredPeerID);
    }
    return roomModule.createDirectRoom(userId);
  }

  async joinRoom(roomIdOrAlias: string): Promise<boolean> {
    return roomModule.joinRoom(roomIdOrAlias);
  }

  async leaveRoom(roomId: string): Promise<boolean> {
    return roomModule.leaveRoom(roomId);
  }

  async inviteToRoom(roomId: string, userId: string): Promise<boolean> {
    return roomModule.inviteToRoom(roomId, userId);
  }

  async kickFromRoom(roomId: string, userId: string, reason?: string): Promise<boolean> {
    return roomModule.kickFromRoom(roomId, userId, reason);
  }

  async setRoomName(roomId: string, name: string): Promise<boolean> {
    return roomModule.setRoomName(roomId, name);
  }

  async setRoomTopic(roomId: string, topic: string): Promise<boolean> {
    return roomModule.setRoomTopic(roomId, topic);
  }

  async createOrderRoom(
    orderId: string,
    participants: string[],
    orderInfo?: { title?: string; vendorId?: string; buyerId?: string }
  ): Promise<string | null> {
    return roomModule.createOrderRoom(orderId, participants, orderInfo);
  }

  async getOrderRoom(orderId: string): Promise<MatrixRoom | null> {
    return roomModule.getOrderRoom(orderId);
  }

  async createStoreRoom(
    storeId: string,
    storeInfo: { name: string; description?: string; ownerId: string }
  ): Promise<string | null> {
    return roomModule.createStoreRoom(storeId, storeInfo);
  }

  async getStoreRoom(storeId: string): Promise<MatrixRoom | null> {
    return roomModule.getStoreRoom(storeId);
  }

  async createModeratorRoom(
    orderId: string,
    moderatorId: string,
    participants: string[]
  ): Promise<string | null> {
    return roomModule.createModeratorRoom(orderId, moderatorId, participants);
  }

  async createGroupRoom(
    name: string,
    members: string[],
    options?: { topic?: string; isEncrypted?: boolean }
  ): Promise<string | null> {
    return roomModule.createGroupRoom(name, members, options);
  }

  // ============= Invite policy =============

  async setInvitePolicy(policy: InvitePolicy): Promise<void> {
    await roomModule.saveInvitePolicy(policy);
    this._invitePolicy = policy;
  }

  getInvitePolicy(): InvitePolicy {
    return this._invitePolicy;
  }

  isMobazhaUser(userId: string): boolean {
    return roomModule.isMobazhaUser(userId);
  }

  // ============= Profile =============

  async setDisplayName(displayName: string): Promise<void> {
    return roomModule.setDisplayName(displayName);
  }

  async syncProfileToMatrix(displayName: string, avatarUrl?: string): Promise<void> {
    return roomModule.syncProfileToMatrix(displayName, avatarUrl);
  }

  async setMyPeerIDInRoom(roomId: string): Promise<void> {
    return roomModule.setMyPeerIDInRoom(roomId);
  }

  // ============= Verification (backend-driven SAS via REST + WS) =============

  async setupVerificationListeners(): Promise<void> {
    await verificationModule.setupVerificationListeners();
  }
  async requestVerification(userId: string): Promise<string> {
    return verificationModule.requestVerification(userId);
  }
  async acceptVerificationRequest(txnId: string): Promise<boolean> {
    return verificationModule.acceptVerificationRequest(txnId);
  }
  async confirmVerification(txnId: string): Promise<boolean> {
    return verificationModule.confirmVerification(txnId);
  }
  async startSAS(txnId: string): Promise<void> {
    return verificationModule.startSAS(txnId);
  }
  async cancelVerification(txnId: string): Promise<boolean> {
    return verificationModule.cancelVerification(txnId);
  }
  async isUserVerified(_userId: string): Promise<boolean> {
    return true;
  }

  // ============= Block / Ignore =============

  async getIgnoredUsers(): Promise<string[]> {
    return [];
  }

  async isUserIgnored(_userId: string): Promise<boolean> {
    return false;
  }

  async blockUser(userId: string): Promise<void> {
    await authPost(NODE_API.CHAT_USER_BLOCK(userId), {});
  }

  async unblockUser(userId: string): Promise<void> {
    await authDel(NODE_API.CHAT_USER_BLOCK(userId));
  }
}

export const matrixClient = new MatrixClientService();
