
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
import { safeJSONParse, calculateMetrics, calculateStreaks, downloadJSON, getLocalDateStr } from './utils';
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
            // Removed window.location.reload() to prevent crash. 
            // Auth listener will handle state transition to offline/null user.
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    return { user, status, db, config, login, logout };
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
    return useMemo(() => {
        // 1. Filter by Portfolio
        const relevantTrades = trades.filter(t => {
            const pid = t.portfolioId || 'main';
            return activePortfolioIds.includes(pid);
        });

        // 2. Filter by Strategy & Emotion
        let filtered = relevantTrades;
        if (filterStrategy.length > 0) {
            filtered = filtered.filter(t => t.strategy && filterStrategy.includes(t.strategy));
        }
        if (filterEmotion.length > 0) {
            filtered = filtered.filter(t => t.emotion && filterEmotion.includes(t.emotion));
        }

        // 3. Filter by Time
        const now = new Date();
        let startDate: Date | null = null;
        let endDate: Date | null = null;

        if (timeRange === '1M') {
            startDate = new Date();
            startDate.setMonth(now.getMonth() - 1);
            startDate.setHours(0, 0, 0, 0);
        } else if (timeRange === '3M') {
            startDate = new Date();
            startDate.setMonth(now.getMonth() - 3);
            startDate.setHours(0, 0, 0, 0);
        } else if (timeRange === 'YTD') {
            startDate = new Date(now.getFullYear(), 0, 1);
            startDate.setHours(0, 0, 0, 0);
        } else if (timeRange === 'CUSTOM' && customRange.start) {
            startDate = new Date(customRange.start);
            if (customRange.end) {
                endDate = new Date(customRange.end);
                endDate.setHours(23, 59, 59, 999);
            }
        }

        const filteredTrades = filtered.filter(t => {
            if (!startDate) return true;
            const d = new Date(t.date);
            if (endDate) return d >= startDate && d <= endDate;
            return d >= startDate;
        });

        // Sort descending by date
        filteredTrades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // 4. Calculate Metrics
        const metrics = calculateMetrics(filteredTrades, portfolios, activePortfolioIds, frequency, lang, startDate, endDate);

        // 5. Calculate Streaks
        const streaks = calculateStreaks(filteredTrades);

        // 6. Risk Streaks
        const riskStreaks = streaks; 

        // 7. Daily PnL Map
        const dailyPnlMap: Record<string, number> = {};
        filteredTrades.forEach(t => {
            const date = t.date;
            dailyPnlMap[date] = (dailyPnlMap[date] || 0) + (Number(t.pnl) || 0);
        });

        return { filteredTrades, metrics, streaks, riskStreaks, dailyPnlMap };

    }, [trades, portfolios, activePortfolioIds, frequency, lang, customRange, filterStrategy, filterEmotion, timeRange]);
};

// --- Helper: Safe Trade Migration ---
const validateAndMigrateTrade = (raw: any, defaultPortfolio: string): Trade | null => {
    try {
        if (!raw || typeof raw !== 'object') return null;

        // 1. Ensure numeric PnL (Handles string numbers like "100", "$100")
        let pnl = 0;
        if (typeof raw.pnl === 'number') pnl = raw.pnl;
        else if (typeof raw.pl === 'number') pnl = raw.pl; // Legacy field 'pl'
        else if (typeof raw.pnl === 'string') pnl = parseFloat(raw.pnl.replace(/[^0-9.-]/g, '')) || 0;
        
        // 2. Ensure Date (Strict Check)
        let date = raw.date;
        // Validate date string YYYY-MM-DD or parseable
        if (!date || typeof date !== 'string' || isNaN(Date.parse(date))) {
             // Fallback to today if invalid
             date = new Date().toISOString().split('T')[0];
        }

        // 3. Ensure Strategy (Migrate legacy 'strategyId' or 'strategyName')
        const strategy = raw.strategy || raw.strategyName || raw.strategyId || '';

        // 4. Ensure ID
        const id = raw.id ? String(raw.id) : `imported-${Math.random().toString(36).substr(2, 9)}`;

        return {
            id,
            date,
            pnl,
            strategy: String(strategy),
            emotion: String(raw.emotion || ''),
            note: String(raw.note || ''),
            image: String(raw.image || ''),
            portfolioId: raw.portfolioId || defaultPortfolio,
            type: pnl >= 0 ? 'profit' : 'loss',
            timestamp: raw.timestamp || new Date().toISOString()
        };
    } catch (e) {
        console.warn("Skipping invalid trade during import", raw, e);
        return null;
    }
};

// --- Data Hook ---
export const useTradeData = (user: User | null, status: string, firestoreDb: any, config: any) => {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [strategies, setStrategies] = useState<string[]>(() => safeJSONParse('local_strategies', ['突破策略', '回檔承接']));
    const [emotions, setEmotions] = useState<string[]>(() => safeJSONParse('local_emotions', ['冷靜', 'FOMO', '復仇單']));
    
    // Default Portfolios
    const defaultPortfolios: Portfolio[] = [{ id: 'main', name: 'Main Account', initialCapital: 100000, profitColor: DEFAULT_PALETTE[0], lossColor: THEME.DEFAULT_LOSS }];

    const [portfolios, setPortfolios] = useState<Portfolio[]>(() => {
        const saved = safeJSONParse<any[]>('local_portfolios', []);
        if (saved.length === 0) return defaultPortfolios;
        return saved.map(p => ({
            ...p,
            profitColor: p.profitColor || p.color || DEFAULT_PALETTE[0],
            lossColor: p.lossColor || THEME.DEFAULT_LOSS
        }));
    });

    const [activePortfolioIds, setActivePortfolioIds] = useLocalStorage<string[]>('app_active_portfolios', ['main']);
    const [lossColor, setLossColor] = useLocalStorage<string>('app_loss_color', THEME.DEFAULT_LOSS);
    
    // Risk settings
    const [ddThreshold, setDdThreshold] = useLocalStorage<number>('app_dd_threshold', 20);
    const [maxLossStreak, setMaxLossStreak] = useLocalStorage<number>('app_max_loss_streak', 3);
    
    // Sync States
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    
    // Auto-Save / Debounce States
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
    const [lastBackupTime, setLastBackupTime] = useState<Date | null>(null); // NEW: Track last sync time
    
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
            setLastBackupTime(new Date()); // Confirm we are up to date
            return;
        }

        const batch = writeBatch(db);
        
        // CRITICAL FIX: Snapshot current writes and clear pending IMMEDIATELY.
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
            if (pendingWrites.current.size === 0) {
                setSyncStatus('synced');
                setLastBackupTime(new Date()); // Update timestamp on success
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
        setLastBackupTime(new Date()); // Initial load successful

        // 3. Online & No Conflict: Subscribe to Firestore
        const q = query(collection(db, 'users', user.uid, 'trades'), orderBy('date', 'desc'));
        const unsubTrades = onSnapshot(q, (snapshot) => {
            const cloudTrades = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                pnl: Number(doc.data().pnl || 0)
            })) as Trade[];
            
            setTrades(cloudTrades);
            setLastBackupTime(new Date()); // Update on incoming sync
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
                setLastBackupTime(new Date()); // Settings sync is also a backup
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
            else if (field === 'portfolios') {
                const oldPortfolios = portfolios;
                setPortfolios(value);

                // --- LOGIC CHANGE: AUTO-SELECT NEW PORTFOLIOS ---
                if (Array.isArray(value)) {
                    // 1. If we added portfolios (length increased), FORCE SELECT ALL
                    if (value.length > oldPortfolios.length) {
                        const allIds = value.map((p: any) => p.id);
                        setActivePortfolioIds(allIds);
                    }
                    // 2. If we deleted portfolios (length decreased), clean them up from activePortfolioIds
                    else if (value.length < oldPortfolios.length) {
                        const currentIds = value.map((p: any) => p.id);
                        setActivePortfolioIds(prev => {
                            const next = prev.filter(id => currentIds.includes(id));
                            // Ensure at least one is selected if available
                            return next.length > 0 ? next : (currentIds.length > 0 ? [currentIds[0]] : []);
                        });
                    }
                }
            } 
            else if (field === 'lossColor') setLossColor(value);
            
            localStorage.setItem(`local_${field}`, JSON.stringify(value));
            
            if (user) {
                // Settings are less frequent, we can just write them directly but show "Saving"
                setSyncStatus('saving');
                try {
                    const settingsRef = doc(db, 'users', user.uid, 'settings', 'config');
                    await setDoc(settingsRef, { [field]: value }, { merge: true });
                    setTimeout(() => {
                        setSyncStatus('synced');
                        setLastBackupTime(new Date());
                    }, 500);
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
        // NEW: Manually trigger a backup / sync check
        triggerCloudBackup: async () => {
            if (!user) {
                alert("Please log in to backup to cloud.");
                return;
            }
            setSyncStatus('saving');
            // Force a flush of any pending writes
            await flushToCloud();
            // Even if nothing was pending, simulate a check to reassure user
            setTimeout(() => {
                setSyncStatus('synced');
                setLastBackupTime(new Date());
            }, 800);
        },
        downloadBackup: () => {
            const backupData = {
                version: 1,
                timestamp: new Date().toISOString(),
                trades,
                settings: {
                    strategies,
                    emotions,
                    portfolios,
                    lossColor,
                    ddThreshold,
                    maxLossStreak
                }
            };
            downloadJSON(backupData);
        },
        handleImportJSON: (e: any, t: any) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const jsonString = event.target?.result as string;
                    if (!jsonString) throw new Error("Empty file");
                    
                    const json = JSON.parse(jsonString);
                    
                    // --- SAFE MIGRATION & VALIDATION LOGIC ---
                    let importedTrades: Trade[] = [];
                    let importedSettings: any = {};

                    // Handle different backup versions
                    if (Array.isArray(json)) {
                        // Legacy: Root is array of trades
                        importedTrades = json;
                    } else if (json.trades) {
                        // Modern: { trades: [], settings: {} }
                        importedTrades = json.trades;
                        importedSettings = json.settings || {};
                    } else {
                        throw new Error("Unknown File Format");
                    }

                    // Validate each trade
                    const cleanTrades: Trade[] = [];
                    const defaultPid = activePortfolioIds[0] || 'main';
                    
                    importedTrades.forEach((rawTrade: any) => {
                        const cleaned = validateAndMigrateTrade(rawTrade, defaultPid);
                        if (cleaned) cleanTrades.push(cleaned);
                    });

                    if (cleanTrades.length === 0) {
                        alert("No valid trades found in backup file.");
                        return;
                    }

                    // --- APPLY UPDATES ---

                    // 1. Update State
                    setTrades(cleanTrades);
                    
                    if (importedSettings.strategies) setStrategies(importedSettings.strategies);
                    if (importedSettings.emotions) setEmotions(importedSettings.emotions);
                    if (importedSettings.lossColor) setLossColor(importedSettings.lossColor);

                    if (importedSettings.portfolios) {
                        setPortfolios(importedSettings.portfolios);
                        localStorage.setItem('local_portfolios', JSON.stringify(importedSettings.portfolios));
                        // NEW: Update active portfolios to show imported data
                        const newIds = importedSettings.portfolios.map((p: any) => p.id);
                        setActivePortfolioIds(newIds);
                    }

                    // 2. Update Local Storage (Always update local as fallback/offline)
                    localStorage.setItem('local_trades', JSON.stringify(cleanTrades));
                    if (importedSettings.strategies) localStorage.setItem('local_strategies', JSON.stringify(importedSettings.strategies));
                    if (importedSettings.emotions) localStorage.setItem('local_emotions', JSON.stringify(importedSettings.emotions));
                    if (importedSettings.lossColor) localStorage.setItem('app_loss_color', JSON.stringify(importedSettings.lossColor));
                    
                    // 3. Update Cloud (If online)
                    if (user) {
                        setSyncStatus('saving');
                        
                        // Update Settings Document
                        const settingsRef = doc(db, 'users', user.uid, 'settings', 'config');
                        await setDoc(settingsRef, {
                            strategies: importedSettings.strategies || strategies,
                            emotions: importedSettings.emotions || emotions,
                            portfolios: importedSettings.portfolios || portfolios,
                            lossColor: importedSettings.lossColor || lossColor,
                            userId: user.uid
                        }, { merge: true });

                        // Update Trades (Batch Write for Safety)
                        // Limit batch size to 500 (Firestore limit)
                        const chunks = [];
                        for (let i = 0; i < cleanTrades.length; i += 450) {
                            chunks.push(cleanTrades.slice(i, i + 450));
                        }

                        for (const chunk of chunks) {
                            const batch = writeBatch(db);
                            chunk.forEach(tr => {
                                const docRef = doc(db, 'users', user.uid, 'trades', tr.id);
                                batch.set(docRef, { ...tr, userId: user.uid });
                            });
                            await batch.commit();
                        }

                        setLastBackupTime(new Date());
                        setSyncStatus('synced');
                    }

                    alert(t.importSuccess);
                    // Reload removed to prevent browser crash/navigation errors.
                    // React state updates will handle the UI refresh.
                    // window.location.reload();

                } catch (err: any) {
                    console.error("Import failed:", err);
                    alert(`${t.importError}\n\nDetails: ${err.message}`);
                }
            };
            reader.readAsText(file);
        },
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

            // 3. Reset State MANUALLY (Replaces window.location.reload())
            setTrades([]);
            setStrategies(['突破策略', '回檔承接']);
            setEmotions(['冷靜', 'FOMO', '復仇單']);
            setPortfolios(defaultPortfolios);
            setActivePortfolioIds(['main']);
            setDdThreshold(20);
            setMaxLossStreak(3);
            setLossColor(THEME.DEFAULT_LOSS);
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
                        await Promise.all(localTrades.map(tr => {
                            const { id, ...data } = tr; // Remove local ID
                            
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
                        userId: user.uid 
                    }, { merge: true });
                }
                
                // 3. Cleanup Local Data (Execute for both 'merge' and 'discard')
                const keysToWipe = [
                    'local_trades', 
                    'local_strategies', 
                    'local_emotions', 
                    'local_portfolios', 
                    'app_active_portfolios'
                ];
                keysToWipe.forEach(k => localStorage.removeItem(k));

                // 4. Force Reload / Re-fetch (Replaces window.location.reload())
                // By clearing local data and closing modal, the main useEffect will bypass the conflict check 
                // and proceed to subscribe to Firestore, effectively "reloading" the data view.
                setIsSyncModalOpen(false);
                setIsSyncing(false);

            } catch (error: any) {
                console.error("Sync resolution failed:", error);
                alert(`Sync Failed: ${error.message}`);
                setIsSyncing(false);
            }
        }
    }), [user, portfolios, activePortfolioIds, setActivePortfolioIds, strategies, emotions, isSyncModalOpen, flushToCloud, ddThreshold, maxLossStreak, trades]);

    return { 
        trades, strategies, emotions, portfolios, 
        activePortfolioIds, setActivePortfolioIds, 
        lossColor, setLossColor,
        isSyncing,
        isSyncModalOpen,
        syncStatus,
        lastBackupTime, // EXPORTED
        actions 
    };
};
