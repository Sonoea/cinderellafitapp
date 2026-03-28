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
        if (!dateVal) return null;
        
        // Handle Firestore Timestamp
        if (dateVal && typeof dateVal === 'object' && 'seconds' in dateVal) {
            const d = new Date(dateVal.seconds * 1000);
            return d.toISOString().split('T')[0];
        }
        
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().split('T')[0];
    } catch (e) {
        return null;
    }
};
