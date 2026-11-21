import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, ShieldAlert, Scale, Link2 } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import type { SupplierItem } from '../../types';

interface SupplierCenterViewProps {
  onWorkspaceChanged: () => void;
}

export function SupplierCenterView({ onWorkspaceChanged }: SupplierCenterViewProps) {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [verification, setVerification] = useState('All');
  const [integration, setIntegration] = useState('All');
  const [search, setSearch] = useState('');
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [notesModalId, setNotesModalId] = useState<number | null>(null);
  const [quoteNotes, setQuoteNotes] = useState('');

  const loadSuppliers = async () => {
    const params = new URLSearchParams();
    if (verification !== 'All') params.set('verification', verification);
    if (integration !== 'All') params.set('integration', integration);
    if (search.trim()) params.set('search', search.trim());
    const res = await apiRequest<{ suppliers: SupplierItem[] }>(`/api/suppliers?${params.toString()}`);
    setSuppliers(res.suppliers);
  };

  useEffect(() => {
    loadSuppliers();
  }, [verification, integration]);

  const connectSupplier = async (id: number, notes: string) => {
    await apiRequest(`/api/suppliers/${id}/connect`, {
      method: 'POST',
      body: { notes },
    });
    setNotesModalId(null);
    setQuoteNotes('');
    await loadSuppliers();
    onWorkspaceChanged();
  };

  const disconnectSupplier = async (id: number) => {
    await apiRequest(`/api/suppliers/${id}/connect`, { method: 'DELETE' });
    await loadSuppliers();
    onWorkspaceChanged();
  };

  const toggleCompare = (id: number) => {
    setCompareIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev));
  };

  const compared = suppliers.filter((s) => compareIds.includes(s.id));

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Supplier Center</h2>
          <p className="text-xs text-[#667085] dark:text-[#94A3AF]">
            Verified, Manually Reviewed, and Unverified suppliers are clearly separated. Suppliers without an authorized API use a structured manual quotation workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadSuppliers();
            }}
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search supplier, category, country..."
              className="w-full min-h-[40px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
            />
          </form>
          <select value={verification} onChange={(e) => setVerification(e.target.value)} className="min-h-[40px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm">
            <option value="All">Verification: All</option>
            <option value="verified">Verified Only</option>
            <option value="manually_reviewed">Manually Reviewed</option>
            <option value="unverified">Unverified Directory Leads</option>
          </select>
          <select value={integration} onChange={(e) => setIntegration(e.target.value)} className="min-h-[40px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm">
            <option value="All">Workflow: All</option>
            <option value="api_available">API Integration Available</option>
            <option value="manual_workflow">Manual Quotation Workflow</option>
          </select>
        </div>
      </div>

      {compared.length > 0 && (
        <div className="bg-white dark:bg-[#101C24] border border-[#153C32] dark:border-[#43D9A3] rounded-2xl p-5 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-sm">Supplier Comparison ({compared.length}/3)</h3>
            <button type="button" onClick={() => setCompareIds([])} className="text-xs text-[#667085] hover:underline">Clear</button>
          </div>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#E6EBE8] dark:border-[#1E2D36] text-[#667085]">
                <th className="py-2 pr-4">Supplier</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">MOQ</th>
                <th className="py-2 pr-4">Delivery Estimate</th>
                <th className="py-2">Return Policy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6EBE8] dark:divide-[#1E2D36]">
              {compared.map((s) => (
                <tr key={s.id}>
                  <td className="py-2.5 pr-4 font-semibold">{s.name} ({s.country})</td>
                  <td className="py-2.5 pr-4 capitalize">{s.verification_status.replace('_', ' ')}</td>
                  <td className="py-2.5 pr-4">{s.moq}</td>
                  <td className="py-2.5 pr-4">{s.delivery_estimate}</td>
                  <td className="py-2.5">{s.return_policy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {suppliers.map((s) => {
          const isVerified = s.verification_status === 'verified';
          const isManualReview = s.verification_status === 'manually_reviewed';

          return (
            <div key={s.id} className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-[#667085] dark:text-[#94A3AF]">{s.country} · {s.pricing_tier}</div>
                  <h3 className="font-display text-lg font-semibold mt-0.5">{s.name}</h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium shrink-0">
                  {isVerified ? (
                    <span className="inline-flex items-center gap-1 text-[#153C32] dark:text-[#43D9A3]">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verified</span>
                    </span>
                  ) : isManualReview ? (
                    <span className="inline-flex items-center gap-1 text-[#F5B942]">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Manually Reviewed</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[#E45B63]">
                      <ShieldAlert className="w-4 h-4" />
                      <span>Unverified</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#667085] dark:text-[#94A3AF] py-3 border-y border-[#E6EBE8] dark:border-[#1E2D36]">
                <div><strong className="text-[#17212B] dark:text-[#F0F5F2]">Categories:</strong> {s.categories}</div>
                <div><strong className="text-[#17212B] dark:text-[#F0F5F2]">Shipping:</strong> {s.shipping_regions}</div>
                <div><strong className="text-[#17212B] dark:text-[#F0F5F2]">Delivery:</strong> {s.delivery_estimate}</div>
                <div><strong className="text-[#17212B] dark:text-[#F0F5F2]">MOQ:</strong> {s.moq}</div>
                <div className="sm:col-span-2"><strong className="text-[#17212B] dark:text-[#F0F5F2]">Returns:</strong> {s.return_policy}</div>
                <div className="sm:col-span-2">
                  <strong className="text-[#17212B] dark:text-[#F0F5F2]">Contact:</strong>{' '}
                  <a href={`mailto:${s.contact_email}`} className="underline">{s.contact_email}</a>
                </div>
              </div>

              {notesModalId === s.id && (
                <div className="p-3 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1318] border border-[#E6EBE8] dark:border-[#1E2D36] space-y-2">
                  <label className="block text-xs font-medium">Quotation / Workflow Notes</label>
                  <input
                    type="text"
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    placeholder="Target SKU, quantity, destination country..."
                    className="w-full min-h-[40px] px-3 rounded-lg border border-[#E6EBE8] dark:border-[#1E2D36] bg-white dark:bg-[#101C24] text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => connectSupplier(s.id, quoteNotes)}
                      className="min-h-[36px] px-3 rounded-lg bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] text-xs font-semibold"
                    >
                      Confirm Workflow
                    </button>
                    <button type="button" onClick={() => setNotesModalId(null)} className="text-xs text-[#667085]">Cancel</button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {s.connection_status ? (
                  <button
                    type="button"
                    onClick={() => disconnectSupplier(s.id)}
                    className="min-h-[40px] px-4 rounded-xl border border-[#153C32] dark:border-[#43D9A3] text-xs font-semibold text-[#153C32] dark:text-[#43D9A3]"
                  >
                    {s.connection_status === 'connected_api' ? 'API Connected (Disconnect)' : 'Manual Workflow Active (Remove)'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setNotesModalId(s.id)}
                    className="min-h-[40px] px-4 rounded-xl bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>{s.integration_type === 'api_available' ? 'Connect Authorized API' : 'Start Manual Quotation Workflow'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => toggleCompare(s.id)}
                  className="min-h-[40px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] text-xs font-medium inline-flex items-center gap-1"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>{compareIds.includes(s.id) ? 'Comparing' : 'Compare'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
