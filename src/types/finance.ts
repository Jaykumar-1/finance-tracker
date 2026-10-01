export type TransactionType = 'income' | 'expense' | 'investment';

export type AccountType = 'Cash' | 'Bank account' | 'UPI' | 'Credit card' | 'Savings' | 'Demat / Brokerage' | 'Other';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  type: TransactionType;
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
  transactions: Transaction[];
  savingsGoals: MonthlySavingsGoal[];
}
