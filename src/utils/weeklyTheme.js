// Special, date-anchored themes take priority over the regular rotation below.
// `year` pins a specific year for moving-target observances (e.g. Doyo no Ushi
// no Hi / 土用の丑の日 shifts every year) — add next year's date here once it's
// known rather than assuming this year's date repeats. Omit `year` for
// observances that fall on the same month/day every year.
// `daysBefore`/`daysAfter` count whole calendar days around the anchor date.
const SPECIAL_THEMES = [
    { year: 2026, month: 7, day: 26, daysBefore: 5, daysAfter: 1, key: 'themeUnagiDay' },   // 土用の丑の日
    { month: 7, day: 7, daysBefore: 2, daysAfter: 1, key: 'themeTanabata' },                 // 七夕
    { month: 8, day: 13, daysBefore: 2, daysAfter: 3, key: 'themeObon' },                    // お盆
    { month: 10, day: 31, daysBefore: 4, daysAfter: 0, key: 'themeHalloweenDay' },           // ハロウィン
    { month: 12, day: 25, daysBefore: 5, daysAfter: 1, key: 'themeChristmasDay' },           // クリスマス
    { month: 1, day: 1, daysBefore: 1, daysAfter: 2, key: 'themeNewYearDay' },               // お正月
];

// Regular weekly rotation, filtered to the current month so an out-of-season
// theme (e.g. themeSummer in December) can never show. Omit `months` for a
// theme that works year-round.
const REGULAR_THEMES = [
    { key: 'themeSummer', months: [6, 7, 8] },
    { key: 'themeHanami', months: [3, 4] },
    { key: 'themeMomiji', months: [10, 11] },
    { key: 'themeColorful' },
    { key: 'themePattern' },
    { key: 'themeFirst' },
    { key: 'themeHoliday' },
    { key: 'themeHandmade' },
    { key: 'themeDress' },
    { key: 'themeEvent' },
];

// Whole calendar-day difference (anchor minus date), ignoring time-of-day —
// using raw millisecond subtraction here would make the window's edge
// sensitive to what time of day "now" happens to be, which we don't want.
function calendarDaysDiff(date, anchor) {
    const d = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const a = Date.UTC(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
    return Math.round((a - d) / 86400000);
}

// Also checks the anchor date in the surrounding years, so a window like
// New Year's (Jan 1) still triggers correctly in late December.
function findSpecialThemeKey(date) {
    const year = date.getFullYear();
    let best = null;
    let bestAbsDiff = Infinity;
    for (const special of SPECIAL_THEMES) {
        const candidateYears = special.year ? [special.year] : [year - 1, year, year + 1];
        for (const y of candidateYears) {
            const anchor = new Date(y, special.month - 1, special.day);
            const diff = calendarDaysDiff(date, anchor); // positive = anchor is upcoming, negative = anchor has passed
            const inWindow = diff >= -special.daysAfter && diff <= special.daysBefore;
            if (inWindow && Math.abs(diff) < bestAbsDiff) {
                bestAbsDiff = Math.abs(diff);
                best = special.key;
            }
        }
    }
    return best;
}

export function getWeeklyThemeKey(date = new Date()) {
    const special = findSpecialThemeKey(date);
    if (special) return special;

    const month = date.getMonth() + 1;
    const eligible = REGULAR_THEMES.filter(t => !t.months || t.months.includes(month));
    const pool = eligible.length > 0 ? eligible : REGULAR_THEMES;

    const start = new Date(date.getFullYear(), 0, 1);
    const daysSinceStart = Math.floor((date - start) / 86400000);
    const weekNumber = Math.floor(daysSinceStart / 7);
    return pool[weekNumber % pool.length].key;
}
