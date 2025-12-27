
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Briefcase, Layers, CalendarClock, Clock } from 'lucide-react';
import { I18N, FREQUENCIES, TIME_RANGES } from '../constants';

export * from './ui/GlassCard';
export * from './ui/Badge';

// --- Recreated Components to satisfy imports ---

export const StatCard = ({ label, value, valueColor }: any) => (
    <div className="p-3 rounded-xl border border-white/5 bg-[#1A1C20]/80 backdrop-blur-sm flex flex-col items-center justify-center min-h-[80px]">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</span>
        <span className="text-lg font-bold font-barlow-numeric" style={{ color: valueColor || '#E0E0E0' }}>{value}</span>
    </div>
);

export const PortfolioSelector = ({ portfolios, activeIds, onChange, lang }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const t = I18N[lang] || I18N['zh'];

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isAllSelected = activeIds.length === portfolios.length;
    
    // Determine Label
    let label = t.allAccounts;
    if (!isAllSelected) {
        if (activeIds.length === 1) {
            const active = portfolios.find((p: any) => p.id === activeIds[0]);
            if (active) label = active.name;
        } else {
            label = t.multiple;
        }
    }

    const toggleAll = () => {
        if (isAllSelected) {
            onChange([]); 
        } else {
            onChange(portfolios.map((p: any) => p.id));
        }
    };

    const toggleId = (id: string) => {
        if (activeIds.includes(id)) {
            onChange(activeIds.filter((aid: string) => aid !== id));
        } else {
            onChange([...activeIds, id]);
        }
    };

    return (
        <div className="relative z-50" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300 backdrop-blur-md
                    ${isOpen 
                        ? 'bg-[#C8B085]/10 border-[#C8B085]/40 text-[#C8B085] shadow-[0_0_15px_rgba(200,176,133,0.15)]' 
                        : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/20'
                    }
                `}
            >
                <Briefcase size={12} className={isOpen ? 'text-[#C8B085]' : 'text-slate-500'} />
                <span className="text-[10px] font-bold uppercase tracking-wider max-w-[100px] truncate">{label}</span>
                <ChevronDown size={12} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-52 bg-black/80 backdrop-blur-sm border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col ring-1 ring-white/10 z-[100]">
                    
                    {/* Header: Select All */}
                    <div 
                        onClick={toggleAll}
                        className="px-4 py-3 border-b border-white/5 flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-colors group"
                    >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-300 ${isAllSelected ? 'bg-[#C8B085] border-[#C8B085] shadow-[0_0_8px_rgba(200,176,133,0.4)]' : 'border-white/20 group-hover:border-white/40'}`}>
                            {isAllSelected && <Check size={10} className="text-black stroke-[3]" />}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
                            <Layers size={12} className="text-slate-500" />
                            {t.selectAll}
                        </div>
                    </div>

                    {/* List */}
                    <div className="py-1 max-h-64 overflow-y-auto custom-scrollbar">
                        {portfolios.map((p: any) => {
                            const isSelected = activeIds.includes(p.id);
                            return (
                                <div 
                                    key={p.id} 
                                    onClick={() => toggleId(p.id)}
                                    className="px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-colors group"
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-300 ${isSelected ? 'bg-[#C8B085] border-[#C8B085] shadow-[0_0_8px_rgba(200,176,133,0.4)]' : 'border-white/20 group-hover:border-white/40'}`}>
                                        {isSelected && <Check size={10} className="text-black stroke-[3]" />}
                                    </div>
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <div className="w-2 h-2 rounded-full shrink-0 shadow-[0_0_5px_rgba(0,0,0,0.5)]" style={{ backgroundColor: p.profitColor }}></div>
                                        <span className={`text-xs font-medium truncate transition-colors ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{p.name}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- NEW DROPDOWN STYLE FREQUENCY SELECTOR ---
export const FrequencySelector = ({ currentFreq, setFreq, lang }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const t = I18N[lang] || I18N['zh'];
    const options = FREQUENCIES;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Display Label map for the button (Short version)
    const labelMap: Record<string, string> = {
        'daily': t.short_daily,
        'weekly': t.short_weekly,
        'monthly': t.short_monthly,
        'quarterly': t.short_quarterly,
        'yearly': t.short_yearly
    };

    // Full Label map for the list
    const fullLabelMap: Record<string, string> = {
        'daily': t.freq_daily,
        'weekly': t.freq_weekly,
        'monthly': t.freq_monthly,
        'quarterly': t.freq_quarterly,
        'yearly': t.freq_yearly
    };

    return (
        <div className="relative z-40" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300 backdrop-blur-md h-[32px]
                    ${isOpen 
                        ? 'bg-white/10 border-white/20 text-white' 
                        : 'bg-[#25282C] border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                    }
                `}
            >
                {/* <CalendarClock size={12} className={isOpen ? 'text-[#C8B085]' : 'text-slate-500'} /> */}
                <span className="text-[10px] font-bold uppercase tracking-wider">{labelMap[currentFreq] || currentFreq}</span>
                <ChevronDown size={12} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-32 bg-black/80 backdrop-blur-sm border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col ring-1 ring-white/10 z-[100]">
                    {options.map((f: string) => (
                        <div
                            key={f}
                            onClick={() => { setFreq(f); setIsOpen(false); }}
                            className={`px-3 py-2.5 text-[10px] font-bold cursor-pointer transition-colors flex items-center justify-between
                                ${currentFreq === f ? 'bg-white/10 text-[#C8B085]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}
                            `}
                        >
                            {fullLabelMap[f] || f}
                            {currentFreq === f && <Check size={10} />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- NEW SOFT CAPSULE TIME RANGE SELECTOR ---
export const TimeRangeSelector = ({ currentRange, setRange, lang, customRangeLabel }: any) => {
    const t = I18N[lang] || I18N['zh'];
    return (
        <div className="flex bg-white/5 backdrop-blur-md rounded-full p-1 border border-white/10 h-[32px] items-center">
            {TIME_RANGES.map((r: string) => {
                const isActive = currentRange === r;
                const label = r === 'CUSTOM' && customRangeLabel 
                    ? customRangeLabel 
                    : (t[`time_${r.toLowerCase()}`] ? (t[`time_${r.toLowerCase()}`].includes(' ') ? r : t[`time_${r.toLowerCase()}`]) : r);

                return (
                    <button
                        key={r}
                        onClick={() => setRange(r)}
                        className={`
                            px-3 h-full rounded-full text-[10px] font-bold uppercase transition-all duration-300 flex items-center justify-center whitespace-nowrap
                            ${isActive 
                                ? 'bg-[#C8B085] text-[#000000] shadow-[0_2px_8px_rgba(200,176,133,0.3)]' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }
                        `}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
};

export const MultiSelectDropdown = ({ options, selected, onChange, icon: Icon, defaultLabel, lang }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="relative z-30 w-full">
            <button onClick={() => setIsOpen(!isOpen)} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-all duration-300 ${selected.length > 0 ? 'bg-[#C8B085]/10 border-[#C8B085]/30 text-[#C8B085]' : 'bg-[#1A1C20] border-white/5 text-slate-400 hover:border-white/10'}`}>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase">
                    {Icon && <Icon size={12} />}
                    <span className="truncate">{selected.length > 0 ? `${selected.length} ${I18N[lang].selected}` : defaultLabel}</span>
                </div>
                <ChevronDown size={12} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-black/80 backdrop-blur-sm border border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] max-h-48 overflow-y-auto z-[100] ring-1 ring-white/10 custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
                    {options.map((opt: string) => (
                        <div 
                            key={opt}
                            onClick={() => {
                                if (selected.includes(opt)) onChange(selected.filter((s: string) => s !== opt));
                                else onChange([...selected, opt]);
                            }}
                            className={`px-3 py-2.5 text-[10px] font-medium cursor-pointer flex justify-between items-center transition-colors ${selected.includes(opt) ? 'bg-[#C8B085]/10 text-[#C8B085]' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                        >
                            <span className="truncate">{opt}</span>
                            {selected.includes(opt) && <Check size={10} />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const VirtualList = () => null;

export const ColorPicker = ({ value, onChange }: any) => (
    <div className="flex gap-2">
        {['#C8B085', '#526D82', '#D05A5A', '#5B9A8B', '#8884d8', '#28573f'].map(c => (
             <button 
                key={c} 
                onClick={() => onChange(c)} 
                className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${value === c ? 'ring-2 ring-white' : ''}`} 
                style={{ backgroundColor: c }}
            />
        ))}
    </div>
);

export const StrategyChipsInput = ({ strategies, value, onChange }: any) => (
    <div className="flex flex-wrap gap-2">
        {strategies.map((s: string) => (
            <button 
                type="button"
                key={s} 
                onClick={() => onChange(s === value ? '' : s)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${value === s ? 'bg-[#C8B085] text-black border-[#C8B085]' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'}`}
            >
                {s}
            </button>
        ))}
    </div>
);

export const EmotionChipsInput = ({ emotions, value, onChange }: any) => (
    <div className="flex flex-wrap gap-2">
        {emotions.map((e: string) => (
            <button 
                type="button"
                key={e} 
                onClick={() => onChange(e === value ? '' : e)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${value === e ? 'bg-[#526D82] text-white border-[#526D82]' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'}`}
            >
                {e}
            </button>
        ))}
    </div>
);

export const PortfolioChipsInput = ({ portfolios, value, onChange }: any) => (
    <div className="flex flex-wrap gap-2">
        {portfolios.map((p: any) => (
            <button 
                type="button"
                key={p.id} 
                onClick={() => onChange(p.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border flex items-center gap-1.5 ${value === p.id ? 'bg-white/10 text-white border-white/20' : 'bg-transparent text-slate-500 border-white/5 hover:border-white/10'}`}
            >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.profitColor }}></div>
                {p.name}
            </button>
        ))}
    </div>
);
