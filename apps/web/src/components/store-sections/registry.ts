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
  /** i18n key for the section label (e.g. 'admin.storeBranding.sectionHero') */
  labelKey: string;
  description: string;
  /** i18n key for the section description */
  descriptionKey: string;
  icon: string;
  /** Priority for ordering: 0 = P0, 1 = P1, 2 = P2 */
  priority: 0 | 1 | 2;
}

export const SECTION_REGISTRY: SectionMeta[] = [
  {
    type: 'hero',
    label: 'Hero Banner',
    labelKey: 'admin.storeBranding.sectionHero',
    description: 'Full-width banner with title, subtitle, and call to action',
    descriptionKey: 'admin.storeBranding.sectionHeroDesc',
    icon: '🖼️',
    priority: 0,
  },
  {
    type: 'featured-products',
    label: 'Featured Products',
    labelKey: 'admin.storeBranding.sectionFeatured',
    description: 'Hand-picked or auto-selected product showcase',
    descriptionKey: 'admin.storeBranding.sectionFeaturedDesc',
    icon: '⭐',
    priority: 0,
  },
  {
    type: 'product-grid',
    label: 'Product Grid',
    labelKey: 'admin.storeBranding.sectionProductGrid',
    description: 'Browseable product catalog with filters and search',
    descriptionKey: 'admin.storeBranding.sectionProductGridDesc',
    icon: '📦',
    priority: 0,
  },
  {
    type: 'announcement-bar',
    label: 'Announcement Bar',
    labelKey: 'admin.storeBranding.sectionAnnouncement',
    description: 'Dismissible banner for sales, news, or updates',
    descriptionKey: 'admin.storeBranding.sectionAnnouncementDesc',
    icon: '📢',
    priority: 0,
  },
  {
    type: 'trust-badges',
    label: 'Trust Badges',
    labelKey: 'admin.storeBranding.sectionTrustBadges',
    description: 'Web3 trust signals like Buyer Protection and Direct Trade',
    descriptionKey: 'admin.storeBranding.sectionTrustBadgesDesc',
    icon: '🛡️',
    priority: 0,
  },
  {
    type: 'about',
    label: 'About',
    labelKey: 'admin.storeBranding.sectionAbout',
    description: 'Tell your story with text and an image',
    descriptionKey: 'admin.storeBranding.sectionAboutDesc',
    icon: '📝',
    priority: 1,
  },
  {
    type: 'testimonials',
    label: 'Testimonials',
    labelKey: 'admin.storeBranding.sectionTestimonials',
    description: 'Customer reviews and social proof',
    descriptionKey: 'admin.storeBranding.sectionTestimonialsDesc',
    icon: '💬',
    priority: 1,
  },
  {
    type: 'faq',
    label: 'FAQ',
    labelKey: 'admin.storeBranding.sectionFaq',
    description: 'Frequently asked questions with expandable answers',
    descriptionKey: 'admin.storeBranding.sectionFaqDesc',
    icon: '❓',
    priority: 1,
  },
  {
    type: 'collections',
    label: 'Collections',
    labelKey: 'admin.storeBranding.sectionCollections',
    description: 'Showcase product collections in a carousel or grid',
    descriptionKey: 'admin.storeBranding.sectionCollectionsDesc',
    icon: '🗂️',
    priority: 1,
  },
  {
    type: 'gallery',
    label: 'Image Gallery',
    labelKey: 'admin.storeBranding.sectionGallery',
    description: 'Photo grid with optional lightbox',
    descriptionKey: 'admin.storeBranding.sectionGalleryDesc',
    icon: '🖼️',
    priority: 2,
  },
  {
    type: 'rich-text',
    label: 'Rich Text',
    labelKey: 'admin.storeBranding.sectionRichText',
    description: 'Free-form HTML content area',
    descriptionKey: 'admin.storeBranding.sectionRichTextDesc',
    icon: '📄',
    priority: 2,
  },
  {
    type: 'contact',
    label: 'Contact Info',
    labelKey: 'admin.storeBranding.sectionContact',
    description: 'Display email, phone, website, and social links',
    descriptionKey: 'admin.storeBranding.sectionContactDesc',
    icon: '📧',
    priority: 2,
  },
  {
    type: 'video',
    label: 'Video',
    labelKey: 'admin.storeBranding.sectionVideo',
    description: 'Embed a video from YouTube, Vimeo, or upload',
    descriptionKey: 'admin.storeBranding.sectionVideoDesc',
    icon: '🎬',
    priority: 2,
  },
  {
    type: 'countdown',
    label: 'Countdown Timer',
    labelKey: 'admin.storeBranding.sectionCountdown',
    description: 'Countdown timer for sales, launches, or events',
    descriptionKey: 'admin.storeBranding.sectionCountdownDesc',
    icon: '⏱️',
    priority: 2,
  },
  {
    type: 'store-tabs',
    label: 'Store Tabs',
    labelKey: 'admin.storeBranding.sectionStoreTabs',
    description: 'Reviews, Following, and Followers tabs (system)',
    descriptionKey: 'admin.storeBranding.sectionStoreTabsDesc',
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
  video: {
    videoUrl: '',
    autoplay: false,
    loop: false,
    muted: false,
    aspectRatio: '16:9',
  },
  countdown: {
    title: 'Sale Ends In',
    targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    endMessage: 'This sale has ended',
    showDays: true,
    showHours: true,
    showMinutes: true,
    showSeconds: true,
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
