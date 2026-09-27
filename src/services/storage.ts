import { CategoryConfig, CloudLedger, FinanceDataBackup, MonthlySavingsGoal, Transaction, UserProfile } from '../types/finance';
import { DEFAULT_CATEGORIES } from '../utils/constants';
import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  Unsubscribe,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';

const STORAGE_KEYS = {
  USER: 'myfinance_user_profile',
  TRANSACTIONS: (userId: string) => `myfinance_${userId}_transactions`,
  CATEGORIES: (userId: string) => `myfinance_${userId}_categories`,
  GOALS: (userId: string) => `myfinance_${userId}_savings_goals`,
  SYNC_QUEUE: (userId: string) => `myfinance_${userId}_sync_queue`,
  MIGRATION_FLAG: (userId: string) => `myfinance_${userId}_migrated_v4`
};

const memoryStorage = new Map<string, string>();

function safeGetItem(key: string): string | null {
  try {
    const val = localStorage.getItem(key);
    if (val !== null) return val;
  } catch {
    // ignore
  }
  return memoryStorage.get(key) || null;
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
  memoryStorage.set(key, value);
}

function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
  memoryStorage.delete(key);
}

export class FinanceStorageService {
  private static instance: FinanceStorageService;

  private constructor() {}

  public static getInstance(): FinanceStorageService {
    if (!FinanceStorageService.instance) {
      FinanceStorageService.instance = new FinanceStorageService();
    }
    return FinanceStorageService.instance;
  }

  // ==========================================
  // Local Cache Methods (Fast offline & initial load)
  // ==========================================

  public loadLocalCategories(userId: string): CategoryConfig {
    try {
      const raw = safeGetItem(STORAGE_KEYS.CATEGORIES(userId));
      if (!raw) {
        return JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
      }
      const parsed = JSON.parse(raw);
      const defaults = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
      (['income', 'expense', 'investment'] as const).forEach(type => {
        if (!parsed[type] || typeof parsed[type] !== 'object') {
          parsed[type] = defaults[type];
        } else {
          Object.entries(defaults[type]).forEach(([cat, subcats]) => {
            if (!Object.prototype.hasOwnProperty.call(parsed[type], cat)) {
              parsed[type][cat] = subcats;
            }
          });
        }
      });
      return parsed;
    } catch {
      return JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
    }
  }

  public saveLocalCategories(userId: string, categories: CategoryConfig): void {
    safeSetItem(STORAGE_KEYS.CATEGORIES(userId), JSON.stringify(categories));
  }

  public loadLocalTransactions(userId: string): Transaction[] {
    try {
      const raw = safeGetItem(STORAGE_KEYS.TRANSACTIONS(userId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Recovers transactions from any previous local session key if current key is empty
   */
  public loadAnyLocalTransactions(preferredId?: string): Transaction[] {
    const checked = new Set<string>();
    const candidates = [
      preferredId,
      'main',
      'default',
      'anonymous_guest',
      'guest_user',
      'guest',
      ''
    ].filter(Boolean) as string[];

    for (const id of candidates) {
      if (checked.has(id)) continue;
      checked.add(id);
      const txs = this.loadLocalTransactions(id);
      if (txs.length > 0) return txs;
    }

    if (typeof localStorage !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('myfinance_') && key.endsWith('_transactions')) {
            const raw = localStorage.getItem(key);
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  return parsed;
                }
              } catch {}
            }
          }
        }
      } catch {}
    }
    return [];
  }

  public saveLocalTransactions(userId: string, transactions: Transaction[]): void {
    safeSetItem(STORAGE_KEYS.TRANSACTIONS(userId), JSON.stringify(transactions));
  }

  public purgeLocalTransactions(userId: string): void {
    safeRemoveItem(STORAGE_KEYS.TRANSACTIONS(userId));
    safeRemoveItem(STORAGE_KEYS.TRANSACTIONS('anonymous_guest'));
    safeRemoveItem(STORAGE_KEYS.TRANSACTIONS('guest'));
    safeRemoveItem(STORAGE_KEYS.TRANSACTIONS(''));
  }

  public loadLocalSavingsGoals(userId: string): MonthlySavingsGoal[] {
    try {
      const raw = safeGetItem(STORAGE_KEYS.GOALS(userId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public saveLocalSavingsGoals(userId: string, goals: MonthlySavingsGoal[]): void {
    safeSetItem(STORAGE_KEYS.GOALS(userId), JSON.stringify(goals));
  }

  // Backwards compatible aliases
  public loadCategories(userId: string): CategoryConfig {
    return this.loadLocalCategories(userId);
  }

  public saveCategories(userId: string, categories: CategoryConfig): void {
    this.saveLocalCategories(userId, categories);
  }

  public loadTransactions(userId: string): Transaction[] {
    return this.loadLocalTransactions(userId);
  }

  public saveTransactions(userId: string, transactions: Transaction[]): void {
    this.saveLocalTransactions(userId, transactions);
  }

  public purgeAllTransactions(userId: string): void {
    this.purgeLocalTransactions(userId);
  }

  public loadSavingsGoals(userId: string): MonthlySavingsGoal[] {
    return this.loadLocalSavingsGoals(userId);
  }

  public saveSavingsGoals(userId: string, goals: MonthlySavingsGoal[]): void {
    this.saveLocalSavingsGoals(userId, goals);
  }

  public clearAllUserData(userId: string): void {
    safeRemoveItem(STORAGE_KEYS.TRANSACTIONS(userId));
    safeRemoveItem(STORAGE_KEYS.CATEGORIES(userId));
    safeRemoveItem(STORAGE_KEYS.GOALS(userId));
    safeRemoveItem(STORAGE_KEYS.SYNC_QUEUE(userId));
  }

  // ==========================================
  // Canonical Firestore Methods
  // Path: /users/{uid}/transactions/{transactionId}
  // Path: /users/{uid}
  // ==========================================

  /**
   * Adds an individual transaction to Firestore at /users/{uid}/transactions/{tx.id}
   */
  public async addTransaction(uid: string, tx: Transaction): Promise<{ success: boolean; error?: string }> {
    if (!uid) return { success: false, error: 'No user ID provided' };

    try {
      const txDocRef = doc(db, 'users', uid, 'transactions', tx.id);
      const payload = {
        ...tx,
        userId: uid,
        updatedAt: tx.updatedAt || new Date().toISOString(),
        serverTimestamp: serverTimestamp()
      };

      await setDoc(txDocRef, payload);
      return { success: true };
    } catch (err: any) {
      console.error('Firestore addTransaction error:', err);
      return { success: false, error: err?.message || 'Failed to persist transaction to cloud' };
    }
  }

  /**
   * Updates an individual transaction at /users/{uid}/transactions/{tx.id}
   */
  public async updateTransaction(uid: string, tx: Transaction): Promise<{ success: boolean; error?: string }> {
    if (!uid) return { success: false, error: 'No user ID provided' };

    try {
      const txDocRef = doc(db, 'users', uid, 'transactions', tx.id);
      const payload = {
        ...tx,
        userId: uid,
        updatedAt: new Date().toISOString(),
        serverTimestamp: serverTimestamp()
      };

      await setDoc(txDocRef, payload, { merge: true });
      return { success: true };
    } catch (err: any) {
      console.error('Firestore updateTransaction error:', err);
      return { success: false, error: err?.message || 'Failed to update transaction in cloud' };
    }
  }

  /**
   * Deletes an individual transaction at /users/{uid}/transactions/{txId}
   */
  public async deleteTransaction(uid: string, txId: string): Promise<{ success: boolean; error?: string }> {
    if (!uid) return { success: false, error: 'No user ID provided' };

    try {
      const txDocRef = doc(db, 'users', uid, 'transactions', txId);
      await deleteDoc(txDocRef);
      return { success: true };
    } catch (err: any) {
      console.error('Firestore deleteTransaction error:', err);
      return { success: false, error: err?.message || 'Failed to delete transaction from cloud' };
    }
  }

  /**
   * Batch deletes all transactions in /users/{uid}/transactions
   */
  public async clearAllCloudTransactions(uid: string): Promise<{ success: boolean; error?: string }> {
    if (!uid) return { success: false, error: 'No user ID provided' };

    try {
      const txColRef = collection(db, 'users', uid, 'transactions');
      const snap = await getDocs(txColRef);
      if (snap.empty) return { success: true };

      const batch = writeBatch(db);
      snap.docs.forEach(d => {
        batch.delete(d.ref);
      });
      await batch.commit();
      return { success: true };
    } catch (err: any) {
      console.error('Firestore clearAllCloudTransactions error:', err);
      return { success: false, error: err?.message || 'Failed to clear cloud transactions' };
    }
  }

  /**
   * Saves User Profile, Categories, Savings Goals to /users/{uid}
   */
  public async saveCloudUserProfile(uid: string, data: Partial<UserProfile> & { categories?: CategoryConfig; savingsGoals?: MonthlySavingsGoal[] }): Promise<void> {
    if (!uid) return;
    try {
      const userDocRef = doc(db, 'users', uid);
      await setDoc(userDocRef, {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore user profile save notice:', err);
    }
  }

  /**
   * Fetches all transactions from /users/{uid}/transactions
   */
  public async fetchCloudTransactions(uid: string): Promise<Transaction[]> {
    if (!uid) return [];

    try {
      const txColRef = collection(db, 'users', uid, 'transactions');
      const snap = await getDocs(txColRef);
      if (snap.empty) return [];

      const txs: Transaction[] = [];
      snap.docs.forEach(docSnap => {
        const d = docSnap.data();
        if (d && d.amount !== undefined) {
          txs.push({
            id: docSnap.id,
            date: d.date || new Date().toISOString().split('T')[0],
            amount: Number(d.amount) || 0,
            type: d.type || 'expense',
            category: d.category || 'Other',
            subcategory: d.subcategory,
            account: d.account || 'Cash',
            note: d.note,
            description: d.description,
            source: d.source || 'cloud',
            excelRow: d.excelRow,
            updatedAt: d.updatedAt || new Date().toISOString()
          });
        }
      });

      // Sort by date descending
      return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (err) {
      console.warn('Could not fetch cloud transactions:', err);
      return [];
    }
  }

  /**
   * Subscribes to real-time changes in /users/{uid}/transactions
   */
  public subscribeToTransactions(
    uid: string,
    onUpdate: (transactions: Transaction[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!uid) return () => {};

    try {
      const txColRef = collection(db, 'users', uid, 'transactions');
      return onSnapshot(
        txColRef,
        (snapshot) => {
          const txs: Transaction[] = [];
          snapshot.docs.forEach(docSnap => {
            const d = docSnap.data();
            if (d && d.amount !== undefined) {
              txs.push({
                id: docSnap.id,
                date: d.date || new Date().toISOString().split('T')[0],
                amount: Number(d.amount) || 0,
                type: d.type || 'expense',
                category: d.category || 'Other',
                subcategory: d.subcategory,
                account: d.account || 'Cash',
                note: d.note,
                description: d.description,
                source: d.source || 'cloud',
                excelRow: d.excelRow,
                updatedAt: d.updatedAt || new Date().toISOString()
              });
            }
          });

          // Sort by date descending
          txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          onUpdate(txs);
        },
        (error) => {
          console.warn('Realtime transactions snapshot listener notice:', error);
          if (onError) onError(error);
        }
      );
    } catch (err: any) {
      console.warn('Could not attach transactions snapshot listener:', err);
      return () => {};
    }
  }

  /**
   * Subscribes to real-time changes in /users/{uid} (profile, categories, goals)
   */
  public subscribeToUserProfile(
    uid: string,
    onUpdate: (profile: Partial<UserProfile> & { categories?: CategoryConfig; savingsGoals?: MonthlySavingsGoal[] }) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!uid) return () => {};

    try {
      const userDocRef = doc(db, 'users', uid);
      return onSnapshot(
        userDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            onUpdate(snapshot.data() as any);
          }
        },
        (error) => {
          console.warn('Realtime user profile snapshot listener notice:', error);
          if (onError) onError(error);
        }
      );
    } catch (err: any) {
      console.warn('Could not attach user profile listener:', err);
      return () => {};
    }
  }

  // ==========================================
  // Migration & Backward-Compatibility Layer
  // ==========================================

  /**
   * Scans all localStorage keys on this browser to discover any orphaned/imported transactions
   */
  public discoverAllLocalTransactions(currentUserId?: string): Transaction[] {
    const allFound = new Map<string, Transaction>();

    if (!currentUserId) return [];

    try {
      // Load this user's scoped local transactions
      const primary = this.loadLocalTransactions(currentUserId);
      primary.forEach(t => {
        if (t && t.id) allFound.set(t.id, t);
      });

      // Legacy single-user cache keys (strictly from v1 when keys had no user ID attached)
      const legacyKeys = ['myfinance_transactions', 'finance_transactions'];
      for (const key of legacyKeys) {
        try {
          const raw = safeGetItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (item && item.id && (item.amount !== undefined || item.type)) {
                if (!allFound.has(item.id)) {
                  allFound.set(item.id, item as Transaction);
                }
              }
            }
          }
        } catch {
          // ignore
        }
      }
    } catch (e) {
      console.warn('Local transaction discovery warning:', e);
    }

    return Array.from(allFound.values());
  }

  /**
   * Migrates legacy local storage transactions and legacy documents to /users/{uid}/transactions/{id}
   */
  public async migrateLegacyData(uid: string, user: UserProfile): Promise<{ migratedCount: number }> {
    if (!uid) return { migratedCount: 0 };

    try {
      const localTxs = this.discoverAllLocalTransactions(uid);
      if (localTxs.length === 0) {
        return { migratedCount: 0 };
      }

      // Check what transactions already exist in cloud
      const existingCloudTxs = await this.fetchCloudTransactions(uid);
      const existingIds = new Set(existingCloudTxs.map(t => t.id));

      const missingTxs = localTxs.filter(t => !existingIds.has(t.id));
      if (missingTxs.length === 0) {
        return { migratedCount: 0 };
      }

      // Batch write missing transactions in chunks of 450 (Firestore limit is 500)
      const chunkSize = 450;
      for (let i = 0; i < missingTxs.length; i += chunkSize) {
        const chunk = missingTxs.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        chunk.forEach(tx => {
          const docRef = doc(db, 'users', uid, 'transactions', tx.id);
          batch.set(docRef, {
            ...tx,
            userId: uid,
            updatedAt: tx.updatedAt || new Date().toISOString(),
            serverTimestamp: serverTimestamp()
          });
        });

        await batch.commit();
      }

      // Update user doc with categories and goals
      const categories = this.loadLocalCategories(uid);
      const savingsGoals = this.loadLocalSavingsGoals(uid);
      await this.saveCloudUserProfile(uid, {
        ...user,
        categories,
        savingsGoals
      });

      safeSetItem(STORAGE_KEYS.MIGRATION_FLAG(uid), 'true');
      return { migratedCount: missingTxs.length };
    } catch (err) {
      console.warn('Migration to subcollection notice:', err);
      return { migratedCount: 0 };
    }
  }

  // Backup Export and Import
  public createBackup(
    user: UserProfile | null | undefined,
    categories: CategoryConfig,
    transactions: Transaction[],
    goals: MonthlySavingsGoal[],
    ledgerId?: string
  ): FinanceDataBackup {
    return {
      schemaVersion: 4,
      exportedAt: new Date().toISOString(),
      owner: {
        username: user?.username || 'user',
        email: user?.email,
        displayName: user?.displayName || 'Finance User'
      },
      ledgerId: ledgerId || user?.ledgerId,
      currency: user?.currency || 'INR',
      categories,
      transactions,
      savingsGoals: goals
    };
  }

  // ==========================================
  // Cross-Device Cloud Ledger Sync Layer
  // ==========================================

  /**
   * Persists the entire ledger as a structured JSON document in Firestore /ledgers/{ledgerId}
   * Accessible by direct link or ledger code on any device
   */
  public async saveCloudLedger(ledgerId: string, ledgerData: CloudLedger): Promise<{ success: boolean; error?: string }> {
    if (!ledgerId) return { success: false, error: 'Ledger ID missing' };

    try {
      const docRef = doc(db, 'ledgers', ledgerId);
      const rawPayload = {
        id: ledgerId,
        ownerUid: ledgerData.ownerUid,
        name: ledgerData.name || 'Personal Finance Ledger',
        currency: ledgerData.currency || 'INR',
        categories: ledgerData.categories || DEFAULT_CATEGORIES,
        savingsGoals: Array.isArray(ledgerData.savingsGoals) ? ledgerData.savingsGoals : [],
        transactions: Array.isArray(ledgerData.transactions) ? ledgerData.transactions : [],
        deletedTransactionIds: Array.isArray(ledgerData.deletedTransactionIds) ? ledgerData.deletedTransactionIds : [],
        updatedAt: ledgerData.updatedAt || new Date().toISOString()
      };

      // Strip all undefined fields so Firestore setDoc does not throw
      const cleanPayload = JSON.parse(JSON.stringify(rawPayload));
      await setDoc(docRef, cleanPayload, { merge: true });

      return { success: true };
    } catch (err: any) {
      console.warn('Cloud Ledger save notice:', err);
      return { success: false, error: err?.message || 'Failed to sync ledger to cloud' };
    }
  }

  /**
   * Fetches the entire ledger JSON document from Firestore /ledgers/{ledgerId}
   */
  public async fetchCloudLedger(ledgerId: string): Promise<CloudLedger | null> {
    if (!ledgerId) return null;

    try {
      const docRef = doc(db, 'ledgers', ledgerId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as CloudLedger;
        return {
          id: ledgerId,
          ownerUid: data.ownerUid,
          name: data.name || 'Personal Finance Ledger',
          currency: data.currency || 'INR',
          categories: data.categories || DEFAULT_CATEGORIES,
          savingsGoals: Array.isArray(data.savingsGoals) ? data.savingsGoals : [],
          transactions: Array.isArray(data.transactions) ? data.transactions : [],
          deletedTransactionIds: Array.isArray(data.deletedTransactionIds) ? data.deletedTransactionIds : [],
          updatedAt: data.updatedAt || new Date().toISOString()
        };
      }
      return null;
    } catch (err) {
      console.warn('Error fetching cloud ledger:', err);
      return null;
    }
  }

  /**
   * Subscribes to real-time changes of the cloud ledger document /ledgers/{ledgerId}
   * When another device adds, edits, or removes transactions, this callback fires immediately
   */
  public subscribeToCloudLedgerByLedgerId(
    ledgerId: string,
    onData: (ledger: CloudLedger) => void,
    onError?: (err: any) => void
  ): Unsubscribe {
    if (!ledgerId) return () => {};

    const docRef = doc(db, 'ledgers', ledgerId);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as CloudLedger;
          onData({
            id: ledgerId,
            ownerUid: data.ownerUid,
            name: data.name || 'Personal Finance Ledger',
            currency: data.currency || 'INR',
            categories: data.categories || DEFAULT_CATEGORIES,
            savingsGoals: Array.isArray(data.savingsGoals) ? data.savingsGoals : [],
            transactions: Array.isArray(data.transactions) ? data.transactions : [],
            deletedTransactionIds: Array.isArray(data.deletedTransactionIds) ? data.deletedTransactionIds : [],
            updatedAt: data.updatedAt || new Date().toISOString()
          });
        }
      },
      (error) => {
        if (onError) onError(error);
        else console.warn('Cloud Ledger real-time subscription notice:', error);
      }
    );
  }

  public async saveCloudSnapshot(user: UserProfile | null, backup: FinanceDataBackup): Promise<void> {
    if (!user || !user.id) return;
    // Save locally
    this.saveLocalTransactions(user.id, backup.transactions);
    this.saveLocalCategories(user.id, backup.categories);
    this.saveLocalSavingsGoals(user.id, backup.savingsGoals);

    // Save profile and categories to Firestore /users/{uid}
    await this.saveCloudUserProfile(user.id, {
      ...user,
      categories: backup.categories,
      savingsGoals: backup.savingsGoals
    });
  }

  public async fetchCloudSnapshot(userIdOrName?: string): Promise<FinanceDataBackup | null> {
    if (!userIdOrName) return null;
    const txs = await this.fetchCloudTransactions(userIdOrName);
    if (txs.length === 0) return null;

    const cats = this.loadLocalCategories(userIdOrName);
    const goals = this.loadLocalSavingsGoals(userIdOrName);
    return {
      schemaVersion: 4,
      exportedAt: new Date().toISOString(),
      currency: 'INR',
      categories: cats,
      transactions: txs,
      savingsGoals: goals
    };
  }

  public subscribeToCloudLedger(
    userOrIdent: UserProfile | { id?: string; username?: string; email?: string } | string | undefined,
    onData: (backup: FinanceDataBackup) => void
  ): () => void {
    const uid = typeof userOrIdent === 'string' ? userOrIdent : userOrIdent?.id;
    if (!uid) return () => {};

    return this.subscribeToTransactions(uid, (txs) => {
      const cats = this.loadLocalCategories(uid);
      const goals = this.loadLocalSavingsGoals(uid);
      onData({
        schemaVersion: 4,
        exportedAt: new Date().toISOString(),
        currency: 'INR',
        categories: cats,
        transactions: txs,
        savingsGoals: goals
      });
    });
  }
}

export const storageService = FinanceStorageService.getInstance();
