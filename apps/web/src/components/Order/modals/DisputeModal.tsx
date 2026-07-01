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
import { AlertTriangle, Check, ImagePlus, X, Loader2 } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { imagesApi } from '@mobazha/core';

const MAX_EVIDENCE_IMAGES = 5;
const MAX_FILE_SIZE_MB = 10;

/** @internal Exported for unit tests */
export function partitionEvidenceFiles(
  files: readonly File[],
  existingCount: number,
  maxImages: number = MAX_EVIDENCE_IMAGES,
  maxSizeMb: number = MAX_FILE_SIZE_MB
): { accepted: File[]; rejectedCount: number } {
  const slotAvailable = Math.max(0, maxImages - existingCount);
  const withinSlot = files.slice(0, slotAvailable);
  const overflowCount = Math.max(0, files.length - slotAvailable);
  const maxBytes = maxSizeMb * 1024 * 1024;
  const accepted: File[] = [];
  let invalidCount = 0;

  for (const file of withinSlot) {
    if (file.size > maxBytes || !file.type.startsWith('image/')) {
      invalidCount++;
    } else {
      accepted.push(file);
    }
  }

  return { accepted, rejectedCount: invalidCount + overflowCount };
}

const AFTER_SALE_REASONS = [
  { value: 'NOT_RECEIVED', labelKey: 'order.dispute.reason.notReceived' },
  { value: 'NOT_AS_DESCRIBED', labelKey: 'order.dispute.reason.notAsDescribed' },
  { value: 'QUALITY_ISSUE', labelKey: 'order.dispute.reason.qualityIssue' },
  { value: 'OTHER', labelKey: 'order.dispute.reason.other' },
] as const;

const EVIDENCE_THUMB_CLASS = 'relative w-20 h-20 rounded-lg overflow-visible shrink-0';

interface EvidenceImage {
  file: File;
  preview: string;
  hash?: string;
  uploading: boolean;
  error?: string;
}

function evidenceThumbBorderClass(img: EvidenceImage): string {
  if (img.error) return 'ring-2 ring-destructive/60 border-destructive/40';
  if (img.uploading) return 'ring-2 ring-primary/40 border-primary/30';
  if (img.hash) return 'border-border';
  return 'border-border';
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
  const [fileSelectError, setFileSelectError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setClaim('');
    setSelectedReason('');
    setValidationError('');
    setShowConfirm(false);
    setFileSelectError('');
    setImages(prev => {
      prev.forEach(img => URL.revokeObjectURL(img.preview));
      return [];
    });
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const uploadFile = useCallback(async (file: File, preview: string): Promise<EvidenceImage> => {
    const entry: EvidenceImage = { file, preview, uploading: true };

    try {
      const base64 = await imagesApi.fileToBase64(file);
      const result = await imagesApi.uploadImage({
        filename: `evidence_${Date.now()}`,
        image: base64,
      });
      const cid = result?.small || result?.original;
      if (cid) {
        return { ...entry, hash: cid, uploading: false };
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

      const { accepted: toAdd, rejectedCount } = partitionEvidenceFiles(files, images.length);
      if (rejectedCount > 0) {
        setFileSelectError(
          t('order.dispute.evidenceFileRejected', {
            maxSizeMb: MAX_FILE_SIZE_MB,
            maxImages: MAX_EVIDENCE_IMAGES,
          })
        );
      } else {
        setFileSelectError('');
      }
      if (toAdd.length === 0) return;

      const placeholders: EvidenceImage[] = toAdd.map(f => ({
        file: f,
        preview: URL.createObjectURL(f),
        uploading: true,
      }));
      const previewKeys = new Set(placeholders.map(p => p.preview));
      setImages(prev => [...prev, ...placeholders]);

      const uploaded = await Promise.all(placeholders.map(p => uploadFile(p.file, p.preview)));
      setImages(prev => [...prev.filter(img => !previewKeys.has(img.preview)), ...uploaded]);
    },
    [images.length, uploadFile, t]
  );

  const handleRemoveImage = useCallback((index: number) => {
    setImages(prev => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
    setFileSelectError('');
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
  const failedUploadCount = images.filter(img => !img.uploading && !img.hash).length;

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
              <label
                htmlFor="dispute-claim"
                className="text-sm font-medium text-foreground mb-2 block"
              >
                {t('order.dispute.claimLabel')}
                <span className="text-destructive ml-0.5" aria-hidden>
                  *
                </span>
              </label>
              <textarea
                id="dispute-claim"
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
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {t('order.dispute.evidence')}
                </label>
                <div className="flex flex-wrap gap-3">
                  {images.map((img, idx) => (
                    <div key={img.preview} className={EVIDENCE_THUMB_CLASS}>
                      <div
                        className={`relative w-full h-full rounded-lg overflow-hidden border bg-muted/30 ${evidenceThumbBorderClass(img)}`}
                      >
                        <img
                          src={img.preview}
                          alt={t('order.dispute.evidenceImageAlt', { index: idx + 1 })}
                          className="w-full h-full object-cover"
                        />
                        {img.uploading ? (
                          <span
                            role="status"
                            aria-label={t('order.dispute.evidenceUploadingStatus')}
                            className="absolute bottom-1 left-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/95 shadow-sm ring-1 ring-border"
                          >
                            <Loader2
                              className="h-3.5 w-3.5 animate-spin text-primary"
                              aria-hidden
                            />
                          </span>
                        ) : null}
                        {!img.uploading && img.hash ? (
                          <span
                            role="status"
                            aria-label={t('order.dispute.evidenceUploaded')}
                            className="absolute bottom-1 left-1 flex h-6 w-6 items-center justify-center rounded-full bg-success shadow-sm"
                          >
                            <Check
                              className="h-3.5 w-3.5 text-white"
                              strokeWidth={2.5}
                              aria-hidden
                            />
                          </span>
                        ) : null}
                        {!img.uploading && img.error ? (
                          <span
                            role="status"
                            aria-label={t('order.dispute.evidenceUploadItemFailed')}
                            className="absolute bottom-1 left-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive shadow-sm"
                          >
                            <X className="h-3.5 w-3.5 text-white" strokeWidth={2.5} aria-hidden />
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute -top-2 -right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:border-destructive/40 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={t('order.dispute.removeEvidence', { index: idx + 1 })}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {images.length < MAX_EVIDENCE_IMAGES && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors shrink-0"
                      aria-label={t('order.dispute.addEvidence')}
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
                <p className="text-xs text-muted-foreground mt-2">
                  {t('order.dispute.evidenceHint', {
                    maxImages: MAX_EVIDENCE_IMAGES,
                    maxSizeMb: MAX_FILE_SIZE_MB,
                  })}
                </p>
                {anyUploading ? (
                  <p className="text-xs text-muted-foreground mt-1" aria-live="polite">
                    {t('order.dispute.evidenceUploading', {
                      done: images.filter(img => img.hash).length,
                      total: images.length,
                    })}
                  </p>
                ) : null}
                {fileSelectError ? (
                  <p className="text-xs text-destructive mt-1.5" role="alert">
                    {fileSelectError}
                  </p>
                ) : null}
                {failedUploadCount > 0 ? (
                  <p className="text-xs text-destructive mt-1.5" role="alert">
                    {t('order.dispute.evidenceUploadFailed')}
                  </p>
                ) : null}
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

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            {anyUploading ? (
              <p
                className="text-xs text-muted-foreground w-full sm:mr-auto sm:order-first"
                aria-live="polite"
              >
                {t('order.dispute.waitForEvidenceUpload')}
              </p>
            ) : null}
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
