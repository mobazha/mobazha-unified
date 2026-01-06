'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Container, HStack } from '@mobazha/ui';
import { Button, Input, Avatar } from '@mobazha/ui';

export const Header: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
      <Container size="xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="font-bold text-xl text-slate-900 dark:text-white hidden sm:block">
              Mobazha
            </span>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <Input
              placeholder="Search products, stores..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              fullWidth
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              }
            />
          </div>

          {/* Navigation - Desktop */}
          <HStack gap="sm" className="hidden md:flex">
            <Link href="/market">
              <Button variant="ghost" size="sm">
                Market
              </Button>
            </Link>
            <Link href="/chat">
              <Button variant="ghost" size="sm">
                Messages
              </Button>
            </Link>
            <Link href="/wallet">
              <Button variant="ghost" size="sm">
                Wallet
              </Button>
            </Link>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2" />
            <Avatar name="Guest" size="sm" />
          </HStack>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200 dark:border-slate-800">
            <div className="mb-4">
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(e.target.value)
                }
                fullWidth
              />
            </div>
            <nav className="space-y-2">
              <Link
                href="/market"
                className="block py-2 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Market
              </Link>
              <Link
                href="/chat"
                className="block py-2 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Messages
              </Link>
              <Link
                href="/wallet"
                className="block py-2 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Wallet
              </Link>
            </nav>
          </div>
        )}
      </Container>
    </header>
  );
};
