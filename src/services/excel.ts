import * as XLSX from 'xlsx';
import { Transaction, TransactionType } from '../types/finance';
import { generateId, toIsoDate } from '../utils/formatters';

export type DateFormatOption = 'auto' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';

export interface ParseExcelResult {
  transactions: Transaction[];
  error?: string;
  detectedDateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  detectionEvidence?: string;
  totalRows: number;
}

const MONTH_NAME_MAP: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12
};

export function getTransactionFingerprint(tx: {
  id?: string;
  referenceId?: string;
  date: string;
  rawDate?: string;
  amount: number;
  type: string;
  category: string;
  subcategory?: string;
  account?: string;
  note?: string;
  description?: string;
}): string {
  const normalizeText = (value: unknown) => String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

  const normalizeAmount = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : '0.00';
  };

  // Prefer a real source reference/transaction number when the Excel file has
  // one. The app-generated random id is deliberately NOT used as a reference.
  // A reference is combined with date/amount/type so an accidentally reused
  // reference cannot collapse unrelated transactions.
  const reference = normalizeText(tx.referenceId);
  if (reference) {
    return [
      'tx-v3-ref',
      `ref:${reference}`,
      `date:${normalizeText(tx.date)}`,
      `amount:${normalizeAmount(tx.amount)}`,
      `type:${normalizeText(tx.type || 'expense')}`
    ].join('|');
  }

  // rawDate preserves time-of-day from Excel exports. The displayed `date`
  // field intentionally remains YYYY-MM-DD for the rest of the app, but using
  // rawDate here prevents two genuine transactions on the same day with the
  // same amount/category from being collapsed when their source timestamps
  // differ.
  const sourceDate = normalizeText(tx.rawDate || tx.date);

  return [
    'tx-v3-composite',
    `date:${sourceDate}`,
    `amount:${normalizeAmount(tx.amount)}`,
    `type:${normalizeText(tx.type || 'expense')}`,
    `category:${normalizeText(tx.category)}`,
    `subcategory:${normalizeText(tx.subcategory)}`,
    `account:${normalizeText(tx.account || 'bank account')}`,
    `note:${normalizeText(tx.note)}`,
    `description:${normalizeText(tx.description)}`
  ].join('|');
}

export class ExcelService {
  /**
   * Parses an Excel (.xlsx, .xls) or CSV file with smart date format detection
   * and prevention of day/month transposition (e.g. August being parsed as October).
   */
  public static parseExcelFile(
    fileData: ArrayBuffer,
    preferredFormat: DateFormatOption = 'auto'
  ): ParseExcelResult {
    try {
      // NOTE: We deliberately do NOT use cellDates: true because XLSX's internal CSV parser
      // aggressively assumes US MM/DD/YYYY for dates with numbers <= 12, turning "10/08/2024"
      // (10th of August) into October 8th ("2024-10-08"). Using raw: true and cellDates: false
      // preserves the original strings and native Excel date serials so we can parse accurately.
      const workbook = XLSX.read(fileData, {
        type: 'array',
        raw: true,
        cellDates: false
      });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        return {
          transactions: [],
          error: 'The uploaded workbook contains no sheets.',
          detectedDateFormat: 'DD/MM/YYYY',
          totalRows: 0
        };
      }

      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: '', raw: true });

      if (!rows || rows.length === 0) {
        return {
          transactions: [],
          error: 'No data rows found in worksheet.',
          detectedDateFormat: 'DD/MM/YYYY',
          totalRows: 0
        };
      }

      // Step 1: Detect the file-wide date format from all rows
      const { detectedFormat, evidence } = this.detectSheetDateFormat(rows);

      // Step 2: Determine effective format based on user preference or detection
      const effectiveFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' =
        preferredFormat === 'auto' ? detectedFormat : preferredFormat;

      // Step 3: Convert each row into a Transaction
      const transactions: Transaction[] = [];

      rows.forEach((row, index) => {
        const tx = this.convertRowToTransaction(row, index, effectiveFormat);
        if (tx) {
          transactions.push(tx);
        }
      });

      if (transactions.length === 0) {
        return {
          transactions: [],
          error: 'No valid transaction records could be parsed. Check column names (Date, Amount, Category, Type).',
          detectedDateFormat: detectedFormat,
          detectionEvidence: evidence,
          totalRows: rows.length
        };
      }

      return {
        transactions,
        detectedDateFormat: detectedFormat,
        detectionEvidence: evidence,
        totalRows: rows.length
      };
    } catch (e: any) {
      console.error('Excel parse error', e);
      return {
        transactions: [],
        error: e?.message || 'Failed to read Excel file.',
        detectedDateFormat: 'DD/MM/YYYY',
        totalRows: 0
      };
    }
  }

  /**
   * Scans rows across the sheet to collect evidence on date format conventions.
   * If any row has a first number > 12 (e.g. 15/08/2024), it is definitely DD/MM/YYYY.
   * If any row has a second number > 12 (e.g. 08/25/2024), it is definitely MM/DD/YYYY.
   */
  private static detectSheetDateFormat(rows: Record<string, any>[]): {
    detectedFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    evidence: string;
  } {
    let dmyProofCount = 0; // part 1 > 12, part 2 <= 12
    let mdyProofCount = 0; // part 2 > 12, part 1 <= 12
    let ymdCount = 0;      // Starts with 4-digit year
    let sampleProofDmy = '';
    let sampleProofMdy = '';

    for (const row of rows) {
      const rawDate = row['Date'] ?? row['date'] ?? row['DATE'] ?? row['TxDate'] ?? row['Transaction Date'];
      if (!rawDate) continue;

      const str = String(rawDate).trim();
      if (!str) continue;

      // Check ISO format
      if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(str)) {
        ymdCount++;
        continue;
      }

      // Check numeric delimited format
      const match = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
      if (match) {
        const p1 = parseInt(match[1], 10);
        const p2 = parseInt(match[2], 10);

        if (p1 > 12 && p2 <= 12) {
          dmyProofCount++;
          if (!sampleProofDmy) sampleProofDmy = str;
        } else if (p2 > 12 && p1 <= 12) {
          mdyProofCount++;
          if (!sampleProofMdy) sampleProofMdy = str;
        }
      }
    }

    if (dmyProofCount > 0 && mdyProofCount === 0) {
      return {
        detectedFormat: 'DD/MM/YYYY',
        evidence: `Detected DD/MM/YYYY (e.g., "${sampleProofDmy}" proves Day is first).`
      };
    }

    if (mdyProofCount > 0 && dmyProofCount === 0) {
      return {
        detectedFormat: 'MM/DD/YYYY',
        evidence: `Detected MM/DD/YYYY (e.g., "${sampleProofMdy}" proves Month is first).`
      };
    }

    if (dmyProofCount > mdyProofCount) {
      return {
        detectedFormat: 'DD/MM/YYYY',
        evidence: `Detected DD/MM/YYYY based on majority evidence.`
      };
    }

    if (mdyProofCount > dmyProofCount) {
      return {
        detectedFormat: 'MM/DD/YYYY',
        evidence: `Detected MM/DD/YYYY based on majority evidence.`
      };
    }

    if (ymdCount > 0 && dmyProofCount === 0 && mdyProofCount === 0) {
      return {
        detectedFormat: 'YYYY-MM-DD',
        evidence: `Detected standard YYYY-MM-DD format.`
      };
    }

    // Default to DD/MM/YYYY (Standard in India, UK, and international accounting)
    return {
      detectedFormat: 'DD/MM/YYYY',
      evidence: `Using standard DD/MM/YYYY (Day/Month/Year). You can switch to MM/DD/YYYY if your file uses US format.`
    };
  }

  /**
   * Converts any raw cell value (string, Excel serial number, or Date) into
   * a canonical ISO date (YYYY-MM-DD), ensuring August dates never transpose into October.
   */
  public static convertDate(
    val: any,
    effectiveFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' = 'DD/MM/YYYY'
  ): string {
    if (val === null || val === undefined || val === '') return '';

    // 1. If it's a native Date instance
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return '';
      // If XLSX or caller generated UTC midnight, use UTC to avoid timezone rollback
      if (val.getUTCHours() === 0 && val.getUTCMinutes() === 0 && val.getUTCSeconds() === 0) {
        const y = val.getUTCFullYear();
        const m = String(val.getUTCMonth() + 1).padStart(2, '0');
        const d = String(val.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      return toIsoDate(val);
    }

    // 2. If it's an Excel numeric serial date (e.g. 45514 for Aug 10, 2024)
    const num = typeof val === 'number'
      ? val
      : (typeof val === 'string' && /^\d{5}(\.\d+)?$/.test(val.trim()) ? parseFloat(val) : NaN);

    if (!isNaN(num) && num >= 20000 && num <= 85000) {
      try {
        const parsed = XLSX.SSF.parse_date_code(num);
        if (parsed && parsed.y && parsed.m && parsed.d) {
          const y = parsed.y;
          const m = String(parsed.m).padStart(2, '0');
          const d = String(parsed.d).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
      } catch (err) {
        console.warn('SSF parse error', err);
      }
    }

    const str = String(val).trim();
    if (!str) return '';

    // 3. Check standard ISO format: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
    const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (isoMatch) {
      const year = isoMatch[1];
      const month = isoMatch[2].padStart(2, '0');
      const day = isoMatch[3].padStart(2, '0');
      if (parseInt(month, 10) >= 1 && parseInt(month, 10) <= 12 && parseInt(day, 10) >= 1 && parseInt(day, 10) <= 31) {
        return `${year}-${month}-${day}`;
      }
    }

    // 4. Check named month formats:
    // e.g. "10-Aug-2024", "10 August 2024", "10-Aug-24", "10/Aug/2024"
    const namedMatch1 = str.match(/^(\d{1,2})[-/\s]+([a-zA-Z]{3,})[-/,\s]+(\d{2,4})/);
    if (namedMatch1) {
      const dayNum = parseInt(namedMatch1[1], 10);
      const mStr = namedMatch1[2].toLowerCase();
      const rawY = namedMatch1[3];
      const year = rawY.length === 2 ? (parseInt(rawY, 10) >= 70 ? `19${rawY}` : `20${rawY}`) : rawY;
      const monthNum = MONTH_NAME_MAP[mStr];
      if (monthNum && dayNum >= 1 && dayNum <= 31) {
        return `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      }
    }

    // e.g. "Aug 10, 2024", "August 10 2024", "Aug 10 24"
    const namedMatch2 = str.match(/^([a-zA-Z]{3,})[-/\s]+(\d{1,2})[-/,\s]+(\d{2,4})/);
    if (namedMatch2) {
      const mStr = namedMatch2[1].toLowerCase();
      const dayNum = parseInt(namedMatch2[2], 10);
      const rawY = namedMatch2[3];
      const year = rawY.length === 2 ? (parseInt(rawY, 10) >= 70 ? `19${rawY}` : `20${rawY}`) : rawY;
      const monthNum = MONTH_NAME_MAP[mStr];
      if (monthNum && dayNum >= 1 && dayNum <= 31) {
        return `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      }
    }

    // 5. Delimited numeric dates: Part1 [-/.] Part2 [-/.] Year
    // e.g. "10/08/2024", "08/10/2024", "10-08-2024", "10.08.2024"
    const numMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
    if (numMatch) {
      const p1 = parseInt(numMatch[1], 10);
      const p2 = parseInt(numMatch[2], 10);
      const rawY = numMatch[3];
      const year = rawY.length === 2 ? (parseInt(rawY, 10) >= 70 ? `19${rawY}` : `20${rawY}`) : rawY;

      let day: number;
      let month: number;

      if (p1 > 12 && p2 <= 12) {
        // Definitely DD/MM (p1 cannot be a month)
        day = p1;
        month = p2;
      } else if (p2 > 12 && p1 <= 12) {
        // Definitely MM/DD (p2 cannot be a month)
        month = p1;
        day = p2;
      } else {
        // Ambiguous: both <= 12 (e.g. 10/08/2024 or 08/10/2024)
        if (effectiveFormat === 'MM/DD/YYYY') {
          month = p1;
          day = p2;
        } else {
          // Default to DD/MM/YYYY
          day = p1;
          month = p2;
        }
      }

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    // 6. Generic Date fallback as last resort
    const fallbackDate = new Date(val);
    if (!isNaN(fallbackDate.getTime()) && fallbackDate.getFullYear() >= 1970 && fallbackDate.getFullYear() <= 2100) {
      return toIsoDate(fallbackDate);
    }

    return '';
  }

  private static convertRowToTransaction(
    row: Record<string, any>,
    index: number,
    effectiveFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  ): Transaction | null {
    const rawDate = row['Date'] ?? row['date'] ?? row['DATE'] ?? row['TxDate'] ?? row['Transaction Date'];
    const date = this.convertDate(rawDate, effectiveFormat);
    if (!date) return null;

    const rawId = String(row['ID'] ?? row['Id'] ?? row['id'] ?? row['Transaction ID'] ?? row['TxID'] ?? row['Ref No'] ?? row['Reference No'] ?? row['Reference'] ?? row['UTR'] ?? row['Transaction Ref'] ?? '').trim();
    const rawCategory = String(row['Category'] ?? row['category'] ?? row['CATEGORY'] ?? '').trim();
    const rawSubcategory = String(row['Subcategory'] ?? row['subcategory'] ?? row['Sub Category'] ?? '').trim();
    const rawAccount = String(row['Account'] ?? row['account'] ?? row['Payment Method'] ?? 'Bank account').trim();
    const rawNote = String(row['Note'] ?? row['note'] ?? row['Remarks'] ?? '').trim();
    const rawDescription = String(row['Description'] ?? row['description'] ?? '').trim();

    // Support both this app's Type column and common exports from apps that
    // have separate Income / Expense columns. Investment is intentionally only
    // imported when the source explicitly labels a row as an investment; an
    // Income/Expense-only export therefore cannot overwrite existing investments.
    const explicitType = String(
      row['Income/Expense'] ??
      row['Income / Expense'] ??
      row['Type'] ??
      row['type'] ??
      row['Tx Type'] ??
      row['Transaction Type'] ??
      row['TransactionType'] ??
      ''
    ).trim().toLowerCase();

    const incomeCell = row['Income'] ?? row['income'] ?? row['Credit'] ?? row['credit'] ?? '';
    const expenseCell = row['Expense'] ?? row['expense'] ?? row['Debit'] ?? row['debit'] ?? '';

    let type: TransactionType = 'expense';
    if (explicitType.includes('investment') || explicitType.includes('invest') || explicitType.includes('sip') || explicitType.includes('mutual')) {
      type = 'investment';
    } else if (explicitType.includes('income') || explicitType.includes('credit') || explicitType.includes('salary') || explicitType.includes('deposit')) {
      type = 'income';
    } else if (incomeCell !== '' && incomeCell !== null && incomeCell !== undefined && Number(String(incomeCell).replace(/,/g, '').replace(/[₹$€£]/g, '').trim()) !== 0) {
      type = 'income';
    } else {
      type = 'expense';
    }

    let rawAmount = row['Amount'] ?? row['amount'] ?? row['AMOUNT'] ?? row['INR'] ?? row['inr'] ?? row['Total'] ?? 0;
    const numericAmount = Number(String(rawAmount).replace(/,/g, '').replace(/[₹$€£]/g, '').trim());
    const numericIncome = Number(String(incomeCell).replace(/,/g, '').replace(/[₹$€£]/g, '').trim());
    const numericExpense = Number(String(expenseCell).replace(/,/g, '').replace(/[₹$€£]/g, '').trim());

    // Some exports use separate Income/Expense columns and leave Amount blank/zero.
    if ((rawAmount === '' || rawAmount === null || rawAmount === undefined || !Number.isFinite(numericAmount) || numericAmount === 0) && type === 'income' && Number.isFinite(numericIncome) && numericIncome !== 0) {
      rawAmount = incomeCell;
    }
    if ((rawAmount === '' || rawAmount === null || rawAmount === undefined || !Number.isFinite(numericAmount) || numericAmount === 0) && type === 'expense' && Number.isFinite(numericExpense) && numericExpense !== 0) {
      rawAmount = expenseCell;
    }
    const cleanAmount = Number(
      String(rawAmount)
        .replace(/,/g, '')
        .replace(/₹|\$|€|£/g, '')
        .trim()
    );

    const amount = Number.isFinite(cleanAmount) ? Math.abs(cleanAmount) : 0;

    return {
      id: rawId || generateId(),
      referenceId: rawId || undefined,
      date,
      amount,
      type,
      category: rawCategory || (type === 'income' ? 'Salary' : type === 'investment' ? 'Mutual Funds & SIP' : 'Miscellaneous'),
      subcategory: rawSubcategory || undefined,
      account: rawAccount || 'Bank account',
      note: rawNote || undefined,
      description: rawDescription || undefined,
      source: 'excel',
      excelRow: index + 2,
      rawDate: rawDate !== undefined && rawDate !== null ? String(rawDate) : undefined,
      updatedAt: new Date().toISOString()
    };
  }

  public static exportToExcel(transactions: Transaction[], filename: string = 'Finance_Transactions.xlsx'): void {
    const data = transactions.map(t => ({
      'ID': t.id,
      'Date': t.date,
      'Type': t.type.toUpperCase(),
      'Category': t.category,
      'Subcategory': t.subcategory || '',
      'Account': t.account,
      'Amount': t.amount,
      'Note': t.note || '',
      'Description': t.description || '',
      'Last Updated': t.updatedAt
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
    XLSX.writeFile(workbook, filename);
  }

  public static downloadSampleTemplate(filename: string = 'Finance_Sample_Template.xlsx'): void {
    const today = toIsoDate(new Date());
    const sampleData = [
      {
        'Date': today,
        'Type': 'EXPENSE',
        'Category': 'Groceries',
        'Subcategory': 'Vegetables & Fruits',
        'Account': 'Bank account',
        'Amount': 850,
        'Note': 'Weekly grocery run'
      },
      {
        'Date': today,
        'Type': 'INCOME',
        'Category': 'Salary',
        'Subcategory': 'Primary Income',
        'Account': 'Bank account',
        'Amount': 55000,
        'Note': 'Monthly salary deposit'
      },
      {
        'Date': today,
        'Type': 'INVESTMENT',
        'Category': 'Mutual Funds & SIP',
        'Subcategory': 'Index Fund',
        'Account': 'Bank account',
        'Amount': 5000,
        'Note': 'Automated monthly SIP'
      },
      {
        'Date': today,
        'Type': 'EXPENSE',
        'Category': 'Dining Out & Food Delivery',
        'Subcategory': 'Weekend Dinner',
        'Account': 'Credit card',
        'Amount': 1200,
        'Note': 'Dinner with family'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, filename);
  }
}
