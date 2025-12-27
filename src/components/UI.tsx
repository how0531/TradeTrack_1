
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, CheckSquare, Square, Check, ListFilter, Briefcase, Calendar as CalendarIcon, LucideIcon, Plus } from 'lucide-react';
import { THEME, I18N, TIME_RANGES, FREQUENCIES, DEFAULT_PALETTE } from '../constants';
import { Lang, Frequency, Portfolio } from '../types';

// --- VIRTUAL LIST ---
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
        const buffer = 800;
        const startY = Math.max(0, scrollTop - buffer);
        const endY = scrollTop + windowHeight + buffer;
        const visible = [];
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

// --- STAT CARD (SOFT PILL & GRADIENT) ---
export const StatCard = ({ label, value, valueColor = '#E0E0E0' }: { label: string, value: string | number, valueColor?: string }) => (
    <div className="group relative flex flex-col items-center justify-center p-3 rounded-[24px] border border-white/5 bg-white/[0.03] backdrop-blur-xl h-[80px] overflow-hidden transition-all duration-500 hover:scale-[1.05] hover:bg-white/[0.06] hover:shadow-[0_8px_20px_rgba(0,0,0,0.3)]">
        {/* Subtle Gradient Blob */}
        <div className="absolute -top-10 -right-10 w-20 h-20 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors duration-500"></div>
        
        <span className="relative z-10 text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 text-center group-hover:text-slate-300 transition-colors">{label}</span>
        <span className="relative z-10 text-lg font-bold font-barlow-numeric tracking-tight" style={{ color: valueColor }}>{value}</span>
    </div>
);

// --- COLOR PICKER (Updated with customTrigger) ---
export const ColorPicker = ({ value, onChange, align = 'left', customTrigger }: { value: string, onChange: (c: string) => void, align?: 'left' | 'right', customTrigger?: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative h-full flex items-center" ref={containerRef}>
             {customTrigger ? (
                 <div onClick={() => setIsOpen(!isOpen)} className="h-full cursor-pointer">
                     {customTrigger}
                 </div>
             ) : (
                <button 
                    onClick={() => setIsOpen(!isOpen)} 
                    className="w-6 h-6 rounded-full border border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-all hover:scale-110 active:scale-95"
                    style={{ backgroundColor: value }}
                />
             )}
            
            {isOpen && (
                <div 
                    className={`absolute top-full mt-2 p-3 bg-[#1C1E22] border border-white/10 rounded-2xl shadow-2xl z-[60] w-[180px] animate-in fade-in zoom-in-95 duration-200 ${align === 'right' ? 'right-0' : 'left-0'}`}
                >
                    <div className="grid grid-cols-4 gap-2.5">
                        {DEFAULT_PALETTE.map(c => (
                            <button
                                key={c}
                                onClick={() => { onChange(c); setIsOpen(false); }}
                                className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${value === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1C1E22] scale-110' : 'hover:scale-110 hover:ring-1 hover:ring-white/20'}`}
                                style={{ backgroundColor: c }}
                            >
                                {value === c && <Check size={12} className="text-black/50 stroke-[3]" />}
                            </button>
                        ))}
                         <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/10 flex items-center justify-center bg-[#25282C] hover:bg-[#2A2D32] transition-colors group">
                            <Plus size={14} className="text-slate-400 pointer-events-none group-hover:text-white" />
                            <input 
                                type="color" 
                                value={value} 
                                onChange={(e) => onChange(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- SHARED CHIPS UI HELPERS (UPDATED WITH GLASSMORPHISM) ---
const getChipClass = (isActive: boolean) => {
    return `whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border transition-all flex-shrink-0 flex items-center gap-2 select-none active:scale-95 backdrop-blur-md ${
        isActive 
        ? 'bg-[#C8B085]/20 text-[#C8B085] border-[#C8B085]/50 shadow-[0_0_15px_rgba(200,176,133,0.15)]' 
        : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:border-white/20 hover:text-white'
    }`;
};

const ScrollableChipsContainer = ({ children }: { children?: React.ReactNode }) => (
    <div className="w-full overflow-x-auto no-scrollbar mask-gradient touch-pan-x">
        <div className="flex gap-2 pb-2 pr-16">
            {children}
        </div>
    </div>
);

// --- PORTFOLIO CHIPS INPUT ---
export const PortfolioChipsInput = ({ portfolios, value, onChange }: { portfolios: Portfolio[], value: string, onChange: (v: string) => void }) => {
    return (
        <ScrollableChipsContainer>
            {portfolios.map(p => {
                const isActive = value === p.id;
                return (
                    <button 
                        key={p.id} 
                        type="button" 
                        onClick={() => onChange(p.id)} 
                        className={getChipClass(isActive)}
                    >
                        <div className="w-2 h-2 rounded-full shadow-[0_0_6px_currentColor]" style={{ backgroundColor: p.profitColor }}></div>
                        {p.name}
                    </button>
                );
            })}
        </ScrollableChipsContainer>
    );
};

// --- STRATEGY CHIPS INPUT ---
export const StrategyChipsInput = ({ strategies, value, onChange, lang }: { strategies: string[], value: string, onChange: (v: string) => void, lang: Lang }) => {
    const t = I18N[lang] || I18N['zh'];
    return (
        <ScrollableChipsContainer>
            <button 
                type="button" 
                onClick={() => onChange('')} 
                className={getChipClass(value === '')}
            >
                {t.uncategorized}
            </button>
            {strategies.map(s => {
                const parts = s.split('_');
                const main = parts[0];
                // Hide sub-note (suffix) for cleaner UI
                
                return (
                    <button 
                        key={s} 
                        type="button" 
                        onClick={() => onChange(s)} 
                        className={getChipClass(value === s)}
                    >
                        {main}
                    </button>
                );
            })}
        </ScrollableChipsContainer>
    );
};

// --- EMOTION CHIPS INPUT ---
export const EmotionChipsInput = ({ emotions, value, onChange }: { emotions: string[], value: string, onChange: (v: string) => void, lang: Lang }) => {
    return (
        <ScrollableChipsContainer>
            {emotions.map(e => (
                <button 
                    key={e} 
                    type="button" 
                    onClick={() => onChange(value === e ? '' : e)} 
                    className={getChipClass(value === e)}
                >
                    {e}
                </button>
            ))}
        </ScrollableChipsContainer>
    );
};

// --- DROPDOWN (UPDATED WITH GLASSMORPHISM) ---
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
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-xs backdrop-blur-md ${!isAll ? 'bg-[#C8B085]/20 border-[#C8B085]/50 text-[#C8B085] shadow-[0_0_10px_rgba(200,176,133,0.15)]' : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
            >
                <div className="flex items-center gap-2 truncate">
                    {Icon && <Icon size={12} className={!isAll ? 'text-[#C8B085]' : 'text-slate-500'} />}
                    <span className="truncate">{isAll ? defaultLabel : `${selected.length} ${t.selected}`}</span>
                </div>
                <ChevronDown size={14} />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#141619]/60 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden max-h-[200px] flex flex-col">
                     <div className="overflow-y-auto p-1 no-scrollbar">
                        <button onClick={() => { onChange([]); setIsOpen(false); }} className={`w-full text-left px-3 py-2 rounded text-xs font-medium flex items-center gap-2 ${isAll ? 'bg-white/5 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
                            {isAll ? <CheckSquare size={14} color={THEME.BLUE} /> : <Square size={14} />} {defaultLabel}
                        </button>
                        <div className="h-px bg-white/5 my-1" />
                        {options.map(opt => {
                            const isSelected = selected.includes(opt);
                            return (
                                <button key={opt} onClick={() => toggleOption(opt)} className={`w-full text-left px-3 py-2 rounded text-xs flex items-center gap-2 transition-colors ${isSelected ? 'text-white bg-white/5' : 'text-slate-400 hover:bg-white/5'}`}>
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

// --- PORTFOLIO SELECTOR (GLASSMORPHISM) ---
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
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 p-1 pr-2 rounded-lg hover:bg-white/5 transition-all">
                <div className="p-1 rounded bg-[#25282C] border border-white/5"><Briefcase size={14} color={THEME.GOLD} /></div>
                <div className="flex flex-col items-start">
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider leading-none mb-0.5">{t.portfolio}</span>
                    <span className="text-xs font-bold text-white leading-none flex items-center gap-1">{displayLabel} <ChevronDown size={10} className="text-slate-500"/></span>
                </div>
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-[#141619]/60 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl z-[9999] overflow-hidden py-1 flex flex-col">
                    <button onClick={handleSelectAll} className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 ${isAllSelected ? 'bg-white/5 text-[#C8B085]' : 'text-slate-400 hover:bg-white/5'}`}>
                        {isAllSelected ? <CheckSquare size={14} /> : <Square size={14} />} {t.selectAll || 'Select All'}
                    </button>
                    <div className="h-px bg-white/5 my-1" />
                    <div className="max-h-[200px] overflow-y-auto no-scrollbar">
                        {portfolios.map(p => {
                            const isSelected = activeIds.includes(p.id);
                            return (
                                <button key={p.id} onClick={() => handleToggle(p.id)} className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between ${isSelected ? 'text-white bg-white/5' : 'text-slate-400 hover:bg-white/5'}`}>
                                    <div className="flex items-center gap-2 truncate">
                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.profitColor || DEFAULT_PALETTE[0] }}></div>
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
            <button onClick={() => setIsOpen(!isOpen)} className="h-[28px] px-2 flex items-center gap-1 rounded-lg bg-transparent border border-white/10 text-slate-400 hover:text-white transition-all text-[10px] font-bold uppercase hover:border-white/20">
                <ListFilter size={12} />
                <span>{t[`short_${currentFreq}`] || currentFreq.charAt(0).toUpperCase()}</span>
                <ChevronDown size={10} className="text-slate-600" />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-32 bg-[#141619]/90 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden py-1">
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
        <div className="flex bg-[#111] p-0.5 rounded-lg border border-white/5 flex-1 relative overflow-hidden h-[28px]">
            {TIME_RANGES.map(range => {
                const isSelected = currentRange === range;
                let label = t[`time_${range.toLowerCase()}`];
                if (range === '1M') label = '1M';
                if (range === '3M') label = '3M';
                if (range === 'YTD') label = 'YTD';
                if (range === 'ALL') label = 'All';
                if (range === 'CUSTOM') {
                    label = lang === 'zh' ? '自訂' : 'Set';
                    if (isSelected && customRangeLabel) label = customRangeLabel; 
                }
                return (
                    <button key={range} onClick={() => setRange(range)} className={`flex-1 relative z-10 py-0 rounded text-[9px] font-bold transition-all duration-300 flex items-center justify-center gap-1 min-w-0 ${isSelected ? `bg-[#25282C] text-[#C8B085] shadow-sm` : 'text-slate-500 hover:text-slate-300'}`}>
                        {range === 'CUSTOM' && <CalendarIcon size={9} className={isSelected ? "text-[#C8B085]" : "text-slate-600"} />}
                        <span className="truncate leading-none">{label}</span>
                    </button>
                );
            })}
        </div>
    );
};
