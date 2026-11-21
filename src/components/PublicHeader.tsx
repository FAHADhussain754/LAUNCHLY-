import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import type { PublicPage } from '../types';

interface PublicHeaderProps {
  currentPage: PublicPage;
  onNavigate: (page: PublicPage) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export function PublicHeader({ currentPage, onNavigate, onOpenAuth }: PublicHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: Array<{ page: PublicPage; label: string }> = [
    { page: 'how-it-works', label: 'How It Works' },
    { page: 'features', label: 'Features' },
    { page: 'pricing', label: 'Pricing' },
    { page: 'contact', label: 'Contact' },
  ];

  const handleNav = (page: PublicPage) => {
    onNavigate(page);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8]/95 dark:bg-[#0B1318]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand wordmark */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#43D9A3] rounded-md"
        >
          <span className="w-7 h-7 rounded-md bg-[#101C24] dark:bg-[#153C32] flex items-center justify-center border border-[#153C32] dark:border-[#43D9A3]/40">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#43D9A3]" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M5 17L12 4l7 13H5z" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-[#101C24] dark:text-[#F0F5F2]">
            LAUNCHLY
          </span>
        </button>

        {/* Zone 2: Concise single-line nav links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#667085] dark:text-[#94A3AF]">
          {navItems.map((item) => (
            <button
              key={item.page}
              type="button"
              onClick={() => handleNav(item.page)}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#101C24] dark:hover:text-[#F0F5F2] ${
                currentPage === item.page
                  ? 'text-[#101C24] dark:text-[#F0F5F2] underline underline-offset-8 decoration-[#43D9A3] decoration-2'
                  : ''
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onOpenAuth('login')}
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#101C24] dark:hover:text-[#F0F5F2]"
          >
            Sign In
          </button>
        </nav>

        {/* Zone 3: Single primary CTA + mobile drawer toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onOpenAuth('register')}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 min-h-[40px] text-sm font-semibold rounded-lg bg-[#101C24] text-white hover:bg-[#153C32] dark:bg-[#43D9A3] dark:text-[#101C24] dark:hover:bg-[#36c490] transition-colors whitespace-nowrap shrink-0"
          >
            Start Your Business
          </button>

          <button
            type="button"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-[#E6EBE8] dark:border-[#1E2D36] text-[#17212B] dark:text-[#F0F5F2]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[#E6EBE8] dark:border-[#1E2D36] bg-white dark:bg-[#101C24] px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.page}
              type="button"
              onClick={() => handleNav(item.page)}
              className={`w-full text-left px-3 min-h-[44px] rounded-lg text-sm font-medium flex items-center ${
                currentPage === item.page
                  ? 'bg-[#F7F9F8] dark:bg-[#153C32]/40 text-[#101C24] dark:text-[#43D9A3]'
                  : 'text-[#17212B] dark:text-[#F0F5F2]'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              handleNav('business-models');
            }}
            className="w-full text-left px-3 min-h-[44px] rounded-lg text-sm font-medium text-[#17212B] dark:text-[#F0F5F2] flex items-center"
          >
            Business Models
          </button>
          <div className="pt-3 border-t border-[#E6EBE8] dark:border-[#1E2D36] flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOpenAuth('login');
              }}
              className="w-full min-h-[44px] rounded-lg border border-[#E6EBE8] dark:border-[#1E2D36] text-sm font-medium text-[#17212B] dark:text-[#F0F5F2]"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOpenAuth('register');
              }}
              className="w-full min-h-[44px] rounded-lg bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] text-sm font-semibold"
            >
              Start Your Business
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
