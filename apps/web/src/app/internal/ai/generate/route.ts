/**
 * Next.js API Route adapter for AI generation.
 * Core logic lives in src/server/aiHandler.ts (shared with Vite plugin).
 */
import { NextRequest, NextResponse } from 'next/server';
import { handleAiRequest, type AiGenerateRequest } from '../../../../server/aiHandler';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

export async function POST(request: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'AI service not configured. Set OPENAI_API_KEY environment variable.' },
      { status: 503 }
    );
  }

  let body: AiGenerateRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const result = await handleAiRequest(body, {
    apiKey: OPENAI_API_KEY,
    model: OPENAI_MODEL,
    baseUrl: OPENAI_BASE_URL,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
