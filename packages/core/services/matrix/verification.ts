/**
 * Matrix 验证模块 — v1.3 Backend-driven SAS Verification
 *
 * All verification logic runs on the backend via mautrix-go VerificationHelper.
 * The frontend drives the flow through REST API calls and receives state updates
 * via WebSocket events (chat.verification.*).
 */

import { authPost } from '../api/helpers';
import { NODE_API } from '../../config/apiPaths';

export async function setupVerificationListeners(): Promise<void> {
  /* WS events handled by event-listeners.ts */
}

export async function requestVerification(userId: string): Promise<string> {
  const resp = await authPost<{ transactionId: string }>(NODE_API.CHAT_VERIFICATION_REQUEST, {
    userId,
  });
  return resp.transactionId;
}

export async function acceptVerificationRequest(txnId: string): Promise<boolean> {
  await authPost(NODE_API.CHAT_VERIFICATION_ACCEPT(txnId), {});
  return true;
}

export async function confirmVerification(txnId: string): Promise<boolean> {
  await authPost(NODE_API.CHAT_VERIFICATION_CONFIRM(txnId), {});
  return true;
}

export async function cancelVerification(txnId: string): Promise<boolean> {
  await authPost(NODE_API.CHAT_VERIFICATION_CANCEL(txnId), {});
  return true;
}

export async function startSAS(txnId: string): Promise<void> {
  await authPost(NODE_API.CHAT_VERIFICATION_START_SAS(txnId), {});
}
