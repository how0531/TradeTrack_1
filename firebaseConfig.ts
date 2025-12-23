
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyA4wsQ5K6yETn2KTJrj756ZdrDirsjKX-4",
    authDomain: "tradetrack-fbcc3.firebaseapp.com",
    projectId: "tradetrack-fbcc3",
    storageBucket: "tradetrack-fbcc3.firebasestorage.app",
    messagingSenderId: "29117768850",
    appId: "1:29117768850:web:668fcaf1164a0a07adb24b",
    measurementId: "G-DJ5M32QLKY"
};

// Initialize Firebase
// This file is the single source of truth for Firebase instances
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const config = { appId: firebaseConfig.projectId };

export default app;
