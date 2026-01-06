'use client';

import React, { useState } from 'react';
import { Header } from '@/components';
import { ChatList, ChatMessages, Message } from '@/components/Chat';

// Mock data
const mockRooms = [
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

const mockMessages: Message[] = [
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
];

export default function ChatPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState(mockMessages);

  const currentRoom = mockRooms.find(r => r.id === selectedRoom);

  const handleSendMessage = (content: string) => {
    const newMessage = {
      id: `msg${Date.now()}`,
      content,
      senderId: 'me',
      timestamp: new Date().toISOString(),
      status: 'sending' as const,
    };
    setMessages([...messages, newMessage]);

    // Simulate message sent
    setTimeout(() => {
      setMessages(prev =>
        prev.map(m => (m.id === newMessage.id ? { ...m, status: 'sent' as const } : m))
      );
    }, 500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Header />

      {/* Main content area - account for mobile nav height */}
      <div className="flex-1 flex overflow-hidden h-[calc(100vh-64px-80px)] md:h-[calc(100vh-64px)]">
        {/* Chat List - Hidden on mobile when a room is selected */}
        <div
          className={`w-full lg:w-80 xl:w-96 flex-shrink-0 ${
            selectedRoom ? 'hidden lg:block' : ''
          }`}
        >
          <ChatList
            rooms={mockRooms}
            activeRoomId={selectedRoom || undefined}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRoomSelect={setSelectedRoom}
          />
        </div>

        {/* Chat Messages */}
        <div className={`flex-1 ${!selectedRoom ? 'hidden lg:flex' : 'flex'}`}>
          {selectedRoom && currentRoom ? (
            <ChatMessages
              roomId={selectedRoom}
              roomName={currentRoom.name}
              roomAvatar={currentRoom.avatar}
              isEncrypted={currentRoom.isEncrypted}
              isOnline={currentRoom.isOnline}
              messages={messages}
              currentUserId="me"
              onSendMessage={handleSendMessage}
              onBack={() => setSelectedRoom(null)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <div className="w-24 h-24 mb-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Welcome to Messages
              </h3>
              <p className="text-center max-w-sm">
                Select a conversation to start chatting, or create a new one to connect with vendors
                and buyers.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
