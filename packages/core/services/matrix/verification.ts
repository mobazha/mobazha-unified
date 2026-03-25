/**
 * Matrix 验证模块
 * SAS 验证 + 屏蔽/忽略
 */

import type { MatrixContext, MatrixRoom } from './types';
import { MATRIX_EVENTS } from './types';
import { matrixEvents } from './events';

// ============ Local interfaces (not exported from types.ts) ============

interface MatrixVerificationRequest {
  phase: number;
  transactionId: string;
  otherUserId: string;
  cancellingUserId?: string;
  verifier?: MatrixVerifier;
  on(event: string, handler: () => void): void;
  accept(): Promise<void>;
  startVerification(method: string): Promise<MatrixVerifier>;
  cancel(): Promise<void>;
}

interface MatrixVerifier {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, handler: (...args: any[]) => void): void;
  verify(): Promise<void>;
  cancel(error: Error): void;
}

interface MatrixSasCallbacks {
  sas?: { emoji?: unknown[]; decimal?: unknown[] };
  emoji?: unknown[];
  decimal?: unknown[];
  confirm(): Promise<void>;
  cancel(): void;
}

interface IgnoreListClient {
  getIgnoredUsers(): string[];
  setIgnoredUsers(users: string[]): Promise<void>;
}

// ============ Mutable state (owned by facade, passed in) ============

export interface VerificationModuleState {
  pendingVerificationRequest: MatrixVerificationRequest | null;
  currentVerifier: MatrixVerifier | null;
  sasCallbacks: MatrixSasCallbacks | null;
  verificationDebounceTimer: ReturnType<typeof setTimeout> | null;
  verifierListenersAttached: WeakSet<object>;
  verificationListenersSetup: boolean;
  ignoreMutex: Promise<void>;
}

export function createVerificationState(): VerificationModuleState {
  return {
    pendingVerificationRequest: null,
    currentVerifier: null,
    sasCallbacks: null,
    verificationDebounceTimer: null,
    verifierListenersAttached: new WeakSet<object>(),
    verificationListenersSetup: false,
    ignoreMutex: Promise.resolve(),
  };
}

export function resetVerificationState(state: VerificationModuleState): void {
  state.pendingVerificationRequest = null;
  state.currentVerifier = null;
  state.sasCallbacks = null;
  if (state.verificationDebounceTimer) {
    clearTimeout(state.verificationDebounceTimer);
    state.verificationDebounceTimer = null;
  }
  state.verifierListenersAttached = new WeakSet<object>();
  state.verificationListenersSetup = false;
  state.ignoreMutex = Promise.resolve();
}

// ============ Verification listeners ============

async function setupVerifierListeners(
  state: VerificationModuleState,
  verifier: MatrixVerifier,
  request: MatrixVerificationRequest
): Promise<void> {
  const { VerifierEvent } = await import('matrix-js-sdk/lib/crypto-api/verification');
  if (state.verifierListenersAttached.has(verifier)) return;
  state.verifierListenersAttached.add(verifier);

  verifier.on(VerifierEvent.ShowSas, (sas: MatrixSasCallbacks) => {
    if (state.sasCallbacks) return;
    const sasData = sas.sas || sas;
    matrixEvents.emit(MATRIX_EVENTS.VERIFICATION_SHOW_SAS, {
      requestId: request.transactionId,
      emoji: sasData.emoji,
      decimal: sasData.decimal,
    });
    state.sasCallbacks = sas;
  });

  verifier.on(VerifierEvent.Cancel, () => {
    matrixEvents.emit(MATRIX_EVENTS.VERIFICATION_CANCELLED, {
      requestId: request.transactionId,
      reason: 'verifier_cancel',
    });
    state.pendingVerificationRequest = null;
    state.currentVerifier = null;
    state.sasCallbacks = null;
  });
}

async function setupVerificationRequestListeners(
  state: VerificationModuleState,
  request: MatrixVerificationRequest
): Promise<void> {
  const { VerificationPhase } = await import('matrix-js-sdk/lib/crypto-api/verification');
  let completedEmitted = false;

  request.on('change', () => {
    switch (request.phase) {
      case VerificationPhase.Started: {
        matrixEvents.emit(MATRIX_EVENTS.VERIFICATION_STARTED, {
          requestId: request.transactionId,
        });
        try {
          const verifier = request.verifier;
          if (verifier && !state.currentVerifier) {
            state.currentVerifier = verifier;
            setupVerifierListeners(state, verifier, request);
          }
        } catch {
          /* verifier not ready yet */
        }
        break;
      }
      case VerificationPhase.Done:
        if (!completedEmitted) {
          completedEmitted = true;
          matrixEvents.emit(MATRIX_EVENTS.VERIFICATION_COMPLETED, {
            requestId: request.transactionId,
            otherUserId: request.otherUserId,
          });
        }
        state.pendingVerificationRequest = null;
        state.currentVerifier = null;
        state.sasCallbacks = null;
        break;
      case VerificationPhase.Cancelled:
        matrixEvents.emit(MATRIX_EVENTS.VERIFICATION_CANCELLED, {
          requestId: request.transactionId,
          reason: request.cancellingUserId,
        });
        state.pendingVerificationRequest = null;
        state.currentVerifier = null;
        state.sasCallbacks = null;
        break;
    }
  });
}

// ============ Public verification API ============

export async function setupVerificationListeners(
  ctx: MatrixContext,
  state: VerificationModuleState
): Promise<void> {
  if (!ctx.client || state.verificationListenersSetup) return;
  state.verificationListenersSetup = true;
  const crypto = ctx.client.getCrypto?.();
  if (!crypto) return;

  const { CryptoEvent } = await import('matrix-js-sdk/lib/crypto-api');
  const { VerificationPhase } = await import('matrix-js-sdk/lib/crypto-api/verification');

  (
    crypto as unknown as {
      on: (event: string, handler: (req: MatrixVerificationRequest) => void) => void;
    }
  ).on(CryptoEvent.VerificationRequestReceived, (request: MatrixVerificationRequest) => {
    if (state.verificationDebounceTimer) {
      clearTimeout(state.verificationDebounceTimer);
      state.verificationDebounceTimer = null;
    }
    state.verificationDebounceTimer = setTimeout(() => {
      state.verificationDebounceTimer = null;
      if (request.phase === VerificationPhase.Requested) {
        state.pendingVerificationRequest = request;
        setupVerificationRequestListeners(state, request);
        matrixEvents.emit(MATRIX_EVENTS.VERIFICATION_REQUEST_RECEIVED, {
          otherUserId: request.otherUserId,
          requestId: request.transactionId,
        });
      }
    }, 200);
  });
}

export async function requestVerification(
  ctx: MatrixContext,
  state: VerificationModuleState,
  userId: string,
  rooms: MatrixRoom[]
): Promise<void> {
  if (!ctx.client) throw new Error('Client not initialized');
  const crypto = ctx.client.getCrypto?.();
  if (!crypto) throw new Error('Crypto not available');

  const devices = await crypto.getUserDeviceInfo([userId]);
  const userDevices = devices.get(userId);
  if (!userDevices || userDevices.size === 0) {
    throw new Error('No devices found for user');
  }

  const directRoom = rooms.find(r => r.isDirect && r.members.some(m => m.userId === userId));
  if (!directRoom) {
    throw new Error('No direct message room exists with this user. Start a conversation first.');
  }
  const request = await (
    crypto as unknown as {
      requestVerificationDM(userId: string, roomId: string): Promise<MatrixVerificationRequest>;
    }
  ).requestVerificationDM(userId, directRoom.roomId);

  state.pendingVerificationRequest = request;
  setupVerificationRequestListeners(state, request);
}

export async function acceptVerificationRequest(state: VerificationModuleState): Promise<boolean> {
  const request = state.pendingVerificationRequest;
  if (!request) return false;

  const { VerificationPhase } = await import('matrix-js-sdk/lib/crypto-api/verification');
  if (request.phase === VerificationPhase.Cancelled) {
    matrixEvents.emit(MATRIX_EVENTS.VERIFICATION_CANCELLED, { reason: 'already_cancelled' });
    state.pendingVerificationRequest = null;
    return false;
  }
  if (request.phase >= VerificationPhase.Ready) return false;

  await request.accept();
  const verifier = await request.startVerification('m.sas.v1');
  state.currentVerifier = verifier;
  setupVerifierListeners(state, verifier, request);
  return true;
}

export async function confirmVerification(state: VerificationModuleState): Promise<boolean> {
  const sas = state.sasCallbacks;
  if (sas && typeof sas.confirm === 'function') {
    await sas.confirm();
    state.currentVerifier = null;
    state.sasCallbacks = null;
    return true;
  }
  const verifier = state.currentVerifier;
  if (verifier) {
    await verifier.verify();
    state.currentVerifier = null;
    return true;
  }
  return false;
}

export async function cancelVerification(state: VerificationModuleState): Promise<boolean> {
  try {
    const sas = state.sasCallbacks;
    if (sas && typeof sas.cancel === 'function') {
      sas.cancel();
      state.sasCallbacks = null;
    }
    const verifier = state.currentVerifier;
    if (verifier) {
      verifier.cancel(new Error('User cancelled'));
      state.currentVerifier = null;
    }
    const request = state.pendingVerificationRequest;
    if (request) {
      await request.cancel();
      state.pendingVerificationRequest = null;
    }
    return true;
  } catch {
    return false;
  }
}

export async function isUserVerified(ctx: MatrixContext, userId: string): Promise<boolean> {
  if (!ctx.client) return false;
  const crypto = ctx.client.getCrypto?.();
  if (!crypto) return false;
  try {
    const verificationStatus = await crypto.getUserVerificationStatus(userId);
    return verificationStatus?.isVerified?.() ?? false;
  } catch {
    return false;
  }
}

// ============ Block / Ignore ============

export async function getIgnoredUsers(ctx: MatrixContext): Promise<string[]> {
  if (!ctx.client) return [];
  return (ctx.client as unknown as IgnoreListClient).getIgnoredUsers?.() ?? [];
}

export async function isUserIgnored(ctx: MatrixContext, userId: string): Promise<boolean> {
  const ignored = await getIgnoredUsers(ctx);
  return ignored.includes(userId);
}

async function mutateIgnoredUsers(
  ctx: MatrixContext,
  state: VerificationModuleState,
  mutator: (current: string[]) => string[]
): Promise<void> {
  const task = state.ignoreMutex.then(async () => {
    if (!ctx.client) return;
    const ignoreClient = ctx.client as unknown as IgnoreListClient;
    const current: string[] = ignoreClient.getIgnoredUsers?.() ?? [];
    const next = mutator(current);
    if (next !== current) {
      await ignoreClient.setIgnoredUsers(next);
    }
  });
  state.ignoreMutex = task.catch(() => {});
  return task;
}

export async function blockUser(
  ctx: MatrixContext,
  state: VerificationModuleState,
  userId: string
): Promise<void> {
  await mutateIgnoredUsers(ctx, state, current => {
    if (current.includes(userId)) return current;
    return [...current, userId];
  });
}

export async function unblockUser(
  ctx: MatrixContext,
  state: VerificationModuleState,
  userId: string
): Promise<void> {
  await mutateIgnoredUsers(ctx, state, current => current.filter((id: string) => id !== userId));
}
