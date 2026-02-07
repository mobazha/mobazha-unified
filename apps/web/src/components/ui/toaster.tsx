'use client';

import { useToast } from '@/components/ui/use-toast';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

function ToastIcon({ variant }: { variant?: string }) {
  const iconClass = 'h-5 w-5 flex-shrink-0';
  switch (variant) {
    case 'success':
      return <CheckCircle2 className={`${iconClass} text-primary`} />;
    case 'destructive':
      return <XCircle className={`${iconClass} text-destructive`} />;
    default:
      return <Info className={`${iconClass} text-muted-foreground`} />;
  }
}

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="flex items-start gap-3">
              <ToastIcon variant={props.variant ?? undefined} />
              <div className="grid gap-0.5">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
