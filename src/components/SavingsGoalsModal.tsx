import React, { useEffect, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatMoney, formatMonthYear, getMonthKey, toIsoDate } from '../utils/formatters';
import {
  X,
  Target,
  Sparkles,
  CheckCircle,
  TrendingUp,
  DollarSign
} from 'lucide-react';

export const SavingsGoalsModal: React.FC = () => {
  const {
    isGoalModalOpen,
    closeGoalModal,
    currentMonth,
    getCurrentMonthGoal,
    setSavingsGoal,
    currency,
    triggerCelebration,
    transactions
  } = useFinance();

  const currentMonthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
  const existingGoal = getCurrentMonthGoal(currentMonthKey);

  const [targetSavings, setTargetSavings] = useState<string>('');
  const [expenseBudget, setExpenseBudget] = useState<string>('');
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (isGoalModalOpen) {
      if (existingGoal) {
        setTargetSavings(String(existingGoal.targetSavings || ''));
        setExpenseBudget(existingGoal.expenseBudget ? String(existingGoal.expenseBudget) : '');
        setNote(existingGoal.note || '');
      } else {
        // Estimate from recent monthly income if available
        const curTxs = transactions.filter(t => getMonthKey(t.date) === currentMonthKey);
        const income = curTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const suggestedTarget = income > 0 ? Math.round(income * 0.3) : 25000;
        const suggestedExpense = income > 0 ? Math.round(income * 0.6) : 40000;

        setTargetSavings(String(suggestedTarget));
        setExpenseBudget(String(suggestedExpense));
        setNote('Target 30% savings rate for emergency and wealth accumulation');
      }
    }
  }, [isGoalModalOpen, existingGoal, currentMonthKey, transactions]);

  if (!isGoalModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetSavings) || 0;
    const budget = expenseBudget ? parseFloat(expenseBudget) : undefined;

    setSavingsGoal(currentMonthKey, target, budget, note.trim());
    triggerCelebration();
    closeGoalModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-[#101a2b] border border-[#2d3e58] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-[#26344b] flex items-center justify-between bg-[#0d1627]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-300 flex items-center justify-center border border-amber-500/30">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#e8eef8]">
                Monthly Savings Goal
              </h3>
              <p className="text-xs text-[#8ea0ba]">
                For {formatMonthYear(currentMonth)}
              </p>
            </div>
          </div>
          <button
            onClick={closeGoalModal}
            className="p-1.5 rounded-lg text-[#8ea0ba] hover:text-white hover:bg-[#1a2b44] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 md:p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#c8d4e5] mb-1">
              Target Monthly Savings ({currency}) *
            </label>
            <input
              type="number"
              min="0"
              step="100"
              required
              value={targetSavings}
              onChange={e => setTargetSavings(e.target.value)}
              placeholder="e.g. 35000"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1728] border border-[#26344b] text-base font-extrabold text-amber-300 placeholder-[#5d708a] focus:outline-none focus:border-amber-500"
            />
            <span className="text-[11px] text-[#71839d] mt-1 block">
              Net income retained after all expenses and investments.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#c8d4e5] mb-1">
              Monthly Expense Budget Limit ({currency}) (Optional)
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={expenseBudget}
              onChange={e => setExpenseBudget(e.target.value)}
              placeholder="e.g. 45000"
              className="w-full px-3 py-2 rounded-xl bg-[#0d1728] border border-[#26344b] text-sm font-semibold text-[#e8eef8] placeholder-[#5d708a] focus:outline-none focus:border-blue-500"
            />
            <span className="text-[11px] text-[#71839d] mt-1 block">
              Alert threshold when your total monthly expenses cross this figure.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#c8d4e5] mb-1">
              Goal Note / Motivation
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Emergency fund builder, Year-end vacation savings"
              className="w-full px-3 py-2 rounded-xl bg-[#0d1728] border border-[#26344b] text-xs text-[#e8eef8] placeholder-[#5d708a] focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#26344b]">
            <button
              type="button"
              onClick={closeGoalModal}
              className="px-4 py-2 rounded-xl bg-[#152238] border border-[#26344b] text-xs font-semibold text-[#8ea0ba] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Set Savings Goal</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
