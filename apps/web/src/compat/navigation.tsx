/**
 * next/navigation 兼容层
 * 将 Next.js 的导航 hooks 映射到 React Router
 */
import {
  useNavigate,
  useParams as useRouterParams,
  useSearchParams as useRouterSearchParams,
  useLocation,
} from 'react-router-dom';

/**
 * useRouter 兼容层
 * 模拟 Next.js 的 useRouter hook
 *
 * 注意：Next.js App Router 的 useRouter() 不包含 pathname 属性，
 * 应使用 usePathname() 获取当前路径。这里通过 getter 提供 pathname
 * 以保持向后兼容，但推荐使用 usePathname()。
 */
export function useRouter() {
  const navigate = useNavigate();
  const location = useLocation();

  // 使用 getter 确保 pathname 始终返回最新值
  // 注意：由于 JavaScript 对象的限制，如果用户缓存了返回的对象，
  // getter 会引用创建时的 location 对象。对于完全响应式的 pathname，
  // 请使用 usePathname() hook。
  return {
    push: (url: string, options?: { scroll?: boolean }) => {
      navigate(url);
      if (options?.scroll !== false) {
        window.scrollTo(0, 0);
      }
    },
    replace: (url: string, options?: { scroll?: boolean }) => {
      navigate(url, { replace: true });
      if (options?.scroll !== false) {
        window.scrollTo(0, 0);
      }
    },
    back: () => navigate(-1),
    forward: () => navigate(1),
    refresh: () => window.location.reload(),
    prefetch: (_url: string) => {
      // Vite 不支持 prefetch，忽略
    },
    // 使用 getter 提供动态 pathname 访问
    // 推荐使用 usePathname() 以获得更好的响应式行为
    get pathname() {
      return location.pathname;
    },
  };
}

/**
 * useParams 兼容层
 * 返回路由参数
 */
export function useParams<
  T extends Record<string, string | string[]> = Record<string, string>,
>(): T {
  return useRouterParams() as T;
}

/**
 * useSearchParams 兼容层
 * 返回 URLSearchParams 对象
 */
export function useSearchParams(): URLSearchParams {
  const [searchParams] = useRouterSearchParams();
  return searchParams;
}

/**
 * usePathname 兼容层
 * 返回当前路径
 */
export function usePathname(): string {
  const location = useLocation();
  return location.pathname;
}

/**
 * redirect 函数（服务端使用，客户端抛出错误）
 */
export function redirect(url: string): never {
  // 在客户端，我们只能通过 navigate 实现
  window.location.href = url;
  throw new Error('NEXT_REDIRECT');
}

/**
 * notFound 函数
 */
export function notFound(): never {
  throw new Error('NEXT_NOT_FOUND');
}
