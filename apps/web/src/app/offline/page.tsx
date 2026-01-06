'use client';

import React from 'react';
import Link from 'next/link';
import { Container, VStack } from '@mobazha/ui';
import { Button } from '@mobazha/ui';

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
      <Container size="sm">
        <VStack gap="lg" align="center" className="text-center py-12">
          {/* Offline Icon */}
          <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a5 5 0 01-2.829-2.829m0 0L3 18m6.364-3.536L3 3m12.728 12.728L21 21"
              />
            </svg>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              You&apos;re Offline
            </h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-md">
              It looks like you&apos;ve lost your internet connection. Some features may not be
              available until you&apos;re back online.
            </p>
          </div>

          {/* Actions */}
          <VStack gap="sm" className="w-full max-w-xs">
            <Button onClick={handleRetry} fullWidth size="lg">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Try Again
            </Button>
            <Link href="/" className="w-full">
              <Button variant="outline" fullWidth>
                Go to Home
              </Button>
            </Link>
          </VStack>

          {/* Offline Features */}
          <div className="mt-8 p-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm w-full max-w-md">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
              Available Offline:
            </h3>
            <ul className="space-y-3 text-left">
              <li className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                View cached products
              </li>
              <li className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Browse your order history
              </li>
              <li className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Read previous messages
              </li>
              <li className="flex items-center gap-3 text-slate-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="line-through">Make purchases</span>
              </li>
            </ul>
          </div>
        </VStack>
      </Container>
    </div>
  );
}
