# My Finance — Personal Expense & Savings Tracker

A production-ready personal finance web app (static client-side, GitHub Pages friendly).

**Version:** 0.8.0

## Features

- **Dashboard** — monthly calendar, income/expense/investment cards, **annual net cash saved**, compound growth calculator
- **Transactions** — search, type/month/category/**sub-category**/account filters, bulk actions, Excel export
- **Income / Expenses / Investments** — dedicated views with period navigation
- **Investments & Savings** — **Net Cash Saved** (liquid) vs **Net Investments** (capital deployed) as separate metrics
- **Analytics** — category breakdowns and monthly comparisons
- **Savings goals** with optional expense budget
- **Excel import/export** and **full JSON backup/restore**
- **Category & subcategory CRUD** with up/down reordering and drag support
- **Tabbed Settings** — Account, Security, Data & Backup, Categories, Sync & Share
- **Multi-device cloud sync** via Firebase + shareable ledger link
- **Secure lock screen** after every page load
- Modern dark glass UI, FAB, micro-animations

## Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Build (GitHub Pages)

```bash
VITE_BASE=/finance-tracker/ npm run build
# deploy the dist/ folder to GitHub Pages
```

Or local production:

```bash
npm run build
npm start
```

## Security

- Username/email + password required after every reload
- Passwords managed by Firebase Auth only
- Cloud ledgers are owner-bound to Firebase UID

## Changelog 0.8.0

- Sub-category filter on Transactions
- Annual net cash saved + year investments on Dashboard
- Compound interest / SIP calculator widget
- Investments page: Net Cash Saved vs Net Investments split
- Tabbed Profile & Settings redesign
- Category rename preserves order; CRUD + reorder controls
- JSON backup restore uses replace mode reliably
- Richer glass UI, FAB, animations
<<<<<<< HEAD

## Cross-window and cross-device persistence

- **Same browser profile / regular tabs:** local cache changes are reloaded through the browser `storage` event, so tabs can reflect updates made in another tab.
- **Incognito windows and other devices:** browser storage is isolated by the browser. Sign in to the same account and open the same Firebase ledger so Firestore real-time sync can share transactions, categories, category order, Need/Want rules, savings goals, and currency.
- **Local/network development links:** both links must point to an app build configured for the same Firebase project (`.env` / Firebase app config) and the same ledger. A Vite dev server alone does not make local browser data global.
- **Offline/guest mode:** data remains in that browser's local storage and cannot be shared with incognito or other devices until a shared cloud ledger is available.

## Category migration

The built-in expense list is now the canonical 11-category list (Food, Transport, Rent & Housing, Utility & Bills, Household, Health, Education, Personal (Apparel + Beauty), Social & Lifestyle (Culture + Social), Gift & Donation, Miscellaneous). Known legacy names are mapped to the new labels, and existing subcategories are carried into their mapped categories. Legacy expense labels are not retained as duplicate categories. Back up your data before first launch after an update.

## Development

```bash
npm install
npm run dev
```

To verify a production bundle after dependencies are installed:

```bash
npm run lint
npm run build
```
=======
>>>>>>> ef174d7 (Update finance tracker)
