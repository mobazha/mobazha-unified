/**
 * next/link 兼容层
 * 将 Next.js 的 Link 组件映射到 React Router 的 Link
 */
import { Link as RouterLink } from 'react-router-dom';
import { forwardRef, type ReactNode, type AnchorHTMLAttributes } from 'react';

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  children?: ReactNode;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  passHref?: boolean;
  legacyBehavior?: boolean;
}

const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  (
    { href, children, replace, prefetch, scroll, shallow, passHref, legacyBehavior, ...props },
    ref
  ) => {
    // 外部链接使用普通 a 标签
    if (href.startsWith('http') || href.startsWith('//')) {
      return (
        <a ref={ref} href={href} {...props}>
          {children}
        </a>
      );
    }

    return (
      <RouterLink ref={ref} to={href} replace={replace} {...props}>
        {children}
      </RouterLink>
    );
  }
);

Link.displayName = 'Link';

export default Link;
