import { useState, useRef, useEffect, useCallback } from 'react';
import { ScanBarcode, ShoppingCart, Trash2, Plus, Minus, BadgeCheck, Search, Printer, ReceiptText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useCartStore } from '@/store/useCartStore';
import type { CartItem } from '@/store/useCartStore';
import ReceiptTicket from '@/components/ReceiptTicket';
import type { ProductRecord } from '../../main/types';

// ── Receipt snapshot type (frozen at checkout time) ──
interface ReceiptSnapshot {
  receiptNumber: string;
  items: CartItem[];
  subTotal: number;
  discount: number;
  total: number;
  date: string;
}

export default function Cashier() {
  // ── Scanner + search state ─────────────────
  const [scanInput, setScanInput] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<ProductRecord[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Checkout state ─────────────────────────
  const [discount, setDiscount] = useState<number>(0);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  // ── Receipt preview modal state ─────────────
  const [receiptData, setReceiptData] = useState<ReceiptSnapshot | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // ── Cart store ─────────────────────────────
  const cart = useCartStore((s) => s.cart);
  const addToCart = useCartStore((s) => s.addToCart);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeFromCart = useCartStore((s) => s.removeFromCart);
  const clearCart = useCartStore((s) => s.clearCart);

  // ── Computed totals ────────────────────────
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subTotal = cart.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0,
  );
  const netTotal = Math.max(0, subTotal - discount);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EGP' }).format(price);

  // ── Close dropdown on outside click ────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Live search (debounced) ────────────────

  const doSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    try {
      const result = await window.api.searchProducts(query);
      if (result.success) {
        setSearchResults(result.data);
        setShowDropdown(result.data.length > 0);
        setHighlightedIndex(-1);
      }
    } catch {
      // Silently ignore search errors
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setScanInput(value);
    if (scanError) setScanError(null);

    // Debounce the search by 250ms
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => doSearch(value.trim()), 250);
  };

  // ── Select product from dropdown ───────────

  const handleSelectProduct = (product: ProductRecord) => {
    if (product.stock <= 0) {
      setScanError(`Out of stock: ${product.name}`);
    } else {
      addToCart(product);
      setScanError(null);
    }
    setScanInput('');
    setSearchResults([]);
    setShowDropdown(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  // ── Keyboard handler (Enter scan + dropdown nav) ──

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Arrow navigation in dropdown
    if (showDropdown && searchResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        return;
      }
      if (e.key === 'Escape') {
        setShowDropdown(false);
        setHighlightedIndex(-1);
        return;
      }
      // Enter with highlighted item → select it
      if (e.key === 'Enter' && highlightedIndex >= 0) {
        e.preventDefault();
        handleSelectProduct(searchResults[highlightedIndex]);
        return;
      }
    }

    // Enter without dropdown selection → exact SKU scan
    if (e.key !== 'Enter') return;

    const sku = scanInput.trim();
    if (!sku) return;

    // Close dropdown first
    setShowDropdown(false);
    setHighlightedIndex(-1);
    setScanError(null);

    try {
      const result = await window.api.getProductBySku(sku);

      if (!result.success) {
        setScanError('Lookup failed. Please try again.');
        setScanInput('');
        inputRef.current?.focus();
        return;
      }

      const product = result.data;

      if (!product) {
        setScanError(`Product not found: "${sku}"`);
        setScanInput('');
        inputRef.current?.focus();
        return;
      }

      if (product.stock <= 0) {
        setScanError(`Out of stock: ${product.name}`);
        setScanInput('');
        inputRef.current?.focus();
        return;
      }

      addToCart(product);
      setScanInput('');
      setScanError(null);
      inputRef.current?.focus();
    } catch {
      setScanError('An error occurred while scanning.');
      setScanInput('');
      inputRef.current?.focus();
    }
  };

  // ── Checkout handler (DB-first, modal-second) ──

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    setIsCheckingOut(true);
    setCheckoutSuccess(false);
    setScanError(null);

    const receiptNumber = `RCPT-${Date.now()}`;

    const orderItems = cart.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      costAtSale: item.product.costPrice,
      priceAtSale: item.product.sellingPrice,
    }));

    const orderData = {
      receiptNumber,
      subTotal,
      discountValue: discount,
      total: netTotal,
      type: 'SALE' as const,
    };

    // ── STEP 1: Save to database (blocking) ──
    try {
      const result = await window.api.createOrder(orderData, orderItems);

      if (!result.success) {
        setScanError(`Checkout failed: ${result.error}`);
        setIsCheckingOut(false);
        return; // DO NOT clear cart — let the cashier retry
      }
    } catch (err) {
      setScanError(
        `Checkout error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
      setIsCheckingOut(false);
      return; // DO NOT clear cart — let the cashier retry
    }

    // ── STEP 2: Snapshot cart for receipt BEFORE clearing ──
    const snapshot: ReceiptSnapshot = {
      receiptNumber,
      items: cart.map((item) => ({ ...item, product: { ...item.product } })),
      subTotal,
      discount,
      total: netTotal,
      date: new Date().toLocaleString('ar-EG', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      }),
    };

    // ── STEP 3: Reset UI immediately (cashier is free) ──
    clearCart();
    setDiscount(0);
    setIsCheckingOut(false);
    setCheckoutSuccess(true);

    setTimeout(() => {
      setCheckoutSuccess(false);
    }, 2500);

    // ── STEP 4: Show receipt preview modal ──
    setReceiptData(snapshot);
    setShowReceiptModal(true);
  };

  // ── Handle "New Invoice" — close modal, reset ──
  const handleNewInvoice = () => {
    setShowReceiptModal(false);
    setReceiptData(null);
    inputRef.current?.focus();
  };

  // ── Handle "Print" — trigger native browser print dialog ──
  const handlePrint = () => {
    window.print();
    handleNewInvoice();
  };

  // ── Render ─────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">

      {/* ══════════════ Left / Main Area (70%) ══════════════ */}
      <div className="flex flex-col flex-[7] border-r overflow-hidden">

        {/* Scanner + Search Bar */}
        <div className="p-4 border-b bg-card shrink-0">
          <div className="relative">
            <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              id="cashier-scan-input"
              className="pl-10 h-12 text-base font-mono"
              placeholder="Scan barcode, type SKU, or search by name…"
              value={scanInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (searchResults.length > 0 && scanInput.trim().length >= 2) {
                  setShowDropdown(true);
                }
              }}
              autoFocus
              autoComplete="off"
            />

            {/* ── Search Results Dropdown ── */}
            {showDropdown && searchResults.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute left-0 right-0 top-full mt-1 z-50 max-h-72 overflow-auto rounded-lg border bg-popover shadow-lg"
              >
                <div className="p-1.5">
                  <p className="px-2 py-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    <Search className="inline h-3 w-3 mr-1 -mt-0.5" />
                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                  </p>
                  {searchResults.map((product, index) => {
                    const isOutOfStock = product.stock <= 0;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors ${
                          index === highlightedIndex
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-muted/60'
                        } ${isOutOfStock ? 'opacity-50' : ''}`}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        onClick={() => handleSelectProduct(product)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">
                              {product.name}
                            </span>
                            {product.color && (
                              <span className="text-muted-foreground"> ({product.color})</span>
                            )}
                            {product.size && (
                              <span className="text-muted-foreground"> · Size: {product.size}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-mono text-xs text-muted-foreground">
                              {product.sku}
                            </span>
                            {isOutOfStock ? (
                              <span className="text-xs font-semibold text-destructive">OUT</span>
                            ) : (
                              <span className="font-semibold tabular-nums">
                                {formatPrice(product.sellingPrice)}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {scanError && (
            <p className="mt-2 text-sm text-destructive font-medium animate-in fade-in slide-in-from-top-1">
              ⚠ {scanError}
            </p>
          )}
        </div>

        {/* Cart Table */}
        <div className="flex-1 overflow-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <ShoppingCart className="h-16 w-16 opacity-25" />
              <p className="text-lg font-medium">Cart is empty</p>
              <p className="text-sm">Scan a product barcode to start a sale.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="pl-4">Product</TableHead>
                  <TableHead className="text-center w-16">Size</TableHead>
                  <TableHead className="text-right w-28">Unit Price</TableHead>
                  <TableHead className="text-center w-36">Quantity</TableHead>
                  <TableHead className="text-right w-28">Total</TableHead>
                  <TableHead className="text-center w-16">Del</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.map((item) => {
                  const { product, quantity } = item;
                  const lineTotal = product.sellingPrice * quantity;
                  const atStock = quantity >= product.stock;

                  return (
                    <TableRow key={product.id}>
                      {/* Product Name & Color */}
                      <TableCell className="pl-4">
                        <p className="font-medium leading-tight">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.color ?? ''}
                          {product.color && product.sku ? ' · ' : ''}
                          <span className="font-mono">{product.sku}</span>
                        </p>
                      </TableCell>

                      {/* Size */}
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {product.size ?? '—'}
                      </TableCell>

                      {/* Unit Price */}
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {formatPrice(product.sellingPrice)}
                      </TableCell>

                      {/* Quantity stepper */}
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() =>
                              updateQuantity(product.id, Math.max(1, quantity - 1))
                            }
                            disabled={quantity <= 1}
                            title="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          
                          <Input
                            type="number"
                            min={1}
                            max={product.stock}
                            value={quantity === 0 ? '' : quantity}
                            className="w-16 h-8 text-center font-semibold tabular-nums px-1"
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '') {
                                updateQuantity(product.id, 0); // 0 acts as temporary empty state
                                return;
                              }
                              
                              let newQty = parseInt(val, 10);
                              if (isNaN(newQty) || newQty < 1) newQty = 1;
                              
                              if (newQty > product.stock) {
                                newQty = product.stock;
                                alert(`Only ${product.stock} items available in stock!`);
                              }
                              
                              updateQuantity(product.id, newQty);
                            }}
                            onBlur={(e) => {
                              if (e.target.value === '' || quantity === 0) {
                                updateQuantity(product.id, 1);
                              }
                            }}
                          />

                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() =>
                              updateQuantity(product.id, quantity + 1)
                            }
                            disabled={atStock}
                            title={atStock ? 'Maximum stock reached' : 'Increase quantity'}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>

                      {/* Line Total */}
                      <TableCell className="text-right font-semibold whitespace-nowrap">
                        {formatPrice(lineTotal)}
                      </TableCell>

                      {/* Delete */}
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => removeFromCart(product.id)}
                          title="Remove from cart"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* ══════════════ Right Sidebar (30%) ══════════════ */}
      <div className="flex flex-col flex-[3] bg-card overflow-hidden">

        {/* Header */}
        <div className="p-5 border-b shrink-0">
          <h2 className="text-xl font-bold tracking-tight">Order Summary</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalItems} item{totalItems !== 1 ? 's' : ''} in cart
          </p>
        </div>

        {/* Totals Panel */}
        <div className="flex-1 p-5 flex flex-col gap-4 overflow-auto">

          {/* Subtotal row */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium tabular-nums">{formatPrice(subTotal)}</span>
          </div>

          {/* Discount input */}
          <div className="space-y-1.5">
            <label
              htmlFor="discount-input"
              className="text-sm text-muted-foreground"
            >
              Discount (EGP)
            </label>
            <Input
              id="discount-input"
              type="number"
              min={0}
              step={1}
              placeholder="0"
              value={discount === 0 ? '' : String(discount)}
              onChange={(e) => {
                const val = Number(e.target.value);
                setDiscount(isNaN(val) || val < 0 ? 0 : val);
              }}
              className="h-9 text-sm"
            />
            {discount > 0 && (
              <p className="text-xs text-muted-foreground">
                — {formatPrice(discount)} applied
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Net Total */}
          <div className="flex justify-between items-baseline">
            <span className="text-base font-semibold">Total</span>
            <span className="text-3xl font-bold tracking-tight tabular-nums">
              {formatPrice(netTotal)}
            </span>
          </div>
        </div>

        {/* Checkout Button */}
        <div className="p-5 border-t shrink-0">
          {checkoutSuccess ? (
            <div className="w-full h-14 rounded-lg bg-green-500 text-white flex items-center justify-center gap-2 text-base font-bold animate-in fade-in zoom-in-95">
              <BadgeCheck className="h-5 w-5" />
              Sale Completed!
            </div>
          ) : (
            <Button
              id="btn-checkout"
              className="w-full h-14 text-base font-bold gap-2"
              disabled={cart.length === 0 || isCheckingOut}
              onClick={handleCheckout}
            >
              {isCheckingOut ? (
                'Processing…'
              ) : (
                <>
                  <BadgeCheck className="h-5 w-5" />
                  Print &amp; Checkout
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* ══════════════ Receipt Preview Modal ══════════════ */}
      <Dialog open={showReceiptModal} onOpenChange={(open) => {
        if (!open) handleNewInvoice();
      }}>
        <DialogContent className="max-w-[420px] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <ReceiptText className="h-5 w-5" />
              معاينة الإيصال
            </DialogTitle>
            <DialogDescription className="text-xs">
              تأكد من بيانات الإيصال قبل الطباعة
            </DialogDescription>
          </DialogHeader>

          {/* Receipt Preview */}
          <div className="px-4 py-2">
            <div className="border border-gray-200 rounded-lg shadow-inner bg-gray-50 p-2">
              {receiptData && (
                <ReceiptTicket
                  receiptNumber={receiptData.receiptNumber}
                  items={receiptData.items}
                  subTotal={receiptData.subTotal}
                  discount={receiptData.discount}
                  total={receiptData.total}
                  date={receiptData.date}
                />
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="receipt-modal-actions flex gap-3 p-4 pt-2 border-t">
            <Button
              id="btn-receipt-print"
              className="flex-1 h-11 gap-2 font-bold"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
            <Button
              id="btn-receipt-new"
              variant="outline"
              className="flex-1 h-11 gap-2 font-bold"
              onClick={handleNewInvoice}
            >
              <ReceiptText className="h-4 w-4" />
              فاتورة جديدة
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
