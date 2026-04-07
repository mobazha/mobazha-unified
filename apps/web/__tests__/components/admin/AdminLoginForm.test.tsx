import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockLogin = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => React.createElement('a', { href, ...props }, children),
}));

vi.mock('@mobazha/core', () => ({
  useUserStore: () => ({
    login: mockLogin,
    isLoading: false,
    error: null,
  }),
  getEnvConfig: () => ({
    auth: { basic: { username: 'admin' } },
  }),
  useI18n: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue || key,
  }),
  isBasic: () => true,
}));

vi.mock('@/components/ui/MobazhaLogo', () => ({
  MobazhaLogo: () => React.createElement('div', { 'data-testid': 'logo' }, 'Logo'),
}));

vi.mock('@/components/LanguageSwitcher/LanguageSwitcher', () => ({
  LanguageSwitcher: () => React.createElement('div', { 'data-testid': 'lang-switcher' }, 'Lang'),
}));

vi.mock('lucide-react', () => ({
  Lock: () => React.createElement('span', null, 'LockIcon'),
  ArrowLeft: () => React.createElement('span', null, 'ArrowIcon'),
}));

import { AdminLoginForm } from '../../../src/components/admin/AdminLoginForm';

describe('AdminLoginForm', () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockRefresh.mockReset();
  });

  it('renders password input and submit button', () => {
    render(<AdminLoginForm />);

    expect(screen.getByTestId('admin-login-password')).toBeInTheDocument();
    expect(screen.getByTestId('admin-login-submit')).toBeInTheDocument();
  });

  it('renders Store Admin heading', () => {
    render(<AdminLoginForm />);
    expect(screen.getByText('Store Admin')).toBeInTheDocument();
  });

  it('renders language switcher', () => {
    render(<AdminLoginForm />);
    expect(screen.getByTestId('lang-switcher')).toBeInTheDocument();
  });

  it('renders back to store link', () => {
    render(<AdminLoginForm />);
    const backLink = screen.getByText('Back to Store');
    expect(backLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('shows validation error when password is empty', async () => {
    render(<AdminLoginForm />);

    fireEvent.click(screen.getByTestId('admin-login-submit'));

    await waitFor(() => {
      expect(screen.getByText('login.usernamePasswordRequired')).toBeInTheDocument();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls login with preset username and entered password', async () => {
    mockLogin.mockResolvedValue(true);
    render(<AdminLoginForm />);

    const passwordInput = screen.getByTestId('admin-login-password');
    fireEvent.change(passwordInput, { target: { value: 'my-secret' } });
    fireEvent.click(screen.getByTestId('admin-login-submit'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: 'admin',
        password: 'my-secret',
      });
    });
  });

  it('calls router.refresh() on successful login', async () => {
    mockLogin.mockResolvedValue(true);
    render(<AdminLoginForm />);

    const passwordInput = screen.getByTestId('admin-login-password');
    fireEvent.change(passwordInput, { target: { value: 'correct' } });
    fireEvent.click(screen.getByTestId('admin-login-submit'));

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('does not refresh when login fails', async () => {
    mockLogin.mockResolvedValue(false);
    render(<AdminLoginForm />);

    const passwordInput = screen.getByTestId('admin-login-password');
    fireEvent.change(passwordInput, { target: { value: 'wrong' } });
    fireEvent.click(screen.getByTestId('admin-login-submit'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('password input has correct attributes', () => {
    render(<AdminLoginForm />);
    const input = screen.getByTestId('admin-login-password');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('autocomplete', 'current-password');
  });
});
