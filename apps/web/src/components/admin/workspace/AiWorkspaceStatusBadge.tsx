'use client';

import { useI18n, type AIStatus } from '@mobazha/core';
import { Badge } from '@/components/ui/badge';
import { Bot, Cloud, FileText, Image, Server } from 'lucide-react';
import { cn } from '@/lib/utils';

const isOutpost = typeof __OUTPOST__ !== 'undefined' && __OUTPOST__;

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
      <Badge variant="secondary" className={cn('text-xs font-normal gap-1', className)}>
        <Server className="w-3 h-3" />
        {t('admin.workspace.badgeLocalAi')}
      </Badge>
    );
  }

  if (status.source === 'byok') {
    return (
      <Badge variant="secondary" className={cn('text-xs font-normal gap-1', className)}>
        <Bot className="w-3 h-3" />
        {t('admin.workspace.badgeByok')}
      </Badge>
    );
  }

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      <Badge variant="secondary" className="text-xs font-normal gap-1">
        <Cloud className="w-3 h-3" />
        {t('admin.workspace.badgePlatform')}
      </Badge>
      {status.text_available !== false && (
        <Badge variant="outline" className="text-xs font-normal gap-1">
          <FileText className="w-3 h-3" />
          {t('admin.integrations.aiTextRoute', { defaultValue: 'Text AI' })}
        </Badge>
      )}
      {status.vision_available !== false && (
        <Badge variant="outline" className="text-xs font-normal gap-1">
          <Image className="w-3 h-3" />
          {t('admin.integrations.aiVisionRoute', { defaultValue: 'Vision AI' })}
        </Badge>
      )}
    </div>
  );
}
