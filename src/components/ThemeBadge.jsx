import React from 'react';
import { THEME_BADGE_STYLES } from '../utils/themeBadgeStyles';

// Thin single-line emblem icons — hand-drawn SVG, not emoji/clip-art — so the
// stamp reads as a small printed mark rather than a cartoon sticker. Keyed by
// the `motif` name on a theme's badge style entry.
const MOTIF_ICONS = {
    star: (
        <svg viewBox="0 0 40 40" width="18" height="18" fill="currentColor" stroke="none">
            <path d="M20 4 L23.5 15.5 L35 15.5 L25.5 22.5 L29 34 L20 27 L11 34 L14.5 22.5 L5 15.5 L16.5 15.5 Z" />
        </svg>
    ),
    lantern: (
        <svg viewBox="0 0 40 40" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <ellipse cx="20" cy="20" rx="10" ry="14" />
            <line x1="10" y1="14" x2="30" y2="14" />
            <line x1="10" y1="20" x2="30" y2="20" />
            <line x1="10" y1="26" x2="30" y2="26" />
            <line x1="20" y1="6" x2="20" y2="2" />
            <line x1="20" y1="34" x2="20" y2="38" />
        </svg>
    ),
    bat: (
        <svg viewBox="0 0 40 40" width="20" height="20" fill="currentColor" stroke="none">
            <path d="M20 14 C 16 8, 8 8, 4 16 C 8 14, 12 16, 14 20 C 10 22, 6 26, 4 32 C 10 28, 14 26, 18 24 L20 30 L22 24 C 26 26, 30 28, 36 32 C 34 26, 30 22, 26 20 C 28 16, 32 14, 36 16 C 32 8, 24 8, 20 14 Z" />
        </svg>
    ),
    tree: (
        <svg viewBox="0 0 40 40" width="18" height="18" fill="currentColor" stroke="none">
            <path d="M20 4 L28 16 L24 16 L31 26 L26 26 L34 36 L6 36 L14 26 L9 26 L16 16 L12 16 Z" />
            <rect x="17" y="36" width="6" height="3" />
        </svg>
    ),
    sunrise: (
        <svg viewBox="0 0 40 40" width="20" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="4" y1="28" x2="36" y2="28" />
            <path d="M10 28 A10 10 0 0 1 30 28" />
            <line x1="20" y1="10" x2="20" y2="6" />
            <line x1="10" y1="14" x2="7" y2="11" />
            <line x1="30" y1="14" x2="33" y2="11" />
        </svg>
    ),
    sun: (
        <svg viewBox="0 0 40 40" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="20" cy="20" r="8" />
            <line x1="20" y1="4" x2="20" y2="8" /><line x1="20" y1="32" x2="20" y2="36" />
            <line x1="4" y1="20" x2="8" y2="20" /><line x1="32" y1="20" x2="36" y2="20" />
            <line x1="8" y1="8" x2="11" y2="11" /><line x1="32" y1="8" x2="29" y2="11" />
            <line x1="8" y1="32" x2="11" y2="29" /><line x1="32" y1="32" x2="29" y2="29" />
        </svg>
    ),
    sakura: (
        <svg viewBox="0 0 40 40" width="18" height="18" fill="currentColor" stroke="none">
            <circle cx="20" cy="10" r="5" /><circle cx="29" cy="16" r="5" />
            <circle cx="26" cy="26" r="5" /><circle cx="14" cy="26" r="5" />
            <circle cx="11" cy="16" r="5" />
            <circle cx="20" cy="18" r="3" opacity="0.55" />
        </svg>
    ),
    maple: (
        <svg viewBox="0 0 40 40" width="18" height="18" fill="currentColor" stroke="none">
            <path d="M20 4 L23 12 L30 8 L27 16 L36 16 L28 22 L33 30 L24 26 L22 36 L20 28 L18 36 L16 26 L7 30 L12 22 L4 16 L13 16 L10 8 L17 12 Z" />
        </svg>
    ),
    palette: (
        <svg viewBox="0 0 40 40" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 C 30 6, 36 13, 36 20 C 36 26, 31 27, 27 25 C 24 23, 21 25, 22 28 C 23 32, 19 34, 15 32 C 6 28, 4 20, 6 14 C 9 8, 14 6, 20 6 Z" />
            <circle cx="14" cy="16" r="1.8" fill="currentColor" stroke="none" />
            <circle cx="20" cy="13" r="1.8" fill="currentColor" stroke="none" />
            <circle cx="27" cy="16" r="1.8" fill="currentColor" stroke="none" />
        </svg>
    ),
    scissors: (
        <svg viewBox="0 0 40 40" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="8" cy="8" r="4" /><circle cx="8" cy="32" r="4" />
            <line x1="11" y1="11" x2="34" y2="26" /><line x1="11" y1="29" x2="34" y2="14" />
        </svg>
    ),
    ribbon: (
        <svg viewBox="0 0 40 40" width="18" height="18" fill="currentColor" stroke="none">
            <path d="M18 20 L6 10 L6 30 Z" /><path d="M22 20 L34 10 L34 30 Z" />
            <circle cx="20" cy="20" r="3" />
        </svg>
    ),
    suitcase: (
        <svg viewBox="0 0 40 40" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="14" width="28" height="20" rx="2" />
            <path d="M15 14 V10 a2 2 0 0 1 2-2 h6 a2 2 0 0 1 2 2 v4" />
            <line x1="6" y1="22" x2="34" y2="22" />
        </svg>
    ),
    needle: (
        <svg viewBox="0 0 40 40" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="8" y1="32" x2="30" y2="10" />
            <circle cx="32" cy="8" r="2.5" />
            <path d="M8 32 C 4 28, 4 22, 8 18 C 11 15, 14 18, 12 21" />
        </svg>
    ),
    dress: (
        <svg viewBox="0 0 40 40" width="16" height="18" fill="currentColor" stroke="none">
            <path d="M20 4 C 17 4, 15 7, 15 10 L11 14 L14 16 L16 12 L16 16 L8 36 L32 36 L24 16 L24 12 L26 16 L29 14 L25 10 C 25 7, 23 4, 20 4 Z" />
        </svg>
    ),
    balloon: (
        <svg viewBox="0 0 40 40" width="16" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <ellipse cx="20" cy="14" rx="9" ry="11" />
            <line x1="20" y1="25" x2="20" y2="30" />
            <path d="M18 30 Q 20 34, 22 30" />
            <line x1="20" y1="34" x2="20" y2="38" />
        </svg>
    ),
};

// A colorful round "stamp" affixed to the top-right corner of a themed post's
// photo — like a fan-shaped uchiwa stamp on a summer flyer. Used in both the
// Gallery grid thumbnail and the detail view so a themed post reads as
// special while just browsing, not only after tapping into it.
const ThemeBadge = ({ themeKey, size = 40 }) => {
    const style = THEME_BADGE_STYLES[themeKey];
    if (!style || !(style.char || MOTIF_ICONS[style.motif])) return null;

    return (
        <div style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            background: `radial-gradient(circle at 32% 28%, ${style.accent}ee, ${style.accent})`,
            border: '2px solid rgba(255,255,255,0.9)',
            boxShadow: '0 3px 8px rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            transform: 'rotate(12deg)',
            flexShrink: 0,
        }}>
            {style.char ? (
                // A hanko-style seal stamp: one bold Mincho character, more
                // instantly readable than a delicate line-art icon for
                // themes where a single kanji/kana carries the meaning.
                <span style={{
                    fontFamily: '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif',
                    fontWeight: 900,
                    fontSize: `${size * 0.52}px`,
                    lineHeight: 1,
                    color: 'white',
                    textShadow: '0 1px 2px rgba(0,0,0,0.25)',
                }}>
                    {style.char}
                </span>
            ) : MOTIF_ICONS[style.motif]}
        </div>
    );
};

export default ThemeBadge;
