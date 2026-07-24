import React from 'react';
import { MAGAZINE_STYLES } from '../utils/magazineThemeStyles';

// Automatic VOGUE-style cover treatment for posts made under a theme
// challenge — replaces the plain photo in the Gallery detail view (no button,
// no toggle) as a reward for using the theme feature. Pure CSS/typography +
// emoji motifs standing in for a themed "scene": actually compositing the
// plushie onto a photo background (e.g. an eel-grill photo) would need real
// image segmentation to cut it out of its own busy background first, which is
// a heavier, separate piece of work — flagged, not attempted here.
const MagazineCoverHero = ({ imageUrl, itemName, plushieName, comment, themeKey }) => {
    const style = MAGAZINE_STYLES[themeKey] || {
        accent: '#1f2937', accent2: '#94a3b8', label: 'FEATURE',
        bgGradient: 'radial-gradient(ellipse at 30% 15%, #29394d 0%, #131c29 60%, #090d13 100%)',
        motifs: ['✨'],
    };
    const quote = (comment || '').replace(/#\S+/g, '').trim();

    return (
        <div style={{
            position: 'relative',
            aspectRatio: '1 / 1',
            overflow: 'hidden',
            background: style.bgGradient,
        }}>
            {/* Decorative theme motifs */}
            {style.motifs.map((m, i) => (
                <span key={i} style={{
                    position: 'absolute',
                    fontSize: ['46px', '34px', '40px', '30px'][i % 4],
                    opacity: 0.22,
                    top: ['6%', '72%', '14%', '60%'][i % 4],
                    left: ['4%', '6%', '80%', '84%'][i % 4],
                    filter: 'blur(0.3px)',
                }}>
                    {m}
                </span>
            ))}

            {/* Photo, blended into the scene rather than a hard rectangle */}
            <div style={{
                position: 'absolute',
                left: '50%', top: '54%', transform: 'translate(-50%, -50%)',
                width: '78%', height: '62%',
            }}>
                <img
                    src={imageUrl}
                    alt={itemName || ''}
                    style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        maskImage: 'radial-gradient(ellipse, black 55%, transparent 88%)',
                        WebkitMaskImage: 'radial-gradient(ellipse, black 55%, transparent 88%)',
                        filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.4))',
                    }}
                />
            </div>

            {/* Legibility gradient for the masthead/headline */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 30%, transparent 62%, rgba(0,0,0,0.7) 100%)',
            }} />

            {/* VOGUE-style masthead — the theme's own cover label, blown up big
                instead of a brand wordmark (sonoe hasn't picked a brand name yet) */}
            <div style={{ position: 'absolute', top: '5%', left: 0, right: 0, textAlign: 'center', zIndex: 2, padding: '0 6%' }}>
                <span style={{
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontWeight: '900',
                    fontSize: 'clamp(20px, 7.5vw, 36px)',
                    color: 'white',
                    letterSpacing: '0.01em',
                    lineHeight: 1.05,
                    display: 'block',
                    textShadow: '0 2px 16px rgba(0,0,0,0.5)',
                }}>
                    {style.label}
                </span>
            </div>

            {/* Headline + credit */}
            <div style={{ position: 'absolute', bottom: '6%', left: '6%', right: '6%', zIndex: 2 }}>
                {quote && (
                    <p style={{
                        fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '12px',
                        color: 'white', lineHeight: 1.5, marginBottom: '8px',
                        borderLeft: `3px solid ${style.accent2}`, paddingLeft: '10px',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                        “{quote}”
                    </p>
                )}
                <h2 style={{
                    fontFamily: 'Georgia, serif', fontWeight: '800', fontSize: 'clamp(18px, 5.5vw, 24px)',
                    color: 'white', lineHeight: 1.15, marginBottom: '4px',
                    textShadow: '0 2px 12px rgba(0,0,0,0.5)',
                }}>
                    {itemName || ''}
                </h2>
                <p style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' }}>
                    {plushieName ? `Starring ${plushieName}` : ''}
                </p>
            </div>
        </div>
    );
};

export default MagazineCoverHero;
