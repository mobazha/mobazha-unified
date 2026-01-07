'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, VStack, HStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';

// Types
interface SellerApplication {
  id: string;
  applicantPeerID: string;
  applicantName: string;
  applicantAvatar?: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewNote?: string;
  sellerProfile?: {
    bio?: string;
    location?: string;
    businessName?: string;
  };
}

// Mock data
const mockApplications: SellerApplication[] = [
  {
    id: 'app1',
    applicantPeerID: 'QmUser1',
    applicantName: 'John Seller',
    applicantAvatar:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    message:
      'I have 5 years of experience selling handmade crafts. I would love to join your marketplace.',
    status: 'pending',
    createdAt: '2024-01-15T10:00:00Z',
    sellerProfile: {
      bio: 'Passionate craftsman specializing in handmade jewelry',
      location: 'New York, USA',
      businessName: "John's Crafts",
    },
  },
  {
    id: 'app2',
    applicantPeerID: 'QmUser2',
    applicantName: 'Sarah Tech',
    applicantAvatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    message: 'Tech enthusiast looking to sell refurbished electronics.',
    status: 'pending',
    createdAt: '2024-01-14T15:30:00Z',
    sellerProfile: {
      bio: 'Electronics repair specialist',
      location: 'San Francisco, USA',
      businessName: 'TechRevive',
    },
  },
  {
    id: 'app3',
    applicantPeerID: 'QmUser3',
    applicantName: 'Mike Fashion',
    status: 'approved',
    createdAt: '2024-01-10T09:00:00Z',
    reviewedAt: '2024-01-11T14:00:00Z',
  },
];

export default function MarketplaceApplicationsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [selectedApp, setSelectedApp] = useState<SellerApplication | null>(null);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setApplications(mockApplications);
      setLoading(false);
    }, 500);
  }, []);

  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  const handleApprove = useCallback(async (appId: string, note: string) => {
    setProcessingId(appId);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    setApplications(prev =>
      prev.map(app =>
        app.id === appId
          ? {
              ...app,
              status: 'approved' as const,
              reviewedAt: new Date().toISOString(),
              reviewNote: note,
            }
          : app
      )
    );
    setProcessingId(null);
    setSelectedApp(null);
    setReviewNote('');
  }, []);

  const handleReject = useCallback(async (appId: string, note: string) => {
    setProcessingId(appId);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    setApplications(prev =>
      prev.map(app =>
        app.id === appId
          ? {
              ...app,
              status: 'rejected' as const,
              reviewedAt: new Date().toISOString(),
              reviewNote: note,
            }
          : app
      )
    );
    setProcessingId(null);
    setSelectedApp(null);
    setReviewNote('');
  }, []);

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
                  Seller Applications
                </h1>
                <p className="text-slate-500 text-sm">
                  Manage seller applications for your marketplace
                </p>
              </div>
            </HStack>
            <Link
              href={`/marketplace/${slug}/admin`}
              className="text-emerald-600 hover:text-emerald-700 text-sm"
            >
              ← Back to Admin
            </Link>
          </HStack>

          {/* Filters */}
          <Card className="mb-6">
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
                  {status === 'pending' && (
                    <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                      {applications.filter(a => a.status === 'pending').length}
                    </span>
                  )}
                </button>
              ))}
            </HStack>
          </Card>

          {/* Applications List */}
          <VStack gap="md">
            {filteredApplications.length === 0 ? (
              <Card className="text-center">
                <p className="text-slate-500">
                  No {filter !== 'all' ? filter : ''} applications found.
                </p>
              </Card>
            ) : (
              filteredApplications.map(app => (
                <Card key={app.id}>
                  <HStack justify="between" align="start" className="flex-wrap gap-4">
                    {/* Applicant Info */}
                    <HStack gap="md" align="start">
                      <Avatar src={app.applicantAvatar} name={app.applicantName} size="lg" />
                      <VStack gap="xs">
                        <HStack gap="sm" align="center">
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {app.applicantName}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[app.status]}`}
                          >
                            {app.status}
                          </span>
                        </HStack>
                        <p className="text-sm text-slate-500 font-mono">
                          {app.applicantPeerID.slice(0, 12)}...
                        </p>
                        <p className="text-sm text-slate-500">
                          Applied {formatDate(app.createdAt)}
                        </p>
                      </VStack>
                    </HStack>

                    {/* Actions */}
                    {app.status === 'pending' && (
                      <HStack gap="sm">
                        <Button variant="outline" size="sm" onClick={() => setSelectedApp(app)}>
                          Review
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(app.id, '')}
                          disabled={processingId === app.id}
                        >
                          {processingId === app.id ? 'Processing...' : 'Approve'}
                        </Button>
                      </HStack>
                    )}
                  </HStack>

                  {/* Application Details */}
                  {app.message && (
                    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Message:
                      </p>
                      <p className="text-slate-600 dark:text-slate-400">{app.message}</p>
                    </div>
                  )}

                  {app.sellerProfile && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      {app.sellerProfile.businessName && (
                        <div>
                          <p className="text-xs text-slate-500">Business Name</p>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {app.sellerProfile.businessName}
                          </p>
                        </div>
                      )}
                      {app.sellerProfile.location && (
                        <div>
                          <p className="text-xs text-slate-500">Location</p>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {app.sellerProfile.location}
                          </p>
                        </div>
                      )}
                      {app.sellerProfile.bio && (
                        <div className="md:col-span-3">
                          <p className="text-xs text-slate-500">Bio</p>
                          <p className="text-slate-700 dark:text-slate-300">
                            {app.sellerProfile.bio}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {app.reviewNote && (
                    <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Review Note:</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{app.reviewNote}</p>
                    </div>
                  )}
                </Card>
              ))
            )}
          </VStack>
        </Container>
      </main>

      {/* Review Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Review Application
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Reviewing application from <strong>{selectedApp.applicantName}</strong>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Review Note (optional)
              </label>
              <textarea
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Add a note for your decision..."
              />
            </div>

            <HStack gap="sm" justify="end">
              <Button variant="outline" onClick={() => setSelectedApp(null)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleReject(selectedApp.id, reviewNote)}
                disabled={processingId === selectedApp.id}
                className="border-red-500 text-red-500 hover:bg-red-50"
              >
                Reject
              </Button>
              <Button
                onClick={() => handleApprove(selectedApp.id, reviewNote)}
                disabled={processingId === selectedApp.id}
              >
                {processingId === selectedApp.id ? 'Processing...' : 'Approve'}
              </Button>
            </HStack>
          </Card>
        </div>
      )}

      <Footer />
    </div>
  );
}
