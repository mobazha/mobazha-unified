'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n, useChatStore, useUserStore, matrixClient } from '@mobazha/core';
import { searchProfiles, type SearchedUser } from '@mobazha/core/services/api/products';
import {
  Search,
  Loader2,
  User,
  MapPin,
  Star,
  Package,
  X,
  Users,
  MessageSquare,
} from 'lucide-react';

const PEER_ID_PATTERN = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|12D3Koo[1-9A-HJ-NP-Za-km-z]{44,50})$/;
const MATRIX_PROFILE_REQUEST_TIMEOUT_MS = 3500;

function isValidPeerID(id: string): boolean {
  return PEER_ID_PATTERN.test(id);
}

function isValidMatrixUserID(id: string): boolean {
  if (!id || !id.startsWith('@')) return false;
  const colonIndex = id.indexOf(':');
  if (colonIndex <= 1 || colonIndex >= id.length - 1) return false;
  if (id.indexOf(':', colonIndex + 1) !== -1) return false;

  const localpart = id.slice(1, colonIndex);
  const domain = id.slice(colonIndex + 1);

  if (!/^[^:\s]+$/.test(localpart)) return false;
  if (!isValidMatrixDomain(domain)) return false;
  return true;
}

function getMatrixUserDisplayName(userID: string): string {
  const colonIndex = userID.indexOf(':');
  if (colonIndex <= 1) return userID;
  return userID.slice(1, colonIndex);
}

function getMatrixDomain(userID: string): string {
  const colonIndex = userID.indexOf(':');
  if (colonIndex <= 1 || colonIndex >= userID.length - 1) return '';
  return userID.slice(colonIndex + 1);
}

function isValidMatrixDomain(domain: string): boolean {
  if (!domain) return false;
  if (domain.length > 253) return false;
  if (domain.startsWith('.') || domain.endsWith('.')) return false;
  if (domain.includes('..')) return false;
  if (!/^[a-zA-Z0-9.-]+$/.test(domain)) return false;

  const labels = domain.split('.');
  if (labels.length < 2) return false;
  for (const label of labels) {
    if (!label || label.length > 63) return false;
    if (label.startsWith('-') || label.endsWith('-')) return false;
  }
  return true;
}

function toMatrixAvatarURL(avatarURL: string): string | undefined {
  if (avatarURL.startsWith('https://') || avatarURL.startsWith('http://')) {
    return avatarURL;
  }
  if (!avatarURL.startsWith('mxc://')) {
    return undefined;
  }

  const mxcPath = avatarURL.slice('mxc://'.length);
  const slashIndex = mxcPath.indexOf('/');
  if (slashIndex <= 0 || slashIndex >= mxcPath.length - 1) {
    return undefined;
  }

  const rawServerName = mxcPath.slice(0, slashIndex);
  const serverName = encodeURIComponent(rawServerName);
  const mediaID = encodeURIComponent(mxcPath.slice(slashIndex + 1));
  return `https://${rawServerName}/_matrix/media/v3/thumbnail/${serverName}/${mediaID}?width=80&height=80&method=crop`;
}

interface MatrixUserPreview {
  displayName: string;
  avatarUrl?: string;
  isLoading: boolean;
}

type DialogTab = 'dm' | 'group';

interface SelectedMember {
  peerID: string;
  name?: string;
  avatar?: string;
}

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewChatDialog: React.FC<NewChatDialogProps> = ({ open, onOpenChange }) => {
  const { t } = useI18n();
  const openDrawerWithPeer = useChatStore(state => state.openDrawerWithPeer);
  const openDrawerWithMatrixUser = useChatStore(state => state.openDrawerWithMatrixUser);
  const setRooms = useChatStore(state => state.setRooms);
  const setCurrentRoom = useChatStore(state => state.setCurrentRoom);
  const myPeerID = useUserStore(state => state.profile?.peerID);

  const [activeTab, setActiveTab] = useState<DialogTab>('dm');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [matrixPreview, setMatrixPreview] = useState<MatrixUserPreview | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeqRef = useRef(0);

  // Group chat state
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<SearchedUser[]>([]);
  const [isMemberSearching, setIsMemberSearching] = useState(false);
  const memberDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const memberSearchSeqRef = useRef(0);

  const trimmed = query.trim();
  const isPeerID = isValidPeerID(trimmed);
  const isMatrixUserID = isValidMatrixUserID(trimmed);
  const isMatrixLikeInput = trimmed.startsWith('@') && trimmed.includes(':');
  const canSubmitDirect = isPeerID || isMatrixUserID;

  useEffect(() => {
    if (!open) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (!trimmed || isPeerID || isMatrixUserID || trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (isMatrixLikeInput) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const normalizedQuery = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
    if (normalizedQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const seq = ++searchSeqRef.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await searchProfiles({ query: normalizedQuery, pageSize: 10 });
        if (seq === searchSeqRef.current) {
          const filtered = myPeerID
            ? result.users.filter(u => u.peerID !== myPeerID)
            : result.users;
          setSearchResults(filtered);
        }
      } catch {
        if (seq === searchSeqRef.current) {
          setSearchResults([]);
        }
      } finally {
        if (seq === searchSeqRef.current) {
          setIsSearching(false);
        }
      }
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [trimmed, isPeerID, isMatrixUserID, isMatrixLikeInput, open, myPeerID]);

  useEffect(() => {
    if (!open || !isMatrixUserID) {
      setMatrixPreview(null);
      return;
    }

    const matrixDomain = getMatrixDomain(trimmed);
    const fallbackDisplayName = getMatrixUserDisplayName(trimmed);
    if (!matrixDomain) {
      setMatrixPreview({
        displayName: fallbackDisplayName,
        isLoading: false,
      });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MATRIX_PROFILE_REQUEST_TIMEOUT_MS);
    let cancelled = false;

    setMatrixPreview({
      displayName: fallbackDisplayName,
      isLoading: true,
    });

    (async () => {
      try {
        const response = await fetch(
          `https://${matrixDomain}/_matrix/client/v3/profile/${encodeURIComponent(trimmed)}`,
          {
            method: 'GET',
            signal: controller.signal,
          }
        );

        let displayName = fallbackDisplayName;
        let avatarUrl: string | undefined;

        if (response.ok) {
          const profile = (await response.json()) as {
            displayname?: unknown;
            avatar_url?: unknown;
          };
          if (typeof profile.displayname === 'string' && profile.displayname.trim()) {
            displayName = profile.displayname.trim();
          }
          if (typeof profile.avatar_url === 'string' && profile.avatar_url.trim()) {
            avatarUrl = toMatrixAvatarURL(profile.avatar_url.trim());
          }
        }

        if (!cancelled) {
          setMatrixPreview({
            displayName,
            avatarUrl,
            isLoading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setMatrixPreview({
            displayName: fallbackDisplayName,
            isLoading: false,
          });
        }
      } finally {
        clearTimeout(timeout);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [open, isMatrixUserID, trimmed]);

  // Group chat: member search
  useEffect(() => {
    if (!open || activeTab !== 'group') return;

    if (memberDebounceRef.current) {
      clearTimeout(memberDebounceRef.current);
      memberDebounceRef.current = null;
    }

    const trimmedMember = memberSearchQuery.trim();
    if (!trimmedMember || trimmedMember.length < 2) {
      setMemberSearchResults([]);
      setIsMemberSearching(false);
      return;
    }

    setIsMemberSearching(true);
    const seq = ++memberSearchSeqRef.current;
    memberDebounceRef.current = setTimeout(async () => {
      try {
        const result = await searchProfiles({ query: trimmedMember, pageSize: 10 });
        if (seq === memberSearchSeqRef.current) {
          const selectedPeerIDs = new Set(selectedMembers.map(m => m.peerID));
          const filtered = result.users.filter(
            u => u.peerID !== myPeerID && !selectedPeerIDs.has(u.peerID)
          );
          setMemberSearchResults(filtered);
        }
      } catch {
        if (seq === memberSearchSeqRef.current) setMemberSearchResults([]);
      } finally {
        if (seq === memberSearchSeqRef.current) setIsMemberSearching(false);
      }
    }, 400);

    return () => {
      if (memberDebounceRef.current) clearTimeout(memberDebounceRef.current);
    };
  }, [memberSearchQuery, open, activeTab, myPeerID, selectedMembers]);

  const handleAddMember = useCallback((user: SearchedUser) => {
    setSelectedMembers(prev => {
      if (prev.some(m => m.peerID === user.peerID)) return prev;
      return [
        ...prev,
        { peerID: user.peerID, name: user.name || user.handle, avatar: user.avatar },
      ];
    });
    setMemberSearchQuery('');
    setMemberSearchResults([]);
  }, []);

  const handleRemoveMember = useCallback((peerID: string) => {
    setSelectedMembers(prev => prev.filter(m => m.peerID !== peerID));
  }, []);

  const handleCreateGroup = useCallback(async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    setIsCreatingGroup(true);
    try {
      const memberPeerIDs = selectedMembers.map(m => m.peerID);
      const roomId = await matrixClient.createGroupRoom(groupName.trim(), memberPeerIDs);
      if (roomId) {
        const rooms = await matrixClient.getRooms();
        setRooms(rooms);
        setCurrentRoom(roomId);
        onOpenChange(false);
        setGroupName('');
        setSelectedMembers([]);
        setMemberSearchQuery('');
      }
    } catch (err) {
      console.error('[NewChatDialog] Failed to create group:', err);
      setError(t('chat.createConversationFailed'));
    } finally {
      setIsCreatingGroup(false);
    }
  }, [groupName, selectedMembers, setRooms, setCurrentRoom, onOpenChange, t]);

  const handleSelectUser = useCallback(
    (peerID: string, displayName?: string) => {
      setError('');
      onOpenChange(false);
      setQuery('');
      setSearchResults([]);
      setMatrixPreview(null);
      openDrawerWithPeer(peerID, displayName);
    },
    [onOpenChange, openDrawerWithPeer]
  );

  const handleSelectMatrixUser = useCallback(
    (userID: string, displayName?: string) => {
      setError('');
      onOpenChange(false);
      setQuery('');
      setSearchResults([]);
      setMatrixPreview(null);
      openDrawerWithMatrixUser(userID, displayName);
    },
    [onOpenChange, openDrawerWithMatrixUser]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!trimmed) {
        setError(t('chat.newChat.errorEmpty'));
        return;
      }
      if (!canSubmitDirect) {
        setError(t('chat.newChat.errorInvalid'));
        return;
      }
      if (isPeerID) {
        handleSelectUser(trimmed);
        return;
      }
      handleSelectMatrixUser(
        trimmed,
        matrixPreview?.displayName || getMatrixUserDisplayName(trimmed)
      );
    },
    [trimmed, isPeerID, canSubmitDirect, matrixPreview, t, handleSelectUser, handleSelectMatrixUser]
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setQuery('');
    setError('');
    setSearchResults([]);
    setIsSearching(false);
    setMatrixPreview(null);
    setGroupName('');
    setSelectedMembers([]);
    setMemberSearchQuery('');
    setMemberSearchResults([]);
    setActiveTab('dm');
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[440px]" data-testid="chat-new-dialog">
        <DialogHeader>
          <DialogTitle>{t('chat.newChat.title')}</DialogTitle>
          <DialogDescription>{t('chat.newChat.description')}</DialogDescription>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            type="button"
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'dm'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('dm')}
          >
            <MessageSquare className="w-4 h-4" />
            {t('chat.directMessage')}
          </button>
          <button
            type="button"
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'group'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('group')}
          >
            <Users className="w-4 h-4" />
            {t('chat.groupChat')}
          </button>
        </div>

        {/* DM Tab */}
        {activeTab === 'dm' && (
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  if (error) setError('');
                }}
                placeholder={
                  t('chat.newChat.searchPlaceholder') || 'Search by name or paste Peer ID...'
                }
                className="pl-9 text-sm"
                autoFocus
                data-testid="chat-new-dialog-input"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}

            {isSearching && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="max-h-[320px] overflow-y-auto -mx-1">
                {searchResults.map(user => {
                  const hasSecondary = user.handle || user.shortDescription;
                  const truncatedId = `${user.peerID.slice(0, 6)}...${user.peerID.slice(-4)}`;

                  return (
                    <button
                      key={user.peerID}
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left"
                      onClick={() => handleSelectUser(user.peerID, user.name || user.handle)}
                    >
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="w-[18px] h-[18px] text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">{user.name}</span>
                          {user.handle && (
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              @{user.handle}
                            </span>
                          )}
                        </div>

                        {user.shortDescription ? (
                          <div className="text-xs text-muted-foreground truncate mt-0.5">
                            {user.shortDescription}
                          </div>
                        ) : !hasSecondary ? (
                          <div className="text-xs text-muted-foreground/60 font-mono mt-0.5">
                            {truncatedId}
                          </div>
                        ) : null}

                        {(user.location || user.listingCount > 0 || user.reviewCount > 0) && (
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground/70">
                            {user.location && (
                              <span className="flex items-center gap-0.5 truncate max-w-[120px]">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                {user.location}
                              </span>
                            )}
                            {user.listingCount > 0 && (
                              <span className="flex items-center gap-0.5 flex-shrink-0">
                                <Package className="w-3 h-3" />
                                {user.listingCount}
                              </span>
                            )}
                            {user.reviewCount > 0 && (
                              <span className="flex items-center gap-0.5 flex-shrink-0">
                                <Star className="w-3 h-3" />
                                {user.rating.toFixed(1)} ({user.reviewCount})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {!isSearching && isMatrixUserID && (
              <div className="max-h-[320px] overflow-y-auto -mx-1">
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left"
                  onClick={() =>
                    handleSelectMatrixUser(
                      trimmed,
                      matrixPreview?.displayName || getMatrixUserDisplayName(trimmed)
                    )
                  }
                >
                  {matrixPreview?.avatarUrl ? (
                    <img
                      src={matrixPreview.avatarUrl}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="w-[18px] h-[18px] text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {matrixPreview?.displayName || getMatrixUserDisplayName(trimmed)}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono truncate mt-0.5">
                      {trimmed}
                    </div>
                    <div className="text-[11px] text-muted-foreground/70 mt-1">
                      {t('chat.externalUser')}
                      {matrixPreview?.isLoading ? (
                        <span className="inline-flex items-center ml-2 align-middle">
                          <Loader2 className="w-3 h-3 animate-spin" />
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              </div>
            )}

            {!isSearching &&
              trimmed.length >= 2 &&
              !isPeerID &&
              !isMatrixUserID &&
              searchResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('chat.newChat.noResults') || 'No users found'}
                </p>
              )}

            {canSubmitDirect && (
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={handleClose}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" data-testid="chat-new-dialog-submit">
                  {t('chat.newChat.start')}
                </Button>
              </div>
            )}
          </form>
        )}

        {/* Group Chat Tab */}
        {activeTab === 'group' && (
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('chat.group.name')}</label>
              <Input
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder={t('chat.group.namePlaceholder')}
                className="text-sm"
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('chat.group.members')}</label>

              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedMembers.map(member => (
                    <span
                      key={member.peerID}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium"
                    >
                      {member.name || `${member.peerID.slice(0, 6)}...${member.peerID.slice(-4)}`}
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.peerID)}
                        className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={memberSearchQuery}
                  onChange={e => setMemberSearchQuery(e.target.value)}
                  placeholder={t('chat.group.searchMembers')}
                  className="pl-9 text-sm"
                />
              </div>

              {isMemberSearching && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}

              {!isMemberSearching && memberSearchResults.length > 0 && (
                <div className="max-h-[200px] overflow-y-auto mt-2 -mx-1">
                  {memberSearchResults.map(user => (
                    <button
                      key={user.peerID}
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
                      onClick={() => handleAddMember(user)}
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
                        {user.handle && user.name && (
                          <span className="text-xs text-muted-foreground">@{user.handle}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!isMemberSearching &&
                memberSearchQuery.trim().length >= 2 &&
                memberSearchResults.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    {t('chat.newChat.noResults')}
                  </p>
                )}
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={handleClose}>
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                disabled={!groupName.trim() || selectedMembers.length === 0 || isCreatingGroup}
                onClick={handleCreateGroup}
              >
                {isCreatingGroup ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('chat.group.create')
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
