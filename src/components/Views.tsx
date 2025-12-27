
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Edit2, Trash2, Scroll, PenTool, FileText, Download, Upload, ShieldAlert, Plus, X, UserCircle, LogOut, Layout, Check, HardDrive, Briefcase, Calendar as CalendarIcon, LucideIcon, Plus as PlusIcon, Settings as SettingsIcon, Shield, CreditCard, ChevronDown, Activity, BrainCircuit, Target, Cloud, Languages, AlertOctagon, StickyNote, Quote, ArrowUpDown, TrendingDown, TrendingUp, MoreHorizontal, AlertTriangle, Circle, Palette, ArrowRight, Tag, Database, FileJson, CheckCircle2, Loader2, ArrowUp, ArrowDown, Pencil } from 'lucide-react';
import { THEME, I18N, DEFAULT_PALETTE } from '../constants';
import { formatCurrency, getPnlColor, formatDate, formatDecimal, formatPnlK } from '../utils';
import { Trade, Portfolio, CalendarViewProps, LogsViewProps, SettingsViewProps, StrategyStat } from '../types';
import { VirtualList, ColorPicker, MultiSelectDropdown } from './UI';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, ReferenceLine, ScatterChart, XAxis as ScatterXAxis, YAxis as ScatterYAxis, ZAxis as ScatterZAxis, Scatter, Cell } from 'recharts';

// --- HELPER: Compact Number Formatter ---
const formatCompactNumber = (num: number) => {
    if (num === 0) return '';
    const abs = Math.abs(num);
    const sign = num > 0 ? '+' : '-';
    
    // < 1000: Show full number (e.g. +350)
    if (abs < 1000) return `${sign}${Math.round(abs)}`;
    
    // >= 1000: Show k (e.g. +1.5k)
    if (abs < 1000000) return `${sign}${(abs / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    
    // >= 1m: Show m (e.g. +1.2m)
    return `${sign}${(abs / 1000000).toFixed(1).replace(/\.0$/, '')}m`;
};

// --- PREMIUM ACCOUNT MANAGER COMPONENTS ---

const GEM_COLORS = [
    '#C8B085', // Gold
    '#D05A5A', // Red
    '#5B9A8B', // Green
    '#526D82', // Blue
    '#8884d8', // Purple
    '#E0E0E0', // White
];

// 1. Gemstone Light Component
const GemstoneLight = ({ color, onChange, label, align = 'left' }: { color: string, onChange: (c: string) => void, label: string, align?: 'left' | 'right' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="flex flex-col items-center gap-1.5 relative" ref={containerRef}>
            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{label}</span>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-5 h-5 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 relative group"
                style={{
                    backgroundColor: color,
                    boxShadow: `0 0 10px ${color}66, inset 0 2px 4px rgba(255,255,255,0.3)` // Glow + Shine
                }}
            >
                <div className="absolute inset-0 rounded-full border border-white/10"></div>
            </button>

            {isOpen && (
                <div className={`absolute top-full mt-2 p-2 bg-[#0A0A0A] border border-zinc-800 rounded-xl shadow-2xl z-50 flex gap-2 animate-in fade-in zoom-in-95 duration-200 ${align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}>
                    {GEM_COLORS.map(c => (
                        <button
                            key={c}
                            onClick={() => { onChange(c); setIsOpen(false); }}
                            className={`w-5 h-5 rounded-full transition-all hover:scale-125 border border-white/5 ${color === c ? 'ring-1 ring-white' : ''}`}
                            style={{ backgroundColor: c, boxShadow: `0 0 8px ${c}44` }}
                        />
                    ))}
                    {/* Custom Color Input Hidden but accessible if needed later, kept simple for now */}
                </div>
            )}
        </div>
    );
};

// 2. Account Row Component
const AccountRow = ({ portfolio, actions, isDeletable }: { portfolio: Portfolio, actions: any, isDeletable: boolean }) => {
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState(portfolio.name);
    const [tempCapital, setTempCapital] = useState(String(portfolio.initialCapital));

    const handleSaveName = () => {
        if (tempName.trim()) {
            actions.updatePortfolio(portfolio.id, 'name', tempName.trim());
        } else {
            setTempName(portfolio.name); // Revert if empty
        }
        setIsEditingName(false);
    };

    const handleSaveCapital = (val: string) => {
        setTempCapital(val);
        const num = parseFloat(val);
        if (!isNaN(num)) {
            actions.updatePortfolio(portfolio.id, 'initialCapital', num);
        }
    };

    return (
        <div className="group flex items-center justify-between h-20 px-4 border-b border-zinc-900/50 hover:bg-zinc-900/20 transition-colors relative">
            
            {/* Left: Info & Edit */}
            <div className="flex flex-col justify-center min-w-0 flex-1 pr-6">
                {/* Name */}
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
                
                {/* Balance */}
                <div className="flex items-center gap-2 text-sm font-mono text-zinc-500">
                    <span className="text-zinc-600">$</span>
                    <input
                        type="number"
                        value={tempCapital}
                        onChange={(e) => handleSaveCapital(e.target.value)}
                        className="bg-transparent outline-none w-32 hover:text-zinc-300 focus:text-zinc-200 transition-colors"
                    />
                </div>
            </div>

            {/* Right: Gemstones & Actions */}
            <div className="flex items-center gap-6">
                <GemstoneLight 
                    label="WIN" 
                    color={portfolio.profitColor} 
                    onChange={(c) => actions.updatePortfolio(portfolio.id, 'profitColor', c)} 
                />
                
                {/* Separator */}
                <div className="w-px h-8 bg-zinc-900 mx-1"></div>

                <GemstoneLight 
                    label="LOSS" 
                    color={portfolio.lossColor || THEME.DEFAULT_LOSS} 
                    onChange={(c) => actions.updatePortfolio(portfolio.id, 'lossColor', c)} 
                    align="right"
                />

                {/* Delete Action (Hidden by default) */}
                {isDeletable && (
                    <button 
                        onClick={(e) => {
                            e.preventDefault();
                            if(window.confirm('Delete this account?')) {
                                // Logic handled by parent or actions helper needs update to handle this directly
                                // Here we call a custom delete flow as per previous SettingsView logic
                                const id = portfolio.id;
                                // We need to access activePortfolioIds logic here or in parent. 
                                // For simplicity assuming parent handles or we invoke actions.deletePortfolio wrapper if existed.
                                // Re-using logic from original SettingsView:
                                actions.updateSettings('portfolios', (prev: any[]) => prev.filter(p => p.id !== id));
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

// 3. Main Account Manager Container
const AccountManager = ({ portfolios, actions, t }: { portfolios: Portfolio[], actions: any, t: any }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newCapital, setNewCapital] = useState('');

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
        <div className="w-full bg-[#050505] rounded-2xl border border-zinc-800/60 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="px-5 py-3 border-b border-zinc-900 bg-[#080808] flex justify-between items-center">
                <div className="flex items-center gap-2 text-zinc-500">
                    <Briefcase size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{t.managePortfolios}</span>
                </div>
                <div className="text-[10px] text-zinc-700 font-mono">
                    {portfolios.length} ACTIVE
                </div>
            </div>

            {/* List */}
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

            {/* Add Action */}
            <div className="p-4 bg-[#050505]">
                {isAdding ? (
                    <form onSubmit={handleAdd} className="flex flex-col gap-3 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex gap-3">
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="Account Name (e.g. Scalping)" 
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                className="flex-1 bg-zinc-900/30 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors"
                            />
                            <input 
                                type="number" 
                                placeholder="Initial Capital" 
                                value={newCapital}
                                onChange={e => setNewCapital(e.target.value)}
                                className="w-32 bg-zinc-900/30 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-600 font-mono transition-colors"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button 
                                type="submit" 
                                disabled={!newName || !newCapital}
                                className="flex-1 bg-zinc-100 hover:bg-white text-black py-2 rounded-lg text-xs font-bold uppercase disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Confirm
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setIsAdding(false)}
                                className="px-4 py-2 text-zinc-500 hover:text-zinc-300 text-xs font-bold uppercase transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                ) : (
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="w-full py-3 rounded-xl border border-dashed border-zinc-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/10 transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide group"
                    >
                        <PlusIcon size={14} className="group-hover:scale-110 transition-transform"/> {t.addPortfolio}
                    </button>
                )}
            </div>
        </div>
    );
};

// --- STRATEGY LIST VIEW (DEEP MATTE STYLE + SORTING) ---
export const StrategyListView = ({ data, onSelect, lang }: { data: { name: string; stat: StrategyStat }[], onSelect: (name: string) => void, lang: 'zh' | 'en' }) => {
    const t = I18N[lang] || I18N['zh'];
    const [sortType, setSortType] = useState<'pnl' | 'trades'>('pnl');
    const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

    // 1. Calculate Max Absolute PnL for normalization
    const maxAbsPnl = useMemo(() => {
        if (data.length === 0) return 1;
        const values = data.map(d => Math.abs(d.stat.pnl));
        return Math.max(...values, 1);
    }, [data]);

    // 2. Sorting Logic
    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            let valA, valB;
            if (sortType === 'pnl') {
                valA = a.stat.pnl;
                valB = b.stat.pnl;
            } else {
                valA = a.stat.trades;
                valB = b.stat.trades;
            }
            return sortDir === 'desc' ? valB - valA : valA - valB;
        });
    }, [data, sortType, sortDir]);

    const handleSort = (type: 'pnl' | 'trades') => {
        if (sortType === type) {
            setSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
        } else {
            setSortType(type);
            setSortDir('desc');
        }
    };

    if (data.length === 0) {
        return <div className="text-center py-8 text-zinc-600 text-xs font-mono">{t.noData}</div>;
    }

    // Custom formatter: Mono style, clean
    const formatStealthPnl = (val: number) => {
        if (val === 0) return '0.00';
        const abs = Math.abs(val);
        const sign = val < 0 ? '-' : '';
        
        let valStr = '';
        if (abs >= 1000000) valStr = `${(abs / 1000000).toFixed(2)}m`;
        else if (abs >= 1000) valStr = `${(abs / 1000).toFixed(1)}k`;
        else valStr = `${abs.toFixed(0)}`;

        return `${sign}${valStr}`; 
    };

    const SortIcon = ({ active, dir }: { active: boolean, dir: 'asc' | 'desc' }) => (
        <span className={`transition-opacity ${active ? 'opacity-100 text-[#C8B085]' : 'opacity-20'}`}>
            {dir === 'desc' ? <ArrowDown size={10} strokeWidth={3} /> : <ArrowUp size={10} strokeWidth={3} />}
        </span>
    );

    return (
        <div className="bg-black rounded-xl overflow-hidden border border-zinc-800 select-none shadow-2xl flex flex-col">
            {/* Header with Sort Controls */}
            <div className="flex justify-between px-5 py-3 bg-black border-b border-zinc-900/50 shrink-0">
                <button 
                    onClick={() => handleSort('trades')}
                    className={`text-[9px] font-bold uppercase tracking-[0.2em] flex items-center gap-1 hover:text-white transition-colors ${sortType === 'trades' ? 'text-white' : 'text-zinc-600'}`}
                >
                    Strategy / Trades <SortIcon active={sortType === 'trades'} dir={sortDir} />
                </button>
                <button 
                    onClick={() => handleSort('pnl')}
                    className={`text-[9px] font-bold uppercase tracking-[0.2em] flex items-center gap-1 hover:text-white transition-colors ${sortType === 'pnl' ? 'text-white' : 'text-zinc-600'}`}
                >
                    Net PnL <SortIcon active={sortType === 'pnl'} dir={sortDir} />
                </button>
            </div>

            {/* Rows - Scrollable Container Removed (Unlimited Height) */}
            <div className="divide-y divide-zinc-900/30">
                {sortedData.map(({ name, stat }) => {
                    const pnl = stat.pnl;
                    // Calculate width relative to 50% of the container
                    const barWidthPct = Math.max((Math.abs(pnl) / maxAbsPnl) * 50, 2); 
                    const isProfit = pnl > 0;
                    const isLoss = pnl < 0;
                    const isZero = pnl === 0;

                    // --- DEEP MATTE COLOR PALETTE (Based on User Image) ---
                    // Red: Deep muted red background with lighter rim
                    // Green: Deep pine/teal background with lighter rim
                    
                    const textColor = isProfit 
                        ? 'text-[#ff9e9e]' // Soft Red Text
                        : (isLoss ? 'text-[#7ee8d2]' : 'text-zinc-600'); // Soft Teal Text

                    // Using gradients to simulate the "Sphere/Bubble" look from the image
                    // Profit: Deep Red
                    const profitGradient = 'bg-gradient-to-b from-[#823c3c] to-[#451818] border-t border-white/10 shadow-[0_2px_4px_rgba(0,0,0,0.3)]';
                    // Loss: Deep Green/Teal
                    const lossGradient = 'bg-gradient-to-b from-[#3b6e63] to-[#1a332d] border-t border-white/10 shadow-[0_2px_4px_rgba(0,0,0,0.3)]';

                    const barClass = isProfit ? profitGradient : lossGradient;

                    return (
                        <div 
                            key={name}
                            onClick={() => onSelect(name)}
                            className="group w-full px-5 py-3 hover:bg-zinc-900/20 transition-all cursor-pointer border-l-2 border-transparent hover:border-zinc-700 relative overflow-hidden"
                        >
                            {/* Row 1: Info */}
                            <div className="flex justify-between items-end mb-2 relative z-10">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-200 transition-colors tracking-wide flex items-baseline">
                                        {name.includes('_') ? (
                                            <>
                                                {name.split('_')[0]}
                                                <span className="text-[10px] text-zinc-600 font-medium ml-1">{name.split('_').slice(1).join(' ')}</span>
                                            </>
                                        ) : name}
                                    </span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[9px] text-zinc-600 font-mono bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800/50">{stat.trades}T</span>
                                        <span className="text-[9px] text-zinc-700 font-mono">WR {formatDecimal(stat.winRate)}%</span>
                                    </div>
                                </div>
                                <span className={`font-mono text-sm font-bold tracking-tight ${textColor} drop-shadow-sm`}>
                                    {formatStealthPnl(pnl)}
                                </span>
                            </div>

                            {/* Row 2: Center Axis Bar (Deep Matte Style) */}
                            <div className="w-full h-2 relative bg-[#0a0a0a] rounded-full overflow-hidden flex items-center border border-white/[0.03]">
                                {/* Center Axis Line */}
                                <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-zinc-800 z-0"></div>

                                {isZero ? (
                                    <div className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-zinc-800"></div>
                                ) : (
                                    <div 
                                        className={`absolute h-full rounded-full transition-all duration-700 ease-out z-10 ${barClass}`}
                                        style={{ 
                                            width: `${barWidthPct}%`,
                                            left: isProfit ? '50%' : 'auto',
                                            right: isLoss ? '50%' : 'auto',
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- CALENDAR VIEW (REFINED STEALTH LUXURY) ---
export const CalendarView = ({ dailyPnlMap, currentMonth, setCurrentMonth, onDateClick, monthlyStats, hideAmounts, lang }: CalendarViewProps) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth(); 
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const t = I18N[lang] || I18N['zh'];
    
    const calendarDays = [];
    // Padding days
    for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push({ key: `pad-${i}`, day: '', pnl: 0 });
    // Actual days
    for (let i = 1; i <= daysInMonth; i++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        calendarDays.push({ key: dateKey, day: i, pnl: dailyPnlMap[dateKey] || 0 }); 
    }

    const maxAbsPnl = useMemo(() => {
        let max = 0;
        calendarDays.forEach(d => { if (Math.abs(d.pnl) > max) max = Math.abs(d.pnl); });
        return max > 0 ? max : 1;
    }, [calendarDays]);

    // Enhanced Bubble Style with Rose/Emerald and Depth
    const getBubbleStyle = (pnl: number, day: string | number) => {
        if (!day) return { size: '0%', bg: 'transparent', text: 'transparent', shadow: 'none', border: 'none', radius: '0' };
        
        // Empty State: Subtle Circle
        if (pnl === 0) {
            return {
                size: '50%', // Smaller for empty days
                bg: 'transparent',
                text: '#555',
                shadow: 'none',
                border: '1px solid rgba(255,255,255,0.08)',
                radius: '50%', // Always circle
                opacity: 1,
                ring: 'none'
            };
        }

        const intensity = Math.abs(pnl) / maxAbsPnl; // 0 to 1
        const sizePct = 65 + (intensity * 30); // 65% to 95%
        const isWin = pnl > 0;
        const opacity = 0.5 + (intensity * 0.5);

        // Rose (Win) / Emerald (Loss) - Gradient for depth
        const bg = isWin 
            ? `radial-gradient(circle at 35% 35%, rgba(251, 113, 133, ${opacity}), rgba(190, 18, 60, ${opacity}))` // Rose-400 to Rose-800
            : `radial-gradient(circle at 35% 35%, rgba(52, 211, 153, ${opacity}), rgba(6, 78, 59, ${opacity}))`; // Emerald-400 to Emerald-800

        const border = isWin
            ? `1px solid rgba(251, 113, 133, 0.4)`
            : `1px solid rgba(52, 211, 153, 0.4)`;

        const shadow = intensity > 0.15
            ? `0 4px 12px ${isWin ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
            : 'none';

        const textColor = '#FFF';

        return {
            size: `${sizePct}%`,
            bg,
            text: textColor,
            shadow,
            border,
            radius: '50%', // Strict Circle
            opacity: 1,
            ring: '1px solid rgba(0,0,0,0.6)' // Inner shadow ring simulation
        };
    };

    return (
        <div className="w-full rounded-[32px] border border-white/[0.08] bg-zinc-900/20 backdrop-blur-md relative overflow-hidden shadow-2xl ring-1 ring-white/5">
             {/* Top Light Gradient */}
             <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

             <div className="p-6 relative z-10">
                {/* Header */}
                <div className="flex justify-between items-center mb-8 px-1">
                    <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-2 rounded-full hover:bg-white/5 transition-colors text-zinc-500 hover:text-white group"><ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform"/></button>
                    <div className="text-xl font-bold font-barlow-numeric tracking-[0.2em] text-white uppercase flex items-center gap-3 select-none">
                        <span className="opacity-90">{year}</span>
                        <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
                        <span className="text-[#C8B085]">{String(month + 1).padStart(2, '0')}</span>
                    </div>
                    <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-2 rounded-full hover:bg-white/5 transition-colors text-zinc-500 hover:text-white group"><ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform"/></button>
                </div>

                {/* Days Header */}
                <div className="grid grid-cols-7 text-center mb-4">
                    {daysOfWeek.map((d,i) => <div key={i} className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest select-none">{d}</div>)}
                </div>

                {/* Grid & Bubbles */}
                <div className="relative mb-2">
                    <div className="grid grid-cols-7 gap-y-3 gap-x-1">
                        {calendarDays.map((item) => {
                            const style = getBubbleStyle(item.pnl, item.day);
                            return (
                                <div 
                                    key={item.key} 
                                    className="aspect-square flex items-center justify-center relative"
                                    onClick={() => { if (item.day && onDateClick) onDateClick(item.key); }}
                                >
                                    {item.day && (
                                        <div 
                                            className={`flex flex-col items-center justify-center transition-all duration-500 cursor-pointer group hover:scale-110`}
                                            style={{ 
                                                width: style.size,
                                                height: style.size,
                                                background: style.bg, 
                                                boxShadow: style.shadow,
                                                border: style.border,
                                                borderRadius: '50%',
                                                opacity: style.opacity,
                                            }}
                                        >
                                            {/* Inner Ring for Depth */}
                                            {style.ring !== 'none' && (
                                                <div className="absolute inset-0 rounded-full border border-black/40 pointer-events-none"></div>
                                            )}

                                            <div 
                                                className={`text-[10px] font-bold font-barlow-numeric leading-none transition-colors select-none ${item.pnl !== 0 && !hideAmounts ? 'mb-0.5' : ''}`} 
                                                style={{ color: style.text }}
                                            >
                                                {item.day}
                                            </div>
                                            
                                            {item.pnl !== 0 && !hideAmounts && (
                                                <div className="text-[8px] font-bold font-barlow-numeric tracking-tight leading-none whitespace-nowrap px-0.5 scale-90 opacity-90 group-hover:opacity-100 select-none drop-shadow-md" style={{ color: '#FFF' }}>
                                                    {formatCompactNumber(item.pnl)}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Monthly Summary Footer (Data Base) */}
            <div className="px-8 py-6 border-t border-dashed border-white/10 bg-[#050505]/40 backdrop-blur-md relative z-10">
                <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                            {t.monthlyPnl} 
                            {monthlyStats.pnl !== 0 && (
                                <span className={`w-1.5 h-1.5 rounded-full ${monthlyStats.pnl > 0 ? 'bg-[#F43F5E] shadow-[0_0_5px_#F43F5E]' : 'bg-[#10B981] shadow-[0_0_5px_#10B981]'}`}></span>
                            )}
                        </span>
                        <span 
                            className={`text-4xl font-mono font-bold tracking-tight drop-shadow-lg ${monthlyStats.pnl >= 0 ? 'text-[#FB7185]' : 'text-[#34D399]'}`}
                        >
                            {formatCurrency(monthlyStats.pnl, hideAmounts)}
                        </span>
                    </div>
                    <div className="flex gap-8 pb-1">
                        <div className="flex flex-col items-end">
                            <span className="text-xl font-bold text-white font-barlow-numeric">{formatDecimal(monthlyStats.winRate)}%</span>
                            <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mt-1">{t.winRate}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-xl font-bold text-white font-barlow-numeric">{monthlyStats.count}</span>
                            <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mt-1">{t.trades}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- LOGS VIEW (TIMELINE STYLE) ---
const TimelineTradeItem = ({ trade, onEdit, onDelete, lang, hideAmounts, portfolios }: any) => {
    const isProfit = trade.pnl >= 0;
    const portfolio = portfolios.find((p: any) => p.id === trade.portfolioId);
    const [isExpanded, setIsExpanded] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const t = I18N[lang] || I18N['zh'];

    // Auto-reset confirm state after 3 seconds
    useEffect(() => {
        if (deleteConfirm) {
            const timer = setTimeout(() => setDeleteConfirm(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [deleteConfirm]);
    
    return (
        <div 
            className={`group relative pl-8 pr-1 py-4 cursor-pointer transition-all duration-300 border-l border-white/5 ${isExpanded ? 'bg-white/[0.02] rounded-r-xl' : 'hover:bg-white/[0.01]'}`}
            onClick={() => { setIsExpanded(!isExpanded); setDeleteConfirm(false); }}
        >
            {/* Timeline Dot */}
            <div className={`absolute left-[-5px] top-[22px] w-2.5 h-2.5 rounded-full border-2 transition-all duration-300 z-10 ${isExpanded ? 'border-[#C8B085] bg-[#0B0C10] scale-110 shadow-[0_0_10px_rgba(200,176,133,0.3)]' : 'border-[#333] bg-[#0B0C10] group-hover:border-slate-500'}`}></div>
            
            <div className="flex justify-between items-start">
                <div className="flex flex-col gap-2 flex-1 min-w-0 pr-4">
                    {/* Header: Portfolio & Tags */}
                    <div className="flex items-center gap-3 flex-wrap">
                        {portfolio && (
                            <div className="flex items-center gap-1.5 opacity-70">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: portfolio.profitColor }}></div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{portfolio.name}</span>
                            </div>
                        )}
                        {/* Symbol badge removed */}
                        <div className="flex items-center gap-2">
                             {trade.strategy && <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-slate-400 font-bold border border-white/5">{trade.strategy}</span>}
                             {trade.emotion && <span className="text-[9px] text-slate-500 italic">#{trade.emotion}</span>}
                        </div>
                    </div>

                    {/* Note: Expandable Text - Using break-all to ensure long numbers wrap */}
                    {trade.note && (
                        <div className={`text-xs text-slate-400 font-mono leading-relaxed transition-all duration-300 break-all ${isExpanded ? 'opacity-100 whitespace-pre-wrap mt-2' : 'opacity-60 truncate line-clamp-1'}`}>
                            {trade.note}
                        </div>
                    )}
                </div>

                {/* Right Side: PnL & Indicator */}
                <div className="flex flex-col items-end shrink-0 gap-1">
                    <div className={`text-base font-barlow-numeric font-bold tracking-tight ${isProfit ? 'text-[#D05A5A]' : 'text-[#5B9A8B]'}`}>
                        {isProfit ? '+' : ''}{formatCurrency(trade.pnl, hideAmounts)}
                    </div>
                     <ChevronDown size={12} className={`text-slate-700 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#C8B085]' : 'group-hover:text-slate-500'}`} />
                </div>
            </div>

            {/* Expanded Controls Area */}
            <div className={`grid grid-cols-2 gap-3 mt-4 transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        if (deleteConfirm) {
                            onDelete(trade.id);
                        } else {
                            setDeleteConfirm(true);
                        }
                    }} 
                    className={`py-2.5 rounded-lg border text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2 ${
                        deleteConfirm 
                        ? 'bg-red-500 border-red-500 text-white animate-pulse' 
                        : 'bg-[#0B0C10] border-white/5 text-slate-500 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5'
                    }`}
                >
                    <Trash2 size={12}/> {deleteConfirm ? t.confirm : t.delete}
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(trade); }} 
                    className="py-2.5 rounded-lg bg-[#C8B085] text-[#0B0C10] text-[10px] font-bold uppercase hover:bg-[#B09870] transition-colors shadow-lg flex items-center justify-center gap-2"
                >
                    <Edit2 size={12}/> {t.editTrade}
                </button>
            </div>
        </div>
    );
};

// --- LOGS VIEW (EXPORTED) ---
export const LogsView = ({ trades, lang, hideAmounts, portfolios, onEdit, onDelete }: LogsViewProps) => {
    const t = I18N[lang] || I18N['zh'];

    if (!trades || trades.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-600 space-y-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center"><Scroll size={24} opacity={0.5}/></div>
                <div className="text-center">
                    <h3 className="text-sm font-bold text-slate-400 mb-1">{t.emptyStateTitle}</h3>
                    <p className="text-xs max-w-[200px] leading-relaxed opacity-60">{t.emptyStateDesc}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2 pb-20">
            {trades.map((trade) => (
                <TimelineTradeItem 
                    key={trade.id} 
                    trade={trade} 
                    onEdit={onEdit} 
                    onDelete={onDelete} 
                    lang={lang} 
                    hideAmounts={hideAmounts} 
                    portfolios={portfolios}
                />
            ))}
        </div>
    );
};

// --- SETTINGS VIEW (RESTORED) ---
export const SettingsView = ({
    lang, setLang, trades, actions,
    ddThreshold, setDdThreshold,
    maxLossStreak, setMaxLossStreak,
    lossColor, setLossColor,
    strategies, emotions,
    portfolios, activePortfolioIds, setActivePortfolioIds,
    onBack, currentUser, onLogin, onLogout,
    lastBackupTime
}: SettingsViewProps) => {
    
    const t = I18N[lang] || I18N['zh'];
    const [newStrat, setNewStrat] = useState('');
    const [newEmo, setNewEmo] = useState('');
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const jsonInputRef = useRef<HTMLInputElement>(null);
    
    const handleAddStrategy = (e: React.FormEvent) => {
        e.preventDefault();
        if(newStrat.trim()) { actions.addStrategy(newStrat.trim()); setNewStrat(''); }
    };

    const handleAddEmotion = (e: React.FormEvent) => {
        e.preventDefault();
        if(newEmo.trim()) { actions.addEmotion(newEmo.trim()); setNewEmo(''); }
    };

    const ddPercent = ((ddThreshold - 5) / (50 - 5)) * 100;
    const streakPercent = ((maxLossStreak - 2) / (10 - 2)) * 100;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32 pt-4">
            {/* CLOUD SYNC */}
            <div className="space-y-2">
                 <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2"><Cloud size={12}/> {t.syncTitle}</h3>
                 <div className={`p-6 rounded-2xl relative overflow-hidden border transition-all duration-500 ${currentUser ? 'bg-gradient-to-br from-[#111] to-black border-white/10' : 'bg-transparent border-white/5'}`}>
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none transform translate-x-1/3 -translate-y-1/3">
                        <UserCircle size={200} />
                    </div>
                    {currentUser ? (
                        <div className="relative z-10 flex flex-col gap-6">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    {currentUser.photoURL ? (
                                        <img src={currentUser.photoURL} alt="User" className="w-16 h-16 rounded-full border-2 border-white/10 shadow-lg" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center border border-white/10"><UserCircle size={32} className="text-slate-400"/></div>
                                    )}
                                    <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#5B9A8B] border-2 border-[#1C1E22] shadow-sm flex items-center justify-center">
                                        <Check size={8} className="text-[#1C1E22] stroke-[4]" />
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white tracking-tight">{currentUser.displayName || 'Anonymous Trader'}</h2>
                                    <p className="text-xs text-slate-500 font-mono mt-0.5">{currentUser.email}</p>
                                    
                                    {/* STATUS INDICATOR */}
                                    <div className="flex flex-col gap-1 mt-2">
                                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#5B9A8B]/10 border border-[#5B9A8B]/20 self-start">
                                            <Cloud size={10} className="text-[#5B9A8B]"/>
                                            <span className="text-[10px] font-bold text-[#5B9A8B] uppercase tracking-wider">{t.synced}</span>
                                        </div>
                                        {lastBackupTime && (
                                            <span className="text-[9px] text-slate-600 pl-1 font-mono">
                                                {t.lastBackup}: {lastBackupTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setShowLogoutConfirm(true)} className="w-full py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center justify-center gap-2">
                                <LogOut size={14} /> {t.logout}
                            </button>
                        </div>
                    ) : (
                        <div className="relative z-10 text-center py-4 space-y-5">
                            <div className="w-16 h-16 mx-auto rounded-full bg-[#C8B085]/10 flex items-center justify-center border border-[#C8B085]/20 shadow-[0_0_20px_rgba(200,176,133,0.1)]"><Cloud size={32} className="text-[#C8B085]"/></div>
                            <div>
                                <h3 className="text-sm font-bold text-white mb-2">{t.syncTitle}</h3>
                                <p className="text-xs text-slate-400 leading-relaxed px-4">{t.syncDesc}</p>
                            </div>
                            <button onClick={onLogin} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#C8B085] to-[#A08C65] text-black font-bold uppercase tracking-widest text-xs shadow-lg shadow-[#C8B085]/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
                                <UserCircle size={16} /> {t.loginWithGoogle}
                            </button>
                        </div>
                    )}
                 </div>
            </div>

            {/* RISK MANAGEMENT (RESTORED) */}
            <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2"><Shield size={12}/> {t.riskSettings}</h3>
                <div className="p-4 rounded-xl border border-white/5 space-y-6">
                    <div className="space-y-2">
                         <div className="flex justify-between text-xs items-center">
                             <span className="text-slate-300 font-bold">{t.ddThreshold}</span>
                             <span className="px-2 py-0.5 rounded bg-[#2C5F54]/30 text-[#5B9A8B] font-bold font-barlow-numeric border border-[#2C5F54]/50">{ddThreshold}%</span>
                         </div>
                         <div className="relative flex items-center h-4">
                             <input type="range" min="5" max="50" step="1" value={ddThreshold} onChange={(e) => setDdThreshold(Number(e.target.value))} className="w-full h-1.5 rounded-lg appearance-none cursor-pointer" style={{background: `linear-gradient(to right, ${THEME.GREEN_DARK} 0%, ${THEME.GREEN} ${ddPercent}%, rgba(255,255,255,0.1) ${ddPercent}%, rgba(255,255,255,0.1) 100%)`}} />
                         </div>
                         <p className="text-[10px] text-slate-500 leading-relaxed">{t.risk_dd_desc}</p>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="space-y-2">
                         <div className="flex justify-between text-xs items-center">
                             <span className="text-slate-300 font-bold">{t.maxLossStreak}</span>
                             <span className="px-2 py-0.5 rounded bg-[#C8B085]/10 text-[#C8B085] font-bold font-barlow-numeric border border-[#C8B085]/30">{maxLossStreak} Trades</span>
                         </div>
                         <div className="relative flex items-center h-4">
                            <input type="range" min="2" max="10" step="1" value={maxLossStreak} onChange={(e) => setMaxLossStreak(Number(e.target.value))} className="w-full h-1.5 rounded-lg appearance-none cursor-pointer" style={{background: `linear-gradient(to right, #A08C65 0%, #C8B085 ${streakPercent}%, rgba(255,255,255,0.1) ${streakPercent}%, rgba(255,255,255,0.1) 100%)`}} />
                         </div>
                         <p className="text-[10px] text-slate-500 leading-relaxed">{t.risk_streak_desc}</p>
                    </div>
                </div>
            </div>

            {/* PREFERENCES (RESTORED) */}
            <div className="space-y-2">
                 <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2"><SettingsIcon size={12}/> {t.preferences}</h3>
                 <div className="rounded-xl border border-white/5 divide-y divide-white/5 overflow-hidden">
                     <div className="p-4 flex justify-between items-center hover:bg-white/[0.02] transition-colors">
                         <div className="flex items-center gap-3">
                             <div className="p-2 rounded-lg bg-white/5 text-slate-400"><Languages size={16}/></div>
                             <span className="text-sm font-medium text-slate-200">{t.language}</span>
                         </div>
                         <div className="flex bg-black p-1 rounded-lg border border-white/10">
                             <button onClick={() => setLang('en')} className={`px-4 py-1.5 rounded-md text-[10px] font-bold transition-all ${lang === 'en' ? 'bg-[#25282C] text-white shadow-sm border border-white/10' : 'text-slate-500'}`}>EN</button>
                             <button onClick={() => setLang('zh')} className={`px-4 py-1.5 rounded-md text-[10px] font-bold transition-all ${lang === 'zh' ? 'bg-[#25282C] text-white shadow-sm border border-white/10' : 'text-slate-500'}`}>中文</button>
                         </div>
                     </div>
                     <div className="p-4 flex justify-between items-center hover:bg-white/[0.02] transition-colors">
                         <div className="flex items-center gap-3">
                             <div className="p-2 rounded-lg bg-white/5 text-slate-400"><Palette size={16}/></div>
                             <span className="text-sm font-medium text-slate-200">{t.lossColor}</span>
                         </div>
                         <ColorPicker value={lossColor} onChange={setLossColor} align="right" />
                     </div>
                 </div>
            </div>

            {/* NEW ACCOUNT MANAGEMENT (TRUE BLACK CONSOLE STYLE) */}
            <div className="space-y-2">
                <AccountManager portfolios={portfolios} actions={actions} t={t} />
            </div>

            {/* TAG MANAGEMENT (RESTORED) */}
            <div className="space-y-2">
                 <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2"><Tag size={12}/> {t.tagManagement}</h3>
                 <div className="rounded-xl border border-white/5 overflow-hidden">
                    <div className="p-4 border-b border-white/5">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Target size={10}/> {t.strategyList}</div>
                        <div className="flex flex-wrap gap-2 mb-3 min-h-[30px]">
                            {strategies.map(s => {
                                const parts = s.split('_');
                                const main = parts[0];
                                const sub = parts.slice(1).join(' ');
                                return (
                                    <div key={s} className="group relative flex items-center">
                                        <span className="px-2.5 py-1 rounded bg-[#25282C] border border-white/5 text-[11px] text-slate-300 font-medium group-hover:bg-[#2A2D32] transition-colors pr-2 flex items-baseline">
                                            {main}
                                            {sub && <span className="text-[9px] text-zinc-500 ml-1 opacity-70">{sub}</span>}
                                        </span>
                                        <button onClick={() => actions.deleteStrategy(s)} className="w-4 h-4 ml-[-6px] rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 scale-90 hover:scale-100"><X size={8} strokeWidth={3}/></button>
                                    </div>
                                );
                            })}
                        </div>
                        <form onSubmit={handleAddStrategy} className="relative"><input type="text" value={newStrat} onChange={(e) => setNewStrat(e.target.value)} placeholder={t.addStrategy} className="w-full bg-[#0B0C10] border border-white/5 rounded pl-3 pr-8 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-white/20 transition-colors" /><button type="submit" disabled={!newStrat} className="absolute right-1 top-1 p-1 rounded bg-white/5 text-white hover:bg-white/20 transition-all disabled:opacity-0"><PlusIcon size={12}/></button></form>
                    </div>
                    <div className="p-4">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><BrainCircuit size={10}/> {t.mindsetList}</div>
                        <div className="flex flex-wrap gap-2 mb-3 min-h-[30px]">{emotions.map(e => (<div key={e} className="group relative flex items-center"><span className="px-2.5 py-1 rounded bg-[#25282C] border border-white/5 text-[11px] text-slate-300 font-medium group-hover:bg-[#2A2D32] transition-colors pr-2">{e}</span><button onClick={() => actions.deleteEmotion(e)} className="w-4 h-4 ml-[-6px] rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 scale-90 hover:scale-100"><X size={8} strokeWidth={3}/></button></div>))}</div>
                        <form onSubmit={handleAddEmotion} className="relative"><input type="text" value={newEmo} onChange={(e) => setNewEmo(e.target.value)} placeholder={t.addMindset} className="w-full bg-[#0B0C10] border border-white/5 rounded pl-3 pr-8 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-white/20 transition-colors" /><button type="submit" disabled={!newEmo} className="absolute right-1 top-1 p-1 rounded bg-white/5 text-white hover:bg-white/20 transition-all disabled:opacity-0"><PlusIcon size={12}/></button></form>
                    </div>
                 </div>
            </div>

            {/* DATA MANAGEMENT */}
            <div className="space-y-2">
                 <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2"><HardDrive size={12}/> {t.dataManagement}</h3>
                 <div className="grid grid-cols-2 gap-3">
                     <button onClick={() => actions.downloadBackup()} className="group flex flex-col items-center justify-center p-5 rounded-xl border border-white/5 hover:border-white/10 transition-all gap-3 bg-[#1A1C20]/50">
                         <div className="p-3 rounded-full bg-[#C8B085]/10 text-[#C8B085] group-hover:scale-110 transition-transform"><Database size={20}/></div>
                         <span className="text-xs font-bold text-slate-300 tracking-wide text-center">{t.exportJSON}</span>
                     </button>
                     <button onClick={() => jsonInputRef.current?.click()} className="group flex flex-col items-center justify-center p-5 rounded-xl border border-white/5 hover:border-white/10 transition-all gap-3 bg-[#1A1C20]/50">
                         <div className="p-3 rounded-full bg-[#5B9A8B]/10 text-[#5B9A8B] group-hover:scale-110 transition-transform"><FileJson size={20}/></div>
                         <span className="text-xs font-bold text-slate-300 tracking-wide text-center">{t.importJSON}</span>
                         <input type="file" ref={jsonInputRef} onChange={(e) => actions.handleImportJSON(e, t)} className="hidden" accept=".json" />
                     </button>
                     
                     <button onClick={() => actions.downloadCSV(trades)} className="group flex flex-col items-center justify-center p-5 rounded-xl border border-white/5 hover:border-white/10 transition-all gap-3">
                         <div className="p-3 rounded-full bg-slate-700/30 text-slate-400 group-hover:scale-110 transition-transform"><Download size={20}/></div>
                         <span className="text-xs font-bold text-slate-400 tracking-wide text-center">{t.exportCSV}</span>
                     </button>
                     <button onClick={() => fileInputRef.current?.click()} className="group flex flex-col items-center justify-center p-5 rounded-xl border border-white/5 hover:border-white/10 transition-all gap-3">
                         <div className="p-3 rounded-full bg-slate-700/30 text-slate-400 group-hover:scale-110 transition-transform"><Upload size={20}/></div>
                         <span className="text-xs font-bold text-slate-400 tracking-wide text-center">{t.importCSV}</span>
                         <input type="file" ref={fileInputRef} onChange={(e) => actions.handleImportCSV(e, t)} className="hidden" accept=".csv" />
                     </button>
                 </div>
            </div>

            {/* RESET ZONE */}
            <div className="mt-8 pt-8 border-t border-white/5">
                 <div className="rounded-xl border border-red-500/10 overflow-hidden relative group">
                     <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                     <div className="p-5">
                         <div className="flex items-center gap-3 mb-2"><AlertOctagon size={18} className="text-red-400"/><h3 className="text-sm font-bold text-red-400 uppercase tracking-widest">{t.dangerZone}</h3></div>
                         <p className="text-xs text-slate-500 leading-relaxed mb-4 pl-8">{t.resetDesc}</p>
                         <button onClick={() => actions.resetAllData(t)} className="w-full py-3 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-black hover:border-red-500 text-red-400 text-xs font-bold uppercase tracking-widest transition-all">{t.resetAll}</button>
                     </div>
                 </div>
            </div>
            
            <div className="text-center text-[10px] text-slate-700 font-mono pb-4 pt-2">TradeTrack Pro v1.3.1</div>
            {showLogoutConfirm && (<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"><div className="w-full max-w-xs bg-[#1C1E22] rounded-2xl border border-white/10 shadow-2xl p-6 text-center"><div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center text-slate-300"><LogOut size={24}/></div><h3 className="text-white font-bold text-lg mb-2">{t.logout}?</h3><p className="text-xs text-slate-400 mb-6">You are about to sign out. Your data is synced.</p><div className="flex gap-3"><button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 rounded-xl bg-white/5 text-slate-300 text-xs font-bold hover:bg-white/10 transition-colors">Cancel</button><button onClick={() => { setShowLogoutConfirm(false); onLogout(); }} className="flex-1 py-3 rounded-xl bg-[#C8B085] text-black text-xs font-bold hover:bg-[#B09870] transition-colors">Sign Out</button></div></div></div>)}
        </div>
    );
};
