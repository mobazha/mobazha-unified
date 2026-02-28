'use client';

import React, { useState } from 'react';
import type { StoreTabsProps } from '@mobazha/core';
import { useI18n } from '@mobazha/core';
import { StoreReviewsTab, FollowTab } from '@/components/store';

interface StoreTabsSectionProps extends StoreTabsProps {
  peerId: string;
}

type TabKey = 'reviews' | 'following' | 'followers';

const TAB_LABELS: Record<TabKey, string> = {
  reviews: 'profile.reviews',
  following: 'profile.following',
  followers: 'profile.followers',
};

export function StoreTabsSection({ tabs, peerId }: StoreTabsSectionProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabKey | null>(tabs[0] ?? null);

  if (!tabs.length) return null;

  return (
    <div>
      <div className="flex items-center border-b border-border mb-4">
        {tabs.map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 sm:px-5 py-3 text-sm sm:text-base font-medium transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-[var(--store-primary,hsl(var(--primary)))] text-[var(--store-primary,hsl(var(--primary)))]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            style={{ fontFamily: 'var(--store-font, inherit)' }}
          >
            {t(TAB_LABELS[tab])}
          </button>
        ))}
      </div>

      {activeTab === 'reviews' && <StoreReviewsTab peerID={peerId} />}
      {activeTab === 'following' && <FollowTab peerID={peerId} type="following" />}
      {activeTab === 'followers' && <FollowTab peerID={peerId} type="followers" />}
    </div>
  );
}
