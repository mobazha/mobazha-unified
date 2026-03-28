'use client';

import React from 'react';
import { FileText, Download } from 'lucide-react';
import { useAuthenticatedImage } from '@mobazha/core';
import type { Message } from './ChatMessages';

export function cleanDisplayName(raw: string): string {
  const trimmed = raw.trim();
  let name = trimmed.replace(/^@/, '').replace(/:[a-z0-9._-]+$/i, '');
  const cameFromMatrixId = trimmed !== name || trimmed.startsWith('@');
  if (name.startsWith('peer_')) name = name.slice(5);

  const looksLikePeerID = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|12D3Koo[1-9A-HJ-NP-Za-km-z]{20,})$/.test(
    name
  );
  if ((cameFromMatrixId || looksLikePeerID) && name.length > 12) {
    name = `${name.slice(0, 6)}…${name.slice(-4)}`;
  }
  return name || 'Chat';
}

export function shortenSystemContent(text: string): string {
  return text.replace(
    /(?:@)?(peer_[a-z0-9]{6})[a-z0-9]{8,}([a-z0-9]{4})(?::[a-z0-9._-]+)?/gi,
    '$1…$2'
  );
}

export function needsMatrixAuth(url?: string): boolean {
  if (!url) return false;
  return url.startsWith('mxc://') || url.includes('/_matrix/') || url.includes('/chat/media/');
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function useResolvedMediaUrl(url?: string): string | undefined {
  const needs = url ? needsMatrixAuth(url) : false;
  const { imageUrl } = useAuthenticatedImage(needs ? url : undefined, !needs ? url : undefined);
  return imageUrl || url;
}

export interface ChatMediaProps {
  attachment: NonNullable<Message['attachments']>[number];
  isOwn: boolean;
  status?: Message['status'];
  uploadProgress?: number;
  onRetry?: () => void;
}

export const ChatImageContent: React.FC<ChatMediaProps & { onPreview?: (src: string) => void }> =
  React.memo(({ attachment, isOwn, status, uploadProgress, onRetry, onPreview }) => {
    const displaySrc = useResolvedMediaUrl(attachment.thumbnailUrl || attachment.url);
    const fullSrc = useResolvedMediaUrl(attachment.url);

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => fullSrc && onPreview?.(fullSrc)}
          className="block cursor-zoom-in"
        >
          <img
            src={displaySrc || ''}
            alt={attachment.filename || 'Image'}
            className={`max-w-[260px] max-h-[260px] rounded-2xl object-cover shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
              isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'
            }`}
            loading="lazy"
          />
        </button>
        {status === 'sending' && uploadProgress != null && uploadProgress < 100 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
            <div className="flex flex-col items-center gap-1">
              <svg className="w-10 h-10" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="white"
                  strokeOpacity="0.3"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${uploadProgress * 0.942} 94.2`}
                  transform="rotate(-90 18 18)"
                  className="transition-all duration-300"
                />
              </svg>
              <span className="text-white text-xs font-medium">{uploadProgress}%</span>
            </div>
          </div>
        )}
        {status === 'failed' && onRetry && (
          <button
            onClick={onRetry}
            className="absolute -right-1.5 -bottom-1.5 w-7 h-7 bg-gradient-to-br from-error to-error text-white rounded-full flex items-center justify-center text-xs font-medium hover:opacity-90 transition-all shadow-md hover:shadow-lg hover:scale-110"
            aria-label="Retry"
          >
            ↻
          </button>
        )}
      </div>
    );
  });
ChatImageContent.displayName = 'ChatImageContent';

export const ChatFileContent: React.FC<ChatMediaProps> = React.memo(
  ({ attachment, isOwn, status, uploadProgress, onRetry }) => {
    const fileSrc = useResolvedMediaUrl(attachment.url);

    return (
      <div className="relative">
        <a
          href={fileSrc || '#'}
          download={attachment.filename || 'file'}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 ${
            isOwn
              ? 'bg-gradient-to-br from-primary via-primary to-primary/85 text-white rounded-br-sm shadow-lg shadow-primary/25 hover:shadow-xl'
              : 'bg-card/95 backdrop-blur-sm text-foreground rounded-bl-sm shadow-md border border-border/40 hover:shadow-lg hover:border-border/60'
          }`}
        >
          <div
            className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
              isOwn ? 'bg-white/20' : 'bg-primary/10'
            }`}
          >
            <FileText className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-primary'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{attachment.filename || 'File'}</p>
            {attachment.size && (
              <p className={`text-xs mt-0.5 ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>
                {formatFileSize(attachment.size)}
              </p>
            )}
          </div>
          {status === 'sending' && uploadProgress != null && uploadProgress < 100 ? (
            <span
              className={`shrink-0 text-xs font-medium tabular-nums ${isOwn ? 'text-white/80' : 'text-muted-foreground'}`}
            >
              {uploadProgress}%
            </span>
          ) : (
            <Download
              className={`shrink-0 w-4 h-4 ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}
            />
          )}
        </a>
        {status === 'sending' && uploadProgress != null && uploadProgress < 100 && (
          <div
            className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl overflow-hidden ${isOwn ? 'bg-white/20' : 'bg-border/40'}`}
          >
            <div
              className={`h-full transition-all duration-300 ${isOwn ? 'bg-white/60' : 'bg-primary/60'}`}
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
        {status === 'failed' && onRetry && (
          <button
            onClick={onRetry}
            className="absolute -right-1.5 -bottom-1.5 w-7 h-7 bg-gradient-to-br from-error to-error text-white rounded-full flex items-center justify-center text-xs font-medium hover:opacity-90 transition-all shadow-md hover:shadow-lg hover:scale-110"
            aria-label="Retry"
          >
            ↻
          </button>
        )}
      </div>
    );
  }
);
ChatFileContent.displayName = 'ChatFileContent';

export const ChatAudioContent: React.FC<ChatMediaProps> = React.memo(
  ({ attachment, isOwn, status, onRetry }) => {
    const audioSrc = useResolvedMediaUrl(attachment.url);

    return (
      <div
        className={`relative rounded-2xl overflow-hidden shadow-md ${
          isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'
        } ${isOwn ? 'bg-gradient-to-br from-primary via-primary to-primary/85' : 'bg-card/95 backdrop-blur-sm border border-border/40'}`}
      >
        <audio controls preload="metadata" className="block w-[260px] h-11" src={audioSrc || ''} />
        {status === 'failed' && onRetry && (
          <button
            onClick={onRetry}
            className="absolute -right-1.5 -bottom-1.5 w-7 h-7 bg-gradient-to-br from-error to-error text-white rounded-full flex items-center justify-center text-xs font-medium hover:opacity-90 transition-all shadow-md hover:shadow-lg hover:scale-110"
            aria-label="Retry"
          >
            ↻
          </button>
        )}
      </div>
    );
  }
);
ChatAudioContent.displayName = 'ChatAudioContent';

export const ChatVideoContent: React.FC<ChatMediaProps> = React.memo(
  ({ attachment, isOwn, status, onRetry }) => {
    const videoSrc = useResolvedMediaUrl(attachment.url);
    const posterSrc = useResolvedMediaUrl(attachment.thumbnailUrl);

    return (
      <div className="relative">
        <video
          controls
          preload="metadata"
          poster={posterSrc || undefined}
          className={`max-w-[260px] max-h-[260px] rounded-2xl shadow-md ${
            isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'
          }`}
          src={videoSrc || ''}
        />
        {status === 'failed' && onRetry && (
          <button
            onClick={onRetry}
            className="absolute -right-1.5 -bottom-1.5 w-7 h-7 bg-gradient-to-br from-error to-error text-white rounded-full flex items-center justify-center text-xs font-medium hover:opacity-90 transition-all shadow-md hover:shadow-lg hover:scale-110"
            aria-label="Retry"
          >
            ↻
          </button>
        )}
      </div>
    );
  }
);
ChatVideoContent.displayName = 'ChatVideoContent';
