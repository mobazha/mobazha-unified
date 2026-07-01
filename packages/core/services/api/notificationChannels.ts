/**
 * Notification Channels API
 *
 * CRUD operations for external notification channels (Telegram, Discord, etc.)
 * Backend: mobazha3.0/internal/api/notification_channel_handlers.go
 */

import { authGet, authPost, authPut, authDel } from './helpers';
import { NODE_API } from '../../config/apiPaths';

export interface ChannelConfig {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  event_filter: string;
  settings: Record<string, string | boolean>;
}

export interface ChannelFieldSchema {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url';
  required: boolean;
}

export interface ChannelTypeInfo {
  type: string;
  label: string;
  fields: ChannelFieldSchema[];
}

export async function getNotificationChannels(): Promise<ChannelConfig[]> {
  return authGet<ChannelConfig[]>(NODE_API.NOTIFICATION_CHANNELS);
}

export async function addNotificationChannel(
  channel: Omit<ChannelConfig, 'id'>
): Promise<ChannelConfig> {
  return authPost<ChannelConfig>(NODE_API.NOTIFICATION_CHANNELS, channel);
}

export async function updateNotificationChannel(
  id: string,
  channel: Partial<ChannelConfig>
): Promise<{ status: string }> {
  return authPut<{ status: string }>(NODE_API.NOTIFICATION_CHANNEL(id), channel);
}

export async function deleteNotificationChannel(id: string): Promise<void> {
  return authDel<void>(NODE_API.NOTIFICATION_CHANNEL(id));
}

export async function testNotificationChannel(id: string): Promise<{ status: string }> {
  return authPost<{ status: string }>(NODE_API.NOTIFICATION_CHANNEL_TEST(id));
}

export interface ChannelTypesResponse {
  channel_types: ChannelTypeInfo[];
  event_categories: string[];
}

export async function getNotificationChannelTypes(): Promise<ChannelTypesResponse> {
  const resp = await authGet<ChannelTypesResponse | ChannelTypeInfo[]>(
    NODE_API.NOTIFICATION_CHANNEL_TYPES
  );
  if (Array.isArray(resp)) {
    return { channel_types: resp, event_categories: [] };
  }
  return resp;
}

export interface DetectedChat {
  id: string;
  title: string;
  type: string;
}

export async function detectTelegramChats(
  botToken: string,
  baseUrl?: string
): Promise<DetectedChat[]> {
  const body: Record<string, string> = { bot_token: botToken };
  if (baseUrl) body.base_url = baseUrl;
  const resp = await authPost<{ chats: DetectedChat[] }>(
    NODE_API.NOTIFICATION_CHANNELS_DETECT_CHAT,
    body
  );
  return resp.chats ?? [];
}
