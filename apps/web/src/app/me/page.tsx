'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header, Footer } from '@/components';
import { Container, VStack } from '@/components/layouts';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui';
import {
  useI18n,
  useUserStore,
  useTheme,
  useMiniAppRole,
  getImageUrl,
  isHosted,
  isStandalone,
  startCasdoorLogin,
  NODE_API,
  useUserContext,
} from '@mobazha/core';
import { publicPost } from '@mobazha/core/services/api/helpers';
import { ApiError } from '@mobazha/core/services/api';
import { usePlatform } from '@mobazha/ui/hooks';
import { useMiniAppRegister } from '@/hooks/useMiniAppRegister';
import {
  Heart,
  Bell,
  Moon,
  HelpCircle,
  LogOut,
  ChevronRight,
  LogIn,
  LayoutDashboard,
  Store,
  ShieldQuestion,
  CheckCircle2,
  Loader2,
  Settings,
  User,
  Link2,
  MapPin,
  Lock,
  Ban,
  Wrench,
} from 'lucide-react';

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
        {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
      </div>
      {rightElement || <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return <div onClick={onClick}>{content}</div>;
};

// --- Section label ---
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-xs font-medium mb-1 px-1 text-muted-foreground uppercase tracking-wider">
    {children}
  </h3>
);

// --- Inline Settings (replaces Settings intermediate page on mobile) ---
const InlineSettings: React.FC<{ authenticated: boolean }> = ({ authenticated }) => {
  const { t } = useI18n();
  const { isDark, toggleDarkMode } = useTheme();

  return (
    <>
      {authenticated && (
        <>
          <SectionLabel>{t('me.sectionAccount')}</SectionLabel>
          <div className="bg-card rounded-xl border overflow-hidden">
            <FeatureItem
              icon={<User className="w-5 h-5" />}
              title={t('settings.sidebar.profile') || t('settings.sidebar.page')}
              description={t('me.profileDesc')}
              href="/settings/page-profile"
            />
            <FeatureItem
              icon={<Link2 className="w-5 h-5" />}
              title={t('settings.sidebar.account')}
              description={t('me.linkedAccountsDesc')}
              href="/settings/account"
            />
          </div>
        </>
      )}

      {authenticated && (
        <>
          <SectionLabel>{t('me.sectionActivity')}</SectionLabel>
          <div className="bg-card rounded-xl border overflow-hidden">
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
        </>
      )}

      <SectionLabel>{t('me.sectionPreferences')}</SectionLabel>
      <div className="bg-card rounded-xl border overflow-hidden">
        <FeatureItem
          icon={<Settings className="w-5 h-5" />}
          title={t('settings.sidebar.general')}
          description={t('settingsExtended.generalDesc')}
          href="/settings/general"
        />
        <div className="flex items-center gap-3 py-3 px-3 min-h-[52px]">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            <Moon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{t('me.appearance')}</p>
            <p className="text-xs text-muted-foreground">{t('me.darkModeDesc')}</p>
          </div>
          <Switch checked={isDark} onCheckedChange={() => toggleDarkMode()} />
        </div>
        {authenticated && (
          <FeatureItem
            icon={<MapPin className="w-5 h-5" />}
            title={t('settings.sidebar.addresses')}
            description={t('me.addressesDesc')}
            href="/settings/addresses"
          />
        )}
      </div>

      {authenticated && (
        <>
          <SectionLabel>{t('me.sectionPrivacy')}</SectionLabel>
          <div className="bg-card rounded-xl border overflow-hidden">
            <FeatureItem
              icon={<Lock className="w-5 h-5" />}
              title={t('settings.sidebar.chatEncryption')}
              description={t('me.chatEncryptionDesc')}
              href="/settings/chat-encryption"
            />
            <FeatureItem
              icon={<Ban className="w-5 h-5" />}
              title={t('settings.sidebar.blocked')}
              description={t('me.blockedDesc')}
              href="/settings/blocked"
            />
          </div>

          <SectionLabel>{t('me.sectionMore')}</SectionLabel>
          <div className="bg-card rounded-xl border overflow-hidden">
            <FeatureItem
              icon={<Wrench className="w-5 h-5" />}
              title={t('settings.sidebar.advanced')}
              description={t('me.advancedDesc')}
              href="/settings/advanced"
            />
            <FeatureItem
              icon={<HelpCircle className="w-5 h-5" />}
              title={t('me.support')}
              description={t('me.supportDesc')}
              href="/support"
            />
          </div>
        </>
      )}

      {!authenticated && (
        <div className="bg-card rounded-xl border overflow-hidden">
          <FeatureItem
            icon={<HelpCircle className="w-5 h-5" />}
            title={t('me.support')}
            description={t('me.supportDesc')}
            href="/support"
          />
        </div>
      )}
    </>
  );
};

// --- Store Claim Banner (MA-2.4) ---
const StoreClaimBanner: React.FC<{ onClaimed: () => void }> = ({ onClaimed }) => {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleClaim = async () => {
    if (!password.trim()) return;
    setStatus('loading');
    setErrorMsg('');

    try {
      await publicPost(NODE_API.SYSTEM_CLAIM_STORE, { admin_password: password });
      setStatus('success');
      setTimeout(() => onClaimed(), 1200);
    } catch (err: unknown) {
      setStatus('error');
      const status = err instanceof ApiError ? err.status : undefined;
      const message = err instanceof Error ? err.message : String(err);
      const msgLower = message.toLowerCase();

      if (msgLower.includes('password') || msgLower.includes('incorrect') || status === 401) {
        setErrorMsg(t('me.claimErrorWrongPassword'));
      } else if (msgLower.includes('claimed') || status === 403) {
        setErrorMsg(t('me.claimErrorAlreadyClaimed'));
      } else {
        setErrorMsg(t('me.claimErrorGeneric'));
      }
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
          {t('me.claimSuccess')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
          <ShieldQuestion className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            {t('me.unclaimedStorePrompt')}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
            {t('me.unclaimedStoreDesc')}
          </p>
        </div>
      </div>

      {!expanded ? (
        <Button
          size="sm"
          variant="outline"
          className="w-full mt-3 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
          onClick={() => setExpanded(true)}
        >
          {t('me.claimStoreExpand')}
        </Button>
      ) : (
        <div className="mt-3 space-y-2">
          <div>
            <label
              htmlFor="admin-password"
              className="text-xs font-medium text-amber-800 dark:text-amber-300"
            >
              {t('me.adminPasswordLabel')}
            </label>
            <Input
              id="admin-password"
              type="password"
              placeholder={t('me.adminPasswordPlaceholder')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleClaim()}
              className="mt-1 bg-white dark:bg-background"
              disabled={status === 'loading'}
              autoFocus
            />
          </div>
          {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
          <Button
            size="sm"
            className="w-full"
            onClick={handleClaim}
            disabled={status === 'loading' || !password.trim()}
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('me.claiming')}
              </>
            ) : (
              t('me.claimStore')
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default function MePage() {
  const router = useRouter();
  const { t } = useI18n();
  const { isAuthenticated, profile, isLoading, logout } = useUserStore();
  const { hasStore, isPureBuyer } = useUserContext();
  const { isTGMiniApp, isEmbeddedApp } = usePlatform();
  const {
    role,
    isLoading: roleLoading,
    storeClaimed,
    refetch: refetchRole,
  } = useMiniAppRole(isEmbeddedApp);
  const { promptRegister } = useMiniAppRegister();

  const standaloneMode = isStandalone();

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

  const handleContinueWithTelegram = async () => {
    const action = await promptRegister();
    if (action === 'register') {
      router.refresh();
    }
  };

  // Desktop: redirect to settings/store
  if (typeof window !== 'undefined' && window.innerWidth >= 768 && !isEmbeddedApp) {
    router.replace(isAuthenticated && profile?.peerID ? `/store/${profile.peerID}` : '/settings');
    return null;
  }

  // --- Mini App: Anonymous mode (MA-1.4) ---
  if (role === 'anonymous') {
    return (
      <div className="min-h-screen bg-background">
        <Header />

        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-center h-11">
            <span className="text-base font-semibold text-foreground">{t('nav.profile')}</span>
          </div>
        </div>

        <Container size="sm" className="py-3">
          <VStack gap="sm">
            <div className="bg-card rounded-xl p-6 border flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <LogIn className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-base font-semibold">{t('me.signInPrompt')}</h2>
                <p className="text-xs text-muted-foreground mt-1">{t('me.loginPrompt')}</p>
              </div>
              {isTGMiniApp ? (
                <Button className="w-full" onClick={handleContinueWithTelegram}>
                  {t('me.continueWithTelegram')}
                </Button>
              ) : (
                <Button className="w-full" onClick={handleLogin}>
                  {t('nav.login')}
                </Button>
              )}
            </div>

            <InlineSettings authenticated={false} />

            <div className="h-20 md:hidden" />
          </VStack>
        </Container>

        <Footer />
      </div>
    );
  }

  // --- Mini App: Owner mode (MA-1.2) ---
  if (role === 'owner') {
    return (
      <div className="min-h-screen bg-background">
        <Header />

        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-center h-11">
            <span className="text-base font-semibold text-foreground">{t('nav.profile')}</span>
          </div>
        </div>

        <Container size="sm" className="py-3">
          <VStack gap="sm">
            {/* User card with owner badge */}
            <div className="bg-card rounded-xl p-3 border">
              {profile ? (
                <div className="flex items-center gap-3">
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
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5 mt-0.5">
                      <Store className="w-3 h-3" />
                      {t('me.storeOwner')}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-24" />
                    <div className="h-3 bg-muted rounded animate-pulse w-32" />
                  </div>
                </div>
              )}
            </div>

            {/* Store Admin — single entry point */}
            <Link href="/admin" className="block">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-3 hover:bg-primary/10 active:bg-primary/15 transition-colors">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary">{t('me.storeAdmin')}</p>
                  <p className="text-xs text-muted-foreground">{t('me.storeAdminDesc')}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-primary/60 flex-shrink-0" />
              </div>
            </Link>

            <InlineSettings authenticated={true} />

            {/* Logout */}
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('me.logout')}
            </Button>

            <div className="h-20 md:hidden" />
          </VStack>
        </Container>

        <Footer />
      </div>
    );
  }

  // --- Mini App: Buyer mode (MA-1.1) / Default (non-Mini-App) ---
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-center h-11">
          <span className="text-base font-semibold text-foreground">{t('nav.profile')}</span>
        </div>
      </div>

      <Container size="sm" className="py-3">
        <VStack gap="sm">
          {/* User info card */}
          <div className="bg-card rounded-xl p-3 border">
            {isLoading || roleLoading ? (
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

          {/* Store admin — Web + TMA Marketplace */}
          {isAuthenticated && hasStore && !isPureBuyer && (!isEmbeddedApp || isTGMiniApp) && (
            <Link href="/admin" className="block">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-3 hover:bg-primary/10 active:bg-primary/15 transition-colors">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary">{t('me.storeAdmin')}</p>
                  <p className="text-xs text-muted-foreground">{t('me.storeAdminDesc')}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-primary/60 flex-shrink-0" />
              </div>
            </Link>
          )}

          {/* Start Selling CTA — SaaS / TMA Marketplace 用户无店铺 */}
          {isAuthenticated &&
            !hasStore &&
            !isPureBuyer &&
            !standaloneMode &&
            (!isEmbeddedApp || isTGMiniApp) && (
              <Link href="/admin" className="block">
                <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-3 flex items-center gap-3 hover:from-primary/10 hover:to-primary/15 active:from-primary/15 active:to-primary/20 transition-all">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                    <Store className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary">{t('userMenu.startSelling')}</p>
                    <p className="text-xs text-muted-foreground">{t('me.startSellingDesc')}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-primary/60 flex-shrink-0" />
                </div>
              </Link>
            )}

          <InlineSettings authenticated={isAuthenticated} />

          {/* Unclaimed store — interactive claim flow (MA-2.4) */}
          {isAuthenticated && isEmbeddedApp && storeClaimed === false && (
            <StoreClaimBanner onClaimed={refetchRole} />
          )}

          {/* Logout */}
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

          <div className="h-20 md:hidden" />
        </VStack>
      </Container>

      <Footer />
    </div>
  );
}
