export const safeHostname = (url) => {
    try {
        if (!url || typeof url !== 'string') return '';
        const urlToCheck = url.startsWith('http') ? url : `https://${url}`;
        return new URL(urlToCheck).hostname;
    } catch (e) {
        return '';
    }
};

export const getLocationFlag = (location) => {
    if (!location) return '🌐';
    const loc = location.toLowerCase();
    if (loc.includes('日本') || loc.includes('japan') || loc.includes('tokyo') || loc.includes('osaka') || loc.includes('kyoto') || loc.includes('shibuya') || loc.includes('iwate') || loc.includes('hokkaido') ||
        loc.includes('東京') || loc.includes('大阪') || loc.includes('京都') || loc.includes('渋谷') || loc.includes('岩手') || loc.includes('北海道') || loc.includes('札幌') || loc.includes('福岡') || loc.includes('横浜') ||
        loc.includes('神奈川') || loc.includes('兵库') || loc.includes('兵庫') || loc.includes('愛知') || loc.includes('千葉') || loc.includes('埼玉') || loc.includes('広島') || loc.includes('仙台') || loc.includes('名古屋')) return '🇯🇵';
    if (loc.includes('usa') || loc.includes('america') || loc.includes('new york') || loc.includes('ny') || loc.includes('la') || loc.includes('los angeles')) return '🇺🇸';
    if (loc.includes('france') || loc.includes('paris')) return '🇫🇷';
    if (loc.includes('uk') || loc.includes('london') || loc.includes('england') || loc.includes('united kingdom')) return '🇬🇧';
    if (loc.includes('korea') || loc.includes('seoul')) return '🇰🇷';
    if (loc.includes('china') || loc.includes('shanghai') || loc.includes('beijing')) return '🇨🇳';
    if (loc.includes('taiwan') || loc.includes('台湾')) return '🇹🇼';
    if (loc.includes('germany') || loc.includes('berlin')) return '🇩🇪';
    if (loc.includes('italy') || loc.includes('rome')) return '🇮🇹';
    if (loc.includes('spain') || loc.includes('madrid')) return '🇪🇸';
    if (loc.includes('canada')) return '🇨🇦';
    if (loc.includes('australia') || loc.includes('sydney')) return '🇦🇺';
    if (loc.includes('singapore')) return '🇸🇬';
    if (loc.includes('thailand') || loc.includes('bangkok')) return '🇹🇭';
    if (loc.includes('vietnam')) return '🇻🇳';
    return '🌐';
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
