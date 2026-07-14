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
import { Trash2, Plus } from 'lucide-react';

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductAdded: () => void;
  existingCategories: string[];
}

interface FormData {
  name: string;
  category: string;
  costPrice: string;
  sellingPrice: string;
  // BAGS mode
  qtyPerColor: string;
  // Default series mode
  startSize: string;
  numCartons: string;
  // Custom sizes mode
  customSizes: string;
  // Toggle
  useCustomSizes: boolean;
}

const INITIAL_FORM: FormData = {
  name: '',
  category: '',
  costPrice: '',
  sellingPrice: '',
  qtyPerColor: '',
  startSize: '',
  numCartons: '1',
  customSizes: '',
  useCustomSizes: false,
};

/**
 * Generate a smart SKU from the category prefix + 4-char hex string.
 * Example: SNK-A7B2, BAG-9F1D
 * For unknown categories, uses the first 3 letters uppercased.
 */
function generateSmartSKU(category: string): string {
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
  const [hasSizes, setHasSizes] = useState<boolean>(true);
  const [colorsList, setColorsList] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Helpers ────────────────────────────────

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setFormData({ ...INITIAL_FORM });
    setHasSizes(true);
    setColorsList(['']);
    setError(null);
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  }

  // ── Dialog title ───────────────────────────
  function getDialogTitle(): string {
    if (!hasSizes) return 'Add Product';
    if (formData.useCustomSizes) return 'Add Custom Series';
    return 'Add Carton/Series';
  }

  function getDialogDescription(): string {
    if (!hasSizes) return 'Add products with no size variants — one entry per color.';
    if (formData.useCustomSizes) return 'Enter custom sizes (comma-separated) to generate one product per size per color.';
    return 'Input the carton details to auto-generate a 5-size sequence per color.';
  }

  // ── Submit ─────────────────────────────────

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);

    // Common validations
    if (!formData.name || !formData.category || !formData.costPrice || !formData.sellingPrice) {
      setError('Please fill in all required fields.');
      return;
    }

    const validColors = colorsList.map(c => c.trim()).filter(Boolean);
    if (validColors.length === 0) {
      setError('Please enter at least one color.');
      return;
    }

    if (/^\d+$/.test(formData.name.trim())) {
      setError('Product Name cannot consist of only numbers.');
      return;
    }

    // Mode-specific validations
    if (!hasSizes) {
      if (!formData.qtyPerColor) {
        setError('Please enter the quantity per color.');
        return;
      }
    } else if (formData.useCustomSizes) {
      if (!formData.customSizes) {
        setError('Please enter custom sizes (comma-separated).');
        return;
      }
    } else {
      if (!formData.startSize || !formData.numCartons) {
        setError('Please enter Start Size and Number of Cartons.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const colorsArray = validColors;
      const variantsToInsert = [];

      if (!hasSizes) {
        // ── NO SIZES: One product per color ──
        const qtyPerColor = Number(formData.qtyPerColor) || 0;
        for (const color of colorsArray) {
          variantsToInsert.push({
            sku: generateSmartSKU(formData.category),
            name: formData.name.trim(),
            category: formData.category,
            color,
            size: null,
            costPrice: Number(formData.costPrice),
            sellingPrice: Number(formData.sellingPrice),
            stock: qtyPerColor,
          });
        }
      } else if (formData.useCustomSizes) {
        // ── CUSTOM SIZES: Aggregate duplicate sizes ──
        const sizesArray = formData.customSizes.split(',').map(s => s.trim()).filter(Boolean);
        const sizeFrequency: Record<string, number> = {};
        sizesArray.forEach(size => {
          sizeFrequency[size] = (sizeFrequency[size] || 0) + 1;
        });

        const numCartons = Number(formData.numCartons) || 1;

        for (const color of colorsArray) {
          for (const size of Object.keys(sizeFrequency)) {
            variantsToInsert.push({
              sku: generateSmartSKU(formData.category),
              name: formData.name.trim(),
              category: formData.category,
              color,
              size,
              costPrice: Number(formData.costPrice),
              sellingPrice: Number(formData.sellingPrice),
              stock: sizeFrequency[size] * numCartons,
            });
          }
        }
      } else {
        // ── DEFAULT SERIES: numCartons × 5 sizes ──
        const startSize = Number(formData.startSize);
        const numCartons = Number(formData.numCartons) || 1;
        for (const color of colorsArray) {
          for (let i = 0; i < 5; i++) {
            const currentSize = startSize + i;
            variantsToInsert.push({
              sku: generateSmartSKU(formData.category),
              name: formData.name.trim(),
              category: formData.category,
              color,
              size: currentSize.toString(),
              costPrice: Number(formData.costPrice),
              sellingPrice: Number(formData.sellingPrice),
              stock: numCartons,
            });
          }
        }
      }

      const result = await window.api.addBulkProducts(variantsToInsert);

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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="add-name">Product Name *</Label>
            <Input
              id="add-name"
              placeholder="e.g. Nike Air Max 90"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="add-category">Category *</Label>
            <Input
              id="add-category"
              list="category-suggestions"
              placeholder="e.g. SNEAKERS, BAGS, HEELS"
              value={formData.category}
              onChange={(e) => updateField('category', e.target.value.toUpperCase())}
            />
            <datalist id="category-suggestions">
              {existingCategories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          {/* Has Sizes Toggle */}
          <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
            <label
              htmlFor="add-hasSizesToggle"
              className="flex items-center gap-3 cursor-pointer select-none flex-1"
            >
              <div className="relative">
                <input
                  id="add-hasSizesToggle"
                  type="checkbox"
                  className="sr-only peer"
                  checked={hasSizes}
                  onChange={(e) => setHasSizes(e.target.checked)}
                />
                <div className="w-10 h-5 bg-muted-foreground/30 rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-5" />
              </div>
              <div>
                <span className="text-sm font-medium">Item has size variations?</span>
                <p className="text-xs text-muted-foreground">
                  Toggle off if this product does not have sizes (e.g., bags, accessories)
                </p>
              </div>
            </label>
          </div>

          {/* Colors */}
          <div className="space-y-2">
            <Label>Colors *</Label>
            <div className="space-y-2">
              {colorsList.map((color, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="e.g. White"
                    value={color}
                    onChange={(e) => {
                      const newList = [...colorsList];
                      newList[index] = e.target.value;
                      setColorsList(newList);
                    }}
                  />
                  {colorsList.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => {
                        const newList = [...colorsList];
                        newList.splice(index, 1);
                        setColorsList(newList);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 text-xs h-8 gap-1"
              onClick={() => setColorsList([...colorsList, ''])}
            >
              <Plus className="h-3 w-3" />
              Add Color
            </Button>
          </div>

          {/* ── NO SIZES: Quantity per Color ── */}
          {!hasSizes && (
            <div className="space-y-2">
              <Label htmlFor="add-qtyPerColor">Total Quantity per Color *</Label>
              <Input
                id="add-qtyPerColor"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 10"
                value={formData.qtyPerColor}
                onChange={(e) => updateField('qtyPerColor', e.target.value)}
              />
            </div>
          )}

          {/* ── WITH SIZES: Size controls ── */}
          {hasSizes && (
            <>
              {/* Custom Sizes Toggle */}
              <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
                <label
                  htmlFor="add-customToggle"
                  className="flex items-center gap-3 cursor-pointer select-none flex-1"
                >
                  <div className="relative">
                    <input
                      id="add-customToggle"
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.useCustomSizes}
                      onChange={(e) => updateField('useCustomSizes', e.target.checked)}
                    />
                    <div className="w-10 h-5 bg-muted-foreground/30 rounded-full peer-checked:bg-primary transition-colors" />
                    <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-5" />
                  </div>
                  <div>
                    <span className="text-sm font-medium">Custom Sizes (Uneven Carton)</span>
                    <p className="text-xs text-muted-foreground">
                      Enter sizes manually instead of auto-generating a 5-size series
                    </p>
                  </div>
                </label>
              </div>

              {formData.useCustomSizes ? (
                /* Custom Sizes Input */
                <div className="space-y-2">
                  <Label htmlFor="add-customSizes">Custom Sizes (comma separated) *</Label>
                  <Input
                    id="add-customSizes"
                    placeholder="e.g. 37, 37, 39, 40, 41"
                    value={formData.customSizes}
                    onChange={(e) => updateField('customSizes', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Each listed size generates one product per color. Duplicates = multiple units.
                  </p>
                </div>
              ) : (
                /* Default: Start Size + Number of Cartons */
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-startSize">Start Size *</Label>
                    <Input
                      id="add-startSize"
                      placeholder="e.g. 37"
                      value={formData.startSize}
                      onChange={(e) => updateField('startSize', e.target.value.replace(/[^0-9]/g, ''))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-numCartons">Number of Cartons *</Label>
                    <Input
                      id="add-numCartons"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="1"
                      value={formData.numCartons}
                      onChange={(e) => updateField('numCartons', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Stock per size = number of cartons
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
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
