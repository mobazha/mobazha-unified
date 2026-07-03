/**
 * Webhooks API
 *
 * CRUD operations for webhook endpoints + delivery history.
 * Backend: mobazha/internal/api/webhook_handlers.go
 */

import { authGet, authPost, authDel, authRequest } from './helpers';
import { NODE_API } from '../../config/apiPaths';

export interface WebhookEndpoint {
  id: string;
  url: string;
  secret?: string;
  event_types: string;
  active: boolean;
  created_at: string;
}

export interface WebhookDelivery {
  id: string;
  endpoint_id: string;
  event_type: string;
  payload: string;
  status: 'pending' | 'success' | 'failed';
  attempts: number;
  max_attempts: number;
  next_retry_at?: string;
  created_at: string;
}

export interface WebhookDeliveriesResponse {
  deliveries: WebhookDelivery[];
  total: number;
}

export interface CreateWebhookRequest {
  url: string;
  event_types?: string;
}

export interface UpdateWebhookRequest {
  url?: string;
  event_types?: string;
  active?: boolean;
}

export async function listWebhooks(): Promise<WebhookEndpoint[]> {
  return authGet<WebhookEndpoint[]>(NODE_API.WEBHOOKS);
}

export async function createWebhook(data: CreateWebhookRequest): Promise<WebhookEndpoint> {
  return authPost<WebhookEndpoint>(NODE_API.WEBHOOKS, data);
}

export async function updateWebhook(
  id: string,
  data: UpdateWebhookRequest
): Promise<{ status: string }> {
  return authRequest<{ status: string }>(NODE_API.WEBHOOK(id), {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteWebhook(id: string): Promise<void> {
  return authDel<void>(NODE_API.WEBHOOK(id));
}

export async function listDeliveries(
  id: string,
  params?: { limit?: number; offset?: number; status?: string }
): Promise<WebhookDeliveriesResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  if (params?.status) searchParams.set('status', params.status);
  const qs = searchParams.toString();
  const path = qs ? `${NODE_API.WEBHOOK_DELIVERIES(id)}?${qs}` : NODE_API.WEBHOOK_DELIVERIES(id);
  return authGet<WebhookDeliveriesResponse>(path);
}

export async function testWebhook(id: string): Promise<{ status: string }> {
  return authPost<{ status: string }>(NODE_API.WEBHOOK_TEST(id));
}
