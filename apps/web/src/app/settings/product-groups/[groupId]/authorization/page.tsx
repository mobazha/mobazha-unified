'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui';
import {
  useProductGroups,
  useUserGroups,
  useUserStore,
  getCasdoorUserId,
  useGroupContext,
  useI18n,
  type ProductGroupAuthorization,
  type AuthorizationType,
} from '@mobazha/core';
import { Loader2, Plus, Trash2, Shield, Users, Globe } from 'lucide-react';

export default function ProductGroupAuthorizationPage() {
  const { t } = useI18n();
  const params = useParams();
  const groupId = parseInt(params.groupId as string);

  const { profile, isAuthenticated } = useUserStore();
  const ownerPeerID = profile?.peerID || '';
  // 产品组使用 Casdoor userID（如 telegram_123456），fallback 到 peerID
  const casdoorUserId = getCasdoorUserId();
  const userID = casdoorUserId || ownerPeerID;

  const {
    groups: productGroups,
    loadGroups,
    loadAuthorizations,
    addAuthorization,
    removeAuthorization,
  } = useProductGroups({ userID, autoLoad: false });

  const { groups: userGroups, loadGroups: loadUserGroups } = useUserGroups({
    ownerPeerID,
    autoLoad: false,
  });

  const { context: groupContext } = useGroupContext();

  const [authorizations, setAuthorizations] = useState<ProductGroupAuthorization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAuthType, setNewAuthType] = useState<AuthorizationType>('user_group');
  const [selectedUserGroupId, setSelectedUserGroupId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [removingAuthId, setRemovingAuthId] = useState<number | null>(null);

  // 获取当前产品组
  const currentGroup = productGroups.find(g => g.id === groupId);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated || !userID || isNaN(groupId)) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 加载产品组列表
        await loadGroups(userID);
        // 加载用户组列表（用于授权选择）
        if (ownerPeerID) {
          await loadUserGroups(ownerPeerID);
        }
        // 加载授权规则
        const authList = await loadAuthorizations(groupId);
        setAuthorizations(authList);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('common.loadFailed'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [
    isAuthenticated,
    userID,
    ownerPeerID,
    groupId,
    loadGroups,
    loadUserGroups,
    loadAuthorizations,
  ]);

  // 添加授权
  const handleAddAuthorization = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      let result: ProductGroupAuthorization | null = null;

      if (newAuthType === 'user_group' && selectedUserGroupId) {
        result = await addAuthorization(groupId, {
          authType: 'user_group',
          userGroupID: parseInt(selectedUserGroupId),
        });
      } else if (newAuthType === 'group_marketplace' && groupContext) {
        result = await addAuthorization(groupId, {
          authType: 'group_marketplace',
          groupPlatform: groupContext.platform,
          groupChatID: groupContext.chatId,
        });
      }

      if (result) {
        setAuthorizations(prev => [...prev, result!]);
        setShowAddModal(false);
        setNewAuthType('user_group');
        setSelectedUserGroupId('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.addFailed'));
    } finally {
      setSaving(false);
    }
  }, [groupId, newAuthType, selectedUserGroupId, groupContext, addAuthorization]);

  // 移除授权
  const handleRemoveAuthorization = useCallback(async () => {
    if (removingAuthId === null) return;

    setSaving(true);
    setError(null);

    try {
      const success = await removeAuthorization(groupId, removingAuthId);
      if (success) {
        setAuthorizations(prev => prev.filter(a => a.id !== removingAuthId));
        setRemovingAuthId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.removeFailed'));
    } finally {
      setSaving(false);
    }
  }, [groupId, removingAuthId, removeAuthorization]);

  // 获取授权类型显示名称
  const getAuthTypeLabel = (auth: ProductGroupAuthorization) => {
    if (auth.authType === 'user_group') {
      return auth.userGroupName || `User Group #${auth.userGroupID}`;
    }
    return `${t('settings.accessControl.groupMarketplace')}: ${auth.groupPlatform}/${auth.groupChatID}`;
  };

  // 获取授权类型图标
  const getAuthTypeIcon = (authType: AuthorizationType) => {
    if (authType === 'user_group') {
      return <Users className="w-5 h-5" />;
    }
    return <Globe className="w-5 h-5" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-8">
        <Container size="lg">
          {/* Back Link */}
          <Link
            href="/settings/product-groups"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {t('settings.sidebar.productGroups')}
          </Link>

          <HStack justify="between" align="center" className="mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {currentGroup?.name || t('settings.sidebar.productGroups')} -{' '}
                {t('settings.accessControl.configureAccess')}
              </h1>
              <p className="text-muted-foreground">
                {t('settings.accessControl.authorizationDesc', { count: authorizations.length })}
              </p>
            </div>
            <Button onClick={() => setShowAddModal(true)} disabled={!isAuthenticated}>
              <Plus className="w-4 h-4 mr-2" />
              {t('settings.accessControl.addAuthorization')}
            </Button>
          </HStack>

          {/* Info Card */}
          <Card className="mb-6 bg-info/8 border-info/20">
            <HStack gap="md" align="start">
              <Shield className="w-5 h-5 text-info mt-0.5" />
              <div>
                <h3 className="font-medium text-info mb-1">
                  {t('settings.accessControl.authorizationInfo')}
                </h3>
                <p className="text-sm text-info">
                  {t('settings.accessControl.authorizationInfoDesc')}
                </p>
              </div>
            </HStack>
          </Card>

          {/* Error Message */}
          {error && <div className="bg-error/8 text-error p-4 rounded-lg mb-6">{error}</div>}

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Authorizations List */}
          {!loading && authorizations.length > 0 && (
            <VStack gap="sm">
              {authorizations.map(auth => (
                <Card key={auth.id} className="p-4">
                  <HStack justify="between" align="center">
                    <HStack gap="md" align="center">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        {getAuthTypeIcon(auth.authType)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{getAuthTypeLabel(auth)}</p>
                        <p className="text-sm text-muted-foreground">
                          {auth.authType === 'user_group'
                            ? t('settings.accessControl.userGroupAuth')
                            : t('settings.accessControl.groupMarketplaceAuth')}{' '}
                          · {t('settings.accessControl.addedOn')}{' '}
                          {new Date(auth.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </HStack>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-error hover:text-error"
                      onClick={() => setRemovingAuthId(auth.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </HStack>
                </Card>
              ))}
            </VStack>
          )}

          {/* Empty State */}
          {!loading && authorizations.length === 0 && (
            <Card className="text-center py-12">
              <VStack gap="md" align="center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Shield className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {t('settings.accessControl.noAuthorizations')}
                </h3>
                <p className="text-muted-foreground">
                  {t('settings.accessControl.noAuthorizationsDesc')}
                </p>
                <Button onClick={() => setShowAddModal(true)} disabled={!isAuthenticated}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('settings.accessControl.addAuthorization')}
                </Button>
              </VStack>
            </Card>
          )}
        </Container>
      </main>

      <Footer />

      {/* Add Authorization Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <h2 className="text-xl font-bold text-foreground mb-6">
              {t('settings.accessControl.addAuthorization')}
            </h2>

            <VStack gap="lg">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  {t('settings.accessControl.authorizationType')}
                </label>
                <Select
                  value={newAuthType}
                  onValueChange={v => setNewAuthType(v as AuthorizationType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user_group">
                      {t('settings.accessControl.userGroupAuth')}
                    </SelectItem>
                    <SelectItem value="group_marketplace" disabled={!groupContext}>
                      {t('settings.accessControl.groupMarketplaceAuth')}{' '}
                      {!groupContext && `(${t('settings.accessControl.notInGroup')})`}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newAuthType === 'user_group' && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    {t('settings.accessControl.selectUserGroup')}
                  </label>
                  <Select value={selectedUserGroupId} onValueChange={setSelectedUserGroupId}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t('settings.accessControl.selectUserGroupPlaceholder')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {userGroups.map(group => (
                        <SelectItem key={group.id} value={String(group.id)}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {userGroups.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('settings.accessControl.noUserGroups')}.
                      <Link
                        href="/settings/user-groups"
                        className="text-primary hover:underline ml-1"
                      >
                        {t('settings.accessControl.createUserGroup')}
                      </Link>
                    </p>
                  )}
                </div>
              )}

              {newAuthType === 'group_marketplace' && groupContext && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('settings.accessControl.willAuthorizeGroup')}
                  </p>
                  <p className="font-medium text-foreground">
                    {groupContext.chatTitle || groupContext.chatId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {groupContext.platform} · {groupContext.chatId}
                  </p>
                </div>
              )}
            </VStack>

            <HStack justify="end" gap="sm" className="mt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAddModal(false);
                  setNewAuthType('user_group');
                  setSelectedUserGroupId('');
                }}
                disabled={saving}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleAddAuthorization}
                disabled={
                  saving ||
                  (newAuthType === 'user_group' && !selectedUserGroupId) ||
                  (newAuthType === 'group_marketplace' && !groupContext)
                }
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('common.adding')}
                  </>
                ) : (
                  t('common.add')
                )}
              </Button>
            </HStack>
          </Card>
        </div>
      )}

      {/* Remove Confirmation AlertDialog */}
      <AlertDialog
        open={removingAuthId !== null}
        onOpenChange={open => !open && setRemovingAuthId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.accessControl.removeAuthorization')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.accessControl.removeAuthorizationConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAuthorization}
              className="bg-error hover:bg-error"
              disabled={saving}
            >
              {saving ? t('common.removing') : t('common.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
