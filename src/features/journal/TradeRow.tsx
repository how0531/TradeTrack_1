
import React from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import { Trade, Portfolio, Lang } from '../../types';
import { I18N } from '../../constants';
import { formatCurrency } from '../../utils/format';
import { Badge } from '../../components/ui/Badge';

interface TradeRowProps {
    trade: Trade;
    portfolio?: Portfolio;
    onEdit: (t: Trade) => void;
    onDelete: (id: string) => void;
    lang: Lang;
    hideAmounts: boolean;
}

export const TradeRow = ({ trade, portfolio, onEdit, onDelete, lang, hideAmounts }: TradeRowProps) => {
    const t = I18N[lang] || I18N['zh'];
    const isProfit = trade.pnl >= 0;
    
    // Parse Date (MM/DD)
    const dateObj = new Date(trade.date);
    const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

    return (
        <div 
            onClick={() => onEdit(trade)}
            className="group relative grid grid-cols-[4px_50px_1fr_auto] gap-3 items-center p-3 rounded-xl border border-white/5 bg-[#1A1C20] hover:bg-[#202328] active:scale-[0.98] transition-all cursor-pointer mb-2 overflow-hidden"
        >
            {/* Col 1: Identity Spine */}
            <div className="h-full w-full rounded-full" style={{ backgroundColor: portfolio?.profitColor || '#555' }}></div>

            {/* Col 2: Date */}
            <div className="flex flex-col items-center justify-center">
                <span className="text-xs font-bold font-barlow-numeric text-slate-400 leading-none">{dateStr}</span>
            </div>

            {/* Col 3: Info (Strategy, Emotion, Note) - CRITICAL: min-w-0 for truncation */}
            <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2">
                     <span className={`text-xs font-bold truncate ${isProfit ? 'text-slate-200' : 'text-slate-300'}`}>
                        {trade.strategy || t.uncategorized}
                     </span>
                     {trade.emotion && (
                        <Badge label={`#${trade.emotion}`} type="emotion" className="shrink-0" />
                     )}
                </div>
                {trade.note && (
                    <div className="text-[10px] text-slate-500 truncate opacity-60 font-mono">
                        {trade.note}
                    </div>
                )}
            </div>

            {/* Col 4: PnL & Hover Actions */}
            <div className="text-right relative min-w-[80px]">
                 {/* PnL Display (Default) */}
                 <div className="group-hover:opacity-0 transition-opacity duration-200 flex flex-col items-end">
                    <span className={`text-sm font-bold font-barlow-numeric ${isProfit ? 'text-[#D05A5A]' : 'text-[#5B9A8B]'}`}>
                        {isProfit ? '+' : ''}{formatCurrency(trade.pnl, hideAmounts)}
                    </span>
                 </div>

                 {/* Actions (Hover) */}
                 <div className="absolute inset-0 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                     <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(trade.id); }}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                    >
                        <Trash2 size={14} />
                    </button>
                    <button
                        className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <Edit2 size={14} />
                    </button>
                 </div>
            </div>
        </div>
    );
};
