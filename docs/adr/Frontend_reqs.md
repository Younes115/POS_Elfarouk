# Frontend Requirements & UX Strategy (POS System)

## 🛠️ Tech Stack (التقنيات المستخدمة)
* **Framework:** React.js (via Vite) + TypeScript.
* **Styling:** Tailwind CSS (for rapid, responsive design).
* **UI Components:** Shadcn UI (Accessible, modern, customizable components).
* **State Management:** Zustand (For handling the Cart/Invoice state before database commit).
* **Routing:** React Router (For navigating between Cashier, Inventory, and Reports).
* **Icons:** Lucide React.

---

## 🎯 UX Golden Rules (قواعد تجربة المستخدم)
1. **Scanner-First Approach:** The barcode search input must ALWAYS be auto-focused. The cashier should not need to touch the mouse to scan an item.
2. **Keyboard Shortcuts:** Implement hotkeys (e.g., `F12` to Print/Checkout, `F4` to clear cart, `ESC` to cancel).
3. **Visual Hierarchy:** Critical data (Total Price, Available Stock, Variant Size/Color) must be large, bold, and color-coded.
4. **Error Prevention:** Show clear toast notifications for insufficient stock or invalid barcodes instead of breaking the UI.

---

## 📱 Core Screens & Features (الشاشات الرئيسية)

### 1. Cashier Screen (شاشة البيع السريعة - The Cart)
* **Search/Scan Bar:**
  * Accepts barcode scanner input directly.
  * Allows manual text search (Case-insensitive).
  * Dropdown results must clearly show: `Name | Color | Size | Stock | Price` to prevent selecting the wrong variant.
* **Invoice Table (سلة المشتريات):**
  * Auto-merge logic: Scanning the same SKU twice increments the `quantity` instead of adding a new row.
  * Manual adjustment: Quantity field with `+` and `-` buttons.
  * Delete button to remove an item from the draft.
* **Checkout Sidebar:**
  * Displays Subtotal, Discount Input (in EGP), and Final Total.
  * **"Print & Checkout" Button:** The ONLY trigger that sends data to the `createOrder` backend service.

### 2. Inventory Management (إدارة المخزن)
* **Products Data Table:**
  * Displays all SKUs with sorting and filtering (by Category: Sneakers, Heels, Bags).
  * Highlights low-stock items in red.
* **Add/Edit Product Modal:**
  * Inputs for Name, Category (Dropdown), Color, Size (Optional), Cost Price, Selling Price, and Initial Stock.
  * Auto-generate SKU option or manual barcode entry.
* **Barcode Printing:**
  * A dedicated button next to each product to trigger the 80mm/Barcode printer layout.

### 3. Returns Screen (شاشة المرتجعات)
* A specialized view of the Cashier screen.
* Items added here automatically default to negative quantities (`-1`).
* Clearly styled in a different theme (e.g., Warning/Orange tones) so the cashier knows they are in Return mode, not Sale mode.

### 4. End of Day & Expenses (تقفيل الوردية والمصروفات)
* **Expenses Entry:** Simple form (Description + Amount).
* **Daily Summary Dashboard:**
  * Fetch `getDailySummary` for the current date.
  * Display visually distinct cards: Gross Sales, Returns Deductions, Total Expenses, and **Net Cash in Drawer**.