'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { HStack, VStack } from '@/components/layouts';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Loader2, Plus, Trash2, Shield, Users, Globe, ChevronLeft } from 'lucide-react';
import { SettingsReferrerBanner } from '@/components/SettingsContent';

export default function ProductGroupAuthorizationPage() {
  const params = useParams();
  const groupId = parseInt(params.groupId as string);
  const { t } = useI18n();

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
        await loadGroups(userID);
        if (ownerPeerID) {
          await loadUserGroups(ownerPeerID);
        }
        const authList = await loadAuthorizations(groupId);
        setAuthorizations(authList);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
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
      setError(err instanceof Error ? err.message : '添加失败');
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
      setError(err instanceof Error ? err.message : '移除失败');
    } finally {
      setSaving(false);
    }
  }, [groupId, removingAuthId, removeAuthorization]);

  const getAuthTypeLabel = (auth: ProductGroupAuthorization) => {
    if (auth.authType === 'user_group') {
      return auth.userGroupName || `${t('settings.accessControl.userGroup')} #${auth.userGroupID}`;
    }
    return `${t('settings.accessControl.groupMarketplace')}: ${auth.groupPlatform}/${auth.groupChatID}`;
  };

  const getAuthTypeIcon = (authType: AuthorizationType) => {
    if (authType === 'user_group') {
      return <Users className="w-5 h-5" />;
    }
    return <Globe className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      {/* 返回来源页面横幅 */}
      <SettingsReferrerBanner />

      {/* 面包屑导航 */}
      <Link
        href={`/settings/access-control/product-groups/${groupId}`}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        {currentGroup?.name || t('settings.sidebar.productGroups')}
      </Link>

      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold">{t('settings.accessControl.configureAccess')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('settings.accessControl.authorizationDesc', { count: authorizations.length })}
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} disabled={!isAuthenticated}>
          <Plus className="w-4 h-4 mr-2" />
          {t('settings.accessControl.addAuthorization')}
        </Button>
      </div>

      {/* 说明卡片 */}
      <Card className="mb-6 p-4 bg-info/15 border-info/30">
        <HStack gap="md" align="start">
          <Shield className="w-5 h-5 text-info mt-0.5 shrink-0" />
          <div>
            <h3 className="font-medium text-info mb-1">
              {t('settings.accessControl.authorizationInfo')}
            </h3>
            <p className="text-sm text-info/80">
              {t('settings.accessControl.authorizationInfoDesc')}
            </p>
          </div>
        </HStack>
      </Card>

      {/* 错误提示 */}
      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6">{error}</div>
      )}

      {/* 授权列表 */}
      {authorizations.length > 0 ? (
        <VStack gap="sm">
          {authorizations.map(auth => (
            <Card key={auth.id} className="p-4">
              <HStack justify="between" align="center">
                <HStack gap="md" align="center">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    {getAuthTypeIcon(auth.authType)}
                  </div>
                  <div>
                    <p className="font-medium">{getAuthTypeLabel(auth)}</p>
                    <p className="text-sm text-muted-foreground">
                      {auth.authType === 'user_group'
                        ? t('settings.accessControl.userGroupAuth')
                        : t('settings.accessControl.groupMarketplaceAuth')}
                    </p>
                  </div>
                </HStack>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setRemovingAuthId(auth.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </HStack>
            </Card>
          ))}
        </VStack>
      ) : (
        <Card className="text-center py-12">
          <VStack gap="md" align="center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Shield className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">
              {t('settings.accessControl.noAuthorizations')}
            </h3>
            <p className="text-muted-foreground max-w-md">
              {t('settings.accessControl.noAuthorizationsDesc')}
            </p>
            <Button onClick={() => setShowAddModal(true)} disabled={!isAuthenticated}>
              <Plus className="w-4 h-4 mr-2" />
              {t('settings.accessControl.addAuthorization')}
            </Button>
          </VStack>
        </Card>
      )}

      {/* 添加授权弹窗 */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settings.accessControl.addAuthorization')}</DialogTitle>
          </DialogHeader>

          <VStack gap="lg">
            <div>
              <label className="block text-sm font-medium mb-2">
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
                <label className="block text-sm font-medium mb-2">
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
                    {t('settings.accessControl.noUserGroups')}{' '}
                    <Link
                      href="/settings/access-control/user-groups"
                      className="text-primary hover:underline"
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
                <p className="font-medium">{groupContext.chatTitle || groupContext.chatId}</p>
                <p className="text-xs text-muted-foreground">
                  {groupContext.platform} · {groupContext.chatId}
                </p>
              </div>
            )}
          </VStack>

          <HStack justify="end" gap="sm" className="mt-6">
            <Button variant="ghost" onClick={() => setShowAddModal(false)} disabled={saving}>
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
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('common.add')}
            </Button>
          </HStack>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
