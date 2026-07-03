/**
 * AI Settings API
 *
 * Manage AI provider configuration (provider, API key, model, enabled).
 * Backend: mobazha/internal/api/ai_handlers.go
 */

import { nodeAuthGet, nodeAuthPut, nodeAuthPost } from './helpers';
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
  /** Platform AI: text route (generate/chat) configured. */
  text_available?: boolean;
  /** Platform AI: vision route configured. Sovereign BYOK: use supports_vision instead. */
  vision_available?: boolean;
  /** Sovereign local LLM: whether the runtime supports image input. */
  supports_vision?: boolean;
}

/** Whether listing/image AI features should treat vision as available. */
export function aiStatusSupportsVision(status: AIStatus): boolean {
  if (typeof status.vision_available === 'boolean') {
    return status.vision_available !== false;
  }
  return status.supports_vision !== false;
}

export async function getAIStatus(): Promise<AIStatus> {
  return nodeAuthGet<AIStatus>(NODE_API.AI_STATUS);
}

export async function getAIConfig(): Promise<AIConfig> {
  return nodeAuthGet<AIConfig>(NODE_API.AI_CONFIG);
}

export async function saveAIConfig(config: AIConfigInput): Promise<AIConfig> {
  return nodeAuthPut<AIConfig>(NODE_API.AI_CONFIG, config);
}

export async function getAIProviders(): Promise<AIProviderInfo[]> {
  return nodeAuthGet<AIProviderInfo[]>(NODE_API.AI_PROVIDERS);
}

export async function testAIConnection(params: {
  provider: string;
  api_key?: string;
  model: string;
  base_url: string;
}): Promise<AITestConnectionResult> {
  return nodeAuthPost<AITestConnectionResult>(NODE_API.AI_TEST_CONNECTION, params);
}
