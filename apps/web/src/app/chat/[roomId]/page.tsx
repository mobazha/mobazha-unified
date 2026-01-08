'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components';
import { ChatList, ChatMessages, ChatRoom, Message } from '@/components/Chat';

// Mock data - In real app, this would come from Matrix service
const mockRooms: ChatRoom[] = [
  {
    id: 'room1',
    name: 'TechGear Store',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    lastMessage: 'Your order has been shipped!',
    lastMessageTime: '2m ago',
    unreadCount: 2,
    isOnline: true,
    isEncrypted: true,
  },
  {
    id: 'room2',
    name: 'CryptoDesk',
    avatar: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=100&h=100&fit=crop',
    lastMessage: 'Sure, I can do 0.5 BTC at that rate',
    lastMessageTime: '1h ago',
    isOnline: true,
    isEncrypted: true,
  },
  {
    id: 'room3',
    name: 'DevPro Services',
    lastMessage: 'Thanks for your purchase!',
    lastMessageTime: '3h ago',
    isOnline: false,
    isEncrypted: true,
  },
  {
    id: 'room4',
    name: 'LeatherCraft',
    avatar: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=100&h=100&fit=crop',
    lastMessage: 'The wallet will be ready next week',
    lastMessageTime: 'Yesterday',
    isEncrypted: true,
  },
  {
    id: 'room5',
    name: 'GamerZone',
    lastMessage: 'Do you have Cherry MX Red switches?',
    lastMessageTime: '2d ago',
    isOnline: false,
    isEncrypted: false,
  },
];

const generateMockMessages = (roomId: string): Message[] => {
  const baseMessages: Record<string, Message[]> = {
    room1: [
      {
        id: 'msg1',
        content: 'Hi! I just placed an order for the Premium Headphones.',
        senderId: 'me',
        timestamp: '2024-01-20T10:00:00',
        status: 'read',
      },
      {
        id: 'msg2',
        content: "Hello! Thank you for your order. I'll prepare it right away.",
        senderId: 'vendor',
        senderName: 'TechGear Store',
        timestamp: '2024-01-20T10:05:00',
      },
      {
        id: 'msg3',
        content: 'Great! How long will shipping take?',
        senderId: 'me',
        timestamp: '2024-01-20T10:06:00',
        status: 'read',
      },
      {
        id: 'msg4',
        content:
          'Usually 3-5 business days for your location. I offer free express shipping for orders over $200!',
        senderId: 'vendor',
        senderName: 'TechGear Store',
        timestamp: '2024-01-20T10:08:00',
      },
      {
        id: 'msg5',
        content: 'Perfect, thanks for the info!',
        senderId: 'me',
        timestamp: '2024-01-20T10:10:00',
        status: 'delivered',
      },
      {
        id: 'msg6',
        content: "Your order has been shipped! Here's your tracking number: TG123456789",
        senderId: 'vendor',
        senderName: 'TechGear Store',
        timestamp: '2024-01-21T14:30:00',
      },
    ],
    room2: [
      {
        id: 'msg1',
        content: "I'm looking to buy 0.5 BTC. What's your rate?",
        senderId: 'me',
        timestamp: '2024-01-19T15:00:00',
        status: 'read',
      },
      {
        id: 'msg2',
        content: 'Current rate is $42,500 per BTC with 2% premium.',
        senderId: 'vendor',
        senderName: 'CryptoDesk',
        timestamp: '2024-01-19T15:02:00',
      },
      {
        id: 'msg3',
        content: 'Can you do 1.5% premium? I have good feedback on the platform.',
        senderId: 'me',
        timestamp: '2024-01-19T15:05:00',
        status: 'read',
      },
      {
        id: 'msg4',
        content: 'Sure, I can do 0.5 BTC at that rate',
        senderId: 'vendor',
        senderName: 'CryptoDesk',
        timestamp: '2024-01-19T15:10:00',
      },
    ],
    room3: [
      {
        id: 'sys1',
        content: 'Chat created for Order #DP-2024-0042',
        senderId: 'system',
        timestamp: '2024-01-18T09:00:00',
        isSystem: true,
      },
      {
        id: 'msg1',
        content: 'Hi, I need a custom smart contract audit for my DeFi project.',
        senderId: 'me',
        timestamp: '2024-01-18T09:01:00',
        status: 'read',
      },
      {
        id: 'msg2',
        content: "Sure! Please share the GitHub repo and I'll provide a quote.",
        senderId: 'vendor',
        senderName: 'DevPro Services',
        timestamp: '2024-01-18T09:30:00',
      },
      {
        id: 'msg3',
        content: 'Thanks for your purchase!',
        senderId: 'vendor',
        senderName: 'DevPro Services',
        timestamp: '2024-01-18T16:00:00',
      },
    ],
  };

  return baseMessages[roomId] || [];
};

export default function ChatRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [searchQuery, setSearchQuery] = useState('');
  // Initialize messages based on roomId - useMemo ensures recalculation when roomId changes
  const initialMessages = useMemo(() => generateMockMessages(roomId), [roomId]);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading] = useState(false);

  const currentRoom = mockRooms.find(r => r.id === roomId);

  // Sync messages when roomId changes (initialMessages will change)
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  const handleSendMessage = useCallback((content: string) => {
    const newMessage: Message = {
      id: `msg${Date.now()}`,
      content,
      senderId: 'me',
      timestamp: new Date().toISOString(),
      status: 'sending',
    };
    setMessages(prev => [...prev, newMessage]);

    // Simulate message status updates (in real app, this would come from Matrix events)
    const messageId = newMessage.id;
    setTimeout(() => {
      setMessages(prev =>
        prev.map(m => (m.id === messageId ? { ...m, status: 'sent' as const } : m))
      );
    }, 500);
    setTimeout(() => {
      setMessages(prev =>
        prev.map(m => (m.id === messageId ? { ...m, status: 'delivered' as const } : m))
      );
    }, 1500);
  }, []);

  const handleBack = () => {
    router.push('/chat');
  };

  if (!currentRoom) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Room not found</h2>
            <p className="text-slate-500 mb-4">
              The chat room you&apos;re looking for doesn&apos;t exist.
            </p>
            <button
              onClick={() => router.push('/chat')}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Back to Messages
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* Chat List - Hidden on mobile */}
        <div className="hidden lg:block w-80 xl:w-96 flex-shrink-0">
          <ChatList
            rooms={mockRooms}
            activeRoomId={roomId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRoomSelect={id => router.push(`/chat/${id}`)}
          />
        </div>

        {/* Chat Messages */}
        <div className="flex-1">
          <ChatMessages
            roomId={roomId}
            roomName={currentRoom.name}
            roomAvatar={currentRoom.avatar}
            isEncrypted={currentRoom.isEncrypted}
            isOnline={currentRoom.isOnline}
            messages={messages}
            currentUserId="me"
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onBack={handleBack}
          />
        </div>
      </div>
    </div>
  );
}
