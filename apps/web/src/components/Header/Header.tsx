'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container, HStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { ThemeSwitcher } from '../ThemeSwitcher';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { useI18n } from '@mobazha/core';
import { Search, ShoppingCart } from 'lucide-react';

export const Header: React.FC = () => {
  const router = useRouter();
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border">
      <Container size="xl">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
              <span className="text-primary-foreground font-bold text-lg">M</span>
            </div>
            <span className="font-bold text-xl text-foreground hidden sm:block">Mobazha</span>
          </Link>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('search.placeholder')}
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(e.target.value)
                }
                className="w-full pl-10"
              />
            </div>
          </form>

          {/* Navigation - Desktop */}
          <HStack gap="sm" className="hidden md:flex items-center">
            <Link href="/marketplace">
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {t('footer.marketplace')}
              </Button>
            </Link>
            <Link href="/chat">
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {t('nav.messages')}
              </Button>
            </Link>
            <Link href="/wallet">
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {t('nav.wallet')}
              </Button>
            </Link>
            <Link href="/cart">
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <ShoppingCart className="h-5 w-5" />
              </Button>
            </Link>
            <div className="w-px h-6 bg-border mx-2" />
            <LanguageSwitcher compact />
            <ThemeSwitcher compact />
            <Link href="/profile" className="hover:opacity-80 transition-opacity">
              <Avatar name="Guest" size="sm" />
            </Link>
          </HStack>

          {/* Mobile Actions */}
          <HStack gap="xs" className="md:hidden items-center">
            <button
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              aria-label={t('common.search')}
            >
              <Search className="h-5 w-5" />
            </button>
            <LanguageSwitcher compact />
            <ThemeSwitcher compact />
            <Link href="/cart" className="relative p-2 rounded-lg hover:bg-muted transition-colors">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                3
              </span>
            </Link>
          </HStack>
        </div>

        {/* Mobile Search Bar */}
        {isSearchOpen && (
          <div className="md:hidden py-3 border-t border-border animate-in slide-in-from-top-2 duration-200">
            <form onSubmit={handleSearch}>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('search.placeholder')}
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchQuery(e.target.value)
                  }
                  className="w-full pl-10"
                  autoFocus
                />
              </div>
            </form>
          </div>
        )}
      </Container>
    </header>
  );
};
