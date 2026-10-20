import React, { useEffect, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { SUPPORTED_CURRENCIES } from '../utils/constants';
import {
  Menu,
  Plus,
  User,
  ShieldCheck,
  Lock,
  Unlock
} from 'lucide-react';

interface NavbarProps {
  onToggleMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu }) => {
  const {
    user,
    activePage,
    currency,
    setCurrency,
    currentMonth,
    openTxModal,
    openGoalModal,
    openAuthModal,
    setActivePage,
    isSidebarHidden,
    toggleSidebar,
    isUnlocked,
    lockLedger,
  } = useFinance();

  const [isScrolled, setIsScrolled] = useState(false);
  const monthLabel = currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  useEffect(() => {
    let frame = 0;
    const updateHeader = () => {
      setIsScrolled(window.scrollY > 8);
    };
    const onScroll = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateHeader);
    };
    updateHeader();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    const observer = new MutationObserver(onScroll);
    const main = document.querySelector('main');
    if (main) observer.observe(main, { childList: true, subtree: true, characterData: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [activePage]);

  return (
    <header className={`sticky top-0 z-50 h-14 sm:h-16 md:h-[72px] px-2.5 sm:px-3 md:px-6 flex items-center justify-between gap-2 overflow-hidden transition-all duration-300 ${isScrolled ? 'bg-[#091321]/95 shadow-[0_12px_35px_rgba(0,0,0,0.28)] border-b border-blue-500/20 backdrop-blur-2xl' : 'bg-[#0b1424]/85 border-b border-[#26344b]/80 backdrop-blur-xl'}`}>
      {/* Left section */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3.5 min-w-0">
        {/* Mobile menu trigger */}
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-lg bg-[#121d30] border border-[#26344b] text-[#dbe6f6] hover:bg-[#1b2b44] transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Sidebar Toggle */}
        <button
          onClick={toggleSidebar}
          title={isSidebarHidden ? 'Show Navigation Panel' : 'Hide Navigation Panel'}
          aria-label={isSidebarHidden ? 'Show Navigation Panel' : 'Hide Navigation Panel'}
          className="hidden md:flex items-center justify-center p-2 rounded-lg bg-[#121d30] border border-[#26344b] text-[#9eb0c9] hover:text-[#e8eef8] hover:bg-[#1b2b44] hover:border-blue-500/40 transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="hidden sm:flex w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-500 items-center justify-center text-slate-950 font-black text-base shadow-md shadow-emerald-500/10">
            ₹
          </div>

        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2.5 min-w-0">
        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-[#26344b] bg-[#101a2b]/80 px-2.5 py-1.5 text-[10px] sm:text-xs text-[#c8d4e5] whitespace-nowrap">
          <span className="text-blue-300">◷</span>
          <span>{monthLabel}</span>
        </div>
        {/* Currency Selector */}
        <div className="hidden lg:block">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="bg-[#101a2b] border border-[#26344b] text-xs font-semibold text-[#c8d4e5] rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500"
            title="Choose Currency"
          >
            {SUPPORTED_CURRENCIES.map(curr => (
              <option key={curr.code} value={curr.code}>
                {curr.symbol} {curr.code}
              </option>
            ))}
          </select>
        </div>

        {/* Privacy Lock Toggle Button */}
        {isUnlocked ? (
          <button
            onClick={lockLedger}
            title="Lock Ledger for privacy (hides sensitive balance & figures)"
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-[#142033] hover:bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-all cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Lock</span>
          </button>
        ) : (
          <button
            onClick={() => openAuthModal('signin')}
            title="Unlock Ledger with Username & Password"
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-all animate-pulse cursor-pointer"
          >
            <Unlock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Unlock Data</span>
          </button>
        )}

        {/* Add Transaction Button */}
        <button
          onClick={() => openTxModal('expense')}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 md:px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-xs md:text-sm font-semibold shadow-md shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add</span>
        </button>

        {/* User Profile / Auth Button */}
        {user ? (
          <button
            onClick={() => setActivePage('profile')}
            className="flex items-center gap-1 sm:gap-2 p-1 sm:pl-2 rounded-xl bg-[#121d30] border border-[#26344b] hover:border-blue-500/50 hover:bg-[#18263e] transition-all"
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="w-7 h-7 rounded-lg object-cover border border-[#26344b]"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-400 to-blue-500 text-slate-900 flex items-center justify-center font-bold text-xs">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="hidden md:inline text-xs font-semibold text-[#e8eef8] max-w-[90px] truncate">
              {user.displayName}
            </span>
          </button>
        ) : (
          <button
            onClick={() => openAuthModal('signin')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#151f31] border border-blue-500/40 text-xs font-semibold text-blue-300 hover:bg-blue-900/30 transition-all cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
