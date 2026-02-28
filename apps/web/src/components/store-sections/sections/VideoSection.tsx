'use client';

/**
 * VideoSection — PG-201
 *
 * Embeds a video via HTML5 <video> or YouTube/Vimeo iframe.
 */

import type { VideoSectionProps } from '@mobazha/core';
import { useI18n } from '@mobazha/core';

const ASPECT_CLASS = {
  '16:9': 'aspect-video',
  '4:3': 'aspect-[4/3]',
  '1:1': 'aspect-square',
} as const;

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, 'https://placeholder.invalid');
    return ['http:', 'https:', 'blob:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function isEmbedUrl(url: string): boolean {
  return /youtube\.com|youtu\.be|vimeo\.com/.test(url);
}

function toEmbedUrl(url: string): string {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (ytMatch) return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return url;
}

export function VideoSection({
  title,
  videoUrl,
  posterImage,
  autoplay = false,
  loop = false,
  muted = false,
  aspectRatio = '16:9',
}: VideoSectionProps) {
  const { t } = useI18n();

  if (!videoUrl || !isSafeUrl(videoUrl)) return null;

  const aspectClass = ASPECT_CLASS[aspectRatio] ?? ASPECT_CLASS['16:9'];
  const embed = isEmbedUrl(videoUrl);

  return (
    <div className="py-4">
      {title && (
        <h2
          className="text-2xl font-bold mb-6"
          style={{ fontFamily: 'var(--store-font, inherit)' }}
        >
          {title}
        </h2>
      )}
      <div
        className={`relative overflow-hidden w-full ${aspectClass}`}
        style={{ borderRadius: 'var(--store-radius, 8px)' }}
      >
        {embed ? (
          <iframe
            src={toEmbedUrl(videoUrl)}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title || t('admin.storeBranding.videoDefaultTitle')}
          />
        ) : (
          <video
            src={videoUrl}
            poster={posterImage}
            controls
            autoPlay={autoplay}
            loop={loop}
            muted={muted || autoplay}
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
      </div>
    </div>
  );
}
