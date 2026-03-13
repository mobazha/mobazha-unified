'use client';

import React, { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { ModeratorSelector, Moderator } from '@/components/Payment';
import { useModerators } from '@/hooks';

/**
 * 移动端仲裁员选择页面
 * 点击即选择并自动返回（符合移动端体验）
 */
export default function ModeratorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  // 从 URL 获取返回地址和当前选中的仲裁员
  const returnUrl = searchParams.get('returnUrl') || '/checkout';
  const selectedModeratorId = searchParams.get('selected') || undefined;

  // 使用 useModerators hook 获取仲裁员列表
  const { moderators, isLoading } = useModerators({ autoFetch: true });

  // 获取当前选中的仲裁员对象
  const currentModerator = selectedModeratorId
    ? moderators.find(m => m.peerID === selectedModeratorId)
    : undefined;

  // 处理选择 - 点击即选择并自动返回
  const handleSelect = useCallback(
    (moderator: Moderator) => {
      // 使用 sessionStorage 存储选择的仲裁员
      sessionStorage.setItem('checkout_selected_moderator', JSON.stringify(moderator));
      // 自动返回上一页
      router.push(returnUrl);
    },
    [returnUrl, router]
  );

  // 处理返回
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // 跳过：不选仲裁人并返回
  const handleSkip = useCallback(() => {
    sessionStorage.removeItem('checkout_selected_moderator');
    router.push(returnUrl);
  }, [returnUrl, router]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 头部 */}
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center h-14 px-4 gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center justify-center w-11 h-11 -ml-2 rounded-full text-foreground touch-feedback active:bg-muted/50"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-medium text-foreground">{t('payment.selectModerator')}</span>
        </div>
      </header>

      {/* 内容区域 - 说明 + 跳过 + 列表 */}
      <main className="flex-1 p-3">
        <p className="text-sm text-muted-foreground mb-4">{t('payment.moderatorRoleExplain')}</p>
        <button
          type="button"
          onClick={handleSkip}
          className="w-full mb-4 py-2.5 rounded-lg border border-border bg-muted/50 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          {t('payment.noModeratorNeeded')}
        </button>
        <ModeratorSelector
          selectedModerator={currentModerator}
          onSelect={handleSelect}
          moderatorList={moderators}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
}
