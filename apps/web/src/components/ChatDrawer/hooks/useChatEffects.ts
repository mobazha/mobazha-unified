import { useEffect, useRef } from 'react';
import { useChatStore, matrixClient, matrixEvents, MATRIX_EVENTS } from '@mobazha/core';
import type { MatrixRoom } from '@mobazha/core';
import type { VerificationPhase } from '../VerificationDialog';

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
    setVerificationEmoji,
    resetVerification,
    toast,
    t,
  } = params;

  // Track rooms that already had initial messages loaded
  const loadedRoomsRef = useRef<Set<string>>(new Set());

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
          const allRooms = await matrixClient.getRooms();
          if (!cancelled) {
            setRooms(allRooms.filter(r => r.membership !== 'invite'));
            setInvites(allRooms.filter(r => r.membership === 'invite'));
            setCurrentRoom(roomId);
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
    toast,
    t,
  ]);

  // ---- 2. Room selected → mark read + load messages + read receipts ----
  useEffect(() => {
    if (!currentRoomId) return;

    matrixClient
      .markRoomAsRead(currentRoomId)
      .then(success => {
        if (success) updateRoom(currentRoomId, { unreadCount: 0 });
      })
      .catch(err => {
        console.warn('[ChatDrawer] Failed to mark room as read:', err);
      });

    matrixClient
      .getReadReceiptForRoom(currentRoomId)
      .then(receipts => {
        const msgs = useChatStore.getState().messages[currentRoomId];
        if (!msgs) return;
        const otherReceipts = Object.entries(receipts).filter(([uid]) => uid !== currentUserId);
        if (otherReceipts.length === 0) return;

        const latestReadEventIds = new Set(otherReceipts.map(([, eid]) => eid));
        let found = false;
        for (let i = msgs.length - 1; i >= 0; i--) {
          const msg = msgs[i];
          if (latestReadEventIds.has(msg.id)) found = true;
          if (found && msg.sender === currentUserId && msg.status !== 'read') {
            useChatStore
              .getState()
              .updateMessage(currentRoomId, msg.id, { status: 'read' as const });
          }
        }
      })
      .catch(() => {});

    if (loadedRoomsRef.current.has(currentRoomId)) return;

    const loadMessages = async () => {
      try {
        const messages = await matrixClient.getMessages(currentRoomId, 50);
        setMessages(currentRoomId, messages);
        loadedRoomsRef.current.add(currentRoomId);
      } catch (error) {
        console.error('[ChatDrawer] Failed to load messages:', error);
      }
    };

    loadMessages();
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

    const unsubRequest = matrixEvents.on(
      MATRIX_EVENTS.VERIFICATION_REQUEST_RECEIVED,
      (raw: unknown) => {
        const data = raw as { otherUserId: string };
        if (!data?.otherUserId) return;
        setVerificationUserId(data.otherUserId);
        setVerificationPhase('request');
        setVerificationOpen(true);
      }
    );

    const unsubSas = matrixEvents.on(MATRIX_EVENTS.VERIFICATION_SHOW_SAS, (raw: unknown) => {
      const data = raw as { emoji: Array<[string, string]> };
      if (!data?.emoji) return;
      setVerificationEmoji(data.emoji);
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
    setVerificationEmoji,
  ]);
}
