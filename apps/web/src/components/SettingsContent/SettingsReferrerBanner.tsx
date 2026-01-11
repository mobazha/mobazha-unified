'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@mobazha/core';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * 设置来源页面返回横幅
 * 当用户从设置弹框跳转到独立设置页面时显示，允许返回来源页面
 */
export const SettingsReferrerBanner: React.FC = () => {
  const { t } = useI18n();
  const router = useRouter();

  // 使用 useMemo 读取 sessionStorage，避免在 effect 中同步调用 setState
  const referrer = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const storedReferrer = sessionStorage.getItem('settings_referrer');
    // 只有当来源不是设置页面本身时才显示返回按钮
    if (storedReferrer && !storedReferrer.startsWith('/settings')) {
      return storedReferrer;
    }
    return null;
  }, []);

  const handleReturn = () => {
    if (referrer) {
      // 清除存储的来源
      sessionStorage.removeItem('settings_referrer');
      router.push(referrer);
    }
  };

  if (!referrer) return null;

  return (
    <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
        {t('settingsExtended.returnToPreviousPage')}
      </span>
      <Button size="sm" variant="ghost" onClick={handleReturn} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        {t('common.back')}
      </Button>
    </div>
  );
};

export default SettingsReferrerBanner;
