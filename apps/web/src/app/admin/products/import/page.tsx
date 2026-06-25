'use client';

import React, { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileSpreadsheet, Loader2, Package, Sparkles, Upload, X } from 'lucide-react';
import { ingestProductImport, useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

const ACCEPTED_EXTENSIONS = '.csv,.xlsx,.zip,.txt,.md,.json';
const MAX_FILES = 20;
const MAX_FILE_BYTES = 2 * 1024 * 1024;

export default function ProductImportHubPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = useCallback(
    (incoming: ArrayLike<File> | File[]) => {
      const next = [...files];
      for (const file of Array.from(incoming)) {
        if (next.length >= MAX_FILES) break;
        if (file.size > MAX_FILE_BYTES) {
          toast({
            title: t('common.error'),
            description: t('admin.productImport.errors.fileTooLarge', { name: file.name }),
            variant: 'destructive',
          });
          continue;
        }
        if (!next.some(f => f.name === file.name && f.size === file.size)) {
          next.push(file);
        }
      }
      setFiles(next);
    },
    [files, t, toast]
  );

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    try {
      const result = await ingestProductImport(files);
      router.push(`/admin/products/import/${result.skillRun.id}`);
    } catch (err) {
      toast({
        title: t('common.error'),
        description:
          err instanceof Error ? err.message : t('admin.productImport.errors.uploadFailed'),
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div>
        <Link
          href="/admin/products"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('admin.productImport.backToProducts')}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{t('admin.productImport.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('admin.productImport.subtitle')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="font-medium">{t('admin.productImport.standardTitle')}</h2>
          <p className="mt-1 flex-1 text-sm text-muted-foreground">
            {t('admin.productImport.standardDesc')}
          </p>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href="/listing/import">{t('admin.productImport.standardCta')}</Link>
          </Button>
        </Card>

        <Card className="flex flex-col border-primary/30 p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <h2 className="font-medium">{t('admin.productImport.smartTitle')}</h2>
          <p className="mt-1 flex-1 text-sm text-muted-foreground">
            {t('admin.productImport.smartDesc')}
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-1 font-medium">{t('admin.productImport.uploadTitle')}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{t('admin.productImport.uploadHint')}</p>

        <div
          role="button"
          tabIndex={0}
          className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
          onDragOver={e => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
          }}
        >
          <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">{t('admin.productImport.dropzone')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('admin.productImport.formats')}</p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={ACCEPTED_EXTENSIONS}
            multiple
            onChange={e => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {files.length > 0 && (
          <ul className="mt-4 space-y-2">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${file.size}`}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <FileSpreadsheet className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(0)} KB
                </span>
                <button
                  type="button"
                  className="rounded p-1 hover:bg-muted"
                  aria-label={t('common.remove')}
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <Button
          className="mt-4 w-full sm:w-auto"
          disabled={!files.length || uploading}
          onClick={() => void handleUpload()}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('admin.productImport.uploading')}
            </>
          ) : (
            t('admin.productImport.uploadCta', { count: files.length || 0 })
          )}
        </Button>
      </Card>
    </div>
  );
}
