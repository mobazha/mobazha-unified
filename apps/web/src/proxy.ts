/**
 * Next.js Proxy - API 代理 + 路由保护 (Next.js 16+)
 *
 * 两个职责：
 * 1. 代理 /v1/*, /api/*, /info/* 到后端，剥离 WWW-Authenticate header
 *    （防止浏览器弹出原生 Basic Auth 登录框，等效于 Vite 的 withStripWwwAuth）
 * 2. 页面路由保护（公开路由放行，私有路由检查 cookie）
 *
 * 主要的认证保护依赖客户端的 ProtectedRoute 组件和 AuthProvider。
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { REQUEST_URL_HEADER } from '@/lib/requestUrl';

// Server-side proxy traffic must use the Docker-internal endpoint when available.
// NEXT_PUBLIC_API_BASE_URL is browser-facing and may point at localhost on the host,
// which resolves back to this frontend container when used from inside Docker.
const API_BASE =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://miniapptest.mobazha.org';
const INFO_API_BASE =
  process.env.NEXT_PUBLIC_INFO_API_URL || process.env.INTERNAL_INFO_API_URL || API_BASE;

const PROXY_PREFIXES = ['/v1/', '/api/', '/info/', '/platform/'];

/** Forward full request URL to RSC (layouts / opengraph-image cannot use searchParams). */
function nextWithRequestUrl(request: NextRequest, reqHeaders?: Headers): NextResponse {
  const headers = reqHeaders ?? new Headers(request.headers);
  headers.set(REQUEST_URL_HEADER, request.url);
  return NextResponse.next({ request: { headers } });
}

function shouldProxyToBackend(pathname: string): boolean {
  return PROXY_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

/**
 * Proxy API requests to backend, stripping WWW-Authenticate header.
 * Equivalent to Vite's withStripWwwAuth() helper.
 */
async function proxyToBackend(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;
  // Browser search uses `/info/search/v1/*`; E2E info-api listens on `/search/v1/*` (port 18082).
  const upstream = pathname.startsWith('/info/')
    ? `${INFO_API_BASE.replace(/\/$/, '')}${pathname.slice('/info'.length)}${search}`
    : `${API_BASE}${pathname}${search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('host', new URL(upstream).host);
  headers.set('accept-encoding', 'identity');

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    // @ts-expect-error duplex is required for streaming request bodies in Node.js fetch
    init.duplex = 'half';
  }

  try {
    const response = await fetch(upstream, init);
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('www-authenticate');
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Proxy error:', pathname, error);
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
  }
}

/**
 * 公开路由模式列表（与 @mobazha/core/config/routeConfig.ts 保持同步）
 * 在 proxy 中需要独立定义，因为运行时限制
 */
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/offline',
  '/search',
  '/store/',
  '/product/',
  '/marketplace',
  '/moderators',
  '/collections',
  '/collections/',
  '/collectibles',
];

/**
 * 检查路径是否为公开路由
 */
function isPublicRoute(pathname: string): boolean {
  // 精确匹配
  if (PUBLIC_ROUTES.includes(pathname)) {
    return true;
  }

  // 前缀匹配（用于动态路由如 /store/:peerId）
  for (const route of PUBLIC_ROUTES) {
    if (route.endsWith('/') && pathname.startsWith(route)) {
      // /store/ 匹配 /store/xxx 但不匹配 /store/xxx/admin
      const remaining = pathname.slice(route.length);
      // 只匹配一级路径（不含额外的斜杠）
      if (!remaining.includes('/')) {
        return true;
      }
    }
  }

  // 特殊处理 /marketplace/:slug（不含 /admin 和 /sell 子路由）
  if (pathname.startsWith('/marketplace/')) {
    const segments = pathname.split('/').filter(Boolean);
    // /marketplace/xxx 是公开的（2 段）
    // /marketplace/xxx/admin 或 /marketplace/xxx/sell 不是公开的（3 段或更多）
    if (segments.length === 2) {
      return true;
    }
  }

  // 特殊处理 /moderators/:id
  if (pathname.startsWith('/moderators/')) {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 2) {
      return true;
    }
  }

  // 特殊处理 /collectibles/:mint（单级 mint 凭证详情公开）
  // 排除 /collectibles/redemptions 与 /collectibles/redeem/*
  if (pathname.startsWith('/collectibles/')) {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 2 && segments[0] === 'collectibles') {
      const sub = segments[1];
      if (sub !== 'redemptions' && sub !== 'redeem') {
        return true;
      }
    }
  }

  // 特殊处理 /deal/:token（公开 Deal Link 浏览）
  if (pathname.startsWith('/deal/')) {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 2 && segments[0] === 'deal') {
      return true;
    }
  }

  // 特殊处理 /promo/:sellerPeerID/:token（公开推广链接入口）
  if (pathname.startsWith('/promo/')) {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 2 && segments[0] === 'promo') {
      return true;
    }
  }

  return false;
}

/**
 * 检查是否有认证信息
 * 支持多种认证方式：
 * - mobazha-auth cookie（显式设置的 auth cookie）
 * - mobazha-user-storage cookie（Zustand persist cookie 模式）
 */
function hasAuthCookie(request: NextRequest): boolean {
  // 检查显式的 auth cookie
  const authCookie = request.cookies.get('mobazha-auth');
  if (authCookie?.value) {
    return true;
  }

  // 检查 Zustand persist 的 cookie（如果配置为使用 cookie）
  const zustandCookie = request.cookies.get('mobazha-user-storage');
  if (zustandCookie?.value) {
    try {
      const data = JSON.parse(zustandCookie.value);
      if (data.state?.isAuthenticated && data.state?.token) {
        return true;
      }
    } catch {
      // 解析失败，继续检查其他方式
    }
  }

  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API 代理必须在所有其他逻辑之前处理，
  // 否则 storefront cookie 设置会提前返回导致 API 请求变成 404。
  if (shouldProxyToBackend(pathname)) {
    return proxyToBackend(request);
  }

  // Branded subdomain / custom domain: Gateway sets X-Store-PeerID.
  // We forward it as x-storefront-peerid for Server Components and set a
  // client-readable cookie. NO URL rewriting — page.tsx renders the
  // standalone-style homepage directly when it detects storefront mode.
  const storePeerID = request.headers.get('x-store-peerid');
  if (storePeerID) {
    const reqHeaders = new Headers(request.headers);
    reqHeaders.set('x-storefront-peerid', storePeerID);

    reqHeaders.set(REQUEST_URL_HEADER, request.url);
    const response = NextResponse.next({ request: { headers: reqHeaders } });
    response.cookies.set('mbz-storefront', storePeerID, {
      path: '/',
      sameSite: 'lax',
      maxAge: 86400,
    });
    return response;
  }

  // 跳过静态资源和 Next.js 内部路由
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/internal/') ||
    pathname.includes('.')
  ) {
    return nextWithRequestUrl(request);
  }

  // 公开路由直接放行
  if (isPublicRoute(pathname)) {
    return nextWithRequestUrl(request);
  }

  // 检查是否有认证 cookie
  // 注意：由于主要使用 localStorage，这里的检查是可选的
  // 如果没有 cookie，仍然放行请求，让客户端的 ProtectedRoute 处理
  const hasAuth = hasAuthCookie(request);

  if (!hasAuth) {
    // 没有 cookie 认证，但仍然放行
    // 让客户端的 ProtectedRoute/AuthProvider 处理重定向
    // 这样可以避免闪烁，因为客户端可以检查 localStorage
    // 可选：如果想在 proxy 层面强制重定向，取消下面的注释
    // const loginUrl = new URL('/login', request.url);
    // loginUrl.searchParams.set('redirect', pathname);
    // return NextResponse.redirect(loginUrl);
  }

  return nextWithRequestUrl(request);
}

/**
 * Proxy 配置
 * 匹配：
 * - /v1/*, /api/*, /info/* → 代理到后端（剥离 WWW-Authenticate）
 * - 页面路由 → 路由保护检查
 * 排除：
 * - /_next/ (Next.js 内部)
 * - /internal/ (Next.js local API routes)
 * - 静态文件
 */
export const config = {
  matcher: [
    '/v1/:path*',
    '/api/:path*',
    '/info/:path*',
    '/((?!_next/static|_next/image|internal/|favicon.ico|.*\\..*).*)',
  ],
};
