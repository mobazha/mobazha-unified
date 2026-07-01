'use client';

import { lazy, Suspense } from 'react';
import { cn } from '@/lib/utils';

const ReactMarkdown = lazy(() => import('react-markdown'));

const proseClass =
  'prose prose-sm dark:prose-invert max-w-none break-words [&_code]:text-xs [&_li]:my-0.5 [&_ol]:my-1.5 [&_p]:my-1.5 [&_pre]:overflow-x-auto [&_pre]:text-xs [&_ul]:my-1.5';

const tableWrapClass =
  'my-3 overflow-x-auto rounded-lg border border-border bg-background/80 shadow-sm';

const tableClass =
  'w-full min-w-[420px] text-xs border-collapse [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium';

interface WorkspaceAssistantMarkdownProps {
  content: string;
  className?: string;
}

/** Workspace chat: readable tables + callout-style blockquotes for AI proposals. */
export function WorkspaceAssistantMarkdown({
  content,
  className,
}: WorkspaceAssistantMarkdownProps) {
  return (
    <Suspense fallback={<p className="whitespace-pre-wrap break-words">{content}</p>}>
      <div
        className={cn(
          proseClass,
          '[&_blockquote]:my-3 [&_blockquote]:rounded-lg [&_blockquote]:border [&_blockquote]:border-warning/30 [&_blockquote]:bg-warning/[0.06] [&_blockquote]:px-3 [&_blockquote]:py-2 [&_blockquote]:not-italic [&_blockquote]:text-foreground',
          '[&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5',
          '[&_strong]:font-semibold',
          className
        )}
      >
        <ReactMarkdown
          components={{
            table: ({ children }) => (
              <div className={tableWrapClass}>
                <table className={tableClass}>{children}</table>
              </div>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </Suspense>
  );
}
