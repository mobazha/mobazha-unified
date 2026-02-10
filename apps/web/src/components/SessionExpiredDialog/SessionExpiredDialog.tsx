'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore, useI18n } from '@mobazha/core';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

/**
 * 全局会话过期 Dialog
 *
 * 当 API 返回 401（token 无效、过期、RSA 验证错误等）时自动弹出，
 * 提示用户重新登录。不可关闭，只能点击"重新登录"按钮。
 */
export function SessionExpiredDialog() {
  const router = useRouter();
  const { t } = useI18n();

  const sessionExpired = useUserStore(state => state.sessionExpired);
  const logout = useUserStore(state => state.logout);

  const handleReLogin = useCallback(() => {
    // 清除所有认证状态
    logout();
    // 重定向到登录页
    router.replace('/login');
  }, [logout, router]);

  if (!sessionExpired) return null;

  return (
    <AlertDialog open={sessionExpired}>
      <AlertDialogContent className="max-w-sm" onEscapeKeyDown={e => e.preventDefault()}>
        <AlertDialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-destructive"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <AlertDialogTitle className="text-center">
            {t('login.sessionExpiredTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {t('login.sessionExpiredMessage')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction onClick={handleReLogin} className="w-full sm:w-auto">
            {t('login.sessionExpiredAction')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
