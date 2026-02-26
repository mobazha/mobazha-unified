'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Switch,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  useToast,
  Slider,
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import {
  useTheme,
  THEME_INFO,
  useI18n,
  useCurrencySelection,
  useNotificationStore,
  testNotificationSound,
  getAllCountries,
  getCountryName,
  POPULAR_COUNTRIES,
} from '@mobazha/core';
import type { CurrencyInfo, Locale, ThemeName } from '@mobazha/core';
import { SUPPORTED_LANGUAGES } from '@mobazha/core';
import { Check, ChevronRight, Volume2 } from 'lucide-react';
import { TokenIcon } from '@/components/Payment/TokenIcon';
import { SettingsSection } from '@/components/SettingsLayout';

export const GeneralSettingsContent: React.FC = () => {
  const { t, language, setLanguage } = useI18n();
  const { theme, mode, setTheme, setMode, themes, isDark } = useTheme();
  const { toast } = useToast();
  const {
    currencySections,
    selectedCurrencyInfo,
    searchQuery: currencySearchQuery,
    setSearchQuery: setCurrencySearchQuery,
    localCurrency,
    setLocalCurrency,
    getDisplayName: getCurrencyDisplayName,
    getFlag: getCurrencyFlag,
  } = useCurrencySelection();

  const { soundEnabled, ttsEnabled, volume, setSoundEnabled, setTtsEnabled, setVolume } =
    useNotificationStore();

  const [country, setCountryState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mobazha-country') || 'US';
    }
    return 'US';
  });
  const setCountry = useCallback((code: string) => {
    setCountryState(code);
    try {
      localStorage.setItem('mobazha-country', code);
    } catch {
      /* quota exceeded */
    }
  }, []);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [localVolume, setLocalVolume] = useState(Math.round(volume * 100));

  useEffect(() => {
    setLocalVolume(Math.round(volume * 100));
  }, [volume]);

  const handleTestSound = useCallback(() => {
    testNotificationSound('chat_message');
  }, []);

  const handleVolumeChange = useCallback(
    (values: number[]) => {
      const newVolume = values[0];
      setLocalVolume(newVolume);
      setVolume(newVolume / 100);
    },
    [setVolume]
  );

  const countryOptions = useMemo(() => {
    const allCountries = getAllCountries(language);
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

  const selectedCountryName = useMemo(() => {
    return getCountryName(country, language) || country;
  }, [country, language]);

  const filteredCountryOptions = useMemo(() => {
    if (!countrySearchQuery.trim()) return countryOptions;
    const query = countrySearchQuery.toLowerCase();
    return countryOptions.filter(
      c => c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query)
    );
  }, [countryOptions, countrySearchQuery]);

  const selectedLanguageInfo = SUPPORTED_LANGUAGES.find(l => l.code === language);

  return (
    <>
      <div className="divide-y divide-border">
        {/* Language & Region */}
        <SettingsSection
          className="pb-5 md:pb-8"
          title={t('settingsModal.languageAndRegion')}
          description={t('settingsModal.languageDesc')}
        >
          <Card className="p-4 md:p-6">
            <div className="space-y-3">
              <SettingRow
                label={t('settings.language')}
                value={selectedLanguageInfo?.name || 'English'}
                onClick={() => setShowLanguageModal(true)}
              />
              <SettingRow
                label={t('settingsExtended.country')}
                value={selectedCountryName}
                onClick={() => setShowCountryModal(true)}
              />
              <SettingRow
                label={t('settings.currency')}
                value={
                  selectedCurrencyInfo
                    ? `${getCurrencyDisplayName(selectedCurrencyInfo.code)} (${selectedCurrencyInfo.code})`
                    : ''
                }
                onClick={() => setShowCurrencyModal(true)}
              />
            </div>
          </Card>
        </SettingsSection>

        {/* Appearance */}
        <SettingsSection
          className="py-5 md:py-8"
          title={t('settings.appearance')}
          description={t('settingsExtended.displayModeDesc')}
        >
          <Card className="p-4 md:p-6">
            <SettingRow
              label={t('settingsExtended.themeStyle')}
              value={`${THEME_INFO[theme]?.icon || '🌊'} ${THEME_INFO[theme]?.displayName || 'Classic'} · ${mode === 'system' ? t('settings.system') : isDark ? t('settingsExtended.dark') : t('settingsExtended.light')}`}
              onClick={() => setShowThemeModal(true)}
            />
          </Card>
        </SettingsSection>

        {/* Sound */}
        <SettingsSection
          className="pt-5 md:pt-8"
          title={t('settingsExtended.soundSettings')}
          description={t('settingsExtended.soundNotificationsDesc')}
        >
          <Card className="p-4 md:p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t('settingsExtended.soundNotifications')}</p>
                </div>
                <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t('settingsExtended.voiceAnnouncements')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('settingsExtended.voiceAnnouncementsDesc')}
                  </p>
                </div>
                <Switch checked={ttsEnabled} onCheckedChange={setTtsEnabled} />
              </div>

              <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t('settingsExtended.volume')}</span>
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTestSound}
                    className="shrink-0"
                  >
                    {t('settingsExtended.test')}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </SettingsSection>
      </div>

      {/* Modals */}
      <LanguageModal
        open={showLanguageModal}
        onOpenChange={setShowLanguageModal}
        language={language}
        onSelect={(lang: Locale) => {
          setLanguage(lang);
          setShowLanguageModal(false);
        }}
      />

      <CountryModal
        open={showCountryModal}
        onOpenChange={open => {
          setShowCountryModal(open);
          if (!open) setCountrySearchQuery('');
        }}
        country={country}
        searchQuery={countrySearchQuery}
        onSearchChange={setCountrySearchQuery}
        options={filteredCountryOptions}
        onSelect={code => {
          setCountry(code);
          setShowCountryModal(false);
          setCountrySearchQuery('');
        }}
      />

      <CurrencyModal
        open={showCurrencyModal}
        onOpenChange={open => {
          setShowCurrencyModal(open);
          if (!open) setCurrencySearchQuery('');
        }}
        localCurrency={localCurrency}
        searchQuery={currencySearchQuery}
        onSearchChange={setCurrencySearchQuery}
        sections={currencySections}
        onSelect={(code: string) => {
          setLocalCurrency(code);
          setShowCurrencyModal(false);
          setCurrencySearchQuery('');
          toast({
            title: t('settings.currency'),
            description: `${t('settingsExtended.currencyUpdated')}: ${getCurrencyDisplayName(code)} (${code})`,
          });
        }}
        getDisplayName={getCurrencyDisplayName}
        getFlag={getCurrencyFlag}
      />

      <ThemeModal
        open={showThemeModal}
        onOpenChange={setShowThemeModal}
        theme={theme}
        mode={mode}
        isDark={isDark}
        themes={themes}
        onThemeChange={name => setTheme(name as typeof theme)}
        onModeChange={value => setMode(value as typeof mode)}
      />
    </>
  );
};

/* ── Subcomponents ── */

interface SettingRowProps {
  label: string;
  value: string;
  onClick: () => void;
}

const SettingRow: React.FC<SettingRowProps> = ({ label, value, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between py-2 hover:opacity-80 transition-opacity min-h-[44px]"
  >
    <span className="text-sm font-medium">{label}</span>
    <span className="flex items-center gap-1 text-sm text-muted-foreground">
      {value}
      <ChevronRight className="w-4 h-4 shrink-0" />
    </span>
  </button>
);

/* ── Modals ── */

interface LanguageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: string;
  onSelect: (code: Locale) => void;
}

const LanguageModal: React.FC<LanguageModalProps> = ({
  open,
  onOpenChange,
  language,
  onSelect,
}) => {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('settings.language')}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 -mx-6 px-6 overflow-y-auto min-h-0">
          {SUPPORTED_LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => onSelect(l.code)}
              className={`w-full p-4 text-left hover:bg-surface-hover flex justify-between items-center min-h-[44px] ${
                language === l.code ? 'bg-primary/10' : ''
              }`}
            >
              <span className="text-foreground">{l.name}</span>
              {language === l.code && <Check className="w-5 h-5 text-primary" />}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface CountryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  country: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  options: { code: string; name: string }[];
  onSelect: (code: string) => void;
}

const CountryModal: React.FC<CountryModalProps> = ({
  open,
  onOpenChange,
  country,
  searchQuery,
  onSearchChange,
  options,
  onSelect,
}) => {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('settingsExtended.selectCountry')}</DialogTitle>
        </DialogHeader>
        <div className="mb-2">
          <Input
            placeholder={t('common.search') + '...'}
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex-1 -mx-6 px-6 overflow-y-auto min-h-0">
          {options.map(c => (
            <button
              key={c.code}
              onClick={() => onSelect(c.code)}
              className={`w-full p-4 text-left hover:bg-surface-hover flex justify-between items-center min-h-[44px] ${
                country === c.code ? 'bg-primary/10' : ''
              }`}
            >
              <span className="text-foreground">{c.name}</span>
              {country === c.code && <Check className="w-5 h-5 text-primary" />}
            </button>
          ))}
          {options.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">{t('common.noResults')}</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface CurrencyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  localCurrency: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sections: { label: string; items: CurrencyInfo[] }[];
  onSelect: (code: string) => void;
  getDisplayName: (code: string) => string;
  getFlag: (code: string) => string | null | undefined;
}

const CurrencyModal: React.FC<CurrencyModalProps> = ({
  open,
  onOpenChange,
  localCurrency,
  searchQuery,
  onSearchChange,
  sections,
  onSelect,
  getDisplayName,
  getFlag,
}) => {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('settingsExtended.selectCurrency')}</DialogTitle>
        </DialogHeader>
        <div className="mb-2">
          <Input
            placeholder={t('common.search') + '...'}
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex-1 -mx-6 px-6 overflow-y-auto min-h-0">
          {sections.map((section, sectionIdx) => (
            <div key={section.label}>
              {sectionIdx > 0 && <div className="mx-3 border-t border-border" />}
              <div className="px-3 pt-3 pb-1.5">
                <p className="text-xs font-medium text-muted-foreground">{section.label}</p>
              </div>
              {section.items.map((c: CurrencyInfo) => (
                <button
                  key={c.code}
                  onClick={() => onSelect(c.code)}
                  className={`w-full flex items-center justify-between px-3 py-2 hover:bg-surface-hover transition-colors min-h-[44px] ${
                    localCurrency === c.code ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {c.type === 'crypto' ? (
                      <TokenIcon token={c.code} size={20} className="shrink-0" />
                    ) : getFlag(c.code) ? (
                      <span className="w-5 text-center text-base shrink-0 leading-none">
                        {getFlag(c.code)}
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                        {c.code.slice(0, 2)}
                      </span>
                    )}
                    <span className="text-sm truncate">{getDisplayName(c.code)}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs text-muted-foreground font-mono">{c.code}</span>
                    {localCurrency === c.code && <Check className="w-5 h-5 text-primary" />}
                  </div>
                </button>
              ))}
            </div>
          ))}
          {sections.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">{t('common.noResults')}</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface ThemeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: ThemeName;
  mode: string;
  isDark: boolean;
  themes: { name: string; icon: string; displayName: string; description: string }[];
  onThemeChange: (name: string) => void;
  onModeChange: (value: string) => void;
}

const ThemeModal: React.FC<ThemeModalProps> = ({
  open,
  onOpenChange,
  theme,
  mode,
  isDark,
  themes,
  onThemeChange,
  onModeChange,
}) => {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('settings.appearance')}</DialogTitle>
        </DialogHeader>

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
                onClick={() => onModeChange(option.value)}
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

        <div className="border-t border-border pt-6">
          <h3 className="text-sm font-medium mb-3">{t('settingsExtended.themeStyle')}</h3>
          <p className="text-xs text-muted-foreground mb-3">
            {t('settingsExtended.themeStyleDesc')}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {themes.map(themeItem => (
              <button
                key={themeItem.name}
                onClick={() => onThemeChange(themeItem.name)}
                className={`flex items-center gap-3 p-4 rounded-xl text-left transition-all border-2 ${
                  theme === themeItem.name
                    ? 'bg-primary/10 border-primary'
                    : 'bg-muted hover:bg-surface-hover border-transparent'
                }`}
              >
                <span className="text-2xl">{themeItem.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{themeItem.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{themeItem.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

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

        <Button className="w-full mt-4" onClick={() => onOpenChange(false)}>
          {t('settingsExtended.done')}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
