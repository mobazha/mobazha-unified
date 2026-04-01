'use client';

import * as React from 'react';
import { AlertCircle, Copy, ChevronDown, ChevronUp, RefreshCw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiError } from '@mobazha/core/services/api/client';

interface ErrorAlertProps {
  error: string | ApiError | null;
  className?: string;
  onRetry?: () => void;
  retrying?: boolean;
  variant?: 'inline' | 'banner';
}

function ErrorAlert({ error, className, onRetry, retrying, variant = 'inline' }: ErrorAlertProps) {
  const [showDetail, setShowDetail] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  if (!error) return null;

  const isApiError = error instanceof ApiError;
  const message = isApiError ? error.message : error;
  const hasDetail = isApiError && (error.detail || error.traceID);

  const handleCopyDiagnostic = async () => {
    if (!isApiError) return;
    try {
      await navigator.clipboard.writeText(error.toDiagnostic());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  if (variant === 'banner') {
    return (
      <div
        className={cn('rounded-lg border border-destructive/30 bg-destructive/5 p-4', className)}
        role="alert"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-destructive break-words">{message}</p>
            {hasDetail && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setShowDetail(!showDetail)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showDetail ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  <span>Technical details</span>
                </button>
                {showDetail && (
                  <div className="mt-2 rounded bg-muted/50 px-3 py-2">
                    {isApiError && error.detail && (
                      <p className="text-xs text-muted-foreground break-words font-mono">
                        {error.detail}
                      </p>
                    )}
                    {isApiError && error.traceID && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="font-medium">Trace:</span>{' '}
                        <span className="font-mono">{error.traceID}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 mt-3">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={retrying}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive hover:text-destructive/80 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={cn('h-3 w-3', retrying && 'animate-spin')} />
                  <span>{retrying ? 'Retrying...' : 'Retry'}</span>
                </button>
              )}
              {hasDetail && (
                <button
                  type="button"
                  onClick={handleCopyDiagnostic}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? 'Copied' : 'Copy diagnostic info'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'px-3 py-2 rounded-lg text-xs break-words bg-destructive/10 text-destructive',
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <span>{message}</span>
          {hasDetail && (
            <span className="ml-1">
              <button
                type="button"
                onClick={handleCopyDiagnostic}
                className="inline-flex items-center gap-1 text-destructive/70 hover:text-destructive transition-colors"
                title="Copy diagnostic info"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export { ErrorAlert };
export type { ErrorAlertProps };
