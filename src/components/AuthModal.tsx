import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { authService, StoredAuthUser } from '../services/auth';
import { generateId } from '../utils/formatters';
import { UserProfile } from '../types/finance';
import { SUPPORTED_CURRENCIES } from '../utils/constants';
import {
  X,
  Lock,
  Mail,
  User,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  FileSpreadsheet,
  HardDrive,
  ExternalLink,
  Check,
  Link2,
  HelpCircle,
  Eye,
  EyeOff,
  KeyRound,
  RotateCcw
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalInitialMode,
    authModalPrefillIdentifier,
    setUser,
    showToast,
    categories,
    transactions,
    savingsGoals,
    triggerCelebration,
    currency,
    setCurrency
  } = useFinance();

  // Mode: 'setup' (first time account creation) | 'signin' (returning user login) | 'reset' (reset forgotten password)
  const [authMode, setAuthMode] = useState<'setup' | 'signin' | 'reset'>('signin');

  // Show/Hide password toggles
  const [showSetupPassword, setShowSetupPassword] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);

  // Sign In fields
  const [signInIdentifier, setSignInIdentifier] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

  // Reset Password fields
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Setup / First Time fields
  const [setupDisplayName, setSetupDisplayName] = useState('');
  const [setupUsername, setSetupUsername] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupCurrency, setSetupCurrency] = useState(currency || 'INR');
  const [setupEmail, setSetupEmail] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  // Synchronize when modal opens
  useEffect(() => {
    if (isAuthModalOpen) {
      if (typeof authModalInitialMode === 'string' && (authModalInitialMode === 'setup' || authModalInitialMode === 'signin' || authModalInitialMode === 'reset')) {
        setAuthMode(authModalInitialMode);
      } else {
        setAuthMode('signin');
      }
      if (typeof authModalPrefillIdentifier === 'string' && authModalPrefillIdentifier) {
        setSignInIdentifier(authModalPrefillIdentifier);
        setResetIdentifier(authModalPrefillIdentifier);
        setSetupUsername(authModalPrefillIdentifier);
        setSetupDisplayName(authModalPrefillIdentifier);
      }
    }
  }, [isAuthModalOpen, authModalInitialMode, authModalPrefillIdentifier]);

  // Stored users for quick sign-in helper
  const storedUsers = authService.getStoredUsers();

  if (!isAuthModalOpen) return null;

  // Google One-Click Sign In
  const handleGoogleSignIn = async () => {
    setIsGoogleSigningIn(true);
    try {
      const res = await authService.signInWithGooglePopup();
      if (res.error) {
        showToast(res.error, 'error');
        return;
      }

      if (res.user && res.user.id) {
        setUser(res.user);
        await authService.syncUserToCloud(res.user);
        triggerCelebration();
        showToast(`Welcome, ${res.user.displayName}! Cloud JSON sync is active.`, 'success');
        closeAuthModal();
      }
    } catch (err: any) {
      showToast(err?.message || 'Google sign in failed.', 'error');
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  // Complete Account Creation (with optional Google Sheet linkage)
  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = setupUsername.trim().toLowerCase();
    if (!cleanUser || cleanUser.length < 3) {
      showToast('Username must be at least 3 characters long.', 'warning');
      return;
    }
    if (!setupPassword || setupPassword.length < 6) {
      showToast('Password must be at least 6 characters long.', 'warning');
      return;
    }

    setIsCreatingAccount(true);

    try {
      // Register user with username, password, and cloud storage
      const res = await authService.registerWithPassword({
        username: cleanUser,
        email: setupEmail.trim() || undefined,
        displayName: setupDisplayName.trim() || cleanUser,
        password: setupPassword,
        currency: setupCurrency || 'INR'
      });

      if (res.error) {
        showToast(res.error, 'error');
        setIsCreatingAccount(false);
        return;
      }

      if (res.user) {
        setUser(res.user);
        setCurrency(setupCurrency);
        triggerCelebration();
        showToast(`Account created successfully! You can now log in with username & password on any device.`, 'success');
        closeAuthModal();
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to complete registration.', 'error');
    } finally {
      setIsCreatingAccount(false);
    }
  };

  // Returning User: Sign In with Username & Password
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInIdentifier.trim() || !signInPassword) {
      showToast('Please enter your username and password.', 'warning');
      return;
    }

    setIsSigningIn(true);
    try {
      const res = await authService.loginWithPassword(signInIdentifier.trim(), signInPassword);
      if (res.error) {
        showToast(res.error, 'error');
        setIsSigningIn(false);
        return;
      }

      if (res.user) {
        setUser(res.user);
        if (res.user.currency) {
          setCurrency(res.user.currency);
        }
        showToast(`Welcome back, ${res.user.displayName}! Ledger unlocked.`, 'success');
        closeAuthModal();
      }
    } catch (err: any) {
      showToast(err?.message || 'Login failed. Please try again.', 'error');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetIdentifier.trim()) {
      showToast('Please enter your username or email.', 'warning');
      return;
    }

    setIsResetting(true);
    try {
      const res = await authService.resetPassword(resetIdentifier.trim());
      if (!res.success) {
        showToast(res.error || 'Failed to send password reset email.', 'error');
        setIsResetting(false);
        return;
      }

      showToast(`Password reset link sent to ${res.email || 'your email'}! Please check your inbox.`, 'success');
      setSignInIdentifier(resetIdentifier);
      setAuthMode('signin');
    } catch (err: any) {
      showToast(err?.message || 'Failed to send password reset email.', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg bg-[#101a2b] border border-[#2d3e58] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-[#26344b] flex items-center justify-between bg-[#0d1627]">
          <div>
            <h3 className="text-base md:text-lg font-bold text-[#e8eef8] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Personal Finance Authentication</span>
            </h3>
            <p className="text-xs text-[#8ea0ba]">
              Secure login & private Google Drive backup on all your devices
            </p>
          </div>
          <button
            onClick={closeAuthModal}
            className="p-1.5 rounded-lg text-[#8ea0ba] hover:text-white hover:bg-[#1a2b44] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 p-1.5 bg-[#090f1a] border-b border-[#26344b] text-xs font-bold text-center">
          <button
            type="button"
            onClick={() => setAuthMode('setup')}
            className={`py-2 px-1.5 rounded-xl transition-all flex items-center justify-center gap-1 text-[11px] sm:text-xs ${
              authMode === 'setup'
                ? 'bg-[#18273f] text-emerald-400 border border-emerald-500/40 shadow-xs'
                : 'text-[#8ea0ba] hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('signin')}
            className={`py-2 px-1.5 rounded-xl transition-all flex items-center justify-center gap-1 text-[11px] sm:text-xs ${
              authMode === 'signin'
                ? 'bg-[#18273f] text-blue-400 border border-blue-500/40 shadow-xs'
                : 'text-[#8ea0ba] hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('reset')}
            className={`py-2 px-1.5 rounded-xl transition-all flex items-center justify-center gap-1 text-[11px] sm:text-xs ${
              authMode === 'reset'
                ? 'bg-[#18273f] text-amber-400 border border-amber-500/40 shadow-xs'
                : 'text-[#8ea0ba] hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Reset Password</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-4">
          {/* TAB 1: 1ST TIME ONBOARDING FLOW */}
          {authMode === 'setup' && (
            <div className="space-y-3.5">
              {/* Google One-Click Sign In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleSigningIn}
                className="w-full py-2.5 px-4 rounded-xl bg-[#142033] hover:bg-[#1b2b44] border border-[#2d3e58] hover:border-emerald-500/50 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>{isGoogleSigningIn ? 'Connecting Google Account...' : 'Continue with Google (Auto Drive Sync)'}</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#26344b]"></div>
                <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-[#64748b]">or create with username & password</span>
                <div className="flex-grow border-t border-[#26344b]"></div>
              </div>

              <form onSubmit={handleCompleteSetup} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#8ea0ba] mb-1">
                      Your Name / Display Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#5d708a] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={setupDisplayName}
                        onChange={e => setSetupDisplayName(e.target.value)}
                        placeholder="Display name"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#090f1a] border border-[#26344b] text-xs text-white placeholder-[#5d708a] focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#8ea0ba] mb-1">
                      Email Address (Optional)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#5d708a] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={setupEmail}
                        onChange={e => setSetupEmail(e.target.value)}
                        placeholder="user@gmail.com"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#090f1a] border border-[#26344b] text-xs text-white placeholder-[#5d708a] focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#c8d4e5] mb-1">
                      Choose Username *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#5d708a] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={setupUsername}
                        onChange={e => setSetupUsername(e.target.value)}
                        placeholder="Username"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#090f1a] border border-[#26344b] text-xs text-white placeholder-[#5d708a] focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-[#c8d4e5]">
                        Choose Password *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowSetupPassword(prev => !prev)}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                      >
                        {showSetupPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showSetupPassword ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#5d708a] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showSetupPassword ? 'text' : 'password'}
                        required
                        value={setupPassword}
                        onChange={e => setSetupPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full pl-9 pr-10 py-2 rounded-xl bg-[#090f1a] border border-[#26344b] text-xs text-white placeholder-[#5d708a] focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSetupPassword(prev => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71839d] hover:text-emerald-400 p-0.5"
                      >
                        {showSetupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8ea0ba] mb-1">
                    Default Currency
                  </label>
                  <select
                    value={setupCurrency}
                    onChange={e => setSetupCurrency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#090f1a] border border-[#26344b] text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {SUPPORTED_CURRENCIES.map(curr => (
                      <option key={curr.code} value={curr.code}>
                        {curr.symbol} {curr.name} ({curr.code})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isCreatingAccount}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isCreatingAccount ? 'Creating Account & Ledger...' : 'Create Account & Start Ledger'}</span>
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setAuthMode('signin')}
                    className="text-xs text-[#8ea0ba] hover:text-blue-400 transition-colors"
                  >
                    Already created an account? <span className="font-bold underline text-blue-400">Sign in with Username & Password</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: SIGN IN WITH USERNAME & PASSWORD */}
          {authMode === 'signin' && (
            <div className="space-y-4">
              {/* Google One-Click Sign In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleSigningIn}
                className="w-full py-2.5 px-4 rounded-xl bg-[#142033] hover:bg-[#1b2b44] border border-[#2d3e58] hover:border-blue-500/50 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>{isGoogleSigningIn ? 'Connecting Google Account...' : 'Continue with Google (Auto Drive Sync)'}</span>
              </button>

              <div className="relative flex py-0.5 items-center">
                <div className="flex-grow border-t border-[#26344b]"></div>
                <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-[#64748b]">or sign in with password</span>
                <div className="flex-grow border-t border-[#26344b]"></div>
              </div>

              {storedUsers.length > 0 && (
                <div className="p-2.5 rounded-xl bg-[#090f1a] border border-[#26344b]">
                  <div className="text-[11px] font-semibold text-[#8ea0ba] mb-1.5">
                    Saved accounts on this browser:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {storedUsers.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setSignInIdentifier(u.username)}
                        className="px-2.5 py-1 rounded-lg bg-[#142033] hover:bg-[#1f314f] border border-[#26344b] text-xs font-semibold text-[#dbe6f6] flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <User className="w-3 h-3 text-blue-400" />
                        <span>{u.username}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSignIn} className="space-y-3 p-4 rounded-xl bg-[#0d1728] border border-[#26344b]">
                <div>
                  <label className="block text-xs font-bold text-[#c8d4e5] mb-1">
                    Username or Email *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#5d708a] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={signInIdentifier}
                      onChange={e => setSignInIdentifier(e.target.value)}
                      placeholder="Username or user@gmail.com"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#090f1a] border border-[#26344b] text-xs text-white placeholder-[#5d708a] focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-[#c8d4e5]">
                      Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword(prev => !prev)}
                      className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      {showSignInPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showSignInPassword ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#5d708a] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showSignInPassword ? 'text' : 'password'}
                      required
                      value={signInPassword}
                      onChange={e => setSignInPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full pl-9 pr-10 py-2 rounded-xl bg-[#090f1a] border border-[#26344b] text-xs text-white placeholder-[#5d708a] focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71839d] hover:text-blue-400 p-0.5 cursor-pointer"
                    >
                      {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setResetIdentifier(signInIdentifier);
                      setAuthMode('reset');
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                  >
                    Forgot / Reset Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSigningIn}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isSigningIn ? 'Signing In...' : 'Sign In with Username & Password'}</span>
                </button>
              </form>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setAuthMode('setup')}
                  className="text-xs text-[#8ea0ba] hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  First time visiting? <span className="font-bold underline text-emerald-400">Click here to create your account</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: RESET PASSWORD */}
          {authMode === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 flex items-start gap-2.5">
                <KeyRound className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-200">Reset Account Password</div>
                  <div className="text-[11px] text-amber-300/90 mt-0.5">
                    Enter your registered email or username below. If a recovery email is associated with your account, Firebase will send a secure password reset link.
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#c8d4e5] mb-1">
                  Registered Username or Email *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#5d708a] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={resetIdentifier}
                    onChange={e => setResetIdentifier(e.target.value)}
                    placeholder="Username or user@gmail.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#090f1a] border border-[#26344b] text-xs text-white placeholder-[#5d708a] focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="text-[11px] text-[#71839d] mt-1">
                  Accounts registered with a recovery email address receive an official Firebase reset link in their inbox.
                </div>
              </div>

              <button
                type="submit"
                disabled={isResetting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-lg shadow-amber-900/30 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isResetting ? 'Sending Reset Link...' : 'Send Password Reset Link'}</span>
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setAuthMode('signin')}
                  className="text-[#8ea0ba] hover:text-blue-400"
                >
                  ← Back to Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('setup')}
                  className="text-[#8ea0ba] hover:text-emerald-400"
                >
                  Create New Account
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

