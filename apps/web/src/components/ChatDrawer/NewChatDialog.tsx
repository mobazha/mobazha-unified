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
import { useI18n, useChatStore, useUserStore } from '@mobazha/core';
import { searchProfiles, type SearchedUser } from '@mobazha/core/services/api/products';
import { Search, Loader2, User, MapPin, Star, Package } from 'lucide-react';

const PEER_ID_PATTERN = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|12D3Koo[1-9A-HJ-NP-Za-km-z]{44,50})$/;

function isValidPeerID(id: string): boolean {
  return PEER_ID_PATTERN.test(id);
}

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewChatDialog: React.FC<NewChatDialogProps> = ({ open, onOpenChange }) => {
  const { t } = useI18n();
  const openDrawerWithPeer = useChatStore(state => state.openDrawerWithPeer);
  const myPeerID = useUserStore(state => state.profile?.peerID);

  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeqRef = useRef(0);

  const trimmed = query.trim();
  const isPeerID = isValidPeerID(trimmed);

  useEffect(() => {
    if (!open) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (!trimmed || isPeerID || trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const seq = ++searchSeqRef.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await searchProfiles({ query: trimmed, pageSize: 10 });
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
  }, [trimmed, isPeerID, open, myPeerID]);

  const handleSelectUser = useCallback(
    (peerID: string, displayName?: string) => {
      setError('');
      onOpenChange(false);
      setQuery('');
      setSearchResults([]);
      openDrawerWithPeer(peerID, displayName);
    },
    [onOpenChange, openDrawerWithPeer]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!trimmed) {
        setError(t('chat.newChat.errorEmpty'));
        return;
      }
      if (!isPeerID) {
        setError(t('chat.newChat.errorInvalid'));
        return;
      }
      handleSelectUser(trimmed);
    },
    [trimmed, isPeerID, t, handleSelectUser]
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setQuery('');
    setError('');
    setSearchResults([]);
    setIsSearching(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[440px]" data-testid="chat-new-dialog">
        <DialogHeader>
          <DialogTitle>{t('chat.newChat.title')}</DialogTitle>
          <DialogDescription>{t('chat.newChat.description')}</DialogDescription>
        </DialogHeader>
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

          {!isSearching && trimmed.length >= 2 && !isPeerID && searchResults.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('chat.newChat.noResults') || 'No users found'}
            </p>
          )}

          {isPeerID && (
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
      </DialogContent>
    </Dialog>
  );
};
