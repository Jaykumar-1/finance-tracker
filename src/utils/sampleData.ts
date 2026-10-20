import { MonthlySavingsGoal, Transaction } from '../types/finance';
import { generateId, toIsoDate } from '../utils/formatters';

export function getSampleTransactions(): Transaction[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  const makeDate = (day: number, monthOffset: number = 0): string => {
    const d = new Date(year, month + monthOffset, day);
    return toIsoDate(d);
  };

  return [
    // Current Month Income
    {
      id: generateId(),
      date: makeDate(1),
      amount: 85000,
      type: 'income',
      category: 'Salary',
      subcategory: 'Monthly Salary',
      account: 'Bank account',
      note: 'August Tech Corp Salary Credit',
      updatedAt: new Date().toISOString()
    },
    {
      id: generateId(),
      date: makeDate(12),
      amount: 14500,
      type: 'income',
      category: 'Freelance',
      subcategory: 'Client Projects',
      account: 'UPI',
      note: 'Web Design Project milestone',
      updatedAt: new Date().toISOString()
    },
    {
      id: generateId(),
      date: makeDate(18),
      amount: 3200,
      type: 'income',
      category: 'Interest & Dividends',
      subcategory: 'Stock Dividends',
      account: 'Bank account',
      note: 'Quarterly Bluechip Dividend',
      updatedAt: new Date().toISOString()
    },

    // Current Month Expenses
    {
      id: generateId(),
      date: makeDate(2),
      amount: 22000,
      type: 'expense',
      category: 'Rent & Housing',
      subcategory: 'Monthly Rent',
      account: 'Bank account',
      note: 'Flat Apartment Rent via NEFT',
      updatedAt: new Date().toISOString()
    },
    {
      id: generateId(),
      date: makeDate(3),
      amount: 1850,
      type: 'expense',
      category: 'Utilities & Bills',
      subcategory: 'Electricity Bill',
      account: 'UPI',
      note: 'State Electricity Board bill',
      updatedAt: new Date().toISOString()
    },
    {
      id: generateId(),
      date: makeDate(5),
      amount: 4600,
      type: 'expense',
      category: 'Food & Dining',
      subcategory: 'Groceries (Fruits, Veggies, Dairy)',
      account: 'UPI',
      note: 'Weekly Organic Mart grocery',
      updatedAt: new Date().toISOString()
    },
    {
      id: generateId(),
      date: makeDate(8),
      amount: 1200,
      type: 'expense',
      category: 'Transport & Commute',
      subcategory: 'Fuel & Petrol / Diesel / EV',
      account: 'Credit card',
      note: 'Full Tank Petrol',
      updatedAt: new Date().toISOString()
    },
    {
      id: generateId(),
      date: makeDate(10),
      amount: 999,
      type: 'expense',
      category: 'Utilities & Bills',
      subcategory: 'Subscriptions (Netflix, Spotify, Prime)',
      account: 'Credit card',
      note: 'Entertainment OTT Pack',
      updatedAt: new Date().toISOString()
    },
    {
      id: generateId(),
      date: makeDate(14),
      amount: 2400,
      type: 'expense',
      category: 'Food & Dining',
      subcategory: 'Eating out & Dining',
      account: 'Credit card',
      note: 'Dinner with colleagues',
      updatedAt: new Date().toISOString()
    },
    {
      id: generateId(),
      date: makeDate(17),
      amount: 3500,
      type: 'expense',
      category: 'Health & Wellness',
      subcategory: 'Gym & Yoga Membership',
      account: 'UPI',
      note: 'Monthly fitness club pass',
      updatedAt: new Date().toISOString()
    },

    // Current Month Investments
    {
      id: generateId(),
      date: makeDate(5),
      amount: 15000,
      type: 'investment',
      category: 'Mutual Funds & SIP',
      subcategory: 'Index SIP',
      account: 'Bank account',
      note: 'Automated Nifty 50 Index Fund SIP',
      updatedAt: new Date().toISOString()
    },
    {
      id: generateId(),
      date: makeDate(15),
      amount: 10000,
      type: 'investment',
      category: 'Stocks & Equities',
      subcategory: 'Direct Equity Buy',
      account: 'Demat / Brokerage',
      note: 'Bluechip accumulation',
      updatedAt: new Date().toISOString()
    },
    {
      id: generateId(),
      date: makeDate(20),
      amount: 5000,
      type: 'investment',
      category: 'Gold & Silver',
      subcategory: 'Sovereign Gold Bonds (SGB)',
      account: 'Bank account',
      note: 'SGB Tranche tranche allocation',
      updatedAt: new Date().toISOString()
    },

    // Previous Month Sample Data for comparison
    {
      id: generateId(),
      date: makeDate(1, -1),
      amount: 85000,
      type: 'income',
      category: 'Salary',
      subcategory: 'Monthly Salary',
      account: 'Bank account',
      note: 'Previous Month Salary',
      updatedAt: new Date().toISOString()
    },
    {
      id: generateId(),
      date: makeDate(2, -1),
      amount: 22000,
      type: 'expense',
      category: 'Rent & Housing',
      subcategory: 'Monthly Rent',
      account: 'Bank account',
      note: 'Rent payment',
      updatedAt: new Date().toISOString()
    },
    {
      id: generateId(),
      date: makeDate(7, -1),
      amount: 14500,
      type: 'expense',
      category: 'Food & Dining',
      subcategory: 'Eating out & Dining',
      account: 'UPI',
      note: 'Family party & outings',
      updatedAt: new Date().toISOString()
    },
    {
      id: generateId(),
      date: makeDate(5, -1),
      amount: 25000,
      type: 'investment',
      category: 'Mutual Funds & SIP',
      subcategory: 'Index SIP',
      account: 'Bank account',
      note: 'Regular SIP deduction',
      updatedAt: new Date().toISOString()
    }
  ];
}

export function getSampleSavingsGoals(): MonthlySavingsGoal[] {
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return [
    {
      monthKey: currentKey,
      targetSavings: 35000,
      expenseBudget: 45000,
      note: 'Save 35k for year-end vacation fund & emergency buffer',
      updatedAt: new Date().toISOString()
    }
  ];
}
