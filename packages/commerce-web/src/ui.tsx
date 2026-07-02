import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
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
  onConfirm(): void;
  onCancel(): void;
}

export function CommerceConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  dangerous,
  onConfirm,
  onCancel,
}: CommerceConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="commerce-dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="commerce-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="commerce-dialog-title"
        onClick={event => event.stopPropagation()}
      >
        <h2 id="commerce-dialog-title">{title}</h2>
        {children}
        <div className="commerce-dialog__actions">
          <CommerceButton variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </CommerceButton>
          <CommerceButton variant={dangerous ? 'danger' : 'primary'} onClick={onConfirm}>
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
