import React from 'react';
import { AppPage, useFinance } from '../context/FinanceContext';
import {
  LayoutDashboard,
  ReceiptText,
  TrendingUp,
  TrendingDown,
  LineChart,
  PieChart,
  Settings,
  Target,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile }) => {
  const {
    activePage,
    setActivePage,
    openGoalModal,
    openAuthModal,
    user,
    isSidebarHidden,
    toggleSidebar,
    isUnlocked,
    lockLedger
  } = useFinance();

  const navItems: { id: AppPage; label: string; icon: React.FC<{ className?: string }>; color?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText },
    { id: 'income', label: 'Income', icon: TrendingUp, color: 'text-emerald-400' },
    { id: 'expenses', label: 'Expenses', icon: TrendingDown, color: 'text-rose-400' },
    { id: 'investments', label: 'Investments & Savings', icon: LineChart, color: 'text-blue-400' },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
    { id: 'profile', label: 'Profile & Settings', icon: Settings },
  ];

  const handleNavClick = (id: AppPage) => {
    setActivePage(id);
    onCloseMobile();
  };


  // If hidden on desktop and not open on mobile, don't take up layout space on desktop
  const desktopHiddenClass = isSidebarHidden ? 'md:hidden' : 'md:flex';

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={`fixed md:sticky top-16 md:top-[72px] left-0 z-40 w-[min(18rem,88vw)] md:w-60 h-[calc(100vh-64px)] md:h-[calc(100vh-72px)] bg-[#0d1627] border-r border-[#26344b] flex-col justify-between p-3 transition-all duration-300 ease-in-out ${desktopHiddenClass} ${
          isMobileOpen ? 'flex translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Navigation List */}
        <div className="flex flex-col gap-1 overflow-y-auto">
          <div className="px-3 py-1.5 flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#6c7f99] uppercase">
              Navigation
            </span>
            <button
              onClick={toggleSidebar}
              title="Hide Navigation Panel"
              className="hidden md:flex text-[11px] font-semibold text-[#8ea0ba] hover:text-white px-1.5 py-0.5 rounded-md hover:bg-[#18263e] transition-colors"
            >
              Hide
            </button>
          </div>

          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-xs'
                    : 'text-[#9eb0c9] hover:bg-[#152238] hover:text-[#e8eef8]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : item.color || 'text-[#7d92ad]'}`} />
                <span className="flex-1 truncate">{item.label}</span>
              </button>
            );
          })}

          {/* Savings Goals Highlight Card */}
          <div className="mt-3 p-3 rounded-xl bg-gradient-to-br from-[#122039] to-[#0f182a] border border-blue-500/20">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 mb-1">
              <Target className="w-3.5 h-3.5" />
              <span>Monthly Target</span>
            </div>
            <p className="text-[11px] text-[#8ea0ba] leading-relaxed mb-2">
              Set and monitor your monthly savings goals.
            </p>
            <button
              onClick={() => {
                openGoalModal();
                onCloseMobile();
              }}
              className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              <span>Manage Goals</span>
            </button>
          </div>

        </div>

        {/* Sidebar Footer */}
        <div className="pt-3 border-t border-[#26344b]">
          <div className="px-3 text-[10px] text-[#55677f]">
            My Finance · Multi-Device & Excel Ready
          </div>
        </div>
      </aside>
    </>
  );
};
