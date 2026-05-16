import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  const variantClasses = {
    danger: 'bg-error text-on-error hover:bg-error/90 shadow-error/20',
    warning: 'bg-warning text-on-warning hover:bg-warning/90 shadow-warning/20',
    info: 'bg-primary text-on-primary hover:bg-primary/90 shadow-primary/20'
  };

  const iconClasses = {
    danger: 'text-error bg-error/10',
    warning: 'text-warning bg-warning/10',
    info: 'text-primary bg-primary/10'
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-outline-variant/30 animate-in zoom-in-95 duration-200">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className={`p-3 rounded-2xl ${iconClasses[variant]}`}>
              <AlertTriangle size={24} />
            </div>
            <button 
              onClick={onCancel}
              className="p-2 hover:bg-surface-container-highest rounded-full transition-colors text-on-surface-variant"
            >
              <X size={20} />
            </button>
          </div>
          
          <h3 className="text-2xl font-black text-on-surface tracking-tighter mb-3">
            {title}
          </h3>
          <p className="text-on-surface-variant text-sm leading-relaxed mb-8">
            {message}
          </p>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={onConfirm}
              className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg active:scale-95 ${variantClasses[variant]}`}
            >
              {confirmLabel}
            </button>
            <button
              onClick={onCancel}
              className="w-full py-4 bg-surface-container-highest text-on-surface rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-surface-container-high transition-all active:scale-95"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
