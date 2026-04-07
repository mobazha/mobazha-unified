'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  useToast,
  Skeleton,
} from '@/components/ui';
import {
  useI18n,
  isStandalone,
  getLinkedAccounts,
  unlinkAccount,
  startLinkAccount,
  getLinkConfig,
  directLinkTelegram,
  hasLinkCallback,
  getLinkCallbackParams,
  getLinkCallbackStorefrontReturn,
  handleLinkCallback,
  clearLinkCallbackParams,
  SUPPORTED_PROVIDERS,
  standaloneStoresApi,
  acquireSaaSToken,
  hasSaaSToken,
  systemApi,
} from '@mobazha/core';
import type {
  LinkedAccount,
  OAuthProvider,
  ProviderInfo,
  StandaloneStore,
  LinkConfigResponse,
  TelegramAuthData,
} from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import {
  Link2,
  Unlink,
  AlertCircle,
  Check,
  Server,
  ExternalLink,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { ProviderIcon } from '@/components/ProviderIcon';

const TELEGRAM_WIDGET_CALLBACK = '__mbz_telegram_link_cb';

/**
 * Telegram Login Widget — renders the official Telegram login button.
 * When user authenticates, fires the global callback which triggers directLinkTelegram.
 */
function TelegramLoginWidget({ botUsername }: { botUsername: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'medium');
    script.setAttribute('data-onauth', `${TELEGRAM_WIDGET_CALLBACK}(user)`);
    script.setAttribute('data-request-access', 'write');
    script.async = true;
    container.appendChild(script);
    return () => {
      container.innerHTML = '';
    };
  }, [botUsername]);

  return <div ref={containerRef} />;
}

export default function AccountSettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const standaloneMode = useMemo(() => isStandalone(), []);

  // State — all hooks must be called unconditionally (React rules of hooks)
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlinkingProvider, setUnlinkingProvider] = useState<OAuthProvider | null>(null);
  const [linkingProvider, setLinkingProvider] = useState<OAuthProvider | null>(null);
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [providerToUnlink, setProviderToUnlink] = useState<LinkedAccount | null>(null);

  // Standalone store state (V1: one store per user)
  const [standaloneStore, setStandaloneStore] = useState<StandaloneStore | null>(null);
  const [isLoadingStores, setIsLoadingStores] = useState(true);

  // Provider config for direct linking (Telegram botUsername, Discord clientId)
  const [linkConfig, setLinkConfig] = useState<LinkConfigResponse | null>(null);

  // Standalone SaaS bridge state
  const [saasConnected, setSaasConnected] = useState(() =>
    standaloneMode ? hasSaaSToken() : true
  );
  const [saasConnecting, setSaasConnecting] = useState(false);
  const [saasError, setSaasError] = useState<string | null>(null);

  // 加载已绑定账号
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

  // 加载绑定配置 — skip when standalone admin hasn't connected to SaaS yet
  useEffect(() => {
    if (standaloneMode && !saasConnected) return;
    getLinkConfig()
      .then(setLinkConfig)
      .catch(() => {});
  }, [standaloneMode, saasConnected]);

  // Telegram Login Widget 全局回调
  const handleTelegramAuth = useCallback(
    async (authData: TelegramAuthData) => {
      try {
        setLinkingProvider('telegram');
        await directLinkTelegram(authData);
        toast({
          title: t('common.success'),
          description: t('settings.accountBinding.linkSuccess'),
        });
        loadLinkedAccounts();
      } catch (err) {
        toast({
          title: t('common.error'),
          description: err instanceof Error ? err.message : t('settings.accountBinding.linkFailed'),
          variant: 'destructive',
        });
      } finally {
        setLinkingProvider(null);
      }
    },
    [toast, t, loadLinkedAccounts]
  );

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)[TELEGRAM_WIDGET_CALLBACK] = handleTelegramAuth;
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any)[TELEGRAM_WIDGET_CALLBACK];
    };
  }, [handleTelegramAuth]);

  // Casdoor link mode 绑定回调（Discord/Google/GitHub 等标准 OAuth provider）
  useEffect(() => {
    const processLinkCallback = async () => {
      if (hasLinkCallback()) {
        const sfReturn = getLinkCallbackStorefrontReturn();
        const { code, state, providerId } = getLinkCallbackParams();
        if (state && (code || providerId)) {
          try {
            const result = await handleLinkCallback(code, state, providerId);
            if (result.success) {
              if (sfReturn) {
                window.location.href = `${sfReturn}/settings/account`;
                return;
              }
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
  }, [toast, loadLinkedAccounts, t]);

  // 初始加载 — skip when standalone admin hasn't connected to SaaS yet
  useEffect(() => {
    if (standaloneMode && !saasConnected) return;
    loadLinkedAccounts();
  }, [loadLinkedAccounts, standaloneMode, saasConnected]);

  // Load standalone store — skip when standalone admin hasn't connected to SaaS yet
  useEffect(() => {
    if (standaloneMode && !saasConnected) {
      setIsLoadingStores(false);
      return;
    }
    async function loadStore() {
      try {
        const store = await standaloneStoresApi.getMyStandaloneStore();
        setStandaloneStore(store);
      } catch {
        // Not critical — user may not have any standalone store
      } finally {
        setIsLoadingStores(false);
      }
    }
    loadStore();
  }, [standaloneMode, saasConnected]);

  // 获取未绑定的 Provider
  const getAvailableProviders = () => {
    const linkedProviderIds = linkedAccounts.map(a => a.provider);
    return SUPPORTED_PROVIDERS.filter(p => !linkedProviderIds.includes(p.id));
  };

  // 获取 Provider 信息
  const getProviderInfo = (providerId: OAuthProvider): ProviderInfo | undefined => {
    return SUPPORTED_PROVIDERS.find(p => p.id === providerId);
  };

  // 绑定账号 — Telegram 由 widget 处理, 其他 provider 走 Casdoor link mode
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

  // 确认解绑
  const confirmUnlink = (account: LinkedAccount) => {
    setProviderToUnlink(account);
    setShowUnlinkDialog(true);
  };

  // 解绑账号
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

  // 已绑定账号卡片
  const renderLinkedAccountCard = (account: LinkedAccount) => {
    const providerInfo = getProviderInfo(account.provider);
    return (
      <div
        key={`${account.provider}-${account.providerId}`}
        className="flex items-center justify-between p-3 border-b border-border last:border-0"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <ProviderIcon provider={account.provider} />
          </div>
          <div>
            <p className="font-medium text-sm">{providerInfo?.name || account.provider}</p>
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
            <Unlink className="w-4 h-4 mr-1" />
            {unlinkingProvider === account.provider ? '...' : t('settings.accountBinding.unlink')}
          </Button>
        )}
      </div>
    );
  };

  // 可绑定账号卡片
  const renderAvailableProviderCard = (provider: ProviderInfo) => {
    const telegramBot = linkConfig?.providers?.telegram?.botUsername;
    const isTelegram = provider.id === 'telegram' && telegramBot;

    return (
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
        {isTelegram ? (
          <TelegramLoginWidget botUsername={telegramBot} />
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleLink(provider.id)}
            disabled={linkingProvider === provider.id}
          >
            <Link2 className="w-4 h-4 mr-1" />
            {linkingProvider === provider.id ? '...' : t('settings.accountBinding.link')}
          </Button>
        )}
      </div>
    );
  };

  // Standalone: acquire SaaS JWT, then call connect-platform to persist
  // the Casdoor certificate and ownerUserID on this node (enables social login).
  const handleConnectSaaS = useCallback(async () => {
    setSaasConnecting(true);
    setSaasError(null);
    try {
      const result = await acquireSaaSToken();
      if (!result.success || !result.token) {
        setSaasError(result.error || 'Failed to connect');
        return;
      }

      try {
        await systemApi.connectPlatform(result.token);
      } catch (err) {
        console.warn('connect-platform call failed (binding still works):', err);
      }

      setSaasConnected(true);
      loadLinkedAccounts();
    } catch (err) {
      setSaasError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setSaasConnecting(false);
    }
  }, [loadLinkedAccounts]);

  if (standaloneMode && !saasConnected) {
    return (
      <div>
        <SettingsPageHeader
          title={t('settings.sidebar.account')}
          description={t('settings.accountBinding.description')}
        />
        <Card className="p-6 md:p-8">
          <div className="text-center py-8">
            <Link2 className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t('settings.accountBinding.standaloneSocialTitle', {
                defaultValue: 'Social Account Binding',
              })}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              {t('settings.accountBinding.standaloneConnectDesc', {
                defaultValue:
                  'Connect your Telegram, Discord, or Google account to enable quick social login. Sign in to Mobazha Platform first to manage your linked accounts.',
              })}
            </p>
            {saasError && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <p className="text-sm text-destructive">{saasError}</p>
              </div>
            )}
            <Button onClick={handleConnectSaaS} disabled={saasConnecting} className="mx-auto">
              {saasConnecting
                ? t('common.connecting', { defaultValue: 'Connecting...' })
                : t('settings.accountBinding.connectPlatform', {
                    defaultValue: 'Connect to Mobazha Platform',
                  })}
            </Button>
            <div className="flex items-center justify-center gap-4 mt-6 text-muted-foreground/50">
              {SUPPORTED_PROVIDERS.map(p => (
                <div key={p.id} className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <ProviderIcon provider={p.id} />
                  </div>
                  <span className="text-xs">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <SettingsPageHeader
        title={t('settings.sidebar.account')}
        description={t('settings.accountBinding.description')}
      />

      <Card className="p-4 md:p-6">
        <div className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive bg-destructive/10">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={loadLinkedAccounts}>
                  {t('common.retry')}
                </Button>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {t('settings.accountBinding.linked')}
            </h4>
            {isLoading ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </div>
            ) : linkedAccounts.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground">
                <p className="text-sm">{t('settings.accountBinding.noLinked')}</p>
                <p className="text-xs mt-1">{t('settings.accountBinding.description')}</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                {linkedAccounts.map(renderLinkedAccountCard)}
              </div>
            )}
          </div>

          {availableProviders.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {t('settings.accountBinding.available')}
              </h4>
              <div className="rounded-lg border border-border overflow-hidden">
                {availableProviders.map(renderAvailableProviderCard)}
              </div>
            </div>
          )}

          {/* Standalone Store Section (V1: single store per user) */}
          {!isLoadingStores && standaloneStore && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {t('settings.accountBinding.standaloneStore')}
              </h4>
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Server className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {standaloneStore.domain ||
                            `${standaloneStore.peer_id.slice(0, 8)}...${standaloneStore.peer_id.slice(-6)}`}
                        </p>
                        {standaloneStore.last_heartbeat &&
                        Date.now() - new Date(standaloneStore.last_heartbeat).getTime() <
                          5 * 60 * 1000 ? (
                          <Wifi className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {standaloneStore.connectivity === 'public'
                          ? 'Public'
                          : standaloneStore.connectivity === 'tunnel'
                            ? 'Tunnel'
                            : 'NAT'}
                        {standaloneStore.endpoint_url &&
                          (() => {
                            try {
                              const hostname = new URL(standaloneStore.endpoint_url).hostname;
                              return (
                                <>
                                  {' · '}
                                  <a
                                    href={standaloneStore.endpoint_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline inline-flex items-center gap-0.5"
                                  >
                                    {hostname}
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </>
                              );
                            } catch {
                              return null;
                            }
                          })()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">{t('settings.accountBinding.keepOne')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('settings.accountBinding.keepOneDesc')}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* 解绑确认对话框 */}
      <AlertDialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.accountBinding.unlinkConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.accountBinding.unlinkConfirmDesc', {
                provider: providerToUnlink
                  ? (getProviderInfo(providerToUnlink.provider)?.name ?? '')
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
    </div>
  );
}
