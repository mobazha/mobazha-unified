import React from 'react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui';

const COLOR_MAP = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
} as const;

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sublabel?: string;
  color?: keyof typeof COLOR_MAP;
  loading?: boolean;
  href?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  color = 'primary',
  loading,
  href,
}: StatCardProps) {
  const content = (
    <div className="flex items-start justify-between">
      <div className="min-w-0">
        <p className="text-xs sm:text-sm text-muted-foreground truncate">{label}</p>
        {loading ? (
          <Skeleton className="h-6 sm:h-8 w-12 sm:w-16 mt-1" />
        ) : (
          <p className="text-lg sm:text-2xl font-bold text-foreground mt-1 truncate">{value}</p>
        )}
        {sublabel && (
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
            {sublabel}
          </p>
        )}
      </div>
      <div className={`p-1.5 sm:p-2.5 rounded-lg shrink-0 ${COLOR_MAP[color]}`}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
    </div>
  );

  const baseClass = 'bg-card border border-border rounded-xl p-3 sm:p-5';
  const interactiveClass = href
    ? ' hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer'
    : '';

  if (href) {
    return (
      <Link
        href={href}
        className={`block ${baseClass}${interactiveClass}`}
        data-testid="admin-stat-card"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={baseClass} data-testid="admin-stat-card">
      {content}
    </div>
  );
}
