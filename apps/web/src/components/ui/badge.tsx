import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-text-inverse hover:bg-primary-dark',
        secondary: 'border-transparent bg-secondary text-text-inverse hover:bg-secondary-dark',
        destructive: 'border-transparent bg-error text-text-inverse hover:bg-error/80',
        success: 'border-transparent bg-success text-text-inverse hover:bg-success/80',
        warning: 'border-transparent bg-warning text-text-inverse hover:bg-warning/80',
        outline: 'text-text-primary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
