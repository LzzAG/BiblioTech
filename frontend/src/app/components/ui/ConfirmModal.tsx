import React from 'react';
import { Card } from './Card';

interface ConfirmModalProps {
  isOpen: boolean;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  confirmColor: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ isOpen, icon, iconBg, title, description, confirmLabel, confirmColor, cancelLabel = 'Cancelar', onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 min-h-screen w-screen z-[999999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
      <Card className="w-full max-w-sm overflow-hidden">
        <div className="p-8 text-center">
          <div className={`w-20 h-20 ${iconBg} rounded-full flex items-center justify-center mx-auto mb-6`}>
            {icon}
          </div>
          <h3 className="text-xl font-black text-[#1e3a5f] uppercase tracking-tight mb-2">{title}</h3>
          {description && <p className="text-slate-500 text-sm leading-relaxed px-4">{description}</p>}
        </div>
        <div className="p-4 bg-slate-50 flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-200 uppercase">{cancelLabel}</button>
          <button onClick={onConfirm} className={`flex-1 py-3 rounded-xl ${confirmColor} text-white font-bold uppercase text-xs`}>{confirmLabel}</button>
        </div>
      </Card>
    </div>
  );
}