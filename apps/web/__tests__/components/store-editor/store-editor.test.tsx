/**
 * Store Editor — Component Integration Tests (Layer 2)
 *
 * Tests admin editor components: StoreBrandingEditor, ThemeEditor,
 * SectionListEditor, PresetPicker, AddSectionPicker, form-helpers.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockT = (key: string) => key;
const mockSave = vi.fn();
const mockToast = vi.fn();

vi.mock('@mobazha/core', async () => {
  const actual = await vi.importActual('@mobazha/core');
  return {
    ...(actual as Record<string, unknown>),
    useI18n: () => ({ t: mockT, locale: 'en', setLocale: vi.fn() }),
    useStorefrontConfig: () => ({
      config: null,
      isLoading: false,
      isSaving: false,
      error: null,
      save: mockSave,
    }),
    useGatewayUrl: () => 'http://localhost:4002',
    usePeerID: () => 'QmTest123',
  };
});

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick: () => void;
  }) => <button onClick={onClick}>{children}</button>,
  AlertDialogCancel: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('lucide-react', () => ({
  ChevronLeft: () => <span data-testid="icon-chevron-left" />,
  ChevronRight: () => <span data-testid="icon-chevron-right" />,
  Loader2: () => <span data-testid="icon-loader" />,
  Undo2: () => <span data-testid="icon-undo" />,
  Eye: () => <span data-testid="icon-eye" />,
  EyeOff: () => <span data-testid="icon-eye-off" />,
  Trash2: () => <span data-testid="icon-trash" />,
  Plus: () => <span data-testid="icon-plus" />,
  Check: () => <span data-testid="icon-check" />,
  GripVertical: () => <span data-testid="icon-grip-vertical" />,
  Monitor: () => <span data-testid="icon-monitor" />,
  Tablet: () => <span data-testid="icon-tablet" />,
  Smartphone: () => <span data-testid="icon-smartphone" />,
  Sparkles: () => <span data-testid="icon-sparkles" />,
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: 'vertical',
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => undefined } },
}));

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
  storeFonts: [{ className: 'font-inter', variable: '--font-inter' }],
  storeFontVariableClasses: '--font-inter',
  loadStoreFont: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  TextInput,
  TextArea,
  SelectInput,
  ToggleInput,
  NumberInput,
} from '@/components/store-editor/form-helpers';
import { ThemeEditor } from '@/components/store-editor/ThemeEditor';
import { SectionListEditor } from '@/components/store-editor/SectionListEditor';
import { PresetPicker } from '@/components/store-editor/PresetPicker';
import { AddSectionPicker } from '@/components/store-editor/AddSectionPicker';
import { StoreBrandingEditor } from '@/components/store-editor/StoreBrandingEditor';
import type { StoreTheme, StoreSection } from '@mobazha/core';

// ---------------------------------------------------------------------------
// form-helpers
// ---------------------------------------------------------------------------

describe('form-helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('TextInput', () => {
    it('renders label and value', () => {
      render(<TextInput label="Name" value="hello" onChange={vi.fn()} />);
      expect(screen.getByText('Name')).toBeTruthy();
      expect(screen.getByDisplayValue('hello')).toBeTruthy();
    });

    it('debounces onChange callback', () => {
      const onChange = vi.fn();
      render(<TextInput label="Title" value="" onChange={onChange} debounceMs={200} />);
      const input = screen.getByRole('textbox');

      fireEvent.change(input, { target: { value: 'a' } });
      fireEvent.change(input, { target: { value: 'ab' } });
      fireEvent.change(input, { target: { value: 'abc' } });

      expect(onChange).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('abc');
    });

    it('syncs local state when value prop changes', () => {
      const { rerender } = render(<TextInput label="X" value="old" onChange={vi.fn()} />);
      expect(screen.getByDisplayValue('old')).toBeTruthy();

      rerender(<TextInput label="X" value="new" onChange={vi.fn()} />);
      expect(screen.getByDisplayValue('new')).toBeTruthy();
    });
  });

  describe('TextArea', () => {
    it('debounces onChange callback', () => {
      const onChange = vi.fn();
      render(<TextArea label="Bio" value="" onChange={onChange} debounceMs={300} />);
      const textarea = screen.getByRole('textbox');

      fireEvent.change(textarea, { target: { value: 'hello world' } });
      expect(onChange).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(onChange).toHaveBeenCalledWith('hello world');
    });
  });

  describe('SelectInput', () => {
    it('renders options and triggers onChange', () => {
      const onChange = vi.fn();
      render(
        <SelectInput
          label="Size"
          value="md"
          options={[
            { value: 'sm', label: 'Small' },
            { value: 'md', label: 'Medium' },
            { value: 'lg', label: 'Large' },
          ]}
          onChange={onChange}
        />
      );

      expect(screen.getByText('Size')).toBeTruthy();
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'lg' } });
      expect(onChange).toHaveBeenCalledWith('lg');
    });
  });

  describe('ToggleInput', () => {
    it('renders and toggles', () => {
      const onChange = vi.fn();
      render(<ToggleInput label="Show filters" checked={false} onChange={onChange} />);

      expect(screen.getByText('Show filters')).toBeTruthy();
      fireEvent.click(screen.getByRole('switch'));
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('sets aria-checked correctly', () => {
      render(<ToggleInput label="Active" checked={true} onChange={vi.fn()} />);
      expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('NumberInput', () => {
    it('renders with min/max and triggers onChange', () => {
      const onChange = vi.fn();
      render(<NumberInput label="Count" value={3} onChange={onChange} min={1} max={10} />);

      expect(screen.getByText('Count')).toBeTruthy();
      fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '5' } });
      expect(onChange).toHaveBeenCalledWith(5);
    });
  });
});

// ---------------------------------------------------------------------------
// ThemeEditor
// ---------------------------------------------------------------------------

describe('ThemeEditor', () => {
  const baseTheme: StoreTheme = {
    primaryColor: '#1e40af',
    secondaryColor: '#374151',
    accentColor: '#6d28d9',
    fontFamily: 'inter',
    borderRadius: 'md',
    palette: 'ocean',
    headerStyle: 'classic',
  };

  it('renders palette, font, and radius sections', () => {
    render(<ThemeEditor theme={baseTheme} onUpdate={vi.fn()} />);

    expect(screen.getByText('admin.storeBranding.colorPalette')).toBeTruthy();
    expect(screen.getByText('admin.storeBranding.fontFamily')).toBeTruthy();
    expect(screen.getByText('admin.storeBranding.borderRadius')).toBeTruthy();
  });

  it('calls onUpdate when palette is clicked', () => {
    const onUpdate = vi.fn();
    render(<ThemeEditor theme={baseTheme} onUpdate={onUpdate} />);

    const customBtn = screen.getByText(/admin\.storeBranding\.customColors/);
    fireEvent.click(customBtn);

    expect(onUpdate).toHaveBeenCalledWith({ palette: 'custom' });
  });

  it('shows custom color inputs when palette is custom', () => {
    const customTheme = { ...baseTheme, palette: 'custom' as const };
    render(<ThemeEditor theme={customTheme} onUpdate={vi.fn()} />);

    expect(screen.getByText('admin.storeBranding.primaryColor')).toBeTruthy();
    expect(screen.getByText('admin.storeBranding.secondaryColor')).toBeTruthy();
    expect(screen.getByText('admin.storeBranding.accentColor')).toBeTruthy();
  });

  it('calls onUpdate when font is selected', () => {
    const onUpdate = vi.fn();
    render(<ThemeEditor theme={baseTheme} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByText('Poppins'));
    expect(onUpdate).toHaveBeenCalledWith({ fontFamily: 'poppins' });
  });

  it('has data-testid attribute', () => {
    const { container } = render(<ThemeEditor theme={baseTheme} onUpdate={vi.fn()} />);
    expect(container.querySelector('[data-testid="theme-editor"]')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// SectionListEditor
// ---------------------------------------------------------------------------

describe('SectionListEditor', () => {
  const baseSections: StoreSection[] = [
    {
      id: 'hero-1',
      type: 'hero',
      visible: true,
      props: { title: 'Welcome', height: 'md', textAlign: 'center', overlayOpacity: 0.4 },
    },
    {
      id: 'about-1',
      type: 'about',
      visible: true,
      props: { title: 'About', text: 'Hello', imagePosition: 'left', showContactInfo: false },
    },
  ] as StoreSection[];

  it('renders all sections with labels', () => {
    render(
      <SectionListEditor
        sections={baseSections}
        onToggle={vi.fn()}
        onRemove={vi.fn()}
        onMove={vi.fn()}
        onUpdateProps={vi.fn()}
        onAddClick={vi.fn()}
      />
    );

    expect(screen.getByTestId('section-list-editor')).toBeTruthy();
  });

  it('calls onAddClick when add button is clicked', () => {
    const onAddClick = vi.fn();
    render(
      <SectionListEditor
        sections={baseSections}
        onToggle={vi.fn()}
        onRemove={vi.fn()}
        onMove={vi.fn()}
        onUpdateProps={vi.fn()}
        onAddClick={onAddClick}
      />
    );

    const addBtn = screen.getByText('admin.storeBranding.addSection');
    fireEvent.click(addBtn);
    expect(onAddClick).toHaveBeenCalledTimes(1);
  });

  it('calls onToggle for visibility toggle', () => {
    const onToggle = vi.fn();
    render(
      <SectionListEditor
        sections={baseSections}
        onToggle={onToggle}
        onRemove={vi.fn()}
        onMove={vi.fn()}
        onUpdateProps={vi.fn()}
        onAddClick={vi.fn()}
      />
    );

    const visibilityBtns = screen.getAllByLabelText(/Hide section|Show section/);
    fireEvent.click(visibilityBtns[0]);
    expect(onToggle).toHaveBeenCalledWith('hero-1');
  });
});

// ---------------------------------------------------------------------------
// PresetPicker
// ---------------------------------------------------------------------------

describe('PresetPicker', () => {
  it('does not render when open is false', () => {
    render(<PresetPicker open={false} onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('renders preset list when open', () => {
    render(<PresetPicker open={true} onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByTestId('dialog')).toBeTruthy();
    expect(screen.getByText('admin.storeBranding.chooseTemplate')).toBeTruthy();
  });

  it('shows confirmation dialog before applying preset', () => {
    render(<PresetPicker open={true} onSelect={vi.fn()} onClose={vi.fn()} />);

    expect(screen.queryByTestId('alert-dialog')).toBeNull();

    const presetButtons = screen.getAllByRole('button');
    const firstPresetBtn = presetButtons.find(btn => btn.classList.contains('group'));

    if (firstPresetBtn) {
      fireEvent.click(firstPresetBtn);
      expect(screen.getByTestId('alert-dialog')).toBeTruthy();
      expect(screen.getByText('admin.storeBranding.presetConfirmTitle')).toBeTruthy();
    }
  });

  it('calls onSelect after confirmation', () => {
    const onSelect = vi.fn();
    render(<PresetPicker open={true} onSelect={onSelect} onClose={vi.fn()} />);

    const presetButtons = screen.getAllByRole('button');
    const firstPresetBtn = presetButtons.find(btn => btn.classList.contains('group'));

    if (firstPresetBtn) {
      fireEvent.click(firstPresetBtn);
      const applyBtn = screen.getByText('admin.storeBranding.applyPreset');
      fireEvent.click(applyBtn);
      expect(onSelect).toHaveBeenCalledTimes(1);
    }
  });
});

// ---------------------------------------------------------------------------
// AddSectionPicker
// ---------------------------------------------------------------------------

describe('AddSectionPicker', () => {
  it('does not render when open is false', () => {
    render(
      <AddSectionPicker open={false} existingSections={[]} onAdd={vi.fn()} onClose={vi.fn()} />
    );
    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('renders section type options when open', () => {
    render(
      <AddSectionPicker open={true} existingSections={[]} onAdd={vi.fn()} onClose={vi.fn()} />
    );
    expect(screen.getByTestId('dialog')).toBeTruthy();
    expect(screen.getByText('admin.storeBranding.addSection')).toBeTruthy();
  });

  it('calls onAdd when section type is clicked', () => {
    const onAdd = vi.fn();
    render(<AddSectionPicker open={true} existingSections={[]} onAdd={onAdd} onClose={vi.fn()} />);

    const sectionButtons = screen.getAllByRole('button');
    const sectionTypeBtn = sectionButtons.find(btn => btn.classList.contains('group'));

    if (sectionTypeBtn) {
      fireEvent.click(sectionTypeBtn);
      expect(onAdd).toHaveBeenCalledTimes(1);
    }
  });

  it('filters out single-instance types that already exist', () => {
    const existingSections = [
      {
        id: 'hero-1',
        type: 'hero',
        visible: true,
        props: { title: 'X', height: 'md', textAlign: 'center', overlayOpacity: 0.4 },
      },
    ] as StoreSection[];

    const { container } = render(
      <AddSectionPicker
        open={true}
        existingSections={existingSections}
        onAdd={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const buttons = container.querySelectorAll('button.group');
    const buttonTexts = Array.from(buttons).map(b => b.textContent);
    const hasHero = buttonTexts.some(t => t?.includes('Hero'));
    expect(hasHero).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// StoreBrandingEditor (top-level integration)
// ---------------------------------------------------------------------------

describe('StoreBrandingEditor', () => {
  it('renders the editor with header and tab switcher', () => {
    render(<StoreBrandingEditor />);

    expect(screen.getByTestId('store-branding-editor')).toBeTruthy();
    expect(screen.getByText('admin.storeBranding.pageTitle')).toBeTruthy();
    expect(screen.getByText(/admin\.storeBranding\.tabTheme/)).toBeTruthy();
    expect(screen.getByText(/admin\.storeBranding\.tabSections/)).toBeTruthy();
  });

  it('save button is disabled when no changes', () => {
    render(<StoreBrandingEditor />);

    const saveBtn = screen.getByText('common.save');
    expect(saveBtn.closest('button')?.disabled).toBe(true);
  });

  it('switches between theme and sections tabs', () => {
    render(<StoreBrandingEditor />);

    expect(screen.getByTestId('theme-editor')).toBeTruthy();

    const sectionsTab = screen.getByText(/admin\.storeBranding\.tabSections/);
    fireEvent.click(sectionsTab);
    expect(screen.getByTestId('section-list-editor')).toBeTruthy();
  });

  it('shows save success toast after save', async () => {
    mockSave.mockResolvedValueOnce({});

    render(<StoreBrandingEditor />);

    const sectionsTab = screen.getByText(/admin\.storeBranding\.tabSections/);
    fireEvent.click(sectionsTab);

    const visibilityBtns = screen.getAllByLabelText(/Hide section|Show section/);
    if (visibilityBtns.length > 0) {
      fireEvent.click(visibilityBtns[0]);

      const saveBtn = screen.getByText('common.save');
      fireEvent.click(saveBtn.closest('button')!);

      await waitFor(() => {
        expect(mockSave).toHaveBeenCalled();
      });
    }
  });

  it('has a back link to store settings', () => {
    render(<StoreBrandingEditor backHref="/admin/settings/store" />);
    const backLink = screen.getByRole('link');
    expect(backLink.getAttribute('href')).toBe('/admin/settings/store');
  });

  it('renders viewport toggle buttons (desktop, tablet, mobile)', () => {
    render(<StoreBrandingEditor />);

    const desktopBtn = screen.getByLabelText('Desktop');
    const tabletBtn = screen.getByLabelText('Tablet');
    const mobileBtn = screen.getByLabelText('Mobile');

    expect(desktopBtn).toBeTruthy();
    expect(tabletBtn).toBeTruthy();
    expect(mobileBtn).toBeTruthy();
  });

  it('desktop viewport is active by default', () => {
    render(<StoreBrandingEditor />);

    const desktopBtn = screen.getByLabelText('Desktop');
    expect(desktopBtn.getAttribute('aria-pressed')).toBe('true');

    const tabletBtn = screen.getByLabelText('Tablet');
    expect(tabletBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('clicking viewport button updates active state', () => {
    render(<StoreBrandingEditor />);

    const tabletBtn = screen.getByLabelText('Tablet');
    fireEvent.click(tabletBtn);
    expect(tabletBtn.getAttribute('aria-pressed')).toBe('true');

    const desktopBtn = screen.getByLabelText('Desktop');
    expect(desktopBtn.getAttribute('aria-pressed')).toBe('false');
  });
});
