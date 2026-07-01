'use client';

import React from 'react';
import { useI18n, useChatStore } from '@mobazha/core';

type InboxTab = 'all' | 'direct' | 'groups' | 'orders';

const TAB_ITEMS: InboxTab[] = ['all', 'orders', 'direct', 'groups'];

export const ChatInboxTabs: React.FC = () => {
  const { t } = useI18n();
  const activeTab = useChatStore(state => state.activeTab);
  const setActiveTab = useChatStore(state => state.setActiveTab);

  const labels: Record<InboxTab, string> = {
    all: t('chat.inbox.all'),
    orders: t('chat.inbox.orders'),
    direct: t('chat.inbox.direct'),
    groups: t('chat.inbox.groups'),
  };

  return (
    <div
      className="flex gap-1 px-3 py-2 border-b border-border/40 bg-card/50 overflow-x-auto"
      role="tablist"
      aria-label={t('chat.inbox.label')}
    >
      {TAB_ITEMS.map(tab => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={activeTab === tab}
          onClick={() => setActiveTab(tab)}
          className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
            activeTab === tab
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          {labels[tab]}
        </button>
      ))}
    </div>
  );
};

export default ChatInboxTabs;
