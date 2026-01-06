'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, VStack, HStack, Card, Button, Avatar } from '@mobazha/ui';

// Types
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
    userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    message:
      'Hi! I heard great things about your store. Would love to browse your exclusive items.',
    status: 'pending',
    requestedAt: '2024-01-15T10:00:00Z',
    userInfo: {
      location: 'Los Angeles, USA',
      joinDate: '2023-06-15',
      rating: 4.8,
      totalTransactions: 24,
    },
  },
  {
    id: 'req2',
    userPeerID: 'QmUser2',
    userName: 'Bob Collector',
    userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    message: 'Interested in your rare collectibles. I am a serious collector.',
    status: 'pending',
    requestedAt: '2024-01-14T15:30:00Z',
    userInfo: {
      location: 'New York, USA',
      joinDate: '2022-01-10',
      rating: 4.9,
      totalTransactions: 156,
    },
  },
  {
    id: 'req3',
    userPeerID: 'QmUser3',
    userName: 'Carol Regular',
    status: 'approved',
    requestedAt: '2024-01-10T09:00:00Z',
    reviewedAt: '2024-01-10T14:00:00Z',
    userInfo: {
      rating: 5.0,
      totalTransactions: 50,
    },
  },
  {
    id: 'req4',
    userPeerID: 'QmUser4',
    userName: 'David Newbie',
    status: 'rejected',
    message: 'Just want to check out what you have.',
    requestedAt: '2024-01-08T11:00:00Z',
    reviewedAt: '2024-01-08T16:00:00Z',
    reviewNote: 'Account too new with no transaction history',
    userInfo: {
      joinDate: '2024-01-07',
      totalTransactions: 0,
    },
  },
];

export default function AccessRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setRequests(mockRequests);
      setLoading(false);
    }, 500);
  }, []);

  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true;
    return req.status === filter;
  });

  const handleApprove = useCallback(
    async (reqId: string) => {
      setProcessingId(reqId);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setRequests(prev =>
        prev.map(req =>
          req.id === reqId
            ? {
                ...req,
                status: 'approved' as const,
                reviewedAt: new Date().toISOString(),
                reviewNote,
              }
            : req
        )
      );
      setProcessingId(null);
      setSelectedRequest(null);
      setReviewNote('');
    },
    [reviewNote]
  );

  const handleReject = useCallback(
    async (reqId: string) => {
      setProcessingId(reqId);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setRequests(prev =>
        prev.map(req =>
          req.id === reqId
            ? {
                ...req,
                status: 'rejected' as const,
                reviewedAt: new Date().toISOString(),
                reviewNote,
              }
            : req
        )
      );
      setProcessingId(null);
      setSelectedRequest(null);
      setReviewNote('');
    },
    [reviewNote]
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <Container className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
            <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </Container>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <main className="py-8">
        <Container>
          {/* Back Button & Title */}
          <HStack justify="between" align="center" className="mb-6">
            <HStack gap="md" align="center">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Access Requests
                </h1>
                <p className="text-slate-500 text-sm">Manage who can access your private store</p>
              </div>
            </HStack>
            <Link href="/settings" className="text-emerald-600 hover:text-emerald-700 text-sm">
              ← Back to Settings
            </Link>
          </HStack>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card padding="md" className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {requests.filter(r => r.status === 'pending').length}
              </p>
              <p className="text-sm text-slate-500">Pending</p>
            </Card>
            <Card padding="md" className="text-center">
              <p className="text-2xl font-bold text-emerald-600">
                {requests.filter(r => r.status === 'approved').length}
              </p>
              <p className="text-sm text-slate-500">Approved</p>
            </Card>
            <Card padding="md" className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {requests.filter(r => r.status === 'rejected').length}
              </p>
              <p className="text-sm text-slate-500">Rejected</p>
            </Card>
          </div>

          {/* Filters */}
          <Card padding="md" className="mb-6">
            <HStack gap="sm">
              {(['pending', 'approved', 'rejected', 'all'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === status
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </HStack>
          </Card>

          {/* Requests List */}
          <VStack gap="md">
            {filteredRequests.length === 0 ? (
              <Card padding="lg" className="text-center">
                <svg
                  className="w-12 h-12 mx-auto text-slate-300 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-slate-500">
                  No {filter !== 'all' ? filter : ''} requests found.
                </p>
              </Card>
            ) : (
              filteredRequests.map(req => (
                <Card key={req.id} padding="lg" hoverable data-testid="access-request-item">
                  <HStack justify="between" align="start" className="flex-wrap gap-4">
                    {/* User Info */}
                    <HStack gap="md" align="start">
                      <Avatar src={req.userAvatar} name={req.userName} size="lg" />
                      <VStack gap="xs">
                        <HStack gap="sm" align="center">
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {req.userName}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[req.status]}`}
                          >
                            {req.status}
                          </span>
                        </HStack>
                        <p className="text-sm text-slate-500 font-mono">
                          {req.userPeerID.slice(0, 12)}...
                        </p>
                        <p className="text-sm text-slate-500">
                          Requested {formatDate(req.requestedAt)}
                        </p>
                      </VStack>
                    </HStack>

                    {/* Actions */}
                    {req.status === 'pending' && (
                      <HStack gap="sm">
                        <Button variant="outline" size="sm" onClick={() => setSelectedRequest(req)}>
                          Review
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(req.id)}
                          disabled={processingId === req.id}
                        >
                          {processingId === req.id ? 'Processing...' : 'Approve'}
                        </Button>
                      </HStack>
                    )}
                  </HStack>

                  {/* Message */}
                  {req.message && (
                    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Message:
                      </p>
                      <p className="text-slate-600 dark:text-slate-400">{req.message}</p>
                    </div>
                  )}

                  {/* User Stats */}
                  {req.userInfo && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {req.userInfo.location && (
                        <div>
                          <p className="text-xs text-slate-500">Location</p>
                          <p className="font-medium text-slate-900 dark:text-white text-sm">
                            {req.userInfo.location}
                          </p>
                        </div>
                      )}
                      {req.userInfo.joinDate && (
                        <div>
                          <p className="text-xs text-slate-500">Member Since</p>
                          <p className="font-medium text-slate-900 dark:text-white text-sm">
                            {new Date(req.userInfo.joinDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {req.userInfo.rating !== undefined && (
                        <div>
                          <p className="text-xs text-slate-500">Rating</p>
                          <p className="font-medium text-slate-900 dark:text-white text-sm">
                            ⭐ {req.userInfo.rating.toFixed(1)}
                          </p>
                        </div>
                      )}
                      {req.userInfo.totalTransactions !== undefined && (
                        <div>
                          <p className="text-xs text-slate-500">Transactions</p>
                          <p className="font-medium text-slate-900 dark:text-white text-sm">
                            {req.userInfo.totalTransactions}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Review Note */}
                  {req.reviewNote && (
                    <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Review Note:</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{req.reviewNote}</p>
                    </div>
                  )}
                </Card>
              ))
            )}
          </VStack>
        </Container>
      </main>

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card padding="lg" className="w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Review Request
            </h2>

            <HStack
              gap="md"
              align="center"
              className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
            >
              <Avatar src={selectedRequest.userAvatar} name={selectedRequest.userName} size="md" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  {selectedRequest.userName}
                </p>
                {selectedRequest.userInfo?.totalTransactions !== undefined && (
                  <p className="text-sm text-slate-500">
                    {selectedRequest.userInfo.totalTransactions} transactions
                  </p>
                )}
              </div>
            </HStack>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Note (optional)
              </label>
              <textarea
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Add a note (will be visible to user)..."
              />
            </div>

            <HStack gap="sm" justify="end">
              <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleReject(selectedRequest.id)}
                disabled={processingId === selectedRequest.id}
                className="border-red-500 text-red-500 hover:bg-red-50"
              >
                Reject
              </Button>
              <Button
                onClick={() => handleApprove(selectedRequest.id)}
                disabled={processingId === selectedRequest.id}
              >
                {processingId === selectedRequest.id ? 'Processing...' : 'Approve'}
              </Button>
            </HStack>
          </Card>
        </div>
      )}

      <Footer />
    </div>
  );
}
