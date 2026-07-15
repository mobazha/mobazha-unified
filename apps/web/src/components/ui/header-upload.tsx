// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { useRef, useCallback, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pickImageFile, type ImagePickRejection } from '@/lib/pick-image-file';

export type HeaderUploadRejection = ImagePickRejection;

export interface HeaderUploadProps {
  /** URL of current cover (from server or blob preview) */
  src?: string;
  /** Called when the user picks or drops an image */
  onFileSelect: (file: File) => void;
  /** Called when the pick/drop yields no usable image, so the caller can say why */
  onFileRejected?: (reason: HeaderUploadRejection) => void;
  disabled?: boolean;
  /** Accessible label, also shown on hover */
  label?: string;
  /** Shown inside the empty placeholder */
  placeholder?: string;
  className?: string;
}

export function HeaderUpload({
  src,
  onFileSelect,
  onFileRejected,
  disabled = false,
  label = 'Change cover',
  placeholder,
  className,
}: HeaderUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
        e.preventDefault();
        inputRef.current?.click();
      }
    },
    [disabled]
  );

  const submit = useCallback(
    (files: ArrayLike<File> | null | undefined) => {
      const result = pickImageFile(files);
      if ('rejected' in result) onFileRejected?.(result.rejected);
      else onFileSelect(result.file);
    },
    [onFileSelect, onFileRejected]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Dismissing the picker yields no files and is not a rejection.
      if (e.target.files?.length) submit(e.target.files);
      e.target.value = '';
    },
    [submit]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as HTMLElement)) return;
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      submit(e.dataTransfer.files);
    },
    [disabled, submit]
  );

  return (
    <div
      className={cn(
        'relative group cursor-pointer overflow-hidden rounded-lg',
        // 3.5:1 mirrors the 315x90 base the node crops cover images to, so the
        // preview shows the same framing that will actually be stored.
        'aspect-[3.5/1] w-full',
        disabled && 'cursor-not-allowed opacity-60',
        className
      )}
      onClick={handleClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {src ? (
        <img src={src} alt={label} className="w-full h-full object-cover border border-border" />
      ) : (
        <div
          className={cn(
            'w-full h-full bg-muted flex flex-col items-center justify-center gap-2 border-2 border-dashed transition-colors',
            isDragOver ? 'border-primary bg-primary/5' : 'border-border'
          )}
        >
          <ImagePlus className="w-6 h-6 text-muted-foreground" />
          {placeholder && (
            <span className="text-xs text-muted-foreground px-4 text-center">{placeholder}</span>
          )}
        </div>
      )}
      {!disabled && src && (
        <div
          className={cn(
            'absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center gap-2',
            isDragOver ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        >
          <ImagePlus className="w-5 h-5 text-white" />
          <span className="text-sm text-white">{label}</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
