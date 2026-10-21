import React, { useState } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { TransactionsPage } from './components/TransactionsPage';
import { IncomePage } from './components/IncomePage';
import { ExpensesPage } from './components/ExpensesPage';
import { InvestmentsPage } from './components/InvestmentsPage';
import { AnalyticsPage } from './components/AnalyticsPage';
import { ProfileSettingsPage } from './components/ProfileSettingsPage';
import { TransactionModal } from './components/TransactionModal';
import { SavingsGoalsModal } from './components/SavingsGoalsModal';
import { CategoryModal } from './components/CategoryModal';
import { AuthModal } from './components/AuthModal';
import { MultiDeviceModal } from './components/MultiDeviceModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { LockScreen } from './components/LockScreen';
import { ToastContainer } from './components/ToastContainer';
import { Plus } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { activePage, isUnlocked, openTxModal } = useFinance();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'transactions':
        return <TransactionsPage />;
      case 'income':
        return <IncomePage />;
      case 'expenses':
        return <ExpensesPage />;
      case 'investments':
        return <InvestmentsPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'profile':
        return <ProfileSettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#090f1a] text-[#e8eef8] font-sans antialiased flex items-center justify-center p-4 relative">
        <LockScreen />
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090f1a] text-[#e8eef8] font-sans antialiased flex flex-col selection:bg-blue-600 selection:text-white">
      <Navbar onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)} />
      <div className="flex-1 flex w-full">
        <Sidebar isMobileOpen={isMobileMenuOpen} onCloseMobile={() => setIsMobileMenuOpen(false)} />
<<<<<<< HEAD
        <main className="flex-1 p-2.5 sm:p-4 md:p-7 max-w-7xl mx-auto w-full min-w-0 overflow-x-clip animate-fade-in-up">
=======
        <main className="flex-1 p-2.5 sm:p-4 md:p-7 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden animate-fade-in-up">
>>>>>>> ef174d7 (Update finance tracker)
          {renderActivePage()}
        </main>
      </div>

      {/* Floating Action Button — quick add transaction */}
      <button
        onClick={() => openTxModal('expense')}
        title="Add transaction"
        aria-label="Add transaction"
        className="fab-primary fixed bottom-5 right-5 z-40 w-14 h-14 rounded-2xl flex items-center justify-center text-white md:bottom-7 md:right-7"
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </button>

      {/* Modals & Portals */}
      <TransactionModal />
      <SavingsGoalsModal />
      <CategoryModal />
      <AuthModal />
      <MultiDeviceModal />
      <ExcelImportModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <FinanceProvider>
      <MainLayout />
    </FinanceProvider>
  );
}
