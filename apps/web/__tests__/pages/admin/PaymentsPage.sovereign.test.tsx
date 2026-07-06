import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@mobazha/core', () => ({
  useI18n: () => ({
    t: (key: string) =>
      key === 'admin.payments.unavailableTitle'
        ? 'Store payments'
        : 'Payment administration is not provided by this Sovereign distribution.',
  }),
}));

function LocationProbe() {
  return <output data-testid="location-path">{useLocation().pathname}</output>;
}

describe('Sovereign payments page', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('__COMMERCIAL_EXTENSION__', false);
  });

  it('renders a closed fallback when no commercial payment extension is composed', async () => {
    const Page = (await import('../../../src/app/admin/payments/page_sovereign')).default;

    render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>
    );

    expect(screen.getByTestId('sovereign-payments-unavailable')).toBeInTheDocument();
    expect(screen.getByText(/not provided by this Sovereign distribution/i)).toBeInTheDocument();
  });

  it('redirects to the composed XMR finance page when the extension is present', async () => {
    vi.stubGlobal('__COMMERCIAL_EXTENSION__', true);
    const Page = (await import('../../../src/app/admin/payments/page_sovereign')).default;

    render(
      <MemoryRouter initialEntries={['/admin/payments']}>
        <Page />
        <LocationProbe />
      </MemoryRouter>
    );

    expect(screen.queryByTestId('sovereign-payments-unavailable')).not.toBeInTheDocument();
    expect(screen.getByTestId('location-path')).toHaveTextContent('/admin/finance');
  });
});
