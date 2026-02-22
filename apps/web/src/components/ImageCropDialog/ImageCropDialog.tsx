'use client';

import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { useI18n } from '@mobazha/core';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Loader2, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  aspect: number;
  title?: string;
  sizeHint?: string;
  cropShape?: 'rect' | 'round';
  onCropComplete: (croppedBlob: Blob) => void;
  isUploading?: boolean;
}

function createCroppedImage(imageSrc: string, pixelCrop: Area, rotation = 0): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      if (rotation === 0) {
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;
        ctx.drawImage(
          img,
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height,
          0,
          0,
          pixelCrop.width,
          pixelCrop.height
        );
      } else {
        const radians = (rotation * Math.PI) / 180;
        const sin = Math.abs(Math.sin(radians));
        const cos = Math.abs(Math.cos(radians));
        const rotW = img.width * cos + img.height * sin;
        const rotH = img.width * sin + img.height * cos;

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.translate(-pixelCrop.x, -pixelCrop.y);
        ctx.translate(rotW / 2, rotH / 2);
        ctx.rotate(radians);
        ctx.translate(-img.width / 2, -img.height / 2);
        ctx.drawImage(img, 0, 0);
      }

      canvas.toBlob(
        blob => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        },
        'image/jpeg',
        0.92
      );
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = imageSrc;
  });
}

export const ImageCropDialog: React.FC<ImageCropDialogProps> = ({
  open,
  onOpenChange,
  imageSrc,
  aspect,
  title,
  sizeHint,
  cropShape = 'rect',
  onCropComplete,
  isUploading = false,
}) => {
  const { t } = useI18n();
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const blob = await createCroppedImage(imageSrc, croppedAreaPixels, rotation);
      onCropComplete(blob);
    } catch (err) {
      console.error('Crop failed:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [croppedAreaPixels, imageSrc, rotation, onCropComplete]);

  const handleCancel = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    onOpenChange(false);
  }, [onOpenChange]);

  const isBusy = isProcessing || isUploading;

  return (
    <Dialog open={open} onOpenChange={isBusy ? undefined : onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{title || t('imageCrop.adjustImage')}</DialogTitle>
          {sizeHint && <p className="text-xs text-muted-foreground mt-1">{sizeHint}</p>}
        </DialogHeader>

        <div className="relative w-full h-[280px] sm:h-[360px] bg-muted">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={cropShape === 'rect'}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        <div className="px-6 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-muted-foreground shrink-0" />
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.05}
              onValueChange={([v]) => setZoom(v)}
              className="flex-1"
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>

          <div className="flex items-center gap-3">
            <RotateCw className="w-4 h-4 text-muted-foreground shrink-0" />
            <Slider
              value={[rotation]}
              min={0}
              max={360}
              step={1}
              onValueChange={([v]) => setRotation(v)}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-10 text-right shrink-0">
              {rotation}°
            </span>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 pt-2">
          <Button variant="outline" onClick={handleCancel} disabled={isBusy}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={isBusy}>
            {isBusy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {isUploading ? t('common.uploading') : t('common.apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
