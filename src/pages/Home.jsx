import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Globe, LogIn, Sparkles, Settings, Pencil } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Home = () => {
    const { plushies, t, toggleLanguage, language, plushieLimit, canAddPlushie, userAddedPlushieCount } = useApp();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="flex flex-col gap-4">
            <header className="flex justify-between items-center py-4">
                <div>
                    <h1 style={{ color: 'var(--primary-dark)', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {t('appTitle')}
                        <span className="bg-orange-100 text-orange-600 text-[10px] px-2 py-0.5 rounded-full border border-orange-200 font-bold tracking-wider">
                            BETA
                        </span>
                    </h1>
                    <p style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '600' }}>
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
                        className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-xs font-bold text-gray-400 hover:text-primary transition-all"
                    >
                        {language === 'en' ? 'JP' : 'EN'}
                    </button>
                    <Link
                        to="/settings"
                        className="px-3 py-2 rounded-full bg-white shadow-sm flex items-center gap-1 hover:bg-gray-100 transition-all"
                    >
                        <Settings size={16} style={{ color: 'var(--primary)' }} />
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
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <span>📖</span>
                    {language === 'jp' ? 'かんたん3ステップ' : 'Easy 3 Steps'}
                </h3>
                <div className="flex justify-between gap-2">
                    {/* Step 1 */}
                    <div className="flex-1 text-center">
                        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center text-2xl">
                            🧸
                        </div>
                        <p className="text-[10px] font-bold text-gray-600">
                            {language === 'jp' ? '1. 採寸' : '1. Measure'}
                        </p>
                        <p className="text-[9px] text-gray-400">
                            {language === 'jp' ? 'ぬいのサイズ登録' : 'Register size'}
                        </p>
                    </div>
                    {/* Arrow */}
                    <div className="flex items-center text-gray-300">→</div>
                    {/* Step 2 */}
                    <div className="flex-1 text-center">
                        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-2xl">
                            🔍
                        </div>
                        <p className="text-[10px] font-bold text-gray-600">
                            {language === 'jp' ? '2. URL入力' : '2. Enter URL'}
                        </p>
                        <p className="text-[9px] text-gray-400">
                            {language === 'jp' ? '服のURLを貼る' : 'Paste clothing URL'}
                        </p>
                    </div>
                    {/* Arrow */}
                    <div className="flex items-center text-gray-300">→</div>
                    {/* Step 3 */}
                    <div className="flex-1 text-center">
                        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center text-2xl">
                            ✨
                        </div>
                        <p className="text-[10px] font-bold text-gray-600">
                            {language === 'jp' ? '3. フィット確認' : '3. Check Fit'}
                        </p>
                        <p className="text-[9px] text-gray-400">
                            {language === 'jp' ? 'サイズ判定表示' : 'See result'}
                        </p>
                    </div>
                </div>
            </div>

            {/* My Closet Feature Highlight */}
            <Link
                to="/closet"
                className="block bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 shadow-sm border border-purple-100 mb-4 hover:shadow-md transition-shadow"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-lg">
                        👗
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-purple-700 flex items-center gap-1">
                            {language === 'jp' ? 'マイクローゼット' : 'My Closet'}
                            <span className="text-[10px] bg-purple-200 text-purple-600 px-1.5 py-0.5 rounded-full">NEW</span>
                        </h3>
                        <p className="text-[11px] text-purple-500">
                            {language === 'jp'
                                ? 'お気に入りのコーデを登録してシェアしよう！'
                                : 'Save & share your favorite outfits!'}
                        </p>
                    </div>
                    <div className="text-purple-300">→</div>
                </div>
            </Link>

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
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            {/* Decorative Circle */}
                            <div style={{
                                position: 'absolute',
                                top: '-20px',
                                right: '-20px',
                                width: '100px',
                                height: '100px',
                                borderRadius: '50%',
                                background: `linear-gradient(135deg, ${['Unagi', 'ウナギ'].includes(plushie.type) ? '#FFB7CB' : '#FFD4A3'} 0%, ${['Unagi', 'ウナギ'].includes(plushie.type) ? '#FFC7D6' : '#FFE7C3'} 100%)`,
                                opacity: 0.3
                            }}></div>

                            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                                {/* Image */}
                                <img
                                    src={plushie.image}
                                    alt={plushie.name}
                                    style={{
                                        width: '100px',
                                        height: '100px',
                                        borderRadius: 'var(--radius-sm)',
                                        objectFit: 'cover',
                                        objectPosition: 'top center',
                                        flexShrink: 0
                                    }}
                                />

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '2px', color: 'var(--primary)' }}>
                                        {plushie.name}
                                    </h3>
                                    <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>{plushie.type}</p>

                                    {/* Measurements Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                        <div>
                                            <p style={{ fontSize: '10px', color: '#888', marginBottom: '2px' }}>{t('height')}</p>
                                            <p style={{ fontSize: '16px', fontWeight: '800' }}>{plushie.measurements.height}cm</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '10px', color: '#888', marginBottom: '2px' }}>{t('waist')}</p>
                                            <p style={{ fontSize: '16px', fontWeight: '800' }}>{plushie.measurements.waist}cm</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Edit Button */}
                                <Link to={`/measure?edit=${plushie.id}`} className="absolute top-0 right-0 p-2 bg-white/80 rounded-full hover:bg-white text-gray-400 hover:text-primary transition-colors z-20">
                                    <Pencil size={16} />
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
                                    borderRadius: '8px',
                                    background: '#548C8C',
                                    color: 'white',
                                    fontWeight: '600',
                                    border: 'none',
                                    cursor: 'pointer',
                                    marginTop: 'auto'
                                }}
                            >
                                {t('findClothes')}
                            </button>
                        </div>
                    ))}

                    {/* Add New Plushie Card */}
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

            {/* Discovery / News Feed */}
            <section className="mt-4">
                <h3 className="mb-2">{t('discover')}</h3>
                <div style={{
                    backgroundColor: '#FFF5F7',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <span style={{ fontSize: '24px' }}>✨</span>
                    <div>
                        <h4 style={{ fontSize: '16px' }}>{t('newArrival')}</h4>
                        <p style={{ fontSize: '12px', color: 'var(--text-main)' }}>
                            {t('newArrivalBody', plushies[0]?.name || 'My Friend')}
                        </p>
                    </div>
                </div>
            </section>

            {/* Footer with Legal Links */}
            <footer className="mt-8 pb-20 text-center">
                <Link
                    to="/legal"
                    className="text-xs text-gray-400 hover:text-primary transition-colors"
                >
                    {language === 'jp' ? 'プライバシーポリシー・利用規約' : 'Privacy Policy & Terms'}
                </Link>
            </footer>
        </div>
    );
};

export default Home;
