'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@mobazha/core';
import { Header, Footer } from '@/components';

/**
 * Profile 页面 - 重定向到用户自己的店铺页面
 *
 * 统一使用 /store/[peerId] 作为店铺/个人页面，
 * 当查看自己的店铺时会显示编辑功能。
 */
export default function ProfilePage() {
  const router = useRouter();
  const { profile, isAuthenticated, isLoading } = useUserStore();

  useEffect(() => {
    // 如果加载完成
    if (!isLoading) {
      if (isAuthenticated && profile?.peerID) {
        // 已登录，重定向到自己的店铺页面
        router.replace(`/store/${profile.peerID}`);
      } else {
        // 未登录，重定向到登录页
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoading, profile, router]);

  // 显示加载状态
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
