
import { useState, useEffect, useMemo, useCallback } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { 
    collection, 
    doc, 
    onSnapshot, 
    setDoc, 
    deleteDoc, 
    writeBatch, 
    addDoc, 
    serverTimestamp, 
    query, 
    orderBy 
} from 'firebase/firestore';

// --- IMPORT FIREBASE INSTANCES ---
import { auth, db, config } from './firebaseConfig';

import { Trade, Portfolio, User, Lang, Frequency, TimeRange, Metrics } from './types';
import { safeJSONParse, calculateMetrics, calculateStreaks, downloadCSV, getLocalDateStr } from './utils';
import { DEFAULT_PALETTE, THEME, I18N } from './constants';

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

// --- Auth Hook (With Safety Fuse) ---
export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [status, setStatus] = useState<'loading' | 'online' | 'offline'>('loading');

    useEffect(() => {
        console.log("Auth listener starting...");
        
        // 1. Safety Fuse: If Firebase hangs for > 3 seconds, force UI to render in offline mode
        const safetyFuse = setTimeout(() => {
            if (status === 'loading') {
                console.warn("Firebase Auth timed out. Activating Safety Fuse.");
                setStatus('offline');
            }
        }, 3000);

        // 2. Standard Modular Listener
        const unsubscribe = auth.onAuthStateChanged((u) => {
            // Clear the fuse because Firebase responded
            clearTimeout(safetyFuse);
            
            if (u) {
                console.log("User detected:", u.uid);
                setUser({
                    uid: u.uid,
                    isAnonymous: u.isAnonymous,
                    displayName: u.displayName,
                    email: u.email,
                    photoURL: u.photoURL
                });
                setStatus('online');
            } else {
                console.log("No user signed in.");
                setUser(null);
                setStatus('offline');
            }
        }, (error) => {
            console.error("Auth Error:", error);
            clearTimeout(safetyFuse);
            setStatus('offline');
        });

        return () => {
            unsubscribe();
            clearTimeout(safetyFuse);
        };
    }, []); // Run only once

    const login = async () => {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await auth.signInWithPopup(provider);
        } catch (error: any) {
            console.error("Login failed:", error);
            alert(`Login failed: ${error.message}`);
        }
    };

    const logout = async () => {
        try {
            await auth.signOut();
            window.location.reload(); 
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    return { user, status, db, config, login, logout };
};

// --- Data Hook ---
export const useTradeData = (user: User | null, status: string, firestoreDb: any, config: any) => {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [strategies, setStrategies] = useState<string[]>(() => safeJSONParse('local_strategies', ['突破策略', '回檔承接']));
    const [emotions, setEmotions] = useState<string[]>(() => safeJSONParse('local_emotions', ['冷靜', 'FOMO', '復仇單']));
    
    const [portfolios, setPortfolios] = useState<Portfolio[]>(() => {
        const saved = safeJSONParse<any[]>('local_portfolios', []);
        if (saved.length === 0) {
            return [{ id: 'main', name: 'Main Account', initialCapital: 100000, profitColor: DEFAULT_PALETTE[0], lossColor: THEME.DEFAULT_LOSS }];
        }
        return saved.map(p => ({
            ...p,
            profitColor: p.profitColor || p.color || DEFAULT_PALETTE[0],
            lossColor: p.lossColor || THEME.DEFAULT_LOSS
        }));
    });

    const [activePortfolioIds, setActivePortfolioIds] = useLocalStorage<string[]>('app_active_portfolios', ['main']);
    const [lossColor, setLossColor] = useLocalStorage<string>('app_loss_color', THEME.DEFAULT_LOSS);
    const [isSyncing, setIsSyncing] = useState(false);

    // --- Migration Logic ---
    const migrateLocalToCloud = useCallback(async () => {
        if (!user) return;
        
        const localTrades = safeJSONParse<Trade[]>('local_trades', []);
        if (localTrades.length === 0) return;

        const lang = (localStorage.getItem('app_lang') || 'zh').replace(/"/g, '') as Lang;
        if (!window.confirm(I18N[lang].migrateConfirm)) return;

        setIsSyncing(true);
        try {
            const batch = writeBatch(db);
            
            // Upload Trades
            localTrades.forEach(tr => {
                const { id, ...data } = tr;
                // Use a new doc ref so Firestore generates ID, or use existing ID if valid
                const docRef = doc(collection(db, 'users', user.uid, 'trades'));
                batch.set(docRef, { ...data, timestamp: new Date().toISOString() });
            });

            // Upload Settings (Merge)
            const settingsRef = doc(db, 'users', user.uid, 'settings', 'config');
            batch.set(settingsRef, { 
                strategies, 
                emotions, 
                portfolios, 
                lossColor 
            }, { merge: true });

            await batch.commit();
            
            // Clear local trades to avoid double entry visual (though onSnapshot will handle it)
            // and to mark migration as done.
            localStorage.removeItem('local_trades');
        } catch (error) {
            console.error("Migration failed:", error);
            alert("Sync failed. Please try again.");
        } finally {
            setIsSyncing(false);
        }
    }, [user, strategies, emotions, portfolios, lossColor]);

    // --- Sync Effect ---
    useEffect(() => {
        // 1. Offline / Not Logged In: Use Local Storage
        if (!user) {
            const local = safeJSONParse('local_trades', []);
            setTrades(local);
            return;
        }

        // 2. Online: Check for Migration first
        migrateLocalToCloud();

        // 3. Online: Listen to Firestore Trades
        const q = query(collection(db, 'users', user.uid, 'trades'), orderBy('date', 'desc'));
        const unsubTrades = onSnapshot(q, (snapshot) => {
            const cloudTrades = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                pnl: Number(doc.data().pnl || 0)
            })) as Trade[];
            setTrades(cloudTrades);
        }, (error) => {
            console.error("Error fetching trades:", error);
        });

        // 4. Online: Listen to Firestore Settings
        const settingsRef = doc(db, 'users', user.uid, 'settings', 'config');
        const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.strategies) {
                    setStrategies(data.strategies);
                    localStorage.setItem('local_strategies', JSON.stringify(data.strategies));
                }
                if (data.emotions) {
                    setEmotions(data.emotions);
                    localStorage.setItem('local_emotions', JSON.stringify(data.emotions));
                }
                if (data.portfolios) {
                    const mapped = data.portfolios.map((p: any) => ({
                         ...p,
                         profitColor: p.profitColor || p.color || DEFAULT_PALETTE[0],
                         lossColor: p.lossColor || THEME.DEFAULT_LOSS
                    }));
                    setPortfolios(mapped);
                    localStorage.setItem('local_portfolios', JSON.stringify(mapped));
                }
                if (data.lossColor) {
                    setLossColor(data.lossColor);
                    localStorage.setItem('app_loss_color', JSON.stringify(data.lossColor));
                }
            }
        });

        return () => {
            unsubTrades();
            unsubSettings();
        };
    }, [user, migrateLocalToCloud]); 

    // --- Actions ---
    const actions = useMemo(() => ({
        saveTrade: async (tradeData: Trade, id: string | null) => {
            const pid = tradeData.portfolioId || activePortfolioIds[0] || 'main';
            const dataToSave = { 
                ...tradeData, 
                portfolioId: pid,
                timestamp: new Date().toISOString()
            };
            
            if (!user) {
                // Local Storage
                setTrades(prev => {
                    const next = id 
                        ? prev.map(t => t.id === id ? { ...dataToSave, id } : t) 
                        : [...prev, { ...dataToSave, id: Date.now().toString() }];
                    localStorage.setItem('local_trades', JSON.stringify(next));
                    return next;
                });
            } else {
                // Firestore
                try {
                    const tradesCollection = collection(db, 'users', user.uid, 'trades');
                    if (id) {
                        await setDoc(doc(tradesCollection, id), dataToSave, { merge: true });
                    } else {
                        await addDoc(tradesCollection, dataToSave);
                    }
                } catch (e) {
                    console.error("Error saving trade:", e);
                    alert("Error saving to cloud.");
                }
            }
        },
        deleteTrade: async (id: string) => {
            if (!user) {
                // Local Storage
                setTrades(prev => { 
                    const next = prev.filter(t => t.id !== id); 
                    localStorage.setItem('local_trades', JSON.stringify(next)); 
                    return next; 
                });
            } else {
                // Firestore
                try {
                    await deleteDoc(doc(db, 'users', user.uid, 'trades', id));
                } catch (e) {
                    console.error("Error deleting trade:", e);
                }
            }
        },
        updateSettings: async (field: string, value: any) => {
            if (field === 'strategies') setStrategies(value); 
            else if (field === 'emotions') setEmotions(value); 
            else if (field === 'portfolios') setPortfolios(value); 
            else if (field === 'lossColor') setLossColor(value);
            
            localStorage.setItem(`local_${field}`, JSON.stringify(value));
            
            if (user) {
                try {
                    const settingsRef = doc(db, 'users', user.uid, 'settings', 'config');
                    await setDoc(settingsRef, { [field]: value }, { merge: true });
                } catch (e) {
                    console.error("Error updating settings:", e);
                }
            }
        },
        updatePortfolio: (id: string, field: string, value: any) => {
            const updated = portfolios.map(p => p.id === id ? { ...p, [field]: (field === 'initialCapital' ? (parseFloat(value) || 0) : value) } : p);
            actions.updateSettings('portfolios', updated);
        },
        addStrategy: (s: string) => { if(s && !strategies.includes(s)) actions.updateSettings('strategies', [...strategies, s]); },
        deleteStrategy: (s: string) => actions.updateSettings('strategies', strategies.filter(i => i !== s)),
        addEmotion: (e: string) => { if(e && !emotions.includes(e)) actions.updateSettings('emotions', [...emotions, e]); },
        deleteEmotion: (e: string) => actions.updateSettings('emotions', emotions.filter(i => i !== e)),
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
                        note: cols[7]?.replace(/"/g, ''), portfolioId: targetPid,
                        timestamp: new Date().toISOString()
                    });
                }
                
                if (!user) {
                    setTrades(prev => { 
                        const next = [...prev, ...newTrades.map(t => ({...t, id: Math.random().toString()}))]; 
                        localStorage.setItem('local_trades', JSON.stringify(next)); 
                        return next; 
                    });
                } else {
                    const batch = writeBatch(db);
                    newTrades.forEach(tr => {
                        const docRef = doc(collection(db, 'users', user.uid, 'trades'));
                        batch.set(docRef, tr);
                    });
                    await batch.commit();
                }
                alert(t.importSuccess);
            };
            reader.readAsText(file);
        },
        downloadCSV
    }), [user, portfolios, activePortfolioIds, strategies, emotions]);

    return { 
        trades, strategies, emotions, portfolios, 
        activePortfolioIds, setActivePortfolioIds, 
        lossColor, setLossColor,
        isSyncing,
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
    filterEmotion: string[],
    timeRange: TimeRange = 'ALL'
) => {
    // 1. Determine Date Range
    const { startDate, endDate } = useMemo(() => {
         if (timeRange === 'CUSTOM') {
             return { 
                 startDate: customRange.start ? new Date(customRange.start) : null, 
                 endDate: customRange.end ? new Date(customRange.end) : null 
             };
         }
         const now = new Date();
         let start: Date | null = null;
         if (timeRange === '1M') {
             start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
         } else if (timeRange === '3M') {
             start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
         } else if (timeRange === 'YTD') {
             start = new Date(now.getFullYear(), 0, 1);
         }
         if(start) start.setHours(0,0,0,0);
         return { startDate: start, endDate: null };
    }, [timeRange, customRange]);

    // 2. Filter trades by Active Portfolio
    const tradesInPortfolios = useMemo(() => {
        if (activePortfolioIds.length === 0) return trades; 
        return trades.filter(t => activePortfolioIds.includes(t.portfolioId || 'main'));
    }, [trades, activePortfolioIds]);

    // 3. Filter trades by Strategy/Emotion (Full history for metrics)
    const tradesForMetrics = useMemo(() => {
        return tradesInPortfolios.filter(t => {
            if (filterStrategy.length > 0 && (!t.strategy || !filterStrategy.includes(t.strategy))) return false;
            if (filterEmotion.length > 0 && (!t.emotion || !filterEmotion.includes(t.emotion))) return false;
            return true;
        });
    }, [tradesInPortfolios, filterStrategy, filterEmotion]);

    // 4. Calculate Metrics (Equity Curve, etc)
    const metrics = useMemo(() => {
        return calculateMetrics(tradesForMetrics, portfolios, activePortfolioIds, frequency, lang, startDate, endDate);
    }, [tradesForMetrics, portfolios, activePortfolioIds, frequency, lang, startDate, endDate]);

    // 5. Filter trades by Date (for Logs and Streaks)
    const filteredTrades = useMemo(() => {
        return tradesForMetrics.filter(t => {
            const d = new Date(t.date);
            if (startDate && d < startDate) return false;
            if (endDate && d > endDate) return false;
            return true;
        });
    }, [tradesForMetrics, startDate, endDate]);

    // 6. Streaks based on filtered trades
    const streaks = useMemo(() => calculateStreaks(filteredTrades), [filteredTrades]);

    // 7. Daily PnL for Calendar
    const dailyPnlMap = useMemo(() => {
        const m: Record<string, number> = {};
        filteredTrades.forEach(t => {
            if(!m[t.date]) m[t.date] = 0;
            m[t.date] += Number(t.pnl)||0;
        });
        return m;
    }, [filteredTrades]);

    return { filteredTrades, metrics, streaks, dailyPnlMap };
};
