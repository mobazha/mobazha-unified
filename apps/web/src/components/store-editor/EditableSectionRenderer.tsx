// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

/**
 * EditableSectionRenderer — PG-203 V2-P1
 *
 * Editor-side canvas: renders the same sections as the buyer-facing
 * SectionRenderer, but each block is click-to-select with hover/selected
 * outlines (Shopify-style). Hidden sections render dimmed so sellers can
 * still find them. Selecting on canvas focuses the matching list item;
 * selecting in the list scrolls the canvas block into view.
 */

import React, { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { StoreSection, UserProfile } from '@mobazha/core';
import { useI18n } from '@mobazha/core';
import { EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionBlock } from '@/components/store-sections/SectionBlock';
import { SectionSwitch } from '@/components/store-sections/SectionRenderer';
import { StoreEditorContext } from '@/components/store-sections/StoreEditorContext';
import { getSectionMeta } from '@/components/store-sections';
import { scrollElementWithinContainer } from './scrollElementWithinContainer';

interface EditableSectionRendererProps {
  sections: StoreSection[];
  peerId: string;
  profile?: UserProfile;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** The preview pane is the only surface selection is allowed to scroll. */
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
}

export function EditableSectionRenderer({
  sections,
  peerId,
  profile,
  selectedId,
  onSelect,
  scrollContainerRef,
}: EditableSectionRendererProps) {
  const { t } = useI18n();
  const blockRefs = useRef(new Map<string, HTMLDivElement>());
  // Scroll only when selection changes from the list side, not on every render.
  const lastScrolledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedId || selectedId === lastScrolledRef.current) return;
    lastScrolledRef.current = selectedId;
    const el = blockRefs.current.get(selectedId);
    const container = scrollContainerRef?.current;
    if (!el || !container) return;
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    scrollElementWithinContainer(container, el, {
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
      inset: 16,
    });
  }, [scrollContainerRef, selectedId]);

  if (sections.length === 0) return null;

  return (
    <StoreEditorContext.Provider value={true}>
      <div className="store-sections">
        {sections.map(section => {
          const meta = getSectionMeta(section.type);
          const label =
            section.name || (meta?.labelKey ? t(meta.labelKey) : (meta?.label ?? section.type));
          const isSelected = section.id === selectedId;
          return (
            <div
              key={section.id}
              ref={el => {
                if (el) blockRefs.current.set(section.id, el);
                else blockRefs.current.delete(section.id);
              }}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(section.id)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(section.id);
                }
              }}
              className={cn(
                'relative group/canvas cursor-pointer scroll-mt-4 scroll-mb-4 transition-shadow',
                'hover:ring-2 hover:ring-primary/40 hover:ring-inset',
                isSelected && 'ring-2 ring-primary ring-inset',
                !section.visible && 'opacity-40'
              )}
              data-section-id={section.id}
            >
              {/* Label chip on hover/selection */}
              <span
                className={cn(
                  'absolute top-1 left-1 z-20 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium pointer-events-none transition-opacity',
                  'bg-primary text-primary-foreground',
                  isSelected ? 'opacity-100' : 'opacity-0 group-hover/canvas:opacity-100'
                )}
              >
                {!section.visible && <EyeOff className="w-3 h-3" />}
                {label}
              </span>
              {/* Block interactions inside the section (links, buttons) while editing */}
              <div className="pointer-events-none">
                <SectionBlock layout={section.layout}>
                  <SectionSwitch section={section} profile={profile} peerId={peerId} />
                </SectionBlock>
              </div>
            </div>
          );
        })}
      </div>
    </StoreEditorContext.Provider>
  );
}
