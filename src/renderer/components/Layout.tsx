import { useState, useCallback } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ShoppingCart, Package, RotateCcw, Receipt, BarChart3, HardDriveDownload, HardDriveUpload, CheckCircle2, XCircle, Loader2, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Layout() {
  const location = useLocation();

  // ── Toast state ──────────────────────────
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 4000);
    },
    [],
  );

  // ── Backup handler ────────────────────────
  const handleBackup = useCallback(async () => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    try {
      const result = await window.api.backupDatabase();
      if (result.success) {
        showToast(result.data, 'success');
      } else {
        showToast(result.error, 'error');
      }
    } catch (err) {
      showToast('An unexpected error occurred during backup.', 'error');
    } finally {
      setIsBackingUp(false);
    }
  }, [isBackingUp, showToast]);

  // ── Restore handler ───────────────────────
  const handleRestoreConfirmed = useCallback(async () => {
    setShowRestoreConfirm(false);
    if (isRestoring) return;
    setIsRestoring(true);
    try {
      const result = await window.api.restoreDatabase();
      // If we get here, the user cancelled (app would have
      // relaunched on success before IPC could respond).
      if (!result.success) {
        showToast(result.error, 'error');
      }
    } catch (err) {
      showToast('An unexpected error occurred during restore.', 'error');
    } finally {
      setIsRestoring(false);
    }
  }, [isRestoring, showToast]);

  const navItems = [
    { name: 'Cashier', path: '/', icon: ShoppingCart },
    { name: 'Inventory', path: '/inventory', icon: Package },
    { name: 'Returns', path: '/returns', icon: RotateCcw },
    { name: 'Expenses', path: '/expenses', icon: Receipt },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden w-full">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col shrink-0">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-primary">كوتشى الفاروق</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-md transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Database Actions — pinned to sidebar bottom */}
        <div className="p-4 border-t space-y-2">
          <button
            id="backup-database-btn"
            onClick={handleBackup}
            disabled={isBackingUp}
            className={cn(
              "flex items-center space-x-3 w-full px-4 py-3 rounded-md transition-colors",
              "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isBackingUp ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <HardDriveDownload size={20} />
            )}
            <span>{isBackingUp ? 'Backing up…' : 'Backup Database'}</span>
          </button>

          <button
            id="restore-database-btn"
            onClick={() => setShowRestoreConfirm(true)}
            disabled={isRestoring}
            className={cn(
              "flex items-center space-x-3 w-full px-4 py-3 rounded-md transition-colors",
              "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isRestoring ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <HardDriveUpload size={20} />
            )}
            <span>{isRestoring ? 'Restoring…' : 'Restore Database'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-auto bg-muted/20">
        <Outlet />
      </main>

      {/* ── Restore Confirmation Dialog ────────── */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowRestoreConfirm(false)}
          />
          {/* Dialog */}
          <div className="relative z-10 w-full max-w-md mx-4 bg-card border border-border rounded-xl shadow-2xl animate-in zoom-in-95 fade-in duration-200">
            {/* Header */}
            <div className="flex items-start gap-4 p-6 pb-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
                <TriangleAlert size={20} className="text-amber-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Restore Database?
                </h2>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  This action will <strong className="text-foreground">overwrite all current data</strong> with the selected backup file and <strong className="text-foreground">restart the application</strong>.
                </p>
              </div>
            </div>

            {/* Warning callout */}
            <div className="mx-6 mt-3 px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
              <p className="text-sm text-amber-200/80">
                ⚠ This cannot be undone. Make sure you have a backup of your current data before proceeding.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 p-6 pt-5">
              <button
                onClick={() => setShowRestoreConfirm(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-muted/50 text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                id="restore-confirm-btn"
                onClick={handleRestoreConfirmed}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
              >
                Yes, Restore & Restart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-start gap-3 max-w-sm px-4 py-3 rounded-lg shadow-lg border",
            "animate-in slide-in-from-bottom-4 fade-in duration-300",
            toast.type === 'success'
              ? "bg-green-950/90 border-green-800 text-green-100"
              : "bg-red-950/90 border-red-800 text-red-100"
          )}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={20} className="text-green-400 shrink-0 mt-0.5" />
          ) : (
            <XCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
          )}
          <p className="text-sm whitespace-pre-line">{toast.message}</p>
        </div>
      )}
    </div>
  );
}

