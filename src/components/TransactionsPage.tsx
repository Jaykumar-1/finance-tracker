import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Transaction, TransactionType } from '../types/finance';
import { formatMoney, formatMonthYear, getMonthKey } from '../utils/formatters';
import { ExcelService } from '../services/excel';
import {
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  RefreshCw,
  ArrowDownRight,
  Smartphone,
  CheckSquare,
  Square,
  AlertTriangle,
  X
} from 'lucide-react';

export const TransactionsPage: React.FC = () => {
  const {
    transactions,
    currency,
    openTxModal,
    openAuthModal,
    deleteTransaction,
    deleteTransactions,
    clearMonthTransactions,
    importTransactions,
    openMultiDeviceModal,
    openExcelModal,
    triggerManualSync,
    syncState,
    user,
    showToast,
    isUnlocked
  } = useFinance();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Selected transactions for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteDialog, setConfirmDeleteDialog] = useState<{
    isOpen: boolean;
    type: 'single' | 'selected' | 'month';
    targetId?: string;
    monthKey?: string;
    title: string;
    description: string;
    count: number;
  }>({
    isOpen: false,
    type: 'single',
    title: '',
    description: '',
    count: 0
  });

  // Extract unique months
  const availableMonths = useMemo(() => {
    const months = Array.from(new Set(transactions.map(t => getMonthKey(t.date))));
    return months.sort().reverse();
  }, [transactions]);

  // Extract unique categories
  const availableCategories = useMemo(() => {
    const cats = Array.from(new Set(transactions.map(t => t.category)));
    return cats.sort();
  }, [transactions]);

  // Extract unique accounts
  const availableAccounts = useMemo(() => {
    const accs = Array.from(new Set(transactions.map(t => t.account).filter(Boolean)));
    return accs.sort();
  }, [transactions]);

  // Filter and sort transactions
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    return transactions
      .filter(tx => {
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
        if (monthFilter !== 'all' && getMonthKey(tx.date) !== monthFilter) return false;
        if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
        if (accountFilter !== 'all' && tx.account !== accountFilter) return false;

        if (q) {
          const matchTarget = `${tx.category} ${tx.subcategory || ''} ${tx.note || ''} ${tx.description || ''} ${tx.account} ${tx.date}`.toLowerCase();
          if (!matchTarget.includes(q)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt);
        if (sortBy === 'date-asc') return a.date.localeCompare(b.date) || a.updatedAt.localeCompare(b.updatedAt);
        if (sortBy === 'amount-desc') return b.amount - a.amount;
        if (sortBy === 'amount-asc') return a.amount - b.amount;
        return 0;
      });
  }, [transactions, typeFilter, monthFilter, categoryFilter, accountFilter, search, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const allPaginatedSelected = useMemo(() => {
    if (paginated.length === 0) return false;
    return paginated.every(tx => selectedIds.has(tx.id));
  }, [paginated, selectedIds]);

  const handleToggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allPaginatedSelected) {
      paginated.forEach(tx => next.delete(tx.id));
    } else {
      paginated.forEach(tx => next.add(tx.id));
    }
    setSelectedIds(next);
  };

  const handleToggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAllFiltered = () => {
    const next = new Set<string>();
    filtered.forEach(tx => next.add(tx.id));
    setSelectedIds(next);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handlePromptDeleteSingle = (tx: Transaction) => {
    setConfirmDeleteDialog({
      isOpen: true,
      type: 'single',
      targetId: tx.id,
      title: 'Delete Transaction',
      description: `Are you sure you want to delete ${tx.category} (${formatMoney(tx.amount, currency)}) on ${tx.date}?`,
      count: 1
    });
  };

  const handlePromptDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setConfirmDeleteDialog({
      isOpen: true,
      type: 'selected',
      title: `Delete ${selectedIds.size} Selected Transactions`,
      description: `This will permanently remove ${selectedIds.size} selected transaction record${selectedIds.size === 1 ? '' : 's'} from your ledger.`,
      count: selectedIds.size
    });
  };

  const handlePromptClearMonth = () => {
    if (monthFilter === 'all') return;
    const monthCount = transactions.filter(t => getMonthKey(t.date) === monthFilter).length;
    setConfirmDeleteDialog({
      isOpen: true,
      type: 'month',
      monthKey: monthFilter,
      title: `Clear All Records for ${formatMonthYear(monthFilter)}`,
      description: `This will remove all ${monthCount} transactions recorded in ${formatMonthYear(monthFilter)}. Ideal for clearing out previous import mismatches.`,
      count: monthCount
    });
  };

  const handleExecuteConfirmedDelete = async () => {
    const { type, targetId, monthKey } = confirmDeleteDialog;
    setConfirmDeleteDialog(prev => ({ ...prev, isOpen: false }));

    if (type === 'single' && targetId) {
      await deleteTransaction(targetId);
      const next = new Set(selectedIds);
      next.delete(targetId);
      setSelectedIds(next);
    } else if (type === 'selected') {
      const idsToDelete = Array.from(selectedIds);
      await deleteTransactions(idsToDelete);
      setSelectedIds(new Set());
    } else if (type === 'month' && monthKey) {
      await clearMonthTransactions(monthKey);
      setSelectedIds(new Set());
    }
  };

  const handleExportExcel = () => {
    if (transactions.length === 0) {
      showToast('No transactions to export.', 'info');
      return;
    }
    ExcelService.exportToExcel(filtered.length > 0 ? filtered : transactions, `Finance_Transactions_${monthFilter}.xlsx`);
    showToast('Exported transactions to Excel!', 'success');
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#101a2b] p-4 md:p-5 rounded-2xl border border-[#26344b] shadow-md">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-[#e8eef8]">
            All Transactions ({filtered.length})
          </h2>
          <p className="text-xs text-[#8ea0ba] mt-0.5">
            Search, filter, bulk-manage, or export your complete transaction ledger.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={openMultiDeviceModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 text-xs font-semibold transition-colors cursor-pointer"
            title="Open shareable link or sync with another device"
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
            <span>📱 Device Link & Sync</span>
          </button>

          {/* Excel Import */}
          <button
            onClick={openExcelModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#152238] border border-[#26344b] hover:bg-[#1c2e4a] text-emerald-400 text-xs font-semibold cursor-pointer transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Excel</span>
          </button>

          {/* Excel Export */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#152238] border border-[#26344b] hover:bg-[#1c2e4a] text-[#dbe6f6] text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export Excel</span>
          </button>

          {/* Add Button */}
          <button
            onClick={() => openTxModal('expense')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs md:text-sm font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#101a2b] p-4 rounded-2xl border border-[#26344b] shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
          {/* Search bar */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-[#6c7f99] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search category, note, account..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0d1728] border border-[#26344b] text-xs text-[#e8eef8] placeholder-[#6c7f99] focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={e => {
              setTypeFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-[#0d1728] border border-[#26344b] text-xs font-semibold text-[#c8d4e5] focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="income">Income Only (+)</option>
            <option value="expense">Expenses Only (−)</option>
            <option value="investment">Investments Only (↗)</option>
          </select>

          {/* Month Filter */}
          <select
            value={monthFilter}
            onChange={e => {
              setMonthFilter(e.target.value);
              setCurrentPage(1);
              setSelectedIds(new Set());
            }}
            className="w-full px-3 py-2 rounded-xl bg-[#0d1728] border border-[#26344b] text-xs font-semibold text-[#c8d4e5] focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Months</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>
                {formatMonthYear(m)} ({transactions.filter(t => getMonthKey(t.date) === m).length})
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={e => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-[#0d1728] border border-[#26344b] text-xs font-semibold text-[#c8d4e5] focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            {availableCategories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Secondary row for sort & account */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1c2940]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#71839d]">Sort by:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-[#0d1728] border border-[#26344b] text-xs font-medium text-[#c8d4e5] rounded-lg px-2.5 py-1 focus:outline-none"
            >
              <option value="date-desc">Date: Newest first</option>
              <option value="date-asc">Date: Oldest first</option>
              <option value="amount-desc">Amount: Highest first</option>
              <option value="amount-asc">Amount: Lowest first</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#71839d]">Account:</span>
            <select
              value={accountFilter}
              onChange={e => {
                setAccountFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#0d1728] border border-[#26344b] text-xs font-medium text-[#c8d4e5] rounded-lg px-2.5 py-1 focus:outline-none"
            >
              <option value="all">All Accounts</option>
              {availableAccounts.map(acc => (
                <option key={acc} value={acc}>
                  {acc}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Month-specific cleanup quick banner (helps remove bad October imports) */}
      {monthFilter !== 'all' && (
        <div className="p-3.5 rounded-xl bg-[#121c2e] border border-blue-500/25 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span className="text-[#c7d6eb]">
              Showing records for <strong className="text-white">{formatMonthYear(monthFilter)}</strong> ({filtered.length} entries)
            </span>
          </div>
          {filtered.length > 0 && (
            <button
              onClick={handlePromptClearMonth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All {formatMonthYear(monthFilter)} Records</span>
            </button>
          )}
        </div>
      )}

      {/* Bulk Selection Actions Floating/Header Bar */}
      {selectedIds.size > 0 && (
        <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/40 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-blue-200">
            <CheckSquare className="w-4 h-4 text-blue-400" />
            <span className="font-semibold">{selectedIds.size} transactions selected</span>
            {filtered.length > selectedIds.size && (
              <button
                onClick={handleSelectAllFiltered}
                className="underline text-blue-300 hover:text-white ml-2 cursor-pointer"
              >
                Select all {filtered.length} filtered
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearSelection}
              className="px-3 py-1.5 rounded-lg bg-[#142338] hover:bg-[#1a2f4c] text-[#8ea0ba] hover:text-white transition-colors cursor-pointer"
            >
              Deselect
            </button>
            <button
              onClick={handlePromptDeleteSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-[#101a2b] rounded-2xl border border-[#26344b] shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#26344b] bg-[#0d1728] text-[11px] font-bold text-[#71839d] uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-10">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="p-1 hover:text-white text-[#71839d] cursor-pointer"
                    title={allPaginatedSelected ? 'Deselect all' : 'Select all on page'}
                  >
                    {allPaginatedSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Subcategory</th>
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4">Note / Description</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b283d] text-xs">
              {paginated.length > 0 ? (
                paginated.map(tx => {
                  const isIncome = tx.type === 'income';
                  const isInvest = tx.type === 'investment';
                  const isSelected = selectedIds.has(tx.id);

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-[#14233a]/60 transition-colors group ${
                        isSelected ? 'bg-blue-950/25' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectOne(tx.id)}
                          className="p-1 hover:text-white cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4 text-[#556985]" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#c8d4e5] whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                            isIncome
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isInvest
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#e8eef8] whitespace-nowrap">
                        {tx.category}
                      </td>
                      <td className="py-3 px-4 text-[#8ea0ba] whitespace-nowrap">
                        {tx.subcategory || '—'}
                      </td>
                      <td className="py-3 px-4 text-[#8ea0ba] whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-[#17253b] border border-[#26344b] text-[11px]">
                          {tx.account || 'Other'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#8ea0ba] max-w-xs truncate">
                        {tx.note || tx.description || '—'}
                      </td>
                      <td
                        className={`py-3 px-4 font-bold text-right text-sm whitespace-nowrap ${
                          isIncome
                            ? 'text-emerald-400'
                            : isInvest
                            ? 'text-blue-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {isUnlocked ? (
                          <>
                            {isIncome ? '+' : isInvest ? '↗' : '−'}
                            {formatMoney(tx.amount, currency)}
                          </>
                        ) : (
                          '••••••'
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openTxModal(tx.type, tx.date, tx)}
                            className="p-1.5 rounded-lg text-[#8ea0ba] hover:text-blue-400 hover:bg-[#182842] transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handlePromptDeleteSingle(tx)}
                            className="p-1.5 rounded-lg text-[#8ea0ba] hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-[#71839d]">
                    No transactions match your search and filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-[#1e2c43] flex items-center justify-between text-xs text-[#8ea0ba]">
            <div>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} entries
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-[#0d1728] border border-[#26344b] hover:bg-[#16243a] disabled:opacity-40 disabled:cursor-not-allowed text-[#c8d4e5] cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-semibold text-white">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg bg-[#0d1728] border border-[#26344b] hover:bg-[#16243a] disabled:opacity-40 disabled:cursor-not-allowed text-[#c8d4e5] cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal (In-app, iframe-safe) */}
      {confirmDeleteDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-[#101a2b] border border-[#2b3a52] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {confirmDeleteDialog.title}
                </h3>
                <p className="text-xs text-[#8ea0ba] mt-0.5">
                  Confirm permanent deletion
                </p>
              </div>
            </div>

            <p className="text-xs text-[#c7d6eb] leading-relaxed">
              {confirmDeleteDialog.description}
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-[#16243a] hover:bg-[#1d304c] text-xs font-semibold text-[#8ea0ba] hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirmedDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-md shadow-rose-600/30 transition-colors cursor-pointer"
              >
                Delete {confirmDeleteDialog.count > 1 ? `(${confirmDeleteDialog.count})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
