
import React from 'react';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export const GlassCard = ({ children, className = '', onClick }: GlassCardProps) => {
    return (
        <div 
            onClick={onClick}
            className={`
                bg-[#1A1C20]/80 backdrop-blur-xl 
                border border-white/5 
                shadow-[0_8px_32px_rgba(0,0,0,0.3)]
                rounded-xl
                ${className}
            `}
        >
            {children}
        </div>
    );
};
