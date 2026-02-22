'use client';

import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input-compat';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useI18n } from '@mobazha/core';
import { AlertCircle } from 'lucide-react';
import { SettingsPageHeader, SettingsSection } from '@/components/SettingsLayout';
import { SaveBar } from '@/components/SettingsLayout/SaveBar';

interface ModeratorSettings {
  isActive: boolean;
  shortDescription: string;
  description: string;
  languages: string[];
  fee: {
    feeType: 'percentage' | 'fixed' | 'fixed_plus_percentage';
    percentage: number;
    fixedFee?: {
      amount: number;
      currency: string;
    };
  };
  termsAndConditions: string;
  acceptedCurrencies: string[];
  contactInfo: {
    email?: string;
    website?: string;
    social?: {
      twitter?: string;
      telegram?: string;
    };
  };
}

const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'ru', name: 'Русский' },
  { code: 'pt', name: 'Português' },
  { code: 'ar', name: 'العربية' },
];

const AVAILABLE_CURRENCIES = ['BTC', 'ETH', 'LTC', 'USDC', 'USDT', 'SOL', 'BNB', 'MATIC'];

const defaultSettings: ModeratorSettings = {
  isActive: false,
  shortDescription: '',
  description: '',
  languages: ['en'],
  fee: {
    feeType: 'percentage',
    percentage: 1,
  },
  termsAndConditions: '',
  acceptedCurrencies: ['BTC', 'ETH'],
  contactInfo: {},
};

export default function ModeratorSettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [settings, setSettings] = useState<ModeratorSettings>({ ...defaultSettings });
  const [savedSettings, setSavedSettings] = useState<ModeratorSettings>({ ...defaultSettings });

  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  const handleSave = useCallback(() => {
    setSavedSettings({ ...settings });
    toast({
      title: t('common.saved'),
      description: t('settingsExtended.moderatorSettingsSaved'),
    });
  }, [settings, toast, t]);

  const handleDiscard = useCallback(() => {
    setSettings({ ...savedSettings });
  }, [savedSettings]);

  const toggleLanguage = (code: string) => {
    setSettings(prev => ({
      ...prev,
      languages: prev.languages.includes(code)
        ? prev.languages.filter(l => l !== code)
        : [...prev.languages, code],
    }));
  };

  const toggleCurrency = (currency: string) => {
    setSettings(prev => ({
      ...prev,
      acceptedCurrencies: prev.acceptedCurrencies.includes(currency)
        ? prev.acceptedCurrencies.filter(c => c !== currency)
        : [...prev.acceptedCurrencies, currency],
    }));
  };

  return (
    <div>
      <SettingsPageHeader title={t('settings.sidebar.moderation')} />

      <div className="divide-y divide-border">
        {/* Enable/Disable toggle */}
        <SettingsSection
          className="pb-5 md:pb-8"
          title={t('settingsExtended.enableModeration')}
          description={t('settingsExtended.enableModerationDesc')}
        >
          <Card className="p-4 md:p-6">
            <div className="flex items-center justify-between min-h-[44px]">
              <div>
                <p className="font-medium text-sm">{t('settingsExtended.enableModeration')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('settingsExtended.enableModerationHint')}
                </p>
              </div>
              <Switch
                checked={settings.isActive}
                onCheckedChange={checked => setSettings(prev => ({ ...prev, isActive: checked }))}
              />
            </div>
          </Card>
        </SettingsSection>

        {settings.isActive && (
          <>
            {/* Basic info */}
            <SettingsSection
              className="py-5 md:py-8"
              title={t('settingsExtended.moderatorBasicInfo')}
              description={t('settingsExtended.moderatorBasicInfoDesc')}
            >
              <Card className="p-4 md:p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shortDescription">{t('settingsExtended.shortDescription')}</Label>
                  <Input
                    id="shortDescription"
                    placeholder={t('settingsExtended.shortDescriptionPlaceholder')}
                    maxLength={160}
                    value={settings.shortDescription}
                    onChange={e =>
                      setSettings(prev => ({ ...prev, shortDescription: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {settings.shortDescription.length}/160
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t('settingsExtended.detailedDescription')}</Label>
                  <Textarea
                    id="description"
                    placeholder={t('settingsExtended.detailedDescriptionPlaceholder')}
                    rows={6}
                    value={settings.description}
                    onChange={e => setSettings(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </Card>
            </SettingsSection>

            {/* Fee settings */}
            <SettingsSection
              className="py-5 md:py-8"
              title={t('settingsExtended.feeSettings')}
              description={t('settingsExtended.feeSettingsDesc')}
            >
              <Card className="p-4 md:p-6 space-y-4">
                <div className="space-y-2">
                  <Label>{t('settingsExtended.feeType')}</Label>
                  <Select
                    value={settings.fee.feeType}
                    onValueChange={(value: 'percentage' | 'fixed' | 'fixed_plus_percentage') =>
                      setSettings(prev => ({
                        ...prev,
                        fee: { ...prev.fee, feeType: value },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">
                        {t('settingsExtended.feePercentage')}
                      </SelectItem>
                      <SelectItem value="fixed">{t('settingsExtended.feeFixed')}</SelectItem>
                      <SelectItem value="fixed_plus_percentage">
                        {t('settingsExtended.feeFixedPlusPercentage')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(settings.fee.feeType === 'percentage' ||
                  settings.fee.feeType === 'fixed_plus_percentage') && (
                  <div className="space-y-2">
                    <Label htmlFor="percentage">{t('settingsExtended.percentageLabel')}</Label>
                    <Input
                      id="percentage"
                      type="number"
                      min="0"
                      max="50"
                      step="0.1"
                      value={settings.fee.percentage}
                      onChange={e =>
                        setSettings(prev => ({
                          ...prev,
                          fee: {
                            ...prev.fee,
                            percentage: parseFloat(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('settingsExtended.percentageHint', {
                        percentage: settings.fee.percentage,
                      })}
                    </p>
                  </div>
                )}

                {(settings.fee.feeType === 'fixed' ||
                  settings.fee.feeType === 'fixed_plus_percentage') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fixedAmount">{t('settingsExtended.fixedAmount')}</Label>
                      <Input
                        id="fixedAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={settings.fee.fixedFee?.amount || 0}
                        onChange={e =>
                          setSettings(prev => ({
                            ...prev,
                            fee: {
                              ...prev.fee,
                              fixedFee: {
                                ...prev.fee.fixedFee,
                                amount: parseFloat(e.target.value) || 0,
                                currency: prev.fee.fixedFee?.currency || 'USD',
                              },
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('settingsExtended.currency')}</Label>
                      <Select
                        value={settings.fee.fixedFee?.currency || 'USD'}
                        onValueChange={value =>
                          setSettings(prev => ({
                            ...prev,
                            fee: {
                              ...prev.fee,
                              fixedFee: {
                                ...prev.fee.fixedFee,
                                amount: prev.fee.fixedFee?.amount || 0,
                                currency: value,
                              },
                            },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="CNY">CNY</SelectItem>
                          <SelectItem value="BTC">BTC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </Card>
            </SettingsSection>

            {/* Languages and currencies */}
            <SettingsSection
              className="py-5 md:py-8"
              title={t('settingsExtended.languagesAndCurrencies')}
              description={t('settingsExtended.languagesAndCurrenciesDesc')}
            >
              <Card className="p-4 md:p-6 space-y-6">
                <div className="space-y-2">
                  <Label>{t('settingsExtended.supportedLanguages')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_LANGUAGES.map(lang => (
                      <Badge
                        key={lang.code}
                        variant={settings.languages.includes(lang.code) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleLanguage(lang.code)}
                      >
                        {lang.name}
                      </Badge>
                    ))}
                  </div>
                  {settings.languages.length === 0 && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {t('settingsExtended.selectAtLeastOneLanguage')}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{t('settingsExtended.acceptedCryptocurrencies')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_CURRENCIES.map(currency => (
                      <Badge
                        key={currency}
                        variant={
                          settings.acceptedCurrencies.includes(currency) ? 'default' : 'outline'
                        }
                        className="cursor-pointer"
                        onClick={() => toggleCurrency(currency)}
                      >
                        {currency}
                      </Badge>
                    ))}
                  </div>
                  {settings.acceptedCurrencies.length === 0 && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {t('settingsExtended.selectAtLeastOneCurrency')}
                    </p>
                  )}
                </div>
              </Card>
            </SettingsSection>

            {/* Terms and conditions */}
            <SettingsSection
              className="py-5 md:py-8"
              title={t('settingsExtended.moderatorTerms')}
              description={t('settingsExtended.moderatorTermsDesc')}
            >
              <Card className="p-4 md:p-6">
                <Textarea
                  placeholder={t('settingsExtended.moderatorTermsPlaceholder')}
                  rows={8}
                  value={settings.termsAndConditions}
                  onChange={e =>
                    setSettings(prev => ({ ...prev, termsAndConditions: e.target.value }))
                  }
                />
              </Card>
            </SettingsSection>

            {/* Contact info */}
            <SettingsSection
              className="pt-5 md:pt-8"
              title={t('settingsExtended.contactInfo')}
              description={t('settingsExtended.contactInfoDesc')}
            >
              <Card className="p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="moderator@example.com"
                      value={settings.contactInfo.email || ''}
                      onChange={e =>
                        setSettings(prev => ({
                          ...prev,
                          contactInfo: { ...prev.contactInfo, email: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">{t('settingsExtended.website')}</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://..."
                      value={settings.contactInfo.website || ''}
                      onChange={e =>
                        setSettings(prev => ({
                          ...prev,
                          contactInfo: { ...prev.contactInfo, website: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twitter">Twitter</Label>
                    <Input
                      id="twitter"
                      placeholder="@username"
                      value={settings.contactInfo.social?.twitter || ''}
                      onChange={e =>
                        setSettings(prev => ({
                          ...prev,
                          contactInfo: {
                            ...prev.contactInfo,
                            social: { ...prev.contactInfo.social, twitter: e.target.value },
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telegram">Telegram</Label>
                    <Input
                      id="telegram"
                      placeholder="@username"
                      value={settings.contactInfo.social?.telegram || ''}
                      onChange={e =>
                        setSettings(prev => ({
                          ...prev,
                          contactInfo: {
                            ...prev.contactInfo,
                            social: { ...prev.contactInfo.social, telegram: e.target.value },
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </Card>
            </SettingsSection>
          </>
        )}
      </div>

      <SaveBar isDirty={isDirty} isLoading={false} onSave={handleSave} onDiscard={handleDiscard} />
    </div>
  );
}
