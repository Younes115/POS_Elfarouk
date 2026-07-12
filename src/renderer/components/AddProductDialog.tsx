import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductAdded: () => void;
  existingCategories: string[];
}


interface FormData {
  sku: string;
  name: string;
  category: string;
  color: string;
  size: string;
  costPrice: string;
  sellingPrice: string;
  stock: string;
}

const INITIAL_FORM: FormData = {
  sku: '',
  name: '',
  category: '',
  color: '',
  size: '',
  costPrice: '',
  sellingPrice: '',
  stock: '',
};

/**
 * Generate a smart SKU from the category prefix + 4-char hex string.
 * Example: SNK-A7B2, BAG-9F1D
 * For unknown categories, uses the first 3 letters uppercased.
 */
function generateSku(category: string): string {
  // 1. Extract only English letters from the category
  const engChars = category.replace(/[^A-Za-z]/g, '');

  // 2. Determine the prefix
  const prefix =
    engChars.length >= 2
      ? engChars.substring(0, 3).toUpperCase()
      : 'PRD'; // Fallback for Arabic or non-English categories

  // 3. Generate a random 4-5 character uppercase alphanumeric string
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();

  return `${prefix}-${randomPart}`;
}

export function AddProductDialog({
  open,
  onOpenChange,
  onProductAdded,
  existingCategories,
}: AddProductDialogProps) {
  const [formData, setFormData] = useState<FormData>({ ...INITIAL_FORM });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Helpers ────────────────────────────────

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setFormData({ ...INITIAL_FORM });
    setError(null);
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  }

  // ── Submit ─────────────────────────────────

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);

    // Validate required fields (SKU is now optional)
    if (
      !formData.name ||
      !formData.category ||
      !formData.costPrice ||
      !formData.sellingPrice ||
      !formData.stock
    ) {
      setError('Please fill in all required fields.');
      return;
    }

    if (/^\d+$/.test(formData.name.trim())) {
      setError('Product Name cannot consist of only numbers.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Auto-generate SKU if left blank
      const finalSku = formData.sku.trim() || generateSku(formData.category);

      const result = await window.api.addProduct({
        sku: finalSku,
        name: formData.name.trim(),
        category: formData.category,
        color: formData.color.trim() || null,
        size: formData.size.trim() || null,
        costPrice: Number(formData.costPrice),
        sellingPrice: Number(formData.sellingPrice),
        stock: Number(formData.stock),
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      resetForm();
      onOpenChange(false);
      onProductAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add product');
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
      const formElements = Array.from(
        e.currentTarget.querySelectorAll('input, select, button[type="submit"]')
      ) as HTMLElement[];
      const currentIndex = formElements.indexOf(document.activeElement as HTMLElement);
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextElement = formElements[currentIndex + 1];
        if (nextElement) nextElement.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevElement = formElements[currentIndex - 1];
        if (prevElement) prevElement.focus();
      } else if (e.key === 'Enter') {
        if (currentIndex > -1 && currentIndex < formElements.length - 1) {
          e.preventDefault();
          formElements[currentIndex + 1].focus();
        }
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Fill in the product details below. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* SKU & Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-sku">SKU / Barcode</Label>
              <Input
                id="add-sku"
                placeholder="Scan or leave blank to auto-generate"
                value={formData.sku}
                onChange={(e) => updateField('sku', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-name">Product Name *</Label>
              <Input
                id="add-name"
                placeholder="e.g. Nike Air Max 90"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="add-category">Category *</Label>
            <Input
              id="add-category"
              list="category-suggestions"
              placeholder="e.g. SNEAKERS, SOCKS, WALLETS"
              value={formData.category}
              onChange={(e) => updateField('category', e.target.value.toUpperCase())}
            />
            <datalist id="category-suggestions">
              {existingCategories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          {/* Color & Size */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-color">Color</Label>
              <Input
                id="add-color"
                placeholder="e.g. Black"
                value={formData.color}
                onChange={(e) => updateField('color', e.target.value.replace(/[0-9]/g, ''))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-size">Size</Label>
              <Input
                id="add-size"
                placeholder="e.g. 42"
                value={formData.size}
                onChange={(e) => updateField('size', e.target.value.replace(/[^0-9]/g, ''))}
              />
            </div>
          </div>

          {/* Prices & Stock */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-costPrice">Cost Price *</Label>
              <Input
                id="add-costPrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.costPrice}
                onChange={(e) => updateField('costPrice', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-sellingPrice">Selling Price *</Label>
              <Input
                id="add-sellingPrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.sellingPrice}
                onChange={(e) => updateField('sellingPrice', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-stock">Initial Stock *</Label>
              <Input
                id="add-stock"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={formData.stock}
                onChange={(e) => updateField('stock', e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
