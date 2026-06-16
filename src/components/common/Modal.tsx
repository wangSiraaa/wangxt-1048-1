import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open?: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

export default function Modal({ open, onClose, title, children, footer, size = "md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in-up">
      <div
        className="absolute inset-0 bg-industrial-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${sizeMap[size]} bg-white rounded-xl shadow-2xl border border-industrial-100 overflow-hidden flex flex-col max-h-[88vh]`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-industrial-100 bg-gradient-to-r from-industrial-50 to-white">
          <h3 className="text-lg font-semibold text-industrial-800">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-industrial-100 text-industrial-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto scrollbar-thin flex-1">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-industrial-100 bg-industrial-50/50 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
