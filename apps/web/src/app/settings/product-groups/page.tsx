'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input-compat';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
interface ProductGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  productCount: number;
  visibility: 'public' | 'members_only' | 'group_only' | 'hidden';
  accessUserGroups: string[];
}

// Mock data
const mockProductGroups: ProductGroup[] = [
  {
    id: 'pg1',
    name: 'Premium Collection',
    description: 'Exclusive high-end products for VIP customers',
    color: '#F59E0B',
    productCount: 12,
    visibility: 'group_only',
    accessUserGroups: ['VIP Customers'],
  },
  {
    id: 'pg2',
    name: 'New Arrivals',
    description: 'Latest products added to the store',
    color: '#8B5CF6',
    productCount: 24,
    visibility: 'members_only',
    accessUserGroups: [],
  },
  {
    id: 'pg3',
    name: 'Sale Items',
    description: 'Products on special discount',
    color: '#EF4444',
    productCount: 8,
    visibility: 'public',
    accessUserGroups: [],
  },
];

const visibilityOptions = [
  { value: 'public', label: 'Public', description: 'Visible to everyone' },
  { value: 'members_only', label: 'Members Only', description: 'Only store members can see' },
  { value: 'group_only', label: 'Group Only', description: 'Only specific user groups can see' },
  { value: 'hidden', label: 'Hidden', description: 'Not visible to anyone' },
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

export default function ProductGroupsPage() {
  const [groups, setGroups] = useState(mockProductGroups);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ProductGroup | null>(null);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    color: GROUP_COLORS[0],
    visibility: 'public' as ProductGroup['visibility'],
  });
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);

  const handleCreateGroup = () => {
    const group: ProductGroup = {
      id: `pg${Date.now()}`,
      name: newGroup.name,
      description: newGroup.description,
      color: newGroup.color,
      productCount: 0,
      visibility: newGroup.visibility,
      accessUserGroups: [],
    };
    setGroups(prev => [...prev, group]);
    setShowCreateModal(false);
    setNewGroup({ name: '', description: '', color: GROUP_COLORS[0], visibility: 'public' });
    window.alert('Product group created!');
  };

  const handleDeleteGroupConfirm = () => {
    if (deleteGroupId) {
      setGroups(prev => prev.filter(g => g.id !== deleteGroupId));
      window.alert('Group deleted!');
      setDeleteGroupId(null);
    }
  };

  const getVisibilityLabel = (visibility: ProductGroup['visibility']) => {
    return visibilityOptions.find(v => v.value === visibility)?.label || visibility;
  };

  const getVisibilityColor = (visibility: ProductGroup['visibility']) => {
    switch (visibility) {
      case 'public':
        return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30';
      case 'members_only':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'group_only':
        return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30';
      case 'hidden':
        return 'text-slate-600 bg-muted';
      default:
        return 'text-slate-600 bg-slate-100';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-8">
        <Container size="lg">
          {/* Back Link */}
          <Link
            href="/settings/privacy"
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
            Back to Privacy Settings
          </Link>

          <HStack justify="between" align="center" className="mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Product Groups</h1>
              <p className="text-muted-foreground">
                Organize products and control visibility for different customer groups
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>Create Group</Button>
          </HStack>

          {/* Groups List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map(group => (
              <Card key={group.id}>
                <HStack justify="between" align="start" className="mb-4">
                  <HStack gap="md" align="center">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: group.color }}
                    >
                      {group.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{group.name}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getVisibilityColor(group.visibility)}`}
                      >
                        {getVisibilityLabel(group.visibility)}
                      </span>
                    </div>
                  </HStack>
                  <HStack gap="xs">
                    <Button size="sm" variant="ghost" onClick={() => setEditingGroup(group)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500"
                      onClick={() => setDeleteGroupId(group.id)}
                    >
                      Delete
                    </Button>
                  </HStack>
                </HStack>

                <p className="text-sm text-slate-500 mb-3">{group.description}</p>

                <HStack justify="between" className="text-sm">
                  <span className="text-muted-foreground">{group.productCount} products</span>
                  {group.accessUserGroups.length > 0 && (
                    <span className="text-purple-600">
                      {group.accessUserGroups.length} group access
                    </span>
                  )}
                </HStack>

                <div className="mt-4 pt-4 border-t border-border">
                  <Link
                    href={`/settings/product-groups/${group.id}`}
                    className="text-sm text-emerald-600 hover:text-emerald-700"
                  >
                    Manage products →
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {groups.length === 0 && (
            <Card className="text-center py-12">
              <VStack gap="md" align="center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
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
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground">No product groups yet</h3>
                <p className="text-muted-foreground">
                  Create product groups to organize your inventory
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
          <Card className="w-full max-w-md">
            <h2 className="text-xl font-bold text-foreground mb-6">
              {editingGroup ? 'Edit Product Group' : 'Create Product Group'}
            </h2>

            <VStack gap="lg">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Group Name *
                </label>
                <Input
                  value={editingGroup?.name || newGroup.name}
                  onChange={e =>
                    editingGroup
                      ? setEditingGroup({ ...editingGroup, name: e.target.value })
                      : setNewGroup(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Premium Collection"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
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
                  className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="Describe this group..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
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
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Visibility
                </label>
                <Select
                  value={editingGroup?.visibility || newGroup.visibility}
                  onValueChange={value =>
                    editingGroup
                      ? setEditingGroup({
                          ...editingGroup,
                          visibility: value as ProductGroup['visibility'],
                        })
                      : setNewGroup(prev => ({
                          ...prev,
                          visibility: value as ProductGroup['visibility'],
                        }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {visibilityOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label} - {option.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                        window.alert('Group updated!');
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
            <AlertDialogTitle>Delete Product Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product group? Products in this group will be
              moved to the default group.
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
