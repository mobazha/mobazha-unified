/**
 * AI Service for product listing assistance.
 * Communicates with the server-side AI proxy (/internal/ai/generate)
 * to keep API keys server-side.
 */

export type AiAction =
  | 'generate_from_images'
  | 'improve_title'
  | 'polish_description'
  | 'suggest_tags';

export interface AiGenerateRequest {
  action: AiAction;
  images?: string[];
  title?: string;
  description?: string;
  contractType?: string;
  language?: string;
}

export interface AiGenerateResponse {
  title?: string;
  description?: string;
  tags?: string[];
  categories?: string[];
  shortDescription?: string;
}

export interface AiServiceConfig {
  endpoint?: string;
}

class AiService {
  private endpoint: string;

  constructor(config?: AiServiceConfig) {
    this.endpoint = config?.endpoint || '/internal/ai/generate';
  }

  private async request(body: AiGenerateRequest): Promise<AiGenerateResponse> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new AiServiceError(
        data.error || `AI service error (${response.status})`,
        response.status
      );
    }

    return response.json();
  }

  /**
   * Generate a complete listing from product images.
   * Returns title, description, tags, categories.
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
   * Suggest tags and categories for a product.
   */
  async suggestTags(
    title: string,
    opts?: { description?: string; language?: string }
  ): Promise<{ tags: string[]; categories: string[] }> {
    const result = await this.request({
      action: 'suggest_tags',
      title,
      description: opts?.description,
      language: opts?.language,
    });
    return {
      tags: result.tags || [],
      categories: result.categories || [],
    };
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
