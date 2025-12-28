
// [Manage] Last Updated: 2024-05-22
import { Lang, Frequency } from '../types';
import { THEME } from '../constants';

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

// NEW: Chart Axis Formatter
export const formatChartAxisDate = (timestamp: number, freq: Frequency) => {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    const yyyy = date.getFullYear();
    const yy = String(yyyy).slice(-2);
    const mm = date.getMonth() + 1;
    const dd = date.getDate();

    switch (freq) {
        case 'yearly':
            return String(yyyy);
        case 'quarterly':
            const q = Math.ceil(mm / 3);
            return `${yy}Q${q}`;
        case 'monthly':
            return `${yy}/${String(mm).padStart(2, '0')}`;
        case 'weekly':
            return `${String(mm).padStart(2, '0')}/${String(dd).padStart(2, '0')}`;
        case 'daily':
        default:
            return `${String(mm).padStart(2, '0')}/${String(dd).padStart(2, '0')}`;
    }
};

export const getPnlColor = (val: number) => val >= 0 ? THEME.RED : THEME.LOSS_WHITE;

export const getLocalDateStr = (dateObj = new Date()) => {
    if (isNaN(dateObj.getTime())) {
        dateObj = new Date();
    }
    const offset = dateObj.getTimezoneOffset() * 60000;
    return new Date(dateObj.getTime() - offset).toISOString().split('T')[0];
};
