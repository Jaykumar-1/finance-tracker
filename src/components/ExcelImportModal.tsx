import React, { useState, useRef, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { ExcelService, getTransactionFingerprint, DateFormatOption } from '../services/excel';
import { Transaction } from '../types/finance';
import { formatMoney } from '../utils/formatters';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  CopyCheck,
  Calendar,
  Layers,
  FileCheck2,
  RefreshCw,
  Info
} from 'lucide-react';

export const ExcelImportModal: React.FC = () => {
  const {
    isExcelModalOpen,
    closeExcelModal,
    transactions,
    importTransactions,
    currency
  } = useFinance();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [parsedTxs, setParsedTxs] = useState<Transaction[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dateFormatPref, setDateFormatPref] = useState<DateFormatOption>('auto');
  const [detectedFormat, setDetectedFormat] = useState<'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'>('DD/MM/YYYY');
  const [detectionEvidence, setDetectionEvidence] = useState<string>('');
  const [importSummary, setImportSummary] = useState<{
    added: number;
    skipped: number;
    total: number;
  } | null>(null);

  // Always use merge-safe import for Excel files. Existing transactions are never replaced.
  const analysis = useMemo(() => {
    if (parsedTxs.length === 0) {
      return { newCount: 0, duplicateCount: 0, items: [] as { tx: Transaction; isDuplicate: boolean }[] };
    }

    const existingIds = new Set<string>();
    const knownFingerprints = new Set<string>();

    for (const t of transactions) {
      if (t.id) existingIds.add(t.id);
      knownFingerprints.add(getTransactionFingerprint(t));
    }

    let newCount = 0;
    let duplicateCount = 0;
    const items: { tx: Transaction; isDuplicate: boolean }[] = [];

    // This single set grows as each incoming row is accepted. Therefore an
    // exact duplicate appearing twice inside the SAME Excel file is also
    // detected, while legitimate same-amount transactions remain distinct.
    for (const tx of parsedTxs) {
      if (tx.id && existingIds.has(tx.id)) {
        duplicateCount++;
        items.push({ tx, isDuplicate: true });
        continue;
      }

      const fp = getTransactionFingerprint(tx);
      if (knownFingerprints.has(fp)) {
        duplicateCount++;
        items.push({ tx, isDuplicate: true });
        continue;
      }

      newCount++;
      items.push({ tx, isDuplicate: false });
      knownFingerprints.add(fp);
      if (tx.id) existingIds.add(tx.id);
    }

    return { newCount, duplicateCount, items };
  }, [parsedTxs, transactions]);

  if (!isExcelModalOpen) return null;

  const runParse = (buffer: ArrayBuffer, formatPref: DateFormatOption) => {
    const result = ExcelService.parseExcelFile(buffer, formatPref);

    setDetectedFormat(result.detectedDateFormat);
    setDetectionEvidence(result.detectionEvidence || '');

    if (result.error) {
      setParseError(result.error);
      setParsedTxs([]);
    } else {
      setParseError(null);
      setParsedTxs(result.transactions);
    }
  };

  const handleFileProcess = async (file: File) => {
    setSelectedFile(file);
    setParseError(null);
    setImportSummary(null);
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      setFileBuffer(buffer);
      runParse(buffer, dateFormatPref);
    } catch (err: any) {
      setParseError(err?.message || 'Could not parse the selected file.');
      setParsedTxs([]);
      setFileBuffer(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDateFormatChange = (newFormat: DateFormatOption) => {
    setDateFormatPref(newFormat);
    if (fileBuffer) {
      runParse(fileBuffer, newFormat);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleExecuteImport = async () => {
    if (parsedTxs.length === 0) return;
    setIsProcessing(true);

    // Excel import is intentionally merge-only: it can add new income/expense
    // rows but can never replace or erase existing transactions (including investments).
    const res = await importTransactions(parsedTxs, 'safe');
    setIsProcessing(false);

    if (res) {
      setImportSummary({
        added: res.addedCount,
        skipped: res.skippedCount,
        total: res.totalCount
      });
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setFileBuffer(null);
    setParsedTxs([]);
    setParseError(null);
    setImportSummary(null);
    setDateFormatPref('auto');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadTemplate = () => {
    ExcelService.downloadSampleTemplate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl bg-[#0f192b] border border-[#263750] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#213149] flex items-center justify-between bg-[#121e33]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Excel Spreadsheet Import</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-semibold uppercase tracking-wider border border-blue-500/30">
                  Smart Date & De-Duplication
                </span>
              </h3>
              <p className="text-xs text-[#8ea0ba]">
                Import .xlsx, .xls, or .csv files with auto-detected date formats.
              </p>
            </div>
          </div>
          <button
            onClick={closeExcelModal}
            className="p-1.5 text-[#7285a2] hover:text-white hover:bg-[#1a2942] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Post-Import Success State */}
          {importSummary ? (
            <div className="p-6 rounded-2xl bg-[#14233c] border border-emerald-500/40 text-center space-y-4 animate-in fade-in">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">Import Complete!</h4>
                <p className="text-xs text-[#8ea0ba] mt-1 max-w-md mx-auto">
                  Your transactions have been accurately imported with correct dates into your ledger.
                </p>
              </div>

              {/* Stats pill breakdown */}
              <div className="grid grid-cols-3 gap-2.5 max-w-md mx-auto pt-2">
                <div className="p-3 rounded-xl bg-[#0e1726] border border-[#21324c]">
                  <span className="text-[10px] text-[#7d91ad] uppercase font-bold block">New Added</span>
                  <span className="text-xl font-extrabold text-emerald-400">{importSummary.added}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#0e1726] border border-[#21324c]">
                  <span className="text-[10px] text-[#7d91ad] uppercase font-bold block">Duplicates Skipped</span>
                  <span className="text-xl font-extrabold text-amber-400">{importSummary.skipped}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#0e1726] border border-[#21324c]">
                  <span className="text-[10px] text-[#7d91ad] uppercase font-bold block">Total In File</span>
                  <span className="text-xl font-extrabold text-[#dce7f7]">{importSummary.total}</span>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-center gap-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl bg-[#1d2d47] hover:bg-[#25395a] text-xs font-semibold text-[#dce7f7] border border-[#35496a] transition-colors cursor-pointer"
                >
                  Import Another File
                </button>
                <button
                  onClick={closeExcelModal}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/30 transition-colors cursor-pointer"
                >
                  Done / View Transactions
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* File Dropzone or Selected File Info */}
              {!selectedFile ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-[#283852] hover:border-blue-500/50 hover:bg-[#121c2e]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">
                    Select or Drop your Excel / CSV File
                  </h4>
                  <p className="text-xs text-[#8ea0ba] mt-1 max-w-sm mx-auto">
                    Supports .xlsx, .xls, and .csv exports from bank statements, credit cards, or accounting apps.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#18263e] text-xs text-blue-300 font-medium border border-blue-500/20">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Browse files from device</span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-[#121c2e] border border-[#263750] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {selectedFile.name}
                      </div>
                      <div className="text-[11px] text-[#8ea0ba]">
                        {(selectedFile.size / 1024).toFixed(1)} KB · {parsedTxs.length} records parsed
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 rounded-lg bg-[#1a283f] hover:bg-[#233554] text-xs font-semibold text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
                  >
                    Change File
                  </button>
                </div>
              )}

              {/* Parse Error Display */}
              {parseError && (
                <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">File Read Error</span>
                    <span>{parseError}</span>
                  </div>
                </div>
              )}

              {/* Analysis & Duplication Preview (When records are parsed) */}
              {parsedTxs.length > 0 && (
                <div className="space-y-3 pt-1">
                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-300 uppercase">New To Add</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="text-xl font-extrabold text-emerald-400 mt-1">
                        {analysis.newCount}
                      </div>
                      <div className="text-[10px] text-emerald-300/70">Will be saved to ledger</div>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-300 uppercase">Duplicates (Ignored)</span>
                        <CopyCheck className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <div className="text-xl font-extrabold text-amber-400 mt-1">
                        {analysis.duplicateCount}
                      </div>
                      <div className="text-[10px] text-amber-300/70">Already in your ledger</div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#121c2e] border border-[#263750]">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#8ea0ba] uppercase">Total In File</span>
                        <Layers className="w-3.5 h-3.5 text-[#8ea0ba]" />
                      </div>
                      <div className="text-xl font-extrabold text-[#dce7f7] mt-1">
                        {parsedTxs.length}
                      </div>
                      <div className="text-[10px] text-[#7d91ad]">Processed rows</div>
                    </div>
                  </div>

                  {/* Date Format Auto-Detection & Selector */}
                  <div className="p-3 rounded-xl bg-[#121c2e] border border-blue-500/30 text-xs space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        <span>Date Format in Your File:</span>
                      </span>
                      <span className="text-[11px] text-blue-300">
                        {dateFormatPref === 'auto'
                          ? `Auto-detected: ${detectedFormat}`
                          : `Manual override: ${dateFormatPref}`}
                      </span>
                    </div>

                    {/* Interactive format picker pills */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleDateFormatChange('auto')}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all text-center cursor-pointer border ${
                          dateFormatPref === 'auto'
                            ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                            : 'bg-[#18263d] text-[#8ea0ba] hover:text-white border-[#273a56]'
                        }`}
                      >
                        Auto-Detect ({detectedFormat})
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDateFormatChange('DD/MM/YYYY')}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all text-center cursor-pointer border ${
                          dateFormatPref === 'DD/MM/YYYY'
                            ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                            : 'bg-[#18263d] text-[#8ea0ba] hover:text-white border-[#273a56]'
                        }`}
                      >
                        DD/MM/YYYY (10/08 = 10 Aug)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDateFormatChange('MM/DD/YYYY')}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all text-center cursor-pointer border ${
                          dateFormatPref === 'MM/DD/YYYY'
                            ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                            : 'bg-[#18263d] text-[#8ea0ba] hover:text-white border-[#273a56]'
                        }`}
                      >
                        MM/DD/YYYY (08/10 = 10 Aug)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDateFormatChange('YYYY-MM-DD')}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all text-center cursor-pointer border ${
                          dateFormatPref === 'YYYY-MM-DD'
                            ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                            : 'bg-[#18263d] text-[#8ea0ba] hover:text-white border-[#273a56]'
                        }`}
                      >
                        YYYY-MM-DD (2024-08-10)
                      </button>
                    </div>

                    {detectionEvidence && (
                      <div className="flex items-center gap-1.5 text-[11px] text-[#8ea0ba] pt-0.5">
                        <Info className="w-3 h-3 text-blue-400 flex-shrink-0" />
                        <span className="truncate">{detectionEvidence}</span>
                      </div>
                    )}
                  </div>

                  {/* Safe merge policy */}
                  <div className="p-3 rounded-xl bg-[#121c2e] border border-emerald-500/30 text-xs space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="font-semibold text-white">Safe Merge Import</span>
                      <span className="text-emerald-400 font-semibold">Always enabled</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-[#8ea0ba]">
                      Existing transactions are kept exactly as they are. Only genuinely new rows from this Excel file are added.
                      Your manually added <span className="text-blue-300 font-semibold">Investment</span> transactions are never removed or replaced by an Income/Expense-only Excel file.
                    </p>
                  </div>

                  {/* Transaction Preview Table */}
                  <div className="border border-[#213149] rounded-xl overflow-hidden bg-[#0d1627]">
                    <div className="px-3.5 py-2 bg-[#121f33] border-b border-[#213149] flex items-center justify-between text-xs">
                      <span className="font-bold text-[#c7d6eb]">
                        File Preview ({analysis.items.length} items)
                      </span>
                      <span className="text-[11px] text-[#7d91ad]">
                        Showing top entries with interpreted dates
                      </span>
                    </div>

                    <div className="max-h-52 overflow-y-auto divide-y divide-[#1a273b] text-xs">
                      {analysis.items.slice(0, 30).map((item, idx) => {
                        const parsedDateObj = new Date(item.tx.date);
                        const prettyDate = !isNaN(parsedDateObj.getTime())
                          ? parsedDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : item.tx.date;

                        return (
                          <div
                            key={item.tx.id || idx}
                            className="px-3.5 py-2 flex items-center justify-between gap-2 hover:bg-[#132034]/60 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase flex-shrink-0 ${
                                  item.isDuplicate
                                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                }`}
                              >
                                {item.isDuplicate ? 'Duplicate' : 'New'}
                              </span>
                              <div className="min-w-0">
                                <span className="text-[#e2ecf9] font-medium truncate block">
                                  {item.tx.category} {item.tx.subcategory ? `· ${item.tx.subcategory}` : ''}
                                </span>
                                <span className="text-[11px] text-[#8ea0ba] truncate block">
                                  <strong className="text-white font-semibold">{prettyDate}</strong>
                                  {item.tx.rawDate && item.tx.rawDate !== item.tx.date && (
                                    <span className="text-[#64748b] ml-1">
                                      (from "{item.tx.rawDate}")
                                    </span>
                                  )}
                                  {' · '}{item.tx.account} {item.tx.note ? `· "${item.tx.note}"` : ''}
                                </span>
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <span
                                className={`font-bold ${
                                  item.tx.type === 'income'
                                    ? 'text-emerald-400'
                                    : item.tx.type === 'investment'
                                    ? 'text-blue-400'
                                    : 'text-rose-400'
                                }`}
                              >
                                {item.tx.type === 'income' ? '+' : item.tx.type === 'investment' ? '↗' : '−'}
                                {formatMoney(item.tx.amount, currency)}
                              </span>
                              <span className="text-[10px] text-[#6d829f] block uppercase">
                                {item.tx.type}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Sample Template & Help */}
              <div className="p-3.5 rounded-xl bg-[#111c2e] border border-[#213149] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-semibold text-white block">Need a spreadsheet format?</span>
                  <span className="text-[11px] text-[#8ea0ba]">
                    Download our sample Excel template pre-formatted with standard date formats.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18263e] hover:bg-[#203454] border border-[#32486a] text-blue-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Download Sample Template (.xlsx)</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!importSummary && (
          <div className="p-4 sm:p-5 border-t border-[#213149] bg-[#121e33] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={closeExcelModal}
              className="px-4 py-2 rounded-xl bg-[#18263e] hover:bg-[#203454] text-xs font-semibold text-[#8ea0ba] hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              {parsedTxs.length > 0 && (
                <button
                  type="button"
                  disabled={isProcessing || analysis.newCount === 0}
                  onClick={handleExecuteImport}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck2 className="w-4 h-4" />
                      <span>
                        {analysis.newCount > 0
                          ? `Add ${analysis.newCount} New Transaction${analysis.newCount === 1 ? '' : 's'}`
                          : 'No New Transactions To Add'}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
