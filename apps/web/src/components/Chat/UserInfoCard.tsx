'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { useI18n } from '@mobazha/core';

export interface UserInfo {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  peerID?: string;
  isExternal?: boolean;
}

export interface UserInfoCardProps {
  user: UserInfo;
  isOpen: boolean;
  onClose: () => void;
  onViewStore?: (peerID: string) => void;
  onStartChat?: (userId: string) => void;
}

export const UserInfoCard: React.FC<UserInfoCardProps> = ({
  user,
  isOpen,
  onClose,
  onViewStore,
  onStartChat,
}) => {
  const { t } = useI18n();

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

  const isMobazhaUser = !user.isExternal && user.peerID;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-2xl w-80 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Card Header with gradient */}
        <div className="relative h-28 bg-gradient-to-br from-primary/40 via-primary/25 to-primary/10 overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />

          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-all duration-200 hover:scale-110"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* User type badge */}
          {user.isExternal && (
            <div className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-semibold bg-blue-500/90 text-white rounded-full shadow-lg">
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
          <h3 className="text-xl font-bold text-foreground mb-1">
            {user.displayName || t('chat.unknownUser')}
          </h3>

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
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        </div>
      </div>
    </div>
  );
};

export default UserInfoCard;
