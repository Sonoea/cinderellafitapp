import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Globe, LogIn, Sparkles, Settings, Pencil, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { collectionGroup, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getWeeklyThemeKey } from '../utils/weeklyTheme';
import RunwayShowcase from '../components/RunwayShowcase';

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
    const weeklyThemeKey = getWeeklyThemeKey();

    // Gallery Latest Feed
    const [latestPosts, setLatestPosts] = useState([]);
    const [trendingPatterns, setTrendingPatterns] = useState([]);

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

                        const ownerUid = doc.ref.parent.parent.id;
                        items.push({
                            id: doc.id,
                            compositeId: `${ownerUid}_${doc.id}`.replace(/local-/g, ''),
                            userName: data.userName || t('guestUser'),
                            itemName: data.itemName || data.name || t('clothing'),
                            createdAt: data.createdAt || '',
                            userIcon: data.userIcon || '',
                            plushieName: data.plushieName || '',
                            plushieImage: data.plushieImage || '',
                            location: data.location || '',
                            userId: data.userId || ownerUid,
                            imageUrl: data.imageUrl || data.image || '',
                            patternImage: data.patternImage || null,
                            referenceUrl: data.referenceUrl || null,
                            isPattern: !!data.isPattern,
                            referencedPostId: data.referencedPostId || '',
                            likes: Number(data.likes) || 0,
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

                setLatestPosts(validItems.slice(0, 6));

                // Trending Patterns: rank patterns by how many other posts were made from them
                const remixCounts = {};
                validItems.forEach(item => {
                    if (item.referencedPostId) {
                        remixCounts[item.referencedPostId] = (remixCounts[item.referencedPostId] || 0) + 1;
                    }
                });
                const patternCandidates = validItems
                    .filter(item => (item.isPattern || item.patternImage) && item.imageUrl)
                    .map(item => ({ ...item, madeCount: remixCounts[item.compositeId] || 0 }))
                    .sort((a, b) => (b.madeCount - a.madeCount) || (b.likes - a.likes) || (getTime(b.createdAt) - getTime(a.createdAt)));
                setTrendingPatterns(patternCandidates.slice(0, 6));

                // Fetch latest user profiles for these items
                const topItems = validItems.slice(0, 6);
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

            {/* Weekly Theme Challenge Banner */}
            <Link
                to={currentUser ? `/closet?add=true&theme=${weeklyThemeKey}` : '/login'}
                className="block mb-4 hover-scale"
                style={{
                    borderRadius: '20px',
                    padding: '12px',
                    background: 'linear-gradient(135deg, #fffaf0 0%, #fff1f2 100%)',
                    border: '1px solid rgba(249,115,22,0.15)',
                    boxShadow: '0 4px 12px rgba(249, 115, 22, 0.08)'
                }}
            >
                <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <div className="flex items-center gap-1" style={{ marginBottom: '4px' }}>
                            <span style={{ fontSize: '14px' }}>🎯</span>
                            <span style={{ fontSize: '9px', fontWeight: '700', color: '#ea580c', background: 'rgba(249,115,22,0.12)', padding: '2px 6px', borderRadius: '20px' }}>
                                {t('themeOfTheWeek')}
                            </span>
                        </div>
                        <p className="truncate" style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                            {t(weeklyThemeKey)}
                        </p>
                    </div>
                    <span className="flex items-center" style={{
                        flexShrink: 0,
                        padding: '7px 12px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: '700',
                        boxShadow: '0 2px 6px rgba(236,72,153,0.25)'
                    }}>
                        {t('themeJoinButton')}
                    </span>
                </div>
            </Link>

            {/* Sync Data Banner (Deployed Version) */}
            {!currentUser && (
                <div className="mb-4 p-4 relative overflow-hidden" style={{
                    background: 'linear-gradient(135deg, #509291 0%, #D89868 100%)',
                    borderRadius: '24px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                }}>
                    <div className="relative z-10">
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '16px' }}>
                            <span style={{ fontSize: '18px', color: 'white', marginTop: '2px' }}>✨</span>
                            <div>
                                <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'white', marginBottom: '4px', letterSpacing: '0.02em' }}>
                                    {t('syncDataTitle')}
                                </h3>
                                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.9)', fontWeight: '600' }}>
                                    {t('syncDataDesc')}
                                </p>
                            </div>
                        </div>
                        
                        <Link to="/login" className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full font-bold transition-all active:scale-95 shadow-sm bg-white" style={{ color: '#509291', fontSize: '14px' }}>
                            <LogIn size={16} strokeWidth={2.5} />
                            {t('login')}
                        </Link>
                    </div>
                </div>
            )}

            {/* Easy 3 Steps (Deployed Version) */}
            {!currentUser && (
                <Link to="/guide" className="block rounded-[24px] p-5 mb-4 hover-scale" style={{
                    background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid var(--gray-200)'
                }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', letterSpacing: '-0.01em' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '16px' }}>📖</span>
                            {t('easy3Steps')}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '700' }}>{t('details')} →</span>
                    </h3>
                    <div className="flex justify-between items-start gap-1">
                        <div className="flex-1 text-center">
                            <div style={{ width: '56px', height: '56px', margin: '0 auto 12px', borderRadius: '16px', background: '#F5E6E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🧸</div>
                            <p style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>{t('step1TitleRaw')}</p>
                            <p style={{ fontSize: '9.5px', color: 'var(--text-light)', fontWeight: '500' }}>{t('step1DescRaw')}</p>
                        </div>
                        <div className="flex items-center" style={{ color: 'var(--gray-300)', fontSize: '16px', marginTop: '20px' }}>➔</div>
                        <div className="flex-1 text-center">
                            <div style={{ width: '56px', height: '56px', margin: '0 auto 12px', borderRadius: '16px', background: '#CBEBE3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>👗</div>
                            <p style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>{t('step2TitleRaw')}</p>
                            <p style={{ fontSize: '9.5px', color: 'var(--text-light)', fontWeight: '500' }}>{t('step2DescRaw')}</p>
                        </div>
                        <div className="flex items-center" style={{ color: 'var(--gray-300)', fontSize: '16px', marginTop: '20px' }}>➔</div>
                        <div className="flex-1 text-center">
                            <div style={{ width: '56px', height: '56px', margin: '0 auto 12px', borderRadius: '16px', background: '#DFF2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>✨</div>
                            <p style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>{t('step3TitleRaw')}</p>
                            <p style={{ fontSize: '9.5px', color: 'var(--text-light)', fontWeight: '500' }}>{t('step3DescRaw')}</p>
                        </div>
                    </div>
                </Link>
            )}

            {/* My Closet (Logged in users) */}
            {currentUser && (
                <Link to="/closet" className="block rounded-2xl p-2 mb-4 hover-scale" style={{
                    background: 'linear-gradient(135deg, var(--secondary-light) 0%, var(--primary-light) 100%)',
                    border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-sm)'
                }}>
                    <div className="flex items-center gap-2">
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', boxShadow: '0 2px 4px rgba(61, 122, 127, 0.2)' }}>👗</div>
                        <div className="flex-1">
                            <h3 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary-dark)' }}>{t('myCloset')}</h3>
                            <p style={{ fontSize: '9px', color: 'var(--text-light)', marginTop: '0' }}>{t('closetTabHelp')}</p>
                        </div>
                        <div style={{ color: 'var(--gray-300)', fontSize: '14px' }}>→</div>
                    </div>
                </Link>
            )}

            {/* New Arrivals Runway — auto-advancing showcase of the 5 latest posts */}
            {latestPosts.filter(p => p.imageUrl).length > 0 && (
                <section className="mb-4">
                    <RunwayShowcase
                        items={latestPosts.filter(p => p.imageUrl).slice(0, 5)}
                        t={t}
                        onItemClick={(item) => navigate('/gallery')}
                    />
                </section>
            )}

            {/* みんなの最新コーデ — Split-Flap Display */}
            {latestPosts.length > 0 && (
                <section className="mb-4">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>✨</span>
                            {t('latestOutfits')}
                        </h3>
                        <Link to="/gallery" style={{ fontSize: '10px', fontWeight: '600', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            {t('seeAll')} <span>→</span>
                        </Link>
                    </div>

                    <div style={{
                        background: 'white',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        boxShadow: '0 8px 24px rgba(61,122,127,0.08), inset 0 1px 0 rgba(255,255,255,1)',
                        border: '1px solid var(--gray-200)'
                    }}>
                        {/* Header */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '44px 40px 1fr 1fr 48px 36px',
                            gap: '3px',
                            padding: '8px 6px 5px',
                            background: 'var(--primary-light)'
                        }}>
                            {[t('boardHeaderArrival'), '', t('boardHeaderUser'), t('boardHeaderOutfit'), t('boardHeaderRemarks'), '📍'].map((label, i) => (
                                <span key={i} style={{ fontSize: '8px', fontWeight: '700', color: 'var(--primary-dark)', letterSpacing: '0.08em', fontFamily: '"Hiragino Kaku Gothic ProN", "SF Mono", monospace', paddingLeft: '2px', textAlign: i === 5 ? 'center' : 'left' }}>{label}</span>
                            ))}
                        </div>

                        {/* Rows */}
                        {latestPosts.filter(p => p.imageUrl).slice(0, 6).map((post, index) => (
                            <Link
                                key={post.id}
                                to="/gallery"
                                className="block"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '44px 40px 1fr 1fr 48px 36px',
                                    gap: '3px',
                                    padding: '4px 6px',
                                    alignItems: 'center',
                                    borderBottom: '1px solid var(--gray-100)',
                                    animation: `splitFlapIn 0.4s ease-out ${index * 0.1}s both`
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-light)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                {/* Time cell */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{
                                        fontSize: '10px', fontWeight: '700', color: 'var(--primary)',
                                        fontFamily: '"SF Mono", "Menlo", monospace',
                                        background: 'var(--gray-50)',
                                        padding: '3px 4px',
                                        borderRadius: '3px',
                                        border: '1px solid var(--gray-200)',
                                        display: 'block',
                                        textAlign: 'center',
                                        width: '100%',
                                        position: 'relative',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                    }}>{formatRelativeTime(post.createdAt)}</span>
                                </div>

                                {/* Photo thumbnail */}
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <img src={post.imageUrl} alt="" style={{
                                        width: '36px', height: '36px',
                                        borderRadius: '4px',
                                        objectFit: 'cover',
                                        border: '1px solid var(--gray-200)',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                    }} />
                                </div>

                                {/* User cell */}
                                <div className="flex items-center gap-1.5 min-w-0" style={{
                                    background: 'white',
                                    padding: '5px 6px',
                                    borderRadius: '3px',
                                    border: '1px solid var(--gray-200)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                }}>
                                    {/* Flap center line */}
                                    <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '1px', background: 'var(--gray-100)' }} />
                                    {(() => {
                                        const icon = post.plushieImage || post.userIcon;
                                        return icon && !icon.includes('placeholder');
                                    })() ? (
                                        <img src={post.plushieImage || post.userIcon} alt="" style={{ width: '16px', height: '16px', borderRadius: '3px', objectFit: 'cover', flexShrink: 0, position: 'relative', zIndex: 1 }} />
                                    ) : (
                                        <div style={{ width: '16px', height: '16px', borderRadius: '3px', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', zIndex: 1 }}>
                                            <Users size={9} style={{ color: 'var(--text-light)' }} />
                                        </div>
                                    )}
                                    <span className="truncate" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', fontFamily: '"SF Mono", "Menlo", monospace', position: 'relative', zIndex: 1 }}>{post.userName}</span>
                                </div>

                                {/* Outfit cell */}
                                <div style={{
                                    background: 'white',
                                    padding: '5px 6px',
                                    borderRadius: '3px',
                                    border: '1px solid var(--gray-200)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    minWidth: 0,
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                }}>
                                    <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '1px', background: 'var(--gray-100)' }} />
                                    <span className="truncate block" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', fontFamily: '"SF Mono", "Menlo", monospace', position: 'relative', zIndex: 1 }}>
                                        {post.itemName}
                                    </span>
                                </div>

                                {/* Remarks (Pattern) cell */}
                                <div style={{
                                    background: (post.patternImage || post.referenceUrl) ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'var(--gray-50)',
                                    padding: '5px 2px',
                                    borderRadius: '3px',
                                    border: (post.patternImage || post.referenceUrl) ? '1px solid #c2410c' : '1px solid var(--gray-200)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    minWidth: 0,
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '1px', background: (post.patternImage || post.referenceUrl) ? 'rgba(0,0,0,0.2)' : 'var(--gray-200)' }} />
                                    <span className="block truncate" style={{ fontSize: '9px', fontWeight: '800', color: (post.patternImage || post.referenceUrl) ? 'white' : 'var(--gray-300)', fontFamily: '"Hiragino Kaku Gothic ProN", sans-serif', position: 'relative', zIndex: 1 }}>
                                        {(post.patternImage || post.referenceUrl) ? t('boardPatternAvailable') : t('boardPatternNone')}
                                    </span>
                                </div>

                                {/* Destination (country) cell */}
                                <div style={{
                                    background: 'white',
                                    padding: '5px 4px',
                                    borderRadius: '3px',
                                    border: '1px solid var(--gray-200)',
                                    textAlign: 'center',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                }}>
                                    <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '1px', background: 'var(--gray-100)' }} />
                                    <span style={{ fontSize: '18px', lineHeight: 1, position: 'relative', zIndex: 1 }}>{getLocationFlag(post.location)}</span>
                                </div>
                            </Link>
                        ))}
                    </div>

                    <style>{`
                        @keyframes splitFlapIn {
                            0% { transform: perspective(600px) rotateX(-90deg); opacity: 0; transform-origin: top center; }
                            70% { transform: perspective(600px) rotateX(5deg); transform-origin: top center; }
                            100% { transform: perspective(600px) rotateX(0deg); opacity: 1; transform-origin: top center; }
                        }
                    `}</style>
                </section>
            )}

            {/* Trending Patterns */}
            {trendingPatterns.length > 0 && (
                <section className="mb-4">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                            {t('homePatternTitle')}
                        </h3>
                        <Link to="/gallery" style={{ fontSize: '10px', fontWeight: '600', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            {t('homePatternMore')} <span>→</span>
                        </Link>
                    </div>
                    <p style={{ fontSize: '10px', color: 'var(--text-light)', marginBottom: '10px' }}>{t('homePatternDesc')}</p>

                    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                        {trendingPatterns.map(p => (
                            <Link
                                key={p.compositeId}
                                to={`/lookbook/${p.compositeId}`}
                                style={{
                                    flex: '0 0 118px',
                                    background: 'white',
                                    borderRadius: '14px',
                                    overflow: 'hidden',
                                    border: '1px solid var(--gray-200)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
                                }}
                            >
                                <div style={{ width: '118px', height: '118px', background: 'var(--gray-50)' }}>
                                    <img src={p.imageUrl} alt={p.itemName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div style={{ padding: '8px' }}>
                                    <p className="truncate" style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-main)' }}>{p.itemName}</p>
                                    <p style={{ fontSize: '9px', fontWeight: '800', color: '#ea580c', marginTop: '2px' }}>{t('patternCardMadeCount', p.madeCount)}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

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
