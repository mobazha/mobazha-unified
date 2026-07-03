import type { ReactNode } from 'react';
import type { CommerceSlotContribution } from '../contracts';
import { CommerceSlotOutlet } from '../ui';

export const STOREFRONT_FEATURE_ID = 'commerce.storefront';

export interface CommerceStorefrontShellProps {
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  headerAfter?: readonly CommerceSlotContribution[];
  footerBefore?: readonly CommerceSlotContribution[];
  className?: string;
}

export function CommerceStorefrontShell({
  header,
  children,
  footer,
  headerAfter,
  footerBefore,
  className,
}: CommerceStorefrontShellProps) {
  return (
    <div className={['commerce-storefront', className].filter(Boolean).join(' ')}>
      <header className="commerce-storefront__header">
        {header}
        <CommerceSlotOutlet contributions={headerAfter} />
      </header>
      <main className="commerce-storefront__content">{children}</main>
      <footer className="commerce-storefront__footer">
        <CommerceSlotOutlet contributions={footerBefore} />
        {footer}
      </footer>
    </div>
  );
}

export { COMMERCE_SLOTS } from '../slots';
export type { CommerceFeaturePackage, CommerceSlotContribution } from '../contracts';
