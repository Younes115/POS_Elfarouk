// ─────────────────────────────────────────────
// Reports Dashboard — Full financial analysis
// view with Daily Report and Monthly Performance
// tabs. RTL layout, Arabic-localised labels.
// ─────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  RotateCcw,
  CreditCard,
  Coins,
  TrendingUp,
  TrendingDown,

  CalendarDays,
  BarChart3,
  Trophy,
  FileSpreadsheet,
  PackageOpen,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ── Types (mirrored from backend) ────────────

interface ExpenseRecord {
  id: string;
  category: string;
  description: string;
  amount: number;
  createdAt: string;
}

interface DailyReport {
  date: string;
  grossSales: number;
  totalRefunds: number;
  netRevenue: number;
  grossCOGS: number;
  refundedCOGS: number;
  netCOGS: number;
  totalExpenses: number;
  expectedDrawerCash: number;
  netProfit: number;
  expensesList: ExpenseRecord[];
}

interface DailySalesTrend {
  day: number;
  netRevenue: number;
  netProfit: number;
}

interface TopSellingProduct {
  name: string;
  color: string | null;
  size: string | null;
  netQuantitySold: number;
}

interface MonthlyReport {
  year: number;
  month: number;
  monthlyGrossSales: number;
  monthlyTotalRefunds: number;
  monthlyNetRevenue: number;
  monthlyGrossCOGS: number;
  monthlyRefundedCOGS: number;
  monthlyNetCOGS: number;
  monthlyExpenses: number;
  monthlyNetProfit: number;
  dailySalesTrend: DailySalesTrend[];
  topSellingProducts: TopSellingProduct[];
}

// ── Helpers ──────────────────────────────────

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2,
  }).format(price);

const getTodayStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const MONTH_NAMES = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

// ── Skeleton Loader ──────────────────────────

function SkeletonPulse({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-700/40 ${className}`}
    />
  );
}

function KpiSkeleton() {
  return (
    <div className="rounded-xl border border-slate-100 bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <SkeletonPulse className="h-4 w-24" />
        <SkeletonPulse className="h-9 w-9 rounded-lg" />
      </div>
      <SkeletonPulse className="h-8 w-32 mt-1" />
    </div>
  );
}

// ── Empty State ──────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
      <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
        <PackageOpen className="h-8 w-8 opacity-40" />
      </div>
      <p className="text-base font-medium text-center max-w-xs">{message}</p>
    </div>
  );
}

// ── KPI Card Component ───────────────────────

interface KpiCardProps {
  id: string;
  title: string;
  value: number;
  icon: React.ReactNode;
  borderColor: string;
  bgTint?: string;
  valueColor?: string;
  isHighlight?: boolean;
}

function KpiCard({
  id,
  title,
  value,
  icon,
  borderColor,
  bgTint = '',
  valueColor = 'text-foreground',
  isHighlight = false,
}: KpiCardProps) {
  return (
    <div
      id={id}
      className={`
        group relative rounded-xl border-2 bg-card p-5 shadow-sm
        transition-all duration-300 ease-out
        hover:shadow-md hover:-translate-y-0.5
        ${borderColor}
        ${bgTint}
        ${isHighlight ? 'ring-1 ring-offset-1 ring-offset-background' : ''}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground leading-tight">
          {title}
        </span>
        <div
          className={`
            h-9 w-9 rounded-lg flex items-center justify-center
            transition-transform duration-300 group-hover:scale-110
            ${bgTint || 'bg-slate-50 dark:bg-slate-800/60'}
          `}
        >
          {icon}
        </div>
      </div>
      <div
        className={`text-2xl font-bold tracking-tight font-mono ${valueColor}`}
        dir="ltr"
      >
        {formatPrice(value)}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  DAILY REPORT TAB
// ══════════════════════════════════════════════

function DailyReportTab() {
  const [dateStr, setDateStr] = useState(getTodayStr());
  const [report, setReport] = useState<DailyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async (date: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // @ts-ignore
      const result = await window.api.getDailyReport(date);
      if (result && result.success) {
        setReport(result.data);
      } else {
        setError(result?.error || 'فشل في جلب تقرير اليوم');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'حدث خطأ أثناء جلب التقرير',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(dateStr);
  }, [dateStr, fetchReport]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateStr(e.target.value);
  };

  const isEmpty =
    report &&
    report.grossSales === 0 &&
    report.totalRefunds === 0 &&
    report.totalExpenses === 0;

  // Dynamic net profit styling
  const profitIsPositive = (report?.netProfit ?? 0) >= 0;

  return (
    <div className="space-y-6">
      {/* ── Control Bar ──────────────────────── */}
      <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-card p-4 shadow-sm">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <CalendarDays className="h-4.5 w-4.5 text-primary" />
        </div>
        <label className="text-sm font-semibold text-foreground whitespace-nowrap">
          اختر التاريخ
        </label>
        <Input
          id="daily-report-date"
          type="date"
          value={dateStr}
          onChange={handleDateChange}
          className="max-w-[200px] font-mono bg-background"
          dir="ltr"
        />
      </div>

      {/* ── KPI Cards ────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <KpiSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-8 text-center text-red-600">
          <p className="font-medium">{error}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <KpiCard
              id="kpi-gross-sales"
              title="إجمالي المبيعات"
              value={report?.grossSales ?? 0}
              icon={<DollarSign className="h-4.5 w-4.5 text-emerald-600" />}
              borderColor="border-emerald-200/80"
              bgTint="bg-emerald-50/30 dark:bg-emerald-950/10"
            />
            <KpiCard
              id="kpi-total-refunds"
              title="إجمالي المرتجعات"
              value={report?.totalRefunds ?? 0}
              icon={<RotateCcw className="h-4.5 w-4.5 text-amber-600" />}
              borderColor="border-amber-200/80"
              bgTint="bg-amber-50/30 dark:bg-amber-950/10"
            />
            <KpiCard
              id="kpi-total-expenses"
              title="إجمالي المصروفات"
              value={report?.totalExpenses ?? 0}
              icon={<CreditCard className="h-4.5 w-4.5 text-red-500" />}
              borderColor="border-red-200/80"
              bgTint="bg-red-50/20 dark:bg-red-950/10"
            />
            <KpiCard
              id="kpi-expected-drawer"
              title="الصافي المفترض في الدرج"
              value={report?.expectedDrawerCash ?? 0}
              icon={<Coins className="h-4.5 w-4.5 text-indigo-600" />}
              borderColor="border-indigo-300"
              bgTint="bg-indigo-50/40 dark:bg-indigo-950/20"
              isHighlight
              valueColor="text-indigo-700 dark:text-indigo-300"
            />
            <KpiCard
              id="kpi-net-profit"
              title="صافي الربح الفعلي"
              value={report?.netProfit ?? 0}
              icon={
                profitIsPositive ? (
                  <TrendingUp className="h-4.5 w-4.5 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-4.5 w-4.5 text-red-600" />
                )
              }
              borderColor={
                profitIsPositive
                  ? 'border-emerald-300'
                  : 'border-red-300'
              }
              bgTint={
                profitIsPositive
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
                  : 'bg-red-50/40 dark:bg-red-950/20'
              }
              isHighlight
              valueColor={
                profitIsPositive
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-red-600 dark:text-red-400'
              }
            />
          </div>

          {/* ── Expenses Table ──────────────── */}
          <div className="rounded-xl border border-slate-100 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b bg-muted/20 flex items-center gap-2.5">
              <FileSpreadsheet className="h-4.5 w-4.5 text-primary" />
              <h3 className="font-semibold text-base">سجل مصروفات اليوم</h3>
            </div>

            {isEmpty ? (
              <EmptyState message="لا توجد مبيعات أو مصروفات مسجلة لهذا اليوم" />
            ) : report && report.expensesList.length === 0 ? (
              <EmptyState message="لا توجد مصروفات مسجلة لهذا اليوم" />
            ) : (
              <div className="max-h-[320px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-right font-semibold">
                        القسم
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        البيان
                      </TableHead>
                      <TableHead className="text-left font-semibold">
                        المبلغ
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report?.expensesList.map((expense) => (
                      <TableRow
                        key={expense.id}
                        className="transition-colors hover:bg-muted/30"
                      >
                        <TableCell className="font-medium">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium">
                            {expense.category}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {expense.description}
                        </TableCell>
                        <TableCell
                          className="text-left font-semibold font-mono text-red-600 dark:text-red-400"
                          dir="ltr"
                        >
                          -{formatPrice(expense.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
//  MONTHLY REPORT TAB
// ══════════════════════════════════════════════

function MonthlyReportTab() {
  // Default to current month in YYYY-MM format
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonthStr, setSelectedMonthStr] = useState(currentMonthStr);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse YYYY-MM → { year, month }
  const parsedYear = Number(selectedMonthStr.split('-')[0]);
  const parsedMonth = Number(selectedMonthStr.split('-')[1]);

  const fetchReport = useCallback(
    async (year: number, month: number) => {
      setIsLoading(true);
      setError(null);
      try {
        // @ts-ignore
        const result = await window.api.getMonthlyReport(year, month);
        if (result && result.success) {
          setReport(result.data);
        } else {
          setError(result?.error || 'فشل في جلب التقرير الشهري');
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'حدث خطأ أثناء جلب التقرير',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchReport(parsedYear, parsedMonth);
  }, [parsedYear, parsedMonth, fetchReport]);

  const profitIsPositive = (report?.monthlyNetProfit ?? 0) >= 0;

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setSelectedMonthStr(e.target.value);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Control Bar ──────────────────────── */}
      <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-card p-4 shadow-sm flex-wrap">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <BarChart3 className="h-4.5 w-4.5 text-primary" />
        </div>
        <label
          htmlFor="monthly-report-month"
          className="text-sm font-semibold text-foreground whitespace-nowrap"
        >
          اختر الفترة
        </label>

        <input
          id="monthly-report-month"
          type="month"
          value={selectedMonthStr}
          onChange={handleMonthChange}
          className="h-10 w-full max-w-[220px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          dir="ltr"
        />
      </div>

      {/* ── KPI Cards ────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-8 text-center text-red-600">
          <p className="font-medium">{error}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              id="kpi-monthly-sales"
              title="إجمالي المبيعات الشهرية"
              value={report?.monthlyGrossSales ?? 0}
              icon={<DollarSign className="h-4.5 w-4.5 text-emerald-600" />}
              borderColor="border-emerald-200/80"
              bgTint="bg-emerald-50/30 dark:bg-emerald-950/10"
            />
            <KpiCard
              id="kpi-monthly-refunds"
              title="إجمالي المرتجعات الشهرية"
              value={report?.monthlyTotalRefunds ?? 0}
              icon={<RotateCcw className="h-4.5 w-4.5 text-amber-600" />}
              borderColor="border-amber-200/80"
              bgTint="bg-amber-50/30 dark:bg-amber-950/10"
            />
            <KpiCard
              id="kpi-monthly-expenses"
              title="إجمالي المصروفات الشهرية"
              value={report?.monthlyExpenses ?? 0}
              icon={<CreditCard className="h-4.5 w-4.5 text-red-500" />}
              borderColor="border-red-200/80"
              bgTint="bg-red-50/20 dark:bg-red-950/10"
            />
            <KpiCard
              id="kpi-monthly-profit"
              title="صافي الربح الشهري"
              value={report?.monthlyNetProfit ?? 0}
              icon={
                profitIsPositive ? (
                  <TrendingUp className="h-4.5 w-4.5 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-4.5 w-4.5 text-red-600" />
                )
              }
              borderColor={
                profitIsPositive
                  ? 'border-emerald-300'
                  : 'border-red-300'
              }
              bgTint={
                profitIsPositive
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
                  : 'bg-red-50/40 dark:bg-red-950/20'
              }
              isHighlight
              valueColor={
                profitIsPositive
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-red-600 dark:text-red-400'
              }
            />
          </div>

          {/* ── Analysis Grid ────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── Top Selling Products ────── */}
            <div className="rounded-xl border border-slate-100 bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b bg-muted/20 flex items-center gap-2.5">
                <Trophy className="h-4.5 w-4.5 text-amber-500" />
                <h3 className="font-semibold text-base">
                  المنتجات الأكثر مبيعاً
                </h3>
              </div>

              {report &&
              report.topSellingProducts &&
              report.topSellingProducts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-right font-semibold w-12">
                        #
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        المنتج
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        اللون
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        المقاس
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        الكمية
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.topSellingProducts.map((product, idx) => (
                      <TableRow
                        key={`${product.name}-${product.color}-${product.size}`}
                        className="transition-colors hover:bg-muted/30"
                      >
                        <TableCell>
                          <span
                            className={`
                              inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold
                              ${
                                idx === 0
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                  : idx === 1
                                    ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                    : idx === 2
                                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                                      : 'bg-muted text-muted-foreground'
                              }
                            `}
                          >
                            {idx + 1}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {product.color ?? '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {product.size ?? '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-bold">
                            {product.netQuantitySold}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState message="لا توجد بيانات مبيعات لهذا الشهر" />
              )}
            </div>

            {/* ── Daily Sales Trend ───────── */}
            <div className="rounded-xl border border-slate-100 bg-card shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b bg-muted/20 flex items-center gap-2.5 shrink-0">
                <BarChart3 className="h-4.5 w-4.5 text-blue-500" />
                <h3 className="font-semibold text-base">
                  سجل المبيعات اليومية
                </h3>
              </div>

              {report &&
              report.dailySalesTrend &&
              report.dailySalesTrend.length > 0 ? (
                <div className="flex-1 max-h-[420px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40 sticky top-0 z-10">
                        <TableHead className="text-right font-semibold">
                          اليوم
                        </TableHead>
                        <TableHead className="text-left font-semibold">
                          صافي الإيرادات
                        </TableHead>
                        <TableHead className="text-left font-semibold">
                          صافي الربح
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.dailySalesTrend.map((day) => {
                        const dayStr = `${day.day} ${MONTH_NAMES[parsedMonth - 1]}`;
                        const hasActivity =
                          day.netRevenue !== 0 || day.netProfit !== 0;
                        return (
                          <TableRow
                            key={day.day}
                            className={`transition-colors ${
                              hasActivity
                                ? 'hover:bg-muted/30'
                                : 'opacity-50'
                            }`}
                          >
                            <TableCell className="font-medium">
                              {dayStr}
                            </TableCell>
                            <TableCell
                              className={`text-left font-mono text-sm font-semibold ${
                                day.netRevenue > 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : day.netRevenue < 0
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-muted-foreground'
                              }`}
                              dir="ltr"
                            >
                              {formatPrice(day.netRevenue)}
                            </TableCell>
                            <TableCell
                              className={`text-left font-mono text-sm font-semibold ${
                                day.netProfit > 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : day.netProfit < 0
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-muted-foreground'
                              }`}
                              dir="ltr"
                            >
                              {formatPrice(day.netProfit)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState message="لا توجد بيانات لهذا الشهر" />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
//  MAIN REPORTS PAGE
// ══════════════════════════════════════════════

export default function Reports() {
  return (
    <div className="flex flex-col h-full bg-background" dir="rtl">
      {/* ── Header ───────────────────────────── */}
      <div className="p-6 border-b bg-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              التقارير والتحليلات
            </h1>
            <p className="text-sm text-muted-foreground">
              ملخص الأداء المالي اليومي والشهري
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabs Content ─────────────────────── */}
      <div className="flex-1 p-6 overflow-auto">
        <Tabs defaultValue="daily" dir="rtl">
          <TabsList className="mb-6 h-11 p-1 bg-muted/60">
            <TabsTrigger
              value="daily"
              className="px-6 py-2 text-sm font-semibold data-[state=active]:shadow-sm"
              id="tab-daily-report"
            >
              <CalendarDays className="h-4 w-4 ml-2" />
              التقرير اليومي
            </TabsTrigger>
            <TabsTrigger
              value="monthly"
              className="px-6 py-2 text-sm font-semibold data-[state=active]:shadow-sm"
              id="tab-monthly-report"
            >
              <BarChart3 className="h-4 w-4 ml-2" />
              الأداء الشهري
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            <DailyReportTab />
          </TabsContent>

          <TabsContent value="monthly">
            <MonthlyReportTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
