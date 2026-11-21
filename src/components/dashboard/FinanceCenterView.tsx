import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import type { FinancialRecord } from '../../types';

const REFERENCE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.39,
  AUD: 1.53,
  PKR: 278.5,
};

export function FinanceCenterView() {
  const [records, setRecords] = useState<FinancialRecord[]>([]);

  // Unit economics calculator
  const [sellPrice, setSellPrice] = useState(42);
  const [productCost, setProductCost] = useState(12.5);
  const [shippingCost, setShippingCost] = useState(5.0);
  const [adCpa, setAdCpa] = useState(10.0);
  const [targetCurrency, setTargetCurrency] = useState('USD');

  // Ledger form
  const [recordType, setRecordType] = useState<'actual_revenue' | 'actual_expense' | 'projection'>('actual_expense');
  const [category, setCategory] = useState('Samples');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().slice(0, 10));

  const loadRecords = async () => {
    const res = await apiRequest<{ records: FinancialRecord[] }>('/api/finance/records');
    setRecords(res.records);
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const addRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (Number.isNaN(num) || num <= 0) return;
    const res = await apiRequest<{ record: FinancialRecord }>('/api/finance/records', {
      method: 'POST',
      body: { record_type: recordType, category, description, amount: num, currency: 'USD', record_date: recordDate },
    });
    setRecords((prev) => [res.record, ...prev]);
    setDescription('');
    setAmount('');
  };

  const removeRecord = async (id: number) => {
    await apiRequest(`/api/finance/records/${id}`, { method: 'DELETE' });
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const paymentFee = sellPrice * 0.029 + 0.3;
  const grossProfitBeforeAds = sellPrice - productCost - shippingCost - paymentFee;
  const netProfitAfterAds = grossProfitBeforeAds - adCpa;
  const grossMarginPct = sellPrice > 0 ? (grossProfitBeforeAds / sellPrice) * 100 : 0;
  const breakEvenRoas = grossProfitBeforeAds > 0 ? sellPrice / grossProfitBeforeAds : 0;
  const rate = REFERENCE_RATES[targetCurrency] || 1;

  const actualRevenue = records.filter((r) => r.record_type === 'actual_revenue').reduce((s, r) => s + r.amount, 0);
  const actualExpenses = records.filter((r) => r.record_type === 'actual_expense').reduce((s, r) => s + r.amount, 0);
  const projections = records.filter((r) => r.record_type === 'projection').reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6">
      {/* Interactive Unit-Economics Calculator */}
      <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold">Finance Center · Unit Economics Calculator</h2>
            <p className="text-xs text-[#667085] dark:text-[#94A3AF]">
              Estimates include 2.9% + $0.30 standard card processing fee. Reference exchange rates as of 2026-11-21 (informational only).
            </p>
          </div>
          <select
            value={targetCurrency}
            onChange={(e) => setTargetCurrency(e.target.value)}
            aria-label="Display currency"
            className="min-h-[40px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-xs font-mono"
          >
            {Object.keys(REFERENCE_RATES).map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="calc-sell" className="block text-xs font-medium mb-1">Selling Price (USD)</label>
            <input id="calc-sell" type="number" step="0.5" value={sellPrice} onChange={(e) => setSellPrice(Number(e.target.value))} className="w-full min-h-[42px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] font-mono tabular-nums text-sm" />
          </div>
          <div>
            <label htmlFor="calc-cost" className="block text-xs font-medium mb-1">Supplier Unit Cost (USD)</label>
            <input id="calc-cost" type="number" step="0.5" value={productCost} onChange={(e) => setProductCost(Number(e.target.value))} className="w-full min-h-[42px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] font-mono tabular-nums text-sm" />
          </div>
          <div>
            <label htmlFor="calc-ship" className="block text-xs font-medium mb-1">Shipping Cost (USD)</label>
            <input id="calc-ship" type="number" step="0.5" value={shippingCost} onChange={(e) => setShippingCost(Number(e.target.value))} className="w-full min-h-[42px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] font-mono tabular-nums text-sm" />
          </div>
          <div>
            <label htmlFor="calc-cpa" className="block text-xs font-medium mb-1">Est. Ad Cost / Order (USD)</label>
            <input id="calc-cpa" type="number" step="0.5" value={adCpa} onChange={(e) => setAdCpa(Number(e.target.value))} className="w-full min-h-[42px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] font-mono tabular-nums text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-[#E6EBE8] dark:border-[#1E2D36]">
          <div>
            <div className="text-xs text-[#667085]">Est. Gross Margin (Pre-Ads)</div>
            <div className="font-mono tabular-nums text-xl font-bold mt-0.5">{grossMarginPct.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-xs text-[#667085]">Gross Profit / Order</div>
            <div className="font-mono tabular-nums text-xl font-bold mt-0.5">
              {(grossProfitBeforeAds * rate).toFixed(2)} {targetCurrency}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#667085]">Est. Net Profit (Post-Ads)</div>
            <div className={`font-mono tabular-nums text-xl font-bold mt-0.5 ${netProfitAfterAds >= 0 ? 'text-[#153C32] dark:text-[#43D9A3]' : 'text-[#E45B63]'}`}>
              {(netProfitAfterAds * rate).toFixed(2)} {targetCurrency}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#667085]">Break-Even ROAS</div>
            <div className="font-mono tabular-nums text-xl font-bold mt-0.5">
              {breakEvenRoas > 0 ? `${breakEvenRoas.toFixed(2)}x` : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Actuals vs Projections P&L Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5">
          <div className="text-xs text-[#667085]">Actual Recorded Revenue (USD)</div>
          <div className="font-mono tabular-nums text-2xl font-bold mt-1 text-[#153C32] dark:text-[#43D9A3]">${actualRevenue.toFixed(2)}</div>
        </div>
        <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5">
          <div className="text-xs text-[#667085]">Actual Recorded Expenses (USD)</div>
          <div className="font-mono tabular-nums text-2xl font-bold mt-1">${actualExpenses.toFixed(2)}</div>
        </div>
        <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5">
          <div className="text-xs text-[#667085]">Planned Projections (Separate from Actuals)</div>
          <div className="font-mono tabular-nums text-2xl font-bold mt-1 text-[#F5B942]">${projections.toFixed(2)}</div>
        </div>
      </div>

      {/* Financial Ledger */}
      <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 sm:p-6 space-y-4">
        <h3 className="font-display text-base font-semibold">Financial Ledger (Actuals & Projections)</h3>
        <form onSubmit={addRecord} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <select value={recordType} onChange={(e) => setRecordType(e.target.value as 'actual_revenue' | 'actual_expense' | 'projection')} className="sm:col-span-3 min-h-[42px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-xs font-medium">
            <option value="actual_expense">Actual Expense</option>
            <option value="actual_revenue">Actual Revenue</option>
            <option value="projection">Planned Projection</option>
          </select>
          <input type="text" required value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" className="sm:col-span-2 min-h-[42px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm" />
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="sm:col-span-3 min-h-[42px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm" />
          <input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount USD" className="sm:col-span-2 min-h-[42px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] font-mono tabular-nums text-sm" />
          <input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} className="sm:col-span-1 min-h-[42px] px-2 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-xs" />
          <button type="submit" aria-label="Add financial entry" className="sm:col-span-1 min-h-[42px] rounded-xl bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </button>
        </form>

        {records.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#667085]">No financial records logged yet. Add your first sample cost, revenue, or projection above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#E6EBE8] dark:border-[#1E2D36] text-[#667085]">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Classification</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Description</th>
                  <th className="py-2 pr-3 text-right">Amount</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EBE8] dark:divide-[#1E2D36]">
                {records.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 pr-3 font-mono tabular-nums">{r.record_date}</td>
                    <td className="py-2.5 pr-3">
                      {r.record_type === 'actual_revenue' ? 'Actual Revenue' : r.record_type === 'actual_expense' ? 'Actual Expense' : 'Projection (Estimate)'}
                    </td>
                    <td className="py-2.5 pr-3 font-medium">{r.category}</td>
                    <td className="py-2.5 pr-3 text-[#667085]">{r.description}</td>
                    <td className="py-2.5 pr-3 text-right font-mono tabular-nums font-semibold">${r.amount.toFixed(2)} {r.currency}</td>
                    <td className="py-2.5 text-right">
                      <button type="button" onClick={() => removeRecord(r.id)} aria-label="Remove entry" className="text-[#667085] hover:text-[#E45B63]">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
