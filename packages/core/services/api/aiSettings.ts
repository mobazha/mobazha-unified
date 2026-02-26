/**
 * AI Settings API
 *
 * Manage AI provider configuration (provider, API key, model, enabled).
 * Backend: mobazha3.0/internal/api/ai_handlers.go
 */

import { authGet, authPut, authPost } from './helpers';
import { NODE_API } from '../../config/apiPaths';

export interface AIConfig {
  provider: string;
  model: string;
  base_url: string;
  enabled: boolean;
  has_api_key: boolean;
}

export interface AIConfigInput {
  provider: string;
  api_key?: string;
  model: string;
  base_url: string;
  enabled: boolean;
}

export interface AIProviderInfo {
  id: string;
  label: string;
  default_model: string;
  default_base_url: string;
  models?: string[];
}

export interface AITestConnectionResult {
  success: boolean;
  error?: string;
}

export async function getAIConfig(): Promise<AIConfig> {
  return authGet<AIConfig>(NODE_API.AI_CONFIG);
}

export async function saveAIConfig(config: AIConfigInput): Promise<AIConfig> {
  return authPut<AIConfig>(NODE_API.AI_CONFIG, config);
}

export async function getAIProviders(): Promise<AIProviderInfo[]> {
  return authGet<AIProviderInfo[]>(NODE_API.AI_PROVIDERS);
}

export async function testAIConnection(params: {
  provider: string;
  api_key?: string;
  model: string;
  base_url: string;
}): Promise<AITestConnectionResult> {
  return authPost<AITestConnectionResult>(NODE_API.AI_TEST_CONNECTION, params);
}
