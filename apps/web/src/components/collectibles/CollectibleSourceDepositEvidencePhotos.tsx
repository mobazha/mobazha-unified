'use client';

import React, { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import {
  parseCollectibleSourceDepositPhotosJSON,
  useI18n,
  type CollectibleSourceDepositEvidencePhoto,
} from '@mobazha/core';

interface CollectibleSourceDepositEvidencePhotosProps {
  photosJSON?: string;
  className?: string;
}

function evidenceSideLabelKey(side: CollectibleSourceDepositEvidencePhoto['side']): string {
  return side === 'front'
    ? 'collectibles.sourceOps.evidenceFront'
    : 'collectibles.sourceOps.evidenceBack';
}

function evidenceAltKey(side: CollectibleSourceDepositEvidencePhoto['side']): string {
  return side === 'front'
    ? 'collectibles.sourceOps.evidenceFrontAlt'
    : 'collectibles.sourceOps.evidenceBackAlt';
}

export function CollectibleSourceDepositEvidencePhotos({
  photosJSON,
  className,
}: CollectibleSourceDepositEvidencePhotosProps) {
  const { t } = useI18n();
  const photos = useMemo(() => parseCollectibleSourceDepositPhotosJSON(photosJSON), [photosJSON]);

  if (photos.length === 0) return null;

  return (
    <div className={className} data-testid="source-deposit-evidence-photos">
      <p className="text-sm font-medium text-foreground">
        {t('collectibles.sourceOps.submissionEvidence')}
      </p>
      <ul className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {photos.map(photo => (
          <li
            key={`${photo.side}-${photo.url}`}
            className="overflow-hidden rounded-md border border-border bg-muted/30"
          >
            <p className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
              {t(evidenceSideLabelKey(photo.side))}
            </p>
            <a
              href={photo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={`${t(evidenceSideLabelKey(photo.side))}: ${t('collectibles.sourceOps.evidenceOpenLink')}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- external seller URLs; avoid Next image domain allowlist */}
              <img
                src={photo.url}
                alt={t(evidenceAltKey(photo.side))}
                className="aspect-[5/7] w-full object-cover transition-opacity group-hover:opacity-90"
                loading="lazy"
                decoding="async"
              />
              <span className="flex items-center gap-1 px-3 py-2 text-xs text-primary">
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {t('collectibles.sourceOps.evidenceOpenLink')}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
