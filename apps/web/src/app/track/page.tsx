'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@mobazha/core';
import { Search } from 'lucide-react';

export default function TrackOrderPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [token, setToken] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (trimmed) {
      router.push(`/guest-order/${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <Search className="w-10 h-10 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">
            {t('track.title', { defaultValue: 'Track Your Order' })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('track.description', {
              defaultValue:
                'Enter the order token you received after checkout to view your order status.',
            })}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="order-token" className="sr-only">
            {t('track.title', { defaultValue: 'Track Your Order' })}
          </label>
          <input
            id="order-token"
            type="text"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder={t('track.placeholder', { defaultValue: 'Order token (e.g. abc123...)' })}
            aria-label={t('track.inputLabel', { defaultValue: 'Order token' })}
            className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
            autoFocus
          />
          <button
            type="submit"
            disabled={!token.trim()}
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {t('track.submit', { defaultValue: 'Track Order' })}
          </button>
        </form>
      </div>
    </div>
  );
}
