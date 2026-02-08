'use client';

/* global FileList */
import React, { useCallback, useRef, useState } from 'react';
import {
  Plus,
  X,
  GripVertical,
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  Loader2,
  Pencil,
} from 'lucide-react';
import type { Image } from '@mobazha/core';
import { useI18n, getGatewayUrl } from '@mobazha/core';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface MediaSectionProps {
  images: Image[];
  introVideo?: string;
  altIntroVideoLinks?: string[];
  onImagesChange: (images: Image[]) => void;
  onVideoChange?: (video: string) => void;
  onAltVideoLinksChange?: (links: string[]) => void;
  maxImages?: number;
  maxVideoSize?: number; // in MB
  errors?: {
    images?: string;
    video?: string;
  };
  className?: string;
}

const MAX_IMAGES = 30;
const MAX_VIDEO_SIZE_MB = 15;

export function MediaSection({
  images,
  introVideo,
  altIntroVideoLinks = [],
  onImagesChange,
  onVideoChange,
  onAltVideoLinksChange,
  maxImages = MAX_IMAGES,
  maxVideoSize = MAX_VIDEO_SIZE_MB,
  errors = {},
  className = '',
}: MediaSectionProps) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newVideoLink, setNewVideoLink] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [editingAltIndex, setEditingAltIndex] = useState<number | null>(null);

  // 上传图片
  const handleImageUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      if (images.length >= maxImages) return;

      setIsUploading(true);
      setUploadProgress(0);

      const newImages: Image[] = [];
      const filesToUpload = Array.from(files).slice(0, maxImages - images.length);

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];

        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch(`${getGatewayUrl()}/ob/images`, {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const result = await response.json();
            if (result.hashes) {
              newImages.push(result.hashes);
            }
          }
        } catch (err) {
          console.error('Failed to upload image:', err);
        }

        setUploadProgress(((i + 1) / filesToUpload.length) * 100);
      }

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
      }

      setIsUploading(false);
      setUploadProgress(0);
    },
    [images, maxImages, onImagesChange]
  );

  // 移除图片
  const handleRemoveImage = useCallback(
    (index: number) => {
      onImagesChange(images.filter((_, i) => i !== index));
    },
    [images, onImagesChange]
  );

  // 拖拽排序
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === dropIndex) return;

      const newImages = [...images];
      const [removed] = newImages.splice(draggedIndex, 1);
      newImages.splice(dropIndex, 0, removed);
      onImagesChange(newImages);
      setDraggedIndex(null);
    },
    [draggedIndex, images, onImagesChange]
  );

  // 更新图片 alt 文本
  const handleAltChange = useCallback(
    (index: number, alt: string) => {
      const newImages = [...images];
      newImages[index] = { ...newImages[index], alt };
      onImagesChange(newImages);
    },
    [images, onImagesChange]
  );

  // 获取图片 URL
  const getImageUrl = useCallback(
    (image: Image, size: 'tiny' | 'small' | 'medium' | 'large' | 'original' = 'small') => {
      const hash = image[size] || image.small || image.medium || image.original;
      if (!hash) return '';
      return `${getGatewayUrl()}/ob/images/${hash}`;
    },
    []
  );

  // 上传视频
  const handleVideoUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || !onVideoChange) return;

      const file = files[0];
      if (file.size > maxVideoSize * 1024 * 1024) {
        window.alert(t('listing.videoTooLarge'));
        return;
      }

      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${getGatewayUrl()}/ob/images`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          if (result.hashes?.original) {
            onVideoChange(result.hashes.original);
          }
        }
      } catch (err) {
        console.error('Failed to upload video:', err);
      }

      setIsUploading(false);
    },
    [maxVideoSize, onVideoChange, t]
  );

  // 添加外部视频链接
  const handleAddVideoLink = useCallback(() => {
    if (!newVideoLink.trim() || !onAltVideoLinksChange) return;
    onAltVideoLinksChange([...altIntroVideoLinks, newVideoLink.trim()]);
    setNewVideoLink('');
  }, [newVideoLink, altIntroVideoLinks, onAltVideoLinksChange]);

  // 移除外部视频链接
  const handleRemoveVideoLink = useCallback(
    (index: number) => {
      if (!onAltVideoLinksChange) return;
      onAltVideoLinksChange(altIntroVideoLinks.filter((_, i) => i !== index));
    },
    [altIntroVideoLinks, onAltVideoLinksChange]
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 图片上传区域 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {t('listing.photos')} <span className="text-destructive">*</span>
          </h2>
          <span className="text-sm text-muted-foreground">
            {images.length} / {maxImages}
          </span>
        </div>

        {errors.images && <p className="text-destructive text-sm mb-3">{errors.images}</p>}

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {/* 已上传的图片 */}
          {images.map((image, index) => (
            <div
              key={index}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, index)}
              className={`
                relative aspect-square rounded-lg overflow-hidden group cursor-move
                border-2 transition-all
                ${draggedIndex === index ? 'opacity-50 border-primary' : 'border-transparent hover:border-primary/50'}
              `}
            >
              <img
                src={getImageUrl(image)}
                alt={image.alt || t('listing.imageAlt.default', { index: index + 1 })}
                className="w-full h-full object-cover"
              />

              {/* 拖拽手柄 */}
              <div className="absolute top-1 left-1 p-1 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-3 h-3 text-white" />
              </div>

              {/* 删除按钮 */}
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
              >
                <X className="w-3 h-3" />
              </button>

              {/* Alt text 编辑按钮 */}
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setEditingAltIndex(editingAltIndex === index ? null : index);
                }}
                className={`absolute bottom-1 right-1 p-1 rounded transition-opacity text-xs ${
                  image.alt
                    ? 'bg-primary/80 text-white opacity-80 hover:opacity-100'
                    : 'bg-black/50 text-white opacity-0 group-hover:opacity-100'
                }`}
                title={t('listing.imageAlt.edit')}
              >
                <Pencil className="w-3 h-3" />
              </button>

              {/* 主图标记 */}
              {index === 0 && (
                <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded">
                  {t('listing.primaryPhoto')}
                </div>
              )}

              {/* Alt text 编辑输入 */}
              {editingAltIndex === index && (
                <div className="absolute inset-x-0 bottom-0 bg-black/80 p-1.5">
                  <input
                    type="text"
                    value={image.alt || ''}
                    onChange={e => handleAltChange(index, e.target.value)}
                    onBlur={() => setEditingAltIndex(null)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') setEditingAltIndex(null);
                    }}
                    onMouseDown={e => e.stopPropagation()}
                    placeholder={t('listing.imageAlt.placeholder')}
                    className="w-full text-xs px-1.5 py-1 bg-white/90 text-foreground rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                </div>
              )}
            </div>
          ))}

          {/* 上传按钮 */}
          {images.length < maxImages && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-xs">{Math.round(uploadProgress)}%</span>
                </>
              ) : (
                <>
                  <Plus className="w-6 h-6" />
                  <span className="text-xs">{t('listing.add')}</span>
                </>
              )}
            </button>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-3">{t('listing.photosHelper')}</p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={e => handleImageUpload(e.target.files)}
          className="hidden"
        />
      </Card>

      {/* 视频上传区域 */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {t('listing.introVideo')} (mp4, &lt;{maxVideoSize}MB)
        </h2>

        <div className="space-y-4">
          {/* 上传视频按钮 */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={isUploading}
              className="w-24 h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary"
            >
              {introVideo ? (
                <Video className="w-8 h-8 text-primary" />
              ) : (
                <>
                  <ImageIcon className="w-6 h-6" />
                  <span className="text-xs">{t('listing.add')}</span>
                </>
              )}
            </button>

            {introVideo && (
              <div className="flex-1">
                <p className="text-sm text-foreground truncate">{introVideo}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onVideoChange?.('')}
                  className="text-destructive hover:text-destructive mt-1"
                >
                  <X className="w-4 h-4 mr-1" />
                  {t('common.remove')}
                </Button>
              </div>
            )}
          </div>

          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4"
            onChange={e => handleVideoUpload(e.target.files)}
            className="hidden"
          />

          {/* 外部视频链接 */}
          <div className="border-t border-border pt-4">
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {t('listing.externalVideoLink')}
            </label>
            <div className="flex gap-2">
              <Input
                value={newVideoLink}
                onChange={e => setNewVideoLink(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddVideoLink}
                disabled={!newVideoLink.trim()}
              >
                <LinkIcon className="w-4 h-4 mr-1" />
                {t('listing.add')}
              </Button>
            </div>

            {/* 已添加的视频链接 */}
            {altIntroVideoLinks.length > 0 && (
              <div className="mt-3 space-y-2">
                {altIntroVideoLinks.map((link, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <LinkIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate flex-1">{link}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveVideoLink(index)}
                      className="text-destructive hover:text-destructive p-1 h-auto"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default MediaSection;
