import React from 'react';
import { ArrowLeft, BookOpen, Ruler, Tag, Share2, Sparkles, CheckCircle2, ChevronRight, Info, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const GuideStep = ({ number, title, subTitle, desc, icon: Icon, color, tips = [], highlight = false }) => (
    <div className="hover-scale" style={{
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '32px',
        padding: '32px',
        marginBottom: '24px',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        boxShadow: highlight ? '0 20px 40px rgba(0,0,0,0.05)' : '0 10px 30px rgba(0,0,0,0.02)',
        position: 'relative',
        overflow: 'hidden'
    }}>
        {/* Decorative elements */}
        <div style={{
            position: 'absolute', top: '-20px', right: '-20px',
            width: '100px', height: '100px',
            background: `radial-gradient(circle, ${color}11 0%, transparent 70%)`,
            zIndex: 0
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', position: 'relative', zIndex: 1 }}>
            <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '18px',
                background: highlight ? `linear-gradient(135deg, ${color}, #fff)` : 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: highlight ? 'white' : color,
                boxShadow: highlight ? `0 12px 24px ${color}44` : '0 4px 12px rgba(0,0,0,0.05)',
                flexShrink: 0
            }}>
                <Icon size={28} strokeWidth={2.5} />
            </div>
            
            <div style={{ flex: 1 }}>
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ 
                            fontSize: '12px', 
                            fontWeight: 900, 
                            color: color, 
                            letterSpacing: '0.15em',
                            opacity: 0.8
                        }}>STEP {number}</span>
                        {highlight && (
                            <span style={{ 
                                fontSize: '10px', 
                                fontWeight: 800, 
                                background: color, 
                                color: 'white', 
                                padding: '2px 8px', 
                                borderRadius: '10px'
                            }}>COMMUNITY</span>
                        )}
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: 950, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                        {title}
                    </h3>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: color, marginTop: '2px', opacity: 0.9 }}>
                        {subTitle}
                    </p>
                </div>
                
                <p style={{ fontSize: '15px', color: '#4B5563', lineHeight: 1.8, marginBottom: '20px' }}>
                    {desc}
                </p>

                {tips.length > 0 && (
                    <div style={{ 
                        background: 'rgba(0,0,0,0.02)', 
                        borderRadius: '20px', 
                        padding: '20px',
                        border: '1px solid rgba(0,0,0,0.03)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#374151' }}>
                            <Info size={14} style={{ color: color }} />
                            <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Success Tips</span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {tips.map((tip, i) => (
                                <li key={i} style={{ 
                                    fontSize: '13px', 
                                    color: '#6B7280', 
                                    lineHeight: 1.6,
                                    display: 'flex',
                                    gap: '8px'
                                }}>
                                    <span style={{ color: color, fontWeight: 900 }}>•</span>
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    </div>
);

const Guide = () => {
    const { t } = useApp();
    const navigate = useNavigate();

    const steps = [
        {
            number: 1,
            color: '#4F8A8B',
            icon: Ruler,
            title: t('guideStep1Title'),
            subTitle: "すべての物語の始まり",
            desc: t('guideStep1Desc'),
            tips: [
                "『身長と胴囲』だけで、90%以上の服でサイズ違いを防ぐことができます",
                "ぬいぐるみの最も太い部分（お腹まわりなど）をメジャーを浮かさず測りましょう",
                "首周りや着丈も登録すると、ボタンの留めやすさまで予測できる『究極のフィット』に繋がります"
            ]
        },
        {
            number: 2,
            color: '#8B5CF6',
            icon: Tag,
            title: t('guideStep2Title'),
            subTitle: "あなただけの宝物箱（任意）",
            desc: t('guideStep2Desc'),
            tips: [
                "「サイズ」だけでなく、お気に入りの「写真」と思い出を自分だけの高級ワードローブに残しましょう",
                "クローゼットに並んだ服は、いつでも自由に着せ替える気分で眺めることができます",
                "サイズ入力は任意ですので、まずは思い出のコレクションから始めてみてください"
            ]
        },
        {
            number: 3,
            color: '#F59E0B',
            icon: Share2,
            title: t('guideStep4Title'),
            subTitle: "世界中のオーナーと繋がる",
            desc: t('guideStep4Desc'),
            tips: [
                "購入したショップのURLを貼ることで、他の人がすぐに同じ服を探せます",
                "『この服は着せるのが大変だった』などのリアルな感想も大切です",
                "公開設定をONにすることで、あなたのセンスが世界のギャラリーに並びます"
            ],
            highlight: true
        },
        {
            number: 4,
            color: '#EC4899',
            icon: Sparkles,
            title: t('guideStep3Title'),
            subTitle: "究極のシンデレラフィットを",
            desc: t('guideStep3Desc'),
            tips: [
                "ギャラリーの『自分と同じサイズ』フィルターを真っ先に使いましょう",
                "お気に入りの投稿を見つけたら、参考URLからショップへ飛んで購入できます",
                "他の人の着こなしを参考に、新しいスタイルに挑戦してみましょう！"
            ]
        }
    ];

    return (
        <div style={{
            minHeight: '100vh',
            background: '#FAFAFA',
            backgroundAttachment: 'fixed',
            backgroundImage: `
                radial-gradient(at 0% 0%, rgba(79, 138, 139, 0.05) 0px, transparent 50%),
                radial-gradient(at 100% 100%, rgba(236, 72, 153, 0.05) 0px, transparent 50%)
            `,
            paddingBottom: '10rem'
        }}>
            {/* Header */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 100,
                background: 'rgba(250, 250, 250, 0.8)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
            }}>
                <button onClick={() => navigate(-1)} style={{
                    width: '44px', height: '44px', borderRadius: '14px',
                    border: '1px solid rgba(0,0,0,0.05)', background: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                    <ArrowLeft size={20} color="#111827" />
                </button>
                <div style={{ flex: 1, textAlign: 'center', paddingRight: '44px' }}>
                    <h1 style={{ fontSize: '18px', fontWeight: 950, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                        {t('guideTitle')}
                    </h1>
                </div>
            </header>

            <div style={{ padding: '40px 20px', maxWidth: '640px', margin: '0 auto' }}>
                {/* Hero */}
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '24px',
                        background: 'linear-gradient(135deg, #4F8A8B, #EC4899)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', margin: '0 auto 24px',
                        boxShadow: '0 20px 40px rgba(79, 138, 139, 0.2)'
                    }}>
                        <Heart size={40} fill="white" />
                    </div>
                    <h2 style={{ fontSize: '32px', fontWeight: 950, color: '#111827', marginBottom: '16px', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
                        {t('guideHeroTitle') || "世界を繋ぐ、\n魔法のフィット。"}
                    </h2>
                    <p style={{ fontSize: '16px', color: '#6B7280', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto', whiteSpace: 'pre-wrap' }}>
                        {t('guideIntro')}
                    </p>
                </div>

                {/* Steps */}
                <div style={{ position: 'relative' }}>
                    {steps.map((step) => (
                        <GuideStep key={step.number} {...step} />
                    ))}
                </div>

                {/* Final Call */}
                <div style={{
                    marginTop: '60px',
                    padding: '40px',
                    background: 'linear-gradient(145deg, #111827, #1f2937)',
                    borderRadius: '40px',
                    textAlign: 'center',
                    color: 'white',
                    boxShadow: '0 30px 60px rgba(0,0,0,0.15)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
                        background: 'radial-gradient(circle at 100% 0%, rgba(79, 138, 139, 0.2) 0%, transparent 50%)',
                        zIndex: 0
                    }} />
                    
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <h3 style={{ fontSize: '24px', fontWeight: 950, marginBottom: '12px' }}>
                            準備は整いました！
                        </h3>
                        <p style={{ fontSize: '15px', opacity: 0.8, lineHeight: 1.7, marginBottom: '32px' }}>
                            {t('guideFooterTip') || "さあ、あなたとぬいぐるみの新しい物語を始めましょう。"}
                        </p>
                        <button 
                            onClick={() => navigate('/')}
                            style={{
                                width: '100%',
                                background: '#fff',
                                color: '#111827',
                                padding: '20px',
                                borderRadius: '20px',
                                fontWeight: 900,
                                fontSize: '16px',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px'
                            }}
                            className="hover-scale"
                        >
                            ホームへ戻る
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Guide;
