'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
import { ArrowLeft, Save, Shield, DollarSign, Globe, FileText, AlertCircle } from 'lucide-react';
import Link from 'next/link';

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

export default function ModeratorSettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<ModeratorSettings>({
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
  });

  // 模拟加载现有设置
  useEffect(() => {
    const loadSettings = async () => {
      // TODO: 从 API 加载仲裁人设置
      // const profile = await moderatorsApi.getMyModeratorProfile();
      // if (profile) {
      //   setSettings({ ...settings, ...profile, isActive: true });
      // }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // TODO: 调用 API 保存设置
      // if (settings.isActive) {
      //   await moderatorsApi.updateModeratorProfile(settings);
      // } else {
      //   await moderatorsApi.deactivateModerator();
      // }
      toast({
        title: '设置已保存',
        description: '您的仲裁人设置已成功更新',
      });
    } catch {
      toast({
        title: '保存失败',
        description: '无法保存仲裁人设置，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/settings"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">仲裁人设置</h1>
            <p className="text-gray-500 dark:text-gray-400">
              配置您的仲裁服务，帮助解决交易纠纷
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* 启用/禁用仲裁人 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-blue-500" />
                  <div>
                    <CardTitle className="text-lg">启用仲裁服务</CardTitle>
                    <CardDescription>开启后，您将成为网络中的仲裁人</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={settings.isActive}
                  onCheckedChange={checked => setSettings(prev => ({ ...prev, isActive: checked }))}
                />
              </div>
            </CardHeader>
          </Card>

          {settings.isActive && (
            <>
              {/* 基本信息 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">基本信息</CardTitle>
                  <CardDescription>向买家和卖家介绍您的仲裁服务</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="shortDescription">简短描述</Label>
                    <Input
                      id="shortDescription"
                      placeholder="简要描述您的仲裁服务（最多 160 字符）"
                      maxLength={160}
                      value={settings.shortDescription}
                      onChange={e =>
                        setSettings(prev => ({ ...prev, shortDescription: e.target.value }))
                      }
                    />
                    <p className="text-xs text-gray-500">
                      {settings.shortDescription.length}/160 字符
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">详细描述</Label>
                    <Textarea
                      id="description"
                      placeholder="详细介绍您的仲裁经验、专业领域和服务承诺..."
                      rows={6}
                      value={settings.description}
                      onChange={e =>
                        setSettings(prev => ({ ...prev, description: e.target.value }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 费率设置 */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    <div>
                      <CardTitle className="text-lg">费率设置</CardTitle>
                      <CardDescription>设置您的仲裁服务收费标准</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>费率类型</Label>
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
                        <SelectItem value="percentage">按比例收费</SelectItem>
                        <SelectItem value="fixed">固定费用</SelectItem>
                        <SelectItem value="fixed_plus_percentage">固定 + 比例</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(settings.fee.feeType === 'percentage' ||
                    settings.fee.feeType === 'fixed_plus_percentage') && (
                    <div className="space-y-2">
                      <Label htmlFor="percentage">比例 (%)</Label>
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
                            fee: { ...prev.fee, percentage: parseFloat(e.target.value) || 0 },
                          }))
                        }
                      />
                      <p className="text-xs text-gray-500">
                        争议金额的 {settings.fee.percentage}% 作为仲裁费用
                      </p>
                    </div>
                  )}

                  {(settings.fee.feeType === 'fixed' ||
                    settings.fee.feeType === 'fixed_plus_percentage') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fixedAmount">固定金额</Label>
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
                        <Label>货币</Label>
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
                </CardContent>
              </Card>

              {/* 语言和货币 */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-purple-500" />
                    <div>
                      <CardTitle className="text-lg">语言和货币</CardTitle>
                      <CardDescription>设置您支持的语言和接受的加密货币</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>支持的语言</Label>
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
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        请至少选择一种语言
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>接受的加密货币</Label>
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
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        请至少选择一种货币
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 条款和条件 */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-orange-500" />
                    <div>
                      <CardTitle className="text-lg">条款和条件</CardTitle>
                      <CardDescription>
                        设置您的仲裁服务条款，用户选择您时将看到这些内容
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="请输入您的仲裁服务条款...

例如：
1. 争议提交后 48 小时内开始审理
2. 双方需提供完整的交易证据
3. 仲裁决定为最终裁决
4. ..."
                    rows={10}
                    value={settings.termsAndConditions}
                    onChange={e =>
                      setSettings(prev => ({ ...prev, termsAndConditions: e.target.value }))
                    }
                  />
                </CardContent>
              </Card>

              {/* 联系方式 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">联系方式（可选）</CardTitle>
                  <CardDescription>提供额外的联系方式，方便用户联系您</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                      <Label htmlFor="website">网站</Label>
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
                </CardContent>
              </Card>
            </>
          )}

          {/* 保存按钮 */}
          <div className="flex justify-end gap-4">
            <Link href="/settings">
              <Button variant="outline">取消</Button>
            </Link>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? (
                <>保存中...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存设置
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

