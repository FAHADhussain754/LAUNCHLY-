import { useEffect, useState } from 'react';
import { apiRequest, setAuthToken } from './lib/api';
import type { DashboardTab, PublicPage, WorkspaceContext } from './types';
import { PublicHeader } from './components/PublicHeader';
import { PublicFooter } from './components/PublicFooter';
import { PublicPages } from './components/PublicPages';
import { AuthView } from './components/AuthView';
import { OnboardingWizard } from './components/OnboardingWizard';
import { DashboardShell } from './components/dashboard/DashboardShell';
import { OverviewView } from './components/dashboard/OverviewView';
import { BusinessRoadmapView } from './components/dashboard/BusinessRoadmapView';
import { AiAdvisorView } from './components/dashboard/AiAdvisorView';
import { ProductResearchView } from './components/dashboard/ProductResearchView';
import { SupplierCenterView } from './components/dashboard/SupplierCenterView';
import { StoreManagerView } from './components/dashboard/StoreManagerView';
import { MarketingStudioView } from './components/dashboard/MarketingStudioView';
import { FinanceCenterView } from './components/dashboard/FinanceCenterView';
import { ExpertMarketplaceView } from './components/dashboard/ExpertMarketplaceView';
import { LearningCenterView } from './components/dashboard/LearningCenterView';
import { BillingView } from './components/dashboard/BillingView';
import { NotificationsView, SettingsView, AdminControlCenter } from './components/dashboard/AccountViews';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [publicPage, setPublicPage] = useState<PublicPage>('home');
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceContext | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [verificationToken, setVerificationToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  const refreshWorkspace = async () => {
    try {
      const ctx = await apiRequest<WorkspaceContext>('/api/auth/me');
      setWorkspace(ctx);
    } catch {
      // Ignore if signed out
    }
  };

  const handleAuthenticated = (ctx: WorkspaceContext, vToken?: string) => {
    setWorkspace(ctx);
    setAuthMode(null);
    if (vToken) setVerificationToken(vToken);
    if (ctx.user.role === 'admin') {
      setShowOnboarding(false);
      setActiveTab('admin');
    } else if (ctx.onboarding?.completed === 0) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
      setActiveTab('overview');
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setWorkspace(null);
    setShowOnboarding(false);
    setAuthMode(null);
    setPublicPage('home');
    setVerificationToken(undefined);
  };

  const handleVerifyEmail = async () => {
    const res = await apiRequest<WorkspaceContext>('/api/auth/verify-email', {
      method: 'POST',
      body: { token: verificationToken },
    });
    setWorkspace(res);
  };

  if (workspace && showOnboarding) {
    return (
      <OnboardingWizard
        workspace={workspace}
        onComplete={(updated) => {
          setWorkspace(updated);
          setShowOnboarding(false);
          setActiveTab('overview');
        }}
        onSkipToDashboard={() => {
          setShowOnboarding(false);
          setActiveTab('overview');
        }}
      />
    );
  }

  if (workspace) {
    return (
      <DashboardShell
        workspace={workspace}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
        onVerifyEmail={handleVerifyEmail}
      >
        {activeTab === 'overview' && (
          <OverviewView
            workspace={workspace}
            onSelectTab={setActiveTab}
            onResumeOnboarding={() => setShowOnboarding(true)}
            onRefreshWorkspace={refreshWorkspace}
          />
        )}
        {activeTab === 'business' && (
          <BusinessRoadmapView workspace={workspace} onUpdated={setWorkspace} />
        )}
        {activeTab === 'ai' && (
          <AiAdvisorView workspace={workspace} onCreditsUpdated={refreshWorkspace} />
        )}
        {activeTab === 'products' && (
          <ProductResearchView onWorkspaceChanged={refreshWorkspace} />
        )}
        {activeTab === 'suppliers' && (
          <SupplierCenterView onWorkspaceChanged={refreshWorkspace} />
        )}
        {activeTab === 'store' && (
          <StoreManagerView onWorkspaceChanged={refreshWorkspace} />
        )}
        {activeTab === 'marketing' && (
          <MarketingStudioView onCreditsUpdated={refreshWorkspace} />
        )}
        {activeTab === 'finance' && <FinanceCenterView />}
        {activeTab === 'experts' && <ExpertMarketplaceView />}
        {activeTab === 'learning' && <LearningCenterView />}
        {activeTab === 'notifications' && (
          <NotificationsView onMarkedRead={refreshWorkspace} />
        )}
        {activeTab === 'billing' && (
          <BillingView workspace={workspace} onWorkspaceUpdated={setWorkspace} />
        )}
        {activeTab === 'settings' && (
          <SettingsView
            workspace={workspace}
            onUpdated={setWorkspace}
            onAccountDeleted={handleLogout}
          />
        )}
        {activeTab === 'admin' && workspace.user.role === 'admin' && (
          <AdminControlCenter />
        )}
      </DashboardShell>
    );
  }

  if (authMode) {
    return (
      <AuthView
        initialMode={authMode}
        onBack={() => setAuthMode(null)}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9F8] dark:bg-[#0B1318] text-[#17212B] dark:text-[#F0F5F2]">
      <PublicHeader
        currentPage={publicPage}
        onNavigate={setPublicPage}
        onOpenAuth={(mode) => setAuthMode(mode)}
      />
      <main className="flex-1">
        <PublicPages
          page={publicPage}
          onNavigate={setPublicPage}
          onOpenAuth={(mode) => setAuthMode(mode)}
        />
      </main>
      <PublicFooter
        onNavigate={setPublicPage}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    </div>
  );
}
