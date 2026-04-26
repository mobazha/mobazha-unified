/**
 * API Tokens service
 *
 * CRUD for MCP / programmatic access tokens.
 * Backend: mobazha_hosting/api/token_handlers.go
 */

import { hostingGet, hostingPost, hostingDel } from './helpers';
import { HOSTING_API } from '../../config/apiPaths';

export interface ApiTokenInfo {
  id: number;
  name: string;
  scopes: string[];
  created_at: string;
  expires_at?: string;
  last_used_at?: string;
  revoked: boolean;
  auto_label?: string;
}

export interface CreateTokenRequest {
  name: string;
  scopes: string[];
  expires_in_days?: number;
}

export interface CreateTokenResponse {
  token: string;
  info: ApiTokenInfo;
}

export interface ScopeInfo {
  id: string;
  label: string;
  description: string;
}

export async function listTokens(): Promise<ApiTokenInfo[]> {
  return hostingGet<ApiTokenInfo[]>(HOSTING_API.AUTH_TOKENS);
}

export async function createToken(data: CreateTokenRequest): Promise<CreateTokenResponse> {
  return hostingPost<CreateTokenResponse>(HOSTING_API.AUTH_TOKENS, data);
}

export async function revokeToken(tokenID: string): Promise<void> {
  return hostingDel<void>(HOSTING_API.AUTH_TOKEN(tokenID));
}

export async function getAvailableScopes(): Promise<ScopeInfo[]> {
  return hostingGet<ScopeInfo[]>(HOSTING_API.AUTH_SCOPES);
}
