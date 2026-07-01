'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useI18n } from '@mobazha/core';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (typeof window !== 'undefined') return window.location.origin;
  return typeof __SOVEREIGN__ !== 'undefined' && __SOVEREIGN__ ? '' : 'https://app.mobazha.org';
}

type EmbedType = 'product' | 'store';

interface EmbedSize {
  label: string;
  width: number;
  height: number;
}

const SIZES: EmbedSize[] = [
  { label: 'Small', width: 320, height: 180 },
  { label: 'Medium', width: 400, height: 200 },
  { label: 'Large', width: 600, height: 220 },
];

export interface EmbedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: EmbedType;
  /** Product slug or store peerID */
  identifier: string;
  /** peerID — required for product embeds, ignored for store */
  peerID?: string;
}

export function EmbedDialog({ open, onOpenChange, type, identifier, peerID }: EmbedDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [sizeIndex, setSizeIndex] = useState(1);
  const [copied, setCopied] = useState(false);

  const size = SIZES[sizeIndex];

  const embedUrl = useMemo(() => {
    const base = getSiteUrl();
    if (type === 'product') {
      if (!peerID) return '';
      return `${base}/embed/product/${identifier}?peerID=${peerID}`;
    }
    return `${base}/embed/store/${identifier}`;
  }, [type, identifier, peerID]);

  const embedCode = useMemo(() => {
    return `<iframe src="${embedUrl}" width="${size.width}" height="${size.height}" frameborder="0" style="border:0;border-radius:12px;overflow:hidden" loading="lazy"></iframe>`;
  }, [embedUrl, size]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      toast({ description: t('embed.codeCopied') });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ description: t('common.error'), variant: 'destructive' });
    }
  }, [embedCode, toast, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('embed.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Size selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              {t('embed.size')}
            </label>
            <div className="flex gap-2">
              {SIZES.map((s, i) => (
                <button
                  key={s.label}
                  onClick={() => setSizeIndex(i)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    i === sizeIndex
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {s.label} ({s.width}x{s.height})
                </button>
              ))}
            </div>
          </div>

          {/* Code block */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              {t('embed.code')}
            </label>
            <div className="relative">
              <pre className="bg-muted rounded-lg p-3 text-xs text-foreground overflow-x-auto whitespace-pre-wrap break-all font-mono leading-relaxed">
                {embedCode}
              </pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1.5 right-1.5 h-7 w-7"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {/* Live preview */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              {t('embed.preview')}
            </label>
            <div className="bg-muted/50 rounded-lg p-4 flex justify-center">
              <iframe
                src={embedUrl}
                width={size.width}
                height={size.height}
                className="border-0 rounded-xl"
                style={{ maxWidth: '100%' }}
                loading="lazy"
                title="Embed preview"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
