import { useEffect, useState } from 'react';
import { Star, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import type { ExpertProfile, ExpertRequest } from '../../types';

const EXPERT_CATEGORIES = [
  'All',
  'Shopify Developers',
  'Product Researchers',
  'Marketing Specialists',
  'Graphic Designers',
  'SEO Specialists',
  'E-commerce Consultants',
];

export function ExpertMarketplaceView() {
  const [experts, setExperts] = useState<ExpertProfile[]>([]);
  const [requests, setRequests] = useState<ExpertRequest[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('All');

  const [selectedExpert, setSelectedExpert] = useState<ExpertProfile | null>(null);
  const [reqTitle, setReqTitle] = useState('');
  const [reqCategory, setReqCategory] = useState('Shopify Developers');
  const [reqDescription, setReqDescription] = useState('');
  const [reqBudget, setReqBudget] = useState('$250 - $500');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    const [eRes, rRes] = await Promise.all([
      apiRequest<{ experts: ExpertProfile[] }>('/api/experts'),
      apiRequest<{ requests: ExpertRequest[] }>('/api/experts/requests'),
    ]);
    setExperts(eRes.experts);
    setRequests(rRes.requests);
  };

  useEffect(() => {
    loadData();
  }, []);

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/api/experts/requests', {
        method: 'POST',
        body: {
          expertId: selectedExpert?.id,
          category: selectedExpert?.category || reqCategory,
          title: reqTitle,
          description: reqDescription,
          budget: reqBudget,
        },
      });
      setSelectedExpert(null);
      setReqTitle('');
      setReqDescription('');
      await loadData();
    } finally {
      setSubmitting(false);
    }
  };

  const updateRequestStatus = async (id: number, status: 'scope_approved' | 'completed') => {
    await apiRequest(`/api/experts/requests/${id}`, { method: 'PATCH', body: { status } });
    await loadData();
  };

  const visibleExperts = categoryFilter === 'All' ? experts : experts.filter((e) => e.category === categoryFilter);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Expert Marketplace</h2>
          <p className="text-xs text-[#667085] dark:text-[#94A3AF]">
            Only admin-approved specialists appear here. Submit a scope request to receive a clear quotation before any work begins.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {EXPERT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium ${
                categoryFilter === cat
                  ? 'bg-[#101C24] text-white dark:bg-[#43D9A3] dark:text-[#101C24]'
                  : 'bg-[#F7F9F8] dark:bg-[#0B1318] text-[#667085] dark:text-[#94A3AF]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Experts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {visibleExperts.map((exp) => (
          <div key={exp.id} className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#667085]">
                <span>{exp.category}</span>
                <span className="inline-flex items-center gap-1 font-mono tabular-nums text-[#101C24] dark:text-[#F0F5F2]">
                  <Star className="w-3.5 h-3.5 text-[#F5B942] fill-[#F5B942]" />
                  {exp.rating.toFixed(1)} ({exp.verified_reviews_count})
                </span>
              </div>
              <h3 className="font-display text-base font-semibold">{exp.name}</h3>
              <p className="text-xs text-[#667085] dark:text-[#94A3AF] leading-relaxed">{exp.bio}</p>
              <div className="text-xs pt-2 border-t border-[#E6EBE8] dark:border-[#1E2D36]">
                <div><strong>Skills:</strong> {exp.skills}</div>
                <div className="mt-1 font-mono tabular-nums">${exp.hourly_rate}/hr · {exp.availability}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedExpert(exp);
                setReqCategory(exp.category);
              }}
              className="w-full min-h-[42px] rounded-xl bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] text-xs font-semibold"
            >
              Request Project Scope
            </button>
          </div>
        ))}
      </div>

      {/* Submit Service Request Form */}
      <form onSubmit={submitRequest} className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-semibold">
            {selectedExpert ? `New Request for ${selectedExpert.name}` : 'Submit General Expert Service Request'}
          </h3>
          {selectedExpert && (
            <button type="button" onClick={() => setSelectedExpert(null)} className="text-xs text-[#667085] hover:underline">
              Switch to Open Pool
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            required
            value={reqTitle}
            onChange={(e) => setReqTitle(e.target.value)}
            placeholder="Project title (e.g. Shopify product page setup)"
            className="sm:col-span-2 min-h-[42px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
          />
          <select value={reqBudget} onChange={(e) => setReqBudget(e.target.value)} className="min-h-[42px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm">
            <option>Under $250</option>
            <option>$250 - $500</option>
            <option>$500 - $1,500</option>
            <option>$1,500+</option>
          </select>
        </div>
        <textarea
          rows={3}
          required
          value={reqDescription}
          onChange={(e) => setReqDescription(e.target.value)}
          placeholder="Describe your store, target deadline, and deliverables..."
          className="w-full p-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
        />
        <button
          type="submit"
          disabled={submitting}
          className="min-h-[44px] px-5 rounded-xl bg-[#153C32] dark:bg-[#43D9A3] text-white dark:text-[#101C24] text-sm font-semibold"
        >
          {submitting ? 'Submitting...' : 'Submit Expert Request'}
        </button>
      </form>

      {/* Active Requests */}
      <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 sm:p-6 space-y-3">
        <h3 className="font-display text-base font-semibold">Your Service Requests ({requests.length})</h3>
        {requests.length === 0 ? (
          <p className="text-sm text-[#667085]">No requests submitted yet.</p>
        ) : (
          <div className="divide-y divide-[#E6EBE8] dark:divide-[#1E2D36]">
            {requests.map((r) => (
              <div key={r.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-sm">{r.title}</div>
                  <div className="text-xs text-[#667085] dark:text-[#94A3AF]">
                    {r.category} {r.expert_name ? `· Assigned: ${r.expert_name}` : ''} · Budget: {r.budget} · Status: {r.status}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.status === 'submitted' && (
                    <button
                      type="button"
                      onClick={() => updateRequestStatus(r.id, 'scope_approved')}
                      className="min-h-[36px] px-3 rounded-lg border border-[#E6EBE8] dark:border-[#1E2D36] text-xs font-medium"
                    >
                      Approve Scope
                    </button>
                  )}
                  {r.status === 'scope_approved' && (
                    <button
                      type="button"
                      onClick={() => updateRequestStatus(r.id, 'completed')}
                      className="min-h-[36px] px-3 rounded-lg bg-[#153C32] text-white text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#43D9A3]" />
                      <span>Mark Completed</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
