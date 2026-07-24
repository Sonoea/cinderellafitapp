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

// Editorial color palette + cover category tag + a "scene" per theme (a
// background gradient plus a few decorative emoji motifs) for the magazine-
// cover treatment. This is a stand-in for a real themed background — actually
// compositing the plushie onto a photo background would need real image
// segmentation (cutting the subject out of its own busy photo), which is a
// heavier, riskier lift than plain CSS. The motifs/gradient give a themed
// "scene" feeling for free, no AI or image assets required.
export const MAGAZINE_STYLES = {
    themeUnagiDay: {
        accent: '#8b0020', accent2: '#c9a227', label: '特集 SPECIAL FEATURE',
        bgGradient: 'radial-gradient(ellipse at 30% 20%, #5a1408 0%, #2b0a04 55%, #1a0602 100%)',
        motifs: ['🔥', '🍚', '🐟', '♨️'],
    },
    themeTanabata: {
        accent: '#1a2a6c', accent2: '#e0c341', label: 'STARRY NIGHT ISSUE',
        bgGradient: 'radial-gradient(ellipse at 70% 15%, #24356f 0%, #0d1233 60%, #050714 100%)',
        motifs: ['🎋', '⭐', '🌌', '🎐'],
    },
    themeObon: {
        accent: '#b5482a', accent2: '#2f4030', label: 'HOMECOMING ISSUE',
        bgGradient: 'radial-gradient(ellipse at 50% 20%, #6b3620 0%, #2e1a10 60%, #180d08 100%)',
        motifs: ['🏮', '🌾', '🕯️'],
    },
    themeHalloweenDay: {
        accent: '#1a1a1a', accent2: '#f97316', label: 'HALLOWEEN ISSUE',
        bgGradient: 'radial-gradient(ellipse at 50% 15%, #3a1f00 0%, #150a00 55%, #000000 100%)',
        motifs: ['🎃', '🦇', '👻', '🕸️'],
    },
    themeChristmasDay: {
        accent: '#7a0d24', accent2: '#0f5132', label: 'HOLIDAY ISSUE',
        bgGradient: 'radial-gradient(ellipse at 30% 15%, #6b0d24 0%, #0f3d24 60%, #071a10 100%)',
        motifs: ['🎄', '❄️', '🎁', '⭐'],
    },
    themeNewYearDay: {
        accent: '#8b0020', accent2: '#c9a227', label: '新春特集 NEW YEAR ISSUE',
        bgGradient: 'radial-gradient(ellipse at 50% 15%, #7a0d24 0%, #3a0510 60%, #1a0207 100%)',
        motifs: ['🎍', '🌅', '🧧'],
    },
    themeSummer: {
        accent: '#0e7c86', accent2: '#f4c542', label: 'SUMMER ISSUE',
        bgGradient: 'radial-gradient(ellipse at 30% 15%, #0e7c86 0%, #084b52 55%, #032428 100%)',
        motifs: ['🌻', '🏖️', '☀️'],
    },
    themeHanami: {
        accent: '#d6668c', accent2: '#7a9d6f', label: 'SAKURA ISSUE',
        bgGradient: 'radial-gradient(ellipse at 70% 15%, #7a3a4d 0%, #3d1c26 60%, #201016 100%)',
        motifs: ['🌸', '🍡', '🎏'],
    },
    themeMomiji: {
        accent: '#b5482a', accent2: '#6b3e26', label: 'AUTUMN ISSUE',
        bgGradient: 'radial-gradient(ellipse at 30% 15%, #7a3d1a 0%, #3d1f0d 60%, #1f0f06 100%)',
        motifs: ['🍁', '🍂'],
    },
    themeColorful: {
        accent: '#a730c9', accent2: '#3097c9', label: 'COLOR ISSUE',
        bgGradient: 'radial-gradient(ellipse at 30% 15%, #6b1f8a 0%, #2a1a6b 55%, #120a33 100%)',
        motifs: ['🌈', '✨', '🎨'],
    },
    themePattern: {
        accent: '#1f2937', accent2: '#94a3b8', label: 'PATTERN ISSUE',
        bgGradient: 'radial-gradient(ellipse at 30% 15%, #29394d 0%, #131c29 60%, #090d13 100%)',
        motifs: ['✂️', '📐', '🧵'],
    },
    themeFirst: {
        accent: '#c9738f', accent2: '#e8d3c0', label: 'DEBUT ISSUE',
        bgGradient: 'radial-gradient(ellipse at 30% 15%, #8a4d5f 0%, #4d2733 60%, #26141a 100%)',
        motifs: ['🎀', '✨'],
    },
    themeHoliday: {
        accent: '#1e79b4', accent2: '#e8c99b', label: 'GETAWAY ISSUE',
        bgGradient: 'radial-gradient(ellipse at 30% 15%, #1e5f8a 0%, #113752 60%, '
            + '#081b29 100%)',
        motifs: ['🧳', '🌴', '☀️'],
    },
    themeHandmade: {
        accent: '#8a5a34', accent2: '#e8dcc4', label: 'HANDMADE ISSUE',
        bgGradient: 'radial-gradient(ellipse at 30% 15%, #6b4a2e 0%, #3d2a19 60%, #1f150d 100%)',
        motifs: ['🧵', '✂️', '🪡'],
    },
    themeDress: {
        accent: '#5b2a6b', accent2: '#d6a0c9', label: 'DRESS ISSUE',
        bgGradient: 'radial-gradient(ellipse at 30% 15%, #4d1f5c 0%, #29103d 60%, #150820 100%)',
        motifs: ['👗', '💐'],
    },
    themeEvent: {
        accent: '#6b2ac9', accent2: '#e0c341', label: 'EVENT ISSUE',
        bgGradient: 'radial-gradient(ellipse at 30% 15%, #4d1f8a 0%, #29105c 60%, #130829 100%)',
        motifs: ['🎉', '🎊', '✨'],
    },
};
