import { useState, useEffect } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Mail,
  MessageSquare,
  ShieldCheck,
  Store,
  Sparkles,
  Package,
  Truck,
  Users,
  BarChart3,
  Megaphone,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import type { PlansConfig, PublicPage } from '../types';

interface PublicPagesProps {
  page: PublicPage;
  onNavigate: (page: PublicPage) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

const FAQ_ITEMS = [
  {
    q: 'Do I need prior e-commerce experience to use LAUNCHLY?',
    a: 'No. Your workspace starts with a step-by-step onboarding guide that turns your budget, target country, and weekly availability into an actionable launch checklist.',
  },
  {
    q: 'Does LAUNCHLY guarantee store sales or profits?',
    a: 'No. LAUNCHLY provides unit-economics calculators, AI research assistance, and transparent supplier verification so you can validate assumptions before spending capital. We never guarantee sales or profits.',
  },
  {
    q: 'Which business models are supported?',
    a: 'You can build around Dropshipping, Print on Demand, Private Label, or General E-commerce—and adjust your model as your business matures.',
  },
  {
    q: 'How does Shopify integration handle store security?',
    a: 'LAUNCHLY never requests your Shopify password. Store connections use official OAuth authorization and require your explicit confirmation before syncing or modifying product listings.',
  },
  {
    q: 'Are suppliers vetted before appearing in the Supplier Center?',
    a: 'Every supplier entry explicitly displays its status: Verified, Manually Reviewed, or Unverified. We never label an unverified directory lead as verified.',
  },
];

export function PublicPages({ page, onNavigate, onOpenAuth }: PublicPagesProps) {
  const [plans, setPlans] = useState<PlansConfig | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Contact / Support form state
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactStatus, setContactStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [contactError, setContactError] = useState('');

  useEffect(() => {
    apiRequest<{ plans: PlansConfig }>('/api/public/plans')
      .then((res) => setPlans(res.plans))
      .catch(() => {});
  }, []);

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactStatus('submitting');
    setContactError('');
    try {
      await apiRequest('/api/support/tickets', {
        method: 'POST',
        body: { email: contactEmail, subject: contactSubject, message: contactMessage },
      });
      setContactStatus('sent');
      setContactEmail('');
      setContactSubject('');
      setContactMessage('');
    } catch (err) {
      setContactStatus('error');
      setContactError(err instanceof Error ? err.message : 'Unable to send message.');
    }
  };

  if (page === 'contact') {
    return (
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="max-w-2xl mb-12">
          <p className="text-sm font-medium text-[#153C32] dark:text-[#43D9A3] mb-2">Customer Support & Direct Contact</p>
          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-[#101C24] dark:text-[#F0F5F2] text-balance">
            Talk directly with the LAUNCHLY team.
          </h1>
          <p className="mt-4 text-base text-[#667085] dark:text-[#94A3AF] leading-relaxed">
            Reach us via email, WhatsApp, or submit a tracked support ticket below. Private email inboxes are never exposed on the platform.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-6 bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-6 sm:p-8">
            <h2 className="font-display text-xl font-semibold text-[#101C24] dark:text-[#F0F5F2]">Official Contact Channels</h2>
            <div className="space-y-4 text-sm">
              <div className="pb-4 border-b border-[#E6EBE8] dark:border-[#1E2D36]">
                <div className="text-xs text-[#667085] dark:text-[#94A3AF] mb-1">Primary Email</div>
                <a href="mailto:fahadeasybuy27264@gmail.com" className="inline-flex items-center gap-2 font-medium text-[#101C24] dark:text-[#F0F5F2] hover:text-[#153C32] dark:hover:text-[#43D9A3] break-all">
                  <Mail className="w-4 h-4 shrink-0 text-[#43D9A3]" />
                  <span>fahadeasybuy27264@gmail.com</span>
                </a>
              </div>
              <div className="pb-4 border-b border-[#E6EBE8] dark:border-[#1E2D36]">
                <div className="text-xs text-[#667085] dark:text-[#94A3AF] mb-1">Secondary Contact Email</div>
                <a href="mailto:khanbaba2772722772@gmail.com" className="inline-flex items-center gap-2 font-medium text-[#101C24] dark:text-[#F0F5F2] hover:text-[#153C32] dark:hover:text-[#43D9A3] break-all">
                  <Mail className="w-4 h-4 shrink-0 text-[#43D9A3]" />
                  <span>khanbaba2772722772@gmail.com</span>
                </a>
              </div>
              <div>
                <div className="text-xs text-[#667085] dark:text-[#94A3AF] mb-2">WhatsApp Direct Line</div>
                <a
                  href="https://wa.me/923168687610"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#153C32] text-white font-semibold hover:bg-[#101C24] transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-[#43D9A3]" />
                  <span>Message on WhatsApp (+92 316 8687610)</span>
                </a>
              </div>
            </div>
            <p className="text-xs text-[#667085] dark:text-[#94A3AF] leading-relaxed">
              Gmail inbox integration is disabled by default and requires explicit Google OAuth authorization from the account owner before any inbox access is enabled.
            </p>
          </div>

          <form
            onSubmit={handleSupportSubmit}
            className="lg:col-span-7 bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-6 sm:p-8 space-y-5"
          >
            <h2 className="font-display text-xl font-semibold text-[#101C24] dark:text-[#F0F5F2]">Submit a Support Request</h2>
            <div>
              <label htmlFor="support-email" className="block text-sm font-medium mb-1.5">Your Email Address</label>
              <input
                id="support-email"
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm focus:outline-none focus:ring-2 focus:ring-[#43D9A3]"
              />
            </div>
            <div>
              <label htmlFor="support-subject" className="block text-sm font-medium mb-1.5">Subject</label>
              <input
                id="support-subject"
                type="text"
                required
                value={contactSubject}
                onChange={(e) => setContactSubject(e.target.value)}
                placeholder="Onboarding, Shopify integration, or billing question"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm focus:outline-none focus:ring-2 focus:ring-[#43D9A3]"
              />
            </div>
            <div>
              <label htmlFor="support-msg" className="block text-sm font-medium mb-1.5">Message</label>
              <textarea
                id="support-msg"
                rows={4}
                required
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Describe what you are building and how we can help..."
                className="w-full p-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm focus:outline-none focus:ring-2 focus:ring-[#43D9A3]"
              />
            </div>
            {contactStatus === 'error' && (
              <p className="text-sm text-[#E45B63]">{contactError}</p>
            )}
            {contactStatus === 'sent' && (
              <p className="text-sm text-[#153C32] dark:text-[#43D9A3] font-medium">
                Support ticket recorded in our system. Our team will respond to your email shortly.
              </p>
            )}
            <button
              type="submit"
              disabled={contactStatus === 'submitting'}
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] text-sm font-semibold hover:bg-[#153C32] transition-colors disabled:opacity-60"
            >
              {contactStatus === 'submitting' ? 'Sending Request...' : 'Submit Support Ticket'}
            </button>
          </form>
        </div>
      </section>
    );
  }

  if (page === 'privacy' || page === 'terms') {
    const isPrivacy = page === 'privacy';
    return (
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-sm text-[#667085] dark:text-[#94A3AF] mb-2">Legal Documentation · Updated November 2026</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#101C24] dark:text-[#F0F5F2] mb-8">
          {isPrivacy ? 'Privacy Policy' : 'Terms of Service'}
        </h1>
        <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-6 sm:p-10 space-y-6 text-sm sm:text-base text-[#17212B] dark:text-[#F0F5F2] leading-relaxed">
          {isPrivacy ? (
            <>
              <div>
                <h2 className="font-display text-lg font-semibold mb-2">1. Customer Data Isolation</h2>
                <p className="text-[#667085] dark:text-[#94A3AF]">
                  LAUNCHLY stores your onboarding profile, business roadmap, saved products, financial ledger entries, and AI conversation history isolated to your authenticated workspace. We never sell customer business plans or product shortlists.
                </p>
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold mb-2">2. Third-Party Store & Email Credentials</h2>
                <p className="text-[#667085] dark:text-[#94A3AF]">
                  We never request or store passwords for Shopify, WooCommerce, or Gmail. All store connections rely on official OAuth scopes and explicit customer confirmation before publishing or editing store data.
                </p>
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold mb-2">3. Account Deletion & Inquiries</h2>
                <p className="text-[#667085] dark:text-[#94A3AF]">
                  You may request immediate account deactivation from Dashboard Settings or contact fahadeasybuy27264@gmail.com for data export or removal requests.
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <h2 className="font-display text-lg font-semibold mb-2">1. Platform Scope & No Profit Guarantees</h2>
                <p className="text-[#667085] dark:text-[#94A3AF]">
                  LAUNCHLY provides AI-assisted business planning, unit-economics tools, supplier directory workflows, and access to independent experts. All financial projections and AI suggestions are estimates and do not constitute legal, tax, or guaranteed revenue advice.
                </p>
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold mb-2">2. Subscriptions & Sandbox Billing</h2>
                <p className="text-[#667085] dark:text-[#94A3AF]">
                  Paid plans govern monthly AI credit quotas and feature access. Until live merchant credentials are activated, billing workflows operate in transparent sandbox mode without processing live card charges.
                </p>
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold mb-2">3. Store Modifications</h2>
                <p className="text-[#667085] dark:text-[#94A3AF]">
                  Customers remain responsible for reviewing AI-generated marketing drafts, product pricing, supplier compliance, and store imports before publishing to live storefronts.
                </p>
              </div>
            </>
          )}
        </div>
      </section>
    );
  }

  if (page === 'about') {
    return (
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-[#153C32] dark:text-[#43D9A3] mb-2">About LAUNCHLY</p>
          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-[#101C24] dark:text-[#F0F5F2] text-balance">
            Built to replace scattered spreadsheets and guesswork with one transparent workspace.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-[#667085] dark:text-[#94A3AF] leading-relaxed">
            Starting an online business should not require subscribing to six disconnected tools or falling for unrealistic revenue promises. LAUNCHLY pairs practical AI guidance with verified workflows, transparent cost math, and vetted human specialists.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: '01. Radical Transparency', body: 'Verified data, rough estimates, and unverified leads are always labeled clearly—never disguised as guaranteed demand.' },
            { title: '02. Multi-Model Flexibility', body: 'Whether you launch Dropshipping, Print on Demand, Private Label, or General E-commerce, your roadmap adapts to your budget.' },
            { title: '03. Human-in-the-Loop', body: 'AI prepares drafts and checklists; you approve store changes, ad spend, and supplier terms—with vetted experts available on demand.' },
          ].map((item) => (
            <div key={item.title} className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-6">
              <h2 className="font-display text-lg font-semibold mb-2">{item.title}</h2>
              <p className="text-sm text-[#667085] dark:text-[#94A3AF] leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const showSection = (section: string) => {
    if (page === 'home') return true;
    if (page === 'how-it-works') return section === 'how' || section === 'cta';
    if (page === 'features') return section === 'ai' || section === 'research' || section === 'suppliers' || section === 'marketing' || section === 'cta';
    if (page === 'business-models') return section === 'models' || section === 'cta';
    if (page === 'pricing') return section === 'pricing' || section === 'faq';
    if (page === 'faq') return section === 'faq' || section === 'cta';
    return true;
  };

  return (
    <div>
      {/* 1. HERO SECTION */}
      {page === 'home' && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 lg:pt-20 lg:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <p className="text-sm font-medium text-[#153C32] dark:text-[#43D9A3]">
                Your Business. One Platform.
              </p>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-[54px] font-bold tracking-tight text-[#101C24] dark:text-[#F0F5F2] leading-[1.08] text-balance">
                Everything You Need to Start Your Online Business.
              </h1>
              <p className="text-base sm:text-lg text-[#667085] dark:text-[#94A3AF] leading-relaxed max-w-xl">
                Discover products, connect suppliers, build your store, and grow your business with AI-powered assistance and professional human experts from one central dashboard.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="min-h-[48px] px-6 py-3 rounded-xl bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] font-semibold text-sm inline-flex items-center justify-center gap-2 hover:bg-[#153C32] dark:hover:bg-[#36c490] transition-colors whitespace-nowrap"
                >
                  <span>Start Your Business</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('features')}
                  className="min-h-[48px] px-6 py-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-white dark:bg-[#101C24] text-[#17212B] dark:text-[#F0F5F2] font-semibold text-sm inline-flex items-center justify-center hover:border-[#153C32] transition-colors whitespace-nowrap"
                >
                  Explore Features
                </button>
              </div>
              <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#667085] dark:text-[#94A3AF]">
                <span>Dropshipping</span>
                <span aria-hidden="true">·</span>
                <span>Print on Demand</span>
                <span aria-hidden="true">·</span>
                <span>Private Label</span>
                <span aria-hidden="true">·</span>
                <span>General E-commerce</span>
              </div>
            </div>

            {/* Realistic Interactive Workspace Preview (labeled as illustrative preview) */}
            <div className="lg:col-span-6">
              <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-[#E6EBE8] dark:border-[#1E2D36]">
                  <div>
                    <div className="text-xs text-[#667085] dark:text-[#94A3AF]">Workspace Preview · Private Label</div>
                    <div className="font-display text-base font-semibold text-[#101C24] dark:text-[#F0F5F2]">Launch Roadmap & Unit Economics</div>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-[#153C32] dark:text-[#43D9A3] font-semibold">Stage 3 / 5</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4 border-b border-[#E6EBE8] dark:border-[#1E2D36]">
                  <div>
                    <div className="text-xs text-[#667085] dark:text-[#94A3AF]">Shortlisted SKUs</div>
                    <div className="font-mono tabular-nums text-xl font-semibold mt-0.5">3</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#667085] dark:text-[#94A3AF]">Est. Gross Margin</div>
                    <div className="font-mono tabular-nums text-xl font-semibold mt-0.5 text-[#153C32] dark:text-[#43D9A3]">66.2%</div>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <div className="text-xs text-[#667085] dark:text-[#94A3AF]">Store Sync</div>
                    <div className="text-sm font-medium mt-1">Shopify OAuth Ready</div>
                  </div>
                </div>

                <div className="py-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">01. Complete onboarding profile</span>
                    <span className="text-xs text-[#153C32] dark:text-[#43D9A3]">Done</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">02. Validate supplier MOQ & shipping</span>
                    <span className="text-xs text-[#153C32] dark:text-[#43D9A3]">Verified</span>
                  </div>
                  <div className="flex items-center justify-between text-[#667085] dark:text-[#94A3AF]">
                    <span>03. Review AI TikTok launch script draft</span>
                    <span className="text-xs">Awaiting review</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E6EBE8] dark:border-[#1E2D36] flex items-center justify-between text-xs text-[#667085] dark:text-[#94A3AF]">
                  <span>AI Business Advisor · Distinguishes verified data from estimates</span>
                  <button type="button" onClick={() => onOpenAuth('login')} className="font-semibold text-[#101C24] dark:text-[#43D9A3] hover:underline whitespace-nowrap">
                    Try Demo →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. THE PROBLEM LAUNCHLY SOLVES */}
      {page === 'home' && (
        <section className="border-t border-[#E6EBE8] dark:border-[#1E2D36] bg-white dark:bg-[#101C24]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-5">
                <p className="text-sm font-medium text-[#153C32] dark:text-[#43D9A3] mb-2">Why LAUNCHLY Exists</p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#101C24] dark:text-[#F0F5F2] text-balance">
                  Beginners fail from tool fragmentation and unverified guesswork—not lack of effort.
                </h2>
              </div>
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36]">
                  <h3 className="font-display font-semibold text-base mb-1.5">Disconnected Subscriptions</h3>
                  <p className="text-sm text-[#667085] dark:text-[#94A3AF]">Founders juggle separate product scrapers, copy generators, spreadsheets, and freelance marketplaces.</p>
                </div>
                <div className="p-5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36]">
                  <h3 className="font-display font-semibold text-base mb-1.5">Hidden Landed Costs</h3>
                  <p className="text-sm text-[#667085] dark:text-[#94A3AF]">LAUNCHLY models shipping, payment fees, and ad CAC transparently before you commit to inventory.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. HOW LAUNCHLY WORKS */}
      {showSection('how') && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-2xl mb-12">
            <p className="text-sm font-medium text-[#153C32] dark:text-[#43D9A3] mb-2">How LAUNCHLY Works</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#101C24] dark:text-[#F0F5F2]">
              From business idea to store launch in four structured steps.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '01. Profile & Roadmap', desc: 'Complete your guided onboarding with budget, target market, and time commitment to unlock a tailored checklist.' },
              { step: '02. Research & Margins', desc: 'Evaluate catalog candidates with real supplier costs, transparent margin math, and AI risk briefs.' },
              { step: '03. Suppliers & Store', desc: 'Connect API-enabled or manual supplier workflows and stage product drafts for Shopify OAuth import.' },
              { step: '04. Marketing & Experts', desc: 'Draft ad scripts and SEO copy in Marketing Studio, or request help from admin-approved specialists.' },
            ].map((item) => (
              <div key={item.step} className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-6">
                <h3 className="font-display text-lg font-semibold mb-2 text-[#101C24] dark:text-[#F0F5F2]">{item.step}</h3>
                <p className="text-sm text-[#667085] dark:text-[#94A3AF] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. BUSINESS MODELS SUPPORTED */}
      {showSection('models') && (
        <section className="border-t border-[#E6EBE8] dark:border-[#1E2D36] bg-white dark:bg-[#101C24]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <div className="max-w-2xl mb-12">
              <p className="text-sm font-medium text-[#153C32] dark:text-[#43D9A3] mb-2">Business Models Supported</p>
              <h2 className="font-display text-3xl font-bold text-[#101C24] dark:text-[#F0F5F2]">
                Built for every modern online commerce model.
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { name: 'Dropshipping', detail: 'Test product-market fit with low upfront inventory, compare shipping estimates, and validate margins before scaling ads.' },
                { name: 'Print on Demand', detail: 'Launch custom apparel, totes, and home prints with 1-unit minimum orders and automated POD partner workflows.' },
                { name: 'Private Label', detail: 'Source OEM/ODM partners, track 25–50 unit MOQ quotes, and build differentiated packaging and brand voice.' },
                { name: 'General E-commerce', detail: 'Manage multi-SKU curated catalogs, track actual revenue and expenses, and optimize your storefront.' },
              ].map((m) => (
                <div key={m.name} className="p-6 rounded-2xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318]">
                  <h3 className="font-display text-xl font-semibold mb-2">{m.name}</h3>
                  <p className="text-sm text-[#667085] dark:text-[#94A3AF] leading-relaxed">{m.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. AI-POWERED FEATURES & SPECIALIZED AGENTS */}
      {showSection('ai') && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5 space-y-4">
              <p className="text-sm font-medium text-[#153C32] dark:text-[#43D9A3]">LAUNCHLY AI Advisor</p>
              <h2 className="font-display text-3xl font-bold text-[#101C24] dark:text-[#F0F5F2] text-balance">
                Context-aware AI specialists grounded in your business profile.
              </h2>
              <p className="text-sm sm:text-base text-[#667085] dark:text-[#94A3AF] leading-relaxed">
                Switch between Research, Product, Supplier, Store, Marketing, Finance, and Support specialists—each reading your saved model, budget, and target countries while strictly separating verified facts from estimates.
              </p>
            </div>
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Sparkles, title: 'AI Business Advisor', desc: 'Answers strategy questions, models pricing, and flags risks without inventing numbers.' },
                { icon: Package, title: 'Product Research Center', desc: 'Filters catalog candidates with cost, suggested price, shipping, and source methodology.' },
                { icon: Truck, title: 'Supplier Center', desc: 'Separates Verified, Manually Reviewed, and Unverified suppliers with API or manual workflows.' },
                { icon: Store, title: 'Shopify Store Manager', desc: 'OAuth store architecture requiring explicit confirmation before any product sync.' },
                { icon: Megaphone, title: 'Marketing Studio', desc: '12 draft generators including TikTok scripts, Meta ad copy, SEO metadata, and content calendars.' },
                { icon: Users, title: 'Expert Marketplace', desc: 'Admin-approved Shopify developers, researchers, and marketers with clear project scopes.' },
              ].map((feat) => {
                const Icon = feat.icon;
                return (
                  <div key={feat.title} className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-xl p-5">
                    <Icon className="w-5 h-5 text-[#153C32] dark:text-[#43D9A3] mb-3" />
                    <h3 className="font-display font-semibold text-base mb-1">{feat.title}</h3>
                    <p className="text-sm text-[#667085] dark:text-[#94A3AF] leading-relaxed">{feat.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 6. PRODUCT RESEARCH PREVIEW */}
      {showSection('research') && (
        <section className="border-t border-[#E6EBE8] dark:border-[#1E2D36] bg-white dark:bg-[#101C24]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <p className="text-sm font-medium text-[#153C32] dark:text-[#43D9A3] mb-1">Product Research Preview</p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold">Transparent unit economics & sourcing data.</h2>
              </div>
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="text-sm font-semibold text-[#153C32] dark:text-[#43D9A3] hover:underline whitespace-nowrap"
              >
                Open Full Research Center →
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  img: '/src/assets/images/product_smart_bottle_1795275754164.jpg',
                  title: 'Matte Charcoal Insulated Bottle',
                  meta: 'Fitness · Private Label · United States',
                  cost: '$11.50 cost / $34.00 suggested',
                },
                {
                  img: '/src/assets/images/product_desk_lamp_1795275754273.jpg',
                  title: 'Anodized Architectural LED Lamp',
                  meta: 'Home and Living · General E-commerce · UK',
                  cost: '$26.00 cost / $78.00 suggested',
                },
                {
                  img: '/src/assets/images/product_linen_tote_1795275754859.jpg',
                  title: 'Heavyweight Organic Canvas Tote',
                  meta: 'Fashion · Print on Demand · US & EU',
                  cost: '$14.80 cost / $42.00 suggested',
                },
              ].map((card) => (
                <div key={card.title} className="rounded-2xl border border-[#E6EBE8] dark:border-[#1E2D36] overflow-hidden bg-[#F7F9F8] dark:bg-[#0B1318]">
                  <div className="aspect-[4/3] bg-[#E6EBE8] dark:bg-[#153C32]/20 overflow-hidden">
                    <img src={card.img} alt={card.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-5">
                    <p className="text-xs text-[#667085] dark:text-[#94A3AF] mb-1">{card.meta}</p>
                    <h3 className="font-display font-semibold text-base mb-2">{card.title}</h3>
                    <p className="text-xs font-mono tabular-nums text-[#153C32] dark:text-[#43D9A3]">{card.cost}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 7-10. SUPPLIERS, STORE, MARKETING, EXPERTS, ANALYTICS HIGHLIGHTS */}
      {(showSection('suppliers') || showSection('marketing')) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36]">
              <ShieldCheck className="w-5 h-5 text-[#153C32] dark:text-[#43D9A3] mb-3" />
              <h3 className="font-display font-semibold mb-1.5">Honest Supplier Verification</h3>
              <p className="text-sm text-[#667085] dark:text-[#94A3AF]">Direct API integrations where available, and guided manual quotation workflows where APIs are unavailable.</p>
            </div>
            <div className="p-6 rounded-2xl bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36]">
              <Store className="w-5 h-5 text-[#153C32] dark:text-[#43D9A3] mb-3" />
              <h3 className="font-display font-semibold mb-1.5">Consent-First Store Sync</h3>
              <p className="text-sm text-[#667085] dark:text-[#94A3AF]">Stage product titles, pricing, and descriptions before explicitly confirming updates to your connected Shopify store.</p>
            </div>
            <div className="p-6 rounded-2xl bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36]">
              <BarChart3 className="w-5 h-5 text-[#153C32] dark:text-[#43D9A3] mb-3" />
              <h3 className="font-display font-semibold mb-1.5">Finance & P&L Ledger</h3>
              <p className="text-sm text-[#667085] dark:text-[#94A3AF]">Calculate gross margins, shipping impact, and break-even ROAS while keeping actuals separate from projections.</p>
            </div>
            <div className="p-6 rounded-2xl bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36]">
              <Users className="w-5 h-5 text-[#153C32] dark:text-[#43D9A3] mb-3" />
              <h3 className="font-display font-semibold mb-1.5">Vetted Human Experts</h3>
              <p className="text-sm text-[#667085] dark:text-[#94A3AF]">Submit scoped requests to admin-approved Shopify developers, product researchers, designers, and ad specialists.</p>
            </div>
          </div>
        </section>
      )}

      {/* 12. SUBSCRIPTION PLANS */}
      {showSection('pricing') && (
        <section className="border-t border-[#E6EBE8] dark:border-[#1E2D36] bg-white dark:bg-[#101C24]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
              <div>
                <p className="text-sm font-medium text-[#153C32] dark:text-[#43D9A3] mb-2">Subscription Plans</p>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#101C24] dark:text-[#F0F5F2]">
                  Simple plans scaled to your launch stage.
                </h2>
              </div>
              <div className="inline-flex items-center p-1 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1318] border border-[#E6EBE8] dark:border-[#1E2D36] self-start">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-2 min-h-[40px] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    billingCycle === 'monthly'
                      ? 'bg-[#101C24] text-white dark:bg-[#43D9A3] dark:text-[#101C24]'
                      : 'text-[#667085] dark:text-[#94A3AF]'
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`px-4 py-2 min-h-[40px] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    billingCycle === 'annual'
                      ? 'bg-[#101C24] text-white dark:bg-[#43D9A3] dark:text-[#101C24]'
                      : 'text-[#667085] dark:text-[#94A3AF]'
                  }`}
                >
                  Annual (Save ~20%)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {(
                [
                  {
                    key: 'starter' as const,
                    audience: 'For first-time founders validating an idea',
                    fallbackPrice: billingCycle === 'annual' ? 24 : 29,
                    fallbackCredits: 40,
                    items: ['AI Business Advisor (40 monthly credits)', 'Basic product research catalog', 'Personalized launch roadmap', 'Finance margin calculator'],
                  },
                  {
                    key: 'builder' as const,
                    audience: 'For active builders preparing store launch',
                    fallbackPrice: billingCycle === 'annual' ? 64 : 79,
                    fallbackCredits: 200,
                    featured: true,
                    items: ['Everything in Starter (200 monthly AI credits)', 'Full product comparison & AI briefs', 'Supplier matching & quotation workflows', 'Shopify OAuth store integration & Marketing Studio'],
                  },
                  {
                    key: 'professional' as const,
                    audience: 'For scaling operators needing specialist support',
                    fallbackPrice: billingCycle === 'annual' ? 159 : 199,
                    fallbackCredits: 1000,
                    items: ['Everything in Builder (1,000 monthly AI credits)', 'Expert Marketplace priority matching', 'Advanced research & export reports', 'Priority customer support'],
                  },
                ]
              ).map((tier) => {
                const live = plans?.[tier.key];
                const price = live ? (billingCycle === 'annual' ? live.annualPrice : live.monthlyPrice) : tier.fallbackPrice;
                const credits = live?.aiCredits ?? tier.fallbackCredits;
                return (
                  <div
                    key={tier.key}
                    className={`rounded-2xl p-6 sm:p-8 flex flex-col justify-between border ${
                      tier.featured
                        ? 'border-[#153C32] dark:border-[#43D9A3] bg-[#F7F9F8] dark:bg-[#0B1318]'
                        : 'border-[#E6EBE8] dark:border-[#1E2D36] bg-white dark:bg-[#101C24]'
                    }`}
                  >
                    <div>
                      <p className="text-xs text-[#667085] dark:text-[#94A3AF] mb-1">{tier.audience}</p>
                      <h3 className="font-display text-2xl font-bold capitalize">{live?.name || tier.key}</h3>
                      <div className="mt-4 flex items-baseline gap-1.5">
                        <span className="font-mono tabular-nums text-4xl font-bold">${price}</span>
                        <span className="text-sm text-[#667085] dark:text-[#94A3AF]">/ month ({billingCycle})</span>
                      </div>
                      <p className="mt-1 text-xs font-mono tabular-nums text-[#153C32] dark:text-[#43D9A3]">
                        {credits} AI requests / month · 14-day sandbox trial
                      </p>
                      <ul className="mt-6 space-y-3 text-sm text-[#17212B] dark:text-[#F0F5F2]">
                        {tier.items.map((item) => (
                          <li key={item} className="flex items-start gap-2.5">
                            <Check className="w-4 h-4 shrink-0 mt-0.5 text-[#153C32] dark:text-[#43D9A3]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenAuth('register')}
                      className={`mt-8 w-full min-h-[44px] rounded-xl text-sm font-semibold transition-colors ${
                        tier.featured
                          ? 'bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] hover:bg-[#153C32]'
                          : 'border border-[#E6EBE8] dark:border-[#1E2D36] hover:border-[#101C24] dark:hover:border-[#43D9A3]'
                      }`}
                    >
                      Start {live?.name || tier.key} Trial
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 13. FAQ */}
      {showSection('faq') && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="mb-10">
            <p className="text-sm font-medium text-[#153C32] dark:text-[#43D9A3] mb-2">Frequently Asked Questions</p>
            <h2 className="font-display text-3xl font-bold">Clear answers before you start.</h2>
          </div>
          <div className="divide-y divide-[#E6EBE8] dark:divide-[#1E2D36] border-y border-[#E6EBE8] dark:border-[#1E2D36]">
            {FAQ_ITEMS.map((item, idx) => (
              <div key={item.q} className="py-4">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full min-h-[44px] flex items-center justify-between gap-4 text-left font-display font-semibold text-base"
                >
                  <span>{item.q}</span>
                  {openFaq === idx ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                </button>
                {openFaq === idx && (
                  <p className="mt-2 pb-2 text-sm text-[#667085] dark:text-[#94A3AF] leading-relaxed">{item.a}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 14. FINAL CALL TO ACTION */}
      {showSection('cta') && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="rounded-2xl bg-[#101C24] dark:bg-[#153C32]/40 border border-[#153C32] text-white p-8 sm:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-balance">
                Build your online business with clarity from day one.
              </h2>
              <p className="mt-2 text-sm sm:text-base text-slate-300">
                Create your workspace, complete your onboarding roadmap, or inspect our clearly labeled sample demo account.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="min-h-[44px] px-6 py-3 rounded-xl bg-[#43D9A3] text-[#101C24] font-semibold text-sm hover:bg-[#36c490] transition-colors whitespace-nowrap"
              >
                Start Your Business
              </button>
              <button
                type="button"
                onClick={() => onNavigate('contact')}
                className="min-h-[44px] px-6 py-3 rounded-xl border border-white/25 text-white font-semibold text-sm hover:bg-white/10 transition-colors whitespace-nowrap"
              >
                Contact Support
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
