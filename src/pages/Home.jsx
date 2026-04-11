import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Globe, LogIn, Sparkles, Settings, Pencil, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { collectionGroup, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

// Helper to get country flag from location string
const getLocationFlag = (location) => {
    try {
        if (!location) return '🌐';
        if (typeof location !== 'string') return '❓';
        const loc = location.toLowerCase();
        
        // Japan Prefectures (Kanji & Romaji)
        const japanKeywords = [
            '日本', 'japan', 'tokyo', 'osaka', 'kyoto', 'shibuya', 'iwate', 'hokkaido',
            '東京', '大阪', '京都', '渋谷', '岩手', '北海道', '札幌', '福岡', '横浜',
            '盛岡', 'morioka',
            '神奈川', '兵库', '兵庫', '愛知', '千葉', '埼玉', '広島', '仙台', '名古屋',
            '青森', '秋田', '宮城', '山形', '福島', '茨城', '栃木', '群馬', '新潟', '富山', 
            '石川', '福井', '山梨', '長野', '岐阜', '静岡', '三重', '滋賀', '奈良', '和歌山', 
            '鳥取', '島根', '岡山', '広島', '山口', '徳島', '香川', '愛媛', '高知', '佐賀', 
            '長崎', '熊本', '大分', '宮崎', '鹿児島', '沖縄',
            'aomori', 'akita', 'miyagi', 'yamagata', 'fukushima', 'ibaraki', 'tochigi', 'gunma', 
            'niigata', 'toyama', 'ishikawa', 'fukui', 'yamanashi', 'nagano', 'gifu', 'shizuoka', 
            'aichi', 'mie', 'shiga', 'hyogo', 'nara', 'wakayama', 'tottori', 'shimane', 'okayama', 
            'yamaguchi', 'tokushima', 'kagawa', 'ehime', 'kochi', 'saga', 'nagasaki', 'kumamoto', 
            'oita', 'miyazaki', 'kagoshima', 'okinawa'
        ];
        
        if (japanKeywords.some(k => loc.includes(k))) return '🇯🇵';
        if (loc.includes('usa') || loc.includes('america') || loc.includes('new york') || loc.includes('ny') || loc.includes('la') || loc.includes('los angeles') || loc.includes('hawaii') || loc.includes('ハワイ') || loc.includes('hawai‘i')) return '🇺🇸';
        if (loc.includes('france') || loc.includes('paris') || loc.includes('フランス') || loc.includes('パリ')) return '🇫🇷';
        if (loc.includes('uk') || loc.includes('london') || loc.includes('england') || loc.includes('united kingdom') || loc.includes('ロンドン') || loc.includes('イギリス') || loc.includes('英国')) return '🇬🇧';
        if (loc.includes('korea') || loc.includes('seoul') || loc.includes('韓国') || loc.includes('ソウル')) return '🇰🇷';
        if (loc.includes('china') || loc.includes('shanghai') || loc.includes('beijing') || loc.includes('中国') || loc.includes('上海') || loc.includes('北京')) return '🇨🇳';
        if (loc.includes('taiwan') || loc.includes('taipei') || loc.includes('台湾') || loc.includes('台北')) return '🇹🇼';
        if (loc.includes('germany') || loc.includes('berlin') || loc.includes('ドイツ') || loc.includes('ベルリン')) return '🇩🇪';
        if (loc.includes('italy') || loc.includes('rome') || loc.includes('イタリア') || loc.includes('ローマ')) return '🇮🇹';
        if (loc.includes('spain') || loc.includes('madrid') || loc.includes('スペイン') || loc.includes('マドリード')) return '🇪🇸';
        if (loc.includes('canada') || loc.includes('カナダ')) return '🇨🇦';
        if (loc.includes('australia') || loc.includes('sydney') || loc.includes('オーストラリア') || loc.includes('シドニー')) return '🇦🇺';
        if (loc.includes('singapore') || loc.includes('シンガポール')) return '🇸🇬';
        if (loc.includes('thailand') || loc.includes('bangkok') || loc.includes('タイ') || loc.includes('バンコク')) return '🇹🇭';
        if (loc.includes('vietnam') || loc.includes('ベトナム')) return '🇻🇳';
        if (loc.includes('hong kong') || loc.includes('香港')) return '🇭🇰';
        return '🌐';
    } catch (e) {
        return '⚠️';
    }
};

const Home = () => {
    const { plushies, t, toggleLanguage, language, plushieLimit, canAddPlushie, userAddedPlushieCount } = useApp();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // Gallery Latest Feed
    const [latestPosts, setLatestPosts] = useState([]);

    useEffect(() => {
        const fetchLatest = async () => {
            try {
                const q = query(
                    collectionGroup(db, 'closetItems'),
                    where('isPublic', '==', true)
                );
                const snapshot = await getDocs(q);
                const items = [];
                snapshot.forEach((doc) => {
                    try {
                        const data = doc.data();
                        if (!data) return;

                        // Filter out items without any identification (at least userId or userName should exist)
                        if (!data.userName && !data.userIcon && !data.userId) return;

                        items.push({
                            id: doc.id,
                            userName: data.userName || t('guestUser'),
                            itemName: data.itemName || data.name || t('clothing'),
                            createdAt: data.createdAt || '',
                            userIcon: data.userIcon || '',
                            plushieName: data.plushieName || '',
                            location: data.location || '',
                            userId: data.userId,
                            imageUrl: data.imageUrl || data.image || ''
                        });
                    } catch (e) { /* skip */ }
                });

                // Helper to get time for sorting
                const getTime = (val) => {
                    if (!val) return 0;
                    if (typeof val === 'object' && 'seconds' in val) return val.seconds * 1000;
                    const d = new Date(val);
                    return isNaN(d.getTime()) ? 0 : d.getTime();
                };

                items.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));

                // Deduplicate and filter out items without image
                const seen = new Set();
                const uniqueItems = [];
                items.forEach(item => {
                    const key = item.id;
                    if (!seen.has(key)) {
                        seen.add(key);
                        uniqueItems.push(item);
                    }
                });

                // Further filter to ensure we show quality posts (with icons if possible)
                // And exclude specific '誰か' entries if they exist in DB
                const validItems = uniqueItems.filter(item => item.userName !== '誰か');

                setLatestPosts(validItems.slice(0, 5));

                // Fetch latest user profiles for these items
                const topItems = validItems.slice(0, 5);
                try {
                    const { doc, getDoc } = await import('firebase/firestore');
                    const itemsWithProfiles = await Promise.all(topItems.map(async (item) => {
                        if (!item.userId) return item;
                        try {
                            const userDoc = await getDoc(doc(db, 'users', item.userId));
                            if (userDoc.exists()) {
                                const userData = userDoc.data();
                                return {
                                    ...item,
                                    userName: userData.displayName || item.userName,
                                    userIcon: userData.photoURL || item.userIcon,
                                    location: item.location || userData.location || ''
                                };
                            }
                        } catch (e) { /* ignore */ }
                        return item;
                    }));
                    setLatestPosts(itemsWithProfiles);
                } catch (e) {
                    setLatestPosts(topItems);
                }
            } catch (err) {
                console.warn("Latest gallery fetch error:", err);
            }
        };
        fetchLatest();
    }, []);

    // Format relative time
    const formatRelativeTime = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now - date;
            const diffMin = Math.floor(diffMs / 60000);
            const diffHour = Math.floor(diffMs / 3600000);
            const diffDay = Math.floor(diffMs / 86400000);
            if (diffMin < 1) return t('justNow');
            if (diffMin < 60) return t('timeAgo', diffMin, t('unitMinute'));
            if (diffHour < 24) return t('timeAgo', diffHour, t('unitHour'));
            if (diffDay < 7) return t('timeAgo', diffDay, t('unitDay'));
            return date.toLocaleDateString();
        } catch {
            return '';
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <header className="flex justify-between items-center py-2">
                <div>
                    <h1 style={{ color: 'var(--primary-dark)', fontSize: '20px', fontWeight: '800', letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {t('appTitle')}
                        <span style={{
                            fontSize: '9px',
                            fontWeight: '700',
                            letterSpacing: '0.08em',
                            padding: '2px 6px',
                            borderRadius: '20px',
                            background: 'linear-gradient(135deg, #E8956A 0%, #D4A490 100%)',
                            color: 'white',
                            textTransform: 'uppercase'
                        }}>
                            Beta
                        </span>
                    </h1>
                    <p style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '600', marginTop: '1px', letterSpacing: '-0.01em', whiteSpace: 'pre-wrap' }}>
                        {t('appSubtitle')}
                    </p>
                    <p style={{ fontSize: '10px', color: 'var(--text-light)', marginTop: '1px' }}>
                        {t('appDescription')}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={toggleLanguage}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                        style={{
                            background: 'var(--gray-100)',
                            color: 'var(--text-light)',
                            border: '1px solid var(--gray-200)'
                        }}
                    >
                        {language === 'en' ? 'JP' : 'EN'}
                    </button>
                    <Link
                        to="/settings"
                        className="px-2.5 py-1.5 rounded-full flex items-center gap-1 transition-all"
                        style={{
                            background: 'var(--gray-100)',
                            border: '1px solid var(--gray-200)'
                        }}
                    >
                        <Settings size={14} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--primary)' }}>
                            {t('settingsAndGuide')}
                        </span>
                    </Link>
                </div>
            </header>

            {/* Login Banner for Non-Logged-In Users */}
            {!currentUser && (
                <div
                    className="rounded-2xl p-2 shadow-sm mb-2"
                    style={{
                        background: 'linear-gradient(135deg, #4F8A8B 0%, #F4A261 100%)',
                        boxShadow: '0 2px 8px rgba(79, 138, 139, 0.2)'
                    }}
                >
                    <div className="flex items-center gap-2 mb-1.5">
                        <div
                            className="w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(255, 255, 255, 0.2)' }}
                        >
                            <Sparkles size={14} style={{ color: 'white' }} />
                        </div>
                        <div className="flex-1">
                            <h3 style={{ color: 'white', fontWeight: '700', fontSize: '12px', marginBottom: '0' }}>
                                {t('syncDataTitle')}
                            </h3>
                            <p style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: '10px' }}>
                                {t('syncDataDesc')}
                            </p>
                        </div>
                    </div>
                    <Link
                        to="/login"
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-bold transition-all"
                        style={{
                            backgroundColor: 'white',
                            color: '#4F8A8B',
                            fontWeight: '700',
                            fontSize: '12px'
                        }}
                    >
                        <LogIn size={14} />
                        {t('login') || 'Login / Sign Up'}
                    </Link>
                </div>
            )}

            {/* How to Use - Quick Guide */}
            <Link to="/guide" className="block rounded-2xl p-4 mb-4 hover-scale" style={{
                background: 'white',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--gray-200)'
            }}>
                <h3 style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: 'var(--text-main)',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    letterSpacing: '-0.01em'
                }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px' }}>📖</span>
                        {t('easy3Steps')}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600' }}>
                        {t('details')} →
                    </span>
                </h3>
                <div className="flex justify-between gap-2">
                    <div className="flex-1 text-center">
                        <div style={{
                            width: '48px',
                            height: '48px',
                            margin: '0 auto 8px',
                            borderRadius: '14px',
                            background: 'linear-gradient(145deg, #F5EDE9 0%, #EEDED8 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '22px'
                        }}>
                            🧸
                        </div>
                        <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)' }}>
                            {t('step1TitleRaw')}
                        </p>
                        <p style={{ fontSize: '10px', color: 'var(--text-light)', marginTop: '2px' }}>
                            {t('step1DescRaw')}
                        </p>
                    </div>
                    <div className="flex items-center" style={{ color: 'var(--gray-300)', fontSize: '16px' }}>→</div>
                    <div className="flex-1 text-center">
                        <div style={{
                            width: '48px',
                            height: '48px',
                            margin: '0 auto 8px',
                            borderRadius: '14px',
                            background: 'linear-gradient(145deg, var(--primary-light) 0%, #D5ECEE 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '22px'
                        }}>
                            👗
                        </div>
                        <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)' }}>
                            {t('step2TitleRaw')}
                        </p>
                        <p style={{ fontSize: '10px', color: 'var(--text-light)', marginTop: '2px' }}>
                            {t('step2DescRaw')}
                        </p>
                    </div>
                    <div className="flex items-center" style={{ color: 'var(--gray-300)', fontSize: '16px' }}>→</div>
                    <div className="flex-1 text-center">
                        <div style={{
                            width: '48px',
                            height: '48px',
                            margin: '0 auto 8px',
                            borderRadius: '14px',
                            background: 'linear-gradient(145deg, #E8F5F0 0%, #D4EDE5 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '22px'
                        }}>
                            ✨
                        </div>
                        <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)' }}>
                            {t('step3TitleRaw')}
                        </p>
                        <p style={{ fontSize: '10px', color: 'var(--text-light)', marginTop: '2px' }}>
                            {t('step3DescRaw')}
                        </p>
                    </div>
                </div>
            </Link>

            {/* My Closet Feature Highlight */}
            <Link
                to="/closet"
                className="block rounded-2xl p-2 mb-2 hover-scale"
                style={{
                    background: 'linear-gradient(135deg, var(--secondary-light) 0%, var(--primary-light) 100%)',
                    border: '1px solid var(--gray-200)',
                    boxShadow: 'var(--shadow-sm)'
                }}
            >
                <div className="flex items-center gap-2">
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        boxShadow: '0 2px 4px rgba(61, 122, 127, 0.2)'
                    }}>
                        👗
                    </div>
                    <div className="flex-1">
                        <h3 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {t('myCloset')}
                            <span style={{
                                fontSize: '8px',
                                fontWeight: '700',
                                background: 'var(--primary)',
                                color: 'white',
                                padding: '1px 5px',
                                borderRadius: '20px',
                                letterSpacing: '0.02em'
                            }}>NEW</span>
                        </h3>
                        <p style={{ fontSize: '9px', color: 'var(--text-light)', marginTop: '0' }}>
                            {t('closetTabHelp')}
                        </p>
                    </div>
                    <div style={{ color: 'var(--gray-300)', fontSize: '14px' }}>→</div>
                </div>
            </Link>

            {/* 🔔 Latest Gallery Feed - Public for all users */}
            {
                latestPosts.length > 0 && (
                    <section className="mb-2">
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '6px'
                        }}>
                            <h3 style={{
                                fontSize: '12px',
                                fontWeight: '700',
                                color: 'var(--text-main)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                letterSpacing: '-0.01em'
                            }}>
                                <span>🔔</span>
                                {t('latestOutfits')}
                            </h3>
                            <Link
                                to="/gallery"
                                style={{
                                    fontSize: '10px',
                                    fontWeight: '600',
                                    color: 'var(--primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2px'
                                }}
                            >
                                {t('seeAll')}
                                <span>→</span>
                            </Link>
                        </div>
                        <div className="rounded-2xl overflow-hidden stagger-in" style={{
                            background: 'white',
                            boxShadow: 'var(--shadow-sm)',
                            border: '1px solid var(--gray-200)'
                        }}>
                            {latestPosts.map((post, index) => (
                                <Link
                                    key={post.id}
                                    to="/gallery"
                                    className="flex items-center gap-2 px-3 py-1.5 transition-all"
                                    style={{
                                        borderBottom: index < latestPosts.length - 1 ? '1px solid var(--gray-100)' : 'none',
                                        fontFamily: '"Inter", sans-serif'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(232, 244, 245, 0.6)'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <div className="flex-shrink-0 relative" style={{ overflow: 'visible' }}>
                                        {post.userIcon && !post.userIcon.includes('placeholder') ? (
                                            <img src={post.userIcon} alt="" style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '8px',
                                                objectFit: 'cover',
                                                border: '1px solid var(--gray-200)'
                                            }} />
                                        ) : (
                                            <div style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '8px',
                                                background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--secondary-light) 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <Users size={12} style={{ color: 'var(--primary)' }} />
                                            </div>
                                        )}
                                        {/* Circular location flag next to icon */}
                                        <div style={{
                                            position: 'absolute',
                                            top: '0',
                                            right: '0',
                                            width: '15px',
                                            height: '15px',
                                            background: 'white',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: 50,
                                            border: '1px solid var(--gray-200)',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                            fontSize: '10px',
                                            lineHeight: 1,
                                            transform: 'translate(25%, -25%)'
                                        }}>
                                            {getLocationFlag(post.location)}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                                            <span className="font-semibold text-main" style={{ fontSize: '11px' }}>{post.userName}</span>
                                            {post.location && (
                                                <span style={{ 
                                                    fontSize: '9px', 
                                                    color: 'var(--text-light)', 
                                                    background: 'var(--gray-50)', 
                                                    padding: '1px 5px', 
                                                    borderRadius: '4px',
                                                    border: '1px solid var(--gray-100)'
                                                }}>
                                                    @{post.location}
                                                </span>
                                            )}
                                        </div>
                                        <p style={{ color: 'var(--text-main)', fontSize: '11px', lineHeight: '1.4' }}>
                                            {t('sharedAction')}
                                            <span className="font-semibold" style={{ color: 'var(--primary)' }}>{post.itemName}</span>
                                            {t('sharedSuffix')}
                                        </p>
                                    </div>
                                    <span style={{ fontSize: '9px', color: 'var(--text-light)', flexShrink: 0, whiteSpace: 'nowrap', fontWeight: 400 }}>
                                        {formatRelativeTime(post.createdAt)}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </section>
                )
            }



            {/* Featured Plushie Card */}
            <section>
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <h3>{t('myFriends')}</h3>
                        <p style={{ fontSize: '10px', color: 'var(--text-light)', marginTop: '2px' }}>
                            {t('plushieCount', userAddedPlushieCount, plushieLimit)}
                            {plushieLimit !== Infinity && (
                                <span style={{ marginLeft: '4px', color: 'var(--secondary)' }}>
                                    {t('currentLabel')}
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                }} className="plushie-list">
                    {plushies.map(plushie => (
                        <div key={plushie.id} className="hover-scale" style={{
                            width: '100%',
                            backgroundColor: 'white',
                            borderRadius: 'var(--radius-md)',
                            padding: '16px',
                            boxShadow: 'var(--shadow-sm)',
                            border: '1px solid var(--gray-200)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: '-20px',
                                right: '-20px',
                                width: '100px',
                                height: '100px',
                                borderRadius: '50%',
                                background: `linear-gradient(135deg, ${['Unagi', 'ウナギ'].includes(plushie.type) ? 'var(--secondary-light)' : 'var(--primary-light)'} 0%, ${['Unagi', 'ウナギ'].includes(plushie.type) ? '#F5EDE9' : '#E8F4F5'} 100%)`,
                                opacity: 0.5
                            }}></div>

                            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                                <img
                                    src={plushie.image}
                                    alt={plushie.name}
                                    style={{
                                        width: '100px',
                                        height: '100px',
                                        borderRadius: '12px',
                                        objectFit: 'cover',
                                        objectPosition: 'top center',
                                        flexShrink: 0,
                                        border: '1px solid var(--gray-200)'
                                    }}
                                />

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '2px', color: 'var(--primary-dark)', letterSpacing: '-0.02em' }}>
                                        {plushie.name}
                                    </h3>
                                    <p style={{ fontSize: '11px', color: 'var(--text-light)', marginBottom: '12px' }}>{plushie.type}</p>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                        <div>
                                            <p style={{ fontSize: '10px', color: 'var(--text-light)', marginBottom: '2px', fontWeight: '500' }}>{t('height')}</p>
                                            <p style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>{plushie.measurements.height}<span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-light)' }}>cm</span></p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '10px', color: 'var(--text-light)', marginBottom: '2px', fontWeight: '500' }}>{t('waist')}</p>
                                            <p style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>{plushie.measurements.waist}<span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-light)' }}>cm</span></p>
                                        </div>
                                    </div>
                                </div>

                                <Link
                                    to={`/measure?edit=${plushie.id}`}
                                    className="absolute top-0 right-0 p-2.5 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 z-20"
                                    title={t('editSizeTitle')}
                                    style={{
                                        background: 'white',
                                        color: 'var(--primary)',
                                        border: '1px solid var(--gray-200)'
                                    }}
                                >
                                    <Pencil size={16} strokeWidth={2.5} />
                                </Link>
                            </div>
                        </div>
                    ))}

                    {canAddPlushie && (
                        <Link to="/measure" style={{
                            display: 'block',
                            width: '100%',
                            backgroundColor: 'white',
                            border: '2px dashed var(--gray-200)',
                            borderRadius: 'var(--radius-md)',
                            padding: '32px',
                            textAlign: 'center',
                            transition: 'all 0.2s ease'
                        }} className="hover-scale">
                            <Plus size={32} style={{ margin: '0 auto 12px', color: 'var(--gray-300)' }} />
                            <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--gray-400)' }}>
                                {t('addNew')}
                            </p>
                        </Link>
                    )}
                </div>
            </section>

            {/* Footer with Legal Links */}
            <footer className="mt-8 pb-48 text-center">
                <div style={{ width: '40px', height: '1px', background: 'var(--gray-200)', margin: '0 auto 16px' }}></div>
                <Link
                    to="/legal"
                    style={{ fontSize: '11px', color: 'var(--text-light)' }}
                    className="hover:text-primary transition-colors"
                >
                    {t('privacyPolicyTerms')}
                </Link>
            </footer>
        </div >
    );
};

export default Home;
