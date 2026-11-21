import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.ts';

const EPHEMERAL_SECRET = crypto.randomBytes(32).toString('hex');

function getSessionSecret(): string {
  return process.env.SESSION_SECRET || EPHEMERAL_SECRET;
}

export interface AuthPayload {
  uid: number;
  email: string;
  role: 'customer' | 'admin';
  exp: number;
}

export function signToken(payload: Omit<AuthPayload, 'exp'>): string {
  const full: AuthPayload = {
    ...payload,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const body = Buffer.from(JSON.stringify(full)).toString('base64url');
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token: string): AuthPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = crypto.createHmac('sha256', getSessionSecret()).update(body).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AuthPayload;
    if (!parsed.uid || !parsed.exp || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
    role: 'customer' | 'admin';
    is_demo: number;
    email_verified: number;
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  const token = authHeader.slice(7).trim();
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }
  const row = db
    .prepare('SELECT id, email, name, role, is_demo, email_verified, deletion_requested FROM users WHERE id = ?')
    .get(payload.uid) as
    | { id: number; email: string; name: string; role: 'customer' | 'admin'; is_demo: number; email_verified: number; deletion_requested: number }
    | undefined;

  if (!row || row.deletion_requested) {
    res.status(401).json({ error: 'Account unavailable.' });
    return;
  }
  req.user = row;
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Administrator permissions required.' });
      return;
    }
    next();
  });
}

// Simple in-memory rate limiter for AI and auth endpoints
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(keyPrefix: string, maxRequests: number, windowMs: number) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const identity = req.user ? `u:${req.user.id}` : `ip:${req.ip || 'local'}`;
    const bucketKey = `${keyPrefix}:${identity}`;
    const now = Date.now();
    const existing = rateBuckets.get(bucketKey);
    if (!existing || existing.resetAt <= now) {
      rateBuckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (existing.count >= maxRequests) {
      res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment and try again.' });
      return;
    }
    existing.count += 1;
    next();
  };
}
