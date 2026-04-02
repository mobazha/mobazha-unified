/**
 * System API — standalone setup + admin dashboard
 *
 * Backend: mobazha3.0/internal/api/standalone_setup_handler.go
 *          mobazha3.0/internal/api/system_admin_handlers.go
 */

import { publicGet, publicPost, authGet, authPost } from './helpers';
import { NODE_API } from '../../config/apiPaths';

// --- Setup types ---

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

// --- System health types ---

export interface SystemResourceInfo {
  goVersion: string;
  os: string;
  arch: string;
  numCPU: number;
  numGoroutine: number;
  memAllocMB: number;
  memSysMB: number;
  diskTotalGB: number;
  diskFreeGB: number;
  diskUsedPercent: number;
}

export interface NodeHealthInfo {
  peerID: string;
  dataDir: string;
}

export interface SystemHealthResponse {
  status: string;
  version: string;
  uptimeSeconds: number;
  timestamp: number;
  system: SystemResourceInfo;
  node: NodeHealthInfo;
}

// --- Setup API ---

export async function getSetupStatus(): Promise<SetupStatusResponse> {
  return publicGet<SetupStatusResponse>(NODE_API.SYSTEM_SETUP);
}

export async function completeInitialSetup(password: string): Promise<InitialSetupResponse> {
  return publicPost<InitialSetupResponse>(NODE_API.SYSTEM_SETUP, { password });
}

// --- System admin API (standalone only, requires auth) ---

export async function getSystemHealth(): Promise<SystemHealthResponse> {
  return authGet<SystemHealthResponse>(NODE_API.SYSTEM_HEALTH);
}

export async function getSystemLogs(): Promise<string> {
  return authGet<string>(NODE_API.SYSTEM_LOGS);
}

// --- Network config API (standalone overlay management) ---

export interface NetworkConfigResponse {
  connectivity: string;
  overlayType: string;
  overlayDomain?: string;
  dockerManaged: boolean;
}

export interface NetworkConfigUpdateResponse {
  connectivity: string;
  overlayType: string;
  message: string;
}

export async function getNetworkConfig(): Promise<NetworkConfigResponse> {
  return authGet<NetworkConfigResponse>(NODE_API.SYSTEM_NETWORK);
}

export async function updateNetworkConfig(overlayType: string): Promise<NetworkConfigUpdateResponse> {
  return authPost<NetworkConfigUpdateResponse>(NODE_API.SYSTEM_NETWORK, { overlayType });
}
