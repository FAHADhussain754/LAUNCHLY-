import { useEffect, useState } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import type { PlansConfig, SubscriptionInfo, WorkspaceContext } from '../../types';

interface BillingViewProps {
  workspace: WorkspaceContext;
  onWorkspaceUpdated: (ctx: WorkspaceContext) => void;
}

interface PaymentRecord {
  id: number;
  amount_cents: number;
  currency: string;
  plan: string;
  billing_cycle: string;
  status: string;
  provider: string;
  provider_ref: string;
  created_at: string;
}

export function BillingView({ onWorkspaceUpdated }: BillingViewProps) {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [plans, setPlans] = useState<PlansConfig | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [gatewayMode, setGatewayMode] = useState<'sandbox' | 'live'>('sandbox');

  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'builder' | 'professional'>('builder');
  const [confirmSandbox, setConfirmSandbox] = useState(false);
  const [simulateOutcome, setSimulateOutcome] = useState<'succeeded' | 'failed'>('succeeded');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadBilling = async () => {
    const res = await apiRequest<{
      subscription: SubscriptionInfo;
      payments: PaymentRecord[];
      plans: PlansConfig;
      paymentGatewayMode: 'sandbox' | 'live';
    }>('/api/billing');
    setSubscription(res.subscription);
    setPayments(res.payments);
    setPlans(res.plans);
    setGatewayMode(res.paymentGatewayMode);
    if (res.subscription?.plan) setSelectedPlan(res.subscription.plan);
  };

  useEffect(() => {
    loadBilling();
  }, []);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await apiRequest<WorkspaceContext & { ref: string }>('/api/billing/checkout', {
        method: 'POST',
        body: { plan: selectedPlan, billingCycle: cycle, simulateOutcome, confirmSandbox },
      });
      setMessage(`Sandbox transaction ${res.ref} confirmed. Plan updated to ${selectedPlan}.`);
      setConfirmSandbox(false);
      onWorkspaceUpdated(res);
      await loadBilling();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed.');
      await loadBilling();
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    const res = await apiRequest<WorkspaceContext>('/api/billing/cancel', { method: 'POST' });
    setMessage('Subscription marked canceled.');
    onWorkspaceUpdated(res);
    await loadBilling();
  };

  return (
    <div className="space-y-6">
      {/* Sandbox Mode Notice */}
      <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 shrink-0 text-[#F5B942] mt-0.5" />
        <div className="text-xs text-[#667085] dark:text-[#94A3AF] leading-relaxed">
          <strong className="text-[#17212B] dark:text-[#F0F5F2]">Payment Adapter Mode: {gatewayMode === 'sandbox' ? 'Sandbox Test Mode' : 'Live Merchant Mode'}.</strong>{' '}
          Until a live payment provider secret (<code className="font-mono">STRIPE_SECRET_KEY</code>) is configured, subscription upgrades run through our transparent sandbox adapter and never charge real cards or fake live confirmations.
        </div>
      </div>

      {/* Current Subscription Status */}
      {subscription && (
        <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs text-[#667085]">Current Plan & Usage</div>
            <div className="font-display text-xl font-bold capitalize">
              {subscription.plan} · {subscription.billing_cycle} ({subscription.status})
            </div>
            <div className="text-xs font-mono tabular-nums text-[#153C32] dark:text-[#43D9A3]">
              AI Credits Used: {subscription.ai_credits_used} / {subscription.ai_credits_limit}
            </div>
          </div>
          {subscription.status !== 'canceled' && (
            <button
              type="button"
              onClick={handleCancel}
              className="min-h-[40px] px-4 rounded-xl border border-[#E45B63]/40 text-xs font-semibold text-[#E45B63]"
            >
              Cancel Subscription
            </button>
          )}
        </div>
      )}

      {/* Upgrade / Downgrade Checkout */}
      {plans && (
        <form onSubmit={handleCheckout} className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-display text-base font-semibold">Change Plan ({gatewayMode} checkout)</h3>
            <div className="inline-flex p-1 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1318] border border-[#E6EBE8] dark:border-[#1E2D36]">
              <button type="button" onClick={() => setCycle('monthly')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${cycle === 'monthly' ? 'bg-[#101C24] text-white dark:bg-[#43D9A3] dark:text-[#101C24]' : 'text-[#667085]'}`}>
                Monthly
              </button>
              <button type="button" onClick={() => setCycle('annual')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${cycle === 'annual' ? 'bg-[#101C24] text-white dark:bg-[#43D9A3] dark:text-[#101C24]' : 'text-[#667085]'}`}>
                Annual
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['starter', 'builder', 'professional'] as const).map((key) => {
              const p = plans[key];
              const price = cycle === 'annual' ? p.annualPrice : p.monthlyPrice;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedPlan(key)}
                  className={`text-left p-4 rounded-xl border transition-colors ${
                    selectedPlan === key
                      ? 'border-[#153C32] dark:border-[#43D9A3] bg-[#F7F9F8] dark:bg-[#153C32]/30'
                      : 'border-[#E6EBE8] dark:border-[#1E2D36]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-semibold">{p.name}</span>
                    {selectedPlan === key && <Check className="w-4 h-4 text-[#43D9A3]" />}
                  </div>
                  <div className="font-mono tabular-nums text-2xl font-bold mt-2">${price}<span className="text-xs font-normal text-[#667085]">/mo</span></div>
                  <div className="text-xs text-[#667085] mt-1 font-mono tabular-nums">{p.aiCredits} AI credits/mo</div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E6EBE8] dark:border-[#1E2D36]">
            <div>
              <label htmlFor="sim-outcome" className="block text-xs font-medium mb-1">Sandbox Payment Simulation</label>
              <select
                id="sim-outcome"
                value={simulateOutcome}
                onChange={(e) => setSimulateOutcome(e.target.value as 'succeeded' | 'failed')}
                className="w-full min-h-[40px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-xs"
              >
                <option value="succeeded">Simulate Confirmed Sandbox Payment</option>
                <option value="failed">Simulate Declined Payment (Test Failure Handling)</option>
              </select>
            </div>
            <label className="flex items-center gap-2.5 text-xs pt-5 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmSandbox}
                onChange={(e) => setConfirmSandbox(e.target.checked)}
                className="w-4 h-4"
              />
              <span>I confirm this is a sandbox billing test (no real card charge).</span>
            </label>
          </div>

          {error && <div className="p-3 rounded-xl bg-[#E45B63]/10 text-xs text-[#E45B63]">{error}</div>}
          {message && <div className="p-3 rounded-xl bg-[#43D9A3]/10 text-xs text-[#153C32] dark:text-[#43D9A3]">{message}</div>}

          <button
            type="submit"
            disabled={loading || !confirmSandbox}
            className="min-h-[44px] px-6 rounded-xl bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'Processing...' : `Apply ${plans[selectedPlan].name} (${cycle}) in Sandbox`}
          </button>
        </form>
      )}

      {/* Billing History */}
      <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 sm:p-6 space-y-3">
        <h3 className="font-display text-base font-semibold">Billing & Invoice Records</h3>
        {payments.length === 0 ? (
          <p className="text-sm text-[#667085]">No payment records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#E6EBE8] dark:border-[#1E2D36] text-[#667085]">
                  <th className="py-2 pr-3">Reference</th>
                  <th className="py-2 pr-3">Plan</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Provider</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EBE8] dark:divide-[#1E2D36]">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 pr-3 font-mono">{p.provider_ref}</td>
                    <td className="py-2.5 pr-3 capitalize">{p.plan} ({p.billing_cycle})</td>
                    <td className={`py-2.5 pr-3 font-medium ${p.status === 'succeeded' ? 'text-[#153C32] dark:text-[#43D9A3]' : 'text-[#E45B63]'}`}>
                      {p.status}
                    </td>
                    <td className="py-2.5 pr-3">{p.provider}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums">${(p.amount_cents / 100).toFixed(2)} {p.currency}</td>
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
