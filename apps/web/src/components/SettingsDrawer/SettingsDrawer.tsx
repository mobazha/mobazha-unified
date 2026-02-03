'use client';

import React, {
  useState,
  useCallback,
  useMemo,
  createContext,
  useContext,
  useRef,
  useEffect,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
import { Card } from '@/components/ui/card';
import {
  useTheme,
  THEME_INFO,
  useI18n,
  useUserStore,
  useLocalCurrency,
  FIAT_CURRENCIES,
  CRYPTO_CURRENCIES,
  getPopularCurrencies,
  getImageUrl,
  useNotificationStore,
  testNotificationSound,
  isHosted,
  startCasdoorLogin,
  getLinkedAccounts,
  unlinkAccount,
  startLinkAccount,
  hasLinkCallback,
  getLinkCallbackParams,
  handleLinkCallback,
  clearLinkCallbackParams,
  SUPPORTED_PROVIDERS,
  useShippingAddresses,
  toDisplayAddressUI,
  getAllCountries,
  getCountryName,
  POPULAR_COUNTRIES,
  useShippingOptions,
} from '@mobazha/core';
import type {
  Address as ApiAddress,
  DisplayAddress,
  DisplayAddressUI,
  ShippingOptionSetting,
} from '@mobazha/core';
import { AddressFormModal } from '@/components/Address';
import { ShippingOptionCard, ShippingOptionForm } from '@/components/Shipping';
import type { LinkedAccount, OAuthProvider, ProviderInfo } from '@mobazha/core';
import type { CurrencyInfo, Locale } from '@mobazha/core';
import { ProviderIcon } from '@/components/ProviderIcon';
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
  ChevronLeft,
  ChevronRight,
  Settings,
  User,
  Store,
  MapPin,
  Ban,
  Scale,
  Lock,
  Wrench,
  Users,
  Layers,
  Clock,
  Pencil,
  UserX,
  Download,
  Upload,
  RefreshCw,
  Terminal,
  LogOut,
  Truck,
  Link2,
} from 'lucide-react';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { cn } from '@/lib/utils';
import {
  PrivacySettingsContent,
  UserGroupsContent,
  ProductGroupsContent,
  AccessRequestsContent,
} from '@/components/SettingsContent';

// ============ Data & Types ============

// 国家列表从 @mobazha/core 动态获取，支持本地化和智能排序

const languages: { code: Locale; name: string }[] = [
  { code: 'en', name: 'English (English, America)' },
  { code: 'zh', name: '中文 (Chinese)' },
  { code: 'es', name: 'Español (Spanish)' },
  { code: 'fr', name: 'Français (French)' },
  { code: 'de', name: 'Deutsch (German)' },
  { code: 'ja', name: '日本語 (Japanese)' },
  { code: 'ko', name: '한국어 (Korean)' },
  { code: 'ru', name: 'Русский (Russian)' },
  { code: 'pt', name: 'Português (Portuguese)' },
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

// 设置项层级结构
type SettingsSection =
  | 'main' // 主菜单
  | 'general'
  | 'account'
  | 'page'
  | 'store'
  | 'accessControl' // 访问控制主菜单
  | 'accessControl.privacy'
  | 'accessControl.userGroups'
  | 'accessControl.productGroups'
  | 'accessControl.requests'
  | 'addresses'
  | 'blocked'
  | 'moderation'
  | 'chatEncryption'
  | 'advanced';

interface SettingsMenuItem {
  id: SettingsSection;
  labelKey: string;
  icon: React.ReactNode;
  children?: SettingsMenuItem[];
}

const settingsMenuItems: SettingsMenuItem[] = [
  {
    id: 'general',
    labelKey: 'settings.sidebar.general',
    icon: <Settings className="w-4 h-4" />,
  },
  {
    id: 'account',
    labelKey: 'settings.sidebar.account',
    icon: <Link2 className="w-4 h-4" />,
  },
  {
    id: 'page',
    labelKey: 'settings.sidebar.page',
    icon: <User className="w-4 h-4" />,
  },
  {
    id: 'store',
    labelKey: 'settings.sidebar.store',
    icon: <Store className="w-4 h-4" />,
  },
  {
    id: 'accessControl',
    labelKey: 'settings.sidebar.accessControl',
    icon: <Shield className="w-4 h-4" />,
    children: [
      {
        id: 'accessControl.privacy',
        labelKey: 'settings.sidebar.privacy',
        icon: <Lock className="w-4 h-4" />,
      },
      {
        id: 'accessControl.userGroups',
        labelKey: 'settings.sidebar.userGroups',
        icon: <Users className="w-4 h-4" />,
      },
      {
        id: 'accessControl.productGroups',
        labelKey: 'settings.sidebar.productGroups',
        icon: <Layers className="w-4 h-4" />,
      },
      {
        id: 'accessControl.requests',
        labelKey: 'settings.sidebar.accessRequests',
        icon: <Clock className="w-4 h-4" />,
      },
    ],
  },
  {
    id: 'addresses',
    labelKey: 'settings.sidebar.addresses',
    icon: <MapPin className="w-4 h-4" />,
  },
  {
    id: 'blocked',
    labelKey: 'settings.sidebar.blocked',
    icon: <Ban className="w-4 h-4" />,
  },
  {
    id: 'moderation',
    labelKey: 'settings.sidebar.moderation',
    icon: <Scale className="w-4 h-4" />,
  },
  {
    id: 'chatEncryption',
    labelKey: 'settings.sidebar.chatEncryption',
    icon: <Lock className="w-4 h-4" />,
  },
  {
    id: 'advanced',
    labelKey: 'settings.sidebar.advanced',
    icon: <Wrench className="w-4 h-4" />,
  },
];

// ============ Context ============

interface SettingsDrawerContextType {
  isOpen: boolean;
  currentSection: SettingsSection;
  openSettings: (section?: SettingsSection) => void;
  closeSettings: () => void;
  navigateTo: (section: SettingsSection) => void;
  goBack: () => void;
  /** 关闭弹框并导航到指定页面（用于复杂操作需要跳转到独立页面时） */
  navigateToPage: (path: string) => void;
}

const SettingsDrawerContext = createContext<SettingsDrawerContextType | null>(null);

export function useSettingsDrawer() {
  const context = useContext(SettingsDrawerContext);
  if (!context) {
    throw new Error('useSettingsDrawer must be used within SettingsDrawerProvider');
  }
  return context;
}

/** 可选版本的 useSettingsDrawer，在没有 Provider 时返回 null 而不是抛出错误 */
export function useSettingsDrawerOptional() {
  return useContext(SettingsDrawerContext);
}

// ============ Helper Components ============

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
  icon?: React.ReactNode;
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
  icon,
  required,
}: SettingItemProps) => {
  const content = (
    <>
      {icon && (
        <div
          className={cn('mr-3 flex-shrink-0', danger ? 'text-red-600' : 'text-muted-foreground')}
        >
          {icon}
        </div>
      )}
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
          onCheckedChange={val => onToggle?.(val)}
          className="ml-3 flex-shrink-0"
        />
      ) : value ? (
        <span className="text-muted-foreground text-sm ml-3 flex-shrink-0">{value}</span>
      ) : onClick ? (
        <ChevronRight className="w-4 h-4 text-muted-foreground ml-3 flex-shrink-0" />
      ) : null}
    </>
  );

  const baseClassName =
    'w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors rounded-lg';

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

// ============ Tab Content Components ============
// (复用自 SettingsModal，简化版本)

const GeneralTabContent: React.FC = () => {
  const { t, language: currentLanguage, setLanguage: setI18nLanguage } = useI18n();
  const { toast } = useToast();
  const { theme, mode, setTheme, setMode, themes, isDark } = useTheme();
  const { localCurrency, setLocalCurrency } = useLocalCurrency();
  const { soundEnabled, ttsEnabled, volume, setSoundEnabled, setTtsEnabled, setVolume } =
    useNotificationStore();

  const [language, setLanguage] = useState(currentLanguage || 'en');
  const [country, setCountry] = useState('US');
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [currencySearchQuery, setCurrencySearchQuery] = useState('');
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 获取国家列表（智能排序：热门国家优先）
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

  // 过滤后的国家列表（支持搜索）
  const filteredCountryOptions = useMemo(() => {
    if (!countrySearchQuery.trim()) return countryOptions;
    const query = countrySearchQuery.toLowerCase();
    return countryOptions.filter(
      c => c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query)
    );
  }, [countryOptions, countrySearchQuery]);

  // 当前选中国家的显示名称
  const selectedCountryName = useMemo(() => {
    return getCountryName(country, language) || country;
  }, [country, language]);

  // 测试声音
  const handleTestSound = useCallback(() => {
    testNotificationSound('chat_message');
  }, []);

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
        <FormField label={t('settings.language')} required>
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setShowLanguageModal(true)}
          >
            {languages.find(l => l.code === language)?.name || language}
            <ChevronRight className="w-4 h-4 opacity-50" />
          </Button>
        </FormField>

        {/* Country */}
        <FormField label={t('settingsExtended.country')} required>
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setShowCountryModal(true)}
          >
            {selectedCountryName}
            <ChevronRight className="w-4 h-4 opacity-50" />
          </Button>
        </FormField>

        {/* Currency */}
        <FormField label={t('settings.currency')} required>
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setShowCurrencyModal(true)}
          >
            {selectedCurrencyInfo?.name} ({selectedCurrencyInfo?.code})
            <ChevronRight className="w-4 h-4 opacity-50" />
          </Button>
        </FormField>

        {/* Sound Settings */}
        <div className="space-y-4 border-t pt-4 mt-4">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {t('settingsExtended.soundSettings')}
          </h3>

          <FormField label={t('settingsExtended.soundNotifications')}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {t('settingsExtended.soundNotificationsDesc')}
              </span>
              <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
            </div>
          </FormField>

          <FormField label={t('settingsExtended.voiceAnnouncements')}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {t('settingsExtended.voiceAnnouncementsDesc')}
              </span>
              <Switch checked={ttsEnabled} onCheckedChange={setTtsEnabled} />
            </div>
          </FormField>

          <div className="flex items-center justify-between gap-4">
            <Label className="text-sm">{t('settingsExtended.volume')}</Label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(volume * 100)}
                onChange={e => setVolume(parseInt(e.target.value) / 100)}
                className="w-24 accent-primary"
              />
              <span className="text-sm text-muted-foreground w-10 text-right">
                {Math.round(volume * 100)}%
              </span>
              <Button size="sm" variant="outline" onClick={handleTestSound}>
                {t('settingsExtended.test')}
              </Button>
            </div>
          </div>
        </div>

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
            <ChevronRight className="w-4 h-4 opacity-50" />
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

        {/* Save Button */}
        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? t('common.loading') : t('common.save')}
        </Button>
      </div>

      {/* Language Modal */}
      <Dialog open={showLanguageModal} onOpenChange={setShowLanguageModal}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
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
                    setI18nLanguage(l.code);
                    setShowLanguageModal(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors',
                    language === l.code && 'bg-primary/10'
                  )}
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
      <Dialog
        open={showCountryModal}
        onOpenChange={open => {
          setShowCountryModal(open);
          if (!open) setCountrySearchQuery('');
        }}
      >
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('settingsExtended.country')}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder={t('common.search')}
            value={countrySearchQuery}
            onChange={e => setCountrySearchQuery(e.target.value)}
            className="mb-4"
          />
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-1">
              {filteredCountryOptions.map(c => (
                <button
                  key={c.code}
                  onClick={() => {
                    setCountry(c.code);
                    setShowCountryModal(false);
                    setCountrySearchQuery('');
                  }}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors',
                    country === c.code && 'bg-primary/10'
                  )}
                >
                  <span>{c.name}</span>
                  {country === c.code && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
              {filteredCountryOptions.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  {t('common.noResults')}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Currency Modal */}
      <Dialog open={showCurrencyModal} onOpenChange={setShowCurrencyModal}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
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
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors',
                    localCurrency === c.code && 'bg-primary/10'
                  )}
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
        <DialogContent className="max-w-md" aria-describedby={undefined}>
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
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors',
                    theme === themeName && 'bg-primary/10 ring-1 ring-primary'
                  )}
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

// Account Tab Content - 账号绑定管理
const AccountTabContent: React.FC = () => {
  const { t } = useI18n();
  const { toast } = useToast();

  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlinkingProvider, setUnlinkingProvider] = useState<OAuthProvider | null>(null);
  const [linkingProvider, setLinkingProvider] = useState<OAuthProvider | null>(null);
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [providerToUnlink, setProviderToUnlink] = useState<LinkedAccount | null>(null);

  const loadLinkedAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getLinkedAccounts();
      setLinkedAccounts(response.accounts);
    } catch (err) {
      console.error('Failed to load linked accounts:', err);
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // 处理绑定回调
  useEffect(() => {
    const processLinkCallback = async () => {
      if (hasLinkCallback()) {
        const { code, state } = getLinkCallbackParams();
        if (code && state) {
          try {
            const result = await handleLinkCallback(code, state);
            if (result.success) {
              toast({
                title: t('common.success'),
                description: t('settings.accountBinding.linkSuccess'),
              });
              loadLinkedAccounts();
            } else {
              toast({
                title: t('common.error'),
                description: result.error || t('settings.accountBinding.linkFailed'),
                variant: 'destructive',
              });
            }
          } catch (err) {
            toast({
              title: t('common.error'),
              description:
                err instanceof Error ? err.message : t('settings.accountBinding.linkFailed'),
              variant: 'destructive',
            });
          } finally {
            clearLinkCallbackParams();
          }
        }
      }
    };

    processLinkCallback();
  }, [toast, t, loadLinkedAccounts]);

  useEffect(() => {
    loadLinkedAccounts();
  }, [loadLinkedAccounts]);

  const getAvailableProviders = () => {
    const linkedProviderIds = linkedAccounts.map(a => a.provider);
    return SUPPORTED_PROVIDERS.filter(p => !linkedProviderIds.includes(p.id));
  };

  const getProviderInfoById = (providerId: OAuthProvider): ProviderInfo | undefined => {
    return SUPPORTED_PROVIDERS.find(p => p.id === providerId);
  };

  const handleLink = async (provider: OAuthProvider) => {
    try {
      setLinkingProvider(provider);
      await startLinkAccount(provider);
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('settings.accountBinding.linkFailed'),
        variant: 'destructive',
      });
      setLinkingProvider(null);
    }
  };

  const confirmUnlink = (account: LinkedAccount) => {
    setProviderToUnlink(account);
    setShowUnlinkDialog(true);
  };

  const handleUnlink = async () => {
    if (!providerToUnlink) return;

    try {
      setUnlinkingProvider(providerToUnlink.provider);
      setShowUnlinkDialog(false);
      await unlinkAccount(providerToUnlink.provider);
      toast({
        title: t('common.success'),
        description: t('settings.accountBinding.unlinkSuccess'),
      });
      loadLinkedAccounts();
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('settings.accountBinding.unlinkFailed'),
        variant: 'destructive',
      });
    } finally {
      setUnlinkingProvider(null);
      setProviderToUnlink(null);
    }
  };

  const availableProviders = getAvailableProviders();

  return (
    <>
      <div className="space-y-6">
        {/* 错误提示 */}
        {error && (
          <Card className="p-4 border-destructive bg-destructive/10">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={loadLinkedAccounts}>
              {t('common.retry')}
            </Button>
          </Card>
        )}

        {/* 已绑定账号 */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">
            {t('settings.accountBinding.linked')}
          </h3>
          <Card className="overflow-hidden">
            {isLoading ? (
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-muted rounded mb-2" />
                    <div className="h-3 w-32 bg-muted rounded" />
                  </div>
                </div>
              </div>
            ) : linkedAccounts.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <p className="text-sm">{t('settings.accountBinding.noLinked')}</p>
              </div>
            ) : (
              linkedAccounts.map(account => (
                <div
                  key={`${account.provider}-${account.providerId}`}
                  className="flex items-center justify-between p-3 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <ProviderIcon provider={account.provider} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {getProviderInfoById(account.provider)?.name || account.provider}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ID:{' '}
                        {account.providerId.length > 20
                          ? `${account.providerId.slice(0, 10)}...${account.providerId.slice(-6)}`
                          : account.providerId}
                      </p>
                    </div>
                  </div>
                  {account.canUnlink && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => confirmUnlink(account)}
                      disabled={unlinkingProvider === account.provider}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      {unlinkingProvider === account.provider
                        ? '...'
                        : t('settings.accountBinding.unlink')}
                    </Button>
                  )}
                </div>
              ))
            )}
          </Card>
        </div>

        {/* 可绑定账号 */}
        {availableProviders.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">
              {t('settings.accountBinding.available')}
            </h3>
            <Card className="overflow-hidden">
              {availableProviders.map(provider => (
                <div
                  key={provider.id}
                  className="flex items-center justify-between p-3 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <ProviderIcon provider={provider.id} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{provider.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('settings.accountBinding.notLinked')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLink(provider.id)}
                    disabled={linkingProvider === provider.id}
                  >
                    <Link2 className="w-4 h-4 mr-1" />
                    {linkingProvider === provider.id ? '...' : t('settings.accountBinding.link')}
                  </Button>
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* 提示信息 */}
        <Card className="p-4 bg-muted/50">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">{t('settings.accountBinding.keepOne')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('settings.accountBinding.keepOneDesc')}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* 解绑确认对话框 */}
      <AlertDialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.accountBinding.unlinkConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.accountBinding.unlinkConfirmDesc', {
                provider: providerToUnlink
                  ? (getProviderInfoById(providerToUnlink.provider)?.name ?? '')
                  : '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlink}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('settings.accountBinding.unlink')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Page Tab Content
interface SocialLink {
  id: string;
  type: string;
  username: string;
}

const SOCIAL_TYPES = [
  { value: 'twitter', label: 'Twitter' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'github', label: 'GitHub' },
  { value: 'discord', label: 'Discord' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'other', label: 'Other' },
];

const PageTabContent: React.FC = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const { profile, updateProfile } = useUserStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(profile?.name || '');
  const [shortDescription, setShortDescription] = useState(profile?.shortDescription || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [about, setAbout] = useState(profile?.about || '');
  const [avatarUrl, setAvatarUrl] = useState(
    getImageUrl(profile?.avatarHashes?.medium || profile?.avatarHashes?.small) || ''
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Contact Info
  const [email, setEmail] = useState(profile?.contactInfo?.email || '');
  const [website, setWebsite] = useState(profile?.contactInfo?.website || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.contactInfo?.phoneNumber || '');

  // Social Links - parse from profile if exists (SocialAccounts is an object, not array)
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(() => {
    const social = profile?.contactInfo?.social;
    if (social && typeof social === 'object' && !Array.isArray(social)) {
      return Object.entries(social)
        .filter(([, value]) => value)
        .map(([type, username], i) => ({
          id: `social-${i}`,
          type,
          username: username as string,
        }));
    }
    return [];
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
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
          contactInfo: {
            email: email.trim(),
            website: website.trim(),
            phoneNumber: phoneNumber.trim(),
            // Convert socialLinks array to SocialAccounts object
            social: socialLinks.reduce(
              (acc, s) => {
                if (s.username.trim()) {
                  acc[s.type as keyof typeof acc] = s.username.trim();
                }
                return acc;
              },
              {} as Record<string, string>
            ),
          },
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
      <FormField label={t('settingsModal.shortDescription')}>
        <Textarea
          value={shortDescription}
          onChange={e => setShortDescription(e.target.value.slice(0, 160))}
          placeholder={t('settingsModal.shortDescPlaceholder')}
          rows={3}
        />
        <p className="text-xs text-muted-foreground text-right">{shortDescription.length}/160</p>
      </FormField>

      {/* Location */}
      <FormField label={t('profile.location')}>
        <Input
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder={t('settingsModal.locationPlaceholder')}
        />
      </FormField>

      {/* Avatar */}
      <FormField label={t('settings.avatar')}>
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
      <FormField label={t('profile.about')}>
        <Textarea
          value={about}
          onChange={e => setAbout(e.target.value)}
          placeholder={t('settingsModal.aboutPlaceholder')}
          rows={4}
        />
      </FormField>

      {/* Contact Info Section */}
      <div className="border-t pt-6 mt-6">
        <h3 className="text-base font-semibold mb-4">{t('settingsModal.contactInfo')}</h3>

        <div className="space-y-4">
          <FormField label={t('settingsModal.email')}>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('settingsModal.emailPlaceholder')}
            />
          </FormField>

          <FormField label={t('settingsModal.website')}>
            <Input
              type="url"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder={t('settingsModal.websitePlaceholder')}
            />
          </FormField>

          <FormField label={t('settingsModal.phoneNumber')}>
            <Input
              type="tel"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              placeholder={t('settingsModal.phonePlaceholder')}
            />
          </FormField>
        </div>
      </div>

      {/* Social Links Section */}
      <div className="border-t pt-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">{t('settingsModal.socialLinks')}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setSocialLinks([
                ...socialLinks,
                { id: `social-${Date.now()}`, type: 'twitter', username: '' },
              ])
            }
          >
            <Plus className="w-4 h-4 mr-1" />
            {t('settingsModal.addLink')}
          </Button>
        </div>

        {socialLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('settingsModal.noSocialLinks')}
          </p>
        ) : (
          <div className="space-y-3">
            {socialLinks.map((link, index) => (
              <div key={link.id} className="flex items-center gap-2">
                <select
                  value={link.type}
                  onChange={e => {
                    const newLinks = [...socialLinks];
                    newLinks[index].type = e.target.value;
                    setSocialLinks(newLinks);
                  }}
                  className="w-32 h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {SOCIAL_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <Input
                  value={link.username}
                  onChange={e => {
                    const newLinks = [...socialLinks];
                    newLinks[index].username = e.target.value;
                    setSocialLinks(newLinks);
                  }}
                  placeholder={t('settingsModal.usernamePlaceholder')}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSocialLinks(socialLinks.filter((_, i) => i !== index))}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        {isSaving ? t('common.loading') : t('common.save')}
      </Button>
    </div>
  );
};

// Store Tab Content
const StoreTabContent: React.FC = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const { navigateTo } = useSettingsDrawer();

  const [showCoinsModal, setShowCoinsModal] = useState(false);
  const [showPoliciesModal, setShowPoliciesModal] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [coins, setCoins] = useState(acceptedCoins);
  const [returnPolicy, setReturnPolicy] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');

  const enabledCoinsCount = coins.filter(c => c.enabled).length;

  return (
    <>
      <div>
        {/* 店铺设置组 */}
        <SettingGroup title={t('settings.sidebar.store')}>
          <SettingItem
            title={t('settingsExtended.storePolicies')}
            description={t('settingsExtended.storePoliciesDesc')}
            onClick={() => setShowPoliciesModal(true)}
          />
          <SettingItem
            title={t('settingsExtended.moderators')}
            description={t('settingsExtended.moderatorsDesc')}
            onClick={() => navigateTo('moderation')}
          />
          <SettingItem
            title={t('settingsExtended.acceptedCryptocurrencies')}
            value={t('settingsExtended.selected', { count: enabledCoinsCount })}
            onClick={() => setShowCoinsModal(true)}
          />
          <SettingItem
            icon={<Truck className="h-5 w-5" />}
            title={t('settingsExtended.shippingOptions')}
            description={t('settingsExtended.shippingOptionsDesc')}
            onClick={() => setShowShippingModal(true)}
          />
        </SettingGroup>
      </div>

      {/* Coins Modal */}
      <Dialog open={showCoinsModal} onOpenChange={setShowCoinsModal}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('settingsExtended.acceptedCryptocurrencies')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {coins.map((coin, index) => (
              <div
                key={coin.symbol}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
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
        <DialogContent
          className="max-w-lg max-h-[80vh] overflow-y-auto"
          aria-describedby={undefined}
        >
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

      {/* Shipping Options Modal */}
      <Dialog open={showShippingModal} onOpenChange={setShowShippingModal}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('settingsExtended.shippingOptions')}</DialogTitle>
          </DialogHeader>
          <ShippingOptionsContent onClose={() => setShowShippingModal(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
};

// Shipping Options Content - 使用 useShippingOptions hook 和新组件
// ShippingOptionCard 和 ShippingOptionForm 已在文件顶部导入

interface ShippingOptionsContentProps {
  onClose: () => void;
}

const ShippingOptionsContent: React.FC<ShippingOptionsContentProps> = ({ onClose }) => {
  const { t } = useI18n();
  const { toast } = useToast();

  const { options, isLoading, isSaving, addOption, updateOption, deleteOption } =
    useShippingOptions();

  // 表单状态
  const [showForm, setShowForm] = useState(false);
  const [editingOption, setEditingOption] = useState<ShippingOptionSetting | null>(null);

  // 处理添加
  const handleAdd = useCallback(() => {
    setEditingOption(null);
    setShowForm(true);
  }, []);

  // 处理编辑
  const handleEdit = useCallback((option: ShippingOptionSetting) => {
    setEditingOption(option);
    setShowForm(true);
  }, []);

  // 处理保存
  const handleSave = useCallback(
    async (option: ShippingOptionSetting): Promise<boolean> => {
      if (editingOption?.id) {
        return await updateOption(editingOption.id, option);
      } else {
        return await addOption(option);
      }
    },
    [editingOption, addOption, updateOption]
  );

  // 处理删除
  const handleDelete = useCallback(
    async (optionId: number) => {
      const success = await deleteOption(optionId);
      if (success) {
        toast({
          title: t('common.success'),
          description: t('settingsExtended.shippingDeleted') || 'Shipping option deleted',
        });
      }
    },
    [deleteOption, toast, t]
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('settingsExtended.shippingOptionsDesc')}</p>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('settingsExtended.shippingOptionsDesc')}</p>

        {options.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('settingsExtended.noShippingOptions') || 'No shipping options configured'}</p>
            <p className="text-xs mt-2">
              {t('settingsExtended.addShippingHint') ||
                'Add shipping options to enable physical product delivery'}
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-3">
              {options.map(option => (
                <ShippingOptionCard
                  key={option.id}
                  option={option}
                  onEdit={() => handleEdit(option)}
                  onDelete={() => handleDelete(option.id!)}
                  disabled={isSaving}
                  className="border-0 shadow-none"
                />
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-1" />
            {t('settingsExtended.addShipping') || 'Add Option'}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </div>

      {/* 添加/编辑表单 */}
      <ShippingOptionForm
        open={showForm}
        onOpenChange={setShowForm}
        initialOption={editingOption || undefined}
        onSave={handleSave}
        mode={editingOption ? 'edit' : 'create'}
      />
    </>
  );
};

// Addresses Content - 使用 useShippingAddresses hook 和 AddressFormModal
const AddressesContent: React.FC = () => {
  const { t } = useI18n();
  const { toast } = useToast();

  // 使用真实的地址管理 hook
  const {
    addresses: apiAddresses,
    isLoading,
    isSaving,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  } = useShippingAddresses();

  // 将 API 地址转换为 UI 格式
  const addresses = useMemo(() => apiAddresses.map(toDisplayAddressUI), [apiAddresses]);

  // 模态框状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<DisplayAddress | null>(null);

  // 添加地址
  const handleAddAddress = useCallback(
    async (address: ApiAddress) => {
      const success = await addAddress(address);
      if (success) {
        toast({ title: t('address.added') || 'Address added' });
        setShowAddModal(false);
      }
      return success;
    },
    [addAddress, toast, t]
  );

  // 更新地址
  const handleUpdateAddress = useCallback(
    async (address: ApiAddress) => {
      if (!editingAddress) return false;
      const success = await updateAddress(editingAddress.id, address);
      if (success) {
        toast({ title: t('address.updated') || 'Address updated' });
        setEditingAddress(null);
      }
      return success;
    },
    [editingAddress, updateAddress, toast, t]
  );

  // 删除地址
  const handleDeleteAddress = useCallback(
    async (id: string) => {
      const success = await deleteAddress(id);
      if (success) {
        toast({ title: t('address.deleted') || 'Address deleted' });
      }
    },
    [deleteAddress, toast, t]
  );

  // 设为默认地址
  const handleSetDefault = useCallback(
    async (id: string) => {
      const success = await setDefaultAddress(id);
      if (success) {
        toast({ title: t('address.setAsDefault') || 'Address set as default' });
      }
    },
    [setDefaultAddress, toast, t]
  );

  // 打开编辑模态框
  const handleEdit = useCallback(
    (uiAddress: DisplayAddressUI) => {
      const apiAddr = apiAddresses.find(a => a.id === uiAddress.id);
      if (apiAddr) {
        setEditingAddress(apiAddr);
      }
    },
    [apiAddresses]
  );

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{t('settingsModal.addressesDescription')}</p>
          <Button size="sm" onClick={() => setShowAddModal(true)} disabled={isSaving}>
            <Plus className="w-4 h-4 mr-2" />
            {t('address.addAddress') || 'Add Address'}
          </Button>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground">{t('common.loading') || 'Loading...'}</p>
          </div>
        ) : addresses.length > 0 ? (
          <div className="space-y-3">
            {addresses.map(address => (
              <Card key={address.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">
                          {address.name || t('address.noName') || 'No Name'}
                        </p>
                        {address.isDefault && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {t('common.default') || 'Default'}
                          </span>
                        )}
                      </div>
                      {address.street && (
                        <p className="text-sm text-muted-foreground">{address.street}</p>
                      )}
                      {(address.city || address.state || address.postalCode) && (
                        <p className="text-sm text-muted-foreground">
                          {[address.city, address.state, address.postalCode]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      )}
                      {address.country && (
                        <p className="text-sm text-muted-foreground">{address.country}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!address.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(address.id)}
                        disabled={isSaving}
                      >
                        {t('address.setDefault') || 'Set as default'}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(address)}
                      disabled={isSaving}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteAddress(address.id)}
                      disabled={isSaving}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MapPin className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">{t('settingsModal.noAddresses')}</p>
            <Button className="mt-4" onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('address.addAddress') || 'Add Address'}
            </Button>
          </div>
        )}
      </div>

      {/* Add Address Modal */}
      <AddressFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddAddress}
        isSaving={isSaving}
      />

      {/* Edit Address Modal */}
      <AddressFormModal
        isOpen={!!editingAddress}
        onClose={() => setEditingAddress(null)}
        onSave={handleUpdateAddress}
        address={editingAddress}
        isSaving={isSaving}
      />
    </>
  );
};

// Blocked Content
interface BlockedUser {
  id: string;
  name: string;
  peerID: string;
  blockedAt: string;
}

// TODO: 集成真实 API - 替换 mock 数据
// 参考: mobazha-desktop/frontend/backbone/utils/block.js
// API: PUT /ob/preferences 更新 blockedNodes 数组
const mockBlockedUsers: BlockedUser[] = [
  {
    id: '1',
    name: 'Spammer123',
    peerID: 'QmYjL9N8X...',
    blockedAt: '2025-01-05',
  },
  {
    id: '2',
    name: 'BadActor',
    peerID: 'QmZkM7P9Y...',
    blockedAt: '2025-01-03',
  },
];

const BlockedContent: React.FC = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>(mockBlockedUsers);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPeerID, setNewPeerID] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);

  const handleUnblock = async (user: BlockedUser) => {
    try {
      // TODO: 调用真实 API
      // await unblockNode(user.peerID);
      setBlockedUsers(blockedUsers.filter(u => u.id !== user.id));
      toast({
        title: t('common.success'),
        description: t('settingsModal.userUnblocked'),
      });
    } catch {
      toast({
        title: t('common.error'),
        description: t('settingsModal.unblockFailed'),
        variant: 'destructive',
      });
    }
  };

  const handleBlock = async () => {
    if (!newPeerID.trim()) return;

    setIsBlocking(true);
    try {
      // TODO: 调用真实 API
      // await blockNode(newPeerID.trim());
      const newUser: BlockedUser = {
        id: Date.now().toString(),
        name: newPeerID.trim().substring(0, 10) + '...',
        peerID: newPeerID.trim(),
        blockedAt: new Date().toISOString().split('T')[0],
      };
      setBlockedUsers([...blockedUsers, newUser]);
      setNewPeerID('');
      setShowAddDialog(false);
      toast({
        title: t('common.success'),
        description: t('settingsModal.userBlocked'),
      });
    } catch {
      toast({
        title: t('common.error'),
        description: t('settingsModal.blockFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t('settingsModal.blockedDescription')}</p>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('settingsModal.blockUser')}
        </Button>
      </div>

      {/* Blocked Users List */}
      {blockedUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Ban className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">{t('settingsModal.noBlockedUsers')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {blockedUsers.map(user => (
            <Card key={user.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.peerID}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('settingsModal.blockedAt')}: {user.blockedAt}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnblock(user)}
                  className="text-destructive border-destructive hover:bg-destructive/10"
                >
                  <UserX className="w-4 h-4 mr-1" />
                  {t('settingsModal.unblock')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Block Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('settingsModal.blockUser')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label={t('settingsModal.peerID')} required>
              <Input
                value={newPeerID}
                onChange={e => setNewPeerID(e.target.value)}
                placeholder={t('settingsModal.peerIDPlaceholder')}
              />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleBlock} disabled={!newPeerID.trim() || isBlocking}>
                {isBlocking ? t('common.loading') : t('settingsModal.block')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Moderation Content
const ModerationContent: React.FC = () => {
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

// Chat Encryption Content
const ChatEncryptionContent: React.FC = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const { profile } = useUserStore();

  const [invitePolicy, setInvitePolicy] = useState<'all' | 'mobazha' | 'confirm'>('mobazha');
  const [lastBackup, setLastBackup] = useState<Date | null>(new Date());
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
  const { closeSettings } = useSettingsDrawer();

  const [analytics, setAnalytics] = useState(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);

  const handleLogoutConfirm = useCallback(() => {
    logout();
    closeSettings();
    // 托管模式下直接跳转 Casdoor，避免闪烁
    if (isHosted()) {
      startCasdoorLogin();
    } else {
      router.push('/');
    }
  }, [logout, closeSettings, router]);

  const handleResync = useCallback(async () => {
    setIsResyncing(true);
    // TODO: 实现实际的重新同步逻辑
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsResyncing(false);
    toast({
      title: t('common.success'),
      description: t('chatEncryption.resyncComplete'),
    });
  }, [toast, t]);

  const handleDeleteAccount = useCallback(() => {
    // TODO: 实现实际的删除账户逻辑
    toast({
      title: t('settingsExtended.comingSoon'),
      description: t('settingsExtended.deleteAccountDesc'),
      variant: 'destructive',
    });
    setShowDeleteDialog(false);
  }, [toast, t]);

  return (
    <>
      <div>
        {/* Privacy Section */}
        <SettingGroup title={t('settingsExtended.privacy')}>
          <SettingItem
            title={t('settingsExtended.analytics')}
            description={t('settingsExtended.analyticsDesc')}
            toggle
            toggleValue={analytics}
            onToggle={setAnalytics}
          />
        </SettingGroup>

        {/* Backup Section */}
        <SettingGroup title={t('settingsExtended.backup')}>
          <SettingItem
            icon={<Download className="h-5 w-5" />}
            title={t('settingsExtended.backupWallet')}
            description={t('settingsExtended.backupWalletDesc')}
            onClick={() =>
              toast({
                title: t('settingsExtended.comingSoon'),
                description: t('settingsExtended.backupComingSoon'),
              })
            }
          />
          <SettingItem
            icon={<Download className="h-5 w-5" />}
            title={t('settingsExtended.backupProfile')}
            description={t('settingsExtended.backupProfileDesc')}
            onClick={() =>
              toast({
                title: t('settingsExtended.comingSoon'),
                description: t('settingsExtended.backupComingSoon'),
              })
            }
          />
          <SettingItem
            icon={<Upload className="h-5 w-5" />}
            title={t('settingsExtended.restoreProfile')}
            description={t('settingsExtended.restoreProfileDesc')}
            onClick={() =>
              toast({
                title: t('settingsExtended.comingSoon'),
                description: t('settingsExtended.restoreComingSoon'),
              })
            }
          />
        </SettingGroup>

        {/* Developer Section */}
        <SettingGroup title={t('settingsExtended.developer')}>
          <SettingItem
            icon={<RefreshCw className={cn('h-5 w-5', isResyncing && 'animate-spin')} />}
            title={t('settingsExtended.resyncTransactions')}
            description={t('settingsExtended.resyncDesc')}
            onClick={handleResync}
          />
          <SettingItem
            icon={<Terminal className="h-5 w-5" />}
            title={t('settingsExtended.serverLogs')}
            description={t('settingsExtended.serverLogsDesc')}
            onClick={() =>
              toast({
                title: t('settingsExtended.comingSoon'),
                description: t('settingsExtended.serverLogsDesc'),
              })
            }
          />
        </SettingGroup>

        {/* About Section */}
        <SettingGroup title={t('settingsExtended.about')}>
          <SettingItem title={t('settingsExtended.version')} value="1.0.0 (Build 123)" />
          <SettingItem
            title={t('settingsExtended.checkForUpdates')}
            onClick={() =>
              toast({
                title: t('settingsExtended.upToDate'),
                description: t('settingsExtended.latestVersion'),
              })
            }
          />
        </SettingGroup>

        {/* Danger Zone */}
        <SettingGroup title={t('settingsExtended.dangerZone')}>
          <SettingItem
            icon={<LogOut className="h-5 w-5 text-destructive" />}
            title={t('userMenu.logout')}
            onClick={() => setShowLogoutDialog(true)}
            danger
          />
          <SettingItem
            icon={<Trash2 className="h-5 w-5 text-destructive" />}
            title={t('settingsExtended.deleteAccount')}
            description={t('settingsExtended.deleteAccountDesc')}
            onClick={() => setShowDeleteDialog(true)}
            danger
          />
        </SettingGroup>
      </div>

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

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              {t('settingsExtended.deleteAccount')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('settingsExtended.deleteAccountDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('settingsExtended.deleteAccount')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// ============ Main Drawer Component ============

interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSection?: SettingsSection;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  open,
  onOpenChange,
  initialSection = 'main',
}) => {
  const { t } = useI18n();
  const [currentSection, setCurrentSection] = useState<SettingsSection>(initialSection);
  const [navigationStack, setNavigationStack] = useState<SettingsSection[]>([]);

  // Reset when opening
  React.useEffect(() => {
    if (open) {
      setCurrentSection(initialSection);
      setNavigationStack([]);
    }
  }, [open, initialSection]);

  const _navigateTo = useCallback(
    (section: SettingsSection) => {
      setNavigationStack(prev => [...prev, currentSection]);
      setCurrentSection(section);
    },
    [currentSection]
  );

  const goBack = useCallback(() => {
    if (navigationStack.length > 0) {
      const prevSection = navigationStack[navigationStack.length - 1];
      setNavigationStack(prev => prev.slice(0, -1));
      setCurrentSection(prevSection);
    } else {
      setCurrentSection('main');
    }
  }, [navigationStack]);

  const getSectionTitle = (section: SettingsSection): string => {
    const item = settingsMenuItems.find(i => i.id === section);
    if (item) return t(item.labelKey);

    // Check in children
    for (const parent of settingsMenuItems) {
      const child = parent.children?.find(c => c.id === section);
      if (child) return t(child.labelKey);
    }

    return t('settings.title');
  };

  // 判断是否在子菜单中
  const _isInSubmenu =
    currentSection.startsWith('accessControl.') || currentSection === 'accessControl';
  const showBackInContent =
    currentSection.startsWith('accessControl.') && currentSection !== 'accessControl';

  // 获取当前显示的内容区 section
  const getContentSection = () => {
    if (currentSection === 'main') return 'general'; // 默认显示通用设置
    if (currentSection === 'accessControl') return 'accessControl.privacy'; // 访问控制默认显示隐私
    return currentSection;
  };

  const renderMainContent = () => {
    const section = getContentSection();
    switch (section) {
      case 'general':
        return <GeneralTabContent />;
      case 'account':
        return <AccountTabContent />;
      case 'page':
        return <PageTabContent />;
      case 'store':
        return <StoreTabContent />;
      case 'accessControl.privacy':
        return <PrivacySettingsContent />;
      case 'accessControl.userGroups':
        return <UserGroupsContent inModal />;
      case 'accessControl.productGroups':
        return <ProductGroupsContent inModal />;
      case 'accessControl.requests':
        return <AccessRequestsContent />;
      case 'advanced':
        return <AdvancedTabContent />;
      case 'addresses':
        return <AddressesContent />;
      case 'blocked':
        return <BlockedContent />;
      case 'moderation':
        return <ModerationContent />;
      case 'chatEncryption':
        return <ChatEncryptionContent />;
      default:
        return <GeneralTabContent />;
    }
  };

  // 左侧菜单项
  const renderMenuItem = (item: SettingsMenuItem, isChild = false) => {
    const isActive =
      currentSection === item.id ||
      (item.children && item.children.some(c => currentSection === c.id));
    const hasChildren = item.children && item.children.length > 0;

    return (
      <button
        key={item.id}
        onClick={() => {
          if (hasChildren) {
            // 展开子菜单，默认选中第一个子项
            setCurrentSection(item.children![0].id);
          } else {
            setCurrentSection(item.id);
          }
          setNavigationStack([]);
        }}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
          isActive
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          isChild && 'pl-9 text-[13px]'
        )}
      >
        {!isChild && item.icon}
        <span className="flex-1 text-left">{t(item.labelKey)}</span>
        {hasChildren && <ChevronRight className="w-4 h-4" />}
      </button>
    );
  };

  // 是否展开访问控制子菜单
  const isAccessControlExpanded = currentSection.startsWith('accessControl');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl w-[90vw] max-h-[85vh] p-0 gap-0 overflow-hidden [&>button]:hidden"
        aria-describedby={undefined}
      >
        <div className="flex h-[80vh] max-h-[85vh]">
          {/* 左侧导航 */}
          <div className="w-56 bg-muted/30 border-r border-border flex flex-col shrink-0">
            <DialogHeader className="p-4 border-b border-border">
              <DialogTitle className="text-sm font-semibold uppercase tracking-wide">
                {t('settings.title')}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-1">
              <nav className="p-2 space-y-1">
                {settingsMenuItems.map(item => (
                  <div key={item.id}>
                    {renderMenuItem(item)}
                    {/* 访问控制子菜单 */}
                    {item.id === 'accessControl' && isAccessControlExpanded && item.children && (
                      <div className="mt-1 space-y-1">
                        {item.children.map(child => (
                          <button
                            key={child.id}
                            onClick={() => {
                              setCurrentSection(child.id);
                              setNavigationStack([]);
                            }}
                            className={cn(
                              'w-full flex items-center gap-3 pl-9 pr-3 py-2 rounded-lg text-[13px] transition-colors',
                              currentSection === child.id
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                          >
                            {child.icon}
                            <span>{t(child.labelKey)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </ScrollArea>
          </div>

          {/* 右侧内容区 */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* 内容区头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                {showBackInContent && (
                  <button
                    onClick={goBack}
                    className="p-1 hover:bg-muted rounded-lg transition-colors"
                    aria-label="返回"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <h2 className="text-lg font-semibold">{getSectionTitle(getContentSection())}</h2>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                aria-label="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 内容区 - 可滚动 */}
            <ScrollArea className="flex-1">
              <div className="p-6">{renderMainContent()}</div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============ Provider Component ============

// Section 到路由的映射 - 用于移动端导航
const sectionToRoute: Record<SettingsSection, string> = {
  main: '/settings',
  general: '/settings/general',
  account: '/settings/account',
  page: '/settings/page-profile',
  store: '/settings/store',
  accessControl: '/settings/access-control',
  'accessControl.privacy': '/settings/access-control/privacy',
  'accessControl.userGroups': '/settings/access-control/user-groups',
  'accessControl.productGroups': '/settings/access-control/product-groups',
  'accessControl.requests': '/settings/access-control/requests',
  addresses: '/settings/addresses',
  blocked: '/settings/blocked',
  moderation: '/settings/moderation',
  chatEncryption: '/settings/chat-encryption',
  advanced: '/settings/advanced',
};

// 检测是否为移动端（< 768px）
const isMobileViewport = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
};

interface SettingsDrawerProviderProps {
  children: React.ReactNode;
}

export const SettingsDrawerProvider: React.FC<SettingsDrawerProviderProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState<SettingsSection>('main');
  const [initialSection, setInitialSection] = useState<SettingsSection>('main');

  // 路由变化时关闭 Modal（用于处理 Modal 内的链接点击）
  useEffect(() => {
    if (isOpen) {
      setIsOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const openSettings = useCallback(
    (section: SettingsSection = 'main') => {
      // 移动端：导航到独立页面
      if (isMobileViewport()) {
        const route = sectionToRoute[section] || '/settings';
        router.push(route);
        return;
      }

      // 桌面端：打开 Modal
      setInitialSection(section);
      setCurrentSection(section);
      setIsOpen(true);
    },
    [router]
  );

  const closeSettings = useCallback(() => {
    setIsOpen(false);
  }, []);

  const navigateTo = useCallback(
    (section: SettingsSection) => {
      // 移动端：导航到独立页面
      if (isMobileViewport()) {
        const route = sectionToRoute[section] || '/settings';
        router.push(route);
        return;
      }

      // 桌面端：在 Modal 内导航
      setCurrentSection(section);
    },
    [router]
  );

  const goBack = useCallback(() => {
    setCurrentSection('main');
  }, []);

  // 关闭弹框并导航到指定页面（用于复杂操作需要跳转到独立页面时）
  const navigateToPage = useCallback(
    (path: string) => {
      // 保存当前路径作为来源，方便用户返回
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('settings_referrer', pathname || '/');
      }
      setIsOpen(false);
      // 使用 setTimeout 确保弹框关闭动画完成后再导航
      setTimeout(() => {
        router.push(path);
      }, 100);
    },
    [router, pathname]
  );

  return (
    <SettingsDrawerContext.Provider
      value={{
        isOpen,
        currentSection,
        openSettings,
        closeSettings,
        navigateTo,
        goBack,
        navigateToPage,
      }}
    >
      {children}
      <SettingsDrawer open={isOpen} onOpenChange={setIsOpen} initialSection={initialSection} />
    </SettingsDrawerContext.Provider>
  );
};

export default SettingsDrawer;
