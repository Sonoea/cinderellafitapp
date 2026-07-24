import React, { useState, useEffect } from 'react';

// Auto-advancing runway strip for Home: walks through `items` one at a time,
// pausing briefly at the end of each walk before the next one comes out —
// same idea as RunwayView's single-post modal, but looping through a list
// with no user interaction required. Pure CSS, no AI.
const RunwayShowcase = ({ items, t, onItemClick }) => {
    const [index, setIndex] = useState(0);
    const [playKey, setPlayKey] = useState(0);
    const [isDone, setIsDone] = useState(false);

    const current = items[index];

    useEffect(() => {
        if (!isDone) return;
        const timer = setTimeout(() => {
            setIsDone(false);
            setIndex((i) => (i + 1) % items.length);
            setPlayKey((k) => k + 1);
        }, 1400);
        return () => clearTimeout(timer);
    }, [isDone, items.length]);

    if (!current) return null;

    return (
        <div style={{
            position: 'relative',
            height: '170px',
            overflow: 'hidden',
            borderRadius: '20px',
            background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 55%, #0f3460 100%)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            cursor: onItemClick ? 'pointer' : 'default',
        }}
            onClick={() => onItemClick?.(current)}
        >
            {/* Spotlights */}
            <div style={{ position: 'absolute', top: 0, left: '10%', width: '120px', height: '100%', background: 'radial-gradient(ellipse at top, rgba(255,255,255,0.18), transparent 70%)' }} />
            <div style={{ position: 'absolute', top: 0, left: '55%', width: '120px', height: '100%', background: 'radial-gradient(ellipse at top, rgba(255,255,255,0.14), transparent 70%)' }} />

            {/* Paparazzi flashes */}
            {[
                { top: '16%', left: '18%', delay: '0.2s' },
                { top: '28%', left: '75%', delay: '1.0s' },
                { top: '14%', left: '50%', delay: '1.8s' },
                { top: '32%', left: '32%', delay: '2.6s' },
            ].map((f, i) => (
                <div key={i} style={{
                    position: 'absolute', top: f.top, left: f.left,
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: 'white', zIndex: 1,
                    animation: `paparazziFlashSm 1.4s ease-out ${f.delay} infinite`,
                }} />
            ))}

            {/* Title + position dots */}
            <div style={{ position: 'absolute', top: '10px', left: '14px', right: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
                <span style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>
                    🎬 {t ? t('runwayShowcaseTitle') : 'New Arrivals Runway'}
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                    {items.map((_, i) => (
                        <div key={i} style={{
                            width: '5px', height: '5px', borderRadius: '50%',
                            background: i === index ? 'white' : 'rgba(255,255,255,0.3)'
                        }} />
                    ))}
                </div>
            </div>

            {/* Red carpet floor */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '40px',
                background: 'linear-gradient(180deg, #7a0d24 0%, #4a0716 100%)',
            }} />
            <div style={{ position: 'absolute', bottom: '40px', left: 0, right: 0, height: '2px', background: 'rgba(255,215,150,0.5)' }} />

            {/* Floor glow tracking the walker */}
            <div
                key={`glow-${playKey}`}
                style={{
                    position: 'absolute', bottom: '34px', width: '90px', height: '16px',
                    animation: 'runwayShowcaseX 3.4s linear forwards',
                }}
            >
                <div style={{
                    width: '70%', height: '100%', margin: '0 auto',
                    background: 'radial-gradient(ellipse, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 45%, transparent 75%)',
                }} />
            </div>

            {/* Walker */}
            <div
                key={playKey}
                onAnimationEnd={(e) => { if (e.animationName === 'runwayShowcaseX') setIsDone(true); }}
                style={{
                    position: 'absolute',
                    bottom: '40px',
                    width: '90px',
                    height: '90px',
                    animation: 'runwayShowcaseX 3.4s linear forwards, runwayShowcaseBounce 0.4s ease-in-out infinite',
                }}
            >
                <img
                    src={current.imageUrl}
                    alt={current.itemName || current.plushieName || ''}
                    style={{
                        width: '100%', height: '100%', objectFit: 'contain',
                        filter: 'drop-shadow(0 6px 6px rgba(0,0,0,0.35))',
                        maskImage: 'radial-gradient(circle, black 60%, transparent 85%)',
                        WebkitMaskImage: 'radial-gradient(circle, black 60%, transparent 85%)',
                    }}
                />
            </div>

            {/* Caption */}
            <div style={{ position: 'absolute', bottom: '10px', left: 0, right: 0, textAlign: 'center', zIndex: 2 }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'white' }}>
                    {current.plushieName ? `${current.plushieName} — ` : ''}{current.itemName || ''}
                </span>
            </div>

            <style>{`
                @keyframes runwayShowcaseX {
                    from { left: -18%; }
                    to { left: 65%; }
                }
                @keyframes runwayShowcaseBounce {
                    0%, 100% { transform: translateY(0) rotate(-2deg); }
                    50% { transform: translateY(-7px) rotate(2deg); }
                }
                @keyframes paparazziFlashSm {
                    0%, 88%, 100% { opacity: 0; transform: scale(1); }
                    90% { opacity: 0.9; transform: scale(2.2); }
                    94% { opacity: 0; transform: scale(3); }
                }
            `}</style>
        </div>
    );
};

export default RunwayShowcase;
