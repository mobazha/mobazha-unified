'use client';

import React, { useCallback, useState } from 'react';
import { useI18n } from '@mobazha/core';
import { Share2, Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HStack } from '@/components/layouts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { useShare } from '@/hooks/useShare';
import { cn } from '@/lib/utils';

export interface ShareButtonProps {
  url: string;
  title: string;
  description?: string;
  className?: string;
}

const TWITTER_SHARE_BASE = 'https://twitter.com/intent/tweet';
const TELEGRAM_SHARE_BASE = 'https://t.me/share/url';

export function ShareButton({ url, title, description, className }: ShareButtonProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { share: platformShare, isTG } = useShare();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ description: t('share.linkCopied') });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ description: t('common.error'), variant: 'destructive' });
    }
  }, [url, toast, t]);

  const twitterUrl = `${TWITTER_SHARE_BASE}?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
  const telegramUrl = `${TELEGRAM_SHARE_BASE}?url=${encodeURIComponent(url)}&text=${encodeURIComponent(description ? `${title} - ${description}` : title)}`;

  const handleShareTwitter = useCallback(() => {
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  }, [twitterUrl]);

  const handleShareTelegram = useCallback(() => {
    window.open(telegramUrl, '_blank', 'noopener,noreferrer');
  }, [telegramUrl]);

  const shareText = description ? `${title} - ${description}` : title;

  if (isTG) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'min-h-[44px] min-w-[44px] text-foreground hover:bg-primary/10 hover:text-primary',
          className
        )}
        aria-label={t('share.shareProduct')}
        data-testid="share-button"
        onClick={() => platformShare({ url, text: shareText })}
      >
        <Share2 className="h-5 w-5" aria-hidden />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'min-h-[44px] min-w-[44px] text-foreground hover:bg-primary/10 hover:text-primary',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'motion-reduce:transition-none',
            className
          )}
          aria-label={t('share.shareProduct')}
          data-testid="share-button"
        >
          <Share2 className="h-5 w-5" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[180px] border-border bg-card motion-reduce:animate-none"
      >
        <DropdownMenuItem
          onClick={handleCopyLink}
          className="text-foreground focus:bg-primary/10 focus:text-primary focus-visible:ring-2 focus-visible:ring-ring"
        >
          <HStack gap="sm" align="center">
            {copied ? (
              <Check className="h-4 w-4 text-primary" aria-hidden />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" aria-hidden />
            )}
            <span>{t('share.copyLink')}</span>
          </HStack>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleShareTwitter}
          className="text-foreground focus:bg-primary/10 focus:text-primary focus-visible:ring-2 focus-visible:ring-ring"
        >
          <HStack gap="sm" align="center">
            <ExternalLink className="h-4 w-4 text-muted-foreground" aria-hidden />
            <span>{t('share.shareToTwitter')}</span>
          </HStack>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleShareTelegram}
          className="text-foreground focus:bg-primary/10 focus:text-primary focus-visible:ring-2 focus-visible:ring-ring"
        >
          <HStack gap="sm" align="center">
            <ExternalLink className="h-4 w-4 text-muted-foreground" aria-hidden />
            <span>{t('share.shareToTelegram')}</span>
          </HStack>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
