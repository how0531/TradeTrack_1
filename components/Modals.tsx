import React from 'react';
import { X, ChevronDown, Activity, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, BarChart, Bar, YAxis } from 'recharts';
import { THEME, I18N } from '../constants';
import { StrategyChipsInput, EmotionChipsInput } from './UI';
import { getPnlColor, formatCurrency, formatDecimal } from '../utils';
import { TradeModalProps, StrategyDetailModalProps, Trade } from '../types';

export const TradeModal = ({ isOpen, onClose, form, setForm, onSubmit, isEditing, strategies, emotions, portfolios, lang }: TradeModalProps) => {
    if (!isOpen) return null;
    const t = I18N[lang] || I18N['zh'];

    const updateForm = (key: keyof Trade, value: any) => {
        setForm({ ...form, [key]: value });
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="w-full sm:max-w-sm bg-[#141619] rounded-t-2xl sm:rounded-2xl border-t sm:border border-white/5 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-[#141619] z-10 relative shrink-0">
                    <h2 className="font-bold text-slate-300 text-sm">{isEditing ? t.editTrade : t.addTrade}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-1 rounded-full active:bg-white/10"><X size={20}/></button>
                </div>
                
                <form onSubmit={onSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
                    <div className="mb-2">
                        <label className="text-[10px] font-bold uppercase text-slate-600 mb-2 block tracking-widest">{t.portfolio}</label>
                        <div className="relative">
                            <select value={form.portfolioId || ''} onChange={e => updateForm('portfolioId', e.target.value)} className="w-full p-3 rounded-xl text-sm bg-[#1C1E22] border border-[#222] text-white outline-none appearance-none">
                                {portfolios.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="flex bg-[#0B0C10] p-1 rounded-lg border border-white/5 h-[42px] flex-shrink-0">
                            <button type="button" onClick={() => updateForm('type', 'profit')} className={`px-4 rounded text-xs font-bold transition-all ${form.type === 'profit' ? 'bg-[#D05A5A] text-white shadow-sm' : 'text-slate-500'}`}>{t.profit}</button>
                            <button type="button" onClick={() => updateForm('type', 'loss')} className={`px-4 rounded text-xs font-bold transition-all ${form.type === 'loss' ? 'bg-[#5B9A8B] text-white shadow-sm' : 'text-slate-500'}`}>{t.loss}</button>
                        </div>
                        <div className="flex-1 relative"><input type="date" required value={form.date} onChange={e => updateForm('date', e.target.value)} className="w-full h-[42px] pl-3 pr-1 rounded-lg bg-[#0B0C10] border border-[#222] text-sm text-slate-300 font-barlow-numeric outline-none focus:border-slate-600 transition-colors" /></div>
                    </div>
                    <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-barlow-numeric text-lg">$</span><input type="number" step="0.1" inputMode="decimal" required value={form.amount} onChange={e => updateForm('amount', e.target.value)} className="w-full pl-8 pr-4 py-3 rounded-xl text-2xl font-barlow-numeric font-medium bg-[#0B0C10] border border-[#222] focus:border-slate-600 text-white placeholder-slate-700 outline-none transition-colors" placeholder="0.0" autoFocus /></div>
                    <div><label className="text-[10px] font-bold uppercase text-slate-600 mb-2 block tracking-widest">{t.strategyList}</label><StrategyChipsInput strategies={strategies} value={form.strategy || ''} onChange={(val) => updateForm('strategy', val)} lang={lang} /></div>
                    <div><label className="text-[10px] font-bold uppercase text-slate-600 mb-2 block tracking-widest">{t.mindsetList}</label><EmotionChipsInput emotions={emotions} value={form.emotion || ''} onChange={(val) => updateForm('emotion', val)} lang={lang} /></div>
                    <textarea rows={2} value={form.note || ''} onChange={e => updateForm('note', e.target.value)} className="w-full p-3 rounded-xl text-sm bg-[#0B0C10] border border-[#222] text-slate-300 placeholder-slate-700 outline-none resize-none min-h-[50px]" placeholder={t.notePlaceholder} />
                    <button type="submit" className="w-full py-3 rounded-xl font-bold text-white text-sm shadow-lg active:scale-95 transition-transform mt-2" style={{ backgroundColor: form.type === 'profit' ? THEME.RED : THEME.GREEN }}>{isEditing ? t.update : t.save}</button>
                </form>
            </div>
        </div>
    );
};

export const StrategyDetailModal = ({ strategy, metrics, onClose, lang, hideAmounts, ddThreshold }: StrategyDetailModalProps) => {
    if (!strategy || !metrics) return null;
    const t = I18N[lang] || I18N['zh'];

    return (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
            <div className="w-full sm:max-w-sm bg-[#141619] rounded-t-2xl sm:rounded-2xl border-t sm:border border-white/5 shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '50vh' }}>
                <div className="px-5 pt-4 pb-2 flex justify-between items-start bg-[#141619] shrink-0">
                    <div><div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Activity size={10}/> {t.strategyAnalysis}</div><div className="flex items-center gap-3"><h2 className="font-bold text-white text-lg">{strategy}</h2><span className="text-xl font-bold font-barlow-numeric" style={{ color: getPnlColor(metrics.netProfit) }}>{formatCurrency(metrics.netProfit, hideAmounts)}</span></div></div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-1.5 rounded-full bg-[#1C1E22] border border-white/5 active:scale-90 transition-all"><X size={18}/></button>
                </div>
                <div className="px-5 pb-2 flex-1 min-h-0 flex flex-col">
                    <div className="h-[100px] w-full relative -ml-2" style={{ minWidth: 0 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                             <AreaChart data={metrics.curve}><defs><linearGradient id="gradStrat" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={THEME.GOLD} stopOpacity={0.4}/><stop offset="100%" stopColor={THEME.GOLD} stopOpacity={0}/></linearGradient></defs><Tooltip content={() => null} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} /><Area type="monotone" dataKey="equity" stroke={THEME.GOLD} strokeWidth={2} fill="url(#gradStrat)" /></AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="h-[40px] w-full relative opacity-60 -mx-2 -mt-1" style={{ minWidth: 0 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                             <BarChart data={metrics.drawdown}><defs><linearGradient id="gradDDStrat" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={THEME.DD_GRADIENT_TOP} stopOpacity={1}/><stop offset="100%" stopColor={THEME.DD_GRADIENT_BOTTOM} stopOpacity={0.7}/></linearGradient></defs><YAxis hide domain={['dataMin', 0]} /><Bar dataKey="ddPct" radius={[0, 0, 2, 2]} fill="url(#gradDDStrat)" /></BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="px-5 pb-5 pt-2 grid grid-cols-4 gap-2 bg-[#141619] shrink-0">
                    <div className="flex flex-col items-center p-1.5 rounded bg-[#1C1E22] border border-white/5"><span className="text-[9px] text-slate-500 uppercase font-bold">{t.winRate}</span><span className="text-xs text-white font-barlow-numeric font-bold">{formatDecimal(metrics.winRate)}%</span></div>
                    <div className="flex flex-col items-center p-1.5 rounded bg-[#1C1E22] border border-white/5"><span className="text-[9px] text-slate-500 uppercase font-bold">{t.profitFactor}</span><span className="text-xs text-white font-barlow-numeric font-bold">{formatDecimal(metrics.pf)}</span></div>
                    <div className="flex flex-col items-center p-1.5 rounded bg-[#1C1E22] border border-white/5"><span className="text-[9px] text-slate-500 uppercase font-bold">{t.maxDD}</span><span className="text-xs font-barlow-numeric font-bold" style={{color: THEME.GREEN}}>{formatDecimal(metrics.maxDDPct)}%</span></div>
                    {(() => {
                        const currentDDAbs = Math.abs(metrics.currentDD);
                        if (currentDDAbs < 0.01) return <div className="flex flex-col items-center justify-center p-1.5 rounded border border-[#C8B085]/30 bg-[#C8B085]/10"><span className="text-[9px] uppercase font-bold text-[#C8B085]">{t.status_newHigh}</span></div>;
                        else if (currentDDAbs < ddThreshold) return <div className="flex flex-col items-center justify-center p-1.5 rounded border border-[#5B9A8B]/40 bg-[#5B9A8B]/10"><span className="text-[9px] uppercase font-bold" style={{color: '#5B9A8B'}}>{t.status_warning}</span></div>;
                        else return <div className="flex flex-col items-center justify-center p-1.5 rounded border border-red-500/50 bg-red-500/10"><ShieldAlert size={14} className="text-white mb-0.5" /><span className="text-[10px] font-bold text-white">{t.status_broken}</span></div>;
                    })()}
                </div>
            </div>
        </div>
    );
};

export const CustomDateRangeModal = ({ isOpen, onClose, onApply, initialRange, lang }: any) => {
    // Kept as is for now, just standardizing props if needed in future
    // ... logic remains same ...
    // To save tokens, I am not re-writing the date logic unless requested, as the focus is on refactoring main app logic.
    // Assuming the user accepts the existing implementation for this specific modal or I can paste it if needed.
    // Pasting keeping strict check:
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
        if (!date) return;
        const dateStr = date.toISOString().split('T')[0];
        if (step === 'start') { setStartDate(dateStr); if (endDate && dateStr > endDate) setEndDate(null); setStep('end'); } 
        else { if (dateStr < startDate) { setStartDate(dateStr); setStep('end'); } else { setEndDate(dateStr); } }
    };

    const isInRange = (d: Date) => { if (!d || !startDate || !endDate) return false; const s = new Date(startDate); const e = new Date(endDate); return d > s && d < e; };
    
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-[#141619] rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95">
                <div className="bg-[#1C1E22] p-4 border-b border-white/5">
                    <div className="flex justify-between items-center mb-4"><h3 className="text-white font-bold">{t.selectDateRange}</h3><button onClick={onClose}><X size={20} className="text-slate-500" /></button></div>
                    <div className="flex gap-2">
                        <div onClick={() => setStep('start')} className={`flex-1 p-2 rounded-lg border cursor-pointer transition-all ${step === 'start' ? `border-[${THEME.GOLD}] bg-[${THEME.GOLD_BG}]` : 'border-white/10 bg-black/20'}`}><div className="text-[10px] text-slate-500 uppercase font-bold mb-1">{t.startDate}</div><div className={`text-sm font-barlow-numeric font-bold ${startDate ? 'text-white' : 'text-slate-600'}`}>{startDate || 'YYYY-MM-DD'}</div></div>
                        <div onClick={() => setStep('end')} className={`flex-1 p-2 rounded-lg border cursor-pointer transition-all ${step === 'end' ? `border-[${THEME.GOLD}] bg-[${THEME.GOLD_BG}]` : 'border-white/10 bg-black/20'}`}><div className="text-[10px] text-slate-500 uppercase font-bold mb-1">{t.endDate}</div><div className={`text-sm font-barlow-numeric font-bold ${endDate ? 'text-white' : 'text-slate-600'}`}>{endDate || 'YYYY-MM-DD'}</div></div>
                    </div>
                </div>
                <div className="p-4">
                    <div className="flex justify-between items-center mb-4"><button onClick={() => setViewDate(new Date(year, month-1, 1))} className="p-1 text-slate-500 hover:text-white"><ChevronLeft size={20}/></button><span className="font-bold text-slate-200 text-sm">{year} . {String(month+1).padStart(2,'0')}</span><button onClick={() => setViewDate(new Date(year, month+1, 1))} className="p-1 text-slate-500 hover:text-white"><ChevronRight size={20}/></button></div>
                    <div className="grid grid-cols-7 text-center mb-2">{'SMTWTFS'.split('').map((d,i) => <div key={i} className="text-[10px] font-bold text-slate-600">{d}</div>)}</div>
                    <div className="grid grid-cols-7 gap-y-2">
                        {days.map((d, i) => {
                            const dateStr = d ? d.toISOString().split('T')[0] : '';
                            const isSel = dateStr === startDate || dateStr === endDate;
                            return (
                                <div key={i} className="relative flex justify-center items-center h-8">
                                    {d && isInRange(d) && <div className="absolute inset-x-0 h-full bg-[#C8B085] opacity-20" />}
                                    <button onClick={() => d && handleDateClick(d)} className={`relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-barlow-numeric font-bold z-10 transition-all ${!d ? 'invisible' : ''} ${isSel ? 'bg-[#C8B085] text-black shadow-lg scale-110' : 'text-slate-400 hover:bg-white/5'}`}>{d ? d.getDate() : ''}</button>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="p-4 border-t border-white/5 flex justify-end gap-3">
                    <button onClick={() => { setStartDate(null); setEndDate(null); }} className="text-xs font-bold text-slate-500 hover:text-white px-3 py-2">{t.reset}</button>
                    <button onClick={() => onApply(startDate, endDate)} disabled={!startDate || !endDate} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${startDate && endDate ? 'bg-[#C8B085] text-black shadow-lg hover:brightness-110' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>{t.confirm}</button>
                </div>
            </div>
        </div>
    );
};