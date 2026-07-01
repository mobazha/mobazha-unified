'use client';

import { SUPPORTED_PROVIDERS } from '@mobazha/core';
import type { OAuthProvider } from '@mobazha/core';

interface ProviderIconProps {
  provider: OAuthProvider;
  className?: string;
}

/**
 * OAuth Provider 图标组件
 * 使用 Simple Icons CDN 渲染 SVG 图标
 */
export function ProviderIcon({ provider, className = 'w-6 h-6' }: ProviderIconProps) {
  const providerInfo = SUPPORTED_PROVIDERS.find(p => p.id === provider);

  if (providerInfo?.icon) {
    return (
      <img
        src={providerInfo.icon}
        alt={providerInfo.name}
        className={`object-contain ${className}`}
      />
    );
  }

  return <span className="text-xl">🔗</span>;
}

export default ProviderIcon;
