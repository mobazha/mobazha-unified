'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui';
import { AlertTriangle, ImagePlus, X, Loader2 } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { imagesApi } from '@mobazha/core';

const MAX_EVIDENCE_IMAGES = 5;
const MAX_FILE_SIZE_MB = 10;

const AFTER_SALE_REASONS = [
  { value: 'NOT_RECEIVED', labelKey: 'order.dispute.reason.notReceived' },
  { value: 'NOT_AS_DESCRIBED', labelKey: 'order.dispute.reason.notAsDescribed' },
  { value: 'QUALITY_ISSUE', labelKey: 'order.dispute.reason.qualityIssue' },
  { value: 'OTHER', labelKey: 'order.dispute.reason.other' },
] as const;

interface EvidenceImage {
  file: File;
  preview: string;
  hash?: string;
  uploading: boolean;
  error?: string;
}

export interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (claim: string, evidenceHashes?: string[]) => Promise<void>;
  onAfterSaleSubmit?: (reason: string, description: string) => Promise<void>;
  isLoading?: boolean;
  isAfterSale?: boolean;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onAfterSaleSubmit,
  isLoading = false,
  isAfterSale = false,
}) => {
  const { t } = useI18n();
  const [claim, setClaim] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [validationError, setValidationError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [images, setImages] = useState<EvidenceImage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setClaim('');
    setSelectedReason('');
    setValidationError('');
    setShowConfirm(false);
    setImages(prev => {
      prev.forEach(img => URL.revokeObjectURL(img.preview));
      return [];
    });
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const uploadFile = useCallback(async (file: File): Promise<EvidenceImage> => {
    const preview = URL.createObjectURL(file);
    const entry: EvidenceImage = { file, preview, uploading: true };

    try {
      const base64 = await imagesApi.fileToBase64(file);
      const result = await imagesApi.uploadImage({
        filename: `evidence_${Date.now()}`,
        image: base64,
      });
      if (result?.small) {
        return { ...entry, hash: result.small, uploading: false };
      }
      return { ...entry, uploading: false, error: 'Upload failed' };
    } catch {
      return { ...entry, uploading: false, error: 'Upload failed' };
    }
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (fileInputRef.current) fileInputRef.current.value = '';

      const available = MAX_EVIDENCE_IMAGES - images.length;
      const toAdd = files.slice(0, available).filter(f => {
        if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) return false;
        if (!f.type.startsWith('image/')) return false;
        return true;
      });

      const placeholders: EvidenceImage[] = toAdd.map(f => ({
        file: f,
        preview: URL.createObjectURL(f),
        uploading: true,
      }));
      setImages(prev => [...prev, ...placeholders]);

      const uploaded = await Promise.all(toAdd.map(uploadFile));
      setImages(prev => {
        const existing = prev.filter(img => !placeholders.some(p => p.preview === img.preview));
        return [...existing, ...uploaded];
      });
    },
    [images.length, uploadFile]
  );

  const handleRemoveImage = useCallback((index: number) => {
    setImages(prev => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleSubmitClick = useCallback(() => {
    if (isAfterSale && !selectedReason) {
      setValidationError(t('order.dispute.selectReason', { fallback: 'Please select a reason' }));
      return;
    }
    if (!claim.trim()) {
      setValidationError(t('order.dispute.reasonRequired'));
      textareaRef.current?.focus();
      return;
    }
    if (images.some(img => img.uploading)) return;
    setValidationError('');
    setShowConfirm(true);
  }, [claim, t, images, isAfterSale, selectedReason]);

  const handleConfirm = useCallback(async () => {
    setShowConfirm(false);
    if (isAfterSale && onAfterSaleSubmit) {
      await onAfterSaleSubmit(selectedReason, claim.trim());
    } else {
      const hashes = images.filter(img => img.hash).map(img => img.hash!);
      await onSubmit(claim.trim(), hashes.length > 0 ? hashes : undefined);
    }
    resetState();
  }, [claim, images, onSubmit, onAfterSaleSubmit, isAfterSale, selectedReason, resetState]);

  const handleClaimChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setClaim(e.target.value);
    if (e.target.value.trim()) {
      setValidationError('');
    }
  }, []);

  const anyUploading = images.some(img => img.uploading);

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={open => {
          if (!open) handleClose();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isAfterSale
                ? t('order.dispute.afterSaleTitle', { fallback: 'Report an Issue' })
                : t('order.dispute.title')}
            </DialogTitle>
            <DialogDescription>
              {isAfterSale
                ? t('order.dispute.afterSaleDescription', {
                    fallback:
                      'Describe the issue with your completed order. The seller will be notified.',
                  })
                : t('order.dispute.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isAfterSale && (
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {t('order.dispute.reasonLabel', { fallback: 'Reason' })}
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {AFTER_SALE_REASONS.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => {
                        setSelectedReason(r.value);
                        if (validationError) setValidationError('');
                      }}
                      className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                        selectedReason === r.value
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {t(r.labelKey, {
                        fallback: r.value
                          .replace(/_/g, ' ')
                          .toLowerCase()
                          .replace(/^\w/, c => c.toUpperCase()),
                      })}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <textarea
                ref={textareaRef}
                value={claim}
                onChange={handleClaimChange}
                rows={4}
                className={`w-full px-3 py-2.5 rounded-lg border bg-card text-foreground text-sm resize-none
                  focus:outline-none focus:ring-2 transition-colors
                  ${
                    validationError
                      ? 'border-destructive focus:ring-destructive/30'
                      : 'border-border focus:ring-primary/30'
                  }`}
                placeholder={t('order.dispute.placeholder')}
                aria-label={t('order.dispute.placeholder')}
                aria-invalid={!!validationError}
                aria-describedby={validationError ? 'dispute-error' : undefined}
                autoFocus
              />
              {validationError && (
                <p id="dispute-error" className="mt-1.5 text-sm text-destructive" role="alert">
                  {validationError}
                </p>
              )}
            </div>

            {/* Evidence images (on-chain disputes only) */}
            {!isAfterSale && (
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  {t('order.dispute.evidence', { fallback: 'Evidence (optional)' })}
                </label>
                <div className="flex flex-wrap gap-2">
                  {images.map((img, idx) => (
                    <div
                      key={img.preview}
                      className="relative w-16 h-16 rounded-lg overflow-hidden border border-border group"
                    >
                      <img
                        src={img.preview}
                        alt={`Evidence ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {img.uploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        </div>
                      )}
                      {img.error && (
                        <div className="absolute inset-0 bg-destructive/40 flex items-center justify-center">
                          <X className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={`Remove image ${idx + 1}`}
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {images.length < MAX_EVIDENCE_IMAGES && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-16 h-16 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                      aria-label={t('order.dispute.addEvidence', {
                        fallback: 'Add evidence image',
                      })}
                    >
                      <ImagePlus className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  {t('order.dispute.evidenceHint', {
                    fallback: `Up to ${MAX_EVIDENCE_IMAGES} images, ${MAX_FILE_SIZE_MB}MB each`,
                  })}
                </p>
              </div>
            )}

            <div className="bg-warning/8 border border-warning/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="text-xs text-warning">
                  <p className="font-medium mb-1">{t('order.dispute.warning')}</p>
                  <p>{t('order.dispute.warningText')}</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmitClick}
              disabled={
                isLoading || !claim.trim() || anyUploading || (isAfterSale && !selectedReason)
              }
            >
              {isLoading ? t('common.loading') : t('order.dispute.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('order.dispute.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('order.dispute.confirmText')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {t('order.dispute.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DisputeModal;
