'use client';

import React, { useState, useCallback, useMemo } from 'react';
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
import { useI18n, useShippingProfiles, createEmptyProfile, getAllZones } from '@mobazha/core';
import type { ShippingProfile, ShippingZone, ShippingLocation } from '@mobazha/core';
import { Plus, Truck, FolderOpen, MapPin, AlertTriangle, RefreshCw } from 'lucide-react';
import { VStack, HStack } from '@/components/layouts';
import {
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

function StaleBanner({
  count,
  onRefresh,
  isRefreshing,
}: {
  count: number;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const { t } = useI18n();

  if (count <= 0) return null;

  return (
    <Card className="p-4 md:p-6 mb-6 border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/40">
      <HStack gap="md" align="start">
        <div className="w-10 h-10 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-800 dark:text-amber-200" />
        </div>
        <VStack gap="xs" className="flex-1">
          <p className="font-medium text-amber-800 dark:text-amber-200">
            {t('shipping.staleListingsTitle', { count })}
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {t('shipping.staleListingsDesc')}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="mt-2 w-fit"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? t('shipping.refreshing') : t('shipping.refreshSnapshots')}
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (profile: ShippingProfile) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (open) setName('');
  }, [open]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const newProfile = { ...createEmptyProfile(false), name: name.trim() };
      const success = await onSave(newProfile);
      if (success) onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('shipping.createProfile')}</DialogTitle>
          <DialogDescription className="sr-only">{t('shipping.createProfile')}</DialogDescription>
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
                if (e.key === 'Enter' && name.trim()) handleSave();
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

function DeleteProfileDialog({
  open,
  onOpenChange,
  profileToDelete,
  otherProfiles,
  onConfirm,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileToDelete: ShippingProfile | null;
  otherProfiles: ShippingProfile[];
  onConfirm: (migrateTo?: string) => void;
  isSaving: boolean;
}) {
  const { t } = useI18n();
  const [migrateToId, setMigrateToId] = useState<string>('');
  const hasListings = (profileToDelete?.listingCount ?? 0) > 0;

  React.useEffect(() => {
    if (open) setMigrateToId('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('shipping.deleteProfileTitle')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('shipping.deleteProfileDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('shipping.deleteProfileDesc')} &quot;{profileToDelete?.name || ''}&quot;
          </p>

          {hasListings && otherProfiles.length > 0 && (
            <div className="space-y-2 p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/40">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                {t('shipping.listingsCount', { count: profileToDelete?.listingCount ?? 0 })}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {t('shipping.deleteProfileHasListings')}
              </p>
              <div className="space-y-1.5 mt-2">
                <Label className="text-xs">{t('shipping.migrateListingsTo')}</Label>
                <select
                  aria-label={t('shipping.migrateListingsTo')}
                  className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
                  value={migrateToId}
                  onChange={e => setMigrateToId(e.target.value)}
                >
                  <option value="">{t('shipping.selectTargetProfile')}</option>
                  {otherProfiles.map(p => (
                    <option key={p.profileId} value={p.profileId}>
                      {p.name} {p.isDefault ? `(${t('common.default')})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(migrateToId || undefined)}
            disabled={isSaving || (hasListings && otherProfiles.length > 0 && !migrateToId)}
          >
            {isSaving ? t('common.deleting') : t('common.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ShippingSettingsContent() {
  const { t } = useI18n();
  const { toast } = useToast();

  const {
    profiles,
    locations,
    isLoading,
    isSaving,
    staleCount,
    addProfile,
    updateProfile,
    deleteProfile,
    setDefaultProfile,
    refreshStaleSnapshots,
    addLocation,
    updateLocation,
    deleteLocation,
  } = useShippingProfiles();

  const hasProfiles = profiles.length > 0;

  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ShippingLocation | null>(null);
  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(new Set());

  // Delete states
  const [showDeleteProfile, setShowDeleteProfile] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<ShippingProfile | null>(null);
  const [showDeleteZone, setShowDeleteZone] = useState(false);
  const [zoneToDelete, setZoneToDelete] = useState<{
    zone: ShippingZone;
    profileId: string;
  } | null>(null);
  const [showDeleteLocation, setShowDeleteLocation] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<ShippingLocation | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const otherProfilesForDelete = useMemo(() => {
    if (!profileToDelete) return [];
    return profiles.filter(p => p.profileId !== profileToDelete.profileId);
  }, [profiles, profileToDelete]);

  const toggleProfileExpand = useCallback((profileId: string) => {
    setExpandedProfiles(prev => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
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
    setProfileToDelete(profile);
    setShowDeleteProfile(true);
  }, []);

  const handleConfirmDeleteProfile = useCallback(
    async (migrateTo?: string) => {
      if (!profileToDelete) return;
      const success = await deleteProfile(profileToDelete.profileId, migrateTo);
      if (success) {
        toast({
          title: t('common.success'),
          description: t('shipping.profileDeleted'),
        });
        setShowDeleteProfile(false);
        setProfileToDelete(null);
      } else {
        toast({
          title: t('common.error'),
          description: t('common.deleteFailed'),
          variant: 'destructive',
        });
      }
    },
    [profileToDelete, deleteProfile, toast, t]
  );

  const handleSetDefaultProfile = useCallback(
    async (profileId: string) => {
      const success = await setDefaultProfile(profileId);
      if (success) {
        toast({ title: t('common.success'), description: t('shipping.defaultProfileSet') });
      } else {
        toast({
          title: t('common.error'),
          description: t('common.saveFailed'),
          variant: 'destructive',
        });
      }
    },
    [setDefaultProfile, toast, t]
  );

  const handleRefreshStale = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await refreshStaleSnapshots();
      toast({
        title: t('common.success'),
        description: t('shipping.refreshComplete', { refreshed: result.refreshed }),
      });
    } catch {
      toast({
        title: t('common.error'),
        description: t('shipping.refreshFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshStaleSnapshots, toast, t]);

  const handleSelectTemplate = useCallback(
    async (zone: ShippingZone, profileId?: string) => {
      if (!hasProfiles) {
        const newProfile = createEmptyProfile(true);
        newProfile.name = t('shipping.defaultProfileName');
        newProfile.locationGroups[0].zones = [zone];
        const success = await addProfile(newProfile);
        if (!success) {
          toast({
            title: t('common.error'),
            description: t('common.createFailed'),
            variant: 'destructive',
          });
        }
      } else {
        if (profileId) setSelectedProfileId(profileId);
        setEditingZone(zone);
        setShowZoneForm(true);
      }
    },
    [hasProfiles, addProfile, toast, t]
  );

  const handleAddZone = useCallback((profileId: string) => {
    setSelectedProfileId(profileId);
    setEditingZone(null);
    setShowZoneForm(true);
  }, []);

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
    setZoneToDelete({ zone, profileId });
    setShowDeleteZone(true);
  }, []);

  const handleConfirmDeleteZone = useCallback(async () => {
    if (!zoneToDelete) return;
    const profile = profiles.find(p => p.profileId === zoneToDelete.profileId);
    if (!profile) return;

    const updatedLocationGroups = profile.locationGroups.map(lg => ({
      ...lg,
      zones: lg.zones?.filter(z => z.id !== zoneToDelete.zone.id),
    }));
    const success = await updateProfile(zoneToDelete.profileId, {
      locationGroups: updatedLocationGroups,
    });
    if (success) {
      toast({ title: t('common.success'), description: t('shipping.zoneDeleted') });
      setShowDeleteZone(false);
      setZoneToDelete(null);
    } else {
      toast({
        title: t('common.error'),
        description: t('common.deleteFailed'),
        variant: 'destructive',
      });
    }
  }, [zoneToDelete, profiles, updateProfile, toast, t]);

  // Location handlers
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
    setLocationToDelete(location);
    setShowDeleteLocation(true);
  }, []);

  const handleConfirmDeleteLocation = useCallback(async () => {
    if (!locationToDelete) return;
    const success = await deleteLocation(locationToDelete.id);
    if (success) {
      toast({ title: t('common.success'), description: t('shipping.locationDeleted') });
      setShowDeleteLocation(false);
      setLocationToDelete(null);
    } else {
      toast({
        title: t('common.error'),
        description: t('common.deleteFailed'),
        variant: 'destructive',
      });
    }
  }, [locationToDelete, deleteLocation, toast, t]);

  const handleSetDefaultLocation = useCallback(
    async (locationId: string) => {
      const success = await updateLocation(locationId, { isDefault: true });
      if (success) {
        toast({ title: t('common.success'), description: t('shipping.defaultLocationSet') });
      } else {
        toast({
          title: t('common.error'),
          description: t('common.saveFailed'),
          variant: 'destructive',
        });
      }
    },
    [updateLocation, toast, t]
  );

  return (
    <>
      <div className="space-y-6 md:space-y-8">
        {/* Stale listings banner */}
        <StaleBanner
          count={staleCount}
          onRefresh={handleRefreshStale}
          isRefreshing={isRefreshing}
        />

        {/* Profiles section */}
        <div>
          {hasProfiles && !isLoading && (
            <div className="flex justify-end mb-4">
              <Button onClick={handleCreateProfile} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                {t('shipping.addProfile')}
              </Button>
            </div>
          )}

          {isLoading ? (
            <LoadingSkeleton />
          ) : hasProfiles ? (
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
                                  handleSelectTemplate(option, profile.profileId);
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
          ) : (
            <EmptyState
              onSelectTemplate={handleSelectTemplate}
              onCreateProfile={handleCreateProfile}
            />
          )}
        </div>

        {/* Locations section */}
        {hasProfiles && (
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

      {/* Profile creator */}
      <ProfileEditor
        open={showProfileEditor}
        onOpenChange={setShowProfileEditor}
        onSave={handleSaveProfile}
      />

      {/* Zone form dialog */}
      <Dialog open={showZoneForm} onOpenChange={setShowZoneForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingZone ? t('shipping.editZone') : t('shipping.addZone')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {editingZone ? t('shipping.editZone') : t('shipping.addZone')}
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

      {/* Location form dialog */}
      <Dialog open={showLocationForm} onOpenChange={setShowLocationForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? t('shipping.editLocation') : t('shipping.addLocation')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {editingLocation ? t('shipping.editLocation') : t('shipping.addLocation')}
            </DialogDescription>
          </DialogHeader>
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

      {/* Delete profile dialog (with migration) */}
      <DeleteProfileDialog
        open={showDeleteProfile}
        onOpenChange={setShowDeleteProfile}
        profileToDelete={profileToDelete}
        otherProfiles={otherProfilesForDelete}
        onConfirm={handleConfirmDeleteProfile}
        isSaving={isSaving}
      />

      {/* Delete zone confirm */}
      <Dialog open={showDeleteZone} onOpenChange={setShowDeleteZone}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('shipping.deleteZone')}</DialogTitle>
            <DialogDescription className="sr-only">{t('shipping.deleteZone')}</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('shippingConfig.deleteConfirmDesc')} &quot;{zoneToDelete?.zone?.name || ''}&quot;?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteZone(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteZone} disabled={isSaving}>
              {isSaving ? t('common.deleting') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete location confirm */}
      <Dialog open={showDeleteLocation} onOpenChange={setShowDeleteLocation}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('shipping.deleteLocation')}</DialogTitle>
            <DialogDescription className="sr-only">
              {t('shipping.deleteLocation')}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('shippingConfig.deleteConfirmDesc')} &quot;{locationToDelete?.name || ''}&quot;?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteLocation(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteLocation} disabled={isSaving}>
              {isSaving ? t('common.deleting') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
