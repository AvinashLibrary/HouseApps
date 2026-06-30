# MindfulSpend · Intentional Finance

A household budget tracker built with React.

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm start
```

The app opens at **http://localhost:3000**

## Project Structure

```
src/
├── index.js                  # React entry point
├── index.css                 # Global styles & design tokens
├── App.jsx                   # Root component (hub vs app routing)
│
├── context/
│   └── AppContext.jsx         # Global state (groups, expenses, log)
│
└── components/
    ├── HubView.jsx            # Group selection screen
    ├── GroupEditor.jsx        # Create / edit household group
    ├── AppView.jsx            # Main app layout (sidebar + tabs)
    ├── Sidebar.jsx            # Left navigation
    ├── DashboardTab.jsx       # Overview with stat cards & category progress
    ├── TrackTab.jsx           # Month-by-month expense tracker table
    ├── BudgetTab.jsx          # Income cards & budget allocation table
    ├── AnalysisTab.jsx        # Budget vs actual comparison
    ├── ReceiptsTab.jsx        # Bills grid & activity log
    ├── BillModal.jsx          # Add expense modal
    └── Toast.jsx              # Notification toast
```

## Features

- **Multi-group support** — create multiple household groups with different members
- **Member income tracking** — gross salary, family deductions, net income per person
- **Custom budget allocation** — configure % splits across categories and sub-categories
- **Expense tracking** — log bills per month, per category
- **Dashboard** — stat cards, category progress bars, donut chart
- **Analysis** — budget vs actual with savings/overspend per category
- **Receipts & Log** — bill grid view + activity changelog
- **Persistent storage** — all data saved to localStorage

## Tech Stack

- React 18
- CSS custom properties (no external UI library)
- localStorage for persistence
