
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction 
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white apple-shadow p-6 rounded-full mb-6 border border-white/50">
        <Icon size={40} className="text-gray-300" strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-bold text-[#1D1D1F] mb-2">{title}</h3>
      <p className="text-[#86868B] text-sm mb-8 max-w-[280px] leading-relaxed">
        {description}
      </p>
      <button 
        onClick={onAction}
        className="bg-[#7A1C1D] hover:bg-[#6E2E49] text-white px-8 py-3.5 rounded-full font-bold text-sm shadow-lg shadow-[#7A1C1D]/20 active:scale-[0.98] transition-all duration-200"
      >
        {actionLabel}
      </button>
    </div>
  );
};
