/**
 * Outpost stub — Matrix client stripped at build time.
 * Provides a no-op MatrixClientService matching the public API.
 */

import type { InvitePolicy, ChatStatusResponse } from './types';

class MatrixClientServiceStub {
  async initializeWithPeerID(_peerID: string): Promise<boolean> {
    return false;
  }
  async logout(): Promise<void> {}
  isInitialized(): boolean {
    return false;
  }
  isConnected(): boolean {
    return false;
  }
  getUserId(): string | null {
    return null;
  }
  getServerName(): string | null {
    return null;
  }
  isVerificationAvailable(): boolean {
    return false;
  }
  getVerificationUnavailableReason(): string | null {
    return 'Outpost mode';
  }
  async getStatus(): Promise<ChatStatusResponse | null> {
    return null;
  }
  async getRooms(): Promise<never[]> {
    return [];
  }
  async getInvites(): Promise<never[]> {
    return [];
  }
  async startSync(): Promise<void> {}
  stopSync(): void {}
  async sendMessage(_roomId: string, _content: string): Promise<void> {}
  async sendTyping(_roomId: string, _isTyping: boolean): Promise<void> {}
  async markAsRead(_roomId: string): Promise<void> {}
  async startDirectChat(_peerID: string): Promise<string> {
    return '';
  }
  async joinRoom(_roomId: string): Promise<void> {}
  async leaveRoom(_roomId: string): Promise<void> {}
  async blockUser(_userId: string): Promise<void> {}
  async unblockUser(_userId: string): Promise<void> {}
  async getBlockedUsers(): Promise<never[]> {
    return [];
  }
  async getRoomMessages(_roomId: string): Promise<never[]> {
    return [];
  }
  async syncProfileToMatrix(_displayName: string, _avatarCid?: string | null): Promise<void> {}
  async getInvitePolicy(): Promise<InvitePolicy> {
    return 'auto_mobazha';
  }
  async setInvitePolicy(_policy: InvitePolicy): Promise<void> {}
  async requestVerification(_userId: string): Promise<string> {
    return '';
  }
  async acceptVerification(_transactionId: string): Promise<void> {}
  async confirmSASMatch(_transactionId: string): Promise<void> {}
  async cancelVerification(_transactionId: string): Promise<void> {}
  async getVerificationStatus(_userId: string): Promise<{ isVerified: boolean }> {
    return { isVerified: false };
  }
  async deleteChatHistory(): Promise<void> {}
}

export const matrixClient = new MatrixClientServiceStub();
