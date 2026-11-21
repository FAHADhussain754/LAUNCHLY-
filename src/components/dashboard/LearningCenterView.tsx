import { useEffect, useState } from 'react';
import { CheckCircle2, Bookmark } from 'lucide-react';
import { apiRequest } from '../../lib/api';

interface Lesson {
  id: string;
  category: string;
  title: string;
  duration: string;
  summary: string;
  steps: string[];
}

const LESSONS: Lesson[] = [
  {
    id: 'ecom-101',
    category: 'E-commerce fundamentals',
    title: 'Choosing a Business Model Without Overcommitting Capital',
    duration: '6 min read',
    summary: 'Compare Dropshipping, Print on Demand, Private Label, and General E-commerce based on cash flow, MOQ, and customization control.',
    steps: [
      'List your realistic starting budget excluding living expenses.',
      'Hold back at least 40% of capital for product samples, shipping variance, and initial creative testing.',
      'Select a single primary SKU or 3-SKU tight capsule rather than a 50-item general catalog.',
    ],
  },
  {
    id: 'res-101',
    category: 'Product Research',
    title: 'How to Read Landed Cost and Break-Even ROAS',
    duration: '8 min read',
    summary: 'Never evaluate a product by factory price alone. Account for international freight, duties, payment processing, and expected return rate.',
    steps: [
      'Sum unit cost + inbound/outbound shipping + packaging + 2.9% payment fee.',
      'Target at least 60% gross margin before ad spend when relying on paid social acquisition.',
      'Request a physical sample unit before publishing any product page.',
    ],
  },
  {
    id: 'shop-101',
    category: 'Shopify',
    title: 'Pre-Launch Storefront Trust Checklist',
    duration: '5 min read',
    summary: 'Ensure shipping timelines, return policies, and contact channels match supplier realities before connecting a payment processor.',
    steps: [
      'Publish plain-language Shipping, Refund, and Privacy Policy pages.',
      'Display realistic delivery windows (e.g., 5–9 business days) matching your supplier SLA.',
      'Verify test checkout flows and mobile button sizing before driving traffic.',
    ],
  },
  {
    id: 'mkt-101',
    category: 'Marketing',
    title: 'Testing Hooks Organically Before Paid Ad Spend',
    duration: '7 min read',
    summary: 'Use Marketing Studio scripts to publish 10 short-form product demonstrations and observe retention before paying for impressions.',
    steps: [
      'Open every video with the physical problem your product solves in the first 2 seconds.',
      'Show scale, texture, and real-world use rather than stock slides.',
      'Track which angle earns saves and thoughtful questions before boosting.',
    ],
  },
];

const GLOSSARY = [
  { term: 'MOQ (Minimum Order Quantity)', def: 'The smallest batch size a manufacturer or wholesaler will produce or ship at wholesale pricing.' },
  { term: 'Landed Cost', def: 'Total cost of a unit delivered to your customer or warehouse, including freight, duties, packaging, and processing fees.' },
  { term: 'Break-Even ROAS', def: 'Return on Ad Spend where ad revenue covers product, shipping, fees, and ad cost with $0 net profit.' },
  { term: 'OAuth Authorization', def: 'Official token-based store permission that connects Shopify without sharing your login password.' },
];

export function LearningCenterView() {
  const [progress, setProgress] = useState<Record<string, { completed: number; saved: number }>>({});
  const [activeLesson, setActiveLesson] = useState<Lesson>(LESSONS[0]);

  useEffect(() => {
    apiRequest<{ progress: Array<{ lesson_id: string; completed: number; saved: number }> }>('/api/learning/progress')
      .then((res) => {
        const map: Record<string, { completed: number; saved: number }> = {};
        for (const r of res.progress) {
          map[r.lesson_id] = { completed: r.completed, saved: r.saved };
        }
        setProgress(map);
      })
      .catch(() => {});
  }, []);

  const toggle = async (lessonId: string, field: 'completed' | 'saved') => {
    const cur = progress[lessonId] || { completed: 0, saved: 0 };
    const nextVal = cur[field] === 0;
    await apiRequest('/api/learning/progress', {
      method: 'POST',
      body: { lessonId, [field]: nextVal },
    });
    setProgress((prev) => ({
      ...prev,
      [lessonId]: { ...cur, [field]: nextVal ? 1 : 0 },
    }));
  };

  const completedTotal = Object.values(progress).filter((p) => p.completed === 1).length;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold">Learning Center</h2>
          <p className="text-xs text-[#667085] dark:text-[#94A3AF]">Short, practical founder guides without hype or unrealistic claims.</p>
        </div>
        <div className="font-mono tabular-nums text-xs font-semibold text-[#153C32] dark:text-[#43D9A3]">
          {completedTotal} / {LESSONS.length} lessons completed
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-2">
          {LESSONS.map((lesson) => {
            const state = progress[lesson.id];
            return (
              <button
                key={lesson.id}
                type="button"
                onClick={() => setActiveLesson(lesson)}
                className={`w-full text-left p-4 rounded-2xl border transition-colors ${
                  activeLesson.id === lesson.id
                    ? 'border-[#153C32] dark:border-[#43D9A3] bg-white dark:bg-[#101C24]'
                    : 'border-[#E6EBE8] dark:border-[#1E2D36] bg-white/60 dark:bg-[#101C24]/60'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-[#667085]">
                  <span>{lesson.category} · {lesson.duration}</span>
                  {state?.completed === 1 && <CheckCircle2 className="w-4 h-4 text-[#43D9A3]" />}
                </div>
                <div className="font-display font-semibold text-sm mt-1">{lesson.title}</div>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-7 bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-6 space-y-5">
          <div>
            <div className="text-xs text-[#667085]">{activeLesson.category} · {activeLesson.duration}</div>
            <h3 className="font-display text-xl font-bold mt-1">{activeLesson.title}</h3>
          </div>
          <p className="text-sm text-[#667085] dark:text-[#94A3AF] leading-relaxed">{activeLesson.summary}</p>
          <div className="space-y-2.5 pt-2 border-t border-[#E6EBE8] dark:border-[#1E2D36]">
            <div className="text-xs font-semibold">Actionable Checklist</div>
            {activeLesson.steps.map((s, idx) => (
              <div key={s} className="text-sm flex gap-2.5">
                <span className="font-mono text-xs text-[#153C32] dark:text-[#43D9A3] mt-0.5">0{idx + 1}.</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-3 border-t border-[#E6EBE8] dark:border-[#1E2D36]">
            <button
              type="button"
              onClick={() => toggle(activeLesson.id, 'completed')}
              className="min-h-[40px] px-4 rounded-xl bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{progress[activeLesson.id]?.completed ? 'Completed' : 'Mark Completed'}</span>
            </button>
            <button
              type="button"
              onClick={() => toggle(activeLesson.id, 'saved')}
              className="min-h-[40px] px-4 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] text-xs font-medium inline-flex items-center gap-1.5"
            >
              <Bookmark className="w-4 h-4" />
              <span>{progress[activeLesson.id]?.saved ? 'Saved' : 'Bookmark'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Glossary */}
      <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-6 space-y-4">
        <h3 className="font-display text-base font-semibold">Beginner E-commerce Glossary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GLOSSARY.map((g) => (
            <div key={g.term} className="p-4 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1318] border border-[#E6EBE8] dark:border-[#1E2D36]">
              <div className="font-semibold text-sm">{g.term}</div>
              <p className="text-xs text-[#667085] dark:text-[#94A3AF] mt-1">{g.def}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
