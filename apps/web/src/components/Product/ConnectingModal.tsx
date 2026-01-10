'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { useI18n, useUserStore, getImageUrl } from '@mobazha/core';
import { Github, ExternalLink } from 'lucide-react';

export interface ConnectingModalProps {
  /** 是否显示 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 卖家名称 */
  vendorName?: string;
  /** 卖家头像 */
  vendorAvatar?: string;
  /** 商品名称 */
  productTitle?: string;
  /** 是否连接失败 */
  isFailed?: boolean;
  /** 重试回调 */
  onRetry?: () => void;
}

/**
 * P2P 连接状态弹框
 * 在点对点网络中加载商品时显示连接状态
 */
export function ConnectingModal({
  open,
  onClose,
  vendorName,
  vendorAvatar,
  productTitle,
  isFailed = false,
  onRetry,
}: ConnectingModalProps) {
  const { t } = useI18n();
  const { profile } = useUserStore();

  // 获取当前用户头像
  const ownAvatarUrl = profile?.avatarHashes?.small
    ? getImageUrl(profile.avatarHashes.small)
    : undefined;

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md w-[90vw] p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{t('p2p.connecting')}</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* 卖家信息头部 */}
          {(vendorName || vendorAvatar) && (
            <div className="flex items-center gap-2 justify-center">
              {vendorAvatar && (
                <Avatar src={vendorAvatar} name={vendorName} size="xs" />
              )}
              {vendorName && (
                <span className="text-sm font-medium text-foreground">{vendorName}</span>
              )}
            </div>
          )}

          {/* 连接动画区域 */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-4">
              {/* 自己的头像 */}
              <div className="relative">
                <Avatar
                  src={ownAvatarUrl}
                  name={profile?.name || 'Me'}
                  size="lg"
                  className="ring-2 ring-background shadow-lg"
                />
                {!isFailed && (
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />
                )}
              </div>

              {/* 连接箭头/动画 */}
              <div className="relative flex items-center w-16">
                {!isFailed ? (
                  /* 连接中动画 - 流动的点 */
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                ) : (
                  /* 连接失败 - 断开的线 */
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-8 h-8 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </div>
                )}
              </div>

              {/* 卖家头像 */}
              <div className={`relative ${isFailed ? 'opacity-50' : ''}`}>
                <Avatar
                  src={vendorAvatar}
                  name={vendorName || 'Vendor'}
                  size="lg"
                  className="ring-2 ring-background shadow-lg"
                />
                {!isFailed && (
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-muted rounded-full border-2 border-background animate-pulse" />
                )}
              </div>
            </div>

            {/* 状态文字 */}
            <div className="mt-6 text-center">
              {isFailed ? (
                <h2 className="text-xl font-semibold text-destructive">
                  {t('p2p.failedToConnect')}
                </h2>
              ) : (
                <h2 className="text-xl font-semibold text-foreground">
                  {t('p2p.connecting')}
                </h2>
              )}
            </div>

            {/* 说明文字 */}
            <div className="mt-3 text-center max-w-xs">
              {productTitle ? (
                <p className="text-sm text-muted-foreground">
                  {isFailed ? (
                    t('p2p.failedTextListing', { listing: productTitle })
                  ) : (
                    <>
                      {t('p2p.loadingText', { name: productTitle })}
                      <br />
                      <span className="text-xs opacity-75">{t('p2p.fromP2pNetwork')}</span>
                    </>
                  )}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isFailed ? t('p2p.failedGeneric') : t('p2p.connectingToVendor')}
                </p>
              )}
            </div>
          </div>

          {/* 社交链接 */}
          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground mb-3">
              {t('p2p.socialHeading')}
            </p>
            <div className="flex items-center justify-center gap-4">
              <a
                href="https://twitter.com/mobazha"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-[#1DA1F2] transition-colors"
                aria-label="Twitter"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://www.reddit.com/r/Mobazha/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-[#FF4500] transition-colors"
                aria-label="Reddit"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                </svg>
              </a>
              <a
                href="https://github.com/Mobazha/mobazha"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://mobazha.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Website"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex border-t">
          <Button
            variant="ghost"
            className="flex-1 rounded-none h-12 text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            {t('common.cancel')}
          </Button>
          {isFailed && onRetry && (
            <Button
              variant="ghost"
              className="flex-1 rounded-none h-12 text-primary hover:text-primary border-l"
              onClick={onRetry}
            >
              {t('common.retry')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
