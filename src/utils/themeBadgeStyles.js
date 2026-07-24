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

// A vivid accent color + a line-art icon per theme, used for a small round
// "stamp" badge stuck on the corner of a post's photo — in both the Gallery
// grid thumbnail and the detail view, so a themed post is recognizable while
// just browsing, not only after opening it. Colors are saturated/poster-like
// since this is a sticker sitting ON the photo, not a wash over it.
export const THEME_BADGE_STYLES = {
    themeUnagiDay: { accent: '#d9480f', char: 'う' },
    themeTanabata: { accent: '#2b3a9e', motif: 'star' },
    themeObon: { accent: '#c2410c', motif: 'lantern' },
    themeHalloweenDay: { accent: '#f97316', motif: 'bat' },
    themeChristmasDay: { accent: '#c0142a', motif: 'tree' },
    themeNewYearDay: { accent: '#c0142a', motif: 'sunrise' },
    themeSummer: { accent: '#0e9aa7', motif: 'sun' },
    themeHanami: { accent: '#e0669a', motif: 'sakura' },
    themeMomiji: { accent: '#c2611c', motif: 'maple' },
    themeColorful: { accent: '#a730c9', motif: 'palette' },
    themePattern: { accent: '#2c3e50', motif: 'scissors' },
    themeFirst: { accent: '#d9738f', motif: 'ribbon' },
    themeHoliday: { accent: '#1e88c7', motif: 'suitcase' },
    themeHandmade: { accent: '#9c6b3a', motif: 'needle' },
    themeDress: { accent: '#7a3a8c', motif: 'dress' },
    themeEvent: { accent: '#7a3ae0', motif: 'balloon' },
};
