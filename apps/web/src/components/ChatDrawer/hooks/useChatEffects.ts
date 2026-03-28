import { useEffect, useRef } from 'react';
import {
  useChatStore,
  matrixClient,
  matrixEvents,
  MATRIX_EVENTS,
  getProfileDisplayInfo,
} from '@mobazha/core';
import type { MatrixRoom } from '@mobazha/core';
import type { VerificationPhase } from '../VerificationDialog';

const DECRYPTION_RETRY_DELAY_MS = 1500;

interface PendingDirectRoomPatch {
  peerID?: string | null;
  currentUserId?: string;
  displayName?: string | null;
}

function patchPendingDirectRoom(
  rooms: MatrixRoom[],
  roomId: string,
  patch: PendingDirectRoomPatch
): MatrixRoom[] {
  return rooms.map(room => {
    if (room.roomId !== roomId) return room;

    const fallbackName = patch.displayName?.trim();
    const nextPeerID = patch.peerID?.trim();
    const memberPeerIDs =
      nextPeerID && patch.currentUserId
        ? {
            ...(room.memberPeerIDs || {}),
            ...Object.fromEntries(
              room.members
                .filter(member => member.userId !== patch.currentUserId)
                .map(member => [member.userId, nextPeerID])
            ),
          }
        : room.memberPeerIDs;
    const members = patch.currentUserId
      ? room.members.map(member => {
          if (member.userId === patch.currentUserId) {
            return member;
          }

          return {
            ...member,
            ...(nextPeerID ? { peerID: nextPeerID } : {}),
            ...(fallbackName ? { displayName: fallbackName } : {}),
          };
        })
      : room.members;

    return {
      ...room,
      memberPeerIDs,
      members,
      ...(fallbackName ? { name: fallbackName } : {}),
      isDirect: true,
      roomType: 'direct',
    };
  });
}

async function hydratePendingDirectRoomProfile(
  roomId: string,
  peerID: string,
  currentUserId: string,
  pendingPeerDisplayName: string | null,
  roomSnapshot: MatrixRoom | undefined,
  updateRoom: (roomId: string, updates: Partial<MatrixRoom>) => void,
  isCancelled: () => boolean
): Promise<void> {
  const profile = await getProfileDisplayInfo(peerID);
  if (isCancelled() || !profile) return;

  const fallbackName = pendingPeerDisplayName?.trim();
  const resolvedName = profile.name?.trim() || fallbackName;
  const resolvedAvatarUrl = profile.avatar?.trim();
  const currentRoom =
    useChatStore.getState().rooms.find(room => room.roomId === roomId) || roomSnapshot;
  if (!currentRoom) return;

  if (!resolvedName && !resolvedAvatarUrl) return;

  updateRoom(roomId, {
    ...(resolvedName ? { name: resolvedName } : {}),
    ...(resolvedAvatarUrl ? { avatarUrl: resolvedAvatarUrl } : {}),
    members: currentRoom.members.map(member =>
      member.userId !== currentUserId
        ? {
            ...member,
            peerID,
            ...(resolvedName ? { displayName: resolvedName } : {}),
            ...(resolvedAvatarUrl ? { avatarUrl: resolvedAvatarUrl } : {}),
          }
        : member
    ),
    memberPeerIDs: {
      ...(currentRoom.memberPeerIDs || {}),
      ...Object.fromEntries(
        currentRoom.members
          .filter(member => member.userId !== currentUserId)
          .map(member => [member.userId, peerID])
      ),
    },
    isDirect: true,
    roomType: 'direct',
  });
}

function hasTransientDecryptionFailure(messages: import('@mobazha/core').MatrixMessage[]): boolean {
  return messages.some(message => message.decryptionFailed);
}

// ---------------------------------------------------------------------------
// Params
// ---------------------------------------------------------------------------

export interface UseChatEffectsParams {
  currentRoomId: string | null;
  currentUserId: string;

  // pending peer → DM creation
  pendingPeerID: string | null;
  pendingPeerDisplayName: string | null;
  clearPendingPeer: () => void;
  setRooms: (rooms: MatrixRoom[]) => void;
  setInvites: (rooms: MatrixRoom[]) => void;
  setCurrentRoom: (roomId: string | null) => void;
  setIsCreatingRoom: (v: boolean) => void;

  // room messages
  setMessages: (roomId: string, messages: import('@mobazha/core').MatrixMessage[]) => void;
  updateRoom: (roomId: string, updates: Partial<MatrixRoom>) => void;

  // verification callbacks
  setVerificationOpen: (v: boolean) => void;
  setVerificationPhase: (v: VerificationPhase) => void;
  setVerificationUserId: (v: string | null) => void;
  setVerificationTxnId: (v: string | null) => void;
  setVerificationEmoji: (v: Array<[string, string]> | null) => void;
  resetVerification: () => void;

  // UI feedback
  toast: (opts: {
    title: string;
    description: string;
    variant?: 'default' | 'destructive' | 'success' | null;
  }) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChatEffects(params: UseChatEffectsParams): void {
  const {
    currentRoomId,
    currentUserId,
    pendingPeerID,
    pendingPeerDisplayName,
    clearPendingPeer,
    setRooms,
    setInvites,
    setCurrentRoom,
    setIsCreatingRoom,
    setMessages,
    updateRoom,
    setVerificationOpen,
    setVerificationPhase,
    setVerificationUserId,
    setVerificationTxnId,
    setVerificationEmoji,
    resetVerification,
    toast,
    t,
  } = params;

  // Track rooms that already had initial messages loaded
  const loadedRoomsRef = useRef<Set<string>>(new Set());
  const updateRoomRef = useRef(updateRoom);
  const decryptionRetryCountRef = useRef<Map<string, number>>(new Map());

  updateRoomRef.current = updateRoom;

  // ---- 1. Resolve pendingPeerID → create/find DM room and focus it ----
  useEffect(() => {
    if (!pendingPeerID) return;

    let cancelled = false;
    setIsCreatingRoom(true);

    (async () => {
      try {
        const roomId = await matrixClient.getOrCreateDirectRoom(
          pendingPeerID,
          pendingPeerDisplayName ?? undefined
        );
        if (cancelled) return;

        if (roomId) {
          const allRooms = patchPendingDirectRoom(await matrixClient.getRooms(), roomId, {
            peerID: pendingPeerID,
            currentUserId,
            displayName: pendingPeerDisplayName,
          });
          const roomSnapshot = allRooms.find(room => room.roomId === roomId);
          if (!cancelled) {
            setRooms(allRooms.filter(r => r.membership !== 'invite'));
            setInvites(allRooms.filter(r => r.membership === 'invite'));
            setCurrentRoom(roomId);
          }

          if (pendingPeerID) {
            try {
              // Await once so profile hydration can patch avatar/name before
              // pending peer state is cleared and this effect is cleaned up.
              await hydratePendingDirectRoomProfile(
                roomId,
                pendingPeerID,
                currentUserId,
                pendingPeerDisplayName,
                roomSnapshot,
                updateRoomRef.current,
                () => cancelled
              );
            } catch (err) {
              console.warn('[ChatDrawer] Failed to hydrate DM profile:', err);
            }
          }
        }
      } catch (err) {
        console.error('[ChatDrawer] Failed to open DM with peer:', err);
        if (!cancelled) {
          toast({
            title: t('common.error'),
            description: t('chat.createConversationFailed'),
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) {
          setIsCreatingRoom(false);
          clearPendingPeer();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    pendingPeerID,
    pendingPeerDisplayName,
    clearPendingPeer,
    setRooms,
    setInvites,
    setCurrentRoom,
    setIsCreatingRoom,
    currentUserId,
    toast,
    t,
  ]);

  // ---- 2. Room selected → mark read + load messages + read receipts ----
  useEffect(() => {
    if (!currentRoomId) return;

    let cancelled = false;
    const roomId = currentRoomId;
    let decryptionRetryTimer: ReturnType<typeof setTimeout> | null = null;

    updateRoom(roomId, { unreadCount: 0 });
    useChatStore.getState().markRoomAsRead(roomId);

    const room = useChatStore.getState().rooms.find(r => r.roomId === roomId);
    const lastEventId = room?.lastMessage?.id;
    if (lastEventId) {
      matrixClient.markRoomAsRead(roomId, lastEventId).catch(err => {
        console.warn('[ChatDrawer] Failed to send read receipt:', err);
      });
    }

    matrixClient
      .getReadReceiptForRoom(roomId)
      .then(receipts => {
        if (cancelled) return;
        const msgs = useChatStore.getState().messages[roomId];
        if (!msgs) return;
        const otherReceipts = Object.entries(receipts).filter(([uid]) => uid !== currentUserId);
        if (otherReceipts.length === 0) return;

        const latestReadEventIds = new Set(otherReceipts.map(([, eid]) => eid));
        let found = false;
        for (let i = msgs.length - 1; i >= 0; i--) {
          const msg = msgs[i];
          if (latestReadEventIds.has(msg.id)) found = true;
          if (found && msg.sender === currentUserId && msg.status !== 'read') {
            useChatStore.getState().updateMessage(roomId, msg.id, { status: 'read' as const });
          }
        }
      })
      .catch(() => {});

    if (loadedRoomsRef.current.has(roomId)) return;

    const scheduleTransientDecryptRetry = () => {
      const retryCount = decryptionRetryCountRef.current.get(roomId) || 0;
      if (retryCount >= 1 || decryptionRetryTimer) return;

      decryptionRetryCountRef.current.set(roomId, retryCount + 1);
      decryptionRetryTimer = setTimeout(() => {
        matrixClient
          .getMessages(roomId, 50)
          .then(messages => {
            if (cancelled) return;
            setMessages(roomId, messages);
            if (!hasTransientDecryptionFailure(messages)) {
              decryptionRetryCountRef.current.delete(roomId);
            }
          })
          .catch(error => {
            console.warn('[ChatDrawer] Failed to retry message decryption:', error);
          })
          .finally(() => {
            decryptionRetryTimer = null;
          });
      }, DECRYPTION_RETRY_DELAY_MS);
    };

    const loadMessages = async () => {
      try {
        const messages = await matrixClient.getMessages(roomId, 50);
        if (cancelled) return;
        setMessages(roomId, messages);
        loadedRoomsRef.current.add(roomId);
        if (hasTransientDecryptionFailure(messages)) {
          scheduleTransientDecryptRetry();
        } else {
          decryptionRetryCountRef.current.delete(roomId);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('[ChatDrawer] Failed to load messages:', error);
        }
      }
    };

    loadMessages();

    return () => {
      cancelled = true;
      if (decryptionRetryTimer) clearTimeout(decryptionRetryTimer);
    };
  }, [currentRoomId, setMessages, updateRoom, currentUserId]);

  // ---- 3. Read receipt event listener ----
  useEffect(() => {
    if (!currentRoomId || !currentUserId) return;

    const handleReadReceipt = (data: unknown) => {
      const { roomId, userId, eventId } = data as {
        roomId: string;
        userId: string;
        eventId: string;
      };
      void userId; // used only to destructure, receipt is from another user
      if (roomId !== currentRoomId) return;

      const msgs = useChatStore.getState().messages[roomId];
      if (!msgs) return;

      let found = false;
      for (let i = msgs.length - 1; i >= 0; i--) {
        const msg = msgs[i];
        if (msg.id === eventId) found = true;
        if (found && msg.sender === currentUserId && msg.status !== 'read') {
          useChatStore.getState().updateMessage(roomId, msg.id, { status: 'read' as const });
        }
      }
    };

    const unsub = matrixEvents.on(MATRIX_EVENTS.READ_RECEIPT, handleReadReceipt);
    return () => {
      unsub();
    };
  }, [currentRoomId, currentUserId]);

  // ---- 3b. Reconnect → refetch current room messages ----
  useEffect(() => {
    if (!currentRoomId) return;
    const roomId = currentRoomId;

    const handleReconnect = () => {
      loadedRoomsRef.current.delete(roomId);
      matrixClient
        .getMessages(roomId, 50)
        .then(messages => {
          setMessages(roomId, messages);
          loadedRoomsRef.current.add(roomId);
          if (!hasTransientDecryptionFailure(messages)) {
            decryptionRetryCountRef.current.delete(roomId);
          }
        })
        .catch(err => {
          console.warn('[ChatDrawer] Failed to refetch messages after reconnect:', err);
        });
    };

    const unsub = matrixEvents.on(MATRIX_EVENTS.CONNECTED, handleReconnect);
    return () => {
      unsub();
    };
  }, [currentRoomId, setMessages]);

  // ---- 4. Upload progress tracking ----
  useEffect(() => {
    const handleUploadProgress = (raw: unknown) => {
      const data = raw as { localId: string; roomId: string; progress: number };
      if (!data?.localId || !data?.roomId) return;
      useChatStore.getState().updateMessage(data.roomId, data.localId, {
        uploadProgress: data.progress,
      });
    };

    const unsub = matrixEvents.on(MATRIX_EVENTS.UPLOAD_PROGRESS, handleUploadProgress);
    return () => {
      unsub();
    };
  }, []);

  // ---- 5. Remote edit events ----
  useEffect(() => {
    const handleRemoteEdit = (raw: unknown) => {
      const data = raw as { roomId: string; eventId: string; newContent: string };
      if (!data?.roomId || !data?.eventId) return;
      useChatStore.getState().updateMessage(data.roomId, data.eventId, {
        content: data.newContent,
        isEdited: true,
      });
    };
    const unsub = matrixEvents.on(MATRIX_EVENTS.MESSAGE_EDITED, handleRemoteEdit);
    return () => {
      unsub();
    };
  }, []);

  // ---- 6. Remote reaction events ----
  useEffect(() => {
    const handleRemoteReaction = (raw: unknown) => {
      const data = raw as { roomId: string; eventId: string; emoji: string; sender: string };
      if (!data?.roomId || !data?.eventId || !data?.emoji) return;
      const store = useChatStore.getState();
      const msgs = store.messages[data.roomId] || [];
      const msg = msgs.find(m => m.id === data.eventId);
      const existing = msg?.reactions || {};
      const senders = existing[data.emoji] || [];
      if (!senders.includes(data.sender)) {
        store.updateMessage(data.roomId, data.eventId, {
          reactions: { ...existing, [data.emoji]: [...senders, data.sender] },
        });
      }
    };
    const unsub = matrixEvents.on(MATRIX_EVENTS.MESSAGE_REACTION, handleRemoteReaction);
    return () => {
      unsub();
    };
  }, []);

  // ---- 7. Verification Matrix event listeners ----
  useEffect(() => {
    let autoCloseTimer: ReturnType<typeof setTimeout> | null = null;

    // Backend sends: { transactionId, userId, deviceId }
    const unsubRequest = matrixEvents.on(
      MATRIX_EVENTS.VERIFICATION_REQUEST_RECEIVED,
      (raw: unknown) => {
        const data = raw as { transactionId?: string; userId?: string };
        if (!data?.transactionId) return;
        setVerificationTxnId(data.transactionId);
        setVerificationUserId(data.userId || null);
        setVerificationPhase('request');
        setVerificationOpen(true);
      }
    );

    // Backend sends: { transactionId } — other party accepted, auto-start SAS
    const unsubReady = matrixEvents.on(MATRIX_EVENTS.VERIFICATION_READY, (raw: unknown) => {
      const data = raw as { transactionId?: string };
      if (!data?.transactionId) return;
      setVerificationPhase('waiting');
      matrixClient.startSAS(data.transactionId).catch(() => {});
    });

    // Backend sends: { transactionId, emojis: [{emoji, description}, ...], decimals }
    const unsubSas = matrixEvents.on(MATRIX_EVENTS.VERIFICATION_SHOW_SAS, (raw: unknown) => {
      const data = raw as {
        transactionId?: string;
        emojis?: Array<{ emoji: string; description: string }>;
      };
      if (!data?.emojis?.length) return;
      const emojiPairs: Array<[string, string]> = data.emojis.map(e => [e.emoji, e.description]);
      setVerificationEmoji(emojiPairs);
      setVerificationPhase('sas');
      setVerificationOpen(true);
    });

    const unsubCompleted = matrixEvents.on(MATRIX_EVENTS.VERIFICATION_COMPLETED, () => {
      setVerificationPhase('completed');
      autoCloseTimer = setTimeout(resetVerification, 2500);
    });

    const unsubCancelled = matrixEvents.on(MATRIX_EVENTS.VERIFICATION_CANCELLED, () => {
      setVerificationPhase('cancelled');
      autoCloseTimer = setTimeout(resetVerification, 2500);
    });

    return () => {
      unsubRequest();
      unsubReady();
      unsubSas();
      unsubCompleted();
      unsubCancelled();
      if (autoCloseTimer) clearTimeout(autoCloseTimer);
    };
  }, [
    resetVerification,
    setVerificationOpen,
    setVerificationPhase,
    setVerificationUserId,
    setVerificationTxnId,
    setVerificationEmoji,
  ]);
}
