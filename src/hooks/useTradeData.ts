
import { useState, useEffect, useCallback } from 'react';
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
    const [emotions, setEmotions] = useLocalStorage<string[]>('local_emotions', ['Calm', 'FOMO', 'Revenge']);
    const [portfolios, setPortfolios] = useLocalStorage<Portfolio[]>('local_portfolios', [INITIAL_PORTFOLIO]);
    
    // UI State
    const [activePortfolioIds, setActivePortfolioIds] = useLocalStorage<string[]>('app_active_portfolios', ['main']);
    const [lossColor, setLossColor] = useLocalStorage<string>('app_loss_color', THEME.DEFAULT_LOSS);
    
    // Sync State
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
    const [lastBackupTime, setLastBackupTime] = useState<Date | null>(null);
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [cloudDataBuffer, setCloudDataBuffer] = useState<any>(null);

    // --- Actions ---

    const saveTrade = (trade: Trade, editingId: string | null) => {
        if (editingId) {
            setTrades(prev => prev.map(t => t.id === editingId ? { ...trade, id: editingId } : t));
        } else {
            const newTrade = { ...trade, id: `trade-${Date.now()}`, timestamp: new Date().toISOString() };
            setTrades(prev => [newTrade, ...prev]);
        }
        triggerCloudBackup();
    };

    const deleteTrade = (id: string) => {
        setTrades(prev => prev.filter(t => t.id !== id));
        triggerCloudBackup();
    };

    const updatePortfolio = (id: string, key: keyof Portfolio, value: any) => {
        setPortfolios(prev => prev.map(p => p.id === id ? { ...p, [key]: value } : p));
        triggerCloudBackup();
    };

    const updateSettings = (key: string, value: any) => {
        if (key === 'portfolios') {
            const newPortfolios = value as Portfolio[];
            // Logic: Detect newly added portfolios and auto-select them
            const oldIds = portfolios.map(p => p.id);
            const newIds = newPortfolios.map(p => p.id);
            const addedIds = newIds.filter(id => !oldIds.includes(id));

            setPortfolios(newPortfolios);
            
            // If new portfolios were added, append them to the active list immediately
            // This ensures "All" remains effectively selected for the user
            if (addedIds.length > 0) {
                setActivePortfolioIds(prev => {
                    // Filter out any stale IDs that might have been deleted, then add new ones
                    const currentValid = prev.filter(id => newIds.includes(id));
                    return [...currentValid, ...addedIds];
                });
            } else if (newIds.length < oldIds.length) {
                 // Handle deletion: remove deleted IDs from active list
                 setActivePortfolioIds(prev => prev.filter(id => newIds.includes(id)));
            }
        } else {
            // Handle other settings updates if necessary
        }
        triggerCloudBackup();
    };

    const addStrategy = (s: string) => {
        if (!strategies.includes(s)) {
            setStrategies(prev => [...prev, s]);
            triggerCloudBackup();
        }
    };

    const addEmotion = (e: string) => {
        if (!emotions.includes(e)) {
            setEmotions(prev => [...prev, e]);
            triggerCloudBackup();
        }
    };
    
    const deleteStrategy = (s: string) => {
        setStrategies(prev => prev.filter(item => item !== s));
        triggerCloudBackup();
    };

    const deleteEmotion = (e: string) => {
        setEmotions(prev => prev.filter(item => item !== e));
        triggerCloudBackup();
    };

    // --- Sync Logic ---

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

    // Initial Sync (Pull)
    useEffect(() => {
        if (!user || authStatus !== 'online') return;

        const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const cloudTime = data.lastUpdated?.toDate().getTime() || 0;
                
                // Simple logic: If we just saved, ignore this snapshot update to prevent loops
                // In a real app, use timestamps to resolve conflicts
                if (syncStatus === 'saving') return; 

                // Check conflict only if local data exists and differs significantly
                // For this refactor, we'll assume "Cloud Wins" if local is empty, or "Merge" logic needed
                if (trades.length === 0 && data.trades && data.trades.length > 0) {
                     // Fast forward: Load cloud data
                     setTrades(data.trades);
                     setStrategies(data.strategies || []);
                     setEmotions(data.emotions || []);
                     setPortfolios(data.portfolios || [INITIAL_PORTFOLIO]);
                     setSyncStatus('synced');
                     setLastBackupTime(data.lastUpdated?.toDate());
                }
            }
        });

        return () => unsubscribe();
    }, [user, authStatus, db]);

    // --- Data Management Helpers ---
    
    const resetAllData = (t: any) => {
        if (window.confirm(t.resetConfirm)) {
            setTrades([]);
            setStrategies(['Trend', 'Reversal']);
            setEmotions(['Calm', 'FOMO']);
            setPortfolios([INITIAL_PORTFOLIO]);
            triggerCloudBackup();
            window.location.reload();
        }
    };

    const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>, t: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (data.trades) setTrades(data.trades);
                if (data.strategies) setStrategies(data.strategies);
                if (data.emotions) setEmotions(data.emotions);
                if (data.portfolios) setPortfolios(data.portfolios);
                alert(t.importSuccess);
            } catch (err) {
                alert(t.importError);
            }
        };
        reader.readAsText(file);
    };

    return {
        trades, strategies, emotions, portfolios,
        activePortfolioIds, setActivePortfolioIds,
        lossColor, setLossColor,
        isSyncing, isSyncModalOpen, syncStatus, lastBackupTime,
        actions: {
            saveTrade, deleteTrade, updatePortfolio, updateSettings,
            addStrategy, deleteStrategy, addEmotion, deleteEmotion,
            triggerCloudBackup, resetAllData, handleImportJSON,
            downloadBackup: () => downloadJSON({ trades, strategies, emotions, portfolios, settings: { lossColor } }),
            retrySync: triggerCloudBackup,
            resolveSyncConflict: () => setIsSyncModalOpen(false) // Placeholder
        }
    };
};
