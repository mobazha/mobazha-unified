'use client';

/**
 * SectionIcon — PG-203 V2-P2
 *
 * Consistent lucide icon per section type for editor chrome (section list,
 * add-section picker, canvas label chips), replacing the emoji strings from
 * the registry which rendered inconsistently across platforms.
 */

import type { SectionType } from '@mobazha/core';
import {
  Image as ImageIcon,
  Megaphone,
  Star,
  LayoutGrid,
  UserRound,
  ShieldCheck,
  MessageSquareQuote,
  HelpCircle,
  Layers,
  Images,
  Text,
  Contact,
  PanelTop,
  Video,
  TimerReset,
  Square,
  type LucideIcon,
} from 'lucide-react';

const SECTION_ICONS: Record<SectionType, LucideIcon> = {
  hero: ImageIcon,
  'announcement-bar': Megaphone,
  'featured-products': Star,
  'product-grid': LayoutGrid,
  about: UserRound,
  'trust-badges': ShieldCheck,
  testimonials: MessageSquareQuote,
  faq: HelpCircle,
  collections: Layers,
  gallery: Images,
  'rich-text': Text,
  contact: Contact,
  'store-tabs': PanelTop,
  video: Video,
  countdown: TimerReset,
};

export function SectionIcon({
  type,
  className = 'w-4 h-4',
}: {
  type: SectionType;
  className?: string;
}) {
  const Icon = SECTION_ICONS[type] || Square;
  return <Icon className={className} strokeWidth={1.75} />;
}
