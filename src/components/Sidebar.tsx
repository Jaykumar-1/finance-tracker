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
  PanelLeftClose,
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
    isSidebarHidden,
    toggleSidebar,
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

  const desktopHiddenClass = isSidebarHidden ? 'md:hidden' : 'md:flex';

  return (
    <>
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed md:sticky top-16 md:top-[72px] left-0 z-40 w-[min(18rem,88vw)] md:w-60 h-[calc(100vh-64px)] md:h-[calc(100vh-72px)] bg-[#0b1424]/95 backdrop-blur-xl border-r border-[#26344b]/80 flex-col justify-between p-3 transition-all duration-300 ease-in-out ${desktopHiddenClass} ${
          isMobileOpen ? 'flex translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-1 overflow-y-auto">
          <div className="px-3 py-1.5 flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#6c7f99] uppercase">
              Navigation
            </span>
            <button
              onClick={toggleSidebar}
              title="Hide Navigation Panel"
              className="hidden md:flex items-center gap-1 text-[11px] font-semibold text-[#8ea0ba] hover:text-white px-1.5 py-0.5 rounded-md hover:bg-[#18263e] transition-colors"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
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
                className={`relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${
                  isActive
                    ? 'nav-active-pill bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                    : 'text-[#9eb0c9] hover:bg-[#152238] hover:text-[#e8eef8] border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : item.color || 'text-[#7d92ad]'}`} />
                <span className="flex-1 truncate">{item.label}</span>
              </button>
            );
          })}

          <div className="mt-3 p-3.5 rounded-xl bg-gradient-to-br from-[#122039] via-[#0f1a2e] to-[#0c1524] border border-amber-500/20 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 mb-1.5">
              <Target className="w-3.5 h-3.5" />
              <span>Monthly Target</span>
            </div>
            <p className="text-[11px] text-[#8ea0ba] leading-relaxed mb-2.5">
              Set and track your monthly savings goals &amp; expense budget.
            </p>
            <button
              onClick={() => {
                openGoalModal();
                onCloseMobile();
              }}
              className="w-full py-2 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all hover:shadow-[0_0_12px_rgba(245,158,11,0.15)]"
            >
              <Sparkles className="w-3 h-3" />
              <span>Manage Goals</span>
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-[#26344b]/80">
          <div className="px-3 text-[10px] text-[#55677f] leading-relaxed">
            My Finance v0.7 · Multi-device &amp; Excel ready
          </div>
        </div>
      </aside>
    </>
  );
};
