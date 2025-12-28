// [Manage] Last Updated: 2024-05-22
import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, CloudLightning, ArrowUpCircle, Activity, Trash2 } from 'lucide-react';
import { I18N } from '../../constants';
import { Lang } from '../../types';

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
                    <div className="w-12 h-12 rounded-full bg-[#C8B085]/10 flex items-center justify-center mx-auto mb-4 border border-[#C8B085]/20 shadow-[0_0_15px_rgba(200,176,133,0.2)]">
                        <CloudLightning className="text-[#C8B085]" size={24} />
                    </div>

                    <h3 className="text-white font-bold text-lg mb-2">{t.dataConflict}</h3>
                    <p className="text-slate-400 text-xs leading-relaxed mb-6">
                        {t.dataConflictDesc}
                    </p>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => onResolve('discard')}
                            disabled={isSyncing}
                            className="flex-1 px-4 py-3 rounded-xl bg-[#25282C] border border-white/5 text-slate-400 font-bold text-xs uppercase hover:bg-white/5 hover:text-white transition-all disabled:opacity-50"
                        >
                            {t.keepLocal}
                        </button>
                        <button 
                            onClick={() => onResolve('merge')}
                            disabled={isSyncing}
                            className="flex-1 px-4 py-3 rounded-xl bg-[#C8B085] text-black font-bold text-xs uppercase hover:bg-[#D9C298] hover:shadow-[0_0_20px_rgba(200,176,133,0.3)] transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {isSyncing ? <Activity size={14} className="animate-spin" /> : <ArrowUpCircle size={14} />}
                            {t.useCloud}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};