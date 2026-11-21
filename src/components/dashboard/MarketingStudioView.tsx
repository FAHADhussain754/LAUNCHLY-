import { useEffect, useState } from 'react';
import { Copy, Check, Sparkles, Trash2 } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import type { MarketingAsset } from '../../types';

interface MarketingStudioViewProps {
  onCreditsUpdated: () => void;
}

const MARKETING_TOOLS = [
  'Product Description Generator',
  'TikTok Script Generator',
  'Facebook Ad Copy Generator',
  'Instagram Caption Generator',
  'SEO Title & Description Generator',
  'Product Content Ideas',
  'Marketing Strategy Generator',
  'Advertising Brief Generator',
  'Social Media Calendar',
  'Email Marketing Copy Generator',
  'Brand Voice Assistant',
  'Creative Brief Generator',
];

export function MarketingStudioView({ onCreditsUpdated }: MarketingStudioViewProps) {
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [toolType, setToolType] = useState(MARKETING_TOOLS[0]);
  const [productName, setProductName] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('Clean, trustworthy, modern');
  const [folder, setFolder] = useState('Launch Campaign');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const [selectedAsset, setSelectedAsset] = useState<MarketingAsset | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const loadAssets = async () => {
    const res = await apiRequest<{ assets: MarketingAsset[] }>('/api/marketing/assets');
    setAssets(res.assets);
    if (res.assets.length > 0 && !selectedAsset) {
      setSelectedAsset(res.assets[0]);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) return;
    setGenerating(true);
    setError('');
    try {
      const res = await apiRequest<{ asset: MarketingAsset }>('/api/marketing/generate', {
        method: 'POST',
        body: { toolType, productName, audience, tone, folder },
      });
      setAssets((prev) => [res.asset, ...prev]);
      setSelectedAsset(res.asset);
      onCreditsUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate marketing asset.');
    } finally {
      setGenerating(false);
    }
  };

  const updateAsset = async (asset: MarketingAsset, patch: Partial<MarketingAsset>) => {
    const res = await apiRequest<{ asset: MarketingAsset }>(`/api/marketing/assets/${asset.id}`, {
      method: 'PATCH',
      body: patch,
    });
    setAssets((prev) => prev.map((a) => (a.id === asset.id ? res.asset : a)));
    setSelectedAsset(res.asset);
  };

  const deleteAsset = async (id: number) => {
    await apiRequest(`/api/marketing/assets/${id}`, { method: 'DELETE' });
    setAssets((prev) => prev.filter((a) => a.id !== id));
    if (selectedAsset?.id === id) setSelectedAsset(null);
  };

  const copyContent = (asset: MarketingAsset) => {
    navigator.clipboard?.writeText(asset.content);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 space-y-6">
        <form onSubmit={handleGenerate} className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Marketing Studio</h2>
            <p className="text-xs text-[#667085] dark:text-[#94A3AF]">
              All generated copy is saved as a Draft until you review and approve it.
            </p>
          </div>
          {error && <div className="p-3 rounded-xl bg-[#E45B63]/10 text-xs text-[#E45B63]">{error}</div>}
          <div>
            <label htmlFor="mkt-tool" className="block text-xs font-medium mb-1">Marketing Tool</label>
            <select
              id="mkt-tool"
              value={toolType}
              onChange={(e) => setToolType(e.target.value)}
              className="w-full min-h-[42px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
            >
              {MARKETING_TOOLS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="mkt-prod" className="block text-xs font-medium mb-1">Product or Offer Name</label>
            <input
              id="mkt-prod"
              type="text"
              required
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Matte Charcoal Insulated Bottle"
              className="w-full min-h-[42px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
            />
          </div>
          <div>
            <label htmlFor="mkt-aud" className="block text-xs font-medium mb-1">Target Audience</label>
            <input
              id="mkt-aud"
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. Remote workers & gym commuters"
              className="w-full min-h-[42px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="mkt-tone" className="block text-xs font-medium mb-1">Brand Tone</label>
              <input
                id="mkt-tone"
                type="text"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full min-h-[40px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-xs"
              />
            </div>
            <div>
              <label htmlFor="mkt-folder" className="block text-xs font-medium mb-1">Folder</label>
              <input
                id="mkt-folder"
                type="text"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className="w-full min-h-[40px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-xs"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={generating}
            className="w-full min-h-[44px] rounded-xl bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4" />
            <span>{generating ? 'Generating Draft...' : 'Generate Draft Asset'}</span>
          </button>
        </form>

        <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 space-y-2">
          <h3 className="font-display font-semibold text-sm">Saved Content History ({assets.length})</h3>
          {assets.length === 0 ? (
            <p className="text-xs text-[#667085]">Generate your first marketing draft above.</p>
          ) : (
            <div className="divide-y divide-[#E6EBE8] dark:divide-[#1E2D36] max-h-64 overflow-y-auto">
              {assets.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAsset(a)}
                  className={`w-full text-left py-2.5 px-2 rounded-lg text-xs ${
                    selectedAsset?.id === a.id ? 'bg-[#F7F9F8] dark:bg-[#153C32]/30 font-semibold' : ''
                  }`}
                >
                  <div className="truncate">{a.title}</div>
                  <div className="text-[11px] text-[#667085] mt-0.5">
                    {a.folder} · {a.status === 'approved' ? 'Approved' : 'Draft (Needs Review)'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor Panel */}
      <div className="lg:col-span-7 bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 sm:p-6 flex flex-col">
        {!selectedAsset ? (
          <div className="flex-1 flex items-center justify-center text-sm text-[#667085] py-20">
            Select or generate a marketing draft to review, edit, and approve.
          </div>
        ) : (
          <div className="space-y-4 flex-1 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E6EBE8] dark:border-[#1E2D36]">
              <div>
                <div className="text-xs text-[#667085]">{selectedAsset.tool_type} · {selectedAsset.status === 'approved' ? 'Approved by Founder' : 'Draft — Review Required'}</div>
                <h3 className="font-display font-semibold text-base">{selectedAsset.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyContent(selectedAsset)}
                  className="min-h-[36px] px-3 rounded-lg border border-[#E6EBE8] dark:border-[#1E2D36] text-xs font-medium inline-flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedId === selectedAsset.id ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateAsset(selectedAsset, { status: selectedAsset.status === 'approved' ? 'draft' : 'approved', content: selectedAsset.content })}
                  className="min-h-[36px] px-3 rounded-lg bg-[#153C32] text-white text-xs font-semibold inline-flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5 text-[#43D9A3]" />
                  <span>{selectedAsset.status === 'approved' ? 'Approved' : 'Save & Approve'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteAsset(selectedAsset.id)}
                  aria-label="Delete asset"
                  className="min-h-[36px] px-2.5 rounded-lg border border-[#E6EBE8] dark:border-[#1E2D36] text-[#E45B63]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <textarea
              rows={16}
              value={selectedAsset.content}
              onChange={(e) => setSelectedAsset({ ...selectedAsset, content: e.target.value })}
              className="flex-1 w-full p-4 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm leading-relaxed font-sans"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => updateAsset(selectedAsset, { content: selectedAsset.content })}
                className="min-h-[40px] px-4 rounded-xl bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] text-xs font-semibold"
              >
                Save Edits
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
