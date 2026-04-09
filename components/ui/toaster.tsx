"use client";
import { useState, useCallback, useEffect } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { ToastContext, type ToastItem, type ToastFn } from "@/hooks/use-toast";

const ICONS = {
  success: <CheckCircle  className="w-4 h-4 text-green-500 shrink-0" />,
  error:   <AlertCircle  className="w-4 h-4 text-red-500   shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />,
  default: <Info         className="w-4 h-4 text-blue-500  shrink-0" />,
};

const BORDERS = {
  success: "border-green-200  dark:border-green-800",
  error:   "border-red-200    dark:border-red-800",
  warning: "border-yellow-200 dark:border-yellow-800",
  default: "border-border",
};

function ToastEl({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // animate in
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(item.id), 300);
    }, item.duration ?? 4500);
    return () => clearTimeout(t);
  }, [item.id, item.duration, onDismiss]);

  const variant = item.variant ?? "default";
  return (
    <div
      className={`flex items-start gap-3 w-80 max-w-[calc(100vw-2rem)] rounded-xl border bg-popover px-4 py-3 shadow-lg
        transition-all duration-300 ease-out
        ${visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}
        ${BORDERS[variant]}`}
    >
      {ICONS[variant]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug">{item.title}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.description}</p>
        )}
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onDismiss(item.id), 300); }}
        className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast: ToastFn = useCallback((opts) => {
    setToasts((t) => [
      ...t.slice(-4),          // keep max 5 toasts
      { ...opts, id: crypto.randomUUID() },
    ]);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Portal to bottom-right */}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((item) => (
          <div key={item.id} className="pointer-events-auto">
            <ToastEl item={item} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
