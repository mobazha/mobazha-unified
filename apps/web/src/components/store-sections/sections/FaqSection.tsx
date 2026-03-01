'use client';

/**
 * FaqSection — PG-201
 *
 * Accordion-style FAQ with expand/collapse per item.
 */

import { useState } from 'react';
import type { FaqSectionProps } from '@mobazha/core';
import { ChevronDown } from 'lucide-react';

export function FaqSection({ title, items }: FaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!items?.length) return null;

  return (
    <div className="py-4">
      <h2
        className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6"
        style={{ fontFamily: 'var(--store-font, inherit)' }}
      >
        {title}
      </h2>
      <div className="divide-y divide-border rounded-lg border border-border">
        {items.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={i}>
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="flex w-full items-center justify-between px-4 sm:px-5 py-3 sm:py-4 min-h-[44px] text-left text-sm font-medium hover:bg-muted/50 transition-colors"
                style={{ fontFamily: 'var(--store-font, inherit)' }}
              >
                <span>{item.question}</span>
                <ChevronDown
                  className={`w-5 h-5 sm:w-4 sm:h-4 shrink-0 ml-3 sm:ml-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isOpen && (
                <div className="px-4 sm:px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
