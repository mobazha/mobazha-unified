// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.
/* global FileList */

'use client';

import { useCallback, useRef, useState } from 'react';
import { getImageUrl, imagesApi, useI18n } from '@mobazha/core';
import type { Image } from '@mobazha/core';

interface BuyRequestImagePickerProps {
  images: Image[];
  onImagesChange: (images: Image[]) => void;
  maxImages?: number;
}

/**
 * Image picker for a buy request.
 *
 * Deliberately narrower than the listing MediaSection: a wanted post has no
 * intro video or alt-video links, and reusing that component would render
 * fields this feature does not model. Upload goes through the same
 * imagesApi.uploadProductImages call listings use, and the returned hash set is
 * handed back verbatim - it is exactly what the node stores.
 */
export function BuyRequestImagePicker({
  images,
  onImagesChange,
  maxImages = 8,
}: BuyRequestImagePickerProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [failed, setFailed] = useState(false);

  const atLimit = images.length >= maxImages;

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setFailed(false);
      setIsUploading(true);

      const room = Math.max(maxImages - images.length, 0);
      const selected = Array.from(files).slice(0, room);
      const uploaded: Image[] = [];
      let failures = 0;

      for (const file of selected) {
        try {
          const base64 = await imagesApi.fileToBase64(file);
          const result = await imagesApi.uploadProductImages([
            { filename: file.name, image: base64 },
          ]);
          if (result.length > 0) {
            uploaded.push(...result);
          } else {
            failures++;
          }
        } catch {
          failures++;
        }
      }

      if (uploaded.length > 0) {
        onImagesChange([...images, ...uploaded]);
      }
      if (failures > 0) {
        setFailed(true);
      }
      setIsUploading(false);
    },
    [images, maxImages, onImagesChange]
  );

  const removeAt = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium leading-none">
        {t('wanted.imagesTitle', { defaultValue: 'Pictures' })}
      </span>

      <input
        ref={inputRef}
        id="wanted-images"
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={event => {
          void handleFiles(event.target.files);
          // Allow re-picking the same file after a removal.
          event.target.value = '';
        }}
      />

      <div className="flex flex-wrap gap-3">
        {images.map((image, index) => {
          const src = getImageUrl(image.small || image.original);
          return (
            <div
              key={`${image.original}-${index}`}
              className="relative h-24 w-24 overflow-hidden rounded-md border border-border"
            >
              {src ? (
                <img
                  src={src}
                  alt={image.alt || image.filename || ''}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : null}
              <button
                type="button"
                aria-label={t('wanted.imagesRemove', { defaultValue: 'Remove' })}
                className="absolute right-1 top-1 rounded bg-background/80 px-1 text-xs"
                onClick={() => removeAt(index)}
              >
                ×
              </button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading || atLimit}
          className="h-24 w-24 rounded-md border-2 border-dashed border-input text-xs text-muted-foreground disabled:opacity-50"
        >
          {isUploading
            ? t('wanted.imagesUploading', { defaultValue: 'Uploading...' })
            : t('wanted.imagesAdd', { defaultValue: 'Add pictures' })}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        {atLimit
          ? t('wanted.imagesLimitReached', {
              defaultValue: 'You have reached the maximum number of pictures.',
            })
          : t('wanted.imagesHint', { defaultValue: 'Up to 8 pictures.' })}
      </p>

      {failed && (
        <p className="text-xs text-destructive">
          {t('wanted.imagesUploadFailed', {
            defaultValue: 'Could not upload the pictures. Please try again.',
          })}
        </p>
      )}
    </div>
  );
}
