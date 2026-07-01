'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import {
  getMemberPresentation,
  getRoomPresentation,
  matrixClient,
  type MatrixRoom,
} from '@mobazha/core';
import { searchProfiles, type SearchedUser } from '@mobazha/core/services/api/products';
import { Search, Loader2, UserPlus, User } from 'lucide-react';

interface RoomSettingsPanelProps {
  room: MatrixRoom;
  currentUserId?: string | null;
  onClose: () => void;
  onMemberClick: (userId: string, displayName?: string, avatarUrl?: string) => void;
  onLeaveRoom?: (roomId: string) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const RoomSettingsPanel: React.FC<RoomSettingsPanelProps> = ({
  room,
  currentUserId,
  onClose,
  onMemberClick,
  onLeaveRoom,
  t,
}) => {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteResults, setInviteResults] = useState<SearchedUser[]>([]);
  const [isInviteSearching, setIsInviteSearching] = useState(false);
  const [invitingPeerID, setInvitingPeerID] = useState<string | null>(null);
  const [inviteStatus, setInviteStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const inviteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inviteSeqRef = useRef(0);

  const existingMemberPeerIDs = new Set(
    room.members.map(m => {
      const colonIdx = m.userId.indexOf(':');
      if (m.userId.startsWith('@') && colonIdx > 1) return m.userId.slice(1, colonIdx);
      return m.userId;
    })
  );

  useEffect(() => {
    if (!showInvite) return;

    if (inviteDebounceRef.current) {
      clearTimeout(inviteDebounceRef.current);
      inviteDebounceRef.current = null;
    }

    const trimmed = inviteQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setInviteResults([]);
      setIsInviteSearching(false);
      return;
    }

    setIsInviteSearching(true);
    const seq = ++inviteSeqRef.current;
    inviteDebounceRef.current = setTimeout(async () => {
      try {
        const result = await searchProfiles({ query: trimmed, pageSize: 10 });
        if (seq === inviteSeqRef.current) {
          setInviteResults(result.users.filter(u => !existingMemberPeerIDs.has(u.peerID)));
        }
      } catch {
        if (seq === inviteSeqRef.current) setInviteResults([]);
      } finally {
        if (seq === inviteSeqRef.current) setIsInviteSearching(false);
      }
    }, 400);

    return () => {
      if (inviteDebounceRef.current) clearTimeout(inviteDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteQuery, showInvite]);

  const handleInvite = useCallback(
    async (peerID: string) => {
      setInvitingPeerID(peerID);
      setInviteStatus(null);
      try {
        const success = await matrixClient.inviteToRoom(room.roomId, peerID);
        if (success) {
          setInviteStatus({ type: 'success', message: t('chat.inviteSuccess') });
          setInviteResults(prev => prev.filter(u => u.peerID !== peerID));
        } else {
          setInviteStatus({ type: 'error', message: t('chat.inviteFailed') });
        }
      } catch {
        setInviteStatus({ type: 'error', message: t('chat.inviteFailed') });
      } finally {
        setInvitingPeerID(null);
      }
    },
    [room.roomId, t]
  );

  const roomPresentation = getRoomPresentation(room, currentUserId, t('chat.defaultRoom'));
  const memberPresentations = room.members.map(member => ({
    member,
    presentation: getMemberPresentation(member, room),
  }));

  return (
    <div
      className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col animate-in slide-in-from-right duration-200"
      data-testid="chat-room-settings-panel"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="rounded-xl hover:bg-muted/80"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Button>
        <span className="font-bold text-foreground">{t('chat.roomSettings')}</span>
      </div>

      {/* Room Info */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-4" data-testid="chat-room-settings-avatar">
            <Avatar
              src={roomPresentation.avatarUrl}
              rawMxcUrl={roomPresentation.rawMxcAvatarUrl}
              name={roomPresentation.title}
              size="lg"
              className="w-24 h-24 ring-4 ring-background shadow-xl"
            />
            {room.isEncrypted && (
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center ring-4 ring-background">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>
          <h3
            className="text-xl font-bold text-foreground mb-1"
            data-testid="chat-room-settings-title"
          >
            {roomPresentation.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {room.isDirect ? t('chat.directMessage') : t('chat.groupChat')}
          </p>
          {room.isEncrypted && (
            <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-primary/15 text-primary rounded-full">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              {t('chat.encrypted')}
            </span>
          )}
        </div>

        {/* Members */}
        {room.members && room.members.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              {t('chat.members')} ({room.members.length})
            </h4>
            <div className="space-y-2">
              {memberPresentations.map(({ member, presentation }) => (
                <button
                  key={member.userId}
                  onClick={() =>
                    onMemberClick(member.userId, presentation.displayName, presentation.avatarUrl)
                  }
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors text-left"
                >
                  <Avatar
                    src={presentation.avatarUrl}
                    rawMxcUrl={presentation.rawMxcAvatarUrl}
                    name={presentation.displayName}
                    size="sm"
                    className="ring-2 ring-background"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {presentation.displayName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{member.userId}</p>
                  </div>
                  {presentation.isExternal && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-info/15 text-info rounded-full">
                      External
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Room ID */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t('chat.roomId')}</h4>
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl">
            <code className="flex-1 text-xs text-muted-foreground break-all">{room.roomId}</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigator.clipboard.writeText(room.roomId)}
              className="h-8 w-8 p-0 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </Button>
          </div>
        </div>

        {/* Invite User */}
        <div className="mb-6">
          {!showInvite ? (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 text-foreground hover:bg-muted/60"
              onClick={() => setShowInvite(true)}
            >
              <UserPlus className="w-5 h-5 text-muted-foreground" />
              {t('chat.inviteUser')}
            </Button>
          ) : (
            <div className="space-y-3 p-3 bg-muted/30 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('chat.inviteUser')}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => {
                    setShowInvite(false);
                    setInviteQuery('');
                    setInviteResults([]);
                    setInviteStatus(null);
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={inviteQuery}
                  onChange={e => {
                    setInviteQuery(e.target.value);
                    setInviteStatus(null);
                  }}
                  placeholder={t('chat.inviteSearchPlaceholder')}
                  className="pl-9 text-sm"
                  autoFocus
                />
              </div>

              {inviteStatus && (
                <p
                  className={`text-xs ${inviteStatus.type === 'success' ? 'text-primary' : 'text-destructive'}`}
                >
                  {inviteStatus.message}
                </p>
              )}

              {isInviteSearching && (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}

              {!isInviteSearching && inviteResults.length > 0 && (
                <div className="max-h-[200px] overflow-y-auto space-y-1">
                  {inviteResults.map(user => (
                    <div
                      key={user.peerID}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60 transition-colors"
                    >
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium truncate block">
                          {user.name || user.handle}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs flex-shrink-0"
                        disabled={invitingPeerID === user.peerID}
                        onClick={() => handleInvite(user.peerID)}
                      >
                        {invitingPeerID === user.peerID ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          t('chat.inviteUser')
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {!isInviteSearching &&
                inviteQuery.trim().length >= 2 &&
                inviteResults.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    {t('chat.newChat.noResults')}
                  </p>
                )}
            </div>
          )}
        </div>

        {/* Leave Room */}
        {onLeaveRoom && (
          <div className="pt-4 border-t border-border/50">
            {!showLeaveConfirm ? (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 h-12"
                onClick={() => setShowLeaveConfirm(true)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                {t('chat.leaveRoom')}
              </Button>
            ) : (
              <div className="space-y-3 p-3 bg-destructive/5 rounded-xl">
                <p className="text-sm text-muted-foreground">{t('chat.leaveRoomConfirm')}</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowLeaveConfirm(false)}
                    disabled={isLeaving}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    disabled={isLeaving}
                    onClick={async () => {
                      setIsLeaving(true);
                      try {
                        await onLeaveRoom(room.roomId);
                      } finally {
                        setIsLeaving(false);
                        setShowLeaveConfirm(false);
                      }
                    }}
                  >
                    {isLeaving ? t('common.loading') : t('chat.leaveRoom')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
