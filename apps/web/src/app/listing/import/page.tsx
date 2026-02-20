'use client';

import React, { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui';
import { useI18n, getGatewayUrl } from '@mobazha/core';
import {
  ArrowLeft,
  Download,
  Upload,
  FileArchive,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

const MAX_FILE_SIZE = 300 * 1024 * 1024; // 300MB

interface ImportResult {
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors?: { row: number; title: string; error: string }[];
  createdItems?: { slug: string; title: string }[];
  updatedItems?: { slug: string; title: string }[];
}

export default function ImportListingsPage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileSizeError, setFileSizeError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showSuccessDetails, setShowSuccessDetails] = useState(false);

  // Get template language based on current locale
  const templateLang = locale?.startsWith('zh') ? 'zh' : 'en';

  // Download template
  const handleDownloadTemplate = useCallback(async () => {
    if (downloading) return;

    setDownloading(true);
    try {
      const url = `${getGatewayUrl()}/listings/template?lang=${templateLang}`;
      window.open(url, '_blank');
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

  // Handle file selection
  const handleFileSelect = useCallback((file: File | null) => {
    if (!file) return;

    setFileSizeError(false);
    setImportResult(null);

    if (file.size > MAX_FILE_SIZE) {
      setFileSizeError(true);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Start import
  const handleStartImport = useCallback(async () => {
    if (!selectedFile || importing) return;

    setImporting(true);
    setUploadProgress(0);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Use XMLHttpRequest for progress tracking
      const result = await new Promise<ImportResult>((resolve, reject) => {
        // eslint-disable-next-line no-undef
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', event => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded * 100) / event.total));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.error || `Request failed with status ${xhr.status}`));
            } catch {
              reject(new Error(`Request failed with status ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error'));
        });

        xhr.open('POST', `${getGatewayUrl()}/listings/import`);
        xhr.send(formData);
      });

      setImportResult(result);

      if (result.created > 0 || result.updated > 0) {
        toast({
          title: t('importListings.success'),
          description: t('importListings.importComplete'),
        });
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
      setUploadProgress(100);
    }
  }, [selectedFile, importing, t, toast]);

  const canImport = selectedFile && !fileSizeError && !importing;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-8">
        <Container size="md">
          {/* Page Header */}
          <HStack gap="md" align="center" className="mb-8">
            <Link
              href="/profile"
              className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t('importListings.title')}</h1>
              <p className="text-muted-foreground">{t('importListings.subtitle')}</p>
            </div>
          </HStack>

          <VStack gap="lg">
            {/* Step 1: Download Template */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-2">{t('importListings.step1Title')}</h2>
              <p className="text-muted-foreground text-sm mb-4">{t('importListings.step1Desc')}</p>
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
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-2">{t('importListings.step2Title')}</h2>
              <p className="text-muted-foreground text-sm mb-4">{t('importListings.step2Desc')}</p>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
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
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">{t('importListings.dropOrClick')}</p>
                    <p className="text-xs text-muted-foreground">{t('importListings.maxSize')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <FileArchive className="h-10 w-10 mx-auto text-primary" />
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
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
            {importing && (
              <Card className="p-4">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  {t('importListings.uploadingProgress', { progress: uploadProgress })}
                </p>
              </Card>
            )}

            {/* Results */}
            {importResult && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">{t('importListings.resultsTitle')}</h2>

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

                {/* Error List */}
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

                {/* Success Details Toggle */}
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
