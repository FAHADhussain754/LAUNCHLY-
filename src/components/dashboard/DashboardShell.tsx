import { useState } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  Sparkles,
  Search,
  Truck,
  Store,
  Megaphone,
  Wallet,
  Users,
  BookOpen,
  Bell,
  CreditCard,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { DashboardTab, WorkspaceContext } from '../../types';

interface DashboardShellProps {
  workspace: WorkspaceContext;
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onVerifyEmail: () => void;
  children: React.ReactNode;
}

export function DashboardShell({
  workspace,
  activeTab,
  onSelectTab,
  onLogout,
  theme,
  onToggleTheme,
  onVerifyEmail,
  children,
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  const navItems: Array<{ id: DashboardTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'business', label: 'My Business', icon: Briefcase },
    { id: 'ai', label: 'AI Assistant', icon: Sparkles },
    { id: 'products', label: 'Product Research', icon: Search },
    { id: 'suppliers', label: 'Supplier Center', icon: Truck },
    { id: 'store', label: 'Store Manager', icon: Store },
    { id: 'marketing', label: 'Marketing Studio', icon: Megaphone },
    { id: 'finance', label: 'Finance', icon: Wallet },
    { id: 'experts', label: 'Expert Marketplace', icon: Users },
    { id: 'learning', label: 'Learning Center', icon: BookOpen },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (workspace.user.role === 'admin') {
    navItems.push({ id: 'admin', label: 'Admin Control', icon: Shield });
  }

  const activeItem = navItems.find((n) => n.id === activeTab);

  const selectTab = (tab: DashboardTab) => {
    onSelectTab(tab);
    setMobileMoreOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F7F9F8] dark:bg-[#0B1318] text-[#17212B] dark:text-[#F0F5F2] flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-[#E6EBE8] dark:border-[#1E2D36] bg-white dark:bg-[#101C24] transition-all duration-150 ${
          collapsed ? 'w-[72px]' : 'w-[250px]'
        }`}
      >
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#E6EBE8] dark:border-[#1E2D36]">
          <button
            type="button"
            onClick={() => selectTab('overview')}
            className="flex items-center gap-2.5 overflow-hidden whitespace-nowrap"
          >
            <span className="w-7 h-7 shrink-0 rounded-md bg-[#101C24] dark:bg-[#153C32] flex items-center justify-center border border-[#153C32] dark:border-[#43D9A3]/40">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#43D9A3]" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M5 17L12 4l7 13H5z" strokeLinejoin="round" />
              </svg>
            </span>
            {!collapsed && <span className="font-display font-bold text-base tracking-tight">LAUNCHLY</span>}
          </button>
          <button
            type="button"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-lg text-[#667085] hover:text-[#101C24] dark:hover:text-white"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectTab(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full min-h-[40px] px-3 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#101C24] text-white dark:bg-[#43D9A3] dark:text-[#101C24]'
                    : 'text-[#667085] dark:text-[#94A3AF] hover:bg-[#F7F9F8] dark:hover:bg-[#153C32]/30 hover:text-[#101C24] dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && item.id === 'notifications' && workspace.counts.unreadNotifications > 0 && (
                  <span className="ml-auto font-mono tabular-nums text-xs">{workspace.counts.unreadNotifications}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[#E6EBE8] dark:border-[#1E2D36] space-y-1">
          <button
            type="button"
            onClick={onLogout}
            className="w-full min-h-[40px] px-3 rounded-xl flex items-center gap-3 text-sm font-medium text-[#667085] dark:text-[#94A3AF] hover:text-[#E45B63] transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-14 sm:h-16 px-4 sm:px-6 border-b border-[#E6EBE8] dark:border-[#1E2D36] bg-white/95 dark:bg-[#101C24]/95 backdrop-blur-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="lg:hidden font-display font-bold text-base">LAUNCHLY</span>
            <span className="hidden lg:inline text-xs text-[#667085] dark:text-[#94A3AF]">Workspace /</span>
            <h1 className="font-display text-sm sm:text-base font-semibold truncate">
              {activeItem?.label || 'Overview'}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label="Toggle color theme"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] hover:bg-[#F7F9F8] dark:hover:bg-[#153C32]/30"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => selectTab('notifications')}
              aria-label="Notifications"
              className="min-h-[40px] px-3 flex items-center gap-1.5 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] text-xs font-medium hover:bg-[#F7F9F8] dark:hover:bg-[#153C32]/30"
            >
              <Bell className="w-4 h-4" />
              <span className="font-mono tabular-nums">{workspace.counts.unreadNotifications}</span>
            </button>
            <button
              type="button"
              onClick={() => selectTab('settings')}
              className="hidden sm:inline-flex min-h-[40px] px-3 items-center gap-2 rounded-xl border border-[#E6EBE8] dark:border-[#1E2D36] text-xs font-medium"
            >
              <span className="max-w-[140px] truncate">{workspace.user.name}</span>
            </button>
          </div>
        </header>

        {/* Contextual Banners: Sample Demo Notice or Email Verification */}
        {workspace.user.is_demo === 1 && (
          <div className="px-4 sm:px-6 py-2.5 bg-[#153C32] text-white text-xs flex flex-wrap items-center justify-between gap-2">
            <span>
              Sample Demo Workspace: Pre-populated records are clearly labeled as sample data for preview purposes.
            </span>
            <button type="button" onClick={onLogout} className="font-semibold text-[#43D9A3] hover:underline">
              Exit Demo & Register Your Own Business →
            </button>
          </div>
        )}

        {workspace.user.email_verified === 0 && (
          <div className="px-4 sm:px-6 py-2.5 bg-[#F5B942]/15 border-b border-[#F5B942]/30 text-xs flex flex-wrap items-center justify-between gap-2">
            <span>Your email ({workspace.user.email}) is pending verification.</span>
            <button
              type="button"
              onClick={onVerifyEmail}
              className="font-semibold text-[#101C24] dark:text-[#F5B942] underline"
            >
              Confirm Email Verification
            </button>
          </div>
        )}

        {/* Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (5 primary thumb destinations) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 dark:bg-[#101C24]/95 backdrop-blur-md border-t border-[#E6EBE8] dark:border-[#1E2D36] grid grid-cols-5 items-center">
        {[
          { id: 'overview' as DashboardTab, label: 'Home', icon: LayoutDashboard },
          { id: 'ai' as DashboardTab, label: 'AI', icon: Sparkles },
          { id: 'products' as DashboardTab, label: 'Products', icon: Search },
          { id: 'store' as DashboardTab, label: 'Store', icon: Store },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id)}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${
                active ? 'text-[#153C32] dark:text-[#43D9A3] font-semibold' : 'text-[#667085] dark:text-[#94A3AF]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] leading-none">{tab.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMoreOpen(true)}
          className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[#667085] dark:text-[#94A3AF]"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] leading-none">More</span>
        </button>
      </nav>

      {/* Mobile Drawer for Remaining Sections */}
      {mobileMoreOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end">
          <div className="w-full max-h-[82vh] overflow-y-auto bg-white dark:bg-[#101C24] rounded-t-3xl p-5 space-y-2">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6EBE8] dark:border-[#1E2D36]">
              <span className="font-display font-semibold text-base">All Workspace Tools</span>
              <button
                type="button"
                aria-label="Close drawer"
                onClick={() => setMobileMoreOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectTab(item.id)}
                    className={`min-h-[48px] px-3 rounded-xl border text-left flex items-center gap-2.5 text-sm font-medium ${
                      activeTab === item.id
                        ? 'border-[#153C32] dark:border-[#43D9A3] bg-[#F7F9F8] dark:bg-[#153C32]/30'
                        : 'border-[#E6EBE8] dark:border-[#1E2D36]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="w-full min-h-[44px] mt-3 rounded-xl border border-[#E45B63]/40 text-[#E45B63] text-sm font-semibold flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
