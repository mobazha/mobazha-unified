'use client';

import { useI18n, type AIStatus } from '@mobazha/core';
import { Badge } from '@/components/ui/badge';
import { Bot, Cloud, Server } from 'lucide-react';
import { cn } from '@/lib/utils';

const isOutpost = typeof __OUTPOST__ !== 'undefined' && __OUTPOST__;

/** Neutral status chip — not CTA orange (secondary) or error red (destructive). */
const statusBadgeClass = 'text-xs font-normal gap-1 bg-muted text-muted-foreground border-border';

interface AiWorkspaceStatusBadgeProps {
  className?: string;
  status: AIStatus | null;
  loading: boolean;
}

export function AiWorkspaceStatusBadge({
  className,
  status,
  loading,
}: AiWorkspaceStatusBadgeProps) {
  const { t } = useI18n();

  if (loading) {
    return (
      <Badge variant="outline" className={cn('text-xs font-normal gap-1 animate-pulse', className)}>
        <Bot className="w-3 h-3" />…
      </Badge>
    );
  }

  if (!status?.available) {
    return (
      <Badge
        variant="outline"
        className={cn('text-xs font-normal gap-1', className)}
        data-testid="ai-workspace-status-off"
      >
        <Bot className="w-3 h-3" />
        {t('admin.workspace.badgeAiOff')}
      </Badge>
    );
  }

  if (isOutpost) {
    return (
      <Badge variant="outline" className={cn(statusBadgeClass, className)}>
        <Server className="w-3 h-3" />
        {t('admin.workspace.badgeLocalAi')}
      </Badge>
    );
  }

  if (status.source === 'byok') {
    return (
      <Badge variant="outline" className={cn(statusBadgeClass, className)}>
        <Bot className="w-3 h-3" />
        {t('admin.workspace.badgeByok')}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(statusBadgeClass, className)}
      data-testid="ai-workspace-status-platform"
      title={t('admin.workspace.badgePlatform')}
    >
      <Cloud className="w-3 h-3" />
      {t('admin.workspace.badgeReady')}
    </Badge>
  );
}
