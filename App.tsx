
import React, { useState, useMemo } from 'react';
import { TrendingUp, Target, Activity, Zap, TrendingDown, List, Eye, EyeOff, Settings, Plus, ShieldAlert, AlertCircle, ChevronRight, Filter, BrainCircuit } from 'lucide-react';
import { ComposedChart, Line, Bar, BarChart, ResponsiveContainer, Tooltip, YAxis, ReferenceLine } from 'recharts';

// Modules & Hooks
import { THEME, I18N } from './constants';
import { Trade, ViewMode, TimeRange, Frequency, StrategyStat, Lang } from './types';
import { getLocalDateStr, formatCurrency, formatDecimal, formatPnlK, getPnlColor } from './utils';
import { useAuth, useTradeData, useMetrics, useLocalStorage } from './hooks';

// Components
import { StatCard, PortfolioSelector, FrequencySelector, TimeRangeSelector, MultiSelectDropdown } from './components/UI';
import { CalendarView, LogsView, SettingsView } from './components/Views';
import { TradeModal, StrategyDetailModal, CustomDateRangeModal } from './components/Modals';
import { DashboardSkeleton } from './components/Skeletons';

// Custom Tooltip
const CustomTooltip = ({ active, payload, hideAmounts, lang, portfolios, lossColor }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const t = I18N[lang] || I18N['zh'];
        const systemKeys = ['date', 'equity', 'peak', 'pnl', 'isNewPeak', 'ddAmt', 'ddPct', 'fullDate', 'label'];
        const activePidsInPoint = Object.keys(data).filter(key => !systemKeys.includes(key) && !key.endsWith('_pos') && !key.endsWith('_neg') && data[key] !== 0);

        return (
            <div className="p-3 rounded-xl border border-white/10 shadow-2xl bg-[#141619] text-xs min-w-[160px] backdrop-blur-md z-50">
                <div className="text-slate-400 mb-2 font-medium flex items-center gap-2 border-b border-white/5 pb-2">{data.label || data.date}</div>
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center gap-4"><span className="text-slate-200 font-bold">{t.currentEquity}</span><span className="font-barlow-numeric text-white font-bold text-sm">{formatCurrency(data.equity, hideAmounts)}</span></div>
                    {activePidsInPoint.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                            {activePidsInPoint.map((pid) => {
                                const portfolio = portfolios.find((p: any) => p.id === pid);
                                const isProfit = data[pid] >= 0;
                                return (
                                    <div key={pid} className="flex justify-between items-center">
                                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: portfolio?.color || THEME.BLUE }}></div><span className="text-slate-400 text-[10px]">{portfolio?.name || pid}</span></div>
                                        <span className="font-barlow-numeric text-[10px]" style={{ color: isProfit ? '#F87171' : lossColor }}>{isProfit ? '+' : ''}{formatCurrency(data[pid], hideAmounts)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-white/5">
                        {data.isNewPeak ? <div className="flex items-center justify-center gap-1.5 text-[#C8B085] font-bold"><TrendingUp size={12} /><span>{t.newPeak}</span></div> : <div className="flex justify-between items-center gap-4"><span className="text-slate-500">{t.drawdown}</span><span className="font-barlow-numeric font-medium" style={{ color: THEME.GREEN }}>{formatDecimal(data.ddPct)}%</span></div>}
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const CustomPeakDot = ({ cx, cy, payload }: any) => {
    if (payload?.isNewPeak) return <g><circle cx={cx} cy={cy} r={3} fill={THEME.GOLD} stroke={THEME.BG_DARK} strokeWidth={1.5} /><circle cx={cx} cy={cy} r={6} fill={THEME.GOLD} opacity={0.2} /></g>;
    return null;
};

export default function App() {
    // --- HOOKS ---
    const { user, status: authStatus, db, config, login, logout } = useAuth();
    const { 
        trades, strategies, emotions, portfolios, 
        activePortfolioIds, setActivePortfolioIds, 
        lossColor, setLossColor,
        actions 
    } = useTradeData(user, authStatus, db, config);

    // --- UI State ---
    const [view, setView] = useState<ViewMode>('stats');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [form, setForm] = useState<Trade>({ id: '', pnl: 0, date: getLocalDateStr(), amount: '', type: 'profit', strategy: '', note: '', emotion: '', image: '', portfolioId: '' });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [detailStrategy, setDetailStrategy] = useState<string | null>(null);
    const [filterStrategy, setFilterStrategy] = useState<string[]>([]);
    const [filterEmotion, setFilterEmotion] = useState<string[]>([]);
    const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
    const [frequency, setFrequency] = useState<Frequency>('daily');
    const [customRange, setCustomRange] = useState<{start: string | null, end: string | null}>({ start: null, end: null });
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    // --- Local Settings ---
    const [lang, setLang] = useLocalStorage<Lang>('app_lang', 'zh');
    const [hideAmounts, setHideAmounts] = useLocalStorage<boolean>('app_hide_amounts', false);
    const [ddThreshold, setDdThreshold] = useLocalStorage<number>('app_dd_threshold', 20);

    const t = I18N[lang] || I18N['zh'];

    // --- Metrics ---
    const { filteredTrades, metrics, streaks, dailyPnlMap } = useMetrics(
        trades, portfolios, activePortfolioIds, frequency, lang, 
        customRange, filterStrategy, filterEmotion
    );

    // Strategy Modal Metrics (computed on fly)
    const strategyMetrics = useMemo(() => {
        if (!detailStrategy) return null;
        // Simple mock of metrics calculation for single strategy using same hook logic but isolated
        const sTrades = trades.filter(t => t.strategy === detailStrategy).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        // We reuse the useMetrics logic indirectly by calling calculateMetrics utility directly here for efficiency
        const { calculateMetrics } = require('./utils'); // Dynamic require or import usage
        return calculateMetrics(sTrades, portfolios, activePortfolioIds, 'daily', lang, null, null);
    }, [detailStrategy, trades, portfolios, activePortfolioIds, lang]);

    // Calculate Monthly Stats
    const monthlyStats = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const tradesInMonth = filteredTrades.filter(t => {
            if (!t.date) return false;
            const [tY, tM] = t.date.split('-').map(Number);
            return tY === year && (tM - 1) === month;
        });
        
        const pnl = tradesInMonth.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
        const wins = tradesInMonth.filter(t => (Number(t.pnl) || 0) > 0).length;
        const count = tradesInMonth.length;
        const winRate = count > 0 ? (wins / count) * 100 : 0;
        
        return { pnl, count, winRate };
    }, [filteredTrades, currentMonth]);

    // --- Loading State ---
    if (authStatus === 'loading') return <DashboardSkeleton />;

    return (
        <div className="min-h-screen bg-[#0B0C10] text-[#E0E0E0] font-sans pb-20 overflow-x-hidden">
            <div className="w-full max-w-md pb-4 rounded-b-[24px] sticky top-0 z-20 bg-[#141619] border-b border-white/5">
                <div className="px-5 pt-5 pb-0">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2"><div className="p-1 rounded bg-[#25282C]"><Activity size={14} color={THEME.BLUE} /></div><span className="font-medium text-xs tracking-wider text-slate-400">TradeTrack</span></div>
                        <div className="flex items-center gap-3">
                            <PortfolioSelector portfolios={portfolios} activeIds={activePortfolioIds} onChange={setActivePortfolioIds} lang={lang} />
                            <button onClick={() => setHideAmounts(!hideAmounts)} className="text-slate-500 hover:text-white transition-colors p-1">{hideAmounts ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                            <button onClick={() => setView('settings')} className="text-slate-500 hover:text-white transition-colors"><Settings size={18} /></button>
                        </div>
                    </div>
                    
                    <div className="flex flex-col mb-4">
                        <div className="flex justify-between items-baseline mb-1">
                            <h1 className="text-3xl font-medium font-barlow-numeric text-white tracking-tight">{formatCurrency(metrics.currentEq, hideAmounts)}</h1>
                            <div className="text-right">
                                {metrics.isPeak ? <div className="flex items-center justify-end gap-1 text-[#C8B085]"><TrendingUp size={16} /><span className="text-lg font-bold font-barlow-numeric">{t.newPeak}</span></div> : <div className="text-xl font-bold font-barlow-numeric" style={{color: THEME.GREEN}}>{formatDecimal(metrics.currentDD)}%</div>}
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t.currentDD}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-barlow-numeric text-sm font-bold" style={{ color: metrics.eqChange >= 0 ? THEME.RED : THEME.GREEN }}>{metrics.eqChange >= 0 ? '+' : ''}{formatCurrency(metrics.eqChange, hideAmounts)}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-[#25282C] text-slate-400 font-barlow-numeric">{metrics.eqChange >= 0 ? '+' : ''}{formatDecimal(metrics.eqChangePct)}%</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                        <FrequencySelector currentFreq={frequency} setFreq={setFrequency} lang={lang} />
                        <TimeRangeSelector currentRange={timeRange} setRange={(r: any) => { if(r === 'CUSTOM') setIsDatePickerOpen(true); else { setTimeRange(r); setCustomRange({start: null, end: null}); }}} lang={lang} customRangeLabel={customRange.start ? `${customRange.start.slice(5)}...` : undefined} />
                    </div>

                    <div className="space-y-0">
                        <div className="h-[100px] w-full relative -mx-2" style={{ minWidth: 0 }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <ComposedChart data={metrics.curve}>
                                    <defs>
                                        <linearGradient id="gradEq" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={THEME.BLUE} stopOpacity={0.3}/><stop offset="100%" stopColor={THEME.BLUE} stopOpacity={0}/></linearGradient>
                                        {activePortfolioIds.map((pid) => { const p = portfolios.find(x => x.id === pid); return <linearGradient key={`gradP-${pid}`} id={`gradP-${pid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={p?.color || THEME.BLUE} stopOpacity={0.8}/><stop offset="100%" stopColor={p?.color || THEME.BLUE} stopOpacity={0.1}/></linearGradient> })}
                                        <linearGradient id="gradLoss" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={lossColor} stopOpacity={0.1} />
                                            <stop offset="100%" stopColor={lossColor} stopOpacity={0.8} />
                                        </linearGradient>
                                    </defs>
                                    <Tooltip content={<CustomTooltip hideAmounts={hideAmounts} lang={lang} portfolios={portfolios} lossColor={lossColor} />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                                    <ReferenceLine y={0} yAxisId="pnl" stroke="#FFFFFF" strokeOpacity={0.1} />
                                    {activePortfolioIds.map((pid) => (
                                        <React.Fragment key={pid}>
                                            <Bar dataKey={`${pid}_pos`} stackId="a" fill={`url(#gradP-${pid})`} radius={[2, 2, 0, 0]} barSize={8} yAxisId="pnl" />
                                            <Bar dataKey={`${pid}_neg`} stackId="a" fill="url(#gradLoss)" radius={[0, 0, 2, 2]} barSize={8} yAxisId="pnl" />
                                        </React.Fragment>
                                    ))}
                                    <Line type="monotone" dataKey="equity" stroke={THEME.BLUE} strokeWidth={2} dot={<CustomPeakDot />} activeDot={{ r: 4, strokeWidth: 0 }} yAxisId="equity" />
                                    <YAxis yAxisId="pnl" hide domain={['auto', 'auto']} /><YAxis yAxisId="equity" orientation="right" hide domain={['auto', 'auto']} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="h-[40px] w-full relative opacity-60 -mx-2 -mt-1" style={{ minWidth: 0 }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <BarChart data={metrics.drawdown}>
                                    <defs><linearGradient id="gradDDMain" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={THEME.DD_GRADIENT_TOP} stopOpacity={1}/><stop offset="100%" stopColor={THEME.DD_GRADIENT_BOTTOM} stopOpacity={0.7}/></linearGradient></defs>
                                    <YAxis hide domain={['dataMin', 0]} />
                                    <Tooltip cursor={{fill: 'transparent'}} content={() => null} />
                                    <Bar dataKey="ddPct" radius={[0, 0, 2, 2]} fill="url(#gradDDMain)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-md px-4 py-5 flex-1 space-y-5 mx-auto">
                {view === 'stats' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <StatCard icon={<Activity size={14} color={THEME.BLUE}/>} label={t.winRate} value={`${formatDecimal(metrics.winRate)}%`} />
                            <StatCard icon={<Target size={14} color={THEME.GOLD}/>} label={t.profitFactor} value={formatDecimal(metrics.pf)} />
                            <div className="col-span-2 p-4 rounded-xl flex justify-between items-center relative overflow-hidden bg-[#141619] border border-white/5">
                               <div><div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">{t.avgWin}</div><div className="text-lg font-medium font-barlow-numeric" style={{ color: THEME.RED }}>+{formatCurrency(metrics.avgWin, hideAmounts)}</div></div>
                               <div className="h-6 w-[1px] bg-white/5"></div>
                               <div className="text-right"><div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">{t.avgLoss}</div><div className="text-lg font-medium font-barlow-numeric" style={{ color: lossColor }}>-{formatCurrency(Math.abs(metrics.avgLoss), hideAmounts)}</div></div>
                            </div>
                            <StatCard icon={<TrendingDown size={14} color={THEME.GREEN}/>} label={t.maxDD} value={`${formatDecimal(metrics.maxDD)}%`} valueColor={THEME.GREEN} />
                            <StatCard icon={<Zap size={14} color={THEME.BLUE}/>} label={t.sharpe} value={formatDecimal(metrics.sharpe)} />
                        </div>
                        
                        <div className="p-4 rounded-xl space-y-3 bg-[#141619] border border-white/5">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-2"><List size={12}/> {t.strategies}</h3>
                            <div className="space-y-2">
                               {Object.entries(metrics.stratStats).map(([name, item]) => {
                                   const s = item as StrategyStat;
                                   const ddAbs = Math.abs(s.curDDPct);
                                   const isDanger = ddAbs >= ddThreshold;
                                   const isWarning = ddAbs >= Math.max(0, ddThreshold - 5) && ddAbs < ddThreshold;
                                   let style = { backgroundColor: '#1C1E22', border: '1px solid rgba(255,255,255,0.05)' };
                                   if (isDanger) style = { backgroundColor: 'rgba(91,154,139,0.1)', border: `1px solid ${THEME.GREEN}` };
                                   else if (isWarning) style = { backgroundColor: 'rgba(44,95,84,0.1)', border: `1px solid ${THEME.GREEN_DARK}` };
                                   
                                   return (
                                       <div key={name} onClick={() => setDetailStrategy(name)} className="p-3 rounded-lg flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] relative overflow-hidden group" style={style}>
                                           {isDanger && <div className="absolute top-0 right-0 p-1"><ShieldAlert size={12} color={THEME.GREEN} className="opacity-90"/></div>}
                                           <div><div className="text-xs font-bold text-slate-300 mb-0.5 flex items-center gap-1.5">{name}</div><div className="text-[10px] text-slate-500">WR {formatDecimal(s.winRate)}% • {s.trades} T</div></div>
                                           <div className="text-right flex items-center gap-2">
                                               <div><div className="text-sm font-bold font-barlow-numeric" style={{ color: getPnlColor(s.pnl) }}>{formatPnlK(s.pnl, hideAmounts)}</div><div className="text-[10px] font-barlow-numeric" style={{ color: isDanger ? THEME.GREEN : (isWarning ? THEME.GREEN : '#757575') }}>DD {formatDecimal(s.curDDPct)}%</div></div><ChevronRight size={14} className="text-slate-700 group-hover:text-white transition-colors" />
                                           </div>
                                       </div>
                                   );
                               })}
                               {Object.keys(metrics.stratStats).length === 0 && <div className="text-center py-4 text-slate-700 text-xs">{t.noData}</div>}
                            </div>
                        </div>
                    </div>
                )}
                
                {view === 'calendar' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <MultiSelectDropdown options={strategies} selected={filterStrategy} onChange={setFilterStrategy} icon={Filter} defaultLabel={t.allStrategies} lang={lang} />
                            <MultiSelectDropdown options={emotions} selected={filterEmotion} onChange={setFilterEmotion} icon={BrainCircuit} defaultLabel={t.allEmotions} lang={lang} />
                        </div>
                        <CalendarView dailyPnlMap={dailyPnlMap} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} onDateClick={(d: string) => { setForm({ id: '', pnl: 0, date: d, amount: '', type: 'profit', strategy: '', note: '', emotion: '', image: '', portfolioId: activePortfolioIds[0] || '' }); setEditingId(null); setIsModalOpen(true); }} monthlyStats={monthlyStats.count > 0 ? monthlyStats : { pnl: 0, count: 0, winRate: 0 }} hideAmounts={hideAmounts} lang={lang} streaks={streaks} strategies={strategies} emotions={emotions} filterStrategy={filterStrategy} setFilterStrategy={setFilterStrategy} filterEmotion={filterEmotion} setFilterEmotion={setFilterEmotion} />
                    </div>
                )}
                
                {view === 'logs' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="sticky top-0 bg-[#0B0C10] pt-1 z-10 pb-2">
                           <div className="grid grid-cols-2 gap-2 mb-2">
                               <MultiSelectDropdown options={strategies} selected={filterStrategy} onChange={setFilterStrategy} icon={Filter} defaultLabel={t.allStrategies} lang={lang} />
                               <MultiSelectDropdown options={emotions} selected={filterEmotion} onChange={setFilterEmotion} icon={BrainCircuit} defaultLabel={t.allEmotions} lang={lang} />
                           </div>
                        </div>
                        <LogsView 
                            trades={filteredTrades} 
                            lang={lang} 
                            hideAmounts={hideAmounts} 
                            lossColor={lossColor}
                            onEdit={(t: Trade) => { setForm({...t, amount: String(Math.abs(t.pnl)), type: t.pnl >= 0 ? 'profit' : 'loss', portfolioId: t.portfolioId || ''}); setEditingId(t.id); setIsModalOpen(true); }} 
                            onDelete={(id: string) => { if(window.confirm(t.deleteConfirm)) actions.deleteTrade(id); }} 
                        />
                    </div>
                )}

                {view === 'settings' && (
                    <SettingsView 
                        lang={lang} setLang={setLang} trades={trades} actions={actions} 
                        ddThreshold={ddThreshold} setDdThreshold={setDdThreshold} 
                        lossColor={lossColor} setLossColor={setLossColor}
                        strategies={strategies} emotions={emotions} 
                        portfolios={portfolios} activePortfolioIds={activePortfolioIds} setActivePortfolioIds={setActivePortfolioIds} 
                        onBack={() => setView('stats')} currentUser={user} onLogin={login} onLogout={logout}
                    />
                )}
            </div>

            {/* Modals */}
            <TradeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} form={form} setForm={setForm} onSubmit={(e: React.FormEvent) => { e.preventDefault(); actions.saveTrade({ id: form.id, date: form.date, pnl: form.type === 'profit' ? Math.abs(parseFloat(form.amount || '0')) : -Math.abs(parseFloat(form.amount || '0')), strategy: form.strategy, note: form.note, emotion: form.emotion, image: form.image, portfolioId: form.portfolioId }, editingId); setIsModalOpen(false); }} isEditing={!!editingId} strategies={strategies} emotions={emotions} portfolios={portfolios} lang={lang} />
            <StrategyDetailModal strategy={detailStrategy} metrics={strategyMetrics ? {...strategyMetrics, netProfit: strategyMetrics.currentEq} : null} onClose={() => setDetailStrategy(null)} lang={lang} hideAmounts={hideAmounts} ddThreshold={ddThreshold} />
            <CustomDateRangeModal isOpen={isDatePickerOpen} onClose={() => setIsDatePickerOpen(false)} onApply={(s: string, e: string) => { setCustomRange({ start: s, end: e }); setTimeRange('CUSTOM'); setIsDatePickerOpen(false); }} initialRange={customRange} lang={lang} />

            {!isModalOpen && !detailStrategy && !isDatePickerOpen && view !== 'settings' && (
                <button onClick={() => { setEditingId(null); setForm({ id: '', pnl: 0, date: getLocalDateStr(), amount: '', type: 'profit', strategy: '', note: '', emotion: '', image: '', portfolioId: activePortfolioIds[0] || '' }); setIsModalOpen(true); }} className="fixed bottom-24 right-6 w-14 h-14 rounded-full z-40 flex items-center justify-center transition-all duration-500 hover:scale-105 active:scale-95 group shadow-lg shadow-blue-900/20 bg-gradient-to-br from-[#526D82] to-[#1e293b] border border-white/20">
                    <Plus size={28} className="text-white drop-shadow-md transition-transform duration-500 group-hover:rotate-90" strokeWidth={2} />
                </button>
            )}

            <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/5 bg-[#0B0C10]/80 backdrop-blur-md pb-[env(safe-area-inset-bottom,10px)] pt-2">
                <div className="flex justify-center items-center h-11 gap-6 max-w-md mx-auto">
                    {[{ id: 'stats', label: t.stats }, { id: 'calendar', label: t.journal }, { id: 'logs', label: t.logs }].map(tab => (
                        <button key={tab.id} onClick={() => setView(tab.id as any)} className={`px-5 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all duration-300 border ${view === tab.id ? 'bg-[#C8B085]/10 border-[#C8B085]/40 text-[#C8B085] shadow-[0_0_10px_rgba(200,176,133,0.1)]' : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'}`}>{tab.label}</button>
                    ))}
                </div>
            </div>
        </div>
    );
}