'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { VStack, HStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Input } from '@/components/ui/input-compat';

// Types
interface BlockedUser {
  id: string;
  peerID: string;
  name: string;
  avatar?: string;
  reason?: string;
  blockedAt: string;
  blockedBy: 'manual' | 'auto';
  stats?: {
    disputes: number;
    reports: number;
  };
}

// Mock data
const mockBlockedUsers: BlockedUser[] = [
  {
    id: 'user1',
    peerID: 'QmBlocked1',
    name: 'Spam User',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=100&h=100&fit=crop',
    reason: 'Sending spam messages repeatedly',
    blockedAt: '2024-01-10T10:00:00Z',
    blockedBy: 'manual',
    stats: {
      disputes: 3,
      reports: 12,
    },
  },
  {
    id: 'user2',
    peerID: 'QmBlocked2',
    name: 'Scam Attempt',
    reason: 'Attempted phishing scam',
    blockedAt: '2024-01-08T15:30:00Z',
    blockedBy: 'manual',
    stats: {
      disputes: 5,
      reports: 25,
    },
  },
  {
    id: 'user3',
    peerID: 'QmBlocked3',
    name: 'Auto-blocked User',
    blockedAt: '2024-01-05T09:00:00Z',
    blockedBy: 'auto',
    reason: 'Multiple failed transaction disputes',
    stats: {
      disputes: 8,
      reports: 4,
    },
  },
];

export default function BlockedUsersPage() {
  const router = useRouter();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBlockPeerID, setNewBlockPeerID] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('');
  const [confirmUnblock, setConfirmUnblock] = useState<BlockedUser | null>(null);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setBlockedUsers(mockBlockedUsers);
      setLoading(false);
    }, 500);
  }, []);

  const filteredUsers = blockedUsers.filter(user => {
    if (!searchQuery) return true;
    return (
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.peerID.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleUnblock = useCallback(async (userId: string) => {
    setProcessingId(userId);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    setBlockedUsers(prev => prev.filter(u => u.id !== userId));
    setProcessingId(null);
    setConfirmUnblock(null);
  }, []);

  const handleAddBlock = useCallback(async () => {
    if (!newBlockPeerID) return;

    setProcessingId('new');
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newUser: BlockedUser = {
      id: `user-${Date.now()}`,
      peerID: newBlockPeerID,
      name: `User ${newBlockPeerID.slice(0, 8)}`,
      reason: newBlockReason || undefined,
      blockedAt: new Date().toISOString(),
      blockedBy: 'manual',
    };

    setBlockedUsers(prev => [newUser, ...prev]);
    setProcessingId(null);
    setShowAddModal(false);
    setNewBlockPeerID('');
    setNewBlockReason('');
  }, [newBlockPeerID, newBlockReason]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-32 bg-muted rounded" />
        <div className="h-32 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div>
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Blocked Users</h1>
        <p className="text-muted-foreground text-sm">
          Manage users blocked from your store ({blockedUsers.length} blocked)
        </p>
      </div>

      {/* Search & Add */}
      <Card className="mb-6 p-5">
        <HStack justify="between" gap="md" className="flex-wrap">
          <Input
            placeholder="Search by name or Peer ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] max-w-md"
          />
          <Button onClick={() => setShowAddModal(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Block User
          </Button>
        </HStack>
      </Card>

      {/* Info Banner */}
      <Card className="mb-6 p-5 bg-warning/8 border-warning/20">
        <HStack gap="sm" align="start">
          <svg
            className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-sm text-warning font-medium">What happens when you block a user?</p>
            <ul className="text-sm text-warning mt-1 list-disc list-inside">
              <li>They cannot view your store or products</li>
              <li>They cannot send you messages</li>
              <li>They cannot place orders with your store</li>
              <li>Existing orders will not be affected</li>
            </ul>
          </div>
        </HStack>
      </Card>

      {/* Blocked Users List */}
      <VStack gap="md">
        {filteredUsers.length === 0 ? (
          <Card className="p-8 text-center">
            <svg
              className="w-12 h-12 mx-auto text-muted-foreground mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
            <p className="text-muted-foreground">
              {searchQuery ? 'No blocked users match your search.' : 'No blocked users.'}
            </p>
          </Card>
        ) : (
          filteredUsers.map(user => (
            <Card key={user.id} className="p-5" data-testid="blocked-user-item">
              <HStack justify="between" align="start" className="flex-wrap gap-4">
                {/* User Info */}
                <HStack gap="md" align="start">
                  <Avatar src={user.avatar} name={user.name} size="lg" />
                  <VStack gap="xs">
                    <HStack gap="sm" align="center">
                      <h3 className="font-semibold text-foreground">{user.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.blockedBy === 'auto'
                            ? 'bg-warning/15 text-warning'
                            : 'bg-error/15 text-error'
                        }`}
                      >
                        {user.blockedBy === 'auto' ? 'Auto-blocked' : 'Blocked'}
                      </span>
                    </HStack>
                    <p className="text-sm text-muted-foreground font-mono">{user.peerID}</p>
                    <p className="text-sm text-muted-foreground">
                      Blocked on {formatDate(user.blockedAt)}
                    </p>
                  </VStack>
                </HStack>

                {/* Actions */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmUnblock(user)}
                  disabled={processingId === user.id}
                >
                  {processingId === user.id ? 'Processing...' : 'Unblock'}
                </Button>
              </HStack>

              {/* Reason */}
              {user.reason && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Reason:</p>
                  <p className="text-muted-foreground">{user.reason}</p>
                </div>
              )}

              {/* Stats */}
              {user.stats && (
                <div className="mt-4 flex gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground">Disputes</p>
                    <p className="font-medium text-error">{user.stats.disputes}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Reports</p>
                    <p className="font-medium text-warning">{user.stats.reports}</p>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </VStack>
      {/* Add Block Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Block a User</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Peer ID *
                </label>
                <Input
                  value={newBlockPeerID}
                  onChange={e => setNewBlockPeerID(e.target.value)}
                  placeholder="Qm..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Reason (optional)
                </label>
                <textarea
                  value={newBlockReason}
                  onChange={e => setNewBlockReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Why are you blocking this user?"
                />
              </div>
            </div>

            <HStack gap="sm" justify="end" className="mt-6">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddBlock}
                disabled={!newBlockPeerID || processingId === 'new'}
                className="bg-error hover:bg-error"
              >
                {processingId === 'new' ? 'Blocking...' : 'Block User'}
              </Button>
            </HStack>
          </Card>
        </div>
      )}

      {/* Confirm Unblock Modal */}
      {confirmUnblock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Unblock User?</h2>

            <p className="text-muted-foreground mb-4">
              Are you sure you want to unblock <strong>{confirmUnblock.name}</strong>? They will be
              able to view your store and contact you again.
            </p>

            <HStack gap="sm" justify="end">
              <Button variant="outline" onClick={() => setConfirmUnblock(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => handleUnblock(confirmUnblock.id)}
                disabled={processingId === confirmUnblock.id}
              >
                {processingId === confirmUnblock.id ? 'Processing...' : 'Unblock'}
              </Button>
            </HStack>
          </Card>
        </div>
      )}
    </div>
  );
}
