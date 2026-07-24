import React, { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import Portal from './Portal';

// Pure-CSS "runway walk" — no AI involved. A plushie can't actually walk, so
// rather than fight a video model trained on human/animal gait (the same
// failure mode as the earlier AI try-on attempts), this fakes the motion with
// a horizontal transit plus a bounce/tilt loop, like a paper cutout puppet.
const RunwayView = ({ imageUrl, itemName, plushieName, onClose, t }) => {
    const [replayKey, setReplayKey] = useState(0);
    const [isDone, setIsDone] = useState(false);

    return (
        <Portal>
            <div
                className="fixed inset-0 bg-black/80 z-modal flex items-center justify-center p-4 backdrop-blur-sm"
                onClick={onClose}
            >
                <div
                    className="relative w-full"
                    style={{ maxWidth: '480px' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={onClose}
                        className="absolute -top-12 right-0 text-white p-2 rounded-full hover:bg-white/10"
                    >
                        <X size={24} />
                    </button>

                    <div style={{
                        position: 'relative',
                        height: '340px',
                        overflow: 'hidden',
                        borderRadius: '24px',
                        background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 55%, #0f3460 100%)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                    }}>
                        {/* Spotlights */}
                        <div style={{ position: 'absolute', top: 0, left: '10%', width: '160px', height: '100%', background: 'radial-gradient(ellipse at top, rgba(255,255,255,0.18), transparent 70%)' }} />
                        <div style={{ position: 'absolute', top: 0, left: '55%', width: '160px', height: '100%', background: 'radial-gradient(ellipse at top, rgba(255,255,255,0.14), transparent 70%)' }} />

                        {/* Paparazzi flashes — sells "this is a big event" far more than a
                            static dark box does. Staggered delays so they pop unpredictably. */}
                        {[
                            { top: '18%', left: '20%', delay: '0.4s' },
                            { top: '30%', left: '78%', delay: '1.3s' },
                            { top: '15%', left: '55%', delay: '2.1s' },
                            { top: '35%', left: '35%', delay: '2.9s' },
                            { top: '20%', left: '88%', delay: '3.7s' },
                        ].map((f, i) => (
                            <div key={i} style={{
                                position: 'absolute', top: f.top, left: f.left,
                                width: '10px', height: '10px', borderRadius: '50%',
                                background: 'white', zIndex: 1,
                                animation: `paparazziFlash 1.6s ease-out ${f.delay} infinite`,
                            }} />
                        ))}

                        {/* Title */}
                        <div style={{ position: 'absolute', top: '14px', left: 0, right: 0, textAlign: 'center', zIndex: 2 }}>
                            <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>
                                🎬 {t ? t('runwayTitle') : 'Runway Debut'}
                            </span>
                        </div>

                        {/* Red carpet floor */}
                        <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0, height: '58px',
                            background: 'linear-gradient(180deg, #7a0d24 0%, #4a0716 100%)',
                        }} />
                        <div style={{ position: 'absolute', bottom: '58px', left: 0, right: 0, height: '3px', background: 'rgba(255,215,150,0.5)' }} />
                        <div style={{
                            position: 'absolute', bottom: '58px', left: 0, right: 0, height: '58px',
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)'
                        }} />

                        {/* Grounding shadow — tracks the same horizontal path but stays flat on
                            the floor, so the figure reads as walking ON the stage instead of
                            floating in front of it */}
                        <div
                            key={`shadow-${replayKey}`}
                            style={{
                                position: 'absolute',
                                bottom: '46px',
                                width: '130px',
                                height: '20px',
                                animation: 'runwayTransitX 4.5s linear forwards',
                            }}
                        >
                            <div style={{
                                width: '70%', height: '100%', margin: '0 auto',
                                background: 'radial-gradient(ellipse, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 45%, transparent 75%)',
                            }} />
                        </div>

                        {/* Walking plushie */}
                        <div
                            key={replayKey}
                            onAnimationEnd={(e) => { if (e.animationName === 'runwayTransitX') setIsDone(true); }}
                            style={{
                                position: 'absolute',
                                bottom: '58px',
                                width: '130px',
                                height: '130px',
                                animation: 'runwayTransitX 4.5s linear forwards, runwayBounce 0.4s ease-in-out infinite',
                            }}
                        >
                            <img
                                src={imageUrl}
                                alt={itemName || plushieName || ''}
                                style={{
                                    width: '100%', height: '100%', objectFit: 'contain',
                                    borderRadius: '50%',
                                    filter: 'drop-shadow(0 6px 6px rgba(0,0,0,0.35))',
                                    maskImage: 'radial-gradient(circle, black 60%, transparent 85%)',
                                    WebkitMaskImage: 'radial-gradient(circle, black 60%, transparent 85%)',
                                }}
                            />
                        </div>

                        {/* Caption */}
                        <div style={{ position: 'absolute', bottom: '12px', left: 0, right: 0, textAlign: 'center', zIndex: 2 }}>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>
                                {plushieName ? `${plushieName} — ` : ''}{itemName || ''}
                            </span>
                        </div>

                        {isDone && (
                            <button
                                onClick={() => { setIsDone(false); setReplayKey(k => k + 1); }}
                                className="absolute active:scale-95 transition-all"
                                style={{
                                    top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '10px 20px', borderRadius: '999px',
                                    background: 'rgba(255,255,255,0.95)', color: '#16213e',
                                    fontWeight: '800', fontSize: '13px', zIndex: 3,
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                                }}
                            >
                                <RotateCcw size={16} />
                                {t ? t('runwayReplay') : 'Replay'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes runwayTransitX {
                    from { left: -22%; }
                    to { left: 62%; }
                }
                @keyframes runwayBounce {
                    0%, 100% { transform: translateY(0) rotate(-2deg); }
                    50% { transform: translateY(-10px) rotate(2deg); }
                }
                @keyframes paparazziFlash {
                    0%, 88%, 100% { opacity: 0; transform: scale(1); }
                    90% { opacity: 0.9; transform: scale(2.5); }
                    94% { opacity: 0; transform: scale(3.5); }
                }
            `}</style>
        </Portal>
    );
};

export default RunwayView;
