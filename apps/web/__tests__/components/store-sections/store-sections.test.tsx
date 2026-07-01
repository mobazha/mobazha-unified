/**
 * Store Sections — Component Integration Tests (Layer 2)
 *
 * Tests section rendering, theme provider CSS injection, registry metadata,
 * and section creation utilities.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockT = (key: string) => key;

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({ t: mockT, locale: 'en', setLocale: vi.fn() }),
    useGatewayUrl: () => 'http://localhost:4002',
    usePeerID: () => 'QmTest123',
    getImageUrl: (hash: string | undefined | null) =>
      hash ? `http://localhost:4002/v1/media/images/${hash}` : undefined,
    getContrastText: (hex: string) => {
      const c = hex.replace('#', '');
      const r = parseInt(c.slice(0, 2), 16) / 255;
      const g = parseInt(c.slice(2, 4), 16) / 255;
      const b = parseInt(c.slice(4, 6), 16) / 255;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return lum > 0.179 ? '#000000' : '#ffffff';
    },
    RADIUS_MAP: { none: '0px', sm: '4px', md: '8px', lg: '16px', full: '9999px' },
    SPACING_MAP: { none: '0', sm: '1rem', md: '2rem', lg: '3rem', xl: '4rem' },
    WEB3_TRUST_KIT: [
      { icon: 'escrow', title: 'Buyer Protection', description: 'Funds held securely' },
      { icon: 'crypto', title: 'Crypto Native', description: 'Pay with ETH, BNB, SOL' },
      { icon: 'selfHosted', title: 'Self-Hosted', description: "Seller's own server" },
      { icon: 'p2p', title: 'Direct Trade', description: 'No middleman' },
      { icon: 'privacy', title: 'Privacy First', description: 'No tracking' },
    ],
    MAX_SECTIONS: 20,
    SECTION_TYPE_LIST: [
      'hero',
      'announcement-bar',
      'featured-products',
      'product-grid',
      'about',
      'trust-badges',
      'testimonials',
      'faq',
      'collections',
      'gallery',
      'rich-text',
      'contact',
      'video',
      'countdown',
      'store-tabs',
    ],
    SYSTEM_SECTION_TYPES: ['store-tabs'],
    ADDABLE_SECTION_TYPES: [
      'hero',
      'announcement-bar',
      'featured-products',
      'product-grid',
      'about',
      'trust-badges',
      'testimonials',
      'faq',
      'collections',
      'gallery',
      'rich-text',
      'contact',
      'video',
      'countdown',
    ],
  };
});

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));

vi.mock('lucide-react', async importOriginal => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  return {
    ...actual,
    ChevronDown: () => <span data-testid="chevron-down" />,
    X: () => <span data-testid="x-icon" />,
  };
});

vi.mock('@/lib/fonts', () => ({
  FONT_CSS_VAR_MAP: {
    inter: 'var(--font-inter)',
    'dm-sans': 'var(--font-dm-sans)',
    'space-grotesk': 'var(--font-space-grotesk)',
    playfair: 'var(--font-playfair)',
    lora: 'var(--font-lora)',
    merriweather: 'var(--font-merriweather)',
    'josefin-sans': 'var(--font-josefin-sans)',
    poppins: 'var(--font-poppins)',
  },
  loadStoreFont: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { StoreThemeProvider } from '@/components/store-sections/StoreThemeProvider';
import { SectionBlock } from '@/components/store-sections/SectionBlock';
import { SectionRenderer } from '@/components/store-sections/SectionRenderer';
import {
  SECTION_REGISTRY,
  getSectionMeta,
  createSection,
} from '@/components/store-sections/registry';
import { DEFAULT_STORE_CONFIG, STORE_PRESETS } from '@/components/store-sections/defaults';

import type { StoreTheme } from '@mobazha/core';

const BASE_THEME: StoreTheme = {
  palette: 'custom',
  primaryColor: '#000',
  secondaryColor: '#666',
  accentColor: '#999',
  fontFamily: 'inter',
  borderRadius: 'md',
  headerStyle: 'minimal',
};

// ---------------------------------------------------------------------------
// StoreThemeProvider
// ---------------------------------------------------------------------------

describe('StoreThemeProvider', () => {
  it('injects CSS custom properties from theme', () => {
    const { container } = render(
      <StoreThemeProvider
        theme={{
          ...BASE_THEME,
          primaryColor: '#ff0000',
          secondaryColor: '#00ff00',
          accentColor: '#0000ff',
        }}
      >
        <span>child</span>
      </StoreThemeProvider>
    );

    const root = container.querySelector('.store-theme-root') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.style.getPropertyValue('--store-primary')).toBe('#ff0000');
    expect(root.style.getPropertyValue('--store-secondary')).toBe('#00ff00');
    expect(root.style.getPropertyValue('--store-accent')).toBe('#0000ff');
  });

  it('renders children', () => {
    render(
      <StoreThemeProvider theme={BASE_THEME}>
        <span>Hello Store</span>
      </StoreThemeProvider>
    );
    expect(screen.getByText('Hello Store')).toBeTruthy();
  });

  it('uses CSS variable reference for --store-font', () => {
    const { container } = render(
      <StoreThemeProvider theme={{ ...BASE_THEME, fontFamily: 'poppins' }}>
        <span>font test</span>
      </StoreThemeProvider>
    );

    const root = container.querySelector('.store-theme-root') as HTMLElement;
    expect(root.style.getPropertyValue('--store-font')).toBe('var(--font-poppins)');
  });

  it('falls back to inter font when fontFamily is unknown', () => {
    const { container } = render(
      <StoreThemeProvider theme={{ ...BASE_THEME, fontFamily: 'unknown-font' as 'inter' }}>
        <span>fallback font</span>
      </StoreThemeProvider>
    );

    const root = container.querySelector('.store-theme-root') as HTMLElement;
    expect(root.style.getPropertyValue('--store-font')).toBe('var(--font-inter)');
  });

  it('applies default values for missing theme props', () => {
    const { container } = render(
      <StoreThemeProvider
        theme={{
          ...BASE_THEME,
          primaryColor: '',
          secondaryColor: '',
          accentColor: '',
          fontFamily: '' as 'inter',
          borderRadius: '' as 'md',
        }}
      >
        <span>fallback</span>
      </StoreThemeProvider>
    );

    const root = container.querySelector('.store-theme-root') as HTMLElement;
    expect(root.style.getPropertyValue('--store-primary')).toBe('#000000');
  });
});

// ---------------------------------------------------------------------------
// SectionBlock
// ---------------------------------------------------------------------------

describe('SectionBlock', () => {
  it('renders children with default padding', () => {
    render(
      <SectionBlock>
        <span>Hero Content</span>
      </SectionBlock>
    );

    expect(screen.getByText('Hero Content')).toBeTruthy();
  });

  it('applies layout spacing', () => {
    const { container } = render(
      <SectionBlock layout={{ paddingTop: 'lg', paddingBottom: 'sm' }}>
        <span>FAQ</span>
      </SectionBlock>
    );

    const section = container.querySelector('section') as HTMLElement;
    expect(section).toBeTruthy();
    expect(section.style.paddingTop).toBe('clamp(1.5rem, 7.5vw, 3rem)');
    expect(section.style.paddingBottom).toBe('clamp(0.5rem, 2.5vw, 1rem)');
  });
});

// ---------------------------------------------------------------------------
// SectionRenderer
// ---------------------------------------------------------------------------

describe('SectionRenderer', () => {
  it('renders a hero section', () => {
    render(
      <StoreThemeProvider
        theme={{
          ...BASE_THEME,
          primaryColor: '#123456',
          secondaryColor: '#654321',
          accentColor: '#abcdef',
        }}
      >
        <SectionRenderer
          sections={[
            {
              id: 'hero-1',
              type: 'hero',
              visible: true,
              props: {
                title: 'Test Store',
                subtitle: 'Welcome',
                height: 'md',
                textAlign: 'center',
                overlayOpacity: 0.4,
              },
            },
          ]}
          peerId="QmTest123"
        />
      </StoreThemeProvider>
    );

    expect(screen.getByText('Test Store')).toBeTruthy();
    expect(screen.getByText('Welcome')).toBeTruthy();
  });

  it('renders announcement bar section', () => {
    render(
      <StoreThemeProvider theme={BASE_THEME}>
        <SectionRenderer
          sections={[
            {
              id: 'ann-1',
              type: 'announcement-bar',
              visible: true,
              props: {
                text: 'Sale today!',
                dismissible: true,
              },
            },
          ]}
          peerId="QmTest123"
        />
      </StoreThemeProvider>
    );

    expect(screen.getByText('Sale today!')).toBeTruthy();
  });

  it('does not render hidden sections', () => {
    render(
      <StoreThemeProvider theme={BASE_THEME}>
        <SectionRenderer
          sections={[
            {
              id: 'hero-hidden',
              type: 'hero',
              visible: false,
              props: {
                title: 'Hidden Hero',
                height: 'md',
                textAlign: 'center',
                overlayOpacity: 0.4,
              },
            },
          ]}
          peerId="QmTest123"
        />
      </StoreThemeProvider>
    );

    expect(screen.queryByText('Hidden Hero')).toBeNull();
  });

  it('renders FAQ section with items', () => {
    render(
      <StoreThemeProvider theme={BASE_THEME}>
        <SectionRenderer
          sections={[
            {
              id: 'faq-1',
              type: 'faq',
              visible: true,
              props: {
                title: 'FAQ',
                items: [
                  { question: 'Q1?', answer: 'A1.' },
                  { question: 'Q2?', answer: 'A2.' },
                ],
              },
            },
          ]}
          peerId="QmTest123"
        />
      </StoreThemeProvider>
    );

    expect(screen.getByText('Q1?')).toBeTruthy();
    expect(screen.getByText('Q2?')).toBeTruthy();
  });

  it('can toggle FAQ items', () => {
    render(
      <StoreThemeProvider theme={BASE_THEME}>
        <SectionRenderer
          sections={[
            {
              id: 'faq-toggle',
              type: 'faq',
              visible: true,
              props: {
                title: 'FAQ',
                items: [{ question: 'Q?', answer: 'Answer text here.' }],
              },
            },
          ]}
          peerId="QmTest123"
        />
      </StoreThemeProvider>
    );

    expect(screen.queryByText('Answer text here.')).toBeNull();
    fireEvent.click(screen.getByText('Q?'));
    expect(screen.getByText('Answer text here.')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// SECTION_REGISTRY
// ---------------------------------------------------------------------------

describe('SECTION_REGISTRY', () => {
  it('has 15 section types registered', () => {
    expect(SECTION_REGISTRY).toHaveLength(15);
  });

  it('each entry has required fields', () => {
    for (const meta of SECTION_REGISTRY) {
      expect(meta.type).toBeTruthy();
      expect(meta.label).toBeTruthy();
      expect(meta.labelKey).toBeTruthy();
      expect(meta.description).toBeTruthy();
      expect(meta.icon).toBeTruthy();
      expect([0, 1, 2]).toContain(meta.priority);
    }
  });

  it('labelKey follows admin.storeBranding.section* pattern', () => {
    for (const meta of SECTION_REGISTRY) {
      expect(meta.labelKey).toMatch(/^admin\.storeBranding\.section/);
    }
  });
});

describe('getSectionMeta', () => {
  it('returns metadata for known types', () => {
    const hero = getSectionMeta('hero');
    expect(hero).toBeTruthy();
    expect(hero!.label).toBe('Hero Banner');
    expect(hero!.labelKey).toBe('admin.storeBranding.sectionHero');
  });

  it('returns undefined for unknown types', () => {
    const unknown = getSectionMeta('nonexistent' as 'hero');
    expect(unknown).toBeUndefined();
  });
});

describe('createSection', () => {
  it('creates a section with unique id and default props', () => {
    const section = createSection('hero');
    expect(section.id).toContain('hero-');
    expect(section.type).toBe('hero');
    expect(section.visible).toBe(true);
    expect(section.props).toBeTruthy();
  });

  it('creates different ids for sequential calls', () => {
    const s1 = createSection('faq');
    const s2 = createSection('faq');
    expect(s1.id).not.toBe(s2.id);
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_STORE_CONFIG & STORE_PRESETS
// ---------------------------------------------------------------------------

describe('DEFAULT_STORE_CONFIG', () => {
  it('has theme and sections', () => {
    expect(DEFAULT_STORE_CONFIG.theme).toBeTruthy();
    expect(DEFAULT_STORE_CONFIG.sections).toBeTruthy();
    expect(Array.isArray(DEFAULT_STORE_CONFIG.sections)).toBe(true);
    expect(DEFAULT_STORE_CONFIG.sections.length).toBeGreaterThan(0);
  });

  it('all sections have valid types', () => {
    const validTypes = SECTION_REGISTRY.map(m => m.type);
    for (const section of DEFAULT_STORE_CONFIG.sections) {
      expect(validTypes).toContain(section.type);
    }
  });
});

describe('STORE_PRESETS', () => {
  it('has at least one preset', () => {
    expect(STORE_PRESETS.length).toBeGreaterThan(0);
  });

  it('each preset has name and config', () => {
    for (const preset of STORE_PRESETS) {
      expect(preset.name).toBeTruthy();
      expect(preset.config).toBeTruthy();
      expect(preset.config.theme).toBeTruthy();
      expect(Array.isArray(preset.config.sections)).toBe(true);
    }
  });
});
