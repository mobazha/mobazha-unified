import React from 'react';

/**
 * Minimal layout for embed pages — no Header, Footer, MobileNav, or ChatSystem.
 * The root layout's NonEmbedUI wrapper hides those components when pathname starts with /embed.
 * This layout just renders children without the MainContent padding wrapper.
 */
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
