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
  DialogDescription,
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
import type {
  ShippingOptionConfig,
  ShippingProfile,
  ShippingZone,
  ShippingLocation,
} from '@mobazha/core';
import { ChevronLeft, Plus, Truck, FolderOpen, Sparkles, ArrowRight, MapPin } from 'lucide-react';
import { VStack, HStack } from '@/components/layouts';
import {
  ShippingOptionCard,
  ShippingOptionForm,
  ShippingTemplateSelector,
  ShippingProfileCard,
  ShippingZoneCard,
  ShippingZoneForm,
  ShippingLocationCard,
  ShippingLocationForm,
} from '@/components/Shipping';

/**
 * 空状态组件 - 带模板选择器
 */
function EmptyState({
  onSelectTemplate,
  onCreateProfile,
}: {
  onSelectTemplate: (zone: ShippingZone) => void;
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
          <DialogDescription className="sr-only">
            {t('shipping.createProfileDescription') || 'Create a new shipping profile'}
          </DialogDescription>
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
    locations,
    isLoading: profilesLoading,
    isSaving: profilesSaving,
    isUsingProfiles,
    addProfile,
    updateProfile,
    deleteProfile,
    setDefaultProfile,
    migrateToProfiles,
    addLocation,
    updateLocation,
    deleteLocation,
    refetch: refetchProfiles,
  } = useShippingProfiles();

  const isLoading = legacyLoading || profilesLoading;
  const isSaving = legacySaving || profilesSaving;

  // 配送档案创建状态（编辑通过内联进行）
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  // 传统运费选项表单状态（保留用于迁移）
  const [showForm, setShowForm] = useState(false);
  const [editingOption, setEditingOption] = useState<ShippingOptionConfig | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // 新版 Zone 表单状态
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);

  // Location 表单状态
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ShippingLocation | null>(null);

  // 删除确认状态
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'profile' | 'option' | 'zone' | 'location';
    item: ShippingProfile | ShippingOptionConfig | ShippingZone | ShippingLocation;
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

  // 处理模板选择 - 直接接收 ShippingZone
  const handleSelectTemplate = useCallback(
    async (zone: ShippingZone) => {
      if (!isUsingProfiles) {
        const newProfile = createEmptyProfile(true);
        newProfile.name = t('shipping.defaultProfileName') || 'Default Shipping';
        newProfile.zones = [zone];
        await addProfile(newProfile);
      } else {
        setEditingZone(zone);
        setShowZoneForm(true);
      }
    },
    [isUsingProfiles, addProfile, t]
  );

  // 添加配送区域到档案
  const handleAddZone = useCallback((profileId: string) => {
    setSelectedProfileId(profileId);
    setEditingZone(null);
    setShowZoneForm(true);
  }, []);

  // 保存运费选项（旧版，用于传统选项迁移）
  const handleSaveOption = useCallback(
    async (option: ShippingOptionConfig): Promise<boolean> => {
      if (!isUsingProfiles) {
        if (editingOption?.id) {
          return await updateOption(editingOption.id, option);
        } else {
          return await addOption(option);
        }
      }
      return false;
    },
    [isUsingProfiles, editingOption, updateOption, addOption]
  );

  // 保存配送区域（新版）
  const handleSaveZone = useCallback(
    async (zone: ShippingZone): Promise<boolean> => {
      if (!selectedProfileId) return false;

      const profile = profiles.find(p => p.profileId === selectedProfileId);
      if (!profile) return false;

      const currentZones = profile.zones || [];
      const updatedZones = editingZone
        ? currentZones.map(z => (z.id === editingZone.id ? zone : z))
        : [...currentZones, zone];

      const success = await updateProfile(selectedProfileId, { zones: updatedZones });
      if (success) {
        setShowZoneForm(false);
        setEditingZone(null);
        toast({
          title: t('common.success') || 'Success',
          description: editingZone
            ? t('shipping.zoneUpdated') || 'Zone updated'
            : t('shipping.zoneAdded') || 'Zone added',
        });
      }
      return success;
    },
    [selectedProfileId, profiles, editingZone, updateProfile, toast, t]
  );

  // 删除区域确认（新版）
  const handleDeleteZoneClick = useCallback((zone: ShippingZone, profileId: string) => {
    setItemToDelete({ type: 'zone', item: zone });
    setSelectedProfileId(profileId);
    setShowDeleteConfirm(true);
  }, []);

  // 确认删除
  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete) return;

    let success = false;
    if (itemToDelete.type === 'profile') {
      success = await deleteProfile((itemToDelete.item as ShippingProfile).profileId);
    } else if (itemToDelete.type === 'zone') {
      // 删除配送区域
      if (selectedProfileId) {
        const profile = profiles.find(p => p.profileId === selectedProfileId);
        if (profile) {
          const zoneToDelete = itemToDelete.item as ShippingZone;
          const updatedZones = (profile.zones || []).filter(z => z.id !== zoneToDelete.id);
          success = await updateProfile(selectedProfileId, { zones: updatedZones });
        }
      }
    } else if (itemToDelete.type === 'location') {
      // 删除发货地点
      success = await deleteLocation((itemToDelete.item as ShippingLocation).id);
    } else {
      // 传统模式删除选项
      if (!isUsingProfiles) {
        success = await deleteOption((itemToDelete.item as ShippingOptionConfig).id!);
      }
    }

    if (success) {
      toast({
        title: t('common.success') || 'Success',
        description:
          itemToDelete.type === 'profile'
            ? t('shipping.profileDeleted') || 'Profile deleted'
            : itemToDelete.type === 'zone'
              ? t('shipping.zoneDeleted') || 'Zone deleted'
              : itemToDelete.type === 'location'
                ? t('shipping.locationDeleted') || 'Location deleted'
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
    deleteLocation,
    isUsingProfiles,
    selectedProfileId,
    profiles,
    updateProfile,
    toast,
    t,
  ]);

  // 删除传统运费选项
  const handleDeleteLegacyOption = useCallback((option: ShippingOptionConfig) => {
    setItemToDelete({ type: 'option', item: option });
    setShowDeleteConfirm(true);
  }, []);

  // ============== 发货地点操作 ==============

  // 添加发货地点
  const handleAddLocation = useCallback(() => {
    setEditingLocation(null);
    setShowLocationForm(true);
  }, []);

  // 编辑发货地点
  const handleEditLocation = useCallback((location: ShippingLocation) => {
    setEditingLocation(location);
    setShowLocationForm(true);
  }, []);

  // 保存发货地点
  const handleSaveLocation = useCallback(
    async (location: ShippingLocation): Promise<boolean> => {
      let success = false;
      if (editingLocation) {
        success = await updateLocation(editingLocation.id, location);
      } else {
        success = await addLocation(location);
      }

      if (success) {
        setShowLocationForm(false);
        setEditingLocation(null);
        toast({
          title: t('common.success') || 'Success',
          description: editingLocation
            ? t('shipping.locationUpdated') || 'Location updated'
            : t('shipping.locationCreated') || 'Location created',
        });
      }
      return success;
    },
    [editingLocation, updateLocation, addLocation, toast, t]
  );

  // 删除发货地点确认
  const handleDeleteLocationClick = useCallback((location: ShippingLocation) => {
    setItemToDelete({ type: 'location', item: location });
    setShowDeleteConfirm(true);
  }, []);

  // 设为默认发货地点
  const handleSetDefaultLocation = useCallback(
    async (locationId: string) => {
      const success = await updateLocation(locationId, { isDefault: true });
      if (success) {
        toast({
          title: t('common.success') || 'Success',
          description: t('shipping.defaultLocationSet') || 'Default location updated',
        });
      }
    },
    [updateLocation, toast, t]
  );

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
        {isUsingProfiles && (
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
                {/* 档案内的配送区域 - 可展开/折叠 */}
                {isExpanded && (
                  <div className="ml-4 mt-3 space-y-3 border-l-2 border-primary/30 pl-4 animate-in slide-in-from-top-2 duration-200">
                    {(profile.zones?.length || 0) > 0 ? (
                      (profile.zones || []).map(zone => (
                        <ShippingZoneCard
                          key={zone.id}
                          zone={zone}
                          onEdit={() => {
                            setSelectedProfileId(profile.profileId);
                            setEditingZone(zone);
                            setShowZoneForm(true);
                          }}
                          onDelete={() => handleDeleteZoneClick(zone, profile.profileId)}
                          disabled={isSaving}
                        />
                      ))
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground py-2">
                          {t('shipping.noZonesDesc') ||
                            'Add shipping zones to define delivery regions and rates'}
                        </p>
                        {/* 模板快捷入口 */}
                        <div className="pt-1">
                          <p className="text-xs text-muted-foreground mb-2">
                            {t('shipping.orUseTemplate') || 'Or start with a template:'}
                          </p>
                          <ShippingTemplateSelector
                            currency="USD"
                            onSelect={option => {
                              setSelectedProfileId(profile.profileId);
                              handleSelectTemplate(option);
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {/* 添加配送区域按钮 - 放在展开区域内 */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-dashed"
                      onClick={() => handleAddZone(profile.profileId)}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      {t('shipping.addZone') || 'Add Shipping Zone'}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </VStack>
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

      {/* 发货地点管理区域 - 仅在档案模式下显示 */}
      {isUsingProfiles && (
        <div className="mt-8 pt-8 border-t">
          <HStack justify="between" align="center" className="mb-4">
            <HStack gap="sm" align="center">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-base font-semibold">
                {t('shipping.shippingLocations') || 'Shipping Locations'}
              </h2>
            </HStack>
            <Button onClick={handleAddLocation} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              {t('shipping.addLocation') || 'Add Location'}
            </Button>
          </HStack>

          {locations.length === 0 ? (
            <Card className="p-6">
              <VStack gap="sm" align="center" className="text-center">
                <MapPin className="w-10 h-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t('shipping.noLocationsDesc') ||
                    'Add shipping locations to define where products ship from'}
                </p>
                <Button onClick={handleAddLocation} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  {t('shipping.addLocation') || 'Add Location'}
                </Button>
              </VStack>
            </Card>
          ) : (
            <VStack gap="md">
              {locations.map(location => (
                <ShippingLocationCard
                  key={location.id}
                  location={location}
                  onEdit={() => handleEditLocation(location)}
                  onDelete={() => handleDeleteLocationClick(location)}
                  onSetDefault={() => handleSetDefaultLocation(location.id)}
                  disabled={isSaving}
                />
              ))}
            </VStack>
          )}
        </div>
      )}

      {/* 创建配送档案弹框 */}
      <ProfileEditor
        open={showProfileEditor}
        onOpenChange={setShowProfileEditor}
        onSave={handleSaveProfile}
        isLoading={isSaving}
      />

      {/* 运费选项表单（旧版，用于传统选项） */}
      <ShippingOptionForm
        open={showForm}
        onOpenChange={setShowForm}
        initialOption={editingOption || undefined}
        onSave={handleSaveOption}
        mode={editingOption ? 'edit' : 'create'}
      />

      {/* 配送区域表单（新版） */}
      <Dialog open={showZoneForm} onOpenChange={setShowZoneForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingZone
                ? t('shipping.editZone') || 'Edit Shipping Zone'
                : t('shipping.addZone') || 'Add Shipping Zone'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('shipping.zoneFormDescription') || 'Configure shipping zone regions and rates'}
            </DialogDescription>
          </DialogHeader>
          <ShippingZoneForm
            zone={editingZone}
            currency="USD"
            onSave={handleSaveZone}
            onCancel={() => {
              setShowZoneForm(false);
              setEditingZone(null);
            }}
            isSaving={isSaving}
            hideHeader
          />
        </DialogContent>
      </Dialog>

      {/* 发货地点表单 */}
      <Dialog open={showLocationForm} onOpenChange={setShowLocationForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <ShippingLocationForm
            location={editingLocation}
            onSave={handleSaveLocation}
            onCancel={() => {
              setShowLocationForm(false);
              setEditingLocation(null);
            }}
            isSaving={isSaving}
            showDefaultOption={locations.length > 0}
          />
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {itemToDelete?.type === 'profile'
                ? t('shipping.deleteProfileTitle') || 'Delete Profile'
                : itemToDelete?.type === 'zone'
                  ? t('shipping.deleteZone') || 'Delete Shipping Zone'
                  : itemToDelete?.type === 'location'
                    ? t('shipping.deleteLocation') || 'Delete Location'
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
