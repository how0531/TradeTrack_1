import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
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
    return (
        <div className="flex items-center gap-1">
            {portfolios.map((p: any) => {
                const isActive = activeIds.includes(p.id);
                return (
                    <button
                        key={p.id}
                        onClick={() => {
                            if (isActive && activeIds.length > 1) {
                                onChange(activeIds.filter((id: string) => id !== p.id));
                            } else if (!isActive) {
                                onChange([...activeIds, p.id]);
                            }
                        }}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${isActive ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-100'}`}
                        style={{ backgroundColor: p.profitColor }}
                        title={p.name}
                    />
                );
            })}
        </div>
    );
};

export const FrequencySelector = ({ currentFreq, setFreq, lang }: any) => {
    const t = I18N[lang] || I18N['zh'];
    const options = FREQUENCIES;
    return (
        <div className="flex bg-[#25282C] rounded-lg p-0.5 border border-white/5">
            {options.map((f: string) => (
                <button
                    key={f}
                    onClick={() => setFreq(f)}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${currentFreq === f ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
                >
                    {t[`short_${f}`] || f.charAt(0).toUpperCase()}
                </button>
            ))}
        </div>
    );
};

export const TimeRangeSelector = ({ currentRange, setRange, lang, customRangeLabel }: any) => {
    const t = I18N[lang] || I18N['zh'];
    return (
        <div className="flex bg-[#25282C] rounded-lg p-0.5 border border-white/5">
            {TIME_RANGES.map((r: string) => (
                <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${currentRange === r ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
                >
                    {r === 'CUSTOM' && customRangeLabel ? customRangeLabel : (t[`time_${r.toLowerCase()}`] ? (t[`time_${r.toLowerCase()}`].includes(' ') ? r : t[`time_${r.toLowerCase()}`]) : r)}
                </button>
            ))}
        </div>
    );
};

export const MultiSelectDropdown = ({ options, selected, onChange, icon: Icon, defaultLabel, lang }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="relative z-50">
            <button onClick={() => setIsOpen(!isOpen)} className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all ${selected.length > 0 ? 'bg-[#C8B085]/10 border-[#C8B085]/30 text-[#C8B085]' : 'bg-[#25282C] border-white/5 text-slate-400'}`}>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase">
                    {Icon && <Icon size={12} />}
                    <span>{selected.length > 0 ? `${selected.length} Selected` : defaultLabel}</span>
                </div>
                <ChevronDown size={12} />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-[#1A1C20] border border-white/10 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                    {options.map((opt: string) => (
                        <div 
                            key={opt}
                            onClick={() => {
                                if (selected.includes(opt)) onChange(selected.filter((s: string) => s !== opt));
                                else onChange([...selected, opt]);
                            }}
                            className={`p-2 text-[10px] font-medium cursor-pointer flex justify-between items-center hover:bg-white/5 ${selected.includes(opt) ? 'text-[#C8B085]' : 'text-slate-300'}`}
                        >
                            {opt}
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
