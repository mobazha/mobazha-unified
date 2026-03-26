/**
 * Matrix 验证模块 — v1.2 Stub
 *
 * E2EE 验证由后端 mautrix-go 透明处理，前端不再需要 SAS 验证流程。
 * 保留导出接口以保持编译兼容性。
 */

export interface VerificationModuleState {
  pendingVerificationRequest: null;
  currentVerifier: null;
  sasCallbacks: null;
  verificationDebounceTimer: null;
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
  state.verificationListenersSetup = false;
  state.ignoreMutex = Promise.resolve();
}

export async function setupVerificationListeners(): Promise<void> {
  /* no-op */
}
export async function requestVerification(): Promise<void> {
  /* no-op */
}
export async function acceptVerificationRequest(): Promise<boolean> {
  return false;
}
export async function confirmVerification(): Promise<boolean> {
  return false;
}
export async function cancelVerification(): Promise<boolean> {
  return false;
}
export async function isUserVerified(): Promise<boolean> {
  return true;
}
export async function getIgnoredUsers(): Promise<string[]> {
  return [];
}
export async function isUserIgnored(): Promise<boolean> {
  return false;
}
export async function blockUser(): Promise<void> {
  /* no-op */
}
export async function unblockUser(): Promise<void> {
  /* no-op */
}
