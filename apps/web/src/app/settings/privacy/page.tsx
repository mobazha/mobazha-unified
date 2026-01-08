'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Types
interface PrivacySettings {
  isPrivate: boolean;
  requireApproval: boolean;
  welcomeMessage: string;
}

interface AccessRequest {
  id: string;
  name: string;
  avatar: string;
  message: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

// Mock data
const mockSettings: PrivacySettings = {
  isPrivate: false,
  requireApproval: false,
  welcomeMessage: 'Welcome to my store! Browse our exclusive products.',
};

const mockRequests: AccessRequest[] = [
  {
    id: 'req1',
    name: 'CryptoEnthusiast',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=crypto',
    message: 'I would love to access your exclusive products!',
    createdAt: '2024-01-20T10:00:00',
    status: 'pending',
  },
  {
    id: 'req2',
    name: 'TechBuyer2024',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tech',
    message: 'Interested in your VIP collection.',
    createdAt: '2024-01-19T15:30:00',
    status: 'pending',
  },
];

export default function PrivacySettingsPage() {
  const [settings, setSettings] = useState<PrivacySettings>(mockSettings);
  const [requests, setRequests] = useState(mockRequests);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      window.alert('Settings saved successfully!');
    } catch {
      window.alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReviewRequest = (requestId: string, approved: boolean) => {
    setRequests(prev =>
      prev.map(req =>
        req.id === requestId ? { ...req, status: approved ? 'approved' : 'rejected' } : req
      )
    );
    window.alert(approved ? 'Access granted!' : 'Access denied');
  };

  const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-8">
        <Container size="lg">
          {/* Back Link */}
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-slate-900 dark:hover:text-white mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Settings
          </Link>

          <h1 className="text-3xl font-bold text-foreground mb-2">Privacy & Access Control</h1>
          <p className="text-muted-foreground mb-8">
            Control who can access your store and products
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Settings */}
            <div className="lg:col-span-2 space-y-6">
              {/* Store Privacy */}
              <Card>
                <h2 className="text-xl font-bold text-foreground mb-6">Store Privacy</h2>

                <VStack gap="lg">
                  {/* Private Store Toggle */}
                  <div className="p-4 border border-border rounded-lg">
                    <HStack justify="between" align="start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">Private Store</h3>
                        <p className="text-sm text-muted-foreground">
                          When enabled, only approved users can view your store and products.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.isPrivate}
                          onChange={e =>
                            setSettings(prev => ({ ...prev, isPrivate: e.target.checked }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                      </label>
                    </HStack>
                  </div>

                  {/* Require Approval */}
                  {settings.isPrivate && (
                    <div className="p-4 border border-border rounded-lg">
                      <HStack justify="between" align="start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-1">Require Approval</h3>
                          <p className="text-sm text-muted-foreground">
                            Users must request access and be approved before viewing your store.
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.requireApproval}
                            onChange={e =>
                              setSettings(prev => ({
                                ...prev,
                                requireApproval: e.target.checked,
                              }))
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                        </label>
                      </HStack>
                    </div>
                  )}

                  {/* Welcome Message */}
                  {settings.isPrivate && (
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Welcome Message (shown to approved users)
                      </label>
                      <textarea
                        value={settings.welcomeMessage}
                        onChange={e =>
                          setSettings(prev => ({ ...prev, welcomeMessage: e.target.value }))
                        }
                        rows={3}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                      />
                    </div>
                  )}
                </VStack>

                <div className="mt-6 pt-6 border-t border-border">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </Card>

              {/* Access Requests */}
              {settings.isPrivate && settings.requireApproval && (
                <Card>
                  <HStack justify="between" align="center" className="mb-6">
                    <h2 className="text-xl font-bold text-foreground">Access Requests</h2>
                    {pendingRequestsCount > 0 && (
                      <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm font-medium">
                        {pendingRequestsCount} pending
                      </span>
                    )}
                  </HStack>

                  {requests.filter(r => r.status === 'pending').length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No pending access requests</p>
                    </div>
                  ) : (
                    <VStack gap="md">
                      {requests
                        .filter(r => r.status === 'pending')
                        .map(request => (
                          <div key={request.id} className="p-4 border border-border rounded-lg">
                            <HStack justify="between" align="start" className="mb-3">
                              <HStack gap="md" align="center">
                                <img
                                  src={request.avatar}
                                  alt={request.name}
                                  className="w-10 h-10 rounded-full bg-slate-200"
                                />
                                <div>
                                  <p className="font-semibold text-foreground">{request.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(request.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </HStack>
                              <HStack gap="sm">
                                <Button
                                  size="sm"
                                  onClick={() => handleReviewRequest(request.id, true)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReviewRequest(request.id, false)}
                                >
                                  Deny
                                </Button>
                              </HStack>
                            </HStack>
                            <p className="text-muted-foreground text-sm">{request.message}</p>
                          </div>
                        ))}
                    </VStack>
                  )}
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Links */}
              <Card>
                <h3 className="font-semibold text-foreground mb-4">Access Management</h3>
                <VStack gap="sm">
                  <Link
                    href="/settings/user-groups"
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover transition-colors"
                  >
                    <HStack gap="md" align="center">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      </div>
                      <span className="text-muted-foreground">User Groups</span>
                    </HStack>
                    <svg
                      className="w-5 h-5 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>

                  <Link
                    href="/settings/product-groups"
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover transition-colors"
                  >
                    <HStack gap="md" align="center">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-purple-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                          />
                        </svg>
                      </div>
                      <span className="text-muted-foreground">Product Groups</span>
                    </HStack>
                    <svg
                      className="w-5 h-5 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </VStack>
              </Card>

              {/* Info Box */}
              <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
                <h3 className="font-semibold text-emerald-800 dark:text-emerald-400 mb-2">
                  Exclusive Store Benefits
                </h3>
                <ul className="text-sm text-emerald-700 dark:text-emerald-300 space-y-2">
                  <li>• Control who can view your products</li>
                  <li>• Create VIP customer groups</li>
                  <li>• Offer exclusive discounts</li>
                  <li>• Protect premium content</li>
                </ul>
              </Card>
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
