import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts } = useFinance();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[60] flex flex-col gap-2 max-w-sm w-full pointer-events-none sm:top-24">
      {toasts.map(toast => {
        let bg = 'bg-[#152238]/95 border-[#344965] text-[#e8eef8]';
        let Icon = CheckCircle2;
        let iconColor = 'text-emerald-400';

        if (toast.type === 'error') {
          bg = 'bg-[#2a141a]/95 border-red-800/60 text-red-100';
          Icon = AlertCircle;
          iconColor = 'text-red-400';
        } else if (toast.type === 'warning') {
          bg = 'bg-[#2a2212]/95 border-amber-800/60 text-amber-100';
          Icon = AlertTriangle;
          iconColor = 'text-amber-400';
        } else if (toast.type === 'info') {
          bg = 'bg-[#12213a]/95 border-blue-800/60 text-blue-100';
          Icon = Info;
          iconColor = 'text-blue-400';
        }

        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 p-3.5 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-300 pointer-events-auto animate-fade-in-up ${bg}`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
            <span className="text-sm font-medium leading-snug">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
};
