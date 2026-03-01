'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useI18n, collectionsApi, productDataService, getImageUrl, imagesApi } from '@mobazha/core';
import type {
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
  CollectionSortOrder,
  ProductListItem,
} from '@mobazha/core';
import {
  Loader2,
  X,
  GripVertical,
  Plus,
  Search,
  Layers,
  ImageIcon,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';

const SORT_OPTIONS: { value: CollectionSortOrder; labelKey: string }[] = [
  { value: 'manual', labelKey: 'admin.collections.sortManual' },
  { value: 'alpha-asc', labelKey: 'admin.collections.sortAlphaAsc' },
  { value: 'alpha-desc', labelKey: 'admin.collections.sortAlphaDesc' },
  { value: 'price-asc', labelKey: 'admin.collections.sortPriceAsc' },
  { value: 'price-desc', labelKey: 'admin.collections.sortPriceDesc' },
  { value: 'created-desc', labelKey: 'admin.collections.sortCreatedDesc' },
  { value: 'created-asc', labelKey: 'admin.collections.sortCreatedAsc' },
];

interface CollectionFormProps {
  initial?: Collection;
  onSaved: (collection: Collection) => void;
}

export function CollectionForm({ initial, onSaved }: CollectionFormProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const isEditing = !!initial;

  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [image, setImage] = useState(initial?.image ?? '');
  const [sortOrder, setSortOrder] = useState<CollectionSortOrder>(initial?.sortOrder ?? 'manual');
  const [published, setPublished] = useState(initial?.published ?? false);
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState(initial?.products ?? []);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [addingSlugs, setAddingSlugs] = useState(false);
  const [allMyListings, setAllMyListings] = useState<ProductListItem[]>([]);

  useEffect(() => {
    productDataService
      .getMyListings()
      .then(items => setAllMyListings(items ?? []))
      .catch(() => {});
  }, []);

  const listingsBySlug = useMemo(() => {
    const map = new Map<string, ProductListItem>();
    allMyListings.forEach(l => map.set(l.slug, l));
    return map;
  }, [allMyListings]);

  // Pending slugs for new collections (not yet saved)
  const [pendingSlugs, setPendingSlugs] = useState<string[]>([]);

  const handleImageUpload = useCallback(
    async (file: File) => {
      setUploadingImage(true);
      try {
        const base64 = await imagesApi.fileToBase64(file);
        const result = await imagesApi.uploadImage({ filename: 'collectionImage', image: base64 });
        if (result) {
          const hash = result.medium || result.small || result.original || '';
          setImage(hash);
        }
      } catch {
        toast({ variant: 'destructive', title: t('admin.collections.uploadError') });
      } finally {
        setUploadingImage(false);
      }
    },
    [toast, t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith('image/')) handleImageUpload(file);
    },
    [handleImageUpload]
  );

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      setTitleError(t('admin.collections.titleRequired'));
      return;
    }
    setTitleError('');
    setSaving(true);

    try {
      if (isEditing && initial) {
        const data: UpdateCollectionRequest = { title, description, image, sortOrder, published };
        const updated = await collectionsApi.updateCollection(initial.id, data);
        toast({ title: t('admin.collections.saved') });
        onSaved(updated);
      } else {
        const data: CreateCollectionRequest = { title, description, image, sortOrder, published };
        const created = await collectionsApi.createCollection(data);
        // Add pending products to the newly created collection
        if (pendingSlugs.length > 0) {
          try {
            await collectionsApi.addCollectionProducts(created.id, pendingSlugs);
            const refreshed = await collectionsApi.getCollection(created.id);
            toast({ title: t('admin.collections.created') });
            onSaved(refreshed);
          } catch {
            toast({ title: t('admin.collections.created') });
            onSaved(created);
          }
        } else {
          toast({ title: t('admin.collections.created') });
          onSaved(created);
        }
      }
    } catch {
      toast({
        variant: 'destructive',
        title: isEditing ? t('admin.collections.saveError') : t('admin.collections.createError'),
      });
    } finally {
      setSaving(false);
    }
  }, [
    title,
    description,
    image,
    sortOrder,
    published,
    isEditing,
    initial,
    pendingSlugs,
    t,
    toast,
    onSaved,
  ]);

  const handleRemoveProduct = useCallback(
    async (slug: string) => {
      if (!initial) {
        setPendingSlugs(prev => prev.filter(s => s !== slug));
        return;
      }
      try {
        await collectionsApi.removeCollectionProduct(initial.id, slug);
        setProducts(prev => prev.filter(p => p.listingSlug !== slug));
        toast({ title: t('admin.collections.productRemoved') });
      } catch {
        toast({ variant: 'destructive', title: t('admin.collections.productRemoveError') });
      }
    },
    [initial, t, toast]
  );

  const handleAddProducts = useCallback(
    async (slugs: string[]) => {
      if (!initial) {
        setPendingSlugs(prev => [...prev, ...slugs.filter(s => !prev.includes(s))]);
        setProductPickerOpen(false);
        return;
      }
      if (slugs.length === 0) return;
      setAddingSlugs(true);
      try {
        await collectionsApi.addCollectionProducts(initial.id, slugs);
        const refreshed = await collectionsApi.getCollection(initial.id);
        setProducts(refreshed.products ?? []);
        toast({ title: t('admin.collections.productAdded') });
        setProductPickerOpen(false);
      } catch {
        toast({ variant: 'destructive', title: t('admin.collections.productAddError') });
      } finally {
        setAddingSlugs(false);
      }
    },
    [initial, t, toast]
  );

  const handleMoveProduct = useCallback(
    async (index: number, direction: 'up' | 'down') => {
      const swapIndex = direction === 'up' ? index - 1 : index + 1;

      if (!initial) {
        setPendingSlugs(prev => {
          const next = [...prev];
          [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
          return next;
        });
        return;
      }

      const newProducts = [...products];
      [newProducts[index], newProducts[swapIndex]] = [newProducts[swapIndex], newProducts[index]];
      setProducts(newProducts);

      try {
        await collectionsApi.reorderCollectionProducts(
          initial.id,
          newProducts.map(p => p.listingSlug)
        );
      } catch {
        setProducts(products);
        toast({ variant: 'destructive', title: t('admin.collections.reorderError') });
      }
    },
    [initial, products, toast, t]
  );

  const displaySlugs = isEditing ? products.map(p => p.listingSlug) : pendingSlugs;
  const existingSlugsSet = useMemo(() => new Set(displaySlugs), [displaySlugs]);

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="collection-title">{t('admin.collections.titleLabel')}</Label>
        <Input
          id="collection-title"
          placeholder={t('admin.collections.titlePlaceholder')}
          value={title}
          onChange={e => {
            setTitle(e.target.value);
            if (titleError) setTitleError('');
          }}
          data-testid="collection-title-input"
        />
        {titleError && <p className="text-sm text-destructive">{titleError}</p>}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="collection-desc">{t('admin.collections.descriptionLabel')}</Label>
        <Textarea
          id="collection-desc"
          placeholder={t('admin.collections.descriptionPlaceholder')}
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      {/* Image upload */}
      <div className="space-y-2">
        <Label>{t('admin.collections.imageLabel')}</Label>
        {image ? (
          <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border">
            <img
              src={getImageUrl(image)}
              alt="Collection"
              loading="lazy"
              className="w-full h-full object-cover"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 w-7 h-7"
              onClick={() => setImage('')}
              aria-label={t('admin.collections.imageRemove')}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
          >
            {uploadingImage ? (
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            ) : (
              <>
                <ImageIcon className="w-8 h-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">{t('admin.collections.imageHint')}</p>
              </>
            )}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
            e.target.value = '';
          }}
        />
      </div>

      {/* Sort order */}
      <div className="space-y-2">
        <Label>{t('admin.collections.sortOrderLabel')}</Label>
        <Select value={sortOrder} onValueChange={v => setSortOrder(v as CollectionSortOrder)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Published toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>{t('admin.collections.publishedLabel')}</Label>
          <p className="text-sm text-muted-foreground">{t('admin.collections.publishedHint')}</p>
        </div>
        <Switch checked={published} onCheckedChange={setPublished} />
      </div>

      {/* Products section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>{t('admin.collections.productsSection')}</Label>
          <Button variant="outline" size="sm" onClick={() => setProductPickerOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            {t('admin.collections.addProducts')}
          </Button>
        </div>

        {displaySlugs.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-lg">
            <Layers className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">{t('admin.collections.noProducts')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('admin.collections.addProductsHint')}
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-lg divide-y divide-border">
            {displaySlugs.map((slug, index) => {
              const listing = listingsBySlug.get(slug);
              return (
                <div key={slug} className="flex items-center gap-3 p-3">
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-5 h-5"
                      disabled={index === 0}
                      onClick={() => handleMoveProduct(index, 'up')}
                      aria-label="Move up"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-5 h-5"
                      disabled={index === displaySlugs.length - 1}
                      onClick={() => handleMoveProduct(index, 'down')}
                      aria-label="Move down"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </div>
                  <GripVertical className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                  {listing?.thumbnail ? (
                    <img
                      src={getImageUrl(listing.thumbnail.small || listing.thumbnail.tiny)}
                      alt={listing.title}
                      className="w-10 h-10 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted shrink-0 flex items-center justify-center">
                      <Layers className="w-4 h-4 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{listing?.title || slug}</p>
                    {listing && <p className="text-xs text-muted-foreground truncate">{slug}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 shrink-0"
                    onClick={() => handleRemoveProduct(slug)}
                    aria-label={t('admin.collections.removeProduct')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        {displaySlugs.length > 1 && (
          <p className="text-xs text-muted-foreground">{t('admin.collections.dragToReorder')}</p>
        )}
      </div>

      {/* Save button */}
      <Button onClick={handleSave} disabled={saving} data-testid="save-collection-btn">
        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {t('admin.collections.save')}
      </Button>

      {/* Product picker dialog */}
      {productPickerOpen && (
        <ProductPickerDialog
          open={productPickerOpen}
          onOpenChange={setProductPickerOpen}
          existingSlugs={[...existingSlugsSet]}
          onAdd={handleAddProducts}
          adding={addingSlugs}
        />
      )}
    </div>
  );
}

interface ProductPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingSlugs: string[];
  onAdd: (slugs: string[]) => void;
  adding: boolean;
}

function ProductPickerDialog({
  open,
  onOpenChange,
  existingSlugs,
  onAdd,
  adding,
}: ProductPickerDialogProps) {
  const { t } = useI18n();
  const [allProducts, setAllProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    productDataService
      .getMyListings()
      .then(items => {
        if (!cancelled) setAllProducts(items ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setAllProducts([]);
          setError(t('admin.collections.fetchError'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const existingSet = useMemo(() => new Set(existingSlugs), [existingSlugs]);

  const filtered = useMemo(() => {
    const available = allProducts.filter(p => !existingSet.has(p.slug));
    if (!search.trim()) return available;
    const q = search.toLowerCase();
    return available.filter(
      p => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
    );
  }, [allProducts, existingSet, search]);

  const toggleProduct = useCallback((slug: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('admin.collections.selectProducts')}</DialogTitle>
          <DialogDescription>{t('admin.collections.selectProductsDesc')}</DialogDescription>
        </DialogHeader>

        <div className="relative my-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('admin.products.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 border border-border rounded-lg divide-y divide-border">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-10 text-sm text-destructive">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              {t('admin.products.noResults')}
            </div>
          ) : (
            filtered.map(p => (
              <label
                key={p.slug}
                className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selected.has(p.slug)}
                  onCheckedChange={() => toggleProduct(p.slug)}
                />
                {p.thumbnail ? (
                  <img
                    src={getImageUrl(p.thumbnail.small || p.thumbnail.tiny)}
                    alt={p.title}
                    className="w-8 h-8 rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-muted shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.slug}</p>
                </div>
              </label>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button disabled={selected.size === 0 || adding} onClick={() => onAdd([...selected])}>
            {adding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('admin.collections.addProducts')} ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CollectionForm;
