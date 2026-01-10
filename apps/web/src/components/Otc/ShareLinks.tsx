'use client';

import { memo, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, ExternalLink, MessageCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import type { ShareLink } from '@mobazha/core';

interface ShareLinksProps {
  links: ShareLink;
  className?: string;
}

/**
 * 分享链接组件
 * 用于展示和复制私密订单分享链接
 */
export const ShareLinks = memo(function ShareLinks({
  links,
  className,
}: ShareLinksProps) {
  const { toast } = useToast();
  const [copiedWeb, setCopiedWeb] = useState(false);
  const [copiedTelegram, setCopiedTelegram] = useState(false);

  const copyToClipboard = useCallback(async (text: string, type: 'web' | 'telegram') => {
    try {
      await navigator.clipboard.writeText(text);
      
      if (type === 'web') {
        setCopiedWeb(true);
        setTimeout(() => setCopiedWeb(false), 2000);
      } else {
        setCopiedTelegram(true);
        setTimeout(() => setCopiedTelegram(false), 2000);
      }

      toast({
        title: '已复制',
        description: '链接已复制到剪贴板',
      });
    } catch {
      toast({
        title: '复制失败',
        description: '请手动选择并复制链接',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const openLink = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Web 链接 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Web 链接</label>
        <div className="flex gap-2">
          <Input
            value={links.webUrl}
            readOnly
            className="flex-1 bg-muted/50 text-sm"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => copyToClipboard(links.webUrl, 'web')}
            className="shrink-0"
          >
            {copiedWeb ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => openLink(links.webUrl)}
            className="shrink-0"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Telegram 链接 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Telegram Bot 链接
        </label>
        <div className="flex gap-2">
          <Input
            value={links.telegramUrl}
            readOnly
            className="flex-1 bg-muted/50 text-sm"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => copyToClipboard(links.telegramUrl, 'telegram')}
            className="shrink-0"
          >
            {copiedTelegram ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => openLink(links.telegramUrl)}
            className="shrink-0"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 分享提示 */}
      <div className="rounded-lg bg-muted/50 p-3">
        <p className="text-xs text-muted-foreground">
          💡 将链接分享到您的粉丝群（Telegram/Discord/微信），让粉丝可以直接通过链接购买。
          交易全程私密，仅买卖双方可见。
        </p>
      </div>
    </div>
  );
});

export default ShareLinks;
