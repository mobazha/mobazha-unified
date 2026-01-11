'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { useI18n } from '@mobazha/core';
import { ChevronLeft, Clock, CheckCircle, XCircle, Inbox } from 'lucide-react';

interface AccessRequest {
  id: string;
  userPeerID: string;
  userName: string;
  userAvatar?: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
  userInfo?: {
    location?: string;
    joinDate?: string;
    rating?: number;
    totalTransactions?: number;
  };
}

// Mock data
const mockRequests: AccessRequest[] = [
  {
    id: 'req1',
    userPeerID: 'QmUser1',
    userName: 'Alice Buyer',
    message: 'Hi! Would love to browse your exclusive items.',
    status: 'pending',
    requestedAt: '2025-01-10T10:00:00Z',
    userInfo: {
      location: 'Los Angeles, USA',
      rating: 4.8,
      totalTransactions: 24,
    },
  },
  {
    id: 'req2',
    userPeerID: 'QmUser2',
    userName: 'Bob Collector',
    message: 'Interested in your rare collectibles.',
    status: 'pending',
    requestedAt: '2025-01-09T15:30:00Z',
    userInfo: {
      rating: 4.9,
      totalTransactions: 156,
    },
  },
  {
    id: 'req3',
    userPeerID: 'QmUser3',
    userName: 'Carol Regular',
    status: 'approved',
    requestedAt: '2025-01-05T09:00:00Z',
    reviewedAt: '2025-01-05T14:00:00Z',
    userInfo: {
      rating: 5.0,
      totalTransactions: 50,
    },
  },
];

export default function AccessRequestsPage() {
  const { t } = useI18n();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);

  useEffect(() => {
    setTimeout(() => {
      setRequests(mockRequests);
      setLoading(false);
    }, 500);
  }, []);

  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true;
    return req.status === filter;
  });

  const handleApprove = useCallback(async (reqId: string, note: string) => {
    setProcessingId(reqId);
    await new Promise(resolve => setTimeout(resolve, 1000));

    setRequests(prev =>
      prev.map(req =>
        req.id === reqId
          ? {
              ...req,
              status: 'approved' as const,
              reviewedAt: new Date().toISOString(),
              reviewNote: note,
            }
          : req
      )
    );
    setProcessingId(null);
    setSelectedRequest(null);
    setReviewNote('');
  }, []);

  const handleReject = useCallback(async (reqId: string, note: string) => {
    setProcessingId(reqId);
    await new Promise(resolve => setTimeout(resolve, 1000));

    setRequests(prev =>
      prev.map(req =>
        req.id === reqId
          ? {
              ...req,
              status: 'rejected' as const,
              reviewedAt: new Date().toISOString(),
              reviewNote: note,
            }
          : req
      )
    );
    setProcessingId(null);
    setSelectedRequest(null);
    setReviewNote('');
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusConfig = {
    pending: {
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      icon: <Clock className="w-3 h-3" />,
    },
    approved: {
      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      icon: <CheckCircle className="w-3 h-3" />,
    },
    rejected: {
      color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      icon: <XCircle className="w-3 h-3" />,
    },
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  return (
    <div>
      {/* 移动端返回按钮 */}
      <div className="lg:hidden mb-4">
        <Link
          href="/settings/access-control"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-semibold">{t('settings.sidebar.accessRequests')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('settings.accessControl.requestsDesc')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-yellow-600">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">{t('common.pending')}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-green-600">{approvedCount}</p>
          <p className="text-xs text-muted-foreground">{t('common.approved')}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-red-600">{rejectedCount}</p>
          <p className="text-xs text-muted-foreground">{t('common.rejected')}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-2 mb-6">
        <div className="flex gap-1">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                filter === status
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {t(`common.${status}`)}
            </button>
          ))}
        </div>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Requests List */}
      {!loading && filteredRequests.length > 0 && (
        <div className="space-y-3">
          {filteredRequests.map(req => (
            <Card key={req.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Avatar src={req.userAvatar} name={req.userName} size="md" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm">{req.userName}</h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusConfig[req.status].color}`}
                      >
                        {statusConfig[req.status].icon}
                        {t(`common.${req.status}`)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(req.requestedAt)}
                    </p>
                    {req.userInfo?.totalTransactions !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        {req.userInfo.totalTransactions} transactions
                        {req.userInfo.rating && ` • ⭐ ${req.userInfo.rating}`}
                      </p>
                    )}
                  </div>
                </div>

                {req.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedRequest(req)}>
                      {t('common.review')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(req.id, '')}
                      disabled={processingId === req.id}
                    >
                      {processingId === req.id ? '...' : t('common.approve')}
                    </Button>
                  </div>
                )}
              </div>

              {req.message && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">{req.message}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredRequests.length === 0 && (
        <Card className="p-8 text-center">
          <Inbox className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {t('settings.accessControl.noRequests', { status: filter !== 'all' ? filter : '' })}
          </p>
        </Card>
      )}

      {/* Review Modal */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settings.accessControl.reviewRequest')}</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar
                  src={selectedRequest.userAvatar}
                  name={selectedRequest.userName}
                  size="md"
                />
                <div>
                  <p className="font-medium">{selectedRequest.userName}</p>
                  {selectedRequest.userInfo?.totalTransactions !== undefined && (
                    <p className="text-sm text-muted-foreground">
                      {selectedRequest.userInfo.totalTransactions} transactions
                    </p>
                  )}
                </div>
              </div>

              {selectedRequest.message && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">{t('common.message')}:</p>
                  <p className="text-sm">{selectedRequest.message}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.accessControl.reviewNote')}
                </label>
                <textarea
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={t('settings.accessControl.reviewNotePlaceholder')}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleReject(selectedRequest.id, reviewNote)}
                  disabled={processingId === selectedRequest.id}
                  className="border-destructive text-destructive hover:bg-destructive/10"
                >
                  {t('common.reject')}
                </Button>
                <Button
                  onClick={() => handleApprove(selectedRequest.id, reviewNote)}
                  disabled={processingId === selectedRequest.id}
                >
                  {processingId === selectedRequest.id ? '...' : t('common.approve')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
