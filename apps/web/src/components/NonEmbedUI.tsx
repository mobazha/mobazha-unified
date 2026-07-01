'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Hides children when the current route is an embed page (/embed/*).
 * Used in root layout to suppress MobileNav, ChatSystem, etc. in iframes.
 */
export function NonEmbedUI({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/embed' || pathname?.startsWith('/embed/')) return null;
  return <>{children}</>;
}
