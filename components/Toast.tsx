
import React, { useEffect } from 'react';
import { Info } from 'lucide-react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-xs glass border border-white/40 apple-shadow p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="bg-[#F8E7E9] p-1.5 rounded-full">
        <Info size={16} className="text-[#7A1C1D]" />
      </div>
      <span className="text-xs font-semibold text-[#1D1D1F] leading-tight">
        {message}
      </span>
    </div>
  );
};
