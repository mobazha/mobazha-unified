'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header, Footer } from '@/components';
import { Container, VStack } from '@/components/layouts';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui';
import {
  useI18n,
  useUserStore,
  useTheme,
  getImageUrl,
  isHosted,
  startCasdoorLogin,
} from '@mobazha/core';
import {
  Settings,
  Package,
  ShoppingBag,
  Heart,
  Bell,
  Moon,
  HelpCircle,
  LogOut,
  Wallet,
  ChevronRight,
  LogIn,
  PieChart,
} from 'lucide-react';

// 功能列表项组件
interface FeatureItemProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  onClick?: () => void;
  href?: string;
  rightElement?: React.ReactNode;
}

const FeatureItem: React.FC<FeatureItemProps> = ({
  icon,
  title,
  description,
  onClick,
  href,
  rightElement,
}) => {
  const content = (
    <div className="flex items-center gap-3 py-3 px-3 min-h-[52px] rounded-lg hover:bg-muted/50 active:bg-muted transition-colors cursor-pointer touch-feedback">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="text-[11px] text-muted-foreground truncate">{description}</p>}
      </div>
      {rightElement || <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return <div onClick={onClick}>{content}</div>;
};

export default function MePage() {
  const router = useRouter();
  const { t } = useI18n();
  const { isAuthenticated, profile, isLoading, logout } = useUserStore();
  const { isDark, toggleDarkMode } = useTheme();

  const handleLogout = () => {
    logout();
    if (isHosted()) {
      startCasdoorLogin();
    } else {
      router.push('/');
    }
  };

  const handleLogin = () => {
    if (isHosted()) {
      startCasdoorLogin();
    } else {
      router.push('/login');
    }
  };

  // Desktop: redirect to settings (this page is mobile-optimized)
  if (typeof window !== 'undefined' && window.innerWidth >= 768) {
    router.replace(isAuthenticated && profile?.peerID ? `/store/${profile.peerID}` : '/settings');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* 移动端顶部标题栏 */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-center h-11">
          <span className="text-base font-semibold text-foreground">{t('nav.profile')}</span>
        </div>
      </div>

      <Container size="sm" className="py-3">
        <VStack gap="sm">
          {/* 用户信息卡片 */}
          <div className="bg-card rounded-xl p-3 border">
            {isLoading ? (
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-24" />
                  <div className="h-3 bg-muted rounded animate-pulse w-32" />
                </div>
              </div>
            ) : isAuthenticated && profile ? (
              <Link href={`/store/${profile.peerID}`} className="flex items-center gap-3">
                <Avatar
                  src={getImageUrl(profile.avatarHashes?.small)}
                  name={profile.name || 'User'}
                  size="lg"
                  className="w-14 h-14"
                />
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold truncate">
                    {profile.name || t('me.anonymous')}
                  </h2>
                  <p className="text-xs text-muted-foreground truncate">
                    {profile.peerID?.slice(0, 8)}...{profile.peerID?.slice(-4)}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                  <LogIn className="w-7 h-7 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-semibold">{t('me.notLoggedIn')}</h2>
                  <p className="text-xs text-muted-foreground">{t('me.loginPrompt')}</p>
                </div>
                <Button size="sm" onClick={handleLogin}>
                  {t('nav.login')}
                </Button>
              </div>
            )}
          </div>

          {/* 订单区域 */}
          {isAuthenticated && (
            <div className="bg-card rounded-xl p-3 border">
              <h3 className="text-xs font-medium mb-2 text-muted-foreground">{t('me.myOrders')}</h3>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/orders?tab=purchases"
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg hover:bg-muted/50 active:bg-muted transition-colors touch-feedback"
                >
                  <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-info" />
                  </div>
                  <span className="text-xs">{t('me.purchases')}</span>
                </Link>
                <Link
                  href="/orders?tab=sales"
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg hover:bg-muted/50 active:bg-muted transition-colors touch-feedback"
                >
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                    <Package className="w-5 h-5 text-success" />
                  </div>
                  <span className="text-xs">{t('me.sales')}</span>
                </Link>
              </div>
            </div>
          )}

          {/* 功能列表 */}
          {isAuthenticated && (
            <div className="bg-card rounded-xl border overflow-hidden">
              <FeatureItem
                icon={<Wallet className="w-5 h-5" />}
                title={t('me.receivingAccounts')}
                description={t('me.receivingAccountsDesc')}
                href="/wallet"
              />
              <FeatureItem
                icon={<PieChart className="w-5 h-5" />}
                title={t('userMenu.rwaAssets')}
                description={t('me.rwaAssetsDescription')}
                href="/rwa-dashboard"
              />
              <FeatureItem
                icon={<Heart className="w-5 h-5" />}
                title={t('me.wishlist')}
                description={t('me.wishlistDesc')}
                href="/wishlist"
              />
              <FeatureItem
                icon={<Bell className="w-5 h-5" />}
                title={t('me.notifications')}
                description={t('me.notificationsDesc')}
                href="/notifications"
              />
            </div>
          )}

          {/* 设置区域 */}
          <div className="bg-card rounded-xl border overflow-hidden">
            <FeatureItem
              icon={<Settings className="w-5 h-5" />}
              title={t('me.settings')}
              description={t('me.settingsDesc')}
              href="/settings"
            />
            <div className="flex items-center gap-3 p-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Moon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t('me.appearance')}</p>
                <p className="text-xs text-muted-foreground">{t('me.darkModeDesc')}</p>
              </div>
              <Switch checked={isDark} onCheckedChange={() => toggleDarkMode()} />
            </div>
            <FeatureItem
              icon={<HelpCircle className="w-5 h-5" />}
              title={t('me.support')}
              description={t('me.supportDesc')}
              href="/support"
            />
          </div>

          {/* 退出登录 */}
          {isAuthenticated && (
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('me.logout')}
            </Button>
          )}

          {/* Bottom safe area for MobileNav */}
          <div className="h-20 md:hidden" />
        </VStack>
      </Container>

      <Footer />
    </div>
  );
}
