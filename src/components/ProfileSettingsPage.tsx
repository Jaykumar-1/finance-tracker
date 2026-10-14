import React, { useRef, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { authService } from '../services/auth';
import { storageService } from '../services/storage';
import { ExcelService } from '../services/excel';
import { SUPPORTED_CURRENCIES } from '../utils/constants';
import {
  User,
  ShieldCheck,
  Download,
  Upload,
  Layers,
  Trash2,
  LogOut,
  Key,
  FolderSync,
  FileSpreadsheet,
  Lock,
  Eye,
  EyeOff,
  RotateCcw,
  Copy,
  Share2,
  Check,
  Settings2,
  Database,
  Link as LinkIcon
} from 'lucide-react';

type SettingsTab = 'account' | 'security' | 'data' | 'categories' | 'sync';

export const ProfileSettingsPage: React.FC = () => {
  const {
    user,
    setUser,
    currency,
    setCurrency,
    categories,
    transactions,
    savingsGoals,
    importTransactions,
    clearAllTransactions,
    loadDemoData,
    openAuthModal,
    openCategoryModal,
    ledgerId,
    shareableLink,
    copyLedgerLink,
    switchLedger,
    openMultiDeviceModal,
    openExcelModal,
    syncState,
    showToast
  } = useFinance();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [copiedLink, setCopiedLink] = useState(false);
  const [targetLedgerInput, setTargetLedgerInput] = useState('');
  const [isSwitchingLedger, setIsSwitchingLedger] = useState(false);

  const [securityTab, setSecurityTab] = useState<'change' | 'reset'>('change');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetIdentifier, setResetIdentifier] = useState(() => user?.username || user?.email || '');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleLogout = () => {
    if (window.confirm('Log out from this device? Local records stay saved.')) {
      authService.logout();
      setUser(null);
      showToast('Logged out successfully.', 'info');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('New password must be at least 6 characters.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New password and confirmation do not match.', 'warning');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const targetId = user?.id || user?.username || '';
      if (!targetId) {
        showToast('Please sign in first.', 'warning');
        return;
      }
      const res = await authService.changePassword(targetId, currentPassword, newPassword);
      if (!res.success) {
        showToast(res.error || 'Failed to update password.', 'error');
        return;
      }
      showToast('Password changed successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err?.message || 'Error changing password.', 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleResetPasswordDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    const ident = resetIdentifier.trim() || user?.username || user?.email;
    if (!ident) {
      showToast('Enter your username or recovery email.', 'warning');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const res = await authService.resetPassword(ident);
      if (!res.success) {
        showToast(res.error || 'Unable to send reset link.', 'error');
        return;
      }
      showToast(`Reset link sent to ${res.email || 'your recovery email'}.`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Error sending reset email.', 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleExportJSON = () => {
    const backup = storageService.createBackup(user, categories, transactions, savingsGoals);
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Finance_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Full JSON backup downloaded!', 'success');
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      if (backup && Array.isArray(backup.transactions)) {
        const uid = user?.id || 'local';
        if (backup.categories) storageService.saveCategories(uid, backup.categories);
        if (backup.savingsGoals) storageService.saveLocalSavingsGoals(uid, backup.savingsGoals);
        if (backup.currency) setCurrency(backup.currency);
        await importTransactions(backup.transactions, 'replace');
        showToast('JSON backup restored successfully!', 'success');
      } else {
        showToast('Invalid backup file format.', 'error');
      }
    } catch {
      showToast('Failed to parse JSON backup.', 'error');
    }
    e.target.value = '';
  };

  const handleExportExcel = () => {
    if (transactions.length === 0) {
      showToast('No transactions to export.', 'info');
      return;
    }
    ExcelService.exportToExcel(transactions, `Personal_Finance_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Excel workbook exported!', 'success');
  };


  const handleCopyLink = async () => {
    try {
      await copyLedgerLink();
      setCopiedLink(true);
      showToast('Shareable link copied!', 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      showToast('Could not copy link.', 'error');
    }
  };

  const handleSwitchLedger = async () => {
    const id = targetLedgerInput.trim();
    if (!id) return;
    setIsSwitchingLedger(true);
    try {
      await switchLedger(id);
      showToast(`Switched to ledger: ${id}`, 'success');
      setTargetLedgerInput('');
    } catch (err: any) {
      showToast(err?.message || 'Failed to switch ledger.', 'error');
    } finally {
      setIsSwitchingLedger(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'data', label: 'Data & Backup', icon: Database },
    { id: 'categories', label: 'Categories', icon: Layers },
    { id: 'sync', label: 'Sync & Share', icon: FolderSync },
  ];

  const inputCls =
    'w-full px-3 py-2 rounded-xl bg-[#090f1a] border border-[#26344b] text-xs text-white placeholder-[#5d708a] focus:outline-none focus:border-blue-500';

  return (
    <div className="space-y-5 animate-fade-in-up max-w-4xl">
      {/* Header */}
      <div className="glass-card p-4 md:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-400 to-blue-500 flex items-center justify-center text-slate-900 font-black text-lg">
            {user?.displayName?.charAt(0)?.toUpperCase() || <Settings2 className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#e8eef8]">Profile & Settings</h2>
            <p className="text-xs text-[#8ea0ba]">
              {user ? `${user.displayName} · ${user.email || user.username}` : 'Guest mode — sign in for cloud sync'}
            </p>
          </div>
        </div>
        {user ? (
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Log out
          </button>
        ) : (
          <button
            onClick={() => openAuthModal('signin')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
          >
            <User className="w-3.5 h-3.5" />
            Sign In
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto p-1 rounded-xl bg-[#0d1627] border border-[#26344b]">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                active
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-[#8ea0ba] hover:text-white hover:bg-[#152238] border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Account ── */}
      {activeTab === 'account' && (
        <div className="glass-card p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-[#e8eef8] flex items-center gap-2">
            <User className="w-4 h-4 text-blue-400" />
            Account Preferences
          </h3>

          <div>
            <label className="block text-xs font-semibold text-[#c8d4e5] mb-1.5">Display Currency</label>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className={inputCls}
            >
              {SUPPORTED_CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.symbol} — {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#0d1728] border border-[#26344b]">
              <span className="text-[#71839d] block text-[11px]">Transactions</span>
              <span className="font-bold text-[#e8eef8] text-lg">{transactions.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#0d1728] border border-[#26344b]">
              <span className="text-[#71839d] block text-[11px]">Categories</span>
              <span className="font-bold text-[#e8eef8] text-lg">
                {Object.keys(categories.expense || {}).length +
                  Object.keys(categories.income || {}).length +
                  Object.keys(categories.investment || {}).length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#0d1728] border border-[#26344b]">
              <span className="text-[#71839d] block text-[11px]">Savings Goals</span>
              <span className="font-bold text-[#e8eef8] text-lg">{savingsGoals.length}</span>
            </div>
          </div>

          <button
            onClick={() => {
              if (window.confirm('Load demo sample data? This merges sample transactions into your ledger.')) {
                loadDemoData();
              }
            }}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300"
          >
            Load demo sample data
          </button>
        </div>
      )}

      {/* ── Security ── */}
      {activeTab === 'security' && (
        <div className="glass-card p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-[#e8eef8] flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-300" />
            Password & Security
          </h3>

          <div className="flex gap-1 p-1 rounded-xl bg-[#090f1a] border border-[#26344b] w-fit">
            <button
              onClick={() => setSecurityTab('change')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                securityTab === 'change' ? 'bg-blue-600 text-white' : 'text-[#8ea0ba]'
              }`}
            >
              Change Password
            </button>
            <button
              onClick={() => setSecurityTab('reset')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                securityTab === 'reset' ? 'bg-amber-600 text-white' : 'text-[#8ea0ba]'
              }`}
            >
              Reset via Email
            </button>
          </div>

          {securityTab === 'change' ? (
            <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
              <div>
                <label className="block text-xs font-semibold text-[#c8d4e5] mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className={inputCls + ' pr-10'}
                    placeholder="Current password"
                  />
                  <button type="button" onClick={() => setShowCurrentPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71839d]">
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#c8d4e5] mb-1">New Password *</label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className={inputCls + ' pr-10'}
                    placeholder="At least 6 characters"
                  />
                  <button type="button" onClick={() => setShowNewPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71839d]">
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#c8d4e5] mb-1">Confirm New Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    className={inputCls + ' pr-10'}
                    placeholder="Repeat new password"
                  />
                  <button type="button" onClick={() => setShowConfirmPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71839d]">
                    {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                {isUpdatingPassword ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPasswordDirect} className="space-y-3 max-w-md">
              <div>
                <label className="block text-xs font-semibold text-[#c8d4e5] mb-1">Username or Recovery Email *</label>
                <input
                  type="text"
                  required
                  value={resetIdentifier}
                  onChange={e => setResetIdentifier(e.target.value)}
                  className={inputCls}
                  placeholder="Registered username or email"
                />
                <p className="text-[11px] text-[#71839d] mt-1.5">
                  Firebase will email a reset link to the recovery address on file.
                </p>
              </div>
              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {isUpdatingPassword ? 'Sending…' : 'Send Reset Email'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ── Data & Backup ── */}
      {activeTab === 'data' && (
        <div className="glass-card p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-[#e8eef8] flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            Import / Export
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-3 p-4 rounded-xl bg-[#0d1728] border border-[#26344b] hover:border-emerald-500/40 transition-colors text-left"
            >
              <Download className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-[#e8eef8]">Export JSON Backup</div>
                <div className="text-[11px] text-[#71839d]">Full ledger: transactions, categories, goals</div>
              </div>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-3 p-4 rounded-xl bg-[#0d1728] border border-[#26344b] hover:border-blue-500/40 transition-colors text-left"
            >
              <Upload className="w-5 h-5 text-blue-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-[#e8eef8]">Restore JSON Backup</div>
                <div className="text-[11px] text-[#71839d]">Replace current data from a backup file</div>
              </div>
            </button>
            <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImportJSON} />

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-3 p-4 rounded-xl bg-[#0d1728] border border-[#26344b] hover:border-amber-500/40 transition-colors text-left"
            >
              <FileSpreadsheet className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-[#e8eef8]">Export Excel</div>
                <div className="text-[11px] text-[#71839d]">Download transactions as .xlsx</div>
              </div>
            </button>

            <button
              onClick={() => openExcelModal()}
              className="flex items-center gap-3 p-4 rounded-xl bg-[#0d1728] border border-[#26344b] hover:border-violet-500/40 transition-colors text-left"
            >
              <Upload className="w-5 h-5 text-violet-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-[#e8eef8]">Import Excel / CSV</div>
                <div className="text-[11px] text-[#71839d]">Bank statements or custom sheets</div>
              </div>
            </button>
          </div>

          <div className="pt-3 border-t border-[#26344b]">
            <button
              onClick={() => {
                if (window.confirm('Delete ALL transactions permanently? This cannot be undone.')) {
                  clearAllTransactions();
                }
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All Transactions
            </button>
          </div>
        </div>
      )}

      {/* ── Categories ── */}
      {activeTab === 'categories' && (
        <div className="glass-card p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-[#e8eef8] flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            Categories & Subcategories
          </h3>
          <p className="text-xs text-[#8ea0ba]">
            Add, rename, delete, and reorder categories and subcategories. Order is saved to local storage and cloud sync.
          </p>

          <div className="grid grid-cols-3 gap-3 text-xs">
            {(['expense', 'income', 'investment'] as const).map(type => (
              <div key={type} className="p-3 rounded-xl bg-[#0d1728] border border-[#26344b]">
                <span className="text-[#71839d] block text-[11px] capitalize">{type}</span>
                <span className="font-bold text-[#e8eef8] text-lg">
                  {Object.keys(categories[type] || {}).length}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => openCategoryModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
          >
            <Layers className="w-4 h-4" />
            Manage Categories
          </button>
        </div>
      )}

      {/* ── Sync & Share ── */}
      {activeTab === 'sync' && (
        <div className="glass-card p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-[#e8eef8] flex items-center gap-2">
            <FolderSync className="w-4 h-4 text-emerald-400" />
            Multi-Device Sync & Share
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#0d1728] border border-[#26344b]">
              <span className="text-[#71839d] block text-[11px]">Sync Status</span>
              <span className="font-bold text-emerald-400 capitalize">{syncState.status}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#0d1728] border border-[#26344b]">
              <span className="text-[#71839d] block text-[11px]">Last Sync</span>
              <span className="font-bold text-[#e8eef8]">{syncState.lastSyncTime || '—'}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#0d1728] border border-[#26344b]">
              <span className="text-[#71839d] block text-[11px]">Ledger ID</span>
              <span className="font-bold text-[#e8eef8] truncate block">{ledgerId || 'main'}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#c8d4e5] mb-1.5">Shareable Link</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={shareableLink || ''}
                className={inputCls + ' flex-1 font-mono text-[11px]'}
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-semibold flex items-center gap-1.5 shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-[11px] text-[#71839d] mt-1.5">
              Open this link on another device after signing in with the same account.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#c8d4e5] mb-1.5">Switch Ledger</label>
            <div className="flex gap-2">
              <input
                value={targetLedgerInput}
                onChange={e => setTargetLedgerInput(e.target.value)}
                placeholder="Enter ledger ID"
                className={inputCls + ' flex-1'}
              />
              <button
                onClick={handleSwitchLedger}
                disabled={isSwitchingLedger || !targetLedgerInput.trim()}
                className="px-3 py-2 rounded-xl bg-[#152238] hover:bg-[#1a2b44] border border-[#26344b] text-xs font-semibold text-[#c8d4e5] disabled:opacity-50"
              >
                {isSwitchingLedger ? '…' : 'Switch'}
              </button>
            </div>
          </div>

          <button
            onClick={() => openMultiDeviceModal()}
            className="flex items-center gap-2 text-xs font-semibold text-blue-400 hover:text-blue-300"
          >
            <Share2 className="w-3.5 h-3.5" />
            Open multi-device setup guide
          </button>
        </div>
      )}
    </div>
  );
};
