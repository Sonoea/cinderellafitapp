import React from 'react';
import { X } from 'lucide-react';
import Portal from './Portal';
import { MAGAZINE_STYLES } from '../utils/magazineThemeStyles';

// Editorial "magazine cover" treatment for a post — pure layout/typography on
// top of the existing photo, no image generation involved. Only offered for
// posts made under a theme challenge, as an incentive to use that feature.
const MagazineView = ({ imageUrl, itemName, plushieName, comment, themeKey, onClose }) => {
    const style = MAGAZINE_STYLES[themeKey] || { accent: '#1f2937', accent2: '#94a3b8', label: 'FEATURE' };

    // Strip the hashtag itself out of the comment for the pull-quote, keep the rest
    const quote = (comment || '').replace(/#\S+/g, '').trim();

    return (
        <Portal>
            <div className="fixed inset-0 bg-black/80 z-modal flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
                <div className="relative w-full" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={onClose} className="absolute -top-12 right-0 text-white p-2 rounded-full hover:bg-white/10">
                        <X size={24} />
                    </button>

                    <div style={{
                        position: 'relative',
                        aspectRatio: '3 / 4',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        boxShadow: '0 24px 70px rgba(0,0,0,0.55)',
                        background: '#111',
                    }}>
                        <img
                            src={imageUrl}
                            alt={itemName || ''}
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {/* Legibility gradient */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 22%, transparent 60%, rgba(0,0,0,0.75) 100%)',
                        }} />

                        {/* Masthead */}
                        <div style={{ position: 'absolute', top: '18px', left: '18px', right: '18px', display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '9px', fontWeight: '700', color: 'white', letterSpacing: '0.1em', textAlign: 'right', opacity: 0.85 }}>
                                VOL. {new Date().getFullYear()}<br />NUI EDITION
                            </span>
                        </div>

                        {/* Category tag */}
                        <div style={{ position: 'absolute', top: '64px', left: '18px' }}>
                            <span style={{
                                fontSize: '10px', fontWeight: '800', letterSpacing: '0.12em',
                                color: 'white', background: style.accent,
                                padding: '4px 10px', borderRadius: '2px',
                            }}>
                                {style.label}
                            </span>
                        </div>

                        {/* Headline + credit */}
                        <div style={{ position: 'absolute', bottom: '20px', left: '18px', right: '18px' }}>
                            {quote && (
                                <p style={{
                                    fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '13px',
                                    color: 'white', lineHeight: 1.5, marginBottom: '10px',
                                    borderLeft: `3px solid ${style.accent2}`, paddingLeft: '10px',
                                }}>
                                    “{quote}”
                                </p>
                            )}
                            <h2 style={{
                                fontFamily: 'Georgia, serif', fontWeight: '800', fontSize: '26px',
                                color: 'white', lineHeight: 1.15, marginBottom: '6px', textShadow: '0 2px 12px rgba(0,0,0,0.4)',
                            }}>
                                {itemName || ''}
                            </h2>
                            <p style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase' }}>
                                {plushieName ? `Starring ${plushieName}` : ''}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Portal>
    );
};

export default MagazineView;
