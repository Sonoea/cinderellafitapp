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

const AppealCard = ({ title, desc, icon: Icon, color }) => (
    <div className="hover-scale" style={{
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '32px',
        padding: '24px',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
        flex: 1,
        minWidth: '240px'
    }}>
        <div style={{
            width: '48px', height: '48px', borderRadius: '16px',
            background: `${color}11`, color: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '16px'
        }}>
            <Icon size={24} strokeWidth={2.5} />
        </div>
        <h4 style={{ fontSize: '16px', fontWeight: 950, color: '#111827', marginBottom: '8px' }}>{title}</h4>
        <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6 }}>{desc}</p>
    </div>
);

const Guide = () => {
    const { t } = useApp();
    const navigate = useNavigate();

    const appeals = [
        { icon: Sparkles, color: '#4F8A8B', title: t('guideAppeal1Title'), desc: t('guideAppeal1Desc') },
        { icon: Heart, color: '#8B5CF6', title: t('guideAppeal2Title'), desc: t('guideAppeal2Desc') },
        { icon: BookOpen, color: '#EC4899', title: t('guideAppeal3Title'), desc: t('guideAppeal3Desc') }
    ];

    const steps = [
        {
            number: 1,
            color: '#4F8A8B',
            icon: Ruler,
            title: t('guideStep1Title'),
            subTitle: "すべての物語の始まり",
            desc: "身長と胴囲が分かれば、90%以上の服でサイズ違いを防げます。こだわりたい時は、首周りや着丈も加えてさらに精度を高めましょう。",
            tips: [
                "『身長・胴囲』の2項目だけで、90%以上の服が正しく判定可能です",
                "ぬいぐるみの最もふっくらな部分（お腹まわり等）を、メジャーを浮かさず測るのがコツです",
                "お手持ちの予備の服を測って、そのサイズをご自身のぬいぐるみの項目に入力するのもおすすめです"
            ]
        },
        {
            number: 2,
            color: '#8B5CF6',
            icon: Tag,
            title: t('guideStep2Title'),
            subTitle: "あなただけの宝物箱",
            desc: "お気に入りのコーディネートを、自分だけの特別なクローゼットに保存しましょう。お気に入りのぬいぐるみとの思い出を、美しくコレクションして楽しむことができます。",
            tips: [
                "お気に入りの写真と思い出を、自分だけの特別なクローゼットに大切に残しましょう",
                "クローゼットに並んだ服は、いつでも自由に着せ替える気分で眺めることができます",
                "棚をタップしてアイテムを移動させる瞬間は、まるで実際の家具を整理しているような心地よさです"
            ]
        },
        {
            number: 3,
            color: '#F59E0B',
            icon: Share2,
            title: t('guideStep3Title'),
            subTitle: "世界中とインスピレーションを循環させる",
            desc: "一つの型紙から無限の「個性」と「物語」が紡がれます。 型紙と作品が繋がることで、アイデアが循環し、次の一着への創造力を刺激する。 手から手へと想いが広がる新しいコミュニティを目指しています。",
            tips: [
                "型紙投稿から広がる『みんなの製作レポート』は、コミュニティの新しい楽しみ方です",
                "購入したショップのURLを貼ることで、他の人がすぐに同じ服を探せます",
                "『この服は着せるのが大変だった』などのリアルな感想も大切です"
            ],
            highlight: true
        },
        {
            number: 4,
            color: '#EC4899',
            icon: Sparkles,
            title: t('guideStep4Title'),
            subTitle: "究極のシンデレラフィットを",
            desc: "ギャラリーで「自分と同じサイズ」フィルターをON！前後±1cmのマッチングで、他の人の着こなしを参考にしながら、失敗しない服選びが可能です。",
            tips: [
                "ギャラリーの『自分と同じサイズ』フィルターを使いましょう",
                "お気に入りの投稿を見つけたら、参考URLからショップへ飛んで購入してもいいでしょう",
                "『製作レポート』を見れば、同じ型紙でも生地やアレンジでどう変わるか参考になります"
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

            <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
                {/* Hero */}
                <div style={{ textAlign: 'center', marginBottom: '80px' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '24px',
                        background: 'linear-gradient(135deg, #4F8A8B, #EC4899)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', margin: '0 auto 24px',
                        boxShadow: '0 20px 40px rgba(79, 138, 139, 0.2)'
                    }}>
                        <Heart size={40} fill="white" />
                    </div>
                    <h2 style={{ fontSize: '36px', fontWeight: 950, color: '#111827', marginBottom: '16px', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
                        {t('guideHeroTitle') || "世界を繋ぐ、\n魔法のフィット。"}
                    </h2>
                    <p style={{ fontSize: '16px', color: '#6B7280', lineHeight: 1.6, maxWidth: '540px', margin: '0 auto' }}>
                        CinderellaFitは、サイズや洋服の管理という枠組みを超えて、<br />
                        あなたの大切な存在との想い出を形にし、<br />
                        世界中のオーナーとインスピレーションを分かち合う場所です。
                    </p>
                </div>

                {/* Appeal Section */}
                <div style={{ marginBottom: '80px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: 950, textAlign: 'center', marginBottom: '32px', color: '#111827' }}>
                        {t('guideAppealTitle')}
                    </h3>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        {appeals.map((appeal, i) => (
                            <AppealCard key={i} {...appeal} />
                        ))}
                    </div>
                </div>

                {/* Steps Section */}
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: 950, textAlign: 'center', marginBottom: '32px', color: '#111827' }}>
                        HOW TO USE
                    </h3>
                </div>
                <div style={{ position: 'relative', maxWidth: '640px', margin: '0 auto' }}>
                    {steps.map((step) => (
                        <GuideStep key={step.number} {...step} />
                    ))}
                </div>

                {/* Final Call */}
                <div style={{
                    marginTop: '80px',
                    padding: '60px 40px',
                    background: 'linear-gradient(145deg, #111827, #1f2937)',
                    borderRadius: '48px',
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
                        <h3 style={{ fontSize: '28px', fontWeight: 950, marginBottom: '16px' }}>
                            準備は整いました！
                        </h3>
                        <p style={{ fontSize: '16px', opacity: 0.8, lineHeight: 1.7, marginBottom: '40px', maxWidth: '440px', margin: '0 auto 40px' }}>
                            さあ、あなたとぬいぐるみの<br />
                            新しい物語をここから始めましょう。
                        </p>
                        <button 
                            onClick={() => navigate('/')}
                            style={{
                                width: '100%',
                                maxWidth: '320px',
                                background: '#fff',
                                color: '#111827',
                                padding: '20px',
                                borderRadius: '24px',
                                fontWeight: 900,
                                fontSize: '16px',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                margin: '0 auto'
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
