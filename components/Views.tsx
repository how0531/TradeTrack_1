
import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Edit2, Trash2, Scroll, PenTool, FileText, Download, Upload, ShieldAlert, Plus, X, UserCircle, LogOut, Layout, Check, HardDrive, Briefcase, Palette, Cloud, CloudOff, CloudSync, Languages, Target, BrainCircuit } from 'lucide-react';
import { THEME, I18N, DEFAULT_PALETTE } from '../constants';
import { formatCurrency, getPnlColor, formatDate, formatDecimal } from '../utils';
import { Trade, Portfolio, CalendarViewProps, LogsViewProps, SettingsViewProps } from '../types';
import { VirtualList } from './UI';

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

const StandardTradeItem = ({ trade, onEdit, onDelete, lang, hideAmounts, portfolios }: any) => {
    const isProfit = trade.pnl >= 0;
    const portfolio = portfolios.find((p: any) => p.id === trade.portfolioId);
    const indicatorColor = isProfit 
        ? (portfolio?.profitColor || THEME.RED) 
        : (portfolio?.lossColor || THEME.DEFAULT_LOSS);
        
    return (
        <div className="mb-2 px-1">
            <div className="p-3 rounded-lg bg-[#141619] border border-white/5 flex justify-between items-center hover:bg-[#1C1E22] transition-colors group">
                <div className="flex flex-col min-w-0 pr-2">
                    {trade.strategy && <span className="text-xs font-bold text-slate-300 truncate mb-0.5">{trade.strategy}</span>}
                    <div className="flex items-center gap-2">
                        {trade.emotion && <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter bg-white/5 px-1 rounded">{trade.emotion}</span>}
                        {(trade.note) && <FileText size={10} className="text-slate-700" />}
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                        <div className="text-sm font-barlow-numeric font-bold" style={{ color: indicatorColor }}>{formatCurrency(trade.pnl, hideAmounts)}</div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={(e) => { e.stopPropagation(); onEdit(trade); }} className="p-1.5 rounded hover:bg-white/10 text-slate-500"><Edit2 size={12} /></button>
                         <button onClick={(e) => { e.stopPropagation(); onDelete(trade.id); }} className="p-1.5 rounded hover:bg-red-500/20 text-slate-700 hover:text-red-400"><Trash2 size={12} /></button>
                    </div>
                    <div className="w-1 h-8 rounded-full ml-1" style={{ backgroundColor: indicatorColor }}></div>
                </div>
            </div>
        </div>
    );
};

export const LogsView = ({ trades, lang, hideAmounts, onEdit, onDelete, portfolios }: LogsViewProps) => {
    const t = I18N[lang] || I18N['zh'];
    const items = useMemo(() => {
        if (!Array.isArray(trades)) return [];
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
    }, [trades]);
    if (items.length === 0) return (
        <div className="flex flex-col items-center justify-center py-20 opacity-30">
            <Scroll size={48} className="text-slate-500 mb-4" />
            <h3 className="text-xs font-bold uppercase tracking-widest">{t.emptyStateTitle}</h3>
        </div>
    );
    return (
        <div className="pb-20">
            <VirtualList 
                items={items} 
                getItemHeight={(item) => item.type === 'header' ? 44 : 58}
                renderItem={(item) => {
                    if (item.type === 'header') {
                        const dateObj = new Date(item.dateStr);
                        const dayStr = dateObj.toLocaleDateString(lang === 'zh' ? 'zh-TW' : 'en-US', { month: 'numeric', day: 'numeric', weekday: 'short' });
                        return (
                            <div className="sticky top-0 z-20 px-2 py-2 flex items-center justify-between bg-[#0B0C10] border-b border-white/5 mb-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">{dayStr}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold font-barlow-numeric" style={{ color: item.pnl >= 0 ? THEME.RED : THEME.LOSS_WHITE }}>
                                        {item.pnl > 0 ? '+' : ''}{formatCurrency(item.pnl, hideAmounts)}
                                    </span>
                                </div>
                            </div>
                        );
                    }
                    return <StandardTradeItem key={item.data.id} trade={item.data} onEdit={onEdit} onDelete={onDelete} lang={lang} hideAmounts={hideAmounts} portfolios={portfolios} />;
                }}
            />
        </div>
    );
};

const SettingSection = ({ icon: Icon, title, children }: { icon: any, title: string, children: React.ReactNode }) => (
    <div className="space-y-2 mb-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-2 px-1">
            <Icon size={12} className="text-slate-500" />
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</h3>
        </div>
        <div className="p-4 rounded-2xl bg-[#141619] border border-white/5 space-y-4 shadow-sm">
            {children}
        </div>
    </div>
);

export const SettingsView = ({ lang, setLang, trades, actions, ddThreshold, setDdThreshold, lossColor, setLossColor, strategies, emotions, portfolios, activePortfolioIds, setActivePortfolioIds, onBack, currentUser, onLogin, onLogout }: SettingsViewProps) => {
    const t = I18N[lang] || I18N['zh'];
    const [newStrat, setNewStrat] = React.useState('');
    const [newEmo, setNewEmo] = React.useState('');
    const fileRef = React.useRef<HTMLInputElement>(null);

    const handleQuickAddPortfolio = () => {
        const newP: Portfolio = {
            id: `p-${Date.now()}`,
            name: lang === 'zh' ? '新帳戶' : 'New Account',
            initialCapital: 100000,
            profitColor: DEFAULT_PALETTE[Math.floor(Math.random() * DEFAULT_PALETTE.length)],
            lossColor: THEME.DEFAULT_LOSS
        };
        actions.updateSettings('portfolios', [...portfolios, newP]);
    };

    const isUserLoggedIn = currentUser && !currentUser.isAnonymous;

    return (
        <div className="pb-24 px-1 max-w-md mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-[#0B0C10] z-30 py-4 border-b border-white/5">
                <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/5 transition-all"><ChevronLeft size={20}/></button>
                <h1 className="text-sm font-bold tracking-widest uppercase">{t.settings}</h1>
                <div className="w-10"></div>
            </div>

            {/* Section 1: User & Cloud */}
            <SettingSection icon={Cloud} title={t.syncTitle}>
                <div className="space-y-4">
                    {isUserLoggedIn ? (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-3">
                                {currentUser.photoURL ? (
                                    <img src={currentUser.photoURL} className="w-10 h-10 rounded-full border border-white/10" alt="Avatar" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center"><UserCircle size={24} className="text-slate-500" /></div>
                                )}
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-white">{currentUser.displayName || 'Cloud User'}</span>
                                    <span className="text-[9px] text-slate-500">{currentUser.email}</span>
                                </div>
                            </div>
                            <button onClick={onLogout} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                                <LogOut size={18}/>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-[10px] text-slate-500 leading-relaxed">{t.syncDesc}</p>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => onLogin('google')} 
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black font-bold text-[10px] transition-all active:scale-[0.98] shadow-lg"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                    Google
                                </button>
                                <button 
                                    onClick={() => onLogin('apple')} 
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-black text-white font-bold text-[10px] transition-all active:scale-[0.98] shadow-lg border border-white/10"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 170 170">
                                        <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-8.58 12.23-17.67 24.37-31.5 24.63-13.6.24-17.91-8.11-33.54-8.11-15.6 0-20.35 7.84-33.54 8.35-13.37.52-23.75-13.25-32.38-25.66-17.67-25.4-31.25-72.03-12.71-104.13 9.25-16.03 25.68-26.17 43.68-26.43 13.37-.25 26.04 8.94 34.19 8.94 8.16 0 23.41-11.02 39.42-9.39 6.7.28 25.54 2.68 37.66 20.43-1.02.63-22.51 13.13-22.24 39.26.27 31.39 25.66 41.67 25.86 41.76l-.19.46zM119.5 35.85c-7.07 8.58-19.01 14.39-30.65 13.62-1.53-11.41 3.56-23.33 10.15-31.06 6.94-8.08 19.16-14.12 30.15-14.91 1.41 11.45-2.51 23.82-9.65 32.35z"/>
                                    </svg>
                                    Apple
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </SettingSection>

            {/* Section 2: Trading Core (Accounts & Risk) */}
            <SettingSection icon={Briefcase} title={t.managePortfolios || '交易核心'}>
                <div className="space-y-4">
                    <div className="space-y-3">
                        {portfolios.map(p => (
                            <div key={p.id} className="p-3 bg-[#0B0C10] rounded-xl border border-white/5 flex flex-col gap-3">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="flex gap-2 shrink-0">
                                            {/* 獲利色選取器 */}
                                            <div className="relative w-4 h-4 rounded-full overflow-hidden border border-white/20" style={{ backgroundColor: p.profitColor }}>
                                                <input type="color" value={p.profitColor} onChange={(e) => actions.updatePortfolio(p.id, 'profitColor', e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer scale-150" />
                                            </div>
                                            {/* 虧損色選取器 */}
                                            <div className="relative w-4 h-4 rounded-full overflow-hidden border border-white/20" style={{ backgroundColor: p.lossColor }}>
                                                <input type="color" value={p.lossColor} onChange={(e) => actions.updatePortfolio(p.id, 'lossColor', e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer scale-150" />
                                            </div>
                                        </div>
                                        <input 
                                            type="text" 
                                            value={p.name} 
                                            onChange={(e) => actions.updatePortfolio(p.id, 'name', e.target.value)}
                                            className="bg-transparent text-xs font-bold text-white outline-none border-b border-transparent focus:border-gold/50 flex-1 py-1"
                                            placeholder={t.portfolioName}
                                        />
                                    </div>
                                    {portfolios.length > 1 && (
                                        <button onClick={() => actions.updateSettings('portfolios', portfolios.filter(x => x.id !== p.id))} className="p-1.5 text-slate-700 hover:text-red-400 transition-colors">
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3 items-end">
                                    <div>
                                        <span className="text-[8px] text-slate-600 uppercase font-bold block mb-1">初始資金</span>
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">$</span>
                                            <input 
                                                type="number" 
                                                value={p.initialCapital} 
                                                onChange={(e) => actions.updatePortfolio(p.id, 'initialCapital', e.target.value)} 
                                                className="w-full bg-white/5 text-[11px] font-barlow-numeric text-white pl-5 pr-2 py-2 rounded-lg outline-none border border-transparent focus:border-white/10"
                                            />
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex gap-2 justify-end mb-1">
                                             <span className="text-[7px] text-slate-700 px-1 border border-white/5 rounded">獲利色</span>
                                             <span className="text-[7px] text-slate-700 px-1 border border-white/5 rounded">虧損色</span>
                                        </div>
                                        <span className="text-[9px] text-slate-800 font-mono">{p.id.slice(-6)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="pt-2 border-t border-white/5">
                        <button onClick={handleQuickAddPortfolio} className="w-full py-2.5 rounded-xl border border-dashed border-white/10 text-[10px] text-slate-500 flex items-center justify-center gap-2 hover:bg-white/5 transition-all">
                            <Plus size={14}/> {t.addPortfolio || '新增交易帳戶'}
                        </button>
                    </div>

                    <div className="pt-4 mt-2 border-t border-white/5 space-y-3">
                         <div className="flex justify-between items-center px-1">
                            <div className="flex items-center gap-2">
                                <ShieldAlert size={12} className="text-slate-500"/>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">{t.riskSettings}</span>
                            </div>
                            <span className="text-xs font-bold text-green font-barlow-numeric">{ddThreshold}%</span>
                        </div>
                        <input type="range" min="5" max="50" step="1" value={ddThreshold} onChange={e => setDdThreshold(Number(e.target.value))} className="w-full h-1.5 bg-[#0B0C10] rounded-full appearance-none cursor-pointer accent-green" />
                    </div>
                </div>
            </SettingSection>

            {/* Section 3: App Personalization (Appearance & Labels) */}
            <SettingSection icon={Palette} title={t.appearance || '偏好設定'}>
                <div className="space-y-5">
                    {/* Language (Loss Color globally removed since it's now per-portfolio) */}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Languages size={12}/>
                                <span className="text-[10px] font-bold uppercase">{t.language}</span>
                            </div>
                            <div className="flex bg-[#0B0C10] p-0.5 rounded-xl border border-white/5">
                                <button onClick={() => setLang('zh')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${lang === 'zh' ? 'bg-[#C8B085] text-black shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>ZH</button>
                                <button onClick={() => setLang('en')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${lang === 'en' ? 'bg-[#C8B085] text-black shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>EN</button>
                            </div>
                        </div>
                    </div>

                    {/* Strategies List */}
                    <div className="pt-4 border-t border-white/5 space-y-3">
                        <div className="flex items-center gap-2 text-slate-500">
                            <PenTool size={12}/>
                            <span className="text-[10px] font-bold uppercase">{t.strategyList}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {strategies.map(s => (
                                <div key={s} className="flex items-center gap-2 px-3 py-1.5 bg-[#0B0C10] rounded-lg border border-white/5 text-[10px] text-slate-300 transition-all hover:bg-white/5">
                                    {s}
                                    <button onClick={() => actions.deleteStrategy(s)} className="text-slate-700 hover:text-red-400 transition-colors"><X size={12}/></button>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); actions.addStrategy(newStrat); setNewStrat(''); }} className="flex gap-2">
                            <input value={newStrat} onChange={e => setNewStrat(e.target.value)} placeholder={t.addStrategy} className="flex-1 px-4 py-2.5 rounded-xl text-xs bg-[#0B0C10] border border-white/5 text-white outline-none focus:border-white/10 transition-colors" />
                            <button type="submit" className="p-3 rounded-xl bg-[#25282C] text-slate-500 hover:text-white transition-colors"><Plus size={16}/></button>
                        </form>
                    </div>

                    {/* Emotions List (Mindset Tags) */}
                    <div className="pt-4 border-t border-white/5 space-y-3">
                        <div className="flex items-center gap-2 text-slate-500">
                            <BrainCircuit size={12}/>
                            <span className="text-[10px] font-bold uppercase">{t.mindsetList || '心態標籤'}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {emotions.map(e => (
                                <div key={e} className="flex items-center gap-2 px-3 py-1.5 bg-[#0B0C10] rounded-lg border border-white/5 text-[10px] text-slate-300 transition-all hover:bg-white/5">
                                    {e}
                                    <button onClick={() => actions.deleteEmotion(e)} className="text-slate-700 hover:text-red-400 transition-colors"><X size={12}/></button>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); actions.addEmotion(newEmo); setNewEmo(''); }} className="flex gap-2">
                            <input value={newEmo} onChange={e => setNewEmo(e.target.value)} placeholder={t.addMindset || '新增心態...'} className="flex-1 px-4 py-2.5 rounded-xl text-xs bg-[#0B0C10] border border-white/5 text-white outline-none focus:border-white/10 transition-colors" />
                            <button type="submit" className="p-3 rounded-xl bg-[#25282C] text-slate-500 hover:text-white transition-colors"><Plus size={16}/></button>
                        </form>
                    </div>
                </div>
            </SettingSection>

            {/* Section 4: Tools */}
            <SettingSection icon={HardDrive} title={t.dataManagement}>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => actions.downloadCSV(trades)} className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl bg-[#25282C]/50 border border-white/5 hover:bg-[#25282C] transition-all group">
                        <Download size={20} className="text-slate-500 group-hover:text-gold transition-colors"/> 
                        <span className="text-[9px] font-bold text-slate-500 group-hover:text-white uppercase tracking-widest">{t.exportCSV}</span>
                    </button>
                    <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl bg-[#25282C]/50 border border-white/5 hover:bg-[#25282C] transition-all group">
                        <Upload size={20} className="text-slate-500 group-hover:text-gold transition-colors"/> 
                        <span className="text-[9px] font-bold text-slate-500 group-hover:text-white uppercase tracking-widest">{t.importCSV}</span>
                    </button>
                    <input type="file" accept=".csv" ref={fileRef} className="hidden" onChange={(e: any) => actions.handleImportCSV(e, t)} />
                </div>
            </SettingSection>

            <div className="text-center pt-4 pb-8">
                <p className="text-[9px] text-slate-800 font-mono tracking-widest uppercase">TradeTrack Pro v2.5.2</p>
            </div>
        </div>
    );
};
