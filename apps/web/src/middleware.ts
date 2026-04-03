import { NextResponse, type NextRequest } from 'next/server';

/**
 * Branded subdomain root rewrite.
 *
 * When Gateway routes a request through {handle}.stores.mobazha.org,
 * it injects X-Store-PeerID and X-Store-Domain headers. This middleware
 * rewrites the root path `/` to `/store/{peerID}` so the store layout
 * renders the storefront. All other paths (product, cart, etc.) pass
 * through unchanged — they already work with the injected headers.
 */
export function middleware(request: NextRequest) {
  const storePeerID = request.headers.get('x-store-peerid');
  if (!storePeerID) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = `/store/${storePeerID}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, icons/, manifest.json, og-*.png (public assets)
     * - api/ routes (handled server-side)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|icons/|manifest\\.json|og-.*\\.png|api/).*)',
  ],
};
