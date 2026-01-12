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
  type ProductGroupAuthorization,
  type AuthorizationType,
} from '@mobazha/core';
import { Loader2, Plus, Trash2, Shield, Users, Globe } from 'lucide-react';

export default function ProductGroupAuthorizationPage() {
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

  // 获取授权类型显示名称
  const getAuthTypeLabel = (auth: ProductGroupAuthorization) => {
    if (auth.authType === 'user_group') {
      return auth.userGroupName || `用户组 #${auth.userGroupID}`;
    }
    return `群组集市: ${auth.groupPlatform}/${auth.groupChatID}`;
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
            返回产品组
          </Link>

          <HStack justify="between" align="center" className="mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {currentGroup?.name || '产品组'} - 访问授权
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

          {/* Info Card */}
          <Card className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <HStack gap="md" align="start">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">授权说明</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  授权规则控制谁可以看到此产品组中的商品。您可以授权给特定的用户组，或者授权给某个群组集市的所有成员。
                </p>
              </div>
            </HStack>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

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
                          {auth.authType === 'user_group' ? '用户组授权' : '群组集市授权'} · 添加于{' '}
                          {new Date(auth.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </HStack>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-600"
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
                <h3 className="text-lg font-semibold text-foreground">暂无授权规则</h3>
                <p className="text-muted-foreground">
                  此产品组当前对所有人开放，添加授权规则以限制访问
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
          <Card className="w-full max-w-md">
            <h2 className="text-xl font-bold text-foreground mb-6">添加授权规则</h2>

            <VStack gap="lg">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  授权类型
                </label>
                <Select
                  value={newAuthType}
                  onValueChange={v => setNewAuthType(v as AuthorizationType)}
                >
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
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    选择用户组
                  </label>
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
                      <Link
                        href="/settings/user-groups"
                        className="text-blue-600 hover:underline ml-1"
                      >
                        创建用户组
                      </Link>
                    </p>
                  )}
                </div>
              )}

              {newAuthType === 'group_marketplace' && groupContext && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">将授权给当前群组：</p>
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
                取消
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
                    添加中...
                  </>
                ) : (
                  '添加'
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
            <AlertDialogTitle>移除授权</AlertDialogTitle>
            <AlertDialogDescription>
              确定要移除此授权规则吗？相关用户将无法访问此产品组中的商品。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAuthorization}
              className="bg-red-600 hover:bg-red-700"
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
