'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { VStack, HStack } from '@/components/layouts';
import { useI18n, getTimeRemaining } from '@mobazha/core';
import { formatOrderDate } from './utils';

export interface DisputeInfo {
  timestamp: string;
  claim: string;
  response?: string;
  initiator: 'buyer' | 'seller';
  status: 'open' | 'in_progress' | 'decided' | 'resolved';
  resolution?: {
    decision: 'buyer' | 'seller' | 'split';
    buyerAmount?: string;
    sellerAmount?: string;
    moderatorFee?: string;
    currency?: string;
  };
  expiresAt?: string;
}

export interface OrderDisputeProps {
  dispute: DisputeInfo;
  userRole: 'buyer' | 'seller' | 'moderator';
  className?: string;
}

/**
 * 争议信息展示组件
 */
export const OrderDispute: React.FC<OrderDisputeProps> = ({
  dispute,
  userRole,
  className = '',
}) => {
  const { t } = useI18n();

  const getStatusColor = (status: DisputeInfo['status']) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'in_progress':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'decided':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'resolved':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusLabel = (status: DisputeInfo['status']) => {
    switch (status) {
      case 'open':
        return t('order.disputeDisplay.statusOpen');
      case 'in_progress':
        return t('order.disputeDisplay.statusInProgress');
      case 'decided':
        return t('order.disputeDisplay.statusDecided');
      case 'resolved':
        return t('order.disputeDisplay.statusResolved');
      default:
        return status;
    }
  };

  const getResolutionLabel = (decision: string) => {
    switch (decision) {
      case 'buyer':
        return t('order.disputeDisplay.resolutionBuyer');
      case 'seller':
        return t('order.disputeDisplay.resolutionSeller');
      case 'split':
        return t('order.disputeDisplay.resolutionSplit');
      default:
        return decision;
    }
  };

  return (
    <Card
      className={`p-4 sm:p-6 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 ${className}`}
    >
      {/* Header */}
      <HStack justify="between" align="start" className="mb-4">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="text-sm font-medium text-foreground">{t('order.disputeDisplay.title')}</h3>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(dispute.status)}`}
        >
          {getStatusLabel(dispute.status)}
        </span>
      </HStack>

      <VStack gap="md">
        {/* Dispute Info */}
        <div className="space-y-2">
          <HStack justify="between" className="text-sm">
            <span className="text-muted-foreground">{t('order.disputeDisplay.initiatedBy')}</span>
            <span className="text-foreground">
              {dispute.initiator === 'buyer' ? t('order.buyer') : t('order.seller')}
            </span>
          </HStack>
          <HStack justify="between" className="text-sm">
            <span className="text-muted-foreground">{t('order.disputeDisplay.openedOn')}</span>
            <span className="text-foreground">{formatOrderDate(dispute.timestamp)}</span>
          </HStack>
          {dispute.expiresAt && dispute.status === 'open' && (
            <HStack justify="between" className="text-sm">
              <span className="text-muted-foreground">
                {t('order.disputeDisplay.timeRemaining')}
              </span>
              <span className="text-amber-600 font-medium">
                {getTimeRemaining(dispute.expiresAt)}
              </span>
            </HStack>
          )}
        </div>

        {/* Claim */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-border">
          <p className="text-xs text-muted-foreground mb-1">{t('order.disputeDisplay.claim')}</p>
          <p className="text-sm text-foreground">{dispute.claim}</p>
        </div>

        {/* Response */}
        {dispute.response && (
          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground mb-1">
              {t('order.disputeDisplay.response')}
            </p>
            <p className="text-sm text-foreground">{dispute.response}</p>
          </div>
        )}

        {/* Resolution */}
        {dispute.resolution && (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
            <h4 className="text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-3">
              {t('order.disputeDisplay.resolution')}
            </h4>
            <VStack gap="sm">
              <HStack justify="between" className="text-sm">
                <span className="text-muted-foreground">{t('order.disputeDisplay.decision')}</span>
                <span className="text-foreground font-medium">
                  {getResolutionLabel(dispute.resolution.decision)}
                </span>
              </HStack>
              {dispute.resolution.buyerAmount && (
                <HStack justify="between" className="text-sm">
                  <span className="text-muted-foreground">
                    {t('order.disputeDisplay.buyerReceives')}
                  </span>
                  <span className="text-foreground">
                    {dispute.resolution.buyerAmount} {dispute.resolution.currency}
                  </span>
                </HStack>
              )}
              {dispute.resolution.sellerAmount && (
                <HStack justify="between" className="text-sm">
                  <span className="text-muted-foreground">
                    {t('order.disputeDisplay.sellerReceives')}
                  </span>
                  <span className="text-foreground">
                    {dispute.resolution.sellerAmount} {dispute.resolution.currency}
                  </span>
                </HStack>
              )}
              {dispute.resolution.moderatorFee && (
                <HStack justify="between" className="text-sm">
                  <span className="text-muted-foreground">
                    {t('order.disputeDisplay.moderatorFee')}
                  </span>
                  <span className="text-foreground">
                    {dispute.resolution.moderatorFee} {dispute.resolution.currency}
                  </span>
                </HStack>
              )}
            </VStack>
          </div>
        )}

        {/* Info for different roles */}
        {userRole === 'moderator' && dispute.status !== 'resolved' && (
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-400">
              {t('order.disputeDisplay.moderatorHint')}
            </p>
          </div>
        )}
      </VStack>
    </Card>
  );
};

export default OrderDispute;
