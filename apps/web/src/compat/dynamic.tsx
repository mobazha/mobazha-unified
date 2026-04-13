import React, { lazy, Suspense, type ComponentType } from 'react';

type DynamicOptions = {
  ssr?: boolean;
  loading?: () => React.ReactElement | null;
};

/**
 * Vite-compatible shim for next/dynamic.
 * Wraps React.lazy with optional Suspense fallback.
 */
export default function dynamic<P = Record<string, unknown>>(
  loader: () => Promise<{ default: ComponentType<P> } | ComponentType<P>>,
  opts?: DynamicOptions
): ComponentType<P> {
  const LazyComponent = lazy(async () => {
    const mod = await loader();
    if ('default' in mod) return mod as { default: ComponentType<P> };
    return { default: mod as ComponentType<P> };
  });

  const fallback = opts?.loading ? opts.loading() : null;

  const DynamicWrapper = (props: P) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...(props as React.JSX.IntrinsicAttributes & P)} />
    </Suspense>
  );

  DynamicWrapper.displayName = 'Dynamic';
  return DynamicWrapper;
}
