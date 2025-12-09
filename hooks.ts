
import { useState, useEffect, useMemo, useCallback } from 'react';
import firebase from 'firebase/compat/app';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, 
  setPersistence, browserLocalPersistence, GoogleAuthProvider, signInWithPopup, signOut, User as FirebaseUser 
} from 'firebase/auth';
import { getFirestore, doc, addDoc, setDoc, updateDoc, onSnapshot, collection, deleteDoc, writeBatch } from 'firebase/firestore';
import { Trade, Portfolio, User, Lang, Frequency, TimeRange, Metrics } from './types';
import { safeJSONParse, calculateMetrics, calculateStreaks, downloadCSV, getLocalDateStr } from './utils';
import { DEFAULT_PALETTE, THEME } from './constants';

// --- Local Storage Hook ---
export function useLocalStorage<T>(key: string, initialValue: T) {
    const [storedValue, setStoredValue] = useState<T>(() => safeJSONParse(key, initialValue));
    
    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(error);
        }
    };
    return [storedValue, setValue] as const;
}

// --- Auth Hook ---
export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [status, setStatus] = useState<'loading' | 'online' | 'offline'>('loading');
    const [db, setDb] = useState<any>(null);
    const [config, setConfig] = useState<any>(null);

    useEffect(() => {
        let isMounted = true;
        const init = async () => {
            try {
                // @ts-ignore
                const confStr = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
                // @ts-ignore
                const aid = typeof __app_id !== 'undefined' ? __app_id : 'local';
                
                if (!confStr) throw new Error("No config");
                
                const firebaseApp = firebase.apps.length === 0 ? firebase.initializeApp(JSON.parse(confStr)) : firebase.app();
                const _auth = getAuth(firebaseApp as any);
                const _db = getFirestore(firebaseApp as any);
                
                if(isMounted) { setDb(_db); setConfig({ appId: aid }); }
                await setPersistence(_auth, browserLocalPersistence);
                
                // @ts-ignore
                const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                
                onAuthStateChanged(_auth, (u) => {
                    if(!isMounted) return;
                    if (u) { 
                        setUser({ 
                            uid: u.uid, 
                            isAnonymous: u.isAnonymous, 
                            displayName: u.displayName, 
                            email: u.email,
                            photoURL: u.photoURL 
                        });
                        setStatus('online'); 
                    } else { 
                        if (token) signInWithCustomToken(_auth, token).catch(() => signInAnonymously(_auth));
                        else signInAnonymously(_auth).catch(console.error);
                        setUser(null);
                        setStatus('offline'); 
                    }
                });
            } catch (e) {
                if(isMounted) setStatus('offline');
            }
        };
        init();
        const timer = setTimeout(() => { if (isMounted && status === 'loading') { setStatus('offline'); } }, 2500);
        return () => { isMounted = false; clearTimeout(timer); };
    }, []);

    const login = async () => {
        try {
            const auth = getAuth();
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login failed", error);
            alert("Google Login Failed.");
        }
    };

    const logout = async () => {
        try {
            await signOut(getAuth());
            window.location.reload();
        } catch (error) { console.error(error); }
    };

    return { user, status, db, config, login, logout };
};

// --- Data Hook ---
export const useTradeData = (user: User | null, status: string, db: any, config: any) => {
    // Data State
    const [trades, setTrades] = useState<Trade[]>([]);
    const [strategies, setStrategies] = useState<string[]>(() => safeJSONParse('local_strategies', ['突破策略', '回檔承接']));
    const [emotions, setEmotions] = useState<string[]>(() => safeJSONParse('local_emotions', ['冷靜', 'FOMO', '復仇單']));
    const [portfolios, setPortfolios] = useState<Portfolio[]>(() => safeJSONParse('local_portfolios', [{ id: 'main', name: 'Main Account', initialCapital: 100000, color: DEFAULT_PALETTE[0] }]));
    
    // UI Settings stored in DB or Local
    const [activePortfolioIds, setActivePortfolioIds] = useLocalStorage<string[]>('app_active_portfolios', ['main']);
    const [lossColor, setLossColor] = useLocalStorage<string>('app_loss_color', THEME.LOSS_WHITE);

    // Sync from Firestore
    useEffect(() => {
        if (status !== 'online' || !db || !user || !config) {
            // Load Local if offline
            if(status === 'offline') {
                setTrades(safeJSONParse('local_trades', []));
            }
            return;
        }

        const tradesRef = collection(db, `artifacts/${config.appId}/users/${user.uid}/trade_journal`);
        const unsubTrades = onSnapshot(tradesRef, (snap) => setTrades(snap.docs.map(d => ({ id: d.id, ...d.data(), pnl: Number(d.data().pnl || 0) } as Trade))));
        
        const configRef = doc(db, `artifacts/${config.appId}/users/${user.uid}/app_config/settings`);
        const unsubConfig = onSnapshot(configRef, (snap) => { 
            if (snap.exists()) {
                const data = snap.data();
                if(data.strategies) setStrategies(data.strategies); else setStrategies(['突破策略', '回檔承接']); // Default fallback
                if(data.emotions) setEmotions(data.emotions); else setEmotions(['冷靜', 'FOMO']);
                if(data.portfolios) setPortfolios(data.portfolios);
                if(data.lossColor) setLossColor(data.lossColor);
            }
        });

        return () => { unsubTrades(); unsubConfig(); };
    }, [status, user, db, config]);

    // Actions
    const actions = useMemo(() => ({
        saveTrade: async (tradeData: Trade, id: string | null) => {
            const pid = tradeData.portfolioId || activePortfolioIds[0] || 'main';
            const dataToSave = { ...tradeData, portfolioId: pid };
            
            if (status === 'offline') {
                setTrades(prev => {
                    const next = id ? prev.map(t => t.id === id ? { ...dataToSave, id } : t) : [...prev, { ...dataToSave, id: Date.now().toString() }];
                    localStorage.setItem('local_trades', JSON.stringify(next));
                    return next;
                });
            } else if (db && user) {
                const colRef = collection(db, `artifacts/${config.appId}/users/${user.uid}/trade_journal`);
                if (id) await updateDoc(doc(colRef, id), dataToSave); 
                else await addDoc(colRef, { ...dataToSave, timestamp: new Date().toISOString() });
            }
        },
        deleteTrade: async (id: string) => {
            if (status === 'offline') {
                setTrades(prev => { const next = prev.filter(t => t.id !== id); localStorage.setItem('local_trades', JSON.stringify(next)); return next; });
            } else if (db && user) await deleteDoc(doc(db, `artifacts/${config.appId}/users/${user.uid}/trade_journal`, id));
        },
        updateSettings: async (field: string, value: any) => {
            // Optimistic update
            if (field === 'strategies') setStrategies(value); 
            else if (field === 'emotions') setEmotions(value); 
            else if (field === 'portfolios') setPortfolios(value); 
            else if (field === 'lossColor') setLossColor(value);

            if (status === 'offline') {
                localStorage.setItem(`local_${field}`, JSON.stringify(value));
            } else if (db && user) {
                await setDoc(doc(db, `artifacts/${config.appId}/users/${user.uid}/app_config/settings`), { [field]: value }, { merge: true });
            }
        },
        updatePortfolio: (id: string, field: string, value: any) => {
            const updated = portfolios.map(p => p.id === id ? { ...p, [field]: field === 'initialCapital' ? parseFloat(value) || 0 : value } : p);
            actions.updateSettings('portfolios', updated);
        },
        addStrategy: (s: string) => { if(s && !strategies.includes(s)) actions.updateSettings('strategies', [...strategies, s]); },
        deleteStrategy: (s: string) => actions.updateSettings('strategies', strategies.filter(i => i !== s)),
        handleImportCSV: (e: any, t: any) => {
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
                    newTrades.push({ 
                        date: cols[1], pnl: parseFloat(cols[4]), 
                        strategy: cols[5]?.replace(/"/g, ''), emotion: cols[6]?.replace(/"/g, ''), 
                        note: cols[7]?.replace(/"/g, ''), portfolioId: targetPid 
                    });
                }
                if (status === 'offline') {
                    setTrades(prev => { const next = [...prev, ...newTrades.map(t => ({...t, id: Math.random().toString()}))]; localStorage.setItem('local_trades', JSON.stringify(next)); return next; });
                } else if (db && user) {
                    const batch = writeBatch(db);
                    const colRef = collection(db, `artifacts/${config.appId}/users/${user.uid}/trade_journal`);
                    newTrades.forEach(tr => batch.set(doc(colRef), tr));
                    await batch.commit();
                }
                alert(t.importSuccess);
            };
            reader.readAsText(file);
        },
        downloadCSV
    }), [status, db, user, config, portfolios, activePortfolioIds, strategies, emotions]);

    return { 
        trades, strategies, emotions, portfolios, 
        activePortfolioIds, setActivePortfolioIds, 
        lossColor, setLossColor,
        actions 
    };
};

// --- Metrics Hook ---
export const useMetrics = (
    trades: Trade[], 
    portfolios: Portfolio[], 
    activePortfolioIds: string[], 
    frequency: Frequency, 
    lang: Lang,
    customRange: { start: string | null, end: string | null },
    filterStrategy: string[],
    filterEmotion: string[]
) => {
    // 1. Filter by Portfolio
    const portfolioTrades = useMemo(() => trades.filter(t => activePortfolioIds.includes(t.portfolioId || 'main')), [trades, activePortfolioIds]);
    
    // 2. Filter by Tags
    const filteredTrades = useMemo(() => {
        let res = portfolioTrades;
        if (filterStrategy.length) res = res.filter(t => filterStrategy.includes(t.strategy || ''));
        if (filterEmotion.length) res = res.filter(t => filterEmotion.includes(t.emotion || ''));
        return res;
    }, [portfolioTrades, filterStrategy, filterEmotion]);

    // 3. Calculate Core Metrics
    const metrics = useMemo(() => calculateMetrics(
        filteredTrades, portfolios, activePortfolioIds, frequency, lang, 
        customRange.start ? new Date(customRange.start) : null, 
        customRange.end ? new Date(customRange.end) : null
    ), [filteredTrades, portfolios, activePortfolioIds, frequency, lang, customRange]);

    // 4. Derived Helpers
    const streaks = useMemo(() => calculateStreaks(filteredTrades), [filteredTrades]);
    const dailyPnlMap = useMemo(() => filteredTrades.reduce((acc: any, t) => { acc[t.date] = (acc[t.date] || 0) + (Number(t.pnl) || 0); return acc; }, {}), [filteredTrades]);
    
    return { filteredTrades, metrics, streaks, dailyPnlMap };
};
