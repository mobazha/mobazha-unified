import { NextRequest, NextResponse } from 'next/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.mobazha.org';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:15104';

interface OEmbedResponse {
  version: string;
  type: 'rich';
  provider_name: string;
  provider_url: string;
  title: string;
  width: number;
  height: number;
  html: string;
  thumbnail_url?: string;
}

function getImageUrl(hash?: string): string | undefined {
  if (!hash) return undefined;
  return `${API_BASE}/v1/media/images/${hash}`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&[^;]+;/g, ' ')
    .trim();
}

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=300',
  };
}

const ALLOWED_HOSTNAMES = new Set(
  (SITE_URL ? [new URL(SITE_URL).hostname] : []).concat([
    'app.mobazha.org',
    'store.mobazha.org',
    'localhost',
  ])
);

function parseUrl(raw: string): { type: 'product' | 'store'; id: string; peerID?: string } | null {
  try {
    const u = new URL(raw);
    if (!ALLOWED_HOSTNAMES.has(u.hostname)) return null;

    const productMatch = u.pathname.match(/^\/product\/([^/]+)/);
    if (productMatch) {
      return {
        type: 'product',
        id: decodeURIComponent(productMatch[1]),
        peerID: u.searchParams.get('peerID') || undefined,
      };
    }

    const storeMatch = u.pathname.match(/^\/store\/([^/]+)/);
    if (storeMatch) {
      return { type: 'store', id: decodeURIComponent(storeMatch[1]) };
    }
  } catch {
    // invalid URL
  }
  return null;
}

async function fetchProduct(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/v1/listings/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.listing || data || null;
  } catch {
    return null;
  }
}

async function fetchProfile(peerId: string) {
  try {
    const res = await fetch(`${API_BASE}/v1/profiles/${peerId}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data || json || null;
  } catch {
    return null;
  }
}

function clampDimension(val: string | null, min: number, max: number, fallback: number): number {
  if (!val) return fallback;
  const n = parseInt(val, 10);
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const url = searchParams.get('url');
  const format = searchParams.get('format');

  if (format && format !== 'json') {
    return NextResponse.json(
      { error: 'Only JSON format is supported' },
      { status: 501, headers: corsHeaders() }
    );
  }

  if (!url) {
    return NextResponse.json(
      { error: 'Missing required parameter: url' },
      { status: 400, headers: corsHeaders() }
    );
  }

  const parsed = parseUrl(url);
  if (!parsed) {
    return NextResponse.json(
      { error: 'URL not recognized. Supported patterns: /product/{slug}, /store/{peerId}' },
      { status: 404, headers: corsHeaders() }
    );
  }

  const maxWidth = clampDimension(searchParams.get('maxwidth'), 200, 800, 400);
  const maxHeight = clampDimension(searchParams.get('maxheight'), 100, 600, 200);

  if (parsed.type === 'product') {
    const product = await fetchProduct(parsed.id);
    if (!product?.item) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404, headers: corsHeaders() }
      );
    }

    const title = product.item.title || parsed.id;
    const firstImage = product.item.images?.[0];
    const thumbnailUrl = getImageUrl(
      firstImage?.medium || firstImage?.small || firstImage?.original
    );
    const encodedId = encodeURIComponent(parsed.id);
    const embedSrc = `${SITE_URL}/embed/product/${encodedId}${parsed.peerID ? `?peerID=${encodeURIComponent(parsed.peerID)}` : ''}`;

    const response: OEmbedResponse = {
      version: '1.0',
      type: 'rich',
      provider_name: 'Mobazha',
      provider_url: SITE_URL,
      title: stripHtml(title),
      width: maxWidth,
      height: maxHeight,
      html: `<iframe src="${escapeHtmlAttr(embedSrc)}" width="${maxWidth}" height="${maxHeight}" frameborder="0" style="border:0;border-radius:12px;overflow:hidden" loading="lazy"></iframe>`,
      ...(thumbnailUrl && { thumbnail_url: thumbnailUrl }),
    };

    return NextResponse.json(response, { headers: corsHeaders() });
  }

  // store
  const profile = await fetchProfile(parsed.id);
  if (!profile) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404, headers: corsHeaders() });
  }

  const name = profile.name || profile.handle || parsed.id.slice(0, 12);
  const avatarHash = profile.avatarHashes?.medium || profile.avatarHashes?.small;
  const thumbnailUrl = getImageUrl(avatarHash);
  const encodedId = encodeURIComponent(parsed.id);
  const embedSrc = `${SITE_URL}/embed/store/${encodedId}`;
  const storeHeight = Math.min(maxHeight, 120);

  const response: OEmbedResponse = {
    version: '1.0',
    type: 'rich',
    provider_name: 'Mobazha',
    provider_url: SITE_URL,
    title: `${stripHtml(name)}'s Store`,
    width: maxWidth,
    height: storeHeight,
    html: `<iframe src="${escapeHtmlAttr(embedSrc)}" width="${maxWidth}" height="${storeHeight}" frameborder="0" style="border:0;border-radius:12px;overflow:hidden" loading="lazy"></iframe>`,
    ...(thumbnailUrl && { thumbnail_url: thumbnailUrl }),
  };

  return NextResponse.json(response, { headers: corsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
