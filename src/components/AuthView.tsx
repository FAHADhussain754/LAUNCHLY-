import { useState, useEffect } from 'react';
import { ArrowLeft, Shield, KeyRound } from 'lucide-react';
import { apiRequest, setAuthToken } from '../lib/api';
import type { WorkspaceContext } from '../types';

interface AuthViewProps {
  initialMode: 'login' | 'register';
  onBack: () => void;
  onAuthenticated: (ctx: WorkspaceContext, verificationToken?: string) => void;
}

type AuthScreenMode = 'login' | 'register' | 'reset' | 'admin';

export function AuthView({ initialMode, onBack, onAuthenticated }: AuthViewProps) {
  const [mode, setMode] = useState<AuthScreenMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('United States');
  const [resetToken, setResetToken] = useState('');
  const [previewResetToken, setPreviewResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');

  const [adminStatus, setAdminStatus] = useState<{ requiresFirstRunClaim: boolean; envConfigured: boolean } | null>(null);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [adminEmail, setAdminEmail] = useState('admin@launchly.app');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (mode === 'admin') {
      apiRequest<{ requiresFirstRunClaim: boolean; envConfigured: boolean }>('/api/admin/status')
        .then(setAdminStatus)
        .catch(() => {});
    }
  }, [mode]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<WorkspaceContext & { token: string; verificationToken?: string }>('/api/auth/register', {
        method: 'POST',
        body: { name, email, password, country },
      });
      setAuthToken(res.token);
      onAuthenticated(res, res.verificationToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<WorkspaceContext & { token: string }>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      setAuthToken(res.token);
      onAuthenticated(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<WorkspaceContext & { token: string }>('/api/auth/demo', { method: 'POST' });
      setAuthToken(res.token);
      onAuthenticated(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const res = await apiRequest<{ message: string; previewResetToken?: string }>('/api/auth/request-reset', {
        method: 'POST',
        body: { email },
      });
      setNotice(res.message);
      if (res.previewResetToken) {
        setPreviewResetToken(res.previewResetToken);
        setResetToken(res.previewResetToken);
      }
      setResetStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: { email, token: resetToken, newPassword },
      });
      setNotice('Password updated. You can now sign in with your new password.');
      setMode('login');
      setResetStep('request');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<WorkspaceContext & { token: string }>('/api/admin/claim', {
        method: 'POST',
        body: { passcode: adminPasscode, email: adminEmail },
      });
      setAuthToken(res.token);
      onAuthenticated(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9F8] dark:bg-[#0B1318] flex flex-col justify-center px-4 py-10">
      <div className="max-w-md w-full mx-auto space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 min-h-[44px] text-sm font-medium text-[#667085] dark:text-[#94A3AF] hover:text-[#101C24] dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to LAUNCHLY</span>
        </button>

        <div className="bg-white dark:bg-[#101C24] border border-[#E6EBE8] dark:border-[#1E2D36] rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-2xl font-bold text-[#101C24] dark:text-[#F0F5F2]">
                {mode === 'register' && 'Create your LAUNCHLY account'}
                {mode === 'login' && 'Sign in to LAUNCHLY'}
                {mode === 'reset' && 'Recover your password'}
                {mode === 'admin' && 'Admin Control Center'}
              </h1>
              <p className="text-xs text-[#667085] dark:text-[#94A3AF] mt-1">
                {mode === 'admin'
                  ? 'Protected platform administration access'
                  : 'Your Business. One Platform.'}
              </p>
            </div>
          </div>

          {mode !== 'admin' && (
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1318] border border-[#E6EBE8] dark:border-[#1E2D36] mb-6">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); }}
                className={`min-h-[40px] text-xs font-semibold rounded-lg transition-colors ${
                  mode === 'login' ? 'bg-white dark:bg-[#101C24] text-[#101C24] dark:text-white shadow-xs' : 'text-[#667085]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(''); }}
                className={`min-h-[40px] text-xs font-semibold rounded-lg transition-colors ${
                  mode === 'register' ? 'bg-white dark:bg-[#101C24] text-[#101C24] dark:text-white shadow-xs' : 'text-[#667085]'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl border border-[#E45B63]/40 bg-[#E45B63]/10 text-xs text-[#E45B63]">
              {error}
            </div>
          )}
          {notice && (
            <div className="mb-4 p-3 rounded-xl border border-[#43D9A3]/40 bg-[#43D9A3]/10 text-xs text-[#153C32] dark:text-[#43D9A3]">
              {notice}
            </div>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="reg-name" className="block text-xs font-medium mb-1">Full Name</label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Samira Patel"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
                />
              </div>
              <div>
                <label htmlFor="reg-email" className="block text-xs font-medium mb-1">Email Address</label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="founder@brand.com"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
                />
              </div>
              <div>
                <label htmlFor="reg-country" className="block text-xs font-medium mb-1">Country</label>
                <input
                  id="reg-country"
                  type="text"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
                />
              </div>
              <div>
                <label htmlFor="reg-password" className="block text-xs font-medium mb-1">Password (8+ characters)</label>
                <input
                  id="reg-password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[44px] rounded-xl bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] text-sm font-semibold hover:bg-[#153C32] transition-colors disabled:opacity-60"
              >
                {loading ? 'Creating Workspace...' : 'Create Account & Start Onboarding'}
              </button>
            </form>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-xs font-medium mb-1">Email Address</label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="login-password" className="text-xs font-medium">Password</label>
                  <button
                    type="button"
                    onClick={() => { setMode('reset'); setError(''); }}
                    className="text-xs text-[#153C32] dark:text-[#43D9A3] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[44px] rounded-xl bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] text-sm font-semibold hover:bg-[#153C32] transition-colors disabled:opacity-60"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          )}

          {mode === 'reset' && (
            <div className="space-y-4">
              {resetStep === 'request' ? (
                <form onSubmit={handleRequestReset} className="space-y-4">
                  <div>
                    <label htmlFor="reset-email" className="block text-xs font-medium mb-1">Account Email</label>
                    <input
                      id="reset-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full min-h-[44px] rounded-xl bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] text-sm font-semibold"
                  >
                    {loading ? 'Generating Token...' : 'Request Password Reset'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleConfirmReset} className="space-y-4">
                  {previewResetToken && (
                    <div className="p-3 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1318] border border-[#E6EBE8] dark:border-[#1E2D36] text-xs">
                      Sandbox Email Preview Reset Token: <span className="font-mono font-semibold select-all">{previewResetToken}</span>
                    </div>
                  )}
                  <div>
                    <label htmlFor="reset-token" className="block text-xs font-medium mb-1">Reset Token</label>
                    <input
                      id="reset-token"
                      type="text"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="reset-new-pw" className="block text-xs font-medium mb-1">New Password (8+ chars)</label>
                    <input
                      id="reset-new-pw"
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full min-h-[44px] rounded-xl bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] text-sm font-semibold"
                  >
                    Update Password
                  </button>
                </form>
              )}
              <button type="button" onClick={() => setMode('login')} className="text-xs text-[#667085] hover:underline">
                Return to Sign In
              </button>
            </div>
          )}

          {mode === 'admin' && (
            <form onSubmit={handleAdminClaim} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1318] border border-[#E6EBE8] dark:border-[#1E2D36] text-xs text-[#667085] dark:text-[#94A3AF] leading-relaxed">
                {adminStatus?.requiresFirstRunClaim
                  ? 'First-Run Setup: No ADMIN_PASSCODE secret is set yet. Choose an 8+ character administrator passcode below to claim and lock Admin Control Center access.'
                  : 'Enter your configured administrator passcode to open the protected Admin Control Center.'}
              </div>
              <div>
                <label htmlFor="admin-email" className="block text-xs font-medium mb-1">Admin Email</label>
                <input
                  id="admin-email"
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
                />
              </div>
              <div>
                <label htmlFor="admin-passcode" className="block text-xs font-medium mb-1">
                  {adminStatus?.requiresFirstRunClaim ? 'Claim New Admin Passcode (8+ chars)' : 'Admin Passcode'}
                </label>
                <input
                  id="admin-passcode"
                  type="password"
                  required
                  minLength={8}
                  value={adminPasscode}
                  onChange={(e) => setAdminPasscode(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] bg-[#F7F9F8] dark:bg-[#0B1318] text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[44px] rounded-xl bg-[#101C24] dark:bg-[#43D9A3] text-white dark:text-[#101C24] text-sm font-semibold flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>{adminStatus?.requiresFirstRunClaim ? 'Claim Admin Access' : 'Sign In as Administrator'}</span>
              </button>
              <button type="button" onClick={() => setMode('login')} className="text-xs text-[#667085] hover:underline">
                Back to Customer Sign In
              </button>
            </form>
          )}

          {mode !== 'admin' && (
            <div className="mt-6 pt-5 border-t border-[#E6EBE8] dark:border-[#1E2D36] space-y-3">
              <button
                type="button"
                onClick={handleDemo}
                disabled={loading}
                className="w-full min-h-[44px] rounded-xl border border-[#153C32]/30 dark:border-[#43D9A3]/30 bg-[#F7F9F8] dark:bg-[#0B1318] text-xs font-semibold text-[#153C32] dark:text-[#43D9A3] hover:bg-[#153C32]/5 transition-colors"
              >
                Explore Sample Demo Workspace (Clearly Labeled Sample Data)
              </button>
              <button
                type="button"
                onClick={() => { setMode('admin'); setError(''); }}
                className="w-full min-h-[40px] flex items-center justify-center gap-1.5 text-xs text-[#667085] dark:text-[#94A3AF] hover:text-[#101C24] dark:hover:text-white"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Administrator Sign-In / First-Run Claim</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
