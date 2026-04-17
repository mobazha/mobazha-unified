'use client';

import React from 'react';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface HelpPopoverProps {
  title: string;
  body: React.ReactNode;
  ariaLabel: string;
  size?: 'sm' | 'md';
  className?: string;
  iconClassName?: string;
  align?: 'start' | 'center' | 'end';
}

export function HelpPopover({
  title,
  body,
  ariaLabel,
  size = 'sm',
  className,
  iconClassName,
  align = 'start',
}: HelpPopoverProps) {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            'inline-flex items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className,
          )}
        >
          <Info className={cn(iconSize, iconClassName)} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className="text-sm">
        <p className="font-semibold mb-1">{title}</p>
        <div className="text-muted-foreground leading-relaxed">{body}</div>
      </PopoverContent>
    </Popover>
  );
}
