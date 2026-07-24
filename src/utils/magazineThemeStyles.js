import { translations } from '../translations';

// Matches a post's comment against every known theme's hashtag text (in either
// language, since a post's hashtag is stored in whichever language was active
// when it was posted, not the current viewer's language) to figure out which
// weekly/seasonal theme — if any — it was posted under.
const THEME_KEYS = [
    'themeUnagiDay', 'themeTanabata', 'themeObon', 'themeHalloweenDay',
    'themeChristmasDay', 'themeNewYearDay', 'themeSummer', 'themeHanami',
    'themeMomiji', 'themeColorful', 'themePattern', 'themeFirst',
    'themeHoliday', 'themeHandmade', 'themeDress', 'themeEvent',
];

export function detectThemeFromComment(comment) {
    if (!comment) return null;
    for (const key of THEME_KEYS) {
        const enText = translations.en[key];
        const jpText = translations.jp[key];
        if ((enText && comment.includes(enText)) || (jpText && comment.includes(jpText))) {
            return key;
        }
    }
    return null;
}

// Editorial color palette + cover category tag per theme, for the magazine-
// cover treatment. Bilingual category label since the cover shouldn't
// re-translate at view time — it's a fixed piece of "print" design.
export const MAGAZINE_STYLES = {
    themeUnagiDay: { accent: '#8b0020', accent2: '#c9a227', label: '特集 SPECIAL FEATURE' },
    themeTanabata: { accent: '#1a2a6c', accent2: '#e0c341', label: 'STARRY NIGHT ISSUE' },
    themeObon: { accent: '#b5482a', accent2: '#2f4030', label: 'HOMECOMING ISSUE' },
    themeHalloweenDay: { accent: '#1a1a1a', accent2: '#f97316', label: 'HALLOWEEN ISSUE' },
    themeChristmasDay: { accent: '#7a0d24', accent2: '#0f5132', label: 'HOLIDAY ISSUE' },
    themeNewYearDay: { accent: '#8b0020', accent2: '#c9a227', label: '新春特集 NEW YEAR ISSUE' },
    themeSummer: { accent: '#0e7c86', accent2: '#f4c542', label: 'SUMMER ISSUE' },
    themeHanami: { accent: '#d6668c', accent2: '#7a9d6f', label: 'SAKURA ISSUE' },
    themeMomiji: { accent: '#b5482a', accent2: '#6b3e26', label: 'AUTUMN ISSUE' },
    themeColorful: { accent: '#a730c9', accent2: '#3097c9', label: 'COLOR ISSUE' },
    themePattern: { accent: '#1f2937', accent2: '#94a3b8', label: 'PATTERN ISSUE' },
    themeFirst: { accent: '#c9738f', accent2: '#e8d3c0', label: 'DEBUT ISSUE' },
    themeHoliday: { accent: '#1e79b4', accent2: '#e8c99b', label: 'GETAWAY ISSUE' },
    themeHandmade: { accent: '#8a5a34', accent2: '#e8dcc4', label: 'HANDMADE ISSUE' },
    themeDress: { accent: '#5b2a6b', accent2: '#d6a0c9', label: 'DRESS ISSUE' },
    themeEvent: { accent: '#6b2ac9', accent2: '#e0c341', label: 'EVENT ISSUE' },
};
