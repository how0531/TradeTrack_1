
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, CheckSquare, Square, Check, ListFilter, Briefcase, Calendar as CalendarIcon, LucideIcon } from 'lucide-react';
import { THEME, I18N, TIME_RANGES, FREQUENCIES, DEFAULT_PALETTE } from '../constants';
import { Lang, Frequency, Portfolio } from '../types';

// --- VIRTUAL LIST (Window Scroll & Variable Height Support) ---
export const VirtualList = ({ items, renderItem, getItemHeight, windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800 }: { items: any[], renderItem: (item: any, index: number) => React.ReactNode, getItemHeight: (item: any) => number, windowHeight?: number }) => {
    const [scrollTop, setScrollTop] = useState(0);

    useEffect(() => {
        const onScroll = () => setScrollTop(window.scrollY);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const { totalHeight, visibleItems } = useMemo(() => {
        let currentTop = 0;
        const offsets = items.map(item => {
            const height = getItemHeight(item);
            const offset = currentTop;
            currentTop += height;
            return { offset, height, item };
        });

        const total = currentTop;
        
        // Render Buffer (px)
        const buffer = 800;
        const startY = Math.max(0, scrollTop - buffer);
        const endY = scrollTop + windowHeight + buffer;

        const visible = [];
        // Binary search could be optimized here for massive lists, but linear scan is fine for < 10k items
        for(let i=0; i<offsets.length; i++) {
            const { offset, height } = offsets[i];
            if (offset + height > startY && offset < endY) {
                visible.push({ ...offsets[i], index: i });
            }
        }
        
        return { totalHeight: total, visibleItems: visible };
    }, [items, scrollTop, windowHeight, getItemHeight]);

    return (
        <div style={{ height: totalHeight, position: 'relative' }}>
            {visibleItems.map(({ item, index, offset }) => (
                <div key={index} style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${offset}px)` }}>
                    {renderItem(item, index)}
                </div>
            ))}
        </div>
    );
};

// --- STAT CARD ---
export const StatCard = ({ icon, label, value, valueColor = '#E0E0E0' }: { icon: React.ReactNode, label: string, value: string | number, valueColor?: string }) => (
    <div className="p-3 rounded-xl border border-white/5 bg-[#141619]">
        <div className="flex items-center gap-1.5 mb-1 text-slate-500 text-[10px] font-bold uppercase tracking-wider">{icon} {label}</div>
        <div className="text-lg font-medium font-barlow-numeric" style={{ color: valueColor }}>{value}</div>
    </div>
);

// --- CHIPS ---
export const StrategyChipsInput = ({ strategies, value, onChange, lang }: { strategies: string[], value: string, onChange: (v: string) => void, lang: Lang }) => {
    const t = I18N[lang] || I18N['zh'];
    return (
        <div className="flex overflow-x-auto gap-2 pb-1 no-scrollbar mask-gradient">
            <button 
                type="button" 
                onClick={() => onChange('')} 
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex-shrink-0 ${value === '' ? `bg-[${THEME.GOLD_BG}] text-[${THEME.GOLD}] border-[${THEME.GOLD}]` : 'bg-[#1C1E22] text-[#757575] border-[#333]'}`}
                style={value === '' ? { backgroundColor: THEME.GOLD_BG, color: THEME.GOLD, borderColor: THEME.GOLD } : {}}
            >
                {t.uncategorized}
            </button>
            {strategies.map(s => (
                <button key={s} type="button" onClick={() => onChange(s)} className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex-shrink-0 ${value === s ? `bg-[${THEME.GOLD_BG}] text-[${THEME.GOLD}] border-[${THEME.GOLD}]` : 'bg-[#1C1E22] text-[#757575] border-[#333]'}`} style={value === s ? { backgroundColor: THEME.GOLD_BG, color: THEME.GOLD, borderColor: THEME.GOLD } : {}}>{s}</button>
            ))}
        </div>
    );
};

export const EmotionChipsInput = ({ emotions, value, onChange }: { emotions: string[], value: string, onChange: (v: string) => void, lang: Lang }) => {
    return (
        <div className="flex overflow-x-auto gap-2 pb-1 no-scrollbar mask-gradient">
            {emotions.map(e => (
                <button key={e} type="button" onClick={() => onChange(value === e ? '' : e)} className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex-shrink-0 flex items-center gap-1 ${value === e ? `bg-[#25282C] border-[#555]` : 'bg-[#1C1E22] text-[#757575] border-[#333]'}`} style={value === e ? { color: THEME.BLUE, borderColor: THEME.BLUE, backgroundColor: `${THEME.BLUE}20` } : {}}>{e}</button>
            ))}
        </div>
    );
};

// --- DROPDOWN ---
export const MultiSelectDropdown = ({ options, selected, onChange, icon: Icon, defaultLabel, lang }: { options: string[], selected: string[], onChange: (v: string[]) => void, icon?: LucideIcon, defaultLabel: string, label?: string, lang: Lang }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const t = I18N[lang] || I18N['zh'];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (option: string) => {
        if (selected.includes(option)) onChange(selected.filter(item => item !== option));
        else onChange([...selected, option]);
    };

    const isAll = selected.length === 0;

    return (
        <div className="relative w-full" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all text-xs font-bold ${!isAll ? `bg-[${THEME.GOLD_BG}] border-[${THEME.GOLD}] text-[${THEME.GOLD}]` : 'bg-[#1C1E22] border-white/10 text-slate-400'}`}
                style={!isAll ? { backgroundColor: THEME.GOLD_BG, borderColor: THEME.GOLD, color: THEME.GOLD } : {}}
            >
                <div className="flex items-center gap-2 truncate">
                    {Icon && <Icon size={12} className={!isAll ? 'text-[#C8B085]' : 'text-slate-500'} />}
                    <span className="truncate">{isAll ? defaultLabel : `${selected.length} ${t.selected}`}</span>
                </div>
                <ChevronDown size={14} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1C1E22] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden max-h-[200px] flex flex-col">
                     <div className="overflow-y-auto p-2 space-y-1">
                        <button onClick={() => { onChange([]); setIsOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ${isAll ? 'bg-white/5 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
                            {isAll ? <CheckSquare size={14} color={THEME.BLUE} /> : <Square size={14} />} {defaultLabel}
                        </button>
                        <div className="h-px bg-white/5 my-1" />
                        {options.map(opt => {
                            const isSelected = selected.includes(opt);
                            return (
                                <button key={opt} onClick={() => toggleOption(opt)} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors ${isSelected ? 'text-white bg-white/5' : 'text-slate-400 hover:bg-white/5'}`}>
                                    {isSelected ? <CheckSquare size={14} color={THEME.BLUE} /> : <Square size={14} />} <span className="truncate">{opt}</span>
                                </button>
                            )
                        })}
                     </div>
                </div>
            )}
        </div>
    );
};

// --- PORTFOLIO SELECTOR ---
export const PortfolioSelector = ({ portfolios, activeIds, onChange, lang }: { portfolios: Portfolio[], activeIds: string[], onChange: (ids: string[]) => void, lang: Lang }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const t = I18N[lang] || I18N['zh'];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = (id: string) => {
        if (activeIds.includes(id)) onChange(activeIds.filter(pid => pid !== id));
        else onChange([...activeIds, id]);
    };

    const handleSelectAll = () => {
        if (activeIds.length === portfolios.length) onChange([]); 
        else onChange(portfolios.map(p => p.id));
    };

    const isAllSelected = activeIds.length === portfolios.length && portfolios.length > 0;
    
    let displayLabel = "None";
    if (isAllSelected) displayLabel = "All Accounts";
    else if (activeIds.length === 1) {
        const p = portfolios.find(x => x.id === activeIds[0]);
        displayLabel = p ? p.name : "Unknown";
    } else if (activeIds.length > 1) {
        displayLabel = `${activeIds.length} Selected`;
    }

    return (
        <div className="relative" ref={containerRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 p-1 pr-2 rounded-lg hover:bg-white/5 transition-colors">
                <div className="p-1 rounded bg-[#25282C]"><Briefcase size={14} color={THEME.GOLD} /></div>
                <div className="flex flex-col items-start">
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider leading-none mb-0.5">{t.portfolio}</span>
                    <span className="text-xs font-bold text-white leading-none flex items-center gap-1">{displayLabel} <ChevronDown size={10} className="text-slate-500"/></span>
                </div>
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-[#1C1E22] border border-white/10 rounded-xl shadow-2xl z-[9999] overflow-hidden py-1 flex flex-col">
                    <button onClick={handleSelectAll} className={`w-full text-left px-3 py-2.5 text-xs font-bold flex items-center gap-2 ${isAllSelected ? 'bg-white/5 text-[#C8B085]' : 'text-slate-400 hover:bg-white/5'}`}>
                        {isAllSelected ? <CheckSquare size={14} /> : <Square size={14} />} {t.selectAll || 'Select All'}
                    </button>
                    <div className="h-px bg-white/5 my-1" />
                    <div className="max-h-[200px] overflow-y-auto">
                        {portfolios.map(p => {
                            const isSelected = activeIds.includes(p.id);
                            return (
                                <button key={p.id} onClick={() => handleToggle(p.id)} className={`w-full text-left px-3 py-2.5 text-xs font-bold flex items-center justify-between ${isSelected ? 'text-white bg-white/5' : 'text-slate-400 hover:bg-white/5'}`}>
                                    <div className="flex items-center gap-2 truncate">
                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color || DEFAULT_PALETTE[0] }}></div>
                                        <span className="truncate">{p.name}</span>
                                    </div>
                                    {isSelected ? <CheckSquare size={14} color={THEME.BLUE} /> : <Square size={14} />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- FREQUENCY & TIME RANGE ---
export const FrequencySelector = ({ currentFreq, setFreq, lang }: { currentFreq: Frequency, setFreq: (f: Frequency) => void, lang: Lang }) => {
    const [isOpen, setIsOpen] = useState(false);
    const t = I18N[lang] || I18N['zh'];
    const containerRef = useRef<HTMLDivElement>(null);

    return (
        <div className="relative z-10" ref={containerRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="h-[28px] px-2.5 flex items-center gap-1.5 rounded-lg bg-[#0B0C10] border border-white/10 text-slate-400 hover:text-white hover:border-[#C8B085] transition-all text-[10px] font-bold uppercase tracking-wider">
                <ListFilter size={12} />
                <span>{t[`short_${currentFreq}`] || currentFreq.charAt(0).toUpperCase()}</span>
                <ChevronDown size={10} className="text-slate-600" />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-28 bg-[#1C1E22] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                    {FREQUENCIES.map(f => (
                        <button key={f} onClick={() => { setFreq(f); setIsOpen(false); }} className={`w-full text-left px-3 py-2 text-[10px] font-bold flex items-center justify-between transition-colors ${currentFreq === f ? 'text-[#C8B085] bg-white/5' : 'text-slate-400 hover:bg-white/5'}`}>
                            <span>{t[`freq_${f}`]}</span>
                            {currentFreq === f && <Check size={10} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export const TimeRangeSelector = ({ currentRange, setRange, lang, customRangeLabel }: { currentRange: string, setRange: (r: any) => void, lang: Lang, customRangeLabel?: string }) => {
    const t = I18N[lang] || I18N['zh'];
    return (
        <div className="flex bg-[#0B0C10] p-0.5 rounded-lg border border-white/5 flex-1 relative overflow-hidden h-[28px]">
            {TIME_RANGES.map(range => {
                const isSelected = currentRange === range;
                let label = t[`time_${range.toLowerCase()}`];
                if (range === '1M') label = '1M';
                if (range === '3M') label = '3M';
                if (range === 'YTD') label = 'YTD';
                if (range === 'ALL') label = 'All';
                if (range === 'CUSTOM') {
                    label = lang === 'zh' ? '自訂' : 'Set';
                    if (isSelected && customRangeLabel) label = lang === 'zh' ? '自訂' : 'Set'; 
                }
                return (
                    <button key={range} onClick={() => setRange(range)} className={`flex-1 relative z-10 py-0 rounded-[6px] text-[9px] font-bold transition-all duration-200 flex items-center justify-center gap-1 min-w-0 ${isSelected ? `bg-[#2A2824] text-[#C8B085] shadow-sm` : 'text-slate-500 hover:text-slate-300'}`}>
                        {range === 'CUSTOM' && <CalendarIcon size={9} className={isSelected ? "text-[#C8B085]" : "text-slate-600"} />}
                        <span className="truncate leading-none">{label}</span>
                    </button>
                );
            })}
        </div>
    );
};
