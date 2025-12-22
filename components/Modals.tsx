
import React from 'react';
import { X, ChevronDown, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, ReferenceLine } from 'recharts';
import { THEME, I18N } from '../constants';
import { StrategyChipsInput, EmotionChipsInput, PortfolioChipsInput } from './UI';
import { getPnlColor, formatCurrency, formatDecimal } from '../utils';
import { TradeModalProps, StrategyDetailModalProps, Trade } from '../types';

export const TradeModal = ({ isOpen, onClose, form, setForm, onSubmit, isEditing, strategies, emotions, portfolios, lang }: TradeModalProps) => {
    if (!isOpen) return null;
    const t = I18N[lang] || I18N['zh'];
    const updateForm = (key: keyof Trade, value: any) => setForm({ ...form, [key]: value });
    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="w-full sm:max-w-sm bg-[#141619] rounded-t-2xl sm:rounded-2xl border-t sm:border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
                <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center">
                    <h2 className="font-bold text-sm">{isEditing ? t.editTrade : t.addTrade}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1"><X size={20}/></button>
                </div>
                <form onSubmit={onSubmit} className="p-5 space-y-5 overflow-y-auto flex-1 no-scrollbar pb-10">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-500">{t.portfolio}</label>
                        <PortfolioChipsInput 
                            portfolios={portfolios} 
                            value={form.portfolioId || ''} 
                            onChange={(val) => updateForm('portfolioId', val)} 
                        />
                    </div>
                    <div className="flex gap-3">
                        <div className="flex bg-[#0B0C10] p-0.5 rounded-lg border border-white/5 h-[38px] flex-shrink-0">
                            <button type="button" onClick={() => updateForm('type', 'profit')} className={`px-4 rounded text-[10px] font-bold uppercase transition-all ${form.type === 'profit' ? 'bg-[#D05A5A] text-white shadow-md' : 'text-slate-600'}`}>{t.profit}</button>
                            <button type="button" onClick={() => updateForm('type', 'loss')} className={`px-4 rounded text-[10px] font-bold uppercase transition-all ${form.type === 'loss' ? 'bg-[#5B9A8B] text-white shadow-md' : 'text-slate-600'}`}>{t.loss}</button>
                        </div>
                        <div className="flex-1"><input type="date" required value={form.date} onChange={e => updateForm('date', e.target.value)} className="w-full h-[38px] px-3 rounded-lg bg-[#0B0C10] border border-white/10 text-sm text-white font-barlow-numeric outline-none focus:border-white/20" /></div>
                    </div>
                    <div>
                        <input type="number" step="0.1" inputMode="decimal" required value={form.amount} onChange={e => updateForm('amount', e.target.value)} className="w-full px-4 py-4 rounded-xl text-3xl font-barlow-numeric font-bold bg-[#0B0C10] border border-white/10 focus:border-white/20 text-white placeholder-slate-800 outline-none transition-colors" placeholder="0.0" autoFocus />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-500">{t.strategyList}</label>
                        <StrategyChipsInput strategies={strategies} value={form.strategy || ''} onChange={(val) => updateForm('strategy', val)} lang={lang} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-500">{t.mindsetList}</label>
                        <EmotionChipsInput emotions={emotions} value={form.emotion || ''} onChange={(val) => updateForm('emotion', val)} lang={lang} />
                    </div>
                    <textarea rows={2} value={form.note || ''} onChange={e => updateForm('note', e.target.value)} className="w-full p-3 rounded-lg text-sm bg-[#0B0C10] border border-white/10 text-slate-300 placeholder-slate-800 outline-none focus:border-white/20 resize-none min-h-[60px]" placeholder={t.notePlaceholder} />
                    <button type="submit" className="w-full py-4 rounded-xl font-bold uppercase tracking-widest text-white text-xs shadow-lg transition-all active:scale-[0.98]" style={{ backgroundColor: form.type === 'profit' ? THEME.RED : THEME.GREEN }}>{isEditing ? t.update : t.save}</button>
                </form>
            </div>
        </div>
    );
};

const CustomModalTooltip = ({ active, payload, label, hideAmounts }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-3 rounded-xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] bg-[#1A1C20]/70 backdrop-blur-xl text-xs z-50 min-w-[120px]">
                <div className="text-slate-300 mb-1 font-medium border-b border-white/10 pb-1">{label}</div>
                <div className="text-white font-bold font-barlow-numeric text-sm flex items-center justify-between gap-3">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">PnL</span>
                    <span style={{ color: getPnlColor(payload[0].value) }}>{formatCurrency(payload[0].value, hideAmounts)}</span>
                </div>
            </div>
        );
    }
    return null;
};

export const StrategyDetailModal = ({ strategy, metrics, onClose, lang, hideAmounts, ddThreshold }: StrategyDetailModalProps) => {
    if (!strategy || !metrics) return null;
    const t = I18N[lang] || I18N['zh'];
    const modalChartMargin = { top: 10, right: 10, left: 10, bottom: 0 };
    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="w-full sm:max-w-sm bg-[#141619] rounded-t-2xl sm:rounded-2xl border-t sm:border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
                <div className="px-5 pt-5 pb-3 flex justify-between items-start">
                    <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Activity size={10}/> {t.strategyAnalysis}</div>
                        <div className="flex items-center gap-3">
                            <h2 className="font-bold text-lg text-white">{strategy}</h2>
                            <span className="text-lg font-bold font-barlow-numeric" style={{ color: getPnlColor(metrics.netProfit) }}>{formatCurrency(metrics.netProfit, hideAmounts)}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={20}/></button>
                </div>
                <div className="px-5 pb-2 flex-1 min-h-0 flex flex-col">
                    <div className="h-[120px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                             <AreaChart data={metrics.curve} margin={modalChartMargin}>
                                <defs><linearGradient id="gradStrat" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={THEME.GOLD} stopOpacity={0.4}/><stop offset="100%" stopColor={THEME.GOLD} stopOpacity={0}/></linearGradient></defs>
                                <XAxis dataKey="date" hide padding={{ left: 0, right: 0 }} />
                                <Tooltip content={<CustomModalTooltip hideAmounts={hideAmounts} />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                                <ReferenceLine y={0} stroke="#FFFFFF" strokeOpacity={0.1} />
                                <Area type="monotone" dataKey="cumulativePnl" stroke={THEME.GOLD} strokeWidth={2} fill="url(#gradStrat)" isAnimationActive={false} />
                             </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="px-5 pb-6 pt-1 grid grid-cols-4 gap-2">
                    <div className="flex flex-col items-center p-2 rounded-lg bg-[#0B0C10] border border-white/5"><span className="text-[8px] text-slate-500 uppercase font-bold mb-0.5">Win%</span><span className="text-xs text-white font-barlow-numeric font-bold">{formatDecimal(metrics.winRate)}</span></div>
                    <div className="flex flex-col items-center p-2 rounded-lg bg-[#0B0C10] border border-white/5"><span className="text-[8px] text-slate-500 uppercase font-bold mb-0.5">PF</span><span className="text-xs text-white font-barlow-numeric font-bold">{formatDecimal(metrics.pf)}</span></div>
                    <div className="flex flex-col items-center p-2 rounded-lg bg-[#0B0C10] border border-white/5"><span className="text-[8px] text-slate-500 uppercase font-bold mb-0.5">MDD</span><span className="text-xs font-barlow-numeric font-bold" style={{color: THEME.GREEN}}>{formatDecimal(metrics.maxDD)}%</span></div>
                    {(() => {
                        const currentDDAbs = Math.abs(metrics.currentDD);
                        let color = 'border-gold/30 bg-gold/10 text-gold';
                        let label = t.status_newHigh;
                        if (currentDDAbs >= ddThreshold) { color = 'border-red-500/30 bg-red-500/10 text-red-400'; label = t.status_broken; }
                        else if (currentDDAbs >= 0.01) { color = 'border-green-500/30 bg-green-500/10 text-green-400'; label = t.status_warning; }
                        return <div className={`flex flex-col items-center justify-center p-2 rounded-lg border ${color}`}><span className="text-[8px] uppercase font-bold">{label}</span></div>;
                    })()}
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
