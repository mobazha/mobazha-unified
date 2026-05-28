'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload,
  Link2,
  Key,
  FileText,
  Trash2,
  Plus,
  AlertCircle,
  Loader2,
  Info,
  Pencil,
  ExternalLink,
} from 'lucide-react';
import {
  useI18n,
  digitalAssetsApi,
  MAX_DIGITAL_ASSET_UPLOAD_BYTES,
  uploadDigitalFileStream,
} from '@mobazha/core';
import type { DigitalAssetInfo, DigitalAssetType } from '@mobazha/core';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { LicenseKeyPoolPanel } from './LicenseKeyPoolPanel';

export interface DigitalAssetsManagerSectionProps {
  /** Listing slug — must be persisted before assets can be attached. */
  listingSlug: string | null | undefined;
  /** Optional variant SKU scope; defaults to listing-wide assets. */
  variantSku?: string;
  /** Whether the user can mutate (create/delete) assets. */
  readOnly?: boolean;
  className?: string;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(1))} ${units[Math.min(i, units.length - 1)]}`;
}

const TYPE_META: Record<
  DigitalAssetType,
  { icon: React.ElementType; labelKey: string; defaultLabel: string }
> = {
  file: {
    icon: FileText,
    labelKey: 'digital.assetType.file',
    defaultLabel: 'File',
  },
  link: {
    icon: Link2,
    labelKey: 'digital.assetType.link',
    defaultLabel: 'Link',
  },
  license_key: {
    icon: Key,
    labelKey: 'digital.assetType.license_key',
    defaultLabel: 'License keys',
  },
};

export function DigitalAssetsManagerSection({
  listingSlug,
  variantSku,
  readOnly = false,
  className,
}: DigitalAssetsManagerSectionProps) {
  const { t } = useI18n();
  const { toast } = useToast();

  const [assets, setAssets] = useState<DigitalAssetInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [showFileDialog, setShowFileDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showLicenseKeyDialog, setShowLicenseKeyDialog] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingLinkAsset, setEditingLinkAsset] = useState<DigitalAssetInfo | null>(null);

  const persisted = typeof listingSlug === 'string' && listingSlug.length > 0;
  const variantScoped = Boolean(variantSku?.trim());

  // License key asset (if any) for nested pool management
  const licenseKeyAsset = useMemo(() => assets.find(a => a.assetType === 'license_key'), [assets]);

  // Load assets
  useEffect(() => {
    if (!persisted || variantScoped) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAssets([]);
      return;
    }

    let cancelled = false;
    // Refetch on persistence change or refreshKey bump.
    setLoading(true);
    setError(null);

    digitalAssetsApi
      .listAssets(listingSlug as string, variantSku)
      .then(data => {
        if (cancelled) return;
        setAssets(Array.isArray(data) ? data : []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status = (err as { status?: number })?.status;
        if (status === 404) {
          setAssets([]);
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : t('common.unknownError', { defaultValue: 'Unknown error' })
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [listingSlug, variantSku, refreshKey, persisted, variantScoped, t]);

  const handleAssetCreated = useCallback(
    (asset: DigitalAssetInfo) => {
      setAssets(prev => [...prev, asset]);
      toast({
        title: t('listing.digital.assetAdded', { defaultValue: 'Digital asset added' }),
      });
    },
    [t, toast]
  );

  const handleDelete = useCallback(async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    try {
      await digitalAssetsApi.deleteAsset(id);
      setAssets(prev => prev.filter(a => a.id !== id));
      toast({
        title: t('listing.digital.assetDeleted', { defaultValue: 'Digital asset deleted' }),
      });
    } catch (err) {
      toast({
        title: t('common.error', { defaultValue: 'Error' }),
        description:
          err instanceof Error
            ? err.message
            : t('listing.digital.deleteFailed', { defaultValue: 'Failed to delete asset' }),
        variant: 'destructive',
      });
    }
  }, [pendingDeleteId, t, toast]);

  const handleLinkUpdated = useCallback(
    (updated: DigitalAssetInfo) => {
      setAssets(prev => prev.map(a => (a.id === updated.id ? updated : a)));
      toast({
        title: t('listing.digital.assetUpdated', { defaultValue: 'Digital asset updated' }),
      });
    },
    [t, toast]
  );

  // Render gating UI when listing isn't saved yet
  if (!persisted) {
    return (
      <Card className={cn('p-6', className)}>
        <h2 className="text-lg font-semibold mb-1">
          {t('listing.digital.title', { defaultValue: 'Digital downloads' })}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t('listing.digital.description', {
            defaultValue: 'Provide files, access links, or license keys delivered after purchase.',
          })}
        </p>
        <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            {t('listing.digital.saveFirst', {
              defaultValue:
                'Save the listing first, then come back to attach files, links, or license keys.',
            })}
          </span>
        </div>
      </Card>
    );
  }

  if (variantScoped) {
    return (
      <Card className={cn('p-6', className)}>
        <h2 className="text-lg font-semibold mb-1">
          {t('listing.digital.title', { defaultValue: 'Digital downloads' })}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t('listing.digital.description', {
            defaultValue: 'Provide files, access links, or license keys delivered after purchase.',
          })}
        </p>
        <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            {t('listing.digital.variantUnsupported', {
              defaultValue:
                'Variant-specific digital delivery is not supported in Phase 1. Configure digital assets at the listing level.',
            })}
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-start justify-between mb-1 gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            {t('listing.digital.title', { defaultValue: 'Digital downloads' })}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('listing.digital.description', {
              defaultValue:
                'Provide files, access links, or license keys delivered after purchase.',
            })}
          </p>
        </div>
      </div>

      {/* Add buttons */}
      {!readOnly && (
        <div className="flex flex-wrap gap-2 mt-4 mb-4">
          <Button type="button" variant="outline" size="sm" onClick={() => setShowFileDialog(true)}>
            <Upload className="w-4 h-4 mr-1.5" />
            {t('listing.digital.addFile', { defaultValue: 'Upload file' })}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowLinkDialog(true)}>
            <Link2 className="w-4 h-4 mr-1.5" />
            {t('listing.digital.addLink', { defaultValue: 'Add link' })}
          </Button>
          {!licenseKeyAsset && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowLicenseKeyDialog(true)}
            >
              <Key className="w-4 h-4 mr-1.5" />
              {t('listing.digital.addLicenseKeys', { defaultValue: 'Set up license keys' })}
            </Button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 mb-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setRefreshKey(k => k + 1)}>
            {t('common.retry', { defaultValue: 'Retry' })}
          </Button>
        </div>
      )}

      {/* Loading */}
      {loading && assets.length === 0 && (
        <div className="flex items-center gap-2 py-6 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('common.loading', { defaultValue: 'Loading…' })}
        </div>
      )}

      {/* Empty state */}
      {!loading && assets.length === 0 && !error && (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t('listing.digital.emptyState', {
            defaultValue: 'No digital downloads yet. Add a file, link, or license key pool.',
          })}
        </div>
      )}

      {/* Assets list */}
      {assets.length > 0 && (
        <div className="space-y-2">
          {assets.map(asset => {
            const meta = TYPE_META[asset.assetType];
            const Icon = meta?.icon ?? FileText;
            const isLink = asset.assetType === 'link';
            return (
              <div
                key={asset.id}
                className="flex items-center gap-3 p-3 rounded-md border border-border bg-muted/30"
              >
                <div className="w-9 h-9 rounded-md bg-background flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">
                      {asset.fileName ||
                        t(meta?.labelKey ?? '', {
                          defaultValue: meta?.defaultLabel ?? asset.assetType,
                        })}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {t(meta?.labelKey ?? '', {
                        defaultValue: meta?.defaultLabel ?? asset.assetType,
                      })}
                    </Badge>
                  </div>
                  {isLink && asset.url && (
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline mt-0.5 truncate max-w-full"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">{asset.url}</span>
                    </a>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                    {asset.fileSize ? <span>{formatBytes(asset.fileSize)}</span> : null}
                    {asset.maxDownloads > 0 && asset.assetType === 'file' && (
                      <span>
                        {t('listing.digital.maxDownloadsValue', {
                          defaultValue: 'Max {{n}} downloads',
                          n: asset.maxDownloads,
                        })}
                      </span>
                    )}
                    {asset.expiryHours > 0 && asset.assetType === 'file' && (
                      <span>
                        {t('listing.digital.expiryHoursValue', {
                          defaultValue: 'URL expires in {{h}}h',
                          h: asset.expiryHours,
                        })}
                      </span>
                    )}
                  </div>
                </div>
                {!readOnly && (
                  <div className="flex items-center gap-1 shrink-0">
                    {isLink && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingLinkAsset(asset)}
                        aria-label={t('common.edit', { defaultValue: 'Edit' })}
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingDeleteId(asset.id)}
                      aria-label={t('common.delete', { defaultValue: 'Delete' })}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* License Key pool sub-section */}
      {licenseKeyAsset && (
        <div className="mt-6 pt-6 border-t border-border">
          <LicenseKeyPoolPanel
            listingSlug={listingSlug as string}
            variantSku={variantSku}
            readOnly={readOnly}
          />
        </div>
      )}

      {/* Dialogs */}
      {showFileDialog && (
        <UploadFileDialog
          listingSlug={listingSlug as string}
          variantSku={variantSku}
          onClose={() => setShowFileDialog(false)}
          onCreated={asset => {
            handleAssetCreated(asset);
            setShowFileDialog(false);
          }}
        />
      )}
      {showLinkDialog && (
        <CreateLinkDialog
          listingSlug={listingSlug as string}
          variantSku={variantSku}
          onClose={() => setShowLinkDialog(false)}
          onCreated={asset => {
            handleAssetCreated(asset);
            setShowLinkDialog(false);
          }}
        />
      )}
      {showLicenseKeyDialog && (
        <CreateLicenseKeyAssetDialog
          listingSlug={listingSlug as string}
          variantSku={variantSku}
          onClose={() => setShowLicenseKeyDialog(false)}
          onCreated={asset => {
            handleAssetCreated(asset);
            setShowLicenseKeyDialog(false);
          }}
        />
      )}

      {editingLinkAsset && (
        <EditLinkDialog
          asset={editingLinkAsset}
          onClose={() => setEditingLinkAsset(null)}
          onUpdated={updated => {
            handleLinkUpdated(updated);
            setEditingLinkAsset(null);
          }}
        />
      )}

      {pendingDeleteId && (
        <Dialog open onOpenChange={open => !open && setPendingDeleteId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t('listing.digital.confirmDeleteTitle', { defaultValue: 'Delete digital asset?' })}
              </DialogTitle>
              <DialogDescription>
                {t('listing.digital.confirmDeleteDesc', {
                  defaultValue:
                    'Existing buyers will no longer receive this asset on new orders. Past entitlements are preserved.',
                })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setPendingDeleteId(null)}>
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                {t('common.delete', { defaultValue: 'Delete' })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

// =====================================================================
// File upload dialog
// =====================================================================

interface UploadFileDialogProps {
  listingSlug: string;
  variantSku?: string;
  onClose: () => void;
  onCreated: (asset: DigitalAssetInfo) => void;
}

function UploadFileDialog({ listingSlug, variantSku, onClose, onCreated }: UploadFileDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [percent, setPercent] = useState<number>(0);
  const [transferred, setTransferred] = useState<{ loaded: number; total: number } | null>(null);
  // Track abort controller in a ref so the cancel handler can reach it.
  const abortRef = useRef<AbortController | null>(null);

  const applySelectedFile = useCallback(
    (f: File) => {
      if (f.size > MAX_DIGITAL_ASSET_UPLOAD_BYTES) {
        toast({
          title: t('common.error', { defaultValue: 'Error' }),
          description: t('listing.digital.fileTooLarge', {
            defaultValue: 'File exceeds 512 MiB upload limit',
          }),
          variant: 'destructive',
        });
        return false;
      }
      setFile(f);
      setPercent(0);
      setTransferred(null);
      return true;
    },
    [t, toast]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setFile(null);
      return;
    }
    if (!applySelectedFile(f)) {
      e.target.value = '';
    }
  };

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (uploading) return;
      if (e.dataTransfer.types.includes('Files')) setIsDragOver(true);
    },
    [uploading]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as HTMLElement)) return;
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (uploading) return;
      const dropped = e.dataTransfer.files?.[0];
      if (dropped) applySelectedFile(dropped);
    },
    [applySelectedFile, uploading]
  );

  const handleUpload = async () => {
    if (!file) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setUploading(true);
    setPercent(0);
    setTransferred({ loaded: 0, total: file.size });
    try {
      const asset = await uploadDigitalFileStream(
        {
          listingSlug,
          variantSku,
          fileName: file.name,
          mimeType: file.type || undefined,
          file,
        },
        {
          signal: controller.signal,
          onProgress: (loaded, total) => {
            setTransferred({ loaded, total });
            setPercent(total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0);
          },
        }
      );
      onCreated(asset);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        toast({
          title: t('listing.digital.uploadCancelled', { defaultValue: 'Upload cancelled' }),
        });
      } else {
        toast({
          title: t('common.error', { defaultValue: 'Error' }),
          description:
            err instanceof Error
              ? err.message
              : t('listing.digital.uploadFailed', { defaultValue: 'Upload failed' }),
          variant: 'destructive',
        });
      }
    } finally {
      abortRef.current = null;
      setUploading(false);
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  return (
    <Dialog open onOpenChange={open => !open && !uploading && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('listing.digital.uploadFileTitle', { defaultValue: 'Upload digital file' })}
          </DialogTitle>
          <DialogDescription>
            {t('listing.digital.uploadFileDesc', {
              defaultValue:
                'File is encrypted on the server and delivered to buyers via a signed download URL.',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
            aria-label={t('listing.digital.selectFile', { defaultValue: 'Select file' })}
          />
          {!file ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                'w-full border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 hover:bg-muted/30 transition-colors disabled:opacity-50',
                isDragOver && 'border-primary bg-primary/5 ring-2 ring-primary/30'
              )}
              disabled={uploading}
            >
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">
                {t('listing.digital.selectFile', { defaultValue: 'Select file' })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('listing.digital.uploadHint', {
                  defaultValue: 'Drag and drop or click to select a file',
                })}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('listing.digital.maxSizeHint', {
                  defaultValue: 'Max 512 MiB per file',
                })}
              </p>
            </button>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-md border border-border bg-muted/30">
              <FileText className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              {!uploading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                  aria-label={t('common.remove', { defaultValue: 'Remove' })}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
          {uploading && (
            <div className="space-y-1.5">
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                aria-label={t('listing.digital.uploadProgress', {
                  defaultValue: 'Upload progress',
                })}
              >
                <div
                  className="h-full bg-primary transition-[width] duration-150 ease-out"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {t('listing.digital.uploading', { defaultValue: 'Uploading…' })}
                </span>
                <span className="tabular-nums">
                  {transferred
                    ? `${formatBytes(transferred.loaded)} / ${formatBytes(transferred.total)} (${percent}%)`
                    : `${percent}%`}
                </span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {uploading ? (
            <Button variant="ghost" onClick={handleCancel}>
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
          ) : (
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
          )}
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading
              ? t('listing.digital.uploading', { defaultValue: 'Uploading…' })
              : t('listing.digital.upload', { defaultValue: 'Upload' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================================
// Link create dialog
// =====================================================================

interface CreateLinkDialogProps {
  listingSlug: string;
  variantSku?: string;
  onClose: () => void;
  onCreated: (asset: DigitalAssetInfo) => void;
}

function CreateLinkDialog({ listingSlug, variantSku, onClose, onCreated }: CreateLinkDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isValidUrl = useMemo(() => {
    try {
      const parsed = new URL(url.trim());
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }, [url]);

  const handleSubmit = async () => {
    if (!isValidUrl) return;
    setSubmitting(true);
    try {
      const asset = await digitalAssetsApi.createLinkAsset({
        listingSlug,
        variantSku,
        url: url.trim(),
      });
      onCreated(asset);
    } catch (err) {
      toast({
        title: t('common.error', { defaultValue: 'Error' }),
        description:
          err instanceof Error
            ? err.message
            : t('listing.digital.createLinkFailed', { defaultValue: 'Failed to add link' }),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={open => !open && !submitting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('listing.digital.addLinkTitle', { defaultValue: 'Add access link' })}
          </DialogTitle>
          <DialogDescription>
            {t('listing.digital.addLinkDesc', {
              defaultValue:
                'The URL is encrypted at rest and revealed to buyers only after the order is confirmed.',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="digital-link-url">
              {t('listing.digital.urlLabel', { defaultValue: 'Access URL' })}
            </Label>
            <Input
              id="digital-link-url"
              type="url"
              placeholder="https://drive.example.com/folder/abc"
              value={url}
              onChange={e => setUrl(e.target.value)}
              disabled={submitting}
              className="mt-1"
            />
            {url && !isValidUrl && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {t('listing.digital.invalidUrl', {
                  defaultValue: 'Enter a valid http(s) URL',
                })}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button onClick={handleSubmit} disabled={!isValidUrl || submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                {t('common.saving', { defaultValue: 'Saving…' })}
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                {t('listing.digital.addLink', { defaultValue: 'Add link' })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================================
// License Key asset create dialog (pool placeholder)
// =====================================================================

interface CreateLicenseKeyAssetDialogProps {
  listingSlug: string;
  variantSku?: string;
  onClose: () => void;
  onCreated: (asset: DigitalAssetInfo) => void;
}

function CreateLicenseKeyAssetDialog({
  listingSlug,
  variantSku,
  onClose,
  onCreated,
}: CreateLicenseKeyAssetDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [appId, setAppId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const asset = await digitalAssetsApi.createLicenseKeyAsset({
        listingSlug,
        variantSku,
        appId: appId.trim() || undefined,
      });
      onCreated(asset);
    } catch (err) {
      toast({
        title: t('common.error', { defaultValue: 'Error' }),
        description:
          err instanceof Error
            ? err.message
            : t('listing.digital.createLicenseKeyFailed', {
                defaultValue: 'Failed to set up license key pool',
              }),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={open => !open && !submitting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('listing.digital.licenseKeyPoolTitle', {
              defaultValue: 'Set up license key pool',
            })}
          </DialogTitle>
          <DialogDescription>
            {t('listing.digital.licenseKeyPoolDesc', {
              defaultValue:
                'Each buyer receives one key from the pool at order confirmation. Import keys below after creating the pool.',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="digital-license-appid">
              {t('listing.digital.appIdLabel', {
                defaultValue: 'App identifier (optional)',
              })}
            </Label>
            <Input
              id="digital-license-appid"
              type="text"
              placeholder="com.example.app"
              value={appId}
              onChange={e => setAppId(e.target.value)}
              disabled={submitting}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('listing.digital.appIdHint', {
                defaultValue:
                  'Used by the public license validation API to scope keys to your app.',
              })}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                {t('common.saving', { defaultValue: 'Saving…' })}
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                {t('listing.digital.createPool', { defaultValue: 'Create pool' })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================================
// Link edit dialog
// =====================================================================

interface EditLinkDialogProps {
  asset: DigitalAssetInfo;
  onClose: () => void;
  onUpdated: (asset: DigitalAssetInfo) => void;
}

function EditLinkDialog({ asset, onClose, onUpdated }: EditLinkDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [url, setUrl] = useState(asset.url ?? '');
  const [submitting, setSubmitting] = useState(false);

  const isValidUrl = useMemo(() => {
    try {
      const parsed = new URL(url.trim());
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }, [url]);

  const hasChanged = url.trim() !== (asset.url ?? '');

  const handleSubmit = async () => {
    if (!isValidUrl || !hasChanged) return;
    setSubmitting(true);
    try {
      const updated = await digitalAssetsApi.updateAsset(asset.id, { url: url.trim() });
      onUpdated(updated);
    } catch (err) {
      toast({
        title: t('common.error', { defaultValue: 'Error' }),
        description:
          err instanceof Error
            ? err.message
            : t('listing.digital.updateLinkFailed', { defaultValue: 'Failed to update link' }),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={open => !open && !submitting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('listing.digital.editLinkTitle', { defaultValue: 'Edit access link' })}
          </DialogTitle>
          <DialogDescription>
            {t('listing.digital.editLinkDesc', {
              defaultValue:
                'Update the URL. Changes will not affect already-delivered entitlements.',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="edit-link-url">
              {t('listing.digital.urlLabel', { defaultValue: 'Access URL' })}
            </Label>
            <Input
              id="edit-link-url"
              type="url"
              placeholder="https://drive.example.com/folder/abc"
              value={url}
              onChange={e => setUrl(e.target.value)}
              disabled={submitting}
              className="mt-1"
            />
            {url && !isValidUrl && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {t('listing.digital.invalidUrl', {
                  defaultValue: 'Enter a valid http(s) URL',
                })}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button onClick={handleSubmit} disabled={!isValidUrl || !hasChanged || submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                {t('common.saving', { defaultValue: 'Saving…' })}
              </>
            ) : (
              t('common.save', { defaultValue: 'Save' })
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DigitalAssetsManagerSection;
