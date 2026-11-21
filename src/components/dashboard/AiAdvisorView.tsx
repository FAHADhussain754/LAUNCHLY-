import { useEffect, useState } from 'react';
import { Send, Bookmark, ThumbsUp, ThumbsDown, Copy, Download, Plus } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import type { WorkspaceContext } from '../../types';

interface AiAdvisorViewProps {
  workspace: WorkspaceContext;
  onCreditsUpdated: () => void;
}

interface Conversation {
  id: number;
  title: string;
  active_agent: string;
  updated_at: string;
}

interface Message {
  id: number;
  role: 'user' | 'assistant';
  agent_type: string;
  content: string;
  saved: number;
  feedback: 'up' | 'down' | null;
  created_at: string;
}

const AGENTS = ['Manager', 'Research', 'Product', 'Supplier', 'Store', 'Marketing', 'Finance', 'Support'];

const SUGGESTED_PROMPTS = [
  'Evaluate whether my current business model fits my budget and weekly hours.',
  'Suggest 3 focused product niches with low defect and return risk.',
  'Break down unit economics for a $38 retail product with $11 cost and $5 shipping.',
  'Create a 14-day pre-launch checklist before I spend money on ads.',
];

export function AiAdvisorView({ workspace, onCreditsUpdated }: AiAdvisorViewProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('Manager');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const loadConversations = async () => {
    const res = await apiRequest<{ conversations: Conversation[] }>('/api/ai/conversations');
    setConversations(res.conversations);
    if (res.conversations.length > 0 && !activeConvId) {
      selectConversation(res.conversations[0].id);
    }
  };

  const selectConversation = async (id: number) => {
    setActiveConvId(id);
    const res = await apiRequest<{ messages: Message[] }>(`/api/ai/conversations/${id}/messages`);
    setMessages(res.messages);
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const sendMessage = async (promptText?: string) => {
    const text = (promptText ?? input).trim();
    if (!text || sending) return;
    setSending(true);
    setError('');
    if (!promptText) setInput('');

    const tempUserMsg: Message = {
      id: Date.now(),
      role: 'user',
      agent_type: selectedAgent,
      content: text,
      saved: 0,
      feedback: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await apiRequest<{ conversationId: number; message: Message }>('/api/ai/chat', {
        method: 'POST',
        body: {
          conversationId: activeConvId || undefined,
          agent: selectedAgent,
          message: text,
        },
      });
      setActiveConvId(res.conversationId);
      setMessages((prev) => [...prev, res.message]);
      await loadConversations();
      onCreditsUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach LAUNCHLY AI.');
    } finally {
      setSending(false);
    }
  };

  const toggleSave = async (msg: Message) => {
    await apiRequest(`/api/ai/messages/${msg.id}`, {
      method: 'PATCH',
      body: { saved: msg.saved === 0 },
    });
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, saved: m.saved ? 0 : 1 } : m)));
  };

  const setFeedback = async (msg: Message, fb: 'up' | 'down') => {
    const next = msg.feedback === fb ? null : fb;
    await apiRequest(`/api/ai/messages/${msg.id}`, {
      method: 'PATCH',
      body: { feedback: next },
    });
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, feedback: next } : m)));
  };

  const copyText = (msg: Message) => {
    navigator.clipboard?.writeText(msg.content);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const exportMarkdown = () => {
    const lines = messages.map((m) => `### ${m.role === 'user' ? 'Founder' : `LAUNCHLY AI (${m.agent_type})`}\n\n${m.content}\n`);
    const blob = new Blob([`# LAUNCHLY AI Advisory Export\n\nBusiness: ${workspace.business?.name}\n\n${lines.join('\n---\n\n')}`], {
      type: 'text/markdown',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'launchly-ai-report.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Conversations & Agent Sidebar */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-sm">Specialist Agent</h2>
            <span className="font-mono tabular-nums text-xs text-[#667085] dark:text-[#94A3AF]">
              {workspace.subscription?.ai_credits_used}/{workspace.subscription?.ai_credits_limit} used
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {AGENTS.map((agent) => (
              <button
                key={agent}
                type="button"
                onClick={() => setSelectedAgent(agent)}
                className={`min-h-[38px] px-2.5 rounded-lg text-xs font-medium text-left transition-colors ${
                  selectedAgent === agent
                    ? 'bg-[#101C24] text-white dark:bg-[#43D9A3] dark:text-[#101C24]'
                    : 'bg-[#F7F9F8] dark:bg-[#0B1318] text-[#667085] dark:text-[#94A3AF] hover:text-[#101C24] dark:hover:text-white'
                }`}
              >
                {agent} Agent
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-sm">Sessions</h3>
            <button
              type="button"
              onClick={() => {
                setActiveConvId(null);
                setMessages([]);
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#153C32] dark:text-[#43D9A3]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="text-xs text-[#667085]">No saved conversations yet.</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectConversation(c.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs truncate ${
                    activeConvId === c.id
                      ? 'bg-[#F7F9F8] dark:bg-[#153C32]/40 font-semibold'
                      : 'text-[#667085] hover:bg-[#F7F9F8] dark:hover:bg-[#0B1318]'
                  }`}
                >
                  {c.title}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Chat Viewport */}
      <div className="lg:col-span-8 bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl flex flex-col min-h-[540px] max-h-[75vh]">
        <div className="p-4 border-b border-[#E6EBE8] dark:border-[#1E2D36] flex items-center justify-between gap-2">
          <div>
            <h2 className="font-display font-semibold text-base">LAUNCHLY AI · {selectedAgent} Agent</h2>
            <p className="text-xs text-[#667085] dark:text-[#94A3AF]">
              Grounded in {workspace.business?.name} ({workspace.business?.model}) · Separates verified facts from estimates
            </p>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={exportMarkdown}
              className="min-h-[36px] px-3 rounded-lg border border-[#E6EBE8] dark:border-[#1E2D36] text-xs font-medium inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-[#667085] dark:text-[#94A3AF]">
                Ask any question about business models, product validation, supplier comparison, pricing math, or store setup. Suggested prompts:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => sendMessage(p)}
                    className="text-left p-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] hover:border-[#153C32] dark:hover:border-[#43D9A3] text-xs leading-relaxed transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#101C24] text-white dark:bg-[#153C32]'
                      : 'bg-[#F7F9F8] dark:bg-[#0B1318] border border-[#E6EBE8] dark:border-[#1E2D36]'
                  }`}
                >
                  {m.role === 'assistant' && (
                    <div className="text-xs font-semibold text-[#153C32] dark:text-[#43D9A3] mb-1">
                      {m.agent_type} Agent
                    </div>
                  )}
                  {m.content}
                </div>
                {m.role === 'assistant' && m.id > 0 && (
                  <div className="flex items-center gap-2 mt-1.5 px-1 text-xs text-[#667085]">
                    <button type="button" onClick={() => copyText(m)} className="inline-flex items-center gap-1 hover:text-[#101C24] dark:hover:text-white">
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSave(m)}
                      className={`inline-flex items-center gap-1 ${m.saved ? 'text-[#153C32] dark:text-[#43D9A3] font-semibold' : 'hover:text-[#101C24]'}`}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>{m.saved ? 'Saved' : 'Save'}</span>
                    </button>
                    <button
                      type="button"
                      aria-label="Helpful"
                      onClick={() => setFeedback(m, 'up')}
                      className={m.feedback === 'up' ? 'text-[#43D9A3]' : ''}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Not helpful"
                      onClick={() => setFeedback(m, 'down')}
                      className={m.feedback === 'down' ? 'text-[#E45B63]' : ''}
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
          {sending && <div className="text-xs text-[#667085]">LAUNCHLY AI is analyzing your business context...</div>}
        </div>

        {error && (
          <div className="mx-4 mb-2 p-3 rounded-xl bg-[#E45B63]/10 border border-[#E45B63]/30 text-xs text-[#E45B63]">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="p-3 sm:p-4 border-t border-[#E6EBE8] dark:border-[#1E2D36] flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask the ${selectedAgent} Agent...`}
            className="flex-1 min-h-[44px] px-4 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm focus:outline-none focus:ring-2 focus:ring-[#43D9A3]"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="min-h-[44px] px-4 rounded-xl bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
