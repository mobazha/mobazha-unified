'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n, aiSettingsApi } from '@mobazha/core';
import type { AIConfig, AIConfigInput, AIProviderInfo } from '@mobazha/core';
import {
  Sparkles,
  Check,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  Loader2,
  Wifi,
  Image,
  FileText,
  Palette,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export function AIConfigSection() {
  const { t } = useI18n();
  const { toast } = useToast();

  const [providers, setProviders] = useState<AIProviderInfo[]>([]);
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  const [selectedProvider, setSelectedProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [savedSnapshot, setSavedSnapshot] = useState({
    provider: '',
    apiKey: '',
    model: '',
    baseUrl: '',
    enabled: false,
  });

  const isDirty = useMemo(() => {
    return (
      selectedProvider !== savedSnapshot.provider ||
      apiKey !== savedSnapshot.apiKey ||
      model !== savedSnapshot.model ||
      baseUrl !== savedSnapshot.baseUrl ||
      enabled !== savedSnapshot.enabled
    );
  }, [selectedProvider, apiKey, model, baseUrl, enabled, savedSnapshot]);

  useEffect(() => {
    if (!isDirty) return;
    function handleBeforeUnload(e: Event) {
      e.preventDefault();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e as any).returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const applyProviderToForm = useCallback(
    (providerId: string, cfg: AIConfig | null, providerList: AIProviderInfo[]) => {
      const providerInfo = providerList.find(p => p.id === providerId);
      const providerState = cfg?.providers?.[providerId];

      const m =
        providerState?.model && providerState.model !== providerInfo?.default_model
          ? providerState.model
          : '';
      const b =
        providerState?.base_url && providerState.base_url !== providerInfo?.default_base_url
          ? providerState.base_url
          : '';

      setSelectedProvider(providerId);
      setApiKey('');
      setModel(m);
      setBaseUrl(b);
      setTestResult(null);
      if (m || b) setShowAdvanced(true);

      setSavedSnapshot({
        provider: providerId,
        apiKey: '',
        model: m,
        baseUrl: b,
        enabled: cfg?.enabled ?? false,
      });
    },
    []
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [cfg, providerList] = await Promise.all([
        aiSettingsApi.getAIConfig().catch(() => null),
        aiSettingsApi.getAIProviders().catch(() => []),
      ]);
      setProviders(providerList);
      if (providerList.length === 0) {
        setLoadError(true);
      }
      if (cfg) {
        setConfig(cfg);
        setEnabled(cfg.enabled);
        const initialProvider = cfg.active_provider || providerList[0]?.id || '';
        applyProviderToForm(initialProvider, cfg, providerList);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [applyProviderToForm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedProviderInfo = providers.find(p => p.id === selectedProvider);
  const isCustomProvider = selectedProvider === 'custom';
  const modelOptions = selectedProviderInfo?.models ?? [];
  const selectedProviderState = config?.providers?.[selectedProvider];
  const hasExistingKey = !!selectedProviderState?.has_api_key;
  const isActiveProvider = config?.active_provider === selectedProvider;

  function handleProviderPillClick(id: string) {
    if (id === selectedProvider) return;
    applyProviderToForm(id, config, providers);
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await aiSettingsApi.testAIConnection({
        provider: selectedProvider,
        api_key: apiKey || undefined,
        model: model || selectedProviderInfo?.default_model || '',
        base_url: baseUrl || selectedProviderInfo?.default_base_url || '',
      });
      setTestResult(result);
    } catch {
      setTestResult({ success: false, error: t('admin.integrations.aiTestFailed') });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const input: AIConfigInput = {
        provider: selectedProvider,
        model,
        base_url: baseUrl,
        enabled,
      };
      if (apiKey) {
        input.api_key = apiKey;
      }
      const result = await aiSettingsApi.saveAIConfig(input);
      setConfig(result);
      setApiKey('');

      const providerInfo = providers.find(p => p.id === selectedProvider);
      const providerState = result.providers?.[selectedProvider];
      const m =
        providerState?.model && providerState.model !== providerInfo?.default_model
          ? providerState.model
          : '';
      const b =
        providerState?.base_url && providerState.base_url !== providerInfo?.default_base_url
          ? providerState.base_url
          : '';
      setModel(m);
      setBaseUrl(b);
      setEnabled(result.enabled);
      setSavedSnapshot({
        provider: selectedProvider,
        apiKey: '',
        model: m,
        baseUrl: b,
        enabled: result.enabled,
      });
      toast({ title: t('admin.integrations.aiSaveSuccess') });
    } catch {
      toast({
        variant: 'destructive',
        title: t('admin.integrations.aiSaveFailed'),
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-muted animate-pulse rounded-lg" />
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (loadError && providers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <AlertCircle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground">{t('admin.integrations.aiLoadFailed')}</h3>
        <Button onClick={fetchData} variant="outline" size="sm" className="mt-4 gap-1.5">
          <RefreshCw className="w-4 h-4" />
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  const anyProviderConfigured = config?.providers
    ? Object.values(config.providers).some(p => p.has_api_key)
    : false;
  const canTest = !!selectedProvider && (!!apiKey || hasExistingKey);

  return (
    <div className="space-y-6">
      {/* Header card with enable toggle */}
      <div className="flex items-start gap-4 p-4 bg-card border border-border rounded-xl">
        <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground">{t('admin.integrations.aiTitle')}</h3>
            <Badge variant={anyProviderConfigured ? 'default' : 'outline'} className="text-xs">
              {anyProviderConfigured
                ? t('admin.integrations.aiConfigured')
                : t('admin.integrations.aiNotConfigured')}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{t('admin.integrations.aiDesc')}</p>
        </div>
        <div className="shrink-0 pt-0.5">
          <Switch
            id="ai-enabled-header"
            checked={enabled}
            onCheckedChange={setEnabled}
            aria-label={t('admin.integrations.aiEnabled')}
          />
        </div>
      </div>

      {/* Feature showcase */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: Image, text: t('admin.integrations.aiFeatureGenerate') },
          { icon: FileText, text: t('admin.integrations.aiFeaturePolish') },
          { icon: Palette, text: t('admin.integrations.aiFeatureStore') },
        ].map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/50 border border-border/50"
          >
            <Icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <span className="text-xs text-muted-foreground leading-relaxed">{text}</span>
          </div>
        ))}
      </div>

      {/* Config form card */}
      <div className="border border-border rounded-xl p-5 space-y-4 bg-card">
        {/* Provider pills */}
        <div className="space-y-1.5">
          <Label>
            {t('admin.integrations.aiProvider')} <span className="text-destructive">*</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {providers.map(p => {
              const isSelected = selectedProvider === p.id;
              const isActive = config?.active_provider === p.id;
              const isConfigured = !!config?.providers?.[p.id]?.has_api_key;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProviderPillClick(p.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : isConfigured
                        ? 'bg-muted text-foreground border-border hover:border-primary/50'
                        : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                  )}
                >
                  {isConfigured && !isSelected && <Check className="w-3 h-3 text-green-500" />}
                  {p.label}
                  {isActive && (
                    <Badge
                      variant={isSelected ? 'secondary' : 'default'}
                      className="text-[10px] px-1.5 py-0 h-4 leading-4"
                    >
                      {t('admin.integrations.aiProviderActive')}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* API Key */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>
              {t('admin.integrations.aiApiKey')} <span className="text-destructive">*</span>
            </Label>
            {selectedProviderInfo?.help_url && (
              <a
                href={selectedProviderInfo.help_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                {t('admin.integrations.aiGetApiKey')}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <Input
            type="password"
            value={apiKey}
            onChange={e => {
              setApiKey(e.target.value);
              setTestResult(null);
            }}
            placeholder={
              hasExistingKey
                ? t('admin.integrations.aiApiKeyUpdate')
                : t('admin.integrations.aiApiKeyPlaceholder')
            }
          />
          {hasExistingKey && !apiKey && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Check className="w-3 h-3 text-green-500" />
              {t('admin.integrations.aiApiKeySaved')}
            </p>
          )}
        </div>

        {/* Test Connection */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={!canTest || testing}
            className="gap-1.5"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
            {t('admin.integrations.aiTestConnection')}
          </Button>
          {testResult && (
            <span
              className={`text-sm flex items-center gap-1 ${testResult.success ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}
            >
              {testResult.success ? (
                <>
                  <Check className="w-4 h-4" /> {t('admin.integrations.aiTestSuccess')}
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />{' '}
                  {testResult.error || t('admin.integrations.aiTestFailed')}
                </>
              )}
            </span>
          )}
        </div>

        {/* Advanced Settings (Model / Base URL) */}
        <button
          type="button"
          onClick={() => setShowAdvanced(prev => !prev)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          aria-expanded={showAdvanced}
          aria-controls="ai-config-advanced"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
          />
          {t('admin.integrations.aiAdvancedSettings')}
        </button>

        {showAdvanced && (
          <div id="ai-config-advanced" className="space-y-4 pl-1 border-l-2 border-muted ml-1.5">
            <div className="pl-3 space-y-4">
              {/* Model */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  {t('admin.integrations.aiModel')}
                  <span className="text-xs font-normal text-muted-foreground">
                    {t('common.optional')}
                  </span>
                </Label>
                {modelOptions.length > 0 ? (
                  <div className="space-y-1.5">
                    <Select
                      value={modelOptions.includes(model) ? model : '_custom'}
                      onValueChange={v => setModel(v === '_custom' ? '' : v)}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            selectedProviderInfo?.default_model ||
                            t('admin.integrations.aiModelPlaceholder')
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {modelOptions.map(m => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                        <SelectItem value="_custom">
                          {t('admin.integrations.aiModelCustom')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {!modelOptions.includes(model) && (
                      <Input
                        value={model}
                        onChange={e => setModel(e.target.value)}
                        placeholder={t('admin.integrations.aiModelCustomPlaceholder')}
                      />
                    )}
                  </div>
                ) : (
                  <Input
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    placeholder={
                      selectedProviderInfo?.default_model ||
                      t('admin.integrations.aiModelPlaceholder')
                    }
                  />
                )}
              </div>

              {/* Base URL */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  {t('admin.integrations.aiBaseUrl')}
                  {isCustomProvider ? (
                    <span className="text-destructive">*</span>
                  ) : (
                    <span className="text-xs font-normal text-muted-foreground">
                      {t('common.optional')}
                    </span>
                  )}
                </Label>
                <Input
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  placeholder={
                    selectedProviderInfo?.default_base_url ||
                    t('admin.integrations.aiBaseUrlPlaceholder')
                  }
                />
                {isCustomProvider && !baseUrl && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {t('admin.integrations.aiBaseUrlRequired')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Validation hint */}
        {enabled && !hasExistingKey && !apiKey && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-md text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{t('admin.integrations.aiApiKeyRequired')}</span>
          </div>
        )}

        {/* Save */}
        <div className="flex justify-end gap-3 pt-2">
          {isDirty && (
            <span className="text-xs text-muted-foreground self-center">
              {t('admin.integrations.unsavedChanges')}
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || !selectedProvider || (enabled && !hasExistingKey && !apiKey)}
          >
            {saving
              ? t('admin.integrations.saving')
              : isActiveProvider
                ? t('admin.integrations.save')
                : t('admin.integrations.aiSaveActivate')}
          </Button>
        </div>
      </div>
    </div>
  );
}
