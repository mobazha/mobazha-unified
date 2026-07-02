// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/** Vite compatibility layer for the subset of next/font/local used by the shared frontend. */
interface LocalFontConfig {
  src?: string | string[];
  variable?: string;
  weight?: string;
  style?: string;
  display?: string;
  preload?: boolean;
  fallback?: string[];
}

interface LocalFontResult {
  className: string;
  variable: string;
  style: { fontFamily: string };
}

export default function localFont(config: LocalFontConfig = {}): LocalFontResult {
  const variable = config.variable || '--font-inter';
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty(variable, "'Inter', system-ui, sans-serif");
  }
  return {
    className: 'font-inter',
    variable,
    style: { fontFamily: "'Inter', system-ui, sans-serif" },
  };
}
