import React, { useRef, useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { authService } from '../services/auth';
import { storageService } from '../services/storage';
import { ExcelService } from '../services/excel';
import { SUPPORTED_CURRENCIES } from '../utils/constants';
import {
  User,
  ShieldCheck,
  Smartphone,
  Download,
  Upload,
  Layers,
  Trash2,
  RefreshCw,
  LogOut,
  Sparkles,
  Key,
  FolderSync,
  FileSpreadsheet,
  HardDrive,
  ExternalLink,
  CheckCircle2,
  Link as LinkIcon,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  RotateCcw,
  Check,
  AlertCircle,
  Copy,
  Share2
} from 'lucide-react';

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
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Multi-device ledger state
  const [copiedLink, setCopiedLink] = useState(false);
  const [targetLedgerInput, setTargetLedgerInput] = useState('');
  const [isSwitchingLedger, setIsSwitchingLedger] = useState(false);

  // Password / Security Management state in Settings
  const [securityTab, setSecurityTab] = useState<'change' | 'reset'>('change');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetIdentifier, setResetIdentifier] = useState(() => user?.username || user?.email || '');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const storedUsers = authService.getStoredUsers();

  const handleLogout = () => {
    if (window.confirm('Do you want to log out from this device? (Your local records will remain safely saved)')) {
      authService.logout();
      setUser(null);
      showToast('Logged out successfully.', 'info');
    }
  };

  // Change Password for Logged-In User
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('New password must be at least 6 characters long.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match. Please re-type accurately.', 'warning');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const targetId = user?.id || user?.username || '';
      if (!targetId) {
        showToast('Please sign in or create an account first.', 'warning');
        setIsUpdatingPassword(false);
        return;
      }
      const res = await authService.changePassword(targetId, currentPassword, newPassword);
      if (!res.success) {
        showToast(res.error || 'Failed to update password. Verify current password.', 'error');
        setIsUpdatingPassword(false);
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

  // Reset Password for any user/email via Firebase Auth
  const handleResetPasswordDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    const ident = resetIdentifier.trim() || user?.username || user?.email;
    if (!ident) {
      showToast('Please enter your account username or email.', 'warning');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await authService.resetPassword(ident);
      if (!res.success) {
        showToast(res.error || 'Unable to send password reset request.', 'error');
        setIsUpdatingPassword(false);
        return;
      }

      showToast(`Password reset link sent to ${res.email || 'your recovery email'}! Check your inbox.`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Error sending reset email.', 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Full JSON export
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
    showToast('Full JSON backup downloaded successfully!', 'success');
  };

  // Full JSON import
  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (backup && Array.isArray(backup.transactions)) {
        const uid = user ? user.id : 'anonymous_guest';
        if (backup.categories) {
          storageService.saveCategories(uid, backup.categories);
        }
        if (backup.savingsGoals) {
          storageService.saveSavingsGoals(uid, backup.savingsGoals);
        }
        importTransactions(backup.transactions, true);
        showToast('JSON backup restored successfully!', 'success');
      } else {
        showToast('Invalid backup file format.', 'error');
      }
    } catch {
      showToast('Failed to parse JSON backup file.', 'error');
    }
    e.target.value = '';
  };

  // Excel Export
  const handleExportExcel = () => {
    if (transactions.length === 0) {
      showToast('No transactions to export.', 'info');
      return;
    }
    ExcelService.exportToExcel(transactions, `Personal_Finance_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Excel workbook exported!', 'success');
  };

  // Excel Import
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const result = ExcelService.parseExcelFile(buffer);
      if (result.error) {
        showToast(result.error, 'error');
        return;
      }
      if (result.transactions.length > 0) {
        importTransactions(result.transactions, false);
      }
    } catch {
      showToast('Failed to import Excel file.', 'error');
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* User Account Card */}
      <div className="p-5 md:p-6 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              className="w-14 h-14 rounded-2xl object-cover border border-[#26344b]"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 text-slate-950 flex items-center justify-center font-extrabold text-xl shadow-md">
              {user ? user.displayName.charAt(0).toUpperCase() : <User className="w-7 h-7 text-white" />}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#e8eef8]">
                {user ? user.displayName : 'Guest / Not Signed In'}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/15 text-blue-300 border border-blue-500/30 uppercase tracking-wider">
                {user ? (user.email ? user.email : user.username) : 'Cloud JSON Active'}
              </span>
            </div>
            <p className="text-xs text-[#8ea0ba] mt-0.5">
              {user ? (
                <>
                  {user.username ? `@${user.username}` : ''} {user.email ? `• ${user.email}` : ''}
                </>
              ) : (
                'Data is automatically saved in JSON format in the cloud and synced across devices.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs font-semibold hover:bg-rose-900/50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          ) : (
            <button
              onClick={() => openAuthModal('signin')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Sign In / Create Account</span>
            </button>
          )}
        </div>
      </div>

      {/* Cross-Device Cloud Sync & JSON Storage Card */}
      <div className="p-5 md:p-6 rounded-2xl bg-[#101a2b] border border-blue-500/30 shadow-md space-y-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#e8eef8] flex items-center gap-2">
                <span>Multi-Device Link & Cloud JSON Sync</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Real-Time Active
                </span>
              </h3>
              <p className="text-xs text-[#8ea0ba]">
                Access your finances on your phone or any other device simply by opening your link. All transactions are saved in JSON format.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openMultiDeviceModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Open Multi-Device Hub</span>
            </button>
          </div>
        </div>

        {/* Shareable Link Box */}
        <div className="p-4 rounded-xl bg-[#090f1a] border border-[#1f2c42] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Your Shareable Device Link:</span>
            </span>
            <span className="text-[11px] text-[#71839d] font-mono">
              Ledger ID: <strong className="text-blue-300">{ledgerId}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareableLink}
              className="flex-1 px-3.5 py-2 rounded-xl bg-[#0e1726] border border-[#26344b] text-xs font-mono text-[#93c5fd] select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={async () => {
                const res = await copyLedgerLink();
                if (res) {
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2500);
                }
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer shrink-0"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-[#8ea0ba] pt-1">
            <div className="p-2.5 rounded-lg bg-[#101a2b] border border-[#26344b]/60">
              <strong className="text-white block">📱 Open on Mobile</strong>
              <span>Send this link to your phone (WhatsApp/Email/Notes) to view and add transactions on the go.</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#101a2b] border border-[#26344b]/60">
              <strong className="text-white block">⚡ Real-Time Sync</strong>
              <span>Any transaction added on your phone reflects here within seconds via Firestore.</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#101a2b] border border-[#26344b]/60">
              <strong className="text-white block">💾 JSON Storage</strong>
              <span>Data is stored cleanly in structured JSON format with complete export/import freedom.</span>
            </div>
          </div>
        </div>

        {/* Connect to Existing Ledger form */}
        <div className="p-3.5 rounded-xl bg-[#0d1728] border border-[#26344b] flex flex-col sm:flex-row items-center gap-2">
          <div className="text-xs text-[#8ea0ba] shrink-0">
            <span className="font-semibold text-white block">Have a ledger from another device?</span>
            <span className="text-[11px]">Paste its link or Ledger ID to connect:</span>
          </div>
          <input
            type="text"
            value={targetLedgerInput}
            onChange={e => setTargetLedgerInput(e.target.value)}
            placeholder="Paste Ledger Link or ID (e.g. ledger_...)"
            className="flex-1 px-3 py-1.5 rounded-lg bg-[#090f1a] border border-[#26344b] text-xs text-white placeholder-[#5d708a] focus:outline-none focus:border-blue-500"
          />
          <button
            type="button"
            disabled={isSwitchingLedger || !targetLedgerInput.trim()}
            onClick={async () => {
              if (!targetLedgerInput.trim()) return;
              setIsSwitchingLedger(true);
              const ok = await switchLedger(targetLedgerInput.trim());
              setIsSwitchingLedger(false);
              if (ok) setTargetLedgerInput('');
            }}
            className="px-3.5 py-1.5 rounded-lg bg-[#1a2940] hover:bg-[#233754] border border-[#2b3e5a] text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shrink-0"
          >
            {isSwitchingLedger ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>

      {/* Preferences & Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Currency & Region */}
        <div className="p-5 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-md space-y-3">
          <h3 className="text-sm font-bold text-[#e8eef8] uppercase tracking-wider text-[#8ea0ba]">
            Currency & Display
          </h3>
          <p className="text-xs text-[#8ea0ba]">
            Select your preferred currency symbol for all dashboards and reports.
          </p>
          <div>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0d1728] border border-[#26344b] text-sm font-bold text-[#e8eef8] focus:outline-none focus:border-blue-500"
            >
              {SUPPORTED_CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Categories Manager */}
        <div className="p-5 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-md space-y-3 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#e8eef8] uppercase tracking-wider text-[#8ea0ba]">
              Category & Subcategory Hierarchy
            </h3>
            <p className="text-xs text-[#8ea0ba] mt-1">
              Customize Income, Expense, and Investment categories and sub-tags.
            </p>
          </div>
          <button
            onClick={openCategoryModal}
            className="w-full py-2.5 px-3 rounded-xl bg-[#152238] border border-blue-500/40 hover:bg-[#1c2e4a] text-blue-300 text-xs font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Layers className="w-4 h-4" />
            <span>Manage All Categories</span>
          </button>
        </div>
      </div>

      {/* Security & Password Management Card */}
      <div className="p-5 md:p-6 rounded-2xl bg-[#101a2b] border border-blue-500/30 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#26344b] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#e8eef8] flex items-center gap-2">
                <span>Security & Password Management</span>
              </h3>
              <p className="text-xs text-[#8ea0ba]">
                Change your active password or perform a direct password reset
              </p>
            </div>
          </div>

          {/* Sub tabs: Change vs Reset */}
          <div className="flex p-1 bg-[#090f1a] rounded-xl border border-[#26344b] text-xs font-semibold self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSecurityTab('change')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                securityTab === 'change'
                  ? 'bg-[#1a2b44] text-blue-300 font-bold shadow-xs'
                  : 'text-[#8ea0ba] hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Change Password</span>
            </button>
            <button
              type="button"
              onClick={() => setSecurityTab('reset')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                securityTab === 'reset'
                  ? 'bg-[#1a2b44] text-amber-300 font-bold shadow-xs'
                  : 'text-[#8ea0ba] hover:text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Password</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Change Password for Current Account */}
        {securityTab === 'change' && (
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
            <div className="text-xs text-[#8ea0ba]">
              {user?.username ? (
                <>Update the login password for account: <strong className="text-emerald-400 font-mono">@{user.username}</strong></>
              ) : (
                'Update login password for your active account'
              )}
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#c8d4e5]">
                    Current Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(prev => !prev)}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    {showCurrentPw ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showCurrentPw ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#5d708a] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password (if set)"
                    className="w-full pl-9 pr-10 py-2 rounded-xl bg-[#090f1a] border border-[#26344b] text-xs text-white placeholder-[#5d708a] focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71839d] hover:text-blue-400 p-0.5"
                  >
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#c8d4e5]">
                      New Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNewPw(prev => !prev)}
                      className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      {showNewPw ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showNewPw ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#5d708a] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-9 pr-10 py-2 rounded-xl bg-[#090f1a] border border-[#26344b] text-xs text-white placeholder-[#5d708a] focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71839d] hover:text-blue-400 p-0.5"
                    >
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#c8d4e5]">
                      Confirm New Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(prev => !prev)}
                      className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      {showConfirmPw ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showConfirmPw ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#5d708a] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showConfirmPw ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full pl-9 pr-10 py-2 rounded-xl bg-[#090f1a] border border-[#26344b] text-xs text-white placeholder-[#5d708a] focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71839d] hover:text-blue-400 p-0.5"
                    >
                      {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isUpdatingPassword ? 'Updating...' : 'Save New Password'}</span>
            </button>
          </form>
        )}

        {/* Tab 2: Reset Forgotten Password for Any User */}
        {securityTab === 'reset' && (
          <form onSubmit={handleResetPasswordDirect} className="space-y-4 max-w-xl">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
              <RotateCcw className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>
                Request an official Firebase password reset link sent to your registered recovery email address.
              </span>
            </div>

            {storedUsers.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-[#8ea0ba]">
                  Select account:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {storedUsers.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setResetIdentifier(u.username)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        resetIdentifier.toLowerCase() === u.username.toLowerCase()
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : 'bg-[#090f1a] border-[#26344b] text-[#8ea0ba] hover:text-white'
                      }`}
                    >
                      <User className="w-3 h-3" />
                      <span>{u.username}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#c8d4e5] mb-1">
                Account Username or Recovery Email *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#5d708a] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={resetIdentifier}
                  onChange={e => setResetIdentifier(e.target.value)}
                  placeholder="Enter registered username or email"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#090f1a] border border-[#26344b] text-xs text-white placeholder-[#5d708a] focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="text-[11px] text-[#71839d] mt-1.5">
                Accounts registered with an email address will receive an official reset link. If you only registered a username without an email, use the &quot;Change Password&quot; tab with your current password.
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isUpdatingPassword ? 'Sending...' : 'Send Password Reset Email'}</span>
            </button>
          </form>
        )}
      </div>

      {/* Cloud & Multi-Device Sync Health */}
      <div className="p-5 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderSync className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-[#e8eef8]">
              Multi-Device Cloud Sync
            </h3>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0d1728] border border-[#26344b] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-[#71839d] block text-[11px]">Sync Health</span>
            <span className="font-bold text-emerald-400 capitalize">{syncState.status}</span>
          </div>
          <div>
            <span className="text-[#71839d] block text-[11px]">Last Sync Check</span>
            <span className="font-semibold text-[#e8eef8]">{syncState.lastSyncTime || 'Just now'}</span>
          </div>
          <div>
            <span className="text-[#71839d] block text-[11px]">Available Transactions</span>
            <span className="font-semibold text-[#e8eef8]">{transactions.length} entries</span>
          </div>
        </div>

        <p className="text-xs text-[#8ea0ba]">
          Your transactions and budget categories are automatically pushed to the shared JSON ledger and fetched in real time across your devices. No manual Sync / Fetch buttons are required.
        </p>
      </div>

      {/* Data Backup & Excel Import/Export */}
      <div className="p-5 rounded-2xl bg-[#101a2b] border border-[#26344b] shadow-md space-y-4">
        <h3 className="text-base font-bold text-[#e8eef8] flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-blue-400" />
          <span>Local Excel & JSON Backups</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Excel Export */}
          <button
            onClick={handleExportExcel}
            className="p-3.5 rounded-xl bg-[#0d1728] border border-[#26344b] hover:border-blue-500/40 text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[#e8eef8]">Export to Excel (.xlsx)</span>
              <Download className="w-4 h-4 text-blue-400 group-hover:translate-y-0.5 transition-transform" />
            </div>
            <p className="text-[11px] text-[#8ea0ba]">
              Download full ledger table formatted for Excel and spreadsheet viewers.
            </p>
          </button>

          {/* Excel Import */}
          <label className="p-3.5 rounded-xl bg-[#0d1728] border border-[#26344b] hover:border-emerald-500/40 text-left transition-all cursor-pointer group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-emerald-300">Import from Excel (.xlsx)</span>
              <Upload className="w-4 h-4 text-emerald-400 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <p className="text-[11px] text-[#8ea0ba]">
              Bulk upload transactions from bank statements or existing spreadsheets.
            </p>
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportExcel}
              className="hidden"
            />
          </label>

          {/* Full JSON Export */}
          <button
            onClick={handleExportJSON}
            className="p-3.5 rounded-xl bg-[#0d1728] border border-[#26344b] hover:border-amber-500/40 text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-amber-300">Export Full JSON Backup</span>
              <Download className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-[11px] text-[#8ea0ba]">
              Complete backup including goals, custom categories, and transactions.
            </p>
          </button>

          {/* Full JSON Import */}
          <label className="p-3.5 rounded-xl bg-[#0d1728] border border-[#26344b] hover:border-purple-500/40 text-left transition-all cursor-pointer group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-purple-300">Restore Full JSON Backup</span>
              <Upload className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-[11px] text-[#8ea0ba]">
              Restore an entire snapshot file to this device.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Danger Zone & Reset Controls */}
      <div className="p-5 rounded-2xl bg-[#101a2b] border border-rose-800/40 shadow-md space-y-4">
        <div>
          <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>Reset & Clean Ledger Data</span>
          </h3>
          <p className="text-xs text-[#8ea0ba] mt-1">
            Wipe out stray sample records, reset local storage cache, or start fresh with an empty clean ledger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to erase all transactions? This will remove all local and demo entries.')) {
                clearAllTransactions();
              }
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Erase All Data & Wipe Sample Records</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('Load sample starter data for demonstration? (Will populate demo transactions and goals)')) {
                loadDemoData();
              }
            }}
            className="px-4 py-2 rounded-xl bg-[#152238] border border-[#2d3e58] hover:bg-[#1f314f] text-[#b8c9e0] text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Load Demo Dataset (Optional)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
