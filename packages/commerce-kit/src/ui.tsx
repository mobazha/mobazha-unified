import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import type { CommerceSlotContribution } from './contracts';

function classes(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(' ');
}

export interface CommerceButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export function CommerceButton({ className, variant = 'primary', ...props }: CommerceButtonProps) {
  return (
    <button
      className={classes('commerce-button', `commerce-button--${variant}`, className)}
      {...props}
    />
  );
}

export function CommerceCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <section className={classes('commerce-card', className)} {...props} />;
}

export interface CommercePageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function CommercePageHeader({ title, description, actions }: CommercePageHeaderProps) {
  return (
    <header className="commerce-page-header">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="commerce-page-header__actions">{actions}</div> : null}
    </header>
  );
}

export interface CommerceConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  children?: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel: ReactNode;
  dangerous?: boolean;
  busy?: boolean;
  confirmDisabled?: boolean;
  closeOnBackdrop?: boolean;
  onConfirm(): void;
  onCancel(): void;
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function CommerceConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  dangerous,
  busy = false,
  confirmDisabled = false,
  closeOnBackdrop = true,
  onConfirm,
  onCancel,
}: CommerceConfirmDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(busy);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!open) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const initialFocus = dialog?.querySelector<HTMLElement>('[data-commerce-dialog-initial-focus]');
    (initialFocus ?? dialog)?.focus();

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape' && !busyRef.current) {
        event.preventDefault();
        onCancelRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)];
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="commerce-dialog-backdrop"
      role="presentation"
      onClick={() => {
        if (closeOnBackdrop && !busy) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        className="commerce-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={busy}
        tabIndex={-1}
        onClick={event => event.stopPropagation()}
      >
        <h2 id={titleId}>{title}</h2>
        {children}
        <div className="commerce-dialog__actions">
          <CommerceButton
            type="button"
            variant="secondary"
            disabled={busy}
            data-commerce-dialog-initial-focus
            onClick={onCancel}
          >
            {cancelLabel}
          </CommerceButton>
          <CommerceButton
            type="button"
            variant={dangerous ? 'danger' : 'primary'}
            disabled={busy || confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </CommerceButton>
        </div>
      </div>
    </div>
  );
}

export function CommerceSlotOutlet({
  contributions,
}: {
  contributions?: readonly CommerceSlotContribution[];
}) {
  if (!contributions?.length) return null;
  return (
    <>
      {contributions.map(contribution => {
        const Component = contribution.component;
        return <Component key={contribution.id} />;
      })}
    </>
  );
}
