'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n, aiSettingsApi } from '@mobazha/core';
import type { AIConfig, AIConfigInput, AIProviderInfo, AIStatus } from '@mobazha/core';
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
  Zap,
  Key,
  Shield,
  Terminal,
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

const isOutpost = typeof __OUTPOST__ !== 'undefined' && __OUTPOST__;

export interface AIConfigSectionProps {
  /**
   * When true, suppress the inline "Install Ollama" guide block that ships in
   * Outpost mode. The dedicated `LocalLlmEnginePanel` (rendered above this
   * component on `/admin/ai-agents`) already covers runtime installation and
   * provides three engine options instead of just Ollama, so showing both
   * would duplicate the same call to action.
   */
  hideOutpostInstallGuide?: boolean;
  /**
   * When true, hide the feature showcase cards (image generation, text polish,
   * store AI). Used in Outpost mode where the page should be compact.
   */
  hideFeatureShowcase?: boolean;
  /**
   * When true, the config form starts collapsed when the provider is already
   * configured. The user can expand it via an "Edit" link.
   */
  startCollapsedWhenConfigured?: boolean;
}

export function AIConfigSection({
  hideOutpostInstallGuide = false,
  hideFeatureShowcase = false,
  startCollapsedWhenConfigured = false,
}: AIConfigSectionProps = {}) {
  const { t } = useI18n();
  const { toast } = useToast();

  const [providers, setProviders] = useState<AIProviderInfo[]>([]);
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
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
  const [formCollapsed, setFormCollapsed] = useState(false);

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
      const [cfg, providerList, status] = await Promise.all([
        aiSettingsApi.getAIConfig().catch(() => null),
        aiSettingsApi.getAIProviders().catch(() => []),
        aiSettingsApi.getAIStatus().catch(() => null),
      ]);
      setProviders(providerList);
      setAiStatus(status);
      if (providerList.length === 0) {
        setLoadError(true);
      }
      if (cfg) {
        setConfig(cfg);
        setEnabled(cfg.enabled);
        const initialProvider = cfg.active_provider || providerList[0]?.id || '';
        applyProviderToForm(initialProvider, cfg, providerList);
        if (startCollapsedWhenConfigured && cfg.active_provider && cfg.enabled) {
          const providerState = cfg.providers?.[cfg.active_provider];
          if (providerState?.has_api_key || isOutpost) {
            setFormCollapsed(true);
          }
        }
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [applyProviderToForm, startCollapsedWhenConfigured]);

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
      const effectiveBaseUrl = baseUrl || selectedProviderInfo?.default_base_url || '';
      const result = await aiSettingsApi.testAIConnection({
        provider: selectedProvider,
        api_key: apiKey || (isOutpost ? 'ollama' : undefined),
        model: model || selectedProviderInfo?.default_model || '',
        base_url: effectiveBaseUrl,
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
      const effectiveBaseUrl =
        baseUrl || (isOutpost ? selectedProviderInfo?.default_base_url || '' : '');
      const effectiveModel = model || selectedProviderInfo?.default_model || '';
      const input: AIConfigInput = {
        provider: selectedProvider,
        model: effectiveModel,
        base_url: effectiveBaseUrl,
        enabled,
      };
      if (apiKey) {
        input.api_key = apiKey;
      } else if (isOutpost) {
        input.api_key = 'ollama';
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

  const canTest = !!selectedProvider && (isOutpost || !!apiKey || hasExistingKey);

  const isPlatformAI = aiStatus?.source === 'platform';
  const isByokAI = aiStatus?.source === 'byok';

  const statusBadgeVariant = isByokAI ? 'default' : isPlatformAI ? 'secondary' : 'outline';
  const statusBadgeText = isByokAI
    ? t('admin.integrations.aiConfigured')
    : isPlatformAI
      ? t('admin.integrations.aiPlatformActive')
      : t('admin.integrations.aiNotConfigured');

  return (
    <div id="ai-endpoint-config" className="space-y-6 scroll-mt-24">
      {/* Header card with enable toggle */}
      <div className="flex items-start gap-4 p-4 bg-card border border-border rounded-xl">
        <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground">{t('admin.integrations.aiTitle')}</h3>
            <Badge variant={statusBadgeVariant} className="text-xs">
              {statusBadgeText}
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

      {/* Outpost: Local LLM setup guide.
          Hidden when rendered alongside `LocalLlmEnginePanel` (e.g. on
          `/admin/ai-agents`), which already covers runtime installation with
          a richer 3-engine picker. Kept for the legacy Settings →
          Integrations page so it still works as a standalone surface. */}
      {isOutpost && !hideOutpostInstallGuide && (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 shrink-0">
            <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('admin.integrations.aiOutpostGuideTitle')}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('admin.integrations.aiOutpostGuideDesc')}
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-foreground">
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold shrink-0">
                  1
                </span>
                <span>{t('admin.integrations.aiOutpostGuideStep1')}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground">
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold shrink-0">
                  2
                </span>
                <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                  {t('admin.integrations.aiOutpostGuideStep2')}
                </code>
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground">
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold shrink-0">
                  3
                </span>
                <span>{t('admin.integrations.aiOutpostGuideStep3')}</span>
              </div>
            </div>
            <a
              href="https://ollama.com/download"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline mt-1"
            >
              <Terminal className="w-3 h-3" />
              ollama.com/download
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Platform AI status banner */}
      {!isOutpost && isPlatformAI && aiStatus && (
        <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('admin.integrations.aiPlatformTitle')}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('admin.integrations.aiPlatformDesc')}
              </p>
            </div>
            {aiStatus.daily_limit > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {t('admin.integrations.aiDailyUsage')}
                  </span>
                  <span className="font-medium text-foreground">
                    {aiStatus.daily_used} / {aiStatus.daily_limit}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      aiStatus.daily_used / aiStatus.daily_limit > 0.8
                        ? 'bg-amber-500'
                        : 'bg-primary'
                    )}
                    style={{
                      width: `${Math.min((aiStatus.daily_used / aiStatus.daily_limit) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              <Badge
                variant={aiStatus.text_available === false ? 'outline' : 'secondary'}
                className="text-xs font-normal"
              >
                <FileText className="w-3 h-3 mr-1" />
                {t('admin.integrations.aiTextRoute', { defaultValue: 'Text AI' })}
                {aiStatus.text_available === false && ' — off'}
              </Badge>
              <Badge
                variant={aiStatus.vision_available === false ? 'outline' : 'secondary'}
                className="text-xs font-normal"
              >
                <Image className="w-3 h-3 mr-1" />
                {t('admin.integrations.aiVisionRoute', { defaultValue: 'Vision AI' })}
                {aiStatus.vision_available === false && ' — off'}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Key className="w-3 h-3" />
              <span>{t('admin.integrations.aiPlatformUpgrade')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Feature showcase — hidden in compact Outpost mode */}
      {!hideFeatureShowcase && (
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
      )}

      {/* Config form card — collapsible in Outpost compact mode */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        {startCollapsedWhenConfigured && (
          <button
            type="button"
            onClick={() => setFormCollapsed(prev => !prev)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
            aria-expanded={!formCollapsed}
            aria-controls="ai-endpoint-config-form"
          >
            <span className="text-sm text-muted-foreground">
              {t('aiAgents.outpost.localLlm.editConfig', {
                defaultValue: 'Edit AI endpoint configuration',
              })}
            </span>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-muted-foreground transition-transform',
                !formCollapsed && 'rotate-180'
              )}
            />
          </button>
        )}

        {!formCollapsed && (
          <div
            id="ai-endpoint-config-form"
            className={cn(
              'space-y-4',
              startCollapsedWhenConfigured ? 'p-5 pt-4 border-t border-border' : 'p-5'
            )}
          >
            {/* Provider pills — hidden in Outpost (only one provider) */}
            {!isOutpost && providers.length > 1 && (
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
                        {isConfigured && !isSelected && (
                          <Check className="w-3 h-3 text-green-500" />
                        )}
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
            )}

            {/* Outpost: Base URL as primary field */}
            {isOutpost && (
              <div className="space-y-1.5">
                <Label>
                  {t('admin.integrations.aiOutpostEndpoint')}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  placeholder={
                    selectedProviderInfo?.default_base_url || 'http://localhost:11434/v1'
                  }
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {t('admin.integrations.aiOutpostEndpointHint')}
                </p>
              </div>
            )}

            {/* API Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>
                  {t('admin.integrations.aiApiKey')}{' '}
                  {isOutpost ? (
                    <span className="text-xs font-normal text-muted-foreground">
                      {t('common.optional')}
                    </span>
                  ) : (
                    <span className="text-destructive">*</span>
                  )}
                </Label>
                {!isOutpost && selectedProviderInfo?.help_url && (
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
              {isOutpost && !hasExistingKey && !apiKey && (
                <p className="text-xs text-muted-foreground">
                  {t('admin.integrations.aiOutpostApiKeyOptional')}
                </p>
              )}
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
                {testing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wifi className="w-4 h-4" />
                )}
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
              <div
                id="ai-config-advanced"
                className="space-y-4 pl-1 border-l-2 border-muted ml-1.5"
              >
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
            {!isOutpost && enabled && !hasExistingKey && !apiKey && (
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
                disabled={
                  saving ||
                  !selectedProvider ||
                  (!isOutpost && enabled && !hasExistingKey && !apiKey)
                }
              >
                {saving
                  ? t('admin.integrations.saving')
                  : isActiveProvider
                    ? t('admin.integrations.save')
                    : t('admin.integrations.aiSaveActivate')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
