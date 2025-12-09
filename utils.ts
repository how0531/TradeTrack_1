
import { THEME, I18N } from './constants';
import { Trade, Portfolio, Frequency, Metrics, StrategyStat, Lang } from './types';

// --- STORAGE HELPERS ---
export const safeJSONParse = <T>(key: string, fallback: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        console.error(`Error parsing ${key}:`, e);
        return fallback;
    }
};

// --- FORMATTERS ---
export const formatDecimal = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return '0.00';
    return Number(val).toFixed(2);
};

export const formatCurrency = (val: number | undefined | null, hideAmounts = false) => {
    if (hideAmounts) return '****';
    if (val === undefined || val === null || isNaN(val)) return '$0';
    try {
        return new Intl.NumberFormat('zh-TW', { 
            style: 'currency', 
            currency: 'TWD', 
            minimumFractionDigits: 0, 
            maximumFractionDigits: 0 
        }).format(val);
    } catch (e) {
        return '$' + val;
    }
};

export const formatPnlK = (val: number, hideAmounts = false) => {
    if (hideAmounts) return '****';
    if (isNaN(val)) return '$0';
    if (Math.abs(val) < 10000) return formatCurrency(val, false);
    return `${val >= 0 ? '+' : ''}${(val / 1000).toFixed(1)}K`;
};

export const formatDate = (d: string | Date, lang: Lang = 'zh') => {
    if (!d || d === 'Start' || d === 'Initial') return lang === 'zh' ? '起點' : 'Start';
    try {
        if (typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [y, m, day] = d.split('-');
            return `${m}/${day}`;
        }
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d); 
        return dateObj.toLocaleDateString(lang === 'zh' ? 'zh-TW' : 'en-US', { month: 'numeric', day: 'numeric' });
    } catch (e) {
        return String(d);
    }
};

export const getPnlColor = (val: number) => val >= 0 ? THEME.RED : THEME.LOSS_WHITE;

export const getLocalDateStr = (dateObj = new Date()) => {
    const offset = dateObj.getTimezoneOffset() * 60000;
    return new Date(dateObj.getTime() - offset).toISOString().split('T')[0];
};

// --- CSV UTILS ---
export const downloadCSV = (trades: Trade[]) => {
    const headers = ['ID', 'Date', 'Type', 'Amount', 'PnL', 'Strategy', 'Emotion', 'Note', 'ImageURL', 'PortfolioID'];
    const rows = trades.map(t => [
        t.id, t.date, t.pnl >= 0 ? 'Profit' : 'Loss', Math.abs(t.pnl), t.pnl,
        `"${(t.strategy || '').replace(/"/g, '""')}"`, `"${(t.emotion || '').replace(/"/g, '""')}"`,
        `"${(t.note || '').replace(/"/g, '""')}"`, t.image || '', t.portfolioId || 'default'
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `trade_journal_backup_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- CORE CALCULATION LOGIC ---
const getPeriodKey = (dateStr: string, freq: Frequency) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Invalid';
    
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    // const day = d.getUTCDate(); // Unused but kept for logic consistency reference
    
    if (freq === 'yearly') return `${y}`;
    if (freq === 'quarterly') return `${y}-Q${Math.ceil(m/3)}`;
    if (freq === 'monthly') return `${y}-${String(m).padStart(2, '0')}`;
    if (freq === 'weekly') {
        const firstDayOfYear = new Date(Date.UTC(y, 0, 1));
        const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getUTCDay() + 1) / 7);
        return `${y}-W${String(weekNum).padStart(2, '0')}`;
    }
    return dateStr; 
};

export const formatPeriodLabel = (key: string, freq: Frequency, lang: Lang) => {
    if (!key) return '';
    if (key === 'Start') return lang === 'zh' ? '起始' : 'Start';
    if (freq === 'daily') {
        const [y, m, d] = key.split('-');
        return `${m}/${d}`;
    }
    return key; 
};

export const calculateMetrics = (
    trades: Trade[],
    portfolios: Portfolio[],
    activePortfolioIds: string[],
    frequency: Frequency,
    lang: Lang,
    startDateFilter: Date | null,
    endDateFilter: Date | null
): Metrics => {
    // Initial Capital Aggregation
    const activeInitialCapital = portfolios
        .filter(p => activePortfolioIds.includes(p.id))
        .reduce((sum, p) => sum + (p.initialCapital || 0), 0);

    const safeCapital = activeInitialCapital > 0 ? activeInitialCapital : 100000;

    if (trades.length === 0) {
        return { 
            curve: [], drawdown: [], currentEq: safeCapital, 
            eqChange: 0, eqChangePct: 0, currentDD: 0, maxDD: 0, 
            winRate: 0, pf: 0, stratStats: {}, isPeak: true, sharpe: 0, avgWin: 0, avgLoss: 0, totalTrades: 0 
        };
    }

    // Helper: Sort trades by date
    const sortedTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Date Bounds
    const dates = sortedTrades.map(t => new Date(t.date).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(); 
    const lastTradeDate = new Date(Math.max(...dates));
    const minDateStr = getLocalDateStr(minDate);
    const maxDateStr = getLocalDateStr(maxDate > lastTradeDate ? maxDate : lastTradeDate);

    // Group trades by date and portfolio
    const dailyMap: Record<string, { total: number; [key: string]: number }> = {};
    sortedTrades.forEach(t => {
        if (!dailyMap[t.date]) dailyMap[t.date] = { total: 0 };
        const pid = t.portfolioId || 'main';
        if (!dailyMap[t.date][pid]) dailyMap[t.date][pid] = 0;
        
        const val = Number(t.pnl) || 0;
        dailyMap[t.date][pid] += val;
        dailyMap[t.date].total += val;
    });

    const curve: any[] = [];
    const drawdown: any[] = [];
    const periodReturns: number[] = [];
    
    let currentTotalEquity = safeCapital;
    let currentPeriodPnLs: Record<string, number> = {}; 
    let hasPeriodPnL = false;
    let peak = safeCapital;
    let previousEquity = safeCapital;

    let currDateStr = minDateStr;
    let currentPeriodKey = getPeriodKey(currDateStr, frequency);
    let safetyCounter = 0;
    const MAX_ITERATIONS = 5000;

    // Push Start Point
    curve.push({ 
        date: 'Start', equity: safeCapital, peak: safeCapital, pnl: 0, isNewPeak: true, 
        ddPct: 0, ddAmt: 0, fullDate: new Date(minDate)
    });

    const addDays = (dateStr: string, days: number) => {
        const d = new Date(dateStr);
        d.setDate(d.getDate() + days);
        return getLocalDateStr(d);
    };

    while (currDateStr <= maxDateStr && safetyCounter < MAX_ITERATIONS) {
        safetyCounter++;
        const dayData = dailyMap[currDateStr];
        
        if (dayData) {
            currentTotalEquity += dayData.total;
            hasPeriodPnL = true;
            Object.keys(dayData).forEach(key => {
                if (key !== 'total') {
                    currentPeriodPnLs[key] = (currentPeriodPnLs[key] || 0) + dayData[key];
                }
            });
        }

        const periodKey = getPeriodKey(currDateStr, frequency);
        
        if (periodKey !== currentPeriodKey) {
            const prevDateStr = addDays(currDateStr, -1);
            let isNewPeak = false;
            if (currentTotalEquity > peak) { peak = currentTotalEquity; isNewPeak = true; }
            const ddAmt = currentTotalEquity - peak;
            const ddPct = peak > 0 ? (ddAmt / peak) * 100 : 0;
            if (previousEquity > 0) periodReturns.push((currentTotalEquity - previousEquity) / previousEquity);
            previousEquity = currentTotalEquity;

            const point: any = { 
                date: formatPeriodLabel(currentPeriodKey, frequency, lang), 
                equity: currentTotalEquity, peak, isNewPeak, ddAmt, ddPct, 
                fullDate: new Date(prevDateStr)
            };
            
            if (hasPeriodPnL) {
                Object.entries(currentPeriodPnLs).forEach(([pid, val]) => {
                    point[pid] = val;
                    // Split for chart coloring
                    point[`${pid}_pos`] = val >= 0 ? val : 0;
                    point[`${pid}_neg`] = val < 0 ? val : 0;
                });
            }
            
            curve.push(point);
            
            currentPeriodPnLs = {};
            hasPeriodPnL = false;
            currentPeriodKey = periodKey;
        }
        currDateStr = addDays(currDateStr, 1);
    }

    // Final Period
    let isNewPeak = false;
    if (currentTotalEquity > peak) { peak = currentTotalEquity; isNewPeak = true; }
    const ddAmt = currentTotalEquity - peak;
    const ddPct = peak > 0 ? (ddAmt / peak) * 100 : 0;
    if (previousEquity > 0) periodReturns.push((currentTotalEquity - previousEquity) / previousEquity);

    const finalPoint: any = { 
        date: formatPeriodLabel(currentPeriodKey, frequency, lang), 
        equity: currentTotalEquity, peak, isNewPeak, ddAmt, ddPct, 
        fullDate: new Date(maxDateStr)
    };
    if (hasPeriodPnL) {
        Object.entries(currentPeriodPnLs).forEach(([pid, val]) => {
            finalPoint[pid] = val;
            finalPoint[`${pid}_pos`] = val >= 0 ? val : 0;
            finalPoint[`${pid}_neg`] = val < 0 ? val : 0;
        });
    }
    curve.push(finalPoint);

    // Filter by Date Range for Display
    let displayCurve = curve;
    let displayDrawdown = curve.filter(c => c.date !== 'Start').map(c => ({ date: c.date, ddPct: c.ddPct, fullDate: c.fullDate }));

    if (startDateFilter) {
        displayCurve = displayCurve.filter(p => p.date !== 'Start' && p.fullDate >= startDateFilter && (!endDateFilter || p.fullDate <= endDateFilter));
        displayDrawdown = displayDrawdown.filter(p => p.fullDate >= startDateFilter && (!endDateFilter || p.fullDate <= endDateFilter));
    }

    // Basic Stats
    let wins = 0, losses = 0, gProfit = 0, gLoss = 0;
    trades.forEach(t => {
        const p = Number(t.pnl) || 0;
        if (p > 0) { wins++; gProfit += p; } else if (p < 0) { losses++; gLoss += Math.abs(p); }
    });

    const lastPoint = curve[curve.length - 1];
    const currentEq = lastPoint?.equity || safeCapital;
    const eqChange = currentEq - safeCapital;
    const eqChangePct = safeCapital > 0 ? (eqChange / safeCapital) * 100 : 0;
    const currentDD = lastPoint?.ddPct || 0;
    const maxDD = displayDrawdown.length > 0 ? Math.min(...displayDrawdown.map(d => d.ddPct || 0)) : 0;
    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const pf = gLoss === 0 ? (gProfit > 0 ? 999.0 : 0.0) : gProfit / gLoss;
    const avgWin = wins > 0 ? gProfit/wins : 0;
    const avgLoss = losses > 0 ? gLoss/losses : 0;

    // Sharpe
    let sharpe = 0;
    if (periodReturns.length > 1) {
        const meanReturn = periodReturns.reduce((a, b) => a + b, 0) / periodReturns.length;
        const variance = periodReturns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / (periodReturns.length - 1);
        const stdDev = Math.sqrt(variance);
        let annualFactor = frequency === 'weekly' ? 52 : frequency === 'monthly' ? 12 : frequency === 'quarterly' ? 4 : frequency === 'yearly' ? 1 : 252;
        if (stdDev > 0) sharpe = (meanReturn / stdDev) * Math.sqrt(annualFactor);
    }

    // Strategy Stats
    const stratStats: Record<string, StrategyStat> = {};
    const uniqueStrats = [...new Set(trades.filter(t => t.strategy).map(t => t.strategy!))];
    uniqueStrats.forEach(strat => {
        const sTrades = trades.filter(t => t.strategy === strat).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let sEq = 0, sPeak = 0, sWin = 0, sMinDD = 0; 
        sTrades.forEach(t => {
            const val = Number(t.pnl) || 0; sEq += val; if (val > 0) sWin++;
            if (sEq > sPeak) sPeak = sEq;
            const sDDVal = sPeak > 0 ? (sEq - sPeak) / sPeak : 0; if (sDDVal < sMinDD) sMinDD = sDDVal;
        });
        const sCurDDPct = sPeak > 0 ? ((sEq - sPeak) / sPeak) * 100 : 0; 
        const sMDDPct = sMinDD * 100;
        stratStats[strat] = { pnl: sEq, trades: sTrades.length, winRate: sTrades.length > 0 ? (sWin / sTrades.length) * 100 : 0, mddPct: sMDDPct, curDDPct: sCurDDPct, isNewHigh: Math.abs(sCurDDPct) < 0.1 && sTrades.length > 0 };
    });

    return { curve: displayCurve, drawdown: displayDrawdown, currentEq, eqChange, eqChangePct, currentDD, maxDD, winRate, pf, stratStats, isPeak: lastPoint?.isNewPeak, sharpe, avgWin, avgLoss, totalTrades };
};

export const calculateStreaks = (trades: Trade[]): { current: number; best: number } => {
    const dailyPnls: Record<string, number> = {};
    trades.forEach(t => { dailyPnls[t.date] = (dailyPnls[t.date] || 0) + Number(t.pnl); });
    const dates = Object.keys(dailyPnls).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    let current = 0, best = 0, temp = 0;
    dates.forEach(d => { if (dailyPnls[d] > 0) { temp++; if (temp > best) best = temp; } else { temp = 0; } });
    for (let i = dates.length - 1; i >= 0; i--) { if (dailyPnls[dates[i]] > 0) current++; else break; }
    return { current, best };
};
