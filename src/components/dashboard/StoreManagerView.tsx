import { useEffect, useState } from 'react';
import { Store, Check, AlertCircle, Trash2 } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import type { ImportedProductItem, StoreItem } from '../../types';

interface StoreManagerViewProps {
  onWorkspaceChanged: () => void;
}

export function StoreManagerView({ onWorkspaceChanged }: StoreManagerViewProps) {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [imported, setImported] = useState<ImportedProductItem[]>([]);
  const [oauthConfigured, setOauthConfigured] = useState(false);

  const [shopDomain, setShopDomain] = useState('');
  const [storeName, setStoreName] = useState('');
  const [error, setError] = useState('');

  // Draft import form
  const [selectedStoreId, setSelectedStoreId] = useState<number | ''>('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [draftPrice, setDraftPrice] = useState('34.00');

  // Confirmation gate
  const [confirmItem, setConfirmItem] = useState<ImportedProductItem | null>(null);
  const [confirmNotice, setConfirmNotice] = useState('');

  const loadStores = async () => {
    const res = await apiRequest<{ stores: StoreItem[]; importedProducts: ImportedProductItem[]; shopifyOAuthConfigured: boolean }>('/api/stores');
    setStores(res.stores);
    setImported(res.importedProducts);
    setOauthConfigured(res.shopifyOAuthConfigured);
    if (res.stores.length > 0 && !selectedStoreId) {
      setSelectedStoreId(res.stores[0].id);
    }
  };

  useEffect(() => {
    loadStores();
  }, []);

  const connectStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await apiRequest('/api/stores/connect', {
        method: 'POST',
        body: { platform: 'shopify', shopDomain, storeName },
      });
      setShopDomain('');
      setStoreName('');
      await loadStores();
      onWorkspaceChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register store.');
    }
  };

  const disconnectStore = async (id: number) => {
    await apiRequest(`/api/stores/${id}`, { method: 'DELETE' });
    await loadStores();
    onWorkspaceChanged();
  };

  const createDraftImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreId) return;
    await apiRequest(`/api/stores/${selectedStoreId}/import-product`, {
      method: 'POST',
      body: { title: draftTitle, description: draftDesc, price: Number(draftPrice || 0) },
    });
    setDraftTitle('');
    setDraftDesc('');
    await loadStores();
  };

  const confirmAndSync = async () => {
    if (!confirmItem) return;
    const res = await apiRequest<{ requiresShopifyOAuth: boolean }>(`/api/stores/imported/${confirmItem.id}/confirm-sync`, {
      method: 'POST',
      body: {
        confirmed: true,
        title: confirmItem.title,
        description: confirmItem.description,
        price: confirmItem.price,
      },
    });
    setConfirmItem(null);
    setConfirmNotice(
      res.requiresShopifyOAuth
        ? 'Draft changes confirmed and saved locally. Configure SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET to push live updates via Shopify OAuth.'
        : 'Product changes confirmed and synced to your Shopify store.'
    );
    await loadStores();
  };

  return (
    <div className="space-y-6">
      {/* Shopify OAuth Transparency Card */}
      <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold">Store Manager · Shopify Integration</h2>
            <p className="text-xs text-[#667085] dark:text-[#94A3AF]">
              Uses official Shopify OAuth scopes. LAUNCHLY never asks for your Shopify password and always requires explicit confirmation before modifying store listings.
            </p>
          </div>
          <span className={`text-xs font-medium ${oauthConfigured ? 'text-[#153C32] dark:text-[#43D9A3]' : 'text-[#F5B942]'}`}>
            {oauthConfigured ? 'Shopify OAuth Credentials Active' : 'OAuth Credentials Not Configured'}
          </span>
        </div>

        {!oauthConfigured && (
          <div className="p-3.5 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1318] border border-[#E6EBE8] dark:border-[#1E2D36] text-xs text-[#667085] dark:text-[#94A3AF] flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#F5B942]" />
            <span>
              To enable live Shopify OAuth authorization, configure <code className="font-mono">SHOPIFY_CLIENT_ID</code> and <code className="font-mono">SHOPIFY_CLIENT_SECRET</code> in Settings → Secrets. You can still stage store domains and product drafts below.
            </span>
          </div>
        )}

        {error && <p className="text-xs text-[#E45B63]">{error}</p>}

        <form onSubmit={connectStore} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <input
            type="text"
            required
            value={shopDomain}
            onChange={(e) => setShopDomain(e.target.value)}
            placeholder="your-brand.myshopify.com"
            className="sm:col-span-5 min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
          />
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="Store Display Name (optional)"
            className="sm:col-span-4 min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
          />
          <button
            type="submit"
            className="sm:col-span-3 min-h-[44px] rounded-xl bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] text-sm font-semibold"
          >
            {oauthConfigured ? 'Authorize Shopify OAuth' : 'Stage Shopify Domain'}
          </button>
        </form>
      </div>

      {/* Connected / Staged Stores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stores.map((s) => (
          <div key={s.id} className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Store className="w-5 h-5 shrink-0 text-[#153C32] dark:text-[#43D9A3]" />
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{s.store_name}</div>
                <div className="text-xs text-[#667085] truncate">{s.shop_domain}</div>
                <div className="text-xs mt-0.5 text-[#153C32] dark:text-[#43D9A3]">
                  Status: {s.status === 'connected' ? 'Connected via OAuth' : 'Awaiting Shopify OAuth Credentials'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => disconnectStore(s.id)}
              className="min-h-[40px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] text-xs font-medium text-[#E45B63] inline-flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          </div>
        ))}
        <div className="bg-[#F7F9F8] dark:bg-[#0B1318] border border-dashed border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5">
          <div className="text-sm font-semibold">WooCommerce & Multi-Channel Adapter</div>
          <p className="text-xs text-[#667085] dark:text-[#94A3AF] mt-1">
            Planned REST/OAuth adapter architecture. Available after Shopify merchant workflow setup.
          </p>
        </div>
      </div>

      {/* Product Drafts & Confirmation-Required Sync */}
      {stores.length > 0 && (
        <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 sm:p-6 space-y-5">
          <h3 className="font-display text-base font-semibold">Stage Product Import & Descriptions</h3>
          {confirmNotice && (
            <div className="p-3 rounded-xl bg-[#43D9A3]/10 border border-[#43D9A3]/30 text-xs">{confirmNotice}</div>
          )}
          <form onSubmit={createDraftImport} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(Number(e.target.value))}
              className="sm:col-span-3 min-h-[40px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
            >
              {stores.map((s) => <option key={s.id} value={s.id}>{s.store_name}</option>)}
            </select>
            <input
              type="text"
              required
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Product title"
              className="sm:col-span-4 min-h-[40px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
            />
            <input
              type="number"
              step="0.01"
              value={draftPrice}
              onChange={(e) => setDraftPrice(e.target.value)}
              placeholder="Price"
              className="sm:col-span-2 min-h-[40px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm font-mono tabular-nums"
            />
            <button
              type="submit"
              className="sm:col-span-3 min-h-[40px] rounded-xl bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] text-xs font-semibold"
            >
              Create Product Draft
            </button>
            <textarea
              rows={2}
              value={draftDesc}
              onChange={(e) => setDraftDesc(e.target.value)}
              placeholder="Product description for review..."
              className="sm:col-span-12 p-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
            />
          </form>

          <div className="divide-y divide-[#E6EBE8] dark:divide-[#1E2D36]">
            {imported.map((item) => (
              <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-sm">{item.title} · <span className="font-mono tabular-nums">${item.price.toFixed(2)}</span></div>
                  <div className="text-xs text-[#667085] dark:text-[#94A3AF]">{item.description || 'No description yet'}</div>
                  <div className="text-xs text-[#153C32] dark:text-[#43D9A3] mt-0.5">Status: {item.sync_status}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmItem(item)}
                  className="min-h-[40px] px-4 rounded-xl border border-[#153C32] dark:border-[#43D9A3] text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Review & Confirm Store Sync</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explicit Confirmation Modal */}
      {confirmItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold">Confirm Store Product Modification</h3>
            <p className="text-xs text-[#667085] dark:text-[#94A3AF]">
              LAUNCHLY requires your explicit confirmation before modifying or syncing listings to your store.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                value={confirmItem.title}
                onChange={(e) => setConfirmItem({ ...confirmItem, title: e.target.value })}
                className="w-full min-h-[40px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
              />
              <textarea
                rows={3}
                value={confirmItem.description}
                onChange={(e) => setConfirmItem({ ...confirmItem, description: e.target.value })}
                className="w-full p-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmItem(null)} className="min-h-[40px] px-4 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] text-xs font-medium">
                Cancel
              </button>
              <button type="button" onClick={confirmAndSync} className="min-h-[40px] px-4 rounded-xl bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] text-xs font-semibold">
                Confirm & Apply Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
