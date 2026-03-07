'use client';

import dynamic from 'next/dynamic';

const ChatSystem = dynamic(() => import('./ChatSystem').then(m => m.ChatSystem), {
  ssr: false,
});

export function ChatSystemLazy() {
  return <ChatSystem />;
}
