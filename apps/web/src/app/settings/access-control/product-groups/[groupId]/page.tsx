'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui';
import {
  useProductGroups,
  useUserStore,
  getCasdoorUserId,
  dataService,
  useI18n,
  type ProductGroupItem,
  type ProductListItem,
} from '@mobazha/core';
import {
  Loader2,
  ChevronLeft,
  Plus,
  Trash2,
  Package,
  Edit2,
  Save,
  X,
  Search,
  Check,
} from 'lucide-react';
import { SettingsReferrerBanner } from '@/components/SettingsContent';

export default function ProductGroupDetailPage() {
  const params = useParams();
  const groupId = parseInt(params.groupId as string);
  const { t } = useI18n();

  const { profile, isAuthenticated } = useUserStore();
  const ownerPeerID = profile?.peerID || '';

  // 产品组使用 Casdoor userID
  const casdoorUserId = getCasdoorUserId();
  const userID = casdoorUserId || ownerPeerID;

  const { groups, loadGroups, updateGroup, loadItems, addItem, removeItem } = useProductGroups({
    userID,
    autoLoad: false,
  });

  const [items, setItems] = useState<ProductGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 编辑状态
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // 添加商品弹窗
  const [showAddModal, setShowAddModal] = useState(false);
  const [myListings, setMyListings] = useState<ProductListItem[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [addingProducts, setAddingProducts] = useState(false);

  // 删除确认
  const [removingSlug, setRemovingSlug] = useState<string | null>(null);

  // 获取当前产品组
  const currentGroup = groups.find(g => g.id === groupId);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated || !userID || isNaN(groupId)) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await loadGroups(userID);
        const groupItems = await loadItems(groupId);
        setItems(groupItems);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, userID, groupId, loadGroups, loadItems]);

  // 初始化编辑状态
  useEffect(() => {
    if (currentGroup) {
      setEditName(currentGroup.name);
      setEditDescription(currentGroup.description || '');
    }
  }, [currentGroup]);

  // 保存编辑
  const handleSave = useCallback(async () => {
    if (!currentGroup || !editName.trim()) return;

    setSaving(true);
    try {
      await updateGroup(groupId, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  }, [currentGroup, editName, editDescription, groupId, updateGroup]);

  // 加载我的商品列表
  const loadMyListings = useCallback(async () => {
    setLoadingListings(true);
    try {
      const listings = await dataService.products.getMyListings();
      // 过滤掉已在组内的商品
      const existingSlugs = items.map(item => item.listingSlug);
      const availableListings = listings.filter(
        (listing: ProductListItem) => !existingSlugs.includes(listing.slug)
      );
      setMyListings(availableListings);
    } catch (err) {
      console.error('Load listings error:', err);
    } finally {
      setLoadingListings(false);
    }
  }, [items]);

  // 打开添加弹窗
  const handleOpenAddModal = useCallback(() => {
    setShowAddModal(true);
    setSelectedSlugs([]);
    setSearchQuery('');
    loadMyListings();
  }, [loadMyListings]);

  // 切换商品选择
  const toggleProductSelection = useCallback((slug: string) => {
    setSelectedSlugs(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  }, []);

  // 添加选中的商品
  const handleAddProducts = useCallback(async () => {
    if (selectedSlugs.length === 0 || !ownerPeerID) return;

    setAddingProducts(true);
    try {
      for (const slug of selectedSlugs) {
        await addItem(groupId, slug, ownerPeerID);
      }
      // 刷新商品列表
      const groupItems = await loadItems(groupId);
      setItems(groupItems);
      setShowAddModal(false);
      setSelectedSlugs([]);
    } catch (err) {
      console.error('Add products error:', err);
    } finally {
      setAddingProducts(false);
    }
  }, [selectedSlugs, ownerPeerID, groupId, addItem, loadItems]);

  // 移除商品
  const handleRemoveProduct = useCallback(
    async (slug: string) => {
      const success = await removeItem(groupId, slug);
      if (success) {
        setItems(prev => prev.filter(item => item.listingSlug !== slug));
      }
      setRemovingSlug(null);
    },
    [groupId, removeItem]
  );

  // 过滤商品
  const filteredListings = myListings.filter(
    listing =>
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentGroup) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground mb-4">
          {t('settings.accessControl.productGroupNotFound')}
        </p>
        <Link href="/settings/access-control/product-groups">
          <Button>{t('common.back')}</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div>
      {/* 返回来源页面横幅 */}
      <SettingsReferrerBanner />

      {/* 面包屑导航 */}
      <div className="mb-6">
        <Link
          href="/settings/access-control/product-groups"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t('settings.sidebar.productGroups')}
        </Link>
      </div>

      {/* 产品组信息 */}
      <Card className="p-4 sm:p-6 mb-6">
        {isEditing ? (
          <VStack gap="md">
            <div>
              <label className="text-sm font-medium mb-1 block">{t('common.name')}</label>
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder={t('settings.accessControl.productGroupNamePlaceholder')}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('common.description')}</label>
              <Input
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                placeholder={t('settings.accessControl.productGroupDescPlaceholder')}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSave} disabled={saving || !editName.trim()} size="sm">
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {t('common.save')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                <X className="w-4 h-4 mr-2" />
                {t('common.cancel')}
              </Button>
            </div>
          </VStack>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold mb-1">{currentGroup.name}</h1>
              {currentGroup.description && (
                <p className="text-muted-foreground text-sm">{currentGroup.description}</p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                {items.length} {t('common.items')}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="self-start"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              {t('common.edit')}
            </Button>
          </div>
        )}
      </Card>

      {/* 快捷操作 */}
      <div className="mb-6">
        <Link href={`/settings/access-control/product-groups/${groupId}/authorization`}>
          <Button variant="outline">{t('settings.accessControl.configureAccess')} →</Button>
        </Link>
      </div>

      {/* 商品列表 */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold">{t('settings.accessControl.productList')}</h2>
          <Button onClick={handleOpenAddModal} disabled={!isAuthenticated} size="sm">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('settings.accessControl.addProducts')}</span>
          </Button>
        </div>

        {error && <div className="text-destructive text-sm mb-4">{error}</div>}

        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">{t('settings.accessControl.noProducts')}</p>
            <Button onClick={handleOpenAddModal}>
              <Plus className="w-4 h-4 mr-2" />
              {t('settings.accessControl.addFirstProduct')}
            </Button>
          </div>
        ) : (
          <VStack gap="sm">
            {items.map(item => (
              <div
                key={`${item.id}-${item.listingSlug}`}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <HStack gap="md" align="center">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    <Package className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{item.listingSlug}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.peerID?.substring(0, 20)}...
                    </p>
                  </div>
                </HStack>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setRemovingSlug(item.listingSlug)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </VStack>
        )}
      </Card>

      {/* 添加商品弹窗 */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('settings.accessControl.addProductsToGroup')}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* 搜索框 */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 商品列表 */}
            <div className="flex-1 overflow-y-auto">
              {loadingListings ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredListings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {myListings.length === 0
                      ? t('settings.accessControl.noAvailableProducts')
                      : t('settings.accessControl.noMatchingProducts')}
                  </p>
                </div>
              ) : (
                <VStack gap="sm">
                  {filteredListings.map(listing => {
                    const isSelected = selectedSlugs.includes(listing.slug);
                    return (
                      <div
                        key={listing.slug}
                        className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => toggleProductSelection(listing.slug)}
                      >
                        <HStack gap="md" align="center">
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                            {listing.thumbnail?.medium ? (
                              <img
                                src={listing.thumbnail.medium}
                                alt={listing.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{listing.title}</p>
                            <p className="text-xs text-muted-foreground">{listing.slug}</p>
                          </div>
                        </HStack>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground'
                          }`}
                        >
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                      </div>
                    );
                  })}
                </VStack>
              )}
            </div>

            {/* 底部操作 */}
            <div className="pt-4 border-t mt-4">
              <HStack justify="between" align="center">
                <span className="text-sm text-muted-foreground">
                  {t('settings.accessControl.selectedCount', { count: selectedSlugs.length })}
                </span>
                <HStack gap="sm">
                  <Button variant="outline" onClick={() => setShowAddModal(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleAddProducts}
                    disabled={selectedSlugs.length === 0 || addingProducts}
                  >
                    {addingProducts ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {t('common.add')}
                  </Button>
                </HStack>
              </HStack>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <AlertDialog open={!!removingSlug} onOpenChange={() => setRemovingSlug(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.accessControl.removeProduct')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.accessControl.removeProductConfirm', { slug: removingSlug || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removingSlug && handleRemoveProduct(removingSlug)}
            >
              {t('common.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
