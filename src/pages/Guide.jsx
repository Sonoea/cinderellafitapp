import React from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const Guide = () => {
    const { t } = useApp();
    const navigate = useNavigate();

    return (
        <div style={{ minHeight: '100vh', background: '#FAFAF8', paddingBottom: '6rem' }}>
            {/* Header */}
            <div style={{
                position: 'sticky', top: 0, zIndex: 30,
                background: 'rgba(250,250,248,0.92)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid #F0EBE3',
                padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12
            }}>
                <button onClick={() => navigate(-1)} style={{
                    width: 38, height: 38, borderRadius: '50%',
                    border: '1px solid #E5E7EB', background: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}>
                    <ArrowLeft size={17} color="#6B7280" />
                </button>
                <h1 style={{ fontSize: 19, fontWeight: 900, color: '#1F2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BookOpen size={19} color="var(--primary)" />
                    {t('guideTitle')}
                </h1>
            </div>

            <div style={{ padding: '20px 16px', maxWidth: 560, margin: '0 auto' }}>

                {/* Intro Hero */}
                <div style={{
                    background: 'linear-gradient(135deg, #4F8A8B 0%, #3d7a7f 100%)',
                    borderRadius: 24, padding: '28px 24px',
                    textAlign: 'center', marginBottom: 28, color: 'white'
                }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>🧸✨</div>
                    <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8, letterSpacing: '-0.02em' }}>
                        CinderellaFit
                    </h2>
                    <p style={{ fontSize: 13, lineHeight: 1.8, opacity: 0.92 }}>
                        {t('guideIntro')}
                    </p>
                </div>

                {/* Main Steps */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                    {/* Step 1 - Core */}
                    <div style={{
                        background: 'white', border: '1px solid #E8E4DC',
                        borderRadius: 18, padding: '18px 16px',
                        display: 'flex', gap: 14, alignItems: 'flex-start',
                        boxShadow: '0 2px 8px rgba(79,138,139,0.08)'
                    }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: 'linear-gradient(135deg, #4F8A8B, #3d7a7f)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, fontSize: 20
                        }}>📏</div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 10, fontWeight: 800, color: '#4F8A8B', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Step 1</p>
                            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1F2937', marginBottom: 5, lineHeight: 1.3 }}>
                                {t('guideStep1Title')}
                            </h3>
                            <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7 }}>
                                {t('guideStep1Desc')}
                            </p>
                        </div>
                    </div>

                    {/* Step 2 - Optional (subtle) */}
                    <div style={{
                        background: '#FAFAFA', border: '1px dashed #E0DBD3',
                        borderRadius: 18, padding: '14px 16px',
                        display: 'flex', gap: 14, alignItems: 'flex-start',
                    }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 10,
                            background: '#F0EBE3',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, fontSize: 18
                        }}>🏷️</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Step 2</p>
                                <span style={{
                                    fontSize: 9, fontWeight: 700, background: '#F0EBE3',
                                    color: '#9CA3AF', padding: '1px 6px', borderRadius: 20
                                }}>任意</span>
                            </div>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#6B7280', marginBottom: 4, lineHeight: 1.3 }}>
                                {t('guideStep2Title')}
                            </h3>
                            <p style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.6 }}>
                                {t('guideStep2Desc')}
                            </p>
                        </div>
                    </div>

                    {/* Step 3 - Core */}
                    <div style={{
                        background: 'white', border: '1px solid #E8E4DC',
                        borderRadius: 18, padding: '18px 16px',
                        display: 'flex', gap: 14, alignItems: 'flex-start',
                        boxShadow: '0 2px 8px rgba(79,138,139,0.08)'
                    }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, fontSize: 20
                        }}>✨</div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 10, fontWeight: 800, color: '#8B5CF6', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Step 3</p>
                            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1F2937', marginBottom: 5, lineHeight: 1.3 }}>
                                {t('guideStep3Title')}
                            </h3>
                            <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7 }}>
                                {t('guideStep3Desc')}
                            </p>
                        </div>
                    </div>

                    {/* Step 4 - Core */}
                    <div style={{
                        background: 'white', border: '1px solid #E8E4DC',
                        borderRadius: 18, padding: '18px 16px',
                        display: 'flex', gap: 14, alignItems: 'flex-start',
                        boxShadow: '0 2px 8px rgba(79,138,139,0.08)'
                    }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: 'linear-gradient(135deg, #EC4899, #F43F5E)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, fontSize: 20
                        }}>🌸</div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 10, fontWeight: 800, color: '#EC4899', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Step 4</p>
                            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1F2937', marginBottom: 5, lineHeight: 1.3 }}>
                                {t('guideStep4Title')}
                            </h3>
                            <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7 }}>
                                {t('guideStep4Desc')}
                            </p>
                        </div>
                    </div>

                </div>

                {/* Footer tip */}
                <div style={{
                    marginTop: 24, padding: '14px 16px',
                    background: '#F0F9F9', borderRadius: 14,
                    border: '1px solid #D1EAE8',
                    textAlign: 'center'
                }}>
                    <p style={{ fontSize: 12, color: '#4F8A8B', fontWeight: 600, lineHeight: 1.7 }}>
                        💡 サイズ情報の登録がなくても、クローゼットとギャラリーはご利用いただけます。まずは気軽にスタートしてみてください！
                    </p>
                </div>

            </div>
        </div>
    );
};

export default Guide;
