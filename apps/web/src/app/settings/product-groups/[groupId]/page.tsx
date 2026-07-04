'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Package, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  getCasdoorUserId,
  useProductGroups,
  useUserStore,
  type ProductGroupItem,
} from '@mobazha/core';

export default function ProductGroupItemsPage() {
  const params = useParams();
  const groupId = Number.parseInt(params.groupId as string, 10);
  const { profile, isAuthenticated } = useUserStore();
  const ownerPeerID = profile?.peerID || '';
  const userID = getCasdoorUserId() || ownerPeerID;
  const {
    groups,
    error: productGroupError,
    loadGroups,
    loadItems,
    addItem,
    removeItem,
  } = useProductGroups({ userID, autoLoad: false });

  const [items, setItems] = useState<ProductGroupItem[]>([]);
  const [listingSlug, setListingSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingSlug, setRemovingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentGroup = useMemo(() => groups.find(group => group.id === groupId), [groups, groupId]);

  const refreshItems = useCallback(async () => {
    if (!Number.isFinite(groupId)) return;
    const nextItems = await loadItems(groupId);
    setItems(nextItems);
  }, [groupId, loadItems]);

  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated || !userID || !Number.isFinite(groupId)) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        await Promise.all([loadGroups(userID), refreshItems()]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product group');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [isAuthenticated, userID, groupId, loadGroups, refreshItems]);

  const handleAdd = useCallback(async () => {
    const slug = listingSlug.trim();
    if (!slug || !ownerPeerID) return;

    setSaving(true);
    setError(null);
    try {
      const result = await addItem(groupId, slug, ownerPeerID);
      if (!result) {
        setError('Failed to add product. Check that the listing slug belongs to your store.');
        return;
      }
      setListingSlug('');
      await refreshItems();
    } finally {
      setSaving(false);
    }
  }, [addItem, groupId, listingSlug, ownerPeerID, refreshItems]);

  const handleRemove = useCallback(
    async (slug: string) => {
      setRemovingSlug(slug);
      setError(null);
      try {
        const success = await removeItem(groupId, slug);
        if (!success) {
          setError('Failed to remove product from this group.');
          return;
        }
        await refreshItems();
      } finally {
        setRemovingSlug(null);
      }
    },
    [groupId, refreshItems, removeItem]
  );

  if (!Number.isFinite(groupId)) {
    return <div className="max-w-3xl mx-auto px-4 py-8 text-destructive">Invalid product group.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-8 space-y-6">
      <div>
        <Link
          href="/settings/product-groups"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to product groups
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold mt-3">
          {currentGroup?.name || 'Manage group products'}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Add one of your published listings by its slug. Products in this group inherit the group's access rules.
        </p>
      </div>

      {(error || productGroupError) && (
        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          {error || productGroupError}
        </div>
      )}

      <Card className="p-4 md:p-6">
        <h2 className="font-semibold mb-3">Add product</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            data-testid="product-group-listing-slug"
            value={listingSlug}
            onChange={event => setListingSlug(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') void handleAdd();
            }}
            placeholder="Listing slug"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={saving || !ownerPeerID}
          />
          <Button
            data-testid="product-group-add-listing"
            onClick={() => void handleAdd()}
            disabled={saving || !listingSlug.trim() || !ownerPeerID}
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Add
          </Button>
        </div>
      </Card>

      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Products</h2>
          <span className="text-sm text-muted-foreground">{items.length} items</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-60" />
            <p>No products in this group yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{item.listingSlug}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.peerID}</p>
                </div>
                <Button
                  data-testid={`product-group-remove-${item.listingSlug}`}
                  size="sm"
                  variant="ghost"
                  onClick={() => void handleRemove(item.listingSlug)}
                  disabled={removingSlug === item.listingSlug}
                  aria-label={`Remove ${item.listingSlug}`}
                >
                  {removingSlug === item.listingSlug ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-destructive" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
