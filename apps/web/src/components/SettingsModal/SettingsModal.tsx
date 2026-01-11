'use client';

import React, { useState, useCallback, useMemo, createContext, useContext, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
} from '@/components/ui';
import {
  useTheme,
  THEME_INFO,
  useI18n,
  useUserStore,
  useLocalCurrency,
  FIAT_CURRENCIES,
  CRYPTO_CURRENCIES,
  getPopularCurrencies,
} from '@mobazha/core';
import type { CurrencyInfo } from '@mobazha/core';
import {
  X,
  Check,
  Copy,
  Share2,
  Shield,
  Laptop,
  Key,
  Trash2,
  Plus,
  Users,
  Package,
  Lock,
} from 'lucide-react';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';

// Countries data
const countries = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'SG', name: 'Singapore' },
  { code: 'KR', name: 'South Korea' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'RU', name: 'Russia' },
];

// Languages data
const languages = [
  { code: 'en', name: 'English (English, America)' },
  { code: 'zh', name: '中文 (Chinese)' },
  { code: 'es', name: 'Español (Spanish)' },
  { code: 'fr', name: 'Français (French)' },
  { code: 'de', name: 'Deutsch (German)' },
  { code: 'ja', name: '日本語 (Japanese)' },
  { code: 'ko', name: '한국어 (Korean)' },
  { code: 'ru', name: 'Русский (Russian)' },
  { code: 'pt', name: 'Português (Portuguese)' },
  { code: 'it', name: 'Italiano (Italian)' },
];

const acceptedCoins = [
  { symbol: 'BTC', name: 'Bitcoin', enabled: true },
  { symbol: 'ETH', name: 'Ethereum', enabled: true },
  { symbol: 'USDT', name: 'Tether', enabled: true },
  { symbol: 'USDC', name: 'USD Coin', enabled: false },
  { symbol: 'BNB', name: 'Binance Coin', enabled: false },
  { symbol: 'LTC', name: 'Litecoin', enabled: false },
  { symbol: 'BCH', name: 'Bitcoin Cash', enabled: false },
  { symbol: 'ZEC', name: 'Zcash', enabled: false },
];

// Settings tabs
type SettingsTab =
  | 'general'
  | 'page'
  | 'store'
  | 'addresses'
  | 'blocked'
  | 'moderation'
  | 'chatEncryption'
  | 'advanced';

interface SettingsTabItem {
  id: SettingsTab;
  label: string;
}

const settingsTabs: SettingsTabItem[] = [
  { id: 'general', label: 'General' },
  { id: 'page', label: 'Page' },
  { id: 'store', label: 'Store' },
  { id: 'addresses', label: 'Shipping Addresses' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'moderation', label: 'Moderation' },
  { id: 'chatEncryption', label: 'Chat Encryption' },
  { id: 'advanced', label: 'Advanced' },
];

// SettingsModal Context for global open/close
interface SettingsModalContextType {
  isOpen: boolean;
  openSettings: (tab?: SettingsTab) => void;
  closeSettings: () => void;
}

const SettingsModalContext = createContext<SettingsModalContextType | null>(null);

export function useSettingsModal() {
  const context = useContext(SettingsModalContext);
  if (!context) {
    throw new Error('useSettingsModal must be used within SettingsModalProvider');
  }
  return context;
}

// Setting Item Component
interface SettingItemProps {
  title: string;
  description?: string;
  value?: string;
  onClick?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  danger?: boolean;
  required?: boolean;
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
  required,
}: SettingItemProps) => {
  const content = (
    <>
      <div className="flex-1 text-left min-w-0">
        <p className={`font-medium text-sm ${danger ? 'text-red-600' : 'text-foreground'}`}>
          {title}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
        )}
      </div>
      {toggle ? (
        <Switch
          checked={toggleValue}
          onCheckedChange={val => {
            onToggle?.(val);
          }}
          className="ml-3 flex-shrink-0"
        />
      ) : value ? (
        <span className="text-muted-foreground text-sm ml-3 flex-shrink-0">{value}</span>
      ) : onClick ? (
        <svg
          className="w-4 h-4 text-slate-400 ml-3 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      ) : null}
    </>
  );

  const baseClassName = `w-full flex items-center justify-between p-3 hover:bg-surface-hover/50 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 ${
    danger ? 'text-red-600' : ''
  }`;

  if (toggle || !onClick) {
    return <div className={baseClassName}>{content}</div>;
  }

  return (
    <button
      onClick={onClick}
      className={`${baseClassName} active:bg-slate-100 dark:active:bg-slate-700/50`}
    >
      {content}
    </button>
  );
};

// Setting Group Component
interface SettingGroupProps {
  title?: string;
  children: React.ReactNode;
}

const SettingGroup = ({ title, children }: SettingGroupProps) => (
  <div className="mb-4">
    {title && (
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 mb-2">
        {title}
      </h3>
    )}
    <div className="bg-card rounded-lg border border-border overflow-hidden">{children}</div>
  </div>
);

// Form Field Component
interface FormFieldProps {
  label: string;
  required?: boolean;
  description?: string;
  children: React.ReactNode;
}

const FormField = ({ label, required, description, children }: FormFieldProps) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </Label>
    {description && <p className="text-xs text-muted-foreground">{description}</p>}
    {children}
  </div>
);

// Radio Button Group Component (custom implementation)
interface RadioOptionProps {
  value: string;
  label: string;
  checked: boolean;
  onChange: (value: string) => void;
  name: string;
}

const RadioOption = ({ value, label, checked, onChange, name }: RadioOptionProps) => (
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={() => onChange(value)}
      className="w-4 h-4 text-primary border-border focus:ring-primary"
    />
    <span className="text-sm">{label}</span>
  </label>
);

// General Tab Content
const GeneralTabContent: React.FC = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const { theme, mode, setTheme, setMode, themes, isDark } = useTheme();
  const { localCurrency, setLocalCurrency } = useLocalCurrency();

  const [language, setLanguage] = useState('en');
  const [country, setCountry] = useState('US');
  const [showMatureContent, setShowMatureContent] = useState(false);
  const [soundNotifications, setSoundNotifications] = useState(true);
  const [voiceAnnouncements, setVoiceAnnouncements] = useState(false);
  const [notificationVolume, setNotificationVolume] = useState(50);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [currencySearchQuery, setCurrencySearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  const handleTestSound = () => {
    toast({
      title: t('settingsModal.soundTest'),
      description: t('settingsModal.soundTestDesc'),
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      toast({
        title: t('common.success'),
        description: t('settingsModal.settingsSaved'),
      });
    } catch {
      toast({
        title: t('common.error'),
        description: t('settingsModal.saveFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Language */}
        <FormField
          label={t('settings.language')}
          required
          description={t('settingsModal.languageDesc')}
        >
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setShowLanguageModal(true)}
          >
            {languages.find(l => l.code === language)?.name || language}
            <svg
              className="w-4 h-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </Button>
          <a
            href="https://www.transifex.com/mobazha"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            {t('settingsModal.helpTranslate')}
          </a>
        </FormField>

        {/* Country */}
        <FormField
          label={t('settingsExtended.country')}
          required
          description={t('settingsModal.countryDesc')}
        >
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setShowCountryModal(true)}
          >
            {countries.find(c => c.code === country)?.name || country}
            <svg
              className="w-4 h-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </Button>
        </FormField>

        {/* Currency */}
        <FormField
          label={t('settings.currency')}
          required
          description={t('settingsModal.currencyDesc')}
        >
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setShowCurrencyModal(true)}
          >
            {selectedCurrencyInfo?.name} ({selectedCurrencyInfo?.code})
            <svg
              className="w-4 h-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </Button>
        </FormField>

        {/* Display Mature Content */}
        <FormField label={t('settingsModal.matureContent')}>
          <div className="flex gap-6">
            <RadioOption
              name="matureContent"
              value="yes"
              label={t('common.yes')}
              checked={showMatureContent}
              onChange={() => setShowMatureContent(true)}
            />
            <RadioOption
              name="matureContent"
              value="no"
              label={t('common.no')}
              checked={!showMatureContent}
              onChange={() => setShowMatureContent(false)}
            />
          </div>
        </FormField>

        {/* Sound Notifications */}
        <FormField
          label={t('settingsModal.soundNotifications')}
          description={t('settingsModal.soundNotificationsDesc')}
        >
          <div className="flex gap-6">
            <RadioOption
              name="soundNotifications"
              value="yes"
              label={t('common.yes')}
              checked={soundNotifications}
              onChange={() => setSoundNotifications(true)}
            />
            <RadioOption
              name="soundNotifications"
              value="no"
              label={t('common.no')}
              checked={!soundNotifications}
              onChange={() => setSoundNotifications(false)}
            />
          </div>
        </FormField>

        {/* Voice Announcements */}
        <FormField
          label={t('settingsModal.voiceAnnouncements')}
          description={t('settingsModal.voiceAnnouncementsDesc')}
        >
          <div className="flex gap-6">
            <RadioOption
              name="voiceAnnouncements"
              value="yes"
              label={t('common.yes')}
              checked={voiceAnnouncements}
              onChange={() => setVoiceAnnouncements(true)}
            />
            <RadioOption
              name="voiceAnnouncements"
              value="no"
              label={t('common.no')}
              checked={!voiceAnnouncements}
              onChange={() => setVoiceAnnouncements(false)}
            />
          </div>
        </FormField>

        {/* Notification Volume */}
        <FormField label={t('settingsModal.notificationVolume')}>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              {/* Track background */}
              <div className="h-2 bg-muted rounded-full w-full" />
              {/* Track fill */}
              <div
                className="absolute top-0 left-0 h-2 bg-primary rounded-full transition-all"
                style={{ width: `${notificationVolume}%` }}
              />
              {/* Input for interaction */}
              <input
                type="range"
                min="0"
                max="100"
                value={notificationVolume}
                onChange={e => setNotificationVolume(Number(e.target.value))}
                className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer"
              />
              {/* Thumb indicator */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-md border-2 border-background pointer-events-none transition-all"
                style={{ left: `calc(${notificationVolume}% - 8px)` }}
              />
            </div>
            <span className="text-sm text-muted-foreground w-12 text-right">
              {notificationVolume}%
            </span>
            <Button variant="outline" size="sm" onClick={handleTestSound}>
              {t('settingsModal.test')}
            </Button>
          </div>
        </FormField>

        {/* Theme */}
        <FormField label={t('settings.theme')}>
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setShowThemeModal(true)}
          >
            <div className="flex items-center gap-2">
              <span>{THEME_INFO[theme]?.icon || '🎨'}</span>
              <span>{THEME_INFO[theme]?.displayName || 'Classic'}</span>
            </div>
            <svg
              className="w-4 h-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </Button>
        </FormField>

        {/* Dark Mode */}
        <div className="flex items-center justify-between">
          <div>
            <Label>{t('settings.darkMode')}</Label>
            <p className="text-xs text-muted-foreground">
              {mode === 'system'
                ? t('settingsExtended.followingSystem')
                : isDark
                  ? t('settingsExtended.enabled')
                  : t('settingsExtended.disabled')}
            </p>
          </div>
          <Switch checked={isDark} onCheckedChange={val => setMode(val ? 'dark' : 'light')} />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end mt-6 pt-4 border-t">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? t('common.loading') : t('common.save')}
        </Button>
      </div>

      {/* Language Modal */}
      <Dialog open={showLanguageModal} onOpenChange={setShowLanguageModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settings.language')}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-1">
              {languages.map(l => (
                <button
                  key={l.code}
                  onClick={() => {
                    setLanguage(l.code);
                    setShowLanguageModal(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover transition-colors ${
                    language === l.code ? 'bg-primary/10' : ''
                  }`}
                >
                  <span>{l.name}</span>
                  {language === l.code && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Country Modal */}
      <Dialog open={showCountryModal} onOpenChange={setShowCountryModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settingsExtended.country')}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-1">
              {countries.map(c => (
                <button
                  key={c.code}
                  onClick={() => {
                    setCountry(c.code);
                    setShowCountryModal(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover transition-colors ${
                    country === c.code ? 'bg-primary/10' : ''
                  }`}
                >
                  <span>{c.name}</span>
                  {country === c.code && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Currency Modal */}
      <Dialog open={showCurrencyModal} onOpenChange={setShowCurrencyModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settings.currency')}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder={t('common.search')}
            value={currencySearchQuery}
            onChange={e => setCurrencySearchQuery(e.target.value)}
            className="mb-4"
          />
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-1">
              {currencyOptions.map((c: CurrencyInfo) => (
                <button
                  key={c.code}
                  onClick={() => {
                    setLocalCurrency(c.code);
                    setShowCurrencyModal(false);
                    setCurrencySearchQuery('');
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover transition-colors ${
                    localCurrency === c.code ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{c.symbol}</span>
                    <div className="text-left">
                      <p className="text-sm font-medium">{c.code}</p>
                      <p className="text-xs text-muted-foreground">{c.name}</p>
                    </div>
                  </div>
                  {localCurrency === c.code && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Theme Modal */}
      <Dialog open={showThemeModal} onOpenChange={setShowThemeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settings.theme')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {themes.map(themeObj => {
              const themeName = themeObj.name;
              const info = THEME_INFO[themeName];
              return (
                <button
                  key={themeName}
                  onClick={() => {
                    setTheme(themeName);
                    setShowThemeModal(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-surface-hover transition-colors ${
                    theme === themeName ? 'bg-primary/10 ring-1 ring-primary' : ''
                  }`}
                >
                  <span className="text-2xl">{info?.icon || themeObj.icon || '🎨'}</span>
                  <div className="text-left">
                    <p className="font-medium">{info?.displayName || themeObj.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {info?.description || themeObj.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Page Tab Content
const PageTabContent: React.FC = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const { profile, updateProfile } = useUserStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(profile?.name || '');
  const [shortDescription, setShortDescription] = useState(profile?.shortDescription || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [about, setAbout] = useState(profile?.about || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarHashes?.medium || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [links, setLinks] = useState<Array<{ type: string; url: string }>>([]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Create preview URL for now
      const previewUrl = URL.createObjectURL(file);
      setAvatarUrl(previewUrl);
      toast({
        title: t('common.success'),
        description: t('settingsModal.avatarUploaded'),
      });
    } catch {
      toast({
        title: t('common.error'),
        description: t('settingsModal.uploadFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddLink = () => {
    setLinks([...links, { type: 'website', url: '' }]);
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleLinkChange = (index: number, field: 'type' | 'url', value: string) => {
    const newLinks = [...links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setLinks(newLinks);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: t('common.error'),
        description: t('settingsModal.nameRequired'),
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      if (updateProfile) {
        updateProfile({
          name: name.trim(),
          shortDescription: shortDescription.trim(),
          location: location.trim(),
          about: about.trim(),
        });
      }

      toast({
        title: t('common.success'),
        description: t('settingsModal.profileSaved'),
      });
    } catch {
      toast({
        title: t('common.error'),
        description: t('settingsModal.saveFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Name */}
        <FormField label={t('profile.name')} required>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('settingsModal.namePlaceholder')}
          />
        </FormField>

        {/* Short Description */}
        <FormField
          label={t('settingsModal.shortDescription')}
          description={t('settingsModal.shortDescLimit')}
        >
          <Textarea
            value={shortDescription}
            onChange={e => setShortDescription(e.target.value.slice(0, 160))}
            placeholder={t('settingsModal.shortDescPlaceholder')}
            rows={3}
          />
          <p className="text-xs text-muted-foreground text-right">{shortDescription.length}/160</p>
        </FormField>

        {/* Location */}
        <FormField label={t('profile.location')} description={t('settingsModal.locationDesc')}>
          <Input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder={t('settingsModal.locationPlaceholder')}
          />
        </FormField>

        {/* Avatar */}
        <FormField label={t('settings.avatar')} description={t('settingsModal.avatarDesc')}>
          <div className="flex items-center gap-4">
            <Avatar src={avatarUrl} name={name} size="xl" />
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? t('common.loading') : t('settingsModal.selectPhoto')}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
          </div>
        </FormField>

        {/* About */}
        <FormField label={t('profile.about')} description={t('settingsModal.aboutDesc')}>
          <Textarea
            value={about}
            onChange={e => setAbout(e.target.value)}
            placeholder={t('settingsModal.aboutPlaceholder')}
            rows={4}
          />
        </FormField>

        {/* Links */}
        <FormField label={t('settingsModal.links')}>
          <div className="space-y-3">
            {links.map((link, index) => (
              <div key={index} className="flex gap-2">
                <Select value={link.type} onValueChange={v => handleLinkChange(index, 'type', v)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="twitter">Twitter</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="telegram">Telegram</SelectItem>
                    <SelectItem value="discord">Discord</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={link.url}
                  onChange={e => handleLinkChange(index, 'url', e.target.value)}
                  placeholder="https://..."
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveLink(index)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={handleAddLink}>
              <Plus className="w-4 h-4 mr-1" />
              {t('settingsModal.addLink')}
            </Button>
          </div>
        </FormField>
      </div>

      {/* Save Button */}
      <div className="flex justify-end mt-6 pt-4 border-t">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? t('common.loading') : t('common.save')}
        </Button>
      </div>
    </>
  );
};

// Store Tab Content
const StoreTabContent: React.FC = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const { closeSettings } = useSettingsModal();

  const [isPrivateStore, setIsPrivateStore] = useState(false);
  const [showCoinsModal, setShowCoinsModal] = useState(false);
  const [showPoliciesModal, setShowPoliciesModal] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [coins, setCoins] = useState(acceptedCoins);

  // Store policies state
  const [returnPolicy, setReturnPolicy] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');

  // Shipping options state
  const [shippingOptions, setShippingOptions] = useState<
    Array<{ name: string; price: string; days: string }>
  >([{ name: 'Standard Shipping', price: '5.00', days: '5-7' }]);

  const enabledCoinsCount = coins.filter(c => c.enabled).length;

  const handleComingSoon = (feature: string) => {
    toast({
      title: t('settingsExtended.comingSoon'),
      description: `${feature} ${t('common.comingSoon').toLowerCase()}`,
    });
  };

  const handleAddShipping = () => {
    setShippingOptions([...shippingOptions, { name: '', price: '', days: '' }]);
  };

  const handleRemoveShipping = (index: number) => {
    setShippingOptions(shippingOptions.filter((_, i) => i !== index));
  };

  const handleShippingChange = (index: number, field: 'name' | 'price' | 'days', value: string) => {
    const newOptions = [...shippingOptions];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setShippingOptions(newOptions);
  };

  // 导航到访问控制相关页面
  const navigateToAccessControl = (path: string) => {
    closeSettings();
    router.push(path);
  };

  return (
    <>
      {/* 访问控制设置组 */}
      <SettingGroup title={t('settingsExtended.accessControl')}>
        <SettingItem
          title={t('settingsExtended.privateStore')}
          description={t('settingsExtended.privateStoreDesc')}
          toggle
          toggleValue={isPrivateStore}
          onToggle={setIsPrivateStore}
        />
        <SettingItem
          title={t('settingsExtended.userGroups')}
          description={t('settingsExtended.userGroupsDesc')}
          onClick={() => navigateToAccessControl('/settings/user-groups')}
        />
        <SettingItem
          title={t('settingsExtended.productGroups')}
          description={t('settingsExtended.productGroupsDesc')}
          onClick={() => navigateToAccessControl('/settings/product-groups')}
        />
        <SettingItem
          title={t('settingsExtended.accessRequests')}
          description={t('settingsExtended.accessRequestsDesc')}
          onClick={() => navigateToAccessControl('/settings/access-requests')}
        />
      </SettingGroup>

      {/* 店铺设置组 */}
      <SettingGroup title={t('settingsExtended.storeSettings')}>
        <SettingItem
          title={t('settingsExtended.storePolicies')}
          description={t('settingsExtended.storePoliciesDesc')}
          onClick={() => setShowPoliciesModal(true)}
        />
        <SettingItem
          title={t('settingsExtended.moderators')}
          description={t('settingsExtended.moderatorsDesc')}
          onClick={() => handleComingSoon('Moderators')}
        />
        <SettingItem
          title={t('settingsExtended.acceptedCryptocurrencies')}
          value={t('settingsExtended.selected', { count: enabledCoinsCount })}
          onClick={() => setShowCoinsModal(true)}
        />
        <SettingItem
          title={t('settingsExtended.shippingOptions')}
          description={t('settingsExtended.shippingOptionsDesc')}
          onClick={() => setShowShippingModal(true)}
        />
      </SettingGroup>

      {/* Coins Modal */}
      <Dialog open={showCoinsModal} onOpenChange={setShowCoinsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settingsExtended.acceptedCryptocurrencies')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {coins.map((coin, index) => (
              <div
                key={coin.symbol}
                className="flex items-center justify-between p-3 rounded-lg bg-surface-hover/30"
              >
                <div>
                  <p className="font-medium">{coin.symbol}</p>
                  <p className="text-xs text-muted-foreground">{coin.name}</p>
                </div>
                <Switch
                  checked={coin.enabled}
                  onCheckedChange={checked => {
                    const newCoins = [...coins];
                    newCoins[index] = { ...coin, enabled: checked };
                    setCoins(newCoins);
                  }}
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Policies Modal */}
      <Dialog open={showPoliciesModal} onOpenChange={setShowPoliciesModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('settingsExtended.storePolicies')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label={t('product.refundPolicy')}>
              <Textarea
                value={returnPolicy}
                onChange={e => setReturnPolicy(e.target.value)}
                placeholder={t('settingsModal.policyPlaceholder')}
                rows={4}
              />
            </FormField>
            <FormField label={t('product.termsAndConditions')}>
              <Textarea
                value={termsAndConditions}
                onChange={e => setTermsAndConditions(e.target.value)}
                placeholder={t('settingsModal.termsPlaceholder')}
                rows={4}
              />
            </FormField>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowPoliciesModal(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => {
                  toast({
                    title: t('common.success'),
                    description: t('settingsModal.settingsSaved'),
                  });
                  setShowPoliciesModal(false);
                }}
              >
                {t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shipping Modal */}
      <Dialog open={showShippingModal} onOpenChange={setShowShippingModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('settingsExtended.shippingOptions')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {shippingOptions.map((option, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">Shipping Option {index + 1}</span>
                  {shippingOptions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveShipping(index)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <Input
                  value={option.name}
                  onChange={e => handleShippingChange(index, 'name', e.target.value)}
                  placeholder="Shipping name (e.g. Standard, Express)"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Price (USD)</Label>
                    <Input
                      type="number"
                      value={option.price}
                      onChange={e => handleShippingChange(index, 'price', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Est. Days</Label>
                    <Input
                      value={option.days}
                      onChange={e => handleShippingChange(index, 'days', e.target.value)}
                      placeholder="5-7"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={handleAddShipping} className="w-full">
              <Plus className="w-4 h-4 mr-1" />
              Add Shipping Option
            </Button>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowShippingModal(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => {
                  toast({
                    title: t('common.success'),
                    description: t('settingsModal.settingsSaved'),
                  });
                  setShowShippingModal(false);
                }}
              >
                {t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Addresses Tab Content
interface ShippingAddress {
  id: string;
  name: string;
  company?: string;
  street: string;
  apartment?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  deliveryNotes?: string;
}

const AddressesTabContent: React.FC = () => {
  const { t } = useI18n();
  const { toast } = useToast();

  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);

  const [newAddress, setNewAddress] = useState<Partial<ShippingAddress>>({
    name: '',
    company: '',
    street: '',
    apartment: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    deliveryNotes: '',
  });

  const handleDeleteAddress = (id: string) => {
    setAddresses(addresses.filter(a => a.id !== id));
    toast({
      title: t('common.success'),
      description: t('settingsModal.addressDeleted'),
    });
  };

  const handleAddAddress = () => {
    if (!newAddress.name || !newAddress.street || !newAddress.city || !newAddress.country) {
      toast({
        title: t('common.error'),
        description: t('settingsModal.fillRequired'),
        variant: 'destructive',
      });
      return;
    }

    const address: ShippingAddress = {
      id: Date.now().toString(),
      name: newAddress.name!,
      company: newAddress.company,
      street: newAddress.street!,
      apartment: newAddress.apartment,
      city: newAddress.city!,
      state: newAddress.state || '',
      postalCode: newAddress.postalCode || '',
      country: newAddress.country!,
      deliveryNotes: newAddress.deliveryNotes,
    };

    setAddresses([...addresses, address]);
    setNewAddress({
      name: '',
      company: '',
      street: '',
      apartment: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
      deliveryNotes: '',
    });

    toast({
      title: t('common.success'),
      description: t('settingsModal.addressAdded'),
    });
  };

  return (
    <div className="space-y-6">
      {/* Existing Addresses */}
      {addresses.length > 0 && (
        <div className="space-y-3">
          {addresses.map(address => (
            <div key={address.id} className="p-4 border rounded-lg bg-card">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{address.name}</p>
                  {address.company && (
                    <p className="text-sm text-muted-foreground">{address.company}</p>
                  )}
                  <p className="text-sm">{address.street}</p>
                  {address.apartment && <p className="text-sm">{address.apartment}</p>}
                  <p className="text-sm">
                    {address.city}, {address.state} {address.postalCode}
                  </p>
                  <p className="text-sm">{countries.find(c => c.code === address.country)?.name}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleDeleteAddress(address.id)}>
                  {t('common.delete')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Address Form */}
      <div className="space-y-4">
        <h3 className="font-semibold">{t('settingsModal.newAddress')}</h3>

        <FormField label={t('profile.name')} required>
          <Input
            value={newAddress.name}
            onChange={e => setNewAddress({ ...newAddress, name: e.target.value })}
            placeholder={t('settingsModal.recipientName')}
          />
        </FormField>

        <FormField label={t('settingsModal.company')}>
          <Input
            value={newAddress.company}
            onChange={e => setNewAddress({ ...newAddress, company: e.target.value })}
            placeholder={t('settingsModal.optional')}
          />
        </FormField>

        <FormField label={t('settingsModal.street')}>
          <Input
            value={newAddress.street}
            onChange={e => setNewAddress({ ...newAddress, street: e.target.value })}
            placeholder="427 N Greenfield Road"
          />
        </FormField>

        <FormField label={t('settingsModal.apartment')}>
          <Input
            value={newAddress.apartment}
            onChange={e => setNewAddress({ ...newAddress, apartment: e.target.value })}
            placeholder={t('settingsModal.optional')}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t('settingsModal.city')}>
            <Input
              value={newAddress.city}
              onChange={e => setNewAddress({ ...newAddress, city: e.target.value })}
              placeholder="Chicago"
            />
          </FormField>

          <FormField label={t('settingsModal.state')}>
            <Input
              value={newAddress.state}
              onChange={e => setNewAddress({ ...newAddress, state: e.target.value })}
              placeholder="IL"
            />
          </FormField>
        </div>

        <FormField label={t('settingsModal.postalCode')}>
          <Input
            value={newAddress.postalCode}
            onChange={e => setNewAddress({ ...newAddress, postalCode: e.target.value })}
            placeholder="60654"
          />
        </FormField>

        <FormField label={t('settingsExtended.country')} required>
          <Select
            value={newAddress.country}
            onValueChange={v => setNewAddress({ ...newAddress, country: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {countries.map(c => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label={t('settingsModal.deliveryNotes')}>
          <Input
            value={newAddress.deliveryNotes}
            onChange={e => setNewAddress({ ...newAddress, deliveryNotes: e.target.value })}
            placeholder={t('settingsModal.deliveryNotesPlaceholder')}
          />
        </FormField>

        <Button onClick={handleAddAddress} className="w-full">
          {t('settingsModal.addAddress')}
        </Button>
      </div>
    </div>
  );
};

// Blocked Tab Content
const BlockedTabContent: React.FC = () => {
  const { t } = useI18n();
  const [blockedUsers, setBlockedUsers] = useState<Array<{ id: string; name: string }>>([]);

  const handleUnblock = (id: string) => {
    setBlockedUsers(blockedUsers.filter(u => u.id !== id));
  };

  return (
    <div>
      {blockedUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">{t('settingsModal.noBlockedUsers')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {blockedUsers.map(user => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 rounded-lg bg-card border"
            >
              <span>{user.name}</span>
              <Button variant="outline" size="sm" onClick={() => handleUnblock(user.id)}>
                {t('settingsModal.unblock')}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Moderation Tab Content
const ModerationTabContent: React.FC = () => {
  const { t } = useI18n();
  const { toast } = useToast();

  const [moderateDisputes, setModerateDisputes] = useState(false);
  const [feeType, setFeeType] = useState<'percentage' | 'fixed'>('percentage');
  const [feeAmount, setFeeAmount] = useState('0');
  const [description, setDescription] = useState('');
  const [terms, setTerms] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en']);
  const [readGuidelines, setReadGuidelines] = useState(false);
  const [understandTerms, setUnderstandTerms] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (moderateDisputes && (!description || !terms)) {
      toast({
        title: t('common.error'),
        description: t('settingsModal.fillRequired'),
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      toast({
        title: t('common.success'),
        description: t('settingsModal.moderationSaved'),
      });
    } catch {
      toast({
        title: t('common.error'),
        description: t('settingsModal.saveFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">{t('settingsModal.disputeResolution')}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t('settingsModal.disputeResolutionDesc')}
        </p>
      </div>

      {/* Moderate Disputes */}
      <FormField label={t('settingsModal.moderateDisputes')} required>
        <div className="flex gap-6">
          <RadioOption
            name="moderateDisputes"
            value="on"
            label={t('settingsModal.on')}
            checked={moderateDisputes}
            onChange={() => setModerateDisputes(true)}
          />
          <RadioOption
            name="moderateDisputes"
            value="off"
            label={t('settingsModal.off')}
            checked={!moderateDisputes}
            onChange={() => setModerateDisputes(false)}
          />
        </div>
      </FormField>

      {/* Fee */}
      <FormField
        label={t('settingsModal.pricePerDispute')}
        required
        description={t('settingsModal.pricePerDisputeDesc')}
      >
        <div className="flex gap-2">
          <Select
            value={feeType}
            onValueChange={(v: string) => setFeeType(v as 'percentage' | 'fixed')}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">{t('settingsModal.percentage')}</SelectItem>
              <SelectItem value="fixed">{t('settingsModal.fixedAmount')}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1 flex items-center gap-2">
            <Input
              type="number"
              value={feeAmount}
              onChange={e => setFeeAmount(e.target.value)}
              className="w-24"
            />
            <span className="text-muted-foreground">{feeType === 'percentage' ? '%' : 'USD'}</span>
          </div>
        </div>
      </FormField>

      {/* Description */}
      <FormField label={t('settingsModal.moderationDescription')} required>
        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={t('settingsModal.moderationDescPlaceholder')}
          rows={4}
        />
      </FormField>

      {/* Terms */}
      <FormField label={t('settingsModal.moderationTerms')} required>
        <Textarea
          value={terms}
          onChange={e => setTerms(e.target.value)}
          placeholder={t('settingsModal.moderationTermsPlaceholder')}
          rows={4}
        />
      </FormField>

      {/* Languages */}
      <FormField label={t('settingsModal.languages')} required>
        <div className="flex flex-wrap gap-2">
          {languages.slice(0, 6).map(lang => (
            <label
              key={lang.code}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
                selectedLanguages.includes(lang.code)
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-muted border-transparent hover:border-border'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedLanguages.includes(lang.code)}
                onChange={e => {
                  if (e.target.checked) {
                    setSelectedLanguages([...selectedLanguages, lang.code]);
                  } else {
                    setSelectedLanguages(selectedLanguages.filter(l => l !== lang.code));
                  }
                }}
                className="sr-only"
              />
              <span className="text-sm">{lang.name.split(' ')[0]}</span>
              {selectedLanguages.includes(lang.code) && (
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={e => {
                    e.preventDefault();
                    setSelectedLanguages(selectedLanguages.filter(l => l !== lang.code));
                  }}
                />
              )}
            </label>
          ))}
        </div>
      </FormField>

      {/* Checkboxes */}
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <Checkbox
            id="guidelines"
            checked={readGuidelines}
            onCheckedChange={v => setReadGuidelines(!!v)}
          />
          <Label htmlFor="guidelines" className="text-sm leading-relaxed cursor-pointer">
            {t('settingsModal.readGuidelines')}{' '}
            <a href="#" className="text-primary hover:underline">
              {t('settingsModal.guidelinesLink')}
            </a>
          </Label>
        </div>
        <div className="flex items-start gap-2">
          <Checkbox
            id="understand"
            checked={understandTerms}
            onCheckedChange={v => setUnderstandTerms(!!v)}
          />
          <Label htmlFor="understand" className="text-sm leading-relaxed cursor-pointer">
            {t('settingsModal.understandTerms')}
          </Label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? t('common.loading') : t('common.save')}
        </Button>
      </div>
    </div>
  );
};

// Chat Encryption Tab Content
const ChatEncryptionTabContent: React.FC = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const { profile } = useUserStore();

  const [invitePolicy, setInvitePolicy] = useState<'all' | 'mobazha' | 'confirm'>('mobazha');
  const [lastBackup, setLastBackup] = useState<Date | null>(new Date());
  // Generate stable device ID using useState initializer (runs only once)
  const [deviceId] = useState(() => `MBZ_DESKTOP_${Date.now().toString(36).toUpperCase()}`);

  const chatId = profile?.peerID ? `@peer_${profile.peerID.toLowerCase()}:matrix.mobazha.org` : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(chatId);
      toast({
        title: t('common.copied'),
        description: t('settingsModal.chatIdCopied'),
      });
    } catch {
      toast({
        title: t('common.error'),
        description: t('settingsModal.copyFailed'),
        variant: 'destructive',
      });
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: 'My Chat ID',
        text: chatId,
      });
    } catch {
      // Fallback to copy
      handleCopy();
    }
  };

  const handleBackup = async () => {
    setLastBackup(new Date());
    toast({
      title: t('common.success'),
      description: t('settingsModal.keysBackedUp'),
    });
  };

  const handleRestore = () => {
    toast({
      title: t('settingsModal.restoreKeys'),
      description: t('settingsModal.restoreKeysDesc'),
    });
  };

  return (
    <div className="space-y-6">
      {/* Encryption Status */}
      <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <Shield className="w-5 h-5" />
          <span className="font-medium">{t('settingsModal.e2eAvailable')}</span>
        </div>
      </div>

      {/* My Chat ID */}
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold">{t('settingsModal.myChatId')}</h3>
          <p className="text-sm text-muted-foreground">{t('settingsModal.myChatIdDesc')}</p>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm break-all">
            {chatId || t('settingsModal.notLoggedIn')}
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} disabled={!chatId}>
              <Copy className="w-4 h-4 mr-1" />
              {t('common.copy')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare} disabled={!chatId}>
              <Share2 className="w-4 h-4 mr-1" />
              {t('common.share')}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t('settingsModal.chatIdNote')}</p>
      </div>

      {/* Current Device */}
      <div className="space-y-3">
        <h3 className="font-semibold">{t('settingsModal.currentDevice')}</h3>
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Laptop className="w-8 h-8 text-muted-foreground" />
          <div>
            <p className="font-medium">{t('settingsModal.browserDevice')}</p>
            <p className="text-xs text-muted-foreground">Device ID: {deviceId}</p>
          </div>
        </div>
      </div>

      {/* Key Backup */}
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold">{t('settingsModal.keyBackup')}</h3>
          <p className="text-sm text-muted-foreground">{t('settingsModal.keyBackupDesc')}</p>
        </div>
        {lastBackup && (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <Check className="w-4 h-4" />
            <span className="text-sm">{t('settingsModal.backupExists')}</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {t('settingsModal.lastBackup')}:{' '}
          {lastBackup?.toLocaleString() || t('settingsModal.never')}
        </p>
        <div className="flex gap-2">
          <Button onClick={handleBackup}>
            <Key className="w-4 h-4 mr-2" />
            {t('settingsModal.backupNow')}
          </Button>
          <Button variant="outline" onClick={handleRestore}>
            {t('settingsModal.restoreKeys')}
          </Button>
        </div>
      </div>

      {/* Message Invites */}
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold">{t('settingsModal.messageInvites')}</h3>
          <p className="text-sm text-muted-foreground">{t('settingsModal.messageInvitesDesc')}</p>
        </div>
        <div className="space-y-2">
          {[
            {
              value: 'all' as const,
              title: t('settingsModal.autoAcceptAll'),
              desc: t('settingsModal.autoAcceptAllDesc'),
            },
            {
              value: 'mobazha' as const,
              title: t('settingsModal.autoAcceptMobazha'),
              desc: t('settingsModal.autoAcceptMobazhaDesc'),
            },
            {
              value: 'confirm' as const,
              title: t('settingsModal.alwaysConfirm'),
              desc: t('settingsModal.alwaysConfirmDesc'),
            },
          ].map(option => (
            <label
              key={option.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                invitePolicy === option.value ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'
              }`}
            >
              <input
                type="radio"
                name="invitePolicy"
                value={option.value}
                checked={invitePolicy === option.value}
                onChange={() => setInvitePolicy(option.value)}
                className="mt-0.5 w-4 h-4 text-primary border-border focus:ring-primary"
              />
              <div>
                <p className="font-medium">{option.title}</p>
                <p className="text-sm text-muted-foreground">{option.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

// Advanced Tab Content
const AdvancedTabContent: React.FC = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const { logout } = useUserStore();
  const { closeSettings } = useSettingsModal();

  const [analytics, setAnalytics] = useState(true);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);

  const handleBackupWallet = useCallback(() => {
    toast({
      title: t('settingsExtended.comingSoon'),
      description: t('settingsExtended.backupComingSoon'),
    });
  }, [toast, t]);

  const handleBackupProfile = useCallback(() => {
    toast({
      title: t('settingsExtended.comingSoon'),
      description: t('settingsExtended.backupComingSoon'),
    });
  }, [toast, t]);

  const handleResync = useCallback(async () => {
    setIsResyncing(true);
    try {
      // Simulate resync
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: t('common.success'),
        description: t('settingsModal.resyncComplete'),
      });
    } catch {
      toast({
        title: t('common.error'),
        description: t('settingsModal.resyncFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsResyncing(false);
    }
  }, [toast, t]);

  const handleLogoutConfirm = useCallback(() => {
    logout();
    closeSettings();
    router.push('/');
  }, [logout, closeSettings, router]);

  return (
    <>
      <SettingGroup>
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
          onClick={handleBackupWallet}
        />
        <SettingItem
          title={t('settingsExtended.backupProfile')}
          description={t('settingsExtended.backupProfileDesc')}
          onClick={handleBackupProfile}
        />
        <SettingItem
          title={t('settingsExtended.restoreProfile')}
          description={t('settingsExtended.restoreProfileDesc')}
          onClick={() => setShowRestoreDialog(true)}
        />
        <SettingItem
          title={t('settingsExtended.resyncTransactions')}
          description={isResyncing ? t('common.loading') : t('settingsExtended.resyncDesc')}
          onClick={handleResync}
        />
      </SettingGroup>

      <SettingGroup>
        <SettingItem
          title={t('userMenu.logout')}
          onClick={() => setShowLogoutDialog(true)}
          danger
        />
      </SettingGroup>

      {/* Restore Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settingsExtended.restoreProfile')}</AlertDialogTitle>
            <AlertDialogDescription>{t('settingsExtended.restoreWarning')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                toast({
                  title: t('settingsExtended.comingSoon'),
                  description: t('settingsExtended.restoreComingSoon'),
                });
                setShowRestoreDialog(false);
              }}
            >
              {t('common.continue')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('userMenu.logout')}</AlertDialogTitle>
            <AlertDialogDescription>{t('settingsExtended.logoutWarning')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogoutConfirm}>
              {t('userMenu.logout')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Main Settings Modal Component
interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: SettingsTab;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onOpenChange,
  initialTab = 'general',
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Reset to initial tab when opening
  React.useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralTabContent />;
      case 'page':
        return <PageTabContent />;
      case 'store':
        return <StoreTabContent />;
      case 'addresses':
        return <AddressesTabContent />;
      case 'blocked':
        return <BlockedTabContent />;
      case 'moderation':
        return <ModerationTabContent />;
      case 'chatEncryption':
        return <ChatEncryptionTabContent />;
      case 'advanced':
        return <AdvancedTabContent />;
      default:
        return <GeneralTabContent />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[85vh] p-0 gap-0 overflow-hidden [&>button]:hidden">
        <div className="flex h-[80vh] max-h-[85vh]">
          {/* Left Sidebar */}
          <div className="w-52 bg-muted/30 border-r border-border flex flex-col shrink-0">
            <DialogHeader className="p-4 border-b border-border">
              <DialogTitle className="text-sm font-semibold uppercase tracking-wide">
                {t('settings.title')}
              </DialogTitle>
            </DialogHeader>
            <nav className="flex-1 py-2 overflow-y-auto">
              {settingsTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary font-medium border-r-2 border-primary'
                      : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Right Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold">
                {settingsTabs.find(tab => tab.id === activeTab)?.label || activeTab}
              </h2>
              <button
                onClick={() => onOpenChange(false)}
                className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content - scrollable area */}
            <div className="flex-1 overflow-y-auto p-6">{renderTabContent()}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Provider Component
interface SettingsModalProviderProps {
  children: React.ReactNode;
}

export const SettingsModalProvider: React.FC<SettingsModalProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<SettingsTab>('general');

  const openSettings = useCallback((tab: SettingsTab = 'general') => {
    setInitialTab(tab);
    setIsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <SettingsModalContext.Provider value={{ isOpen, openSettings, closeSettings }}>
      {children}
      <SettingsModal open={isOpen} onOpenChange={setIsOpen} initialTab={initialTab} />
    </SettingsModalContext.Provider>
  );
};

export default SettingsModal;
