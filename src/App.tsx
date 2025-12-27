
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { TrendingUp, Activity, Settings, Plus, List, ChevronRight, Eye, EyeOff, Filter, BrainCircuit, ShieldAlert, Cloud, CloudOff, RefreshCw, X, AlertOctagon, BarChart2, Check, AlertCircle, LayoutDashboard, Calendar, Scroll, PieChart, GripHorizontal } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ReferenceLine, BarChart, ScatterChart, Scatter, ZAxis, Cell, LabelList } from 'recharts';

// Modules & Hooks
import { THEME, I18N } from './constants';
import { Trade, ViewMode, TimeRange, Frequency, StrategyStat, Lang, Portfolio } from './types';
import { getLocalDateStr, formatCurrency, formatDecimal, formatPnlK, getPnlColor, calculateMetrics } from './utils';
import { useAuth, useTradeData, useMetrics, useLocalStorage } from './hooks';

// Components
import { StatCard, PortfolioSelector, FrequencySelector, TimeRangeSelector, MultiSelectDropdown } from './components/UI';
import { CalendarView, LogsView, SettingsView, StrategyListView } from './components/Views';
import { TradeModal, StrategyDetailModal, CustomDateRangeModal, SyncConflictModal } from './components/Modals';

// Custom Tooltip for Equity Chart
const CustomTooltip = ({ active, payload, hideAmounts, lang, portfolios }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const t = I18N[lang] || I18N['zh'];
        const systemKeys = ['date', 'equity', 'peak', 'pnl', 'isNewPeak', 'ddAmt', 'ddPct', 'fullDate', 'label', 'cumulativePnl'];
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

// Custom Tooltip for Bubble Chart
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

// Revised CustomPeakDot
const CustomPeakDot = ({ cx, cy, payload, dataLength }: any) => {
    if (payload?.isNewPeak) {
        let r = 4;
        if (dataLength >= 150) r = 1.5;
        else if (dataLength >= 50) r = 2.5;

        return (
            <circle cx={cx} cy={cy} r={r} fill="#DEB06C" stroke="none" />
        );
    }
    return null;
};

export default function App() {
    const { user, status: authStatus, db, config, login, logout } = useAuth();
    const { trades, strategies, emotions, portfolios, activePortfolioIds, setActivePortfolioIds, lossColor, setLossColor, isSyncing, isSyncModalOpen, syncStatus, lastBackupTime, actions } = useTradeData(user, authStatus, db, config);
    const [view, setView] = useState<ViewMode>('stats');
    const [stratView, setStratView] = useState<'list' | 'chart'>('list');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [form, setForm] = useState<Trade>({ id: '', pnl: 0, date: getLocalDateStr(), amount: '', type: 'profit', strategy: '', note: '', emotion: '', image: '', portfolioId: '' });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [detailStrategy, setDetailStrategy] = useState<string | null>(null);
    const [hoveredStrategy, setHoveredStrategy] = useState<string | null>(null); // NEW: Hover State
    const [filterStrategy, setFilterStrategy] = useState<string[]>([]);
    const [filterEmotion, setFilterEmotion] = useState<string[]>([]);
    const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
    const [frequency, setFrequency] = useState<Frequency>('daily');
    const [customRange, setCustomRange] = useState<{start: string | null, end: string | null}>({ start: null, end: null });
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false); 
    const [lang, setLang] = useLocalStorage<Lang>('app_lang', 'zh');
    const [hideAmounts, setHideAmounts] = useLocalStorage<boolean>('app_hide_amounts', false);
    const [ddThreshold, setDdThreshold] = useLocalStorage<number>('app_dd_threshold', 20);
    const [maxLossStreak, setMaxLossStreak] = useLocalStorage<number>('app_max_loss_streak', 3);
    
    // --- CHART RESIZING LOGIC ---
    const [chartHeight, setChartHeight] = useLocalStorage<number>('app_chart_height', 220); // Default height
    const isResizing = useRef(false);
    const startY = useRef(0);
    const startHeight = useRef(0);

    const t = I18N[lang] || I18N['zh'];
    
    const lastHapticIndex = useRef<number>(-1);

    const { filteredTrades, metrics, streaks, riskStreaks, dailyPnlMap } = useMetrics(trades, portfolios, activePortfolioIds, frequency, lang, customRange, filterStrategy, filterEmotion, timeRange);
    
    const strategyMetrics = useMemo(() => {
        if (!detailStrategy) return null;
        const sTrades = trades.filter(t => t.strategy === detailStrategy).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return calculateMetrics(sTrades, portfolios, activePortfolioIds, 'daily', lang, null, null);
    }, [detailStrategy, trades, portfolios, activePortfolioIds, lang]);
    
    const monthlyStats = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const tradesInMonth = filteredTrades.filter(t => { if (!t.date) return false; const [tY, tM] = t.date.split('-').map(Number); return tY === year && (tM - 1) === month; });
        const pnl = tradesInMonth.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
        const wins = tradesInMonth.filter(t => (Number(t.pnl) || 0) > 0).length;
        const count = tradesInMonth.length;
        const winRate = count > 0 ? (wins / count) * 100 : 0;
        return { pnl, count, winRate };
    }, [filteredTrades, currentMonth]);

    // UPDATED: Advanced Smart Label Placement with Directional Blocking
    const bubbleData = useMemo(() => {
        const baseData = Object.entries(metrics.stratStats).map(([name, stat]: [string, StrategyStat], index) => {
            const estTextWidth = name.length * 2; // Slightly increased width estimate for Chinese chars
            return {
                id: index + 1,
                name,
                estTextWidth,
                x: stat.winRate,
                y: stat.riskReward > 10 ? 10 : stat.riskReward,
                z: stat.trades,
                ...stat
            };
        });

        return baseData.map((current) => {
            const scores = { top: 0, bottom: 0, left: 0, right: 0 };
            
            const cX = current.x;
            const cY = current.y * 10; // Scale Y to 0-100 to match X scale

            // Candidate Label Center Coordinates
            // Increased offsets slightly to ensure better clearance
            const candidates = {
                top:    { x: cX, y: cY + 20 },    
                bottom: { x: cX, y: cY - 20 },    
                left:   { x: cX - 20, y: cY },    
                right:  { x: cX + 20, y: cY }     
            };

            // 1. Chart Boundary Penalties (Stay within view)
            if (current.y > 8.5) scores.top += 10000;     
            if (current.y < 1.5) scores.bottom += 10000;  
            if (current.x < 15) scores.left += 10000;     
            if (current.x > 85) scores.right += 10000;    

            // 2. Neighbor Interaction
            baseData.forEach(other => {
                if (current.id === other.id) return;
                
                const oX = other.x;
                const oY = other.y * 10;
                
                // A. Direct Obstruction (Line of Sight)
                // If 'other' is visually blocking the path to the label
                
                // Vertical check (for Top/Bottom)
                const isVerticallyAligned = Math.abs(oX - cX) < 12; 
                if (isVerticallyAligned) {
                    // If other is above and close, punish TOP
                    if (oY > cY && oY < cY + 25) scores.top += 5000;
                    // If other is below and close, punish BOTTOM
                    if (oY < cY && oY > cY - 25) scores.bottom += 5000;
                }

                // Horizontal check (for Left/Right) - Stricter due to text width
                const isHorizontallyAligned = Math.abs(oY - cY) < 15;
                if (isHorizontallyAligned) {
                    // If other is right and close, punish RIGHT
                    if (oX > cX && oX < cX + 25) scores.right += 5000;
                    // If other is left and close, punish LEFT
                    if (oX < cX && oX > cX - 25) scores.left += 5000;
                }

                // B. General Proximity to Candidate Position (Repulsion Field)
                (['top', 'bottom', 'left', 'right'] as const).forEach(dir => {
                    const cand = candidates[dir];
                    const distSq = (cand.x - oX)**2 + (cand.y - oY)**2;
                    // Inverse square repulsion: closer neighbors exert massively more force
                    scores[dir] += ((other.z * 500) / (distSq + 0.1)); 
                });
            });

            // Find best position
            let bestPos = 'top';
            let minVal = Infinity;
            
            (['top', 'bottom', 'right', 'left'] as const).forEach(dir => {
                if (scores[dir] < minVal) {
                    minVal = scores[dir];
                    bestPos = dir;
                }
            });

            return { ...current, labelPos: bestPos };
        });
    }, [metrics.stratStats]);

    // Calculate max absolute PnL for strategies to normalize the progress bar
    const maxStratAbsPnl = useMemo(() => {
        if (!metrics || !metrics.stratStats) return 1;
        const values = Object.values(metrics.stratStats).map(s => Math.abs(s.pnl));
        return Math.max(...values, 1);
    }, [metrics]);

    // UPDATED RISK LOGIC: Checks BOTH Max Loss Streak AND Max Drawdown
    const isStreakAlert = riskStreaks.currentLoss >= maxLossStreak;
    const isDDAlert = Math.abs(metrics.currentDD) >= ddThreshold;
    const isRiskAlert = isStreakAlert || isDDAlert;
    
    const hasActiveFilters = filterStrategy.length > 0 || filterEmotion.length > 0;

    const moodGradient = useMemo(() => {
        if (metrics.isPeak && metrics.totalTrades > 0) return `radial-gradient(circle at 50% -20%, ${THEME.GOLD}22, transparent 60%)`; 
        if (metrics.eqChange >= 0) return `radial-gradient(circle at 50% -20%, ${THEME.GREEN}22, transparent 60%)`; 
        return `radial-gradient(circle at 50% -20%, ${THEME.RED}22, transparent 60%)`; 
    }, [metrics.isPeak, metrics.eqChange, metrics.totalTrades]);

    const handleChartMouseMove = (state: any) => {
        if (state && state.activeTooltipIndex !== undefined) {
            if (state.activeTooltipIndex !== lastHapticIndex.current) {
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate(5);
                }
                lastHapticIndex.current = state.activeTooltipIndex;
            }
        }
    };

    // --- SMART STRATEGY LABEL RENDERER (4-Directional) ---
    const renderSmartLabel = useCallback((props: any) => {
        const { x, y, index } = props;
        const dataPoint = bubbleData[index];
        if (!dataPoint || x === undefined || y === undefined) return null;
        
        const { name, id, labelPos } = dataPoint;
        const isHovered = hoveredStrategy === name;
        
        // 1. Position Logic based on labelPos calculated in bubbleData
        let dx = 0;
        let dy = 0;
        let textAnchor: 'start' | 'middle' | 'end' = 'start';
        
        const offset = 14; // Base distance from center in pixels

        switch (labelPos) {
            case 'top':
                dx = 0; dy = -offset - 6; textAnchor = 'middle'; // Moved slightly further up
                break;
            case 'bottom':
                dx = 0; dy = offset + 12; textAnchor = 'middle'; // Moved slightly further down
                break;
            case 'left':
                dx = -offset - 4; dy = 4; textAnchor = 'end';
                break;
            case 'right':
            default:
                dx = offset + 4; dy = 4; textAnchor = 'start';
                break;
        }

        // 2. Styling
        const baseFontSize = isHovered ? 12 : 10;
        const opacity = isHovered ? 1 : 0.8;
        const fontWeight = isHovered ? "700" : "500";
        const fill = isHovered ? "#C8B085" : "#E0E0E0";
        
        // 3. Content Logic (Split by underscore)
        let lines: string[] = [];
        let isSubtitle = false;

        if (name.includes('_')) {
            const parts = name.split('_');
            lines = [parts[0], parts.slice(1).join(' ')];
            isSubtitle = true;
        } else if (name.length > 8 && labelPos !== 'left' && labelPos !== 'right') {
             // Wrap long text if top/bottom aligned to prevent wide span
             const mid = Math.floor(name.length / 2);
             lines = [name.substring(0, mid), name.substring(mid)];
        } else {
            lines = [name];
        }

        return (
            <g style={{ pointerEvents: 'none', transition: 'all 0.3s ease' }}>
                {/* ID inside Bubble (Always Visible) */}
                 <text
                    x={x}
                    y={y} 
                    dy={3} 
                    fill="white" 
                    textAnchor="middle"
                    fontSize={isHovered ? "10px" : "8px"} 
                    fontWeight="900"
                    style={{ textShadow: '0 0 3px rgba(0,0,0,0.9)' }}
                >
                    {id}
                </text>
                
                {/* Smart Name Label */}
                <text
                    x={x + dx}
                    y={y + dy} 
                    // Center block vertically if multiline and side-aligned
                    dy={lines.length > 1 && (labelPos === 'left' || labelPos === 'right') ? -4 : 0}
                    textAnchor={textAnchor}
                    fill={fill} 
                    fontSize={`${baseFontSize}px`}
                    fontWeight={fontWeight}
                    fillOpacity={opacity}
                    style={{ 
                        textShadow: '0 1px 4px rgba(0,0,0,0.95)', 
                        transition: 'all 0.3s ease',
                        fontFamily: "'Microsoft JhengHei', 'Microsoft YaHei', sans-serif"
                    }}
                >
                    {lines.map((line, i) => (
                        <tspan 
                            key={i} 
                            x={x + dx} 
                            dy={i === 0 ? 0 : 11}
                            fontSize={i > 0 && isSubtitle ? `${baseFontSize * 0.85}px` : undefined}
                            fillOpacity={i > 0 && isSubtitle ? 0.7 : 1}
                            fontWeight={i > 0 && isSubtitle ? "400" : fontWeight}
                        >
                            {line}
                        </tspan>
                    ))}
                </text>
            </g>
        );
    }, [hoveredStrategy, bubbleData]);

    // --- RESIZE EVENT HANDLERS ---
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
            const newHeight = Math.min(Math.max(startHeight.current + deltaY, 150), 500); // Min 150px, Max 500px
            setChartHeight(newHeight);
        };

        const onUp = () => {
            isResizing.current = false;
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };

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


    if (authStatus === 'loading') {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center space-y-8">
                <div className="relative">
                    <div className="w-16 h-16 border-2 border-white/5 bg-[#141619] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(200,176,133,0.1)] animate-pulse">
                         <TrendingUp size={32} className="text-[#C8B085]" />
                    </div>
                </div>
                <div className="flex flex-col items-center gap-3">
                    <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500 font-bold text-lg tracking-widest uppercase">TradeTrack Pro</h1>
                    <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden relative">
                         <div className="absolute inset-y-0 left-0 bg-[#C8B085] w-full origin-left animate-progress rounded-full shadow-[0_0_10px_#C8B085]"></div>
                    </div>
                    <p className="text-slate-600 text-[10px] font-mono mt-2">SECURE CONNECTION ESTABLISHED</p>
                </div>
            </div>
        );
    }

    const chartMargin = { top: 10, right: 10, left: 10, bottom: 5 };
    
    const SyncIndicator = () => {
        const isOnline = authStatus === 'online' && user && !user.isAnonymous;
        if (!isOnline) {
            return (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/5">
                    <CloudOff size={10} className="text-slate-500" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{t.offline}</span>
                </div>
            );
        }
        if (syncStatus === 'saving') {
            return (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/5">
                    <RefreshCw size={10} className="text-gold animate-spin" />
                    <span className="text-[9px] font-bold text-gold uppercase tracking-tighter">{t.saving}</span>
                </div>
            );
        }
        if (syncStatus === 'error') {
             return (
                <button onClick={actions.retrySync} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors">
                    <AlertCircle size={10} className="text-red-400" />
                    <span className="text-[9px] font-bold text-red-400 uppercase tracking-tighter">{t.syncError}</span>
                </button>
            );
        }
        return (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/5 transition-all duration-500">
                <Check size={10} className="text-[#5B9A8B]" />
                <span className="text-[9px] font-bold text-[#5B9A8B] uppercase tracking-tighter">{t.saved}</span>
            </div>
        );
    };

    return (
        <div className={`min-h-[100dvh] bg-[#000000] text-[#E0E0E0] font-sans flex flex-col max-w-md mx-auto relative shadow-2xl transition-all duration-700 overflow-hidden ${isRiskAlert ? 'shadow-[0_0_50px_rgba(208,90,90,0.3)] border-x border-red-500/20' : ''}`}>
            
            <div className="fixed inset-0 pointer-events-none z-0 transition-all duration-1000 ease-in-out" style={{ background: moodGradient }} />

            {isRiskAlert && (
                <div className="bg-[#D05A5A]/10 border-b border-[#D05A5A]/30 backdrop-blur-md px-4 py-2 flex items-center justify-between sticky top-0 z-50 animate-in slide-in-from-top duration-500">
                    <div className="flex items-center gap-2">
                        <AlertOctagon size={16} className="text-[#D05A5A] animate-pulse" />
                        <span className="text-xs font-bold text-[#D05A5A] uppercase tracking-wide">
                             {/* Display logic: If MDD triggered, show MDD. Else show Streak. */}
                             {isDDAlert 
                                ? (lang === 'zh' ? `回撤 ${formatDecimal(Math.abs(metrics.currentDD))}% 已達警戒 (${ddThreshold}%)` : `Drawdown ${formatDecimal(Math.abs(metrics.currentDD))}% hits limit (${ddThreshold}%)`)
                                : (lang === 'zh' ? `連敗 ${riskStreaks.currentLoss} 次，建議暫停交易` : `Lost ${riskStreaks.currentLoss} in a row. Take a break.`)
                             }
                        </span>
                    </div>
                    {/* Option to increase threshold temporarily if user dismisses */}
                    <button onClick={() => isDDAlert ? setDdThreshold(99) : setMaxLossStreak(99)} className="text-[10px] text-[#D05A5A] underline opacity-80 hover:opacity-100">{lang === 'zh' ? '忽略' : 'Dismiss'}</button>
                </div>
            )}

            {view !== 'settings' && (
                <div className="flex flex-col bg-transparent rounded-b-[32px] border-b border-white/5 z-20 relative overflow-hidden shrink-0">
                    <div className="px-5 pt-6 flex flex-col w-full relative z-10">
                        <div className="flex justify-between items-center mb-2 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-lg bg-[#25282C] border border-white/5 shadow-sm"><Activity size={14} color={THEME.BLUE} /></div>
                                <SyncIndicator />
                            </div>
                            <div className="flex items-center gap-3">
                                <PortfolioSelector portfolios={portfolios} activeIds={activePortfolioIds} onChange={setActivePortfolioIds} lang={lang} />
                                <button onClick={() => setHideAmounts(!hideAmounts)} className="text-slate-500 hover:text-white transition-colors p-1">{hideAmounts ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                            </div>
                        </div>

                        <div className="flex flex-col mb-3 shrink-0">
                            <div className="flex justify-between items-baseline mb-1">
                                <h1 className="text-4xl font-bold font-barlow-numeric tracking-tight text-[#C8B085]">
                                    {hideAmounts ? '****' : metrics.currentEq?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </h1>
                                <div className="text-right">
                                    {metrics.isPeak ? (
                                        <div className="flex items-center justify-end gap-1 text-[#C8B085] animate-pulse">
                                            <TrendingUp size={12} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">{t.newPeak}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-end gap-1 text-slate-500">
                                            <span className="text-[10px] font-bold uppercase tracking-wider">{t.currentDD}</span>
                                            <span className="text-xs font-bold font-barlow-numeric" style={{ color: THEME.GREEN }}>{formatDecimal(metrics.currentDD)}%</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`flex items-center gap-1 text-xs font-bold font-barlow-numeric ${metrics.eqChange >= 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                    {metrics.eqChange >= 0 ? '+' : ''}{formatCurrency(metrics.eqChange, hideAmounts)}
                                    <span className="opacity-60">({metrics.eqChangePct >= 0 ? '+' : ''}{formatDecimal(metrics.eqChangePct)}%)</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mb-3 shrink-0">
                            <FrequencySelector currentFreq={frequency} setFreq={setFrequency} lang={lang} />
                            <TimeRangeSelector currentRange={timeRange} setRange={(r: any) => { if(r === 'CUSTOM') setIsDatePickerOpen(true); else { setTimeRange(r); setCustomRange({start: null, end: null}); }}} lang={lang} customRangeLabel={customRange.start ? `${customRange.start.slice(5)}...` : undefined} />
                            <button 
                                onClick={() => setIsFilterOpen(!isFilterOpen)} 
                                className={`h-[28px] w-[28px] flex items-center justify-center rounded-lg border transition-all ${isFilterOpen || hasActiveFilters ? 'bg-[#C8B085] text-black border-[#C8B085] shadow-[0_0_10px_rgba(200,176,133,0.3)]' : 'bg-[#25282C] border-white/5 text-slate-400 hover:text-white'}`}
                            >
                                <Filter size={14} />
                            </button>
                        </div>
                        {isFilterOpen && (
                            <div className="grid grid-cols-2 gap-2 mb-3 shrink-0 animate-in fade-in slide-in-from-top-2">
                                <MultiSelectDropdown options={strategies} selected={filterStrategy} onChange={setFilterStrategy} icon={Activity} defaultLabel={t.allStrategies} lang={lang} />
                                <MultiSelectDropdown options={emotions} selected={filterEmotion} onChange={setFilterEmotion} icon={BrainCircuit} defaultLabel={t.allEmotions} lang={lang} />
                            </div>
                        )}

                        <div className="w-full flex flex-col gap-1 -mx-2 relative transition-none" style={{ height: chartHeight }}>
                            <div className="flex-1 min-h-0 relative w-full">
                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                    <ComposedChart 
                                        data={metrics.curve} 
                                        margin={chartMargin} 
                                        onMouseMove={handleChartMouseMove}
                                    >
                                        <defs>
                                            <filter id="glow-line" height="200%">
                                                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                                                <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.32 0 0 0 0 0.43 0 0 0 0 0.51 0 0 0 0.5 0" result="coloredBlur" />
                                                <feMerge>
                                                    <feMergeNode in="coloredBlur" />
                                                    <feMergeNode in="SourceGraphic" />
                                                </feMerge>
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
                                        <XAxis dataKey="date" hide padding={{ left: 0, right: 0 }} />
                                        <Tooltip content={<CustomTooltip hideAmounts={hideAmounts} lang={lang} portfolios={portfolios} />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                                        <ReferenceLine y={0} yAxisId="pnl" stroke="#FFFFFF" strokeOpacity={0.1} />
                                        {activePortfolioIds.map((pid) => (
                                            <React.Fragment key={pid}>
                                                <Bar 
                                                    dataKey={`${pid}_pos`} 
                                                    stackId="a" 
                                                    fill={`url(#gradP-pos-${pid})`} 
                                                    radius={[2, 2, 0, 0]} 
                                                    barSize={8} 
                                                    yAxisId="pnl" 
                                                    isAnimationActive={true}
                                                    animationDuration={500}
                                                    animationEasing="ease-in-out"
                                                />
                                                <Bar 
                                                    dataKey={`${pid}_neg`} 
                                                    stackId="a" 
                                                    fill={`url(#gradP-neg-${pid})`} 
                                                    radius={[4, 4, 0, 0]} 
                                                    barSize={8} 
                                                    yAxisId="pnl"
                                                    isAnimationActive={true}
                                                    animationDuration={500}
                                                    animationEasing="ease-in-out"
                                                />
                                            </React.Fragment>
                                        ))}
                                        <Line 
                                            type="monotone" 
                                            dataKey="equity" 
                                            stroke={THEME.BLUE} 
                                            strokeWidth={2} 
                                            dot={(props) => <CustomPeakDot {...props} dataLength={metrics.curve.length} />} 
                                            activeDot={{ r: 4, strokeWidth: 0 }} 
                                            yAxisId="equity" 
                                            isAnimationActive={true}
                                            animationDuration={500}
                                            animationEasing="ease-in-out"
                                            filter="url(#glow-line)" 
                                        />
                                        <YAxis yAxisId="pnl" hide domain={['auto', 'auto']} />
                                        <YAxis yAxisId="equity" orientation="right" hide domain={['auto', 'auto']} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="h-[15%] min-h-[30px] w-full relative opacity-60">
                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                    <BarChart data={metrics.drawdown} margin={{ ...chartMargin, top: 0 }}>
                                        <defs><linearGradient id="gradDDMain" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={THEME.DD_GRADIENT_TOP} stopOpacity={1}/><stop offset="100%" stopColor={THEME.DD_GRADIENT_BOTTOM} stopOpacity={0.7}/></linearGradient></defs>
                                        <XAxis dataKey="date" hide padding={{ left: 0, right: 0 }} />
                                        <YAxis hide domain={['dataMin', 0]} />
                                        <Tooltip cursor={{fill: 'transparent'}} content={() => null} />
                                        <Bar 
                                            dataKey="ddPct" 
                                            radius={[4, 4, 0, 0]} 
                                            fill="url(#gradDDMain)" 
                                            barSize={8} 
                                            isAnimationActive={true} 
                                            animationDuration={500} 
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* DRAG HANDLE */}
                        <div 
                            className="w-full flex items-center justify-center py-1 cursor-row-resize touch-none opacity-40 hover:opacity-100 active:opacity-100 transition-opacity"
                            onMouseDown={onMouseDown}
                            onTouchStart={onTouchStart}
                        >
                            <div className="w-12 h-1 bg-white/10 rounded-full group-hover:bg-[#C8B085] transition-colors" />
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Section - Content */}
            <div className="relative w-full bg-transparent flex-1 min-h-[57dvh]">
                <div className="px-4 py-5 pb-32 space-y-5 min-h-full">
                    {view === 'stats' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-3">
                            {hasActiveFilters && (
                                <div className="flex items-center justify-between bg-[#C8B085]/10 border border-[#C8B085]/30 p-2 rounded-lg">
                                    <span className="text-[10px] text-[#C8B085] font-bold uppercase flex items-center gap-2"><Filter size={10} /> {lang === 'zh' ? '篩選模式開啟中' : 'Filtering Active'}</span>
                                    <button onClick={() => { setFilterStrategy([]); setFilterEmotion([]); }} className="text-[10px] text-slate-400 underline hover:text-white">{lang === 'zh' ? '清除篩選' : 'Clear'}</button>
                                </div>
                            )}
                            
                            {/* UPDATED: Scheme 2 Floating Glass Tiles (Grid with gaps, individual glass cards) */}
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
                                    <StrategyListView 
                                        data={Object.entries(metrics.stratStats).map(([name, stat]) => ({ name, stat }))} 
                                        onSelect={setDetailStrategy} 
                                        lang={lang} 
                                    />
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
                                                        <Scatter 
                                                            data={bubbleData} 
                                                            fill={THEME.GOLD}
                                                            onMouseEnter={(p) => setHoveredStrategy(p.name)}
                                                            onMouseLeave={() => setHoveredStrategy(null)}
                                                            onClick={(p) => { setHoveredStrategy(p.name); setDetailStrategy(p.name); }}
                                                        >
                                                            <LabelList dataKey="name" content={renderSmartLabel} />
                                                            {bubbleData.map((entry, index) => {
                                                                const isDimmed = hoveredStrategy && hoveredStrategy !== entry.name;
                                                                const isUnderperforming = entry.winRate < 50 && entry.riskReward < 1;
                                                                return (
                                                                    <Cell 
                                                                        key={`cell-${index}`} 
                                                                        fill={entry.pnl >= 0 ? THEME.RED : THEME.GREEN} 
                                                                        fillOpacity={isDimmed ? 0.1 : (isUnderperforming ? 0.9 : 0.8)} 
                                                                        stroke={entry.pnl >= 0 ? THEME.RED : THEME.GREEN} 
                                                                        strokeWidth={isDimmed ? 0 : (isUnderperforming ? 2 : 1)}
                                                                        style={{
                                                                            filter: isDimmed ? 'none' : (isUnderperforming ? `drop-shadow(0 0 6px ${THEME.GREEN})` : 'none'),
                                                                            transition: 'all 0.3s ease'
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
                                        
                                        {/* SCROLLABLE STRATEGY LEGEND (INTERACTIVE) */}
                                        {bubbleData.length > 0 && (
                                            <div className="w-full overflow-x-auto no-scrollbar mask-gradient touch-pan-x">
                                                <div className="flex gap-2 pb-2 pr-4">
                                                    {bubbleData.map((item) => (
                                                        <div 
                                                            key={item.id} 
                                                            className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/5 cursor-pointer transition-all duration-300 ${hoveredStrategy === item.name ? 'bg-white/10 scale-105 border-white/20' : 'bg-[#1A1C20]'}`}
                                                            style={{ opacity: (hoveredStrategy && hoveredStrategy !== item.name) ? 0.3 : 1 }}
                                                            onMouseEnter={() => setHoveredStrategy(item.name)}
                                                            onMouseLeave={() => setHoveredStrategy(null)}
                                                            onTouchStart={() => setHoveredStrategy(item.name)} // Mobile touch support
                                                            onClick={() => setDetailStrategy(item.name)}
                                                        >
                                                            <div 
                                                                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold font-mono text-[#0B0C10]" 
                                                                style={{ backgroundColor: item.pnl >= 0 ? THEME.RED : THEME.GREEN }}
                                                            >
                                                                {item.id}
                                                            </div>
                                                            <span className={`text-[10px] font-bold whitespace-nowrap truncate max-w-[100px] ${hoveredStrategy === item.name ? 'text-white' : 'text-slate-300'}`}>{item.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
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
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <MultiSelectDropdown options={strategies} selected={filterStrategy} onChange={setFilterStrategy} icon={Filter} defaultLabel={t.allStrategies} lang={lang} />
                                <MultiSelectDropdown options={emotions} selected={filterEmotion} onChange={setFilterEmotion} icon={BrainCircuit} defaultLabel={t.allEmotions} lang={lang} />
                            </div>
                            <LogsView trades={filteredTrades} lang={lang} hideAmounts={hideAmounts} portfolios={portfolios} onEdit={(t: Trade) => { setForm({...t, amount: String(Math.abs(t.pnl)), type: t.pnl >= 0 ? 'profit' : 'loss', portfolioId: t.portfolioId || ''}); setEditingId(t.id); setIsModalOpen(true); }} onDelete={actions.deleteTrade} />
                        </div>
                    )}
                    {view === 'settings' && (
                        <SettingsView lang={lang} setLang={setLang} trades={trades} actions={actions} ddThreshold={ddThreshold} setDdThreshold={setDdThreshold} maxLossStreak={maxLossStreak} setMaxLossStreak={setMaxLossStreak} lossColor={lossColor} setLossColor={setLossColor} strategies={strategies} emotions={emotions} portfolios={portfolios} activePortfolioIds={activePortfolioIds} setActivePortfolioIds={setActivePortfolioIds} onBack={() => setView('stats')} currentUser={user} onLogin={login} onLogout={logout} lastBackupTime={lastBackupTime} />
                    )}
                </div>
            </div>

            <TradeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} form={form} setForm={setForm} onSubmit={(e: React.FormEvent) => { e.preventDefault(); actions.saveTrade({ id: form.id, date: form.date, pnl: form.type === 'profit' ? Math.abs(parseFloat(form.amount || '0')) : -Math.abs(parseFloat(form.amount || '0')), strategy: form.strategy, note: form.note, emotion: form.emotion, image: form.image, portfolioId: form.portfolioId }, editingId); setIsModalOpen(false); }} isEditing={!!editingId} strategies={strategies} emotions={emotions} portfolios={portfolios} lang={lang} />
            <StrategyDetailModal strategy={detailStrategy} metrics={strategyMetrics ? {...strategyMetrics, netProfit: strategyMetrics.eqChange} : null} onClose={() => setDetailStrategy(null)} lang={lang} hideAmounts={hideAmounts} ddThreshold={ddThreshold} />
            <CustomDateRangeModal isOpen={isDatePickerOpen} onClose={() => setIsDatePickerOpen(false)} onApply={(s: string, e: string) => { setCustomRange({ start: s, end: e }); setTimeRange('CUSTOM'); setIsDatePickerOpen(false); }} initialRange={customRange} lang={lang} />
            <SyncConflictModal isOpen={isSyncModalOpen} onResolve={actions.resolveSyncConflict} lang={lang} isSyncing={isSyncing} />

             {/* PREMIUM FLOATING NAVIGATION BAR - TALLER, CLEANER, NO DOTS */}
             <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[350px] pointer-events-none h-16">
                {/* 1. VISUAL BACKGROUND LAYER (WITH CUTOUT) */}
                {/* We use CSS Masking to punch a hole in the middle of the pill where the button sits */}
                <div 
                    className="absolute inset-0 bg-[#1A1C20]/20 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl ring-1 ring-white/5"
                    style={{
                        // Punch a hole in the center (r=28px transparent, then black which means opaque)
                        // Button radius is 32px, so 28px gives a nice slight overlap/rim effect
                        WebkitMaskImage: 'radial-gradient(circle at 50% 50%, transparent 28px, black 28.5px)',
                        maskImage: 'radial-gradient(circle at 50% 50%, transparent 28px, black 28.5px)'
                    }}
                />

                {/* 2. INTERACTION LAYER */}
                <div className="relative h-full w-full pointer-events-auto flex items-center justify-between px-3">
                    
                    {/* Left Group */}
                    <div className="flex items-center gap-1 h-full py-2">
                        {[
                            { id: 'stats', label: t.stats }, 
                            { id: 'calendar', label: t.journal }
                        ].map(tab => {
                            const isActive = view === tab.id;
                            return (
                                <button 
                                    key={tab.id} 
                                    onClick={() => setView(tab.id as any)} 
                                    className={`
                                        relative w-16 h-full rounded-2xl transition-all duration-500 group flex flex-col items-center justify-center overflow-hidden
                                        ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}
                                    `}
                                >
                                    {/* Text with Color Change instead of Dot */}
                                    <span className={`text-[10px] font-bold uppercase tracking-wider block transition-all duration-300 relative z-10 ${isActive ? 'text-[#C8B085] scale-110' : 'text-slate-500 group-hover:text-slate-300'}`}>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* CENTRAL FLOATING BUTTON - PREMIUM FROSTED GLASS - NOW A PERFECT CIRCLE */}
                    {/* Positioned absolutely in the center, floating above the cutout */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[64px] h-[64px] rounded-full z-20 pointer-events-auto transition-all group overflow-hidden shadow-[0_8px_32px_rgba(200,176,133,0.3)] hover:scale-105 active:scale-95">
                        <button 
                            onClick={() => { setEditingId(null); setForm({ id: '', pnl: 0, date: getLocalDateStr(), amount: '', type: 'profit', strategy: '', note: '', emotion: '', image: '', portfolioId: activePortfolioIds[0] || '' }); setIsModalOpen(true); }} 
                            className="w-full h-full flex items-center justify-center text-[#C8B085] relative z-10 bg-[#C8B085]/20 backdrop-blur-xl border border-[#C8B085]/40 rounded-full"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50 rounded-full"></div>
                            <Plus size={32} strokeWidth={2.5} className="transition-transform duration-300 group-hover:rotate-90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] relative z-20" />
                        </button>
                    </div>

                    {/* Right Group */}
                    <div className="flex items-center gap-1 h-full py-2">
                        {[
                            { id: 'logs', label: t.logs }, 
                            { id: 'settings', label: t.settings }
                        ].map(tab => {
                            const isActive = view === tab.id;
                            return (
                                <button 
                                    key={tab.id} 
                                    onClick={() => setView(tab.id as any)} 
                                    className={`
                                        relative w-16 h-full rounded-2xl transition-all duration-500 group flex flex-col items-center justify-center overflow-hidden
                                        ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}
                                    `}
                                >
                                    <span className={`text-[10px] font-bold uppercase tracking-wider block transition-all duration-300 relative z-10 ${isActive ? 'text-[#C8B085] scale-110' : 'text-slate-500 group-hover:text-slate-300'}`}>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
