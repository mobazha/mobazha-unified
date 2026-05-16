/**
 * AI Settings API
 *
 * Manage AI provider configuration (provider, API key, model, enabled).
 * Backend: mobazha3.0/internal/api/ai_handlers.go
 */

import { authGet, authPut, authPost } from './helpers';
import { NODE_API } from '../../config/apiPaths';

export interface AIProviderState {
  has_api_key: boolean;
  model: string;
  base_url: string;
}

export interface AIConfig {
  enabled: boolean;
  active_provider: string;
  providers: Record<string, AIProviderState>;
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
  help_url?: string;
}

export interface AITestConnectionResult {
  success: boolean;
  error?: string;
}

export interface AIStatus {
  available: boolean;
  source: 'byok' | 'platform' | 'none';
  daily_limit: number;
  daily_used: number;
  byok_configured: boolean;
  /** Whether the configured model supports image/vision input. Defaults to true when not reported. */
  supports_vision?: boolean;
}

export async function getAIStatus(): Promise<AIStatus> {
  return authGet<AIStatus>(NODE_API.AI_STATUS);
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
