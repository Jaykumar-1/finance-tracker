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

const MainLayout: React.FC = () => {
  const { activePage, isUnlocked } = useFinance();
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
        <main className="flex-1 p-2.5 sm:p-4 md:p-7 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
          {renderActivePage()}
        </main>
      </div>

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
