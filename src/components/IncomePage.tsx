import React, { useEffect, useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatMoney, formatMonthYear, getMonthKey, toIsoDate } from '../utils/formatters';
import {
  TrendingUp,
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Edit2,
  Trash2,
  Calendar
} from 'lucide-react';

export const IncomePage: React.FC = () => {
  const {
    transactions,
    currency,
    openTxModal,
    deleteTransaction,
    isUnlocked,
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

  // Laptop/PC month/year navigation with keyboard arrows. Ignore form fields and open modals.
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

  // Filter income transactions for selected period
  const periodTxs = useMemo(() => {
    if (periodMode === 'monthly') {
      const key = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
      return transactions.filter(t => t.type === 'income' && getMonthKey(t.date) === key);
    } else {
      const year = selectedDate.getFullYear();
      return transactions.filter(t => t.type === 'income' && Number(t.date.slice(0, 4)) === year);
    }
  }, [transactions, periodMode, selectedDate]);

  const totalIncome = useMemo(() => {
    return periodTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [periodTxs]);

  // Aggregate by Category
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    periodTxs.forEach(t => {
      const cat = t.category || 'Other';
      map[cat] = (map[cat] || 0) + (Number(t.amount) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [periodTxs]);

  const maxCategoryAmount = Math.max(...categoryBreakdown.map(c => c[1]), 1);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#101a2b] p-4 md:p-5 rounded-2xl border border-[#26344b] shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
              Inflows & Earnings
            </span>
          </div>
          <h2 className="text-lg md:text-xl font-bold text-[#e8eef8] mt-0.5">
            Income Breakdown
          </h2>
          <p className="text-xs text-[#8ea0ba]">
            Track salary, freelance contracts, dividends, and other earnings.
          </p>
        </div>

        <button
          onClick={() => openTxModal('income', toIsoDate(new Date()))}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs md:text-sm font-semibold shadow-md shadow-emerald-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Income</span>
        </button>
      </div>

      {/* Period Selector Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#101a2b] p-3.5 rounded-2xl border border-[#26344b]">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#152238] border border-[#26344b] text-[#dbe6f6] hover:bg-[#1c2e4a]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-[#e8eef8] min-w-[140px] text-center">
            {periodMode === 'monthly' ? formatMonthYear(selectedDate) : selectedDate.getFullYear()}
          </span>
          <button
            onClick={handleNext}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#152238] border border-[#26344b] text-[#dbe6f6] hover:bg-[#1c2e4a]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0d1728] p-1 rounded-xl border border-[#26344b]">
          <button
            onClick={() => setPeriodMode('monthly')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              periodMode === 'monthly'
                ? 'bg-[#1b2c47] text-white border border-[#557fb8]'
                : 'text-[#8ea0ba] hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setPeriodMode('yearly')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              periodMode === 'yearly'
                ? 'bg-[#1b2c47] text-white border border-[#557fb8]'
                : 'text-[#8ea0ba] hover:text-white'
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
        <div className="p-4 rounded-2xl bg-[#101a2b] border border-[#26344b] border-t-4 border-t-emerald-500 shadow-md">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8ea0ba]">
            Total Income ({periodMode})
          </span>
          <div className="text-2xl font-extrabold text-emerald-400 mt-2">
            {isUnlocked ? formatMoney(totalIncome, currency) : '••••••'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-md">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8ea0ba]">
            Income Entries
          </span>
          <div className="text-2xl font-extrabold text-[#e8eef8] mt-2">
            {periodTxs.length}
          </div>
        </div>
      </div>

      {/* Breakdown by Category & Transaction List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category breakdown bar charts */}
        <div className="p-5 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-md">
          <h3 className="text-base font-bold text-[#e8eef8] mb-4 flex items-center justify-between">
            <span>By Category</span>
            <span className="text-xs text-[#8ea0ba] font-normal">Ranked by volume</span>
          </h3>

          {categoryBreakdown.length > 0 ? (
            <div className="space-y-4">
              {categoryBreakdown.map(([category, amount]) => {
                const percent = totalIncome > 0 ? ((amount / totalIncome) * 100).toFixed(1) : '0';
                const barWidth = ((amount / maxCategoryAmount) * 100).toFixed(1);

                return (
                  <div key={category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-[#e8eef8]">{category}</span>
                      <span className="text-emerald-400">
                        {formatMoney(amount, currency)} <span className="text-[#71839d] font-normal">({percent}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-[#0d1728] rounded-full overflow-hidden border border-[#22304a]">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-[#71839d]">
              No income entries recorded for this period.
            </div>
          )}
        </div>

        {/* Transactions list */}
        <div className="p-5 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-md">
          <h3 className="text-base font-bold text-[#e8eef8] mb-4">
            Income Transactions ({periodTxs.length})
          </h3>

          {periodTxs.length > 0 ? (
            <div className="divide-y divide-[#1d2a3e] max-h-[420px] overflow-y-auto pr-1">
              {periodTxs
                .sort((a, b) => b.date.localeCompare(a.date))
                .map(tx => (
                  <div key={tx.id} className="py-3 flex items-center justify-between gap-3 group">
                    <div>
                      <div className="text-sm font-semibold text-[#e8eef8]">
                        {tx.category}
                      </div>
                      <div className="text-xs text-[#71839d] mt-0.5">
                        {tx.date} {tx.subcategory && `· ${tx.subcategory}`} {tx.note && `· ${tx.note}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-emerald-400">
                        +{formatMoney(tx.amount, currency)}
                      </span>
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openTxModal('income', tx.date, tx)}
                          className="p-1 text-[#8ea0ba] hover:text-blue-400"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete ${tx.category} (+${formatMoney(tx.amount, currency)})?`)) {
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
            <div className="py-12 text-center text-xs text-[#71839d]">
              No transactions for this selected period.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
