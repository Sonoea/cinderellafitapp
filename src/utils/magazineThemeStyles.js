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

// Editorial identity per theme: an evocative cover line (words only — no
// emoji, no clip-art) and a mood tint applied to the photo as a duotone-style
// color wash (CSS blend, not a separate background the photo floats on).
// Real magazine covers are full-bleed photography with a color grade, not a
// photo shrunk onto a decorated background — this mirrors that instead of
// faking a "scene".
export const MAGAZINE_STYLES = {
    themeUnagiDay: { tint: '#7a1f10', label: 'THE UNAGI ISSUE', motif: 'eel' },
    themeTanabata: { tint: '#182a63', label: 'THE TANABATA ISSUE', motif: 'star' },
    themeObon: { tint: '#5c3018', label: 'THE HOMECOMING ISSUE', motif: 'lantern' },
    themeHalloweenDay: { tint: '#1f1400', label: 'THE HALLOWEEN ISSUE', motif: 'bat' },
    themeChristmasDay: { tint: '#5c1020', label: 'THE HOLIDAY ISSUE', motif: 'tree' },
    themeNewYearDay: { tint: '#6b0f1c', label: 'THE NEW YEAR ISSUE', motif: 'sunrise' },
    themeSummer: { tint: '#0b5a63', label: 'THE SUMMER ISSUE', motif: 'sun' },
    themeHanami: { tint: '#6b2f42', label: 'THE SAKURA ISSUE', motif: 'sakura' },
    themeMomiji: { tint: '#6b3312', label: 'THE AUTUMN ISSUE', motif: 'maple' },
    themeColorful: { tint: '#5a1f7a', label: 'THE COLOR ISSUE', motif: 'palette' },
    themePattern: { tint: '#1c2a38', label: 'THE PATTERN ISSUE', motif: 'scissors' },
    themeFirst: { tint: '#6b2f3f', label: 'THE DEBUT ISSUE', motif: 'ribbon' },
    themeHoliday: { tint: '#123f5c', label: 'THE GETAWAY ISSUE', motif: 'suitcase' },
    themeHandmade: { tint: '#4a3319', label: 'THE HANDMADE ISSUE', motif: 'needle' },
    themeDress: { tint: '#3f1c4a', label: 'THE DRESS ISSUE', motif: 'dress' },
    themeEvent: { tint: '#3a1c6b', label: 'THE EVENT ISSUE', motif: 'balloon' },
};
