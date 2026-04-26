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
