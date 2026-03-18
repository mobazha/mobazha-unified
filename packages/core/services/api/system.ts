/**
 * System API — standalone first-run setup
 *
 * Backend: mobazha3.0/internal/api/standalone_setup_handler.go
 * Endpoint: GET/POST /v1/system/setup (public, no auth required)
 */

import { publicGet, publicPost } from './helpers';
import { NODE_API } from '../../config/apiPaths';

export interface SetupCompletedSteps {
  password: boolean;
  profile: boolean;
  preferences: boolean;
  payment: boolean;
}

export interface SetupStatusResponse {
  setupComplete: boolean;
  completedSteps: SetupCompletedSteps;
}

export interface InitialSetupResponse {
  username: string;
}

/**
 * Check standalone node setup status.
 * Returns which setup steps have been completed.
 */
export async function getSetupStatus(): Promise<SetupStatusResponse> {
  return publicGet<SetupStatusResponse>(NODE_API.SYSTEM_SETUP);
}

/**
 * Set initial admin password for standalone node (one-time, unauthenticated).
 * This endpoint is permanently disabled after the first successful call.
 *
 * @returns username for constructing Basic Auth credentials
 */
export async function completeInitialSetup(password: string): Promise<InitialSetupResponse> {
  return publicPost<InitialSetupResponse>(NODE_API.SYSTEM_SETUP, { password });
}
