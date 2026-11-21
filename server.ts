import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createServer as createViteServer } from 'vite';
import { db, initDatabase, hashPassword, verifyPassword, logAudit } from './server/db.ts';
import { signToken, requireAuth, requireAdmin, rateLimit, type AuthenticatedRequest } from './server/auth.ts';
import { runBusinessAdvisor, generateMarketingCopy, generateProductResearchBrief, type BusinessContext } from './server/gemini.ts';

initDatabase();

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));

function getPlansConfig() {
  const row = db.prepare('SELECT value FROM platform_settings WHERE key = ?').get('plans_config') as { value: string } | undefined;
  if (row) {
    try {
      return JSON.parse(row.value);
    } catch {
      // fall back below
    }
  }
  return {
    starter: { name: 'Starter', monthlyPrice: 29, annualPrice: 24, aiCredits: 40, trialDays: 14 },
    builder: { name: 'Builder', monthlyPrice: 79, annualPrice: 64, aiCredits: 200, trialDays: 14 },
    professional: { name: 'Professional', monthlyPrice: 199, annualPrice: 159, aiCredits: 1000, trialDays: 14 },
  };
}

function buildUserContext(userId: number) {
  const user = db.prepare(`
    SELECT id, email, name, role, is_demo, email_verified, country, language, notification_prefs, created_at
    FROM users WHERE id = ?
  `).get(userId) as Record<string, unknown> | undefined;
  if (!user) return null;

  const business = db.prepare('SELECT * FROM businesses WHERE user_id = ?').get(userId) as Record<string, unknown> | undefined;
  const onboarding = db.prepare('SELECT * FROM onboarding_responses WHERE user_id = ?').get(userId) as Record<string, unknown> | undefined;
  const subscription = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(userId) as Record<string, unknown> | undefined;
  const savedCount = (db.prepare('SELECT COUNT(*) as c FROM saved_products WHERE user_id = ?').get(userId) as { c: number }).c;
  const storeCount = (db.prepare('SELECT COUNT(*) as c FROM stores WHERE user_id = ? AND status != ?').get(userId, 'disconnected') as { c: number }).c;
  const supplierCount = (db.prepare('SELECT COUNT(*) as c FROM supplier_connections WHERE user_id = ?').get(userId) as { c: number }).c;
  const unreadNotifications = (db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND read = 0').get(userId) as { c: number }).c;

  return {
    user: {
      ...user,
      notification_prefs: typeof user.notification_prefs === 'string' ? JSON.parse(user.notification_prefs) : user.notification_prefs,
    } as Record<string, unknown>,
    business,
    onboarding,
    subscription,
    counts: {
      savedProducts: savedCount,
      connectedStores: storeCount,
      supplierConnections: supplierCount,
      unreadNotifications,
    },
  };
}

// Health
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Public Pricing & Catalog preview
app.get('/api/public/plans', (_req, res) => {
  res.json({ plans: getPlansConfig(), paymentMode: process.env.STRIPE_SECRET_KEY ? 'live' : 'sandbox' });
});

// ==================== AUTH ROUTES ====================
app.post('/api/auth/register', rateLimit('auth', 20, 60_000), (req, res) => {
  const { name, email, password, country } = req.body as { name?: string; email?: string; password?: string; country?: string };
  if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
    res.status(400).json({ error: 'Please provide your name, a valid email, and a password of at least 8 characters.' });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const verificationToken = crypto.randomBytes(16).toString('hex');
  const plans = getPlansConfig();
  const trialEnd = new Date(Date.now() + (plans.starter?.trialDays || 14) * 86400000).toISOString();

  const insertTx = db.transaction(() => {
    const uRes = db.prepare(`
      INSERT INTO users (email, password_hash, name, role, is_demo, email_verified, verification_token, country)
      VALUES (?, ?, ?, 'customer', 0, 0, ?, ?)
    `).run(normalizedEmail, hashPassword(password), name.trim(), verificationToken, country?.trim() || 'United States');
    const userId = Number(uRes.lastInsertRowid);

    db.prepare(`
      INSERT INTO businesses (user_id, name, model, niche, target_countries, stage, launch_progress)
      VALUES (?, ?, 'General E-commerce', '', ?, 'Onboarding', 10)
    `).run(userId, `${name.trim().split(' ')[0]}'s Business`, country?.trim() || 'United States');

    db.prepare('INSERT INTO onboarding_responses (user_id, completed) VALUES (?, 0)').run(userId);

    db.prepare(`
      INSERT INTO subscriptions (user_id, plan, billing_cycle, status, ai_credits_limit, ai_credits_used, current_period_end, payment_mode)
      VALUES (?, 'starter', 'monthly', 'trialing', ?, 0, ?, 'sandbox')
    `).run(userId, plans.starter?.aiCredits || 40, trialEnd);

    db.prepare(`
      INSERT INTO tasks (user_id, phase, title, priority, is_ai_suggested)
      VALUES (?, 'Planning', 'Complete your LAUNCHLY business onboarding profile', 'high', 1)
    `).run(userId);

    db.prepare(`
      INSERT INTO notifications (user_id, type, title, message)
      VALUES (?, 'security', 'Verify your email address', 'Confirm your email address in Settings or via your verification token to secure your workspace.')
    `).run(userId);

    return userId;
  });

  const userId = insertTx();
  logAudit(userId, normalizedEmail, 'USER_REGISTERED', 'New customer workspace created');

  const token = signToken({ uid: userId, email: normalizedEmail, role: 'customer' });
  res.status(201).json({
    token,
    verificationToken,
    ...buildUserContext(userId),
  });
});

app.post('/api/auth/login', rateLimit('auth', 30, 60_000), (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email?.trim() || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const user = db.prepare('SELECT id, email, password_hash, role, deletion_requested FROM users WHERE email = ?').get(normalizedEmail) as
    | { id: number; email: string; password_hash: string; role: 'customer' | 'admin'; deletion_requested: number }
    | undefined;

  if (!user || user.deletion_requested || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  logAudit(user.id, user.email, 'USER_LOGIN', 'Authenticated via password');
  const token = signToken({ uid: user.id, email: user.email, role: user.role });
  res.json({ token, ...buildUserContext(user.id) });
});

app.post('/api/auth/demo', rateLimit('auth', 20, 60_000), (_req, res) => {
  const demo = db.prepare('SELECT id, email, role FROM users WHERE email = ? AND is_demo = 1').get('demo@launchly.app') as
    | { id: number; email: string; role: 'customer' | 'admin' }
    | undefined;
  if (!demo) {
    res.status(404).json({ error: 'Demo workspace unavailable.' });
    return;
  }
  const token = signToken({ uid: demo.id, email: demo.email, role: demo.role });
  res.json({ token, ...buildUserContext(demo.id) });
});

app.post('/api/auth/verify-email', requireAuth, (req: AuthenticatedRequest, res) => {
  const { token } = req.body as { token?: string };
  const row = db.prepare('SELECT verification_token FROM users WHERE id = ?').get(req.user!.id) as { verification_token: string | null } | undefined;
  if (!row) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  if (token && row.verification_token && token !== row.verification_token) {
    res.status(400).json({ error: 'Verification token does not match.' });
    return;
  }
  db.prepare('UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?').run(req.user!.id);
  logAudit(req.user!.id, req.user!.email, 'EMAIL_VERIFIED', 'Customer verified account email');
  res.json({ ok: true, ...buildUserContext(req.user!.id) });
});

app.post('/api/auth/request-reset', rateLimit('auth', 10, 60_000), (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email?.trim()) {
    res.status(400).json({ error: 'Email is required.' });
    return;
  }
  const normalized = email.trim().toLowerCase();
  const user = db.prepare('SELECT id FROM users WHERE email = ? AND is_demo = 0').get(normalized) as { id: number } | undefined;
  if (user) {
    const resetToken = crypto.randomBytes(12).toString('hex');
    const expires = new Date(Date.now() + 30 * 60_000).toISOString();
    db.prepare('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?').run(resetToken, expires, user.id);
    logAudit(user.id, normalized, 'PASSWORD_RESET_REQUESTED', 'Password reset token generated');
    res.json({ ok: true, message: 'Password reset token generated.', previewResetToken: resetToken });
    return;
  }
  res.json({ ok: true, message: 'If an account matches that email, reset instructions are ready.' });
});

app.post('/api/auth/reset-password', rateLimit('auth', 10, 60_000), (req, res) => {
  const { email, token, newPassword } = req.body as { email?: string; token?: string; newPassword?: string };
  if (!email?.trim() || !token?.trim() || !newPassword || newPassword.length < 8) {
    res.status(400).json({ error: 'Valid email, reset token, and 8+ character password are required.' });
    return;
  }
  const user = db.prepare('SELECT id, reset_token, reset_expires FROM users WHERE email = ?').get(email.trim().toLowerCase()) as
    | { id: number; reset_token: string | null; reset_expires: string | null }
    | undefined;
  if (!user || !user.reset_token || user.reset_token !== token.trim() || !user.reset_expires || new Date(user.reset_expires).getTime() < Date.now()) {
    res.status(400).json({ error: 'Invalid or expired password reset token.' });
    return;
  }
  db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?').run(hashPassword(newPassword), user.id);
  logAudit(user.id, email.trim().toLowerCase(), 'PASSWORD_RESET_COMPLETED', 'Password updated via reset token');
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json(buildUserContext(req.user!.id));
});

app.patch('/api/account/profile', requireAuth, (req: AuthenticatedRequest, res) => {
  const { name, country, language, notification_prefs } = req.body as {
    name?: string;
    country?: string;
    language?: string;
    notification_prefs?: Record<string, boolean>;
  };
  if (name?.trim()) {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), req.user!.id);
  }
  if (country?.trim()) {
    db.prepare('UPDATE users SET country = ? WHERE id = ?').run(country.trim(), req.user!.id);
  }
  if (language?.trim()) {
    db.prepare('UPDATE users SET language = ? WHERE id = ?').run(language.trim(), req.user!.id);
  }
  if (notification_prefs && typeof notification_prefs === 'object') {
    db.prepare('UPDATE users SET notification_prefs = ? WHERE id = ?').run(JSON.stringify(notification_prefs), req.user!.id);
  }
  res.json(buildUserContext(req.user!.id));
});

app.post('/api/account/delete-request', requireAuth, (req: AuthenticatedRequest, res) => {
  if (req.user!.is_demo) {
    res.status(400).json({ error: 'Sample demo workspace cannot be deleted.' });
    return;
  }
  db.prepare('UPDATE users SET deletion_requested = 1 WHERE id = ?').run(req.user!.id);
  logAudit(req.user!.id, req.user!.email, 'ACCOUNT_DELETION_REQUESTED', 'Customer requested account deletion');
  res.json({ ok: true });
});

// ==================== ONBOARDING & BUSINESS ====================
app.put('/api/onboarding', requireAuth, (req: AuthenticatedRequest, res) => {
  const body = req.body as {
    name?: string;
    country?: string;
    language?: string;
    experience_level?: string;
    business_name?: string;
    business_model?: string;
    niche?: string;
    budget?: string;
    target_countries?: string;
    preferred_categories?: string;
    weekly_hours?: string;
    has_existing_store?: string;
    marketing_experience?: string;
    goals?: string;
    completed?: boolean;
  };

  const userId = req.user!.id;
  if (body.name?.trim()) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(body.name.trim(), userId);
  if (body.country?.trim()) db.prepare('UPDATE users SET country = ? WHERE id = ?').run(body.country.trim(), userId);
  if (body.language?.trim()) db.prepare('UPDATE users SET language = ? WHERE id = ?').run(body.language.trim(), userId);

  const prevOnboarding = db.prepare('SELECT completed FROM onboarding_responses WHERE user_id = ?').get(userId) as { completed: number } | undefined;

  db.prepare(`
    UPDATE onboarding_responses
    SET experience_level = COALESCE(?, experience_level),
        budget = COALESCE(?, budget),
        target_countries = COALESCE(?, target_countries),
        preferred_categories = COALESCE(?, preferred_categories),
        weekly_hours = COALESCE(?, weekly_hours),
        has_existing_store = COALESCE(?, has_existing_store),
        marketing_experience = COALESCE(?, marketing_experience),
        goals = COALESCE(?, goals),
        completed = CASE WHEN ? = 1 THEN 1 ELSE completed END,
        updated_at = datetime('now')
    WHERE user_id = ?
  `).run(
    body.experience_level ?? null,
    body.budget ?? null,
    body.target_countries ?? null,
    body.preferred_categories ?? null,
    body.weekly_hours ?? null,
    body.has_existing_store ?? null,
    body.marketing_experience ?? null,
    body.goals ?? null,
    body.completed ? 1 : 0,
    userId
  );

  db.prepare(`
    UPDATE businesses
    SET name = COALESCE(?, name),
        model = COALESCE(?, model),
        niche = COALESCE(?, niche),
        target_countries = COALESCE(?, target_countries),
        stage = CASE WHEN ? = 1 AND stage = 'Onboarding' THEN 'Product Research' ELSE stage END,
        launch_progress = CASE WHEN ? = 1 AND launch_progress < 30 THEN 30 ELSE launch_progress END
    WHERE user_id = ?
  `).run(
    body.business_name?.trim() || null,
    body.business_model || null,
    body.niche ?? body.preferred_categories ?? null,
    body.target_countries || null,
    body.completed ? 1 : 0,
    body.completed ? 1 : 0,
    userId
  );

  if (body.completed && (!prevOnboarding || prevOnboarding.completed === 0)) {
    const model = body.business_model || 'General E-commerce';
    const insertTask = db.prepare('INSERT INTO tasks (user_id, phase, title, priority, is_ai_suggested) VALUES (?, ?, ?, ?, 1)');
    insertTask.run(userId, 'Product research', `Shortlist 3 candidate products tailored for ${model}`, 'high');
    insertTask.run(userId, 'Suppliers', 'Review supplier verification status and MOQ terms', 'medium');
    insertTask.run(userId, 'Store setup', body.has_existing_store === 'yes' ? 'Connect your existing Shopify store via OAuth' : 'Prepare store domain and brand naming', 'medium');
    insertTask.run(userId, 'Marketing', 'Draft initial product positioning in Marketing Studio', 'low');
    db.prepare(`
      INSERT INTO notifications (user_id, type, title, message)
      VALUES (?, 'task_reminder', 'Business Roadmap Generated', 'Your personalized launch checklist is ready based on your onboarding profile.')
    `).run(userId);
  }

  res.json(buildUserContext(userId));
});

app.patch('/api/business', requireAuth, (req: AuthenticatedRequest, res) => {
  const { name, model, niche, target_countries, stage, launch_progress } = req.body as {
    name?: string;
    model?: string;
    niche?: string;
    target_countries?: string;
    stage?: string;
    launch_progress?: number;
  };
  db.prepare(`
    UPDATE businesses
    SET name = COALESCE(?, name),
        model = COALESCE(?, model),
        niche = COALESCE(?, niche),
        target_countries = COALESCE(?, target_countries),
        stage = COALESCE(?, stage),
        launch_progress = COALESCE(?, launch_progress)
    WHERE user_id = ?
  `).run(name ?? null, model ?? null, niche ?? null, target_countries ?? null, stage ?? null, typeof launch_progress === 'number' ? Math.max(0, Math.min(100, launch_progress)) : null, req.user!.id);
  res.json(buildUserContext(req.user!.id));
});

// ==================== AI BUSINESS ADVISOR ====================
app.get('/api/ai/conversations', requireAuth, (req: AuthenticatedRequest, res) => {
  const rows = db.prepare('SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY updated_at DESC').all(req.user!.id);
  res.json({ conversations: rows });
});

app.get('/api/ai/conversations/:id/messages', requireAuth, (req: AuthenticatedRequest, res) => {
  const convId = Number(req.params.id);
  const conv = db.prepare('SELECT id FROM ai_conversations WHERE id = ? AND user_id = ?').get(convId, req.user!.id);
  if (!conv) {
    res.status(404).json({ error: 'Conversation not found.' });
    return;
  }
  const messages = db.prepare('SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY id ASC').all(convId);
  res.json({ messages });
});

app.post('/api/ai/chat', requireAuth, rateLimit('ai', 15, 60_000), async (req: AuthenticatedRequest, res) => {
  const { conversationId, agent, message } = req.body as { conversationId?: number; agent?: string; message?: string };
  if (!message?.trim()) {
    res.status(400).json({ error: 'Message cannot be empty.' });
    return;
  }

  const userId = req.user!.id;
  const sub = db.prepare('SELECT ai_credits_limit, ai_credits_used, status FROM subscriptions WHERE user_id = ?').get(userId) as
    | { ai_credits_limit: number; ai_credits_used: number; status: string }
    | undefined;

  if (!sub || sub.status === 'canceled') {
    res.status(403).json({ error: 'Active subscription required to use LAUNCHLY AI.' });
    return;
  }
  if (sub.ai_credits_used >= sub.ai_credits_limit) {
    res.status(402).json({ error: `Monthly AI credit limit (${sub.ai_credits_limit}) reached. Upgrade your plan in Subscription & Billing.` });
    return;
  }

  let activeConvId = conversationId ? Number(conversationId) : null;
  if (activeConvId) {
    const owns = db.prepare('SELECT id FROM ai_conversations WHERE id = ? AND user_id = ?').get(activeConvId, userId);
    if (!owns) activeConvId = null;
  }
  if (!activeConvId) {
    const title = message.trim().slice(0, 52) + (message.trim().length > 52 ? '…' : '');
    const created = db.prepare('INSERT INTO ai_conversations (user_id, title, active_agent) VALUES (?, ?, ?)').run(userId, title, agent || 'Manager');
    activeConvId = Number(created.lastInsertRowid);
  }

  const history = db
    .prepare('SELECT role, content FROM ai_messages WHERE conversation_id = ? ORDER BY id ASC LIMIT 12')
    .all(activeConvId) as Array<{ role: 'user' | 'assistant'; content: string }>;

  const ctxRow = buildUserContext(userId)!;
  const biz = (ctxRow.business || {}) as Record<string, string>;
  const onb = (ctxRow.onboarding || {}) as Record<string, string>;
  const context: BusinessContext = {
    userName: String(ctxRow.user.name || 'Founder'),
    businessName: biz.name || 'My Online Business',
    model: biz.model || 'General E-commerce',
    niche: biz.niche || '',
    targetCountries: biz.target_countries || 'United States',
    stage: biz.stage || 'Planning',
    budget: onb.budget || '',
    experience: onb.experience_level || 'Beginner',
    weeklyHours: onb.weekly_hours || '',
    goals: onb.goals || '',
    savedProductsCount: ctxRow.counts.savedProducts,
    connectedStoresCount: ctxRow.counts.connectedStores,
  };

  try {
    const result = await runBusinessAdvisor({
      agent: agent || 'Manager',
      message: message.trim(),
      history,
      context,
    });

    db.prepare('INSERT INTO ai_messages (conversation_id, role, agent_type, content) VALUES (?, ?, ?, ?)').run(activeConvId, 'user', agent || 'Manager', message.trim());
    const assistantInsert = db
      .prepare('INSERT INTO ai_messages (conversation_id, role, agent_type, content) VALUES (?, ?, ?, ?)')
      .run(activeConvId, 'assistant', result.suggestedAgent, result.reply);

    db.prepare("UPDATE ai_conversations SET active_agent = ?, updated_at = datetime('now') WHERE id = ?").run(result.suggestedAgent, activeConvId);
    db.prepare("UPDATE subscriptions SET ai_credits_used = ai_credits_used + 1, updated_at = datetime('now') WHERE user_id = ?").run(userId);
    db.prepare('INSERT INTO usage_records (user_id, feature, model, tokens_approx) VALUES (?, ?, ?, ?)').run(
      userId,
      `advisor:${result.suggestedAgent}`,
      'gemini-4-hydrogen',
      result.tokensApprox
    );

    const savedMessage = db.prepare('SELECT * FROM ai_messages WHERE id = ?').get(Number(assistantInsert.lastInsertRowid));
    res.json({
      conversationId: activeConvId,
      message: savedMessage,
      creditsUsed: sub.ai_credits_used + 1,
      creditsLimit: sub.ai_credits_limit,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI service error';
    res.status(502).json({ error: msg });
  }
});

app.patch('/api/ai/messages/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const msgId = Number(req.params.id);
  const { saved, feedback } = req.body as { saved?: boolean; feedback?: 'up' | 'down' | null };
  const owned = db
    .prepare(
      `SELECT m.id FROM ai_messages m
       JOIN ai_conversations c ON c.id = m.conversation_id
       WHERE m.id = ? AND c.user_id = ?`
    )
    .get(msgId, req.user!.id);
  if (!owned) {
    res.status(404).json({ error: 'Message not found.' });
    return;
  }
  if (typeof saved === 'boolean') {
    db.prepare('UPDATE ai_messages SET saved = ? WHERE id = ?').run(saved ? 1 : 0, msgId);
  }
  if (feedback !== undefined) {
    db.prepare('UPDATE ai_messages SET feedback = ? WHERE id = ?').run(feedback, msgId);
  }
  res.json({ ok: true });
});

// ==================== PRODUCT RESEARCH ====================
app.get('/api/products', requireAuth, (req: AuthenticatedRequest, res) => {
  const { category, country, model, maxPrice, search } = req.query as Record<string, string | undefined>;
  const clauses: string[] = [];
  const params: unknown[] = [req.user!.id];

  if (category && category !== 'All') {
    clauses.push('p.category = ?');
    params.push(category);
  }
  if (country && country !== 'All') {
    clauses.push('p.target_country = ?');
    params.push(country);
  }
  if (model && model !== 'All') {
    clauses.push('p.business_model = ?');
    params.push(model);
  }
  if (maxPrice && !Number.isNaN(Number(maxPrice))) {
    clauses.push('(p.suggested_price IS NULL OR p.suggested_price <= ?)');
    params.push(Number(maxPrice));
  }
  if (search?.trim()) {
    clauses.push('(p.name LIKE ? OR p.category LIKE ? OR p.supplier_name LIKE ?)');
    const q = `%${search.trim()}%`;
    params.push(q, q, q);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `SELECT p.*, sp.id as saved_id, sp.collection_name, sp.notes as user_notes
       FROM products p
       LEFT JOIN saved_products sp ON sp.product_id = p.id AND sp.user_id = ?
       ${whereSql}
       ORDER BY p.id ASC`
    )
    .all(...params) as Array<Record<string, unknown>>;

  const formatted = rows.map((r) => ({
    ...r,
    opportunity_criteria: typeof r.opportunity_criteria === 'string' ? JSON.parse(r.opportunity_criteria) : r.opportunity_criteria,
    is_saved: Boolean(r.saved_id),
  }));

  res.json({ products: formatted });
});

app.post('/api/products/:id/save', requireAuth, (req: AuthenticatedRequest, res) => {
  const productId = Number(req.params.id);
  const { collection_name, notes } = req.body as { collection_name?: string; notes?: string };
  const exists = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
  if (!exists) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }
  db.prepare(
    `INSERT INTO saved_products (user_id, product_id, collection_name, notes)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, product_id) DO UPDATE SET collection_name = excluded.collection_name, notes = excluded.notes`
  ).run(req.user!.id, productId, collection_name?.trim() || 'Shortlist', notes ?? '');
  res.json({ ok: true });
});

app.delete('/api/products/:id/save', requireAuth, (req: AuthenticatedRequest, res) => {
  db.prepare('DELETE FROM saved_products WHERE user_id = ? AND product_id = ?').run(req.user!.id, Number(req.params.id));
  res.json({ ok: true });
});

app.post('/api/products/:id/ai-brief', requireAuth, rateLimit('ai', 10, 60_000), async (req: AuthenticatedRequest, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(req.params.id)) as Record<string, unknown> | undefined;
  if (!product) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }
  const sub = db.prepare('SELECT ai_credits_limit, ai_credits_used FROM subscriptions WHERE user_id = ?').get(req.user!.id) as
    | { ai_credits_limit: number; ai_credits_used: number }
    | undefined;
  if (!sub || sub.ai_credits_used >= sub.ai_credits_limit) {
    res.status(402).json({ error: 'Monthly AI credit limit reached.' });
    return;
  }
  try {
    const result = await generateProductResearchBrief({
      productName: String(product.name),
      category: String(product.category),
      businessModel: String(product.business_model),
      supplierCost: product.supplier_cost === null ? null : Number(product.supplier_cost),
      suggestedPrice: product.suggested_price === null ? null : Number(product.suggested_price),
      targetCountry: String(product.target_country),
      competitorSummary: String(product.competitor_summary),
    });
    db.prepare("UPDATE subscriptions SET ai_credits_used = ai_credits_used + 1, updated_at = datetime('now') WHERE user_id = ?").run(req.user!.id);
    db.prepare('INSERT INTO usage_records (user_id, feature, model, tokens_approx) VALUES (?, ?, ?, ?)').run(
      req.user!.id,
      'product_brief',
      'gemini-4-hydrogen',
      result.tokensApprox
    );
    res.json({ brief: result.brief });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'AI brief failed' });
  }
});

// ==================== SUPPLIER CENTER ====================
app.get('/api/suppliers', requireAuth, (req: AuthenticatedRequest, res) => {
  const { verification, integration, search } = req.query as Record<string, string | undefined>;
  const clauses: string[] = [];
  const params: unknown[] = [req.user!.id];

  if (verification && verification !== 'All') {
    clauses.push('s.verification_status = ?');
    params.push(verification);
  }
  if (integration && integration !== 'All') {
    clauses.push('s.integration_type = ?');
    params.push(integration);
  }
  if (search?.trim()) {
    clauses.push('(s.name LIKE ? OR s.categories LIKE ? OR s.country LIKE ?)');
    const q = `%${search.trim()}%`;
    params.push(q, q, q);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `SELECT s.*, sc.status as connection_status, sc.notes as connection_notes, sc.last_synced_at
       FROM suppliers s
       LEFT JOIN supplier_connections sc ON sc.supplier_id = s.id AND sc.user_id = ?
       ${whereSql}
       ORDER BY CASE s.verification_status WHEN 'verified' THEN 1 WHEN 'manually_reviewed' THEN 2 ELSE 3 END, s.id ASC`
    )
    .all(...params);
  res.json({ suppliers: rows });
});

app.post('/api/suppliers/:id/connect', requireAuth, (req: AuthenticatedRequest, res) => {
  const supplierId = Number(req.params.id);
  const { notes } = req.body as { notes?: string };
  const supplier = db.prepare('SELECT id, name, integration_type, verification_status FROM suppliers WHERE id = ?').get(supplierId) as
    | { id: number; name: string; integration_type: string; verification_status: string }
    | undefined;
  if (!supplier) {
    res.status(404).json({ error: 'Supplier not found.' });
    return;
  }
  const status = supplier.integration_type === 'api_available' ? 'connected_api' : 'manual_active';
  db.prepare(
    `INSERT INTO supplier_connections (user_id, supplier_id, status, notes, last_synced_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, supplier_id) DO UPDATE SET status = excluded.status, notes = excluded.notes, last_synced_at = datetime('now')`
  ).run(req.user!.id, supplierId, status, notes ?? '');

  db.prepare(`
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (?, 'supplier_response', ?, ?)
  `).run(
    req.user!.id,
    `Supplier workflow active: ${supplier.name}`,
    status === 'connected_api'
      ? 'Authorized catalog sync enabled.'
      : 'Manual supplier quotation & order workflow added to your directory.'
  );

  res.json({ ok: true, status });
});

app.delete('/api/suppliers/:id/connect', requireAuth, (req: AuthenticatedRequest, res) => {
  db.prepare('DELETE FROM supplier_connections WHERE user_id = ? AND supplier_id = ?').run(req.user!.id, Number(req.params.id));
  res.json({ ok: true });
});

// ==================== STORE MANAGER (SHOPIFY ADAPTER) ====================
app.get('/api/stores', requireAuth, (req: AuthenticatedRequest, res) => {
  const stores = db.prepare('SELECT * FROM stores WHERE user_id = ? ORDER BY id DESC').all(req.user!.id);
  const imported = db.prepare('SELECT * FROM imported_products WHERE user_id = ? ORDER BY updated_at DESC').all(req.user!.id);
  const shopifyOAuthConfigured = Boolean(process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET);
  res.json({ stores, importedProducts: imported, shopifyOAuthConfigured });
});

app.post('/api/stores/connect', requireAuth, (req: AuthenticatedRequest, res) => {
  const { platform, shopDomain, storeName } = req.body as { platform?: string; shopDomain?: string; storeName?: string };
  const cleanDomain = (shopDomain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (!cleanDomain || !cleanDomain.includes('.')) {
    res.status(400).json({ error: 'Please enter a valid store domain (e.g. your-brand.myshopify.com).' });
    return;
  }

  const shopifyOAuthConfigured = Boolean(process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET);
  const status = shopifyOAuthConfigured ? 'connected' : 'awaiting_oauth_config';

  const result = db
    .prepare(`INSERT INTO stores (user_id, platform, shop_domain, store_name, status, last_synced_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`)
    .run(req.user!.id, platform || 'shopify', cleanDomain, storeName?.trim() || cleanDomain.split('.')[0], status);

  db.prepare(`
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (?, 'store_connected', ?, ?)
  `).run(
    req.user!.id,
    shopifyOAuthConfigured ? `Store connected: ${cleanDomain}` : `Store registered (OAuth setup needed): ${cleanDomain}`,
    shopifyOAuthConfigured
      ? 'Authorized Shopify OAuth channel is active.'
      : 'Configure SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET in Settings > Secrets to authorize live Shopify API sync.'
  );

  logAudit(req.user!.id, req.user!.email, 'STORE_ADDED', `Domain: ${cleanDomain}, status: ${status}`);
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json({ store, shopifyOAuthConfigured });
});

app.post('/api/stores/:id/import-product', requireAuth, (req: AuthenticatedRequest, res) => {
  const storeId = Number(req.params.id);
  const store = db.prepare('SELECT id FROM stores WHERE id = ? AND user_id = ?').get(storeId, req.user!.id);
  if (!store) {
    res.status(404).json({ error: 'Store not found.' });
    return;
  }
  const { productId, title, description, price } = req.body as {
    productId?: number;
    title?: string;
    description?: string;
    price?: number;
  };
  if (!title?.trim()) {
    res.status(400).json({ error: 'Product title is required.' });
    return;
  }
  const result = db
    .prepare(`INSERT INTO imported_products (store_id, user_id, product_id, title, description, price, sync_status) VALUES (?, ?, ?, ?, ?, ?, 'draft')`)
    .run(storeId, req.user!.id, productId || null, title.trim(), description?.trim() || '', Number(price || 0));

  const row = db.prepare('SELECT * FROM imported_products WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json({ product: row });
});

app.post('/api/stores/imported/:id/confirm-sync', requireAuth, (req: AuthenticatedRequest, res) => {
  const { confirmed, title, description, price } = req.body as {
    confirmed?: boolean;
    title?: string;
    description?: string;
    price?: number;
  };
  if (!confirmed) {
    res.status(400).json({ error: 'Explicit customer confirmation is required before updating or syncing store products.' });
    return;
  }
  const item = db
    .prepare(
      `SELECT ip.id, s.status as store_status FROM imported_products ip
       JOIN stores s ON s.id = ip.store_id
       WHERE ip.id = ? AND ip.user_id = ?`
    )
    .get(Number(req.params.id), req.user!.id) as { id: number; store_status: string } | undefined;

  if (!item) {
    res.status(404).json({ error: 'Imported product draft not found.' });
    return;
  }

  const nextSyncStatus = item.store_status === 'connected' ? 'confirmed_synced' : 'draft';
  db.prepare(
    `UPDATE imported_products
     SET title = COALESCE(?, title),
         description = COALESCE(?, description),
         price = COALESCE(?, price),
         sync_status = ?,
         updated_at = datetime('now')
     WHERE id = ?`
  ).run(title?.trim() || null, description ?? null, typeof price === 'number' ? price : null, nextSyncStatus, item.id);

  const updated = db.prepare('SELECT * FROM imported_products WHERE id = ?').get(item.id);
  res.json({
    product: updated,
    requiresShopifyOAuth: item.store_status !== 'connected',
  });
});

app.delete('/api/stores/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  db.prepare('DELETE FROM stores WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user!.id);
  logAudit(req.user!.id, req.user!.email, 'STORE_DISCONNECTED', `Store ID ${req.params.id} removed`);
  res.json({ ok: true });
});

// ==================== MARKETING STUDIO ====================
app.get('/api/marketing/assets', requireAuth, (req: AuthenticatedRequest, res) => {
  const rows = db.prepare('SELECT * FROM marketing_assets WHERE user_id = ? ORDER BY id DESC').all(req.user!.id);
  res.json({ assets: rows });
});

app.post('/api/marketing/generate', requireAuth, rateLimit('ai', 15, 60_000), async (req: AuthenticatedRequest, res) => {
  const { toolType, productName, audience, tone, folder, extraNotes } = req.body as {
    toolType?: string;
    productName?: string;
    audience?: string;
    tone?: string;
    folder?: string;
    extraNotes?: string;
  };
  if (!toolType?.trim() || !productName?.trim()) {
    res.status(400).json({ error: 'Tool type and product name are required.' });
    return;
  }

  const sub = db.prepare('SELECT ai_credits_limit, ai_credits_used FROM subscriptions WHERE user_id = ?').get(req.user!.id) as
    | { ai_credits_limit: number; ai_credits_used: number }
    | undefined;
  if (!sub || sub.ai_credits_used >= sub.ai_credits_limit) {
    res.status(402).json({ error: 'Monthly AI credit limit reached.' });
    return;
  }

  const biz = db.prepare('SELECT model FROM businesses WHERE user_id = ?').get(req.user!.id) as { model: string } | undefined;

  try {
    const generated = await generateMarketingCopy({
      toolType: toolType.trim(),
      productName: productName.trim(),
      audience: audience?.trim() || 'Online shoppers',
      tone: tone?.trim() || 'Clear, trustworthy, modern',
      businessModel: biz?.model || 'General E-commerce',
      extraNotes,
    });

    const insert = db
      .prepare(`INSERT INTO marketing_assets (user_id, tool_type, title, content, status, folder) VALUES (?, ?, ?, ?, 'draft', ?)`)
      .run(req.user!.id, toolType.trim(), generated.title, generated.content, folder?.trim() || 'General');

    db.prepare("UPDATE subscriptions SET ai_credits_used = ai_credits_used + 1, updated_at = datetime('now') WHERE user_id = ?").run(req.user!.id);
    db.prepare('INSERT INTO usage_records (user_id, feature, model, tokens_approx) VALUES (?, ?, ?, ?)').run(
      req.user!.id,
      `marketing:${toolType.trim()}`,
      'gemini-4-hydrogen',
      generated.tokensApprox
    );

    const asset = db.prepare('SELECT * FROM marketing_assets WHERE id = ?').get(Number(insert.lastInsertRowid));
    res.status(201).json({ asset });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Marketing generation failed' });
  }
});

app.patch('/api/marketing/assets/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const { title, content, status, folder } = req.body as { title?: string; content?: string; status?: 'draft' | 'approved'; folder?: string };
  const exists = db.prepare('SELECT id FROM marketing_assets WHERE id = ? AND user_id = ?').get(Number(req.params.id), req.user!.id);
  if (!exists) {
    res.status(404).json({ error: 'Asset not found.' });
    return;
  }
  db.prepare(
    `UPDATE marketing_assets
     SET title = COALESCE(?, title),
         content = COALESCE(?, content),
         status = COALESCE(?, status),
         folder = COALESCE(?, folder)
     WHERE id = ?`
  ).run(title ?? null, content ?? null, status ?? null, folder ?? null, Number(req.params.id));
  const asset = db.prepare('SELECT * FROM marketing_assets WHERE id = ?').get(Number(req.params.id));
  res.json({ asset });
});

app.delete('/api/marketing/assets/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  db.prepare('DELETE FROM marketing_assets WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user!.id);
  res.json({ ok: true });
});

// ==================== FINANCE CENTER ====================
app.get('/api/finance/records', requireAuth, (req: AuthenticatedRequest, res) => {
  const records = db.prepare('SELECT * FROM financial_records WHERE user_id = ? ORDER BY record_date DESC, id DESC').all(req.user!.id);
  res.json({ records });
});

app.post('/api/finance/records', requireAuth, (req: AuthenticatedRequest, res) => {
  const { record_type, category, description, amount, currency, record_date } = req.body as {
    record_type?: string;
    category?: string;
    description?: string;
    amount?: number;
    currency?: string;
    record_date?: string;
  };
  if (!record_type || !category?.trim() || typeof amount !== 'number' || Number.isNaN(amount)) {
    res.status(400).json({ error: 'Record type, category, and numeric amount are required.' });
    return;
  }
  const result = db
    .prepare(
      `INSERT INTO financial_records (user_id, record_type, category, description, amount, currency, record_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user!.id,
      record_type,
      category.trim(),
      description?.trim() || '',
      amount,
      currency || 'USD',
      record_date || new Date().toISOString().slice(0, 10)
    );
  const record = db.prepare('SELECT * FROM financial_records WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json({ record });
});

app.delete('/api/finance/records/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  db.prepare('DELETE FROM financial_records WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user!.id);
  res.json({ ok: true });
});

// ==================== TASKS ====================
app.get('/api/tasks', requireAuth, (req: AuthenticatedRequest, res) => {
  const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ? AND dismissed = 0 ORDER BY completed ASC, id DESC').all(req.user!.id);
  res.json({ tasks });
});

app.post('/api/tasks', requireAuth, (req: AuthenticatedRequest, res) => {
  const { phase, title, priority, due_date } = req.body as { phase?: string; title?: string; priority?: string; due_date?: string };
  if (!title?.trim()) {
    res.status(400).json({ error: 'Task title is required.' });
    return;
  }
  const result = db
    .prepare(`INSERT INTO tasks (user_id, phase, title, priority, due_date) VALUES (?, ?, ?, ?, ?)`)
    .run(req.user!.id, phase || 'Planning', title.trim(), priority || 'medium', due_date || null);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json({ task });
});

app.patch('/api/tasks/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const { completed, dismissed, title, priority } = req.body as { completed?: boolean; dismissed?: boolean; title?: string; priority?: string };
  const owned = db.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?').get(Number(req.params.id), req.user!.id);
  if (!owned) {
    res.status(404).json({ error: 'Task not found.' });
    return;
  }
  db.prepare(
    `UPDATE tasks
     SET completed = COALESCE(?, completed),
         dismissed = COALESCE(?, dismissed),
         title = COALESCE(?, title),
         priority = COALESCE(?, priority)
     WHERE id = ?`
  ).run(
    typeof completed === 'boolean' ? (completed ? 1 : 0) : null,
    typeof dismissed === 'boolean' ? (dismissed ? 1 : 0) : null,
    title?.trim() || null,
    priority || null,
    Number(req.params.id)
  );
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(Number(req.params.id));
  res.json({ task });
});

app.delete('/api/tasks/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user!.id);
  res.json({ ok: true });
});

// ==================== EXPERT MARKETPLACE ====================
app.get('/api/experts', requireAuth, (_req, res) => {
  const experts = db.prepare('SELECT * FROM experts WHERE approved = 1 ORDER BY rating DESC').all();
  res.json({ experts });
});

app.get('/api/experts/requests', requireAuth, (req: AuthenticatedRequest, res) => {
  const requests = db
    .prepare(
      `SELECT er.*, e.name as expert_name, e.hourly_rate
       FROM expert_requests er
       LEFT JOIN experts e ON e.id = er.expert_id
       WHERE er.user_id = ?
       ORDER BY er.id DESC`
    )
    .all(req.user!.id);
  res.json({ requests });
});

app.post('/api/experts/requests', requireAuth, (req: AuthenticatedRequest, res) => {
  const { expertId, category, title, description, budget } = req.body as {
    expertId?: number;
    category?: string;
    title?: string;
    description?: string;
    budget?: string;
  };
  if (!category?.trim() || !title?.trim() || !description?.trim()) {
    res.status(400).json({ error: 'Category, project title, and requirements description are required.' });
    return;
  }
  const result = db
    .prepare(`INSERT INTO expert_requests (user_id, expert_id, category, title, description, budget, status) VALUES (?, ?, ?, ?, ?, ?, 'submitted')`)
    .run(req.user!.id, expertId || null, category.trim(), title.trim(), description.trim(), budget?.trim() || 'Flexible');
  const row = db.prepare('SELECT * FROM expert_requests WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json({ request: row });
});

app.patch('/api/experts/requests/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const { status } = req.body as { status?: string };
  const owned = db.prepare('SELECT id FROM expert_requests WHERE id = ? AND user_id = ?').get(Number(req.params.id), req.user!.id);
  if (!owned) {
    res.status(404).json({ error: 'Expert request not found.' });
    return;
  }
  if (status === 'scope_approved' || status === 'completed') {
    db.prepare('UPDATE expert_requests SET status = ? WHERE id = ?').run(status, Number(req.params.id));
  }
  res.json({ ok: true });
});

// ==================== LEARNING CENTER ====================
app.get('/api/learning/progress', requireAuth, (req: AuthenticatedRequest, res) => {
  const rows = db.prepare('SELECT * FROM learning_progress WHERE user_id = ?').all(req.user!.id);
  res.json({ progress: rows });
});

app.post('/api/learning/progress', requireAuth, (req: AuthenticatedRequest, res) => {
  const { lessonId, completed, saved } = req.body as { lessonId?: string; completed?: boolean; saved?: boolean };
  if (!lessonId?.trim()) {
    res.status(400).json({ error: 'Lesson ID is required.' });
    return;
  }
  db.prepare(
    `INSERT INTO learning_progress (user_id, lesson_id, completed, saved)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, lesson_id) DO UPDATE SET
       completed = COALESCE(?, completed),
       saved = COALESCE(?, saved),
       updated_at = datetime('now')`
  ).run(
    req.user!.id,
    lessonId.trim(),
    completed ? 1 : 0,
    saved ? 1 : 0,
    typeof completed === 'boolean' ? (completed ? 1 : 0) : null,
    typeof saved === 'boolean' ? (saved ? 1 : 0) : null
  );
  res.json({ ok: true });
});

// ==================== NOTIFICATIONS & SUPPORT ====================
app.get('/api/notifications', requireAuth, (req: AuthenticatedRequest, res) => {
  const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 40').all(req.user!.id);
  res.json({ notifications });
});

app.post('/api/notifications/mark-read', requireAuth, (req: AuthenticatedRequest, res) => {
  const { id } = req.body as { id?: number };
  if (id) {
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(id, req.user!.id);
  } else {
    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user!.id);
  }
  res.json({ ok: true });
});

app.get('/api/support/tickets', requireAuth, (req: AuthenticatedRequest, res) => {
  const tickets = db.prepare('SELECT * FROM support_tickets WHERE user_id = ? ORDER BY id DESC').all(req.user!.id);
  res.json({ tickets });
});

app.post('/api/support/tickets', rateLimit('support', 10, 60_000), (req: AuthenticatedRequest, res) => {
  const { email, subject, message } = req.body as { email?: string; subject?: string; message?: string };
  // Optional auth check
  let userId: number | null = null;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    // Let's keep support submission available both on public Contact page and inside dashboard
    const authHeader = req.headers.authorization;
    if (authHeader) {
      // Best-effort decode via existing endpoint middleware if needed
    }
  }
  if (!email?.trim() || !subject?.trim() || !message?.trim()) {
    res.status(400).json({ error: 'Email, subject, and message are required.' });
    return;
  }
  const rowUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase()) as { id: number } | undefined;
  userId = rowUser?.id ?? null;

  const result = db
    .prepare(`INSERT INTO support_tickets (user_id, email, subject, message, status) VALUES (?, ?, ?, ?, 'open')`)
    .run(userId, email.trim().toLowerCase(), subject.trim(), message.trim());
  const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json({ ticket });
});

// ==================== SUBSCRIPTIONS & BILLING ====================
app.get('/api/billing', requireAuth, (req: AuthenticatedRequest, res) => {
  const subscription = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(req.user!.id);
  const payments = db.prepare('SELECT * FROM payments WHERE user_id = ? ORDER BY id DESC').all(req.user!.id);
  res.json({
    subscription,
    payments,
    plans: getPlansConfig(),
    paymentGatewayMode: process.env.STRIPE_SECRET_KEY ? 'live' : 'sandbox',
  });
});

app.post('/api/billing/checkout', requireAuth, (req: AuthenticatedRequest, res) => {
  const { plan, billingCycle, simulateOutcome, confirmSandbox } = req.body as {
    plan?: 'starter' | 'builder' | 'professional';
    billingCycle?: 'monthly' | 'annual';
    simulateOutcome?: 'succeeded' | 'failed';
    confirmSandbox?: boolean;
  };
  const plans = getPlansConfig();
  if (!plan || !plans[plan]) {
    res.status(400).json({ error: 'Invalid subscription plan.' });
    return;
  }
  if (!confirmSandbox) {
    res.status(400).json({ error: 'Explicit sandbox confirmation is required before testing subscription checkout.' });
    return;
  }

  const cycle = billingCycle === 'annual' ? 'annual' : 'monthly';
  const unitPrice = cycle === 'annual' ? plans[plan].annualPrice : plans[plan].monthlyPrice;
  const amountCents = Math.round(unitPrice * (cycle === 'annual' ? 12 : 1) * 100);
  const outcome = simulateOutcome === 'failed' ? 'failed' : 'succeeded';
  const ref = `sbx_${crypto.randomBytes(6).toString('hex')}`;

  db.prepare(
    `INSERT INTO payments (user_id, amount_cents, currency, plan, billing_cycle, status, provider, provider_ref)
     VALUES (?, ?, 'USD', ?, ?, ?, 'sandbox_adapter', ?)`
  ).run(req.user!.id, amountCents, plan, cycle, outcome, ref);

  if (outcome === 'failed') {
    db.prepare(`UPDATE subscriptions SET status = 'past_due', updated_at = datetime('now') WHERE user_id = ?`).run(req.user!.id);
    logAudit(req.user!.id, req.user!.email, 'SANDBOX_PAYMENT_FAILED', `Plan ${plan} (${cycle})`);
    res.status(402).json({ error: 'Sandbox payment declined as simulated. Plan status marked past_due.' });
    return;
  }

  const nextEnd = new Date(Date.now() + (cycle === 'annual' ? 365 : 30) * 86400000).toISOString();
  db.prepare(
    `UPDATE subscriptions
     SET plan = ?, billing_cycle = ?, status = 'active', ai_credits_limit = ?, current_period_end = ?, updated_at = datetime('now')
     WHERE user_id = ?`
  ).run(plan, cycle, plans[plan].aiCredits, nextEnd, req.user!.id);

  db.prepare(`
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (?, 'subscription', 'Sandbox Subscription Updated', ?)
  `).run(req.user!.id, `Your workspace moved to ${plans[plan].name} (${cycle}) in sandbox mode.`);

  logAudit(req.user!.id, req.user!.email, 'SANDBOX_PAYMENT_SUCCEEDED', `Plan ${plan} (${cycle}) ref ${ref}`);
  res.json({ ok: true, ref, ...buildUserContext(req.user!.id) });
});

app.post('/api/billing/cancel', requireAuth, (req: AuthenticatedRequest, res) => {
  db.prepare(`UPDATE subscriptions SET status = 'canceled', updated_at = datetime('now') WHERE user_id = ?`).run(req.user!.id);
  logAudit(req.user!.id, req.user!.email, 'SUBSCRIPTION_CANCELED', 'Customer canceled subscription');
  res.json({ ok: true, ...buildUserContext(req.user!.id) });
});

// ==================== ADMIN CONTROL CENTER ====================
app.get('/api/admin/status', (req, res) => {
  const envConfigured = Boolean(process.env.ADMIN_PASSCODE?.trim());
  const claimedRow = db.prepare('SELECT value FROM platform_settings WHERE key = ?').get('admin_passcode_hash') as { value: string } | undefined;
  res.json({
    envConfigured,
    claimed: Boolean(claimedRow),
    requiresFirstRunClaim: !envConfigured && !claimedRow,
  });
});

app.post('/api/admin/claim', rateLimit('admin_auth', 10, 60_000), (req, res) => {
  const { passcode, email } = req.body as { passcode?: string; email?: string };
  if (!passcode || passcode.length < 8) {
    res.status(400).json({ error: 'Admin passcode must be at least 8 characters.' });
    return;
  }

  const envPasscode = process.env.ADMIN_PASSCODE?.trim();
  const claimedRow = db.prepare('SELECT value FROM platform_settings WHERE key = ?').get('admin_passcode_hash') as { value: string } | undefined;

  let authorized = false;
  if (envPasscode) {
    const a = Buffer.from(passcode);
    const b = Buffer.from(envPasscode);
    authorized = a.length === b.length && crypto.timingSafeEqual(a, b);
  } else if (claimedRow) {
    authorized = verifyPassword(passcode, claimedRow.value);
  } else {
    // First-run atomic bootstrap
    db.prepare('INSERT INTO platform_settings (key, value) VALUES (?, ?)').run('admin_passcode_hash', hashPassword(passcode));
    authorized = true;
  }

  if (!authorized) {
    res.status(401).json({ error: 'Invalid admin passcode.' });
    return;
  }

  const adminEmail = (email?.trim().toLowerCase() || 'admin@launchly.app');
  let adminUser = db.prepare('SELECT id, email, role FROM users WHERE email = ?').get(adminEmail) as
    | { id: number; email: string; role: 'customer' | 'admin' }
    | undefined;

  if (!adminUser) {
    const created = db
      .prepare(`INSERT INTO users (email, password_hash, name, role, email_verified) VALUES (?, ?, 'LAUNCHLY Administrator', 'admin', 1)`)
      .run(adminEmail, hashPassword(crypto.randomBytes(24).toString('hex')));
    adminUser = { id: Number(created.lastInsertRowid), email: adminEmail, role: 'admin' };
  } else if (adminUser.role !== 'admin') {
    db.prepare(`UPDATE users SET role = 'admin' WHERE id = ?`).run(adminUser.id);
    adminUser.role = 'admin';
  }

  // Ensure admin user has supporting rows so buildUserContext never breaks
  const hasBiz = db.prepare('SELECT id FROM businesses WHERE user_id = ?').get(adminUser.id);
  if (!hasBiz) {
    db.prepare(`INSERT INTO businesses (user_id, name, model, stage, launch_progress) VALUES (?, 'LAUNCHLY Operations', 'General E-commerce', 'Live', 100)`).run(adminUser.id);
    db.prepare(`INSERT INTO onboarding_responses (user_id, completed) VALUES (?, 1)`).run(adminUser.id);
    db.prepare(`INSERT INTO subscriptions (user_id, plan, billing_cycle, status, ai_credits_limit, current_period_end) VALUES (?, 'professional', 'annual', 'active', 1000, datetime('now', '+365 days'))`).run(adminUser.id);
  }

  logAudit(adminUser.id, adminUser.email, 'ADMIN_SESSION_GRANTED', 'Admin authenticated via protected passcode verification');
  const token = signToken({ uid: adminUser.id, email: adminUser.email, role: 'admin' });
  res.json({ token, ...buildUserContext(adminUser.id) });
});

app.get('/api/admin/overview', requireAdmin, (_req, res) => {
  const customersCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'customer' AND deletion_requested = 0").get() as { c: number }).c;
  const activeSubs = (db.prepare("SELECT COUNT(*) as c FROM subscriptions WHERE status IN ('active', 'trialing')").get() as { c: number }).c;
  const sandboxRevenueCents = (db.prepare("SELECT COALESCE(SUM(amount_cents), 0) as s FROM payments WHERE status = 'succeeded'").get() as { s: number }).s;
  const aiCallsCount = (db.prepare('SELECT COUNT(*) as c FROM usage_records').get() as { c: number }).c;
  const openTickets = (db.prepare("SELECT COUNT(*) as c FROM support_tickets WHERE status != 'resolved'").get() as { c: number }).c;
  const pendingExperts = (db.prepare('SELECT COUNT(*) as c FROM experts WHERE approved = 0').get() as { c: number }).c;
  const auditLogs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 25').all();

  res.json({
    metrics: {
      customersCount,
      activeSubs,
      sandboxRevenueUsd: sandboxRevenueCents / 100,
      aiCallsCount,
      openTickets,
      pendingExperts,
    },
    integrations: {
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      shopifyOAuthConfigured: Boolean(process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET),
      stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    },
    auditLogs,
  });
});

app.get('/api/admin/customers', requireAdmin, (_req, res) => {
  const customers = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.is_demo, u.email_verified, u.country, u.created_at,
              b.name as business_name, b.model, b.stage,
              s.plan, s.status as sub_status, s.ai_credits_used, s.ai_credits_limit
       FROM users u
       LEFT JOIN businesses b ON b.user_id = u.id
       LEFT JOIN subscriptions s ON s.user_id = u.id
       WHERE u.role = 'customer'
       ORDER BY u.id DESC`
    )
    .all();
  res.json({ customers });
});

app.get('/api/admin/experts', requireAdmin, (_req, res) => {
  const experts = db.prepare('SELECT * FROM experts ORDER BY approved ASC, id DESC').all();
  res.json({ experts });
});

app.patch('/api/admin/experts/:id/approve', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { approved } = req.body as { approved?: boolean };
  db.prepare('UPDATE experts SET approved = ?, availability = ? WHERE id = ?').run(
    approved ? 1 : 0,
    approved ? 'Available this week' : 'Pending approval',
    Number(req.params.id)
  );
  logAudit(req.user!.id, req.user!.email, 'ADMIN_EXPERT_REVIEW', `Expert #${req.params.id} approved=${Boolean(approved)}`);
  res.json({ ok: true });
});

app.get('/api/admin/suppliers', requireAdmin, (_req, res) => {
  const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY id ASC').all();
  res.json({ suppliers });
});

app.patch('/api/admin/suppliers/:id/verify', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { verification_status } = req.body as { verification_status?: 'verified' | 'manually_reviewed' | 'unverified' };
  if (!verification_status || !['verified', 'manually_reviewed', 'unverified'].includes(verification_status)) {
    res.status(400).json({ error: 'Invalid verification status.' });
    return;
  }
  db.prepare('UPDATE suppliers SET verification_status = ? WHERE id = ?').run(verification_status, Number(req.params.id));
  logAudit(req.user!.id, req.user!.email, 'ADMIN_SUPPLIER_STATUS', `Supplier #${req.params.id} -> ${verification_status}`);
  res.json({ ok: true });
});

app.get('/api/admin/tickets', requireAdmin, (_req, res) => {
  const tickets = db.prepare('SELECT * FROM support_tickets ORDER BY id DESC').all();
  res.json({ tickets });
});

app.patch('/api/admin/tickets/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { status, admin_reply } = req.body as { status?: string; admin_reply?: string };
  db.prepare('UPDATE support_tickets SET status = COALESCE(?, status), admin_reply = COALESCE(?, admin_reply) WHERE id = ?').run(
    status ?? null,
    admin_reply ?? null,
    Number(req.params.id)
  );
  logAudit(req.user!.id, req.user!.email, 'ADMIN_TICKET_UPDATED', `Ticket #${req.params.id} updated`);
  res.json({ ok: true });
});

app.get('/api/admin/ai-usage', requireAdmin, (_req, res) => {
  const records = db
    .prepare(
      `SELECT ur.*, u.email FROM usage_records ur
       LEFT JOIN users u ON u.id = ur.user_id
       ORDER BY ur.id DESC LIMIT 50`
    )
    .all();
  res.json({ records });
});

app.get('/api/admin/payments', requireAdmin, (_req, res) => {
  const payments = db
    .prepare(
      `SELECT p.*, u.email FROM payments p
       LEFT JOIN users u ON u.id = p.user_id
       ORDER BY p.id DESC LIMIT 50`
    )
    .all();
  res.json({ payments });
});

app.put('/api/admin/settings/plans', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { plans } = req.body as { plans?: Record<string, unknown> };
  if (!plans) {
    res.status(400).json({ error: 'Plans payload required.' });
    return;
  }
  db.prepare("INSERT INTO platform_settings (key, value) VALUES ('plans_config', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')").run(
    JSON.stringify(plans)
  );
  logAudit(req.user!.id, req.user!.email, 'ADMIN_PLANS_UPDATED', 'Updated subscription tier pricing');
  res.json({ ok: true, plans });
});

// ==================== SERVER STARTUP ====================
async function startServer() {
  const PORT = 3000;
  const distDir = path.resolve(process.cwd(), 'dist');

  if (process.env.NODE_ENV === 'production' && fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LAUNCHLY server running at http://localhost:${PORT}`);
  });
}

startServer();
