
// [Manage] Last Updated: 2024-05-22
import { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, getDoc, setDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { Trade, Portfolio, SyncStatus, User } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { DEFAULT_PALETTE, THEME } from '../constants';
import { downloadJSON } from '../utils/storage';

const INITIAL_PORTFOLIO: Portfolio = { id: 'main', name: 'Main Account', initialCapital: 100000, profitColor: THEME.RED, lossColor: THEME.DEFAULT_LOSS };

export const useTradeData = (user: User | null, authStatus: string, db: any, config: any) => {
    // Local State (Single Source of Truth for UI)
    const [trades, setTrades] = useLocalStorage<Trade[]>('local_trades', []);
    const [strategies, setStrategies] = useLocalStorage<string[]>('local_strategies', ['Trend', 'Reversal', 'Breakout']);
    // UPDATED: Default to Trade Types instead of Mindsets
    const [emotions, setEmotions] = useLocalStorage<string[]>('local_emotions', ['Scalping', 'Swing', 'Event']);
    const [portfolios, setPortfolios] = useLocalStorage<Portfolio[]>('local_portfolios', [INITIAL_PORTFOLIO]);
    
    // UI State
    const [activePortfolioIds, setActivePortfolioIds] = useLocalStorage<string[]>('app_active_portfolios', ['main']);
    const [lossColor, setLossColor] = useLocalStorage<string>('app_loss_color', THEME.DEFAULT_LOSS);
    
    // Sync State
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
    const [lastBackupTime, setLastBackupTime] = useState<Date | null>(null);
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

    // --- Sync Logic (Memoized) ---
    const triggerCloudBackup = useCallback(async () => {
        if (!user || authStatus !== 'online') {
            setSyncStatus('offline');
            return;
        }
        
        setSyncStatus('saving');
        try {
            const dataToSave = {
                trades,
                strategies,
                emotions,
                portfolios,
                settings: { lossColor },
                lastUpdated: Timestamp.now()
            };
            
            await setDoc(doc(db, 'users', user.uid), dataToSave);
            setSyncStatus('synced');
            setLastBackupTime(new Date());
        } catch (e) {
            console.error("Backup failed", e);
            setSyncStatus('error');
        }
    }, [user, authStatus, db, trades, strategies, emotions, portfolios, lossColor]);

    // --- Actions (Memoized to prevent Error #185) ---
    const actions = useMemo(() => ({
        saveTrade: (trade: Trade, editingId: string | null) => {
            if (editingId) {
                setTrades(prev => prev.map(t => t.id === editingId ? { ...trade, id: editingId } : t));
            } else {
                const newTrade = { ...trade, id: `trade-${Date.now()}`, timestamp: new Date().toISOString() };
                setTrades(prev => [newTrade, ...prev]);
            }
            setTimeout(triggerCloudBackup, 0); 
        },

        deleteTrade: (id: string) => {
            setTrades(prev => prev.filter(t => t.id !== id));
            setTimeout(triggerCloudBackup, 0);
        },

        updatePortfolio: (id: string, key: keyof Portfolio, value: any) => {
            setPortfolios(prev => prev.map(p => p.id === id ? { ...p, [key]: value } : p));
            setTimeout(triggerCloudBackup, 0);
        },

        updateSettings: (key: string, value: any) => {
            if (key === 'portfolios') {
                const newPortfolios = value as Portfolio[];
                setPortfolios(newPortfolios);
                setActivePortfolioIds(prev => {
                   const newIds = newPortfolios.map(p => p.id);
                   const validActive = prev.filter(id => newIds.includes(id));
                   if (newIds.length > prev.length) return newIds; 
                   return validActive.length > 0 ? validActive : [newIds[0]];
                });
            }
            setTimeout(triggerCloudBackup, 0);
        },

        addStrategy: (s: string) => {
            if (!strategies.includes(s)) {
                setStrategies(prev => [...prev, s]);
                setTimeout(triggerCloudBackup, 0);
            }
        },

        addEmotion: (e: string) => {
            if (!emotions.includes(e)) {
                setEmotions(prev => [...prev, e]);
                setTimeout(triggerCloudBackup, 0);
            }
        },
        
        deleteStrategy: (s: string) => {
            setStrategies(prev => prev.filter(item => item !== s));
            setTimeout(triggerCloudBackup, 0);
        },

        deleteEmotion: (e: string) => {
            setEmotions(prev => prev.filter(item => item !== e));
            setTimeout(triggerCloudBackup, 0);
        },

        triggerCloudBackup,

        resetAllData: (t: any) => {
            if (window.confirm(t.resetConfirm)) {
                setTrades([]);
                setStrategies(['Trend', 'Reversal']);
                // UPDATED: Default reset values
                setEmotions(['Scalping', 'Swing', 'Event']);
                setPortfolios([INITIAL_PORTFOLIO]);
                localStorage.removeItem('local_trades');
                localStorage.removeItem('local_strategies');
                localStorage.removeItem('local_emotions');
                localStorage.removeItem('local_portfolios');
                window.location.reload();
            }
        },

        handleImportJSON: (e: React.ChangeEvent<HTMLInputElement>, t: any) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target?.result as string);
                    
                    // 1. Restore Data
                    if (data.trades) setTrades(data.trades);
                    if (data.strategies) setStrategies(data.strategies);
                    if (data.emotions) setEmotions(data.emotions);
                    
                    // 2. Restore Portfolios & Fix Active IDs
                    if (data.portfolios && Array.isArray(data.portfolios)) {
                        setPortfolios(data.portfolios);
                        // CRITICAL FIX: Reset active portfolios to the imported IDs to ensure data visibility
                        const newIds = data.portfolios.map((p: any) => p.id);
                        setActivePortfolioIds(newIds);
                    }

                    // 3. Optional: Restore Settings
                    if (data.settings && data.settings.lossColor) {
                        setLossColor(data.settings.lossColor);
                    }

                    alert(t.importSuccess);
                } catch (err) {
                    console.error(err);
                    alert(t.importError);
                }
            };
            reader.readAsText(file);
        },

        downloadBackup: () => downloadJSON({ trades, strategies, emotions, portfolios, settings: { lossColor } }),
        retrySync: triggerCloudBackup,
        resolveSyncConflict: () => setIsSyncModalOpen(false)
    }), [trades, strategies, emotions, portfolios, lossColor, triggerCloudBackup, setTrades, setStrategies, setEmotions, setPortfolios, setActivePortfolioIds]);


    // Initial Sync (Pull)
    useEffect(() => {
        if (!user || authStatus !== 'online') return;

        const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (syncStatus === 'saving') return; 

                if (trades.length === 0 && data.trades && data.trades.length > 0) {
                     setTrades(data.trades);
                     setStrategies(data.strategies || []);
                     setEmotions(data.emotions || []);
                     setPortfolios(data.portfolios || [INITIAL_PORTFOLIO]);
                     setSyncStatus('synced');
                     setLastBackupTime(data.lastUpdated?.toDate());
                     
                     // Sync active portfolios on cloud restore as well
                     if(data.portfolios) {
                        setActivePortfolioIds(data.portfolios.map((p:any) => p.id));
                     }
                }
            }
        });

        return () => unsubscribe();
    }, [user, authStatus, db]);

    return {
        trades, strategies, emotions, portfolios,
        activePortfolioIds, setActivePortfolioIds,
        lossColor, setLossColor,
        isSyncing, isSyncModalOpen, syncStatus, lastBackupTime,
        actions
    };
};
