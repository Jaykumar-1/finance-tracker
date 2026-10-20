import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatMoney } from '../utils/formatters';
import { Calculator, TrendingUp } from 'lucide-react';

/**
 * Lightweight compound interest / SIP growth calculator widget.
 * Pure client-side — no network calls.
 */
export const CompoundCalculator: React.FC = () => {
  const { currency } = useFinance();
  const [principal, setPrincipal] = useState(100000);
  const [monthly, setMonthly] = useState(10000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);

  const result = useMemo(() => {
    const r = rate / 100 / 12; // monthly rate
    const n = Math.max(0, Math.round(years * 12));
    let balance = Number(principal) || 0;
    const contrib = Number(monthly) || 0;

    if (r === 0) {
      balance = balance + contrib * n;
    } else {
      // Future value of principal
      const fvPrincipal = balance * Math.pow(1 + r, n);
      // Future value of annuity (monthly contributions at end of each period)
      const fvAnnuity = contrib * ((Math.pow(1 + r, n) - 1) / r);
      balance = fvPrincipal + fvAnnuity;
    }

    const invested = (Number(principal) || 0) + contrib * n;
    const gains = balance - invested;
    return { balance, invested, gains };
  }, [principal, monthly, rate, years]);

  const inputCls =
    'w-full px-2.5 py-1.5 rounded-lg bg-[#090f1a] border border-[#26344b] text-xs text-white focus:outline-none focus:border-blue-500';

  return (
    <div className="glass-card p-4 rounded-2xl h-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
          <Calculator className="w-4 h-4 text-amber-300" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#e8eef8]">Compound Growth Calculator</h3>
          <p className="text-[10px] text-[#71839d]">Estimate investment returns with monthly SIP</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <div>
          <label className="text-[10px] font-semibold text-[#8ea0ba] block mb-1">Principal</label>
          <input
            type="number"
            min={0}
            value={principal}
            onChange={e => setPrincipal(Number(e.target.value))}
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-[#8ea0ba] block mb-1">Monthly SIP</label>
          <input
            type="number"
            min={0}
            value={monthly}
            onChange={e => setMonthly(Number(e.target.value))}
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-[#8ea0ba] block mb-1">Annual Rate %</label>
          <input
            type="number"
            min={0}
            max={50}
            step={0.1}
            value={rate}
            onChange={e => setRate(Number(e.target.value))}
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-[#8ea0ba] block mb-1">Years</label>
          <input
            type="number"
            min={1}
            max={50}
            value={years}
            onChange={e => setYears(Number(e.target.value))}
            className={inputCls}
          />
        </div>
      </div>

      <div className="rounded-xl bg-[#0d1728] border border-[#26344b] p-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#8ea0ba]">Total invested</span>
          <span className="font-semibold text-[#c8d4e5]">{formatMoney(result.invested, currency)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#8ea0ba]">Est. gains</span>
          <span className="font-semibold text-emerald-400">{formatMoney(result.gains, currency)}</span>
        </div>
        <div className="flex items-center justify-between text-sm pt-1 border-t border-[#1d2a3e]">
          <span className="font-bold text-[#e8eef8] flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-amber-300" />
            Future value
          </span>
          <span className="font-extrabold text-amber-300">{formatMoney(result.balance, currency)}</span>
        </div>
      </div>
    </div>
  );
};
