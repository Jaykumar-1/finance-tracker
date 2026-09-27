import React, { useEffect, useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { TransactionType } from '../types/finance';
import { ACCOUNT_OPTIONS } from '../utils/constants';
import { formatMoney, toIsoDate } from '../utils/formatters';
import {
  X,
  TrendingUp,
  TrendingDown,
  LineChart,
  CalendarDays,
  CreditCard,
  FileText,
  PlusCircle,
  Edit2,
  Trash2,
  Save
} from 'lucide-react';

export const TransactionModal: React.FC = () => {
  const {
    isTxModalOpen,
    closeTxModal,
    modalTxType,
    modalPrefillDate,
    editingTransaction,
    categories,
    currency,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    transactions,
    openTxModal,
    openCategoryModal
  } = useFinance();

  const [type, setType] = useState<TransactionType>(modalTxType);
  const [date, setDate] = useState<string>(modalPrefillDate);
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [subcategory, setSubcategory] = useState<string>('');
  const [account, setAccount] = useState<string>(ACCOUNT_OPTIONS[0]);
  const [note, setNote] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const setDefaultsForNewTransaction = (newType: TransactionType, newDate: string) => {
    const typeCats = Object.keys(categories[newType] || {});
    const defaultCat = typeCats[0] || '';
    const subList = categories[newType]?.[defaultCat] || [];

    setType(newType);
    setDate(newDate || toIsoDate(new Date()));
    setAmount('');
    setCategory(defaultCat);
    setSubcategory(subList[0] || '');
    setAccount(ACCOUNT_OPTIONS[0]);
    setNote('');
    setDescription('');
  };

  // Sync state with modal props.
  useEffect(() => {
    if (!isTxModalOpen) return;

    if (editingTransaction) {
      setType(editingTransaction.type);
      setDate(editingTransaction.date);
      setAmount(String(editingTransaction.amount));
      setCategory(editingTransaction.category);
      setSubcategory(editingTransaction.subcategory || '');
      setAccount(editingTransaction.account || ACCOUNT_OPTIONS[0]);
      setNote(editingTransaction.note || '');
      setDescription(editingTransaction.description || '');
    } else {
      setDefaultsForNewTransaction(modalTxType, modalPrefillDate || toIsoDate(new Date()));
    }
  }, [isTxModalOpen, modalTxType, modalPrefillDate, editingTransaction, categories]);

  const handleTypeChange = (newType: TransactionType) => {
    const typeCats = Object.keys(categories[newType] || {});
    const defaultCat = typeCats[0] || '';
    const subList = categories[newType]?.[defaultCat] || [];
    setType(newType);
    setCategory(defaultCat);
    setSubcategory(subList[0] || '');
  };

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    const subList = categories[type]?.[newCat] || [];
    setSubcategory(subList[0] || '');
  };

  const availableCategories = Object.keys(categories[type] || {});
  const availableSubcategories = category ? categories[type]?.[category] || [] : [];

  const dayTransactions = useMemo(() => {
    if (!isTxModalOpen || !date) return [];
    return transactions
      .filter(t => t.date === date)
      .sort((a, b) => (a.updatedAt || '').localeCompare(b.updatedAt || ''));
  }, [transactions, date, isTxModalOpen]);

  if (!isTxModalOpen) return null;

  const validateTransaction = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      alert('Please enter a valid positive amount.');
      return null;
    }
    if (!category) {
      alert('Please select or create a category.');
      return null;
    }
    return numAmount;
  };

  const resetToAddMode = () => {
    // Re-open the same modal as a fresh transaction without closing the dialog.
    openTxModal(type, date);
  };

  const handleSave = (closeAfterSave: boolean) => {
    const numAmount = validateTransaction();
    if (numAmount === null) return;

    if (editingTransaction) {
      updateTransaction({
        ...editingTransaction,
        type,
        date,
        amount: numAmount,
        category,
        subcategory: subcategory || undefined,
        account,
        note: note.trim() || undefined,
        description: description.trim() || undefined
      });
    } else {
      addTransaction({
        type,
        date,
        amount: numAmount,
        category,
        subcategory: subcategory || undefined,
        account,
        note: note.trim() || undefined,
        description: description.trim() || undefined
      });
    }

    if (closeAfterSave) {
      closeTxModal();
    } else {
      resetToAddMode();
    }
  };

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      closeTxModal();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
      onMouseDown={handleBackdropClick}
      role="presentation"
    >
      <div className="w-full max-w-5xl bg-[#101a2b] border border-[#2d3e58] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] lg:max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-4 py-3 md:px-5 md:py-4 border-b border-[#26344b] flex items-center justify-between bg-[#0d1627] shrink-0">
          <div>
            <h3 className="text-base md:text-lg font-bold text-[#e8eef8]">
              {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
            </h3>
            <p className="text-[11px] text-[#8ea0ba]">
              {date ? `Transactions for ${date}` : 'Record details into your secure financial ledger.'}
            </p>
          </div>
          <button
            type="button"
            onClick={closeTxModal}
            className="p-1.5 rounded-lg text-[#8ea0ba] hover:text-white hover:bg-[#1a2b44] transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Desktop: transactions on the left, form on the right. Mobile: stacked and scrollable. */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,0.9fr)_minmax(440px,1.1fr)] min-h-0 flex-1">
          {/* Left: all transactions for the selected date */}
          <section className="min-h-0 lg:border-r lg:border-[#26344b] bg-[#0d1728] flex flex-col">
            <div className="px-4 py-3 border-b border-[#26344b] flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#e8eef8]">
                  <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
                  Transactions on {date}
                </div>
                <div className="text-[10px] text-[#71839d] mt-0.5">
                  {dayTransactions.length === 0 ? 'No transaction recorded yet.' : 'All transactions for this day.'}
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#152238] text-[#9eb0c9]">
                {dayTransactions.length}
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-[#1f2d43]">
              {dayTransactions.length > 0 ? dayTransactions.map(tx => {
                const tone = tx.type === 'income'
                  ? 'text-emerald-400'
                  : tx.type === 'expense'
                    ? 'text-rose-400'
                    : 'text-blue-400';
                const label = tx.type === 'income' ? 'Income' : tx.type === 'expense' ? 'Expense' : 'Investment';

                return (
                  <div key={tx.id} className="px-4 py-3 flex items-center gap-2.5 hover:bg-[#111e33] transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[10px] font-bold ${tone}`}>{label}</span>
                        <span className="text-xs font-semibold text-[#dbe6f6] truncate">{tx.category}</span>
                      </div>
                      <div className="text-[10px] text-[#71839d] truncate mt-0.5">
                        {tx.subcategory ? `${tx.subcategory} · ` : ''}{tx.note || tx.description || 'No note'}
                      </div>
                    </div>
                    <div className={`text-xs font-extrabold ${tone} whitespace-nowrap`}>
                      {tx.type === 'expense' ? '−' : tx.type === 'investment' ? '↗' : '+'}{formatMoney(tx.amount, currency)}
                    </div>
                    <button
                      type="button"
                      onClick={() => openTxModal(tx.type, tx.date, tx)}
                      className="p-1.5 rounded-lg text-[#8ea0ba] hover:text-blue-300 hover:bg-[#18273f]"
                      title="Edit transaction"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Delete this transaction?')) deleteTransaction(tx.id);
                      }}
                      className="p-1.5 rounded-lg text-[#8ea0ba] hover:text-rose-300 hover:bg-rose-950/30"
                      title="Delete transaction"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              }) : null}
            </div>
          </section>

          {/* Right: normal transaction form */}
          <form
            onSubmit={event => {
              event.preventDefault();
              handleSave(false);
            }}
            className="min-h-0 overflow-y-auto lg:overflow-hidden p-4 md:p-5 flex flex-col"
          >
            {/* Transaction Type Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-[#090f1a] border border-[#26344b] shrink-0">
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  type === 'income' ? 'bg-emerald-600 text-white shadow-md' : 'text-[#8ea0ba] hover:text-white hover:bg-[#142238]'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Income</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  type === 'expense' ? 'bg-rose-600 text-white shadow-md' : 'text-[#8ea0ba] hover:text-white hover:bg-[#142238]'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Expense</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('investment')}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  type === 'investment' ? 'bg-blue-600 text-white shadow-md' : 'text-[#8ea0ba] hover:text-white hover:bg-[#142238]'
                }`}
              >
                <LineChart className="w-3.5 h-3.5" />
                <span>Investment</span>
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
              <div>
                <label className="block text-xs font-bold text-[#c8d4e5] mb-1">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  autoFocus
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="e.g. 2500"
                  className="w-full px-3 py-2 rounded-xl bg-[#0d1728] border border-[#26344b] text-sm font-bold text-white placeholder-[#5d708a] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#c8d4e5] mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0d1728] border border-[#26344b] text-xs font-semibold text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#c8d4e5]">Category *</label>
                  <button
                    type="button"
                    onClick={openCategoryModal}
                    className="text-[11px] font-semibold text-blue-400 hover:underline"
                  >
                    + Manage
                  </button>
                </div>
                <select
                  value={category}
                  onChange={e => handleCategoryChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[#0d1728] border border-[#26344b] text-xs font-semibold text-[#e8eef8] focus:outline-none focus:border-blue-500"
                >
                  {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#c8d4e5] mb-1">Subcategory</label>
                <select
                  value={subcategory}
                  onChange={e => setSubcategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0d1728] border border-[#26344b] text-xs font-semibold text-[#e8eef8] focus:outline-none focus:border-blue-500"
                >
                  <option value="">(None / General)</option>
                  {availableSubcategories.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-3 shrink-0">
              <label className="block text-xs font-bold text-[#c8d4e5] mb-1">
                <span className="inline-flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Payment Account / Mode</span>
              </label>
              <select
                value={account}
                onChange={e => setAccount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0d1728] border border-[#26344b] text-xs font-semibold text-[#e8eef8] focus:outline-none focus:border-blue-500"
              >
                {ACCOUNT_OPTIONS.map(acc => <option key={acc} value={acc}>{acc}</option>)}
              </select>
            </div>

            <div className="mt-3 shrink-0">
              <label className="block text-xs font-bold text-[#c8d4e5] mb-1">
                <span className="inline-flex items-center gap-1.5"><PlusCircle className="w-3.5 h-3.5" /> Short Note / Payee</span>
              </label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Organic Store Grocery, Rent NEFT"
                className="w-full px-3 py-2 rounded-xl bg-[#0d1728] border border-[#26344b] text-xs text-[#e8eef8] placeholder-[#5d708a] focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="mt-3 shrink-0">
              <label className="block text-xs font-bold text-[#c8d4e5] mb-1">
                <span className="inline-flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Description (Optional)</span>
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Additional details or invoice reference..."
                className="w-full px-3 py-2 rounded-xl bg-[#0d1728] border border-[#26344b] text-xs text-[#e8eef8] placeholder-[#5d708a] focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {/* Save actions always remain visible on desktop. */}
            <div className="mt-auto pt-3 border-t border-[#26344b] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleSave(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#152238] border border-[#2d3e58] text-xs font-bold text-[#c8d4e5] hover:text-white hover:bg-[#1c2e4a] transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Save
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                Save & Close
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
