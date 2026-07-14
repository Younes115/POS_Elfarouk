import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Package, Plus, AlertTriangle, Trash2, Printer, Copy, Check, Pencil } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import BarcodeTicket from '@/components/BarcodeTicket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddProductDialog } from '@/components/AddProductDialog';
import type { ProductRecord } from '../../main/types';

function SkuCopyCell({ sku }: { sku: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sku);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <span className="inline-flex items-center gap-1.5 group">
      {sku}
      <button
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
        title="Copy SKU"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
    </span>
  );
}

export default function Inventory() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // ── Edit Product State ─────────────────────
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    color: '',
    size: '',
    costPrice: '',
    sellingPrice: '',
    stock: '',
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // ── Barcode Printing ──────────────────────────
  const [printProduct, setPrintProduct] = useState<{
    sku: string;
    name: string;
    price: string;
  } | null>(null);
  const barcodeRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: barcodeRef,
    documentTitle: printProduct ? `Barcode_${printProduct.sku}` : 'Barcode',
    onAfterPrint: () => setPrintProduct(null),
  });

  // Trigger print once the ticket has rendered with the selected product
  useEffect(() => {
    if (printProduct && barcodeRef.current) {
      handlePrint();
    }
  }, [printProduct, handlePrint]);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await window.api.getAllProducts();
      if (result.success) {
        setProducts(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (id: string) => {
    try {
      const result = await window.api.deleteProduct(id);
      if (result.success) {
        fetchProducts();
      } else {
        console.error('Failed to delete product:', result.error);
      }
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  // ── Edit Handlers ──────────────────────────

  function openEdit(product: ProductRecord) {
    setEditingProduct(product);
    setEditError(null);
    setEditForm({
      name: product.name,
      color: product.color ?? '',
      size: product.size ?? '',
      costPrice: String(product.costPrice),
      sellingPrice: String(product.sellingPrice),
      stock: String(product.stock),
    });
  }

  function closeEdit() {
    setEditingProduct(null);
    setEditError(null);
  }

  async function handleEditSubmit() {
    if (!editingProduct) return;

    if (!editForm.name || !editForm.costPrice || !editForm.sellingPrice) {
      setEditError('Name, Cost Price, and Selling Price are required.');
      return;
    }

    setIsEditSubmitting(true);
    setEditError(null);

    try {
      const result = await window.api.updateProduct(editingProduct.id, {
        name: editForm.name,
        color: editForm.color || null,
        size: editForm.size || null,
        costPrice: Number(editForm.costPrice),
        sellingPrice: Number(editForm.sellingPrice),
        stock: Number(editForm.stock),
      });
      if (result.success) {
        closeEdit();
        fetchProducts();
      } else {
        setEditError(result.error);
      }
    } catch (err) {
      console.error('Error updating product:', err);
      setEditError(err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setIsEditSubmitting(false);
    }
  }

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category))).sort();
  }, [products]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EGP',
    }).format(price);
  };

  const renderProductTable = (filteredProducts: ProductRecord[]) => (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Color</TableHead>
            <TableHead>Size</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right">Cost Price</TableHead>
            <TableHead className="text-right">Selling Price</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProducts.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-mono text-xs">
                <SkuCopyCell sku={product.sku} />
              </TableCell>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>
                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                  {product.category}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {product.color ?? '—'}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {product.size ?? '—'}
              </TableCell>
              <TableCell className="text-right">
                {product.stock < 5 ? (
                  <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {product.stock}
                  </span>
                ) : (
                  <span className="font-medium">{product.stock}</span>
                )}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatPrice(product.costPrice)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatPrice(product.sellingPrice)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-amber-600 hover:bg-amber-600/10"
                    onClick={() => openEdit(product)}
                    title="Edit Product"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary hover:bg-primary/10"
                    onClick={() =>
                      setPrintProduct({
                        sku: product.sku,
                        name: product.name,
                        price: formatPrice(product.sellingPrice),
                      })
                    }
                    title="Print Barcode"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(product.id)}
                    title="Delete Product"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {filteredProducts.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                No products found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Inventory</h2>
            <p className="text-sm text-muted-foreground">
              {products.length} product{products.length !== 1 ? 's' : ''} in stock
            </p>
          </div>
        </div>
        <Button
          id="btn-add-product"
          onClick={() => setIsAddModalOpen(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Loading inventory…
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
            <Package className="h-12 w-12 opacity-40" />
            <p className="text-lg font-medium">No products yet</p>
            <p className="text-sm">Click "Add Product" to get started.</p>
          </div>
        ) : (
          <Tabs defaultValue="ALL" className="w-full">
            <div className="flex items-center justify-between pb-4">
              <TabsList className="h-9">
                <TabsTrigger value="ALL" className="text-xs px-4">
                  All
                </TabsTrigger>
                {categories.map((cat) => (
                  <TabsTrigger key={cat} value={cat} className="text-xs px-4">
                    {cat}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="ALL" className="m-0 border-none p-0 outline-none">
              {renderProductTable(products)}
            </TabsContent>

            {categories.map((cat) => (
              <TabsContent
                key={cat}
                value={cat}
                className="m-0 border-none p-0 outline-none"
              >
                {renderProductTable(
                  products.filter((p) => p.category === cat)
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>

      {/* Add Product Dialog */}
      <AddProductDialog
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onProductAdded={fetchProducts}
        existingCategories={categories}
      />

      {/* Edit Product Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => { if (!open) closeEdit(); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>

          {editError && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {editError}
            </div>
          )}

          <div className="space-y-4 py-2">
            {/* SKU (read-only) */}
            {editingProduct && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono bg-muted/50 rounded-md px-3 py-2">
                <span>SKU:</span>
                <span className="font-semibold">{editingProduct.sku}</span>
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {/* Color & Size side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-color">Color</Label>
                <Input
                  id="edit-color"
                  value={editForm.color}
                  onChange={(e) => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-size">Size</Label>
                <Input
                  id="edit-size"
                  value={editForm.size}
                  onChange={(e) => setEditForm(prev => ({ ...prev, size: e.target.value }))}
                />
              </div>
            </div>

            {/* Cost, Price, Stock in 3 columns */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-cost">Cost Price</Label>
                <Input
                  id="edit-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.costPrice}
                  onChange={(e) => setEditForm(prev => ({ ...prev, costPrice: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price">Selling Price</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.sellingPrice}
                  onChange={(e) => setEditForm(prev => ({ ...prev, sellingPrice: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-stock">Stock</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  min="0"
                  step="1"
                  value={editForm.stock}
                  onChange={(e) => setEditForm(prev => ({ ...prev, stock: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEdit}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={isEditSubmitting}>
              {isEditSubmitting ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden Barcode Ticket for Printing */}
      {printProduct && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
          <BarcodeTicket
            ref={barcodeRef}
            sku={printProduct.sku}
            name={printProduct.name}
            price={printProduct.price}
          />
        </div>
      )}
    </div>
  );
}
