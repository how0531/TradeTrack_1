
// [Manage] Last Updated: 2024-05-22
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

// ... Tooltips and Dot components ...
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
                    {data.name}
                 </div>
                 <div className="space-y-1">
                    <div className="flex justify-between gap-4"><span className="text-slate-400">Net PnL</span><span className="font-mono font-bold" style={{color: getPnlColor(data.pnl)}}>{formatCurrency(data.pnl, hideAmounts)}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-slate-400">Trades</span><span className="text-white font-mono">{data.trades}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-slate-400">Win Rate</span><span className="text-white font-mono">{formatDecimal(data.x)}%</span></div>
                    <div className="flex justify-between gap-4"><span className="text-slate-400">Risk/Reward</span><span className="text-white font-mono">{formatDecimal(data.riskReward)}</span></div>
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
    const { barSize, barRadius } = useMemo(() => {
        switch (frequency) {
            case 'weekly': return { barSize: 12, barRadius: [3, 3, 0, 0] as [number, number, number, number] };
            case 'monthly': return { barSize: 20, barRadius: [4, 4, 0, 0] as [number, number, number, number] };
            case 'quarterly': return { barSize: 40, barRadius: [6, 6, 0, 0] as [number, number, number, number] };
            case 'yearly': return { barSize: 60, barRadius: [8, 8, 0, 0] as [number, number, number, number] };
            default: return { barSize: 6, barRadius: [2, 2, 0, 0] as [number, number, number, number] };
        }
    }, [frequency]);

    const t = I18N[lang] || I18N['zh'];
    // --- RESIZING LOGIC ---
    const isResizing = useRef(false);
    const startY = useRef(0);
    const startHeight = useRef(0);
    const startResize = useCallback((clientY: number) => { isResizing.current = true; startY.current = clientY; startHeight.current = chartHeight; document.body.style.userSelect = 'none'; document.body.style.cursor = 'row-resize'; }, [chartHeight]);
    useEffect(() => {
        const onMove = (clientY: number) => { if (!isResizing.current) return; setChartHeight(Math.min(Math.max(startHeight.current + (clientY - startY.current), 150), 500)); };
        const onUp = () => { isResizing.current = false; document.body.style.userSelect = ''; document.body.style.cursor = ''; };
        const onMouseMove = (e: MouseEvent) => onMove(e.clientY); const onTouchMove = (e: TouchEvent) => onMove(e.touches[0].clientY);
        window.addEventListener('mousemove', onMouseMove); window.addEventListener('mouseup', onUp); window.addEventListener('touchmove', onTouchMove); window.addEventListener('touchend', onUp);
        return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onUp); window.removeEventListener('touchmove', onTouchMove); window.removeEventListener('touchend', onUp); };
    }, [setChartHeight]);

    const chartMargin = { top: 10, right: 20, left: 20, bottom: 20 };

    return (
        <div className="w-full flex flex-col gap-1 relative transition-none" style={{ height: chartHeight }}>
            {metrics.totalTrades > 0 ? (
                <>
                    <div className="flex-1 min-h-0 relative w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <ComposedChart data={metrics.curve} margin={chartMargin}>
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
                    <div className="w-full flex items-center justify-center py-1 cursor-row-resize touch-none opacity-40 hover:opacity-100 active:opacity-100 transition-opacity absolute bottom-0 left-0 z-20" onMouseDown={(e) => startResize(e.clientY)} onTouchStart={(e) => startResize(e.touches[0].clientY)}>
                        <div className="w-12 h-1 bg-white/10 rounded-full group-hover:bg-[#C8B085] transition-colors" />
                    </div>
                </>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in zoom-in-95 duration-500">
                    <div className="w-16 h-16 rounded-full bg-[#C8B085]/10 flex items-center justify-center border border-[#C8B085]/20 shadow-[0_0_20px_rgba(200,176,133,0.1)]"><TrendingUp size={32} className="text-[#C8B085] opacity-80" /></div>
                    <div><h3 className="text-sm font-bold text-[#E0E0E0]">{t.emptyStateTitle}</h3><p className="text-xs text-slate-500 max-w-[200px] mx-auto leading-relaxed mt-1">{t.emptyStateDesc}</p></div>
                </div>
            )}
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
        const stats = Object.entries(metrics.stratStats);
        
        // 1. Initial Mapping
        let points = stats.map(([name, stat]) => ({
             name,
             xVal: stat.winRate,
             yVal: Math.min(stat.riskReward, 10), 
             zVal: Math.abs(stat.pnl), 
             pnl: stat.pnl,
             trades: stat.trades,
             riskReward: stat.riskReward,
             // Radius: Visual size
             r: Math.max(12, Math.min(35, 10 + Math.sqrt(Math.abs(stat.pnl)) * 0.5)),
             rank: 0,
             labelPos: 'top' as 'top' | 'bottom',
             textAnchor: 'middle' as 'middle' | 'start' | 'end',
             callout: false,
             calloutVector: { x: 0, y: 0 }
        }));

        // 2. Rank by Size (Big bubbles get priority)
        points.sort((a, b) => b.zVal - a.zVal);
        points.forEach((p, i) => { p.rank = i + 1; });

        // 3. Simple Overlap Detection
        // Only checking strictly for neighbors to decide if we need a callout.
        for (let i = 0; i < points.length; i++) {
            const current = points[i];
            
            // Basic Anchor logic based on chart position
            // Left side -> Start, Right side -> End, Middle -> Middle
            if (current.xVal > 80) current.textAnchor = 'end';
            else if (current.xVal < 20) current.textAnchor = 'start';
            else current.textAnchor = 'middle';

            // Basic Vertical logic
            // Top of chart -> Bottom Label
            if (current.yVal > 9) current.labelPos = 'bottom';
            else current.labelPos = 'top';

            // Collision Check against Higher Rank VIPs
            for (let j = 0; j < i; j++) {
                const vip = points[j];
                
                // Approximate Pixel Distance Conversion (Chart 350x250)
                const dx = (current.xVal - vip.xVal) * 3.5; 
                const dy = (current.yVal - vip.yVal) * 25; 
                const dist = Math.sqrt(dx * dx + dy * dy);

                // ** KEY FIX **: Strict overlap threshold
                // Only trigger callout if bubbles are actually touching or heavily overlapping
                const touchThreshold = current.r + vip.r + 2; 

                if (dist < touchThreshold) {
                    current.callout = true;

                    // Compute escape vector
                    let vx = dx; 
                    let vy = dy;
                    
                    // If basically on top of each other, push randomly
                    if (Math.abs(vx) < 1 && Math.abs(vy) < 1) {
                         vx = 10; vy = 10;
                    }

                    // Normalize
                    const len = Math.sqrt(vx*vx + vy*vy);
                    if (len > 0) { vx /= len; vy /= len; }

                    current.calloutVector = { x: vx, y: vy };
                    
                    // Force anchor based on push direction
                    // If pushing right, anchor start.
                    current.textAnchor = vx > 0.2 ? 'start' : (vx < -0.2 ? 'end' : 'middle');
                    current.labelPos = vy > 0 ? 'top' : 'bottom'; 
                    
                    break;
                }
            }
        }
        
        return points.map(p => ({ ...p, x: p.xVal, y: p.yVal, z: p.zVal }));
    }, [metrics.stratStats]);

    const renderSmartLabel = useCallback((props: any) => {
        const { x, y, index, viewBox } = props; 
        const point = bubbleData.find(p => p.name === props.value) || bubbleData[index];
        if (!point || x === undefined || y === undefined) return null;

        const { name, labelPos, r, textAnchor: initialAnchor, callout, calloutVector } = point;
        const isHovered = hoveredStrategy === name;
        
        // Define Chart Bounds
        const width = viewBox?.width || 350;
        const height = viewBox?.height || 250;
        const padding = 12;

        let labelX = x;
        let labelY = y;
        let lineTargetX = x;
        let lineTargetY = y;
        let finalAnchor = initialAnchor;
        
        if (callout) {
            // ** CALLOUT LOGIC (Crowded) **
            // Push out by radius + 20px
            const pushDist = r + 20;
            
            // SVG Y is inverted relative to chart data Y
            // But 'calloutVector' was calculated in chart logic where +Y is Up.
            // Screen Y: 0 is Top. 
            // So if chart vector says "Up" (+y), we decrease screen Y.
            labelX = x + (calloutVector.x * pushDist);
            labelY = y - (calloutVector.y * pushDist);

            lineTargetX = x + (calloutVector.x * r);
            lineTargetY = y - (calloutVector.y * r);

        } else {
            // ** TIGHT HUG LOGIC (Isolated) **
            // No phantom radius. Just sit right on top/bottom.
            const gap = 4;
            if (labelPos === 'bottom') {
                labelY = y + r + gap + 8; // +8 for text height approx
            } else {
                labelY = y - r - gap;
            }
        }

        // ** BOUNDARY INTELLIGENCE **
        
        // 1. Right Edge Check (Top Right Corner Fix)
        if (labelX > width - padding) {
            labelX = width - padding;
            finalAnchor = 'end';
            // If it was supposed to be a callout to the right, invert it or force it left
            if (callout && calloutVector.x > 0) {
                 // It's trying to push right but hit wall. 
                 // We rely on the anchor 'end' to keep text visible, 
                 // but we might need to shift X slightly left if it's too tight.
            }
        }

        // 2. Left Edge Check
        if (labelX < padding) {
            labelX = padding;
            finalAnchor = 'start';
        }

        // 3. Top Edge Check (Critical for High R/R)
        if (labelY < padding) {
            // If hitting top, force label BELOW the bubble
            // Regardless of what callout logic said.
            if (callout) {
                // If it was a callout, we redirect the line
                labelY = y + r + 20;
                lineTargetY = y + r;
                // Re-calculate line X target to be consistent
                lineTargetX = x; 
                labelX = x; // Reset X to center if we forced a flip, or keep current X
            } else {
                 labelY = y + r + 12;
            }
        }
        
        // 4. Bottom Edge Check
        if (labelY > height - padding) {
            labelY = y - r - 5;
            if (callout) {
                lineTargetY = y - r;
                lineTargetX = x;
                labelX = x;
            }
        }

        // Split name logic
        let lines: string[] = [];
        if (name.includes('_')) {
            const parts = name.split('_');
            lines = [parts[0], parts.slice(1).join(' ')];
        } else {
            lines = [name];
        }

        return (
            <g style={{ pointerEvents: 'none', zIndex: 50 }}>
                {callout && (
                    <React.Fragment>
                        <path 
                            d={`M ${lineTargetX} ${lineTargetY} L ${labelX} ${labelY + (labelY < y ? 5 : -5)}`} 
                            stroke="white" 
                            strokeWidth={1} 
                            strokeOpacity={0.4} 
                            fill="none"
                        />
                        <circle cx={labelX} cy={labelY + (labelY < y ? 5 : -5)} r={1.5} fill="white" fillOpacity={0.6} />
                    </React.Fragment>
                )}
                
                <text x={labelX} y={labelY} textAnchor={finalAnchor} className="font-sans">
                     {lines.map((line, i) => (
                        <tspan 
                            key={i} 
                            x={labelX} 
                            dy={i === 0 
                                ? (labelY < y ? (lines.length > 1 ? -6 : 3) : 10)
                                : 9}
                            fontSize={i === 0 ? "9px" : "7px"}
                            fontWeight={i === 0 ? "700" : "400"}
                            fill={i === 0 ? (isHovered ? "#C8B085" : "#FFFFFF") : "#A1A1AA"}
                            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                        >
                            {line}
                        </tspan>
                     ))}
                </text>
            </g>
        )
    }, [bubbleData, hoveredStrategy]);

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
                                        {/* Z Axis Range controls the bubble size range in pixels */}
                                        <ZAxis type="number" dataKey="z" range={[100, 1200]} name="PnL Magnitude" />
                                        <Tooltip content={<BubbleTooltip hideAmounts={hideAmounts} lang={lang} />} cursor={{ strokeDasharray: '3 3', stroke: '#333' }} />
                                        <ReferenceLine x={50} stroke="#333" strokeDasharray="3 3" />
                                        <ReferenceLine y={1} stroke="#333" strokeDasharray="3 3" />
                                        
                                        <Scatter data={bubbleData} onClick={(p) => { setHoveredStrategy(p.name); setDetailStrategy(p.name); }} onMouseEnter={(p) => setHoveredStrategy(p.name)} onMouseLeave={() => setHoveredStrategy(null)}>
                                            <LabelList dataKey="name" content={renderSmartLabel} />
                                            {bubbleData.map((entry, index) => {
                                                const isDimmed = hoveredStrategy && hoveredStrategy !== entry.name;
                                                const isHovered = hoveredStrategy === entry.name;
                                                const isProfit = entry.pnl >= 0;
                                                return (
                                                    <Cell 
                                                        key={`cell-${index}`} 
                                                        fill={isProfit ? THEME.RED : THEME.GREEN} 
                                                        fillOpacity={isDimmed ? 0.1 : 0.6} 
                                                        stroke={isProfit ? THEME.RED : THEME.GREEN} 
                                                        strokeWidth={isDimmed ? 0 : 1}
                                                        style={{ 
                                                            transition: 'all 0.3s ease',
                                                            filter: isHovered && !isDimmed ? 'drop-shadow(0 0 4px rgba(255,255,255,0.3))' : 'none'
                                                        }} 
                                                    />
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
                                    {bubbleData.map((item, index) => {
                                        const [mainName, subName] = item.name.split('_');
                                        return (
                                            <div key={item.name} className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/5 cursor-pointer transition-all duration-300 ${hoveredStrategy === item.name ? 'bg-white/10 scale-105 border-white/20' : 'bg-[#1A1C20]'}`} style={{ opacity: (hoveredStrategy && hoveredStrategy !== item.name) ? 0.3 : 1 }} onMouseEnter={() => setHoveredStrategy(item.name)} onMouseLeave={() => setHoveredStrategy(null)} onTouchStart={() => setHoveredStrategy(item.name)} onClick={() => setDetailStrategy(item.name)}>
                                                {/* Numbering: Showing Rank (based on PnL) instead of Index */}
                                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold font-mono text-[#0B0C10] shrink-0" style={{ backgroundColor: item.pnl >= 0 ? THEME.RED : THEME.GREEN }}>{item.rank}</div>
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
