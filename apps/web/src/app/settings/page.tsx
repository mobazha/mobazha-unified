'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack } from '@mobazha/ui';
import { Button, Card } from '@mobazha/ui';
import { useTheme, THEME_INFO } from '@mobazha/core';

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
      <button
        onClick={e => {
          e.stopPropagation();
          onToggle?.(!toggleValue);
        }}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          toggleValue ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            toggleValue ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
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

  const handleCoinToggle = useCallback((symbol: string) => {
    setCoins(prev =>
      prev.map(coin => (coin.symbol === symbol ? { ...coin, enabled: !coin.enabled } : coin))
    );
  }, []);

  const handleBackup = useCallback(() => {
    // In real app, this would trigger backup flow
    alert('Backup wallet feature coming soon!');
  }, []);

  const handleRestore = useCallback(() => {
    // In real app, this would trigger restore flow
    if (confirm('Are you sure you want to restore? Make sure you have a backup first.')) {
      alert('Restore profile feature coming soon!');
    }
  }, []);

  const handleLogout = useCallback(() => {
    if (confirm('Are you sure you want to log out?')) {
      router.push('/');
    }
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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
          </HStack>

          {/* Profile Settings */}
          <SettingGroup title="Profile">
            <SettingItem
              title="Country"
              value={countries.find(c => c.code === country)?.name}
              onClick={() => setShowCountryModal(true)}
            />
            <SettingItem
              title="Currency"
              value={currencies.find(c => c.code === currency)?.name}
              onClick={() => setShowCurrencyModal(true)}
            />
            <SettingItem
              title="Shipping Addresses"
              description="Manage your delivery addresses"
              onClick={() => router.push('/settings/addresses')}
            />
            <SettingItem
              title="Blocked Users"
              description="Manage blocked accounts"
              onClick={() => router.push('/settings/blocked')}
            />
          </SettingGroup>

          {/* Notifications */}
          <SettingGroup title="Notifications">
            <SettingItem
              title="Push Notifications"
              description="Receive push notifications for orders and messages"
              toggle
              toggleValue={pushNotifications}
              onToggle={setPushNotifications}
            />
            <SettingItem
              title="Email Notifications"
              description="Receive email updates"
              toggle
              toggleValue={emailNotifications}
              onToggle={setEmailNotifications}
            />
          </SettingGroup>

          {/* Store Settings */}
          <SettingGroup title="Store">
            <SettingItem
              title="Private Store"
              description="Only approved users can view your listings"
              toggle
              toggleValue={isPrivateStore}
              onToggle={setIsPrivateStore}
            />
            <SettingItem
              title="Store Policies"
              description="Return policy, terms & conditions"
              onClick={() => router.push('/settings/policies')}
            />
            <SettingItem
              title="Moderators"
              description="Manage dispute moderators"
              onClick={() => router.push('/settings/moderators')}
            />
            <SettingItem
              title="Accepted Cryptocurrencies"
              value={`${enabledCoinsCount} selected`}
              onClick={() => setShowCoinsModal(true)}
            />
            <SettingItem
              title="Shipping Options"
              description="Configure shipping methods and prices"
              onClick={() => router.push('/settings/shipping')}
            />
          </SettingGroup>

          {/* Appearance */}
          <SettingGroup title="Appearance">
            <SettingItem
              title="Theme"
              description={THEME_INFO[theme]?.displayName || 'Classic'}
              value={THEME_INFO[theme]?.icon || '🌊'}
              onClick={() => setShowThemeModal(true)}
            />
            <SettingItem
              title="Dark Mode"
              description={mode === 'system' ? 'Following system' : isDark ? 'Enabled' : 'Disabled'}
              toggle
              toggleValue={isDark}
              onToggle={value => setMode(value ? 'dark' : 'light')}
            />
          </SettingGroup>

          {/* Advanced */}
          <SettingGroup title="Advanced">
            <SettingItem
              title="Analytics"
              description="Help improve the app by sharing anonymous usage data"
              toggle
              toggleValue={analytics}
              onToggle={setAnalytics}
            />
            <SettingItem
              title="Backup Wallet"
              description="Save your wallet seed phrase"
              onClick={handleBackup}
            />
            <SettingItem
              title="Backup Profile"
              description="Export your profile data"
              onClick={() => router.push('/settings/backup')}
            />
            <SettingItem
              title="Restore Profile"
              description="Import profile from backup"
              onClick={handleRestore}
            />
            <SettingItem
              title="Resync Transactions"
              description="Resynchronize blockchain transactions"
              onClick={() => router.push('/settings/resync')}
            />
            <SettingItem
              title="Server Logs"
              description="View application logs"
              onClick={() => router.push('/settings/logs')}
            />
          </SettingGroup>

          {/* Version & Logout */}
          <SettingGroup title="About">
            <SettingItem title="Version" value="1.0.0 (Build 123)" onClick={() => {}} />
            <SettingItem
              title="Check for Updates"
              onClick={() => alert('You are on the latest version!')}
            />
            <SettingItem title="Log Out" danger onClick={handleLogout} />
          </SettingGroup>
        </Container>
      </main>

      {/* Country Modal */}
      {showCountryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Select Country
              </h2>
              <button
                onClick={() => setShowCountryModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
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
                    <svg
                      className="w-5 h-5 text-emerald-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Currency Modal */}
      {showCurrencyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Select Currency
              </h2>
              <button
                onClick={() => setShowCurrencyModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
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
                    <svg
                      className="w-5 h-5 text-emerald-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Theme Modal */}
      {showThemeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-semibold text-text-primary">Choose Theme</h2>
              <button
                onClick={() => setShowThemeModal(false)}
                className="p-2 hover:bg-surface-hover rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-4">
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
                <h3 className="text-sm font-medium text-text-secondary mb-3">Display Mode</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'light', label: 'Light', icon: '☀️' },
                    { value: 'dark', label: 'Dark', icon: '🌙' },
                    { value: 'system', label: 'System', icon: '💻' },
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
              <Button fullWidth className="mt-6" onClick={() => setShowThemeModal(false)}>
                Done
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Coins Modal */}
      {showCoinsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Accepted Cryptocurrencies
              </h2>
              <button
                onClick={() => setShowCoinsModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-4">
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
                    <button
                      onClick={() => handleCoinToggle(coin.symbol)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        coin.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          coin.enabled ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </HStack>
                ))}
              </VStack>
              <Button fullWidth className="mt-4" onClick={() => setShowCoinsModal(false)}>
                Done
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Footer />
    </div>
  );
}
