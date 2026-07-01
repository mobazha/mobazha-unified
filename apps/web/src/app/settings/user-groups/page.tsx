'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { HStack, VStack } from '@/components/layouts';
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
import { useUserGroups, useUserStore, GROUP_COLORS, useI18n, type UserGroup } from '@mobazha/core';
import { Loader2 } from 'lucide-react';

// 本地表单类型（UI 使用）
interface UserGroupForm {
  name: string;
  description: string;
  color: string;
}

export default function UserGroupsPage() {
  const { t } = useI18n();
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
    <div>
      <HStack justify="between" align="center" className="mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('settings.sidebar.userGroups')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('settings.accessControl.userGroupsDesc')}
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} disabled={!isAuthenticated}>
          {t('settings.accessControl.createUserGroup')}
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
        <VStack gap="md">
          {groups.map(group => (
            <Card key={group.id} className="p-5">
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
                        {group.memberCount || 0} {t('common.members')}
                      </span>
                    </HStack>
                  </div>
                </HStack>

                <HStack gap="sm">
                  <Link href={`/settings/user-groups/${group.id}/members`}>
                    <Button size="sm" variant="ghost">
                      {t('common.members')}
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
                    {t('common.edit')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-error hover:text-error"
                    onClick={() => setDeleteGroupId(group.id)}
                  >
                    {t('common.delete')}
                  </Button>
                </HStack>
              </HStack>
            </Card>
          ))}
        </VStack>
      )}

      {/* Empty State */}
      {!loading && groups.length === 0 && (
        <Card className="p-8 text-center">
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
            <h3 className="text-lg font-semibold text-foreground">
              {t('settings.accessControl.noUserGroups')}
            </h3>
            <p className="text-muted-foreground">{t('settings.accessControl.noUserGroupsDesc')}</p>
            <Button onClick={() => setShowCreateModal(true)} disabled={!isAuthenticated}>
              {t('settings.accessControl.createFirstUserGroup')}
            </Button>
          </VStack>
        </Card>
      )}

      {/* Not Authenticated */}
      {!isAuthenticated && !loading && (
        <Card className="p-8 text-center">
          <VStack gap="md" align="center">
            <p className="text-muted-foreground">{t('common.loginRequired')}</p>
            <Link href="/login">
              <Button>{t('common.login')}</Button>
            </Link>
          </VStack>
        </Card>
      )}
      {/* Create/Edit Modal */}
      {(showCreateModal || editingGroup) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-foreground mb-6">
              {editingGroup
                ? t('settings.accessControl.editUserGroup')
                : t('settings.accessControl.createUserGroup')}
            </h2>

            <VStack gap="lg">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  {t('common.name')} *
                </label>
                <Input
                  value={editingGroup?.name || newGroup.name}
                  onChange={e =>
                    editingGroup
                      ? setEditingGroup({ ...editingGroup, name: e.target.value })
                      : setNewGroup(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={t('settings.accessControl.groupNamePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  {t('common.description')}
                </label>
                <textarea
                  value={editingGroup?.description || newGroup.description}
                  onChange={e =>
                    editingGroup
                      ? setEditingGroup({ ...editingGroup, description: e.target.value })
                      : setNewGroup(prev => ({ ...prev, description: e.target.value }))
                  }
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder={t('settings.accessControl.groupDescPlaceholder')}
                />
              </div>

              {!editingGroup && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    {t('common.color')}
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
                {t('common.cancel')}
              </Button>
              <Button
                onClick={editingGroup ? handleUpdateGroup : handleCreateGroup}
                disabled={!(editingGroup?.name || newGroup.name) || saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('common.saving')}
                  </>
                ) : editingGroup ? (
                  t('common.save')
                ) : (
                  t('common.create')
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
            <AlertDialogTitle>{t('settings.accessControl.deleteUserGroup')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.accessControl.deleteUserGroupConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroupConfirm}
              className="bg-error hover:bg-error"
              disabled={saving}
            >
              {saving ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
