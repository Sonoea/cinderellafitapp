import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Globe, LogIn, Sparkles, Settings, Pencil, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

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
                            userName: data.userName || 'ゲスト',
                            itemName: data.itemName || data.name || 'コーデ',
                            createdAt: data.createdAt || '',
                            userIcon: data.userIcon || '',
                            plushieName: data.plushieName || '',
                            userId: data.userId // Add userId for profile fetching
                        });
                    } catch (e) { /* skip */ }
                });

                // Sort by createdAt descending
                items.sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return dateB - dateA;
                });

                // Deduplicate items
                const uniqueItems = [];
                const seen = new Set();
                items.forEach(item => {
                    if (!item.userId || !item.createdAt) {
                        uniqueItems.push(item);
                        return;
                    }
                    const key = `${item.userId}-${item.itemName}-${item.imageUrl || item.image}`;
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
                                    userIcon: userData.photoURL || item.userIcon
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
            if (diffMin < 1) return language === 'jp' ? 'たった今' : 'Just now';
            if (diffMin < 60) return language === 'jp' ? `${diffMin}分前` : `${diffMin}m ago`;
            if (diffHour < 24) return language === 'jp' ? `${diffHour}時間前` : `${diffHour}h ago`;
            if (diffDay < 7) return language === 'jp' ? `${diffDay}日前` : `${diffDay}d ago`;
            return date.toLocaleDateString();
        } catch {
            return '';
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <header className="flex justify-between items-center py-4">
                <div>
                    <h1 style={{ color: 'var(--primary-dark)', fontSize: '22px', fontWeight: '800', letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {t('appTitle')}
                        <span style={{
                            fontSize: '9px',
                            fontWeight: '700',
                            letterSpacing: '0.08em',
                            padding: '3px 8px',
                            borderRadius: '20px',
                            background: 'linear-gradient(135deg, #E8956A 0%, #D4A490 100%)',
                            color: 'white',
                            textTransform: 'uppercase'
                        }}>
                            Beta
                        </span>
                    </h1>
                    <p style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '600', marginTop: '2px', letterSpacing: '-0.01em' }}>
                        {language === 'jp' ? 'サイズ失敗、もうしない。' : 'Never buy the wrong size again'}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>
                        {language === 'jp'
                            ? 'ぬいぐるみ服のサイズ比較・判断支援アプリ'
                            : 'Size comparison tool for plushie clothing'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={toggleLanguage}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
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
                        className="px-3 py-2 rounded-full flex items-center gap-1 transition-all"
                        style={{
                            background: 'var(--gray-100)',
                            border: '1px solid var(--gray-200)'
                        }}
                    >
                        <Settings size={15} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary)' }}>
                            {language === 'jp' ? '設定・ガイド' : 'Settings/Guide'}
                        </span>
                    </Link>
                </div>
            </header>

            {/* Login Banner for Non-Logged-In Users */}
            {!currentUser && (
                <div
                    className="rounded-2xl p-4 shadow-lg mb-4"
                    style={{
                        background: 'linear-gradient(135deg, #4F8A8B 0%, #F4A261 100%)',
                        boxShadow: '0 8px 20px rgba(79, 138, 139, 0.3)'
                    }}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(255, 255, 255, 0.2)' }}
                        >
                            <Sparkles size={20} style={{ color: 'white' }} />
                        </div>
                        <div className="flex-1">
                            <h3 style={{ color: 'white', fontWeight: '700', fontSize: '14px', marginBottom: '2px' }}>
                                {language === 'jp' ? 'デバイス間でデータを同期' : 'Sync Your Data'}
                            </h3>
                            <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '12px' }}>
                                {language === 'jp'
                                    ? 'ログインして、どこからでもぬいぐるみを管理'
                                    : 'Login to manage your plushies anywhere'}
                            </p>
                        </div>
                    </div>
                    <Link
                        to="/login"
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all"
                        style={{
                            backgroundColor: 'white',
                            color: '#4F8A8B',
                            fontWeight: '700'
                        }}
                    >
                        <LogIn size={18} />
                        {language === 'jp' ? 'ログイン / 新規登録' : 'Login / Sign Up'}
                    </Link>
                </div>
            )}

            {/* How to Use - Quick Guide */}
            <div className="rounded-2xl p-4 mb-4" style={{
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
                    gap: '8px',
                    letterSpacing: '-0.01em'
                }}>
                    <span style={{ fontSize: '14px' }}>📖</span>
                    {language === 'jp' ? 'かんたん3ステップ' : 'Easy 3 Steps'}
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
                            {language === 'jp' ? '1. 採寸' : '1. Measure'}
                        </p>
                        <p style={{ fontSize: '10px', color: 'var(--text-light)', marginTop: '2px' }}>
                            {language === 'jp' ? 'ぬいのサイズ登録' : 'Register size'}
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
                            🔍
                        </div>
                        <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)' }}>
                            {language === 'jp' ? '2. URL入力' : '2. Enter URL'}
                        </p>
                        <p style={{ fontSize: '10px', color: 'var(--text-light)', marginTop: '2px' }}>
                            {language === 'jp' ? '服のURLを貼る' : 'Paste clothing URL'}
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
                            {language === 'jp' ? '3. フィット確認' : '3. Check Fit'}
                        </p>
                        <p style={{ fontSize: '10px', color: 'var(--text-light)', marginTop: '2px' }}>
                            {language === 'jp' ? 'サイズ判定表示' : 'See result'}
                        </p>
                    </div>
                </div>
            </div>

            {/* My Closet Feature Highlight */}
            <Link
                to="/closet"
                className="block rounded-2xl p-4 mb-4 hover-scale"
                style={{
                    background: 'linear-gradient(135deg, var(--secondary-light) 0%, var(--primary-light) 100%)',
                    border: '1px solid var(--gray-200)',
                    boxShadow: 'var(--shadow-sm)'
                }}
            >
                <div className="flex items-center gap-3">
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        boxShadow: '0 2px 8px rgba(61, 122, 127, 0.25)'
                    }}>
                        👗
                    </div>
                    <div className="flex-1">
                        <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {language === 'jp' ? 'マイクローゼット' : 'My Closet'}
                            <span style={{
                                fontSize: '9px',
                                fontWeight: '700',
                                background: 'var(--primary)',
                                color: 'white',
                                padding: '2px 7px',
                                borderRadius: '20px',
                                letterSpacing: '0.02em'
                            }}>NEW</span>
                        </h3>
                        <p style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>
                            {language === 'jp'
                                ? 'お気に入りのコーデを登録してシェアしよう！'
                                : 'Save & share your favorite outfits!'}
                        </p>
                    </div>
                    <div style={{ color: 'var(--gray-300)', fontSize: '18px' }}>→</div>
                </div>
            </Link>

            {/* 🔔 Latest Gallery Feed - Only for logged in users */}
            {currentUser && latestPosts.length > 0 && (
                <section className="mb-4">
                    <h3 style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        color: 'var(--text-main)',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        letterSpacing: '-0.01em'
                    }}>
                        <span>🔔</span>
                        {language === 'jp' ? 'みんなの最新コーデ' : 'Latest Outfits'}
                    </h3>
                    <div className="rounded-2xl overflow-hidden stagger-in" style={{
                        background: 'white',
                        boxShadow: 'var(--shadow-sm)',
                        border: '1px solid var(--gray-200)'
                    }}>
                        {latestPosts.map((post, index) => (
                            <Link
                                key={post.id}
                                to={`/closet?tab=gallery&itemId=${post.id}`}
                                className="flex items-center gap-3 px-4 py-3 transition-all"
                                style={{
                                    borderBottom: index < latestPosts.length - 1 ? '1px solid var(--gray-100)' : 'none'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--gray-50)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <div className="flex-shrink-0">
                                    {post.userIcon && !post.userIcon.includes('placeholder') ? (
                                        <img src={post.userIcon} alt="" style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '10px',
                                            objectFit: 'cover',
                                            border: '1px solid var(--gray-200)'
                                        }} />
                                    ) : (
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '10px',
                                            background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--secondary-light) 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <Users size={14} style={{ color: 'var(--primary)' }} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs" style={{ color: 'var(--text-main)' }}>
                                        <span className="font-bold">{post.userName}</span>
                                        {language === 'jp' ? 'さんが' : ' shared '}
                                        <span className="font-bold" style={{ color: 'var(--primary)' }}>{post.itemName}</span>
                                        {language === 'jp' ? 'を公開しました' : ''}
                                    </p>
                                </div>
                                <span style={{ fontSize: '10px', color: 'var(--text-light)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                    {formatRelativeTime(post.createdAt)}
                                </span>
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
                                    {language === 'jp' ? '（現状）' : '(Current)'}
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
                                    title={language === 'jp' ? 'サイズを編集' : 'Edit Size'}
                                    style={{
                                        background: 'white',
                                        color: 'var(--primary)',
                                        border: '1px solid var(--gray-200)'
                                    }}
                                >
                                    <Pencil size={16} strokeWidth={2.5} />
                                </Link>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    navigate(`/shop?plushie=${plushie.id}`);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '10px',
                                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                                    color: 'white',
                                    fontWeight: '600',
                                    fontSize: '13px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    marginTop: 'auto',
                                    boxShadow: '0 2px 8px rgba(61, 122, 127, 0.25)',
                                    letterSpacing: '0.01em'
                                }}
                            >
                                {t('findClothes')}
                            </button>
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
            <footer className="mt-8 pb-20 text-center">
                <div style={{ width: '40px', height: '1px', background: 'var(--gray-200)', margin: '0 auto 16px' }}></div>
                <Link
                    to="/legal"
                    style={{ fontSize: '11px', color: 'var(--text-light)' }}
                    className="hover:text-primary transition-colors"
                >
                    {language === 'jp' ? 'プライバシーポリシー・利用規約' : 'Privacy Policy & Terms'}
                </Link>
            </footer>
        </div>
    );
};

export default Home;
