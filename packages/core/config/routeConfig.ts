/**
 * 路由配置
 *
 * 定义公开路由和私有路由，用于路由保护
 */

/**
 * 公开路由模式列表（无需登录即可访问）
 * 支持动态参数（如 :peerId, :slug）
 */
export const PUBLIC_ROUTES = [
  // 首页
  '/',

  // 认证相关
  '/login',
  '/offline',

  // 浏览类页面（允许游客访问）
  '/search',
  '/store/:peerId',
  '/product/:slug',

  // 购物车（anonymous browsing in Mini App）
  '/cart',

  // 市场（不含 admin 和 sell 子路由）
  '/marketplace',
  '/marketplace/:slug',

  // 仲裁员列表
  '/moderators',
  '/moderators/:id',

  // Collections（standalone 独立站公开浏览）
  '/collections',
  '/collections/:id',
] as const;

/**
 * 私有路由模式列表（需要登录才能访问）
 * 这些路由会被 ProtectedRoute 保护
 */
export const PRIVATE_ROUTES = [
  // 钱包
  '/wallet',
  '/wallet/:symbol',

  // 订单
  '/orders',
  '/orders/:orderId',

  // 结账（cart is now public for anonymous browsing）
  '/checkout',
  '/checkout/moderator',
  '/checkout/payment-method',

  // 个人中心
  '/me',
  '/profile',
  '/notifications',

  // 商品管理
  '/listing/new',
  '/listing/edit/:slug',
  '/listing/import',

  // 设置
  '/settings',
  '/settings/:section',
  '/settings/access-control/:section',
  '/settings/access-control/product-groups/:groupId',
  '/settings/access-control/product-groups/:groupId/authorization',
  '/settings/access-control/user-groups/:groupId/members',
  '/settings/product-groups/:groupId/authorization',
  '/settings/user-groups/:groupId/members',

  // 仲裁案例管理
  '/moderation/cases',
  '/moderation/cases/:orderId',

  // RWA 仪表盘
  '/rwa-dashboard',

  // 支付
  '/payment',

  // 市场管理（需要登录）
  '/marketplace/:slug/admin',
  '/marketplace/:slug/admin/applications',
  '/marketplace/:slug/admin/products',
  '/marketplace/:slug/sell',
] as const;

/**
 * 将路由模式转换为正则表达式
 * @param pattern 路由模式，如 '/store/:peerId'
 * @returns 用于匹配路径的正则表达式
 */
function patternToRegex(pattern: string): RegExp {
  // 转义特殊字符，然后将 :param 替换为匹配任意非斜杠字符的正则
  const escaped = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // 转义特殊字符
    .replace(/\\:\w+/g, '[^/]+'); // :param -> [^/]+

  return new RegExp(`^${escaped}$`);
}

/**
 * 检查路径是否匹配某个路由模式
 * @param pathname 当前路径
 * @param pattern 路由模式
 */
function matchPattern(pathname: string, pattern: string): boolean {
  // 精确匹配
  if (pathname === pattern) {
    return true;
  }

  // 包含动态参数时使用正则匹配
  if (pattern.includes(':')) {
    const regex = patternToRegex(pattern);
    return regex.test(pathname);
  }

  return false;
}

/**
 * 检查路径是否为公开路由（无需登录）
 * @param pathname 当前路径
 * @returns true 表示公开路由，false 表示需要登录
 */
export function isPublicRoute(pathname: string): boolean {
  // 移除尾部斜杠（除了根路径）
  const normalizedPath = pathname === '/' ? '/' : pathname.replace(/\/$/, '');

  // 检查是否匹配任意公开路由模式
  for (const pattern of PUBLIC_ROUTES) {
    if (matchPattern(normalizedPath, pattern)) {
      return true;
    }
  }

  return false;
}

/**
 * 检查路径是否为私有路由（需要登录）
 * @param pathname 当前路径
 * @returns true 表示私有路由，false 表示公开路由或未知路由
 */
export function isPrivateRoute(pathname: string): boolean {
  return !isPublicRoute(pathname);
}

/**
 * 获取所有公开路由模式
 */
export function getPublicRoutes(): readonly string[] {
  return PUBLIC_ROUTES;
}

/**
 * 获取所有私有路由模式
 */
export function getPrivateRoutes(): readonly string[] {
  return PRIVATE_ROUTES;
}
