'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input-compat';
import {
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
  useUserStore,
  getCasdoorUserId,
  GROUP_COLORS,
  type ProductGroup,
} from '@mobazha/core';
import { Loader2 } from 'lucide-react';

// 本地表单类型（UI 使用）
interface ProductGroupForm {
  name: string;
  description: string;
  color: string;
}

export default function ProductGroupsPage() {
  const { profile, isAuthenticated } = useUserStore();
  const ownerPeerID = profile?.peerID || '';

  // 产品组使用 Casdoor userID（如 telegram_123456），fallback 到 peerID
  const casdoorUserId = getCasdoorUserId();
  const userID = casdoorUserId || ownerPeerID;

  const { groups, loading, error, loadGroups, createGroup, updateGroup, deleteGroup } =
    useProductGroups({ userID, autoLoad: false });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ProductGroup | null>(null);
  const [newGroup, setNewGroup] = useState<ProductGroupForm>({
    name: '',
    description: '',
    color: GROUP_COLORS[0],
  });
  const [deleteGroupId, setDeleteGroupId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // 加载产品组
  useEffect(() => {
    if (isAuthenticated && userID) {
      loadGroups(userID);
    }
  }, [isAuthenticated, userID, loadGroups]);

  // 创建产品组
  const handleCreateGroup = useCallback(async () => {
    if (!userID || !newGroup.name.trim()) return;

    setSaving(true);
    try {
      const result = await createGroup({
        userID,
        name: newGroup.name.trim(),
        description: newGroup.description.trim() || undefined,
      });

      if (result) {
        setShowCreateModal(false);
        setNewGroup({ name: '', description: '', color: GROUP_COLORS[0] });
      }
    } finally {
      setSaving(false);
    }
  }, [userID, newGroup, createGroup]);

  // 更新产品组
  const handleUpdateGroup = useCallback(async () => {
    if (!editingGroup) return;

    setSaving(true);
    try {
      const result = await updateGroup(editingGroup.id, {
        name: editingGroup.name.trim(),
        description: editingGroup.description?.trim() || undefined,
      });

      if (result) {
        setEditingGroup(null);
      }
    } finally {
      setSaving(false);
    }
  }, [editingGroup, updateGroup]);

  // 删除产品组
  const handleDeleteGroupConfirm = useCallback(async () => {
    if (deleteGroupId === null) return;

    setSaving(true);
    try {
      const success = await deleteGroup(deleteGroupId);
      if (success) {
        setDeleteGroupId(null);
      }
    } finally {
      setSaving(false);
    }
  }, [deleteGroupId, deleteGroup]);

  // 获取随机颜色（基于 id）
  const getGroupColor = (id: number) => {
    return GROUP_COLORS[id % GROUP_COLORS.length];
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-8">
        <Container size="lg">
          {/* Back Link */}
          <Link
            href="/settings/privacy"
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
            返回隐私设置
          </Link>

          <HStack justify="between" align="center" className="mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">产品组</h1>
              <p className="text-muted-foreground">组织商品并控制不同客户群组的可见性</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} disabled={!isAuthenticated}>
              创建产品组
            </Button>
          </HStack>

          {/* Error Message */}
          {error && <div className="bg-error/8 text-error p-4 rounded-lg mb-6">{error}</div>}

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Groups List */}
          {!loading && groups.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groups.map(group => (
                <Card key={group.id}>
                  <HStack justify="between" align="start" className="mb-4">
                    <HStack gap="md" align="center">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: getGroupColor(group.id) }}
                      >
                        {group.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{group.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full text-primary bg-primary/10">
                          {group.itemCount || 0} 件商品
                        </span>
                      </div>
                    </HStack>
                    <HStack gap="xs">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setEditingGroup({
                            ...group,
                            description: group.description || '',
                          })
                        }
                      >
                        编辑
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-error"
                        onClick={() => setDeleteGroupId(group.id)}
                      >
                        删除
                      </Button>
                    </HStack>
                  </HStack>

                  {group.description && (
                    <p className="text-sm text-muted-foreground mb-3">{group.description}</p>
                  )}

                  <div className="pt-4 border-t border-border space-y-2">
                    <Link
                      href={`/settings/product-groups/${group.id}`}
                      className="block text-sm text-primary hover:text-primary/80"
                    >
                      管理商品 →
                    </Link>
                    <Link
                      href={`/settings/product-groups/${group.id}/authorization`}
                      className="block text-sm text-primary hover:text-primary"
                    >
                      访问授权 →
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && groups.length === 0 && (
            <Card className="text-center py-12">
              <VStack gap="md" align="center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground">暂无产品组</h3>
                <p className="text-muted-foreground">创建产品组来组织您的商品库</p>
                <Button onClick={() => setShowCreateModal(true)} disabled={!isAuthenticated}>
                  创建产品组
                </Button>
              </VStack>
            </Card>
          )}

          {/* Not Authenticated */}
          {!isAuthenticated && !loading && (
            <Card className="text-center py-12">
              <VStack gap="md" align="center">
                <p className="text-muted-foreground">请先登录以管理产品组</p>
                <Link href="/login">
                  <Button>登录</Button>
                </Link>
              </VStack>
            </Card>
          )}
        </Container>
      </main>

      <Footer />

      {/* Create/Edit Modal */}
      {(showCreateModal || editingGroup) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <h2 className="text-xl font-bold text-foreground mb-6">
              {editingGroup ? '编辑产品组' : '创建产品组'}
            </h2>

            <VStack gap="lg">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  产品组名称 *
                </label>
                <Input
                  value={editingGroup?.name || newGroup.name}
                  onChange={e =>
                    editingGroup
                      ? setEditingGroup({ ...editingGroup, name: e.target.value })
                      : setNewGroup(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="例如：高端系列"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">描述</label>
                <textarea
                  value={editingGroup?.description || newGroup.description}
                  onChange={e =>
                    editingGroup
                      ? setEditingGroup({ ...editingGroup, description: e.target.value })
                      : setNewGroup(prev => ({ ...prev, description: e.target.value }))
                  }
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="描述这个产品组..."
                />
              </div>

              {!editingGroup && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    颜色
                  </label>
                  <div className="flex gap-2">
                    {GROUP_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewGroup(prev => ({ ...prev, color }))}
                        className={`w-8 h-8 rounded-lg transition-transform ${
                          newGroup.color === color
                            ? 'ring-2 ring-offset-2 ring-border scale-110'
                            : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </VStack>

            <HStack justify="end" gap="sm" className="mt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingGroup(null);
                }}
                disabled={saving}
              >
                取消
              </Button>
              <Button
                onClick={editingGroup ? handleUpdateGroup : handleCreateGroup}
                disabled={!(editingGroup?.name || newGroup.name) || saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : editingGroup ? (
                  '保存'
                ) : (
                  '创建'
                )}
              </Button>
            </HStack>
          </Card>
        </div>
      )}

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog
        open={deleteGroupId !== null}
        onOpenChange={open => !open && setDeleteGroupId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除产品组</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个产品组吗？该组中的商品将被移除关联。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroupConfirm}
              className="bg-error hover:bg-error"
              disabled={saving}
            >
              {saving ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
