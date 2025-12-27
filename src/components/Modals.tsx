
import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Activity, ChevronLeft, ChevronRight, CloudLightning, Trash2, ArrowUpCircle, Check, TrendingUp, TrendingDown, Target, Zap } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, ReferenceLine, PieChart, Pie, Cell } from 'recharts';
import { THEME, I18N } from '../constants';
import { StrategyChipsInput, EmotionChipsInput, PortfolioChipsInput } from './UI';
import { getPnlColor, formatCurrency, formatDecimal } from '../utils';
import { TradeModalProps, StrategyDetailModalProps, Trade, Lang } from '../types';

export const TradeModal = ({ isOpen, onClose, form, setForm, onSubmit, isEditing, strategies, emotions, portfolios, lang }: TradeModalProps) => {
    if (!isOpen) return null;
    const t = I18N[lang] || I18N['zh'];
    const updateForm = (key: keyof Trade, value: any) => setForm({ ...form, [key]: value });
    
    // Default to first portfolio if not set
    if (!form.portfolioId && portfolios.length > 0) {
        updateForm('portfolioId', portfolios[0].id);
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 sm:p-4 animate-in fade-in duration-200 backdrop-blur-sm">
            <div className="w-full sm:max-w-sm bg-[#141619]/80 backdrop-blur-xl rounded-t-2xl sm:rounded-2xl border-t sm:border border-white/10 shadow-2xl shadow-black/50 overflow-hidden flex flex-col max-h-[95vh]">
                <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h2 className="font-bold text-sm text-white">{isEditing ? t.editTrade : t.addTrade}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1"><X size={20}/></button>
                </div>
                <form onSubmit={onSubmit} className="p-4 space-y-4 overflow-y-auto flex-1 no-scrollbar pb-8">
                    
                    {/* GLASS CHIPS: PORTFOLIO SELECTOR */}
                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 ml-1 block">{t.portfolio}</label>
                        <PortfolioChipsInput portfolios={portfolios} value={form.portfolioId || (portfolios[0]?.id || '')} onChange={(val) => updateForm('portfolioId', val)} />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 ml-1 block">Date</label>
                        <input type="date" required value={form.date} onChange={e => updateForm('date', e.target.value)} className="w-full h-[40px] px-3 rounded-lg bg-white/5 border border-white/10 text-xs text-white font-barlow-numeric outline-none focus:border-white/20 focus:bg-white/10 transition-colors backdrop-blur-sm" />
                    </div>

                    <div className="flex gap-2 items-center bg-white/5 p-1 rounded-xl border border-white/5">
                         <div className="flex bg-black/20 p-0.5 rounded-lg h-[40px] flex-shrink-0">
                            {/* GLASS BUTTONS: PROFIT / LOSS */}
                            <button type="button" onClick={() => updateForm('type', 'profit')} className={`px-4 rounded-md text-[10px] font-bold uppercase transition-all ${form.type === 'profit' ? 'bg-[#D05A5A]/20 text-[#D05A5A] shadow-[0_0_10px_rgba(208,90,90,0.2)]' : 'text-slate-500 hover:text-slate-300'}`}>{t.profit}</button>
                            <button type="button" onClick={() => updateForm('type', 'loss')} className={`px-4 rounded-md text-[10px] font-bold uppercase transition-all ${form.type === 'loss' ? 'bg-[#5B9A8B]/20 text-[#5B9A8B] shadow-[0_0_10px_rgba(91,154,139,0.2)]' : 'text-slate-500 hover:text-slate-300'}`}>{t.loss}</button>
                        </div>
                        <input type="number" step="0.1" inputMode="decimal" required value={form.amount} onChange={e => updateForm('amount', e.target.value)} className="w-full h-[40px] px-2 text-2xl font-barlow-numeric font-bold bg-transparent border-none text-white placeholder-slate-600 outline-none text-right" placeholder="0.0" autoFocus />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">{t.strategyList}</label>
                        <StrategyChipsInput strategies={strategies} value={form.strategy || ''} onChange={(val) => updateForm('strategy', val)} lang={lang} />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">{t.mindsetList}</label>
                        <EmotionChipsInput emotions={emotions} value={form.emotion || ''} onChange={(val) => updateForm('emotion', val)} lang={lang} />
                    </div>
                    <textarea 
                        rows={3} 
                        value={form.note || ''} 
                        onChange={e => updateForm('note', e.target.value)} 
                        className="w-full p-3 rounded-xl text-xs bg-white/5 border border-white/10 text-slate-300 placeholder-slate-600 outline-none focus:border-white/20 focus:bg-white/10 resize-y min-h-[60px] leading-relaxed backdrop-blur-sm" 
                        placeholder={t.notePlaceholder} 
                    />
                    
                    {/* GLASS BUTTON: SUBMIT */}
                    <button type="submit" className={`w-full py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg transition-all active:scale-[0.98] backdrop-blur-md border ${form.type === 'profit' ? 'bg-[#D05A5A]/20 text-[#D05A5A] border-[#D05A5A]/50 shadow-[0_0_20px_rgba(208,90,90,0.15)] hover:bg-[#D05A5A]/30' : 'bg-[#5B9A8B]/20 text-[#5B9A8B] border-[#5B9A8B]/50 shadow-[0_0_20px_rgba(91,154,139,0.15)] hover:bg-[#5B9A8B]/30'}`}>
                        {isEditing ? t.update : t.save}
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- REDESIGNED STRATEGY DETAIL MODAL (COMPACT GLASSMORPHISM) ---

const GlassStat = ({ label, value, subValue, color, icon: Icon, size = "normal" }: any) => (
    <div className={`relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.03] backdrop-blur-sm flex flex-col justify-center transition-all hover:bg-white/[0.06] ${size === 'large' ? 'p-3 aspect-[1.6/1]' : 'p-3'}`}>
        <div className="flex justify-between items-start mb-1.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
            {Icon && <Icon size={12} className="text-slate-500 opacity-60" />}
        </div>
        <div className={`font-barlow-numeric font-bold tracking-tight ${size === 'large' ? 'text-xl' : 'text-base'}`} style={{ color: color || '#FFF' }}>
            {value}
        </div>
        {subValue && (
            <div className="text-[9px] font-medium text-slate-500 mt-0.5">{subValue}</div>
        )}
    </div>
);

const EquityCurveTooltip = ({ active, payload, hideAmounts }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-2 rounded-lg border border-white/10 shadow-xl bg-[#0B0C10]/80 backdrop-blur-md text-[10px] z-50 min-w-[100px]">
                <div className="text-slate-400 mb-1 font-medium">{payload[0].payload.date || 'Date'}</div>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C8B085]"></div>
                    <span className="text-[#C8B085] font-bold font-barlow-numeric text-xs">{formatCurrency(payload[0].value, hideAmounts)}</span>
                </div>
            </div>
        );
    }
    return null;
};

export const StrategyDetailModal = ({ strategy, metrics, onClose, lang, hideAmounts, ddThreshold }: StrategyDetailModalProps) => {
    if (!strategy || !metrics) return null;
    const t = I18N[lang] || I18N['zh'];

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    const pieData = [
        { name: 'Win', value: metrics.winRate, color: THEME.RED },
        { name: 'Loss', value: 100 - metrics.winRate, color: '#333' }
    ];

    const pnlColor = getPnlColor(metrics.netProfit);

    return (
        <div 
            onClick={handleBackdropClick}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-300 backdrop-blur-sm"
        >
            {/* Main Card - Reduced Width to 320px for compactness */}
            <div className="w-full max-w-[320px] bg-black/40 rounded-[24px] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative animate-in zoom-in-95 duration-300 backdrop-blur-xl ring-1 ring-white/5">
                
                {/* Decorative Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-20 bg-[#C8B085]/10 blur-[50px] pointer-events-none"></div>

                {/* Header - More Compact */}
                <div className="px-5 pt-5 pb-2 flex justify-between items-start relative z-10">
                    <div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Target size={10} /> {t.strategyAnalysis}
                        </div>
                        <h2 className="font-bold text-xl text-white tracking-tight leading-none text-shadow-sm">{strategy}</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 -mr-1 -mt-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                        <X size={16} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="overflow-y-auto no-scrollbar p-4 space-y-3 relative z-10">
                    
                    {/* Top Stats Row: Net Profit & Profit Factor */}
                    <div className="grid grid-cols-2 gap-2">
                        <GlassStat 
                            label={t.netProfit} 
                            value={formatCurrency(metrics.netProfit, hideAmounts)} 
                            color={pnlColor}
                            size="large"
                        />
                        <GlassStat 
                            label={t.profitFactor} 
                            value={formatDecimal(metrics.pf)} 
                            size="large"
                            icon={Zap}
                        />
                    </div>

                    {/* Middle Section: Win Rate Donut & List Stats */}
                    <div className="flex gap-2 h-28">
                        {/* Win Rate Circle */}
                        <div className="w-[100px] shrink-0 rounded-xl border border-white/5 bg-white/[0.03] backdrop-blur-sm flex flex-col items-center justify-center relative p-1">
                            <div className="absolute top-2 left-2 text-[8px] font-bold text-slate-500 uppercase tracking-widest">{t.winRate}</div>
                            <div className="relative w-full h-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            innerRadius={28}
                                            outerRadius={34}
                                            startAngle={90}
                                            endAngle={-270}
                                            dataKey="value"
                                            stroke="none"
                                            cornerRadius={3}
                                            paddingAngle={4}
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center mt-1">
                                    <span className="text-base font-bold font-barlow-numeric text-white">{formatDecimal(metrics.winRate)}%</span>
                                    <span className="text-[8px] font-bold text-slate-500 uppercase">WIN</span>
                                </div>
                            </div>
                        </div>

                        {/* List Stats - Compact Grid */}
                        <div className="flex-1 flex flex-col gap-2">
                            <div className="flex-1 rounded-xl border border-white/5 bg-white/[0.03] backdrop-blur-sm px-3 py-1 flex items-center justify-between">
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t.trades}</div>
                                <div className="text-sm font-bold font-barlow-numeric text-white">{metrics.totalTrades}</div>
                            </div>
                            <div className="flex-1 rounded-xl border border-white/5 bg-white/[0.03] backdrop-blur-sm px-3 py-1 flex items-center justify-between">
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t.sharpe}</div>
                                <div className="text-sm font-bold font-barlow-numeric text-white">{formatDecimal(metrics.sharpe)}</div>
                            </div>
                            <div className="flex-1 rounded-xl border border-white/5 bg-white/[0.03] backdrop-blur-sm px-3 py-1 flex items-center justify-between">
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t.avgWin}</div>
                                <div className="text-sm font-bold font-barlow-numeric text-[#D05A5A]">{formatCurrency(metrics.avgWin, hideAmounts)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Equity Curve (Golden) - Reduced Height */}
                    <div className="rounded-xl border border-white/5 bg-white/[0.03] backdrop-blur-sm p-3 pb-0 space-y-1">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                            <span>{t.currentEquity}</span>
                            <span className="text-slate-600 opacity-50">Curve</span>
                        </div>
                        <div className="h-20 w-full -ml-1">
                             <ResponsiveContainer width="100%" height="100%">
                                 <AreaChart data={metrics.curve}>
                                    <defs>
                                        <linearGradient id="gradStratGold" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#C8B085" stopOpacity={0.4}/>
                                            <stop offset="100%" stopColor="#C8B085" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <Area 
                                        type="monotone" 
                                        dataKey="cumulativePnl" 
                                        stroke="#C8B085" 
                                        strokeWidth={1.5} 
                                        fill="url(#gradStratGold)" 
                                        isAnimationActive={true}
                                    />
                                    <Tooltip content={<EquityCurveTooltip hideAmounts={hideAmounts} />} cursor={{stroke: 'white', strokeOpacity: 0.1, strokeDasharray: '3 3'}} />
                                 </AreaChart>
                             </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Bottom Row: MDD & RR */}
                    <div className="grid grid-cols-2 gap-2">
                         <GlassStat 
                            label={t.maxDD} 
                            value={`${formatDecimal(metrics.maxDD)}%`}
                            color={Math.abs(metrics.maxDD) > ddThreshold ? '#D05A5A' : '#5B9A8B'}
                            icon={TrendingDown}
                         />
                         <GlassStat 
                            label={t.riskReward} 
                            value={formatDecimal(metrics.riskReward)}
                            icon={TrendingUp}
                         />
                    </div>
                </div>
            </div>
        </div>
    );
};

export const CustomDateRangeModal = ({ isOpen, onClose, onApply, initialRange, lang }: any) => {
    const t = I18N[lang] || I18N['zh'];
    const [viewDate, setViewDate] = React.useState(new Date());
    const [startDate, setStartDate] = React.useState(initialRange.start);
    const [endDate, setEndDate] = React.useState(initialRange.end);
    const [step, setStep] = React.useState('start');
    React.useEffect(() => { if(isOpen) { setStartDate(initialRange.start); setEndDate(initialRange.end); setStep('start'); } }, [isOpen, initialRange]);
    if (!isOpen) return null;
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const days = [];
    for(let i=0; i<firstDay; i++) days.push(null);
    for(let i=1; i<=daysInMonth; i++) days.push(new Date(year, month, i));
    const handleDateClick = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        if (step === 'start') { setStartDate(dateStr); if (endDate && dateStr > endDate) setEndDate(null); setStep('end'); } 
        else { if (dateStr < startDate) { setStartDate(dateStr); setStep('end'); } else setEndDate(dateStr); }
    };
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-[#141619] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-white/5">
                    <div className="flex justify-between items-center mb-4"><h3 className="text-white font-bold text-sm uppercase tracking-wider">{t.selectDateRange}</h3><button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-slate-500"><X size={20} /></button></div>
                    <div className="flex gap-2">
                        <div onClick={() => setStep('start')} className={`flex-1 p-2 rounded-lg border transition-all ${step === 'start' ? `border-gold bg-gold/5` : 'border-white/5 bg-[#0B0C10]'}`}><div className="text-[9px] text-slate-500 uppercase font-bold mb-0.5">{t.startDate}</div><div className={`text-xs font-barlow-numeric font-bold ${startDate ? 'text-white' : 'text-slate-800'}`}>{startDate || 'YYYY-MM-DD'}</div></div>
                        <div onClick={() => setStep('end')} className={`flex-1 p-2 rounded-lg border transition-all ${step === 'end' ? `border-gold bg-gold/5` : 'border-white/5 bg-[#0B0C10]'}`}><div className="text-[9px] text-slate-500 uppercase font-bold mb-0.5">{t.endDate}</div><div className={`text-xs font-barlow-numeric font-bold ${endDate ? 'text-white' : 'text-slate-800'}`}>{endDate || 'YYYY-MM-DD'}</div></div>
                    </div>
                </div>
                <div className="p-4">
                    <div className="flex justify-between items-center mb-4"><button onClick={() => setViewDate(new Date(year, month-1, 1))} className="p-1 rounded hover:bg-white/5"><ChevronLeft size={18}/></button><span className="font-bold text-white text-xs">{year} / {month+1}</span><button onClick={() => setViewDate(new Date(year, month+1, 1))} className="p-1 rounded hover:bg-white/5"><ChevronRight size={18}/></button></div>
                    <div className="grid grid-cols-7 text-center mb-2">{'SMTWTFS'.split('').map((d,i) => <div key={i} className="text-[9px] font-bold text-slate-700">{d}</div>)}</div>
                    <div className="grid grid-cols-7 gap-y-1">
                        {days.map((d, i) => {
                            const dateStr = d ? d.toISOString().split('T')[0] : '';
                            const isSel = dateStr === startDate || dateStr === endDate;
                            const dInRange = d && startDate && endDate && dateStr > startDate && dateStr < endDate;
                            return (
                                <div key={i} className="relative flex justify-center items-center h-8">
                                    {dInRange && <div className="absolute inset-x-0 h-full bg-gold/10" />}
                                    <button onClick={() => d && handleDateClick(d)} className={`relative w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-barlow-numeric font-bold z-10 transition-all ${!d ? 'invisible' : ''} ${isSel ? 'bg-gold text-black shadow-lg scale-110' : 'text-slate-500 hover:text-white'}`}>{d ? d.getDate() : ''}</button>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="p-4 border-t border-white/5 flex justify-end gap-3">
                    <button onClick={() => { setStartDate(null); setEndDate(null); }} className="text-[10px] font-bold uppercase text-slate-600 hover:text-white transition-colors">{t.reset}</button>
                    <button onClick={() => onApply(startDate, endDate)} disabled={!startDate || !endDate} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${startDate && endDate ? 'bg-gold text-black shadow-md' : 'bg-[#25282C] text-slate-700 cursor-not-allowed'}`}>{t.confirm}</button>
                </div>
            </div>
        </div>
    );
};

export const SyncConflictModal = ({ isOpen, onResolve, lang, isSyncing }: { isOpen: boolean, onResolve: (choice: 'merge' | 'discard') => void, lang: Lang, isSyncing: boolean }) => {
    if (!isOpen) return null;
    const t = I18N[lang] || I18N['zh'];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-sm bg-[#141619] rounded-2xl border border-[#C8B085]/30 shadow-2xl overflow-hidden relative">
                {/* Decorative Top Glow */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C8B085] to-transparent opacity-50"></div>
                
                <div className="p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#C8B085]/10 flex items-center justify-center mx-auto mb-4 border border-[#C8B085]/20 shadow-[0_0_15px_rgba(200,176,133,0.1)]">
                        <CloudLightning size={24} className="text-[#C8B085]" />
                    </div>
                    <h2 className="text-lg font-bold text-white mb-2">{t.syncConflictTitle}</h2>
                    <p className="text-xs text-slate-400 leading-relaxed mb-6">{t.syncConflictDesc}</p>

                    <div className="space-y-3">
                        <button 
                            onClick={() => onResolve('merge')} 
                            disabled={isSyncing}
                            className="w-full p-4 rounded-xl bg-gradient-to-r from-[#C8B085] to-[#B09870] text-black font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-[0_0_20px_rgba(200,176,133,0.3)] transition-all active:scale-[0.98] flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-full bg-black/10"><ArrowUpCircle size={16}/></div>
                                <div className="text-left">
                                    <div className="font-bold">{t.mergeOption}</div>
                                    <div className="text-[9px] opacity-70 font-normal normal-case">{t.mergeDesc}</div>
                                </div>
                            </div>
                            {isSyncing ? <Activity size={16} className="animate-spin opacity-50"/> : <ChevronRight size={16} className="opacity-50 group-hover:translate-x-1 transition-transform"/>}
                        </button>

                        <button 
                            onClick={() => onResolve('discard')} 
                            disabled={isSyncing}
                            className="w-full p-4 rounded-xl bg-[#0B0C10] border border-white/5 text-slate-400 hover:text-white hover:border-red-500/30 hover:bg-red-500/5 transition-all active:scale-[0.98] flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-full bg-white/5 group-hover:bg-red-500/10 group-hover:text-red-400 transition-colors"><Trash2 size={16}/></div>
                                <div className="text-left">
                                    <div className="font-bold text-xs uppercase tracking-wider">{t.discardOption}</div>
                                    <div className="text-[9px] opacity-50 font-normal normal-case">{t.discardDesc}</div>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
