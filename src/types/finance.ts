export type TransactionType = 'income' | 'expense' | 'investment';
export type InvestmentAction = 'invest' | 'redeem';

export type AccountType = 'Cash' | 'Bank account' | 'UPI' | 'Credit card' | 'Savings' | 'Demat / Brokerage' | 'Crypto wallet' | 'Other';

export interface Transaction {
  id: string;
  /** Stable source transaction/reference number when supplied by Excel/bank export. */
  referenceId?: string;
  date: string; // YYYY-MM-DD
  amount: number;
  type: TransactionType;
  /** Optional for backward compatibility; missing means Invest. */
  investmentAction?: InvestmentAction;
  category: string;
  subcategory?: string;
  account: AccountType | string;
  note?: string;
  description?: string;
  source?: 'manual' | 'excel' | 'cloud';
  excelRow?: number;
  rawDate?: string;
  updatedAt: string;
}

export interface CategoryStructure {
  [categoryName: string]: string[];
}

export interface CategoryConfig {
  income: CategoryStructure;
  expense: CategoryStructure;
  investment: CategoryStructure;
}

/** Explicit order of category names per type (survives Firestore map reordering). */
export interface CategoryOrder {
  income: string[];
  expense: string[];
  investment: string[];
}

/**
 * User-defined need vs want mapping for expense categories/subcategories.
 * Keys are "Category" or "Category||Subcategory".
 * Investment transactions are always treated as 'investment'.
 * Income is ignored for this analysis.
 */
export type SpendingBucket = 'need' | 'want' | 'investment' | 'unclassified';

export interface SpendingClassification {
  /** Map of "Category" or "Category||Subcategory" -> 'need' | 'want' */
  rules: Record<string, 'need' | 'want'>;
  updatedAt?: string;
}

export interface MonthlySavingsGoal {
  monthKey: string; // YYYY-MM
  targetSavings: number; // e.g. 20000
  expenseBudget?: number; // optional spending cap
  note?: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  authProvider: 'google' | 'password' | 'guest';
  currency: string; // 'INR', 'USD', 'EUR', 'GBP', etc.
  createdAt: string;
  lastSyncedAt?: string;
  ledgerId?: string;
  googleEmail?: string;
  googleSheetId?: string;
  googleSheetUrl?: string;
  googleSheetTitle?: string;
  isGoogleDriveLinked?: boolean;
  lastDriveSyncAt?: string;
}

export interface CloudLedger {
  id: string;
  /** Firebase Auth UID that owns this cloud ledger. */
  ownerUid?: string; // unique ledger ID, e.g. "ledger_abc123"
  name?: string;
  currency: string;
  categories: CategoryConfig;
  categoryOrder?: CategoryOrder;
  spendingClassification?: SpendingClassification;
  savingsGoals: MonthlySavingsGoal[];
  transactions: Transaction[];
  /** IDs removed on another device; kept as tombstones so real-time sync does not resurrect deletes. */
  deletedTransactionIds?: string[];
  /** Timestamp of the last full transaction erase. Transactions older than this reset are ignored. */
  resetAt?: string;
  updatedAt: string;
}

export interface SyncState {
  status: 'synced' | 'syncing' | 'offline' | 'error' | 'pending';
  lastSyncTime: string | null;
  pendingChangesCount: number;
  message?: string;
  ledgerId?: string;
  shareableLink?: string;
  googleDriveStatus?: 'linked' | 'syncing' | 'synced' | 'disconnected' | 'token_expired';
  googleSheetUrl?: string;
  googleSheetId?: string;
  googleEmail?: string;
  lastDriveSyncAt?: string;
}

export interface FinanceDataBackup {
  schemaVersion: number;
  exportedAt: string;
  owner?: {
    username?: string;
    email?: string;
    displayName?: string;
  };
  ledgerId?: string;
  currency: string;
  categories: CategoryConfig;
  categoryOrder?: CategoryOrder;
  transactions: Transaction[];
  savingsGoals: MonthlySavingsGoal[];
  spendingClassification?: SpendingClassification;
}
