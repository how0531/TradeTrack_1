
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
    orderBy,
    getDocs
} from 'firebase/firestore';

// --- IMPORT FIREBASE INSTANCES ---
import { auth, db, config } from './firebaseConfig';

import { Trade, Portfolio, User, Lang, Frequency, TimeRange, Metrics, SyncStatus } from './types';
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
    
    // Sync States
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    
    // Auto-Save / Debounce States
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
    const pendingWrites = useRef<Map<string, { type: 'set' | 'delete', data?: any }>>(new Map());
    const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Clean up timeout on user change or unmount
    useEffect(() => {
        return () => {
            if (saveTimeout.current) clearTimeout(saveTimeout.current);
        };
    }, [user]);

    // --- Flush Pending Writes to Cloud ---
    const flushToCloud = useCallback(async () => {
        if (!user) return; 

        // Nothing to write? We are synced.
        if (pendingWrites.current.size === 0) {
            setSyncStatus('synced');
            return;
        }

        const batch = writeBatch(db);
        
        // CRITICAL FIX: Snapshot current writes and clear pending IMMEDIATELY.
        // This allows new writes (e.g. user keeps typing) to accumulate in 'pendingWrites' 
        // while we are awaiting the network commit for this batch.
        const writesToCommit = new Map(pendingWrites.current);
        pendingWrites.current.clear();

        writesToCommit.forEach((op, id) => {
            const docRef = doc(db, 'users', user.uid, 'trades', id);
            if (op.type === 'delete') {
                batch.delete(docRef);
            } else if (op.type === 'set' && op.data) {
                batch.set(docRef, op.data, { merge: true });
            }
        });

        try {
            await batch.commit();
            
            // Success! 
            // Check if queue is still empty. If yes, we are synced.
            // If no (new writes came in), we leave status as 'saving' (the next timeout will catch it).
            if (pendingWrites.current.size === 0) {
                setSyncStatus('synced');
            }
        } catch (error) {
            console.error("Auto-save failed:", error);
            setSyncStatus('error');
            
            // Restore failed writes to the queue if they haven't been superseded by newer writes
            writesToCommit.forEach((op, id) => {
                if (!pendingWrites.current.has(id)) {
                    pendingWrites.current.set(id, op);
                }
            });
        }
    }, [user]);

    // --- Data Loading & Sync Logic ---
    useEffect(() => {
        // 1. Offline / Not Logged In: Load from Local Storage
        if (!user) {
            const local = safeJSONParse('local_trades', []);
            setTrades(local);
            setSyncStatus('offline');
            return;
        }

        // 2. Online: Check for Sync Conflict (Local data exists but user logged in)
        const localTrades = safeJSONParse<Trade[]>('local_trades', []);
        if (localTrades.length > 0) {
            // Optimization: Only set state if not already open to avoid redundant renders
            if (!isSyncModalOpen) {
                setIsSyncModalOpen(true);
            }
            return; // Halt here until resolved
        }

        setSyncStatus('synced');

        // 3. Online & No Conflict: Subscribe to Firestore
        const q = query(collection(db, 'users', user.uid, 'trades'), orderBy('date', 'desc'));
        const unsubTrades = onSnapshot(q, (snapshot) => {
            // Only update trades from cloud if we are not currently saving (to avoid jitter)
            // Or better: rely on Firestore's local latency compensation which updates snapshot immediately even before network ack
            const cloudTrades = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                pnl: Number(doc.data().pnl || 0)
            })) as Trade[];
            
            setTrades(cloudTrades);
        }, (error) => {
            console.error("Error fetching trades:", error);
            setSyncStatus('error');
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
    }, [user, isSyncModalOpen]); 

    // --- Actions ---
    const actions = useMemo(() => ({
        saveTrade: async (tradeData: Trade, id: string | null) => {
            // 1. Prepare Data
            const pid = tradeData.portfolioId || activePortfolioIds[0] || 'main';
            // Generate ID immediately if it's new, so we can use it for optimistic update AND pending write
            const finalId = id || (user ? doc(collection(db, 'users', user.uid, 'trades')).id : Date.now().toString());
            
            const dataToSave = { 
                ...tradeData, 
                id: finalId,
                portfolioId: pid,
                timestamp: new Date().toISOString()
            };
            
            // 2. Optimistic Update (Immediate UI Feedback)
            setTrades(prev => {
                const exists = prev.find(t => t.id === finalId);
                const next = exists 
                    ? prev.map(t => t.id === finalId ? dataToSave : t) 
                    : [dataToSave, ...prev];
                
                // If offline, persist to local immediately
                if (!user) localStorage.setItem('local_trades', JSON.stringify(next));
                
                return next;
            });

            // 3. Auto-Save Logic (Debounced)
            if (user) {
                setSyncStatus('saving');
                
                // Add to Pending Queue
                pendingWrites.current.set(finalId, { type: 'set', data: dataToSave });
                
                // Reset Debounce Timer (1.5s)
                if (saveTimeout.current) clearTimeout(saveTimeout.current);
                saveTimeout.current = setTimeout(flushToCloud, 1500);
            }
        },
        deleteTrade: async (id: string) => {
            // 1. Optimistic Update
            setTrades(prev => { 
                const next = prev.filter(t => t.id !== id); 
                if (!user) localStorage.setItem('local_trades', JSON.stringify(next)); 
                return next; 
            });

            // 2. Auto-Save Logic
            if (user) {
                setSyncStatus('saving');
                
                // Add to Pending Queue
                // Note: If we just created it and delete it quickly, we might just want to remove the 'set' op
                if (pendingWrites.current.has(id) && pendingWrites.current.get(id)?.type === 'set') {
                    pendingWrites.current.delete(id); // Cancel the creation
                } else {
                    pendingWrites.current.set(id, { type: 'delete' });
                }

                // Reset Debounce Timer
                if (saveTimeout.current) clearTimeout(saveTimeout.current);
                saveTimeout.current = setTimeout(flushToCloud, 1500);
            }
        },
        updateSettings: async (field: string, value: any) => {
            if (field === 'strategies') setStrategies(value); 
            else if (field === 'emotions') setEmotions(value); 
            else if (field === 'portfolios') setPortfolios(value); 
            else if (field === 'lossColor') setLossColor(value);
            
            localStorage.setItem(`local_${field}`, JSON.stringify(value));
            
            if (user) {
                // Settings are less frequent, we can just write them directly but show "Saving"
                setSyncStatus('saving');
                try {
                    const settingsRef = doc(db, 'users', user.uid, 'settings', 'config');
                    await setDoc(settingsRef, { [field]: value }, { merge: true });
                    setTimeout(() => setSyncStatus('synced'), 500); // Small delay for visual feedback
                } catch (e) {
                    console.error("Error updating settings:", e);
                    setSyncStatus('error');
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
        retrySync: () => {
             // Manual retry trigger if status is 'error'
             flushToCloud();
        },
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
        downloadCSV,
        resetAllData: async (t: any) => {
            if (!window.confirm(t.resetConfirm)) return;

            // 1. Clear Cloud Data
            if (user) {
                try {
                    // Delete Trades (Batching is cleaner, but iterating snapshot is safer for now)
                    const tradesQ = query(collection(db, 'users', user.uid, 'trades'));
                    const snapshot = await getDocs(tradesQ);
                    const batch = writeBatch(db);
                    snapshot.docs.forEach((doc) => {
                        batch.delete(doc.ref);
                    });
                    
                    // Delete Settings
                    const settingsRef = doc(db, 'users', user.uid, 'settings', 'config');
                    batch.delete(settingsRef);

                    await batch.commit();
                } catch (e) {
                    console.error("Cloud reset failed", e);
                }
            }

            // 2. Clear Local Storage Specific Keys
            const keysToRemove = [
                'local_trades', 'local_strategies', 'local_emotions', 'local_portfolios',
                'app_active_portfolios', 'app_loss_color', 'app_dd_threshold', 'app_max_loss_streak'
            ];
            keysToRemove.forEach(k => localStorage.removeItem(k));

            // 3. Reset State (via Window Reload to ensure clean slate)
            window.location.reload();
        },
        resolveSyncConflict: async (choice: 'merge' | 'discard') => {
            if (!user) return;
            setIsSyncing(true);
            try {
                if (choice === 'merge') {
                    // 1. Load local trades
                    const localTrades = safeJSONParse<Trade[]>('local_trades', []);
                    
                    if (localTrades.length > 0) {
                        const tradesCollection = collection(db, 'users', user.uid, 'trades');
                        
                        // Use Promise.all with addDoc to let Firestore generate IDs and avoid batch limits
                        // Using addDoc prevents ID collisions with existing cloud data
                        await Promise.all(localTrades.map(tr => {
                            const { id, ...data } = tr; // Remove local ID
                            
                            // Force add userId (Crucial for Firestore Security Rules)
                            // and refresh timestamp
                            const payload = {
                                ...data,
                                userId: user.uid,
                                timestamp: new Date().toISOString()
                            };
                            
                            return addDoc(tradesCollection, payload);
                        }));
                    }
                    
                    // 2. Merge settings
                    const settingsRef = doc(db, 'users', user.uid, 'settings', 'config');
                    await setDoc(settingsRef, { 
                        strategies, 
                        emotions, 
                        portfolios, 
                        lossColor,
                        userId: user.uid // Ensure ownership field here too
                    }, { merge: true });
                }
                
                // 3. Cleanup Local Data (Execute for both 'merge' and 'discard')
                // We must remove these keys so the app doesn't detect a conflict on reload
                const keysToWipe = [
                    'local_trades', 
                    'local_strategies', 
                    'local_emotions', 
                    'local_portfolios', 
                    'app_active_portfolios'
                ];
                keysToWipe.forEach(k => localStorage.removeItem(k));

                // 4. Force Reload
                // This resets the app state, clears the conflict modal, and fetches fresh data from cloud
                window.location.reload();

            } catch (error: any) {
                console.error("Sync resolution failed:", error);
                alert(`Sync Failed: ${error.message}`);
                setIsSyncing(false);
            }
        }
    }), [user, portfolios, activePortfolioIds, strategies, emotions, isSyncModalOpen, flushToCloud]);

    return { 
        trades, strategies, emotions, portfolios, 
        activePortfolioIds, setActivePortfolioIds, 
        lossColor, setLossColor,
        isSyncing,
        isSyncModalOpen,
        syncStatus,
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
    timeRange: TimeRange
) => {
    // 1. Filter Trades
    const filteredTrades = useMemo(() => {
        let filtered = trades;

        // Filter by Portfolio
        if (activePortfolioIds.length > 0) {
            filtered = filtered.filter(t => activePortfolioIds.includes(t.portfolioId || 'main'));
        }

        // Filter by Strategy
        if (filterStrategy.length > 0) {
            filtered = filtered.filter(t => t.strategy && filterStrategy.includes(t.strategy));
        }

        // Filter by Emotion
        if (filterEmotion.length > 0) {
            filtered = filtered.filter(t => t.emotion && filterEmotion.includes(t.emotion));
        }

        // Filter by TimeRange
        const now = new Date();
        const oneMonthAgo = new Date(now); oneMonthAgo.setMonth(now.getMonth() - 1);
        const threeMonthsAgo = new Date(now); threeMonthsAgo.setMonth(now.getMonth() - 3);
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        
        let startStr: string | null = null;
        let endStr: string | null = null;

        if (timeRange === '1M') startStr = getLocalDateStr(oneMonthAgo);
        else if (timeRange === '3M') startStr = getLocalDateStr(threeMonthsAgo);
        else if (timeRange === 'YTD') startStr = getLocalDateStr(startOfYear);
        else if (timeRange === 'CUSTOM') {
            startStr = customRange.start;
            endStr = customRange.end;
        }

        if (startStr) {
             filtered = filtered.filter(t => {
                 if (t.date < startStr!) return false;
                 if (endStr && t.date > endStr) return false;
                 return true;
             });
        }

        return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [trades, activePortfolioIds, filterStrategy, filterEmotion, timeRange, customRange]);

    // 2. Calculate Metrics
    const metrics = useMemo(() => {
        // Pass null dates because filteredTrades is already filtered
        return calculateMetrics(filteredTrades, portfolios, activePortfolioIds, frequency, lang, null, null);
    }, [filteredTrades, portfolios, activePortfolioIds, frequency, lang]);

    // 3. Calculate Streaks (For Display)
    const streaks = useMemo(() => {
        return calculateStreaks(filteredTrades);
    }, [filteredTrades]);

    // 4. Calculate Risk Streaks (Separate: Only filtered by Portfolio, ignored date/strategy filters)
    // This ensures risk alerts are based on recent account history regardless of what the user is viewing.
    const riskStreaks = useMemo(() => {
        let accountTrades = trades;
        if (activePortfolioIds.length > 0) {
            accountTrades = accountTrades.filter(t => activePortfolioIds.includes(t.portfolioId || 'main'));
        }
        return calculateStreaks(accountTrades);
    }, [trades, activePortfolioIds]);

    // 5. Daily PnL Map
    const dailyPnlMap = useMemo(() => {
        const map: Record<string, number> = {};
        filteredTrades.forEach(t => {
            if (!map[t.date]) map[t.date] = 0;
            map[t.date] += (Number(t.pnl) || 0);
        });
        return map;
    }, [filteredTrades]);

    return { filteredTrades, metrics, streaks, riskStreaks, dailyPnlMap };
};
