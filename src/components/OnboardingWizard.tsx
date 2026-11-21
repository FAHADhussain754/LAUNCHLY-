import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { apiRequest } from '../lib/api';
import type { WorkspaceContext } from '../types';

interface OnboardingWizardProps {
  workspace: WorkspaceContext;
  onComplete: (updated: WorkspaceContext) => void;
  onSkipToDashboard: () => void;
}

const BUSINESS_MODELS = [
  { id: 'Dropshipping', desc: 'Test demand with low upfront inventory and direct supplier fulfillment.' },
  { id: 'Print on Demand', desc: 'Custom-printed apparel, totes, and lifestyle goods printed per order.' },
  { id: 'Private Label', desc: 'Branded packaging and custom product runs with OEM manufacturers.' },
  { id: 'General E-commerce', desc: 'Curated multi-product storefront with flexible sourcing.' },
  { id: 'Other online business', desc: 'Specialized commerce or hybrid product-service venture.' },
];

export function OnboardingWizard({ workspace, onComplete, onSkipToDashboard }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: workspace.user.name || '',
    country: workspace.user.country || 'United States',
    language: workspace.user.language || 'English',
    experience_level: workspace.onboarding?.experience_level || 'Complete Beginner',
    business_name: workspace.business?.name || '',
    business_model: workspace.business?.model || 'General E-commerce',
    budget: workspace.onboarding?.budget || '$500 - $1,500',
    goals: workspace.onboarding?.goals || '',
    target_countries: workspace.onboarding?.target_countries || 'United States',
    preferred_categories: workspace.onboarding?.preferred_categories || 'Home and Living, Fitness',
    marketing_experience: workspace.onboarding?.marketing_experience || 'Beginner',
    weekly_hours: workspace.onboarding?.weekly_hours || '5-10 hours/week',
    has_existing_store: workspace.onboarding?.has_existing_store || 'no',
  });

  const saveStep = async (markCompleted: boolean) => {
    setSaving(true);
    setError('');
    try {
      const updated = await apiRequest<WorkspaceContext>('/api/onboarding', {
        method: 'PUT',
        body: { ...form, niche: form.preferred_categories, completed: markCompleted },
      });
      if (markCompleted) {
        onComplete(updated);
      } else {
        setStep((s) => Math.min(4, s + 1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save onboarding progress.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9F8] dark:bg-[#0B1318] py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#153C32] dark:text-[#43D9A3]">LAUNCHLY Smart Onboarding · Step {step} of 4</p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#101C24] dark:text-[#F0F5F2] mt-1">
              Build your personalized business profile
            </h1>
          </div>
          <button
            type="button"
            onClick={onSkipToDashboard}
            className="text-xs font-medium text-[#667085] hover:text-[#101C24] dark:hover:text-white min-h-[44px] px-2"
          >
            Finish Later
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-[#E6EBE8] dark:bg-[#1E2D36] overflow-hidden">
          <div
            className="h-full bg-[#43D9A3] transition-all duration-200"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-[#E45B63]/10 border border-[#E45B63]/30 text-xs text-[#E45B63]">{error}</div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold">01. Founder Profile</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ob-name" className="block text-xs font-medium mb-1">Your Name</label>
                  <input
                    id="ob-name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="ob-country" className="block text-xs font-medium mb-1">Home Country</label>
                  <input
                    id="ob-country"
                    type="text"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="ob-lang" className="block text-xs font-medium mb-1">Preferred Language</label>
                  <select
                    id="ob-lang"
                    value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
                  >
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                    <option>Urdu</option>
                    <option>Arabic</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ob-exp" className="block text-xs font-medium mb-1">E-commerce Experience</label>
                  <select
                    id="ob-exp"
                    value={form.experience_level}
                    onChange={(e) => setForm({ ...form, experience_level: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
                  >
                    <option>Complete Beginner</option>
                    <option>Tested a Store Before</option>
                    <option>Active Seller Expanding</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold">02. Business Model & Budget</h2>
              <div>
                <label htmlFor="ob-bizname" className="block text-xs font-medium mb-1">Working Business Name</label>
                <input
                  id="ob-bizname"
                  type="text"
                  value={form.business_name}
                  onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                  placeholder="e.g. Northwood Living"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
                />
              </div>
              <div>
                <span className="block text-xs font-medium mb-2">Which business do you want to start?</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {BUSINESS_MODELS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setForm({ ...form, business_model: m.id })}
                      className={`text-left p-3.5 rounded-xl border transition-colors ${
                        form.business_model === m.id
                          ? 'border-[#153C32] dark:border-[#43D9A3] bg-[#F7F9F8] dark:bg-[#153C32]/30'
                          : 'border-[#E6EBE8] dark:border-[#1E2D36]'
                      }`}
                    >
                      <div className="font-semibold text-sm">{m.id}</div>
                      <div className="text-xs text-[#667085] dark:text-[#94A3AF] mt-0.5">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ob-budget" className="block text-xs font-medium mb-1">Starting Budget</label>
                  <select
                    id="ob-budget"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
                  >
                    <option>Under $500</option>
                    <option>$500 - $1,500</option>
                    <option>$1,500 - $5,000</option>
                    <option>$5,000+</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ob-goals" className="block text-xs font-medium mb-1">Primary 90-Day Goal</label>
                  <input
                    id="ob-goals"
                    type="text"
                    value={form.goals}
                    onChange={(e) => setForm({ ...form, goals: e.target.value })}
                    placeholder="Launch my first 3 validated products"
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold">03. Target Market & Product Interests</h2>
              <div>
                <label htmlFor="ob-targets" className="block text-xs font-medium mb-1">Target Selling Countries</label>
                <input
                  id="ob-targets"
                  type="text"
                  value={form.target_countries}
                  onChange={(e) => setForm({ ...form, target_countries: e.target.value })}
                  placeholder="United States, United Kingdom, Canada"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
                />
              </div>
              <div>
                <label htmlFor="ob-cats" className="block text-xs font-medium mb-1">Which products or niches interest you?</label>
                <input
                  id="ob-cats"
                  type="text"
                  value={form.preferred_categories}
                  onChange={(e) => setForm({ ...form, preferred_categories: e.target.value })}
                  placeholder="Home and Living, Fitness, Pet Products"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
                />
              </div>
              <div>
                <label htmlFor="ob-mkt" className="block text-xs font-medium mb-1">Marketing Experience</label>
                <select
                  id="ob-mkt"
                  value={form.marketing_experience}
                  onChange={(e) => setForm({ ...form, marketing_experience: e.target.value })}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
                >
                  <option>Beginner (never ran ads)</option>
                  <option>Organic social media only</option>
                  <option>Experienced with paid ads / SEO</option>
                </select>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold">04. Time Commitment & Existing Store</h2>
              <div>
                <label htmlFor="ob-hours" className="block text-xs font-medium mb-1">How much time can you invest weekly?</label>
                <select
                  id="ob-hours"
                  value={form.weekly_hours}
                  onChange={(e) => setForm({ ...form, weekly_hours: e.target.value })}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
                >
                  <option>Under 5 hours/week</option>
                  <option>5-10 hours/week</option>
                  <option>10-20 hours/week</option>
                  <option>Full-time (30+ hours/week)</option>
                </select>
              </div>
              <div>
                <span className="block text-xs font-medium mb-2">Do you already have a Shopify store?</span>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { v: 'no', label: 'No, starting from scratch' },
                    { v: 'yes', label: 'Yes, I have an existing store' },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setForm({ ...form, has_existing_store: opt.v })}
                      className={`min-h-[44px] px-4 rounded-xl border text-sm font-medium ${
                        form.has_existing_store === opt.v
                          ? 'border-[#153C32] dark:border-[#43D9A3] bg-[#F7F9F8] dark:bg-[#153C32]/30'
                          : 'border-[#E6EBE8] dark:border-[#1E2D36]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-[#E6EBE8] dark:border-[#1E2D36] flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={step === 1}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="min-h-[44px] px-4 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] text-sm font-medium inline-flex items-center gap-2 disabled:opacity-40"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {step < 4 ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => saveStep(false)}
                className="min-h-[44px] px-5 rounded-xl bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] text-sm font-semibold inline-flex items-center gap-2"
              >
                <span>{saving ? 'Saving...' : 'Save & Continue'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={() => saveStep(true)}
                className="min-h-[44px] px-5 rounded-xl bg-[#153C32] dark:bg-[#43D9A3] text-white dark:text-[#101C24] text-sm font-semibold inline-flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'Generating Roadmap...' : 'Complete Onboarding'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
