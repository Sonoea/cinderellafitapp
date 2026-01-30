import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Globe, LogIn, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
    const { plushies, t, toggleLanguage, language, plushieLimit } = useApp();
    const { currentUser } = useAuth();

    return (
        <div className="flex flex-col gap-4">
            <header className="flex justify-between items-center py-4">
                <div>
                    <h1 style={{ color: 'var(--primary-dark)', fontSize: '24px' }}>{t('appTitle')}</h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-light)' }}>{t('appSubtitle')}</p>
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
                        className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-gray-100 transition-all"
                    >
                        <span style={{ fontSize: '12px' }}>⚙️</span>
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

            {/* Featured Plushie Card */}
            <section>
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <h3>{t('myFriends')}</h3>
                        <p style={{ fontSize: '10px', color: 'var(--text-light)', marginTop: '2px' }}>
                            {t('plushieCount', plushies.length, plushieLimit)}
                            {plushieLimit !== Infinity && (
                                <span style={{ marginLeft: '4px', color: 'var(--secondary)' }}>
                                    {language === 'jp' ? '（現状）' : '(Current)'}
                                </span>
                            )}
                        </p>
                    </div>
                    <Link to="/measure" style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>{t('addNew')}</Link>
                </div>

                <div style={{
                    display: 'flex',
                    gap: '16px',
                    overflowX: 'auto',
                    paddingBottom: '8px',
                    scrollSnapType: 'x mandatory'
                }}>
                    {plushies.map(plushie => (
                        <div key={plushie.id} className="hover-scale" style={{
                            minWidth: '260px',
                            backgroundColor: 'white',
                            borderRadius: 'var(--radius-md)',
                            padding: '16px',
                            boxShadow: 'var(--shadow-sm)',
                            scrollSnapAlign: 'center',
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
                                background: 'linear-gradient(135deg, var(--primary) 0%, rgba(255,255,255,0) 70%)',
                                opacity: 0.2,
                                borderRadius: '50%'
                            }} />

                            <div className="flex items-center gap-4">
                                <img
                                    src={plushie.image}
                                    alt={plushie.name}
                                    style={{
                                        width: '80px',
                                        height: '80px',
                                        borderRadius: 'var(--radius-sm)',
                                        objectFit: 'cover',
                                        border: '2px solid white',
                                        boxShadow: 'var(--shadow-lg)'
                                    }}
                                />
                                <div>
                                    <h2 style={{ fontSize: '20px' }}>{plushie.name}</h2>
                                    <p style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: 600 }}>{plushie.type}</p>
                                </div>
                            </div>

                            <div className="mt-4 flex gap-2">
                                <div style={{ flex: 1, background: 'var(--background)', padding: '8px', borderRadius: '8px' }}>
                                    <p style={{ fontSize: '10px', color: 'var(--text-light)' }}>{t('height')}</p>
                                    <p style={{ fontWeight: 700 }}>{plushie.measurements.height}cm</p>
                                </div>
                                <div style={{ flex: 1, background: 'var(--background)', padding: '8px', borderRadius: '8px' }}>
                                    <p style={{ fontSize: '10px', color: 'var(--text-light)' }}>{t('waist')}</p>
                                    <p style={{ fontWeight: 700 }}>{plushie.measurements.waist}cm</p>
                                </div>
                            </div>

                            <Link to="/shop" className="mt-4 flex items-center justify-center w-full py-2 bg-black text-white rounded-xl" style={{ fontSize: '14px', background: 'var(--primary-dark)' }}>
                                {t('findClothes')}
                            </Link>
                        </div>
                    ))}

                    {/* Add Card */}
                    <Link to="/measure" className="hover-scale flex flex-col items-center justify-center gap-2" style={{
                        minWidth: '100px',
                        borderRadius: 'var(--radius-md)',
                        border: '2px dashed var(--secondary)',
                        color: 'var(--secondary)',
                        scrollSnapAlign: 'center'
                    }}>
                        <Plus />
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>{t('newFriend')}</span>
                    </Link>
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
