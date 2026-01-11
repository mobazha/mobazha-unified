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
import { Loader2, Plus, Trash2, Shield, Users, Globe, ChevronLeft } from 'lucide-react';

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
  }, [isAuthenticated, userID, ownerPeerID, groupId, loadGroups, loadUserGroups, loadAuthorizations]);

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
      return auth.userGroupName || `用户组 #${auth.userGroupID}`;
    }
    return `群组集市: ${auth.groupPlatform}/${auth.groupChatID}`;
  };

  const getAuthTypeIcon = (authType: AuthorizationType) => {
    if (authType === 'user_group') {
      return <Users className="w-5 h-5" />;
    }
    return <Globe className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <Container className="py-8">
          <Link
            href={`/settings/access-control/product-groups/${groupId}`}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ChevronLeft className="w-4 h-4" />
            返回产品组
          </Link>

          <HStack justify="between" align="center" className="mb-8">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                {currentGroup?.name || '产品组'} - {t('settings.accessControl.configureAccess')}
              </h1>
              <p className="text-muted-foreground">
                配置谁可以访问此产品组中的商品，共 {authorizations.length} 条授权规则
              </p>
            </div>
            <Button onClick={() => setShowAddModal(true)} disabled={!isAuthenticated}>
              <Plus className="w-4 h-4 mr-2" />
              添加授权
            </Button>
          </HStack>

          <Card className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <HStack gap="md" align="start">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">授权说明</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  授权规则控制谁可以看到此产品组中的商品。
                </p>
              </div>
            </HStack>
          </Card>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

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
                          {auth.authType === 'user_group' ? '用户组授权' : '群组集市授权'}
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
                <h3 className="text-lg font-semibold">暂无授权规则</h3>
                <p className="text-muted-foreground">
                  此产品组当前对所有人开放
                </p>
                <Button onClick={() => setShowAddModal(true)} disabled={!isAuthenticated}>
                  <Plus className="w-4 h-4 mr-2" />
                  添加授权
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
          <Card className="w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-6">添加授权规则</h2>

            <VStack gap="lg">
              <div>
                <label className="block text-sm font-medium mb-2">授权类型</label>
                <Select value={newAuthType} onValueChange={v => setNewAuthType(v as AuthorizationType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user_group">用户组授权</SelectItem>
                    <SelectItem value="group_marketplace" disabled={!groupContext}>
                      群组集市授权 {!groupContext && '(未在群组中)'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newAuthType === 'user_group' && (
                <div>
                  <label className="block text-sm font-medium mb-2">选择用户组</label>
                  <Select value={selectedUserGroupId} onValueChange={setSelectedUserGroupId}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择一个用户组" />
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
                      暂无用户组，请先
                      <Link href="/settings/access-control/user-groups" className="text-blue-600 hover:underline ml-1">
                        创建用户组
                      </Link>
                    </p>
                  )}
                </div>
              )}

              {newAuthType === 'group_marketplace' && groupContext && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">将授权给当前群组：</p>
                  <p className="font-medium">{groupContext.chatTitle || groupContext.chatId}</p>
                  <p className="text-xs text-muted-foreground">{groupContext.platform} · {groupContext.chatId}</p>
                </div>
              )}
            </VStack>

            <HStack justify="end" gap="sm" className="mt-6">
              <Button variant="ghost" onClick={() => setShowAddModal(false)} disabled={saving}>取消</Button>
              <Button
                onClick={handleAddAuthorization}
                disabled={saving || (newAuthType === 'user_group' && !selectedUserGroupId) || (newAuthType === 'group_marketplace' && !groupContext)}
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                添加
              </Button>
            </HStack>
          </Card>
        </div>
      )}

      {/* Remove Confirmation */}
      <AlertDialog open={removingAuthId !== null} onOpenChange={open => !open && setRemovingAuthId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>移除授权</AlertDialogTitle>
            <AlertDialogDescription>确定要移除此授权规则吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAuthorization}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
            >
              {saving ? '移除中...' : '移除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
