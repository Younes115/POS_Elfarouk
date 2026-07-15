import { useState, useEffect } from 'react';
import {
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  PlusCircle,
  Banknote
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

// ── Types ────────────────────────────────────

interface Expense {
  id: string | number;
  amount: number;
  category: string;
  description: string;
  createdAt: string;
}

const PREDEFINED_CATEGORIES = [
  "إيجار",
  "فواتير كهرباء ومياه",
  "رواتب وعمالة",
  "بضاعة ومشتريات",
  "نثريات وضيافة",
  "أخرى (كتابة يدوية)",
];

const OTHER_CATEGORY_KEY = "أخرى (كتابة يدوية)";

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EGP' }).format(price);

const formatTime = (iso: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-EG', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function Expenses() {
  const [expensesList, setExpensesList] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast State
  const [toast, setToast] = useState<ToastData | null>(null);

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  const getTodayDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const fetchExpenses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const todayDate = getTodayDate();
      // @ts-ignore - assuming window.api exists
      const result = await window.api.getDailyExpenses(todayDate);
      if (result && result.success) {
        setExpensesList(result.data || []);
      } else {
        setError(result?.error || 'Failed to fetch expenses');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching expenses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      showToast('يرجى إدخال مبلغ صحيح أكبر من 0', 'error');
      return;
    }
    
    if (!category) {
      showToast('يرجى اختيار القسم', 'error');
      return;
    }

    const finalCategory = category === OTHER_CATEGORY_KEY ? customCategory.trim() : category;
    
    if (category === OTHER_CATEGORY_KEY && !finalCategory) {
      showToast('يرجى كتابة اسم القسم', 'error');
      return;
    }

    if (!description.trim()) {
      showToast('يرجى إدخال البيان (الوصف)', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // @ts-ignore
      const result = await window.api.createExpense(numAmount, finalCategory, description.trim());
      if (result && result.success) {
        showToast('تمت إضافة المصروف بنجاح', 'success');
        // Clear form
        setAmount('');
        setCategory('');
        setCustomCategory('');
        setDescription('');
        // Refresh list
        await fetchExpenses();
      } else {
        showToast(result?.error || 'فشل في إضافة المصروف', 'error');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'حدث خطأ أثناء إضافة المصروف', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;

    try {
      // @ts-ignore
      const result = await window.api.deleteExpense(id);
      if (result && result.success) {
        showToast('تم حذف المصروف بنجاح', 'success');
        await fetchExpenses();
      } else {
        showToast(result?.error || 'فشل في حذف المصروف', 'error');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'حدث خطأ أثناء حذف المصروف', 'error');
    }
  };

  const totalExpenses = expensesList.reduce((acc, curr) => acc + Number(curr.amount), 0);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-6 border-b bg-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Banknote className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" dir="rtl">المصروفات</h1>
            <p className="text-sm text-muted-foreground" dir="rtl">
              إدارة المصروفات اليومية وإضافة مصروف جديد
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 p-6 overflow-hidden flex flex-col md:flex-row gap-6" dir="rtl">
        
        {/* Left Column: Add Expense Form (1/3) */}
        <div className="w-full md:w-1/3 flex flex-col gap-4 overflow-y-auto">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-primary" />
              إضافة مصروف جديد
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">المبلغ (EGP)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="أدخل المبلغ..."
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">القسم</label>
                <Select value={category} onValueChange={setCategory} dir="rtl">
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="اختر القسم..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PREDEFINED_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-right flex-row-reverse justify-between">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {category === OTHER_CATEGORY_KEY && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="text-sm font-medium">تصنيف آخر (كتابة يدوية)</label>
                  <Input
                    type="text"
                    placeholder="اكتب اسم القسم..."
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">البيان (الوصف)</label>
                <Input
                  type="text"
                  placeholder="تفاصيل المصروف..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full mt-2 gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PlusCircle className="h-4 w-4" />
                )}
                حفظ المصروف
              </Button>
            </form>
          </div>
        </div>

        {/* Right Column: History & Summary (2/3) */}
        <div className="w-full md:w-2/3 flex flex-col gap-4 overflow-hidden">
          {/* KPI Card */}
          <div className="rounded-xl border bg-card p-5 shadow-sm shrink-0 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-1">إجمالي مصروفات اليوم</h2>
              <div className="text-3xl font-bold tracking-tight text-primary font-mono" dir="ltr">
                {formatPrice(totalExpenses)}
              </div>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Banknote className="h-6 w-6 text-primary" />
            </div>
          </div>

          {/* History Table */}
          <div className="rounded-xl border bg-card flex-1 flex flex-col overflow-hidden shadow-sm">
            <div className="p-4 border-b bg-muted/20 shrink-0">
              <h3 className="font-semibold text-lg">سجل مصروفات اليوم</h3>
            </div>
            
            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  جاري التحميل...
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full text-destructive flex-col gap-2">
                  <AlertCircle className="h-8 w-8" />
                  <p>{error}</p>
                  <Button variant="outline" size="sm" onClick={fetchExpenses} className="mt-2">
                    إعادة المحاولة
                  </Button>
                </div>
              ) : expensesList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center gap-3">
                  <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
                    <Banknote className="h-8 w-8 opacity-40" />
                  </div>
                  <p className="text-lg font-medium">لا توجد مصروفات مسجلة اليوم</p>
                  <p className="text-sm">قم بإضافة مصروف جديد من النموذج الجانبي.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-right">القسم</TableHead>
                      <TableHead className="text-right">البيان</TableHead>
                      <TableHead className="text-right">الوقت</TableHead>
                      <TableHead className="text-left">المبلغ</TableHead>
                      <TableHead className="text-center w-24">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expensesList.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">
                          {expense.category}
                        </TableCell>
                        <TableCell>
                          {expense.description}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm" dir="ltr">
                          {formatTime(expense.createdAt)}
                        </TableCell>
                        <TableCell className="text-left font-semibold font-mono" dir="ltr">
                          {formatPrice(expense.amount)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 h-8 w-8"
                            onClick={() => handleDelete(expense.id)}
                            title="حذف المصروف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast data={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
