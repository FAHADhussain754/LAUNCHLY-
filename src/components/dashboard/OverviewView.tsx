import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Circle, Sparkles, Store, Package, Truck } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import type { DashboardTab, NotificationItem, TaskItem, WorkspaceContext } from '../../types';

interface OverviewViewProps {
  workspace: WorkspaceContext;
  onSelectTab: (tab: DashboardTab) => void;
  onResumeOnboarding: () => void;
  onRefreshWorkspace: () => void;
}

export function OverviewView({
  workspace,
  onSelectTab,
  onResumeOnboarding,
  onRefreshWorkspace,
}: OverviewViewProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiRequest<{ tasks: TaskItem[] }>('/api/tasks'),
      apiRequest<{ notifications: NotificationItem[] }>('/api/notifications'),
    ])
      .then(([t, n]) => {
        setTasks(t.tasks);
        setNotifications(n.notifications.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleTask = async (task: TaskItem) => {
    await apiRequest(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      body: { completed: task.completed === 0 },
    });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: t.completed ? 0 : 1 } : t)));
    onRefreshWorkspace();
  };

  const pendingTasks = tasks.filter((t) => t.completed === 0);
  const completedCount = tasks.filter((t) => t.completed === 1).length;
  const computedProgress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : workspace.business?.launch_progress || 10;

  const nextTask = pendingTasks[0];
  const aiRemaining = Math.max(0, (workspace.subscription?.ai_credits_limit || 0) - (workspace.subscription?.ai_credits_used || 0));

  return (
    <div className="space-y-6">
      {/* Header Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#101C24] dark:text-[#F0F5F2]">
            Welcome back, {workspace.user.name.split(' ')[0]}!
          </h2>
          <p className="text-sm text-[#667085] dark:text-[#94A3AF] mt-1">
            {workspace.business?.name} · {workspace.business?.model} · Stage: {workspace.business?.stage}
          </p>
        </div>
        {workspace.onboarding?.completed === 0 && (
          <button
            type="button"
            onClick={onResumeOnboarding}
            className="min-h-[44px] px-4 rounded-xl bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] text-sm font-semibold whitespace-nowrap"
          >
            Complete Onboarding Profile
          </button>
        )}
      </div>

      {/* Helpful Next Step Card */}
      <div className="bg-white dark:bg-[#101C24] border border-[#153C32]/30 dark:border-[#43D9A3]/30 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-[#153C32] dark:text-[#43D9A3]">Recommended Next Step</div>
          <div className="font-display text-lg font-semibold">
            {workspace.onboarding?.completed === 0
              ? 'Complete your 4-step business profile to tailor your launch roadmap.'
              : nextTask
                ? nextTask.title
                : 'Explore Product Research or open LAUNCHLY AI to validate your next step.'}
          </div>
          <p className="text-xs text-[#667085] dark:text-[#94A3AF]">
            Niche: {workspace.business?.niche || 'Not selected yet'} · Target Market: {workspace.business?.target_countries}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (workspace.onboarding?.completed === 0) onResumeOnboarding();
            else if (nextTask) onSelectTab('business');
            else onSelectTab('ai');
          }}
          className="min-h-[44px] px-5 rounded-xl bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] text-sm font-semibold inline-flex items-center justify-center gap-2 shrink-0"
        >
          <span>{workspace.onboarding?.completed === 0 ? 'Continue Onboarding' : nextTask ? 'Open Task Checklist' : 'Ask LAUNCHLY AI'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Key Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5">
          <div className="text-xs text-[#667085] dark:text-[#94A3AF]">Launch Progress</div>
          <div className="font-mono tabular-nums text-2xl font-bold mt-1">{computedProgress}%</div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-[#E6EBE8] dark:bg-[#1E2D36] overflow-hidden">
            <div className="h-full bg-[#43D9A3]" style={{ width: `${computedProgress}%` }} />
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSelectTab('products')}
          className="text-left bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 hover:border-[#153C32] dark:hover:border-[#43D9A3] transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-[#667085] dark:text-[#94A3AF]">
            <span>Saved Products</span>
            <Package className="w-4 h-4" />
          </div>
          <div className="font-mono tabular-nums text-2xl font-bold mt-1">{workspace.counts.savedProducts}</div>
          <div className="text-xs text-[#153C32] dark:text-[#43D9A3] mt-1">Open Research Center →</div>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('store')}
          className="text-left bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 hover:border-[#153C32] dark:hover:border-[#43D9A3] transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-[#667085] dark:text-[#94A3AF]">
            <span>Connected Stores / Suppliers</span>
            <Store className="w-4 h-4" />
          </div>
          <div className="font-mono tabular-nums text-2xl font-bold mt-1">
            {workspace.counts.connectedStores} / {workspace.counts.supplierConnections}
          </div>
          <div className="text-xs text-[#667085] dark:text-[#94A3AF] mt-1">Manage integrations →</div>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('billing')}
          className="text-left bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 hover:border-[#153C32] dark:hover:border-[#43D9A3] transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-[#667085] dark:text-[#94A3AF]">
            <span>AI Credits Remaining</span>
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="font-mono tabular-nums text-2xl font-bold mt-1">{aiRemaining}</div>
          <div className="text-xs text-[#667085] dark:text-[#94A3AF] mt-1 capitalize">
            {workspace.subscription?.plan} ({workspace.subscription?.status})
          </div>
        </button>
      </div>

      {/* Tasks + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-base">Pending Launch Tasks ({pendingTasks.length})</h3>
            <button type="button" onClick={() => onSelectTab('business')} className="text-xs font-semibold text-[#153C32] dark:text-[#43D9A3] hover:underline">
              Manage All
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-[#667085]">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-[#667085]">No tasks yet. Add tasks in My Business.</p>
          ) : (
            <div className="divide-y divide-[#E6EBE8] dark:divide-[#1E2D36]">
              {tasks.slice(0, 6).map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => toggleTask(task)}
                  className="w-full min-h-[48px] py-3 flex items-center gap-3 text-left hover:bg-[#F7F9F8] dark:hover:bg-[#0B1318] px-2 rounded-lg transition-colors"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-[#43D9A3]" />
                  ) : (
                    <Circle className="w-5 h-5 shrink-0 text-[#667085]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-medium truncate ${task.completed ? 'line-through text-[#667085]' : ''}`}>
                      {task.title}
                    </div>
                    <div className="text-xs text-[#667085] dark:text-[#94A3AF]">
                      {task.phase} · Priority: {task.priority}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-base">Recent Activity</h3>
            <button type="button" onClick={() => onSelectTab('notifications')} className="text-xs font-semibold text-[#153C32] dark:text-[#43D9A3] hover:underline">
              View All
            </button>
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-[#667085]">No recent notifications.</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div key={n.id} className="pb-3 border-b border-[#E6EBE8] dark:border-[#1E2D36] last:border-0 last:pb-0">
                  <div className="text-sm font-medium">{n.title}</div>
                  <p className="text-xs text-[#667085] dark:text-[#94A3AF] mt-0.5">{n.message}</p>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-[#E6EBE8] dark:border-[#1E2D36] grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onSelectTab('suppliers')}
              className="min-h-[44px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] text-xs font-medium flex items-center justify-center gap-1.5 hover:border-[#153C32]"
            >
              <Truck className="w-4 h-4" />
              <span>Suppliers</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('marketing')}
              className="min-h-[44px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] text-xs font-medium flex items-center justify-center gap-1.5 hover:border-[#153C32]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Marketing Studio</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
