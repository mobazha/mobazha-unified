'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type RefCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import {
  useI18n,
  useChatStore,
  matrixClient,
  matrixEvents,
  MATRIX_EVENTS,
  isMatrixEnabled,
  formatUserName,
  getMemberPresentation,
  getMessageSenderPresentation,
  type DisplayOrder,
  type DisplayOrderStatus,
  type DisplayUserRole,
} from '@mobazha/core';
import type { MatrixMessage } from '@mobazha/core';
import { toDisplayMessage } from '@/components/ChatDrawer/hooks/useChatViewLogic';
import type { Message } from '@/components/Chat/ChatMessages';
import type { OrderChatParticipant } from '@/components/Order/OrderChat';

export interface OrderChatQuickChip {
  id: string;
  label: string;
  message: string;
}

export interface UseOrderChatParams {
  orderId: string;
  displayOrder: DisplayOrder | null | undefined;
  currentUserPeerID: string | null;
  /** When true, loads Matrix room messages and marks read */
  isActive: boolean;
}

export interface UseOrderChatReturn {
  participants: OrderChatParticipant[];
  messages: Message[];
  currentUserId: string;
  roomId: string | null;
  isEncrypted: boolean;
  isLoading: boolean;
  isRoomLoading: boolean;
  isConnected: boolean;
  composerReady: boolean;
  connectionStatusHint: 'connecting' | 'reconnecting' | 'liveUpdatesPending' | null;
  matrixAvailable: boolean;
  unreadCount: number;
  typingUsers: string[];
  memberNameMap: Record<string, string>;
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  quickChips: OrderChatQuickChip[];
  counterpartySubtitle: string;
  composerRef: RefCallback<HTMLInputElement | null>;
  onSendMessage: (content: string) => void;
  onSendFile?: (file: File) => void;
  onTyping?: (isTyping: boolean) => void;
  onRetryMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onLoadMore: () => void;
  focusComposer: () => void;
}

function buildParticipants(
  displayOrder: DisplayOrder,
  currentUserPeerID: string | null,
  t: (key: string) => string
): OrderChatParticipant[] {
  const list: OrderChatParticipant[] = [];
  const roleLabel = (role: DisplayUserRole) => {
    if (role === 'seller') return t('order.chat.roleSeller');
    if (role === 'buyer') return t('order.chat.roleBuyer');
    return t('order.chat.roleModerator');
  };

  if (displayOrder.vendor) {
    const peerID = displayOrder.vendor.peerID || '';
    list.push({
      id: peerID || 'vendor',
      peerID,
      name: formatUserName(
        { name: displayOrder.vendor.name, peerID },
        { fallback: t('order.chat.roleSeller') }
      ),
      avatar: displayOrder.vendor.avatar,
      role: 'seller',
      roleLabel: roleLabel('seller'),
      isSelf: peerID === currentUserPeerID,
    });
  }
  if (displayOrder.buyer) {
    const peerID = displayOrder.buyer.peerID || '';
    list.push({
      id: peerID || 'buyer',
      peerID,
      name: formatUserName(
        { name: displayOrder.buyer.name, peerID },
        { fallback: t('order.chat.roleBuyer') }
      ),
      avatar: displayOrder.buyer.avatar,
      role: 'buyer',
      roleLabel: roleLabel('buyer'),
      isSelf: peerID === currentUserPeerID,
    });
  }
  if (displayOrder.moderator) {
    const peerID = displayOrder.moderator.id || '';
    list.push({
      id: peerID || 'moderator',
      peerID,
      name: formatUserName(
        { name: displayOrder.moderator.name, peerID },
        { fallback: t('order.chat.roleModerator') }
      ),
      avatar: displayOrder.moderator.avatar,
      role: 'moderator',
      roleLabel: roleLabel('moderator'),
      isSelf: peerID === currentUserPeerID,
    });
  }
  return list;
}

function quickChipsForOrder(
  status: DisplayOrderStatus | undefined,
  userRole: DisplayUserRole | undefined,
  t: (key: string) => string
): OrderChatQuickChip[] {
  if (!status || !userRole) return [];

  const chip = (id: string, labelKey: string, messageKey: string): OrderChatQuickChip => ({
    id,
    label: t(labelKey),
    message: t(messageKey),
  });

  if (userRole === 'buyer') {
    switch (status) {
      case 'awaiting_payment':
        return [chip('pay', 'order.chat.chip.payIssue', 'order.chat.chip.payIssueMsg')];
      case 'paid':
      case 'processing':
        return [chip('ship', 'order.chat.chip.whenShip', 'order.chat.chip.whenShipMsg')];
      case 'shipped':
        return [
          chip('track', 'order.chat.chip.tracking', 'order.chat.chip.trackingMsg'),
          chip('received', 'order.chat.chip.received', 'order.chat.chip.receivedMsg'),
        ];
      case 'completed':
        return [chip('after', 'order.chat.chip.afterSale', 'order.chat.chip.afterSaleMsg')];
      case 'disputed':
        return [
          chip('dispute', 'order.chat.chip.disputeUpdate', 'order.chat.chip.disputeUpdateMsg'),
        ];
      default:
        return [chip('hello', 'order.chat.chip.hello', 'order.chat.chip.helloMsg')];
    }
  }

  if (userRole === 'seller') {
    switch (status) {
      case 'paid':
      case 'processing':
        return [chip('shipSoon', 'order.chat.chip.shipSoon', 'order.chat.chip.shipSoonMsg')];
      case 'shipped':
        return [chip('track', 'order.chat.chip.shareTracking', 'order.chat.chip.shareTrackingMsg')];
      case 'disputed':
        return [chip('dispute', 'order.chat.chip.disputeReply', 'order.chat.chip.disputeReplyMsg')];
      default:
        return [chip('thanks', 'order.chat.chip.thanks', 'order.chat.chip.thanksMsg')];
    }
  }

  return [chip('hello', 'order.chat.chip.hello', 'order.chat.chip.helloMsg')];
}

let orderChatLocalIdCounter = 0;

function nextOrderChatLocalId(): string {
  return `local_${Date.now()}_${++orderChatLocalIdCounter}`;
}

export function useOrderChat({
  orderId,
  displayOrder,
  currentUserPeerID,
  isActive,
}: UseOrderChatParams): UseOrderChatReturn {
  const { t } = useI18n();
  const { toast } = useToast();
  const composerInputRef = useRef<HTMLInputElement | null>(null);
  const composerRef = useCallback<RefCallback<HTMLInputElement | null>>(el => {
    composerInputRef.current = el;
  }, []);
  const loadedRoomsRef = useRef<Set<string>>(new Set());
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isRoomLoading, setIsRoomLoading] = useState(false);
  const [restReady, setRestReady] = useState(() => matrixClient.isServiceReady());

  const matrixAvailable = isMatrixEnabled();
  const isConnected = useChatStore(state => state.isConnected);
  const isChatInitializing = useChatStore(state => state.isInitializing);
  const rooms = useChatStore(state => state.rooms);
  const allMessages = useChatStore(state => state.messages);
  const loadingMessages = useChatStore(state => state.loadingMessages);
  const hasMoreMessagesMap = useChatStore(state => state.hasMoreMessages);
  const typingUsersMap = useChatStore(state => state.typingUsers);
  const setMessages = useChatStore(state => state.setMessages);
  const prependMessages = useChatStore(state => state.prependMessages);
  const setLoadingMessages = useChatStore(state => state.setLoadingMessages);
  const setHasMoreMessages = useChatStore(state => state.setHasMoreMessages);
  const updateRoom = useChatStore(state => state.updateRoom);
  const addRoom = useChatStore(state => state.addRoom);
  const setEmbeddedVisibleRoomId = useChatStore(state => state.setEmbeddedVisibleRoomId);

  const effectiveCurrentUserId = matrixClient.getUserId() || currentUserPeerID || '';

  const participants = useMemo(
    () => (displayOrder ? buildParticipants(displayOrder, currentUserPeerID, t) : []),
    [displayOrder, currentUserPeerID, t]
  );

  const participantPeerIDs = useMemo(() => {
    const ids = new Set<string>();
    if (currentUserPeerID) ids.add(currentUserPeerID);
    if (displayOrder?.vendor?.peerID) ids.add(displayOrder.vendor.peerID);
    if (displayOrder?.buyer?.peerID) ids.add(displayOrder.buyer.peerID);
    if (displayOrder?.moderator?.id) ids.add(displayOrder.moderator.id);
    return Array.from(ids).filter(Boolean);
  }, [displayOrder, currentUserPeerID]);

  const counterparty = useMemo(() => {
    if (!displayOrder) return null;
    return displayOrder.userRole === 'buyer' ? displayOrder.vendor : displayOrder.buyer;
  }, [displayOrder]);

  const counterpartySubtitle = useMemo(() => {
    if (!counterparty) return '';
    const name = formatUserName(
      { name: counterparty.name, peerID: counterparty.peerID },
      {
        fallback:
          displayOrder?.userRole === 'buyer'
            ? t('order.chat.roleSeller')
            : t('order.chat.roleBuyer'),
      }
    );
    const role =
      displayOrder?.userRole === 'buyer' ? t('order.chat.roleSeller') : t('order.chat.roleBuyer');
    return t('order.chat.withCounterparty', { name, role });
  }, [counterparty, displayOrder?.userRole, t]);

  const quickChips = useMemo(
    () => quickChipsForOrder(displayOrder?.status, displayOrder?.userRole, t),
    [displayOrder?.status, displayOrder?.userRole, t]
  );

  const matrixRoom = useMemo(
    () => rooms.find(r => r.roomId === roomId) ?? rooms.find(r => r.orderId === orderId),
    [rooms, roomId, orderId]
  );

  const unreadCount = isActive && roomId ? 0 : (matrixRoom?.unreadCount ?? 0);

  // Tell Matrix sync that order-detail discussion is an active read surface (not drawer).
  useEffect(() => {
    if (isActive && roomId) {
      setEmbeddedVisibleRoomId(roomId);
      return () => setEmbeddedVisibleRoomId(null);
    }
    setEmbeddedVisibleRoomId(null);
  }, [isActive, roomId, setEmbeddedVisibleRoomId]);

  // Re-check REST readiness when connection state changes (init may complete without WS).
  useEffect(() => {
    if (matrixClient.isServiceReady()) {
      setRestReady(true);
    }
  }, [isConnected, isChatInitializing]);

  // Ensure Matrix REST + WS when discussion tab is open (idempotent with AuthProvider).
  useEffect(() => {
    if (!matrixAvailable || !currentUserPeerID || !isActive) return;

    let cancelled = false;

    (async () => {
      try {
        const ok = await matrixClient.initializeWithPeerID(currentUserPeerID);
        if (cancelled || !ok) return;

        if (matrixClient.isServiceReady()) {
          setRestReady(true);
        }

        const store = useChatStore.getState();
        if (!store.isConnected) {
          try {
            await matrixClient.startSync();
            if (!cancelled) store.setConnected(true);
          } catch (syncErr) {
            console.warn('[OrderChat] Live sync unavailable; REST chat still works:', syncErr);
          }
        }
      } catch (err) {
        console.warn('[OrderChat] Matrix ensure ready failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [matrixAvailable, currentUserPeerID, isActive]);

  // Resolve or create order room only when the discussion surface is opened.
  useEffect(() => {
    if (!isActive) {
      setRoomId(null);
      setIsRoomLoading(false);
      return;
    }

    if (!matrixAvailable || !displayOrder || participantPeerIDs.length < 2) {
      setRoomId(null);
      setIsRoomLoading(false);
      return;
    }

    if (!restReady) {
      setIsRoomLoading(true);
      return;
    }

    let cancelled = false;
    setIsRoomLoading(true);

    (async () => {
      try {
        let room = await matrixClient.getOrderRoom(orderId);
        if (!room && participantPeerIDs.length >= 2) {
          const newRoomId = await matrixClient.createOrderRoom(orderId, participantPeerIDs, {
            title: displayOrder.items?.[0]?.title,
            vendorId: displayOrder.vendor?.peerID,
            buyerId: displayOrder.buyer?.peerID,
            orderState: displayOrder.status,
          });
          if (newRoomId) {
            const refreshed = await matrixClient.getRooms();
            if (!cancelled) {
              useChatStore.getState().setRooms(refreshed.filter(r => r.membership !== 'invite'));
            }
            room = refreshed.find(r => r.roomId === newRoomId) ?? null;
          }
        }
        if (cancelled) return;
        if (room) {
          setRoomId(room.roomId);
          const productTitle = displayOrder.items?.[0]?.title;
          updateRoom(room.roomId, {
            orderId,
            name: room.name || (productTitle ? `Order: ${productTitle}` : room.name),
            metadata: {
              ...room.metadata,
              orderId,
              type: room.metadata?.type || 'order',
              orderState: displayOrder.status,
              title: productTitle,
              vendorId: displayOrder.vendor?.peerID,
              buyerId: displayOrder.buyer?.peerID,
            },
          });
          const existing = useChatStore.getState().rooms.some(r => r.roomId === room!.roomId);
          if (!existing) addRoom(room);
        } else {
          setRoomId(null);
        }
      } catch (err) {
        console.warn('[OrderChat] Failed to resolve order room:', err);
        if (!cancelled) setRoomId(null);
      } finally {
        if (!cancelled) setIsRoomLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isActive,
    matrixAvailable,
    restReady,
    displayOrder,
    orderId,
    participantPeerIDs,
    addRoom,
    updateRoom,
  ]);

  // Load messages + mark read when tab active
  useEffect(() => {
    if (!isActive || !roomId || !matrixAvailable) return;

    let cancelled = false;
    const activeRoomId = roomId;

    updateRoom(activeRoomId, { unreadCount: 0 });
    useChatStore.getState().markRoomAsRead(activeRoomId);

    const room = useChatStore.getState().rooms.find(r => r.roomId === activeRoomId);
    const lastEventId = room?.lastMessage?.id;
    if (lastEventId) {
      matrixClient.markRoomAsRead(activeRoomId, lastEventId).catch(() => {});
    }

    if (loadedRoomsRef.current.has(activeRoomId)) return;

    const loadMessages = async () => {
      try {
        const messages = await matrixClient.getMessages(activeRoomId, 50);
        if (cancelled) return;
        setMessages(activeRoomId, messages);
        loadedRoomsRef.current.add(activeRoomId);
        setHasMoreMessages(activeRoomId, messages.length >= 50);
      } catch (error) {
        if (!cancelled) console.error('[OrderChat] Failed to load messages:', error);
      }
    };

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [isActive, roomId, matrixAvailable, setMessages, setHasMoreMessages, updateRoom]);

  const lastIncomingMessageId = useMemo(() => {
    if (!roomId) return undefined;
    const roomMessages = allMessages[roomId];
    if (!roomMessages?.length) return undefined;
    for (let i = roomMessages.length - 1; i >= 0; i--) {
      const msg = roomMessages[i];
      if (msg.sender !== effectiveCurrentUserId && msg.id) return msg.id;
    }
    return undefined;
  }, [roomId, allMessages, effectiveCurrentUserId]);

  // Mark read when new messages arrive while discussion tab is open
  useEffect(() => {
    if (!isActive || !roomId || !matrixAvailable || !lastIncomingMessageId) return;

    updateRoom(roomId, { unreadCount: 0 });
    useChatStore.getState().markRoomAsRead(roomId);
    matrixClient.markRoomAsRead(roomId, lastIncomingMessageId).catch(() => {});
  }, [isActive, roomId, matrixAvailable, lastIncomingMessageId, updateRoom]);

  // Read receipts for active room
  useEffect(() => {
    if (!isActive || !roomId || !effectiveCurrentUserId) return;

    const handleReadReceipt = (data: unknown) => {
      const { roomId: rid, eventId } = data as { roomId: string; userId: string; eventId: string };
      if (rid !== roomId) return;
      const msgs = useChatStore.getState().messages[rid];
      if (!msgs) return;
      let found = false;
      for (let i = msgs.length - 1; i >= 0; i--) {
        const msg = msgs[i];
        if (msg.id === eventId) found = true;
        if (found && msg.sender === effectiveCurrentUserId && msg.status !== 'read') {
          useChatStore.getState().updateMessage(rid, msg.id, { status: 'read' as const });
        }
      }
    };

    const unsub = matrixEvents.on(MATRIX_EVENTS.READ_RECEIPT, handleReadReceipt);
    return () => unsub();
  }, [isActive, roomId, effectiveCurrentUserId]);

  const memberNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (matrixRoom?.members) {
      for (const m of matrixRoom.members) {
        if (m.userId) {
          map[m.userId] = getMemberPresentation(m, matrixRoom).displayName;
        }
      }
    }
    return map;
  }, [matrixRoom]);

  const messages: Message[] = useMemo(() => {
    if (!roomId) return [];
    const roomMessages = allMessages[roomId];
    if (!roomMessages) return [];
    return roomMessages.map(message => {
      const senderPresentation = getMessageSenderPresentation(
        matrixRoom,
        message.sender,
        effectiveCurrentUserId,
        {
          displayName: message.senderName,
          avatarUrl: message.senderAvatar,
          rawMxcAvatarUrl: message.senderRawMxcAvatarUrl,
        }
      );
      return toDisplayMessage(message, {
        senderName: senderPresentation.displayName,
        senderAvatar: senderPresentation.avatarUrl,
        senderRawMxcAvatarUrl: senderPresentation.rawMxcAvatarUrl,
      });
    });
  }, [roomId, allMessages, matrixRoom, effectiveCurrentUserId]);

  const typingUsers = roomId ? typingUsersMap[roomId] || [] : [];
  const isLoading = isRoomLoading || Boolean(roomId && loadingMessages[roomId]);
  const hasMoreMessages = roomId ? (hasMoreMessagesMap[roomId] ?? false) : false;
  const isLoadingMore = roomId ? (loadingMessages[roomId] ?? false) : false;

  const onLoadMore = useCallback(async () => {
    if (!roomId || loadingMessages[roomId]) return;
    setLoadingMessages(roomId, true);
    try {
      const olderMessages = await matrixClient.loadOlderMessages(roomId, 50);
      if (olderMessages.length > 0) prependMessages(roomId, olderMessages);
      setHasMoreMessages(roomId, olderMessages.length > 0);
    } catch (err) {
      console.warn('[OrderChat] Failed to load more messages:', err);
    } finally {
      setLoadingMessages(roomId, false);
    }
  }, [roomId, loadingMessages, setLoadingMessages, prependMessages, setHasMoreMessages]);

  const onSendMessage = useCallback(
    async (content: string) => {
      if (!roomId) {
        toast({
          title: t('common.error'),
          description: t('order.chat.roomUnavailable'),
          variant: 'destructive',
        });
        return;
      }
      const localId = nextOrderChatLocalId();
      const optimistic: MatrixMessage = {
        id: localId,
        localId,
        roomId,
        sender: effectiveCurrentUserId,
        content,
        type: 'text',
        timestamp: Date.now(),
        status: 'sending',
      };
      useChatStore.getState().addMessage(roomId, optimistic);
      try {
        const result = await matrixClient.sendMessage(roomId, content, localId);
        if (result) {
          useChatStore.getState().updateMessage(roomId, localId, {
            id: result.id,
            status: 'sent',
          });
        } else {
          useChatStore.getState().updateMessage(roomId, localId, { status: 'failed' });
        }
      } catch {
        useChatStore.getState().updateMessage(roomId, localId, { status: 'failed' });
        toast({
          title: t('common.error'),
          description: t('order.chat.sendFailed'),
          variant: 'destructive',
        });
      }
    },
    [roomId, effectiveCurrentUserId, toast, t]
  );

  const onSendFile = useCallback(
    async (file: File) => {
      if (!roomId) return;
      const MAX_CHAT_FILE_SIZE = 50 * 1024 * 1024;
      if (file.size > MAX_CHAT_FILE_SIZE) {
        toast({
          title: t('common.error'),
          description: t('chat.chatFileTooLarge'),
          variant: 'destructive',
        });
        return;
      }
      const localId = nextOrderChatLocalId();
      let messageType: MatrixMessage['type'] = 'file';
      if (file.type.startsWith('image/')) messageType = 'image';
      else if (file.type.startsWith('audio/')) messageType = 'audio';
      else if (file.type.startsWith('video/')) messageType = 'video';
      const localUrl = messageType === 'image' ? URL.createObjectURL(file) : undefined;
      const placeholder: MatrixMessage = {
        id: localId,
        localId,
        roomId,
        sender: effectiveCurrentUserId,
        content: file.name || 'file',
        type: messageType,
        timestamp: Date.now(),
        status: 'sending',
        uploadProgress: 0,
        attachments: [
          {
            url: localUrl || '',
            filename: file.name || 'file',
            mimetype: file.type,
            size: file.size,
          },
        ],
      };
      const store = useChatStore.getState();
      store.addMessage(roomId, placeholder);
      try {
        const result = file.type.startsWith('image/')
          ? await matrixClient.sendImage(roomId, file, localId)
          : await matrixClient.sendFile(roomId, file, localId);
        if (result) {
          store.updateMessage(roomId, localId, {
            id: result.id,
            status: 'sent',
            uploadProgress: undefined,
            attachments: result.attachments,
          });
        }
      } catch {
        store.updateMessage(roomId, localId, { status: 'failed', uploadProgress: undefined });
        toast({
          title: t('common.error'),
          description: t('chat.sendFileFailed'),
          variant: 'destructive',
        });
      } finally {
        if (localUrl) URL.revokeObjectURL(localUrl);
      }
    },
    [roomId, effectiveCurrentUserId, toast, t]
  );

  const onTyping = useCallback(
    (isTyping: boolean) => {
      if (roomId) void matrixClient.sendTyping(roomId, isTyping);
    },
    [roomId]
  );

  const onRetryMessage = useCallback(
    async (messageId: string) => {
      if (!roomId) return;
      const roomMessages = allMessages[roomId];
      const failedMsg = roomMessages?.find(m => m.id === messageId || m.localId === messageId);
      if (!failedMsg) return;
      const update = useChatStore.getState().updateMessage;
      update(roomId, messageId, { status: 'sending' });
      try {
        const result = await matrixClient.sendMessage(
          roomId,
          failedMsg.content,
          failedMsg.localId || messageId
        );
        if (result) update(roomId, messageId, { id: result.id, status: 'sent' });
        else update(roomId, messageId, { status: 'failed' });
      } catch {
        update(roomId, messageId, { status: 'failed' });
      }
    },
    [roomId, allMessages]
  );

  const onDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!roomId) return;
      try {
        await matrixClient.redactEvent(roomId, messageId);
        useChatStore.getState().removeMessage(roomId, messageId);
      } catch {
        toast({
          title: t('common.error'),
          description: t('chat.deleteFailed'),
          variant: 'destructive',
        });
      }
    },
    [roomId, toast, t]
  );

  const focusComposer = useCallback(() => {
    window.setTimeout(() => {
      composerInputRef.current?.focus();
    }, 0);
  }, []);

  const composerReady = matrixAvailable && Boolean(roomId) && restReady;
  const wsConnected = isConnected;

  const connectionStatusHint = useMemo(():
    | 'connecting'
    | 'reconnecting'
    | 'liveUpdatesPending'
    | null => {
    if (!matrixAvailable || !isActive) return null;
    if (isRoomLoading || isChatInitializing || !restReady) return 'connecting';
    if (!roomId) return null;
    if (!wsConnected) return 'liveUpdatesPending';
    return null;
  }, [
    matrixAvailable,
    isActive,
    isRoomLoading,
    isChatInitializing,
    roomId,
    restReady,
    wsConnected,
  ]);

  return {
    participants,
    messages,
    currentUserId: effectiveCurrentUserId,
    roomId,
    isEncrypted: matrixRoom?.isEncrypted ?? matrixAvailable,
    isLoading,
    isRoomLoading,
    isConnected: wsConnected,
    composerReady,
    connectionStatusHint,
    matrixAvailable,
    unreadCount,
    typingUsers,
    memberNameMap,
    hasMoreMessages,
    isLoadingMore,
    quickChips,
    counterpartySubtitle,
    composerRef,
    onSendMessage,
    onSendFile: composerReady ? onSendFile : undefined,
    onTyping: composerReady ? onTyping : undefined,
    onRetryMessage: matrixAvailable ? onRetryMessage : undefined,
    onDeleteMessage: matrixAvailable ? onDeleteMessage : undefined,
    onLoadMore,
    focusComposer,
  };
}
