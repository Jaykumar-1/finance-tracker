import React, { useEffect, useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatMoney, formatMonthYear, getMonthKey, toIsoDate } from '../utils/formatters';
import {
  PieChart,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  LineChart,
  Percent,
  Sparkles
} from 'lucide-react';

const PALETTE = [
  '#37d67a', // emerald
  '#ff6262', // rose
  '#5ea7ff', // blue
  '#b57cff', // purple
  '#f5c84b', // amber
  '#ff9f43', // orange
  '#35c7d9', // cyan
  '#e779c8', // pink
  '#9ca3af', // gray
  '#7dd3fc', // sky
  '#86efac', // mint
  '#fca5a5'  // light rose
];

// Helper to draw a clean, interactive SVG Donut Chart.
// Each slice is a real arc path (rather than a full circle), so hover events
// can only activate the category actually under the pointer.
const SvgDonutChart: React.FC<{
  data: { label: string; value: number }[];
  total: number;
  currency: string;
  accentColor: string;
  emptyLabel: string;
  onSelectCategory?: (category: string) => void;
}> = ({ data, total, currency, accentColor, emptyLabel, onSelectCategory }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (total <= 0 || data.length === 0) {
    return (
      <div className="w-full">
        <div className="h-64 flex items-center justify-center text-center">
          <div>
            <div className="w-28 h-28 mx-auto rounded-full border-4 border-dashed border-[#26344b] flex items-center justify-center text-xs text-[#71839d] mb-3">
              0.00
            </div>
            <p className="text-xs text-[#71839d]">{emptyLabel}</p>
          </div>
        </div>
      </div>
    );
  }

  const radius = 80;
  const strokeWidth = 24;
  const center = 100;

  const polarToCartesian = (angle: number) => {
    const radians = (angle - 90) * Math.PI / 180;
    return {
      x: center + radius * Math.cos(radians),
      y: center + radius * Math.sin(radians)
    };
  };

  const arcPath = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(endAngle);
    const end = polarToCartesian(startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  let accumulatedAngle = 0;
  const slices = data.map((item, index) => {
    const fraction = item.value / total;
    const startAngle = accumulatedAngle;
    const endAngle = accumulatedAngle + fraction * 360;
    accumulatedAngle = endAngle;

    return {
      ...item,
      startAngle,
      endAngle,
      color: PALETTE[index % PALETTE.length],
      percent: (fraction * 100).toFixed(1)
    };
  });

  const activeSlice = hoveredIdx !== null ? slices[hoveredIdx] : null;

  const handleSelect = (label: string) => {
    onSelectCategory?.(label);
  };

  return (
    <div className="w-full">
      <div className="h-64 flex items-center justify-center">
        <div className="relative w-52 h-52 flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 200 200" aria-label="Category donut chart">
            {slices.map((slice, idx) => (
              <path
                key={slice.label}
                d={arcPath(slice.startAngle, slice.endAngle)}
                fill="none"
                stroke={slice.color}
                strokeWidth={hoveredIdx === idx ? strokeWidth + 4 : strokeWidth}
                strokeLinecap="butt"
                pointerEvents="stroke"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseMove={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => handleSelect(slice.label)}
                onDoubleClick={() => handleSelect(slice.label)}
                className="cursor-pointer transition-all duration-200"
              />
            ))}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
            {activeSlice ? (
              <>
                <span className="text-[10px] uppercase font-bold text-[#8ea0ba] truncate max-w-[120px]">
                  {activeSlice.label}
                </span>
                <span className="text-sm font-extrabold text-[#e8eef8]">
                  {formatMoney(activeSlice.value, currency)}
                </span>
                <span className="text-[10px] font-bold text-blue-400">
                  {activeSlice.percent}%
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] uppercase font-bold text-[#71839d]">Total</span>
                <span className="text-base font-extrabold text-[#e8eef8]">
                  {formatMoney(total, currency)}
                </span>
                <span className="text-[10px] text-[#8ea0ba]">
                  {data.length} categories
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 w-full grid grid-cols-2 gap-1.5 text-xs max-h-36 overflow-y-auto px-1">
        {slices.map((slice, idx) => (
          <button
            key={slice.label}
            type="button"
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseMove={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            onClick={() => handleSelect(slice.label)}
            onDoubleClick={() => handleSelect(slice.label)}
            className={`flex items-center gap-1.5 p-1 rounded-md cursor-pointer transition-colors text-left ${
              hoveredIdx === idx ? 'bg-[#152238]' : 'hover:bg-[#121c2f]'
            }`}
            title={`Open ${slice.label} subcategory analytics`}
          >
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }} />
            <span className="text-[11px] text-[#c8d4e5] truncate flex-1">{slice.label}</span>
            <span className="text-[10px] font-bold text-[#8ea0ba]">{slice.percent}%</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export const AnalyticsPage: React.FC = () => {
  const { transactions, currency, isTxModalOpen } = useFinance();

  const [mode, setMode] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedCategory, setSelectedCategory] = useState<{
    type: 'income' | 'expense' | 'investment';
    name: string;
  } | null>(null);

  const availableYears = useMemo(() => {
    const years = Array.from(new Set(transactions.map(t => Number(t.date.slice(0, 4)))));
    const curYear = new Date().getFullYear();
    if (!years.includes(curYear)) years.push(curYear);
    return years.sort().reverse();
  }, [transactions]);

  const handlePrevMonth = () => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Laptop/PC month navigation with keyboard arrows in Monthly mode.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (mode !== 'monthly' || isTxModalOpen || tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return;
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
  }, [mode, isTxModalOpen]);

  // Transactions filtered for analysis
  const filteredTxs = useMemo(() => {
    if (mode === 'monthly') {
      const key = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
      return transactions.filter(t => getMonthKey(t.date) === key);
    } else {
      return transactions.filter(t => Number(t.date.slice(0, 4)) === selectedYear);
    }
  }, [transactions, mode, selectedDate, selectedYear]);

  // Aggregate category sums
  const getCategoryData = (type: 'income' | 'expense' | 'investment') => {
    const map: Record<string, number> = {};
    filteredTxs
      .filter(t => t.type === type)
      .forEach(t => {
        const cat = t.category || 'Other';
        map[cat] = (map[cat] || 0) + (Number(t.amount) || 0);
      });
    return Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  };

  const incomeData = useMemo(() => getCategoryData('income'), [filteredTxs]);
  const expenseData = useMemo(() => getCategoryData('expense'), [filteredTxs]);
  const investmentData = useMemo(() => getCategoryData('investment'), [filteredTxs]);

  const totalIncome = useMemo(() => incomeData.reduce((s, i) => s + i.value, 0), [incomeData]);
  const totalExpense = useMemo(() => expenseData.reduce((s, i) => s + i.value, 0), [expenseData]);
  const totalInvestment = useMemo(() => investmentData.reduce((s, i) => s + i.value, 0), [investmentData]);

  const selectedCategoryAnalytics = useMemo(() => {
    if (!selectedCategory) return null;

    const categoryTxs = filteredTxs.filter(
      t => t.type === selectedCategory.type && (t.category || 'Other') === selectedCategory.name
    );

    const subcategoryMap = new Map<string, { amount: number; count: number }>();
    categoryTxs.forEach(t => {
      const sub = t.subcategory?.trim() || 'Uncategorized';
      const current = subcategoryMap.get(sub) || { amount: 0, count: 0 };
      current.amount += Number(t.amount) || 0;
      current.count += 1;
      subcategoryMap.set(sub, current);
    });

    const total = categoryTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const subcategories = Array.from(subcategoryMap.entries())
      .map(([name, stats]) => ({
        name,
        ...stats,
        percentage: total > 0 ? (stats.amount / total) * 100 : 0,
        average: stats.count > 0 ? stats.amount / stats.count : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      transactions: categoryTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      subcategories,
      total,
      count: categoryTxs.length,
      average: categoryTxs.length > 0 ? total / categoryTxs.length : 0
    };
  }, [filteredTxs, selectedCategory]);

  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;
  const investmentRate = totalIncome > 0 ? Math.round((totalInvestment / totalIncome) * 100) : 0;

  // 6-Month Comparison data
  const monthlyComparison = useMemo(() => {
    const rows = [];
    const baseDate = mode === 'monthly' ? selectedDate : new Date(selectedYear, 11, 1);

    for (let i = 5; i >= 0; i--) {
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthTxs = transactions.filter(t => getMonthKey(t.date) === key);

      const inc = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const inv = monthTxs.filter(t => t.type === 'investment').reduce((s, t) => s + t.amount, 0);

      rows.push({
        label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        income: inc,
        expense: exp,
        investment: inv
      });
    }

    const maxVal = Math.max(...rows.flatMap(r => [r.income, r.expense, r.investment]), 1);

    return { rows, maxVal };
  }, [transactions, mode, selectedDate, selectedYear]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#101a2b] p-4 md:p-5 rounded-2xl border border-[#26344b] shadow-md">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-[#e8eef8]">
            Financial Analytics & Trends
          </h2>
          <p className="text-xs text-[#8ea0ba]">
            Visual breakdown of income streams, expense distribution, and multi-month comparison.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-[#0d1728] p-1 rounded-xl border border-[#26344b]">
            <button
              onClick={() => setMode('monthly')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                mode === 'monthly'
                  ? 'bg-[#1b2c47] text-white border border-[#557fb8]'
                  : 'text-[#8ea0ba] hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setMode('yearly')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                mode === 'yearly'
                  ? 'bg-[#1b2c47] text-white border border-[#557fb8]'
                  : 'text-[#8ea0ba] hover:text-white'
              }`}
            >
              Yearly
            </button>
          </div>

          {mode === 'monthly' ? (
            <div className="flex items-center gap-1.5 bg-[#0d1728] px-2 py-1 rounded-xl border border-[#26344b]">
              <button onClick={handlePrevMonth} className="p-1 hover:text-white text-[#8ea0ba]">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-[#e8eef8] min-w-[90px] text-center">
                {formatMonthYear(selectedDate)}
              </span>
              <button onClick={handleNextMonth} className="p-1 hover:text-white text-[#8ea0ba]">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-[#0d1728] border border-[#26344b] text-xs font-semibold text-[#c8d4e5] rounded-xl px-3 py-1.5"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* High-Level Rate Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-md">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-[#8ea0ba]">
            <span>Savings Rate</span>
            <Percent className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-2">
            {savingsRate}%
          </div>
          <p className="text-[11px] text-[#71839d] mt-1">
            Percentage of total income retained after expenses
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-md">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-[#8ea0ba]">
            <span>Investment Rate</span>
            <LineChart className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-blue-400 mt-2">
            {investmentRate}%
          </div>
          <p className="text-[11px] text-[#71839d] mt-1">
            Share of income deployed into SIPs & assets
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-md">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-[#8ea0ba]">
            <span>Net Financial Delta</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className={`text-2xl font-extrabold mt-2 ${totalIncome - totalExpense - totalInvestment >= 0 ? 'text-amber-300' : 'text-rose-400'}`}>
            {formatMoney(totalIncome - totalExpense - totalInvestment, currency)}
          </div>
          <p className="text-[11px] text-[#71839d] mt-1">
            Net unallocated liquidity for this period
          </p>
        </div>
      </div>

      {/* 3 Donut Charts */}
      <div className="analytics-donut-grid gap-5">
        {/* Income Donut */}
        <div className="p-5 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-md flex flex-col">
          <div>
            <h3 className="text-sm font-bold text-emerald-400 text-center mb-1">
              Income by Category
            </h3>
            <div className="text-xs text-center text-[#71839d] mb-4">
              Total Inflow: {formatMoney(totalIncome, currency)}
            </div>
          </div>
          <SvgDonutChart
            data={incomeData}
            total={totalIncome}
            currency={currency}
            accentColor="#37d67a"
            emptyLabel="No income records for this period"
            onSelectCategory={(category) => setSelectedCategory({ type: 'income', name: category })}
          />
        </div>

        {/* Expense Donut */}
        <div className="p-5 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-md flex flex-col">
          <div>
            <h3 className="text-sm font-bold text-rose-400 text-center mb-1">
              Expenses by Category
            </h3>
            <div className="text-xs text-center text-[#71839d] mb-4">
              Total Spending: {formatMoney(totalExpense, currency)}
            </div>
          </div>
          <SvgDonutChart
            data={expenseData}
            total={totalExpense}
            currency={currency}
            accentColor="#ff6262"
            emptyLabel="No expenses recorded for this period"
            onSelectCategory={(category) => setSelectedCategory({ type: 'expense', name: category })}
          />
        </div>

        {/* Investment Donut */}
        <div className="p-5 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-md flex flex-col">
          <div>
            <h3 className="text-sm font-bold text-blue-400 text-center mb-1">
              Investments by Category
            </h3>
            <div className="text-xs text-center text-[#71839d] mb-4">
              Total Allocated: {formatMoney(totalInvestment, currency)}
            </div>
          </div>
          <SvgDonutChart
            data={investmentData}
            total={totalInvestment}
            currency={currency}
            accentColor="#5ea7ff"
            emptyLabel="No investment records for this period"
            onSelectCategory={(category) => setSelectedCategory({ type: 'investment', name: category })}
          />
        </div>
      </div>

      {/* 6-Month Cash Flow Snapshot */}
      <div className="p-5 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base font-bold text-[#e8eef8] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <span>6-Month Cash Flow Snapshot</span>
            </h3>
            <p className="text-xs text-[#8ea0ba] mt-1">
              A quick month-by-month view of income, expenses, investments, and net cash flow.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold flex-wrap">
            <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Income</span>
            <span className="flex items-center gap-1.5 text-rose-400"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" />Expense</span>
            <span className="flex items-center gap-1.5 text-blue-400"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />Invest</span>
          </div>
        </div>

        <div className="analytics-month-grid">
          {monthlyComparison.rows.map(row => {
            const incPct = Math.max(0, (row.income / monthlyComparison.maxVal) * 100);
            const expPct = Math.max(0, (row.expense / monthlyComparison.maxVal) * 100);
            const invPct = Math.max(0, (row.investment / monthlyComparison.maxVal) * 100);
            const net = row.income - row.expense - row.investment;

            return (
              <div key={row.label} className="analytics-month-card">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-sm font-extrabold text-[#e8eef8]">{row.label}</span>
                  <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${net >= 0 ? 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/20' : 'text-rose-300 bg-rose-500/10 border border-rose-500/20'}`}>
                    Net {net >= 0 ? '+' : '−'}{formatMoney(Math.abs(net), currency)}
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-emerald-400 font-semibold">Income</span>
                      <span className="text-[#9fb0c7]">+{formatMoney(row.income, currency)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#0b1422] overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${incPct}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-rose-400 font-semibold">Expense</span>
                      <span className="text-[#9fb0c7]">−{formatMoney(row.expense, currency)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#0b1422] overflow-hidden">
                      <div className="h-full rounded-full bg-rose-500 transition-all duration-500" style={{ width: `${expPct}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-blue-400 font-semibold">Invest</span>
                      <span className="text-[#9fb0c7]">↗{formatMoney(row.investment, currency)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#0b1422] overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${invPct}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selectedCategory && selectedCategoryAnalytics && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedCategory.name} analytics`}
          onMouseDown={e => {
            if (e.target === e.currentTarget) setSelectedCategory(null);
          }}
        >
          <div className="w-full max-w-2xl max-h-[88vh] overflow-hidden rounded-2xl bg-[#101a2b] border border-[#2b3d58] shadow-2xl">
            <div className="p-4 sm:p-5 border-b border-[#26344b] flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-[#71839d]">
                  {selectedCategory.type} • {mode === 'monthly' ? formatMonthYear(selectedDate) : `Year ${selectedYear}`}
                </div>
                <h3 className="text-lg font-extrabold text-[#e8eef8] mt-1">
                  {selectedCategory.name} — Subcategory Analytics
                </h3>
                <p className="text-xs text-[#8ea0ba] mt-1">
                  {selectedCategoryAnalytics.count} transaction{selectedCategoryAnalytics.count === 1 ? '' : 's'} • Average {formatMoney(selectedCategoryAnalytics.average, currency)}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedCategory(null)} className="w-8 h-8 rounded-lg bg-[#17243a] text-[#9db0c9] hover:text-white hover:bg-[#20314b] transition-colors" aria-label="Close category analytics">×</button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto max-h-[calc(88vh-88px)] space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-[#0d1728] border border-[#26344b]">
                  <div className="text-[10px] uppercase font-bold text-[#71839d]">Category Total</div>
                  <div className="text-base font-extrabold text-[#e8eef8] mt-1">{formatMoney(selectedCategoryAnalytics.total, currency)}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0d1728] border border-[#26344b]">
                  <div className="text-[10px] uppercase font-bold text-[#71839d]">Transactions</div>
                  <div className="text-base font-extrabold text-[#e8eef8] mt-1">{selectedCategoryAnalytics.count}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0d1728] border border-[#26344b] col-span-2 sm:col-span-1">
                  <div className="text-[10px] uppercase font-bold text-[#71839d]">Average</div>
                  <div className="text-base font-extrabold text-[#e8eef8] mt-1">{formatMoney(selectedCategoryAnalytics.average, currency)}</div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-[#c8d4e5]">Subcategories</h4>
                  <span className="text-[10px] text-[#71839d]">Share of selected category</span>
                </div>
                {selectedCategoryAnalytics.subcategories.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#0d1728] border border-[#26344b] text-xs text-[#71839d]">No transactions found for this category in the selected period.</div>
                ) : (
                  <div className="space-y-2">
                    {selectedCategoryAnalytics.subcategories.map((sub, index) => (
                      <div key={sub.name} className="p-3 rounded-xl bg-[#0d1728] border border-[#26344b]">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#e8eef8] truncate">{index + 1}. {sub.name}</div>
                            <div className="text-[10px] text-[#71839d] mt-0.5">{sub.count} transaction{sub.count === 1 ? '' : 's'} • Avg {formatMoney(sub.average, currency)}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-extrabold text-[#e8eef8]">{formatMoney(sub.amount, currency)}</div>
                            <div className="text-[10px] font-bold text-blue-400">{sub.percentage.toFixed(1)}%</div>
                          </div>
                        </div>
                        <div className="h-1.5 bg-[#18253a] rounded-full mt-2 overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min(100, sub.percentage)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#c8d4e5] mb-2">Recent transactions in this category</h4>
                <div className="space-y-1.5">
                  {selectedCategoryAnalytics.transactions.slice(0, 8).map(tx => (
                    <div key={tx.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-[#0d1728] border border-[#1e2c42]">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-[#d9e2ef] truncate">{tx.subcategory || 'Uncategorized'}</div>
                        <div className="text-[10px] text-[#71839d] truncate">{tx.date}{tx.note ? ` • ${tx.note}` : ''}</div>
                      </div>
                      <span className="text-xs font-bold text-[#e8eef8] shrink-0">{formatMoney(Number(tx.amount) || 0, currency)}</span>
                    </div>
                  ))}
                  {selectedCategoryAnalytics.transactions.length > 8 && (
                    <div className="text-[10px] text-center text-[#71839d] pt-1">Showing latest 8 of {selectedCategoryAnalytics.transactions.length} transactions</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
