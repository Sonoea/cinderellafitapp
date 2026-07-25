import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collectionGroup, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useApp } from '../context/AppContext';
import { detectThemeFromComment } from '../utils/themeBadgeStyles';
import { getLocationFlag } from '../utils/formatting';
import ThemeBadge from './ThemeBadge';

// Procedural wood-grain noise (SVG feTurbulence, stretched so the streaks
// read as fibrous grain rather than isotropic static) — flat CSS gradients
// alone read as "PowerPoint", a faint fiber texture is what actually sells
// "wood" at this size.
const WOOD_GRAIN_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>
        <filter id='g'>
            <feTurbulence type='fractalNoise' baseFrequency='0.009 0.9' numOctaves='3' seed='11' stitchTiles='stitch' />
            <feColorMatrix type='saturate' values='0' />
        </filter>
        <rect width='100%' height='100%' filter='url(#g)' />
    </svg>`
)}`;

// A round black iron medallion plate ("ja-gane") with a hanging ring pull —
// the circular hardware real tansu chests wear, rather than a Western
// side-mounted knob or capsule handle.
const IronPull = ({ size = 24 }) => (
    <div style={{
        position: 'relative', width: `${size}px`, height: `${size}px`, flexShrink: 0,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 30%, #565656, #1c1a18 75%)',
        border: '1px solid #0a0805',
        boxShadow: '0 2px 3px rgba(0,0,0,0.45), inset 0 1px 1px rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
        <div style={{
            width: `${Math.round(size * 0.46)}px`, height: `${Math.round(size * 0.46)}px`, borderRadius: '50%',
            border: '2px solid #d8d2c4', opacity: 0.7,
        }} />
    </div>
);

// Fibrous wood texture layer, meant to be dropped inside any
// `position: relative; overflow: hidden` wood-toned element.
const Grain = ({ opacity = 0.5, size = '200px 200px' }) => (
    <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url("${WOOD_GRAIN_URI}")`,
        backgroundSize: size,
        mixBlendMode: 'overlay',
        opacity,
        pointerEvents: 'none',
    }} />
);

// A single drawer face. `compact` is used for the paired (half-width)
// drawers — a smaller photo/text/pull so two fit side by side without the
// unnaturally wide single-column bars the first version had.
const Drawer = ({ item, tilt, compact, onOpen }) => {
    const theme = detectThemeFromComment(item.comment);
    return (
        <div
            onClick={onOpen}
            className="hover-scale"
            style={{
                position: 'relative', overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                gap: compact ? '6px' : '10px',
                background: 'linear-gradient(180deg, #b8823f 0%, #96692f 55%, #7a5226 100%)',
                borderRadius: '3px',
                padding: compact ? '6px' : '7px 10px',
                cursor: 'pointer',
                height: '100%',
                minWidth: 0,
                boxShadow: [
                    'inset 0 2px 3px rgba(0,0,0,0.5)',
                    'inset 0 -2px 2px rgba(0,0,0,0.3)',
                    'inset 0 1px 0 rgba(255,255,255,0.12)',
                    '0 3px 5px rgba(0,0,0,0.35)',
                ].join(', '),
            }}
        >
            <Grain opacity={0.3} size="140px 140px" />
            <div style={{ position: 'relative', width: compact ? '34px' : '44px', height: compact ? '34px' : '44px', flexShrink: 0, transform: `rotate(${tilt}deg)` }}>
                <img src={item.imageUrl} alt="" style={{
                    width: '100%', height: '100%', objectFit: 'cover', borderRadius: '5px',
                    border: '2px solid #f3ead9', boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                }} />
                {theme && (
                    <div style={{ position: 'absolute', top: '-6px', right: '-6px' }}>
                        <ThemeBadge themeKey={theme} size={compact ? 14 : 20} />
                    </div>
                )}
                <div style={{
                    position: 'absolute', bottom: '-4px', left: '-4px',
                    fontSize: compact ? '11px' : '13px', lineHeight: 1,
                    filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))',
                }}>
                    {getLocationFlag(item.location)}
                </div>
            </div>
            <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: compact ? '9.5px' : '11px', fontWeight: '700', color: '#fbf3e4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.itemName}
                </p>
                {!compact && item.plushieName && (
                    <p style={{ fontSize: '9px', color: 'rgba(251,243,228,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.plushieName}
                    </p>
                )}
            </div>
            <div style={{ position: 'relative' }}>
                <IronPull size={compact ? 18 : 24} />
            </div>
        </div>
    );
};

// A small "tansu" (Japanese chest of drawers) showcase for the newest posts,
// sitting above the plain Gallery grid on Home — a more playful front door
// into the same data, not a separate feed. Drawers open straight into that
// post's detail view via the existing /gallery/post/:postId deep link that
// Gallery.jsx already handles.
const TansuHero = () => {
    const { t } = useApp();
    const navigate = useNavigate();
    const [latest, setLatest] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const q = query(collectionGroup(db, 'closetItems'), where('isPublic', '==', true), limit(300));
                const snap = await getDocs(q);
                const items = [];
                snap.forEach((docSnap) => {
                    const data = docSnap.data();
                    if (!data) return;
                    const imageUrl = data.imageUrl || data.image;
                    if (!imageUrl) return;
                    const ownerUid = docSnap.ref.parent.parent.id;
                    items.push({
                        compositeId: `${ownerUid}_${docSnap.id}`.replace(/local-/g, ''),
                        imageUrl,
                        itemName: data.itemName || data.name || t('untitled'),
                        plushieName: data.plushieName || data.plushie || '',
                        comment: data.comment || '',
                        location: data.location || '',
                        createdAt: data.createdAt,
                    });
                });
                const getTime = (val) => {
                    if (!val) return 0;
                    if (typeof val === 'object' && 'seconds' in val) return val.seconds * 1000;
                    const d = new Date(val);
                    return isNaN(d.getTime()) ? 0 : d.getTime();
                };
                items.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
                if (!cancelled) setLatest(items.slice(0, 5));
            } catch (err) {
                console.warn('TansuHero: failed to load latest items', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [t]);

    if (!isLoading && latest.length === 0) return null;

    const tilts = [-4, 3, -3, 4, -2];
    const openPost = (compositeId) => navigate(`/gallery/post/${compositeId}`);

    return (
        <div className="mb-4" style={{ padding: '0 2px 10px' }}>
            {/* Cornice — the overhanging top ledge that reads as furniture
                rather than a rounded card */}
            <div style={{
                position: 'relative', overflow: 'hidden',
                height: '14px', margin: '0 -4px',
                borderRadius: '4px 4px 0 0',
                background: 'linear-gradient(180deg, #c9944f 0%, #93662f 100%)',
                boxShadow: '0 3px 4px rgba(0,0,0,0.35)',
                borderTop: '1px solid rgba(255,255,255,0.25)',
            }}>
                <Grain opacity={0.3} size="160px 160px" />
            </div>

            <div style={{
                position: 'relative', overflow: 'hidden',
                padding: '14px 10px 10px',
                background: 'linear-gradient(160deg, #c9944f 0%, #a3702f 55%, #7d5424 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
            }}>
                <Grain opacity={0.45} />

                {/* Corner metal guards (kado-gane) */}
                <div style={{ position: 'absolute', top: '6px', left: '6px', width: '11px', height: '11px', background: 'linear-gradient(135deg, #4a4a4a, #131110)', clipPath: 'polygon(0 0, 100% 0, 0 100%)', boxShadow: '0 1px 1px rgba(0,0,0,0.5)' }} />
                <div style={{ position: 'absolute', top: '6px', right: '6px', width: '11px', height: '11px', background: 'linear-gradient(225deg, #4a4a4a, #131110)', clipPath: 'polygon(100% 0, 100% 100%, 0 0)', boxShadow: '0 1px 1px rgba(0,0,0,0.5)' }} />

                {/* Nameplate */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', position: 'relative' }}>
                    <div style={{
                        position: 'relative', overflow: 'hidden',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                        padding: '5px 18px',
                        borderRadius: '3px',
                        background: 'linear-gradient(155deg, #4a4a4a 0%, #17130f 100%)',
                        border: '1px solid #0a0805',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                    }}>
                        <p style={{ fontFamily: '"Hiragino Mincho ProN", "Yu Mincho", serif', fontSize: '13px', fontWeight: '700', color: '#d9c48f', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                            {t('tansuTitle')}
                        </p>
                        <span style={{ fontSize: '8px', fontWeight: '700', color: 'rgba(217,196,143,0.65)', whiteSpace: 'nowrap' }}>
                            {t('tansuSubtitle')}
                        </span>
                    </div>
                </div>

                {/* Drawers — pairs side by side, with the odd one out as a
                    single wide drawer at the bottom, like a real tansu
                    rather than one unnaturally wide bar per post */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '7px' }}>
                    {latest.map((item, i) => {
                        const isWide = latest.length % 2 === 1 && i === latest.length - 1;
                        return (
                            <div key={item.compositeId} style={isWide ? { gridColumn: '1 / -1' } : undefined}>
                                <Drawer
                                    item={item}
                                    tilt={tilts[i % tilts.length]}
                                    compact={!isWide}
                                    onOpen={() => openPost(item.compositeId)}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Feet */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px' }}>
                <div style={{ width: '14px', height: '9px', background: 'linear-gradient(180deg, #7a5226, #3c2414)', clipPath: 'polygon(15% 0, 85% 0, 100% 100%, 0 100%)' }} />
                <div style={{ width: '14px', height: '9px', background: 'linear-gradient(180deg, #7a5226, #3c2414)', clipPath: 'polygon(15% 0, 85% 0, 100% 100%, 0 100%)' }} />
            </div>
        </div>
    );
};

export default TansuHero;
