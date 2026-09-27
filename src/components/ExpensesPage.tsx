import React, { useEffect, useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatMoney, formatMonthYear, getMonthKey, toIsoDate } from '../utils/formatters';
import {
  TrendingDown,
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowDownRight,
  Edit2,
  Trash2,
  AlertCircle,
  Save,
  LineChart
} from 'lucide-react';

export const ExpensesPage: React.FC = () => {
  const {
    transactions,
    currency,
    openTxModal,
    deleteTransaction,
    getCurrentMonthGoal,
    setSavingsGoal,
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

  const currentKey = useMemo(() => {
    return `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedDate]);

  const activeGoal = useMemo(() => {
    return getCurrentMonthGoal(currentKey);
  }, [getCurrentMonthGoal, currentKey]);

  const [budgetInput, setBudgetInput] = useState<string>('');

  useEffect(() => {
    setBudgetInput(activeGoal?.expenseBudget ? String(activeGoal.expenseBudget) : '');
  }, [activeGoal?.expenseBudget, currentKey]);

  const saveMonthlyBudget = () => {
    if (periodMode !== 'monthly') return;
    const value = Number(budgetInput);
    if (!Number.isFinite(value) || value < 0) return;
    setSavingsGoal(currentKey, activeGoal?.targetSavings || 0, value, activeGoal?.note);
  };

  // Filter expense transactions
  const periodTxs = useMemo(() => {
    if (periodMode === 'monthly') {
      return transactions.filter(t => t.type === 'expense' && getMonthKey(t.date) === currentKey);
    } else {
      const year = selectedDate.getFullYear();
      return transactions.filter(t => t.type === 'expense' && Number(t.date.slice(0, 4)) === year);
    }
  }, [transactions, periodMode, currentKey, selectedDate]);

  const totalExpense = useMemo(() => {
    return periodTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [periodTxs]);

  // Aggregate by Category
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    periodTxs.forEach(t => {
      const cat = t.category || 'Miscellaneous';
      map[cat] = (map[cat] || 0) + (Number(t.amount) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [periodTxs]);

  const maxCategoryAmount = Math.max(...categoryBreakdown.map(c => c[1]), 1);
  const categoryTrends = useMemo(() => {
    const monthPoints = Array.from({ length: 6 }, (_, index) => {
      const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - (5 - index), 1);
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('en-IN', { month: 'short' })
      };
    });
    const names = categoryBreakdown.map(([name]) => name);
    return names.map(name => {
      const values = monthPoints.map(point => transactions
        .filter(t => t.type === 'expense' && t.category === name && getMonthKey(t.date) === point.key)
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0));
      const max = Math.max(...values, 1);
      const points = values.map((value, i) => {
        const x = 8 + (i * 84) / (values.length - 1);
        const y = 42 - (value / max) * 34;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      return { name, values, labels: monthPoints.map(p => p.label), points, current: values[values.length - 1] };
    });
  }, [categoryBreakdown, selectedDate, transactions]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#101a2b] p-4 md:p-5 rounded-2xl border border-[#26344b] shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-rose-400">
              Outflow & Spending
            </span>
          </div>
          <h2 className="text-lg md:text-xl font-bold text-[#e8eef8] mt-0.5">
            Expense Breakdown
          </h2>
          <p className="text-xs text-[#8ea0ba]">
            Understand where your money goes across food, housing, bills, and lifestyle.
          </p>
        </div>

        <button
          onClick={() => openTxModal('expense', toIsoDate(new Date()))}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs md:text-sm font-semibold shadow-md shadow-rose-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
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

      {/* Summary Metrics & Budget Check */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#101a2b] border border-[#26344b] border-t-4 border-t-rose-500 shadow-md">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8ea0ba]">
            Total Expenses ({periodMode})
          </span>
          <div className="text-2xl font-extrabold text-rose-400 mt-2">
            {isUnlocked ? formatMoney(totalExpense, currency) : '••••••'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-md">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8ea0ba]">
            Expense Records
          </span>
          <div className="text-2xl font-extrabold text-[#e8eef8] mt-2">
            {isUnlocked ? periodTxs.length : '••••'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-md">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8ea0ba]">Monthly Budget Ceiling</span>
            <span className="text-[10px] text-[#71839d]">{periodMode === 'monthly' ? 'This month' : 'Switch to Monthly'}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#71839d]">{currency}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={budgetInput}
                disabled={periodMode !== 'monthly' || !isUnlocked}
                onChange={e => setBudgetInput(e.target.value)}
                placeholder="Enter monthly limit"
                className="w-full pl-12 pr-3 py-2 rounded-xl bg-[#0d1728] border border-[#26344b] text-sm font-bold text-white placeholder-[#5d708a] focus:outline-none focus:border-amber-500 disabled:opacity-50"
              />
            </div>
            <button
              onClick={saveMonthlyBudget}
              disabled={periodMode !== 'monthly' || !isUnlocked}
              className="px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-bold hover:bg-amber-500/25 disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Save
            </button>
          </div>
          {activeGoal?.expenseBudget && isUnlocked && (
            <div className={`mt-2 text-[10px] font-semibold ${totalExpense > activeGoal.expenseBudget ? 'text-rose-400' : 'text-emerald-400'}`}>
              {totalExpense > activeGoal.expenseBudget
                ? `Over by ${formatMoney(totalExpense - activeGoal.expenseBudget, currency)}`
                : `${formatMoney(activeGoal.expenseBudget - totalExpense, currency)} remaining`}
            </div>
          )}
        </div>
      </div>

      {/* Breakdown by Category & Transaction List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category breakdown bar charts */}
        <div className="p-5 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-md">
          <h3 className="text-base font-bold text-[#e8eef8] mb-4 flex items-center justify-between">
            <span>By Category</span>
            <span className="text-xs text-[#8ea0ba] font-normal">Ranked by spending</span>
          </h3>

          {categoryBreakdown.length > 0 ? (
            <div className="space-y-4">
              {categoryBreakdown.map(([category, amount]) => {
                const percent = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : '0';
                const barWidth = ((amount / maxCategoryAmount) * 100).toFixed(1);

                return (
                  <div key={category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-[#e8eef8]">{category}</span>
                      <span className="text-rose-400">
                        {formatMoney(amount, currency)} <span className="text-[#71839d] font-normal">({percent}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-[#0d1728] rounded-full overflow-hidden border border-[#22304a]">
                      <div
                        className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-[#71839d]">
              No expenses recorded for this period.
            </div>
          )}
        </div>

        {/* Transactions list */}
        <div className="p-5 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-md">
          <h3 className="text-base font-bold text-[#e8eef8] mb-4">
            Expense Records ({periodTxs.length})
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
                      <span className="text-sm font-bold text-rose-400">
                        −{formatMoney(tx.amount, currency)}
                      </span>
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openTxModal('expense', tx.date, tx)}
                          className="p-1 text-[#8ea0ba] hover:text-blue-400"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete ${tx.category} (−${formatMoney(tx.amount, currency)})?`)) {
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
              No expense transactions for this period.
            </div>
          )}
        </div>
      </div>

      {/* Category-level analytics */}
      <div className="p-5 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-[#e8eef8] flex items-center gap-2">
              <LineChart className="w-4 h-4 text-blue-400" />
              Category Insights
            </h3>
            <p className="text-xs text-[#71839d] mt-1">Six-month spending trend for each category used in this period.</p>
          </div>
        </div>

        {categoryTrends.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {categoryTrends.map(trend => {
              const categoryTotal = categoryBreakdown.find(([name]) => name === trend.name)?.[1] || 0;
              return (
                <div key={trend.name} className="p-3.5 rounded-xl bg-[#0d1728] border border-[#26344b]">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#e8eef8] truncate">{trend.name}</div>
                      <div className="text-[10px] text-[#71839d] mt-0.5">Current period: {formatMoney(categoryTotal, currency)}</div>
                    </div>
                    <span className="text-[10px] font-bold text-rose-400">{formatMoney(trend.current, currency)}</span>
                  </div>
                  <svg viewBox="0 0 100 50" className="w-full h-20" preserveAspectRatio="none" aria-label={`${trend.name} spending trend`}>
                    <line x1="8" y1="42" x2="92" y2="42" stroke="currentColor" className="text-[#26344b]" strokeWidth="0.7" />
                    <polyline points={trend.points} fill="none" stroke="currentColor" className="text-rose-400" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    {trend.values.map((value, index) => {
                      const max = Math.max(...trend.values, 1);
                      const x = 8 + (index * 84) / (trend.values.length - 1);
                      const y = 42 - (value / max) * 34;
                      return <circle key={index} cx={x} cy={y} r="1.7" fill="currentColor" className="text-rose-400" />;
                    })}
                  </svg>
                  <div className="grid grid-cols-6 text-[8px] text-[#596b84] text-center">
                    {trend.labels.map((label, index) => <span key={index}>{label}</span>)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center text-xs text-[#71839d]">Add an expense to see category analytics.</div>
        )}
      </div>
    </div>
  );
};
