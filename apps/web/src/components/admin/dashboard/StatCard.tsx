import React from 'react';
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
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  color = 'primary',
  loading,
}: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5" data-testid="admin-stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          )}
          {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${COLOR_MAP[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
