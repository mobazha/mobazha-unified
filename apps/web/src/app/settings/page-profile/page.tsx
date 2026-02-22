'use client';

import React, { useState, useRef, useMemo } from 'react';
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
import { useI18n, useUserStore, getImageUrl } from '@mobazha/core';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Plus, Trash2 } from 'lucide-react';
import { SettingsPageHeader, SettingsSection, SaveBar } from '@/components/SettingsLayout';

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

const LINK_TYPES = [
  { value: 'website', label: 'Website' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
] as const;

export default function PageSettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { profile, updateProfile } = useUserStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(profile?.name || '');
  const [shortDescription, setShortDescription] = useState(profile?.shortDescription || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [about, setAbout] = useState(profile?.about || '');
  const [avatarUrl, setAvatarUrl] = useState(
    profile?.avatarHashes?.medium ? getImageUrl(profile.avatarHashes.medium) : ''
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [links, setLinks] = useState<Array<{ type: string; url: string }>>([]);

  const isDirty = useMemo(() => {
    const orig = profile;
    return (
      name !== (orig?.name || '') ||
      shortDescription !== (orig?.shortDescription || '') ||
      location !== (orig?.location || '') ||
      about !== (orig?.about || '')
    );
  }, [name, shortDescription, location, about, profile]);

  const handleDiscard = () => {
    setName(profile?.name || '');
    setShortDescription(profile?.shortDescription || '');
    setLocation(profile?.location || '');
    setAbout(profile?.about || '');
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const previewUrl = URL.createObjectURL(file);
      setAvatarUrl(previewUrl);
      toast({
        title: t('common.success'),
        description: t('settingsModal.avatarUploaded'),
      });
    } catch {
      toast({
        title: t('common.error'),
        description: t('settingsModal.uploadFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
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
      if (updateProfile) {
        updateProfile({
          name: name.trim(),
          shortDescription: shortDescription.trim(),
          location: location.trim(),
          about: about.trim(),
        });
      }

      toast({
        title: t('common.success'),
        description: t('settingsModal.profileSaved'),
      });
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
    <div>
      <SettingsPageHeader title={t('settings.sidebar.page')} />

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
                description={t('settingsModal.locationDesc')}
              >
                <Input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder={t('settingsModal.locationPlaceholder')}
                />
              </FormField>

              <FormField label={t('settings.avatar')} description={t('settingsModal.avatarDesc')}>
                <div className="flex items-center gap-4">
                  <Avatar src={avatarUrl} name={name} size="xl" />
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? t('common.loading') : t('settingsModal.selectPhoto')}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                </div>
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
    </div>
  );
}
