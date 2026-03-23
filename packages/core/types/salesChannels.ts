/**
 * Sales Channels Types
 *
 * Types for Store Links and Store Bots (Telegram Bot binding).
 * Maps to backend responses from /platform/v1/store-links and /platform/v1/store-bots.
 */

export interface StoreLinkInfo {
  shortCode: string;
  telegramLink?: string;
  directLink?: string;
  deepLink?: string;
}

export interface StoreBotInfo {
  botID: number;
  botUsername: string;
  isActive: boolean;
  directLink: string;
}

export interface BindStoreBotRequest {
  peerID: string;
  botToken: string;
}
