'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  useToast,
  Skeleton,
} from '@/components/ui';
import {
  useI18n,
  useShippingOptions,
  useShippingProfiles,
  createEmptyProfile,
} from '@mobazha/core';
import type { ShippingOptionSetting, ShippingProfile } from '@mobazha/core';
import { ChevronLeft, Plus, Truck, FolderOpen, Sparkles, ArrowRight } from 'lucide-react';
import { VStack, HStack } from '@/components/layouts';
import {
  ShippingOptionCard,
  ShippingOptionForm,
  ShippingTemplateSelector,
  ShippingProfileCard,
} from '@/components/Shipping';

/**
 * 空状态组件 - 带模板选择器
 */
function EmptyState({
  onSelectTemplate,
  onCreateProfile,
}: {
  onSelectTemplate: (option: ShippingOptionSetting) => void;
  onCreateProfile: () => void;
}) {
  const { t } = useI18n();

  return (
    <Card className="p-6">
      <VStack gap="lg">
        <VStack gap="xs" align="center" className="text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Truck className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">
            {t('shippingConfig.noOptions') || 'No shipping options'}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('shippingConfig.noOptionsDesc') ||
              'Add shipping options to enable physical product delivery'}
          </p>
        </VStack>

        {/* 创建配送档案按钮 */}
        <Button onClick={onCreateProfile} className="w-full">
          <FolderOpen className="w-4 h-4 mr-2" />
          {t('shipping.createProfile') || 'Create Shipping Profile'}
        </Button>

        {/* 模板选择器 */}
        <div className="w-full">
          <p className="text-xs text-muted-foreground text-center mb-3">
            {t('shipping.orUseTemplate') || 'Or start with a template:'}
          </p>
          <ShippingTemplateSelector currency="USD" onSelect={onSelectTemplate} />
        </div>
      </VStack>
    </Card>
  );
}

/**
 * 迁移提示组件
 */
function MigrationBanner({ onMigrate, isLoading }: { onMigrate: () => void; isLoading: boolean }) {
  const { t } = useI18n();

  return (
    <Card className="p-4 mb-6 border-primary/30 bg-primary/5">
      <HStack gap="md" align="start">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <VStack gap="xs" className="flex-1">
          <p className="font-medium text-foreground">
            {t('shipping.upgradeToProfiles') || 'Upgrade to Shipping Profiles'}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('shipping.upgradeDesc') ||
              'Organize your shipping options into profiles for better product management. Your existing options will be migrated to a default profile.'}
          </p>
          <Button size="sm" onClick={onMigrate} disabled={isLoading} className="mt-2 w-fit">
            {isLoading ? (
              t('common.migrating') || 'Migrating...'
            ) : (
              <>
                {t('shipping.migrateNow') || 'Migrate Now'}
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </VStack>
      </HStack>
    </Card>
  );
}

/**
 * 加载骨架屏
 */
function LoadingSkeleton() {
  return (
    <VStack gap="md">
      {[1, 2].map(i => (
        <Card key={i} className="p-4">
          <HStack justify="between" align="start">
            <VStack gap="xs" className="flex-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
            </VStack>
            <HStack gap="xs">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </HStack>
          </HStack>
        </Card>
      ))}
    </VStack>
  );
}

/**
 * 创建配送档案弹框（编辑通过内联方式进行）
 */
function ProfileEditor({
  open,
  onOpenChange,
  onSave,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (profile: ShippingProfile) => Promise<boolean>;
  isLoading: boolean;
}) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 重置表单
  React.useEffect(() => {
    if (open) {
      setName('');
    }
  }, [open]);

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const newProfile = { ...createEmptyProfile(false), name: name.trim() };
      const success = await onSave(newProfile);
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('shipping.createProfile') || 'Create Profile'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">{t('shipping.profileName') || 'Profile Name'} *</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('shipping.profileNamePlaceholder') || 'e.g. Default Shipping'}
              onKeyDown={e => {
                if (e.key === 'Enter' && name.trim()) {
                  handleSave();
                }
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? t('common.saving') || 'Saving...' : t('common.create') || 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 配送选项设置页面
 */
export default function ShippingOptionsPage() {
  const { t } = useI18n();
  const { toast } = useToast();

  // 传统运费选项 hook
  const {
    options: legacyOptions,
    isLoading: legacyLoading,
    isSaving: legacySaving,
    addOption,
    updateOption,
    deleteOption,
    refetch: refetchLegacy,
  } = useShippingOptions();

  // 配送档案 hook
  const {
    profiles,
    isLoading: profilesLoading,
    isSaving: profilesSaving,
    isUsingProfiles,
    addProfile,
    updateProfile,
    deleteProfile,
    setDefaultProfile,
    migrateToProfiles,
    refetch: refetchProfiles,
  } = useShippingProfiles();

  const isLoading = legacyLoading || profilesLoading;
  const isSaving = legacySaving || profilesSaving;

  // 配送档案创建状态（编辑通过内联进行）
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  // 传统运费选项表单状态
  const [showForm, setShowForm] = useState(false);
  const [editingOption, setEditingOption] = useState<ShippingOptionSetting | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // 删除确认状态
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'profile' | 'option';
    item: ShippingProfile | ShippingOptionSetting;
  } | null>(null);

  // 展开/折叠状态 - 记录哪些档案被展开
  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(new Set());

  // 切换展开/折叠
  const toggleProfileExpand = useCallback((profileId: string) => {
    setExpandedProfiles(prev => {
      const next = new Set(prev);
      if (next.has(profileId)) {
        next.delete(profileId);
      } else {
        next.add(profileId);
      }
      return next;
    });
  }, []);

  // 创建新档案
  const handleCreateProfile = useCallback(() => {
    setShowProfileEditor(true);
  }, []);

  // 保存新档案（仅用于创建，编辑通过内联进行）
  const handleSaveProfile = useCallback(
    async (profile: ShippingProfile): Promise<boolean> => {
      return await addProfile(profile);
    },
    [addProfile]
  );

  // 删除档案确认
  const handleDeleteProfileClick = useCallback((profile: ShippingProfile) => {
    setItemToDelete({ type: 'profile', item: profile });
    setShowDeleteConfirm(true);
  }, []);

  // 设为默认档案
  const handleSetDefaultProfile = useCallback(
    async (profileId: string) => {
      const success = await setDefaultProfile(profileId);
      if (success) {
        toast({
          title: t('common.success') || 'Success',
          description: t('shipping.defaultProfileSet') || 'Default profile updated',
        });
      }
    },
    [setDefaultProfile, toast, t]
  );

  // 迁移到档案模式
  const handleMigrate = useCallback(async () => {
    const success = await migrateToProfiles(t('shipping.defaultProfileName') || 'Default Shipping');
    if (success) {
      toast({
        title: t('common.success') || 'Success',
        description: t('shipping.migrateSuccess') || 'Migration completed successfully',
      });
    } else {
      toast({
        title: t('common.error') || 'Error',
        description: t('shipping.migrateFailed') || 'Migration failed',
        variant: 'destructive',
      });
    }
  }, [migrateToProfiles, toast, t]);

  // 处理模板选择（创建带模板的档案）
  const handleSelectTemplate = useCallback(
    async (option: ShippingOptionSetting) => {
      // 如果还没有档案，先创建一个默认档案
      if (!isUsingProfiles) {
        const newProfile = createEmptyProfile(true);
        newProfile.name = t('shipping.defaultProfileName') || 'Default Shipping';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        newProfile.options = [option as any];
        await addProfile(newProfile);
      } else {
        // 添加到默认档案
        setEditingOption(option);
        setShowForm(true);
      }
    },
    [isUsingProfiles, addProfile, t]
  );

  // 添加运费选项到档案
  const handleAddOption = useCallback((profileId: string) => {
    setSelectedProfileId(profileId);
    setEditingOption(null);
    setShowForm(true);
  }, []);

  // 保存运费选项
  const handleSaveOption = useCallback(
    async (option: ShippingOptionSetting): Promise<boolean> => {
      if (isUsingProfiles && selectedProfileId) {
        // 更新档案中的运费选项
        const profile = profiles.find(p => p.profileId === selectedProfileId);
        if (profile) {
          const updatedOptions = editingOption
            ? profile.options.map(o => (o.name === editingOption.name ? option : o))
            : [...profile.options, option];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return await updateProfile(selectedProfileId, { options: updatedOptions as any });
        }
        return false;
      } else {
        // 传统模式
        if (editingOption?.id) {
          return await updateOption(editingOption.id, option);
        } else {
          return await addOption(option);
        }
      }
    },
    [
      isUsingProfiles,
      selectedProfileId,
      profiles,
      editingOption,
      updateOption,
      addOption,
      updateProfile,
    ]
  );

  // 确认删除
  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete) return;

    let success = false;
    if (itemToDelete.type === 'profile') {
      success = await deleteProfile((itemToDelete.item as ShippingProfile).profileId);
    } else {
      // 在配送档案模式下，需要从 profile 中删除选项
      if (isUsingProfiles && selectedProfileId) {
        const profile = profiles.find(p => p.profileId === selectedProfileId);
        if (profile) {
          const optionToDelete = itemToDelete.item as ShippingOptionSetting;
          const updatedOptions = profile.options.filter(
            opt =>
              opt.name !== optionToDelete.name ||
              opt.regions?.join(',') !== optionToDelete.regions?.join(',')
          );
          success = await updateProfile(selectedProfileId, {
            ...profile,
            options: updatedOptions,
          });
        }
      } else {
        // 传统模式
        success = await deleteOption((itemToDelete.item as ShippingOptionSetting).id!);
      }
    }

    if (success) {
      toast({
        title: t('common.success') || 'Success',
        description:
          itemToDelete.type === 'profile'
            ? t('shipping.profileDeleted') || 'Profile deleted'
            : t('shippingConfig.deleteSuccess') || 'Shipping option deleted',
      });
    } else {
      toast({
        title: t('common.error') || 'Error',
        description: t('common.deleteFailed') || 'Failed to delete',
        variant: 'destructive',
      });
    }

    setShowDeleteConfirm(false);
    setItemToDelete(null);
    setSelectedProfileId(null);
  }, [
    itemToDelete,
    deleteProfile,
    deleteOption,
    isUsingProfiles,
    selectedProfileId,
    profiles,
    updateProfile,
    toast,
    t,
  ]);

  // 删除传统运费选项
  const handleDeleteLegacyOption = useCallback((option: ShippingOptionSetting) => {
    setItemToDelete({ type: 'option', item: option });
    setShowDeleteConfirm(true);
  }, []);

  return (
    <div>
      {/* 移动端返回按钮 */}
      <div className="lg:hidden mb-4">
        <Link
          href="/settings/store"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{t('common.back') || 'Back'}</span>
        </Link>
      </div>

      {/* 标题和添加按钮 */}
      <HStack justify="between" align="center" className="mb-6">
        <h1 className="text-lg font-semibold">
          {isUsingProfiles
            ? t('shipping.shippingProfiles') || 'Shipping Profiles'
            : t('settingsExtended.shippingOptions') || 'Shipping Options'}
        </h1>
        {isUsingProfiles && profiles.length > 0 && (
          <Button onClick={handleCreateProfile} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            {t('shipping.addProfile') || 'Add Profile'}
          </Button>
        )}
      </HStack>

      {/* 迁移提示 - 如果有传统运费选项但还没迁移到档案模式 */}
      {!isUsingProfiles && legacyOptions.length > 0 && (
        <MigrationBanner onMigrate={handleMigrate} isLoading={isSaving} />
      )}

      {/* 内容区域 */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : isUsingProfiles ? (
        // 配送档案模式
        profiles.length === 0 ? (
          <EmptyState
            onSelectTemplate={handleSelectTemplate}
            onCreateProfile={handleCreateProfile}
          />
        ) : (
          <VStack gap="lg">
            {profiles.map(profile => {
              const isExpanded = expandedProfiles.has(profile.profileId);
              return (
                <div key={profile.profileId} className="space-y-0">
                  <ShippingProfileCard
                    profile={profile}
                    onRename={async newName => {
                      return await updateProfile(profile.profileId, { ...profile, name: newName });
                    }}
                    onDelete={() => handleDeleteProfileClick(profile)}
                    onSetDefault={() => handleSetDefaultProfile(profile.profileId)}
                    disabled={isSaving}
                    expanded={isExpanded}
                    onToggleExpand={() => toggleProfileExpand(profile.profileId)}
                  />
                  {/* 档案内的运费选项 - 可展开/折叠 */}
                  {isExpanded && profile.options.length > 0 && (
                    <div className="ml-4 mt-3 space-y-3 border-l-2 border-primary/30 pl-4 animate-in slide-in-from-top-2 duration-200">
                      {profile.options.map((option, idx) => (
                        <ShippingOptionCard
                          key={idx}
                          option={option as ShippingOptionSetting}
                          onEdit={() => {
                            setSelectedProfileId(profile.profileId);
                            setEditingOption(option as ShippingOptionSetting);
                            setShowForm(true);
                          }}
                          onDelete={() => {
                            setItemToDelete({
                              type: 'option',
                              item: option as ShippingOptionSetting,
                            });
                            setSelectedProfileId(profile.profileId);
                            setShowDeleteConfirm(true);
                          }}
                          disabled={isSaving}
                        />
                      ))}
                      {/* 添加运费选项按钮 - 放在展开区域内 */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-dashed"
                        onClick={() => handleAddOption(profile.profileId)}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        {t('shipping.addOptionToProfile') || 'Add Shipping Option'}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </VStack>
        )
      ) : // 传统模式
      legacyOptions.length === 0 ? (
        <EmptyState onSelectTemplate={handleSelectTemplate} onCreateProfile={handleCreateProfile} />
      ) : (
        <VStack gap="md">
          {legacyOptions.map(option => (
            <ShippingOptionCard
              key={option.id || option.name}
              option={option}
              onEdit={() => {
                setEditingOption(option);
                setShowForm(true);
              }}
              onDelete={() => handleDeleteLegacyOption(option)}
              disabled={isSaving}
            />
          ))}
        </VStack>
      )}

      {/* 创建配送档案弹框 */}
      <ProfileEditor
        open={showProfileEditor}
        onOpenChange={setShowProfileEditor}
        onSave={handleSaveProfile}
        isLoading={isSaving}
      />

      {/* 运费选项表单 */}
      <ShippingOptionForm
        open={showForm}
        onOpenChange={setShowForm}
        initialOption={editingOption || undefined}
        onSave={handleSaveOption}
        mode={editingOption ? 'edit' : 'create'}
      />

      {/* 删除确认弹窗 */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {itemToDelete?.type === 'profile'
                ? t('shipping.deleteProfileTitle') || 'Delete Profile'
                : t('shippingConfig.deleteConfirmTitle') || 'Delete Shipping Option'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('shippingConfig.deleteConfirmDesc') || 'Are you sure you want to delete'} &quot;
            {itemToDelete?.item?.name || ''}&quot;?
          </p>
          <HStack gap="sm" justify="end" className="mt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isSaving}>
              {isSaving ? t('common.deleting') || 'Deleting...' : t('common.delete') || 'Delete'}
            </Button>
          </HStack>
        </DialogContent>
      </Dialog>
    </div>
  );
}
