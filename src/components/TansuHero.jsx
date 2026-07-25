import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collectionGroup, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useApp } from '../context/AppContext';
import { detectThemeFromComment } from '../utils/themeBadgeStyles';
import ThemeBadge from './ThemeBadge';

// A small "tansu" (Japanese chest of drawers) showcase for the newest 5
// public posts, sitting above the plain Gallery grid on Home — a more
// playful front door into the same data, not a separate feed. Each drawer
// opens straight into that post's detail view via the existing
// /gallery/post/:postId deep link that Gallery.jsx already handles.
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

    return (
        <div className="mb-4" style={{
            borderRadius: '22px',
            padding: '16px 14px',
            background: 'linear-gradient(160deg, #caa06b 0%, #a97a45 55%, #8f6538 100%)',
            boxShadow: '0 6px 18px rgba(138, 97, 51, 0.25)',
        }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px' }}>
                <p style={{ fontSize: '13px', fontWeight: '800', color: '#fff', letterSpacing: '-0.01em' }}>
                    🗄️ {t('tansuTitle')}
                </p>
                <span style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.85)' }}>
                    {t('tansuSubtitle')}
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {latest.map((item, i) => {
                    const theme = detectThemeFromComment(item.comment);
                    return (
                        <div
                            key={item.compositeId}
                            onClick={() => navigate(`/gallery/post/${item.compositeId}`)}
                            className="hover-scale"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                background: 'linear-gradient(180deg, #e7c99a 0%, #d8b57e 100%)',
                                border: '1px solid rgba(255,255,255,0.35)',
                                borderRadius: '12px',
                                padding: '6px',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.15) inset, 0 2px 5px rgba(0,0,0,0.15)',
                            }}
                        >
                            <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0, transform: `rotate(${tilts[i % tilts.length]}deg)` }}>
                                <img src={item.imageUrl} alt="" style={{
                                    width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px',
                                    border: '2px solid white', boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                                }} />
                                {theme && (
                                    <div style={{ position: 'absolute', top: '-6px', right: '-6px' }}>
                                        <ThemeBadge themeKey={theme} size={20} />
                                    </div>
                                )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: '11px', fontWeight: '700', color: '#4a3319', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {item.itemName}
                                </p>
                                {item.plushieName && (
                                    <p style={{ fontSize: '9px', color: '#6b4e2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.plushieName}
                                    </p>
                                )}
                            </div>
                            {/* Drawer handle */}
                            <div style={{ width: '22px', height: '6px', borderRadius: '3px', background: 'linear-gradient(180deg, #fff6e0, #c9a25a)', flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TansuHero;
