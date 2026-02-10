export const safeHostname = (url) => {
    try {
        if (!url || typeof url !== 'string') return '';
        const urlToCheck = url.startsWith('http') ? url : `https://${url}`;
        return new URL(urlToCheck).hostname;
    } catch (e) {
        return '';
    }
};

export const safeDate = (dateVal) => {
    try {
        if (!dateVal) return 'Recently';
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return 'Recently';
        return d.toISOString().split('T')[0];
    } catch (e) {
        return 'Recently';
    }
};
