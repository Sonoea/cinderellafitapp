// Rotates through the 8 pre-written theme challenge copies (see translations.js
// themeSummer/themeColorful/etc.) on a weekly cadence, deterministically and
// without needing any backend config.
const THEME_KEYS = [
    'themeSummer',
    'themeColorful',
    'themePattern',
    'themeFirst',
    'themeHoliday',
    'themeHandmade',
    'themeDress',
    'themeEvent',
];

export function getWeeklyThemeKey(date = new Date()) {
    const start = new Date(date.getFullYear(), 0, 1);
    const daysSinceStart = Math.floor((date - start) / 86400000);
    const weekNumber = Math.floor(daysSinceStart / 7);
    return THEME_KEYS[weekNumber % THEME_KEYS.length];
}
