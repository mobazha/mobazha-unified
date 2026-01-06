'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack } from '@mobazha/ui';
import { Button, Card, Input } from '@mobazha/ui';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui';

// Types
interface UserGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  memberCount: number;
  isDefault: boolean;
  permissions: {
    canViewProducts: boolean;
    canPurchase: boolean;
    canAccessChat: boolean;
    discountPercentage: number;
  };
}

// Mock data
const mockGroups: UserGroup[] = [
  {
    id: 'g1',
    name: 'VIP Customers',
    description: 'Loyal customers with exclusive access and discounts',
    color: '#F59E0B',
    memberCount: 45,
    isDefault: false,
    permissions: {
      canViewProducts: true,
      canPurchase: true,
      canAccessChat: true,
      discountPercentage: 15,
    },
  },
  {
    id: 'g2',
    name: 'Premium Members',
    description: 'Members with early access to new products',
    color: '#8B5CF6',
    memberCount: 128,
    isDefault: false,
    permissions: {
      canViewProducts: true,
      canPurchase: true,
      canAccessChat: true,
      discountPercentage: 10,
    },
  },
  {
    id: 'g3',
    name: 'Regular Members',
    description: 'Standard store access',
    color: '#10B981',
    memberCount: 342,
    isDefault: true,
    permissions: {
      canViewProducts: true,
      canPurchase: true,
      canAccessChat: false,
      discountPercentage: 0,
    },
  },
];

const GROUP_COLORS = [
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#F59E0B',
  '#EF4444',
  '#6366F1',
  '#14B8A6',
];

export default function UserGroupsPage() {
  const [groups, setGroups] = useState(mockGroups);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    color: GROUP_COLORS[0],
    discountPercentage: 0,
  });
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);

  const handleCreateGroup = () => {
    const group: UserGroup = {
      id: `g${Date.now()}`,
      name: newGroup.name,
      description: newGroup.description,
      color: newGroup.color,
      memberCount: 0,
      isDefault: false,
      permissions: {
        canViewProducts: true,
        canPurchase: true,
        canAccessChat: false,
        discountPercentage: newGroup.discountPercentage,
      },
    };
    setGroups(prev => [...prev, group]);
    setShowCreateModal(false);
    setNewGroup({ name: '', description: '', color: GROUP_COLORS[0], discountPercentage: 0 });
    alert('User group created!');
  };

  const handleDeleteGroupConfirm = () => {
    if (deleteGroupId) {
      setGroups(prev => prev.filter(g => g.id !== deleteGroupId));
      alert('Group deleted!');
      setDeleteGroupId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <main className="py-8">
        <Container size="lg">
          {/* Back Link */}
          <Link
            href="/settings/privacy"
            className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Privacy Settings
          </Link>

          <HStack justify="between" align="center" className="mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                User Groups
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Create and manage customer groups with different permissions
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>Create Group</Button>
          </HStack>

          {/* Groups List */}
          <VStack gap="md">
            {groups.map(group => (
              <Card key={group.id} padding="lg">
                <HStack justify="between" align="start">
                  <HStack gap="lg" align="start">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: group.color }}
                    >
                      {group.name.charAt(0)}
                    </div>
                    <div>
                      <HStack gap="sm" align="center" className="mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {group.name}
                        </h3>
                        {group.isDefault && (
                          <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">
                            Default
                          </span>
                        )}
                      </HStack>
                      <p className="text-sm text-slate-500 mb-3">{group.description}</p>
                      <HStack gap="md" className="text-sm">
                        <span className="text-slate-600 dark:text-slate-400">
                          {group.memberCount} members
                        </span>
                        {group.permissions.discountPercentage > 0 && (
                          <span className="text-emerald-600">
                            {group.permissions.discountPercentage}% discount
                          </span>
                        )}
                        {group.permissions.canAccessChat && (
                          <span className="text-blue-600">Chat access</span>
                        )}
                      </HStack>
                    </div>
                  </HStack>

                  <HStack gap="sm">
                    <Button size="sm" variant="ghost" onClick={() => setEditingGroup(group)}>
                      Edit
                    </Button>
                    {!group.isDefault && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => setDeleteGroupId(group.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </HStack>
                </HStack>
              </Card>
            ))}
          </VStack>

          {/* Empty State */}
          {groups.length === 0 && (
            <Card padding="lg" className="text-center py-12">
              <VStack gap="md" align="center">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  No user groups yet
                </h3>
                <p className="text-slate-500">
                  Create your first user group to organize your customers
                </p>
                <Button onClick={() => setShowCreateModal(true)}>Create Group</Button>
              </VStack>
            </Card>
          )}
        </Container>
      </main>

      <Footer />

      {/* Create/Edit Modal */}
      {(showCreateModal || editingGroup) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card padding="lg" className="w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
              {editingGroup ? 'Edit User Group' : 'Create User Group'}
            </h2>

            <VStack gap="lg">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Group Name *
                </label>
                <Input
                  value={editingGroup?.name || newGroup.name}
                  onChange={e =>
                    editingGroup
                      ? setEditingGroup({ ...editingGroup, name: e.target.value })
                      : setNewGroup(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., VIP Customers"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={editingGroup?.description || newGroup.description}
                  onChange={e =>
                    editingGroup
                      ? setEditingGroup({ ...editingGroup, description: e.target.value })
                      : setNewGroup(prev => ({ ...prev, description: e.target.value }))
                  }
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="Describe this group..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Color
                </label>
                <div className="flex gap-2">
                  {GROUP_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() =>
                        editingGroup
                          ? setEditingGroup({ ...editingGroup, color })
                          : setNewGroup(prev => ({ ...prev, color }))
                      }
                      className={`w-8 h-8 rounded-lg transition-transform ${
                        (editingGroup?.color || newGroup.color) === color
                          ? 'ring-2 ring-offset-2 ring-slate-400 scale-110'
                          : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Discount Percentage
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={
                    editingGroup?.permissions.discountPercentage || newGroup.discountPercentage
                  }
                  onChange={e =>
                    editingGroup
                      ? setEditingGroup({
                          ...editingGroup,
                          permissions: {
                            ...editingGroup.permissions,
                            discountPercentage: parseInt(e.target.value) || 0,
                          },
                        })
                      : setNewGroup(prev => ({
                          ...prev,
                          discountPercentage: parseInt(e.target.value) || 0,
                        }))
                  }
                  placeholder="0"
                />
              </div>
            </VStack>

            <HStack justify="end" gap="sm" className="mt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingGroup(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={
                  editingGroup
                    ? () => {
                        setGroups(prev =>
                          prev.map(g => (g.id === editingGroup.id ? editingGroup : g))
                        );
                        setEditingGroup(null);
                        alert('Group updated!');
                      }
                    : handleCreateGroup
                }
                disabled={!(editingGroup?.name || newGroup.name)}
              >
                {editingGroup ? 'Save Changes' : 'Create Group'}
              </Button>
            </HStack>
          </Card>
        </div>
      )}

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={!!deleteGroupId} onOpenChange={open => !open && setDeleteGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user group? Members in this group will be moved
              to the default group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroupConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
