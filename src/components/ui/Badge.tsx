
import React from 'react';

interface BadgeProps {
    label: string;
    type?: 'default' | 'strategy' | 'emotion' | 'profit' | 'loss';
    className?: string;
    size?: 'sm' | 'xs';
}

export const Badge = ({ label, type = 'default', className = '', size = 'xs' }: BadgeProps) => {
    let baseStyles = "font-bold uppercase tracking-wider rounded-md flex items-center justify-center";
    let colorStyles = "bg-white/5 text-slate-400 border border-white/5";
    let sizeStyles = size === 'xs' ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-1";

    if (type === 'profit') colorStyles = "bg-[#D05A5A]/20 text-[#D05A5A] border border-[#D05A5A]/30";
    if (type === 'loss') colorStyles = "bg-[#5B9A8B]/20 text-[#5B9A8B] border border-[#5B9A8B]/30";
    if (type === 'strategy') colorStyles = "bg-white/5 text-slate-200 border border-white/10";
    if (type === 'emotion') colorStyles = "bg-transparent text-slate-500 italic border-none";

    return (
        <span className={`${baseStyles} ${colorStyles} ${sizeStyles} ${className}`}>
            {label}
        </span>
    );
};
