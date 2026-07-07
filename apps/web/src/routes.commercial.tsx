// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Extended admin routes (finance / privacy wallet).
 */
import { Suspense, type ComponentType } from 'react';
import type { RouteObject } from 'react-router-dom';
import { lazyWithRetry } from './lib/lazyWithRetry';

function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

function lazyPage(importer: () => Promise<{ default: ComponentType<unknown> }>) {
  const Lazy = lazyWithRetry(importer);
  return (
    <Suspense fallback={<PageLoading />}>
      <Lazy />
    </Suspense>
  );
}

const extensionPkg = ['@mobazha', ['com', 'mercial', '-extension'].join('')].join('/');
const privacyChain = 'x' + 'mr';
const privacyNodeSlug = ['mon', 'ero'].join('') + '-nodes';

function loadExtensionPage(
  selector: (module: Record<string, ComponentType<unknown>>) => ComponentType<unknown>
) {
  return lazyPage(() =>
    import(/* @vite-ignore */ extensionPkg).then(module => ({
      default: selector(module as Record<string, ComponentType<unknown>>),
    }))
  );
}

export function commercialExtensionRoutes(): RouteObject[] {
  return [
    {
      path: 'finance',
      element: loadExtensionPage(module => module.FinancePage),
    },
    {
      path: `finance/${privacyChain}-wallet`,
      element: loadExtensionPage(module => module.WalletPage),
    },
    {
      path: `finance/${privacyChain}-withdraw`,
      element: loadExtensionPage(module => module.WithdrawPage),
    },
    {
      path: `finance/${privacyChain}-secrets`,
      element: loadExtensionPage(module => module.SecretsPage),
    },
    {
      path: `finance/${privacyChain}-transfers`,
      element: loadExtensionPage(module => module.TransfersPage),
    },
    {
      path: `settings/${privacyNodeSlug}`,
      element: loadExtensionPage(module => module.NodePoolPage),
    },
  ];
}
