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

                        {/* Title */}
                        <div style={{ position: 'absolute', top: '14px', left: 0, right: 0, textAlign: 'center', zIndex: 2 }}>
                            <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>
                                🎬 {t ? t('runwayTitle') : 'Runway Debut'}
                            </span>
                        </div>

                        {/* Floor line */}
                        <div style={{ position: 'absolute', bottom: '54px', left: 0, right: 0, height: '2px', background: 'rgba(255,255,255,0.15)' }} />
                        <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0, height: '54px',
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)'
                        }} />

                        {/* Walking plushie */}
                        <div
                            key={replayKey}
                            onAnimationEnd={(e) => { if (e.animationName === 'runwayTransitX') setIsDone(true); }}
                            style={{
                                position: 'absolute',
                                bottom: '58px',
                                width: '130px',
                                height: '130px',
                                animation: 'runwayTransitX 4.5s linear forwards, runwayBounce 0.45s ease-in-out infinite',
                            }}
                        >
                            <img
                                src={imageUrl}
                                alt={itemName || plushieName || ''}
                                style={{
                                    width: '100%', height: '100%', objectFit: 'contain',
                                    filter: 'drop-shadow(0 14px 10px rgba(0,0,0,0.45))'
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
                    0%, 100% { transform: translateY(0) rotate(-4deg); }
                    50% { transform: translateY(-16px) rotate(4deg); }
                }
            `}</style>
        </Portal>
    );
};

export default RunwayView;
