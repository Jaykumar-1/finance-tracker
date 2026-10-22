import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { storageService } from '../services/storage';
import {
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  X,
  Share2,
  Layers,
  ArrowRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export const MultiDeviceModal: React.FC = () => {
  const {
    isMultiDeviceModalOpen,
    closeMultiDeviceModal,
    shareableLink,
    ledgerId,
    copyLedgerLink,
    switchLedger,
    user,
    categories,
    transactions,
    savingsGoals,
    importTransactions,
    syncState,
    showToast
  } = useFinance();

  const [copied, setCopied] = useState(false);
  const [targetLedgerInput, setTargetLedgerInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'connect' | 'json'>('link');
  const [rawJsonCopied, setRawJsonCopied] = useState(false);
  const [pasteJsonInput, setPasteJsonInput] = useState('');

  if (!isMultiDeviceModalOpen) return null;

  const handleCopyLink = async () => {
    const success = await copyLedgerLink();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleConnectLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLedgerInput.trim()) return;

    setIsConnecting(true);
    const success = await switchLedger(targetLedgerInput.trim());
    setIsConnecting(false);
    if (success) {
      setTargetLedgerInput('');
      closeMultiDeviceModal();
    }
  };

  const handleExportJSON = () => {
    const backup = storageService.createBackup(user, categories, transactions, savingsGoals, ledgerId);
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Personal_Finance_${ledgerId}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON backup file downloaded!', 'success');
  };

  const handleCopyRawJSON = () => {
    const backup = storageService.createBackup(user, categories, transactions, savingsGoals, ledgerId);
    const jsonStr = JSON.stringify(backup, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      setRawJsonCopied(true);
      showToast('Raw JSON copied to clipboard!', 'success');
      setTimeout(() => setRawJsonCopied(false), 2500);
    }).catch(() => {
      showToast('Unable to copy JSON directly.', 'warning');
    });
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed && Array.isArray(parsed.transactions)) {
          importTransactions(parsed.transactions, true);
          showToast(`Imported ${parsed.transactions.length} transactions from JSON!`, 'success');
          closeMultiDeviceModal();
        } else {
          showToast('Invalid JSON ledger format.', 'error');
        }
      } catch {
        showToast('Failed to parse JSON file.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePasteJsonRestore = () => {
    if (!pasteJsonInput.trim()) return;
    try {
      const parsed = JSON.parse(pasteJsonInput.trim());
      if (parsed && Array.isArray(parsed.transactions)) {
        importTransactions(parsed.transactions, true);
        showToast(`Restored ${parsed.transactions.length} transactions from JSON!`, 'success');
        setPasteJsonInput('');
        closeMultiDeviceModal();
      } else if (Array.isArray(parsed)) {
        importTransactions(parsed, true);
        showToast(`Restored ${parsed.length} transactions from JSON!`, 'success');
        setPasteJsonInput('');
        closeMultiDeviceModal();
      } else {
        showToast('JSON does not contain a valid transactions list.', 'error');
      }
    } catch {
      showToast('Invalid JSON syntax. Please check the text format.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-[#0e1726] border border-[#26344b] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#26344b] flex items-center justify-between bg-[#121d30]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#e8eef8] flex items-center gap-2">
                <span>Multi-Device Cloud Sync</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  JSON Cloud Active
                </span>
              </h2>
              <p className="text-xs text-[#8ea0ba]">
                Access your finances on your phone, tablet, or another PC with your link
              </p>
            </div>
          </div>
          <button
            onClick={closeMultiDeviceModal}
            className="p-1.5 rounded-lg text-[#71839d] hover:text-[#dbe6f6] hover:bg-[#1c2c45] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-[#26344b] bg-[#0a111c] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
              activeTab === 'link'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-[#8ea0ba] hover:text-white'
            }`}
          >
            📱 Shareable Link
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('connect')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
              activeTab === 'connect'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-[#8ea0ba] hover:text-white'
            }`}
          >
            🔗 Connect Other Device
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
              activeTab === 'json'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-[#8ea0ba] hover:text-white'
            }`}
          >
            💾 JSON Data Center
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs">
          {activeTab === 'link' && (
            <div className="space-y-4">
              {/* Link Display Box */}
              <div className="p-3.5 rounded-xl bg-[#090f1a] border border-[#26344b] space-y-2">
                <div className="flex items-center justify-between text-[#8ea0ba]">
                  <span className="font-semibold text-white">Your Direct Access Link:</span>
                  <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Real-Time Synced
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareableLink}
                    className="flex-1 px-3 py-2 rounded-lg bg-[#121c2c] border border-[#26344b] font-mono text-[11px] text-[#93c5fd] select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer flex-shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>

                <p className="text-[11px] text-[#71839d] pt-1">
                  💡 <strong>Tip:</strong> Open this exact link on your phone, tablet, or another computer. All your financial transactions and goals will synchronize automatically in real-time.
                </p>
              </div>

              {/* Automatic Cloud Sync Status */}
              <div className="p-3.5 rounded-xl bg-[#0e1726] border border-[#26344b] space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Automatic Real-Time Sync</span>
                  </span>
                  <span className="text-[11px] text-[#93c5fd] font-mono">{transactions.length} transactions</span>
                </div>
                <p className="text-[11px] text-[#71839d]">Changes are pushed automatically after edits and incoming changes are fetched automatically through the live cloud JSON listener. There is nothing to sync manually.</p>
                <div className="text-[11px] text-[#71839d] flex items-center justify-between">
                  <span>Status: <strong className="text-emerald-400">{syncState.message}</strong></span>
                  <span>{syncState.lastSyncTime ? `Last synced: ${syncState.lastSyncTime}` : ''}</span>
                </div>
              </div>

              {/* Unique Ledger ID Card */}
              <div className="p-3 rounded-xl bg-[#121d30] border border-[#26344b] flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#8ea0ba] block">Your Active Ledger ID:</span>
                  <span className="font-mono text-xs font-bold text-[#e8eef8]">{ledgerId}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-[#8ea0ba] block">Cloud Storage:</span>
                  <span className="text-xs font-semibold text-emerald-400">JSON Firestore Sync</span>
                </div>
              </div>

              {/* Simple Step-by-Step Instructions */}
              <div className="p-3.5 rounded-xl bg-[#090f1a] border border-[#1d2b3f] space-y-2">
                <span className="font-bold text-[#c8d4e5] block flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>How multi-device access works:</span>
                </span>
                <ul className="space-y-1.5 text-[11px] text-[#8ea0ba] list-disc list-inside">
                  <li>No complex Google Drive setup or spreadsheet permissions required.</li>
                  <li>All transaction data is stored in JSON format in the cloud.</li>
                  <li>When you open the link on another device, it fetches your ledger instantly.</li>
                  <li>Any transaction you add on your mobile phone appears on this screen in real-time.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'connect' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#090f1a] border border-[#26344b] space-y-3">
                <span className="font-bold text-white block">
                  Connect to an Existing Ledger from Another Device
                </span>
                <p className="text-[11px] text-[#8ea0ba]">
                  If you already logged transactions on another phone or computer, paste the link or Ledger ID below to connect this device to it:
                </p>

                <form onSubmit={handleConnectLedger} className="space-y-2">
                  <input
                    type="text"
                    value={targetLedgerInput}
                    onChange={(e) => setTargetLedgerInput(e.target.value)}
                    placeholder="Paste Ledger Link (https://...?ledger=...) or Ledger ID (ledger_...)"
                    className="w-full px-3 py-2 rounded-lg bg-[#121c2c] border border-[#26344b] text-xs text-white placeholder-[#586b84] focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isConnecting || !targetLedgerInput.trim()}
                    className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    {isConnecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    <span>{isConnecting ? 'Connecting...' : 'Connect & Load Ledger Data'}</span>
                  </button>
                </form>
              </div>

              <div className="p-3 rounded-xl bg-[#121d30] border border-[#26344b] text-[11px] text-[#8ea0ba]">
                <strong>Currently active ledger:</strong> <span className="font-mono text-white">{ledgerId}</span> ({transactions.length} records)
              </div>
            </div>
          )}

          {activeTab === 'json' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-[#090f1a] border border-[#26344b] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Full JSON Backup & Export</span>
                  <span className="text-[11px] text-[#8ea0ba]">{transactions.length} transactions</span>
                </div>
                <p className="text-[11px] text-[#8ea0ba]">
                  Download or copy your complete ledger in standard JSON format:
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleExportJSON}
                    className="p-2.5 rounded-lg bg-[#121d30] hover:bg-[#182740] border border-[#26344b] text-left transition-all group"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-amber-300 mb-0.5">
                      <span>Download .JSON</span>
                      <Download className="w-3.5 h-3.5 text-amber-400 group-hover:translate-y-0.5 transition-transform" />
                    </div>
                    <span className="text-[10px] text-[#71839d] block">Save backup file to your device</span>
                  </button>

                  <button
                    onClick={handleCopyRawJSON}
                    className="p-2.5 rounded-lg bg-[#121d30] hover:bg-[#182740] border border-[#26344b] text-left transition-all group"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-blue-300 mb-0.5">
                      <span>{rawJsonCopied ? 'JSON Copied!' : 'Copy Raw JSON'}</span>
                      {rawJsonCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                    <span className="text-[10px] text-[#71839d] block">Copy JSON string to clipboard</span>
                  </button>
                </div>
              </div>

              {/* Import & Restore JSON */}
              <div className="p-3.5 rounded-xl bg-[#090f1a] border border-[#26344b] space-y-2.5">
                <span className="font-bold text-white block">Restore / Import JSON</span>
                
                <div className="flex items-center gap-2">
                  <label className="flex-1 py-2 px-3 rounded-lg bg-[#121d30] hover:bg-[#182740] border border-[#26344b] text-center cursor-pointer font-semibold text-xs text-purple-300 flex items-center justify-center gap-1.5 transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload .JSON File</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportJsonFile}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] text-[#8ea0ba] block">Or paste raw JSON here:</span>
                  <textarea
                    value={pasteJsonInput}
                    onChange={e => setPasteJsonInput(e.target.value)}
                    rows={3}
                    placeholder='Paste JSON data here (e.g. {"transactions": [...]}'
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#121c2c] border border-[#26344b] text-[11px] font-mono text-white placeholder-[#546780] focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handlePasteJsonRestore}
                    disabled={!pasteJsonInput.trim()}
                    className="w-full py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    Restore Transactions from Pasted JSON
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-[#26344b] bg-[#121d30] flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-[#8ea0ba]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted cloud database</span>
          </div>
          <button
            onClick={closeMultiDeviceModal}
            className="px-4 py-1.5 rounded-lg bg-[#1a273b] hover:bg-[#24354f] text-[#dbe6f6] font-semibold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
