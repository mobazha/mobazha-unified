/**
 * API Tokens service
 *
 * CRUD for MCP / programmatic access tokens.
 * SaaS:       hosting backend  /platform/v1/auth/tokens
 * Standalone:  node backend    /v1/auth/tokens
 */

import {
  hostingGet,
  hostingPost,
  hostingDel,
  nodeAuthGet,
  nodeAuthPost,
  nodeAuthDel,
} from './helpers';
import { HOSTING_API, NODE_API } from '../../config/apiPaths';
import { isStandaloneMode } from '../../config/env';

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
  if (isStandaloneMode()) {
    return nodeAuthGet<ApiTokenInfo[]>(NODE_API.AUTH_TOKENS);
  }
  return hostingGet<ApiTokenInfo[]>(HOSTING_API.AUTH_TOKENS);
}

export async function createToken(data: CreateTokenRequest): Promise<CreateTokenResponse> {
  if (isStandaloneMode()) {
    return nodeAuthPost<CreateTokenResponse>(NODE_API.AUTH_TOKENS, data);
  }
  return hostingPost<CreateTokenResponse>(HOSTING_API.AUTH_TOKENS, data);
}

export async function revokeToken(tokenID: string): Promise<void> {
  if (isStandaloneMode()) {
    return nodeAuthDel<void>(NODE_API.AUTH_TOKEN(tokenID));
  }
  return hostingDel<void>(HOSTING_API.AUTH_TOKEN(tokenID));
}

export async function getAvailableScopes(): Promise<ScopeInfo[]> {
  if (isStandaloneMode()) {
    return nodeAuthGet<ScopeInfo[]>(NODE_API.AUTH_SCOPES);
  }
  return hostingGet<ScopeInfo[]>(HOSTING_API.AUTH_SCOPES);
}
