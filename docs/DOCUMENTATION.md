# POS & Inventory Management System Documentation

## 1. System Overview

This application is an offline-first, desktop Point of Sale (POS) and inventory management system purpose-built for retail environments. Engineered for reliability without requiring an active internet connection, it leverages a robust local database persistence model to ensure data sovereignty and low-latency operations. The system utilizes ACID-compliant transactions for all financial and inventory movements, guaranteeing that stock levels, sales records, and returns remain perfectly synchronized and consistent at all times.

## 2. Tech Stack

The application is built on a modern, high-performance web and desktop technology stack:

- **Electron**: Serves as the desktop packaging and runtime environment, providing deep OS integration (native file dialogs, background processing, raw printing) while running a chromium-based UI.
- **React.js**: Powers the dynamic, component-driven user interface.
- **Prisma ORM**: Acts as the database access layer, providing a strongly-typed schema and managing the underlying local **SQLite** database.
- **Zustand**: A small, fast, and scalable state-management solution used for managing transient frontend state like the active shopping cart.
- **Tailwind CSS & Radix UI / shadcn**: Used for building a highly responsive, accessible, and premium UI.

## 3. Core Modules & Features

### Cashier / Checkout
The primary operational hub of the system.
- **Cart Management**: Seamlessly add items via barcode scanning or manual search, adjust quantities, and remove items.
- **Pricing & Discounts**: Apply order-level discounts manually, with real-time recalculation of the subtotal and net total.
- **Offline Transactions**: Checkouts are finalized instantly via Prisma `$transaction` blocks, updating stock levels and generating the sale record simultaneously to prevent race conditions.

### Inventory Management
- **Product Tracking**: Complete CRUD (Create, Read, Update, Delete) operations for retail products.
- **SKU & Stock Management**: Real-time tracking of available stock quantities, custom SKUs, sizes, colors, and cost vs. selling prices.
- **Alerts**: Automatic prevention of overselling when stock levels drop to zero.

### Returns & Exchanges
- **Smart Search**: Lookup historical orders instantly by scanning the short `invoiceNumber` (barcode on the printed receipt) or the internal system `receiptNumber`.
- **Refund Processing**: Process partial or full refunds. The system uses a double-entry accounting approach: generating a new negative-value adjustment order and safely restoring product stock automatically.

### Expenses & Reports
- **Expense Logging**: Track daily operational costs (utilities, supplies, etc.) categorizing them for accurate net-profit calculations.
- **Reporting**: Aggregate daily and monthly sales metrics. Reports contrast gross revenue, discounts, returns, and expenses to provide a clear picture of net profitability.

## 4. Hardware & Custom Integrations

### Global Hardware Barcode Scanner
- **`useBarcodeScanner` Hook**: A custom React hook that listens globally for rapid, machine-generated keystrokes (typically < 30ms apart). 
- **Smart Interception**: It captures the scanned string and intercepts the terminating 'Enter' key (`e.preventDefault()`, `e.stopPropagation()`) to prevent accidental double-submissions even if an input field is currently focused.

### Thermal Printer Support
- **Silent Printing**: Receipts bypass the standard OS-level print preview dialogs for high-speed checkout.
- **Electron IPC**: The React frontend sends HTML snapshot payloads to the Electron main process via Inter-Process Communication (IPC). The main process then spawns a hidden `BrowserWindow`, loads the content, and executes `webContents.print({ silent: true })` directly to the default thermal printer.

### Smart Invoice Sequence
- **Human-Readable Identifiers**: Unlike long UUIDs, the system generates clean, sequential invoice numbers formatted as `YYMMDD-XXX` (e.g., `260720-001`).
- **Daily Resets**: The sequence logic dynamically tracks the date. When a new day begins, the counter (`XXX`) safely resets to `001`. This ensures barcodes are short, scannable, and receipts are easily identifiable by human cashiers.

## 5. Data Security & Management

### Backup & Restore Workflow
Given the offline-first nature, local database management is a critical priority. The system provides an end-to-end USB backup and restore interface directly within the app.

- **Manual Backup**: Users can trigger an Electron `dialog.showSaveDialog` to export a copy of the SQLite file to an external USB drive. The system auto-suggests a date-stamped filename (e.g., `POS_Backup_YYYY-MM-DD.sqlite`).
- **Safe Restore (Crucial)**: 
  1. The user selects a backup file via `dialog.showOpenDialog`.
  2. **File Lock Release**: Before overwriting the active database, the system explicitly calls `await prisma.$disconnect()`. This releases the Prisma file lock on the SQLite file, preventing catastrophic `EBUSY` (Device or resource busy) OS-level errors.
  3. **File Replacement**: Node's `fs.copyFileSync` safely overwrites the database.
  4. **Clean Re-initialization**: Immediately following the copy, the main process executes `app.relaunch()` followed by `app.exit(0)`. This forces the entire Electron application to restart cleanly, allowing Prisma to re-initialize safely against the newly restored database.

## 6. Developer Guide

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### Local Development
To run the application in development mode with hot-reloading:

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client
npx prisma generate

# 3. Start the application (Vite Dev Server + Electron)
npm run dev
```

### Production Build
To compile the TypeScript, bundle the Vite assets, and package the application into a standalone `.exe` installer for Windows:

```bash
# 1. Ensure the Prisma client is up to date
npx prisma generate

# 2. Compile and Build
npm run build

# 3. Package the app
# The output will be located in the /dist or /out directory depending on the electron-builder config
npm run package
```
