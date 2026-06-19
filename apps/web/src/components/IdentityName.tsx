import React from 'react';
import { identityNameProps } from '@mobazha/core';
import { cn } from '@/lib/utils';

type IdentityNameElement = 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'a';

export interface IdentityNameProps {
  children: React.ReactNode;
  as?: IdentityNameElement;
  className?: string;
  href?: string;
  target?: string;
  rel?: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
  title?: string;
}

/**
 * Renders a user/store display name with browser auto-translate disabled.
 * Prevents Chrome/Safari from mangling stylized names (e.g. SN6op → sn6op).
 */
export function IdentityName({
  children,
  as: Tag = 'span',
  className,
  href,
  target,
  rel,
  onClick,
  title,
}: IdentityNameProps) {
  const antiTranslate = identityNameProps(className);

  if (Tag === 'a') {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        onClick={onClick}
        title={title}
        translate={antiTranslate.translate}
        className={antiTranslate.className}
      >
        {children}
      </a>
    );
  }

  return (
    <Tag
      translate={antiTranslate.translate}
      className={antiTranslate.className}
      onClick={onClick}
      title={title}
    >
      {children}
    </Tag>
  );
}

/** Merge notranslate into an existing className string (e.g. Avatar fallbacks). */
export function withIdentityNameClass(className?: string): string {
  return cn(identityNameProps(className).className);
}

export default IdentityName;
