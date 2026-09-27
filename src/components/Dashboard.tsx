import React, { useEffect, useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { authService } from '../services/auth';
import { formatMoney, formatMonthYear, getMonthKey, toIsoDate } from '../utils/formatters';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  TrendingUp,
  TrendingDown,
  LineChart,
  Wallet,
  Target,
  Sparkles,
  Calendar as CalendarIcon,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Maximize2,
  Minimize2,
  PieChart as PieIcon,
  Filter,
  Check,
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  Clock,
  Smartphone,
  Upload
} from 'lucide-react';

const formatCompactMoney = (amount: number, currency: string) => {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '−' : '';
  const symbol = currency === 'INR' ? '₹' : currency;
  if (abs >= 10000000) return `${sign}${symbol}${(abs / 10000000).toFixed(abs >= 100000000 ? 0 : 1)}Cr`;
  if (abs >= 100000) return `${sign}${symbol}${(abs / 100000).toFixed(abs >= 1000000 ? 0 : 1)}L`;
  if (abs >= 1000) return `${sign}${symbol}${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  return `${sign}${symbol}${Math.round(abs)}`;
};

export const Dashboard: React.FC = () => {
  const {
    currentMonth,
    setCurrentMonth,
    transactions,
    currency,
    openTxModal,
    openGoalModal,
    openAuthModal,
    getCurrentMonthGoal,
    triggerCelebration,
    deleteTransaction,
    isUnlocked,
    isTxModalOpen,
    unlockLedger,
    user,
    setUser,
    syncState,
  } = useFinance();

  // Show/Hide state for monthly savings goal banner with local storage persistence
  const [showSavingsBanner, setShowSavingsBanner] = useState<boolean>(() => {
    const saved = localStorage.getItem('myfinance_show_savings_banner');
    return saved !== null ? saved === 'true' : true;
  });

  // Full Month Fit mode (no page scroll) vs Expanded mode
  const [viewMode, setViewMode] = useState<'fit' | 'expanded'>(() => {
    const saved = localStorage.getItem('myfinance_dashboard_view_mode');
    return (saved === 'expanded' ? 'expanded' : 'fit');
  });

  // Selected date for day inspection (defaults to today or 1st of month)
  const [selectedDayIso, setSelectedDayIso] = useState<string>(() => toIsoDate(new Date()));

  // In-Dashboard quick unlock state
  const [unlockUsername, setUnlockUsername] = useState(() => user?.username || '');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  const toggleSavingsBanner = () => {
    setShowSavingsBanner(prev => {
      const next = !prev;
      localStorage.setItem('myfinance_show_savings_banner', String(next));
      return next;
    });
  };

  const toggleViewMode = () => {
    setViewMode(prev => {
      const next = prev === 'fit' ? 'expanded' : 'fit';
      localStorage.setItem('myfinance_dashboard_view_mode', next);
      return next;
    });
  };

  const handleQuickUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword) {
      setUnlockError('Please enter your password.');
      return;
    }
    setIsUnlocking(true);
    setUnlockError('');
    const res = await unlockLedger(unlockUsername, unlockPassword);
    setIsUnlocking(false);
    if (!res.success) {
      setUnlockError(res.error || 'Invalid credentials.');
    }
  };

  const currentMonthKey = useMemo(() => {
    return `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
  }, [currentMonth, isTxModalOpen]);

  // Filter transactions for currently selected month
  const monthTxs = useMemo(() => {
    return transactions.filter(t => getMonthKey(t.date) === currentMonthKey);
  }, [transactions, currentMonthKey]);

  // Metrics
  const incomeTotal = useMemo(() => {
    return monthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  }, [monthTxs]);

  const expenseTotal = useMemo(() => {
    return monthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  }, [monthTxs]);

  const investmentTotal = useMemo(() => {
    return monthTxs.filter(t => t.type === 'investment').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  }, [monthTxs]);

  const netCashFlow = incomeTotal - expenseTotal - investmentTotal;
  const savingsRate = incomeTotal > 0 ? Math.round(((incomeTotal - expenseTotal) / incomeTotal) * 100) : 0;

  // Category breakdown for expenses
  const topExpenseCategories = useMemo(() => {
    const map = new Map<string, number>();
    monthTxs.filter(t => t.type === 'expense').forEach(t => {
      map.set(t.category, (map.get(t.category) || 0) + (Number(t.amount) || 0));
    });
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount, percentage: expenseTotal > 0 ? Math.round((amount / expenseTotal) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
  }, [monthTxs, expenseTotal]);

  // Monthly Savings Goal
  const activeGoal = useMemo(() => {
    return getCurrentMonthGoal(currentMonthKey);
  }, [getCurrentMonthGoal, currentMonthKey]);

  const targetSavings = activeGoal?.targetSavings || 0;
  const expenseBudget = activeGoal?.expenseBudget || 0;
  const actualSaved = netCashFlow + investmentTotal;
  const goalPercent = targetSavings > 0 ? Math.min(100, Math.round((actualSaved / targetSavings) * 100)) : 0;
  const isGoalReached = targetSavings > 0 && actualSaved >= targetSavings;
  const expenseBudgetPercent = expenseBudget > 0 ? Math.min(100, Math.round((expenseTotal / expenseBudget) * 100)) : 0;
  const isExpenseBudgetExceeded = expenseBudget > 0 && expenseTotal > expenseBudget;

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDayIso(toIsoDate(today));
  };

  // Laptop/PC month navigation with keyboard arrows. Ignore typing fields and dialogs.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (isTxModalOpen || tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePrevMonth();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNextMonth();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMonth, isTxModalOpen]);

  // Calendar generation logic
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7; // Mon = 0
    const totalDays = lastDayOfMonth.getDate();

    const days: {
      date: Date;
      isoDate: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      income: number;
      expense: number;
      investment: number;
      txCount: number;
    }[] = [];

    const todayIso = toIsoDate(new Date());

    // Prev month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      const iso = toIsoDate(d);
      const dayTxs = transactions.filter(t => t.date === iso);
      days.push({
        date: d,
        isoDate: iso,
        dayNumber: d.getDate(),
        isCurrentMonth: false,
        isToday: iso === todayIso,
        income: dayTxs.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0),
        expense: dayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0),
        investment: dayTxs.filter(t => t.type === 'investment').reduce((s, t) => s + (Number(t.amount) || 0), 0),
        txCount: dayTxs.length
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const iso = toIsoDate(d);
      const dayTxs = transactions.filter(t => t.date === iso);
      days.push({
        date: d,
        isoDate: iso,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: iso === todayIso,
        income: dayTxs.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0),
        expense: dayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0),
        investment: dayTxs.filter(t => t.type === 'investment').reduce((s, t) => s + (Number(t.amount) || 0), 0),
        txCount: dayTxs.length
      });
    }

    // Next month padding to complete the 7-column rows
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const iso = toIsoDate(d);
      const dayTxs = transactions.filter(t => t.date === iso);
      days.push({
        date: d,
        isoDate: iso,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: iso === todayIso,
        income: dayTxs.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0),
        expense: dayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0),
        investment: dayTxs.filter(t => t.type === 'investment').reduce((s, t) => s + (Number(t.amount) || 0), 0),
        txCount: dayTxs.length
      });
    }

    return days;
  }, [currentMonth, transactions]);

  // Selected Day transactions
  const selectedDayTransactions = useMemo(() => {
    return transactions.filter(t => t.date === selectedDayIso);
  }, [transactions, selectedDayIso]);

  // Recent transactions for current month
  const recentTransactions = useMemo(() => {
    return [...monthTxs]
      .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 10);
  }, [monthTxs]);

  return (
    <div className={`flex flex-col ${viewMode === 'fit' ? 'gap-3' : 'gap-5'}`}>
      {/* 1. Header & Month Navigator */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#101a2b] p-3 md:p-4 rounded-2xl border border-[#26344b] shadow-md">
        {/* Month Switcher Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#152238] border border-[#26344b] text-[#dbe6f6] hover:bg-[#1f314f] transition-all cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <h2 className="text-sm sm:text-base font-bold text-[#e8eef8] px-2 min-w-[130px] text-center">
            {formatMonthYear(currentMonth)}
          </h2>

          <button
            onClick={handleNextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#152238] border border-[#26344b] text-[#dbe6f6] hover:bg-[#1f314f] transition-all cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleToday}
            className="px-2.5 py-1.5 rounded-xl bg-[#18263c] border border-[#2d3e58] text-xs font-semibold text-[#b8c9e0] hover:bg-[#203452] transition-colors cursor-pointer"
          >
            Today
          </button>
        </div>

        {/* View Mode & Actions */}
        <div className="flex items-center gap-2">
          {/* Goal Banner Toggle */}
          <button
            onClick={toggleSavingsBanner}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#152238] border border-[#2d3e58] hover:bg-[#1f314f] text-[#8ea0ba] hover:text-[#e8eef8] text-xs font-semibold transition-colors cursor-pointer"
            title={showSavingsBanner ? 'Hide Goal Banner' : 'Show Goal Banner'}
          >
            {showSavingsBanner ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Hide Goal</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300 hidden md:inline">Show Goal</span>
              </>
            )}
          </button>

        </div>
      </div>

      {/* 2. Monthly Savings Goal Slim Banner */}
      {showSavingsBanner && isUnlocked && (
        <div className="p-3 md:p-3.5 rounded-2xl bg-gradient-to-r from-[#111e36] via-[#122340] to-[#131d2e] border border-blue-500/25 shadow-xs relative overflow-hidden transition-all">
          <button
            onClick={toggleSavingsBanner}
            className="absolute top-2.5 right-2.5 p-1 rounded-lg text-[#6d829e] hover:text-[#dbe6f6] transition-colors"
            title="Hide Goal Banner"
          >
            <EyeOff className="w-3 h-3" />
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pr-6 sm:pr-0">
            {/* Savings goal */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 flex-shrink-0">
                <Target className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Monthly Savings Goal
                  </span>
                  {isGoalReached && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <Check className="w-2.5 h-2.5" /> Achieved!
                    </span>
                  )}
                </div>
                <div className="text-xs sm:text-sm font-bold text-[#e8eef8] truncate">
                  {targetSavings > 0 ? (
                    <>
                      Target: <span className="text-amber-300">{formatMoney(targetSavings, currency)}</span> · Saved: <span className={actualSaved < 0 ? 'text-rose-300' : actualSaved > 0 ? 'text-emerald-400' : 'text-[#8ea0ba]'}>{formatMoney(actualSaved, currency)}</span>
                    </>
                  ) : (
                    <span className="text-[#8ea0ba]">No savings goal set for this month</span>
                  )}
                </div>
              </div>
            </div>

            {/* Expense ceiling */}
            <div className="flex items-center gap-3 min-w-0 flex-1 lg:border-l lg:border-[#26344b] lg:pl-4">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-300 flex-shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                    Monthly Expense Ceiling
                  </span>
                  {expenseBudget > 0 && (
                    <span className={`text-[9px] font-bold ${isExpenseBudgetExceeded ? 'text-rose-300' : 'text-emerald-300'}`}>
                      {isExpenseBudgetExceeded ? 'Exceeded' : 'Within limit'}
                    </span>
                  )}
                </div>
                <div className="text-xs sm:text-sm font-bold text-[#e8eef8]">
                  {expenseBudget > 0 ? (
                    <>
                      Ceiling: <span className="text-rose-300">{formatMoney(expenseBudget, currency)}</span> · Spent: <span className={isExpenseBudgetExceeded ? 'text-rose-300' : 'text-emerald-400'}>{formatMoney(expenseTotal, currency)}</span>
                    </>
                  ) : (
                    <span className="text-[#8ea0ba]">No expense ceiling set for this month</span>
                  )}
                </div>
              </div>
              {expenseBudget > 0 && (
                <div className="hidden sm:block w-24 md:w-28 flex-shrink-0">
                  <div className="flex justify-between text-[10px] font-semibold mb-0.5">
                    <span className="text-[#8ea0ba]">Used</span>
                    <span className={isExpenseBudgetExceeded ? 'text-rose-300' : 'text-emerald-300'}>
                      {expenseBudgetPercent}%{isExpenseBudgetExceeded && (
                        <span className="ml-1 text-rose-300">· +{Math.round(((expenseTotal - expenseBudget) / expenseBudget) * 100)}% over</span>
                      )}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#0a1220] rounded-full overflow-hidden border border-[#20324c]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isExpenseBudgetExceeded ? 'bg-rose-400' : 'bg-gradient-to-r from-emerald-400 to-blue-400'}`}
                      style={{ width: `${expenseBudgetPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Goal / ceiling edit button */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <button
                onClick={openGoalModal}
                className="px-2.5 py-1 rounded-lg bg-[#152238] border border-[#2a3c57] text-[11px] font-semibold text-[#dbe6f6] hover:bg-[#1c2e4a]"
              >
                {targetSavings > 0 || expenseBudget > 0 ? 'Edit' : 'Set Goals'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. 4 High-Density KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Income */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#101a2b] border border-[#26344b] border-t-3 border-t-emerald-500 shadow-xs">
          <div className="flex items-center justify-between text-[#8ea0ba] text-[11px] font-bold uppercase tracking-wider">
            <span>Income</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-emerald-400 mt-1.5 mb-0.5 truncate">
            {isUnlocked ? formatMoney(incomeTotal, currency) : '••••••'}
          </div>
          <div className="text-[10px] text-[#71839d] flex items-center justify-between">
            <span>{isUnlocked ? `${monthTxs.filter(t => t.type === 'income').length} entries` : 'Locked'}</span>
            <span className="text-emerald-500 font-semibold flex items-center">
              <ArrowUpRight className="w-2.5 h-2.5" /> Inflow
            </span>
          </div>
        </div>

        {/* Expenses */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#101a2b] border border-[#26344b] border-t-3 border-t-rose-500 shadow-xs">
          <div className="flex items-center justify-between text-[#8ea0ba] text-[11px] font-bold uppercase tracking-wider">
            <span>Expenses</span>
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-rose-400 mt-1.5 mb-0.5 truncate">
            {isUnlocked ? formatMoney(expenseTotal, currency) : '••••••'}
          </div>
          <div className="text-[10px] text-[#71839d] flex items-center justify-between">
            <span>{isUnlocked ? `${monthTxs.filter(t => t.type === 'expense').length} entries` : 'Locked'}</span>
            <span className="text-rose-500 font-semibold flex items-center">
              <ArrowDownRight className="w-2.5 h-2.5" /> Outflow
            </span>
          </div>
        </div>

        {/* Investments */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#101a2b] border border-[#26344b] border-t-3 border-t-blue-500 shadow-xs">
          <div className="flex items-center justify-between text-[#8ea0ba] text-[11px] font-bold uppercase tracking-wider">
            <span>Investments</span>
            <LineChart className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-blue-400 mt-1.5 mb-0.5 truncate">
            {isUnlocked ? formatMoney(investmentTotal, currency) : '••••••'}
          </div>
          <div className="text-[10px] text-[#71839d] flex items-center justify-between">
            <span>{isUnlocked ? `${monthTxs.filter(t => t.type === 'investment').length} entries` : 'Locked'}</span>
            <span className="text-blue-400 font-semibold">Wealth</span>
          </div>
        </div>

        {/* Net Savings */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#101a2b] border border-[#26344b] border-t-3 border-t-amber-400 shadow-xs">
          <div className="flex items-center justify-between text-[#8ea0ba] text-[11px] font-bold uppercase tracking-wider">
            <span>Net Savings</span>
            <Wallet className="w-3.5 h-3.5 text-amber-300" />
          </div>
          <div className={`text-lg sm:text-xl font-extrabold mt-1.5 mb-0.5 truncate ${
            isUnlocked ? (netCashFlow >= 0 ? 'text-amber-300' : 'text-rose-400') : 'text-amber-300'
          }`}>
            {isUnlocked ? formatMoney(netCashFlow, currency) : '••••••'}
          </div>
          <div className="text-[10px] text-[#71839d] flex items-center justify-between">
            <span>{isUnlocked ? `${savingsRate}% saved` : 'Locked'}</span>
            <span className="text-amber-300 font-semibold">Cash Flow</span>
          </div>
        </div>
      </div>

      {/* 4. MAIN CONTENT AREA (LOCKED PRIVACY STATE vs FULL MONTH DASHBOARD) */}
      {!isUnlocked ? (
        <div className="p-6 md:p-8 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-xl text-center flex flex-col items-center justify-center space-y-4 max-w-xl mx-auto w-full my-4 animate-in fade-in">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 shadow-md">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#e8eef8]">
              Personal Ledger is Locked
            </h3>
            <p className="text-xs text-[#8ea0ba] mt-1 max-w-md">
              Please enter your username and password to view your full month's income, expenses, and transactions.
            </p>
          </div>

          <form onSubmit={handleQuickUnlock} className="w-full max-w-sm space-y-3 pt-2">
            {unlockError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs text-left space-y-2">
                <p>{unlockError}</p>
                <div className="flex flex-wrap gap-2 pt-1 border-t border-rose-500/20">
                  <button
                    type="button"
                    onClick={async () => {
                      setIsUnlocking(true);
                      setUnlockError('');
                      const regRes = await authService.registerWithPassword({
                        username: unlockUsername.trim() || 'user',
                        displayName: unlockUsername.trim() || 'User',
                        password: unlockPassword,
                        currency: currency || 'INR'
                      });
                      setIsUnlocking(false);
                      if (regRes.user && !regRes.error) {
                        setUser(regRes.user);
                      } else {
                        setUnlockError(regRes.error || 'Could not create account.');
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    ⚡ Create & Unlock as "{unlockUsername.trim() || 'New User'}"
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthModal('reset', unlockUsername.trim())}
                    className="px-2.5 py-1 rounded-lg bg-[#18263e] hover:bg-[#223554] text-amber-300 font-semibold text-[11px] border border-amber-500/30 cursor-pointer"
                  >
                    Reset Password
                  </button>
                </div>
              </div>
            )}
            <div>
              <input
                type="text"
                required
                value={unlockUsername}
                onChange={e => setUnlockUsername(e.target.value)}
                placeholder="Username or Email"
                className="w-full px-3 py-2 rounded-xl bg-[#090f1a] border border-[#26344b] text-xs text-white placeholder-[#5d708a] focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <div className="relative">
                <input
                  type={showUnlockPassword ? 'text' : 'password'}
                  required
                  value={unlockPassword}
                  onChange={e => setUnlockPassword(e.target.value)}
                  placeholder="Enter password to unlock"
                  className="w-full pl-3 pr-10 py-2 rounded-xl bg-[#090f1a] border border-[#26344b] text-xs text-white placeholder-[#5d708a] focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowUnlockPassword(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71839d] hover:text-blue-400 p-0.5 cursor-pointer"
                  title={showUnlockPassword ? 'Hide password' : 'Show password'}
                >
                  {showUnlockPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isUnlocking}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>{isUnlocking ? 'Unlocking...' : 'Unlock Full Ledger'}</span>
            </button>
          </form>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 text-xs">
            <button
              onClick={() => openAuthModal('signin', unlockUsername.trim())}
              className="text-[#8ea0ba] hover:text-blue-400 transition-colors font-medium cursor-pointer"
            >
              Sign In / Switch Account
            </button>
            <span className="text-[#3a4d6b] hidden sm:inline">·</span>
            <button
              onClick={() => openAuthModal('reset', unlockUsername.trim())}
              className="text-amber-400 hover:text-amber-300 transition-colors font-medium cursor-pointer"
            >
              Forgot / Reset Password?
            </button>
            <span className="text-[#3a4d6b] hidden sm:inline">·</span>
            <button
              onClick={() => openAuthModal('setup', unlockUsername.trim())}
              className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium cursor-pointer"
            >
              Create New Account
            </button>
          </div>
        </div>
      ) : (
        /* UNLOCKED: FULL-WIDTH CALENDAR WITH INSIGHTS & EXPENSE SPLIT BELOW */
        <div className="flex flex-col gap-4">
          {/* 1. FULL-WIDTH & EXTRA TALL INTERACTIVE MONTHLY CALENDAR */}
          <div className="w-full p-2.5 sm:p-5 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-md">
            {/* Calendar Top Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-2.5 pb-2.5 sm:pb-3 mb-2.5 sm:mb-3 border-b border-[#26344b]">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#e8eef8]">
                    {formatMonthYear(currentMonth)}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-[#8ea0ba]">
                    {monthTxs.length > 0
                      ? `${monthTxs.length} transaction records for ${formatMonthYear(currentMonth)}.`
                      : `No transactions in ${formatMonthYear(currentMonth)}. Select a day to log one or choose another month below.`}
                  </p>
                </div>
              </div>

              {/* Activity Legend & Calendar Nav */}
              <div className="w-full sm:w-auto flex flex-wrap items-center justify-between sm:justify-end gap-1.5 sm:gap-2.5">
                {/* Activity Legend */}
                <div className="flex items-center gap-2 text-xs font-semibold text-[#8ea0ba]">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0a1220] border border-emerald-500/20 text-emerald-400 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Inflow
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0a1220] border border-rose-500/20 text-rose-400 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Expense
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0a1220] border border-blue-500/20 text-blue-400 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> Invest
                  </span>
                </div>

                {/* Quick Prev / Next Buttons */}
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1 rounded-lg bg-[#142033] border border-[#24344d] text-[#8ea0ba] hover:text-white hover:bg-[#1c2c44] transition-all cursor-pointer"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-1 rounded-lg bg-[#142033] border border-[#24344d] text-[#8ea0ba] hover:text-white hover:bg-[#1c2c44] transition-all cursor-pointer"
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* 7-Column Days Header */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center text-[10px] sm:text-xs font-bold text-[#8ea0ba] uppercase tracking-wider py-1.5 mb-1 bg-[#0b1322] rounded-xl border border-[#1e2c42]">
              <div><span className="sm:hidden">M</span><span className="hidden sm:inline">Mon</span></div>
              <div><span className="sm:hidden">T</span><span className="hidden sm:inline">Tue</span></div>
              <div><span className="sm:hidden">W</span><span className="hidden sm:inline">Wed</span></div>
              <div><span className="sm:hidden">T</span><span className="hidden sm:inline">Thu</span></div>
              <div><span className="sm:hidden">F</span><span className="hidden sm:inline">Fri</span></div>
              <div><span className="sm:hidden">S</span><span className="hidden sm:inline">Sat</span></div>
              <div><span className="sm:hidden">S</span><span className="hidden sm:inline">Sun</span></div>
            </div>

            {/* 7-Column Days Grid with Wide Horizontal & Vertical Dimensions */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2">
              {calendarDays.map((day, idx) => {
                const isSelected = day.isoDate === selectedDayIso;
                const hasActivity = day.income > 0 || day.expense > 0 || day.investment > 0;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedDayIso(day.isoDate);
                      openTxModal('expense', day.isoDate);
                    }}
                    title={`Click to add transaction for ${day.isoDate}`}
                    className={`min-h-[72px] sm:min-h-[105px] md:min-h-[120px] p-1 sm:p-2 rounded-lg sm:rounded-xl border text-left flex flex-col justify-between transition-all group relative cursor-pointer overflow-hidden ${
                      day.isCurrentMonth
                        ? isSelected
                          ? 'bg-[#152a4a] border-blue-500 shadow-md ring-2 ring-blue-500/70'
                          : 'bg-[#0d1728] border-[#22304a] hover:border-blue-500/60 hover:bg-[#13223d]'
                        : 'bg-[#080d17] border-[#182337] opacity-35 hover:opacity-70'
                    } ${day.isToday && !isSelected ? 'border-amber-400/70 bg-[#142035]' : ''}`}
                  >
                    {/* Header: Date Number + Quick Add indicator */}
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-[11px] sm:text-sm font-bold ${
                          day.isToday
                            ? 'w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs'
                            : isSelected
                            ? 'text-blue-300 font-extrabold'
                            : day.isCurrentMonth
                            ? 'text-[#dbe6f6]'
                            : 'text-[#5d708a]'
                        }`}
                      >
                        {day.dayNumber}
                      </span>

                      <div className="flex items-center gap-1">
                        {day.txCount > 0 && (
                          <>
                            <span className="sm:hidden text-[9px] font-bold text-[#8ea0ba] px-1 py-0.5 rounded-md bg-[#070c14] border border-[#1d2b40]">
                              {day.txCount}
                            </span>
                            <span className="hidden sm:inline text-[10px] font-bold text-[#8ea0ba] px-1.5 py-0.5 rounded-md bg-[#070c14] border border-[#1d2b40]">
                              {day.txCount} {day.txCount === 1 ? 'tx' : 'txs'}
                            </span>
                          </>
                        )}
                        <span className="hidden sm:flex w-5 h-5 rounded-md bg-blue-600/0 group-hover:bg-blue-600/30 text-blue-400 items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                          <Plus className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>

                    {/* Financial Figures per Day */}
                    <div className="space-y-1 mt-1.5 w-full overflow-hidden">
                      {day.income > 0 && (
                        <div className="text-[9px] sm:text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/25 px-1 sm:px-1.5 py-0.5 rounded truncate leading-tight flex items-center justify-between">
                          <span className="sm:hidden">+{formatCompactMoney(day.income, currency).replace('−', '−')}</span>
                          <span className="hidden sm:inline">+{formatMoney(day.income, currency)}</span>
                        </div>
                      )}
                      {day.expense > 0 && (
                        <div className="text-[9px] sm:text-xs font-bold text-rose-400 bg-rose-950/40 border border-rose-500/25 px-1 sm:px-1.5 py-0.5 rounded truncate leading-tight flex items-center justify-between">
                          <span className="sm:hidden">−{formatCompactMoney(day.expense, currency).replace('−', '−')}</span>
                          <span className="hidden sm:inline">−{formatMoney(day.expense, currency)}</span>
                        </div>
                      )}
                      {day.investment > 0 && (
                        <div className="text-[9px] sm:text-xs font-bold text-blue-400 bg-blue-950/40 border border-blue-500/25 px-1 sm:px-1.5 py-0.5 rounded truncate leading-tight flex items-center justify-between">
                          <span className="sm:hidden">↗{formatCompactMoney(day.investment, currency).replace('−', '−')}</span>
                          <span className="hidden sm:inline">↗{formatMoney(day.investment, currency)}</span>
                        </div>
                      )}
                      {!hasActivity && day.isCurrentMonth && (
                        <div className="text-[10px] text-[#42546e] opacity-0 group-hover:opacity-100 transition-opacity text-center py-1">
                          + Add
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. BELOW CALENDAR: MONTHLY CASH FLOW SPLIT, TOP EXPENSES & RECENT ACTIVITY */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 items-stretch">
            {/* Card A: Monthly Cash Flow Split */}
            <div className="p-4 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-[#e8eef8] flex items-center gap-2">
                    <PieIcon className="w-4 h-4 text-blue-400" />
                    <span>Monthly Cash Flow Split</span>
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                    {savingsRate}% Saved
                  </span>
                </div>

                {/* Progress split bar */}
                <div className="w-full h-3.5 bg-[#0a1220] rounded-full overflow-hidden border border-[#20324c] flex mb-3">
                  <div
                    title={`Expenses: ${formatMoney(expenseTotal, currency)} (${incomeTotal > 0 ? Math.round((expenseTotal / incomeTotal) * 100) : 0}%)`}
                    className="bg-rose-500 h-full transition-all"
                    style={{ width: `${incomeTotal > 0 ? Math.min(100, Math.round((expenseTotal / incomeTotal) * 100)) : 0}%` }}
                  />
                  <div
                    title={`Investments: ${formatMoney(investmentTotal, currency)} (${incomeTotal > 0 ? Math.round((investmentTotal / incomeTotal) * 100) : 0}%)`}
                    className="bg-blue-500 h-full transition-all"
                    style={{ width: `${incomeTotal > 0 ? Math.min(100, Math.round((investmentTotal / incomeTotal) * 100)) : 0}%` }}
                  />
                  <div
                    title={`Net Saved: ${formatMoney(Math.max(0, netCashFlow), currency)} (${savingsRate}%)`}
                    className="bg-emerald-400 h-full transition-all flex-1"
                  />
                </div>

                {/* Metrics Breakdown */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#0d1728] border border-[#1e2c42]">
                    <span className="flex items-center gap-1.5 text-[#8ea0ba]">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Total Expenses
                    </span>
                    <span className="font-bold text-rose-400">{formatMoney(expenseTotal, currency)}</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#0d1728] border border-[#1e2c42]">
                    <span className="flex items-center gap-1.5 text-[#8ea0ba]">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Investments
                    </span>
                    <span className="font-bold text-blue-400">{formatMoney(investmentTotal, currency)}</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#0d1728] border border-[#1e2c42]">
                    <span className="flex items-center gap-1.5 text-[#8ea0ba]">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Net Surplus Saved
                    </span>
                    <span className="font-bold text-emerald-400">{formatMoney(netCashFlow, currency)}</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-[#71839d] mt-3 pt-2 border-t border-[#1e2c42] flex justify-between">
                <span>Total Inflow: <strong className="text-emerald-400">{formatMoney(incomeTotal, currency)}</strong></span>
                <span>Savings Target: <strong className="text-amber-300">{targetSavings > 0 ? formatMoney(targetSavings, currency) : 'None'}</strong></span>
              </div>
            </div>

            {/* Card B: Top Monthly Expenses */}
            <div className="p-4 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-[#e8eef8] flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-rose-400" />
                    <span>Top Monthly Expenses</span>
                  </span>
                  <span className="text-[11px] text-[#71839d] font-semibold">
                    {topExpenseCategories.length} categories
                  </span>
                </div>

                {topExpenseCategories.length > 0 ? (
                  <div className="space-y-2.5">
                    {topExpenseCategories.map((cat, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-[#c8d4e5] truncate">{cat.name}</span>
                          <span className="text-rose-400 font-bold">{formatMoney(cat.amount, currency)} ({cat.percentage}%)</span>
                        </div>
                        <div className="w-full h-2 bg-[#090f1a] rounded-full overflow-hidden border border-[#1b293d]">
                          <div
                            className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all"
                            style={{ width: `${cat.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-[#71839d] py-6 text-center">
                    No expense records for {formatMonthYear(currentMonth)} yet. Click any day on the calendar to add an expense.
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#1e2c42] flex items-center justify-between text-xs">
                <span className="text-[#8ea0ba]">Total Outflow:</span>
                <span className="text-rose-400 font-bold">{formatMoney(expenseTotal, currency)}</span>
              </div>
            </div>

            {/* Card C: Recent Activity & Quick Day Manager */}
            <div className="p-4 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 pb-1 border-b border-[#203047]">
                  <span className="text-sm font-bold text-[#e8eef8]">
                    Recent Monthly Activity
                  </span>
                  <button
                    onClick={() => openTxModal('expense', selectedDayIso)}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New</span>
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-[#1c2a3f] pr-1 space-y-1">
                  {recentTransactions.length > 0 ? (
                    recentTransactions.map(tx => {
                      const isIncome = tx.type === 'income';
                      const isInvest = tx.type === 'investment';
                      return (
                        <div
                          key={tx.id}
                          className="py-2 flex items-center justify-between gap-2 hover:bg-[#132039]/50 rounded-lg px-2 transition-colors text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                isIncome
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : isInvest
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {isIncome ? '↗' : isInvest ? '◆' : '↘'}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-[#e8eef8] truncate">{tx.category}</div>
                              <div className="text-[10px] text-[#71839d] truncate">
                                {tx.date} · {tx.account}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className={`font-bold text-xs ${
                                isIncome
                                  ? 'text-emerald-400'
                                  : isInvest
                                  ? 'text-blue-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {isIncome ? '+' : isInvest ? '↗' : '−'}
                              {formatMoney(tx.amount, currency)}
                            </span>
                            <button
                              onClick={() => openTxModal(tx.type, tx.date, tx)}
                              className="p-1 text-[#71839d] hover:text-blue-400"
                              title="Edit transaction"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete ${tx.category} (${formatMoney(tx.amount, currency)})?`)) {
                                  deleteTransaction(tx.id);
                                }
                              }}
                              className="p-1 text-[#71839d] hover:text-rose-400"
                              title="Delete transaction"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-xs text-[#71839d]">
                      No transactions recorded for {formatMonthYear(currentMonth)}. Click any date on the calendar above to log an entry!
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 text-[11px] text-[#71839d] text-right">
                Showing latest {recentTransactions.length} of {monthTxs.length} records
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
