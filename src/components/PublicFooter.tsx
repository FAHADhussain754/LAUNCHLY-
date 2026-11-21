import { Sun, Moon, Mail, MessageSquare } from 'lucide-react';
import type { PublicPage } from '../types';

interface PublicFooterProps {
  onNavigate: (page: PublicPage) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function PublicFooter({ onNavigate, theme, onToggleTheme }: PublicFooterProps) {
  const go = (page: PublicPage) => {
    onNavigate(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-[#E6EBE8] dark:border-[#1E2D36] bg-white dark:bg-[#101C24] text-[#17212B] dark:text-[#F0F5F2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-md bg-[#101C24] dark:bg-[#153C32] flex items-center justify-center border border-[#153C32] dark:border-[#43D9A3]/40">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#43D9A3]" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M5 17L12 4l7 13H5z" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="font-display text-lg font-bold tracking-tight">LAUNCHLY</span>
            </div>
            <p className="text-sm text-[#667085] dark:text-[#94A3AF] leading-relaxed">
              Your Business. One Platform. AI guidance, researched product catalogs, vetted supplier workflows, store connections, and human specialists in one workspace.
            </p>
            <button
              type="button"
              onClick={onToggleTheme}
              className="inline-flex items-center gap-2 px-3 py-2 min-h-[40px] rounded-lg border border-[#E6EBE8] dark:border-[#1E2D36] text-xs font-medium text-[#17212B] dark:text-[#F0F5F2] hover:bg-[#F7F9F8] dark:hover:bg-[#153C32]/30 transition-colors"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              <span>{theme === 'light' ? 'Switch to Dark Theme' : 'Switch to Light Theme'}</span>
            </button>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4">Platform</h3>
            <ul className="space-y-2.5 text-sm text-[#667085] dark:text-[#94A3AF]">
              <li><button type="button" onClick={() => go('how-it-works')} className="hover:text-[#101C24] dark:hover:text-white">How It Works</button></li>
              <li><button type="button" onClick={() => go('features')} className="hover:text-[#101C24] dark:hover:text-white">Features</button></li>
              <li><button type="button" onClick={() => go('business-models')} className="hover:text-[#101C24] dark:hover:text-white">Business Models</button></li>
              <li><button type="button" onClick={() => go('pricing')} className="hover:text-[#101C24] dark:hover:text-white">Pricing</button></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4">Company & Legal</h3>
            <ul className="space-y-2.5 text-sm text-[#667085] dark:text-[#94A3AF]">
              <li><button type="button" onClick={() => go('about')} className="hover:text-[#101C24] dark:hover:text-white">About LAUNCHLY</button></li>
              <li><button type="button" onClick={() => go('faq')} className="hover:text-[#101C24] dark:hover:text-white">FAQ</button></li>
              <li><button type="button" onClick={() => go('privacy')} className="hover:text-[#101C24] dark:hover:text-white">Privacy Policy</button></li>
              <li><button type="button" onClick={() => go('terms')} className="hover:text-[#101C24] dark:hover:text-white">Terms of Service</button></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4">Direct Contact</h3>
            <div className="space-y-3 text-sm text-[#667085] dark:text-[#94A3AF]">
              <a href="mailto:fahadeasybuy27264@gmail.com" className="flex items-center gap-2 hover:text-[#101C24] dark:hover:text-white break-all">
                <Mail className="w-4 h-4 shrink-0 text-[#153C32] dark:text-[#43D9A3]" />
                <span>fahadeasybuy27264@gmail.com</span>
              </a>
              <a href="mailto:khanbaba2772722772@gmail.com" className="flex items-center gap-2 hover:text-[#101C24] dark:hover:text-white break-all">
                <Mail className="w-4 h-4 shrink-0 text-[#153C32] dark:text-[#43D9A3]" />
                <span>khanbaba2772722772@gmail.com</span>
              </a>
              <a
                href="https://wa.me/923168687610"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-lg bg-[#153C32] text-white text-xs font-semibold hover:bg-[#101C24] transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-[#43D9A3]" />
                <span>WhatsApp Support (+92 316 8687610)</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#E6EBE8] dark:border-[#1E2D36] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#667085] dark:text-[#94A3AF]">
          <p>© {new Date().getFullYear()} LAUNCHLY. All rights reserved.</p>
          <p>Built with transparent supplier, store, and AI usage standards.</p>
        </div>
      </div>
    </footer>
  );
}
