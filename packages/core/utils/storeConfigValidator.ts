/**
 * AI Store Config Validator — PG-202
 *
 * Validates and fixes AI-generated StoreConfig to ensure it conforms
 * to the expected schema. Falls back to DEFAULT values for invalid fields.
 */

import type {
  StoreConfig,
  StoreSection,
  SectionType,
  ThemePalette,
  FontFamily,
  BorderRadius,
  HeaderStyle,
} from '../types/storeConfig';
import { SECTION_TYPE_LIST, WEB3_TRUST_KIT } from '../types/storeConfig';

const VALID_PALETTES: ThemePalette[] = [
  'ocean',
  'forest',
  'sunset',
  'midnight',
  'minimal',
  'earth',
  'lavender',
  'rose',
  'custom',
];
const VALID_FONTS: FontFamily[] = [
  'inter',
  'dm-sans',
  'space-grotesk',
  'playfair',
  'lora',
  'merriweather',
  'josefin-sans',
  'poppins',
];
const VALID_RADII: BorderRadius[] = ['none', 'sm', 'md', 'lg', 'full'];
const VALID_HEADER_STYLES: HeaderStyle[] = ['minimal', 'classic', 'hero'];

const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;

const MAX_SECTIONS = 20;

const DEFAULT_FALLBACK: StoreConfig = {
  version: 1,
  status: 'published',
  theme: {
    palette: 'minimal',
    primaryColor: '#000000',
    fontFamily: 'inter',
    borderRadius: 'md',
    headerStyle: 'minimal',
  },
  sections: [
    {
      id: 'default-hero',
      type: 'hero',
      props: {
        title: 'Welcome',
        subtitle: 'Explore our collection',
        height: 'md',
        textAlign: 'center',
        overlayOpacity: 0.4,
      },
      visible: true,
    },
    {
      id: 'default-trust',
      type: 'trust-badges',
      props: { badges: [...WEB3_TRUST_KIT], layout: 'horizontal', style: 'card' },
      visible: true,
    },
    {
      id: 'default-tabs',
      type: 'store-tabs',
      props: { tabs: ['reviews', 'following', 'followers'] },
      visible: true,
    },
  ],
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isValidHex(v: unknown): v is string {
  return typeof v === 'string' && HEX_COLOR_RE.test(v);
}

function isValidSectionType(t: unknown): t is SectionType {
  return typeof t === 'string' && SECTION_TYPE_LIST.includes(t as SectionType);
}

let idCounter = 0;

function ensureSectionId(section: Record<string, unknown>): string {
  if (typeof section.id === 'string' && section.id.length > 0) {
    return section.id;
  }
  idCounter += 1;
  return `ai-${section.type}-${Date.now()}-${idCounter}`;
}

function fixSection(raw: unknown): StoreSection | null {
  if (!isObject(raw)) return null;
  if (!isValidSectionType(raw.type)) return null;

  const id = ensureSectionId(raw);
  const visible = typeof raw.visible === 'boolean' ? raw.visible : true;
  const props = isObject(raw.props) ? raw.props : {};

  return { id, type: raw.type, props, visible } as unknown as StoreSection;
}

export function validateAndFixStoreConfig(raw: unknown): StoreConfig {
  if (!isObject(raw)) {
    return JSON.parse(JSON.stringify(DEFAULT_FALLBACK)) as StoreConfig;
  }

  const theme = isObject(raw.theme) ? raw.theme : {};

  const palette = VALID_PALETTES.includes(theme.palette as ThemePalette)
    ? (theme.palette as ThemePalette)
    : 'custom';
  const fontFamily = VALID_FONTS.includes(theme.fontFamily as FontFamily)
    ? (theme.fontFamily as FontFamily)
    : 'inter';
  const borderRadius = VALID_RADII.includes(theme.borderRadius as BorderRadius)
    ? (theme.borderRadius as BorderRadius)
    : 'md';
  const headerStyle = VALID_HEADER_STYLES.includes(theme.headerStyle as HeaderStyle)
    ? (theme.headerStyle as HeaderStyle)
    : 'minimal';
  const primaryColor = isValidHex(theme.primaryColor) ? theme.primaryColor : '#000000';
  const secondaryColor = isValidHex(theme.secondaryColor) ? theme.secondaryColor : undefined;
  const accentColor = isValidHex(theme.accentColor) ? theme.accentColor : undefined;

  const rawSections = Array.isArray(raw.sections) ? raw.sections : [];
  const sections: StoreSection[] = [];
  for (const rawSection of rawSections) {
    if (sections.length >= MAX_SECTIONS) break;
    const fixed = fixSection(rawSection);
    if (fixed) sections.push(fixed);
  }

  const hasStoreTabs = sections.some(s => s.type === 'store-tabs');
  if (!hasStoreTabs) {
    sections.push({
      id: 'ai-store-tabs',
      type: 'store-tabs',
      props: { tabs: ['reviews', 'following', 'followers'] },
      visible: true,
    });
  }

  return {
    version: 1,
    status: 'published',
    theme: {
      palette,
      primaryColor,
      ...(secondaryColor ? { secondaryColor } : {}),
      ...(accentColor ? { accentColor } : {}),
      fontFamily,
      borderRadius,
      headerStyle,
    },
    sections,
  };
}
