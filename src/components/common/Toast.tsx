import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, Info, XCircle, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";
interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  show: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = useState<ToastItem[]>([]);

  const show = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setList((l) => [...l, { id, type, message }]);
    setTimeout(() => {
      setList((l) => l.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const api: ToastContextValue = {
    show,
    success: (m) => show("success", m),
    error: (m) => show("error", m),
    warning: (m) => show("warning", m),
    info: (m) => show("info", m),
  };

  const iconMap: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="text-safe-normal" size={20} />,
    error: <XCircle className="text-safe-danger" size={20} />,
    warning: <AlertCircle className="text-safe-warning" size={20} />,
    info: <Info className="text-safe-info" size={20} />,
  };

  const bgMap: Record<ToastType, string> = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-red-200 bg-red-50 text-red-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    info: "border-blue-200 bg-blue-50 text-blue-900",
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-2 w-[340px] max-w-[calc(100vw-3rem)] pointer-events-none">
        {list.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur ${bgMap[t.type]} animate-fade-in-up`}
          >
            <div className="mt-0.5">{iconMap[t.type]}</div>
            <div className="flex-1 text-sm leading-relaxed">{t.message}</div>
            <button
              className="opacity-60 hover:opacity-100 transition-opacity ml-2"
              onClick={() => setList((l) => l.filter((x) => x.id !== t.id))}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
