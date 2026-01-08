'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { VStack, HStack } from '@/components/layouts';
import { useI18n } from '@mobazha/core';

export interface PartyInfo {
  peerID: string;
  handle?: string;
  name?: string;
  avatar?: string;
  location?: string;
  rating?: {
    average: number;
    count: number;
  };
}

export interface VendorInfoProps {
  party: PartyInfo;
  role: 'vendor' | 'buyer' | 'moderator';
  onMessage?: () => void;
  className?: string;
}

/**
 * 卖家/买家/仲裁员信息卡片组件
 */
export const VendorInfo: React.FC<VendorInfoProps> = ({
  party,
  role,
  onMessage,
  className = '',
}) => {
  const { t } = useI18n();

  const getRoleLabel = () => {
    switch (role) {
      case 'vendor':
        return t('order.seller');
      case 'buyer':
        return t('order.buyer');
      case 'moderator':
        return t('order.moderator');
      default:
        return role;
    }
  };

  const getRoleColor = () => {
    switch (role) {
      case 'vendor':
        return 'text-emerald-600';
      case 'buyer':
        return 'text-blue-600';
      case 'moderator':
        return 'text-purple-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const displayName = party.name || party.handle || `${party.peerID.slice(0, 8)}...`;

  return (
    <Card className={`p-4 sm:p-5 ${className}`}>
      <HStack justify="between" align="start">
        <HStack gap="sm" align="start">
          <Avatar src={party.avatar} name={displayName} size="md" className="w-12 h-12" />
          <VStack gap="none">
            <span className={`text-xs font-medium ${getRoleColor()}`}>{getRoleLabel()}</span>
            <Link
              href={`/store/${party.peerID}`}
              className="text-sm font-medium text-foreground hover:text-emerald-600 transition-colors"
            >
              {displayName}
            </Link>
            {party.location && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                </svg>
                {party.location}
              </span>
            )}
            {party.rating && party.rating.count > 0 && (
              <HStack gap="xs" className="mt-1">
                <div className="flex items-center text-yellow-500">
                  {[1, 2, 3, 4, 5].map(star => (
                    <svg
                      key={star}
                      className="w-3 h-3"
                      fill={star <= Math.round(party.rating!.average) ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {party.rating.average.toFixed(1)} ({party.rating.count})
                </span>
              </HStack>
            )}
          </VStack>
        </HStack>

        <VStack gap="xs" align="end">
          <Link href={`/store/${party.peerID}`}>
            <Button variant="outline" size="sm" className="text-xs h-7">
              {t('product.viewStore')}
            </Button>
          </Link>
          {onMessage && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onMessage}>
              <svg
                className="w-3.5 h-3.5 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              {t('order.message')}
            </Button>
          )}
        </VStack>
      </HStack>
    </Card>
  );
};

export default VendorInfo;
