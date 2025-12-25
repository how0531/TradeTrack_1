
import React, { useMemo, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Edit2, Trash2, Scroll, PenTool, FileText, Download, Upload, ShieldAlert, Plus, X, UserCircle, LogOut, Layout, Check, HardDrive, Briefcase, Calendar as CalendarIcon, LucideIcon, Plus as PlusIcon, Settings as SettingsIcon, Shield, CreditCard, ChevronDown, Activity, BrainCircuit, Target, Cloud, Languages, AlertOctagon, StickyNote, Quote, ArrowUpDown, TrendingDown, TrendingUp, MoreHorizontal, AlertTriangle, Circle, Palette, ArrowRight, Tag } from 'lucide-react';
import { THEME, I18N, DEFAULT_PALETTE } from '../constants';
import { formatCurrency, getPnlColor, formatDate, formatDecimal } from '../utils';
import { Trade, Portfolio, CalendarViewProps, LogsViewProps, SettingsViewProps } from '../types';
import { VirtualList, ColorPicker, MultiSelectDropdown } from './UI';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, ReferenceLine } from 'recharts';

// --- CALENDAR VIEW ---
export const CalendarView = ({ dailyPnlMap, currentMonth, setCurrentMonth, onDateClick, monthlyStats, hideAmounts, lang }: CalendarViewProps) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth(); 
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const t = I18N[lang] || I18N['zh'];
    const calendarDays = [];
    for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push({ key: `pad-${i}`, day: '', pnl: 0 });
    for (let i = 1; i <= daysInMonth; i++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        calendarDays.push({ key: dateKey, day: i, pnl: dailyPnlMap[dateKey] || 0 }); 
    }
    const maxAbsPnl = useMemo(() => {
        let max = 0;
        calendarDays.forEach(d => { if (Math.abs(d.pnl) > max) max = Math.abs(d.pnl); });
        return max > 0 ? max : 1;
    }, [calendarDays]);
    const getHeatmapStyle = (pnl: number, day: string | number) => {
        if (!day) return { bg: 'transparent', border: '1px solid transparent', text: 'transparent' };
        if (pnl === 0) return { bg: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', text: '#555' };
        const intensity = Math.abs(pnl) / maxAbsPnl;
        const opacity = 0.2 + (intensity * 0.7); 
        if (pnl > 0) return { bg: `rgba(208, 90, 90, ${opacity})`, border: `1px solid rgba(208, 90, 90, 0.3)`, text: opacity > 0.6 ? '#FFF' : THEME.RED };
        return { bg: `rgba(91, 154, 139, ${opacity})`, border: `1px solid rgba(91, 154, 139, 0.3)`, text: opacity > 0.6 ? '#FFF' : THEME.GREEN };
    };
    return (
        <div className="space-y-4">
             <div className="p-4 rounded-xl border border-white/5">
                <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                    <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-1 rounded hover:bg-white/5"><ChevronLeft size={18}/></button>
                    <div className="text-sm font-bold">{year} / {month + 1}</div>
                    <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-1 rounded hover:bg-white/5"><ChevronRight size={18}/></button>
                </div>
                <div className="grid grid-cols-7 text-center mb-2">{daysOfWeek.map((d,i) => <div key={i} className="text-[10px] font-bold text-slate-600">{d}</div>)}</div>
                <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((item) => {
                        const style = getHeatmapStyle(item.pnl, item.day);
                        return (
                            <div key={item.key} onClick={() => { if (item.day && onDateClick) onDateClick(item.key); }} className={`aspect-square flex flex-col justify-center items-center text-center rounded transition-all ${item.day ? 'hover:scale-105 cursor-pointer' : ''}`} style={{ backgroundColor: style.bg, border: style.border }}>
                                <div className="text-[10px] font-bold font-barlow-numeric" style={{ color: style.text }}>{item.day}</div>
                                {item.pnl !== 0 && item.day && (<div className="text-[8px] font-bold font-barlow-numeric opacity-80" style={{ color: style.text }}>{hideAmounts ? '***' : (Math.abs(item.pnl) >= 1000 ? (Math.abs(item.pnl)/1000).toFixed(1) + 'K' : Math.abs(item.pnl))}</div>)}
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="p-4 rounded-xl border border-white/5 flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">{t.monthlyPnl}</span>
                    <span className="text-xl font-bold font-barlow-numeric" style={{ color: getPnlColor(monthlyStats.pnl) }}>{formatCurrency(monthlyStats.pnl, hideAmounts)}</span>
                </div>
                <div className="flex gap-4">
                    <div className="text-right"><div className="text-[10px] text-slate-600 font-bold mb-0.5">{t.winRate}</div><div className="text-xs font-bold text-white">{formatDecimal(monthlyStats.winRate)}%</div></div>
                    <div className="text-right"><div className="text-[10px] text-slate-600 font-bold mb-0.5">{t.trades}</div><div className="text-xs font-bold text-white">{monthlyStats.count}</div></div>
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
    const t = I18N[lang] || I18N['zh'];
    
    return (
        <div 
            className={`group relative pl-8 pr-1 py-4 cursor-pointer transition-all duration-300 border-l border-white/5 ${isExpanded ? 'bg-white/[0.02] rounded-r-xl' : 'hover:bg-white/[0.01]'}`}
            onClick={() => setIsExpanded(!isExpanded)}
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
                    onClick={(e) => { e.stopPropagation(); if(window.confirm(t.deleteConfirm)) onDelete(trade.id); }} 
                    className="py-2.5 rounded-lg border border-white/5 bg-[#0B0C10] text-slate-500 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2"
                >
                    <Trash2 size={12}/> {t.delete}
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

export const LogsView = ({ trades, lang, hideAmounts, onEdit, onDelete, portfolios }: LogsViewProps) => {
    const t = I18N[lang] || I18N['zh'];
    const [sortBy, setSortBy] = useState<'date' | 'pnl_high' | 'pnl_low'>('date');

    // Grouping Logic
    const items = useMemo(() => {
        if (!Array.isArray(trades)) return [];
        let sortedTrades = [...trades];

        // Non-date sorting (Flat list style)
        if (sortBy !== 'date') {
            if (sortBy === 'pnl_high') sortedTrades.sort((a, b) => (b.pnl || 0) - (a.pnl || 0));
            if (sortBy === 'pnl_low') sortedTrades.sort((a, b) => (a.pnl || 0) - (b.pnl || 0));
            return sortedTrades.map(tr => ({ type: 'trade', data: tr }));
        }

        // Date Grouping (Timeline style)
        const groups: Record<string, Trade[]> = {};
        trades.forEach(t => { if (!t.date) return; if (!groups[t.date]) groups[t.date] = []; groups[t.date].push(t); });
        const sortedDates = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        const res: any[] = [];
        sortedDates.forEach(dateStr => {
            const dayTrades = groups[dateStr];
            const pnl = dayTrades.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0);
            res.push({ type: 'header', dateStr, pnl, count: dayTrades.length });
            dayTrades.forEach(tr => { res.push({ type: 'trade', data: tr }); });
        });
        return res;
    }, [trades, sortBy]);

    if (items.length === 0 && trades.length === 0) return (
        <div className="flex flex-col items-center justify-center py-20 opacity-30">
            <Scroll size={48} className="text-slate-500 mb-4" />
            <h3 className="text-xs font-bold uppercase tracking-widest">{t.emptyStateTitle}</h3>
        </div>
    );

    return (
        <div className="pb-32 px-4 relative min-h-screen">
             {/* Sort Controls */}
             <div className="flex justify-center gap-2 mb-8 sticky top-0 z-30 py-3 bg-black/80 backdrop-blur-md -mx-4 border-b border-white/5">
                <div className="flex p-0.5 rounded-full bg-white/5 border border-white/5">
                    {['date', 'pnl_high', 'pnl_low'].map((key) => (
                        <button 
                            key={key}
                            onClick={() => setSortBy(key as any)} 
                            className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all ${sortBy === key ? 'bg-white text-black shadow-md' : 'text-slate-500 hover:text-white'}`}
                        >
                            {t[`sort_${key}` as keyof typeof t]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Timeline Container */}
            <div className="relative ml-2">
                {/* The Vertical Line */}
                {sortBy === 'date' && <div className="absolute left-0 top-4 bottom-0 w-px bg-white/10 z-0"></div>}

                <div className="space-y-6">
                    {items.map((item, index) => {
                        // --- DATE HEADER (CAPSULE) ---
                        if (item.type === 'header') {
                            const dateObj = new Date(item.dateStr);
                            const dayStr = dateObj.toLocaleDateString(lang === 'zh' ? 'zh-TW' : 'en-US', { month: 'numeric', day: 'numeric', weekday: 'short' });
                            return (
                                <div key={`header-${item.dateStr}`} className="relative pl-6 pt-2">
                                    {/* The Capsule */}
                                    <div className="absolute left-[-16px] top-2 z-10 flex items-center gap-3">
                                        <div className="bg-[#C8B085] text-[#0B0C10] px-3 py-1 rounded-full text-xs font-bold shadow-[0_0_15px_rgba(200,176,133,0.2)] whitespace-nowrap border border-[#C8B085]">
                                            {dayStr}
                                        </div>
                                        {/* Dashed Line Connector */}
                                        <div className="w-8 h-px border-t border-dashed border-white/10"></div>
                                        
                                        {/* Day Stats */}
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] text-slate-500 font-bold">{item.count} Trades</span>
                                            <span className={`text-sm font-barlow-numeric font-bold ${item.pnl >= 0 ? 'text-[#D05A5A]' : 'text-[#5B9A8B]'}`}>
                                                {item.pnl > 0 ? '+' : ''}{formatCurrency(item.pnl, hideAmounts)}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Spacer for the header height */}
                                    <div className="h-8"></div>
                                </div>
                            );
                        }
                        
                        // --- TRADE CARD ---
                        return (
                            <TimelineTradeItem 
                                key={item.data.id} 
                                trade={item.data} 
                                onEdit={onEdit} 
                                onDelete={onDelete} 
                                lang={lang} 
                                hideAmounts={hideAmounts} 
                                portfolios={portfolios}
                            />
                        );
                    })}
                </div>
            </div>
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
    onBack, currentUser, onLogin, onLogout
}: SettingsViewProps) => {
    const t = I18N[lang] || I18N['zh'];
    const [newStrat, setNewStrat] = useState('');
    const [newEmo, setNewEmo] = useState('');
    const [newPortName, setNewPortName] = useState('');
    const [newPortCapital, setNewPortCapital] = useState('');
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAddStrategy = (e: React.FormEvent) => {
        e.preventDefault();
        if(newStrat.trim()) { actions.addStrategy(newStrat.trim()); setNewStrat(''); }
    };

    const handleAddEmotion = (e: React.FormEvent) => {
        e.preventDefault();
        if(newEmo.trim()) { actions.addEmotion(newEmo.trim()); setNewEmo(''); }
    };

    const handleAddPortfolio = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPortName.trim() && newPortCapital.trim()) {
            const newId = `p-${Date.now()}`;
            const newP: Portfolio = {
                id: newId,
                name: newPortName.trim(),
                initialCapital: parseFloat(newPortCapital),
                profitColor: DEFAULT_PALETTE[Math.floor(Math.random() * DEFAULT_PALETTE.length)],
                lossColor: THEME.DEFAULT_LOSS
            };
            actions.updateSettings('portfolios', [...portfolios, newP]);
            setNewPortName('');
            setNewPortCapital('');
        }
    };

    const handleDeletePortfolio = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation(); 
        if(window.confirm(lang === 'zh' ? '確定要刪除此帳戶嗎？' : 'Are you sure you want to delete this account?')) {
            if (activePortfolioIds.includes(id)) {
                const newActive = activePortfolioIds.filter(pid => pid !== id);
                const fallback = portfolios.find(p => p.id !== id);
                if (newActive.length === 0 && fallback) {
                    setActivePortfolioIds([fallback.id]);
                } else {
                    setActivePortfolioIds(newActive);
                }
            }
            actions.updateSettings('portfolios', portfolios.filter(x => x.id !== id));
        }
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
                                    <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#5B9A8B] border-2 border-[#1C1E22] shadow-sm"></div>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white tracking-tight">{currentUser.displayName || 'Anonymous Trader'}</h2>
                                    <p className="text-xs text-slate-500 font-mono mt-0.5">{currentUser.email}</p>
                                    <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full bg-[#5B9A8B]/10 border border-[#5B9A8B]/20">
                                        <Cloud size={10} className="text-[#5B9A8B]"/>
                                        <span className="text-[10px] font-bold text-[#5B9A8B] uppercase tracking-wider">{t.synced}</span>
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
                                <h3 className="text-sm font-bold text-white mb-2">Sync Your Legacy</h3>
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
                             <span className="text-slate-300 font-bold">Max Loss Streak</span>
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
                         <ColorPicker value={lossColor} onChange={setLossColor} />
                     </div>
                 </div>
            </div>

            {/* ACCOUNT MANAGEMENT (RESTORED) */}
            <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2"><Briefcase size={12}/> {t.managePortfolios}</h3>
                <div className="grid gap-2">
                    {portfolios.map(p => (
                        <div key={p.id} className="rounded-xl border border-white/5 p-2 flex items-center gap-2 group hover:bg-white/[0.02] transition-colors relative">
                            <input type="text" value={p.name} onChange={(e) => actions.updatePortfolio(p.id, 'name', e.target.value)} className="flex-1 min-w-0 bg-transparent text-xs font-bold text-white outline-none placeholder-slate-600 focus:text-[#C8B085] transition-colors" placeholder="Account Name" />
                            <div className="w-20 shrink-0"><input type="number" value={p.initialCapital} onChange={(e) => actions.updatePortfolio(p.id, 'initialCapital', e.target.value)} className="bg-[#0B0C10] px-1.5 py-1 rounded text-slate-300 outline-none font-barlow-numeric text-xs border border-white/5 focus:border-white/20 w-full text-right" placeholder="Cap" /></div>
                            <div className="flex items-center gap-1 shrink-0">
                                <ColorPicker value={p.profitColor} onChange={(c) => actions.updatePortfolio(p.id, 'profitColor', c)} />
                                <ColorPicker value={p.lossColor || THEME.DEFAULT_LOSS} onChange={(c) => actions.updatePortfolio(p.id, 'lossColor', c)} />
                            </div>
                            {portfolios.length > 1 && (<button type="button" onClick={(e) => handleDeletePortfolio(p.id, e)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 z-10 relative cursor-pointer"><Trash2 size={14}/></button>)}
                        </div>
                    ))}
                    <form onSubmit={handleAddPortfolio} className="bg-black rounded-xl border border-white/10 border-dashed p-3 flex items-center gap-2 transition-colors hover:border-white/20 hover:bg-white/[0.01]">
                        <div className="p-1.5 bg-white/5 rounded-lg"><PlusIcon size={14} className="text-slate-500"/></div>
                        <input type="text" value={newPortName} onChange={e => setNewPortName(e.target.value)} placeholder={t.portfolioName} className="flex-[2] bg-transparent text-xs text-white placeholder-slate-600 outline-none min-w-0" />
                        <input type="number" value={newPortCapital} onChange={e => setNewPortCapital(e.target.value)} placeholder={t.initialCapital} className="flex-1 bg-transparent text-xs text-white placeholder-slate-600 outline-none text-right font-barlow-numeric min-w-0" />
                        <button type="submit" disabled={!newPortName || !newPortCapital} className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase disabled:opacity-30 disabled:cursor-not-allowed transition-all">{t.add}</button>
                    </form>
                </div>
            </div>

            {/* TAG MANAGEMENT (RESTORED) */}
            <div className="space-y-2">
                 <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2"><Tag size={12}/> {t.tagManagement}</h3>
                 <div className="rounded-xl border border-white/5 overflow-hidden">
                    <div className="p-4 border-b border-white/5">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Target size={10}/> {t.strategyList}</div>
                        <div className="flex flex-wrap gap-2 mb-3 min-h-[30px]">{strategies.map(s => (<div key={s} className="group relative flex items-center"><span className="px-2.5 py-1 rounded bg-[#25282C] border border-white/5 text-[11px] text-slate-300 font-medium group-hover:bg-[#2A2D32] transition-colors pr-2">{s}</span><button onClick={() => actions.deleteStrategy(s)} className="w-4 h-4 ml-[-6px] rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 scale-90 hover:scale-100"><X size={8} strokeWidth={3}/></button></div>))}</div>
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
                     <button onClick={() => actions.downloadCSV(trades)} className="group flex flex-col items-center justify-center p-5 rounded-xl border border-white/5 hover:border-white/10 transition-all gap-3">
                         <div className="p-3 rounded-full bg-[#C8B085]/10 text-[#C8B085] group-hover:scale-110 transition-transform"><Upload size={20}/></div>
                         <span className="text-xs font-bold text-slate-300 tracking-wide">{t.exportCSV}</span>
                     </button>
                     <button onClick={() => fileInputRef.current?.click()} className="group flex flex-col items-center justify-center p-5 rounded-xl border border-white/5 hover:border-white/10 transition-all gap-3">
                         <div className="p-3 rounded-full bg-[#5B9A8B]/10 text-[#5B9A8B] group-hover:scale-110 transition-transform"><Download size={20}/></div>
                         <span className="text-xs font-bold text-slate-300 tracking-wide">{t.importCSV}</span>
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
            
            <div className="text-center text-[10px] text-slate-700 font-mono pb-4 pt-2">TradeTrack Pro v1.2.0</div>
            {showLogoutConfirm && (<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"><div className="w-full max-w-xs bg-[#1C1E22] rounded-2xl border border-white/10 shadow-2xl p-6 text-center"><div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center text-slate-300"><LogOut size={24}/></div><h3 className="text-white font-bold text-lg mb-2">{t.logout}?</h3><p className="text-xs text-slate-400 mb-6">You are about to sign out. Your data is synced.</p><div className="flex gap-3"><button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 rounded-xl bg-white/5 text-slate-300 text-xs font-bold hover:bg-white/10 transition-colors">Cancel</button><button onClick={() => { setShowLogoutConfirm(false); onLogout(); }} className="flex-1 py-3 rounded-xl bg-[#C8B085] text-black text-xs font-bold hover:bg-[#B09870] transition-colors">Sign Out</button></div></div></div>)}
        </div>
    );
};
