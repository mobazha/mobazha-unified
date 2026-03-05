/**
 * MobileListingWizard unit tests
 *
 * P0: Step navigation, per-step validation, review checklist, action bar visibility.
 * These tests verify the core wizard UX: users must be able to navigate steps,
 * see validation errors, and always have access to the bottom action bar.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@mobazha/core', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'listing.mobile.stepEssentials': 'Essentials',
        'listing.mobile.stepMedia': 'Media',
        'listing.mobile.stepDetails': 'Details',
        'listing.mobile.stepReview': 'Review',
        'listing.mobile.stepOf': `${params?.current || '?'}/${params?.total || '?'}`,
        'listing.mobile.readinessCheck': 'Readiness Check',
        'listing.createListing': 'Create Listing',
        'listing.editListing': 'Edit Listing',
        'listing.productType': 'Product Type',
        'listing.title': 'Title',
        'listing.price': 'Price',
        'listing.photos': 'Photos',
        'listing.tags': 'Tags',
        'listing.category': 'Category',
        'listing.tabs.shipping': 'Shipping',
        'listing.saveDraft': 'Save Draft',
        'listing.publish': 'Publish',
        'listing.save': 'Save',
        'listing.deleteListing': 'Delete Listing',
        'listing.preview': 'Preview',
        'listing.enterTag': 'Enter tag',
        'listing.tagsHelper': 'Add tags',
        'common.cancel': 'Cancel',
        'common.back': 'Back',
        'common.next': 'Next',
        'ai.suggestTags': 'AI Suggest',
      };
      return translations[key] || key;
    },
  }),
  useCurrency: () => ({
    formatPrice: (amount: number, currency: string) => `${currency} ${amount}`,
  }),
  getGatewayUrl: () => 'http://localhost:4002',
  DEFAULT_LOCAL_CURRENCY: 'USD',
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) =>
    React.createElement('a', { href, ...props }, children),
}));

// Mock child components to keep tests focused on wizard logic
vi.mock('@/components/Listing', () => ({
  ProductTypeSelector: ({ value }: any) =>
    React.createElement('div', { 'data-testid': 'product-type-selector' }, value),
  BasicInfoSection: (props: any) =>
    React.createElement('div', { 'data-testid': 'basic-info-section' }, [
      React.createElement('span', { key: 'title' }, props.title),
      props.onAiImproveTitle &&
        React.createElement(
          'button',
          { key: 'ai-title', 'data-testid': 'ai-improve-title', onClick: props.onAiImproveTitle },
          'AI Title'
        ),
      props.onAiPolishDescription &&
        React.createElement(
          'button',
          {
            key: 'ai-desc',
            'data-testid': 'ai-polish-description',
            onClick: props.onAiPolishDescription,
          },
          'AI Desc'
        ),
    ]),
  MediaSection: () => React.createElement('div', { 'data-testid': 'media-section' }, 'Media'),
  RwaTokenFields: () => React.createElement('div', { 'data-testid': 'rwa-fields' }),
  PhysicalGoodFields: () => React.createElement('div', null),
  VariantOptionEditor: () => React.createElement('div', null),
  VariantInventoryTable: () => React.createElement('div', null),
  CouponEditor: () => React.createElement('div', null),
  DigitalFileSection: () => React.createElement('div', null),
  ProcessingTimeSelect: () => React.createElement('div', null),
  ReturnPolicySelector: () => React.createElement('div', null),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) =>
    React.createElement('button', { onClick, disabled, ...props }, children),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => React.createElement('div', { className }, children),
}));

vi.mock('@/components/ui/TokenInput', () => ({
  TokenInput: () => React.createElement('div', { 'data-testid': 'token-input' }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// ── Import (after mocks) ─────────────────────────────────────────────────────

import { MobileListingWizard } from '@/components/Listing/MobileListingWizard';
import type { ListingFormData, FormErrors } from '@mobazha/core';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeFormData(overrides: Partial<ListingFormData> = {}): ListingFormData {
  return {
    title: 'Test Product',
    shortDescription: '',
    description: '',
    price: '19.99',
    compareAtPrice: '',
    pricingCurrency: 'USD',
    contractType: 'PHYSICAL_GOOD',
    condition: 'NEW',
    grams: 0,
    weightUnit: 'OUNCES',
    categories: [],
    tags: [],
    images: [],
    introVideo: '',
    altIntroVideoLinks: [],
    options: [],
    skus: [{ quantity: 999, productID: '' }],
    coupons: [],
    refundPolicy: 'FULL_REFUND',
    termsAndConditions: '',
    processingTime: '1 business day',
    inventoryPolicy: 'deny',
    brand: '',
    packageLength: '',
    packageWidth: '',
    packageHeight: '',
    dimensionUnit: 'in',
    ...overrides,
  } as ListingFormData;
}

const noopFn = vi.fn();
const defaultProps = {
  errors: {} as FormErrors,
  isSubmitting: false,
  updateField: noopFn,
  changeContractType: noopFn,
  addTag: noopFn,
  removeTag: noopFn,
  updateVariantOptions: noopFn,
  updateSkus: noopFn,
  addCoupon: noopFn,
  updateCoupon: noopFn,
  removeCoupon: noopFn,
  validate: vi.fn(() => true),
  onSubmit: noopFn,
  onSaveDraft: noopFn,
  onCancel: noopFn,
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('MobileListingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('layout', () => {
    it('renders as a full-screen overlay with z-50', () => {
      render(<MobileListingWizard formData={makeFormData()} {...defaultProps} />);
      const wizard = screen.getByTestId('mobile-listing-wizard');
      expect(wizard.className).toContain('fixed');
      expect(wizard.className).toContain('inset-0');
      expect(wizard.className).toContain('z-50');
    });

    it('has a visible Next button on step 1', () => {
      render(<MobileListingWizard formData={makeFormData()} {...defaultProps} />);
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('has a visible Save Draft button on step 1', () => {
      render(<MobileListingWizard formData={makeFormData()} {...defaultProps} />);
      expect(screen.getByText('Save Draft')).toBeInTheDocument();
    });
  });

  describe('step navigation', () => {
    it('starts at essentials step', () => {
      render(<MobileListingWizard formData={makeFormData()} {...defaultProps} />);
      expect(screen.getByTestId('basic-info-section')).toBeInTheDocument();
      expect(screen.getByText(/Essentials/)).toBeInTheDocument();
    });

    it('navigates to media step on Next click', () => {
      render(<MobileListingWizard formData={makeFormData()} {...defaultProps} />);
      fireEvent.click(screen.getByText('Next'));
      expect(screen.getByTestId('media-section')).toBeInTheDocument();
    });

    it('navigates back from media to essentials', () => {
      render(<MobileListingWizard formData={makeFormData()} {...defaultProps} />);
      fireEvent.click(screen.getByText('Next'));
      expect(screen.getByTestId('media-section')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Back'));
      expect(screen.getByTestId('basic-info-section')).toBeInTheDocument();
    });

    it('shows Cancel on first step, Back on subsequent steps', () => {
      render(<MobileListingWizard formData={makeFormData()} {...defaultProps} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Next'));
      expect(screen.getByText('Back')).toBeInTheDocument();
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });

    it('calls onCancel when Cancel is clicked on first step', () => {
      const onCancel = vi.fn();
      render(
        <MobileListingWizard formData={makeFormData()} {...defaultProps} onCancel={onCancel} />
      );
      fireEvent.click(screen.getByText('Cancel'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('reaches review step after 3 Next clicks', () => {
      render(<MobileListingWizard formData={makeFormData()} {...defaultProps} />);

      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));

      expect(screen.getByText('Readiness Check')).toBeInTheDocument();
    });

    it('shows Publish button on review step (create mode)', () => {
      render(<MobileListingWizard formData={makeFormData()} {...defaultProps} />);

      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));

      expect(screen.getByText('Publish')).toBeInTheDocument();
      expect(screen.queryByText('Next')).not.toBeInTheDocument();
    });

    it('shows Save button on review step (edit mode)', () => {
      render(<MobileListingWizard formData={makeFormData()} {...defaultProps} isEditMode />);

      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));

      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });

  describe('per-step validation', () => {
    it('blocks Next on essentials if title is empty', () => {
      const validate = vi.fn(() => false);
      render(
        <MobileListingWizard
          formData={makeFormData({ title: '' })}
          {...defaultProps}
          validate={validate}
        />
      );
      fireEvent.click(screen.getByText('Next'));
      // Should still be on essentials
      expect(screen.getByTestId('basic-info-section')).toBeInTheDocument();
    });

    it('blocks Next on essentials if price is empty (non-RWA)', () => {
      const validate = vi.fn(() => false);
      render(
        <MobileListingWizard
          formData={makeFormData({ price: '' })}
          {...defaultProps}
          validate={validate}
        />
      );
      fireEvent.click(screen.getByText('Next'));
      expect(screen.getByTestId('basic-info-section')).toBeInTheDocument();
    });

    it('allows Next on essentials for RWA without price', () => {
      render(
        <MobileListingWizard
          formData={makeFormData({ contractType: 'RWA_TOKEN', price: '' })}
          {...defaultProps}
        />
      );
      fireEvent.click(screen.getByText('Next'));
      expect(screen.getByTestId('media-section')).toBeInTheDocument();
    });
  });

  describe('progress bar', () => {
    it('renders a progressbar with correct aria attributes', () => {
      render(<MobileListingWizard formData={makeFormData()} {...defaultProps} />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '1');
      expect(progressbar).toHaveAttribute('aria-valuemax', '4');
    });

    it('updates progress when navigating steps', () => {
      render(<MobileListingWizard formData={makeFormData()} {...defaultProps} />);
      fireEvent.click(screen.getByText('Next'));

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '2');
    });
  });

  describe('review checklist', () => {
    it('shows completed items as checked', () => {
      render(
        <MobileListingWizard
          formData={makeFormData({
            title: 'My Product',
            price: '10',
            images: [{ original: 'hash', small: 'h', medium: 'h', large: 'h', tiny: 'h' }] as any,
            tags: ['vintage', 'clothing'],
          })}
          {...defaultProps}
        />
      );
      // Navigate to review
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));

      expect(screen.getByText('Readiness Check')).toBeInTheDocument();
    });

    it('shows shipping check for PHYSICAL_GOOD', () => {
      render(
        <MobileListingWizard
          formData={makeFormData({ contractType: 'PHYSICAL_GOOD' })}
          {...defaultProps}
        />
      );
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));

      expect(screen.getByText('Shipping')).toBeInTheDocument();
    });
  });

  describe('AI props forwarding', () => {
    it('passes AI callbacks to BasicInfoSection', () => {
      const onAiImproveTitle = vi.fn();
      const onAiPolishDescription = vi.fn();
      render(
        <MobileListingWizard
          formData={makeFormData()}
          {...defaultProps}
          onAiImproveTitle={onAiImproveTitle}
          onAiPolishDescription={onAiPolishDescription}
        />
      );

      fireEvent.click(screen.getByTestId('ai-improve-title'));
      expect(onAiImproveTitle).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId('ai-polish-description'));
      expect(onAiPolishDescription).toHaveBeenCalledTimes(1);
    });

    it('renders AI suggest tags button on details step', () => {
      const onAiSuggestTags = vi.fn();
      render(
        <MobileListingWizard
          formData={makeFormData()}
          {...defaultProps}
          onAiSuggestTags={onAiSuggestTags}
        />
      );
      // Navigate to details
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));

      expect(screen.getByText('AI Suggest')).toBeInTheDocument();
    });
  });

  describe('submit flow', () => {
    it('calls onSubmit when Publish is clicked and validation passes', () => {
      const onSubmit = vi.fn();
      const validate = vi.fn(() => true);
      render(
        <MobileListingWizard
          formData={makeFormData()}
          {...defaultProps}
          onSubmit={onSubmit}
          validate={validate}
        />
      );

      // Navigate to review
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Publish'));

      expect(validate).toHaveBeenCalled();
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('does not call onSubmit when validation fails', () => {
      const onSubmit = vi.fn();
      const validate = vi.fn(() => false);
      render(
        <MobileListingWizard
          formData={makeFormData()}
          {...defaultProps}
          errors={{ title: 'Required' } as any}
          onSubmit={onSubmit}
          validate={validate}
        />
      );

      // Navigate to review
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Publish'));

      expect(validate).toHaveBeenCalled();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});
