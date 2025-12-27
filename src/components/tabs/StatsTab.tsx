
import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { TrendingUp, List, BarChart2 } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ScatterChart, Scatter, ZAxis, Cell, LabelList, BarChart } from 'recharts';
import { StatCard } from '../UI';
import { StrategyListView } from '../../features/analytics/StrategyListView';
import { THEME, I18N } from '../../constants';
import { getPnlColor, formatCurrency, formatDecimal, formatChartAxisDate } from '../../utils/format';
import { Metrics, Portfolio, Lang, StrategyStat, Frequency } from '../../types';

interface StatsCommonProps {
    metrics: Metrics;
    lang: Lang;
    hideAmounts: boolean;
}

interface StatsChartProps extends StatsCommonProps {
    portfolios: Portfolio[];
    activePortfolioIds: string[];
    frequency: Frequency;
    chartHeight: number;
    setChartHeight: (h: number) => void;
}

interface StatsContentProps extends StatsCommonProps {
    stratView: 'list' | 'chart';
    setStratView: (v: 'list' | 'chart') => void;
    detailStrategy: string | null;
    setDetailStrategy: (s: string | null) => void;
    hasActiveFilters: boolean;
    setFilterStrategy: (s: string[]) => void;
    setFilterEmotion: (e: string[]) => void;
}

// ... Tooltips and Dot components (same as before) ...
const CustomTooltip = ({ active, payload, hideAmounts, lang, portfolios }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const t = I18N[lang] || I18N['zh'];
        const systemKeys = ['date', 'equity', 'peak', 'pnl', 'isNewPeak', 'ddAmt', 'ddPct', 'fullDate', 'label', 'cumulativePnl', 'timestamp'];
        const activePidsInPoint = Object.keys(data).filter(key => !systemKeys.includes(key) && !key.endsWith('_pos') && !key.endsWith('_neg') && data[key] !== 0);
        return (
            <div className="p-3 rounded-xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] bg-[#1A1C20]/80 backdrop-blur-xl text-xs min-w-[160px] z-50">
                <div className="text-slate-300 mb-2 font-medium flex items-center gap-2 border-b border-white/10 pb-2">{data.label || data.date}</div>
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center gap-4"><span className="text-slate-300 font-bold">{t.currentEquity}</span><span className="font-barlow-numeric text-white font-bold text-sm">{formatCurrency(data.equity, hideAmounts)}</span></div>
                    {activePidsInPoint.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                            {activePidsInPoint.map((pid) => {
                                const portfolio = portfolios.find((p: any) => p.id === pid);
                                const isProfit = data[pid] >= 0;
                                const color = isProfit ? (portfolio?.profitColor || THEME.RED) : (portfolio?.lossColor || THEME.DEFAULT_LOSS);
                                return (
                                    <div key={pid} className="flex justify-between items-center">
                                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div><span className="text-slate-300 text-[10px]">{portfolio?.name || pid}</span></div>
                                        <span className="font-barlow-numeric text-[10px]" style={{ color }}>{isProfit ? '+' : ''}{formatCurrency(data[pid], hideAmounts)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-white/10">
                        {data.isNewPeak ? <div className="flex items-center justify-center gap-1.5 text-[#C8B085] font-bold"><TrendingUp size={12} /><span>{t.newPeak}</span></div> : <div className="flex justify-between items-center gap-4"><span className="text-slate-400">{t.drawdown}</span><span className="font-barlow-numeric font-medium" style={{ color: THEME.GREEN }}>{formatDecimal(data.ddPct)}%</span></div>}
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const BubbleTooltip = ({ active, payload, hideAmounts, lang }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="p-3 rounded-xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] bg-[#1A1C20]/80 backdrop-blur-xl text-xs z-50 pointer-events-none">
                 <div className="text-slate-300 mb-2 font-bold flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center bg-white/10 text-[9px] font-mono">{data.id}</span>
                    {data.name}
                 </div>
                 <div className="space-y-1">
                    <div className="flex justify-between gap-4"><span className="text-slate-400">Win Rate</span><span className="text-white font-mono">{formatDecimal(data.winRate)}%</span></div>
                    <div className="flex justify-between gap-4"><span className="text-slate-400">Risk/Reward</span><span className="text-white font-mono">{formatDecimal(data.riskReward)}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-slate-400">Trades</span><span className="text-white font-mono">{data.trades}</span></div>
                    <div className="flex justify-between gap-4 pt-1 border-t border-white/5 mt-1"><span className="text-slate-400">Net PnL</span><span className="font-mono font-bold" style={{color: getPnlColor(data.pnl)}}>{formatCurrency(data.pnl, hideAmounts)}</span></div>
                 </div>
            </div>
        );
    }
    return null;
};

const CustomPeakDot = ({ cx, cy, payload, dataLength }: any) => {
    if (!payload?.isNewPeak) return null;
    let r = 5;
    if (dataLength > 200) r = 2;
    else if (dataLength > 100) r = 3;
    else if (dataLength > 50) r = 4;
    return <circle cx={cx} cy={cy} r={r} fill="#DEB06C" stroke="none" />;
};

// --- CHART COMPONENT ---
export const StatsChart = ({
    metrics, portfolios, activePortfolioIds, frequency, lang, hideAmounts, chartHeight, setChartHeight
}: StatsChartProps) => {
    const t = I18N[lang] || I18N['zh'];
    const lastHapticIndex = useRef<number>(-1);
    
    // --- RESIZING LOGIC ---
    const isResizing = useRef(false);
    const startY = useRef(0);
    const startHeight = useRef(0);

    const startResize = useCallback((clientY: number) => {
        isResizing.current = true;
        startY.current = clientY;
        startHeight.current = chartHeight;
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'row-resize';
    }, [chartHeight]);

    const onMouseDown = (e: React.MouseEvent) => startResize(e.clientY);
    const onTouchStart = (e: React.TouchEvent) => startResize(e.touches[0].clientY);

    useEffect(() => {
        const onMove = (clientY: number) => {
            if (!isResizing.current) return;
            const deltaY = clientY - startY.current;
            const newHeight = Math.min(Math.max(startHeight.current + deltaY, 150), 500); 
            setChartHeight(newHeight);
        };
        const onUp = () => { isResizing.current = false; document.body.style.userSelect = ''; document.body.style.cursor = ''; };
        const onMouseMove = (e: MouseEvent) => onMove(e.clientY);
        const onTouchMove = (e: TouchEvent) => onMove(e.touches[0].clientY);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchmove', onTouchMove);
        window.addEventListener('touchend', onUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onUp);
        };
    }, [setChartHeight]);

    const handleChartMouseMove = (state: any) => {
        if (state && state.activeTooltipIndex !== undefined) {
            if (state.activeTooltipIndex !== lastHapticIndex.current) {
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(5);
                lastHapticIndex.current = state.activeTooltipIndex;
            }
        }
    };

    const { barSize, barRadius } = useMemo(() => {
        switch (frequency) {
            case 'weekly': return { barSize: 12, barRadius: [3, 3, 0, 0] as [number, number, number, number] };
            case 'monthly': return { barSize: 20, barRadius: [4, 4, 0, 0] as [number, number, number, number] };
            case 'quarterly': return { barSize: 40, barRadius: [6, 6, 0, 0] as [number, number, number, number] };
            case 'yearly': return { barSize: 60, barRadius: [8, 8, 0, 0] as [number, number, number, number] };
            default: return { barSize: 6, barRadius: [2, 2, 0, 0] as [number, number, number, number] };
        }
    }, [frequency]);

    const chartMargin = { top: 10, right: 20, left: 20, bottom: 20 };

    return (
        <div className="w-full flex flex-col gap-1 -mx-2 relative transition-none" style={{ height: chartHeight }}>
            {metrics.totalTrades > 0 ? (
                <>
                    <div className="flex-1 min-h-0 relative w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <ComposedChart data={metrics.curve} margin={chartMargin} onMouseMove={handleChartMouseMove}>
                                <defs>
                                    <filter id="glow-line" height="200%">
                                        <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                                        <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.32 0 0 0 0 0.43 0 0 0 0 0.51 0 0 0 0.5 0" result="coloredBlur" />
                                        <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                    </filter>
                                    <linearGradient id="gradEq" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={THEME.BLUE} stopOpacity={0.3}/><stop offset="100%" stopColor={THEME.BLUE} stopOpacity={0}/></linearGradient>
                                    {activePortfolioIds.map((pid) => { 
                                        const p = portfolios.find(x => x.id === pid); 
                                        return (
                                            <React.Fragment key={`grads-${pid}`}>
                                                <linearGradient id={`gradP-pos-${pid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={p?.profitColor || THEME.RED} stopOpacity={0.8}/><stop offset="100%" stopColor={p?.profitColor || THEME.RED} stopOpacity={0.1}/></linearGradient>
                                                <linearGradient id={`gradP-neg-${pid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={p?.lossColor || THEME.DEFAULT_LOSS} stopOpacity={0.1}/><stop offset="100%" stopColor={p?.lossColor || THEME.DEFAULT_LOSS} stopOpacity={0.8}/></linearGradient>
                                            </React.Fragment>
                                        )
                                    })}
                                </defs>
                                <XAxis dataKey="timestamp" type="category" hide={false} axisLine={false} tickLine={false} tick={{ fill: '#555', fontSize: 10, dy: 5 }} tickFormatter={(val) => formatChartAxisDate(val, frequency)} minTickGap={30} padding={{ left: 24, right: 24 }} interval="preserveStartEnd" />
                                <Tooltip content={<CustomTooltip hideAmounts={hideAmounts} lang={lang} portfolios={portfolios} />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                                <ReferenceLine y={0} yAxisId="pnl" stroke="#FFFFFF" strokeOpacity={0.1} />
                                {activePortfolioIds.map((pid) => (
                                    <React.Fragment key={pid}>
                                        <Bar dataKey={`${pid}_pos`} stackId="a" fill={`url(#gradP-pos-${pid})`} radius={barRadius} barSize={barSize} yAxisId="pnl" isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" />
                                        <Bar dataKey={`${pid}_neg`} stackId="a" fill={`url(#gradP-neg-${pid})`} radius={barRadius} barSize={barSize} yAxisId="pnl" isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" />
                                    </React.Fragment>
                                ))}
                                <Line type="monotone" dataKey="equity" stroke={THEME.BLUE} strokeWidth={2} dot={(props) => <CustomPeakDot {...props} dataLength={metrics.curve.length} />} activeDot={{ r: 4, strokeWidth: 0 }} yAxisId="equity" isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" filter="url(#glow-line)" />
                                <YAxis yAxisId="pnl" hide domain={['auto', 'auto']} />
                                <YAxis yAxisId="equity" orientation="right" hide domain={['auto', 'auto']} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="h-[15%] min-h-[30px] w-full relative opacity-60">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={metrics.drawdown} margin={{ ...chartMargin, top: 0 }}>
                                <defs><linearGradient id="gradDDMain" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={THEME.DD_GRADIENT_TOP} stopOpacity={1}/><stop offset="100%" stopColor={THEME.DD_GRADIENT_BOTTOM} stopOpacity={0.7}/></linearGradient></defs>
                                <XAxis dataKey="timestamp" type="category" hide padding={{ left: 24, right: 24 }} />
                                <YAxis hide domain={['dataMin', 0]} />
                                <Tooltip cursor={{fill: 'transparent'}} content={() => null} />
                                <Bar dataKey="ddPct" radius={[4, 4, 0, 0]} fill="url(#gradDDMain)" barSize={8} isAnimationActive={true} animationDuration={500} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in zoom-in-95 duration-500">
                    <div className="w-16 h-16 rounded-full bg-[#C8B085]/10 flex items-center justify-center border border-[#C8B085]/20 shadow-[0_0_20px_rgba(200,176,133,0.1)]">
                        <TrendingUp size={32} className="text-[#C8B085] opacity-80" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-[#E0E0E0]">{t.emptyStateTitle}</h3>
                        <p className="text-xs text-slate-500 max-w-[200px] mx-auto leading-relaxed mt-1">{t.emptyStateDesc}</p>
                    </div>
                </div>
            )}
            {/* DRAG HANDLE */}
            <div className="w-full flex items-center justify-center py-1 cursor-row-resize touch-none opacity-40 hover:opacity-100 active:opacity-100 transition-opacity absolute bottom-0 left-0 z-20" onMouseDown={onMouseDown} onTouchStart={onTouchStart}>
                <div className="w-12 h-1 bg-white/10 rounded-full group-hover:bg-[#C8B085] transition-colors" />
            </div>
        </div>
    );
};

// --- CONTENT COMPONENT (Cards + Strategy List) ---
export const StatsContent = ({
    metrics, lang, hideAmounts, stratView, setStratView, setDetailStrategy,
    hasActiveFilters, setFilterStrategy, setFilterEmotion
}: StatsContentProps) => {
    const t = I18N[lang] || I18N['zh'];
    const [hoveredStrategy, setHoveredStrategy] = React.useState<string | null>(null);

    // --- BUBBLE DATA CALCULATION ---
    const bubbleData = useMemo(() => {
        const baseData = Object.entries(metrics.stratStats).map(([name, stat]: [string, StrategyStat], index) => {
            return {
                id: index + 1,
                name,
                x: stat.winRate,
                y: stat.riskReward > 10 ? 10 : stat.riskReward,
                z: stat.trades,
                ...stat
            };
        });

        const declumpedData: typeof baseData = [];
        baseData.forEach(current => {
            const nearby = declumpedData.filter(p => Math.abs(p.x - current.x) < 8 && Math.abs(p.y - current.y) < 0.6);
            if (nearby.length > 0) {
                const count = nearby.length;
                const angle = count * (Math.PI / 2) + 0.7; 
                const distMultiplier = 1 + (count * 0.25); 
                const offsetX = Math.cos(angle) * 6.0 * distMultiplier; 
                const offsetY = Math.sin(angle) * 0.7 * distMultiplier;
                current.x += offsetX;
                current.y += offsetY;
                current.x = Math.max(3, Math.min(97, current.x));
                current.y = Math.max(0.3, Math.min(9.7, current.y));
            }
            declumpedData.push(current);
        });

        return declumpedData.map((current) => {
            const scores = { top: 0, bottom: 0, left: 0, right: 0 };
            const cX = current.x;
            const cY = current.y * 10; 
            if (current.y > 8.5) scores.top += 10000;     
            if (current.y < 1.5) scores.bottom += 10000;  
            if (current.x < 15) scores.left += 10000;     
            if (current.x > 85) scores.right += 10000;    
            declumpedData.forEach(other => {
                if (current.id === other.id) return;
                const oX = other.x;
                const oY = other.y * 10;
                const isVerticallyAligned = Math.abs(oX - cX) < 12; 
                if (isVerticallyAligned) {
                    if (oY > cY && oY < cY + 25) scores.top += 5000;
                    if (oY < cY && oY > cY - 25) scores.bottom += 5000;
                }
            });
            let bestPos = 'top';
            let minVal = Infinity;
            (['top', 'bottom', 'right', 'left'] as const).forEach(dir => { if (scores[dir] < minVal) { minVal = scores[dir]; bestPos = dir; } });
            return { ...current, labelPos: bestPos };
        });
    }, [metrics.stratStats]);

    const renderSmartLabel = useCallback((props: any) => {
        const { x, y, index } = props;
        const dataPoint = bubbleData[index];
        if (!dataPoint || x === undefined || y === undefined) return null;
        
        const { name, id, labelPos } = dataPoint;
        const isHovered = hoveredStrategy === name;
        
        let dx = 0, dy = 0;
        let textAnchor: 'start' | 'middle' | 'end' = 'start';
        const offset = 14; 

        switch (labelPos) {
            case 'top': dx = 0; dy = -offset - 6; textAnchor = 'middle'; break;
            case 'bottom': dx = 0; dy = offset + 12; textAnchor = 'middle'; break;
            case 'left': dx = -offset - 4; dy = 4; textAnchor = 'end'; break;
            case 'right': default: dx = offset + 4; dy = 4; textAnchor = 'start'; break;
        }

        const baseFontSize = isHovered ? 12 : 10;
        const opacity = isHovered ? 1 : 0.8;
        const fontWeight = isHovered ? "700" : "500";
        const fill = isHovered ? "#C8B085" : "#E0E0E0";
        let lines: string[] = [];
        let isSubtitle = false;

        if (name.includes('_')) {
            const parts = name.split('_');
            lines = [parts[0], parts.slice(1).join(' ')];
            isSubtitle = true;
        } else if (name.length > 8 && labelPos !== 'left' && labelPos !== 'right') {
             const mid = Math.floor(name.length / 2);
             lines = [name.substring(0, mid), name.substring(mid)];
        } else {
            lines = [name];
        }

        return (
            <g style={{ pointerEvents: 'none', transition: 'all 0.3s ease' }}>
                 <text x={x} y={y} dy={3} fill="white" textAnchor="middle" fontSize={isHovered ? "10px" : "8px"} fontWeight="900" style={{ textShadow: '0 0 3px rgba(0,0,0,0.9)' }}>{id}</text>
                <text x={x + dx} y={y + dy} dy={lines.length > 1 && (labelPos === 'left' || labelPos === 'right') ? -4 : 0} textAnchor={textAnchor} fill={fill} fontSize={`${baseFontSize}px`} fontWeight={fontWeight} fillOpacity={opacity} style={{ textShadow: '0 1px 4px rgba(0,0,0,0.95)', transition: 'all 0.3s ease', fontFamily: "'Microsoft JhengHei', 'Microsoft YaHei', sans-serif" }}>
                    {lines.map((line, i) => (
                        <tspan key={i} x={x + dx} dy={i === 0 ? 0 : 11} fontSize={i > 0 && isSubtitle ? `${baseFontSize * 0.85}px` : undefined} fillOpacity={i > 0 && isSubtitle ? 0.7 : 1} fontWeight={i > 0 && isSubtitle ? "400" : fontWeight}>{line}</tspan>
                    ))}
                </text>
            </g>
        );
    }, [hoveredStrategy, bubbleData]);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-3">
            {hasActiveFilters && (
                <div className="flex items-center justify-between bg-[#C8B085]/10 border border-[#C8B085]/30 p-2 rounded-lg">
                    <span className="text-[10px] text-[#C8B085] font-bold uppercase flex items-center gap-2"> {lang === 'zh' ? '篩選模式開啟中' : 'Filtering Active'}</span>
                    <button onClick={() => { setFilterStrategy([]); setFilterEmotion([]); }} className="text-[10px] text-slate-400 underline hover:text-white">{lang === 'zh' ? '清除篩選' : 'Clear'}</button>
                </div>
            )}
            
            <div className="grid grid-cols-3 gap-3">
                <StatCard label={t.profitFactor} value={formatDecimal(metrics.pf)} />
                <StatCard label={t.sharpe} value={formatDecimal(metrics.sharpe)} />
                <StatCard label={t.riskReward} value={formatDecimal(metrics.riskReward)} />
                <StatCard label={t.trades} value={metrics.totalTrades} />
                <StatCard label={t.winRate} value={`${formatDecimal(metrics.winRate)}%`} />
                <StatCard label={t.maxDD} value={`${formatDecimal(metrics.maxDD)}%`} valueColor={THEME.GREEN} />
            </div>

            <div className="p-4 rounded-xl border border-white/5 space-y-3">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2"><List size={12}/> {t.strategies}</h3>
                    <div className="flex bg-[#0B0C10] rounded-lg p-0.5 border border-white/5">
                        <button onClick={() => setStratView('list')} className={`p-1.5 rounded-md transition-all ${stratView === 'list' ? 'bg-[#25282C] text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}><List size={12}/></button>
                        <button onClick={() => setStratView('chart')} className={`p-1.5 rounded-md transition-all ${stratView === 'chart' ? 'bg-[#25282C] text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}><BarChart2 size={12}/></button>
                    </div>
                </div>
                
                {stratView === 'list' ? (
                    <StrategyListView data={Object.entries(metrics.stratStats).map(([name, stat]) => ({ name, stat }))} onSelect={setDetailStrategy} lang={lang} />
                ) : (
                    <div className="flex flex-col gap-4 animate-in fade-in">
                        <div className="h-[250px] w-full">
                            {Object.keys(metrics.stratStats).length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                                        <XAxis type="number" dataKey="x" name="Win Rate" unit="%" domain={[0, 100]} tick={{fontSize: 8, fill: '#555'}} tickLine={false} axisLine={{stroke: '#333'}} label={{ value: 'Win Rate', position: 'insideBottom', offset: -5, fontSize: 8, fill: '#555' }} />
                                        <YAxis type="number" dataKey="y" name="Risk/Reward" unit="" domain={[0, 'auto']} width={20} tick={{fontSize: 8, fill: '#555'}} tickLine={false} axisLine={{stroke: '#333'}} label={{ value: 'R/R', angle: -90, position: 'insideLeft', fontSize: 8, fill: '#555', dx: 4 }} />
                                        <ZAxis type="number" dataKey="z" range={[150, 700]} name="Trades" />
                                        <Tooltip content={<BubbleTooltip hideAmounts={hideAmounts} lang={lang} />} cursor={{ strokeDasharray: '3 3', stroke: '#333' }} />
                                        <ReferenceLine x={50} stroke="#333" strokeDasharray="3 3" />
                                        <ReferenceLine y={1} stroke="#333" strokeDasharray="3 3" />
                                        <Scatter data={bubbleData} fill={THEME.GOLD} onMouseEnter={(p) => setHoveredStrategy(p.name)} onMouseLeave={() => setHoveredStrategy(null)} onClick={(p) => { setHoveredStrategy(p.name); setDetailStrategy(p.name); }}>
                                            <LabelList dataKey="name" content={renderSmartLabel} />
                                            {bubbleData.map((entry, index) => {
                                                const isDimmed = hoveredStrategy && hoveredStrategy !== entry.name;
                                                const isUnderperforming = entry.winRate < 50 && entry.riskReward < 1;
                                                return (
                                                    <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? THEME.RED : THEME.GREEN} fillOpacity={isDimmed ? 0.1 : (isUnderperforming ? 0.9 : 0.8)} stroke={entry.pnl >= 0 ? THEME.RED : THEME.GREEN} strokeWidth={isDimmed ? 0 : (isUnderperforming ? 2 : 1)} style={{ filter: isDimmed ? 'none' : (isUnderperforming ? `drop-shadow(0 0 6px ${THEME.GREEN})` : 'none'), transition: 'all 0.3s ease' }} />
                                                );
                                            })}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-700 text-xs">{t.noData}</div>
                            )}
                        </div>
                        
                        {bubbleData.length > 0 && (
                            <div className="w-full overflow-x-auto no-scrollbar mask-gradient touch-pan-x">
                                <div className="flex gap-2 pb-2 pr-4">
                                    {bubbleData.map((item) => {
                                        const [mainName, subName] = item.name.split('_');
                                        return (
                                            <div key={item.id} className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/5 cursor-pointer transition-all duration-300 ${hoveredStrategy === item.name ? 'bg-white/10 scale-105 border-white/20' : 'bg-[#1A1C20]'}`} style={{ opacity: (hoveredStrategy && hoveredStrategy !== item.name) ? 0.3 : 1 }} onMouseEnter={() => setHoveredStrategy(item.name)} onMouseLeave={() => setHoveredStrategy(null)} onTouchStart={() => setHoveredStrategy(item.name)} onClick={() => setDetailStrategy(item.name)}>
                                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold font-mono text-[#0B0C10] shrink-0" style={{ backgroundColor: item.pnl >= 0 ? THEME.RED : THEME.GREEN }}>{item.id}</div>
                                                <div className="flex flex-col">
                                                    <span className={`text-[10px] font-bold whitespace-nowrap ${hoveredStrategy === item.name ? 'text-white' : 'text-slate-300'}`}>{mainName}</span>
                                                    {subName && (<span className="text-[9px] text-zinc-500 font-medium leading-none whitespace-nowrap">{subName}</span>)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
