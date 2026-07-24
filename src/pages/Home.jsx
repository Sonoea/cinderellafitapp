import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Globe, LogIn, Sparkles, Settings, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getWeeklyThemeKey } from '../utils/weeklyTheme';
import Gallery from './Gallery';

const Home = () => {
    const { t, toggleLanguage, language } = useApp();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const weeklyThemeKey = getWeeklyThemeKey();

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

            {/* Gallery — the main browsing/search experience now lives directly on
                Home instead of a separate tab, so there's one screen instead of two
                that show mostly the same feed. */}
            <Gallery embedded />

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
