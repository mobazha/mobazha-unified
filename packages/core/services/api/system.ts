/**
 * System API — standalone setup + admin dashboard
 *
 * Backend: mobazha3.0/internal/api/standalone_setup_handler.go
 *          mobazha3.0/internal/api/system_admin_handlers.go
 */

import { publicGet, publicPost, nodeAuthGet, nodeAuthPost, nodeAuthPut } from './helpers';
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
  casdoorAvailable?: boolean;
  /** Casdoor owner id when standalone has completed connect-platform (persisted on node). */
  ownerUserId?: string;
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

export type DeploymentMode = 'docker' | 'native' | 'saas';

export type UpdateStatus =
  | 'up-to-date'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'applying'
  | 'failed';

export interface UpdateInfo {
  launcherVersion?: string;
  autoUpdateEnabled: boolean;
  updateStatus: UpdateStatus;
  latestVersion?: string;
  latestReleaseURL?: string;
  releaseNotes?: string;
  downloadProgress: number;
  lastCheckTime?: string;
  lastError?: string;
}

export interface SystemHealthResponse {
  status: string;
  version: string;
  uptimeSeconds: number;
  timestamp: number;
  deploymentMode: DeploymentMode;
  system: SystemResourceInfo;
  node: NodeHealthInfo;
  update?: UpdateInfo;
}

export interface PaymentRPCStatusEntry {
  connected: boolean;
  endpoint?: string;
  accountIndex?: number;
  blockHeight?: number;
  error?: string;
}

export type PaymentRPCStatusResponse = Record<string, PaymentRPCStatusEntry>;

// --- Setup API ---

export async function getSetupStatus(): Promise<SetupStatusResponse> {
  return publicGet<SetupStatusResponse>(NODE_API.SYSTEM_SETUP);
}

export async function completeInitialSetup(password: string): Promise<InitialSetupResponse> {
  return publicPost<InitialSetupResponse>(NODE_API.SYSTEM_SETUP, { password });
}

// --- Platform connection (standalone only, requires auth) ---

export interface ConnectPlatformResponse {
  casdoorAvailable: boolean;
  ownerUserId: string;
}

export async function connectPlatform(token: string): Promise<ConnectPlatformResponse> {
  return nodeAuthPost<ConnectPlatformResponse>(NODE_API.SYSTEM_CONNECT_PLATFORM, { token });
}

// --- System admin API (standalone only, requires auth) ---

export async function getSystemHealth(): Promise<SystemHealthResponse> {
  return nodeAuthGet<SystemHealthResponse>(NODE_API.SYSTEM_HEALTH);
}

export async function getPaymentRPCStatus(): Promise<PaymentRPCStatusResponse> {
  return nodeAuthGet<PaymentRPCStatusResponse>(NODE_API.SYSTEM_RPC_STATUS);
}

export async function getSystemLogs(): Promise<string> {
  return nodeAuthGet<string>(NODE_API.SYSTEM_LOGS);
}

// --- Network config API (standalone overlay management) ---

export interface NetworkConfigResponse {
  connectivity: string;
  overlayType: string;
  overlayDomain?: string;
  dockerManaged: boolean;
  gatewayPort: number;
}

export interface NetworkConfigUpdateResponse {
  connectivity: string;
  overlayType: string;
  message: string;
}

export async function getNetworkConfig(): Promise<NetworkConfigResponse> {
  return nodeAuthGet<NetworkConfigResponse>(NODE_API.SYSTEM_NETWORK);
}

export async function updateNetworkConfig(
  overlayType: string
): Promise<NetworkConfigUpdateResponse> {
  return nodeAuthPost<NetworkConfigUpdateResponse>(NODE_API.SYSTEM_NETWORK, { overlayType });
}

// --- Doctor API (standalone health checks) ---

export type DoctorStatus = 'PASS' | 'WARN' | 'FAIL';

export interface DoctorCheckResult {
  name: string;
  status: DoctorStatus;
  detail?: string;
}

export interface DoctorSummary {
  pass: number;
  warn: number;
  fail: number;
  results: DoctorCheckResult[];
}

export async function runDoctor(): Promise<DoctorSummary> {
  return nodeAuthGet<DoctorSummary>(NODE_API.SYSTEM_DOCTOR);
}

export async function downloadDiagnostics(): Promise<Blob> {
  const { getGatewayUrl, getAuthHeaders } = await import('./config');
  const resp = await fetch(`${getGatewayUrl()}${NODE_API.SYSTEM_DIAGNOSTICS}`, {
    headers: getAuthHeaders(),
  });
  if (!resp.ok) throw new Error(`Diagnostics export failed: ${resp.status}`);
  return resp.blob();
}

// --- Domain config API (standalone domain + TLS management) ---

export interface DomainConfigResponse {
  domain: string;
  connectivity: string;
  overlayType: string;
  overlayDomain?: string;
  tlsMode: string;
}

export interface DomainUpdateResponse {
  domain: string;
  tlsMode: string;
  message: string;
}

export async function getDomainConfig(): Promise<DomainConfigResponse> {
  return nodeAuthGet<DomainConfigResponse>(NODE_API.SYSTEM_DOMAIN);
}

export async function updateDomain(domain: string): Promise<DomainUpdateResponse> {
  return nodeAuthPost<DomainUpdateResponse>(NODE_API.SYSTEM_DOMAIN, { domain });
}

// --- Update management API (native deployment only) ---

export interface UpdateConfigResponse {
  autoUpdateEnabled: boolean;
  checkIntervalMinutes: number;
  updateChannel: string;
}

export async function triggerUpdate(action: 'check' | 'apply'): Promise<void> {
  await nodeAuthPost(NODE_API.SYSTEM_UPDATE_TRIGGER, { action });
}

export async function getUpdateConfig(): Promise<UpdateConfigResponse> {
  return nodeAuthGet<UpdateConfigResponse>(NODE_API.SYSTEM_UPDATE_CONFIG);
}

export async function updateUpdateConfig(
  config: UpdateConfigResponse
): Promise<UpdateConfigResponse> {
  return nodeAuthPut<UpdateConfigResponse>(NODE_API.SYSTEM_UPDATE_CONFIG, config);
}
