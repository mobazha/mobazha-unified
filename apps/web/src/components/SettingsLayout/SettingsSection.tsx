'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SettingsSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  description,
  children,
  className,
}) => {
  const hasLeft = title || description;

  if (!hasLeft) {
    return <div className={cn(className)}>{children}</div>;
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] gap-x-10 gap-y-2 lg:gap-y-0',
        className
      )}
    >
      <div className="lg:pt-1.5 lg:pr-4">
        {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
        {description && (
          <p className={cn('text-[13px] leading-relaxed text-muted-foreground', title && 'mt-1')}>
            {description}
          </p>
        )}
      </div>

      <div>{children}</div>
    </div>
  );
};
