'use client';

import React, { useCallback, useRef } from 'react';
import { Upload, X, File, GripVertical } from 'lucide-react';
import { useI18n, getGatewayUrl } from '@mobazha/core';
import type { DigitalFile } from '@mobazha/core';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

interface DigitalFileSectionProps {
  files: DigitalFile[];
  onFilesChange: (files: DigitalFile[]) => void;
  errors?: {
    digitalFiles?: string;
  };
  className?: string;
}

/** Max single file size: 500MB */
const MAX_FILE_SIZE = 500 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function DigitalFileSection({
  files,
  onFilesChange,
  errors = {},
  className = '',
}: DigitalFileSectionProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (!selectedFiles) return;

      const newFiles: DigitalFile[] = [];

      for (const file of Array.from(selectedFiles)) {
        if (file.size > MAX_FILE_SIZE) {
          toast({
            title: t('common.error'),
            description: `${file.name} ${t('listing.digital.fileTooLarge')}`,
            variant: 'destructive',
          });
          continue;
        }

        try {
          // Upload file to gateway
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch(`${getGatewayUrl()}/images`, {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const result = await response.json();
            newFiles.push({
              name: file.name,
              file: result.hashes?.original || result.hash || '',
              size: file.size,
            });
          }
        } catch (error) {
          console.error('File upload failed:', error);
        }
      }

      if (newFiles.length > 0) {
        onFilesChange([...files, ...newFiles]);
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [files, onFilesChange, t, toast]
  );

  const removeFile = useCallback(
    (index: number) => {
      onFilesChange(files.filter((_, i) => i !== index));
    },
    [files, onFilesChange]
  );

  return (
    <Card className={`p-6 ${className}`}>
      <h2 className="text-lg font-semibold text-foreground mb-1">{t('listing.digital.title')}</h2>
      <p className="text-sm text-muted-foreground mb-4">{t('listing.digital.description')}</p>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2 mb-4">
          {files.map((file, index) => (
            <div
              key={`${file.file}-${index}`}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 cursor-grab" />
              <File className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                {file.size && (
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                aria-label={t('common.remove')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
      >
        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground">{t('listing.digital.uploadFiles')}</p>
        <p className="text-xs text-muted-foreground mt-1">{t('listing.digital.uploadHint')}</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        aria-label={t('listing.digital.uploadFiles')}
      />

      {errors.digitalFiles && (
        <p className="text-destructive text-sm mt-2">{errors.digitalFiles}</p>
      )}
    </Card>
  );
}

export default DigitalFileSection;
