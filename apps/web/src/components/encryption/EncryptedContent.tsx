'use client';

import { useState, useEffect, ReactNode } from 'react';
import { Lock, Eye, EyeOff, Key, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EncryptionBadge, type EncryptionStatus } from './EncryptionBadge';

interface EncryptedContentProps {
  encrypted: boolean;
  hasAccess: boolean;
  children: ReactNode;
  fallback?: ReactNode;
  onRequestAccess?: () => void;
  className?: string;
}

/**
 * 加密内容容器
 * 当内容加密且用户没有访问权限时显示模糊效果和请求访问按钮
 */
export function EncryptedContent({
  encrypted,
  hasAccess,
  children,
  fallback,
  onRequestAccess,
  className,
}: EncryptedContentProps) {
  const [status, setStatus] = useState<EncryptionStatus>('encrypted');
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    if (!encrypted) {
      setStatus('none');
      return;
    }

    if (hasAccess) {
      // 模拟解密过程
      setIsDecrypting(true);
      setStatus('decrypting');

      const timer = setTimeout(() => {
        setStatus('decrypted');
        setIsDecrypting(false);
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setStatus('encrypted');
    }
  }, [encrypted, hasAccess]);

  // 未加密，直接显示内容
  if (!encrypted) {
    return <>{children}</>;
  }

  // 有访问权限，显示解密内容
  if (hasAccess && status === 'decrypted') {
    return (
      <div className={cn('relative', className)}>
        <div className="absolute top-2 right-2 z-10">
          <EncryptionBadge status="decrypted" size="sm" />
        </div>
        {children}
      </div>
    );
  }

  // 正在解密
  if (isDecrypting) {
    return (
      <div className={cn('relative', className)}>
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg z-10">
          <div className="flex flex-col items-center gap-2 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-sm text-gray-600 dark:text-gray-400">正在解密内容...</p>
          </div>
        </div>
        <div className="blur-lg pointer-events-none">{fallback || children}</div>
      </div>
    );
  }

  // 无访问权限，显示模糊内容
  return (
    <div className={cn('relative', className)}>
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100/30 dark:bg-gray-800/30 backdrop-blur-sm rounded-lg z-10">
        <div className="flex flex-col items-center gap-3 text-center p-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Lock className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">加密内容</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              此内容已加密，您需要获得授权才能查看
            </p>
          </div>
          {onRequestAccess && (
            <Button onClick={onRequestAccess} variant="outline" size="sm">
              <Key className="w-4 h-4 mr-2" />
              请求访问权限
            </Button>
          )}
        </div>
      </div>
      <div className="blur-lg pointer-events-none">{fallback || children}</div>
    </div>
  );
}

/**
 * 加密图片组件
 */
interface EncryptedImageProps {
  src: string;
  alt: string;
  encrypted?: boolean;
  hasAccess?: boolean;
  blurredSrc?: string;
  className?: string;
  onRequestAccess?: () => void;
}

export function EncryptedImage({
  src,
  alt,
  encrypted = false,
  hasAccess = true,
  blurredSrc,
  className,
  onRequestAccess,
}: EncryptedImageProps) {
  const [showReal, setShowReal] = useState(!encrypted || hasAccess);

  if (!encrypted) {
    return <img src={src} alt={alt} className={className} />;
  }

  if (hasAccess) {
    return (
      <div className="relative">
        <img src={src} alt={alt} className={className} />
        <div className="absolute top-2 right-2">
          <EncryptionBadge status="decrypted" size="sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <img
        src={blurredSrc || src}
        alt={alt}
        className={cn(className, 'filter blur-lg')}
        style={{ filter: 'blur(20px)' }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-center">
          <Lock className="w-8 h-8 text-amber-500" />
          <p className="text-sm text-white font-medium drop-shadow-lg">加密图片</p>
          {onRequestAccess && (
            <Button onClick={onRequestAccess} variant="secondary" size="sm">
              请求访问
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 加密文本组件
 */
interface EncryptedTextProps {
  text: string;
  encrypted?: boolean;
  hasAccess?: boolean;
  placeholder?: string;
  className?: string;
}

export function EncryptedText({
  text,
  encrypted = false,
  hasAccess = true,
  placeholder = '••••••••••••',
  className,
}: EncryptedTextProps) {
  const [revealed, setRevealed] = useState(false);

  if (!encrypted) {
    return <span className={className}>{text}</span>;
  }

  if (!hasAccess) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-gray-400', className)}>
        <Lock className="w-3 h-3" />
        {placeholder}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {revealed ? text : placeholder}
      <button
        onClick={() => setRevealed(!revealed)}
        className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
      >
        {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      </button>
    </span>
  );
}

/**
 * 加密价格组件
 */
interface EncryptedPriceProps {
  amount: number;
  currency: string;
  encrypted?: boolean;
  hasAccess?: boolean;
  className?: string;
}

export function EncryptedPrice({
  amount,
  currency,
  encrypted = false,
  hasAccess = true,
  className,
}: EncryptedPriceProps) {
  if (!encrypted || hasAccess) {
    return (
      <span className={className}>
        {currency} {amount.toFixed(2)}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1 text-gray-400', className)}>
      <Lock className="w-3 h-3" />
      {currency} •••
    </span>
  );
}

