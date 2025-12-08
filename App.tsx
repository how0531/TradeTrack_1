import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  TrendingUp, Target, Activity, Zap, TrendingDown, List, Eye, EyeOff, Settings, Plus,
  ShieldAlert, AlertCircle, ChevronRight, Filter, BrainCircuit, Loader, LogOut, User
} from 'lucide-react';
import { ComposedChart, Line, Bar, BarChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { initializeApp, getApps, getApp } from 'firebase/app';
import firebase from 'firebase/compat/app';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, 
  setPersistence, browserLocalPersistence, GoogleAuthProvider, signInWithPopup, signOut, User as FirebaseUser 
} from 'firebase/auth';
import { getFirestore, doc, addDoc, setDoc, updateDoc, onSnapshot, collection, deleteDoc, writeBatch } from 'firebase/firestore';

// Modules
import { THEME, I18N, DEFAULT_PALETTE } from './constants';
import { Trade, Portfolio, Metrics, Frequency, TimeRange, Lang, StrategyStat } from './types';
import { safeJSONParse, getLocalDateStr, calculateMetrics, calculateStreaks, formatCurrency, formatDecimal, downloadCSV, getPnlColor, formatPnlK } from './utils';

// Components
import { StatCard, PortfolioSelector, FrequencySelector, TimeRangeSelector, MultiSelectDropdown } from './components/UI';
import { CalendarView, LogsView, SettingsView } from './components/Views';
import { TradeModal, StrategyDetailModal, CustomDateRangeModal } from './components/Modals';

// Custom Tooltip (Inline for Recharts access)
const CustomTooltip = ({ active, payload, hideAmounts, lang, portfolios }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const t = I18N[lang] || I18N['zh'];
        const systemKeys = ['date', 'equity', 'peak', 'pnl', 'isNewPeak', 'ddAmt', 'ddPct', 'fullDate', 'label'];
        const activePidsInPoint = Object.keys(data).filter(key => !systemKeys.includes(key) && data[key] !== 0);

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
                                        <span className={`font-barlow-numeric text-[10px] ${isProfit ? 'text-red-400' : 'text-green-400'}`}>{isProfit ? '+' : ''}{formatCurrency(data[pid], hideAmounts)}</span>
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
    // --- State ---
    const [status, setStatus] = useState('loading');
    const [db, setDb] = useState<any>(null);
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [config, setConfig] = useState<any>(null);
    
    // Data
    const [portfolios, setPortfolios] = useState<Portfolio[]>(() => safeJSONParse('local_portfolios', [{ id: 'main', name: 'Main Account', initialCapital: 100000, color: DEFAULT_PALETTE[0] }]));
    const [activePortfolioIds, setActivePortfolioIds] = useState<string[]>(() => safeJSONParse('app_active_portfolios', ['main']));
    const [trades, setTrades] = useState<Trade[]>([]);
    const [strategies, setStrategies] = useState<string[]>([]);
    const [emotions, setEmotions] = useState<string[]>([]);
    
    // UI State
    const [view, setView] = useState<'stats' | 'calendar' | 'logs' | 'settings'>('stats');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [form, setForm] = useState<Trade>({ date: getLocalDateStr(), amount: '', type: 'profit', strategy: '', note: '', emotion: '', image: '', portfolioId: '' });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [detailStrategy, setDetailStrategy] = useState<string | null>(null);
    const [filterStrategy, setFilterStrategy] = useState<string[]>([]);
    const [filterEmotion, setFilterEmotion] = useState<string[]>([]);
    const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
    const [frequency, setFrequency] = useState<Frequency>('daily');
    const [customRange, setCustomRange] = useState<{start: string | null, end: string | null}>({ start: null, end: null });
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    // Persistent Settings
    const [lang, setLang] = useState<Lang>(() => safeJSONParse('app_lang', 'zh'));
    const [hideAmounts, setHideAmounts] = useState(() => safeJSONParse('app_hide_amounts', false));
    const [ddThreshold, setDdThreshold] = useState(() => safeJSONParse('app_dd_threshold', 20));

    const t = I18N[lang] || I18N['zh'];

    // --- Firebase Init ---
    useEffect(() => {
        let isMounted = true;
        const init = async () => {
            try {
                // @ts-ignore
                const confStr = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
                // @ts-ignore
                const aid = typeof __app_id !== 'undefined' ? __app_id : 'local';
                
                if (!confStr) throw new Error("No config");
                
                // Use compat app for initialization to workaround missing exports in firebase/app modular
                const firebaseApp = firebase.apps.length === 0 ? firebase.initializeApp(JSON.parse(confStr)) : firebase.app();
                
                const _auth = getAuth(firebaseApp as any);
                const _db = getFirestore(firebaseApp as any);
                
                if(isMounted) { setDb(_db); setConfig({ appId: aid }); }
                await setPersistence(_auth, browserLocalPersistence);
                // @ts-ignore
                const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                
                // Only sign in anonymously if not already signed in
                onAuthStateChanged(_auth, (user) => {
                    if(!isMounted) return;
                    if (user) { 
                        setCurrentUser(user);
                        setUserId(user.uid); 
                        setStatus('online'); 
                    } else { 
                        if (token) signInWithCustomToken(_auth, token).catch(() => signInAnonymously(_auth));
                        else signInAnonymously(_auth).catch(console.error);
                        
                        setCurrentUser(null);
                        // Don't clear userId immediately to prevent flash, wait for re-login or anonymous fallback
                        setStatus('offline'); 
                    }
                });
            } catch (e) {
                if(isMounted) {
                    setTrades(safeJSONParse('local_trades', []));
                    setStrategies(safeJSONParse('local_strategies', ['突破策略', '回檔承接']));
                    setEmotions(safeJSONParse('local_emotions', ['冷靜', 'FOMO', '復仇單']));
                    setStatus('offline');
                }
            }
        };
        init();
        const timer = setTimeout(() => { if (isMounted && status === 'loading') { setStatus('offline'); } }, 2500);
        return () => { isMounted = false; clearTimeout(timer); };
    }, []);

    // --- Authentication Handlers ---
    const handleGoogleLogin = async () => {
        try {
            const auth = getAuth();
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            // onAuthStateChanged will handle the state update
        } catch (error) {
            console.error("Login failed", error);
            alert("Google Login Failed. Please try again.");
        }
    };

    const handleLogout = async () => {
        try {
            const auth = getAuth();
            await signOut(auth);
            // Forces anonymous login again via the useEffect logic if needed, or stays logged out
            window.location.reload(); // Simple reload to reset state and trigger anonymous login cleanly
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    // --- Data Sync ---
    useEffect(() => {
        if (status !== 'online' || !db || !userId || !config) return;
        const tradesRef = collection(db, `artifacts/${config.appId}/users/${userId}/trade_journal`);
        const unsubTrades = onSnapshot(tradesRef, (snap) => setTrades(snap.docs.map(d => ({ id: d.id, ...d.data(), pnl: Number(d.data().pnl || 0) } as Trade))));
        const configRef = doc(db, `artifacts/${config.appId}/users/${userId}/app_config/settings`);
        const unsubConfig = onSnapshot(configRef, (snap) => { 
            if (snap.exists()) {
                const data = snap.data();
                if(data.strategies) setStrategies(data.strategies);
                if(data.emotions) setEmotions(data.emotions);
                if(data.portfolios) setPortfolios(data.portfolios);
            }
        });
        return () => { unsubTrades(); unsubConfig(); };
    }, [status, userId, db, config]);

    // --- Persist Locals ---
    useEffect(() => { localStorage.setItem('app_active_portfolios', JSON.stringify(activePortfolioIds)); }, [activePortfolioIds]);
    useEffect(() => { localStorage.setItem('app_lang', JSON.stringify(lang)); }, [lang]);
    useEffect(() => { localStorage.setItem('app_hide_amounts', JSON.stringify(hideAmounts)); }, [hideAmounts]);
    useEffect(() => { localStorage.setItem('app_dd_threshold', JSON.stringify(ddThreshold)); }, [ddThreshold]);

    // --- Actions ---
    const actions = useMemo(() => ({
        saveTrade: async (tradeData: any, id: string | null) => {
            const pid = tradeData.portfolioId || activePortfolioIds[0] || 'main';
            const dataToSave = { ...tradeData, portfolioId: pid };
            if (status === 'offline') {
                setTrades(prev => {
                    const next = id ? prev.map(t => t.id === id ? { ...dataToSave, id } : t) : [...prev, { ...dataToSave, id: Date.now().toString() }];
                    localStorage.setItem('local_trades', JSON.stringify(next));
                    return next;
                });
            } else if (db && userId) {
                const colRef = collection(db, `artifacts/${config.appId}/users/${userId}/trade_journal`);
                if (id) await updateDoc(doc(colRef, id), dataToSave); else await addDoc(colRef, { ...dataToSave, timestamp: new Date().toISOString() });
            }
        },
        deleteTrade: async (id: string) => {
            if (status === 'offline') {
                setTrades(prev => { const next = prev.filter(t => t.id !== id); localStorage.setItem('local_trades', JSON.stringify(next)); return next; });
            } else if (db && userId) await deleteDoc(doc(db, `artifacts/${config.appId}/users/${userId}/trade_journal`, id));
        },
        updateSettings: async (field: string, value: any) => {
            if (field === 'strategies') setStrategies(value); else if (field === 'emotions') setEmotions(value); else if (field === 'portfolios') setPortfolios(value);
            if (status === 'offline') {
                localStorage.setItem(`local_${field}`, JSON.stringify(value));
            } else if (db && userId) await setDoc(doc(db, `artifacts/${config.appId}/users/${userId}/app_config/settings`), { [field]: value }, { merge: true });
        },
        updatePortfolio: (id: string, field: string, value: any) => {
            const updated = portfolios.map(p => p.id === id ? { ...p, [field]: field === 'initialCapital' ? parseFloat(value) || 0 : value } : p);
            actions.updateSettings('portfolios', updated);
        },
        addStrategy: (s: string) => { if(s && !strategies.includes(s)) actions.updateSettings('strategies', [...strategies, s]); },
        deleteStrategy: (s: string) => actions.updateSettings('strategies', strategies.filter(i => i !== s)),
        handleImportCSV: (e: any) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (event) => {
                const lines = (event.target?.result as string).split('\n');
                const newTrades: any[] = [];
                const targetPid = activePortfolioIds[0] || 'main';
                for(let i=1; i<lines.length; i++) {
                    const cols = lines[i].split(','); 
                    if(cols.length < 5) continue;
                    newTrades.push({ date: cols[1], pnl: parseFloat(cols[4]), strategy: cols[5]?.replace(/"/g, ''), emotion: cols[6]?.replace(/"/g, ''), note: cols[7]?.replace(/"/g, ''), portfolioId: targetPid });
                }
                if (status === 'offline') {
                    setTrades(prev => { const next = [...prev, ...newTrades.map(t => ({...t, id: Math.random().toString()}))]; localStorage.setItem('local_trades', JSON.stringify(next)); return next; });
                } else if (db && userId) {
                    const batch = writeBatch(db);
                    const colRef = collection(db, `artifacts/${config.appId}/users/${userId}/trade_journal`);
                    newTrades.forEach(tr => batch.set(doc(colRef), tr));
                    await batch.commit();
                }
                alert(t.importSuccess);
            };
            reader.readAsText(file);
        },
        downloadCSV
    }), [status, db, userId, config, portfolios, activePortfolioIds, strategies, emotions, t]);

    // --- Computed Data ---
    const portfolioTrades = useMemo(() => trades.filter(t => activePortfolioIds.includes(t.portfolioId || 'main')), [trades, activePortfolioIds]);
    const filteredTrades = useMemo(() => {
        let res = portfolioTrades;
        if (filterStrategy.length) res = res.filter(t => filterStrategy.includes(t.strategy || ''));
        if (filterEmotion.length) res = res.filter(t => filterEmotion.includes(t.emotion || ''));
        return res;
    }, [portfolioTrades, filterStrategy, filterEmotion]);

    const metrics = useMemo(() => calculateMetrics(filteredTrades, portfolios, activePortfolioIds, frequency, lang, customRange.start ? new Date(customRange.start) : null, customRange.end ? new Date(customRange.end) : null), [filteredTrades, portfolios, activePortfolioIds, frequency, lang, customRange]);
    
    // Derived Metrics for specific views
    const streaks = useMemo(() => calculateStreaks(filteredTrades), [filteredTrades]);
    const dailyPnlMap = useMemo(() => filteredTrades.reduce((acc: any, t) => { acc[t.date] = (acc[t.date] || 0) + (Number(t.pnl) || 0); return acc; }, {}), [filteredTrades]);
    const monthlyStats = useMemo(() => {
        const y = currentMonth.getFullYear(), m = currentMonth.getMonth();
        const mTrades = filteredTrades.filter(t => { const d = new Date(t.date); return d.getFullYear() === y && d.getMonth() === m; });
        return { pnl: mTrades.reduce((a, b) => a + (Number(b.pnl)||0), 0), count: mTrades.length, winRate: mTrades.length ? (mTrades.filter(t => t.pnl > 0).length/mTrades.length)*100 : 0 };
    }, [filteredTrades, currentMonth]);

    const strategyMetrics = useMemo(() => {
        if (!detailStrategy) return null;
        const sTrades = trades.filter(t => t.strategy === detailStrategy).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        // Re-using main calculation function with single strategy filter for perfect consistency
        return calculateMetrics(sTrades, portfolios, activePortfolioIds, 'daily', lang, null, null);
    }, [detailStrategy, trades, portfolios, activePortfolioIds, lang]);

    if (status === 'loading') return <div className="h-screen w-full flex items-center justify-center bg-[#0B0C10] text-slate-600"><Loader className="animate-spin" size={24}/></div>;

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
                                    </defs>
                                    <Tooltip content={<CustomTooltip hideAmounts={hideAmounts} lang={lang} portfolios={portfolios} />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                                    {activePortfolioIds.map((pid) => <Bar key={pid} dataKey={pid} stackId="a" fill={`url(#gradP-${pid})`} radius={[2, 2, 0, 0]} barSize={8} yAxisId="pnl" />)}
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
                               <div className="text-right"><div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">{t.avgLoss}</div><div className="text-lg font-medium font-barlow-numeric" style={{ color: THEME.GREEN }}>-{formatCurrency(Math.abs(metrics.avgLoss), hideAmounts)}</div></div>
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
                        <CalendarView dailyPnlMap={dailyPnlMap} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} onDateClick={(d: string) => { setForm({ date: d, amount: '', type: 'profit', strategy: '', note: '', emotion: '', image: '', portfolioId: activePortfolioIds[0] || '' }); setEditingId(null); setIsModalOpen(true); }} monthlyStats={monthlyStats} hideAmounts={hideAmounts} lang={lang} streaks={streaks} />
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
                        <LogsView trades={filteredTrades} lang={lang} hideAmounts={hideAmounts} onEdit={(t: Trade) => { setForm({...t, amount: String(Math.abs(t.pnl)), type: t.pnl >= 0 ? 'profit' : 'loss', portfolioId: t.portfolioId || ''}); setEditingId(t.id); setIsModalOpen(true); }} onDelete={(id: string) => { if(window.confirm(t.deleteConfirm)) actions.deleteTrade(id); }} />
                    </div>
                )}

                {view === 'settings' && (
                    <SettingsView 
                        lang={lang} 
                        setLang={setLang} 
                        trades={trades} 
                        actions={actions} 
                        ddThreshold={ddThreshold} 
                        setDdThreshold={setDdThreshold} 
                        strategies={strategies} 
                        emotions={emotions} 
                        portfolios={portfolios} 
                        activePortfolioIds={activePortfolioIds} 
                        setActivePortfolioIds={setActivePortfolioIds} 
                        onBack={() => setView('stats')} 
                        currentUser={currentUser}
                        onLogin={handleGoogleLogin}
                        onLogout={handleLogout}
                    />
                )}
            </div>

            {/* Modals */}
            <TradeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} form={form} setForm={setForm} onSubmit={(e: any) => { e.preventDefault(); actions.saveTrade({ date: form.date, pnl: form.type === 'profit' ? Math.abs(parseFloat(form.amount || '0')) : -Math.abs(parseFloat(form.amount || '0')), strategy: form.strategy, note: form.note, emotion: form.emotion, image: form.image, portfolioId: form.portfolioId }, editingId); setIsModalOpen(false); }} isEditing={!!editingId} strategies={strategies} emotions={emotions} portfolios={portfolios} lang={lang} />
            <StrategyDetailModal strategy={detailStrategy} metrics={strategyMetrics ? {...strategyMetrics, netProfit: strategyMetrics.currentEq} : null} onClose={() => setDetailStrategy(null)} lang={lang} hideAmounts={hideAmounts} ddThreshold={ddThreshold} />
            <CustomDateRangeModal isOpen={isDatePickerOpen} onClose={() => setIsDatePickerOpen(false)} onApply={(s: string, e: string) => { setCustomRange({ start: s, end: e }); setTimeRange('CUSTOM'); setIsDatePickerOpen(false); }} initialRange={customRange} lang={lang} />

            {!isModalOpen && !detailStrategy && !isDatePickerOpen && view !== 'settings' && (
                <button onClick={() => { setEditingId(null); setForm({ date: getLocalDateStr(), amount: '', type: 'profit', strategy: '', note: '', emotion: '', image: '', portfolioId: activePortfolioIds[0] || '' }); setIsModalOpen(true); }} className="fixed bottom-24 right-6 w-14 h-14 rounded-full z-40 flex items-center justify-center transition-all duration-500 hover:scale-105 active:scale-95 group shadow-lg shadow-blue-900/20 bg-gradient-to-br from-[#526D82] to-[#1e293b] border border-white/20">
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