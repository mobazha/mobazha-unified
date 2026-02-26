'use client';

import React, { useState, useCallback } from 'react';
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
  getAllZones,
} from '@mobazha/core';
import type {
  ShippingOptionConfig,
  ShippingProfile,
  ShippingZone,
  ShippingLocation,
} from '@mobazha/core';
import { Plus, Truck, FolderOpen, Sparkles, ArrowRight, MapPin } from 'lucide-react';
import { VStack, HStack } from '@/components/layouts';
import { SettingsPageHeader } from '@/components/SettingsLayout';
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

function EmptyState({
  onSelectTemplate,
  onCreateProfile,
}: {
  onSelectTemplate: (zone: ShippingZone) => void;
  onCreateProfile: () => void;
}) {
  const { t } = useI18n();

  return (
    <Card className="p-4 md:p-6">
      <VStack gap="lg">
        <VStack gap="xs" align="center" className="text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Truck className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">{t('shippingConfig.noOptions')}</p>
          <p className="text-sm text-muted-foreground">{t('shippingConfig.noOptionsDesc')}</p>
        </VStack>

        <Button onClick={onCreateProfile} className="w-full">
          <FolderOpen className="w-4 h-4 mr-2" />
          {t('shipping.createProfile')}
        </Button>

        <div className="w-full">
          <p className="text-xs text-muted-foreground text-center mb-3">
            {t('shipping.orUseTemplate')}
          </p>
          <ShippingTemplateSelector currency="USD" onSelect={onSelectTemplate} />
        </div>
      </VStack>
    </Card>
  );
}

function MigrationBanner({ onMigrate, isLoading }: { onMigrate: () => void; isLoading: boolean }) {
  const { t } = useI18n();

  return (
    <Card className="p-4 md:p-6 mb-6 border-primary/30 bg-primary/5">
      <HStack gap="md" align="start">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <VStack gap="xs" className="flex-1">
          <p className="font-medium text-foreground">{t('shipping.upgradeToProfiles')}</p>
          <p className="text-sm text-muted-foreground">{t('shipping.upgradeDesc')}</p>
          <Button size="sm" onClick={onMigrate} disabled={isLoading} className="mt-2 w-fit">
            {isLoading ? (
              t('common.migrating')
            ) : (
              <>
                {t('shipping.migrateNow')}
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </VStack>
      </HStack>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <VStack gap="md">
      {[1, 2].map(i => (
        <div key={i} className="p-4 md:p-6 rounded-lg border border-border">
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
        </div>
      ))}
    </VStack>
  );
}

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
          <DialogTitle>{t('shipping.createProfile')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('shipping.createProfileDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">{t('shipping.profileName')} *</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('shipping.profileNamePlaceholder')}
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
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? t('common.saving') : t('common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminShippingSettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();

  const {
    options: legacyOptions,
    isLoading: legacyLoading,
    isSaving: legacySaving,
    addOption,
    updateOption,
    deleteOption,
  } = useShippingOptions();

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
  } = useShippingProfiles();

  const isLoading = legacyLoading || profilesLoading;
  const isSaving = legacySaving || profilesSaving;

  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingOption, setEditingOption] = useState<ShippingOptionConfig | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ShippingLocation | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'profile' | 'option' | 'zone' | 'location';
    item: ShippingProfile | ShippingOptionConfig | ShippingZone | ShippingLocation;
  } | null>(null);
  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(new Set());

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

  const handleCreateProfile = useCallback(() => {
    setShowProfileEditor(true);
  }, []);

  const handleSaveProfile = useCallback(
    async (profile: ShippingProfile): Promise<boolean> => {
      return await addProfile(profile);
    },
    [addProfile]
  );

  const handleDeleteProfileClick = useCallback((profile: ShippingProfile) => {
    setItemToDelete({ type: 'profile', item: profile });
    setShowDeleteConfirm(true);
  }, []);

  const handleSetDefaultProfile = useCallback(
    async (profileId: string) => {
      const success = await setDefaultProfile(profileId);
      if (success) {
        toast({
          title: t('common.success'),
          description: t('shipping.defaultProfileSet'),
        });
      }
    },
    [setDefaultProfile, toast, t]
  );

  const handleMigrate = useCallback(async () => {
    const success = await migrateToProfiles(t('shipping.defaultProfileName'));
    if (success) {
      toast({
        title: t('common.success'),
        description: t('shipping.migrateSuccess'),
      });
    } else {
      toast({
        title: t('common.error'),
        description: t('shipping.migrateFailed'),
        variant: 'destructive',
      });
    }
  }, [migrateToProfiles, toast, t]);

  const handleSelectTemplate = useCallback(
    async (zone: ShippingZone) => {
      if (!isUsingProfiles) {
        const newProfile = createEmptyProfile(true);
        newProfile.name = t('shipping.defaultProfileName');
        newProfile.locationGroups[0].zones = [zone];
        await addProfile(newProfile);
      } else {
        setEditingZone(zone);
        setShowZoneForm(true);
      }
    },
    [isUsingProfiles, addProfile, t]
  );

  const handleAddZone = useCallback((profileId: string) => {
    setSelectedProfileId(profileId);
    setEditingZone(null);
    setShowZoneForm(true);
  }, []);

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

  const handleSaveZone = useCallback(
    async (zone: ShippingZone): Promise<boolean> => {
      if (!selectedProfileId) return false;

      const profile = profiles.find(p => p.profileId === selectedProfileId);
      if (!profile) return false;

      if (editingZone) {
        const updatedLocationGroups = profile.locationGroups.map(lg => ({
          ...lg,
          zones: lg.zones?.map(z => (z.id === editingZone.id ? zone : z)),
        }));
        const success = await updateProfile(selectedProfileId, {
          locationGroups: updatedLocationGroups,
        });
        if (success) {
          setShowZoneForm(false);
          setEditingZone(null);
          toast({ title: t('common.success'), description: t('shipping.zoneUpdated') });
        }
        return success;
      } else {
        const updatedLocationGroups = profile.locationGroups.map((lg, idx) =>
          idx === 0 ? { ...lg, zones: [...(lg.zones || []), zone] } : lg
        );
        const success = await updateProfile(selectedProfileId, {
          locationGroups: updatedLocationGroups,
        });
        if (success) {
          setShowZoneForm(false);
          setEditingZone(null);
          toast({ title: t('common.success'), description: t('shipping.zoneAdded') });
        }
        return success;
      }
    },
    [selectedProfileId, profiles, editingZone, updateProfile, toast, t]
  );

  const handleDeleteZoneClick = useCallback((zone: ShippingZone, profileId: string) => {
    setItemToDelete({ type: 'zone', item: zone });
    setSelectedProfileId(profileId);
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete) return;

    let success = false;
    if (itemToDelete.type === 'profile') {
      success = await deleteProfile((itemToDelete.item as ShippingProfile).profileId);
    } else if (itemToDelete.type === 'zone') {
      if (selectedProfileId) {
        const profile = profiles.find(p => p.profileId === selectedProfileId);
        if (profile) {
          const zoneToDelete = itemToDelete.item as ShippingZone;
          const updatedLocationGroups = profile.locationGroups.map(lg => ({
            ...lg,
            zones: lg.zones?.filter(z => z.id !== zoneToDelete.id),
          }));
          success = await updateProfile(selectedProfileId, {
            locationGroups: updatedLocationGroups,
          });
        }
      }
    } else if (itemToDelete.type === 'location') {
      success = await deleteLocation((itemToDelete.item as ShippingLocation).id);
    } else {
      if (!isUsingProfiles) {
        success = await deleteOption((itemToDelete.item as ShippingOptionConfig).id!);
      }
    }

    if (success) {
      toast({
        title: t('common.success'),
        description:
          itemToDelete.type === 'profile'
            ? t('shipping.profileDeleted')
            : itemToDelete.type === 'zone'
              ? t('shipping.zoneDeleted')
              : itemToDelete.type === 'location'
                ? t('shipping.locationDeleted')
                : t('shippingConfig.deleteSuccess'),
      });
    } else {
      toast({
        title: t('common.error'),
        description: t('common.deleteFailed'),
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

  const handleDeleteLegacyOption = useCallback((option: ShippingOptionConfig) => {
    setItemToDelete({ type: 'option', item: option });
    setShowDeleteConfirm(true);
  }, []);

  const handleAddLocation = useCallback(() => {
    setEditingLocation(null);
    setShowLocationForm(true);
  }, []);

  const handleEditLocation = useCallback((location: ShippingLocation) => {
    setEditingLocation(location);
    setShowLocationForm(true);
  }, []);

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
          title: t('common.success'),
          description: editingLocation
            ? t('shipping.locationUpdated')
            : t('shipping.locationCreated'),
        });
      }
      return success;
    },
    [editingLocation, updateLocation, addLocation, toast, t]
  );

  const handleDeleteLocationClick = useCallback((location: ShippingLocation) => {
    setItemToDelete({ type: 'location', item: location });
    setShowDeleteConfirm(true);
  }, []);

  const handleSetDefaultLocation = useCallback(
    async (locationId: string) => {
      const success = await updateLocation(locationId, { isDefault: true });
      if (success) {
        toast({
          title: t('common.success'),
          description: t('shipping.defaultLocationSet'),
        });
      }
    },
    [updateLocation, toast, t]
  );

  return (
    <div data-testid="admin-settings-shipping">
      <SettingsPageHeader
        title={
          isUsingProfiles ? t('shipping.shippingProfiles') : t('settingsExtended.shippingOptions')
        }
        description={t('settingsExtended.shippingOptionsDesc')}
        backHref="/admin/settings"
        actions={
          isUsingProfiles ? (
            <Button onClick={handleCreateProfile} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              {t('shipping.addProfile')}
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-6 md:space-y-8">
        <div>
          {!isUsingProfiles && legacyOptions.length > 0 && (
            <MigrationBanner onMigrate={handleMigrate} isLoading={isSaving} />
          )}

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
                        return await updateProfile(profile.profileId, {
                          ...profile,
                          name: newName,
                        });
                      }}
                      onDelete={() => handleDeleteProfileClick(profile)}
                      onSetDefault={() => handleSetDefaultProfile(profile.profileId)}
                      disabled={isSaving}
                      expanded={isExpanded}
                      onToggleExpand={() => toggleProfileExpand(profile.profileId)}
                    />
                    {isExpanded && (
                      <div className="ml-4 mt-3 space-y-3 border-l-2 border-primary/30 pl-4 animate-in slide-in-from-top-2 duration-200">
                        {getAllZones(profile).length > 0 ? (
                          getAllZones(profile).map(zone => (
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
                              {t('shipping.noZonesDesc')}
                            </p>
                            <div className="pt-1">
                              <p className="text-xs text-muted-foreground mb-2">
                                {t('shipping.orUseTemplate')}
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
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-dashed"
                          onClick={() => handleAddZone(profile.profileId)}
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          {t('shipping.addZone')}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </VStack>
          ) : legacyOptions.length === 0 ? (
            <EmptyState
              onSelectTemplate={handleSelectTemplate}
              onCreateProfile={handleCreateProfile}
            />
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
        </div>

        {isUsingProfiles && (
          <div>
            <div className="mb-4">
              <h2 className="text-base font-semibold">{t('shipping.shippingLocations')}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t('shipping.noLocationsDesc')}</p>
            </div>
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={handleAddLocation} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  {t('shipping.addLocation')}
                </Button>
              </div>

              {locations.length === 0 ? (
                <Card className="p-4 md:p-6">
                  <VStack gap="sm" align="center" className="text-center">
                    <MapPin className="w-10 h-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t('shipping.noLocationsDesc')}</p>
                    <Button onClick={handleAddLocation} variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      {t('shipping.addLocation')}
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
          </div>
        )}
      </div>

      <ProfileEditor
        open={showProfileEditor}
        onOpenChange={setShowProfileEditor}
        onSave={handleSaveProfile}
        isLoading={isSaving}
      />

      <ShippingOptionForm
        open={showForm}
        onOpenChange={setShowForm}
        initialOption={editingOption || undefined}
        onSave={handleSaveOption}
        mode={editingOption ? 'edit' : 'create'}
      />

      <Dialog open={showZoneForm} onOpenChange={setShowZoneForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingZone ? t('shipping.editZone') : t('shipping.addZone')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('shipping.zoneFormDescription')}
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

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {itemToDelete?.type === 'profile'
                ? t('shipping.deleteProfileTitle')
                : itemToDelete?.type === 'zone'
                  ? t('shipping.deleteZone')
                  : itemToDelete?.type === 'location'
                    ? t('shipping.deleteLocation')
                    : t('shippingConfig.deleteConfirmTitle')}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('shippingConfig.deleteConfirmDesc')} &quot;
            {itemToDelete?.item?.name || ''}&quot;?
          </p>
          <HStack gap="sm" justify="end" className="mt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isSaving}>
              {isSaving ? t('common.deleting') : t('common.delete')}
            </Button>
          </HStack>
        </DialogContent>
      </Dialog>
    </div>
  );
}
