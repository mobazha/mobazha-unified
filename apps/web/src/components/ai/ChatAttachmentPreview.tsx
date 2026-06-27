'use client';

import { useState } from 'react';
import { useI18n } from '@mobazha/core';
import { FileText, ZoomIn } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ChatAttachmentPreviewProps {
  name: string;
  previewUrl?: string;
  contentType?: string;
  /** Visual context for user bubble vs composer draft strip */
  variant?: 'user' | 'draft';
  className?: string;
}

export function ChatAttachmentPreview({
  name,
  previewUrl,
  contentType,
  variant = 'user',
  className,
}: ChatAttachmentPreviewProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const canPreview = Boolean(previewUrl && (contentType?.startsWith('image/') || !contentType));

  const chipClass =
    variant === 'user'
      ? 'border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground'
      : 'border-border bg-muted/30 text-foreground';

  const iconWrapClass =
    variant === 'user' ? 'bg-primary-foreground/10' : 'border border-border/60 bg-muted';

  return (
    <>
      <div
        className={cn(
          'inline-flex max-w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-xs',
          chipClass,
          className
        )}
      >
        {canPreview ? (
          <button
            type="button"
            className="relative shrink-0 rounded-md overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t('admin.workspace.chatAttachmentViewImage', { name })}
            onClick={() => setOpen(true)}
          >
            <img src={previewUrl} alt="" className="h-14 w-14 object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100">
              <ZoomIn className="h-4 w-4 text-white" aria-hidden />
            </span>
          </button>
        ) : (
          <span
            className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-md',
              iconWrapClass
            )}
          >
            <FileText className="h-5 w-5 opacity-80" aria-hidden />
          </span>
        )}
        <span className="truncate max-w-[160px] sm:max-w-[220px]" title={name}>
          {name}
        </span>
      </div>

      {canPreview && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-[min(960px,calc(100vw-2rem))] gap-3 p-3 sm:p-4">
            <DialogTitle className="text-sm font-medium pr-8 truncate">
              {t('admin.workspace.chatAttachmentPreviewTitle', { name })}
            </DialogTitle>
            <img
              src={previewUrl}
              alt={name}
              className="max-h-[min(75vh,720px)] w-full rounded-lg object-contain bg-muted/20"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
