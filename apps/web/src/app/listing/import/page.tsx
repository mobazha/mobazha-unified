'use client';

import React, { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import JSZip from 'jszip';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui';
import { useI18n } from '@mobazha/core';
import { getMyGatewayUrl, getAuthHeaders } from '@mobazha/core/services/api/config';
import {
  ArrowLeft,
  Download,
  Upload,
  FileArchive,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Package,
  User,
} from 'lucide-react';

const MAX_FILE_SIZE = 300 * 1024 * 1024; // 300MB
const BATCH_SIZE = 50;

interface ImportResult {
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors?: { row: number; title: string; error: string }[];
  createdItems?: { slug: string; title: string }[];
  updatedItems?: { slug: string; title: string }[];
  profileImported?: boolean;
  profileError?: string;
}

interface BatchProgress {
  currentBatch: number;
  totalBatches: number;
  phase: 'uploading' | 'processing';
  uploadPercent: number;
  processedListings: number;
  totalListings: number;
}

type ImportFormat = 'json' | 'excel' | 'unknown';

interface ZipAnalysis {
  format: ImportFormat;
  listingCount: number;
  imageCount: number;
  hasShippingProfiles: boolean;
  hasCollections: boolean;
  hasProfile: boolean;
  hasAvatar: boolean;
  hasHeader: boolean;
  profileName: string;
}

function aggregateResults(results: ImportResult[]): ImportResult {
  const aggregate: ImportResult = {
    total: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
    createdItems: [],
    updatedItems: [],
  };
  for (const r of results) {
    aggregate.total += r.total;
    aggregate.created += r.created;
    aggregate.updated += r.updated;
    aggregate.failed += r.failed;
    if (r.errors) aggregate.errors!.push(...r.errors);
    if (r.createdItems) aggregate.createdItems!.push(...r.createdItems);
    if (r.updatedItems) aggregate.updatedItems!.push(...r.updatedItems);
    if (r.profileImported) aggregate.profileImported = true;
    if (r.profileError) aggregate.profileError = r.profileError;
  }
  return aggregate;
}

function findListingsJsonPath(zip: JSZip): string | null {
  const jsonPaths: string[] = [];
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const lower = path.toLowerCase();
    if (lower.endsWith('.json') && !lower.includes('__macosx')) {
      jsonPaths.push(path);
    }
  }
  return (
    jsonPaths.find(
      p => p.toLowerCase().endsWith('/listings.json') || p.toLowerCase() === 'listings.json'
    ) ??
    jsonPaths[0] ??
    null
  );
}

const profileImageExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function isProfileImage(path: string): 'avatar' | 'header' | null {
  if (path.endsWith('/')) return null;
  const lower = path.toLowerCase();
  if (lower.includes('__macosx')) return null;
  if (lower.includes('/images/') || lower.startsWith('images/')) return null;
  if (lower.includes('/videos/') || lower.startsWith('videos/')) return null;
  const basename = path.split('/').pop() ?? '';
  const ext =
    basename.lastIndexOf('.') >= 0 ? basename.slice(basename.lastIndexOf('.')).toLowerCase() : '';
  if (!profileImageExts.has(ext)) return null;
  const nameNoExt = basename.slice(0, basename.lastIndexOf('.')).toLowerCase();
  if (nameNoExt === 'avatar') return 'avatar';
  if (nameNoExt === 'header') return 'header';
  return null;
}

function findProfileJsonPath(zip: JSZip): string | null {
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const lower = path.toLowerCase();
    if (lower.includes('__macosx')) continue;
    if (lower.endsWith('/profile.json') || lower === 'profile.json') return path;
  }
  return null;
}

function isImageEntry(path: string): boolean {
  if (path.endsWith('/')) return false;
  const lower = path.toLowerCase();
  if (lower.includes('__macosx')) return false;
  const parts = lower.split('/');
  return parts.includes('images');
}

function getImageBasename(path: string): string {
  return path.split('/').pop() ?? '';
}

async function analyzeZip(file: File): Promise<{ zip: JSZip; analysis: ZipAnalysis }> {
  const zip = await JSZip.loadAsync(file);
  let format: ImportFormat = 'unknown';
  let listingCount = 0;
  let imageCount = 0;
  let hasShippingProfiles = false;
  let hasCollections = false;
  let hasAvatar = false;
  let hasHeader = false;

  const jsonPath = findListingsJsonPath(zip);
  const profileJsonPath = findProfileJsonPath(zip);
  let hasExcel = false;

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const lower = path.toLowerCase();
    if (lower.endsWith('.xlsx') && !lower.includes('__macosx')) {
      hasExcel = true;
    } else if (isImageEntry(path)) {
      imageCount++;
    } else {
      const slot = isProfileImage(path);
      if (slot === 'avatar') hasAvatar = true;
      else if (slot === 'header') hasHeader = true;
    }
  }

  let hasProfile = false;
  let profileName = '';

  if (jsonPath) {
    format = 'json';
    try {
      const text = await zip.file(jsonPath)!.async('string');
      const data = JSON.parse(text);
      listingCount = data.listings?.length ?? 0;
      hasShippingProfiles = (data.shippingProfiles?.length ?? 0) > 0;
      hasCollections = (data.collections?.length ?? 0) > 0;
      if (data.profile?.name) {
        hasProfile = true;
        profileName = data.profile.name;
      }
    } catch {
      /* invalid JSON will be caught by server */
    }
  } else if (hasExcel) {
    format = 'excel';
  }

  if (!hasProfile && profileJsonPath) {
    try {
      const text = await zip.file(profileJsonPath)!.async('string');
      const data = JSON.parse(text);
      if (data.name) {
        hasProfile = true;
        profileName = data.name;
      }
    } catch {
      /* ignore parse errors */
    }
  }

  return {
    zip,
    analysis: {
      format,
      listingCount,
      imageCount,
      hasShippingProfiles,
      hasCollections,
      hasProfile,
      hasAvatar,
      hasHeader,
      profileName,
    },
  };
}

async function buildBatchZip(
  zip: JSZip,
  jsonContent: Record<string, unknown>,
  batchListings: Record<string, unknown>[],
  isFirstBatch: boolean,
  profileData?: Record<string, unknown> | null
): Promise<Blob> {
  const batchZip = new JSZip();

  const payload: Record<string, unknown> = { listings: batchListings };
  if (isFirstBatch) {
    if (jsonContent.shippingProfiles) payload.shippingProfiles = jsonContent.shippingProfiles;
    if (jsonContent.collections) payload.collections = jsonContent.collections;
    if (profileData) payload.profile = profileData;
  }

  batchZip.file('listings.json', JSON.stringify(payload));

  const neededImages = new Set<string>();
  for (const listing of batchListings) {
    const images = (listing as { images?: string[] }).images;
    if (images) {
      for (const img of images) neededImages.add(img);
    }
  }

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;

    if (isImageEntry(path)) {
      const basename = getImageBasename(path);
      if (basename && neededImages.has(basename)) {
        const data = await entry.async('uint8array');
        batchZip.file(`images/${basename}`, data);
      }
    } else if (isFirstBatch) {
      const slot = isProfileImage(path);
      if (slot) {
        const basename = path.split('/').pop() ?? '';
        const data = await entry.async('uint8array');
        batchZip.file(basename, data);
      }
    }
  }

  return batchZip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 1 },
  });
}

function uploadBatchZip(
  blob: Blob,
  gatewayUrl: string,
  authHeaders: Record<string, string>,
  onUploadProgress: (pct: number) => void
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', blob, 'batch.zip');

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', event => {
      if (event.lengthComputable) {
        onUploadProgress(Math.round((event.loaded * 100) / event.total));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const resp = JSON.parse(xhr.responseText);
          resolve(resp.data ?? resp);
        } catch {
          reject(new Error('Invalid JSON response'));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          const msg = errorData.error?.message ?? errorData.error ?? `HTTP ${xhr.status}`;
          reject(new Error(msg));
        } catch {
          reject(new Error(`Request failed with status ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.addEventListener('timeout', () => reject(new Error('Request timed out')));
    xhr.timeout = 600_000; // 10 min per batch

    xhr.open('POST', `${gatewayUrl}/listings/import`);
    if (authHeaders['Authorization']) {
      xhr.setRequestHeader('Authorization', authHeaders['Authorization']);
    }
    xhr.send(formData);
  });
}

export default function ImportListingsPage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileSizeError, setFileSizeError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showSuccessDetails, setShowSuccessDetails] = useState(false);
  const [zipAnalysis, setZipAnalysis] = useState<ZipAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);

  const templateLang = locale?.startsWith('zh') ? 'zh' : 'en';

  const handleDownloadTemplate = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const url = `${getMyGatewayUrl()}/listings/template?lang=${templateLang}`;
      const headers = getAuthHeaders();
      delete headers['Content-Type'];
      const resp = await fetch(url, { headers });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `listings_template_${templateLang}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Failed to download template:', error);
      toast({
        title: t('importListings.error'),
        description: t('importListings.downloadError'),
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  }, [downloading, templateLang, t, toast]);

  const handleFileSelect = useCallback(async (file: File | null) => {
    if (!file) return;

    setFileSizeError(false);
    setImportResult(null);
    setZipAnalysis(null);
    setBatchProgress(null);

    if (file.size > MAX_FILE_SIZE) {
      setFileSizeError(true);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);

    setAnalyzing(true);
    try {
      const { analysis } = await analyzeZip(file);
      setZipAnalysis(analysis);
    } catch {
      setZipAnalysis(null);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.name.toLowerCase().endsWith('.zip')) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setFileSizeError(false);
    setImportResult(null);
    setZipAnalysis(null);
    setBatchProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleStartImport = useCallback(async () => {
    if (!selectedFile || importing) return;

    setImporting(true);
    setImportResult(null);
    setBatchProgress(null);

    const gatewayUrl = getMyGatewayUrl();
    const authHeaders = getAuthHeaders();

    try {
      if (zipAnalysis?.format === 'json' && zipAnalysis.listingCount > BATCH_SIZE) {
        const zip = await JSZip.loadAsync(selectedFile);

        const jsonPath = findListingsJsonPath(zip);
        let jsonContent: Record<string, unknown> = {};
        if (jsonPath) {
          const text = await zip.file(jsonPath)!.async('string');
          jsonContent = JSON.parse(text);
        }

        let profileData: Record<string, unknown> | null = null;
        if (jsonContent.profile) {
          profileData = jsonContent.profile as Record<string, unknown>;
        } else {
          const profilePath = findProfileJsonPath(zip);
          if (profilePath) {
            try {
              const profText = await zip.file(profilePath)!.async('string');
              const profParsed = JSON.parse(profText);
              const {
                peerID,
                publicKey,
                stats,
                avatarHashes,
                headerHashes,
                storeAndForwardServers,
                lastModified,
                currencies,
                handle,
                ...writable
              } = profParsed;
              profileData = writable;
            } catch {
              /* ignore */
            }
          }
        }

        const allListings = (jsonContent.listings ?? []) as Record<string, unknown>[];
        const totalBatches = Math.ceil(allListings.length / BATCH_SIZE);
        const batchResults: ImportResult[] = [];

        for (let i = 0; i < allListings.length; i += BATCH_SIZE) {
          const batchNum = Math.floor(i / BATCH_SIZE) + 1;
          const batchListings = allListings.slice(i, i + BATCH_SIZE);

          setBatchProgress({
            currentBatch: batchNum,
            totalBatches,
            phase: 'uploading',
            uploadPercent: 0,
            processedListings: i,
            totalListings: allListings.length,
          });

          const batchBlob = await buildBatchZip(
            zip,
            jsonContent,
            batchListings,
            i === 0,
            profileData
          );

          setBatchProgress(prev =>
            prev ? { ...prev, phase: 'uploading', uploadPercent: 0 } : null
          );

          const result = await uploadBatchZip(batchBlob, gatewayUrl, authHeaders, pct => {
            setBatchProgress(prev => (prev ? { ...prev, uploadPercent: pct } : null));
          });

          setBatchProgress(prev =>
            prev
              ? {
                  ...prev,
                  phase: 'processing',
                  uploadPercent: 100,
                  processedListings: Math.min(i + BATCH_SIZE, allListings.length),
                }
              : null
          );

          batchResults.push(result);
        }

        const aggregated = aggregateResults(batchResults);
        setImportResult(aggregated);

        if (aggregated.created > 0 || aggregated.updated > 0) {
          toast({
            title: t('importListings.success'),
            description: t('importListings.importComplete'),
          });
        }
      } else {
        setBatchProgress({
          currentBatch: 1,
          totalBatches: 1,
          phase: 'uploading',
          uploadPercent: 0,
          processedListings: 0,
          totalListings: zipAnalysis?.listingCount ?? 0,
        });

        const result = await uploadBatchZip(selectedFile, gatewayUrl, authHeaders, pct => {
          setBatchProgress(prev => (prev ? { ...prev, uploadPercent: pct } : null));
        });

        setBatchProgress(prev =>
          prev ? { ...prev, phase: 'processing', uploadPercent: 100 } : null
        );

        setImportResult(result);

        if (result.created > 0 || result.updated > 0) {
          toast({
            title: t('importListings.success'),
            description: t('importListings.importComplete'),
          });
        }
      }
    } catch (error: unknown) {
      console.error('Import failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setImportResult({
        total: 0,
        created: 0,
        updated: 0,
        failed: 1,
        errors: [{ row: 0, title: '', error: errorMsg }],
      });
    } finally {
      setImporting(false);
      setBatchProgress(null);
    }
  }, [selectedFile, importing, zipAnalysis, t, toast]);

  const canImport = selectedFile && !fileSizeError && !importing && !analyzing;

  const progressText = (() => {
    if (!batchProgress) return '';
    const { currentBatch, totalBatches, phase, uploadPercent, processedListings, totalListings } =
      batchProgress;

    if (totalBatches <= 1) {
      if (phase === 'uploading')
        return t('importListings.uploadingProgress', { progress: uploadPercent });
      return t('importListings.processingOnServer');
    }

    const batchLabel = t('importListings.batchProgress', {
      current: currentBatch,
      total: totalBatches,
    });
    if (phase === 'uploading') {
      return `${batchLabel} — ${t('importListings.uploadingProgress', { progress: uploadPercent })}`;
    }
    return `${batchLabel} — ${t('importListings.processedCount', { done: processedListings, total: totalListings })}`;
  })();

  const overallPercent = (() => {
    if (!batchProgress) return 0;
    const { currentBatch, totalBatches, uploadPercent } = batchProgress;
    const batchWeight = 100 / totalBatches;
    return Math.round((currentBatch - 1) * batchWeight + (uploadPercent / 100) * batchWeight);
  })();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-4 sm:py-8">
        <Container size="md">
          <HStack gap="md" align="center" className="mb-4 sm:mb-8">
            <Link
              href="/profile"
              className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {t('importListings.title')}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {t('importListings.subtitle')}
              </p>
            </div>
          </HStack>

          <VStack gap="lg">
            {/* Step 1: Download Template */}
            <Card className="p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-2">
                {t('importListings.step1Title')}
              </h2>
              <p className="text-muted-foreground text-sm mb-3 sm:mb-4">
                {t('importListings.step1Desc')}
              </p>
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
                disabled={downloading}
                className="gap-2"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {t('importListings.downloadTemplate')}
              </Button>
            </Card>

            {/* Step 2: Upload ZIP */}
            <Card className="p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-2">
                {t('importListings.step2Title')}
              </h2>
              <p className="text-muted-foreground text-sm mb-3 sm:mb-4">
                {t('importListings.step2Desc')}
              </p>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-border rounded-lg p-6 sm:p-8 text-center cursor-pointer hover:border-primary/50 active:border-primary/50 active:bg-muted/30 transition-colors"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".zip"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {!selectedFile ? (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-muted-foreground" />
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {t('importListings.dropOrClick')}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('importListings.maxSize')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <FileArchive className="h-10 w-10 mx-auto text-primary" />
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>

                    {/* ZIP analysis info */}
                    {analyzing && (
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {t('importListings.analyzing')}
                      </p>
                    )}
                    {zipAnalysis && (
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p className="flex items-center justify-center gap-1">
                          <Package className="h-3 w-3" />
                          {zipAnalysis.format === 'json'
                            ? t('importListings.formatJson', {
                                listings: zipAnalysis.listingCount,
                                images: zipAnalysis.imageCount,
                              })
                            : zipAnalysis.format === 'excel'
                              ? t('importListings.formatExcel', { images: zipAnalysis.imageCount })
                              : t('importListings.formatUnknown')}
                        </p>
                        {zipAnalysis.format === 'json' && zipAnalysis.listingCount > BATCH_SIZE && (
                          <p className="text-primary/80">
                            {t('importListings.willBatch', {
                              batches: Math.ceil(zipAnalysis.listingCount / BATCH_SIZE),
                              size: BATCH_SIZE,
                            })}
                          </p>
                        )}
                        {(zipAnalysis.hasProfile ||
                          zipAnalysis.hasAvatar ||
                          zipAnalysis.hasHeader) && (
                          <p className="flex items-center justify-center gap-1">
                            <User className="h-3 w-3" />
                            {t('importListings.hasProfile', {
                              name: zipAnalysis.profileName || t('importListings.storeProfile'),
                              avatar: zipAnalysis.hasAvatar ? '+ avatar' : '',
                              header: zipAnalysis.hasHeader ? '+ header' : '',
                            })}
                          </p>
                        )}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation();
                        clearFile();
                      }}
                      className="gap-1"
                    >
                      <X className="h-4 w-4" />
                      {t('importListings.clearFile')}
                    </Button>
                  </div>
                )}
              </div>

              {fileSizeError && (
                <p className="text-destructive text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {t('importListings.fileTooLarge')}
                </p>
              )}
            </Card>

            {/* Import Button */}
            <Button
              size="lg"
              onClick={handleStartImport}
              disabled={!canImport}
              className="w-full gap-2"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('importListings.importing')}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {t('importListings.startImport')}
                </>
              )}
            </Button>

            {/* Progress */}
            {importing && batchProgress && (
              <Card className="p-4">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${overallPercent}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2 text-center">{progressText}</p>
              </Card>
            )}

            {/* Results */}
            {importResult && (
              <Card className="p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-semibold mb-4">
                  {t('importListings.resultsTitle')}
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold">{importResult.total}</p>
                    <p className="text-sm text-muted-foreground">{t('importListings.total')}</p>
                  </div>
                  <div className="p-4 bg-success/15 rounded-lg text-center">
                    <p className="text-2xl font-bold text-success">{importResult.created}</p>
                    <p className="text-sm text-muted-foreground">{t('importListings.created')}</p>
                  </div>
                  <div className="p-4 bg-warning/15 rounded-lg text-center">
                    <p className="text-2xl font-bold text-warning">{importResult.updated}</p>
                    <p className="text-sm text-muted-foreground">{t('importListings.updated')}</p>
                  </div>
                  {importResult.failed > 0 && (
                    <div className="p-4 bg-error/15 rounded-lg text-center">
                      <p className="text-2xl font-bold text-error">{importResult.failed}</p>
                      <p className="text-sm text-muted-foreground">{t('importListings.failed')}</p>
                    </div>
                  )}
                </div>

                {importResult.profileImported && (
                  <div className="bg-success/15 rounded-lg p-3 mb-4 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="text-sm text-success">
                      {t('importListings.profileImported')}
                    </span>
                  </div>
                )}
                {importResult.profileError && (
                  <div className="bg-warning/15 rounded-lg p-3 mb-4 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    <span className="text-sm text-warning">
                      {t('importListings.profileImportFailed', {
                        error: importResult.profileError,
                      })}
                    </span>
                  </div>
                )}

                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="bg-error/15 rounded-lg p-4 mb-4">
                    <h3 className="text-sm font-medium mb-2 text-error">
                      {t('importListings.errorDetails')}
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {importResult.errors.map((err, index) => (
                        <div key={index} className="text-sm">
                          <span className="text-muted-foreground">
                            {t('importListings.row')} {err.row}
                            {err.title && ` - ${err.title}`}:
                          </span>
                          <span className="text-error ml-1">{err.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {((importResult.createdItems && importResult.createdItems.length > 0) ||
                  (importResult.updatedItems && importResult.updatedItems.length > 0)) && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSuccessDetails(!showSuccessDetails)}
                    >
                      {showSuccessDetails
                        ? t('importListings.hideDetails')
                        : t('importListings.showDetails')}
                    </Button>

                    {showSuccessDetails && (
                      <div className="mt-4 space-y-4">
                        {importResult.createdItems && importResult.createdItems.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">
                              {t('importListings.createdItems')}
                            </h4>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {importResult.createdItems.map(item => (
                                <p
                                  key={item.slug}
                                  className="text-sm text-muted-foreground flex items-center gap-1"
                                >
                                  <CheckCircle className="h-3 w-3 text-success" />
                                  {item.title}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                        {importResult.updatedItems && importResult.updatedItems.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">
                              {t('importListings.updatedItems')}
                            </h4>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {importResult.updatedItems.map(item => (
                                <p
                                  key={item.slug}
                                  className="text-sm text-muted-foreground flex items-center gap-1"
                                >
                                  <CheckCircle className="h-3 w-3 text-warning" />
                                  {item.title}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </Card>
            )}
          </VStack>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
