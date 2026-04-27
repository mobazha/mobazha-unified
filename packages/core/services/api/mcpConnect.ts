import { NODE_API } from '../../config/apiPaths';
import { authGet, authPost } from './helpers';

export interface MCPClientStatus {
  name: string;
  displayName: string;
  installed: boolean;
  configPath?: string;
  configured: boolean;
}

export interface MCPConnectResult {
  name: string;
  displayName: string;
  status: 'connected' | 'not_installed' | 'already_configured' | 'error';
  configPath?: string;
  method?: string;
  error?: string;
}

export interface MCPConnectResponse {
  token?: string;
  clients: MCPConnectResult[];
}

/**
 * Read-only probe used by the Admin UI to decide whether the "Connect All"
 * button should be enabled. The backend reports whether a token store is
 * available, how many token slots remain, which AI clients are detected on
 * this host, and whether the node is running inside a Docker container
 * (in which case host filesystem writes won't reach the user's clients).
 *
 * `reason` codes (stable):
 *   - "ok"
 *   - "containerized"   — node is in Docker; host configs unreachable
 *   - "no_token_store"
 *   - "token_slots_exhausted"
 *   - "no_clients"
 */
export interface MCPCapability {
  supported: boolean;
  reason: 'ok' | 'containerized' | 'no_token_store' | 'token_slots_exhausted' | 'no_clients';
  containerized: boolean;
  hasTokenStore: boolean;
  tokenSlotsLeft: number;
  detectedClients: MCPClientStatus[];
}

export async function mcpGetCapability(): Promise<MCPCapability> {
  return authGet<MCPCapability>(NODE_API.SYSTEM_MCP_CAPABILITY);
}

export async function mcpConnectAll(token?: string, force?: boolean): Promise<MCPConnectResponse> {
  return authPost<MCPConnectResponse>(NODE_API.SYSTEM_MCP_CONNECT, { token, force });
}

export async function mcpConnectClient(
  client: string,
  token?: string,
  force?: boolean
): Promise<MCPConnectResponse> {
  return authPost<MCPConnectResponse>(NODE_API.SYSTEM_MCP_CONNECT_CLIENT(client), { token, force });
}

export async function mcpListClients(): Promise<MCPClientStatus[]> {
  return authGet<MCPClientStatus[]>(NODE_API.SYSTEM_MCP_CLIENTS);
}

export async function mcpDisconnectAll(): Promise<MCPConnectResult[]> {
  return authPost<MCPConnectResult[]>(NODE_API.SYSTEM_MCP_DISCONNECT);
}

export async function mcpDisconnectClient(client: string): Promise<MCPConnectResult> {
  return authPost<MCPConnectResult>(NODE_API.SYSTEM_MCP_DISCONNECT_CLIENT(client));
}
