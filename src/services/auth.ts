import { UserProfile } from '../types/finance';
import { generateId } from '../utils/formatters';
import { auth, db } from './firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  updateProfile,
  updatePassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, runTransaction, serverTimestamp, deleteDoc } from 'firebase/firestore';

/** Remove undefined fields before sending objects to Firestore.
 * Firestore rejects undefined values unless ignoreUndefinedProperties is enabled.
 */
function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

const STORAGE_KEYS = {
  CURRENT_USER: 'myfinance_user_profile',
  USERS_REGISTRY: 'myfinance_registered_users',
  DEVICE_SESSION: 'myfinance_device_session'
};

export interface StoredAuthUser {
  id: string;
  username: string;
  displayName: string;
  authProvider?: 'google' | 'password' | 'guest';
  email?: string;
  avatarUrl?: string;
  currency?: string;
  createdAt: string;
  googleEmail?: string;
  googleSheetId?: string;
  googleSheetUrl?: string;
  googleSheetTitle?: string;
  isGoogleDriveLinked?: boolean;
  lastDriveSyncAt?: string;
}

export interface UsernameDoc {
  uid: string;
  email: string;
  username: string;
  updatedAt?: any;
}

export interface UsernameLookupResult {
  status: 'found' | 'not_found' | 'error';
  mapping?: UsernameDoc;
  error?: string;
  errorCode?: string;
}

/**
 * Translates Firebase Auth and Firestore error codes to clear, actionable human-readable messages.
 */
export function getFirebaseAuthErrorMessage(error: any): string {
  if (!error) return 'An unknown authentication error occurred.';
  const code = error?.code || error?.message || '';

  if (typeof code === 'string') {
    if (code.includes('auth/operation-not-allowed')) {
      return 'Email/password sign-in is not enabled in this Firebase project (gen-lang-client-0662441273). Please enable the Email/Password provider in the Firebase Console under Authentication > Sign-in method.';
    }
    if (code.includes('auth/invalid-credential') || code.includes('auth/invalid-login-credentials')) {
      return 'The email/username or password is incorrect. Please check your credentials.';
    }
    if (code.includes('auth/user-not-found')) {
      return 'No account found with this username or email. Please check your spelling or register a new account.';
    }
    if (code.includes('auth/wrong-password')) {
      return 'Incorrect password. Please try again.';
    }
    if (code.includes('auth/email-already-in-use')) {
      return 'An account already exists with this email. Please sign in with the existing account or use Forgot password.';
    }
    if (code.includes('auth/invalid-email')) {
      return 'Invalid email or username format.';
    }
    if (code.includes('auth/weak-password')) {
      return 'Password is too weak. Please use at least 6 characters.';
    }
    if (code.includes('auth/user-disabled')) {
      return 'This user account has been disabled. Please contact support.';
    }
    if (code.includes('auth/too-many-requests')) {
      return 'Access temporarily blocked due to multiple failed login attempts. Please try again later.';
    }
    if (code.includes('auth/network-request-failed')) {
      return 'Network connection failed. Please check your internet connection.';
    }
    if (code.includes('auth/configuration-not-found')) {
      return 'Firebase Authentication is not properly configured for project gen-lang-client-0662441273.';
    }
    if (code.includes('auth/invalid-api-key')) {
      return 'Invalid Firebase API key in project configuration.';
    }
    if (code.includes('auth/requires-recent-login')) {
      return 'This operation requires you to sign in again for security.';
    }
    if (code.includes('permission-denied')) {
      return 'Database access denied. Please ensure you are logged in and authorized to access this data.';
    }
    if (code.includes('unavailable')) {
      return 'Firebase service is temporarily unavailable or offline. Please try again shortly.';
    }
  }

  return error?.message || 'Authentication failed. Please try again.';
}

/**
 * Diagnostic logger for authentication events (never logs passwords or tokens)
 */
function logAuthDebug(params: {
  operation: string;
  identifier: string;
  canonicalEmail?: string;
  errorCode?: string;
  errorMessage?: string;
  errorName?: string;
  extra?: Record<string, any>;
}) {
  console.log('[Firebase Auth Diagnostic]', {
    operation: params.operation,
    projectId: auth.app.options.projectId || 'gen-lang-client-0662441273',
    appId: auth.app.options.appId || '1:114879379200:web:1bfcb160b1051942d225e5',
    authDomain: auth.app.options.authDomain || 'gen-lang-client-0662441273.firebaseapp.com',
    identifier: params.identifier,
    canonicalEmail: params.canonicalEmail || 'N/A',
    errorCode: params.errorCode || 'SUCCESS',
    errorMessage: params.errorMessage || 'None',
    errorName: params.errorName || (params.errorCode ? 'FirebaseError' : 'None'),
    ...params.extra
  });
}

export class AuthService {
  private static instance: AuthService;
  private currentUser: UserProfile | null = null;
  private authInitialized = false;
  private authInitResolvers: Array<(user: UserProfile | null) => void> = [];

  private constructor() {
    // Note: Do NOT treat localStorage as authoritative for authentication.
    // Firebase Authentication onAuthStateChanged is the single source of truth.
    onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        // Fetch user profile from Firestore /users/{uid}
        const profile = await this.resolveUserProfileFromFirebase(fbUser);
        this.currentUser = profile;
        this.saveStoredCurrentUser(profile);
      } else {
        if (!this.currentUser || this.currentUser.authProvider !== 'guest') {
          this.currentUser = null;
          this.clearStoredCurrentUser();
        }
      }
      this.authInitialized = true;
      this.authInitResolvers.forEach(resolve => resolve(this.currentUser));
      this.authInitResolvers = [];
    });
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public async waitForAuthInit(): Promise<UserProfile | null> {
    if (this.authInitialized) {
      return this.currentUser;
    }
    return new Promise(resolve => {
      this.authInitResolvers.push(resolve);
      // Safe fallback timer (15 seconds) in case of rare network blockage
      setTimeout(() => {
        if (!this.authInitialized) {
          this.authInitialized = true;
          resolve(this.currentUser);
        }
      }, 15000);
    });
  }

  /**
   * Deterministic conversion from username to Firebase Auth canonical email
   */
  public toCanonicalEmail(identifier: string): string {
    const clean = identifier.trim().toLowerCase();
    if (clean.includes('@') && clean.includes('.')) {
      return clean;
    }
    const safeName = clean.replace(/[^a-z0-9_]/g, '');
    return `${safeName || 'user'}@financeledger.app`;
  }

  /**
   * Normalize username to consistent lowercase alphanumeric string
   */
  public normalizeUsername(username: string): string {
    return username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  }

  /**
   * Look up username mapping in Firestore /usernames/{normalizedUsername}
   * Returns a structured UsernameLookupResult distinguishing found, not_found, and database errors.
   */
  public async lookupUsername(username: string): Promise<UsernameLookupResult> {
    const clean = this.normalizeUsername(username);
    if (!clean) return { status: 'not_found' };
    try {
      const docSnap = await getDoc(doc(db, 'usernames', clean));
      if (docSnap.exists()) {
        return {
          status: 'found',
          mapping: docSnap.data() as UsernameDoc
        };
      }
      return { status: 'not_found' };
    } catch (err: any) {
      console.warn('[AuthService] Username lookup error:', err?.message);
      return {
        status: 'error',
        error: err?.message || 'Database lookup error',
        errorCode: err?.code
      };
    }
  }

  /**
   * Atomically claim a username mapping in Firestore /usernames/{normalizedUsername}
   * Ensures that no two accounts can race to claim the same username, and prevents overwriting existing mappings.
   */
  public async claimUsernameAtomically(
    username: string,
    email: string,
    uid: string
  ): Promise<{ success: boolean; error?: string }> {
    const clean = this.normalizeUsername(username);
    if (!clean || !uid || !email) {
      return { success: false, error: 'Invalid username mapping parameters.' };
    }
    const usernameDocRef = doc(db, 'usernames', clean);
    try {
      await runTransaction(db, async transaction => {
        const snap = await transaction.get(usernameDocRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data && data.uid && data.uid !== uid) {
            // A username mapping can survive an interrupted registration.
            // It is safe to reclaim it only when the new authenticated account
            // uses the exact same canonical email stored in that mapping.
            // Firebase Authentication prevents two live accounts from sharing
            // the same email, so this does not allow a valid account to be stolen.
            const existingEmail = String(data.email || '').trim().toLowerCase();
            const requestedEmail = email.trim().toLowerCase();
            if (!existingEmail || existingEmail !== requestedEmail) {
              throw new Error('USERNAME_ALREADY_EXISTS');
            }
          }
        }
        transaction.set(usernameDocRef, {
          username: clean,
          email: email.trim().toLowerCase(),
          uid,
          updatedAt: serverTimestamp()
        });
      });
      return { success: true };
    } catch (err: any) {
      if (err?.message === 'USERNAME_ALREADY_EXISTS') {
        return { success: false, error: 'Username is already taken. Please choose a different username.' };
      }
      return { success: false, error: err?.message || 'Failed to register username mapping.' };
    }
  }

  /**
   * Register username mapping in Firestore /usernames/{normalizedUsername} (wraps atomic claim)
   */
  public async registerUsernameMapping(username: string, email: string, uid: string): Promise<boolean> {
    const res = await this.claimUsernameAtomically(username, email, uid);
    return res.success;
  }

  private loadStoredCurrentUser(): UserProfile | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return null;
  }

  private saveStoredCurrentUser(user: UserProfile | null): void {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
    } catch {
      // ignore
    }
  }

  private clearStoredCurrentUser(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } catch {
      // ignore
    }
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public setCurrentUser(user: UserProfile | null): void {
    this.currentUser = user;
    this.saveStoredCurrentUser(user);
  }

  public getStoredUsers(): StoredAuthUser[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USERS_REGISTRY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  }

  public saveStoredUsers(users: StoredAuthUser[]): void {
    try {
      // Clean users registry: ensure no passwords or hashes are ever saved
      const safeUsers = users.map(u => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        email: u.email,
        avatarUrl: u.avatarUrl,
        currency: u.currency,
        createdAt: u.createdAt,
        googleEmail: u.googleEmail,
        googleSheetId: u.googleSheetId,
        googleSheetUrl: u.googleSheetUrl,
        googleSheetTitle: u.googleSheetTitle,
        isGoogleDriveLinked: u.isGoogleDriveLinked,
        lastDriveSyncAt: u.lastDriveSyncAt
      }));
      localStorage.setItem(STORAGE_KEYS.USERS_REGISTRY, JSON.stringify(safeUsers));
    } catch {
      // ignore
    }
  }

  /**
   * Reads or creates user document from Firestore at /users/{uid}
   */
  private async resolveUserProfileFromFirebase(fbUser: FirebaseUser): Promise<UserProfile> {
    const uid = fbUser.uid;
    const defaultDisplayName = fbUser.displayName || fbUser.email?.split('@')[0] || 'Finance User';
    const defaultUsername = fbUser.email?.split('@')[0]?.toLowerCase() || 'user';

    let cloudProfile: Partial<UserProfile> = {};
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        cloudProfile = userDocSnap.data() as Partial<UserProfile>;
      } else {
        const provider: 'google' | 'password' | 'guest' = fbUser.isAnonymous
          ? 'guest'
          : fbUser.providerData[0]?.providerId === 'google.com'
          ? 'google'
          : 'password';

        const initialDoc = removeUndefined({
          id: uid,
          username: defaultUsername,
          displayName: defaultDisplayName,
          email: fbUser.email && !fbUser.email.endsWith('@financeledger.app') ? fbUser.email : undefined,
          currency: 'INR',
          authProvider: provider,
          createdAt: new Date().toISOString(),
          updatedAt: serverTimestamp()
        });
        await setDoc(userDocRef, initialDoc, { merge: true });
        cloudProfile = {
          ...initialDoc,
          authProvider: provider
        };
      }
    } catch (err) {
      console.warn('[AuthService] Could not read user profile doc from Firestore:', err);
    }

    const localCached = this.loadStoredCurrentUser();
    const isSameUser = localCached && localCached.id === uid;

    const profile: UserProfile = {
      id: uid,
      username: cloudProfile.username || (isSameUser && localCached?.username) || defaultUsername,
      displayName: cloudProfile.displayName || fbUser.displayName || (isSameUser && localCached?.displayName) || defaultDisplayName,
      email: cloudProfile.email || (fbUser.email && !fbUser.email.endsWith('@financeledger.app') ? fbUser.email : undefined) || (isSameUser ? localCached?.email : undefined),
      avatarUrl: cloudProfile.avatarUrl || fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${cloudProfile.username || defaultUsername}`,
      authProvider: fbUser.isAnonymous ? 'guest' : ((cloudProfile.authProvider as any) || (fbUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'password')),
      currency: cloudProfile.currency || (isSameUser && localCached?.currency) || 'INR',
      createdAt: cloudProfile.createdAt || new Date().toISOString(),
      googleEmail: cloudProfile.googleEmail || (isSameUser ? localCached?.googleEmail : undefined),
      googleSheetId: cloudProfile.googleSheetId || (isSameUser ? localCached?.googleSheetId : undefined),
      googleSheetUrl: cloudProfile.googleSheetUrl || (isSameUser ? localCached?.googleSheetUrl : undefined),
      googleSheetTitle: cloudProfile.googleSheetTitle || (isSameUser ? localCached?.googleSheetTitle : undefined),
      isGoogleDriveLinked: cloudProfile.isGoogleDriveLinked ?? (isSameUser ? localCached?.isGoogleDriveLinked : false),
      lastDriveSyncAt: cloudProfile.lastDriveSyncAt || (isSameUser ? localCached?.lastDriveSyncAt : undefined)
    };

    return profile;
  }

  /**
   * Register with Username/Email & Password via Firebase Authentication
   */
  public async registerWithPassword(params: {
    username: string;
    email?: string;
    displayName: string;
    password: string;
    currency?: string;
    googleEmail?: string;
    googleSheetId?: string;
    googleSheetUrl?: string;
    googleSheetTitle?: string;
    isGoogleDriveLinked?: boolean;
  }): Promise<{ user: UserProfile; error?: string }> {
    const cleanUsername = this.normalizeUsername(params.username);
    if (!cleanUsername || cleanUsername.length < 3) {
      return { user: {} as UserProfile, error: 'Username must be at least 3 characters long (letters, numbers, underscores).' };
    }
    if (!params.password || params.password.length < 6) {
      return { user: {} as UserProfile, error: 'Password must be at least 6 characters long.' };
    }

    // Determine canonical email for Firebase Authentication
    let canonicalEmail: string;
    const suppliedEmail = params.email?.trim().toLowerCase();
    if (suppliedEmail && suppliedEmail.includes('@') && suppliedEmail.includes('.')) {
      canonicalEmail = suppliedEmail;
    } else {
      canonicalEmail = `${cleanUsername}@financeledger.app`;
    }

    // Step 1: Do not read /users/{uid} here. Registration is unauthenticated
    // at this point, and Firestore correctly blocks reading another user's
    // private profile. Username ownership is enforced atomically below after
    // Firebase Authentication has created the authenticated user.

    // Step 2: Create Firebase Auth User
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, canonicalEmail, params.password);
      const fbUser = userCredential.user;
      const uid = fbUser.uid;

      if (params.displayName) {
        try {
          await updateProfile(fbUser, { displayName: params.displayName.trim() });
        } catch {
          // ignore
        }
      }

      // Step 3: Atomically claim username mapping in /usernames/{username}
      const claimResult = await this.claimUsernameAtomically(cleanUsername, canonicalEmail, uid);
      if (!claimResult.success) {
        // Roll back Firebase Auth account creation so no orphaned user is left
        try {
          try { await deleteDoc(doc(db, 'usernames', cleanUsername)); } catch {}
          await deleteUser(fbUser);
        } catch (delErr) {
          console.warn('[AuthService] Rollback deleteUser warning:', delErr);
        }
        return {
          user: {} as UserProfile,
          error: claimResult.error || 'Username is already taken. Please choose a different username.'
        };
      }

      const profile: UserProfile = {
        id: uid,
        username: cleanUsername,
        displayName: params.displayName.trim() || cleanUsername,
        email: suppliedEmail || (canonicalEmail.endsWith('@financeledger.app') ? undefined : canonicalEmail),
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
        authProvider: 'password',
        currency: params.currency || 'INR',
        createdAt: new Date().toISOString(),
        googleEmail: params.googleEmail,
        googleSheetId: params.googleSheetId,
        googleSheetUrl: params.googleSheetUrl,
        googleSheetTitle: params.googleSheetTitle,
        isGoogleDriveLinked: params.isGoogleDriveLinked ?? !!params.googleSheetId,
        lastDriveSyncAt: params.googleSheetId ? new Date().toLocaleTimeString() : undefined
      };

      // Step 4: Write user profile to /users/{uid} (No password or passwordHash stored)
      try {
        await setDoc(doc(db, 'users', uid), removeUndefined({
          ...profile,
          updatedAt: serverTimestamp()
        }), { merge: true });
      } catch (profileErr: any) {
        console.warn('[AuthService] Profile document write failure:', profileErr?.message);
        // Roll back the username mapping BEFORE deleting the Auth user.
        // Otherwise an interrupted registration can leave a stale mapping.
        try {
          await deleteDoc(doc(db, 'usernames', cleanUsername));
        } catch {}
        try {
          await deleteUser(fbUser);
        } catch {}
        return {
          user: {} as UserProfile,
          error: 'Failed to initialize account profile in Firestore. Please try again.'
        };
      }

      this.setCurrentUser(profile);
      await this.syncCredentialMetadata(profile);

      // Cache locally in users registry (clean, strictly no password hashes)
      const storedUsers = this.getStoredUsers();
      const existingIdx = storedUsers.findIndex(u => u.id === uid || u.username.toLowerCase() === cleanUsername);
      const storedUser: StoredAuthUser = { ...profile };
      if (existingIdx >= 0) {
        storedUsers[existingIdx] = storedUser;
      } else {
        storedUsers.push(storedUser);
      }
      this.saveStoredUsers(storedUsers);

      logAuthDebug({
        operation: 'registerWithPassword',
        identifier: cleanUsername,
        canonicalEmail,
        extra: { uid }
      });

      return { user: profile };
    } catch (err: any) {
      const errorMsg = getFirebaseAuthErrorMessage(err);
      logAuthDebug({
        operation: 'registerWithPassword',
        identifier: cleanUsername,
        canonicalEmail,
        errorCode: err?.code,
        errorMessage: err?.message
      });
      return { user: {} as UserProfile, error: errorMsg };
    }
  }

  /**
   * Sign in with Username/Email & Password via Firebase Authentication
   * STRICT: Resolves identity via /usernames/{username} mapping -> Firebase Auth -> /users/{uid}
   */
  public async loginWithPassword(
    usernameOrEmail: string,
    password: string
  ): Promise<{ user: UserProfile; error?: string }> {
    const rawInput = usernameOrEmail.trim();
    if (!rawInput || !password) {
      return { user: {} as UserProfile, error: 'Username/email and password are required.' };
    }

    const cleanInput = rawInput.toLowerCase();
    let targetEmail: string;
    let expectedUid: string | undefined = undefined;

    // Check if input is a direct real email
    if (cleanInput.includes('@') && cleanInput.includes('.')) {
      targetEmail = cleanInput;
    } else {
      // It's a username: attempt lookup from Firestore /usernames/{cleanInput}
      const lookupRes = await this.lookupUsername(cleanInput);

      if (lookupRes.status === 'found' && lookupRes.mapping?.email) {
        targetEmail = lookupRes.mapping.email;
        expectedUid = lookupRes.mapping.uid;
      } else {
        // Fall back to canonical synthetic email for standard username login
        targetEmail = this.toCanonicalEmail(cleanInput);
      }
    }

    // Authenticate with Firebase Authentication
    try {
      const userCredential = await signInWithEmailAndPassword(auth, targetEmail, password);
      const fbUser = userCredential.user;

      // Data integrity verification: ensure authenticated UID matches mapped UID if mapping exists
      if (expectedUid && fbUser.uid !== expectedUid) {
        console.warn('[AuthService] UID mismatch between mapping and Firebase Auth:', { expectedUid, authUid: fbUser.uid });
        await signOut(auth);
        return {
          user: {} as UserProfile,
          error: 'Security verification failed: Account credentials do not match username records.'
        };
      }

      // If mapping was not cached/claimed earlier, repair mapping in Firestore now that user is authenticated
      if (!cleanInput.includes('@')) {
        this.claimUsernameAtomically(cleanInput, targetEmail, fbUser.uid).catch(() => {});
      }

      const profile = await this.resolveUserProfileFromFirebase(fbUser);

      this.setCurrentUser(profile);
      await this.syncCredentialMetadata(profile);
      logAuthDebug({
        operation: 'loginWithPassword',
        identifier: cleanInput,
        canonicalEmail: targetEmail,
        extra: { uid: fbUser.uid }
      });

      return { user: profile };
    } catch (err: any) {
      logAuthDebug({
        operation: 'loginWithPassword',
        identifier: cleanInput,
        canonicalEmail: targetEmail,
        errorCode: err?.code,
        errorMessage: err?.message
      });

      return {
        user: {} as UserProfile,
        error: getFirebaseAuthErrorMessage(err)
      };
    }
  }

  /**
   * Sign in as Guest with Firebase Anonymous Authentication
   */
  public async loginAsGuest(customName = 'Finance User'): Promise<UserProfile> {
    try {
      const userCredential = await signInAnonymously(auth);
      const fbUser = userCredential.user;
      const uid = fbUser.uid;

      const profile: UserProfile = {
        id: uid,
        username: 'guest_user',
        displayName: customName,
        authProvider: 'guest',
        currency: 'INR',
        createdAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, 'users', uid), removeUndefined({
          ...profile,
          updatedAt: serverTimestamp()
        }), { merge: true });
      } catch (err) {
        console.warn('[AuthService] Guest profile write notice to Firestore:', err);
      }

      this.setCurrentUser(profile);
      return profile;
    } catch (err) {
      console.warn('[AuthService] Anonymous auth fallback:', err);
      const guestId = 'guest_' + Date.now().toString(36);
      const profile: UserProfile = {
        id: guestId,
        username: 'guest_user',
        displayName: customName,
        authProvider: 'guest',
        currency: 'INR',
        createdAt: new Date().toISOString()
      };
      this.setCurrentUser(profile);
      return profile;
    }
  }

  /**
   * Authenticate with Google Credential Token
   */
  public async signInWithGoogleToken(token: string): Promise<{ user: UserProfile; error?: string }> {
    try {
      const credential = GoogleAuthProvider.credential(token);
      const userCredential = await signInWithCredential(auth, credential);
      const fbUser = userCredential.user;
      const profile = await this.resolveUserProfileFromFirebase(fbUser);

      if (profile.username) {
        this.registerUsernameMapping(profile.username, fbUser.email || profile.email || `${profile.username}@financeledger.app`, fbUser.uid).catch(() => {});
      }

      this.setCurrentUser(profile);
      return { user: profile };
    } catch (e: any) {
      return { user: {} as UserProfile, error: getFirebaseAuthErrorMessage(e) };
    }
  }

  /**
   * Sign in with Google using Firebase Authentication Popup
   */
  public async signInWithGooglePopup(): Promise<{ user: UserProfile; error?: string }> {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCredential = await signInWithPopup(auth, provider);
      const fbUser = userCredential.user;
      const profile = await this.resolveUserProfileFromFirebase(fbUser);

      if (profile.username) {
        this.registerUsernameMapping(profile.username, fbUser.email || profile.email || `${profile.username}@financeledger.app`, fbUser.uid).catch(() => {});
      }

      this.setCurrentUser(profile);
      return { user: profile };
    } catch (e: any) {
      return { user: {} as UserProfile, error: getFirebaseAuthErrorMessage(e) };
    }
  }

  public async syncUserToCloud(user: UserProfile | StoredAuthUser): Promise<void> {
    if (!user || !user.id) return;
    try {
      const userRef = doc(db, 'users', user.id);
      await setDoc(userRef, removeUndefined({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        currency: user.currency || 'INR',
        googleEmail: user.googleEmail,
        googleSheetId: user.googleSheetId,
        googleSheetUrl: user.googleSheetUrl,
        googleSheetTitle: user.googleSheetTitle,
        isGoogleDriveLinked: user.isGoogleDriveLinked,
        lastDriveSyncAt: user.lastDriveSyncAt,
        updatedAt: serverTimestamp()
      }), { merge: true });
    } catch (err) {
      console.warn('[AuthService] User profile sync notice:', err);
    }
  }

  public async fetchUserFromCloud(identifier: string): Promise<StoredAuthUser | null> {
    const clean = identifier.trim().toLowerCase();
    if (!clean) return null;

    try {
      if (auth.currentUser) {
        const docSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (docSnap.exists()) {
          return docSnap.data() as StoredAuthUser;
        }
      }
    } catch (err) {
      console.warn('[AuthService] Cloud user query notice:', err);
    }
    return null;
  }

  /** Stores non-secret credential metadata separately from the finance ledger.
   * Passwords are never stored in this JSON document; Firebase Authentication
   * remains the password authority.
   */
  public async syncCredentialMetadata(user: UserProfile | StoredAuthUser): Promise<void> {
    if (!user?.id) return;
    try {
      await setDoc(doc(db, 'credentials', user.id), {
        uid: user.id,
        username: user.username,
        recoveryEmail: user.email || null,
        authProvider: user.authProvider || 'password',
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err: any) {
      console.warn('[AuthService] Credential metadata sync notice:', err?.message);
    }
  }

  public async autoSyncAllLocalAccountsToCloud(): Promise<void> {
    if (this.currentUser && auth.currentUser) {
      await this.syncUserToCloud(this.currentUser);
    }
  }

  /**
   * Reset password via Firebase Authentication (sends password reset email or updates currentUser)
   */
  public async resetPassword(
    usernameOrEmail: string,
    newPassword?: string
  ): Promise<{ success: boolean; email?: string; error?: string }> {
    const cleanInput = usernameOrEmail.trim().toLowerCase();
    if (!cleanInput) {
      return { success: false, error: 'Valid username or email required.' };
    }

    // If user is currently authenticated and wants to update their password
    if (auth.currentUser && newPassword) {
      if (newPassword.length < 6) {
        return { success: false, error: 'New password must be at least 6 characters long.' };
      }
      try {
        await updatePassword(auth.currentUser, newPassword);
        if (this.currentUser) await this.syncCredentialMetadata(this.currentUser);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: getFirebaseAuthErrorMessage(err) };
      }
    }

    // If user is not authenticated, lookup email and send reset email
    let targetEmail: string;
    if (cleanInput.includes('@') && cleanInput.includes('.')) {
      targetEmail = cleanInput;
    } else {
      const lookup = await this.lookupUsername(cleanInput);
      if (lookup.status === 'found' && lookup.mapping?.email) {
        targetEmail = lookup.mapping.email;
      } else {
        targetEmail = this.toCanonicalEmail(cleanInput);
      }
    }

    // Honest verification: cannot deliver reset emails to synthetic placeholder domains
    if (targetEmail.endsWith('@financeledger.app')) {
      return {
        success: false,
        error: 'This account was registered with only a username and has no recovery email address configured. Password reset links cannot be delivered. If you remember your current password, you can sign in and change your password in Settings.'
      };
    }

    try {
      await sendPasswordResetEmail(auth, targetEmail);
      return { success: true, email: targetEmail };
    } catch (err: any) {
      return { success: false, error: getFirebaseAuthErrorMessage(err) };
    }
  }

  /**
   * Change password for currently authenticated user
   */
  public async changePassword(
    _userIdOrUsername: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long.' };
    }

    if (!auth.currentUser) {
      return { success: false, error: 'You must be signed in to change your password.' };
    }

    try {
      // Reauthenticate user if email credential exists
      if (auth.currentUser.email && currentPassword) {
        const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
      }
      await updatePassword(auth.currentUser, newPassword);
      if (this.currentUser) await this.syncCredentialMetadata(this.currentUser);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: getFirebaseAuthErrorMessage(err) };
    }
  }

  /**
   * Starts every browser visit in a signed-out state. The app intentionally
   * requires explicit username/password entry after a reload.
   */
  public async forceFreshSession(): Promise<void> {
    try {
      await signOut(auth);
    } catch {
      // Ignore an already-signed-out Firebase session.
    }
    this.currentUser = null;
    this.clearStoredCurrentUser();
  }

  public async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    this.currentUser = null;
    this.clearStoredCurrentUser();
  }

  /**
   * Diagnostic test function:
   * Strictly isolates getAuth() -> createUserWithEmailAndPassword() without Firestore,
   * username mappings, transactions, localStorage, or migration.
   */
  public async testMinimalDirectFirebaseAuth(email: string, password: string): Promise<{
    success: boolean;
    uid?: string;
    errorCode?: string;
    errorMessage?: string;
  }> {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      const uid = res.user.uid;
      try {
        await deleteUser(res.user);
      } catch {}
      return { success: true, uid };
    } catch (err: any) {
      return {
        success: false,
        errorCode: err?.code,
        errorMessage: err?.message
      };
    }
  }

  /**
   * Safe Diagnostic inspector for authentication state and username mappings.
   * NEVER logs or returns passwords, hashes, tokens, or credentials.
   */
  public async runAuthDiagnostic(identifier?: string): Promise<{
    firebaseProjectId: string;
    firebaseAppId: string;
    firebaseAuthDomain: string;
    currentAuthUid: string | null;
    isAuthInitialized: boolean;
    usernameQuery?: {
      queriedUsername: string;
      normalizedUsername: string;
      exists: boolean;
      mappedEmail?: string;
      mappedUid?: string;
      error?: string;
    };
  }> {
    const diag: any = {
      firebaseProjectId: auth.app.options.projectId || 'gen-lang-client-0662441273',
      firebaseAppId: auth.app.options.appId || '1:114879379200:web:1bfcb160b1051942d225e5',
      firebaseAuthDomain: auth.app.options.authDomain || 'gen-lang-client-0662441273.firebaseapp.com',
      currentAuthUid: auth.currentUser ? auth.currentUser.uid : null,
      isAuthInitialized: this.authInitialized
    };

    if (identifier) {
      const clean = this.normalizeUsername(identifier);
      const lookup = await this.lookupUsername(clean);
      diag.usernameQuery = {
        queriedUsername: identifier,
        normalizedUsername: clean,
        exists: lookup.status === 'found',
        mappedEmail: lookup.mapping?.email,
        mappedUid: lookup.mapping?.uid,
        error: lookup.error
      };
    }

    console.log('[Auth Diagnostic Result]', diag);
    return diag;
  }
}

export const authService = AuthService.getInstance();
