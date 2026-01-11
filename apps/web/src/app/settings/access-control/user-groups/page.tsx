'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
import {
  useUserGroups,
  useUserStore,
  useI18n,
  getTelegramUserId,
  GROUP_COLORS,
  type UserGroup,
} from '@mobazha/core';
import { Loader2, ChevronLeft, Plus, Users } from 'lucide-react';

interface UserGroupForm {
  name: string;
  description: string;
  color: string;
}

export default function UserGroupsPage() {
  const { t } = useI18n();
  const { profile, isAuthenticated } = useUserStore();
  const ownerPeerID = profile?.peerID || '';
  const telegramUserId = getTelegramUserId();
  // 使用 telegramUserId 或 ownerPeerID
  const userID = telegramUserId || ownerPeerID;

  const { groups, loading, error, loadGroups, createGroup, updateGroup, deleteGroup } =
    useUserGroups({ ownerPeerID: userID, autoLoad: false });

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
    if (isAuthenticated && userID) {
      loadGroups(userID);
    }
  }, [isAuthenticated, userID, loadGroups]);

  const handleCreateGroup = useCallback(async () => {
    if (!userID || !newGroup.name.trim()) return;

    setSaving(true);
    try {
      const result = await createGroup({
        ownerPeerID: userID,
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

  return (
    <div>
      {/* 移动端返回按钮 */}
      <div className="lg:hidden mb-4">
        <Link
          href="/settings/access-control"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">{t('settings.sidebar.userGroups')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('settings.accessControl.userGroupsDesc')}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreateModal(true)} disabled={!isAuthenticated}>
          <Plus className="w-4 h-4 mr-2" />
          {t('common.create')}
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6">{error}</div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && groups.length > 0 && (
        <div className="space-y-3">
          {groups.map(group => (
            <Card key={group.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: getGroupColor(group.id) }}
                  >
                    {group.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold">{group.name}</h3>
                    {group.description && (
                      <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {group.memberCount || 0} {t('common.members')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/settings/access-control/user-groups/${group.id}/members`}>
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
                    className="text-destructive hover:text-destructive"
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
            <Button onClick={() => setShowCreateModal(true)} disabled={!isAuthenticated}>
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
}
