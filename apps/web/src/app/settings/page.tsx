'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack } from '@mobazha/ui';
import { Button, Card } from '@mobazha/ui';
import {
  Switch,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ScrollArea,
  useToast,
} from '@/components/ui';
import { useTheme, THEME_INFO, useI18n } from '@mobazha/core';

// Mock data
const countries = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
];

const currencies = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
];

const acceptedCoins = [
  { symbol: 'BTC', name: 'Bitcoin', enabled: true },
  { symbol: 'ETH', name: 'Ethereum', enabled: true },
  { symbol: 'USDT', name: 'Tether', enabled: true },
  { symbol: 'USDC', name: 'USD Coin', enabled: false },
  { symbol: 'BNB', name: 'Binance Coin', enabled: false },
];

interface SettingItemProps {
  title: string;
  description?: string;
  value?: string;
  onClick?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  danger?: boolean;
}

const SettingItem = ({
  title,
  description,
  value,
  onClick,
  toggle,
  toggleValue,
  onToggle,
  danger,
}: SettingItemProps) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 ${
      danger ? 'text-red-600' : ''
    }`}
  >
    <div className="flex-1 text-left">
      <p className={`font-medium ${danger ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
        {title}
      </p>
      {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
    </div>
    {toggle ? (
      <Switch
        checked={toggleValue}
        onCheckedChange={value => {
          onToggle?.(value);
        }}
        onClick={e => e.stopPropagation()}
      />
    ) : value ? (
      <span className="text-slate-500">{value}</span>
    ) : (
      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    )}
  </button>
);

interface SettingGroupProps {
  title: string;
  children: React.ReactNode;
}

const SettingGroup = ({ title, children }: SettingGroupProps) => (
  <div className="mb-6">
    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2 px-1">
      {title}
    </h3>
    <Card className="overflow-hidden">{children}</Card>
  </div>
);

export default function SettingsPage() {
  const router = useRouter();
  const { theme, mode, setTheme, setMode, themes, isDark } = useTheme();
  const { toast } = useToast();
  const { t } = useI18n();

  // State
  const [country, setCountry] = useState('US');
  const [currency, setCurrency] = useState('USD');
  const [isPrivateStore, setIsPrivateStore] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [analytics, setAnalytics] = useState(true);
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Modal states
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showCoinsModal, setShowCoinsModal] = useState(false);
  const [coins, setCoins] = useState(acceptedCoins);

  // AlertDialog states
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleCoinToggle = useCallback((symbol: string) => {
    setCoins(prev =>
      prev.map(coin => (coin.symbol === symbol ? { ...coin, enabled: !coin.enabled } : coin))
    );
  }, []);

  const handleBackup = useCallback(() => {
    // In real app, this would trigger backup flow
    toast({
      title: t('settingsExtended.comingSoon'),
      description: t('settingsExtended.backupComingSoon'),
    });
  }, [toast, t]);

  const handleRestoreConfirm = useCallback(() => {
    // In real app, this would trigger restore flow
    toast({
      title: t('settingsExtended.comingSoon'),
      description: t('settingsExtended.restoreComingSoon'),
    });
    setShowRestoreDialog(false);
  }, [toast, t]);

  const handleLogoutConfirm = useCallback(() => {
    router.push('/');
  }, [router]);

  const enabledCoinsCount = coins.filter(c => c.enabled).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <main className="py-8">
        <Container size="md">
          {/* Page Header */}
          <HStack gap="md" align="center" className="mb-8">
            <Link
              href="/profile"
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t('settings.title')}
            </h1>
          </HStack>

          {/* Profile Settings */}
          <SettingGroup title={t('settingsExtended.profile')}>
            <SettingItem
              title={t('settingsExtended.country')}
              value={countries.find(c => c.code === country)?.name}
              onClick={() => setShowCountryModal(true)}
            />
            <SettingItem
              title={t('settings.currency')}
              value={currencies.find(c => c.code === currency)?.name}
              onClick={() => setShowCurrencyModal(true)}
            />
            <SettingItem
              title={t('settingsExtended.shippingAddresses')}
              description={t('settingsExtended.manageAddresses')}
              onClick={() => router.push('/settings/addresses')}
            />
            <SettingItem
              title={t('settingsExtended.blockedUsers')}
              description={t('settingsExtended.manageBlocked')}
              onClick={() => router.push('/settings/blocked')}
            />
          </SettingGroup>

          {/* Notifications */}
          <SettingGroup title={t('settings.notifications')}>
            <SettingItem
              title={t('settingsExtended.pushNotifications')}
              description={t('settingsExtended.pushDescription')}
              toggle
              toggleValue={pushNotifications}
              onToggle={setPushNotifications}
            />
            <SettingItem
              title={t('settingsExtended.emailNotifications')}
              description={t('settingsExtended.emailDescription')}
              toggle
              toggleValue={emailNotifications}
              onToggle={setEmailNotifications}
            />
          </SettingGroup>

          {/* Store Settings */}
          <SettingGroup title={t('settingsExtended.store')}>
            <SettingItem
              title={t('settingsExtended.privateStore')}
              description={t('settingsExtended.privateStoreDesc')}
              toggle
              toggleValue={isPrivateStore}
              onToggle={setIsPrivateStore}
            />
            <SettingItem
              title={t('settingsExtended.storePolicies')}
              description={t('settingsExtended.storePoliciesDesc')}
              onClick={() => router.push('/settings/policies')}
            />
            <SettingItem
              title={t('settingsExtended.moderators')}
              description={t('settingsExtended.moderatorsDesc')}
              onClick={() => router.push('/settings/moderators')}
            />
            <SettingItem
              title={t('settingsExtended.acceptedCryptocurrencies')}
              value={t('settingsExtended.selected', { count: enabledCoinsCount })}
              onClick={() => setShowCoinsModal(true)}
            />
            <SettingItem
              title={t('settingsExtended.shippingOptions')}
              description={t('settingsExtended.shippingOptionsDesc')}
              onClick={() => router.push('/settings/shipping')}
            />
          </SettingGroup>

          {/* Appearance */}
          <SettingGroup title={t('settings.appearance')}>
            <SettingItem
              title={t('settings.theme')}
              description={THEME_INFO[theme]?.displayName || 'Classic'}
              value={THEME_INFO[theme]?.icon || '🌊'}
              onClick={() => setShowThemeModal(true)}
            />
            <SettingItem
              title={t('settings.darkMode')}
              description={
                mode === 'system'
                  ? t('settingsExtended.followingSystem')
                  : isDark
                    ? t('settingsExtended.enabled')
                    : t('settingsExtended.disabled')
              }
              toggle
              toggleValue={isDark}
              onToggle={value => setMode(value ? 'dark' : 'light')}
            />
          </SettingGroup>

          {/* Advanced */}
          <SettingGroup title={t('settingsExtended.advanced')}>
            <SettingItem
              title={t('settingsExtended.analytics')}
              description={t('settingsExtended.analyticsDesc')}
              toggle
              toggleValue={analytics}
              onToggle={setAnalytics}
            />
            <SettingItem
              title={t('settingsExtended.backupWallet')}
              description={t('settingsExtended.backupWalletDesc')}
              onClick={handleBackup}
            />
            <SettingItem
              title={t('settingsExtended.backupProfile')}
              description={t('settingsExtended.backupProfileDesc')}
              onClick={() => router.push('/settings/backup')}
            />
            <SettingItem
              title={t('settingsExtended.restoreProfile')}
              description={t('settingsExtended.restoreProfileDesc')}
              onClick={() => setShowRestoreDialog(true)}
            />
            <SettingItem
              title={t('settingsExtended.resyncTransactions')}
              description={t('settingsExtended.resyncDesc')}
              onClick={() => router.push('/settings/resync')}
            />
            <SettingItem
              title={t('settingsExtended.serverLogs')}
              description={t('settingsExtended.serverLogsDesc')}
              onClick={() => router.push('/settings/logs')}
            />
          </SettingGroup>

          {/* Version & Logout */}
          <SettingGroup title={t('settings.about')}>
            <SettingItem
              title={t('settings.version')}
              value="1.0.0 (Build 123)"
              onClick={() => {}}
            />
            <SettingItem
              title={t('settingsExtended.checkForUpdates')}
              onClick={() =>
                toast({
                  title: t('settingsExtended.upToDate'),
                  description: t('settingsExtended.latestVersion'),
                })
              }
            />
            <SettingItem
              title={t('settings.logout')}
              danger
              onClick={() => setShowLogoutDialog(true)}
            />
          </SettingGroup>
        </Container>
      </main>

      {/* Country Modal */}
      <Dialog open={showCountryModal} onOpenChange={setShowCountryModal}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('settingsExtended.selectCountry')}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            {countries.map(c => (
              <button
                key={c.code}
                onClick={() => {
                  setCountry(c.code);
                  setShowCountryModal(false);
                }}
                className={`w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex justify-between items-center ${
                  country === c.code ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
                }`}
              >
                <span className="text-slate-900 dark:text-white">{c.name}</span>
                {country === c.code && (
                  <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Currency Modal */}
      <Dialog open={showCurrencyModal} onOpenChange={setShowCurrencyModal}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('settingsExtended.selectCurrency')}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            {currencies.map(c => (
              <button
                key={c.code}
                onClick={() => {
                  setCurrency(c.code);
                  setShowCurrencyModal(false);
                }}
                className={`w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex justify-between items-center ${
                  currency === c.code ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
                }`}
              >
                <span className="text-slate-900 dark:text-white">
                  {c.name} ({c.symbol})
                </span>
                {currency === c.code && (
                  <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Theme Modal */}
      <Dialog open={showThemeModal} onOpenChange={setShowThemeModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('settings.chooseTheme')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {themes.map(t => (
              <button
                key={t.name}
                onClick={() => {
                  setTheme(t.name as typeof theme);
                }}
                className={`flex items-center gap-3 p-4 rounded-xl text-left transition-all ${
                  theme === t.name
                    ? 'bg-primary/10 border-2 border-primary'
                    : 'bg-background-alt hover:bg-surface-hover border-2 border-transparent'
                }`}
              >
                <span className="text-3xl">{t.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary">{t.displayName}</p>
                  <p className="text-xs text-text-muted truncate">{t.description}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-medium text-text-secondary mb-3">
              {t('settings.displayMode')}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'light', label: t('settingsExtended.light'), icon: '☀️' },
                { value: 'dark', label: t('settingsExtended.dark'), icon: '🌙' },
                { value: 'system', label: t('settings.system'), icon: '💻' },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setMode(option.value as typeof mode)}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    mode === option.value
                      ? 'bg-primary text-text-inverse'
                      : 'bg-background-alt hover:bg-surface-hover text-text-primary'
                  }`}
                >
                  <span>{option.icon}</span>
                  <span className="text-sm">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
          <Button fullWidth className="mt-4" onClick={() => setShowThemeModal(false)}>
            {t('settingsExtended.done')}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Coins Modal */}
      <Dialog open={showCoinsModal} onOpenChange={setShowCoinsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settingsExtended.acceptedCryptocurrencies')}</DialogTitle>
          </DialogHeader>
          <VStack gap="sm">
            {coins.map(coin => (
              <HStack
                key={coin.symbol}
                justify="between"
                align="center"
                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{coin.symbol}</p>
                  <p className="text-sm text-slate-500">{coin.name}</p>
                </div>
                <Switch
                  checked={coin.enabled}
                  onCheckedChange={() => handleCoinToggle(coin.symbol)}
                />
              </HStack>
            ))}
          </VStack>
          <Button fullWidth className="mt-4" onClick={() => setShowCoinsModal(false)}>
            {t('settingsExtended.done')}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Restore Profile AlertDialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settingsExtended.restoreConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settingsExtended.restoreConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreConfirm}>
              {t('settingsExtended.continue')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout AlertDialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settingsExtended.logoutConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settingsExtended.logoutConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogoutConfirm}>
              {t('settings.logout')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}
