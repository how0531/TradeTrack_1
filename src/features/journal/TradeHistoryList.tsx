
import React from 'react';
import { Scroll } from 'lucide-react';
import { Trade, Portfolio, Lang } from '../../types';
import { I18N } from '../../constants';
import { TradeRow } from './TradeRow';

interface TradeHistoryListProps {
    trades: Trade[];
    portfolios: Portfolio[];
    onEdit: (t: Trade) => void;
    onDelete: (id: string) => void;
    lang: Lang;
    hideAmounts: boolean;
}

export const TradeHistoryList = ({ trades, portfolios, onEdit, onDelete, lang, hideAmounts }: TradeHistoryListProps) => {
    const t = I18N[lang] || I18N['zh'];

    if (!trades || trades.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-600 space-y-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center"><Scroll size={24} opacity={0.5}/></div>
                <div className="text-center">
                    <h3 className="text-sm font-bold text-slate-400 mb-1">{t.emptyStateTitle}</h3>
                    <p className="text-xs max-w-[200px] leading-relaxed opacity-60">{t.emptyStateDesc}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-1 pb-20 relative h-full overflow-y-auto px-4 sm:px-0">
            {trades.map((trade) => (
                <TradeRow 
                    key={trade.id} 
                    trade={trade} 
                    portfolio={portfolios.find(p => p.id === trade.portfolioId)}
                    onEdit={onEdit} 
                    onDelete={onDelete} 
                    lang={lang} 
                    hideAmounts={hideAmounts} 
                />
            ))}
        </div>
    );
};
