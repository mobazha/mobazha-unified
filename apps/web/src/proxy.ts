/**
 * Next.js Proxy - 路由保护 (Next.js 16+)
 *
 * 注意：由于 token 存储在 localStorage 中，proxy 无法直接访问。
 * 此 proxy 主要用于：
 * 1. 检测公开路由，避免不必要的检查
 * 2. 检查 cookie 中的 auth 信息（如果启用了 cookie 认证）
 * 3. 检查 Zustand persist 的 cookie（如果配置了 cookie storage）
 *
 * 主要的认证保护依赖客户端的 ProtectedRoute 组件和 AuthProvider。
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

  // 跳过静态资源和 API 路由
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') // 静态文件如 favicon.ico, images 等
  ) {
    return NextResponse.next();
  }

  // 公开路由直接放行
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
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

  return NextResponse.next();
}

/**
 * Proxy 配置
 * 匹配除了以下路径外的所有请求：
 * - /_next/ (Next.js 内部路由)
 * - /api/ (API 路由)
 * - 静态文件 (带扩展名的文件)
 */
export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了：
     * - _next/static (静态文件)
     * - _next/image (图片优化 API)
     * - favicon.ico (favicon)
     * - public 目录下的文件
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
