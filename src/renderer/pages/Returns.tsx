import { useState, useRef } from 'react';
import ExchangeReceiptTicket from '@/components/ExchangeReceiptTicket';
import type { ExchangeReceiptTicketProps } from '@/components/ExchangeReceiptTicket';
import {
  Search,
  RotateCcw,
  ArrowLeftRight,
  PackageCheck,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ScanBarcode,
  Minus,
  Plus,
} from 'lucide-react';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { OrderWithItemsRecord, OrderItemRecord, ProductRecord } from '../../main/types';

// ── Helpers ──────────────────────────────────

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EGP' }).format(price);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

// ── Toast Component ──────────────────────────

interface ToastData {
  message: string;
  type: 'success' | 'error';
}

function Toast({ data, onClose }: { data: ToastData; onClose: () => void }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border backdrop-blur-sm animate-in slide-in-from-bottom-4 fade-in duration-300 ${
        data.type === 'success'
          ? 'bg-emerald-500/95 border-emerald-400/30 text-white'
          : 'bg-red-500/95 border-red-400/30 text-white'
      }`}
    >
      {data.type === 'success' ? (
        <CheckCircle2 className="h-5 w-5 shrink-0" />
      ) : (
        <AlertCircle className="h-5 w-5 shrink-0" />
      )}
      <span className="text-sm font-medium">{data.message}</span>
      <button
        onClick={onClose}
        className="ml-2 opacity-70 hover:opacity-100 transition-opacity text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}

// ── Quantity Stepper Component ────────────────

function QtyStepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        className="w-20 text-center font-semibold tabular-nums h-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      >
        <Plus className="h-4 w-4" />
      </Button>
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        / {max} available
      </span>
    </div>
  );
}

// ── Main Component ───────────────────────────

export default function Returns() {
  // ── Search state ────────────────────────────
  const [receiptInput, setReceiptInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderWithItemsRecord | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  // ── Refund dialog state ─────────────────────
  const [refundItem, setRefundItem] = useState<OrderItemRecord | null>(null);
  const [refundQty, setRefundQty] = useState(1);
  const [isRefunding, setIsRefunding] = useState(false);

  // ── Exchange dialog state ───────────────────
  const [exchangeItem, setExchangeItem] = useState<OrderItemRecord | null>(null);
  const [exchangeQty, setExchangeQty] = useState(1);
  const [exchangeSku, setExchangeSku] = useState('');
  const [exchangeProduct, setExchangeProduct] = useState<ProductRecord | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [exchangeSkuError, setExchangeSkuError] = useState<string | null>(null);
  const [isExchanging, setIsExchanging] = useState(false);
  const [exchangeReceiptData, setExchangeReceiptData] = useState<ExchangeReceiptTicketProps | null>(null);
  const [showExchangeReceipt, setShowExchangeReceipt] = useState(false);

  // ── Toast state ─────────────────────────────
  const [toast, setToast] = useState<ToastData | null>(null);




  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Helpers ─────────────────────────────────

  function getAvailableQty(item: OrderItemRecord): number {
    return item.quantity - (item.returnedQuantity ?? 0);
  }

  // ── Search order by receipt ─────────────────

  async function handleSearch() {
    const receipt = receiptInput.trim();
    if (!receipt) return;

    setIsSearching(true);
    setSearchError(null);
    setOrder(null);

    try {
      const result = await window.api.getOrderByReceipt(receipt);
      if (!result.success) {
        setSearchError(result.error);
      } else if (!result.data) {
        setSearchError(`No order found for receipt "${receipt}"`);
      } else {
        setOrder(result.data);
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSearching(false);
    }
  }

  async function refreshOrder() {
    if (!order) return;
    try {
      const result = await window.api.getOrderByReceipt(order.receiptNumber);
      if (result.success && result.data) {
        setOrder(result.data);
      }
    } catch {
      // Silent refresh failure
    }
  }

  // ── Open refund dialog ──────────────────────

  function openRefundDialog(item: OrderItemRecord) {
    const available = getAvailableQty(item);
    setRefundItem(item);
    setRefundQty(Math.min(1, available));
  }

  // ── Refund handler ──────────────────────────

  async function handleRefundConfirm() {
    if (!refundItem || refundQty <= 0) return;

    setIsRefunding(true);
    try {
      const result = await window.api.refundItem(refundItem.id, refundQty);
      if (!result.success) {
        showToast(`Refund failed: ${result.error}`, 'error');
      } else {
        showToast(
          `Refund successful — ${formatPrice(refundItem.priceAtSale * refundQty)} returned (×${refundQty})`,
          'success',
        );
        await refreshOrder();
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Refund error', 'error');
    } finally {
      setIsRefunding(false);
      setRefundItem(null);
      setRefundQty(1);
    }
  }

  // ── Open exchange dialog ────────────────────

  function openExchangeDialog(item: OrderItemRecord) {
    const available = getAvailableQty(item);
    setExchangeItem(item);
    setExchangeQty(Math.min(1, available));
    setExchangeSku('');
    setExchangeProduct(null);
    setExchangeSkuError(null);
  }

  // ── Exchange: SKU lookup ────────────────────

  async function handleExchangeSkuLookup() {
    const sku = exchangeSku.trim();
    if (!sku) return;

    setIsLookingUp(true);
    setExchangeSkuError(null);
    setExchangeProduct(null);

    try {
      const result = await window.api.getProductBySku(sku);
      if (!result.success) {
        setExchangeSkuError(result.error);
      } else if (!result.data) {
        setExchangeSkuError(`Product not found: "${sku}"`);
      } else {
        setExchangeProduct(result.data);
      }
    } catch (err) {
      setExchangeSkuError(err instanceof Error ? err.message : 'Lookup error');
    } finally {
      setIsLookingUp(false);
    }
  }

  // ── Exchange: confirm handler ───────────────

  async function handleExchangeConfirm() {
    if (!exchangeItem || !exchangeProduct || exchangeQty <= 0) return;

    setIsExchanging(true);
    try {
      const result = await window.api.exchangeItem(exchangeItem.id, exchangeQty, exchangeProduct.sku);
      if (!result.success) {
        showToast(`Exchange failed: ${result.error}`, 'error');
      } else {
        showToast(`Exchange completed successfully! (×${exchangeQty})`, 'success');
        
        // Prepare receipt data
        const diff = getPriceDifference();
        setExchangeReceiptData({
          receiptNumber: order?.receiptNumber || 'N/A',
          date: new Date().toLocaleString('en-EG', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
          }),
          oldItem: {
            name: exchangeItem.product?.name ?? 'Unknown',
            size: exchangeItem.product?.size,
            color: exchangeItem.product?.color,
            quantity: exchangeQty,
            price: exchangeItem.priceAtSale,
          },
          newItem: {
            name: exchangeProduct.name,
            size: exchangeProduct.size,
            color: exchangeProduct.color,
            quantity: exchangeQty,
            price: exchangeProduct.sellingPrice,
          },
          netDifference: diff * exchangeQty,
        });
        setShowExchangeReceipt(true);

        await refreshOrder();
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Exchange error', 'error');
    } finally {
      setIsExchanging(false);
      closeExchangeDialog();
    }
  }

  function closeExchangeDialog() {
    setExchangeItem(null);
    setExchangeQty(1);
    setExchangeSku('');
    setExchangeProduct(null);
    setExchangeSkuError(null);
  }

  // ── Price difference calculation ────────────

  function getPriceDifference(): number {
    if (!exchangeItem || !exchangeProduct) return 0;
    return exchangeProduct.sellingPrice - exchangeItem.priceAtSale;
  }

  // ── Render ─────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="p-6 border-b bg-card shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <RotateCcw className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Returns & Exchanges</h1>
            <p className="text-sm text-muted-foreground">
              Look up an order by receipt number to process refunds or exchanges
            </p>
          </div>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="px-6 py-4 border-b bg-card/50 shrink-0">
        <div className="flex gap-3 max-w-xl">
          <div className="relative flex-1">
            <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={receiptInputRef}
              id="receipt-search-input"
              className="pl-10 h-11 font-mono"
              placeholder="Enter receipt number (e.g. RCPT-1234567890)"
              value={receiptInput}
              onChange={(e) => {
                setReceiptInput(e.target.value);
                if (searchError) setSearchError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              autoFocus
            />
          </div>
          <Button
            id="btn-search-receipt"
            className="h-11 px-6 gap-2"
            onClick={handleSearch}
            disabled={isSearching || !receiptInput.trim()}
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search
          </Button>
        </div>

        {searchError && (
          <div className="mt-3 flex items-center gap-2 text-sm text-destructive font-medium animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {searchError}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto">
        {!order ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <div className="h-20 w-20 rounded-2xl bg-muted/40 flex items-center justify-center">
              <ScanBarcode className="h-10 w-10 opacity-30" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium">No order loaded</p>
              <p className="text-sm mt-1">
                Enter a receipt number above to view order details
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* ── Order Summary Card ── */}
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold font-mono tracking-tight">
                      {order.receiptNumber}
                    </h2>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        order.type === 'SALE'
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      }`}
                    >
                      {order.type}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Order Total</p>
                  <p className="text-2xl font-bold tabular-nums tracking-tight">
                    {formatPrice(order.total)}
                  </p>
                  {order.discountValue > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Discount: {formatPrice(order.discountValue)}
                      {order.offerName && ` (${order.offerName})`}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Items Table ── */}
            <div className="rounded-xl border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="pl-5">Product</TableHead>
                    <TableHead className="text-center w-20">Qty</TableHead>
                    <TableHead className="text-center w-24">Returned</TableHead>
                    <TableHead className="text-right w-28">Unit Price</TableHead>
                    <TableHead className="text-right w-28">Line Total</TableHead>
                    <TableHead className="text-center w-32">Status</TableHead>
                    <TableHead className="text-center w-48">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => {
                    const availableQty = getAvailableQty(item);
                    const isFullyReturned = availableQty === 0;
                    const isPartiallyReturned = item.returnedQuantity > 0 && !isFullyReturned;
                    const lineTotal = item.priceAtSale * item.quantity;

                    return (
                      <TableRow
                        key={item.id}
                        className={isFullyReturned ? 'opacity-50' : ''}
                      >
                        {/* Product info */}
                        <TableCell className="pl-5">
                          <p className={`font-medium leading-tight ${isFullyReturned ? 'line-through' : ''}`}>
                            {item.product?.name ?? 'Deleted Product'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.product?.color && `${item.product.color} · `}
                            {item.product?.size && `Size ${item.product.size} · `}
                            <span className="font-mono">
                              {item.product?.sku ?? 'N/A'}
                            </span>
                          </p>
                        </TableCell>

                        {/* Quantity */}
                        <TableCell className="text-center font-semibold tabular-nums">
                          ×{item.quantity}
                        </TableCell>

                        {/* Returned Quantity */}
                        <TableCell className="text-center tabular-nums">
                          {item.returnedQuantity > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-orange-500/10 text-orange-600 border border-orange-500/20">
                              {item.returnedQuantity} / {item.quantity}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>

                        {/* Unit price */}
                        <TableCell className="text-right font-medium tabular-nums whitespace-nowrap">
                          {formatPrice(item.priceAtSale)}
                        </TableCell>

                        {/* Line total */}
                        <TableCell className="text-right font-semibold tabular-nums whitespace-nowrap">
                          {formatPrice(lineTotal)}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="text-center">
                          {isFullyReturned ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-600 border border-orange-500/20">
                              <PackageCheck className="h-3 w-3" />
                              Fully Returned
                            </span>
                          ) : isPartiallyReturned ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              <RotateCcw className="h-3 w-3" />
                              Partial ({availableQty} left)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              Active
                            </span>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-center">
                          {isFullyReturned ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                id={`btn-refund-${item.id}`}
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                                onClick={() => openRefundDialog(item)}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Refund
                              </Button>
                              <Button
                                id={`btn-exchange-${item.id}`}
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-xs border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                                onClick={() => openExchangeDialog(item)}
                              >
                                <ArrowLeftRight className="h-3.5 w-3.5" />
                                Exchange
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ Refund Dialog (with Quantity Input) ═══════════ */}
      <Dialog open={!!refundItem} onOpenChange={(open) => { if (!open) { setRefundItem(null); setRefundQty(1); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-red-500" />
              Refund Item
            </DialogTitle>
            <DialogDescription>
              Choose how many units to refund. Stock will be restored accordingly.
            </DialogDescription>
          </DialogHeader>

          {refundItem && (() => {
            const available = getAvailableQty(refundItem);
            return (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <p className="font-medium">{refundItem.product?.name ?? 'Unknown Product'}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Purchased Quantity</span>
                    <span className="font-semibold">×{refundItem.quantity}</span>
                  </div>
                  {refundItem.returnedQuantity > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Already Returned</span>
                      <span className="font-semibold text-orange-600">×{refundItem.returnedQuantity}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Unit Price</span>
                    <span className="font-semibold">{formatPrice(refundItem.priceAtSale)}</span>
                  </div>
                </div>

                {/* Quantity picker */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Quantity to Refund (Max: {available})
                  </label>
                  <QtyStepper
                    value={refundQty}
                    min={1}
                    max={available}
                    onChange={setRefundQty}
                  />
                </div>

                {/* Refund total */}
                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-red-600">Amount to Refund</span>
                  <span className="text-lg font-bold text-red-600 tabular-nums">
                    {formatPrice(refundItem.priceAtSale * refundQty)}
                  </span>
                </div>
              </div>
            );
          })()}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setRefundItem(null); setRefundQty(1); }}
              disabled={isRefunding}
            >
              Cancel
            </Button>
            <Button
              id="btn-confirm-refund"
              variant="destructive"
              onClick={handleRefundConfirm}
              disabled={isRefunding || refundQty <= 0}
              className="gap-2"
            >
              {isRefunding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Refund ×{refundQty}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ Exchange Dialog (with Quantity + SKU) ═══════════ */}
      <Dialog open={!!exchangeItem} onOpenChange={(open) => !open && closeExchangeDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-blue-500" />
              Exchange Item
            </DialogTitle>
            <DialogDescription>
              Choose how many units to exchange, then scan the replacement product SKU.
            </DialogDescription>
          </DialogHeader>

          {exchangeItem && (() => {
            const available = getAvailableQty(exchangeItem);
            return (
              <div className="space-y-4">
                {/* Original item info */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Returning
                  </p>
                  <p className="font-medium">{exchangeItem.product?.name ?? 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">
                    {exchangeItem.product?.sku} · ×{exchangeItem.quantity} ·{' '}
                    {formatPrice(exchangeItem.priceAtSale)} each
                    {exchangeItem.returnedQuantity > 0 && (
                      <span className="text-orange-600"> · {exchangeItem.returnedQuantity} already returned</span>
                    )}
                  </p>
                </div>

                {/* Quantity picker */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Quantity to Exchange (Max: {available})
                  </label>
                  <QtyStepper
                    value={exchangeQty}
                    min={1}
                    max={available}
                    onChange={setExchangeQty}
                  />
                </div>

                {/* SKU input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Product SKU</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="exchange-sku-input"
                        className="pl-10 font-mono"
                        placeholder="Scan or type SKU…"
                        value={exchangeSku}
                        onChange={(e) => {
                          setExchangeSku(e.target.value);
                          if (exchangeSkuError) setExchangeSkuError(null);
                          if (exchangeProduct) setExchangeProduct(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleExchangeSkuLookup();
                        }}
                        autoFocus
                      />
                    </div>
                    <Button
                      onClick={handleExchangeSkuLookup}
                      disabled={isLookingUp || !exchangeSku.trim()}
                      className="gap-1.5"
                    >
                      {isLookingUp ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      Look Up
                    </Button>
                  </div>
                  {exchangeSkuError && (
                    <p className="text-sm text-destructive flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {exchangeSkuError}
                    </p>
                  )}
                </div>

                {/* New product preview + price difference */}
                {exchangeProduct && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="rounded-lg border bg-emerald-500/5 border-emerald-500/20 p-4">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Replacement Product
                      </p>
                      <p className="font-medium">{exchangeProduct.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {exchangeProduct.sku}
                        {exchangeProduct.color && ` · ${exchangeProduct.color}`}
                        {exchangeProduct.size && ` · Size ${exchangeProduct.size}`}
                        {' · '}Stock: {exchangeProduct.stock}
                      </p>
                      <p className="text-sm font-semibold mt-1">
                        {formatPrice(exchangeProduct.sellingPrice)} each
                      </p>
                    </div>

                    {/* Price difference */}
                    {(() => {
                      const diff = getPriceDifference();
                      const totalDiff = diff * exchangeQty;
                      if (totalDiff === 0) {
                        return (
                          <div className="rounded-lg border bg-muted/30 p-3 text-center">
                            <p className="text-sm font-medium text-muted-foreground">
                              Equal value — no additional payment needed
                            </p>
                          </div>
                        );
                      }
                      return (
                        <div
                          className={`rounded-lg border p-4 ${
                            totalDiff > 0
                              ? 'bg-emerald-500/5 border-emerald-500/20'
                              : 'bg-red-500/5 border-red-500/20'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                {totalDiff > 0 ? 'Amount to Collect' : 'Amount to Refund'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                ({formatPrice(exchangeProduct.sellingPrice)} − {formatPrice(exchangeItem.priceAtSale)})
                                {exchangeQty > 1 && ` × ${exchangeQty}`}
                              </p>
                            </div>
                            <p
                              className={`text-2xl font-bold tabular-nums ${
                                totalDiff > 0 ? 'text-emerald-600' : 'text-red-600'
                              }`}
                            >
                              {totalDiff > 0 ? '+' : ''}
                              {formatPrice(totalDiff)}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })()}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={closeExchangeDialog}
              disabled={isExchanging}
            >
              Cancel
            </Button>
            <Button
              id="btn-confirm-exchange"
              onClick={handleExchangeConfirm}
              disabled={isExchanging || !exchangeProduct || exchangeQty <= 0}
              className="gap-2"
            >
              {isExchanging ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <ArrowLeftRight className="h-4 w-4" />
                  Exchange ×{exchangeQty}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ Toast Notification ═══════════ */}
      {toast && <Toast data={toast} onClose={() => setToast(null)} />}

      {/* ═══════════ Exchange Receipt Preview Dialog ═══════════ */}
      <Dialog open={showExchangeReceipt} onOpenChange={(open) => {
        if (!open) {
          setShowExchangeReceipt(false);
          setExchangeReceiptData(null);
        }
      }}>
        <DialogContent className="max-w-[420px] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-5 w-5" />
              معاينة فاتورة الاستبدال
            </DialogTitle>
            <DialogDescription>
              تأكد من بيانات الفاتورة قبل الطباعة
            </DialogDescription>
          </DialogHeader>

          <div className="px-4 py-2">
            <div className="border border-gray-200 rounded-lg shadow-inner bg-gray-50 p-2 flex justify-center">
              {exchangeReceiptData && (
                <ExchangeReceiptTicket {...exchangeReceiptData} />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
