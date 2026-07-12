import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Package, Plus, AlertTriangle, Trash2, Printer, Copy, Check } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import BarcodeTicket from '@/components/BarcodeTicket';
import { Button } from '@/components/ui/button';
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
              <TableCell className="text-right font-medium">
                {formatPrice(product.sellingPrice)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
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
              <TableCell colSpan={8} className="h-24 text-center">
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
