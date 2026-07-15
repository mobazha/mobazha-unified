'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n, useUserStore, getImageUrl, imagesApi, getCountryName } from '@mobazha/core';
import type { ContactInfo, SocialAccount } from '@mobazha/core';
import { AvatarUpload } from '@/components/ui/avatar-upload';
import { HeaderUpload } from '@/components/ui/header-upload';
import { pickImageFile, type ImagePickRejection } from '@/lib/pick-image-file';
import { Plus, Trash2 } from 'lucide-react';
import { SettingsSection, SaveBar } from '@/components/SettingsLayout';

interface FormFieldProps {
  label: string;
  required?: boolean;
  description?: string;
  children: React.ReactNode;
}

const FormField = ({ label, required, description, children }: FormFieldProps) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium">
      {label}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </Label>
    {description && <p className="text-xs text-muted-foreground">{description}</p>}
    {children}
  </div>
);

type LinkType = 'website' | 'email' | 'twitter' | 'instagram' | 'facebook' | 'youtube';

const LINK_TYPES: { value: LinkType; label: string }[] = [
  { value: 'website', label: 'Website' },
  { value: 'email', label: 'Email' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'youtube', label: 'YouTube' },
];

function contactInfoToLinks(ci?: ContactInfo): Array<{ type: LinkType; url: string }> {
  const links: Array<{ type: LinkType; url: string }> = [];
  if (ci?.website) links.push({ type: 'website', url: ci.website });
  if (ci?.email) links.push({ type: 'email', url: ci.email });
  if (Array.isArray(ci?.social)) {
    for (const sa of ci.social) {
      const t = sa.type as LinkType;
      if (LINK_TYPES.some(lt => lt.value === t) && sa.username) {
        links.push({ type: t, url: sa.username });
      }
    }
  }
  return links;
}

function linksToContactInfo(links: Array<{ type: string; url: string }>): ContactInfo {
  const social: SocialAccount[] = [];
  let website: string | undefined;
  let email: string | undefined;
  for (const link of links) {
    const url = link.url.trim();
    if (!url) continue;
    if (link.type === 'website') {
      website = url;
    } else if (link.type === 'email') {
      email = url;
    } else {
      social.push({ type: link.type, username: url });
    }
  }
  return { website, email, social };
}

export function ProfileSettingsContent() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const { profile, updateProfile, fetchProfile } = useUserStore();

  const locationPlaceholder = useMemo(() => {
    const savedCountry =
      typeof window !== 'undefined' ? localStorage.getItem('mobazha-country') : null;
    if (savedCountry) {
      const countryName = getCountryName(savedCountry, locale) || savedCountry;
      return `${t('settingsModal.locationPlaceholderExample') || 'e.g.'} New York, ${countryName}`;
    }
    return t('settingsModal.locationPlaceholder');
  }, [t, locale]);

  const [name, setName] = useState(profile?.name || '');
  const [shortDescription, setShortDescription] = useState(profile?.shortDescription || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [about, setAbout] = useState(profile?.about || '');
  const [avatarUrl, setAvatarUrl] = useState(
    profile?.avatarHashes?.medium ? getImageUrl(profile.avatarHashes.medium) : ''
  );
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [headerUrl, setHeaderUrl] = useState(
    profile?.headerHashes?.large ? getImageUrl(profile.headerHashes.large) : ''
  );
  const [pendingHeaderFile, setPendingHeaderFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Blob previews must be revoked by hand; keep the live one so replacing the
  // pick, discarding, or unmounting releases it instead of leaking to page exit.
  const headerBlobUrl = useRef<string | null>(null);
  const setHeaderPreview = useCallback((url: string | undefined) => {
    if (headerBlobUrl.current) URL.revokeObjectURL(headerBlobUrl.current);
    headerBlobUrl.current = url?.startsWith('blob:') ? url : null;
    setHeaderUrl(url);
  }, []);
  useEffect(
    () => () => {
      if (headerBlobUrl.current) URL.revokeObjectURL(headerBlobUrl.current);
    },
    []
  );
  const [links, setLinks] = useState<Array<{ type: string; url: string }>>(() =>
    contactInfoToLinks(profile?.contactInfo)
  );

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setShortDescription(profile.shortDescription || '');
      setLocation(profile.location || '');
      setAbout(profile.about || '');
      setAvatarUrl(profile.avatarHashes?.medium ? getImageUrl(profile.avatarHashes.medium) : '');
      setHeaderPreview(profile.headerHashes?.large ? getImageUrl(profile.headerHashes.large) : '');
      setLinks(contactInfoToLinks(profile.contactInfo));
      // Drop picks made against the previous identity; keeping them would upload
      // that image to this profile while the preview shows this profile's own.
      setPendingAvatarFile(null);
      setPendingHeaderFile(null);
    }
  }, [profile?.peerID]); // eslint-disable-line react-hooks/exhaustive-deps

  const isDirty = useMemo(() => {
    const orig = profile;
    const origLinks = contactInfoToLinks(orig?.contactInfo);
    const linksChanged =
      links.length !== origLinks.length ||
      links.some((l, i) => l.type !== origLinks[i]?.type || l.url !== origLinks[i]?.url);
    return (
      name !== (orig?.name || '') ||
      shortDescription !== (orig?.shortDescription || '') ||
      location !== (orig?.location || '') ||
      about !== (orig?.about || '') ||
      linksChanged ||
      !!pendingAvatarFile ||
      !!pendingHeaderFile
    );
  }, [
    name,
    shortDescription,
    location,
    about,
    links,
    pendingAvatarFile,
    pendingHeaderFile,
    profile,
  ]);

  const handleDiscard = () => {
    setName(profile?.name || '');
    setShortDescription(profile?.shortDescription || '');
    setLocation(profile?.location || '');
    setAbout(profile?.about || '');
    setLinks(contactInfoToLinks(profile?.contactInfo));
    setPendingAvatarFile(null);
    setAvatarUrl(profile?.avatarHashes?.medium ? getImageUrl(profile.avatarHashes.medium) : '');
    setPendingHeaderFile(null);
    setHeaderPreview(profile?.headerHashes?.large ? getImageUrl(profile.headerHashes.large) : '');
  };

  // AvatarUpload hands over whatever the dialog returned — `accept` is only a hint —
  // and it is shared with screens that expect that, so this form validates its own.
  const handleAvatarFileSelect = (file: File) => {
    const result = pickImageFile([file]);
    if ('rejected' in result) {
      handleFileRejected(result.rejected);
      return;
    }
    setAvatarUrl(URL.createObjectURL(result.file));
    setPendingAvatarFile(result.file);
  };

  const handleHeaderFileSelect = (file: File) => {
    setHeaderPreview(URL.createObjectURL(file));
    setPendingHeaderFile(file);
  };

  const handleFileRejected = (reason: ImagePickRejection) => {
    toast({
      title: t('common.error'),
      description:
        reason === 'size' ? t('settingsModal.fileTooLarge') : t('settingsModal.invalidImageType'),
      variant: 'destructive',
    });
  };

  const handleAddLink = () => {
    setLinks([...links, { type: 'website', url: '' }]);
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleLinkChange = (index: number, field: 'type' | 'url', value: string) => {
    const newLinks = [...links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setLinks(newLinks);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: t('common.error'),
        description: t('settingsModal.nameRequired'),
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const contactInfo = linksToContactInfo(links);

      // Media uploads must finish before the profile PUT. /v1/media/* associates the
      // hashes server-side, but the node applies the PUT as a merge patch over the
      // profile it read at request start — running them together lets the PUT write
      // back a snapshot taken before the upload and drop the new hashes.
      const [avatarHashes, headerHashes] = await Promise.all([
        pendingAvatarFile ? imagesApi.uploadAvatar(pendingAvatarFile) : Promise.resolve(null),
        pendingHeaderFile ? imagesApi.uploadHeader(pendingHeaderFile) : Promise.resolve(null),
      ]);

      // imagesApi swallows node errors and returns null. Save the text regardless:
      // an image the node keeps rejecting must not hold the rest of the form hostage.
      const uploadFailed =
        (!!pendingAvatarFile && !avatarHashes) || (!!pendingHeaderFile && !headerHashes);

      const profileSuccess = await updateProfile({
        name: name.trim(),
        shortDescription: shortDescription.trim(),
        location: location.trim(),
        about: about.trim(),
        contactInfo,
        ...(avatarHashes ? { avatarHashes } : {}),
        ...(headerHashes ? { headerHashes } : {}),
      });

      if (!profileSuccess) {
        toast({
          title: t('common.error'),
          description: t('settingsModal.saveFailed'),
          variant: 'destructive',
        });
        // /v1/media/* associates the hashes server-side on its own, so an upload that
        // landed before this PUT failed is already live on the storefront. Re-read the
        // profile rather than leave the form asserting an old image the node discarded.
        if (avatarHashes || headerHashes) await fetchProfile();
        return;
      }

      // Clear only what actually landed. A rejected image stays pending, so the form
      // stays dirty and the SaveBar remains as the retry affordance instead of
      // vanishing behind a success toast for a picture that was never stored.
      if (avatarHashes) setPendingAvatarFile(null);
      if (headerHashes) setPendingHeaderFile(null);

      if (uploadFailed) {
        toast({
          title: t('common.error'),
          description: t('settingsModal.uploadFailed'),
          variant: 'destructive',
        });
        return;
      }

      toast({ title: t('common.success'), description: t('settingsModal.profileSaved') });
    } catch {
      toast({
        title: t('common.error'),
        description: t('settingsModal.saveFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="divide-y divide-border">
        <SettingsSection
          className="pt-0 pb-5 md:pb-8"
          title={t('profile.title')}
          description={t('settingsModal.aboutDesc')}
        >
          <Card className="p-4 md:p-6">
            <div className="space-y-6">
              <FormField label={t('profile.name')} required>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('settingsModal.namePlaceholder')}
                />
              </FormField>

              <FormField
                label={t('settingsModal.shortDescription')}
                description={t('settingsModal.shortDescLimit')}
              >
                <Textarea
                  value={shortDescription}
                  onChange={e => setShortDescription(e.target.value.slice(0, 160))}
                  placeholder={t('settingsModal.shortDescPlaceholder')}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {shortDescription.length}/160
                </p>
              </FormField>

              <FormField
                label={t('profile.location')}
                description={
                  t('settingsModal.locationDescDetailed') || t('settingsModal.locationDesc')
                }
              >
                <Input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder={locationPlaceholder}
                />
              </FormField>

              <FormField label={t('settings.avatar')} description={t('settingsModal.avatarDesc')}>
                <AvatarUpload
                  src={avatarUrl}
                  name={name}
                  onFileSelect={handleAvatarFileSelect}
                  size="xl"
                  disabled={isSaving}
                  label={t('settings.loadAvatar') || 'Change Avatar'}
                />
              </FormField>

              <FormField label={t('settings.cover')} description={t('settings.coverSizeHint')}>
                <HeaderUpload
                  src={headerUrl}
                  onFileSelect={handleHeaderFileSelect}
                  onFileRejected={handleFileRejected}
                  disabled={isSaving}
                  label={t('settings.loadHeader')}
                  placeholder={t('settings.dragOrClickCover')}
                />
              </FormField>

              <FormField label={t('profile.about')} description={t('settingsModal.aboutDesc')}>
                <Textarea
                  value={about}
                  onChange={e => setAbout(e.target.value)}
                  placeholder={t('settingsModal.aboutPlaceholder')}
                  rows={5}
                />
              </FormField>
            </div>
          </Card>
        </SettingsSection>

        <SettingsSection className="py-5 md:py-8" title={t('settingsModal.links')}>
          <Card className="p-4 md:p-6">
            <div className="space-y-3">
              {links.map((link, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select
                    value={link.type}
                    onValueChange={val => handleLinkChange(index, 'type', val)}
                  >
                    <SelectTrigger className="w-[140px] shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LINK_TYPES.map(lt => (
                        <SelectItem key={lt.value} value={lt.value}>
                          {lt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={link.url}
                    onChange={e => handleLinkChange(index, 'url', e.target.value)}
                    placeholder="https://"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveLink(index)}
                    className="text-destructive hover:text-destructive shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={handleAddLink}>
                <Plus className="w-4 h-4 mr-2" />
                {t('settingsModal.addLink')}
              </Button>
            </div>
          </Card>
        </SettingsSection>
      </div>

      <SaveBar
        isDirty={isDirty}
        isLoading={isSaving}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </>
  );
}
