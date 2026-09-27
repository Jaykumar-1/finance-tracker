import { CategoryConfig } from '../types/finance';

export const DEFAULT_CATEGORIES: CategoryConfig = {
  income: {
    'Salary': ['Monthly Salary', 'Bonus', 'Overtime', 'Incentives'],
    'Allowance': ['Family Pocket Money', 'Stipend', 'Per Diem'],
    'Freelance': ['Client Projects', 'Consulting', 'Design / Dev Work', 'Content Creation'],
    'Interest & Dividends': ['Bank Interest', 'FD Interest', 'Stock Dividends', 'Mutual Fund Gains'],
    'Rental / Property': ['Tenant Rent', 'Commercial Lease'],
    'Refund & Cashback': ['Tax Refund', 'E-commerce Cashback', 'Travel Refund'],
    'Business Inflow': ['Product Sales', 'Service Revenue'],
    'Other': ['Gifts Received', 'Lottery', 'Misc Income']
  },

  expense: {
    'Food & Dining': [
      'Regular Meals',
      'Breakfast',
      'Groceries (Fruits, Veggies, Dairy)',
      'Snacks & Biscuits',
      'Eating out & Dining',
      'Online Delivery (Zomato/Swiggy/DoorDash)',
      'Healthy Food & Beverages',
      'Fitness Food',
      'Ice Cream & Bakeries'
    ],
    'Transport': [
      'Metro / Subway',
      'Bus & Public Transit',
      'Fuel & Petrol / Diesel / EV',
      'Auto / Taxi (Ola/Uber/Cab)',
      'Train & Rail Tickets',
      'Vehicle Maintenance & Service',
      'Parking & Tolls',
      'Flight Tickets'
    ],
    'Rent & Housing': [
      'Monthly Rent',
      'Maintenance Charges',
      'Property Taxes',
      'Home Repairs & Hardware'
    ],
    'Utility and Bills': [
      'Electricity Bill',
      'Mobile Recharges & Postpaid',
      'Subscriptions (Netflix, Spotify, Prime)',
      'Water & Sewer',
      'Internet / Broadband WiFi',
      'LPG / Gas Cylinder',
      'Bank Fees & Card Charges'
    ],
    'Household & Living': [
      'Small Appliances',
      'Furniture & Home Decor',
      'Kitchen Utensils & Supplies',
      'Toiletries & Detergents',
      'Cleaning & Housekeeping'
    ],
    'Health': [
      'Medicines & Pharmacy',
      'Doctor & Hospital Visits',
      'Lab Tests & Diagnostic',
      'Gym & Yoga Membership',
      'Health & Term Insurance',
      'Dental & Vision Care'
    ],
    'Education': [
      'School / College Fees',
      'Books & Stationery',
      'Online Courses & Certifications',
      'Workshops & Seminars'
    ],
    'Personal Care & Apparel': [
      'Clothing & Footwear',
      'Salon, Spa & Haircut',
      'Watches & Accessories',
      'Skincare & Cosmetics',
      'Electronics & Gadgets'
    ],
    'Miscellaneous': [
      'Unplanned Expense',
      'One-off Purchases'
    ],
    'Social & Entertainment': [
      'Movies & Cinema',
      'Concerts & Event Tickets',
      'Outing with Friends',
      'Vacation & Holiday Trips',
      'Hobbies & Gaming'
    ],
    'Gifts & Donation': [
      'Gifts to Loved Ones',
      'Charity & NGO Donations',
      'Festival Celebrations'
    ],
    'Family and Kids': [
      'Childcare & Daycare',
      'Toys & Baby Care',
      'Parents Support'
    ]
  },

  investment: {
    'Mutual Funds & SIP': ['Index SIP', 'Flexi Cap SIP', 'Lump sum MF', 'ELSS Tax Saver'],
    'Stocks & Equities': ['Direct Equity Buy', 'Blue Chip Stocks', 'Growth Stocks'],
    'ETFs': ['Nifty ETF', 'Metal ETF', 'Stock ETF'],
    'Gold & Silver': ['Physical Gold', 'Sovereign Gold Bonds (SGB)', 'Digital Gold', 'Silver'],
    'Fixed Deposits / RD': ['Bank FD', 'Corporate FD', 'Bank Recurring Deposit'],
    'Retirement / Govt Schemes': ['PPF (Public Provident Fund)', 'NPS (National Pension System)', 'EPF / PF', 'Sukanya Samriddhi'],
    'Crypto & Web3': ['Bitcoin', 'Ethereum', 'Altcoins', 'Staking'],
    'Real Estate & Land': ['Plot EMI', 'REITs', 'Commercial Unit'],
    'Emergency Fund / Savings': ['High-Yield Savings', 'Liquid Fund Deposit'],
    'Other Assets': ['Peer-to-Peer Lending', 'Startup / Angel Investment', 'Art / Collectibles']
  }
};

export const SUPPORTED_CURRENCIES: { code: string; symbol: string; name: string; locale: string }[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)', locale: 'en-IN' },
  { code: 'USD', symbol: '$', name: 'US Dollar (USD)', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro (EUR)', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'British Pound (GBP)', locale: 'en-GB' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham (AED)', locale: 'ar-AE' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CAD)', locale: 'en-CA' },
  { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar (AUD)', locale: 'en-AU' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar (SGD)', locale: 'en-SG' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (JPY)', locale: 'ja-JP' },
];

export const DEFAULT_ACCOUNTS = [
  'UPI',
  'Bank account',
  'Credit card',
  'Cash',
  'Savings',
  'Demat / Brokerage',
  'Crypto wallet',
  'Other'
];

export const ACCOUNT_OPTIONS = DEFAULT_ACCOUNTS;
