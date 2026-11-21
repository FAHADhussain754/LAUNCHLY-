import { useEffect, useState } from 'react';
import { Bookmark, Download, ExternalLink, Sparkles, Scale } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import type { ProductItem } from '../../types';

interface ProductResearchViewProps {
  onWorkspaceChanged: () => void;
}

const CATEGORIES = ['All', 'Home and Living', 'Beauty and Personal Care', 'Fashion', 'Fitness', 'Pet Products', 'Kitchen'];
const MODELS = ['All', 'Dropshipping', 'Print on Demand', 'Private Label', 'General E-commerce'];
const COUNTRIES = ['All', 'United States', 'United Kingdom', 'Canada', 'Australia'];

export function ProductResearchView({ onWorkspaceChanged }: ProductResearchViewProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [model, setModel] = useState('All');
  const [country, setCountry] = useState('All');
  const [savedOnly, setSavedOnly] = useState(false);

  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [briefs, setBriefs] = useState<Record<number, string>>({});
  const [briefLoading, setBriefLoading] = useState<number | null>(null);
  const [briefError, setBriefError] = useState('');

  const loadProducts = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== 'All') params.set('category', category);
    if (model !== 'All') params.set('model', model);
    if (country !== 'All') params.set('country', country);
    if (search.trim()) params.set('search', search.trim());
    try {
      const res = await apiRequest<{ products: ProductItem[] }>(`/api/products?${params.toString()}`);
      setProducts(res.products);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [category, model, country]);

  const toggleSave = async (p: ProductItem) => {
    if (p.is_saved) {
      await apiRequest(`/api/products/${p.id}/save`, { method: 'DELETE' });
    } else {
      await apiRequest(`/api/products/${p.id}/save`, {
        method: 'POST',
        body: { collection_name: 'Shortlist', notes: '' },
      });
    }
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_saved: !x.is_saved } : x)));
    onWorkspaceChanged();
  };

  const toggleCompare = (id: number) => {
    setCompareIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev));
  };

  const generateBrief = async (p: ProductItem) => {
    setBriefLoading(p.id);
    setBriefError('');
    try {
      const res = await apiRequest<{ brief: string }>(`/api/products/${p.id}/ai-brief`, { method: 'POST' });
      setBriefs((prev) => ({ ...prev, [p.id]: res.brief }));
      onWorkspaceChanged();
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : 'Unable to generate brief.');
    } finally {
      setBriefLoading(null);
    }
  };

  const exportCsv = () => {
    const header = 'Name,Category,Business Model,Supplier,Cost USD,Suggested Price USD,Target Country,Status\n';
    const rows = displayed.map((p) =>
      [p.name, p.category, p.business_model, p.supplier_name, p.supplier_cost ?? 'Unavailable', p.suggested_price ?? 'Unavailable', p.target_country, p.data_status]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'launchly-product-research.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const displayed = savedOnly ? products.filter((p) => p.is_saved) : products;
  const comparedProducts = products.filter((p) => compareIds.includes(p.id));

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Product Research Center</h2>
            <p className="text-xs text-[#667085] dark:text-[#94A3AF]">
              Transparent supplier costs, suggested prices, and research status. Missing figures are marked Unavailable—never invented.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSavedOnly((v) => !v)}
              className={`min-h-[40px] px-3.5 rounded-xl border text-xs font-semibold whitespace-nowrap ${
                savedOnly
                  ? 'bg-[#101C24] text-white dark:bg-[#43D9A3] dark:text-[#101C24] border-transparent'
                  : 'border-[#E6EBE8] dark:border-[#1E2D36]'
              }`}
            >
              Saved Library ({products.filter((p) => p.is_saved).length})
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="min-h-[40px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadProducts();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products or suppliers..."
              className="flex-1 min-h-[40px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
            />
          </form>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="min-h-[40px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm">
            {CATEGORIES.map((c) => <option key={c} value={c}>Category: {c}</option>)}
          </select>
          <select value={model} onChange={(e) => setModel(e.target.value)} className="min-h-[40px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm">
            {MODELS.map((m) => <option key={m} value={m}>Model: {m}</option>)}
          </select>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="min-h-[40px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm">
            {COUNTRIES.map((c) => <option key={c} value={c}>Market: {c}</option>)}
          </select>
        </div>
      </div>

      {briefError && (
        <div className="p-3 rounded-xl bg-[#E45B63]/10 border border-[#E45B63]/30 text-xs text-[#E45B63]">{briefError}</div>
      )}

      {/* Product Comparison Matrix */}
      {comparedProducts.length > 0 && (
        <div className="bg-white dark:bg-[#101C24] border border-[#153C32] dark:border-[#43D9A3] rounded-2xl p-5 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-sm">Side-by-Side Comparison ({comparedProducts.length}/3)</h3>
            <button type="button" onClick={() => setCompareIds([])} className="text-xs text-[#667085] hover:underline">
              Clear Comparison
            </button>
          </div>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#E6EBE8] dark:border-[#1E2D36] text-[#667085]">
                <th className="py-2 pr-4">Product</th>
                <th className="py-2 pr-4">Model</th>
                <th className="py-2 pr-4">Supplier Cost</th>
                <th className="py-2 pr-4">Suggested Price</th>
                <th className="py-2 pr-4">Est. Gross Margin</th>
                <th className="py-2">Fulfillment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6EBE8] dark:divide-[#1E2D36]">
              {comparedProducts.map((p) => {
                const margin =
                  p.supplier_cost !== null && p.suggested_price
                    ? (((p.suggested_price - p.supplier_cost) / p.suggested_price) * 100).toFixed(1) + '%'
                    : 'Unavailable';
                return (
                  <tr key={p.id}>
                    <td className="py-2.5 pr-4 font-medium">{p.name}</td>
                    <td className="py-2.5 pr-4">{p.business_model}</td>
                    <td className="py-2.5 pr-4 font-mono tabular-nums">{p.supplier_cost !== null ? `$${p.supplier_cost.toFixed(2)}` : 'Unavailable'}</td>
                    <td className="py-2.5 pr-4 font-mono tabular-nums">{p.suggested_price !== null ? `$${p.suggested_price.toFixed(2)}` : 'Unavailable'}</td>
                    <td className="py-2.5 pr-4 font-mono tabular-nums">{margin}</td>
                    <td className="py-2.5">{p.opportunity_criteria?.fulfillmentSpeed || p.shipping_info}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Product Cards */}
      {loading ? (
        <p className="text-sm text-[#667085]">Loading research catalog...</p>
      ) : displayed.length === 0 ? (
        <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-10 text-center text-sm text-[#667085]">
          No products matched your current filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayed.map((p) => {
            const grossMargin =
              p.supplier_cost !== null && p.suggested_price && p.suggested_price > 0
                ? `${(((p.suggested_price - p.supplier_cost) / p.suggested_price) * 100).toFixed(1)}%`
                : 'Unavailable';

            return (
              <div
                key={p.id}
                className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-[4/3] bg-[#F7F9F8] dark:bg-[#0B1318] overflow-hidden">
                    <img src={p.image_url} alt={p.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="text-xs text-[#667085] dark:text-[#94A3AF]">
                      {p.category} · {p.business_model} · {p.target_country}
                    </div>
                    <h3 className="font-display font-semibold text-base text-[#101C24] dark:text-[#F0F5F2]">
                      {p.name}
                    </h3>

                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-[#E6EBE8] dark:border-[#1E2D36] text-xs">
                      <div>
                        <div className="text-[#667085] dark:text-[#94A3AF]">Supplier Cost</div>
                        <div className="font-mono tabular-nums font-semibold mt-0.5">
                          {p.supplier_cost !== null ? `$${p.supplier_cost.toFixed(2)}` : 'Unavailable'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#667085] dark:text-[#94A3AF]">Suggested</div>
                        <div className="font-mono tabular-nums font-semibold mt-0.5">
                          {p.suggested_price !== null ? `$${p.suggested_price.toFixed(2)}` : 'Unavailable'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#667085] dark:text-[#94A3AF]">Gross Margin</div>
                        <div className={`font-mono tabular-nums font-semibold mt-0.5 ${grossMargin === 'Unavailable' ? 'text-[#F5B942]' : 'text-[#153C32] dark:text-[#43D9A3]'}`}>
                          {grossMargin}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs space-y-1 text-[#667085] dark:text-[#94A3AF]">
                      <div><strong className="text-[#17212B] dark:text-[#F0F5F2]">Supplier:</strong> {p.supplier_name}</div>
                      <div><strong className="text-[#17212B] dark:text-[#F0F5F2]">Shipping:</strong> {p.shipping_info}</div>
                      <div><strong className="text-[#17212B] dark:text-[#F0F5F2]">Competition:</strong> {p.competitor_summary}</div>
                      <div>
                        <strong className="text-[#17212B] dark:text-[#F0F5F2]">Data Status:</strong>{' '}
                        {p.data_status === 'verified_catalog' ? 'Verified Catalog Quote' : 'Partial / Quote Required'} · Researched {p.research_date}
                      </div>
                    </div>

                    {briefs[p.id] && (
                      <div className="p-3 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1318] border border-[#E6EBE8] dark:border-[#1E2D36] text-xs whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                        {briefs[p.id]}
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 pb-5 pt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSave(p)}
                    className={`flex-1 min-h-[40px] px-3 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1.5 ${
                      p.is_saved
                        ? 'bg-[#153C32] text-white border-[#153C32] dark:bg-[#43D9A3] dark:text-[#101C24]'
                        : 'border-[#E6EBE8] dark:border-[#1E2D36]'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{p.is_saved ? 'Saved' : 'Save'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCompare(p.id)}
                    className={`min-h-[40px] px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1 ${
                      compareIds.includes(p.id)
                        ? 'border-[#43D9A3] text-[#153C32] dark:text-[#43D9A3]'
                        : 'border-[#E6EBE8] dark:border-[#1E2D36]'
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>Compare</span>
                  </button>
                  <button
                    type="button"
                    disabled={briefLoading === p.id}
                    onClick={() => generateBrief(p)}
                    className="w-full min-h-[40px] px-3 rounded-xl bg-[#101C24] dark:bg-[#153C32] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#43D9A3]" />
                    <span>{briefLoading === p.id ? 'Generating AI Brief...' : 'Generate AI Unit-Economics Brief'}</span>
                  </button>
                  <a
                    href={p.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#667085] hover:underline inline-flex items-center gap-1 pt-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Research Methodology & Source</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
