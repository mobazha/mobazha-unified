'use client';

import React from 'react';
import { marketplaceLogoInitials } from '@mobazha/core';

interface MarketplaceLogoProps {
  name: string;
  publicID: string;
  logoURL?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-14 w-14 text-lg',
  md: 'h-16 w-16 text-xl',
  lg: 'h-24 w-24 text-2xl sm:h-32 sm:w-32 sm:text-3xl',
};

export function MarketplaceLogo({
  name,
  publicID,
  logoURL,
  size = 'md',
  className = '',
}: MarketplaceLogoProps) {
  const initials = marketplaceLogoInitials(name, publicID);

  if (logoURL) {
    return (
      <img
        src={logoURL}
        alt={name}
        className={`${sizeClasses[size]} flex-shrink-0 rounded-lg bg-muted object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} flex flex-shrink-0 items-center justify-center rounded-lg bg-primary/15 font-bold text-primary ${className}`}
      aria-hidden
    >
      {initials}
    </div>
  );
}
