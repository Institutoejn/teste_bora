
import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick }) => {
  const hasOverflowClass = className.includes('overflow-');
  return (
    <div 
      onClick={onClick}
      className={`glass apple-shadow rounded-[22px] border border-white/40 ${hasOverflowClass ? '' : 'overflow-hidden'} ${className} ${onClick ? 'cursor-pointer active:scale-[0.98] transition-all duration-200' : ''}`}
    >
      {children}
    </div>
  );
};
