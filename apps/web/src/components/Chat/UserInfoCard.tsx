'use client';

import React, { useState, useEffect } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { useI18n } from '@mobazha/core';
import { getProfile } from '@mobazha/core/services/api/profile';
import { ShieldBan, ShieldCheck, MapPin, Star, Package } from 'lucide-react';

export interface UserInfo {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  peerID?: string;
  isExternal?: boolean;
}

interface ProfileData {
  handle?: string;
  shortDescription?: string;
  about?: string;
  location?: string;
  vendor?: boolean;
  listingCount?: number;
  rating?: number;
  reviewCount?: number;
}

export interface UserInfoCardProps {
  user: UserInfo;
  isOpen: boolean;
  onClose: () => void;
  onViewStore?: (peerID: string) => void;
  onStartChat?: (userId: string) => void;
  isBlocked?: boolean;
  onBlock?: (userId: string) => void;
  onUnblock?: (userId: string) => void;
}

export const UserInfoCard: React.FC<UserInfoCardProps> = ({
  user,
  isOpen,
  onClose,
  onViewStore,
  onStartChat,
  isBlocked: isBlockedProp,
  onBlock,
  onUnblock,
}) => {
  const { t } = useI18n();
  const [blocked, setBlocked] = useState(isBlockedProp ?? false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (isBlockedProp !== undefined) setBlocked(isBlockedProp);
  }, [isBlockedProp]);

  useEffect(() => {
    if (!isOpen || !user.peerID || user.isExternal) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    getProfile(user.peerID)
      .then(data => {
        if (cancelled || !data) return;
        setProfile({
          handle: data.handle,
          shortDescription: data.shortDescription,
          about: data.about,
          location: data.location,
          vendor: data.vendor,
          listingCount: data.stats?.listingCount,
          rating: data.stats?.averageRating,
          reviewCount: data.stats?.ratingCount,
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, user.peerID, user.isExternal]);

  if (!isOpen) return null;

  const handleCopyId = () => {
    const idToCopy = user.peerID || user.userId;
    navigator.clipboard.writeText(idToCopy);
  };

  const handleViewStore = () => {
    if (user.peerID && onViewStore) {
      onViewStore(user.peerID);
    }
  };

  const handleStartChat = () => {
    if (onStartChat) {
      onStartChat(user.userId);
    }
  };

  const handleToggleBlock = async () => {
    setBlockLoading(true);
    try {
      if (blocked) {
        await onUnblock?.(user.userId);
        setBlocked(false);
      } else {
        await onBlock?.(user.userId);
        setBlocked(true);
      }
    } catch {
      // Revert on failure — state stays unchanged
    } finally {
      setBlockLoading(false);
    }
  };

  const isMobazhaUser = !user.isExternal && user.peerID;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in duration-200" />
        <DialogPrimitive.Content
          className="fixed z-[100] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card rounded-2xl shadow-2xl w-80 overflow-hidden outline-none data-[state=open]:animate-in data-[state=open]:zoom-in-95 duration-200"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">
            {user.displayName || t('chat.unknownUser')}
          </DialogPrimitive.Title>
          {/* Card Header with gradient */}
          <div className="relative h-28 bg-gradient-to-br from-primary/40 via-primary/25 to-primary/10 overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/10" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />

            <DialogPrimitive.Close className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-all duration-200 hover:scale-110">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </DialogPrimitive.Close>

            {/* User type badge */}
            {user.isExternal && (
              <div className="absolute top-3 left-3 px-2.5 py-1 text-xs font-semibold bg-info/90 text-white rounded-full shadow-lg">
                {t('chat.externalUser')}
              </div>
            )}
          </div>

          {/* Avatar - overlapping header */}
          <div className="flex justify-center -mt-14">
            <Avatar
              src={user.avatarUrl}
              name={user.displayName || user.userId}
              size="lg"
              className="w-28 h-28 ring-4 ring-card shadow-xl"
            />
          </div>

          {/* User Info */}
          <div className="p-6 pt-4 text-center">
            <h3 className="text-xl font-bold text-foreground mb-0.5">
              {user.displayName || t('chat.unknownUser')}
            </h3>

            {/* @handle */}
            {profile?.handle && (
              <p className="text-sm text-muted-foreground mb-1">@{profile.handle}</p>
            )}

            {/* Short description / about */}
            {(profile?.shortDescription || profile?.about) && (
              <p className="text-xs text-muted-foreground/80 line-clamp-2 mb-2 px-2">
                {profile.shortDescription || profile.about}
              </p>
            )}

            {/* Location & stats row */}
            {profile &&
              (profile.location ||
                (profile.listingCount ?? 0) > 0 ||
                (profile.reviewCount ?? 0) > 0) && (
                <div className="flex items-center justify-center gap-3 mb-3 text-xs text-muted-foreground/70">
                  {profile.location && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-[100px]">{profile.location}</span>
                    </span>
                  )}
                  {(profile.listingCount ?? 0) > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Package className="w-3 h-3" />
                      {profile.listingCount}
                    </span>
                  )}
                  {(profile.reviewCount ?? 0) > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Star className="w-3 h-3" />
                      {profile.rating?.toFixed(1)} ({profile.reviewCount})
                    </span>
                  )}
                </div>
              )}

            {/* Loading skeleton for profile */}
            {profileLoading && isMobazhaUser && (
              <div className="flex flex-col items-center gap-1.5 mb-3">
                <div className="h-3.5 w-20 bg-muted animate-pulse rounded" />
                <div className="h-3 w-40 bg-muted animate-pulse rounded" />
              </div>
            )}

            {/* ID display */}
            <div className="mb-4">
              {isMobazhaUser ? (
                <>
                  <p className="text-xs text-muted-foreground/60 mb-0.5">{t('chat.peerId')}</p>
                  <p className="text-sm text-muted-foreground font-mono break-all px-2">
                    {user.peerID}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground/60 mb-0.5">{t('chat.matrixId')}</p>
                  <p className="text-sm text-muted-foreground break-all px-2">{user.userId}</p>
                </>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyId}
                className="rounded-xl px-4 hover:bg-muted/80"
              >
                <svg
                  className="w-4 h-4 mr-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                {t('common.copy')}
              </Button>

              {isMobazhaUser ? (
                <Button
                  size="sm"
                  onClick={handleViewStore}
                  className="rounded-xl px-4 bg-gradient-to-r from-primary to-primary/90 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
                >
                  <svg
                    className="w-4 h-4 mr-1.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                  {t('chat.viewStore')}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleStartChat}
                  className="rounded-xl px-4 bg-gradient-to-r from-primary to-primary/90 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
                >
                  <svg
                    className="w-4 h-4 mr-1.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  {t('chat.sendMessage')}
                </Button>
              )}
            </div>

            {/* Block/Unblock button */}
            {(onBlock || onUnblock) && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleBlock}
                  disabled={blockLoading}
                  className={`w-full rounded-xl text-xs ${blocked ? 'text-muted-foreground hover:text-foreground' : 'text-destructive hover:text-destructive hover:bg-destructive/10'}`}
                >
                  {blocked ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                      {t('chat.unblockUser') || 'Unblock User'}
                    </>
                  ) : (
                    <>
                      <ShieldBan className="w-3.5 h-3.5 mr-1.5" />
                      {t('chat.blockUser') || 'Block User'}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default UserInfoCard;
