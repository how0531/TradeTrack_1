
import React, { useState } from 'react';
import { Trash2, Briefcase, Plus, Pencil } from 'lucide-react';
import { Portfolio, Lang } from '../../types';
import { THEME, DEFAULT_PALETTE, I18N } from '../../constants';
import { GlassCard } from '../../components/ui/GlassCard';

// Gemstone Component (Internal)
const GemstoneLight = ({ color, onChange, label, align = 'left' }: { color: string, onChange: (c: string) => void, label: string, align?: 'left' | 'right' }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="flex flex-col items-center gap-1.5 relative">
            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{label}</span>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-5 h-5 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 relative group"
                style={{
                    backgroundColor: color,
                    boxShadow: `0 0 10px ${color}66, inset 0 2px 4px rgba(255,255,255,0.3)`
                }}
            >
                <div className="absolute inset-0 rounded-full border border-white/10"></div>
            </button>

            {isOpen && (
                <div className={`absolute top-full mt-2 p-2 bg-[#0A0A0A] border border-zinc-800 rounded-xl shadow-2xl z-50 flex gap-2 animate-in fade-in zoom-in-95 duration-200 ${align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}>
                    {DEFAULT_PALETTE.map(c => (
                        <button
                            key={c}
                            onClick={() => { onChange(c); setIsOpen(false); }}
                            className={`w-5 h-5 rounded-full transition-all hover:scale-125 border border-white/5 ${color === c ? 'ring-1 ring-white' : ''}`}
                            style={{ backgroundColor: c, boxShadow: `0 0 8px ${c}44` }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

interface AccountRowProps {
    portfolio: Portfolio;
    actions: any;
    isDeletable: boolean;
}

const AccountRow = ({ portfolio, actions, isDeletable }: AccountRowProps) => {
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState(portfolio.name);
    const [tempCapital, setTempCapital] = useState(String(portfolio.initialCapital));

    const handleSaveName = () => {
        if (tempName.trim()) actions.updatePortfolio(portfolio.id, 'name', tempName.trim());
        else setTempName(portfolio.name);
        setIsEditingName(false);
    };

    return (
        <div className="group flex items-center justify-between h-20 px-4 border-b border-zinc-900/50 hover:bg-zinc-900/20 transition-colors relative">
            <div className="flex flex-col justify-center min-w-0 flex-1 pr-6">
                <div className="flex items-center gap-2 mb-1">
                    {isEditingName ? (
                        <input
                            autoFocus
                            type="text"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            onBlur={handleSaveName}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                            className="bg-transparent border-b border-zinc-500 text-lg font-bold text-white outline-none w-full max-w-[200px] p-0"
                        />
                    ) : (
                        <h3 
                            onClick={() => setIsEditingName(true)}
                            className="text-lg font-bold text-zinc-200 cursor-pointer truncate flex items-center gap-2 hover:text-white transition-colors"
                        >
                            {portfolio.name}
                            <Pencil size={10} className="text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </h3>
                    )}
                </div>
                <div className="flex items-center gap-2 text-sm font-mono text-zinc-500">
                    <span className="text-zinc-600">$</span>
                    <input
                        type="number"
                        value={tempCapital}
                        onChange={(e) => {
                            setTempCapital(e.target.value);
                            const num = parseFloat(e.target.value);
                            if (!isNaN(num)) actions.updatePortfolio(portfolio.id, 'initialCapital', num);
                        }}
                        className="bg-transparent outline-none w-32 hover:text-zinc-300 focus:text-zinc-200 transition-colors"
                    />
                </div>
            </div>

            <div className="flex items-center gap-6">
                <GemstoneLight 
                    label="WIN" 
                    color={portfolio.profitColor} 
                    onChange={(c) => actions.updatePortfolio(portfolio.id, 'profitColor', c)} 
                />
                <div className="w-px h-8 bg-zinc-900 mx-1"></div>
                <GemstoneLight 
                    label="LOSS" 
                    color={portfolio.lossColor || THEME.DEFAULT_LOSS} 
                    onChange={(c) => actions.updatePortfolio(portfolio.id, 'lossColor', c)} 
                    align="right"
                />
                {isDeletable && (
                    <button 
                        onClick={() => {
                            if(window.confirm('Delete this account?')) {
                                actions.updateSettings('portfolios', (prev: any[]) => prev.filter(p => p.id !== portfolio.id));
                            }
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-700 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 ml-2"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
        </div>
    );
};

export const AccountManager = ({ portfolios, actions, lang }: { portfolios: Portfolio[], actions: any, lang: Lang }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newCapital, setNewCapital] = useState('');
    const t = I18N[lang] || I18N['zh'];

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (newName.trim() && newCapital.trim()) {
            const newP: Portfolio = {
                id: `p-${Date.now()}`,
                name: newName.trim(),
                initialCapital: parseFloat(newCapital),
                profitColor: DEFAULT_PALETTE[Math.floor(Math.random() * DEFAULT_PALETTE.length)],
                lossColor: THEME.DEFAULT_LOSS
            };
            actions.updateSettings('portfolios', [...portfolios, newP]);
            setNewName('');
            setNewCapital('');
            setIsAdding(false);
        }
    };

    return (
        <GlassCard className="overflow-hidden bg-[#050505] border-zinc-800/60">
            <div className="px-5 py-3 border-b border-zinc-900 bg-[#080808] flex justify-between items-center">
                <div className="flex items-center gap-2 text-zinc-500">
                    <Briefcase size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{t.managePortfolios}</span>
                </div>
                <div className="text-[10px] text-zinc-700 font-mono">
                    {portfolios.length} ACTIVE
                </div>
            </div>

            <div className="flex flex-col">
                {portfolios.map(p => (
                    <AccountRow 
                        key={p.id} 
                        portfolio={p} 
                        actions={actions} 
                        isDeletable={portfolios.length > 1} 
                    />
                ))}
            </div>

            <div className="p-4 bg-[#050505]">
                {isAdding ? (
                    <form onSubmit={handleAdd} className="flex flex-col gap-3 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex gap-3">
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="Account Name" 
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                className="flex-1 bg-zinc-900/30 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors"
                            />
                            <input 
                                type="number" 
                                placeholder="Capital" 
                                value={newCapital}
                                onChange={e => setNewCapital(e.target.value)}
                                className="w-32 bg-zinc-900/30 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-600 font-mono transition-colors"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" disabled={!newName || !newCapital} className="flex-1 bg-zinc-100 hover:bg-white text-black py-2 rounded-lg text-xs font-bold uppercase disabled:opacity-50 transition-colors">Confirm</button>
                            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-zinc-500 hover:text-zinc-300 text-xs font-bold uppercase transition-colors">Cancel</button>
                        </div>
                    </form>
                ) : (
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="w-full py-3 rounded-xl border border-dashed border-zinc-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/10 transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide group"
                    >
                        <Plus size={14} className="group-hover:scale-110 transition-transform"/> {t.addPortfolio}
                    </button>
                )}
            </div>
        </GlassCard>
    );
};
