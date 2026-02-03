'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Switch,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ScrollArea,
  useToast,
  Slider,
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import {
  useTheme,
  THEME_INFO,
  useI18n,
  useLocalCurrency,
  FIAT_CURRENCIES,
  CRYPTO_CURRENCIES,
  getPopularCurrencies,
  useNotificationStore,
  testNotificationSound,
  getAllCountries,
  getCountryName,
  POPULAR_COUNTRIES,
} from '@mobazha/core';
import type { CurrencyInfo, Locale } from '@mobazha/core';
import { ChevronLeft, Check, Volume2 } from 'lucide-react';

// Languages data
const languages: { code: Locale; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'ru', name: 'Русский' },
  { code: 'pt', name: 'Português' },
];

interface SettingItemProps {
  title: string;
  description?: string;
  value?: string;
  onClick?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
}

const SettingItem = ({
  title,
  description,
  value,
  onClick,
  toggle,
  toggleValue,
  onToggle,
}: SettingItemProps) => {
  const content = (
    <>
      <div className="flex-1 text-left min-w-0">
        <p className="font-medium text-sm">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
        )}
      </div>
      {toggle ? (
        <Switch
          checked={toggleValue}
          onCheckedChange={val => onToggle?.(val)}
          className="ml-3 flex-shrink-0"
        />
      ) : value ? (
        <span className="text-muted-foreground text-sm ml-3 flex-shrink-0">{value}</span>
      ) : onClick ? (
        <svg
          className="w-4 h-4 text-muted-foreground ml-3 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      ) : null}
    </>
  );

  const baseClassName =
    'w-full flex items-center justify-between p-3 hover:bg-surface-hover/50 transition-colors border-b border-border last:border-0';

  if (toggle || !onClick) {
    return <div className={baseClassName}>{content}</div>;
  }

  return (
    <button onClick={onClick} className={`${baseClassName} active:bg-muted`}>
      {content}
    </button>
  );
};

interface SettingGroupProps {
  title: string;
  children: React.ReactNode;
}

const SettingGroup = ({ title, children }: SettingGroupProps) => (
  <div className="mb-6">
    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
      {title}
    </h3>
    <Card className="overflow-hidden">{children}</Card>
  </div>
);

export default function GeneralSettingsPage() {
  const { t, language, setLanguage } = useI18n();
  const { theme, mode, setTheme, setMode, themes, isDark } = useTheme();
  const { toast } = useToast();
  const { localCurrency, setLocalCurrency } = useLocalCurrency();

  // 声音设置 from store
  const { soundEnabled, ttsEnabled, volume, setSoundEnabled, setTtsEnabled, setVolume } =
    useNotificationStore();

  // State
  const [country, setCountry] = useState('US');
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [currencySearchQuery, setCurrencySearchQuery] = useState('');
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [localVolume, setLocalVolume] = useState(Math.round(volume * 100));

  // 同步音量
  useEffect(() => {
    setLocalVolume(Math.round(volume * 100));
  }, [volume]);

  // 测试声音
  const handleTestSound = useCallback(() => {
    testNotificationSound('chat_message');
  }, []);

  // 音量变化
  const handleVolumeChange = useCallback(
    (values: number[]) => {
      const newVolume = values[0];
      setLocalVolume(newVolume);
      setVolume(newVolume / 100);
    },
    [setVolume]
  );

  // 获取货币列表
  const currencyOptions = useMemo(() => {
    const popular = getPopularCurrencies();
    const all = [...FIAT_CURRENCIES, ...CRYPTO_CURRENCIES];

    if (currencySearchQuery.trim()) {
      const query = currencySearchQuery.toLowerCase();
      return all.filter(
        c =>
          c.code.toLowerCase().includes(query) ||
          c.name.toLowerCase().includes(query) ||
          c.symbol.toLowerCase().includes(query)
      );
    }

    const popularCodes = new Set(popular.map(p => p.code));
    const otherCurrencies = all.filter(c => !popularCodes.has(c.code));
    return [...popular, ...otherCurrencies];
  }, [currencySearchQuery]);

  const selectedCurrencyInfo = useMemo(() => {
    return currencyOptions.find(c => c.code === localCurrency) || currencyOptions[0];
  }, [localCurrency, currencyOptions]);

  // 获取国家列表（智能排序：热门国家优先）
  const countryOptions = useMemo(() => {
    const allCountries = getAllCountries(language);

    // 智能排序：热门国家优先，其他按本地化名称排序
    return allCountries.sort((a, b) => {
      const aIsPopular = POPULAR_COUNTRIES.includes(a.code);
      const bIsPopular = POPULAR_COUNTRIES.includes(b.code);

      if (aIsPopular && !bIsPopular) return -1;
      if (!aIsPopular && bIsPopular) return 1;
      if (aIsPopular && bIsPopular) {
        return POPULAR_COUNTRIES.indexOf(a.code) - POPULAR_COUNTRIES.indexOf(b.code);
      }

      return a.name.localeCompare(b.name, language);
    });
  }, [language]);

  // 当前选中国家的显示名称
  const selectedCountryName = useMemo(() => {
    return getCountryName(country, language) || country;
  }, [country, language]);

  // 过滤后的国家列表（支持搜索）
  const filteredCountryOptions = useMemo(() => {
    if (!countrySearchQuery.trim()) return countryOptions;
    const query = countrySearchQuery.toLowerCase();
    return countryOptions.filter(
      c => c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query)
    );
  }, [countryOptions, countrySearchQuery]);

  const selectedLanguageInfo = languages.find(l => l.code === language);

  return (
    <div>
      {/* 移动端返回按钮 */}
      <div className="lg:hidden mb-4">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </Link>
      </div>

      <h1 className="text-lg font-semibold mb-6">{t('settings.sidebar.general')}</h1>

      {/* Language & Region */}
      <SettingGroup title={t('settings.language')}>
        <SettingItem
          title={t('settings.language')}
          value={selectedLanguageInfo?.name || 'English'}
          onClick={() => setShowLanguageModal(true)}
        />
        <SettingItem
          title={t('settingsExtended.country')}
          value={selectedCountryName}
          onClick={() => setShowCountryModal(true)}
        />
        <SettingItem
          title={t('settings.currency')}
          value={`${selectedCurrencyInfo?.symbol || ''} ${selectedCurrencyInfo?.code || ''}`}
          onClick={() => setShowCurrencyModal(true)}
        />
      </SettingGroup>

      {/* Appearance */}
      <SettingGroup title={t('settings.appearance')}>
        <SettingItem
          title={t('settings.appearance')}
          description={`${THEME_INFO[theme]?.displayName || 'Classic'} · ${mode === 'system' ? t('settings.system') : isDark ? t('settingsExtended.dark') : t('settingsExtended.light')}`}
          value={THEME_INFO[theme]?.icon || '🌊'}
          onClick={() => setShowThemeModal(true)}
        />
      </SettingGroup>

      {/* Sound Settings */}
      <SettingGroup title={t('settingsExtended.soundSettings')}>
        <SettingItem
          title={t('settingsExtended.soundNotifications')}
          description={t('settingsExtended.soundNotificationsDesc')}
          toggle
          toggleValue={soundEnabled}
          onToggle={setSoundEnabled}
        />
        <SettingItem
          title={t('settingsExtended.voiceAnnouncements')}
          description={t('settingsExtended.voiceAnnouncementsDesc')}
          toggle
          toggleValue={ttsEnabled}
          onToggle={setTtsEnabled}
        />
        <div className="p-3 border-b border-border last:border-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">{t('settingsExtended.volume')}</span>
            </div>
            <div className="flex items-center gap-3">
              <Slider
                value={[localVolume]}
                onValueChange={handleVolumeChange}
                max={100}
                min={0}
                step={1}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground min-w-[40px] text-right">
                {localVolume}%
              </span>
              <Button size="sm" variant="outline" onClick={handleTestSound} className="shrink-0">
                {t('settingsExtended.test')}
              </Button>
            </div>
          </div>
        </div>
      </SettingGroup>

      {/* Language Modal */}
      <Dialog open={showLanguageModal} onOpenChange={setShowLanguageModal}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('settings.language')}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            {languages.map(l => (
              <button
                key={l.code}
                onClick={() => {
                  setLanguage(l.code);
                  setShowLanguageModal(false);
                }}
                className={`w-full p-4 text-left hover:bg-surface-hover flex justify-between items-center ${
                  language === l.code ? 'bg-primary/10' : ''
                }`}
              >
                <span className="text-foreground">{l.name}</span>
                {language === l.code && <Check className="w-5 h-5 text-primary" />}
              </button>
            ))}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Country Modal */}
      <Dialog
        open={showCountryModal}
        onOpenChange={open => {
          setShowCountryModal(open);
          if (!open) setCountrySearchQuery('');
        }}
      >
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('settingsExtended.selectCountry')}</DialogTitle>
          </DialogHeader>
          <div className="mb-2">
            <Input
              placeholder={t('common.search') + '...'}
              value={countrySearchQuery}
              onChange={e => setCountrySearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <ScrollArea className="flex-1 -mx-6 px-6 max-h-[50vh]">
            {filteredCountryOptions.map(c => (
              <button
                key={c.code}
                onClick={() => {
                  setCountry(c.code);
                  setShowCountryModal(false);
                  setCountrySearchQuery('');
                }}
                className={`w-full p-4 text-left hover:bg-surface-hover flex justify-between items-center ${
                  country === c.code ? 'bg-primary/10' : ''
                }`}
              >
                <span className="text-foreground">{c.name}</span>
                {country === c.code && <Check className="w-5 h-5 text-primary" />}
              </button>
            ))}
            {filteredCountryOptions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">{t('common.noResults')}</div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Currency Modal */}
      <Dialog
        open={showCurrencyModal}
        onOpenChange={open => {
          setShowCurrencyModal(open);
          if (!open) setCurrencySearchQuery('');
        }}
      >
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('settingsExtended.selectCurrency')}</DialogTitle>
          </DialogHeader>
          <div className="mb-2">
            <Input
              placeholder={t('common.search') + '...'}
              value={currencySearchQuery}
              onChange={e => setCurrencySearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <ScrollArea className="flex-1 -mx-6 px-6 max-h-[50vh]">
            {currencyOptions.map((c: CurrencyInfo) => (
              <button
                key={c.code}
                onClick={() => {
                  setLocalCurrency(c.code);
                  setShowCurrencyModal(false);
                  setCurrencySearchQuery('');
                  toast({
                    title: t('settings.currency'),
                    description: `${t('settingsExtended.currencyUpdated')}: ${c.name} (${c.symbol})`,
                  });
                }}
                className={`w-full p-4 text-left hover:bg-surface-hover flex justify-between items-center ${
                  localCurrency === c.code ? 'bg-primary/10' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-medium w-10">{c.symbol}</span>
                  <div>
                    <span className="text-foreground">{c.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">({c.code})</span>
                  </div>
                </div>
                {localCurrency === c.code && <Check className="w-5 h-5 text-primary" />}
              </button>
            ))}
            {currencyOptions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">{t('common.noResults')}</div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Theme Modal */}
      <Dialog open={showThemeModal} onOpenChange={setShowThemeModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('settings.appearance')}</DialogTitle>
          </DialogHeader>

          {/* Display Mode Section */}
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-3">{t('settings.displayMode')}</h3>
            <p className="text-xs text-muted-foreground mb-3">
              {t('settingsExtended.displayModeDesc')}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'light', label: t('settingsExtended.light'), icon: '☀️' },
                { value: 'dark', label: t('settingsExtended.dark'), icon: '🌙' },
                { value: 'system', label: t('settings.system'), icon: '💻' },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setMode(option.value as typeof mode)}
                  className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg transition-all border-2 ${
                    mode === option.value
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-muted border-transparent hover:bg-surface-hover'
                  }`}
                >
                  <span className="text-lg">{option.icon}</span>
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Theme Style Section */}
          <div className="border-t border-border pt-6">
            <h3 className="text-sm font-medium mb-3">{t('settingsExtended.themeStyle')}</h3>
            <p className="text-xs text-muted-foreground mb-3">
              {t('settingsExtended.themeStyleDesc')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {themes.map(themeItem => (
                <button
                  key={themeItem.name}
                  onClick={() => setTheme(themeItem.name as typeof theme)}
                  className={`flex items-center gap-3 p-4 rounded-xl text-left transition-all border-2 ${
                    theme === themeItem.name
                      ? 'bg-primary/10 border-primary'
                      : 'bg-muted hover:bg-surface-hover border-transparent'
                  }`}
                >
                  <span className="text-2xl">{themeItem.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{themeItem.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {themeItem.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Current Effect Preview */}
          <div className="border-t border-border pt-4 mt-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <span className="text-sm text-muted-foreground">
                {t('settingsExtended.currentEffect')}
              </span>
              <span className="font-medium">
                {THEME_INFO[theme]?.displayName} ·{' '}
                {isDark ? t('settingsExtended.dark') : t('settingsExtended.light')}
              </span>
            </div>
          </div>

          <Button className="w-full mt-4" onClick={() => setShowThemeModal(false)}>
            {t('settingsExtended.done')}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
