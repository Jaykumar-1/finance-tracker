import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { authService, StoredAuthUser } from '../services/auth';
import { Lock, Unlock, Key, User, ShieldCheck, ArrowRight, Eye, EyeOff, Sparkles, HardDrive, RefreshCw, UserPlus, LogIn, Mail, KeyRound } from 'lucide-react';
import { SUPPORTED_CURRENCIES } from '../utils/constants';

export const LockScreen: React.FC = () => {
  const { user, setUser, unlockLedger, showToast, triggerCelebration, setCurrency } = useFinance();

  const [mode, setMode] = useState<'unlock' | 'signin' | 'register' | 'reset'>('signin');
  
  // Unlock mode (for returning session)
  const [unlockPassword, setUnlockPassword] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);

  // Sign In mode
  const [signInIdentifier, setSignInIdentifier] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Register mode
  const [regUsername, setRegUsername] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCurrency, setRegCurrency] = useState('INR');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Google Sign In
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Always require full username/email + password after every page load.
  // A persisted Firebase session is intentionally not used as an unlock shortcut.
  useEffect(() => {
    setMode('signin');
    setSignInIdentifier('');
    setSignInPassword('');
  }, []);

  // Handle Unlock for existing session user
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = user || authService.getCurrentUser();
    const identifier = targetUser?.username || targetUser?.email || signInIdentifier;

    if (!identifier) {
      setMode('signin');
      return;
    }
    if (!unlockPassword) {
      showToast('Please enter your password to unlock your ledger.', 'warning');
      return;
    }

    setIsUnlocking(true);
    try {
      const res = await unlockLedger(identifier, unlockPassword);
      if (!res.success) {
        showToast(res.error || 'Incorrect password.', 'error');
      } else {
        triggerCelebration();
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to unlock.', 'error');
    } finally {
      setIsUnlocking(false);
    }
  };

  // Handle Full Sign In (Username & Password)
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = signInIdentifier.trim();
    if (!cleanId || !signInPassword) {
      showToast('Please enter your username and password.', 'warning');
      return;
    }

    setIsSigningIn(true);
    try {
      const res = await unlockLedger(cleanId, signInPassword);
      if (!res.success) {
        showToast(res.error || 'Account not found or password incorrect.', 'error');
      } else {
        triggerCelebration();
      }
    } catch (err: any) {
      showToast(err?.message || 'Sign in failed.', 'error');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Forgot password / credential recovery. Firebase sends the reset link to the
  // registered recovery email; no password is stored in the app's JSON/Firestore data.
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const ident = resetIdentifier.trim();
    if (!ident) {
      showToast('Enter your username or registered recovery email.', 'warning');
      return;
    }
    setIsResetting(true);
    try {
      const res = await authService.resetPassword(ident);
      if (!res.success) {
        showToast(res.error || 'Unable to send password reset link.', 'error');
        return;
      }
      showToast(`Password reset link sent to ${res.email || 'your recovery email'}.`, 'success');
      setSignInIdentifier(ident);
      setMode('signin');
    } catch (err: any) {
      showToast(err?.message || 'Unable to send password reset link.', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  // Handle Registration (Create Account)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    const cleanUser = regUsername.trim().toLowerCase();
    if (!cleanUser || cleanUser.length < 3) {
      const msg = 'Username must be at least 3 characters long.';
      setRegisterError(msg);
      showToast(msg, 'warning');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      const msg = 'Password must be at least 6 characters long.';
      setRegisterError(msg);
      showToast(msg, 'warning');
      return;
    }

    setIsRegistering(true);
    try {
      const res = await authService.registerWithPassword({
        username: cleanUser,
        displayName: regDisplayName.trim() || cleanUser,
        email: regEmail.trim() || undefined,
        password: regPassword,
        currency: regCurrency || 'INR'
      });

      if (res.error) {
        setRegisterError(res.error);
        showToast(res.error, 'error');
        setIsRegistering(false);
        return;
      }

      if (res.user) {
        setUser(res.user);
        setCurrency(regCurrency);
        await unlockLedger(cleanUser, regPassword);
        triggerCelebration();
        showToast(`Account created! Welcome, ${res.user.displayName}`, 'success');
      }
    } catch (err: any) {
      const msg = err?.message || 'Registration failed. Open the browser Console (F12) for details.';
      setRegisterError(msg);
      showToast(msg, 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  // Google Sign In
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const res = await authService.signInWithGooglePopup();
      if (res.error) {
        showToast(res.error, 'error');
        return;
      }

      if (res.user && res.user.id) {
        setUser(res.user);
        triggerCelebration();
        showToast(`Welcome, ${res.user.displayName}! Ledger unlocked.`, 'success');
      }
    } catch (err: any) {
      showToast(err?.message || 'Google sign in failed.', 'error');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const activeUser = user || authService.getCurrentUser();

  return (
    <div id="finance-lock-screen" className="flex flex-col items-center justify-center min-h-[78vh] py-6 px-4">
      <div className="w-full max-w-md bg-[#0f172a] border border-[#22334e] rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header Badge */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 mb-3.5 border border-blue-400/30">
            <Lock className="w-7 h-7 text-blue-100" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Personal Finance Ledger
          </h2>
          <p className="text-xs sm:text-sm text-[#8ea0ba] mt-1">
            Enter your credentials to unlock and view your financial data
          </p>
        </div>

        {/* Tab switcher when not in quick unlock */}
        {mode !== 'unlock' && (
          <div className="flex rounded-xl bg-[#090f1d] p-1 border border-[#1e2e48] mb-6">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'signin'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[#8ea0ba] hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'register'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[#8ea0ba] hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>
        )}

        {/* Quick Unlock Form (When User Profile is already detected) */}
        {mode === 'unlock' && activeUser && (
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#142036] border border-[#253754] flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 font-bold text-sm shrink-0">
                {activeUser.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {activeUser.displayName}
                </div>
                <div className="text-[11px] text-blue-400 truncate font-mono">
                  @{activeUser.username}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSignInIdentifier('');
                  setMode('signin');
                }}
                className="text-[11px] text-[#8ea0ba] hover:text-blue-300 underline cursor-pointer shrink-0"
              >
                Switch
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#cbd5e1] mb-1.5">
                Enter Password
              </label>
              <div className="relative">
                <input
                  type={showUnlockPassword ? 'text' : 'password'}
                  value={unlockPassword}
                  onChange={e => setUnlockPassword(e.target.value)}
                  placeholder="Enter your account password"
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 bg-[#090f1d] border border-[#253754] focus:border-blue-500 rounded-xl text-sm text-white placeholder-[#5a6f8f] focus:outline-hidden transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowUnlockPassword(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-white"
                >
                  {showUnlockPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isUnlocking}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isUnlocking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying & Unlocking...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Unlock Ledger</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-[11px] text-[#7d93b2] pt-1">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="hover:text-blue-400 underline cursor-pointer"
              >
                Sign in with another username
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className="hover:text-emerald-400 underline cursor-pointer"
              >
                Create new account
              </button>
            </div>
          </form>
        )}

        {/* Sign In Form */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#cbd5e1] mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={signInIdentifier}
                  onChange={e => setSignInIdentifier(e.target.value)}
                  placeholder="e.g. jaykumar or name@email.com"
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 bg-[#090f1d] border border-[#253754] focus:border-blue-500 rounded-xl text-sm text-white placeholder-[#5a6f8f] focus:outline-hidden transition-all pl-9.5"
                />
                <User className="w-4 h-4 text-[#5a6f8f] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#cbd5e1] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showSignInPassword ? 'text' : 'password'}
                  value={signInPassword}
                  onChange={e => setSignInPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#090f1d] border border-[#253754] focus:border-blue-500 rounded-xl text-sm text-white placeholder-[#5a6f8f] focus:outline-hidden transition-all pl-9.5 pr-10"
                />
                <Key className="w-4 h-4 text-[#5a6f8f] absolute left-3 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowSignInPassword(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-white cursor-pointer"
                >
                  {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSigningIn}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSigningIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Signing In & Syncing...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Sign In & Unlock Data</span>
                </>
              )}
            </button>

            <div className="pt-2 text-center space-y-2">
              <button
                type="button"
                onClick={() => { setResetIdentifier(signInIdentifier); setMode('reset'); }}
                className="text-xs text-blue-400 hover:underline cursor-pointer font-semibold"
              >
                Forgot password?
              </button>
              <div>
                <span className="text-xs text-[#7d93b2]">
                  New user?{' '}
                  <button type="button" onClick={() => setMode('register')} className="text-blue-400 font-bold hover:underline cursor-pointer">Create an account</button>
                </span>
              </div>
            </div>
          </form>
        )}

        {/* Forgot Password Form */}
        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#142036] border border-[#253754] text-xs text-[#a9b8cd]">
              Enter your username or registered recovery email. If the account has a recovery email, Firebase will send an official password-reset link.
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#cbd5e1] mb-1.5">Username or Recovery Email</label>
              <div className="relative">
                <input
                  type="text"
                  value={resetIdentifier}
                  onChange={e => setResetIdentifier(e.target.value)}
                  placeholder="e.g. jaykumar or name@email.com"
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 bg-[#090f1d] border border-[#253754] focus:border-blue-500 rounded-xl text-sm text-white placeholder-[#5a6f8f] focus:outline-hidden pl-9.5"
                />
                <Mail className="w-4 h-4 text-[#5a6f8f] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            <button type="submit" disabled={isResetting} className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              {isResetting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              <span>{isResetting ? 'Sending...' : 'Send Reset Link'}</span>
            </button>
            <div className="text-center text-xs">
              <button type="button" onClick={() => setMode('signin')} className="text-blue-400 hover:underline">Back to sign in</button>
            </div>
          </form>
        )}

        {/* Register / Create Account Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#cbd5e1] mb-1">
                Username <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={regUsername}
                onChange={e => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="e.g. jaykumar"
                required
                className="w-full px-3.5 py-2 bg-[#090f1d] border border-[#253754] focus:border-blue-500 rounded-xl text-xs text-white placeholder-[#5a6f8f] focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-[#cbd5e1] mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={regDisplayName}
                  onChange={e => setRegDisplayName(e.target.value)}
                  placeholder="Jay Kumar"
                  className="w-full px-3.5 py-2 bg-[#090f1d] border border-[#253754] focus:border-blue-500 rounded-xl text-xs text-white placeholder-[#5a6f8f] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#cbd5e1] mb-1">
                  Currency
                </label>
                <select
                  value={regCurrency}
                  onChange={e => setRegCurrency(e.target.value)}
                  className="w-full px-2.5 py-2 bg-[#090f1d] border border-[#253754] focus:border-blue-500 rounded-xl text-xs text-white focus:outline-hidden"
                >
                  {SUPPORTED_CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#cbd5e1] mb-1">
                Email (optional, for recovery)
              </label>
              <input
                type="email"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                placeholder="name@gmail.com"
                className="w-full px-3.5 py-2 bg-[#090f1d] border border-[#253754] focus:border-blue-500 rounded-xl text-xs text-white placeholder-[#5a6f8f] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#cbd5e1] mb-1">
                Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  className="w-full px-3.5 py-2 bg-[#090f1d] border border-[#253754] focus:border-blue-500 rounded-xl text-xs text-white placeholder-[#5a6f8f] focus:outline-hidden pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(prev => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-white cursor-pointer"
                >
                  {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {registerError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-200">
                {registerError}
              </div>
            )}

            <button
              type="submit"
              disabled={isRegistering}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isRegistering ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Create Account & Start</span>
                </>
              )}
            </button>

            <div className="pt-1 text-center">
              <span className="text-xs text-[#7d93b2]">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-blue-400 font-bold hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </span>
            </div>
          </form>
        )}

        {/* Google Drive sign-in is intentionally hidden from the lock screen.
            The underlying authentication handler is preserved unchanged. */}

        {/* Privacy footnote */}
        <div className="mt-5 pt-3 border-t border-[#1a273c] text-center flex items-center justify-center gap-1.5 text-[11px] text-[#64748b]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Cross-Device Cloud Sync with AES-Encrypted Lock</span>
        </div>
      </div>
    </div>
  );
};
