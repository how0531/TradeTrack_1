import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calculator, CalendarDays, Edit2, Trash2, ArrowUpCircle, ArrowDownCircle, BrainCircuit, ImageIcon, Scroll, PenTool, Globe, FileText, Download, Upload, ShieldAlert, Plus, X, AlertCircle, Briefcase, User, LogOut } from 'lucide-react';
import { THEME, I18N, DEFAULT_PALETTE } from '../constants';
import { formatCurrency, getPnlColor, formatDate, formatDecimal } from '../utils';
import { Trade, Lang, MonthlyStats, Portfolio } from '../types';

// --- CALENDAR VIEW ---
export const CalendarView = ({ dailyPnlMap, currentMonth, setCurrentMonth, onDateClick, monthlyStats, hideAmounts, lang, streaks }: any) => {
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
        if (pnl === 0) return { bg: '#1C1E22', border: '1px solid transparent', text: '#555' };
        const intensity = Math.abs(pnl) / maxAbsPnl;
        const opacity = 0.15 + (intensity * 0.75);
        if (pnl > 0) return { bg: `rgba(208, 90, 90, ${opacity})`, border: `1px solid rgba(208, 90, 90, ${Math.max(opacity, 0.3)})`, text: opacity > 0.6 ? '#FFF' : THEME.RED };
        else return { bg: `rgba(91, 154, 139, ${opacity})`, border: `1px solid rgba(91, 154, 139, ${Math.max(opacity, 0.3)})`, text: opacity > 0.6 ? '#FFF' : THEME.GREEN };
    };

    return (
        <div className="space-y-4">
             <div className="p-4 rounded-xl bg-[#141619] border border-white/5 shadow-2xl">
                <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                    <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-1 text-slate-500 hover:text-white transition-colors"><ChevronLeft size={18} /></button>
                    <div className="text-sm font-bold font-barlow-numeric tracking-wider text-slate-300">{year} . {String(month + 1).padStart(2, '0')}</div>
                    <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-1 text-slate-500 hover:text-white transition-colors"><ChevronRight size={18} /></button>
                </div>
                <div className="grid grid-cols-7 text-center mb-2">{daysOfWeek.map((d,i) => <div key={i} className="text-[10px] font-bold text-slate-600">{d}</div>)}</div>
                <div className="grid grid-cols-7 gap-1.5">
                    {calendarDays.map((item) => {
                        const style = getHeatmapStyle(item.pnl, item.day);
                        return (
                            <div key={item.key} onClick={() => { if (item.day && onDateClick) onDateClick(item.key); }} className={`aspect-square flex flex-col justify-center items-center text-center rounded-lg transition-all duration-200 ${item.day ? 'hover:brightness-110 cursor-pointer active:scale-95' : ''}`} style={{ backgroundColor: style.bg, border: style.border }}>
                                <div className="text-xs font-medium font-barlow-numeric" style={{ color: style.text }}>{item.day}</div>
                                {item.pnl !== 0 && item.day && (<div className={`text-[8px] font-bold mt-0.5 font-barlow-numeric ${Math.abs(item.pnl)/maxAbsPnl > 0.6 ? 'opacity-100 text-white' : 'opacity-80'}`} style={{ color: Math.abs(item.pnl)/maxAbsPnl > 0.6 ? '#FFF' : style.text }}>{hideAmounts ? '***' : (Math.abs(item.pnl) >= 1000 ? (Math.abs(item.pnl)/1000).toFixed(1) : Math.abs(item.pnl))}</div>)}
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="p-4 rounded-xl flex items-center justify-between" style={{ background: 'linear-gradient(145deg, rgba(20,22,25,1) 0%, rgba(30,32,35,0.5) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center gap-1"><Calculator size={10} /> {t.monthlyPnl}</span>
                    <span className="text-2xl font-bold font-barlow-numeric" style={{ color: getPnlColor(monthlyStats.pnl) }}>{formatCurrency(monthlyStats.pnl, hideAmounts)}</span>
                </div>
                <div className="flex gap-4">
                    <div className="text-right"><div className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">{t.winRate}</div><div className="text-sm font-bold text-white font-barlow-numeric">{formatDecimal(monthlyStats.winRate)}%</div></div>
                    <div className="h-8 w-[1px] bg-white/10"></div>
                    <div className="text-right"><div className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">{t.trades}</div><div className="text-sm font-bold text-white font-barlow-numeric">{monthlyStats.count}</div></div>
                </div>
            </div>
        </div>
    );
};

// --- LOG VIEW (TRADE LIST) ---
export const TradeItem = ({ trade, onEdit, onDelete, lang, hideAmounts }: any) => {
    const [startX, setStartX] = React.useState(0);
    const [currentX, setCurrentX] = React.useState(0);
    const t = I18N[lang] || I18N['zh'];

    const onTouchStart = (e: React.TouchEvent) => setStartX(e.targetTouches[0].clientX);
    const onTouchMove = (e: React.TouchEvent) => {
        const diff = e.targetTouches[0].clientX - startX;
        if (diff > 100) setCurrentX(100); else if (diff < -100) setCurrentX(-100); else setCurrentX(diff);
    };
    const onTouchEnd = () => {
        if (currentX > 80) onEdit(trade); else if (currentX < -80) onDelete(trade.id);
        setCurrentX(0); 
    };

    return (
        <div className="relative overflow-hidden rounded-lg mb-2 select-none">
            <div className="absolute inset-y-0 left-0 w-full flex items-center justify-between px-4">
                <div className={`flex items-center gap-2 font-bold text-sm transition-opacity`} style={{color: THEME.BLUE, opacity: currentX > 0 ? 1 : 0}}><Edit2 size={18} /> {t.editTrade}</div>
                <div className={`flex items-center gap-2 font-bold text-sm transition-opacity`} style={{color: THEME.RED, opacity: currentX < 0 ? 1 : 0}}>{t.delete} <Trash2 size={18} /></div>
            </div>
            <div className="relative bg-[#141619] p-3 border border-transparent transition-transform duration-200 ease-out flex justify-between items-center z-10" style={{ transform: `translateX(${currentX}px)` }} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onClick={() => onEdit(trade)}>
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${trade.pnl >= 0 ? 'bg-[#D05A5A] bg-opacity-10 text-[#D05A5A]' : 'bg-[#5B9A8B] bg-opacity-10 text-[#5B9A8B]'}`}>{trade.pnl >= 0 ? <ArrowUpCircle size={16}/> : <ArrowDownCircle size={16}/>}</div>
                    <div><div className="font-medium text-base font-barlow-numeric tracking-tight" style={{ color: getPnlColor(trade.pnl) }}>{formatCurrency(trade.pnl, hideAmounts)}</div><div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2"><span>{formatDate(trade.date, lang)}</span>{trade.strategy && <span className="px-1 py-px rounded bg-[#25282C] border border-[#333]">{String(trade.strategy)}</span>}</div></div>
                </div>
                <div className="flex flex-col items-end gap-1">{trade.emotion && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#25282C] border border-[#333] text-[9px] opacity-70"><BrainCircuit size={10}/> {String(trade.emotion)}</span>}{trade.image && <ImageIcon size={12} className="text-slate-500" />}</div>
            </div>
        </div>
    );
};

export const LogsView = ({ trades, lang, hideAmounts, onEdit, onDelete }: any) => {
    const t = I18N[lang] || I18N['zh'];
    const groups = useMemo(() => {
        if (!Array.isArray(trades)) return [];
        const res: any[] = [];
        let currentLabel = null;
        [...trades].reverse().forEach((trade, idx) => {
            if (!trade.date) return;
            const d = new Date(trade.date);
            const label = d.toLocaleDateString(lang === 'zh' ? 'zh-TW' : 'en-US', { year: 'numeric', month: 'long' });
            if (label !== currentLabel) {
                res.push({ type: 'header', label, pnl: 0 }); // pnl aggregated later if needed, simple header for now
                currentLabel = label;
            }
            res.push({ type: 'trade', data: trade });
        });
        return res;
    }, [trades, lang]);

    if (groups.length === 0) return (
        <div className="flex flex-col items-center justify-center py-16 opacity-60">
            <div className="mb-4 relative"><div className="absolute inset-0 bg-[#526D82] blur-xl opacity-20 rounded-full"></div><div className="relative z-10 flex gap-2"><Scroll size={48} className="text-slate-500" strokeWidth={1} /><PenTool size={32} className="text-slate-400 absolute -bottom-1 -right-2" strokeWidth={1.5} /></div></div>
            <h3 className="text-sm font-bold text-slate-300 mb-1">{t.emptyStateTitle}</h3><p className="text-[10px] text-slate-500 max-w-[200px] text-center leading-relaxed">{t.emptyStateDesc}</p>
        </div>
    );

    return (
        <div className="pb-20">
            {groups.map((item, idx) => {
                if (item.type === 'header') return <div key={`h-${idx}`} className="flex items-center justify-between px-2 pt-4 pb-2 text-[#526D82]"><div className="text-xs font-bold flex items-center gap-1.5"><CalendarDays size={12} />{item.label}</div></div>;
                return <TradeItem key={item.data.id} trade={item.data} onEdit={onEdit} onDelete={onDelete} lang={lang} hideAmounts={hideAmounts} />;
            })}
        </div>
    );
};

// --- SETTINGS VIEW ---
export const SettingsView = ({ lang, setLang, trades, actions, ddThreshold, setDdThreshold, strategies, emotions, portfolios, activePortfolioIds, setActivePortfolioIds, onBack, currentUser, onLogin, onLogout }: any) => {
    const t = I18N[lang] || I18N['zh'];
    const [newStrat, setNewStrat] = React.useState('');
    const [newEmo, setNewEmo] = React.useState('');
    const fileRef = React.useRef<HTMLInputElement>(null);

    return (
        <div className="space-y-4 pb-24">
             <button onClick={onBack} className="mb-2 flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs"><ChevronLeft size={16}/> Back</button>
             <div className="p-5 rounded-xl space-y-5 bg-[#141619] border border-white/5 shadow-xl">
                 
                 {/* ACCOUNT MANAGEMENT */}
                 <div>
                    <h3 className="text-[10px] font-bold uppercase text-slate-500 mb-3 flex items-center gap-1"><User size={12} /> Account</h3>
                    <div className="bg-[#1C1E22] p-4 rounded-xl border border-white/5">
                        {currentUser && !currentUser.isAnonymous ? (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    {currentUser.photoURL ? (
                                        <img src={currentUser.photoURL} alt="Profile" className="w-10 h-10 rounded-full border border-white/10" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">{currentUser.email ? currentUser.email[0].toUpperCase() : 'U'}</div>
                                    )}
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-sm font-bold text-white truncate">{currentUser.displayName || 'User'}</span>
                                        <span className="text-xs text-slate-500 truncate">{currentUser.email}</span>
                                    </div>
                                </div>
                                <button onClick={onLogout} className="w-full py-2 rounded-lg bg-[#25282C] text-slate-300 border border-[#333] hover:border-red-500/50 hover:text-red-400 hover:bg-red-900/10 transition-all text-xs font-bold flex items-center justify-center gap-2">
                                    <LogOut size={14} /> Sign Out
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3 items-center text-center">
                                <div className="text-xs text-slate-400">Sign in with Google to sync your data across devices.</div>
                                <button onClick={onLogin} className="w-full py-2.5 rounded-lg bg-white text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-100 transition-all">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                                    Sign in with Google
                                </button>
                            </div>
                        )}
                    </div>
                 </div>
                 
                 <div className="w-full h-[1px] bg-white/5"></div>

                 <div>
                    <h3 className="text-[10px] font-bold uppercase text-slate-500 mb-3 flex items-center gap-1"><Globe size={12} /> {t.language}</h3>
                    <div className="flex gap-2">
                        <button onClick={() => setLang('zh')} className={`flex-1 py-2 rounded text-xs font-bold border ${lang === 'zh' ? `bg-[${THEME.BLUE}] text-white border-[${THEME.BLUE}]` : 'bg-[#1C1E22] text-slate-500 border-[#333]'}`}>中文</button>
                        <button onClick={() => setLang('en')} className={`flex-1 py-2 rounded text-xs font-bold border ${lang === 'en' ? `bg-[${THEME.BLUE}] text-white border-[${THEME.BLUE}]` : 'bg-[#1C1E22] text-slate-500 border-[#333]'}`}>English</button>
                    </div>
                 </div>
                 <div className="w-full h-[1px] bg-white/5"></div>
                 <div>
                    <h3 className="text-[10px] font-bold uppercase text-slate-500 mb-3 flex items-center gap-1"><FileText size={12} /> {t.dataManagement}</h3>
                    <div className="flex gap-3">
                        <button onClick={() => actions.downloadCSV(trades)} className="flex-1 py-3 rounded-xl bg-[#25282C] border border-[#333] text-slate-300 text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#2C2F36]"><Download size={14} /> {t.exportCSV}</button>
                        <button onClick={() => fileRef.current?.click()} className="flex-1 py-3 rounded-xl bg-[#25282C] border border-[#333] text-slate-300 text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#2C2F36]"><Upload size={14} /> {t.importCSV}</button>
                        <input type="file" accept=".csv" ref={fileRef} style={{ display: 'none' }} onChange={actions.handleImportCSV} />
                    </div>
                 </div>
                 <div className="w-full h-[1px] bg-white/5"></div>
                 <div>
                    <h3 className="text-[10px] font-bold uppercase text-slate-500 mb-4 flex items-center gap-1"><ShieldAlert size={12}/> {t.riskSettings}</h3>
                    <div className="bg-[#1C1E22] p-4 rounded-xl border border-white/5">
                        <div className="flex justify-between items-center mb-4"><label className="text-xs text-slate-300 font-bold">{t.ddThreshold}</label><div className="flex items-center gap-1 bg-[#0B0C10] px-2 py-1 rounded border border-white/10"><input type="number" value={ddThreshold} onChange={e => setDdThreshold(Number(e.target.value))} className="w-12 bg-transparent text-right font-barlow-numeric font-bold text-white outline-none" /><span className="text-xs text-slate-500">%</span></div></div>
                        <div className="relative h-6 flex items-center">
                            <input type="range" min="5" max="50" step="1" value={ddThreshold} onChange={e => setDdThreshold(Number(e.target.value))} className="w-full z-10 opacity-0 cursor-pointer absolute inset-0" />
                            <div className="w-full h-1.5 bg-[#2C2F36] rounded-full overflow-hidden relative"><div className="h-full absolute left-0 top-0 transition-all duration-100" style={{ width: `${((ddThreshold - 5) / 45) * 100}%`, backgroundColor: THEME.GREEN }} /></div>
                            <div className="absolute h-4 w-4 bg-white rounded-full shadow-lg pointer-events-none transition-all duration-100 flex items-center justify-center border-2 border-[#1C1E22]" style={{ left: `calc(${((ddThreshold - 5) / 45) * 100}% - 8px)` }}><div className="w-1.5 h-1.5 rounded-full bg-[#5B9A8B]"></div></div>
                        </div>
                        <div className="mt-3 flex items-start gap-2 text-[10px] text-slate-500 bg-[#0B0C10] p-2 rounded border border-white/5"><AlertCircle size={12} className="shrink-0 mt-0.5" color={THEME.GREEN_DARK}/><p>{t.ddWarning}</p></div>
                    </div>
                 </div>
                 <div className="w-full h-[1px] bg-white/5"></div>
                 {/* STRATEGIES */}
                 <div>
                    <h3 className="text-[10px] font-bold uppercase text-slate-500 mb-3">{t.strategyList}</h3>
                    <div className="flex flex-wrap gap-2 mb-3">{strategies.map((s: string) => (<div key={s} className="flex items-center gap-2 px-2 py-1.5 bg-[#25282C] rounded text-xs text-slate-400 border border-[#333]">{s} <button onClick={() => actions.deleteStrategy(s)} className="hover:text-red-400"><X size={12}/></button></div>))}</div>
                    <form onSubmit={(e) => { e.preventDefault(); actions.addStrategy(newStrat); setNewStrat(''); }} className="flex gap-2"><input value={newStrat} onChange={e => setNewStrat(e.target.value)} placeholder={t.addStrategy} className="flex-1 p-2 rounded-lg text-xs bg-[#1C1E22] border border-[#333] text-white outline-none" /><button type="submit" className="p-2 rounded-lg bg-[#25282C] text-slate-300 border border-[#333]"><Plus size={16}/></button></form>
                 </div>
                 <div className="w-full h-[1px] bg-white/5"></div>
                 {/* PORTFOLIOS */}
                 <div>
                    <h3 className="text-[10px] font-bold uppercase text-slate-500 mb-3 flex items-center gap-1"><Briefcase size={12} /> {t.managePortfolios}</h3>
                    <div className="space-y-3">
                        {portfolios.map((p: Portfolio, idx: number) => (
                            <div key={p.id} className="bg-[#25282C] p-3 rounded-lg border border-[#333] flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                         <div className="relative group"><div className="w-6 h-6 rounded-full border border-white/10 cursor-pointer shadow-sm" style={{ backgroundColor: p.color || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length] }} /><input type="color" value={p.color || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length]} onChange={(e) => actions.updatePortfolio(p.id, 'color', e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"/></div>
                                         <input type="text" value={p.name} onChange={(e) => actions.updatePortfolio(p.id, 'name', e.target.value)} className="bg-transparent text-white font-bold text-xs outline-none border-b border-transparent focus:border-white/20 pb-0.5 w-32" />
                                    </div>
                                    {portfolios.length > 1 && (<button onClick={() => { const newP = portfolios.filter((item: Portfolio) => item.id !== p.id); actions.updateSettings('portfolios', newP); if (activePortfolioIds.includes(p.id)) { const newActive = activePortfolioIds.filter((id: string) => id !== p.id); setActivePortfolioIds(newActive.length > 0 ? newActive : [newP[0].id]); } }} className="text-slate-500 hover:text-red-400 p-1"><Trash2 size={14} /></button>)}
                                </div>
                                <div className="flex items-center gap-2 bg-[#1C1E22] px-2 py-1.5 rounded border border-white/5"><span className="text-[10px] text-slate-500 font-bold uppercase">{t.initialCapital}</span><input type="number" value={p.initialCapital} onChange={(e) => actions.updatePortfolio(p.id, 'initialCapital', e.target.value)} className="bg-transparent text-slate-300 font-barlow-numeric text-xs font-bold outline-none flex-1 text-right" /></div>
                            </div>
                        ))}
                    </div>
                    <form onSubmit={(e: any) => { e.preventDefault(); const name = e.target.pName.value; const cap = parseFloat(e.target.pCap.value); if (name && !isNaN(cap)) { const newP = { id: Date.now().toString(), name, initialCapital: cap, color: DEFAULT_PALETTE[portfolios.length % DEFAULT_PALETTE.length] }; actions.updateSettings('portfolios', [...portfolios, newP]); e.target.reset(); } }} className="mt-3 flex gap-2">
                        <div className="flex-1 space-y-2"><input name="pName" placeholder={t.portfolioName} className="w-full p-2 rounded-lg text-xs bg-[#1C1E22] border border-[#333] text-white" required /><input name="pCap" type="number" placeholder={t.initialCapital} className="w-full p-2 rounded-lg text-xs bg-[#1C1E22] border border-[#333] text-white" required /></div>
                        <button type="submit" className="w-10 rounded-lg bg-[#25282C] text-slate-300 border border-[#333] flex items-center justify-center"><Plus size={16}/></button>
                    </form>
                 </div>
             </div>
        </div>
    );
};