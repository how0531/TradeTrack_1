
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}

export const Button = ({ children, variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) => {
    let baseStyles = "rounded-xl font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
    
    let variantStyles = "bg-[#C8B085] text-black hover:bg-[#B09870] shadow-lg";
    if (variant === 'secondary') variantStyles = "bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10 hover:text-white";
    if (variant === 'danger') variantStyles = "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-black";
    if (variant === 'ghost') variantStyles = "bg-transparent text-slate-500 hover:text-white";

    let sizeStyles = "py-3 px-4 text-xs";
    if (size === 'sm') sizeStyles = "py-2 px-3 text-[10px]";
    if (size === 'lg') sizeStyles = "py-4 px-6 text-sm";

    return (
        <button className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`} {...props}>
            {children}
        </button>
    );
};
