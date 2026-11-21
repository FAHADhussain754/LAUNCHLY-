import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import type { TaskItem, WorkspaceContext } from '../../types';

interface BusinessRoadmapViewProps {
  workspace: WorkspaceContext;
  onUpdated: (ctx: WorkspaceContext) => void;
}

const PHASES = ['Planning', 'Product research', 'Suppliers', 'Store setup', 'Marketing', 'Launch', 'Growth'];

export function BusinessRoadmapView({ workspace, onUpdated }: BusinessRoadmapViewProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [activePhase, setActivePhase] = useState<string>('All');
  const [newTitle, setNewTitle] = useState('');
  const [newPhase, setNewPhase] = useState('Planning');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newDue, setNewDue] = useState('');

  const [bizForm, setBizForm] = useState({
    name: workspace.business?.name || '',
    model: workspace.business?.model || 'General E-commerce',
    niche: workspace.business?.niche || '',
    target_countries: workspace.business?.target_countries || '',
    stage: workspace.business?.stage || 'Planning',
  });
  const [savingBiz, setSavingBiz] = useState(false);

  const loadTasks = async () => {
    const res = await apiRequest<{ tasks: TaskItem[] }>('/api/tasks');
    setTasks(res.tasks);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const saveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBiz(true);
    try {
      const ctx = await apiRequest<WorkspaceContext>('/api/business', {
        method: 'PATCH',
        body: bizForm,
      });
      onUpdated(ctx);
    } finally {
      setSavingBiz(false);
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const res = await apiRequest<{ task: TaskItem }>('/api/tasks', {
      method: 'POST',
      body: { title: newTitle, phase: newPhase, priority: newPriority, due_date: newDue || null },
    });
    setTasks((prev) => [res.task, ...prev]);
    setNewTitle('');
    setNewDue('');
  };

  const toggleTask = async (t: TaskItem) => {
    const res = await apiRequest<{ task: TaskItem }>(`/api/tasks/${t.id}`, {
      method: 'PATCH',
      body: { completed: t.completed === 0 },
    });
    setTasks((prev) => prev.map((x) => (x.id === t.id ? res.task : x)));
  };

  const removeTask = async (id: number) => {
    await apiRequest(`/api/tasks/${id}`, { method: 'DELETE' });
    setTasks((prev) => prev.filter((x) => x.id !== id));
  };

  const filtered = activePhase === 'All' ? tasks : tasks.filter((t) => t.phase === activePhase);

  return (
    <div className="space-y-6">
      {/* Business Profile Editor */}
      <form
        onSubmit={saveBusiness}
        className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold">My Business Profile</h2>
            <p className="text-xs text-[#667085] dark:text-[#94A3AF]">LAUNCHLY AI uses these details to personalize advice and research.</p>
          </div>
          <button
            type="submit"
            disabled={savingBiz}
            className="min-h-[40px] px-4 rounded-xl bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] text-xs font-semibold"
          >
            {savingBiz ? 'Saving...' : 'Save Business Profile'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label htmlFor="biz-name" className="block text-xs font-medium mb-1">Business Name</label>
            <input
              id="biz-name"
              type="text"
              value={bizForm.name}
              onChange={(e) => setBizForm({ ...bizForm, name: e.target.value })}
              className="w-full min-h-[40px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
            />
          </div>
          <div>
            <label htmlFor="biz-model" className="block text-xs font-medium mb-1">Business Model</label>
            <select
              id="biz-model"
              value={bizForm.model}
              onChange={(e) => setBizForm({ ...bizForm, model: e.target.value })}
              className="w-full min-h-[40px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
            >
              <option>Dropshipping</option>
              <option>Print on Demand</option>
              <option>Private Label</option>
              <option>General E-commerce</option>
              <option>Other online business</option>
            </select>
          </div>
          <div>
            <label htmlFor="biz-niche" className="block text-xs font-medium mb-1">Selected Niche</label>
            <input
              id="biz-niche"
              type="text"
              value={bizForm.niche}
              onChange={(e) => setBizForm({ ...bizForm, niche: e.target.value })}
              placeholder="e.g. Home Office"
              className="w-full min-h-[40px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
            />
          </div>
          <div>
            <label htmlFor="biz-countries" className="block text-xs font-medium mb-1">Target Market</label>
            <input
              id="biz-countries"
              type="text"
              value={bizForm.target_countries}
              onChange={(e) => setBizForm({ ...bizForm, target_countries: e.target.value })}
              className="w-full min-h-[40px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
            />
          </div>
          <div>
            <label htmlFor="biz-stage" className="block text-xs font-medium mb-1">Current Stage</label>
            <select
              id="biz-stage"
              value={bizForm.stage}
              onChange={(e) => setBizForm({ ...bizForm, stage: e.target.value })}
              className="w-full min-h-[40px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
            >
              {PHASES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </form>

      {/* Task Manager */}
      <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Business Task Manager</h2>
          <div className="flex flex-wrap gap-1.5">
            {['All', ...PHASES].map((phase) => (
              <button
                key={phase}
                type="button"
                onClick={() => setActivePhase(phase)}
                className={`px-3 py-1.5 min-h-[34px] rounded-lg text-xs font-medium transition-colors ${
                  activePhase === phase
                    ? 'bg-[#101C24] text-white dark:bg-[#43D9A3] dark:text-[#101C24]'
                    : 'bg-[#F7F9F8] dark:bg-[#0B1318] text-[#667085] dark:text-[#94A3AF]'
                }`}
              >
                {phase}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={addTask} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a launch task..."
            className="sm:col-span-5 min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
          />
          <select
            value={newPhase}
            onChange={(e) => setNewPhase(e.target.value)}
            className="sm:col-span-2 min-h-[44px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
          >
            {PHASES.map((p) => <option key={p}>{p}</option>)}
          </select>
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as 'low' | 'medium' | 'high')}
            className="sm:col-span-2 min-h-[44px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
          >
            <option value="low">Low priority</option>
            <option value="medium">Medium</option>
            <option value="high">High priority</option>
          </select>
          <input
            type="date"
            value={newDue}
            onChange={(e) => setNewDue(e.target.value)}
            className="sm:col-span-2 min-h-[44px] px-3 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
          />
          <button
            type="submit"
            className="sm:col-span-1 min-h-[44px] rounded-xl bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] flex items-center justify-center"
            aria-label="Add task"
          >
            <Plus className="w-5 h-5" />
          </button>
        </form>

        <div className="divide-y divide-[#E6EBE8] dark:divide-[#1E2D36]">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#667085]">No tasks in this phase yet.</p>
          ) : (
            filtered.map((task) => (
              <div key={task.id} className="py-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => toggleTask(task)}
                  className="flex items-center gap-3 text-left min-w-0 flex-1 min-h-[44px]"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-[#43D9A3]" />
                  ) : (
                    <Circle className="w-5 h-5 shrink-0 text-[#667085]" />
                  )}
                  <div className="min-w-0">
                    <div className={`text-sm font-medium ${task.completed ? 'line-through text-[#667085]' : ''}`}>
                      {task.title}
                    </div>
                    <div className="text-xs text-[#667085] dark:text-[#94A3AF]">
                      {task.phase} · {task.priority} priority
                      {task.due_date ? ` · Due ${task.due_date}` : ''}
                      {task.is_ai_suggested ? ' · Recommended' : ''}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => removeTask(task.id)}
                  aria-label="Delete task"
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center text-[#667085] hover:text-[#E45B63]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
