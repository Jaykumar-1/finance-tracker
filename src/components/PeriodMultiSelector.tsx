import React, { useMemo, useState } from 'react';

export const MONTH_OPTIONS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function useMultiPeriodSelection(transactions: { date: string }[], selectedDate: Date) {
  const years = useMemo(() => {
    const values = Array.from(new Set(transactions.map(t => Number(t.date.slice(0, 4))).filter(Number.isFinite)));
    const current = new Date().getFullYear();
    if (!values.includes(current)) values.push(current);
    return values.sort((a, b) => b - a);
  }, [transactions]);
  const [selectedYears, setSelectedYears] = useState<number[]>([selectedDate.getFullYear()]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>(Array.from({ length: 12 }, (_, i) => i + 1));
  const toggleYear = (year: number) => setSelectedYears(prev => prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year].sort((a, b) => a - b));
  const toggleMonth = (month: number) => setSelectedMonths(prev => prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month].sort((a, b) => a - b));
  const matches = (date: string, mode: 'monthly' | 'yearly') => {
    if (mode === 'monthly') return date.slice(0, 7) === `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
    return selectedYears.includes(Number(date.slice(0, 4))) && selectedMonths.includes(Number(date.slice(5, 7)));
  };
  return { years, selectedYears, selectedMonths, toggleYear, toggleMonth, matches, setSelectedYears, setSelectedMonths };
}

export const MultiPeriodCheckboxes: React.FC<{ years: number[]; selectedYears: number[]; selectedMonths: number[]; onToggleYear: (year: number) => void; onToggleMonth: (month: number) => void }> = ({ years, selectedYears, selectedMonths, onToggleYear, onToggleMonth }) => (
  <details className="relative shrink-0 text-xs">
    <summary className="list-none cursor-pointer select-none rounded-lg border border-[#26344b] bg-[#0d1728] px-3 py-2 text-[#c8d4e5] hover:border-blue-500/60 whitespace-nowrap">
      <span className="font-semibold">Period filters</span>
      <span className="ml-2 text-blue-300">{selectedYears.length}Y · {selectedMonths.length}M</span>
      <span className="ml-1 text-[#71839d]">▾</span>
    </summary>
    <div className="absolute right-0 top-full z-40 mt-2 w-[min(88vw,360px)] rounded-xl border border-[#26344b] bg-[#0d1728] p-3 shadow-2xl space-y-3">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8ea0ba]">Years</span>
          <span className="text-[10px] text-[#71839d]">{selectedYears.length} selected</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-2 gap-y-1.5">
          {years.map(year => <label key={year} className="flex min-w-0 items-center gap-1.5 rounded-md px-1 py-1 text-[11px] text-[#c8d4e5] cursor-pointer hover:bg-white/5"><input type="checkbox" checked={selectedYears.includes(year)} onChange={() => onToggleYear(year)} className="h-3.5 w-3.5 shrink-0 accent-blue-500" />{year}</label>)}
        </div>
      </section>
      <section className="border-t border-[#26344b] pt-2">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8ea0ba]">Months</span>
          <div className="flex gap-3"><button type="button" onClick={() => MONTH_OPTIONS.forEach((_, i) => { if (!selectedMonths.includes(i + 1)) onToggleMonth(i + 1); })} className="text-[10px] font-semibold text-blue-400">Select all</button><button type="button" onClick={() => selectedMonths.forEach(m => onToggleMonth(m))} className="text-[10px] font-semibold text-blue-400">Clear</button></div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-2 gap-y-1">
          {MONTH_OPTIONS.map((month, i) => <label key={month} className="flex min-w-0 items-center gap-1.5 rounded-md px-1 py-1 text-[11px] text-[#c8d4e5] cursor-pointer hover:bg-white/5"><input type="checkbox" checked={selectedMonths.includes(i + 1)} onChange={() => onToggleMonth(i + 1)} className="h-3.5 w-3.5 shrink-0 accent-blue-500" />{month.slice(0, 3)}</label>)}
        </div>
      </section>
      <div className="border-t border-[#26344b] pt-2 text-[10px] text-[#71839d]">Selected periods combine all checked years and months.</div>
    </div>
  </details>
);
