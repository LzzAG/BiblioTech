import { AlertTriangle } from 'lucide-react';
import { Card } from './Card';

interface ErrorModalProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
}

export function ErrorModal({ isOpen, message, onClose }: ErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <Card className="w-full max-w-sm overflow-hidden animate-in zoom-in duration-300">
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-black text-[#1e3a5f] uppercase tracking-tight mb-2">Atenção</h3>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">{message}</p>
        </div>
        <div className="p-4 bg-slate-50 flex justify-center">
          <button onClick={onClose} className="w-full py-3 rounded-xl bg-[#1e3a5f] text-white font-bold uppercase text-xs hover:bg-[#152d47] transition-all active:scale-95 shadow-lg">Entendido</button>
        </div>
      </Card>
    </div>
  );
}