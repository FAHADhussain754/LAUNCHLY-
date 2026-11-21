import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';
import type { NotificationItem, PlansConfig, SupportTicket, WorkspaceContext } from '../../types';

// ==================== NOTIFICATIONS VIEW ====================
export function NotificationsView({ onMarkedRead }: { onMarkedRead: () => void }) {
  const [items, setItems] = useState<NotificationItem[]>([]);

  const load = async () => {
    const res = await apiRequest<{ notifications: NotificationItem[] }>('/api/notifications');
    setItems(res.notifications);
  };

  useEffect(() => {
    load();
  }, []);

  const markAllRead = async () => {
    await apiRequest('/api/notifications/mark-read', { method: 'POST', body: {} });
    await load();
    onMarkedRead();
  };

  return (
    <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Notifications</h2>
        <button type="button" onClick={markAllRead} className="text-xs font-semibold text-[#153C32] dark:text-[#43D9A3] hover:underline">
          Mark All Read
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-[#667085]">You are all caught up.</p>
      ) : (
        <div className="divide-y divide-[#E6EBE8] dark:divide-[#1E2D36]">
          {items.map((n) => (
            <div key={n.id} className={`py-3.5 ${n.read ? 'opacity-70' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-sm">{n.title}</div>
                <span className="text-[11px] font-mono text-[#667085]">{n.read ? 'Read' : 'Unread'}</span>
              </div>
              <p className="text-xs text-[#667085] dark:text-[#94A3AF] mt-1">{n.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== SETTINGS VIEW ====================
export function SettingsView({
  workspace,
  onUpdated,
  onAccountDeleted,
}: {
  workspace: WorkspaceContext;
  onUpdated: (ctx: WorkspaceContext) => void;
  onAccountDeleted: () => void;
}) {
  const [name, setName] = useState(workspace.user.name);
  const [country, setCountry] = useState(workspace.user.country || 'United States');
  const [language, setLanguage] = useState(workspace.user.language || 'English');
  const [prefs, setPrefs] = useState<Record<string, boolean>>(workspace.user.notification_prefs || {});
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [savedNotice, setSavedNotice] = useState('');

  useEffect(() => {
    apiRequest<{ tickets: SupportTicket[] }>('/api/support/tickets')
      .then((res) => setTickets(res.tickets))
      .catch(() => {});
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const ctx = await apiRequest<WorkspaceContext>('/api/account/profile', {
      method: 'PATCH',
      body: { name, country, language, notification_prefs: prefs },
    });
    onUpdated(ctx);
    setSavedNotice('Settings saved.');
  };

  const requestDeletion = async () => {
    await apiRequest('/api/account/delete-request', { method: 'POST' });
    onAccountDeleted();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={saveProfile} className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 sm:p-6 space-y-5">
        <h2 className="font-display text-lg font-semibold">Account Profile & Preferences</h2>
        {savedNotice && <div className="p-3 rounded-xl bg-[#43D9A3]/10 text-xs text-[#153C32] dark:text-[#43D9A3]">{savedNotice}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full min-h-[42px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Country</label>
            <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className="w-full min-h-[42px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Language</label>
            <input type="text" value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full min-h-[42px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm" />
          </div>
        </div>

        <div className="pt-2 border-t border-[#E6EBE8] dark:border-[#1E2D36] space-y-2">
          <div className="text-xs font-semibold">Notification Preferences</div>
          {['store', 'ai', 'tasks', 'billing'].map((key) => (
            <label key={key} className="flex items-center gap-2 text-xs capitalize cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(prefs[key])}
                onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })}
              />
              <span>{key} alerts and updates</span>
            </label>
          ))}
        </div>

        <button type="submit" className="min-h-[42px] px-5 rounded-xl bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] text-sm font-semibold">
          Save Changes
        </button>
      </form>

      <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 sm:p-6 space-y-3">
        <h3 className="font-display text-base font-semibold">Your Support Tickets</h3>
        {tickets.length === 0 ? (
          <p className="text-xs text-[#667085]">No support tickets recorded for {workspace.user.email}.</p>
        ) : (
          <div className="divide-y divide-[#E6EBE8] dark:divide-[#1E2D36]">
            {tickets.map((t) => (
              <div key={t.id} className="py-2.5 text-xs">
                <div className="font-semibold">{t.subject} · <span className="capitalize">{t.status}</span></div>
                <p className="text-[#667085] mt-0.5">{t.message}</p>
                {t.admin_reply && <p className="mt-1 text-[#153C32] dark:text-[#43D9A3]">Reply: {t.admin_reply}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {workspace.user.is_demo === 0 && (
        <div className="bg-white dark:bg-[#101C24] border border-[#E45B63]/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-sm text-[#E45B63]">Request Account Deletion</div>
            <p className="text-xs text-[#667085]">Deactivates your workspace and removes active session access.</p>
          </div>
          <button type="button" onClick={requestDeletion} className="min-h-[40px] px-4 rounded-xl border border-[#E45B63] text-xs font-semibold text-[#E45B63]">
            Delete My Account
          </button>
        </div>
      )}
    </div>
  );
}

// ==================== ADMIN CONTROL CENTER ====================
export function AdminControlCenter() {
  const [overview, setOverview] = useState<{
    metrics: { customersCount: number; activeSubs: number; sandboxRevenueUsd: number; aiCallsCount: number; openTickets: number; pendingExperts: number };
    integrations: { geminiConfigured: boolean; shopifyOAuthConfigured: boolean; stripeConfigured: boolean };
    auditLogs: Array<{ id: number; actor_email: string; action: string; details: string; created_at: string }>;
  } | null>(null);
  const [customers, setCustomers] = useState<Array<Record<string, unknown>>>([]);
  const [experts, setExperts] = useState<Array<{ id: number; name: string; category: string; approved: number; hourly_rate: number }>>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: number; name: string; country: string; verification_status: string }>>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [plans, setPlans] = useState<PlansConfig | null>(null);
  const [subTab, setSubTab] = useState<'overview' | 'customers' | 'experts' | 'suppliers' | 'tickets' | 'plans'>('overview');

  const loadAll = async () => {
    const [ov, cust, exp, sup, tix, bill] = await Promise.all([
      apiRequest<typeof overview>('/api/admin/overview'),
      apiRequest<{ customers: Array<Record<string, unknown>> }>('/api/admin/customers'),
      apiRequest<{ experts: typeof experts }>('/api/admin/experts'),
      apiRequest<{ suppliers: typeof suppliers }>('/api/admin/suppliers'),
      apiRequest<{ tickets: SupportTicket[] }>('/api/admin/tickets'),
      apiRequest<{ plans: PlansConfig }>('/api/public/plans'),
    ]);
    setOverview(ov);
    setCustomers(cust.customers);
    setExperts(exp.experts);
    setSuppliers(sup.suppliers);
    setTickets(tix.tickets);
    setPlans(bill.plans);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const toggleExpert = async (id: number, approved: boolean) => {
    await apiRequest(`/api/admin/experts/${id}/approve`, { method: 'PATCH', body: { approved } });
    await loadAll();
  };

  const setSupplierStatus = async (id: number, verification_status: string) => {
    await apiRequest(`/api/admin/suppliers/${id}/verify`, { method: 'PATCH', body: { verification_status } });
    await loadAll();
  };

  const resolveTicket = async (id: number) => {
    await apiRequest(`/api/admin/tickets/${id}`, {
      method: 'PATCH',
      body: { status: 'resolved', admin_reply: 'Reviewed by LAUNCHLY support team.' },
    });
    await loadAll();
  };

  const savePlans = async () => {
    if (!plans) return;
    await apiRequest('/api/admin/settings/plans', { method: 'PUT', body: { plans } });
    await loadAll();
  };

  if (!overview) return <p className="text-sm text-[#667085]">Loading Admin Control Center...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1.5 bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-3">
        {(
          [
            { id: 'overview', label: 'Overview & Audit Logs' },
            { id: 'customers', label: `Customers (${customers.length})` },
            { id: 'experts', label: `Experts (${experts.length})` },
            { id: 'suppliers', label: `Suppliers (${suppliers.length})` },
            { id: 'tickets', label: `Support (${tickets.length})` },
            { id: 'plans', label: 'Plan Settings' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold ${
              subTab === t.id ? 'bg-[#101C24] text-white dark:bg-[#43D9A3] dark:text-[#101C24]' : 'text-[#667085]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {[
              { label: 'Customers', val: overview.metrics.customersCount },
              { label: 'Active Subs', val: overview.metrics.activeSubs },
              { label: 'Sandbox Rev', val: `$${overview.metrics.sandboxRevenueUsd.toFixed(0)}` },
              { label: 'AI Requests', val: overview.metrics.aiCallsCount },
              { label: 'Open Tickets', val: overview.metrics.openTickets },
              { label: 'Pending Experts', val: overview.metrics.pendingExperts },
            ].map((m) => (
              <div key={m.label} className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-4">
                <div className="text-xs text-[#667085]">{m.label}</div>
                <div className="font-mono tabular-nums text-xl font-bold mt-1">{m.val}</div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 space-y-2 text-xs">
            <h3 className="font-display text-sm font-semibold mb-2">Integration Status Monitor</h3>
            <div>Gemini AI API: {overview.integrations.geminiConfigured ? 'Configured' : 'Missing GEMINI_API_KEY'}</div>
            <div>Shopify OAuth: {overview.integrations.shopifyOAuthConfigured ? 'Configured' : 'Not configured (staging mode active)'}</div>
            <div>Stripe Merchant Billing: {overview.integrations.stripeConfigured ? 'Live' : 'Sandbox Test Mode'}</div>
          </div>

          <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 space-y-3">
            <h3 className="font-display text-sm font-semibold">Recent Security Audit Logs</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#E6EBE8] dark:border-[#1E2D36] text-[#667085]">
                    <th className="py-2 pr-3">Time</th>
                    <th className="py-2 pr-3">Actor</th>
                    <th className="py-2 pr-3">Action</th>
                    <th className="py-2">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EBE8] dark:divide-[#1E2D36]">
                  {overview.auditLogs.map((l) => (
                    <tr key={l.id}>
                      <td className="py-2 pr-3 font-mono">{l.created_at}</td>
                      <td className="py-2 pr-3">{l.actor_email}</td>
                      <td className="py-2 pr-3 font-mono">{l.action}</td>
                      <td className="py-2 text-[#667085]">{l.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === 'customers' && (
        <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#E6EBE8] dark:border-[#1E2D36] text-[#667085]">
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Business</th>
                <th className="py-2 pr-3">Plan</th>
                <th className="py-2">AI Usage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6EBE8] dark:divide-[#1E2D36]">
              {customers.map((c) => (
                <tr key={String(c.id)}>
                  <td className="py-2.5 pr-3">{String(c.name)} ({String(c.email)})</td>
                  <td className="py-2.5 pr-3">{String(c.business_name || '')} · {String(c.model || '')}</td>
                  <td className="py-2.5 pr-3 capitalize">{String(c.plan || '')} ({String(c.sub_status || '')})</td>
                  <td className="py-2.5 font-mono tabular-nums">{String(c.ai_credits_used ?? 0)} / {String(c.ai_credits_limit ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'experts' && (
        <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 divide-y divide-[#E6EBE8] dark:divide-[#1E2D36]">
          {experts.map((e) => (
            <div key={e.id} className="py-3 flex items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-semibold text-sm">{e.name} · {e.category}</div>
                <div className="text-[#667085]">Rate: ${e.hourly_rate}/hr · Status: {e.approved ? 'Approved' : 'Pending Admin Approval'}</div>
              </div>
              <button
                type="button"
                onClick={() => toggleExpert(e.id, e.approved === 0)}
                className="min-h-[36px] px-3 rounded-lg border border-[#E6EBE8] dark:border-[#1E2D36] font-semibold"
              >
                {e.approved ? 'Revoke Approval' : 'Approve Expert'}
              </button>
            </div>
          ))}
        </div>
      )}

      {subTab === 'suppliers' && (
        <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 divide-y divide-[#E6EBE8] dark:divide-[#1E2D36]">
          {suppliers.map((s) => (
            <div key={s.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-semibold text-sm">{s.name} ({s.country})</div>
                <div className="text-[#667085]">Current status: {s.verification_status}</div>
              </div>
              <select
                value={s.verification_status}
                onChange={(e) => setSupplierStatus(s.id, e.target.value)}
                className="min-h-[36px] px-2.5 rounded-lg border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318]"
              >
                <option value="verified">verified</option>
                <option value="manually_reviewed">manually_reviewed</option>
                <option value="unverified">unverified</option>
              </select>
            </div>
          ))}
        </div>
      )}

      {subTab === 'tickets' && (
        <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 divide-y divide-[#E6EBE8] dark:divide-[#1E2D36]">
          {tickets.length === 0 ? (
            <p className="text-xs text-[#667085]">No support tickets yet.</p>
          ) : (
            tickets.map((t) => (
              <div key={t.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-semibold text-sm">{t.subject} · {t.email}</div>
                  <div className="text-[#667085]">{t.message}</div>
                </div>
                {t.status !== 'resolved' ? (
                  <button type="button" onClick={() => resolveTicket(t.id)} className="min-h-[36px] px-3 rounded-lg bg-[#153C32] text-white font-semibold">
                    Mark Resolved
                  </button>
                ) : (
                  <span className="text-[#43D9A3]">Resolved</span>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {subTab === 'plans' && plans && (
        <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 space-y-4">
          <h3 className="font-display text-base font-semibold">Configurable Subscription Pricing</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['starter', 'builder', 'professional'] as const).map((k) => (
              <div key={k} className="p-4 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] space-y-2 text-xs">
                <div className="font-semibold text-sm capitalize">{k}</div>
                <label className="block">Monthly USD
                  <input
                    type="number"
                    value={plans[k].monthlyPrice}
                    onChange={(e) => setPlans({ ...plans, [k]: { ...plans[k], monthlyPrice: Number(e.target.value) } })}
                    className="w-full mt-1 min-h-[36px] px-2.5 rounded-lg border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] font-mono"
                  />
                </label>
                <label className="block">AI Credits / mo
                  <input
                    type="number"
                    value={plans[k].aiCredits}
                    onChange={(e) => setPlans({ ...plans, [k]: { ...plans[k], aiCredits: Number(e.target.value) } })}
                    className="w-full mt-1 min-h-[36px] px-2.5 rounded-lg border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] font-mono"
                  />
                </label>
              </div>
            ))}
          </div>
          <button type="button" onClick={savePlans} className="min-h-[42px] px-5 rounded-xl bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] text-xs font-semibold">
            Save Plan Configuration
          </button>
        </div>
      )}
    </div>
  );
}
