/**
 * AI Service for product listing assistance.
 * Communicates with the backend AI proxy (/v1/ai/generate)
 * to keep API keys server-side. Configuration is managed via
 * /v1/settings/ai (Admin > Integrations).
 */

import { nodeAuthPost } from '../api/helpers';
import { NODE_API } from '../../config/apiPaths';
import type { StoreConfig } from '../../types/storeConfig';
import { validateAndFixStoreConfig } from '../../utils';

export type AiAction =
  | 'generate_from_images'
  | 'improve_title'
  | 'polish_description'
  | 'suggest_tags'
  | 'generate_store'
  | 'refine_store'
  | 'rewrite_text';

export interface StoreProductContext {
  slug: string;
  title: string;
}

export interface AiGenerateRequest {
  action: AiAction;
  images?: string[];
  title?: string;
  description?: string;
  contractType?: string;
  language?: string;
  brandName?: string;
  brandDescription?: string;
  products?: StoreProductContext[];
  storeConfig?: StoreConfig;
  instruction?: string;
  text?: string;
  context?: string;
}

export interface AiGenerateResponse {
  title?: string;
  description?: string;
  tags?: string[];
  productType?: string;
  shortDescription?: string;
  storeConfig?: unknown;
  text?: string;
}

export interface StoreBuilderInput {
  brandName: string;
  brandDescription: string;
  language?: string;
  /** Sample of the seller's real catalog so the AI references actual listings. */
  products?: StoreProductContext[];
}

class AiService {
  private async request(body: AiGenerateRequest): Promise<AiGenerateResponse> {
    try {
      return await nodeAuthPost<AiGenerateResponse>(NODE_API.AI_GENERATE, body);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as { status: number }).status;
        const message =
          'message' in error
            ? String((error as { message: string }).message)
            : `AI service error (${status})`;
        throw new AiServiceError(message, status);
      }
      throw new AiServiceError(error instanceof Error ? error.message : 'AI service error', 500);
    }
  }

  /**
   * Generate a complete listing from product images.
   * Returns title, description, tags, productType.
   */
  async generateFromImages(
    imageUrls: string[],
    opts?: { contractType?: string; language?: string }
  ): Promise<AiGenerateResponse> {
    return this.request({
      action: 'generate_from_images',
      images: imageUrls,
      contractType: opts?.contractType,
      language: opts?.language,
    });
  }

  /**
   * Improve an existing product title.
   */
  async improveTitle(
    title: string,
    opts?: { description?: string; language?: string }
  ): Promise<{ title: string }> {
    const result = await this.request({
      action: 'improve_title',
      title,
      description: opts?.description,
      language: opts?.language,
    });
    return { title: result.title || title };
  }

  /**
   * Polish and enhance a product description.
   */
  async polishDescription(
    title: string,
    description: string,
    opts?: { language?: string }
  ): Promise<{ description: string; shortDescription?: string }> {
    const result = await this.request({
      action: 'polish_description',
      title,
      description,
      language: opts?.language,
    });
    return {
      description: result.description || description,
      shortDescription: result.shortDescription,
    };
  }

  /**
   * Suggest tags and product type for a product.
   */
  async suggestTags(
    title: string,
    opts?: { description?: string; language?: string }
  ): Promise<{ tags: string[]; productType?: string }> {
    const result = await this.request({
      action: 'suggest_tags',
      title,
      description: opts?.description,
      language: opts?.language,
    });
    return {
      tags: result.tags || [],
      productType: result.productType,
    };
  }

  /**
   * Generate a complete store config from brand info.
   * The raw AI output is validated and fixed client-side.
   */
  async generateStoreConfig(input: StoreBuilderInput): Promise<StoreConfig> {
    const result = await this.request({
      action: 'generate_store',
      brandName: input.brandName,
      brandDescription: input.brandDescription,
      language: input.language,
      products: input.products,
    });
    return validateAndFixStoreConfig(result.storeConfig);
  }

  /**
   * Refine an existing store config with a natural-language instruction
   * ("make it warmer", "swap the hero copy to English"). Returns the full
   * updated config, validated client-side.
   */
  async refineStoreConfig(
    config: StoreConfig,
    instruction: string,
    opts?: { language?: string }
  ): Promise<StoreConfig> {
    const result = await this.request({
      action: 'refine_store',
      storeConfig: config,
      instruction,
      language: opts?.language,
    });
    return validateAndFixStoreConfig(result.storeConfig);
  }

  /**
   * Rewrite a short piece of storefront copy (hero title, about text…).
   * Plain text in, plain text out.
   */
  async rewriteText(text: string, opts?: { context?: string; language?: string }): Promise<string> {
    const result = await this.request({
      action: 'rewrite_text',
      text,
      context: opts?.context,
      language: opts?.language,
    });
    return result.text || text;
  }
}

export class AiServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'AiServiceError';
  }

  get isNotConfigured(): boolean {
    return this.statusCode === 503;
  }
}

export const aiService = new AiService();
