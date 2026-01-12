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
import { useUserGroups, useUserStore, GROUP_COLORS, type UserGroup } from '@mobazha/core';
import { Loader2 } from 'lucide-react';

// 本地表单类型（UI 使用）
interface UserGroupForm {
  name: string;
  description: string;
  color: string;
}

export default function UserGroupsPage() {
  const { profile, isAuthenticated } = useUserStore();
  const ownerPeerID = profile?.peerID || '';

  const { groups, loading, error, loadGroups, createGroup, updateGroup, deleteGroup } =
    useUserGroups({ ownerPeerID, autoLoad: false });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [newGroup, setNewGroup] = useState<UserGroupForm>({
    name: '',
    description: '',
    color: GROUP_COLORS[0],
  });
  const [deleteGroupId, setDeleteGroupId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // 加载用户组
  useEffect(() => {
    if (isAuthenticated && ownerPeerID) {
      loadGroups(ownerPeerID);
    }
  }, [isAuthenticated, ownerPeerID, loadGroups]);

  // 创建用户组
  const handleCreateGroup = useCallback(async () => {
    if (!ownerPeerID || !newGroup.name.trim()) return;

    setSaving(true);
    try {
      const result = await createGroup({
        ownerPeerID,
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
  }, [ownerPeerID, newGroup, createGroup]);

  // 更新用户组
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

  // 删除用户组
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
              <h1 className="text-3xl font-bold text-foreground mb-2">用户组</h1>
              <p className="text-muted-foreground">创建和管理不同权限的客户群组</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} disabled={!isAuthenticated}>
              创建用户组
            </Button>
          </HStack>

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

          {/* Groups List */}
          {!loading && groups.length > 0 && (
            <VStack gap="md">
              {groups.map(group => (
                <Card key={group.id}>
                  <HStack justify="between" align="start">
                    <HStack gap="lg" align="start">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: getGroupColor(group.id) }}
                      >
                        {group.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">{group.name}</h3>
                        {group.description && (
                          <p className="text-sm text-muted-foreground mb-3">{group.description}</p>
                        )}
                        <HStack gap="md" className="text-sm">
                          <span className="text-muted-foreground">
                            {group.memberCount || 0} 位成员
                          </span>
                        </HStack>
                      </div>
                    </HStack>

                    <HStack gap="sm">
                      <Link href={`/settings/user-groups/${group.id}/members`}>
                        <Button size="sm" variant="ghost">
                          成员管理
                        </Button>
                      </Link>
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
                        className="text-red-500 hover:text-red-600"
                        onClick={() => setDeleteGroupId(group.id)}
                      >
                        删除
                      </Button>
                    </HStack>
                  </HStack>
                </Card>
              ))}
            </VStack>
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
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground">暂无用户组</h3>
                <p className="text-muted-foreground">创建第一个用户组来管理您的客户</p>
                <Button onClick={() => setShowCreateModal(true)} disabled={!isAuthenticated}>
                  创建用户组
                </Button>
              </VStack>
            </Card>
          )}

          {/* Not Authenticated */}
          {!isAuthenticated && !loading && (
            <Card className="text-center py-12">
              <VStack gap="md" align="center">
                <p className="text-muted-foreground">请先登录以管理用户组</p>
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
              {editingGroup ? '编辑用户组' : '创建用户组'}
            </h2>

            <VStack gap="lg">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  用户组名称 *
                </label>
                <Input
                  value={editingGroup?.name || newGroup.name}
                  onChange={e =>
                    editingGroup
                      ? setEditingGroup({ ...editingGroup, name: e.target.value })
                      : setNewGroup(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="例如：VIP 客户"
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
                  className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="描述这个用户组..."
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
                            ? 'ring-2 ring-offset-2 ring-slate-400 scale-110'
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
            <AlertDialogTitle>删除用户组</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个用户组吗？该组中的成员将被移除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroupConfirm}
              className="bg-red-600 hover:bg-red-700"
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
