'use client';

import { useState, useEffect, ReactNode, useMemo } from 'react';
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
  // 跟踪解密动画是否完成
  const [decryptionComplete, setDecryptionComplete] = useState(false);
  // 用于在 props 变化时重置状态的 key
  const [animationKey, setAnimationKey] = useState(0);

  // 从 props 派生基础状态（无需 effect）
  const baseStatus: EncryptionStatus = useMemo(() => {
    if (!encrypted) return 'none';
    if (!hasAccess) return 'encrypted';
    return 'decrypting'; // 有权限时默认进入解密状态
  }, [encrypted, hasAccess]);

  // 计算最终状态
  const status: EncryptionStatus =
    baseStatus === 'decrypting' && decryptionComplete ? 'decrypted' : baseStatus;

  const isDecrypting = baseStatus === 'decrypting' && !decryptionComplete;

  // 当需要重新开始解密动画时，更新 key 来触发重置
  const needsDecryption = encrypted && hasAccess;
  useEffect(() => {
    if (needsDecryption) {
      // 更新 key 触发下一个 effect 重新运行
      setAnimationKey(k => k + 1);
    }
  }, [needsDecryption]);

  // 处理解密动画计时器（只在 animationKey 变化时触发）
  useEffect(() => {
    if (!needsDecryption) {
      return;
    }

    // 重置并启动动画
    let isMounted = true;
    setDecryptionComplete(false);

    const timer = setTimeout(() => {
      if (isMounted) {
        setDecryptionComplete(true);
      }
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationKey]);

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
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm rounded-lg z-10">
          <div className="flex flex-col items-center gap-2 text-center">
            <Loader2 className="w-8 h-8 text-info animate-spin" />
            <p className="text-sm text-muted-foreground">正在解密内容...</p>
          </div>
        </div>
        <div className="blur-lg pointer-events-none">{fallback || children}</div>
      </div>
    );
  }

  // 无访问权限，显示模糊内容
  return (
    <div className={cn('relative', className)}>
      <div className="absolute inset-0 flex items-center justify-center bg-muted/30 backdrop-blur-sm rounded-lg z-10">
        <div className="flex flex-col items-center gap-3 text-center p-4">
          <div className="w-12 h-12 rounded-full bg-warning/15 flex items-center justify-center">
            <Lock className="w-6 h-6 text-warning" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">加密内容</h4>
            <p className="text-sm text-muted-foreground max-w-xs">
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
          <Lock className="w-8 h-8 text-warning" />
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
      <span className={cn('inline-flex items-center gap-1 text-muted-foreground/60', className)}>
        <Lock className="w-3 h-3" />
        {placeholder}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {revealed ? text : placeholder}
      <button onClick={() => setRevealed(!revealed)} className="p-0.5 hover:bg-muted rounded">
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
