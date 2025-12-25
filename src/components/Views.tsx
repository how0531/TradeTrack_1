
import React, { useMemo, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Edit2, Trash2, Scroll, PenTool, FileText, Download, Upload, ShieldAlert, Plus, X, UserCircle, LogOut, Layout, Check, HardDrive, Briefcase, Calendar as CalendarIcon, LucideIcon, Plus as PlusIcon, Settings as SettingsIcon, Shield, CreditCard, ChevronDown, Activity, BrainCircuit, Target, Cloud, Languages, AlertOctagon, StickyNote, Quote, ArrowUpDown, TrendingDown, TrendingUp, MoreHorizontal, AlertTriangle, Circle } from 'lucide-react';
import { THEME, I18N, DEFAULT_PALETTE } from '../constants';
import { formatCurrency, getPnlColor, formatDate, formatDecimal } from '../utils';
import { Trade, Portfolio, CalendarViewProps, LogsViewProps, SettingsViewProps } from '../types';
import { VirtualList, ColorPicker, MultiSelectDropdown } from './UI';

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
             <div className="p-4 rounded-xl bg-[#141619] border border-white/5">
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
            <div className="p-4 rounded-xl bg-[#141619] border border-white/5 flex items-center justify-between">
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

const TimelineTradeItem = ({ trade, onEdit, onDelete, lang, hideAmounts, portfolios, showDate = false }: any) => {
    const isProfit = trade.pnl >= 0;
    const portfolio = portfolios.find((p: any) => p.id === trade.portfolioId);
    
    // Swipe Logic
    const [offsetX, setOffsetX] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);
    const startX = useRef<number | null>(null);
    const isDragging = useRef(false);
    const hasNote = !!trade.note && trade.note.trim().length > 0;

    const handleTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        isDragging.current = true;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (startX.current === null) return;
        const currentX = e.touches[0].clientX;
        const diff = currentX - startX.current;
        if (Math.abs(diff) > 10) { 
             if (diff > -120 && diff < 120) {
                setOffsetX(diff);
            }
        }
    };

    const handleTouchEnd = () => {
        if (!isDragging.current) return;
        if (offsetX > 80) {
            onEdit(trade); 
        } else if (offsetX < -80) {
            onDelete(trade.id);
        }
        setOffsetX(0);
        startX.current = null;
        isDragging.current = false;
    };

    const handleCardClick = () => {
        if (Math.abs(offsetX) > 5) return;
        setIsExpanded(!isExpanded);
    };

    const bgStyle = useMemo(() => {
        if (offsetX > 0) return { backgroundColor: THEME.BLUE, justifyContent: 'flex-start' };
        if (offsetX < 0) return { backgroundColor: THEME.RED, justifyContent: 'flex-end' };
        return { backgroundColor: 'transparent' };
    }, [offsetX]);

    const emotionColor = trade.emotion === 'FOMO' ? 'text-red-400 border-red-500/30 bg-red-500/10' 
                       : trade.emotion === '冷靜' || trade.emotion === 'Calm' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10'
                       : 'text-slate-400 border-white/10 bg-white/5';

    return (
        <div className="relative pl-6 mb-4 group">
            {/* Timeline Connector */}
            <div className={`absolute left-[-5px] top-4 w-2.5 h-2.5 rounded-full border-2 ${isProfit ? 'border-[#D05A5A] bg-[#0B0C10]' : 'border-[#5B9A8B] bg-[#0B0C10]'} z-10 shadow-[0_0_8px_rgba(0,0,0,0.5)]`} />
            
            {/* Main Card Container */}
            <div className="relative overflow-hidden rounded-2xl shadow-lg">
                 {/* Background Actions Layer (Swipe) */}
                <div 
                    className={`absolute inset-0 flex items-center px-4 rounded-2xl transition-colors duration-200 ${offsetX !== 0 ? 'opacity-100' : 'opacity-0'}`}
                    style={{ ...bgStyle }}
                >
                    {offsetX > 0 && <Edit2 size={18} className="text-white drop-shadow-md" />}
                    {offsetX < 0 && <Trash2 size={18} className="text-white drop-shadow-md" />}
                </div>

                {/* Foreground Card */}
                <div 
                    className={`
                        relative z-10 p-4
                        bg-[#1A1C20]/80 backdrop-blur-md border border-white/5
                        transition-all duration-300
                        touch-pan-y
                        ${isExpanded ? 'bg-[#1C1E22] border-white/10 shadow-2xl scale-[1.01]' : 'hover:bg-[#1C1E22]/80'}
                    `}
                    style={{ 
                        transform: `translateX(${offsetX}px)`,
                        transition: isDragging.current ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)' 
                    }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={handleCardClick}
                >
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                {showDate && <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">{formatDate(trade.date, lang)}</span>}
                                {portfolio && (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/20 border border-white/5">
                                        <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_5px]" style={{ backgroundColor: portfolio.profitColor, boxShadow: `0 0 5px ${portfolio.profitColor}` }}></div>
                                        <span className="text-[10px] text-slate-300 font-bold">{portfolio.name}</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                {trade.strategy && <span className="text-xs text-white font-bold">{trade.strategy}</span>}
                                {trade.emotion && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-md border ${emotionColor} font-bold uppercase tracking-wide`}>
                                        {trade.emotion}
                                    </span>
                                )}
                            </div>

                            {hasNote && !isExpanded && (
                                <div className="flex items-center gap-1.5 text-slate-500 mt-1">
                                    <FileText size={12} className="opacity-70" />
                                    <span className="text-[11px] truncate max-w-[180px] italic opacity-80">{trade.note}</span>
                                </div>
                            )}
                        </div>

                        <div className="text-right pl-2">
                            <div className={`text-lg font-barlow-numeric font-bold tracking-tight drop-shadow-sm ${isProfit ? 'text-[#D05A5A]' : 'text-[#5B9A8B]'}`}>
                                {isProfit ? '+' : ''}{formatCurrency(trade.pnl, hideAmounts)}
                            </div>
                            <div className="flex justify-end mt-2">
                                <ChevronDown size={14} className={`text-slate-600 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#C8B085]' : ''}`} />
                            </div>
                        </div>
                    </div>

                    {/* Expanded Content */}
                     <div 
                        className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isExpanded ? 'max-h-[500px] opacity-100 mt-4 pt-4 border-t border-white/5' : 'max-h-0 opacity-0'}`}
                    >
                        <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                            <div className="flex items-start gap-2">
                                <Quote size={12} className="text-[#C8B085] opacity-50 mt-1 shrink-0" />
                                <p className="text-sm text-slate-300 leading-relaxed font-light whitespace-pre-wrap">{trade.note || 'No notes added.'}</p>
                            </div>
                        </div>
                        
                        <div className="flex justify-end mt-4 gap-3">
                             <button 
                                onClick={(e) => { e.stopPropagation(); onEdit(trade); }} 
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider border border-white/5"
                             >
                                <Edit2 size={12} /> Edit
                             </button>
                             <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(trade.id); }} 
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors text-xs font-bold uppercase tracking-wider border border-red-500/20"
                             >
                                <Trash2 size={12} /> Delete
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const LogsView = ({ trades, lang, hideAmounts, onEdit, onDelete, portfolios }: LogsViewProps) => {
    const t = I18N[lang] || I18N['zh'];
    const [sortBy, setSortBy] = useState<'date' | 'pnl_high' | 'pnl_low'>('date');

    const items = useMemo(() => {
        if (!Array.isArray(trades)) return [];
        let sortedTrades = [...trades];

        if (sortBy === 'pnl_high') {
            sortedTrades.sort((a, b) => (b.pnl || 0) - (a.pnl || 0));
            return sortedTrades.map(tr => ({ type: 'trade', data: tr }));
        }

        if (sortBy === 'pnl_low') {
            sortedTrades.sort((a, b) => (a.pnl || 0) - (b.pnl || 0));
            return sortedTrades.map(tr => ({ type: 'trade', data: tr }));
        }

        // Default: Sort by Date Descending
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
        <div className="pb-24 px-1">
             {/* Sort Controls */}
             <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar mask-gradient pr-4 pt-2 sticky top-0 z-30 bg-[#0B0C10]/80 backdrop-blur-sm py-2 -mx-1 px-1">
                <button 
                    onClick={() => setSortBy('date')} 
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border shrink-0 ${sortBy === 'date' ? 'bg-[#C8B085] text-black border-[#C8B085] shadow-lg shadow-[#C8B085]/20' : 'bg-[#1A1C20]/60 text-slate-500 border-white/5 hover:bg-[#1A1C20] hover:border-white/10'}`}
                >
                    <CalendarIcon size={12} /> {t.sort_date}
                </button>
                <button 
                    onClick={() => setSortBy('pnl_high')} 
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border shrink-0 ${sortBy === 'pnl_high' ? 'bg-[#C8B085] text-black border-[#C8B085] shadow-lg shadow-[#C8B085]/20' : 'bg-[#1A1C20]/60 text-slate-500 border-white/5 hover:bg-[#1A1C20] hover:border-white/10'}`}
                >
                    <TrendingUp size={12} /> {t.sort_pnl_high}
                </button>
                <button 
                    onClick={() => setSortBy('pnl_low')} 
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border shrink-0 ${sortBy === 'pnl_low' ? 'bg-[#C8B085] text-black border-[#C8B085] shadow-lg shadow-[#C8B085]/20' : 'bg-[#1A1C20]/60 text-slate-500 border-white/5 hover:bg-[#1A1C20] hover:border-white/10'}`}
                >
                    <TrendingDown size={12} /> {t.sort_pnl_low}
                </button>
            </div>

            {/* Timeline Container */}
            <div className="relative ml-2">
                {/* Proposal 5: Focus Mode Timeline Line */}
                <div className="absolute left-0 top-0 bottom-0 w-px bg-white/10 ml-[0.5px]"></div>

                {items.map((item, index) => {
                    if (item.type === 'header') {
                        const dateObj = new Date(item.dateStr);
                        const dayStr = dateObj.toLocaleDateString(lang === 'zh' ? 'zh-TW' : 'en-US', { month: 'numeric', day: 'numeric', weekday: 'short' });
                        return (
                            <div key={`header-${item.dateStr}`} className="relative pl-6 mb-4 mt-6 first:mt-0 flex items-center justify-between group">
                                <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#C8B085] border-2 border-[#0B0C10] z-20 shadow-[0_0_10px_rgba(200,176,133,0.5)]"></div>
                                <div className="text-[10px] font-bold text-[#C8B085] uppercase tracking-wide px-2 py-0.5 rounded border border-[#C8B085]/20 bg-[#C8B085]/5 backdrop-blur-sm">{dayStr}</div>
                                <div className="flex items-center gap-2 pr-2">
                                     <span className="text-[10px] text-slate-500 font-bold">{item.count} Trades</span>
                                     <span className="text-xs font-bold font-barlow-numeric" style={{ color: item.pnl >= 0 ? THEME.RED : THEME.LOSS_WHITE }}>
                                        {item.pnl > 0 ? '+' : ''}{formatCurrency(item.pnl, hideAmounts)}
                                    </span>
                                </div>
                            </div>
                        );
                    }
                    return (
                        <TimelineTradeItem 
                            key={item.data.id} 
                            trade={item.data} 
                            onEdit={onEdit} 
                            onDelete={onDelete} 
                            lang={lang} 
                            hideAmounts={hideAmounts} 
                            portfolios={portfolios}
                            showDate={sortBy !== 'date'}
                        />
                    );
                })}
            </div>
        </div>
    );
};

// --- SETTINGS COMPONENTS (Keep Existing) ---

const SettingCard = ({ icon: Icon, title, children, className = "" }: { icon: any, title: string, children?: React.ReactNode, className?: string }) => (
    <div className={`rounded-2xl bg-[#141619] border border-white/5 overflow-hidden ${className}`}>
        <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#0B0C10] border border-white/5 text-[#C8B085]">
                <Icon size={14} />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">{title}</h3>
        </div>
        <div className="p-5">
            {children}
        </div>
    </div>
);

const CloudSyncSection = ({ currentUser, onLogin, onLogout, t }: any) => {
    const isUserLoggedIn = currentUser && !currentUser.isAnonymous;
    return (
        <div className="mb-6">
            {isUserLoggedIn ? (
                <div className="rounded-2xl bg-gradient-to-br from-[#141619] to-[#1C1E22] border border-white/10 p-5 flex items-center justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#C8B085] opacity-[0.03] rounded-full -mr-10 -mt-10 blur-2xl group-hover:opacity-[0.05] transition-opacity"></div>
                    <div className="flex items-center gap-4 relative z-10">
                        {currentUser.photoURL ? (
                            <img src={currentUser.photoURL} className="w-12 h-12 rounded-full border-2 border-[#C8B085]/20 shadow-lg" alt="Avatar" />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-[#25282C] flex items-center justify-center border border-white/5"><UserCircle size={28} className="text-slate-400" /></div>
                        )}
                        <div>
                            <div className="text-sm font-bold text-white mb-0.5">{currentUser.displayName || 'Cloud User'}</div>
                            <div className="text-[10px] text-slate-500 font-medium bg-[#0B0C10] px-2 py-0.5 rounded-full inline-block border border-white/5">{currentUser.email}</div>
                        </div>
                    </div>
                    <button onClick={onLogout} className="p-3 rounded-xl bg-[#0B0C10] border border-white/5 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-all z-10 shadow-sm">
                        <LogOut size={18}/>
                    </button>
                </div>
            ) : (
                <div className="rounded-2xl bg-[#141619] border border-white/5 p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#0B0C10] border border-white/5 flex items-center justify-center mx-auto mb-3 text-[#C8B085]">
                        <Cloud size={24} />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">{t.syncTitle}</h3>
                    <p className="text-[11px] text-slate-500 mb-5 max-w-[200px] mx-auto leading-relaxed">{t.syncDesc}</p>
                    <div className="flex flex-col gap-2">
                         <button onClick={() => onLogin()} className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white text-black font-bold text-[11px] transition-all hover:bg-slate-100 active:scale-[0.98]">
                            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                            {t.loginWithGoogle}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const RiskManagementSection = ({ ddThreshold, setDdThreshold, maxLossStreak, setMaxLossStreak, t, lang }: any) => {
    return (
        <SettingCard icon={ShieldAlert} title={t.riskSettings} className="mb-6">
            <div className="space-y-5">
                <div>
                     <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">{t.ddThreshold}</label>
                        <span className="text-xs font-bold text-[#C8B085] font-barlow-numeric">{ddThreshold}%</span>
                    </div>
                    <input 
                        type="range" 
                        min="5" max="50" step="1" 
                        value={ddThreshold} 
                        onChange={(e) => setDdThreshold(Number(e.target.value))} 
                        className="w-full h-1.5 bg-[#0B0C10] rounded-lg appearance-none cursor-pointer accent-[#C8B085] hover:accent-[#C8B085]" 
                    />
                    <div className="mt-1 flex items-center gap-1.5 text-[9px] text-slate-500">
                        <ShieldAlert size={10} />
                        <span>{t.ddWarning}</span>
                    </div>
                </div>

                <div className="h-px bg-white/5"></div>

                <div>
                     <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Max Loss Streak Alert</label>
                        <span className="text-xs font-bold text-[#D05A5A] font-barlow-numeric">{maxLossStreak} Trades</span>
                    </div>
                     <input 
                        type="range" 
                        min="2" max="10" step="1" 
                        value={maxLossStreak} 
                        onChange={(e) => setMaxLossStreak(Number(e.target.value))} 
                        className="w-full h-1.5 bg-[#0B0C10] rounded-lg appearance-none cursor-pointer accent-[#D05A5A] hover:accent-[#D05A5A]" 
                    />
                </div>
            </div>
        </SettingCard>
    );
};

const PortfolioSection = ({ portfolios, actions, t, lang }: any) => {
    return (
        <SettingCard icon={Briefcase} title={t.managePortfolios} className="mb-6">
            <div className="space-y-3">
                {portfolios.map((p: any) => (
                    <div key={p.id} className="p-3 rounded-xl bg-[#0B0C10] border border-white/5 flex gap-3">
                        <div className="pt-1 flex flex-col gap-3 items-center min-w-[32px]">
                            {/* Profit Color */}
                             <div className="flex flex-col items-center gap-1 group relative">
                                <span className="text-[8px] text-slate-600 font-bold uppercase text-center leading-none">{t.profit || 'Win'}</span>
                                <ColorPicker value={p.profitColor} onChange={(c) => actions.updatePortfolio(p.id, 'profitColor', c)} />
                            </div>
                            
                            <div className="h-px w-full bg-white/5"></div>

                            {/* Loss Color */}
                             <div className="flex flex-col items-center gap-1 group relative">
                                <span className="text-[8px] text-slate-600 font-bold uppercase text-center leading-none">{t.loss || 'Loss'}</span>
                                <ColorPicker value={p.lossColor || '#28573f'} onChange={(c) => actions.updatePortfolio(p.id, 'lossColor', c)} />
                            </div>
                        </div>
                        <div className="flex-1 space-y-2 border-l border-white/5 pl-3">
                            <div>
                                <label className="text-[8px] font-bold text-slate-500 uppercase block mb-0.5">{t.portfolioName}</label>
                                <input 
                                    type="text" 
                                    value={p.name} 
                                    onChange={(e) => actions.updatePortfolio(p.id, 'name', e.target.value)}
                                    className="w-full bg-transparent text-xs font-bold text-white outline-none border-b border-white/10 focus:border-white/30 py-0.5"
                                />
                            </div>
                            <div>
                                <label className="text-[8px] font-bold text-slate-500 uppercase block mb-0.5">{t.initialCapital}</label>
                                <div className="flex items-center gap-1">
                                    <span className="text-slate-500 text-xs">$</span>
                                    <input 
                                        type="number" 
                                        value={p.initialCapital} 
                                        onChange={(e) => actions.updatePortfolio(p.id, 'initialCapital', e.target.value)}
                                        className="w-full bg-transparent text-xs font-barlow-numeric font-bold text-white outline-none border-b border-white/10 focus:border-white/30 py-0.5"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                <button 
                    onClick={() => {
                        const newP = { id: `p-${Date.now()}`, name: 'New Account', initialCapital: 0, profitColor: '#C8B085', lossColor: '#28573f' };
                        actions.updateSettings('portfolios', [...portfolios, newP]);
                    }}
                    className="w-full py-3 rounded-xl border border-dashed border-white/10 text-[10px] font-bold uppercase text-slate-500 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                >
                    <Plus size={12} /> {t.addPortfolio}
                </button>
            </div>
        </SettingCard>
    );
};

const PreferencesSection = ({ lang, setLang, strategies, emotions, actions, t }: any) => {
    const [newStrat, setNewStrat] = React.useState('');
    const [newEmo, setNewEmo] = React.useState('');
    
    return (
        <SettingCard icon={SettingsIcon} title={t.preferences || 'Preferences'} className="mb-6">
            <div className="space-y-6">
                {/* Language */}
                <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2 text-slate-400">
                        <Languages size={14}/>
                        <span className="text-[11px] font-bold">{t.language}</span>
                    </div>
                    <div className="flex bg-[#0B0C10] p-1 rounded-lg border border-white/5">
                        <button onClick={() => setLang('zh')} className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${lang === 'zh' ? 'bg-[#C8B085] text-black shadow-sm' : 'text-slate-500 hover:text-white'}`}>中文</button>
                        <button onClick={() => setLang('en')} className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${lang === 'en' ? 'bg-[#C8B085] text-black shadow-sm' : 'text-slate-500 hover:text-white'}`}>EN</button>
                    </div>
                </div>

                <div className="h-px bg-white/5"></div>

                {/* Strategies */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-400">
                            <Target size={14}/>
                            <span className="text-[11px] font-bold">{t.strategyList}</span>
                        </div>
                        <span className="text-[9px] text-slate-600 bg-white/5 px-2 py-0.5 rounded-full">{strategies.length}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 min-h-[40px]">
                        {strategies.map((s: string) => (
                            <div key={s} className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-[#0B0C10] rounded-lg border border-white/5 text-[10px] text-slate-300 group">
                                {s}
                                <button onClick={() => actions.deleteStrategy(s)} className="text-slate-600 hover:text-red-400 p-0.5 rounded-full hover:bg-white/10 transition-colors"><X size={10}/></button>
                            </div>
                        ))}
                        <form onSubmit={(e) => { e.preventDefault(); actions.addStrategy(newStrat); setNewStrat(''); }} className="flex-1 min-w-[120px] max-w-[200px]">
                             <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0B0C10]/50 rounded-lg border border-white/5 focus-within:border-white/20 transition-colors">
                                <Plus size={10} className="text-slate-500"/>
                                <input value={newStrat} onChange={e => setNewStrat(e.target.value)} placeholder={t.add} className="w-full bg-transparent text-[10px] text-white outline-none placeholder-slate-600" />
                            </div>
                        </form>
                    </div>
                </div>

                <div className="h-px bg-white/5"></div>

                {/* Emotions */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-400">
                            <BrainCircuit size={14}/>
                            <span className="text-[11px] font-bold">{t.mindsetList || 'Mindset'}</span>
                        </div>
                        <span className="text-[9px] text-slate-600 bg-white/5 px-2 py-0.5 rounded-full">{emotions.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 min-h-[40px]">
                        {emotions.map((e: string) => (
                            <div key={e} className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-[#0B0C10] rounded-lg border border-white/5 text-[10px] text-slate-300 group">
                                {e}
                                <button onClick={() => actions.deleteEmotion(e)} className="text-slate-600 hover:text-red-400 p-0.5 rounded-full hover:bg-white/10 transition-colors"><X size={10}/></button>
                            </div>
                        ))}
                         <form onSubmit={(e) => { e.preventDefault(); actions.addEmotion(newEmo); setNewEmo(''); }} className="flex-1 min-w-[120px] max-w-[200px]">
                             <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0B0C10]/50 rounded-lg border border-white/5 focus-within:border-white/20 transition-colors">
                                <Plus size={10} className="text-slate-500"/>
                                <input value={newEmo} onChange={e => setNewEmo(e.target.value)} placeholder={t.add} className="w-full bg-transparent text-[10px] text-white outline-none placeholder-slate-600" />
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </SettingCard>
    );
};

const DataSection = ({ trades, actions, t }: any) => {
    const fileRef = React.useRef<HTMLInputElement>(null);
    return (
        <SettingCard icon={HardDrive} title={t.dataManagement} className="mb-8">
             <div className="grid grid-cols-2 gap-3">
                <button onClick={() => actions.downloadCSV(trades)} className="flex items-center justify-center gap-3 py-4 rounded-xl bg-[#0B0C10] border border-white/5 hover:bg-[#1C1E22] transition-all group">
                    <div className="p-2 rounded-full bg-white/5 group-hover:bg-[#C8B085]/10 text-slate-400 group-hover:text-[#C8B085] transition-colors">
                        <Download size={16} />
                    </div>
                    <div className="text-left">
                        <div className="text-[10px] font-bold text-white uppercase">{t.exportCSV}</div>
                        <div className="text-[9px] text-slate-500">Backup Data</div>
                    </div>
                </button>
                <button onClick={() => fileRef.current?.click()} className="flex items-center justify-center gap-3 py-4 rounded-xl bg-[#0B0C10] border border-white/5 hover:bg-[#1C1E22] transition-all group">
                    <div className="p-2 rounded-full bg-white/5 group-hover:bg-[#C8B085]/10 text-slate-400 group-hover:text-[#C8B085] transition-colors">
                        <Upload size={16} />
                    </div>
                    <div className="text-left">
                        <div className="text-[10px] font-bold text-white uppercase">{t.importCSV}</div>
                        <div className="text-[9px] text-slate-500">Restore Data</div>
                    </div>
                </button>
                <input type="file" accept=".csv" ref={fileRef} className="hidden" onChange={(e: any) => actions.handleImportCSV(e, t)} />
            </div>
        </SettingCard>
    );
};

const DangerZoneSection = ({ actions, t }: any) => {
    return (
        <div className="mb-8 rounded-2xl border border-red-500/20 bg-red-500/5 overflow-hidden">
            <div className="px-5 py-3 border-b border-red-500/10 flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-400" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-red-400">{t.dangerZone || 'Danger Zone'}</h3>
            </div>
            <div className="p-5 flex items-center justify-between gap-4">
                <div>
                    <h4 className="text-sm font-bold text-slate-300 mb-1">{t.resetAll || 'Reset All Data'}</h4>
                    <p className="text-[10px] text-slate-500">{t.resetDesc || 'Permanently delete all trades and settings'}</p>
                </div>
                <button 
                    onClick={() => actions.resetAllData(t)} 
                    className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase hover:bg-red-500/20 hover:text-red-300 transition-all"
                >
                    {t.reset || 'Reset'}
                </button>
            </div>
        </div>
    );
};

export const SettingsView = ({ lang, setLang, trades, actions, ddThreshold, setDdThreshold, maxLossStreak, setMaxLossStreak, strategies, emotions, portfolios, activePortfolioIds, setActivePortfolioIds, onBack, currentUser, onLogin, onLogout, lossColor, setLossColor }: SettingsViewProps) => {
    const t = I18N[lang] || I18N['zh'];

    return (
        <div className="pb-24 px-4 max-w-md mx-auto pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-xl font-bold text-white mb-6 pl-1 tracking-tight">{t.settings}</h1>
            
            <CloudSyncSection currentUser={currentUser} onLogin={onLogin} onLogout={onLogout} t={t} />
            
            <RiskManagementSection 
                ddThreshold={ddThreshold} 
                setDdThreshold={setDdThreshold} 
                maxLossStreak={maxLossStreak} 
                setMaxLossStreak={setMaxLossStreak} 
                t={t} 
                lang={lang} 
            />

            <PortfolioSection 
                portfolios={portfolios} 
                actions={actions} 
                t={t} 
                lang={lang} 
            />

            <PreferencesSection 
                lang={lang} 
                setLang={setLang} 
                strategies={strategies} 
                emotions={emotions} 
                actions={actions} 
                t={t} 
            />
            
            <DataSection trades={trades} actions={actions} t={t} />

            <DangerZoneSection actions={actions} t={t} />
            
            <div className="text-center pb-8 opacity-40 hover:opacity-100 transition-opacity">
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">TradeTrack Pro</p>
                <p className="text-[9px] text-slate-600 font-mono">v2.7.0 • Build 2024</p>
            </div>
        </div>
    );
};
