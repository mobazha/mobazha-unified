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
  useProductGroups,
  useUserStore,
  useI18n,
  getCasdoorUserId,
  GROUP_COLORS,
  type ProductGroup,
} from '@mobazha/core';
import { Loader2, Plus, Layers, AlertCircle } from 'lucide-react';

interface ProductGroupForm {
  name: string;
  description: string;
  color: string;
}

interface ProductGroupsContentProps {
  /** 是否在 Modal 中使用（会隐藏一些链接跳转） */
  inModal?: boolean;
}

/**
 * 产品组管理内容组件
 * 可在独立页面和 Modal 中复用
 */
export const ProductGroupsContent: React.FC<ProductGroupsContentProps> = ({ inModal = false }) => {
  const { t } = useI18n();
  const { profile, isAuthenticated, isLoading: isLoadingProfile } = useUserStore();
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
          <Layers className="w-5 h-5 mt-0.5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {t('settings.accessControl.productGroupsDesc')}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreateModal(true)}
          disabled={!isAuthenticated || !userID}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map(group => (
            <Card key={group.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: getGroupColor(group.id) }}
                  >
                    {group.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold">{group.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full text-primary bg-primary/10">
                      {group.itemCount || 0} {t('common.items')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
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
                    className="text-destructive"
                    onClick={() => setDeleteGroupId(group.id)}
                  >
                    {t('common.delete')}
                  </Button>
                </div>
              </div>

              {group.description && (
                <p className="text-sm text-muted-foreground mb-3">{group.description}</p>
              )}

              {!inModal && (
                <div className="pt-3 border-t border-border space-y-2">
                  <Link
                    href={`/settings/access-control/product-groups/${group.id}`}
                    className="block text-sm text-primary hover:underline"
                  >
                    {t('settings.accessControl.manageProducts')} →
                  </Link>
                  <Link
                    href={`/settings/access-control/product-groups/${group.id}/authorization`}
                    className="block text-sm text-blue-600 hover:underline"
                  >
                    {t('settings.accessControl.configureAccess')} →
                  </Link>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {!loading && groups.length === 0 && (
        <Card className="p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">
              {t('settings.accessControl.noProductGroups')}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t('settings.accessControl.noProductGroupsDesc')}
            </p>
          </div>

          {/* 功能说明 */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-sm mb-3">
              {t('settings.accessControl.productGroupsHelp')}
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                {t('settings.accessControl.productGroupsHelp1')}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                {t('settings.accessControl.productGroupsHelp2')}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                {t('settings.accessControl.productGroupsHelp3')}
              </li>
            </ul>
          </div>

          <div className="text-center">
            <Button
              onClick={() => setShowCreateModal(true)}
              disabled={!isAuthenticated || !userID}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('settings.accessControl.createFirstProductGroup')}
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
                ? t('settings.accessControl.editProductGroup')
                : t('settings.accessControl.createProductGroup')}
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
                placeholder={t('settings.accessControl.productGroupNamePlaceholder')}
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
                placeholder={t('settings.accessControl.productGroupDescPlaceholder')}
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
            <AlertDialogTitle>{t('settings.accessControl.deleteProductGroup')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.accessControl.deleteProductGroupConfirm')}
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

export default ProductGroupsContent;
