import React, { useEffect, useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatMoney, formatMonthYear, getMonthKey, toIsoDate } from '../utils/formatters';
import {
  LineChart,
  Plus,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Wallet,
  Landmark,
  TrendingUp,
  Sparkles
} from 'lucide-react';

export const InvestmentsPage: React.FC = () => {
  const {
    transactions,
    currency,
    openTxModal,
    deleteTransaction,
    isTxModalOpen
  } = useFinance();

  const [periodMode, setPeriodMode] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  const handlePrev = () => {
    setSelectedDate(prev => {
      if (periodMode === 'monthly') {
        return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      }
      return new Date(prev.getFullYear() - 1, 0, 1);
    });
  };

  const handleNext = () => {
    setSelectedDate(prev => {
      if (periodMode === 'monthly') {
        return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      }
      return new Date(prev.getFullYear() + 1, 0, 1);
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (isTxModalOpen || tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [periodMode, isTxModalOpen]);

  const periodKey = useMemo(() => {
    if (periodMode === 'monthly') {
      return `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
    }
    return String(selectedDate.getFullYear());
  }, [periodMode, selectedDate]);

  const inPeriod = (date: string) => {
    if (periodMode === 'monthly') return getMonthKey(date) === periodKey;
    return date.slice(0, 4) === periodKey;
  };

  // Investment transactions for the selected period
  const periodInvestTxs = useMemo(() => {
    return transactions.filter(t => t.type === 'investment' && inPeriod(t.date));
  }, [transactions, periodMode, periodKey]);

  const totalInvestment = useMemo(
    () => periodInvestTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
    [periodInvestTxs]
  );

  // Cash flow for the same period (income - expenses) = liquid cash saved
  const periodIncome = useMemo(
    () => transactions.filter(t => t.type === 'income' && inPeriod(t.date)).reduce((s, t) => s + (Number(t.amount) || 0), 0),
    [transactions, periodMode, periodKey]
  );
  const periodExpense = useMemo(
    () => transactions.filter(t => t.type === 'expense' && inPeriod(t.date)).reduce((s, t) => s + (Number(t.amount) || 0), 0),
    [transactions, periodMode, periodKey]
  );

  // Net Cash Saved = income - expenses (liquid surplus before / independent of investments)
  const netCashSaved = periodIncome - periodExpense;

  // Net Investments = capital deployed into assets this period
  const netInvestments = totalInvestment;

  // Wealth growth = cash surplus + investments (total money "put aside")
  const totalWealthBuilt = netCashSaved + netInvestments;

  const allTimeInvestments = useMemo(
    () => transactions.filter(t => t.type === 'investment').reduce((s, t) => s + (Number(t.amount) || 0), 0),
    [transactions]
  );

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    periodInvestTxs.forEach(t => {
      const cat = t.category || 'Other Assets';
      map[cat] = (map[cat] || 0) + (Number(t.amount) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [periodInvestTxs]);

  const maxCategoryAmount = Math.max(...categoryBreakdown.map(c => c[1]), 1);

  const periodLabel =
    periodMode === 'monthly'
      ? formatMonthYear(selectedDate)
      : String(selectedDate.getFullYear());

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-4 md:p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-blue-400">
              Wealth & Growth
            </span>
          </div>
          <h2 className="text-lg md:text-xl font-bold text-[#e8eef8] mt-0.5">
            Investments & Savings Portfolio
          </h2>
          <p className="text-xs text-[#8ea0ba]">
            Separate liquid cash savings from capital deployed into investments.
          </p>
        </div>

        <button
          onClick={() => openTxModal('investment', toIsoDate(new Date()))}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-xs md:text-sm font-semibold shadow-md shadow-blue-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Investment</span>
        </button>
      </div>

      {/* Period Selector */}
<<<<<<< HEAD
      <div data-sticky-action-bar className="finance-sticky-bar flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-card p-3.5 rounded-2xl">
=======
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-card p-3.5 rounded-2xl">
>>>>>>> ef174d7 (Update finance tracker)
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#152238] border border-[#26344b] text-[#9eb0c9] hover:text-white hover:border-blue-500/40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="min-w-[140px] text-center">
            <div className="text-sm font-bold text-[#e8eef8]">{periodLabel}</div>
            <div className="text-[10px] text-[#71839d]">Use ← → keys</div>
          </div>
          <button
            onClick={handleNext}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#152238] border border-[#26344b] text-[#9eb0c9] hover:text-white hover:border-blue-500/40 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#090f1a] border border-[#26344b]">
          <button
            onClick={() => setPeriodMode('monthly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              periodMode === 'monthly' ? 'bg-blue-600 text-white' : 'text-[#8ea0ba] hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setPeriodMode('yearly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              periodMode === 'yearly' ? 'bg-blue-600 text-white' : 'text-[#8ea0ba] hover:text-white'
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Distinct metric cards: Cash Saved vs Investments */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="stat-card stat-card-savings p-4 border-t-3 border-t-emerald-400">
          <div className="flex items-center justify-between text-[#8ea0ba] text-[11px] font-bold uppercase tracking-wider">
            <span>Net Cash Saved</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className={`text-xl font-extrabold mt-2 truncate ${netCashSaved >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatMoney(netCashSaved, currency)}
          </div>
          <p className="text-[10px] text-[#71839d] mt-1">
            Income − Expenses (liquid surplus)
          </p>
        </div>

        <div className="stat-card stat-card-invest p-4 border-t-3 border-t-blue-500">
          <div className="flex items-center justify-between text-[#8ea0ba] text-[11px] font-bold uppercase tracking-wider">
            <span>Net Investments</span>
            <Landmark className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-extrabold text-blue-400 mt-2 truncate">
            {formatMoney(netInvestments, currency)}
          </div>
          <p className="text-[10px] text-[#71839d] mt-1">
            Capital deployed into assets
          </p>
        </div>

        <div className="stat-card p-4 border-t-3 border-t-amber-400">
          <div className="flex items-center justify-between text-[#8ea0ba] text-[11px] font-bold uppercase tracking-wider">
            <span>Wealth Built</span>
            <TrendingUp className="w-4 h-4 text-amber-300" />
          </div>
          <div className="text-xl font-extrabold text-amber-300 mt-2 truncate">
            {formatMoney(totalWealthBuilt, currency)}
          </div>
          <p className="text-[10px] text-[#71839d] mt-1">
            Cash saved + investments
          </p>
        </div>

        <div className="stat-card p-4 border-t-3 border-t-violet-400">
          <div className="flex items-center justify-between text-[#8ea0ba] text-[11px] font-bold uppercase tracking-wider">
            <span>All-Time Invested</span>
            <Sparkles className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-xl font-extrabold text-violet-300 mt-2 truncate">
            {formatMoney(allTimeInvestments, currency)}
          </div>
          <p className="text-[10px] text-[#71839d] mt-1">
            Lifetime investment total
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category breakdown */}
        <div className="glass-card p-5 rounded-2xl">
          <h3 className="text-base font-bold text-[#e8eef8] mb-1 flex items-center gap-2">
            <LineChart className="w-4 h-4 text-blue-400" />
            Investment by Category
          </h3>
          <p className="text-[11px] text-[#71839d] mb-4">{periodLabel}</p>

          {categoryBreakdown.length > 0 ? (
            <div className="space-y-3">
              {categoryBreakdown.map(([name, amount]) => (
                <div key={name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-[#c8d4e5] truncate">{name}</span>
                    <span className="text-blue-300 font-bold">{formatMoney(amount, currency)}</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill bg-gradient-to-r from-blue-500 to-blue-400"
                      style={{ width: `${Math.round((amount / maxCategoryAmount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state py-10">
              <div className="empty-state-icon">
                <LineChart className="w-6 h-6" />
              </div>
              <p className="text-xs text-[#71839d]">No investments recorded for this period.</p>
            </div>
          )}
        </div>

        {/* Investment records */}
        <div className="glass-card p-5 rounded-2xl">
          <h3 className="text-base font-bold text-[#e8eef8] mb-4">
            Investment Records ({periodInvestTxs.length})
          </h3>

          {periodInvestTxs.length > 0 ? (
            <div className="divide-y divide-[#1d2a3e] max-h-[420px] overflow-y-auto pr-1">
              {periodInvestTxs
                .slice()
                .sort((a, b) => b.date.localeCompare(a.date))
                .map(tx => (
                  <div key={tx.id} className="py-3 flex items-center justify-between gap-3 group">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#e8eef8] truncate">
                        {tx.category}
                      </div>
                      <div className="text-xs text-[#71839d] mt-0.5 truncate">
                        {tx.date}
                        {tx.subcategory && ` · ${tx.subcategory}`}
                        {tx.note && ` · ${tx.note}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold text-blue-400">
                        ↗{formatMoney(tx.amount, currency)}
                      </span>
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openTxModal('investment', tx.date, tx)}
                          className="p-1 text-[#8ea0ba] hover:text-blue-400"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete ${tx.category} (↗${formatMoney(tx.amount, currency)})?`)) {
                              deleteTransaction(tx.id);
                            }
                          }}
                          className="p-1 text-[#8ea0ba] hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="empty-state py-10">
              <div className="empty-state-icon">
                <Landmark className="w-6 h-6" />
              </div>
              <p className="text-xs text-[#71839d]">No investment transactions for this period.</p>
              <button
                onClick={() => openTxModal('investment', toIsoDate(new Date()))}
                className="mt-3 text-xs font-semibold text-blue-400 hover:text-blue-300"
              >
                + Add your first investment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
