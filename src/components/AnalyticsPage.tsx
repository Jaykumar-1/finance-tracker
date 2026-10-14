import React, { useEffect, useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatMoney, formatMonthYear, getMonthKey } from '../utils/formatters';
import {
  ChevronLeft,
  ChevronRight,
  LineChart,
  Percent,
  Sparkles
} from 'lucide-react';

const PALETTE = [
  '#37d67a',
  '#ff6262',
  '#5ea7ff',
  '#b57cff',
  '#f5c84b',
  '#ff9f43',
  '#35c7d9',
  '#e779c8',
  '#9ca3af',
  '#7dd3fc',
  '#86efac',
  '#fca5a5'
];

const SvgDonutChart: React.FC<{
  data: { label: string; value: number }[];
  total: number;
  currency: string;
  accentColor: string;
  emptyLabel: string;
  centerHint?: string;
  onSelectCategory?: (category: string) => void;
}> = ({ data, total, currency, accentColor, emptyLabel, centerHint, onSelectCategory }) => {
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
    const radians = ((angle - 90) * Math.PI) / 180;
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

  // When only one category/subcategory remains after filters, force a single
  // 100% slice. A full 360° SVG arc path collapses (same start/end point), so
  // single-slice mode is rendered as a solid ring circle instead.
  const isSingleSlice = data.length === 1;

  let accumulatedAngle = 0;
  const slices = data.map((item, index) => {
    const fraction = isSingleSlice ? 1 : item.value / total;
    const startAngle = accumulatedAngle;
    // Cap multi-slice sweeps just under 360 so arcs always paint; single uses circle.
    const sweep = isSingleSlice ? 360 : Math.min(Math.max(fraction * 360, 0.4), 359.99);
    const endAngle = accumulatedAngle + sweep;
    accumulatedAngle = endAngle;
    return {
      ...item,
      startAngle,
      endAngle,
      percent: isSingleSlice ? 100 : Math.round(fraction * 100),
      color: PALETTE[index % PALETTE.length],
      path: isSingleSlice ? '' : arcPath(startAngle, endAngle)
    };
  });

  const handleSelect = (label: string) => {
    onSelectCategory?.(label);
  };

  const hovered = hoveredIdx !== null ? slices[hoveredIdx] : null;

  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative w-[200px] h-[200px]">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#152238"
            strokeWidth={strokeWidth}
          />
          {isSingleSlice ? (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={slices[0].color}
              strokeWidth={hoveredIdx === 0 ? strokeWidth + 4 : strokeWidth}
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHoveredIdx(0)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => handleSelect(slices[0].label)}
            />
          ) : (
            slices.map((slice, idx) => (
              <path
                key={slice.label}
                d={slice.path}
                fill="none"
                stroke={slice.color}
                strokeWidth={hoveredIdx === idx ? strokeWidth + 4 : strokeWidth}
                strokeLinecap="butt"
                className="cursor-pointer transition-all duration-150"
                style={{ opacity: hoveredIdx === null || hoveredIdx === idx ? 1 : 0.45 }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => handleSelect(slice.label)}
              />
            ))
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center">
          {hovered ? (
            <>
              <span className="text-[10px] text-[#8ea0ba] truncate max-w-full">{hovered.label}</span>
              <span className="text-sm font-extrabold text-[#e8eef8]">
                {formatMoney(hovered.value, currency)}
              </span>
              <span className="text-[10px] font-bold" style={{ color: hovered.color }}>
                {hovered.percent}%
              </span>
            </>
          ) : (
            <>
              <span className="text-base font-extrabold text-[#e8eef8]">
                {formatMoney(total, currency)}
              </span>
              <span className="text-[10px] text-[#8ea0ba]">
                {centerHint || `${data.length} slices`}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 w-full grid grid-cols-2 gap-1.5 text-xs max-h-36 overflow-y-auto px-1">
        {slices.map((slice, idx) => (
          <button
            key={slice.label}
            type="button"
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            onClick={() => handleSelect(slice.label)}
            className={`flex items-center gap-1.5 p-1 rounded-md cursor-pointer transition-colors text-left ${
              hoveredIdx === idx ? 'bg-[#152238]' : 'hover:bg-[#121c2f]'
            }`}
            title={`Drill into ${slice.label}`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-[11px] text-[#c8d4e5] truncate flex-1">{slice.label}</span>
            <span className="text-[10px] font-bold text-[#8ea0ba]">{slice.percent}%</span>
          </button>
        ))}
      </div>
    </div>
  );
};

type TxType = 'income' | 'expense' | 'investment';

export const AnalyticsPage: React.FC = () => {
  const {
    transactions,
    currency,
    isTxModalOpen,
    categories,
    getOrderedCategoryNames,
    spendingClassification,
    setSpendingRule,
    openCategoryModal
  } = useFinance();

  const [mode, setMode] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedCategory, setSelectedCategory] = useState<{
    type: TxType;
    name: string;
  } | null>(null);

  const [typeFilter, setTypeFilter] = useState<'all' | TxType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showClassifyPanel, setShowClassifyPanel] = useState(false);

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (
        mode !== 'monthly' ||
        isTxModalOpen ||
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target?.isContentEditable
      ) {
        return;
      }
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

  /** All transactions in the selected month/year (no type/category filters). */
  const periodTxs = useMemo(() => {
    if (mode === 'monthly') {
      const key = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
      return transactions.filter(t => getMonthKey(t.date) === key);
    }
    return transactions.filter(t => Number(t.date.slice(0, 4)) === selectedYear);
  }, [transactions, mode, selectedDate, selectedYear]);

  /**
   * Per-type isolation:
   * - Account + search always apply to every chart.
   * - Type / category / subcategory filters only affect the chart whose type matches
   *   (or all charts when typeFilter is "all").
   * - Other type charts keep their full period data so expense filtering never
   *   empties income or investment donuts.
   */
  const getTxsForType = (type: TxType) => {
    let txs = periodTxs.filter(t => t.type === type);

    if (accountFilter !== 'all') {
      txs = txs.filter(t => t.account === accountFilter);
    }

    const q = search.toLowerCase().trim();
    if (q) {
      txs = txs.filter(t => {
        const hay = `${t.category} ${t.subcategory || ''} ${t.note || ''} ${t.description || ''} ${t.account}`.toLowerCase();
        return hay.includes(q);
      });
    }

    const categoryFiltersApply = typeFilter === 'all' || typeFilter === type;
    if (categoryFiltersApply) {
      if (categoryFilter !== 'all') {
        txs = txs.filter(t => t.category === categoryFilter);
      }
      if (subcategoryFilter !== 'all') {
        txs = txs.filter(t => (t.subcategory || '') === subcategoryFilter);
      }
    }

    return txs;
  };

  /**
   * Chart data with drill-down states:
   * 1) No category filter → breakdown by main categories
   * 2) Main category selected → breakdown by subcategories of that category
   * 3) Category + subcategory → single slice at 100%
   */
  const buildChartData = (type: TxType): { label: string; value: number }[] => {
    const txs = getTxsForType(type);
    const categoryFiltersApply = typeFilter === 'all' || typeFilter === type;

    // State 3: category + subcategory → single slice
    if (categoryFiltersApply && categoryFilter !== 'all' && subcategoryFilter !== 'all') {
      const total = txs.reduce((s, t) => s + (Number(t.amount) || 0), 0);
      if (total <= 0) return [];
      return [{ label: subcategoryFilter, value: total }];
    }

    // State 2: main category only → subcategory breakdown
    if (categoryFiltersApply && categoryFilter !== 'all') {
      const map: Record<string, number> = {};
      txs.forEach(t => {
        const sub = t.subcategory?.trim() || 'Uncategorized';
        map[sub] = (map[sub] || 0) + (Number(t.amount) || 0);
      });
      return Object.entries(map)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
    }

    // State 1: default → main categories
    const map: Record<string, number> = {};
    txs.forEach(t => {
      const cat = t.category || 'Other';
      map[cat] = (map[cat] || 0) + (Number(t.amount) || 0);
    });
    const entries = Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    // One category left after filters → single 100% slice for this chart type
    return entries;
  };

  const incomeData = useMemo(() => buildChartData('income'), [
    periodTxs,
    typeFilter,
    categoryFilter,
    subcategoryFilter,
    accountFilter,
    search
  ]);
  const expenseData = useMemo(() => buildChartData('expense'), [
    periodTxs,
    typeFilter,
    categoryFilter,
    subcategoryFilter,
    accountFilter,
    search
  ]);
  const investmentData = useMemo(() => buildChartData('investment'), [
    periodTxs,
    typeFilter,
    categoryFilter,
    subcategoryFilter,
    accountFilter,
    search
  ]);

  // Chart/card totals follow filters (donut scope).
  const totalIncome = useMemo(() => incomeData.reduce((s, i) => s + i.value, 0), [incomeData]);
  const totalExpense = useMemo(() => expenseData.reduce((s, i) => s + i.value, 0), [expenseData]);
  const totalInvestment = useMemo(
    () => investmentData.reduce((s, i) => s + i.value, 0),
    [investmentData]
  );

  // Savings / investment rates always use the full period (ignore category, type,
  // subcategory, account, and search filters) so they stay stable while drilling down.
  const periodIncomeTotal = useMemo(
    () => periodTxs.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0),
    [periodTxs]
  );
  const periodExpenseTotal = useMemo(
    () => periodTxs.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0),
    [periodTxs]
  );
  const periodInvestmentTotal = useMemo(
    () => periodTxs.filter(t => t.type === 'investment').reduce((s, t) => s + (Number(t.amount) || 0), 0),
    [periodTxs]
  );

  const savingsRate =
    periodIncomeTotal > 0
      ? Math.round(((periodIncomeTotal - periodExpenseTotal) / periodIncomeTotal) * 100)
      : 0;
  const investmentRate =
    periodIncomeTotal > 0
      ? Math.round((periodInvestmentTotal / periodIncomeTotal) * 100)
      : 0;

  const chartLevelHint = (type: TxType): string => {
    const applies = typeFilter === 'all' || typeFilter === type;
    if (applies && categoryFilter !== 'all' && subcategoryFilter !== 'all') {
      return '1 subcategory';
    }
    if (applies && categoryFilter !== 'all') {
      return 'By subcategory';
    }
    return 'By category';
  };

  // Filter option lists (from period + type scope)
  const availableCategories = useMemo(() => {
    const pool =
      typeFilter === 'all' ? periodTxs : periodTxs.filter(t => t.type === typeFilter);
    return Array.from(new Set(pool.map(t => t.category).filter(Boolean))).sort();
  }, [periodTxs, typeFilter]);

  const availableSubcategories = useMemo(() => {
    let pool = periodTxs;
    if (typeFilter !== 'all') pool = pool.filter(t => t.type === typeFilter);
    if (categoryFilter !== 'all') pool = pool.filter(t => t.category === categoryFilter);
    return Array.from(
      new Set(pool.map(t => t.subcategory).filter(Boolean) as string[])
    ).sort();
  }, [periodTxs, typeFilter, categoryFilter]);

  const availableAccounts = useMemo(() => {
    return Array.from(new Set(periodTxs.map(t => t.account).filter(Boolean))).sort();
  }, [periodTxs]);

  /**
   * Need / Want resolution — retrospective:
   * Rules are keyed by "Category" or "Category||Subcategory".
   * Subcategory rule wins; otherwise parent category rule applies.
   * This maps every past and future expense matching those keys.
   */
  const resolveBucket = (
    category: string,
    subcategory?: string
  ): 'need' | 'want' | 'investment' | 'unclassified' => {
    const rules = spendingClassification.rules || {};
    const sub = subcategory?.trim();
    if (sub) {
      const subKey = `${category}||${sub}`;
      if (rules[subKey]) return rules[subKey];
    }
    if (rules[category]) return rules[category];
    return 'unclassified';
  };

  /**
   * Needs/Wants totals use the same period + shared filters, but always
   * recalculate from the full matching transaction set whenever rules change.
   */
  const needWantAnalysis = useMemo(() => {
    let need = 0;
    let want = 0;
    let invest = 0;
    let unclassified = 0;
    const needBreakdown: Record<string, number> = {};
    const wantBreakdown: Record<string, number> = {};

    // Use period txs with account/search; category filters apply to expenses only
    // so the unit stays in sync with expense analysis without wiping invest totals.
    let txs = periodTxs;
    if (accountFilter !== 'all') {
      txs = txs.filter(t => t.account === accountFilter);
    }
    const q = search.toLowerCase().trim();
    if (q) {
      txs = txs.filter(t => {
        const hay = `${t.category} ${t.subcategory || ''} ${t.note || ''} ${t.description || ''} ${t.account}`.toLowerCase();
        return hay.includes(q);
      });
    }

    txs.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'investment') {
        invest += amt;
        return;
      }
      if (t.type !== 'expense') return;

      // Optional expense-scoped category filters
      if (
        (typeFilter === 'all' || typeFilter === 'expense') &&
        categoryFilter !== 'all' &&
        t.category !== categoryFilter
      ) {
        return;
      }
      if (
        (typeFilter === 'all' || typeFilter === 'expense') &&
        subcategoryFilter !== 'all' &&
        (t.subcategory || '') !== subcategoryFilter
      ) {
        return;
      }

      const bucket = resolveBucket(t.category, t.subcategory);
      if (bucket === 'need') {
        need += amt;
        const label = t.subcategory ? `${t.category} › ${t.subcategory}` : t.category;
        needBreakdown[label] = (needBreakdown[label] || 0) + amt;
      } else if (bucket === 'want') {
        want += amt;
        const label = t.subcategory ? `${t.category} › ${t.subcategory}` : t.category;
        wantBreakdown[label] = (wantBreakdown[label] || 0) + amt;
      } else {
        unclassified += amt;
      }
    });

    const totalClassified = need + want + invest + unclassified;
    return {
      need,
      want,
      invest,
      unclassified,
      totalClassified,
      needBreakdown: Object.entries(needBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8),
      wantBreakdown: Object.entries(wantBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
    };
  }, [
    periodTxs,
    spendingClassification,
    accountFilter,
    search,
    typeFilter,
    categoryFilter,
    subcategoryFilter
  ]);

  const selectedCategoryAnalytics = useMemo(() => {
    if (!selectedCategory) return null;
    const txs = getTxsForType(selectedCategory.type).filter(
      t => (t.category || 'Other') === selectedCategory.name
    );
    const subcategoryMap = new Map<string, { amount: number; count: number }>();
    txs.forEach(t => {
      const sub = t.subcategory?.trim() || 'Uncategorized';
      const current = subcategoryMap.get(sub) || { amount: 0, count: 0 };
      current.amount += Number(t.amount) || 0;
      current.count += 1;
      subcategoryMap.set(sub, current);
    });
    const total = txs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const subcategories = Array.from(subcategoryMap.entries())
      .map(([name, data]) => ({
        name,
        ...data,
        percent: total > 0 ? Math.round((data.amount / total) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
    return {
      total,
      subcategories,
      transactions: txs.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
      count: txs.length,
      average: txs.length > 0 ? total / txs.length : 0
    };
  }, [
    selectedCategory,
    periodTxs,
    typeFilter,
    categoryFilter,
    subcategoryFilter,
    accountFilter,
    search
  ]);

  const classificationRows = useMemo(() => {
    const expenseCats = getOrderedCategoryNames('expense');
    const rows: { key: string; label: string; isSub: boolean; parent?: string }[] = [];
    expenseCats.forEach(cat => {
      rows.push({ key: cat, label: cat, isSub: false });
      const subs = categories.expense?.[cat] || [];
      subs.forEach(sub => {
        rows.push({ key: `${cat}||${sub}`, label: sub, isSub: true, parent: cat });
      });
    });
    return rows;
  }, [categories, getOrderedCategoryNames]);

  const periodLabel =
    mode === 'monthly' ? formatMonthYear(selectedDate) : String(selectedYear);

  const clearFilters = () => {
    setTypeFilter('all');
    setCategoryFilter('all');
    setSubcategoryFilter('all');
    setAccountFilter('all');
    setSearch('');
    setSelectedCategory(null);
  };

  const hasActiveFilters =
    typeFilter !== 'all' ||
    categoryFilter !== 'all' ||
    subcategoryFilter !== 'all' ||
    accountFilter !== 'all' ||
    search.trim() !== '';

  /** Clicking a donut slice sets the category filter for deeper drill-down. */
  const handleDonutSelect = (type: TxType, label: string) => {
    const applies = typeFilter === 'all' || typeFilter === type;
    // If we're already drilled into a category, slice labels are subcategories
    if (applies && categoryFilter !== 'all' && subcategoryFilter === 'all') {
      setSubcategoryFilter(label === 'Uncategorized' ? 'all' : label);
      setTypeFilter(type);
      setSelectedCategory({ type, name: categoryFilter });
      return;
    }
    // Top level: select main category
    setTypeFilter(type);
    setCategoryFilter(label);
    setSubcategoryFilter('all');
    setSelectedCategory({ type, name: label });
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-4 md:p-5 rounded-2xl">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-blue-400">
            Insights
          </span>
          <h2 className="text-lg md:text-xl font-bold text-[#e8eef8] mt-0.5">
            Financial Analytics
          </h2>
          <p className="text-xs text-[#8ea0ba]">
            Drill into categories and subcategories. Need/Want rules apply to all past and future
            matching transactions.
          </p>
        </div>
      </div>

      {/* Period + filters */}
      <div className="glass-card p-3.5 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#152238] border border-[#26344b] text-[#9eb0c9] hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="min-w-[130px] text-center">
              <div className="text-sm font-bold text-[#e8eef8]">{periodLabel}</div>
              <div className="text-[10px] text-[#71839d]">{periodTxs.length} transactions</div>
            </div>
            <button
              onClick={handleNextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#152238] border border-[#26344b] text-[#9eb0c9] hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#090f1a] border border-[#26344b]">
            <button
              onClick={() => setMode('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                mode === 'monthly' ? 'bg-blue-600 text-white' : 'text-[#8ea0ba]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setMode('yearly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                mode === 'yearly' ? 'bg-blue-600 text-white' : 'text-[#8ea0ba]'
              }`}
            >
              Yearly
            </button>
          </div>
          {mode === 'yearly' && (
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-[#0d1728] border border-[#26344b] text-xs font-medium text-[#c8d4e5] rounded-lg px-2.5 py-1.5"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1c2940]">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search note, category…"
            className="bg-[#0d1728] border border-[#26344b] text-xs text-[#c8d4e5] rounded-lg px-2.5 py-1.5 min-w-[140px] focus:outline-none focus:border-blue-500"
          />
          <select
            value={typeFilter}
            onChange={e => {
              setTypeFilter(e.target.value as 'all' | TxType);
              setCategoryFilter('all');
              setSubcategoryFilter('all');
              setSelectedCategory(null);
            }}
            className="bg-[#0d1728] border border-[#26344b] text-xs font-medium text-[#c8d4e5] rounded-lg px-2.5 py-1.5"
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="investment">Investment</option>
          </select>
          <select
            value={categoryFilter}
            onChange={e => {
              setCategoryFilter(e.target.value);
              setSubcategoryFilter('all');
              setSelectedCategory(null);
            }}
            className="bg-[#0d1728] border border-[#26344b] text-xs font-medium text-[#c8d4e5] rounded-lg px-2.5 py-1.5 max-w-[160px]"
          >
            <option value="all">All Categories</option>
            {availableCategories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            value={subcategoryFilter}
            onChange={e => setSubcategoryFilter(e.target.value)}
            className="bg-[#0d1728] border border-[#26344b] text-xs font-medium text-[#c8d4e5] rounded-lg px-2.5 py-1.5 max-w-[160px]"
          >
            <option value="all">All Sub-Categories</option>
            {availableSubcategories.map(sub => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
          <select
            value={accountFilter}
            onChange={e => setAccountFilter(e.target.value)}
            className="bg-[#0d1728] border border-[#26344b] text-xs font-medium text-[#c8d4e5] rounded-lg px-2.5 py-1.5"
          >
            <option value="all">All Accounts</option>
            {availableAccounts.map(acc => (
              <option key={acc} value={acc}>
                {acc}
              </option>
            ))}
          </select>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-[11px] font-semibold text-rose-300 hover:text-rose-200 px-2 py-1"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Drill-down breadcrumb */}
        {categoryFilter !== 'all' && (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#8ea0ba]">
            <span className="font-semibold text-[#c8d4e5]">Chart level:</span>
            <button
              type="button"
              onClick={() => {
                setCategoryFilter('all');
                setSubcategoryFilter('all');
                setSelectedCategory(null);
              }}
              className="px-2 py-0.5 rounded-md bg-[#152238] border border-[#26344b] hover:text-white"
            >
              All categories
            </button>
            <span>›</span>
            <button
              type="button"
              onClick={() => setSubcategoryFilter('all')}
              className={`px-2 py-0.5 rounded-md border ${
                subcategoryFilter === 'all'
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                  : 'bg-[#152238] border-[#26344b] hover:text-white'
              }`}
            >
              {categoryFilter}
            </button>
            {subcategoryFilter !== 'all' && (
              <>
                <span>›</span>
                <span className="px-2 py-0.5 rounded-md bg-blue-600/20 border border-blue-500/40 text-blue-300">
                  {subcategoryFilter}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="stat-card stat-card-income p-4">
          <div className="text-[11px] font-bold uppercase text-[#8ea0ba]">Income</div>
          <div className="text-xl font-extrabold text-emerald-400 mt-1">
            {formatMoney(totalIncome, currency)}
          </div>
        </div>
        <div className="stat-card stat-card-expense p-4">
          <div className="text-[11px] font-bold uppercase text-[#8ea0ba]">Expenses</div>
          <div className="text-xl font-extrabold text-rose-400 mt-1">
            {formatMoney(totalExpense, currency)}
          </div>
        </div>
        <div className="stat-card stat-card-invest p-4">
          <div className="text-[11px] font-bold uppercase text-[#8ea0ba]">Investments</div>
          <div className="text-xl font-extrabold text-blue-400 mt-1">
            {formatMoney(totalInvestment, currency)}
          </div>
        </div>
        <div className="stat-card p-4">
          <div className="text-[11px] font-bold uppercase text-[#8ea0ba]">Savings Rate</div>
          <div className="text-xl font-extrabold text-amber-300 mt-1">{savingsRate}%</div>
          <div className="text-[10px] text-[#71839d]">Invest rate {investmentRate}%</div>
        </div>
      </div>

      {/* ========== 1. DONUT CHARTS (top) ========== */}
      <div className="analytics-donut-grid gap-5">
        <div className="p-5 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-md flex flex-col">
          <h3 className="text-sm font-bold text-emerald-400 text-center mb-1">
            Income by {chartLevelHint('income') === 'By subcategory' || chartLevelHint('income') === '1 subcategory' ? 'Subcategory' : 'Category'}
          </h3>
          <div className="text-xs text-center text-[#71839d] mb-4">
            Total: {formatMoney(totalIncome, currency)}
            {typeFilter !== 'all' && typeFilter !== 'income' && (
              <span className="block text-[10px] text-emerald-500/80 mt-0.5">
                Independent (expense/invest filters ignored)
              </span>
            )}
          </div>
          <SvgDonutChart
            data={incomeData}
            total={totalIncome}
            currency={currency}
            accentColor="#37d67a"
            emptyLabel="No income in current scope"
            centerHint={chartLevelHint('income')}
            onSelectCategory={label => handleDonutSelect('income', label)}
          />
        </div>

        <div className="p-5 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-md flex flex-col">
          <h3 className="text-sm font-bold text-rose-400 text-center mb-1">
            Expenses by {chartLevelHint('expense') === 'By subcategory' || chartLevelHint('expense') === '1 subcategory' ? 'Subcategory' : 'Category'}
          </h3>
          <div className="text-xs text-center text-[#71839d] mb-4">
            Total: {formatMoney(totalExpense, currency)}
            {typeFilter !== 'all' && typeFilter !== 'expense' && (
              <span className="block text-[10px] text-rose-400/80 mt-0.5">
                Independent (other type filters ignored)
              </span>
            )}
          </div>
          <SvgDonutChart
            data={expenseData}
            total={totalExpense}
            currency={currency}
            accentColor="#ff6262"
            emptyLabel="No expenses in current scope"
            centerHint={chartLevelHint('expense')}
            onSelectCategory={label => handleDonutSelect('expense', label)}
          />
        </div>

        <div className="p-5 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-md flex flex-col">
          <h3 className="text-sm font-bold text-blue-400 text-center mb-1">
            Investments by {chartLevelHint('investment') === 'By subcategory' || chartLevelHint('investment') === '1 subcategory' ? 'Subcategory' : 'Category'}
          </h3>
          <div className="text-xs text-center text-[#71839d] mb-4">
            Total: {formatMoney(totalInvestment, currency)}
            {typeFilter !== 'all' && typeFilter !== 'investment' && (
              <span className="block text-[10px] text-blue-400/80 mt-0.5">
                Independent (other type filters ignored)
              </span>
            )}
          </div>
          <SvgDonutChart
            data={investmentData}
            total={totalInvestment}
            currency={currency}
            accentColor="#5ea7ff"
            emptyLabel="No investments in current scope"
            centerHint={chartLevelHint('investment')}
            onSelectCategory={label => handleDonutSelect('investment', label)}
          />
        </div>
      </div>

      {/* Drill-down panel when a category is focused */}
      {selectedCategory && selectedCategoryAnalytics && (
        <div className="glass-card p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#e8eef8]">
              {selectedCategory.name}
              {subcategoryFilter !== 'all' ? ` › ${subcategoryFilter}` : ''} — Detail
            </h3>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory(null);
                setCategoryFilter('all');
                setSubcategoryFilter('all');
              }}
              className="w-8 h-8 rounded-lg bg-[#17243a] text-[#9db0c9] hover:text-white hover:bg-[#20314b] transition-colors"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#0d1728] border border-[#26344b]">
              <span className="text-[#71839d] block">Total</span>
              <span className="font-bold text-[#e8eef8] text-sm">
                {formatMoney(selectedCategoryAnalytics.total, currency)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#0d1728] border border-[#26344b]">
              <span className="text-[#71839d] block">Entries</span>
              <span className="font-bold text-[#e8eef8] text-sm">
                {selectedCategoryAnalytics.count}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#0d1728] border border-[#26344b]">
              <span className="text-[#71839d] block">Average</span>
              <span className="font-bold text-[#e8eef8] text-sm">
                {formatMoney(selectedCategoryAnalytics.average, currency)}
              </span>
            </div>
          </div>
          {selectedCategoryAnalytics.subcategories.length > 0 && subcategoryFilter === 'all' && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#c8d4e5]">Subcategories</h4>
              {selectedCategoryAnalytics.subcategories.map(sub => (
                <button
                  key={sub.name}
                  type="button"
                  onClick={() => setSubcategoryFilter(sub.name === 'Uncategorized' ? 'all' : sub.name)}
                  className="w-full text-left"
                >
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#c8d4e5] font-semibold">{sub.name}</span>
                    <span className="text-[#8ea0ba]">
                      {formatMoney(sub.amount, currency)} · {sub.percent}%
                    </span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill bg-blue-500" style={{ width: `${sub.percent}%` }} />
                  </div>
                </button>
              ))}
            </div>
          )}
          <div>
            <h4 className="text-xs font-bold text-[#c8d4e5] mb-2">Recent transactions</h4>
            <div className="divide-y divide-[#1d2a3e] max-h-48 overflow-y-auto">
              {selectedCategoryAnalytics.transactions.slice(0, 12).map(tx => (
                <div key={tx.id} className="py-2 flex justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold text-[#d9e2ef] truncate">
                      {tx.subcategory || 'Uncategorized'}
                    </div>
                    <div className="text-[#71839d]">
                      {tx.date}
                      {tx.note ? ` · ${tx.note}` : ''}
                    </div>
                  </div>
                  <span className="font-bold text-[#e8eef8] shrink-0">
                    {formatMoney(tx.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========== 2. NEEDS & WANTS (bottom) ========== */}
      <div className="glass-card p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-[#e8eef8] flex items-center gap-2">
              <Percent className="w-5 h-5 text-amber-300" />
              Needs · Wants · Investments
            </h3>
            <p className="text-xs text-[#8ea0ba] mt-1">
              Classify expense categories and subcategories. Rules apply{' '}
              <strong className="text-[#c8d4e5]">retroactively</strong> to all existing transactions
              and to future ones automatically.
            </p>
          </div>
          <button
            onClick={() => setShowClassifyPanel(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              showClassifyPanel
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-[#152238] border-[#26344b] text-[#c8d4e5] hover:border-amber-500/30'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {showClassifyPanel ? 'Hide classifier' : 'Configure classification'}
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
            <div className="text-[11px] font-bold text-emerald-300 uppercase">Needs</div>
            <div className="text-lg font-extrabold text-emerald-400 mt-1">
              {formatMoney(needWantAnalysis.need, currency)}
            </div>
            <div className="text-[10px] text-[#71839d]">
              {needWantAnalysis.totalClassified > 0
                ? `${Math.round((needWantAnalysis.need / needWantAnalysis.totalClassified) * 100)}% of outflow`
                : '—'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25">
            <div className="text-[11px] font-bold text-rose-300 uppercase">Wants</div>
            <div className="text-lg font-extrabold text-rose-400 mt-1">
              {formatMoney(needWantAnalysis.want, currency)}
            </div>
            <div className="text-[10px] text-[#71839d]">
              {needWantAnalysis.totalClassified > 0
                ? `${Math.round((needWantAnalysis.want / needWantAnalysis.totalClassified) * 100)}% of outflow`
                : '—'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/25">
            <div className="text-[11px] font-bold text-blue-300 uppercase">Investments</div>
            <div className="text-lg font-extrabold text-blue-400 mt-1">
              {formatMoney(needWantAnalysis.invest, currency)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#152238] border border-[#26344b]">
            <div className="text-[11px] font-bold text-[#8ea0ba] uppercase">Unclassified</div>
            <div className="text-lg font-extrabold text-[#c8d4e5] mt-1">
              {formatMoney(needWantAnalysis.unclassified, currency)}
            </div>
            <div className="text-[10px] text-[#71839d]">Assign rules below</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SvgDonutChart
            data={[
              { label: 'Needs', value: needWantAnalysis.need },
              { label: 'Wants', value: needWantAnalysis.want },
              { label: 'Investments', value: needWantAnalysis.invest },
              ...(needWantAnalysis.unclassified > 0
                ? [{ label: 'Unclassified', value: needWantAnalysis.unclassified }]
                : [])
            ]}
            total={needWantAnalysis.totalClassified}
            currency={currency}
            accentColor="#f5c84b"
            emptyLabel="No spending in this period"
            centerHint="Need / Want split"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <h4 className="text-xs font-bold text-emerald-300 mb-2">Top Needs</h4>
              {needWantAnalysis.needBreakdown.length === 0 ? (
                <p className="text-[11px] text-[#71839d]">No needs classified yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {needWantAnalysis.needBreakdown.map(([label, amt]) => (
                    <li key={label} className="flex justify-between text-xs gap-2">
                      <span className="text-[#c8d4e5] truncate">{label}</span>
                      <span className="text-emerald-400 font-semibold shrink-0">
                        {formatMoney(amt, currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h4 className="text-xs font-bold text-rose-300 mb-2">Top Wants</h4>
              {needWantAnalysis.wantBreakdown.length === 0 ? (
                <p className="text-[11px] text-[#71839d]">No wants classified yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {needWantAnalysis.wantBreakdown.map(([label, amt]) => (
                    <li key={label} className="flex justify-between text-xs gap-2">
                      <span className="text-[#c8d4e5] truncate">{label}</span>
                      <span className="text-rose-400 font-semibold shrink-0">
                        {formatMoney(amt, currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {showClassifyPanel && (
          <div className="border-t border-[#26344b] pt-4">
            <div className="flex items-center justify-between mb-3 gap-2">
              <p className="text-xs text-[#8ea0ba]">
                Mark each expense <strong className="text-[#e8eef8]">category</strong> as Need or
                Want. Expand to subcategories — e.g. Food = Need, but “Eating out” = Want.
                Subcategory rules override the parent. Changes update all past transactions
                instantly.
              </p>
              <button
                onClick={() => openCategoryModal()}
                className="text-[11px] font-semibold text-blue-400 shrink-0"
              >
                Edit categories
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto rounded-xl border border-[#26344b] divide-y divide-[#1d2a3e]">
              {classificationRows.map(row => {
                const current = spendingClassification.rules[row.key];
                const parentRule =
                  row.isSub && row.parent
                    ? spendingClassification.rules[row.parent]
                    : undefined;
                const effective = current || (row.isSub ? parentRule : undefined);
                return (
                  <div
                    key={row.key}
                    className={`flex items-center justify-between gap-2 px-3 py-2 ${
                      row.isSub ? 'pl-8 bg-[#0d1524]/50' : 'bg-[#0d1728]'
                    }`}
                  >
                    <div className="min-w-0">
                      <span
                        className={`text-xs truncate block ${
                          row.isSub ? 'text-[#9eb0c9]' : 'text-[#e8eef8] font-semibold'
                        }`}
                      >
                        {row.isSub ? `↳ ${row.label}` : row.label}
                      </span>
                      {row.isSub && !current && parentRule && (
                        <span className="text-[10px] text-[#62738a]">
                          Inherits parent ({parentRule})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() =>
                          setSpendingRule(row.key, current === 'need' ? null : 'need')
                        }
                        className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors ${
                          current === 'need'
                            ? 'bg-emerald-500/25 border-emerald-500/50 text-emerald-300'
                            : effective === 'need' && !current
                              ? 'border-emerald-500/20 text-emerald-500/50'
                              : 'border-[#26344b] text-[#71839d] hover:text-emerald-300'
                        }`}
                      >
                        Need
                      </button>
                      <button
                        onClick={() =>
                          setSpendingRule(row.key, current === 'want' ? null : 'want')
                        }
                        className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors ${
                          current === 'want'
                            ? 'bg-rose-500/25 border-rose-500/50 text-rose-300'
                            : effective === 'want' && !current
                              ? 'border-rose-500/20 text-rose-400/50'
                              : 'border-[#26344b] text-[#71839d] hover:text-rose-300'
                        }`}
                      >
                        Want
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
