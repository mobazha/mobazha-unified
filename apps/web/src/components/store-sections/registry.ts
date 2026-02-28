/**
 * Section Metadata Registry — PG-201
 *
 * Provides human-readable labels, descriptions, icons, and default props
 * for every section type. Used by the admin editor for the section picker,
 * drag list display, and new-section initialization.
 */

import type { SectionType, StoreSection } from '@mobazha/core';
import { WEB3_TRUST_KIT } from '@mobazha/core';

// ---------------------------------------------------------------------------
// Section Metadata
// ---------------------------------------------------------------------------

export interface SectionMeta {
  type: SectionType;
  label: string;
  description: string;
  icon: string;
  /** Priority for ordering: 0 = P0, 1 = P1, 2 = P2 */
  priority: 0 | 1 | 2;
}

export const SECTION_REGISTRY: SectionMeta[] = [
  {
    type: 'hero',
    label: 'Hero Banner',
    description: 'Full-width banner with title, subtitle, and call to action',
    icon: '🖼️',
    priority: 0,
  },
  {
    type: 'featured-products',
    label: 'Featured Products',
    description: 'Hand-picked or auto-selected product showcase',
    icon: '⭐',
    priority: 0,
  },
  {
    type: 'product-grid',
    label: 'Product Grid',
    description: 'Browseable product catalog with filters and search',
    icon: '📦',
    priority: 0,
  },
  {
    type: 'announcement-bar',
    label: 'Announcement Bar',
    description: 'Dismissible banner for sales, news, or updates',
    icon: '📢',
    priority: 0,
  },
  {
    type: 'trust-badges',
    label: 'Trust Badges',
    description: 'Web3 trust signals like Buyer Protection and Direct Trade',
    icon: '🛡️',
    priority: 0,
  },
  {
    type: 'about',
    label: 'About',
    description: 'Tell your story with text and an image',
    icon: '📝',
    priority: 1,
  },
  {
    type: 'testimonials',
    label: 'Testimonials',
    description: 'Customer reviews and social proof',
    icon: '💬',
    priority: 1,
  },
  {
    type: 'faq',
    label: 'FAQ',
    description: 'Frequently asked questions with expandable answers',
    icon: '❓',
    priority: 1,
  },
  {
    type: 'collections',
    label: 'Collections',
    description: 'Showcase product collections in a carousel or grid',
    icon: '🗂️',
    priority: 1,
  },
  {
    type: 'gallery',
    label: 'Image Gallery',
    description: 'Photo grid with optional lightbox',
    icon: '🖼️',
    priority: 2,
  },
  {
    type: 'rich-text',
    label: 'Rich Text',
    description: 'Free-form HTML content area',
    icon: '📄',
    priority: 2,
  },
  {
    type: 'contact',
    label: 'Contact Info',
    description: 'Display email, phone, website, and social links',
    icon: '📧',
    priority: 2,
  },
  {
    type: 'store-tabs',
    label: 'Store Tabs',
    description: 'Reviews, Following, and Followers tabs (system)',
    icon: '📋',
    priority: 0,
  },
];

/** Look up metadata by section type. */
export function getSectionMeta(type: SectionType): SectionMeta | undefined {
  return SECTION_REGISTRY.find(m => m.type === type);
}

// ---------------------------------------------------------------------------
// Default Props (for creating new sections)
// ---------------------------------------------------------------------------

type DefaultPropsMap = {
  [T in StoreSection as T['type']]: T['props'];
};

const DEFAULT_PROPS: DefaultPropsMap = {
  hero: {
    title: 'Welcome to our store',
    subtitle: 'Discover unique products',
    height: 'md',
    textAlign: 'center',
    overlayOpacity: 0.4,
  },
  'announcement-bar': {
    text: '🎉 Free shipping on orders over $50!',
    dismissible: true,
  },
  'featured-products': {
    title: 'Featured Products',
    mode: 'newest',
    count: 4,
    columns: 4,
  },
  'product-grid': {
    title: 'All Products',
    showFilters: true,
    showSearch: true,
    columns: 4,
    sortDefault: 'newest',
  },
  about: {
    title: 'About Us',
    text: 'Tell your store story here...',
    imagePosition: 'right',
    showContactInfo: false,
  },
  'trust-badges': {
    badges: [...WEB3_TRUST_KIT],
    layout: 'horizontal',
    style: 'card',
  },
  testimonials: {
    title: 'What Our Customers Say',
    mode: 'latest',
    count: 3,
  },
  faq: {
    title: 'Frequently Asked Questions',
    items: [
      {
        question: 'How does payment work?',
        answer: 'We accept cryptocurrency payments secured by escrow.',
      },
      {
        question: 'How is shipping handled?',
        answer: 'Shipping details are agreed upon during checkout.',
      },
    ],
  },
  collections: {
    title: 'Shop by Collection',
    mode: 'all',
    layout: 'carousel',
  },
  gallery: {
    images: [],
    columns: 3,
    aspectRatio: 'square',
    enableLightbox: true,
  },
  'rich-text': {
    content: '<p>Add your content here...</p>',
    maxWidth: 'md',
  },
  contact: {
    title: 'Get in Touch',
    showEmail: true,
    showPhone: false,
    showWebsite: true,
    showSocial: true,
  },
  'store-tabs': {
    tabs: ['reviews', 'following', 'followers'],
  },
};

let sectionCounter = 0;

/** Create a new section with default props and a unique ID. */
export function createSection(type: SectionType): StoreSection {
  sectionCounter += 1;
  const id = `${type}-${Date.now()}-${sectionCounter}`;
  const props = DEFAULT_PROPS[type as keyof DefaultPropsMap];
  return { id, type, props, visible: true } as StoreSection;
}
