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
  Camera,
} from 'lucide-react';
import type { Image } from '@mobazha/core';
import { useToast } from '@/components/ui/use-toast';
import { useI18n, getImageUrl as getImageUrlHelper, imagesApi } from '@mobazha/core';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/useMediaQuery';

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
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newVideoLink, setNewVideoLink] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [editingAltIndex, setEditingAltIndex] = useState<number | null>(null);
  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const [isVideoDragOver, setIsVideoDragOver] = useState(false);

  // 上传图片
  const handleImageUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      if (images.length >= maxImages) return;

      setIsUploading(true);
      setUploadProgress(0);

      const newImages: Image[] = [];
      const filesToUpload = Array.from(files).slice(0, maxImages - images.length);

      let failCount = 0;
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];

        try {
          const base64 = await imagesApi.fileToBase64(file);
          const result = await imagesApi.uploadProductImages([
            { filename: file.name, image: base64 },
          ]);

          if (result.length > 0) {
            newImages.push(...result);
          } else {
            failCount++;
          }
        } catch (err) {
          failCount++;
          console.error('Failed to upload image:', err);
        }

        setUploadProgress(((i + 1) / filesToUpload.length) * 100);
      }

      if (failCount > 0) {
        toast({
          title: t('common.error'),
          description: t('listing.uploadFailed'),
          variant: 'destructive',
        });
      }

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
      }

      setIsUploading(false);
      setUploadProgress(0);
    },
    [images, maxImages, onImagesChange, t, toast]
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

  // 获取图片 URL（支持外部 CDN URL 和内部 hash）
  const getImageUrl = useCallback(
    (image: Image, size: 'tiny' | 'small' | 'medium' | 'large' | 'original' = 'small') => {
      const hash = image[size] || image.small || image.medium || image.original;
      if (!hash) return '';
      return getImageUrlHelper(hash) || '';
    },
    []
  );

  // 上传视频
  const handleVideoUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || !onVideoChange) return;

      const file = files[0];
      if (file.size > maxVideoSize * 1024 * 1024) {
        toast({
          title: t('common.error'),
          description: t('listing.videoTooLarge'),
          variant: 'destructive',
        });
        return;
      }

      setIsUploading(true);

      try {
        const base64 = await imagesApi.fileToBase64(file);
        const result = await imagesApi.uploadProductImages([
          { filename: file.name, image: base64 },
        ]);

        if (result.length > 0 && result[0].original) {
          onVideoChange(result[0].original);
        }
      } catch (err) {
        console.error('Failed to upload video:', err);
      }

      setIsUploading(false);
    },
    [maxVideoSize, onVideoChange, t, toast]
  );

  // 拖拽文件上传（图片区）
  const handleFileDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) setIsFileDragOver(true);
  }, []);

  const handleFileDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as HTMLElement)) return;
    setIsFileDragOver(false);
  }, []);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsFileDragOver(false);
      const input = e.dataTransfer;
      if (!input.files?.length) return;
      const imageFiles = Array.from(input.files).filter(f => f.type.startsWith('image/'));
      if (imageFiles.length === 0) return;
      const dt = new globalThis.DataTransfer();
      imageFiles.forEach(f => dt.items.add(f));
      handleImageUpload(dt.files);
    },
    [handleImageUpload]
  );

  // 拖拽文件上传（视频区）
  const handleVideoDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) setIsVideoDragOver(true);
  }, []);

  const handleVideoDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as HTMLElement)) return;
    setIsVideoDragOver(false);
  }, []);

  const handleVideoDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsVideoDragOver(false);
      const input = e.dataTransfer;
      if (!input.files?.length) return;
      const videoFiles = Array.from(input.files).filter(f => f.type.startsWith('video/'));
      if (videoFiles.length === 0) return;
      const dt = new globalThis.DataTransfer();
      dt.items.add(videoFiles[0]);
      handleVideoUpload(dt.files);
    },
    [handleVideoUpload]
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
    <div className={`${isMobile ? 'space-y-4' : 'space-y-6'} ${className}`}>
      {/* 图片上传区域 */}
      <Card
        className={`${isMobile ? 'p-4' : 'p-6'} transition-colors ${isFileDragOver ? 'ring-2 ring-primary bg-primary/5' : ''}`}
        onDragOver={handleFileDragOver}
        onDragLeave={handleFileDragLeave}
        onDrop={handleFileDrop}
      >
        <div className={`flex items-center justify-between ${isMobile ? 'mb-3' : 'mb-4'}`}>
          <h2
            className={`${isMobile ? 'text-base font-medium' : 'text-lg font-semibold'} text-foreground`}
          >
            {t('listing.photos')} <span className="text-destructive">*</span>
          </h2>
          <span className="text-xs text-muted-foreground">
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
              <div
                className={`absolute top-1 left-1 p-1 bg-black/50 rounded transition-opacity ${isMobile ? 'opacity-80' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <GripVertical className="w-3 h-3 text-white" />
              </div>

              {/* 删除按钮 — 移动端始终可见 */}
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className={`absolute top-1 right-1 p-1.5 bg-destructive text-white rounded-full transition-opacity hover:bg-destructive/90 ${isMobile ? 'opacity-90' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <X className="w-3 h-3" />
              </button>

              {/* Alt text 编辑按钮 — 移动端始终可见 */}
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setEditingAltIndex(editingAltIndex === index ? null : index);
                }}
                className={`absolute bottom-1 right-1 p-1 rounded transition-opacity text-xs ${
                  image.alt
                    ? 'bg-primary/80 text-white opacity-80 hover:opacity-100'
                    : isMobile
                      ? 'bg-black/50 text-white opacity-70'
                      : 'bg-black/50 text-white opacity-0 group-hover:opacity-100'
                }`}
                title={t('listing.imageAlt.edit')}
              >
                <Pencil className="w-3 h-3" />
              </button>

              {/* 主图标记 */}
              {index === 0 && (
                <div
                  className={`absolute bottom-1 left-1 bg-primary text-primary-foreground rounded ${isMobile ? 'px-1 py-px text-[10px] leading-tight' : 'px-2 py-0.5 text-xs'}`}
                >
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

        {/* Mobile: camera-first upload bar */}
        {isMobile && images.length < maxImages && (
          <div className="flex gap-2 mt-3">
            <Button
              type="button"
              variant="default"
              className="flex-1 h-10"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isUploading}
            >
              <Camera className="w-4 h-4 mr-1.5" />
              {t('listing.mobile.takePhoto')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-10"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <ImageIcon className="w-4 h-4 mr-1.5" />
              {t('listing.mobile.chooseFromLibrary')}
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-2">
          {isMobile ? t('listing.photosHelperMobile') : t('listing.photosHelper')}
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={e => handleImageUpload(e.target.files)}
          className="hidden"
        />
        {/* Camera capture input (mobile) */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={e => handleImageUpload(e.target.files)}
          className="hidden"
        />
      </Card>

      {/* 视频上传区域 */}
      <Card
        className={`${isMobile ? 'p-4' : 'p-6'} transition-colors ${isVideoDragOver ? 'ring-2 ring-primary bg-primary/5' : ''}`}
        onDragOver={handleVideoDragOver}
        onDragLeave={handleVideoDragLeave}
        onDrop={handleVideoDrop}
      >
        <h2
          className={`${isMobile ? 'text-base font-medium' : 'text-lg font-semibold'} text-foreground ${isMobile ? 'mb-3' : 'mb-4'}`}
        >
          {t('listing.introVideo')} (mp4, &lt;{maxVideoSize}MB)
        </h2>

        <div className={isMobile ? 'space-y-3' : 'space-y-4'}>
          {/* 上传视频按钮 */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={isUploading}
              className={`${isMobile ? 'w-20 h-20' : 'w-24 h-24'} rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary`}
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
          <div className={`border-t border-border ${isMobile ? 'pt-3' : 'pt-4'}`}>
            <label
              className={`block text-sm ${isMobile ? '' : 'font-medium'} text-muted-foreground ${isMobile ? 'mb-1.5' : 'mb-2'}`}
            >
              {t('listing.externalVideoLink')}
            </label>
            <div className="flex gap-2">
              <Input
                value={newVideoLink}
                onChange={e => setNewVideoLink(e.target.value)}
                placeholder={t('listing.videoUrlPlaceholder')}
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
