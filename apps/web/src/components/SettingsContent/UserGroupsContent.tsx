'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { useUserGroups, useUserStore, useI18n, GROUP_COLORS, type UserGroup } from '@mobazha/core';
import { Loader2, Plus, Users, AlertCircle } from 'lucide-react';
import { useSettingsDrawerOptional } from '@/components/SettingsDrawer/SettingsDrawer';

interface UserGroupForm {
  name: string;
  description: string;
  color: string;
}

interface UserGroupsContentProps {
  /** 是否在 Modal 中使用（会隐藏一些链接跳转） */
  inModal?: boolean;
}

/**
 * 用户组管理内容组件
 * 可在独立页面和 Modal 中复用
 */
export const UserGroupsContent: React.FC<UserGroupsContentProps> = ({ inModal = false }) => {
  const { t } = useI18n();
  const router = useRouter();
  const { profile, isAuthenticated, isLoading: isLoadingProfile } = useUserStore();
  const ownerPeerID = profile?.peerID || '';

  // 可选的 SettingsDrawer context（可能不在 Provider 内）
  const settingsDrawer = useSettingsDrawerOptional();

  // 导航处理函数 - Modal 模式下关闭弹框后导航，否则直接导航
  const handleNavigate = useCallback(
    (path: string) => {
      if (inModal && settingsDrawer?.navigateToPage) {
        settingsDrawer.navigateToPage(path);
      } else {
        router.push(path);
      }
    },
    [inModal, settingsDrawer, router]
  );

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

  useEffect(() => {
    if (isAuthenticated && ownerPeerID) {
      loadGroups(ownerPeerID);
    }
  }, [isAuthenticated, ownerPeerID, loadGroups]);

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

  const getGroupColor = (id: number) => {
    return GROUP_COLORS[id % GROUP_COLORS.length];
  };

  // 无 peerID 时显示提示
  if (!isLoadingProfile && isAuthenticated && !ownerPeerID) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-warning" />
          </div>
          <h3 className="font-semibold text-lg mb-2">{t('settings.accessControl.noPeerID')}</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            {t('settings.accessControl.noPeerIDDesc')}
          </p>
          {!inModal && (
            <Link href="/settings/page-profile">
              <Button>{t('settings.accessControl.goToStoreSettings')}</Button>
            </Link>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 mt-0.5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {t('settings.accessControl.userGroupsDesc')}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreateModal(true)}
          disabled={!isAuthenticated || !ownerPeerID}
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('common.create')}
        </Button>
      </div>

      {error && <div className="bg-destructive/10 text-destructive p-4 rounded-lg">{error}</div>}

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && groups.length > 0 && (
        <div className="space-y-3">
          {groups.map(group => (
            <Card key={group.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                {/* 用户组信息 */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shrink-0"
                    style={{ backgroundColor: getGroupColor(group.id) }}
                  >
                    {group.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">{group.name}</h3>
                    {group.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {group.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {group.memberCount || 0} {t('common.members')}
                    </p>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-1 sm:gap-2 self-end sm:self-start">
                  {inModal ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs sm:text-sm px-2 sm:px-3"
                      onClick={() =>
                        handleNavigate(`/settings/access-control/user-groups/${group.id}/members`)
                      }
                    >
                      {t('common.members')}
                    </Button>
                  ) : (
                    <Link href={`/settings/access-control/user-groups/${group.id}/members`}>
                      <Button size="sm" variant="ghost" className="text-xs sm:text-sm px-2 sm:px-3">
                        {t('common.members')}
                      </Button>
                    </Link>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs sm:text-sm px-2 sm:px-3"
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
                    className="text-destructive hover:text-destructive text-xs sm:text-sm px-2 sm:px-3"
                    onClick={() => setDeleteGroupId(group.id)}
                  >
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && groups.length === 0 && (
        <Card className="p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">
              {t('settings.accessControl.noUserGroups')}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t('settings.accessControl.noUserGroupsDesc')}
            </p>
          </div>

          {/* 功能说明 */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-sm mb-3">
              {t('settings.accessControl.userGroupsHelp')}
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                {t('settings.accessControl.userGroupsHelp1')}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                {t('settings.accessControl.userGroupsHelp2')}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                {t('settings.accessControl.userGroupsHelp3')}
              </li>
            </ul>
          </div>

          <div className="text-center">
            <Button
              onClick={() => setShowCreateModal(true)}
              disabled={!isAuthenticated || !ownerPeerID}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('settings.accessControl.createFirstUserGroup')}
            </Button>
          </div>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Dialog
        open={showCreateModal || !!editingGroup}
        onOpenChange={open => {
          if (!open) {
            setShowCreateModal(false);
            setEditingGroup(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingGroup
                ? t('settings.accessControl.editUserGroup')
                : t('settings.accessControl.createUserGroup')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('common.name')} <span className="text-destructive">*</span>
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
              <label className="block text-sm font-medium mb-2">{t('common.description')}</label>
              <textarea
                value={editingGroup?.description || newGroup.description}
                onChange={e =>
                  editingGroup
                    ? setEditingGroup({ ...editingGroup, description: e.target.value })
                    : setNewGroup(prev => ({ ...prev, description: e.target.value }))
                }
                rows={2}
                className="w-full px-4 py-2 rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={t('settings.accessControl.groupDescPlaceholder')}
              />
            </div>

            {!editingGroup && (
              <div>
                <label className="block text-sm font-medium mb-2">{t('common.color')}</label>
                <div className="flex gap-2">
                  {GROUP_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewGroup(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-lg transition-transform ${
                        newGroup.color === color
                          ? 'ring-2 ring-offset-2 ring-primary scale-110'
                          : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
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
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
            >
              {saving ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserGroupsContent;
