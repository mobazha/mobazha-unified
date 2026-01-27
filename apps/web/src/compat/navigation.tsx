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
 */
export function useRouter() {
  const navigate = useNavigate();
  const location = useLocation();

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
    // 兼容 pathname 属性
    pathname: location.pathname,
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
