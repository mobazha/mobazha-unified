import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  {
    ignores: ['**/node_modules/', '**/dist/', '**/.next/', '**/coverage/', '**/playwright-report/'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      '@typescript-eslint': typescript,
      react: react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        // DOM types
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLImageElement: 'readonly',
        HTMLAnchorElement: 'readonly',
        HTMLFormElement: 'readonly',
        HTMLSelectElement: 'readonly',
        HTMLSpanElement: 'readonly',
        Element: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        FocusEvent: 'readonly',
        MediaQueryListEvent: 'readonly',
        IntersectionObserver: 'readonly',
        IntersectionObserverEntry: 'readonly',
        ResizeObserver: 'readonly',
        MutationObserver: 'readonly',
        // Performance API
        performance: 'readonly',
        PerformanceObserver: 'readonly',
        PerformanceEntry: 'readonly',
        PerformanceEventTiming: 'readonly',
        PerformanceNavigationTiming: 'readonly',
        PerformanceResourceTiming: 'readonly',
        // Web APIs
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        DOMException: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        Image: 'readonly',
        Window: 'readonly',
        RequestInit: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        // Encoding
        btoa: 'readonly',
        atob: 'readonly',
        // Built-in types
        Promise: 'readonly',
        Map: 'readonly',
        Set: 'readonly',
        WeakMap: 'readonly',
        WeakSet: 'readonly',
        Symbol: 'readonly',
        Proxy: 'readonly',
        Reflect: 'readonly',
        Array: 'readonly',
        Object: 'readonly',
        Number: 'readonly',
        String: 'readonly',
        Boolean: 'readonly',
        Error: 'readonly',
        TypeError: 'readonly',
        JSON: 'readonly',
        Math: 'readonly',
        Date: 'readonly',
        RegExp: 'readonly',
        parseInt: 'readonly',
        parseFloat: 'readonly',
        isNaN: 'readonly',
        isFinite: 'readonly',
        encodeURIComponent: 'readonly',
        decodeURIComponent: 'readonly',
        // Node globals
        process: 'readonly',
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        exports: 'readonly',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // TypeScript
      ...typescript.configs.recommended.rules,
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      // React
      ...react.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',

      // React Hooks
      ...reactHooks.configs.recommended.rules,

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    files: ['apps/extension/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        chrome: 'readonly',
        crypto: 'readonly',
      },
    },
  },
  prettier,
];

