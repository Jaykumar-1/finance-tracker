import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  CategoryConfig,
  CloudLedger,
  FinanceDataBackup,
  MonthlySavingsGoal,
  SyncState,
  Transaction,
  TransactionType,
  UserProfile
} from '../types/finance';
import { authService } from '../services/auth';
import { storageService } from '../services/storage';
import { DEFAULT_CATEGORIES } from '../utils/constants';
import { getSampleSavingsGoals, getSampleTransactions } from '../utils/sampleData';
import { generateId, getMonthKey, toIsoDate } from '../utils/formatters';
import { getTransactionFingerprint } from '../services/excel';
import confetti from 'canvas-confetti';

interface ToastInfo {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
}

export type AppPage = 'dashboard' | 'transactions' | 'income' | 'expenses' | 'investments' | 'analytics' | 'profile';

interface FinanceContextType {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  activePage: AppPage;
  setActivePage: (page: AppPage) => void;
  
  // Date & Period states
  currentMonth: Date;
  setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>;
  
  // Data
  transactions: Transaction[];
  categories: CategoryConfig;
  savingsGoals: MonthlySavingsGoal[];
  currency: string;
  setCurrency: (c: string) => void;
  
  // Operations
  addTransaction: (tx: Omit<Transaction, 'id' | 'updatedAt'>) => Promise<void>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  deleteTransactions: (ids: string[]) => Promise<void>;
  clearMonthTransactions: (monthKey: string) => Promise<void>;
  clearAllTransactions: () => Promise<void>;
  importTransactions: (
    newTxs: Transaction[],
    mode?: boolean | 'safe' | 'replace' | 'replace-months',
    totalInputRows?: number
  ) => Promise<{ addedCount: number; skippedCount: number; totalCount: number }>;
  
  // Excel Import Modal
  isExcelModalOpen: boolean;
  openExcelModal: () => void;
  closeExcelModal: () => void;
  
  // Category Operations
  saveCategory: (type: TransactionType, name: string, oldName?: string) => boolean;
  deleteCategory: (type: TransactionType, name: string) => void;
  saveSubcategory: (type: TransactionType, category: string, name: string, oldName?: string) => boolean;
  deleteSubcategory: (type: TransactionType, category: string, subcategory: string) => void;
  moveCategory: (type: TransactionType, name: string, direction: 'up' | 'down') => void;
  moveSubcategory: (type: TransactionType, category: string, subcategory: string, direction: 'up' | 'down') => void;
  reorderCategory: (type: TransactionType, name: string, targetIndex: number) => void;
  reorderSubcategory: (type: TransactionType, category: string, subcategory: string, targetIndex: number) => void;
  resetDefaultCategories: () => void;
  
  // Savings Goals Operations
  setSavingsGoal: (monthKey: string, targetSavings: number, expenseBudget?: number, note?: string) => void;
  getCurrentMonthGoal: (monthKey?: string) => MonthlySavingsGoal | undefined;
  
  // Multi-Device Cloud Sync State & Link
  ledgerId: string;
  shareableLink: string;
  copyLedgerLink: () => Promise<boolean>;
  switchLedger: (newLedgerId: string) => Promise<boolean>;
  syncState: SyncState;
  cloudInitialized: boolean;
  cloudLoading: boolean;
  triggerManualSync: () => Promise<void>;
  pullFromCloud: () => Promise<void>;
  loadDemoData: () => Promise<void>;
  
  // Toasts
  toasts: ToastInfo[];
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  
  // Modal Triggers
  isTxModalOpen: boolean;
  openTxModal: (type?: TransactionType, prefillDate?: string, editingTx?: Transaction) => void;
  closeTxModal: () => void;
  modalTxType: TransactionType;
  modalPrefillDate: string;
  editingTransaction: Transaction | null;

  isGoalModalOpen: boolean;
  openGoalModal: () => void;
  closeGoalModal: () => void;

  isAuthModalOpen: boolean;
  openAuthModal: (mode?: 'setup' | 'signin' | 'reset', prefillIdentifier?: string) => void;
  closeAuthModal: () => void;
  authModalInitialMode: 'setup' | 'signin' | 'reset';
  authModalPrefillIdentifier: string;

  isMultiDeviceModalOpen: boolean;
  openMultiDeviceModal: () => void;
  closeMultiDeviceModal: () => void;

  // Sidebar & Navigation toggle state
  isSidebarHidden: boolean;
  toggleSidebar: () => void;

  // Security Lock State
  isUnlocked: boolean;
  unlockLedger: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
  lockLedger: () => void;

  // Categories Modal
  isCategoryModalOpen: boolean;
  openCategoryModal: () => void;
  closeCategoryModal: () => void;

  triggerCelebration: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

// Helper to determine or initialize initial ledger ID from URL or storage
function getInitialLedgerId(): string {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const paramLedger = urlParams.get('ledger') || urlParams.get('sync') || urlParams.get('id');
    if (paramLedger && paramLedger.trim()) {
      const clean = paramLedger.trim();
      localStorage.setItem('myfinance_active_ledger_id', clean);
      return clean;
    }
    const saved = localStorage.getItem('myfinance_active_ledger_id');
    // If user has a valid saved ledger, use it
    if (saved && saved.trim() && saved !== 'undefined') {
      return saved.trim();
    }
  }
  // Default canonical ledger for seamless zero-configuration cross-device synchronization
  if (typeof window !== 'undefined') {
    localStorage.setItem('myfinance_active_ledger_id', 'main');
  }
  return 'main';
}

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Never trust a persisted Firebase session for this app's privacy gate.
  // A fresh browser visit must explicitly authenticate.
  const [user, setUserState] = useState<UserProfile | null>(null);
  const getPageFromHistory = (): AppPage => {
    if (typeof window === 'undefined') return 'dashboard';
    const statePage = window.history.state?.financeTrackerPage as AppPage | undefined;
    return statePage || 'dashboard';
  };
  const [activePage, setActivePageState] = useState<AppPage>(getPageFromHistory);

  // Keep SPA navigation in the browser history so Android/iOS Back returns
  // to the previously opened Finance Tracker screen instead of leaving the site.
  const setActivePage = useCallback((page: AppPage) => {
    setActivePageState(prev => {
      if (prev === page) return prev;
      if (typeof window !== 'undefined') {
        window.history.pushState({ ...(window.history.state || {}), financeTrackerPage: page }, '', window.location.href);
      }
      return page;
    });
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const page = (event.state?.financeTrackerPage as AppPage | undefined) || 'dashboard';
      setActivePageState(page);
    };

    // Seed the current entry without changing the URL.
    if (typeof window !== 'undefined' && !window.history.state?.financeTrackerPage) {
      window.history.replaceState(
        { ...(window.history.state || {}), financeTrackerPage: activePage },
        '',
        window.location.href
      );
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Multi-device Ledger identifier
  const [ledgerId, setLedgerIdState] = useState<string>(getInitialLedgerId);

  // Keep browser URL synced with current ledger ID without full reload
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (ledgerId !== 'main') {
        if (url.searchParams.get('ledger') !== ledgerId) {
          url.searchParams.set('ledger', ledgerId);
          window.history.replaceState({ ...(window.history.state || {}), financeTrackerPage: activePage }, '', url.toString());
        }
      } else {
        // For main ledger, allow clean URL without query param
        if (url.searchParams.get('ledger') && url.searchParams.get('ledger') === 'main') {
          // Keep as is or clean
        }
      }
    }
  }, [activePage, ledgerId, user?.id]);

  // Sidebar toggle state (persisted)
  const [isSidebarHidden, setIsSidebarHidden] = useState<boolean>(() => {
    const saved = localStorage.getItem('myfinance_sidebar_hidden');
    return saved === 'true';
  });

  const toggleSidebar = useCallback(() => {
    setIsSidebarHidden(prev => {
      const next = !prev;
      localStorage.setItem('myfinance_sidebar_hidden', String(next));
      return next;
    });
  }, []);

  // Lock state
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);

  // Force an explicit login on every browser load/reload. Firebase may otherwise
  // restore its persistent auth session automatically.
  useEffect(() => {
    let mounted = true;
    (async () => {
      await authService.forceFreshSession();
      if (mounted) {
        setUserState(null);
        setIsUnlocked(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Calendar month state
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const activeUserId = user ? user.id : ledgerId;

  // Initial local states for instant render with local recovery
  const [categories, setCategories] = useState<CategoryConfig>(() => storageService.loadLocalCategories(activeUserId));
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const local = storageService.loadLocalTransactions(activeUserId);
    if (local.length > 0) return local;
    const fallback = storageService.loadAnyLocalTransactions(activeUserId);
    if (fallback.length > 0) return fallback;
    return [];
  });
  // Tombstones prevent a transaction deleted on one device from being resurrected by
  // a slightly older real-time snapshot arriving from another device.
  const [deletedTransactionIds, setDeletedTransactionIds] = useState<string[]>([]);
  const transactionsRef = useRef<Transaction[]>(transactions);
  const deletedTransactionIdsRef = useRef<string[]>(deletedTransactionIds);
  useEffect(() => { transactionsRef.current = transactions; }, [transactions]);
  useEffect(() => { deletedTransactionIdsRef.current = deletedTransactionIds; }, [deletedTransactionIds]);
  const [savingsGoals, setSavingsGoals] = useState<MonthlySavingsGoal[]>(() => storageService.loadLocalSavingsGoals(activeUserId));
  const [currency, setCurrencyState] = useState<string>(user?.currency || 'INR');

  // Cloud initialization and sync guards
  const [cloudLoading, setCloudLoading] = useState<boolean>(true);
  const [cloudInitialized, setCloudInitialized] = useState<boolean>(false);

  // Multi-device Shareable Link
  const shareableLink = useMemo(() => {
    if (typeof window !== 'undefined') {
      const base = `${window.location.origin}${window.location.pathname}`;
      return ledgerId === 'main' ? base : `${base}?ledger=${ledgerId}`;
    }
    return ledgerId === 'main' ? '/' : `?ledger=${ledgerId}`;
  }, [ledgerId]);

  // Sync state
  const [syncState, setSyncState] = useState<SyncState>(() => ({
    status: navigator.onLine ? 'synced' : 'offline',
    lastSyncTime: new Date().toLocaleTimeString(),
    pendingChangesCount: 0,
    message: navigator.onLine ? 'Cloud JSON sync active' : 'Offline mode active (cached locally)',
    ledgerId,
    shareableLink
  }));

  // Update sync state when ledgerId or shareableLink changes
  useEffect(() => {
    setSyncState(prev => ({
      ...prev,
      ledgerId,
      shareableLink
    }));
  }, [ledgerId, shareableLink]);

  // Toasts
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [modalTxType, setModalTxType] = useState<TransactionType>('expense');
  const [modalPrefillDate, setModalPrefillDate] = useState<string>(toIsoDate(new Date()));
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'setup' | 'signin' | 'reset'>('signin');
  const [authModalPrefillIdentifier, setAuthModalPrefillIdentifier] = useState<string>('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isMultiDeviceModalOpen, setIsMultiDeviceModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Debounced Cloud Ledger Auto-Sync
  const cloudSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Every cloud write captures this epoch. A full erase increments it so an
  // already scheduled autosync cannot write the pre-erase transaction set back.
  const cloudWriteEpochRef = useRef(0);
  const lastFullEraseAtRef = useRef<string | null>(null);
  // UpdatedAt of the most recent local cloud write. Realtime snapshots with a
  // different value came from another device and must invalidate stale queued writes.
  const lastLocalCloudUpdateAtRef = useRef<string | null>(null);

  const persistToCloudLedger = useCallback((
    txs = transactions,
    cats = categories,
    goals = savingsGoals,
    curr = currency,
    lid = ledgerId,
    deletedIds = deletedTransactionIds
  ) => {
    if (cloudSyncTimeoutRef.current) {
      clearTimeout(cloudSyncTimeoutRef.current);
    }

    const writeEpoch = cloudWriteEpochRef.current;
    cloudSyncTimeoutRef.current = setTimeout(async () => {
      // Do not execute a pre-erase write.
      if (writeEpoch !== cloudWriteEpochRef.current) return;
      try {
        setSyncState(prev => ({ ...prev, status: 'syncing', message: 'Syncing to cloud ledger...' }));
        const cloudUpdatedAt = new Date().toISOString();
        lastLocalCloudUpdateAtRef.current = cloudUpdatedAt;
        const ledgerData: CloudLedger = {
          id: lid,
          ownerUid: user?.id,
          currency: curr,
          categories: cats,
          savingsGoals: goals,
          transactions: txs,
          deletedTransactionIds: deletedIds,
          resetAt: lastFullEraseAtRef.current || undefined,
          updatedAt: cloudUpdatedAt
        };

        // A clear operation may have happened while this callback was waiting.
        if (writeEpoch !== cloudWriteEpochRef.current) return;
        const res = await storageService.saveCloudLedger(lid, ledgerData);
        // Also keep canonical 'main' ledger in sync so devices visiting direct link immediately see data
        if (lid !== 'main' && writeEpoch === cloudWriteEpochRef.current) {
          storageService.saveCloudLedger('main', { ...ledgerData, id: 'main' }).catch(() => {});
        }

        if (res.success) {
          setSyncState(prev => ({
            ...prev,
            status: 'synced',
            lastSyncTime: new Date().toLocaleTimeString(),
            message: `Synced across devices (${txs.length} transactions)`
          }));
        } else {
          setSyncState(prev => ({
            ...prev,
            status: 'offline',
            message: 'Saved locally. Will sync when reconnected.'
          }));
        }
      } catch (e) {
        console.warn('Cloud Ledger auto-sync notice:', e);
      }
    }, 600);
  }, [categories, currency, deletedTransactionIds, ledgerId, savingsGoals, transactions]);

  // Online / Offline status detector
  useEffect(() => {
    const handleOnline = () => {
      setSyncState(prev => ({
        ...prev,
        status: 'synced',
        lastSyncTime: new Date().toLocaleTimeString(),
        pendingChangesCount: 0,
        message: 'Online connection restored. Cloud JSON synced.'
      }));
      showToast('Connection restored. Data synced with cloud!', 'success');
      persistToCloudLedger(transactions, categories, savingsGoals, currency, ledgerId);
    };

    const handleOffline = () => {
      setSyncState(prev => ({
        ...prev,
        status: 'offline',
        message: 'Offline mode active. All entries safely stored on this device.'
      }));
      showToast('You are offline. Data is saved locally and will sync when online.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [categories, currency, ledgerId, persistToCloudLedger, savingsGoals, showToast, transactions]);

  // ==========================================
  // Canonical Cloud Ledger & Auth Synchronization
  // ==========================================
  useEffect(() => {
    let isMounted = true;
    let unsubLedger: (() => void) | null = null;
    let unsubUserTxs: (() => void) | null = null;
    let unsubUserProfile: (() => void) | null = null;

    const initializeData = async () => {
      setCloudLoading(true);
      setCloudInitialized(false);

      // No cloud read is attempted until the user has explicitly authenticated.
      // This prevents the old public-link behaviour from exposing ledger data.
      if (!user?.id) {
        if (isMounted) {
          setCloudInitialized(true);
          setCloudLoading(false);
          setSyncState(prev => ({ ...prev, status: 'pending', message: 'Sign in to access your private ledger.' }));
        }
        return;
      }

      const targetId = ledgerId || 'main';
      try {
        let cloudLedger = await storageService.fetchCloudLedger(targetId);

        // Only fall back to the canonical main ledger when the requested ledger
        // document does not exist. An existing empty ledger is an intentional
        // empty state and must never be replaced with older main-ledger data.
        if (!cloudLedger && targetId !== 'main') {
          cloudLedger = await storageService.fetchCloudLedger('main');
        }

        if (cloudLedger && isMounted) {
          if (cloudLedger.ownerUid && cloudLedger.ownerUid !== user.id) {
            throw new Error('This ledger belongs to another account.');
          }
          // Claim a legacy public ledger for the authenticated owner on first login.
          if (!cloudLedger.ownerUid) {
            await storageService.saveCloudLedger(targetId, { ...cloudLedger, ownerUid: user.id });
            cloudLedger = { ...cloudLedger, ownerUid: user.id };
          }
          const remoteResetAt = cloudLedger.resetAt || null;
          if (remoteResetAt) lastFullEraseAtRef.current = remoteResetAt;
          const remoteTxs = remoteResetAt
            ? (cloudLedger.transactions || []).filter(tx => new Date(tx.updatedAt || 0).getTime() > new Date(remoteResetAt).getTime())
            : (cloudLedger.transactions || []);
          // The cloud ledger is the canonical shared JSON document. Once it exists,
          // its snapshot is authoritative; merging stale local data here is what
          // previously caused deleted transactions to reappear.
          setTransactions(remoteTxs);
          setDeletedTransactionIds(cloudLedger.deletedTransactionIds || []);
          transactionsRef.current = remoteTxs;
          deletedTransactionIdsRef.current = cloudLedger.deletedTransactionIds || [];
          storageService.saveLocalTransactions(targetId, remoteTxs);
          storageService.saveLocalTransactions('main', remoteTxs);
          if (cloudLedger.categories) {
            setCategories(cloudLedger.categories);
            storageService.saveLocalCategories(targetId, cloudLedger.categories);
          }
          if (cloudLedger.savingsGoals) {
            setSavingsGoals(cloudLedger.savingsGoals);
            storageService.saveLocalSavingsGoals(targetId, cloudLedger.savingsGoals);
          }
          if (cloudLedger.currency) setCurrencyState(cloudLedger.currency);
          setSyncState(prev => ({
            ...prev,
            status: 'synced',
            lastSyncTime: new Date().toLocaleTimeString(),
            message: `Loaded ${cloudLedger.transactions?.length || 0} records from private cloud`
          }));
        } else if (isMounted) {
          const localTxs = storageService.loadAnyLocalTransactions(targetId);
          const localCats = storageService.loadLocalCategories(targetId);
          const localGoals = storageService.loadLocalSavingsGoals(targetId);
          if (localTxs.length > 0) {
            setTransactions(localTxs);
            const initialPayload: CloudLedger = {
              id: targetId,
              ownerUid: user.id,
              currency: currency || 'INR',
              categories: localCats,
              savingsGoals: localGoals,
              transactions: localTxs,
              updatedAt: new Date().toISOString()
            };
            await storageService.saveCloudLedger(targetId, initialPayload);
            if (targetId !== 'main') {
              await storageService.saveCloudLedger('main', { ...initialPayload, id: 'main' });
            }
            setSyncState(prev => ({ ...prev, status: 'synced', lastSyncTime: new Date().toLocaleTimeString(), message: `Synced ${localTxs.length} local records to private cloud` }));
          }
        }

        unsubLedger = storageService.subscribeToCloudLedgerByLedgerId(targetId, (updatedLedger) => {
          if (!isMounted) return;
          if (updatedLedger.ownerUid && updatedLedger.ownerUid !== user.id) {
            setSyncState(prev => ({ ...prev, status: 'error', message: 'This ledger belongs to another account.' }));
            return;
          }
          if (Array.isArray(updatedLedger.transactions)) {
            const remoteResetAt = updatedLedger.resetAt || null;
            // A snapshot that did not originate from this device invalidates any
            // queued autosync based on older local state. This is essential for
            // cross-device deletes and especially for a full erase.
            if (updatedLedger.updatedAt !== lastLocalCloudUpdateAtRef.current) {
              cloudWriteEpochRef.current += 1;
              if (cloudSyncTimeoutRef.current) {
                clearTimeout(cloudSyncTimeoutRef.current);
                cloudSyncTimeoutRef.current = null;
              }
            }
            if (remoteResetAt) lastFullEraseAtRef.current = remoteResetAt;
            // A reset marker is authoritative: any transaction older than the
            // reset belongs to the pre-erase dataset and must not be resurrected.
            const remoteTxs = remoteResetAt
              ? updatedLedger.transactions.filter(tx => new Date(tx.updatedAt || 0).getTime() > new Date(remoteResetAt).getTime())
              : updatedLedger.transactions;
            // The cloud ledger is authoritative. Never merge the current device's
            // stale cache back into a realtime snapshot.
            setTransactions(remoteTxs);
            setDeletedTransactionIds(updatedLedger.deletedTransactionIds || []);
            transactionsRef.current = remoteTxs;
            deletedTransactionIdsRef.current = updatedLedger.deletedTransactionIds || [];
            storageService.saveLocalTransactions(targetId, remoteTxs);
            storageService.saveLocalTransactions('main', remoteTxs);
          }
          if (updatedLedger.categories) {
            setCategories(updatedLedger.categories);
            storageService.saveLocalCategories(targetId, updatedLedger.categories);
          }
          if (updatedLedger.savingsGoals) {
            setSavingsGoals(updatedLedger.savingsGoals);
            storageService.saveLocalSavingsGoals(targetId, updatedLedger.savingsGoals);
          }
          if (updatedLedger.currency) setCurrencyState(updatedLedger.currency);
          setSyncState(prev => ({ ...prev, status: 'synced', lastSyncTime: new Date().toLocaleTimeString(), message: 'Private real-time cloud sync active' }));
        }, (error) => {
          console.warn('Private cloud ledger listener:', error);
          setSyncState(prev => ({ ...prev, status: 'error', message: 'Cloud access denied. Please sign in again.' }));
        });
      } catch (err) {
        console.warn('Initial private cloud ledger sync notice:', err);
        if (isMounted) setSyncState(prev => ({ ...prev, status: 'error', message: 'Unable to access private cloud ledger.' }));
      }

      if (isMounted) {
        setCloudInitialized(true);
        setCloudLoading(false);
      }
    };

    initializeData();

    return () => {
      isMounted = false;
      if (unsubLedger) unsubLedger();
      if (unsubUserTxs) unsubUserTxs();
      if (unsubUserProfile) unsubUserProfile();
    };
  }, [ledgerId, user?.id]);

  const setUser = useCallback((newUser: UserProfile | null) => {
    setUserState(newUser);
    authService.setCurrentUser(newUser);

    const uid = newUser ? newUser.id : ledgerId;
    const cats = storageService.loadLocalCategories(uid);
    const txs = storageService.loadLocalTransactions(uid);
    const goals = storageService.loadLocalSavingsGoals(uid);

    setCategories(cats);
    setTransactions(txs);
    setSavingsGoals(goals);
    if (newUser?.currency) {
      setCurrencyState(newUser.currency);
    }

    if (newUser) {
      persistToCloudLedger(txs, cats, goals, newUser.currency || 'INR', ledgerId);
    }
  }, [ledgerId, persistToCloudLedger]);

  const setCurrency = useCallback((c: string) => {
    setCurrencyState(c);
    if (user) {
      const updatedUser = { ...user, currency: c };
      setUserState(updatedUser);
      authService.setCurrentUser(updatedUser);
      storageService.saveCloudUserProfile(user.id, { currency: c });
    }
    persistToCloudLedger(transactions, categories, savingsGoals, c, ledgerId);
  }, [categories, ledgerId, persistToCloudLedger, savingsGoals, transactions, user]);

  // Copy shareable multi-device link to clipboard
  const copyLedgerLink = useCallback(async (): Promise<boolean> => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareableLink);
        showToast('Link copied! Open this URL on your phone or any device to view and sync your data.', 'success');
        return true;
      } else {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = shareableLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Link copied to clipboard!', 'success');
        return true;
      }
    } catch {
      showToast(`Your Link: ${shareableLink}`, 'info');
      return false;
    }
  }, [shareableLink, showToast]);

  // Switch to an existing ledger ID (from another device)
  const switchLedger = useCallback(async (newLedgerId: string): Promise<boolean> => {
    const cleanId = newLedgerId.trim();
    if (!cleanId) {
      showToast('Please enter a valid Ledger ID or link.', 'warning');
      return false;
    }

    // Extract ID if full URL was pasted
    let finalId = cleanId;
    if (cleanId.includes('ledger=')) {
      const match = cleanId.match(/ledger=([^&]+)/);
      if (match && match[1]) {
        finalId = match[1];
      }
    }

    setCloudLoading(true);
    try {
      const fetched = await storageService.fetchCloudLedger(finalId);
      setLedgerIdState(finalId);
      localStorage.setItem('myfinance_active_ledger_id', finalId);

      if (fetched) {
        if (fetched.transactions) {
          setTransactions(fetched.transactions);
          storageService.saveLocalTransactions(finalId, fetched.transactions);
        }
        if (fetched.categories) {
          setCategories(fetched.categories);
          storageService.saveLocalCategories(finalId, fetched.categories);
        }
        if (fetched.savingsGoals) {
          setSavingsGoals(fetched.savingsGoals);
          storageService.saveLocalSavingsGoals(finalId, fetched.savingsGoals);
        }
        if (fetched.currency) {
          setCurrencyState(fetched.currency);
        }
        showToast(`Connected to ledger "${finalId}"! Data loaded (${fetched.transactions.length} items).`, 'success');
      } else {
        showToast(`Connected to new ledger "${finalId}". Any entries you add will sync here.`, 'info');
      }

      setCloudLoading(false);
      return true;
    } catch (err: any) {
      showToast(err?.message || 'Failed to connect to ledger.', 'error');
      setCloudLoading(false);
      return false;
    }
  }, [showToast]);

  // ==========================================
  // Atomic Transaction CRUD Operations
  // ==========================================

  const addTransaction = useCallback(async (txData: Omit<Transaction, 'id' | 'updatedAt'>) => {
    const newTx: Transaction = {
      ...txData,
      id: generateId(),
      updatedAt: new Date().toISOString()
    };

    const nextTxs = [newTx, ...transactions];
    setTransactions(nextTxs);
    storageService.saveLocalTransactions(activeUserId, nextTxs);
    storageService.saveLocalTransactions(ledgerId, nextTxs);

    // Save to Firestore user subcollection if signed in
    if (user && user.id) {
      storageService.addTransaction(user.id, newTx).catch(() => {});
    }

    // Sync to Cloud Ledger document for real-time cross-device reflection
    persistToCloudLedger(nextTxs, categories, savingsGoals, currency, ledgerId);

    showToast(
      `${newTx.type === 'income' ? 'Income' : newTx.type === 'investment' ? 'Investment' : 'Expense'} of ${newTx.amount} added!`,
      'success'
    );
  }, [activeUserId, categories, currency, deletedTransactionIds, ledgerId, persistToCloudLedger, savingsGoals, showToast, transactions, user]);

  const updateTransaction = useCallback(async (updated: Transaction) => {
    const nextTx = { ...updated, updatedAt: new Date().toISOString() };
    const nextTxs = transactions.map(t => t.id === updated.id ? nextTx : t);

    setTransactions(nextTxs);
    storageService.saveLocalTransactions(activeUserId, nextTxs);
    storageService.saveLocalTransactions(ledgerId, nextTxs);

    if (user && user.id) {
      storageService.updateTransaction(user.id, nextTx).catch(() => {});
    }

    persistToCloudLedger(nextTxs, categories, savingsGoals, currency, ledgerId);
    showToast('Transaction updated successfully.', 'success');
  }, [activeUserId, categories, currency, deletedTransactionIds, ledgerId, persistToCloudLedger, savingsGoals, showToast, transactions, user]);

  const deleteTransaction = useCallback(async (id: string) => {
    const nextTxs = transactions.filter(t => t.id !== id);
    const nextDeletedIds = Array.from(new Set([...deletedTransactionIds, id]));

    setTransactions(nextTxs);
    setDeletedTransactionIds(nextDeletedIds);
    storageService.saveLocalTransactions(activeUserId, nextTxs);
    storageService.saveLocalTransactions(ledgerId, nextTxs);

    if (user && user.id) {
      storageService.deleteTransaction(user.id, id).catch(() => {});
    }

    persistToCloudLedger(nextTxs, categories, savingsGoals, currency, ledgerId, nextDeletedIds);
    showToast('Transaction deleted.', 'info');
  }, [activeUserId, categories, currency, deletedTransactionIds, ledgerId, persistToCloudLedger, savingsGoals, showToast, transactions, user]);

  const deleteTransactions = useCallback(async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    const nextTxs = transactions.filter(t => !idSet.has(t.id));
    const nextDeletedIds = Array.from(new Set([...deletedTransactionIds, ...ids]));

    setTransactions(nextTxs);
    setDeletedTransactionIds(nextDeletedIds);
    storageService.saveLocalTransactions(activeUserId, nextTxs);
    storageService.saveLocalTransactions(ledgerId, nextTxs);

    if (user && user.id) {
      ids.forEach(id => {
        storageService.deleteTransaction(user.id, id).catch(() => {});
      });
    }

    persistToCloudLedger(nextTxs, categories, savingsGoals, currency, ledgerId, nextDeletedIds);
    showToast(`${ids.length} transaction${ids.length === 1 ? '' : 's'} removed.`, 'info');
  }, [activeUserId, categories, currency, deletedTransactionIds, ledgerId, persistToCloudLedger, savingsGoals, showToast, transactions, user]);

  const clearMonthTransactions = useCallback(async (monthKey: string) => {
    const nextTxs = transactions.filter(t => getMonthKey(t.date) !== monthKey);
    const removedIds = transactions.filter(t => getMonthKey(t.date) === monthKey).map(t => t.id);
    const nextDeletedIds = Array.from(new Set([...deletedTransactionIds, ...removedIds]));
    const removedCount = transactions.length - nextTxs.length;

    if (removedCount === 0) {
      showToast(`No transactions found in ${monthKey}.`, 'info');
      return;
    }

    setTransactions(nextTxs);
    setDeletedTransactionIds(nextDeletedIds);
    storageService.saveLocalTransactions(activeUserId, nextTxs);
    storageService.saveLocalTransactions(ledgerId, nextTxs);

    if (user && user.id) {
      const removed = transactions.filter(t => getMonthKey(t.date) === monthKey);
      removed.forEach(t => {
        storageService.deleteTransaction(user.id, t.id).catch(() => {});
      });
    }

    persistToCloudLedger(nextTxs, categories, savingsGoals, currency, ledgerId, nextDeletedIds);
    showToast(`Removed all ${removedCount} transactions from ${monthKey}.`, 'info');
  }, [activeUserId, categories, currency, deletedTransactionIds, ledgerId, persistToCloudLedger, savingsGoals, showToast, transactions, user]);

  const clearAllTransactions = useCallback(async () => {
    // Full erase: remove every transaction JSON cache and reset the cloud ledger
    // itself to an explicitly empty transaction array. Do not touch auth/profile.
    // Tombstones are also cleared so the exact same Excel file can be imported
    // again as fresh transactions.
    const resetAt = new Date().toISOString();
    cloudWriteEpochRef.current += 1;
    lastFullEraseAtRef.current = resetAt;
    if (cloudSyncTimeoutRef.current) {
      clearTimeout(cloudSyncTimeoutRef.current);
      cloudSyncTimeoutRef.current = null;
    }

    setTransactions([]);
    setDeletedTransactionIds([]);
    transactionsRef.current = [];
    deletedTransactionIdsRef.current = [];

    storageService.purgeLocalTransactions(activeUserId);
    storageService.purgeLocalTransactions(ledgerId);

    if (user && user.id) {
      await storageService.clearAllCloudTransactions(user.id).catch(() => {});
    }

    const emptyLedger: CloudLedger = {
      id: ledgerId,
      ownerUid: user?.id,
      currency,
      categories,
      savingsGoals,
      transactions: [],
      deletedTransactionIds: [],
      resetAt,
      updatedAt: resetAt
    };

    // Write synchronously (from the caller's perspective) instead of using the
    // debounced autosync. This prevents a previously queued non-empty snapshot
    // from being written back after the erase. Keep both canonical ledger docs
    // empty so the next initialization cannot recover old transactions.
    const clearResult = await storageService.saveCloudLedger(ledgerId, emptyLedger);
    if (!clearResult.success) {
      throw new Error(clearResult.error || 'Failed to clear the cloud transaction ledger.');
    }
    if (ledgerId !== 'main') {
      const mainClearResult = await storageService.saveCloudLedger('main', { ...emptyLedger, id: 'main' });
      if (!mainClearResult.success) {
        throw new Error(mainClearResult.error || 'Failed to clear the main cloud transaction ledger.');
      }
    }

    setSyncState(prev => ({
      ...prev,
      status: 'synced',
      lastSyncTime: new Date().toLocaleTimeString(),
      message: 'Ledger cleared; ready for fresh Excel import'
    }));
    showToast('All transaction records and sample data were erased. Login credentials were kept.', 'warning');
  }, [activeUserId, categories, currency, ledgerId, savingsGoals, showToast, user]);

  const importTransactions = useCallback(async (
    newTxs: Transaction[],
    mode: boolean | 'safe' | 'replace' | 'replace-months' = 'safe',
    totalInputRows?: number
  ): Promise<{ addedCount: number; skippedCount: number; totalCount: number }> => {
    if (!newTxs || newTxs.length === 0) {
      showToast('No valid transactions found to import.', 'warning');
      return { addedCount: 0, skippedCount: 0, totalCount: 0 };
    }

    const effectiveMode = typeof mode === 'boolean' ? (mode ? 'replace' : 'safe') : mode;

    let finalTxs: Transaction[];
    let addedTxs: Transaction[] = [];
    let skippedCount = 0;

    if (effectiveMode === 'replace') {
      finalTxs = newTxs;
      addedTxs = newTxs;
      skippedCount = 0;
    } else if (effectiveMode === 'replace-months') {
      // Find all distinct months represented in new transactions
      const incomingMonths = new Set(newTxs.map(t => getMonthKey(t.date)));
      // Filter out existing transactions from those months
      const retainedTxs = transactions.filter(t => !incomingMonths.has(getMonthKey(t.date)));
      finalTxs = [...retainedTxs, ...newTxs];
      addedTxs = newTxs;
      skippedCount = 0;
    } else {
      // Safe deduplication mode. Excel imports are MERGE-ONLY:
      // - Existing transactions stay untouched.
      // - A row already present in the ledger is skipped, even when Excel generated a new ID.
      // - Only genuinely new rows are appended.
      // - Duplicate rows inside the same incoming file are also handled consistently.
      const existingIds = new Set<string>();
      const existingFingerprints = new Set<string>();

      for (const t of transactions) {
        if (t.id) existingIds.add(t.id);
        existingFingerprints.add(getTransactionFingerprint(t));
      }

      // A fingerprint is treated as an idempotency key for Excel imports. Once a
      // transaction with the same normalized contents exists, importing the same
      // row again must never create another copy. The previous count-based logic
      // allowed a third copy when the ledger already contained two copies.
      const acceptedIncomingFingerprints = new Set<string>();

      for (const incoming of newTxs) {
        if (incoming.id && existingIds.has(incoming.id)) {
          skippedCount++;
          continue;
        }

        const fp = getTransactionFingerprint(incoming);
        if (existingFingerprints.has(fp) || acceptedIncomingFingerprints.has(fp)) {
          skippedCount++;
          continue;
        }

        addedTxs.push(incoming);
        acceptedIncomingFingerprints.add(fp);
        existingFingerprints.add(fp);
        if (incoming.id) existingIds.add(incoming.id);
      }

      finalTxs = [...transactions, ...addedTxs];
    }

    // If nothing new was added and duplicates were skipped
    if (addedTxs.length === 0 && skippedCount > 0) {
      showToast(`All ${newTxs.length} transaction${newTxs.length === 1 ? '' : 's'} already exist in your ledger. No duplicates added.`, 'info');
      return { addedCount: 0, skippedCount, totalCount: transactions.length };
    }

    const importedIds = new Set(newTxs.map(t => t.id));
    const nextDeletedIds = deletedTransactionIds.filter(id => !importedIds.has(id));
    setTransactions(finalTxs);
    setDeletedTransactionIds(nextDeletedIds);
    storageService.saveLocalTransactions(activeUserId, finalTxs);
    storageService.saveLocalTransactions(ledgerId, finalTxs);

    if (user && user.id) {
      for (const tx of addedTxs) {
        storageService.addTransaction(user.id, tx).catch(() => {});
      }
    }

    persistToCloudLedger(finalTxs, categories, savingsGoals, currency, ledgerId, nextDeletedIds);

    const processedRows = totalInputRows ?? newTxs.length;
    showToast(
      `Excel import complete: ${processedRows} rows processed • ${addedTxs.length} new added • ${skippedCount} duplicates skipped • ${finalTxs.length} total stored`,
      skippedCount > 0 ? 'info' : 'success'
    );

    return { addedCount: addedTxs.length, skippedCount, totalCount: finalTxs.length };
  }, [activeUserId, categories, currency, deletedTransactionIds, ledgerId, persistToCloudLedger, savingsGoals, showToast, transactions, user]);

  const loadDemoData = useCallback(async () => {
    const demo = getSampleTransactions();
    const demoGoals = getSampleSavingsGoals();
    setTransactions(demo);
    setSavingsGoals(demoGoals);
    storageService.saveLocalTransactions(activeUserId, demo);
    storageService.saveLocalSavingsGoals(activeUserId, demoGoals);

    if (user && user.id) {
      for (const tx of demo) {
        storageService.addTransaction(user.id, tx).catch(() => {});
      }
      storageService.saveCloudUserProfile(user.id, {
        categories,
        savingsGoals: demoGoals
      }).catch(() => {});
    }

    persistToCloudLedger(demo, categories, demoGoals, currency, ledgerId);
    showToast('Demo dataset loaded with starter transactions and goals!', 'info');
  }, [activeUserId, categories, currency, ledgerId, persistToCloudLedger, showToast, user]);

  // ==========================================
  // Categories Operations
  // ==========================================

  const saveCategory = useCallback((type: TransactionType, name: string, oldName?: string): boolean => {
    const cleanName = name.trim();
    if (!cleanName) return false;

    let success = false;
    setCategories(prev => {
      const currentMap = { ...prev[type] };
      if (oldName && oldName !== cleanName) {
        const subcats = currentMap[oldName] || [];
        delete currentMap[oldName];
        currentMap[cleanName] = subcats;
      } else if (!currentMap[cleanName]) {
        currentMap[cleanName] = [];
      }
      const updated = { ...prev, [type]: currentMap };
      storageService.saveLocalCategories(activeUserId, updated);
      storageService.saveLocalCategories(ledgerId, updated);
      if (user) {
        storageService.saveCloudUserProfile(user.id, { categories: updated }).catch(() => {});
      }
      persistToCloudLedger(transactions, updated, savingsGoals, currency, ledgerId);
      success = true;
      return updated;
    });

    if (success) {
      showToast(`Category "${cleanName}" saved.`, 'success');
    }
    return success;
  }, [activeUserId, currency, ledgerId, persistToCloudLedger, savingsGoals, showToast, transactions, user]);

  const deleteCategory = useCallback((type: TransactionType, name: string) => {
    setCategories(prev => {
      const currentMap = { ...prev[type] };
      delete currentMap[name];
      const updated = { ...prev, [type]: currentMap };
      storageService.saveLocalCategories(activeUserId, updated);
      storageService.saveLocalCategories(ledgerId, updated);
      if (user) {
        storageService.saveCloudUserProfile(user.id, { categories: updated }).catch(() => {});
      }
      persistToCloudLedger(transactions, updated, savingsGoals, currency, ledgerId);
      return updated;
    });
    showToast(`Category "${name}" deleted.`, 'info');
  }, [activeUserId, currency, ledgerId, persistToCloudLedger, savingsGoals, showToast, transactions, user]);

  const saveSubcategory = useCallback((type: TransactionType, category: string, name: string, oldName?: string): boolean => {
    const cleanName = name.trim();
    if (!cleanName) return false;

    let success = false;
    setCategories(prev => {
      const currentMap = { ...prev[type] };
      const subcats = [...(currentMap[category] || [])];

      if (oldName && oldName !== cleanName) {
        const idx = subcats.indexOf(oldName);
        if (idx !== -1) subcats[idx] = cleanName;
        else subcats.push(cleanName);
      } else if (!subcats.includes(cleanName)) {
        subcats.push(cleanName);
      }

      currentMap[category] = subcats;
      const updated = { ...prev, [type]: currentMap };
      storageService.saveLocalCategories(activeUserId, updated);
      storageService.saveLocalCategories(ledgerId, updated);
      if (user) {
        storageService.saveCloudUserProfile(user.id, { categories: updated }).catch(() => {});
      }
      persistToCloudLedger(transactions, updated, savingsGoals, currency, ledgerId);
      success = true;
      return updated;
    });

    if (success) {
      showToast(`Subcategory "${cleanName}" saved.`, 'success');
    }
    return success;
  }, [activeUserId, currency, ledgerId, persistToCloudLedger, savingsGoals, showToast, transactions, user]);

  const deleteSubcategory = useCallback((type: TransactionType, category: string, subcategory: string) => {
    setCategories(prev => {
      const currentMap = { ...prev[type] };
      const subcats = (currentMap[category] || []).filter(s => s !== subcategory);
      currentMap[category] = subcats;
      const updated = { ...prev, [type]: currentMap };
      storageService.saveLocalCategories(activeUserId, updated);
      storageService.saveLocalCategories(ledgerId, updated);
      if (user) {
        storageService.saveCloudUserProfile(user.id, { categories: updated }).catch(() => {});
      }
      persistToCloudLedger(transactions, updated, savingsGoals, currency, ledgerId);
      return updated;
    });
    showToast(`Subcategory "${subcategory}" deleted.`, 'info');
  }, [activeUserId, currency, ledgerId, persistToCloudLedger, savingsGoals, showToast, transactions, user]);

  const moveCategory = useCallback((type: TransactionType, name: string, direction: 'up' | 'down') => {
    setCategories(prev => {
      const names = Object.keys(prev[type] || {});
      const index = names.indexOf(name);
      const target = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= names.length) return prev;

      const reorderedNames = [...names];
      [reorderedNames[index], reorderedNames[target]] = [reorderedNames[target], reorderedNames[index]];
      const reordered: Record<string, string[]> = {};
      reorderedNames.forEach(key => { reordered[key] = prev[type][key]; });
      const updated = { ...prev, [type]: reordered };
      storageService.saveLocalCategories(activeUserId, updated);
      storageService.saveLocalCategories(ledgerId, updated);
      if (user) storageService.saveCloudUserProfile(user.id, { categories: updated }).catch(() => {});
      persistToCloudLedger(transactions, updated, savingsGoals, currency, ledgerId);
      return updated;
    });
  }, [activeUserId, currency, ledgerId, persistToCloudLedger, savingsGoals, transactions, user]);

  const reorderCategory = useCallback((type: TransactionType, name: string, targetIndex: number) => {
    setCategories(prev => {
      const names = Object.keys(prev[type] || {});
      const fromIndex = names.indexOf(name);
      if (fromIndex < 0 || targetIndex < 0 || targetIndex >= names.length || fromIndex === targetIndex) return prev;

      const reorderedNames = [...names];
      const [moved] = reorderedNames.splice(fromIndex, 1);
      reorderedNames.splice(targetIndex, 0, moved);
      const reordered: Record<string, string[]> = {};
      reorderedNames.forEach(key => { reordered[key] = prev[type][key]; });
      const updated = { ...prev, [type]: reordered };
      storageService.saveLocalCategories(activeUserId, updated);
      storageService.saveLocalCategories(ledgerId, updated);
      if (user) storageService.saveCloudUserProfile(user.id, { categories: updated }).catch(() => {});
      persistToCloudLedger(transactions, updated, savingsGoals, currency, ledgerId);
      return updated;
    });
  }, [activeUserId, currency, ledgerId, persistToCloudLedger, savingsGoals, transactions, user]);

  const moveSubcategory = useCallback((type: TransactionType, category: string, subcategory: string, direction: 'up' | 'down') => {
    setCategories(prev => {
      const currentMap = { ...prev[type] };
      const subcats = [...(currentMap[category] || [])];
      const index = subcats.indexOf(subcategory);
      const target = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= subcats.length) return prev;
      [subcats[index], subcats[target]] = [subcats[target], subcats[index]];
      currentMap[category] = subcats;
      const updated = { ...prev, [type]: currentMap };
      storageService.saveLocalCategories(activeUserId, updated);
      storageService.saveLocalCategories(ledgerId, updated);
      if (user) storageService.saveCloudUserProfile(user.id, { categories: updated }).catch(() => {});
      persistToCloudLedger(transactions, updated, savingsGoals, currency, ledgerId);
      return updated;
    });
  }, [activeUserId, currency, ledgerId, persistToCloudLedger, savingsGoals, transactions, user]);

  const reorderSubcategory = useCallback((type: TransactionType, category: string, subcategory: string, targetIndex: number) => {
    setCategories(prev => {
      const currentMap = { ...prev[type] };
      const subcats = [...(currentMap[category] || [])];
      const fromIndex = subcats.indexOf(subcategory);
      if (fromIndex < 0 || targetIndex < 0 || targetIndex >= subcats.length || fromIndex === targetIndex) return prev;

      const [moved] = subcats.splice(fromIndex, 1);
      subcats.splice(targetIndex, 0, moved);
      currentMap[category] = subcats;
      const updated = { ...prev, [type]: currentMap };
      storageService.saveLocalCategories(activeUserId, updated);
      storageService.saveLocalCategories(ledgerId, updated);
      if (user) storageService.saveCloudUserProfile(user.id, { categories: updated }).catch(() => {});
      persistToCloudLedger(transactions, updated, savingsGoals, currency, ledgerId);
      return updated;
    });
  }, [activeUserId, currency, ledgerId, persistToCloudLedger, savingsGoals, transactions, user]);

  const resetDefaultCategories = useCallback(() => {
    setCategories(DEFAULT_CATEGORIES);
    storageService.saveLocalCategories(activeUserId, DEFAULT_CATEGORIES);
    storageService.saveLocalCategories(ledgerId, DEFAULT_CATEGORIES);
    if (user) {
      storageService.saveCloudUserProfile(user.id, { categories: DEFAULT_CATEGORIES }).catch(() => {});
    }
    persistToCloudLedger(transactions, DEFAULT_CATEGORIES, savingsGoals, currency, ledgerId);
    showToast('Categories reset to standard defaults.', 'info');
  }, [activeUserId, currency, ledgerId, persistToCloudLedger, savingsGoals, showToast, transactions, user]);

  // ==========================================
  // Savings Goals Operations
  // ==========================================

  const setSavingsGoal = useCallback((monthKey: string, targetSavings: number, expenseBudget?: number, note?: string) => {
    setSavingsGoals(prev => {
      const existingIdx = prev.findIndex(g => g.monthKey === monthKey);
      const newGoal: MonthlySavingsGoal = {
        monthKey,
        targetSavings,
        expenseBudget,
        note,
        updatedAt: new Date().toISOString()
      };

      let updated: MonthlySavingsGoal[];
      if (existingIdx !== -1) {
        updated = [...prev];
        updated[existingIdx] = newGoal;
      } else {
        updated = [...prev, newGoal];
      }

      storageService.saveLocalSavingsGoals(activeUserId, updated);
      storageService.saveLocalSavingsGoals(ledgerId, updated);
      if (user) {
        storageService.saveCloudUserProfile(user.id, { savingsGoals: updated }).catch(() => {});
      }
      persistToCloudLedger(transactions, categories, updated, currency, ledgerId);
      return updated;
    });

    showToast(`Monthly plan saved for ${monthKey}.`, 'success');
  }, [activeUserId, categories, currency, ledgerId, persistToCloudLedger, showToast, transactions, user]);

  const getCurrentMonthGoal = useCallback((monthKeyParam?: string): MonthlySavingsGoal | undefined => {
    const key = monthKeyParam || getMonthKey(currentMonth);
    return savingsGoals.find(g => g.monthKey === key);
  }, [currentMonth, savingsGoals]);

  // Manual Trigger Sync - pushes current ledger to cloud
  const triggerManualSync = useCallback(async () => {
    setSyncState(prev => ({
      ...prev,
      status: 'syncing',
      message: 'Syncing with Firestore cloud...'
    }));

    try {
      const payload: CloudLedger = {
        id: ledgerId,
        ownerUid: user?.id,
        currency,
        categories,
        savingsGoals,
        transactions,
        deletedTransactionIds,
        resetAt: lastFullEraseAtRef.current || undefined,
        updatedAt: new Date().toISOString()
      };
      const saveResult = await storageService.saveCloudLedger(ledgerId, payload);
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Cloud ledger rejected the sync.');
      }
      if (ledgerId !== 'main') {
        const mainResult = await storageService.saveCloudLedger('main', { ...payload, id: 'main' });
        if (!mainResult.success) {
          throw new Error(mainResult.error || 'Main cloud ledger rejected the sync.');
        }
      }

      setSyncState(prev => ({
        ...prev,
        status: 'synced',
        lastSyncTime: new Date().toLocaleTimeString(),
        message: `Synced ${transactions.length} items to cloud`
      }));
      showToast(`Cloud sync complete! ${transactions.length} records saved across all devices.`, 'success');
    } catch {
      setSyncState(prev => ({
        ...prev,
        status: 'offline',
        message: 'Saved locally'
      }));
      showToast('Saved to local storage.', 'info');
    }
  }, [categories, currency, ledgerId, savingsGoals, showToast, transactions, user]);

  // Pull latest ledger from cloud
  const pullFromCloud = useCallback(async () => {
    setSyncState(prev => ({
      ...prev,
      status: 'syncing',
      message: 'Pulling latest data from cloud...'
    }));

    try {
      let cloudLedger = await storageService.fetchCloudLedger(ledgerId);
      if (!cloudLedger && ledgerId !== 'main') {
        cloudLedger = await storageService.fetchCloudLedger('main');
      }

      if (cloudLedger && Array.isArray(cloudLedger.transactions)) {
        const remoteResetAt = cloudLedger.resetAt || null;
        if (remoteResetAt) lastFullEraseAtRef.current = remoteResetAt;
        const remoteTxs = remoteResetAt
          ? cloudLedger.transactions.filter(tx => new Date(tx.updatedAt || 0).getTime() > new Date(remoteResetAt).getTime())
          : cloudLedger.transactions;
        setTransactions(remoteTxs);
        setDeletedTransactionIds(cloudLedger.deletedTransactionIds || []);
        transactionsRef.current = remoteTxs;
        deletedTransactionIdsRef.current = cloudLedger.deletedTransactionIds || [];
        storageService.saveLocalTransactions(ledgerId, remoteTxs);
        storageService.saveLocalTransactions('main', remoteTxs);
        if (cloudLedger.categories) setCategories(cloudLedger.categories);
        if (cloudLedger.savingsGoals) setSavingsGoals(cloudLedger.savingsGoals);
        if (cloudLedger.currency) setCurrencyState(cloudLedger.currency);

        setSyncState(prev => ({
          ...prev,
          status: 'synced',
          lastSyncTime: new Date().toLocaleTimeString(),
          message: `Loaded ${remoteTxs.length} transactions from cloud`
        }));
        showToast(`Successfully refreshed ${remoteTxs.length} transactions from cloud!`, 'success');
      } else {
        showToast('No transactions found in cloud ledger yet. Click "Sync" on your other device first.', 'info');
        setSyncState(prev => ({
          ...prev,
          status: 'synced',
          lastSyncTime: new Date().toLocaleTimeString(),
          message: 'Cloud is empty'
        }));
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to pull cloud ledger', 'error');
    }
  }, [ledgerId, showToast]);

  // Security Unlock / Lock
  const unlockLedger = useCallback(async (usernameOrEmail: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const res = await authService.loginWithPassword(usernameOrEmail, password);
    if (res.error) {
      return { success: false, error: res.error };
    }

    if (res.user && res.user.id) {
      setUser(res.user);
    }
    setIsUnlocked(true);
    showToast('Ledger unlocked successfully.', 'success');
    return { success: true };
  }, [setUser, showToast]);

  const lockLedger = useCallback(() => {
    setIsUnlocked(false);
    showToast('Ledger locked for privacy.', 'info');
  }, [showToast]);

  // Modal Openers / Closers
  const openTxModal = useCallback((type: TransactionType = 'expense', prefillDate?: string, editingTx?: Transaction) => {
    setModalTxType(type);
    setModalPrefillDate(prefillDate || toIsoDate(new Date()));
    setEditingTransaction(editingTx || null);
    setIsTxModalOpen(true);
  }, []);

  const closeTxModal = useCallback(() => {
    setIsTxModalOpen(false);
    setEditingTransaction(null);
  }, []);

  const openGoalModal = useCallback(() => setIsGoalModalOpen(true), []);
  const closeGoalModal = useCallback(() => setIsGoalModalOpen(false), []);

  const openAuthModal = useCallback((mode: 'setup' | 'signin' | 'reset' = 'signin', prefillIdentifier = '') => {
    setAuthModalInitialMode(mode);
    setAuthModalPrefillIdentifier(prefillIdentifier);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  const openCategoryModal = useCallback(() => setIsCategoryModalOpen(true), []);
  const closeCategoryModal = useCallback(() => setIsCategoryModalOpen(false), []);

  const openMultiDeviceModal = useCallback(() => setIsMultiDeviceModalOpen(true), []);
  const closeMultiDeviceModal = useCallback(() => setIsMultiDeviceModalOpen(false), []);

  const openExcelModal = useCallback(() => setIsExcelModalOpen(true), []);
  const closeExcelModal = useCallback(() => setIsExcelModalOpen(false), []);

  const triggerCelebration = useCallback(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<FinanceContextType>(() => ({
    user,
    setUser,
    activePage,
    setActivePage,
    currentMonth,
    setCurrentMonth,
    transactions,
    categories,
    savingsGoals,
    currency,
    setCurrency,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    deleteTransactions,
    clearMonthTransactions,
    clearAllTransactions,
    importTransactions,
    saveCategory,
    deleteCategory,
    saveSubcategory,
    deleteSubcategory,
    moveCategory,
    moveSubcategory,
    reorderCategory,
    reorderSubcategory,
    resetDefaultCategories,
    setSavingsGoal,
    getCurrentMonthGoal,
    ledgerId,
    shareableLink,
    copyLedgerLink,
    switchLedger,
    syncState,
    cloudInitialized,
    cloudLoading,
    triggerManualSync,
    pullFromCloud,
    loadDemoData,
    toasts,
    showToast,
    isTxModalOpen,
    openTxModal,
    closeTxModal,
    modalTxType,
    modalPrefillDate,
    editingTransaction,
    isGoalModalOpen,
    openGoalModal,
    closeGoalModal,
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
    authModalInitialMode,
    authModalPrefillIdentifier,
    isMultiDeviceModalOpen,
    openMultiDeviceModal,
    closeMultiDeviceModal,
    isExcelModalOpen,
    openExcelModal,
    closeExcelModal,
    isSidebarHidden,
    toggleSidebar,
    isUnlocked,
    unlockLedger,
    lockLedger,
    isCategoryModalOpen,
    openCategoryModal,
    closeCategoryModal,
    triggerCelebration
  }), [
    user,
    setUser,
    activePage,
    currentMonth,
    transactions,
    categories,
    savingsGoals,
    currency,
    setCurrency,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    deleteTransactions,
    clearMonthTransactions,
    clearAllTransactions,
    importTransactions,
    saveCategory,
    deleteCategory,
    saveSubcategory,
    deleteSubcategory,
    moveCategory,
    moveSubcategory,
    reorderCategory,
    reorderSubcategory,
    resetDefaultCategories,
    setSavingsGoal,
    getCurrentMonthGoal,
    ledgerId,
    shareableLink,
    copyLedgerLink,
    switchLedger,
    syncState,
    cloudInitialized,
    cloudLoading,
    triggerManualSync,
    pullFromCloud,
    loadDemoData,
    toasts,
    showToast,
    isTxModalOpen,
    openTxModal,
    closeTxModal,
    modalTxType,
    modalPrefillDate,
    editingTransaction,
    isGoalModalOpen,
    openGoalModal,
    closeGoalModal,
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
    authModalInitialMode,
    authModalPrefillIdentifier,
    isMultiDeviceModalOpen,
    openMultiDeviceModal,
    closeMultiDeviceModal,
    isExcelModalOpen,
    openExcelModal,
    closeExcelModal,
    isSidebarHidden,
    toggleSidebar,
    isUnlocked,
    unlockLedger,
    lockLedger,
    isCategoryModalOpen,
    openCategoryModal,
    closeCategoryModal,
    triggerCelebration
  ]);

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = (): FinanceContextType => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
