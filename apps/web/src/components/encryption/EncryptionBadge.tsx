'use client';

import { Lock, LockOpen, Shield, ShieldOff, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type EncryptionStatus = 'encrypted' | 'decrypted' | 'decrypting' | 'failed' | 'none';

interface EncryptionBadgeProps {
  status: EncryptionStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const statusConfig = {
  encrypted: {
    icon: Lock,
    label: '已加密',
    tooltip: '此内容已端到端加密，只有授权用户可以查看',
    className: 'text-amber-500',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
  },
  decrypted: {
    icon: LockOpen,
    label: '已解密',
    tooltip: '内容已成功解密',
    className: 'text-emerald-500',
    bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  decrypting: {
    icon: Loader2,
    label: '解密中',
    tooltip: '正在解密内容...',
    className: 'text-blue-500 animate-spin',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
  },
  failed: {
    icon: AlertTriangle,
    label: '解密失败',
    tooltip: '无法解密此内容，您可能没有访问权限',
    className: 'text-red-500',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
  },
  none: {
    icon: ShieldOff,
    label: '未加密',
    tooltip: '此内容未加密',
    className: 'text-gray-400',
    bgClass: 'bg-gray-100 dark:bg-gray-800',
  },
};

export function EncryptionBadge({
  status,
  size = 'md',
  showLabel = false,
  className,
}: EncryptionBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-full',
              config.bgClass,
              className
            )}
          >
            <Icon className={cn(sizeClasses[size], config.className)} />
            {showLabel && (
              <span className={cn('text-xs font-medium', config.className)}>{config.label}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// 简化版锁图标
export function LockIcon({
  locked = true,
  size = 'md',
  className,
}: {
  locked?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const Icon = locked ? Lock : LockOpen;
  const colorClass = locked ? 'text-amber-500' : 'text-emerald-500';

  return <Icon className={cn(sizeClasses[size], colorClass, className)} />;
}

// 加密状态指示器
export function EncryptionIndicator({
  encrypted,
  decrypted = false,
  size = 'md',
}: {
  encrypted: boolean;
  decrypted?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (!encrypted) {
    return null;
  }

  const status: EncryptionStatus = decrypted ? 'decrypted' : 'encrypted';
  return <EncryptionBadge status={status} size={size} />;
}

// E2E 加密标识
export function E2EBadge({ className }: { className?: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
              'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
              className
            )}
          >
            <Shield className="w-3 h-3" />
            <span>E2E</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>端到端加密 - 只有您和授权用户可以查看此内容</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

