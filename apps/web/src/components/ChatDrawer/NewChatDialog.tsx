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
import { useI18n, useChatStore } from '@mobazha/core';
import { searchProfiles, type SearchedUser } from '@mobazha/core/services/api/products';
import { Search, Loader2, User } from 'lucide-react';

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
          setSearchResults(result.users);
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
  }, [trimmed, isPeerID, open]);

  const handleSelectUser = useCallback(
    (peerID: string) => {
      setError('');
      onOpenChange(false);
      setQuery('');
      setSearchResults([]);
      openDrawerWithPeer(peerID);
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
      <DialogContent className="sm:max-w-[440px]">
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
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}

          {isSearching && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isSearching && searchResults.length > 0 && (
            <div className="max-h-[280px] overflow-y-auto -mx-1">
              {searchResults.map(user => (
                <button
                  key={user.peerID}
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent transition-colors text-left"
                  onClick={() => handleSelectUser(user.peerID)}
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{user.name}</div>
                    {user.handle && (
                      <div className="text-xs text-muted-foreground truncate">@{user.handle}</div>
                    )}
                  </div>
                </button>
              ))}
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
              <Button type="submit">{t('chat.newChat.start')}</Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};
