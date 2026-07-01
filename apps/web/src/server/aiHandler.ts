/**
 * Framework-agnostic AI proxy handler.
 * Used by both Next.js API route and Vite dev server plugin.
 * No dependency on NextRequest/NextResponse or Node.js http module.
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

export interface AiHandlerResult {
  data?: AiGenerateResponse;
  error?: string;
  status: number;
}

export interface AiHandlerConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

const SYSTEM_PROMPT = `You are an expert e-commerce product listing assistant. You help sellers create compelling, professional product listings. Always respond in valid JSON format. Do NOT wrap your response in markdown code fences.`;

function buildPrompt(req: AiGenerateRequest): {
  messages: Array<{ role: string; content: unknown }>;
} {
  const lang = req.language || 'en';
  const langInstruction = lang === 'zh' ? 'Respond in Chinese (中文).' : `Respond in ${lang}.`;

  if (req.action === 'generate_from_images') {
    const content: unknown[] = [
      {
        type: 'text',
        text: `Analyze the product image(s) and generate a complete product listing. ${langInstruction}

Return JSON with these fields:
- "title": A compelling product title (max 140 chars)
- "shortDescription": A brief summary (max 200 chars)
- "description": A detailed HTML description with features and benefits (use <p>, <ul>, <li> tags)
- "tags": An array of 5-8 relevant search tags (lowercase, hyphenated)
- "categories": An array of 1-3 product categories

Product type: ${req.contractType || 'PHYSICAL_GOOD'}

Return ONLY valid JSON, no markdown fences.`,
      },
    ];

    if (req.images?.length) {
      for (const imageUrl of req.images.slice(0, 4)) {
        content.push({
          type: 'image_url',
          image_url: { url: imageUrl, detail: 'low' },
        });
      }
    }

    return {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content },
      ],
    };
  }

  if (req.action === 'improve_title') {
    return {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Improve this product title to be more compelling and SEO-friendly. ${langInstruction}

Current title: "${req.title}"
${req.description ? `Product description context: "${req.description.substring(0, 300)}"` : ''}

Return JSON: { "title": "improved title (max 140 chars)" }
Return ONLY valid JSON, no markdown fences.`,
        },
      ],
    };
  }

  if (req.action === 'polish_description') {
    return {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Polish and enhance this product description to be more professional and persuasive. ${langInstruction}

Product title: "${req.title || ''}"
Current description: "${req.description || ''}"

Return JSON: { "description": "polished HTML description using <p>, <ul>, <li> tags", "shortDescription": "brief summary (max 200 chars)" }
Return ONLY valid JSON, no markdown fences.`,
        },
      ],
    };
  }

  if (req.action === 'suggest_tags') {
    return {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Suggest relevant search tags and categories for this product. ${langInstruction}

Product title: "${req.title || ''}"
${req.description ? `Description: "${req.description.substring(0, 500)}"` : ''}

Return JSON: { "tags": ["tag1", "tag2", ...], "categories": ["category1", ...] }
Tags should be lowercase, hyphenated, 5-10 items. Categories 1-3 items.
Return ONLY valid JSON, no markdown fences.`,
        },
      ],
    };
  }

  throw new Error(`Unknown action: ${req.action}`);
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  return text.trim();
}

export async function handleAiRequest(
  body: AiGenerateRequest,
  config: AiHandlerConfig
): Promise<AiHandlerResult> {
  if (!body.action) {
    return { error: 'Missing action field', status: 400 };
  }

  try {
    const { messages } = buildPrompt(body);

    const requestBody: Record<string, unknown> = {
      model: config.model,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    };

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI upstream error:', response.status, errorText);
      let detail = `${config.model}: ${response.status}`;
      try {
        const errObj = JSON.parse(errorText);
        detail = errObj.error?.message || errObj.message || detail;
      } catch {
        /* use default detail */
      }
      return { error: detail, status: 502 };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { error: 'Empty AI response', status: 502 };
    }

    try {
      const cleaned = extractJson(content);
      const result: AiGenerateResponse = JSON.parse(cleaned);
      return { data: result, status: 200 };
    } catch {
      console.error('Failed to parse AI response:', content);
      return { error: 'Invalid AI response format', status: 502 };
    }
  } catch (error) {
    console.error('AI generate error:', error);
    return {
      error: error instanceof Error ? error.message : 'Internal server error',
      status: 500,
    };
  }
}
