import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Sparkles, Shirt, ShoppingBag, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { STYLE_TYPES, getRecommendations } from '../data/mockItems';

const AIStylist = () => {
    const { t, plushies, language } = useApp();
    const navigate = useNavigate();

    const [step, setStep] = useState('select-plushie'); // 'select-plushie', 'select-style', 'generating', 'result'
    const [selectedPlushie, setSelectedPlushie] = useState(null);
    const [selectedStyle, setSelectedStyle] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
    const [error, setError] = useState(null);

    const styles = [
        { id: STYLE_TYPES.MODE, label: language === 'jp' ? 'モード' : 'Mode', icon: '🕶️', description: language === 'jp' ? '洗練されたクールなスタイル' : 'Cool & sophisticated' },
        { id: STYLE_TYPES.CASUAL, label: language === 'jp' ? 'カジュアル' : 'Casual', icon: '🧢', description: language === 'jp' ? '普段使いにぴったりのラフなスタイル' : 'Relaxed for everyday wear' },
        { id: STYLE_TYPES.FORMAL, label: language === 'jp' ? 'フォーマル' : 'Formal', icon: '👔', description: language === 'jp' ? '特別な日のおめかしスタイル' : 'Dressed up for special occasions' },
        { id: STYLE_TYPES.CUTE, label: language === 'jp' ? 'かわいい' : 'Cute', icon: '🎀', description: language === 'jp' ? '愛らしさ満点のキュートなスタイル' : 'Adorable and sweet' },
    ];

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [step]);

    const handleSelectPlushie = (plushie) => {
        setSelectedPlushie(plushie);
        setStep('select-style');
    };

    const handleSelectStyle = async (styleId) => {
        setSelectedStyle(styleId);
        setStep('generating');
        setError(null);

        try {
            // 1. Get recommendations
            const items = getRecommendations(selectedPlushie.measurements.height, styleId, 3);
            setRecommendations(items);

            // 2. Pick the primary item (top/set/dress) to use as the garment image
            const primaryItem = items.find(i => i.category === 'top' || i.category === 'set') || items[0];

            if (!primaryItem) {
                throw new Error("No items found for this style and size.");
            }

            // 3. Call backend API
            const apiUrl = import.meta.env.MODE === 'development'
                ? 'http://localhost:3001/api/ai-stylist-gen'
                : '/api/ai-stylist-gen';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plushieImage: selectedPlushie.image,
                    garmentImage: primaryItem.imageUrl,
                    styleLabel: styleId
                })
            });

            const data = await response.json();

            if (!data.success) {
                // Backend explicitly failed
                throw new Error(data.error || 'Failed to generate image');
            }

            if (data.warning) {
                // Backend succeeded but returned a warning (fallback mock image)
                setError(data.warning);
            } else {
                setError(null);
            }

            setGeneratedImageUrl(data.resultImage);
            setStep('result');

        } catch (err) {
            console.error('[AI Stylist] Error:', err);
            setError(err.message);
            // Fallback to mock image on hard network failure
            setGeneratedImageUrl(selectedPlushie.image);
            setStep('result');
        }
    };

    const resetFlow = () => {
        setSelectedPlushie(null);
        setSelectedStyle(null);
        setRecommendations([]);
        setGeneratedImageUrl(null);
        setError(null);
        setStep('select-plushie');
    };

    return (
        <div className="pb-24">
            <header className="flex justify-between items-center py-4 mb-4" style={{
                position: 'sticky',
                top: 0,
                backgroundColor: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(8px)',
                zIndex: 10,
                borderBottom: '1px solid var(--gray-100)'
            }}>
                <button
                    onClick={() => {
                        if (step === 'select-style') setStep('select-plushie');
                        else if (step === 'result') resetFlow();
                        else navigate(-1);
                    }}
                    style={{
                        padding: '8px',
                        borderRadius: 'full',
                        backgroundColor: 'var(--gray-50)',
                        color: 'var(--text-main)'
                    }}
                >
                    <ArrowLeft size={20} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={18} style={{ color: '#E8956A' }} />
                    <h1 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary-dark)', letterSpacing: '-0.02em' }}>
                        {language === 'jp' ? 'AIスタイリスト' : 'AI Stylist'}
                    </h1>
                </div>
                <div style={{ width: 36 }}></div> {/* Spacer for alignment */}
            </header>

            {/* STEP 1: Select Plushie */}
            {step === 'select-plushie' && (
                <div className="fade-in">
                    <div className="mb-6 text-center">
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
                            {language === 'jp' ? 'モデルを選ぶ' : 'Select a Model'}
                        </h2>
                        <p style={{ fontSize: '13px', color: 'var(--text-light)' }}>
                            {language === 'jp' ? 'コーディネートするぬいぐるみを選んでください' : 'Who are we styling today?'}
                        </p>
                    </div>

                    {plushies.length === 0 ? (
                        <div className="text-center p-8 bg-gray-50 rounded-2xl">
                            <p style={{ color: 'var(--text-light)', marginBottom: '16px' }}>
                                {language === 'jp' ? 'まだ登録されているぬいぐるみがありません。' : 'No plushies registered yet.'}
                            </p>
                            <button
                                onClick={() => navigate('/measure')}
                                className="button-primary w-full"
                            >
                                {t('addNew')}
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {plushies.map(plushie => (
                                <button
                                    key={plushie.id}
                                    onClick={() => handleSelectPlushie(plushie)}
                                    className="hover-scale"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        padding: '16px',
                                        backgroundColor: 'white',
                                        borderRadius: 'var(--radius-lg)',
                                        border: '1px solid var(--gray-200)',
                                        boxShadow: 'var(--shadow-sm)',
                                        textAlign: 'left',
                                        width: '100%'
                                    }}
                                >
                                    <img
                                        src={plushie.image}
                                        alt={plushie.name}
                                        style={{
                                            width: '64px',
                                            height: '64px',
                                            borderRadius: '50%',
                                            objectFit: 'cover',
                                            border: '2px solid var(--primary-light)'
                                        }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary-dark)', marginBottom: '4px' }}>
                                            {plushie.name}
                                        </h3>
                                        <p style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                                            {t('height')}: {plushie.measurements.height}cm / {t('waist')}: {plushie.measurements.waist}cm
                                        </p>
                                    </div>
                                    <div style={{ color: 'var(--primary)' }}>→</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* STEP 2: Select Style */}
            {step === 'select-style' && selectedPlushie && (
                <div className="fade-in">
                    <div className="mb-6 text-center">
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 16px',
                            backgroundColor: 'white',
                            borderRadius: '30px',
                            boxShadow: 'var(--shadow-sm)',
                            border: '1px solid var(--gray-100)',
                            marginBottom: '20px'
                        }}>
                            <img
                                src={selectedPlushie.image}
                                alt=""
                                style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                                {selectedPlushie.name}
                            </span>
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
                            {language === 'jp' ? 'どんな気分？' : 'What is the vibe?'}
                        </h2>
                        <p style={{ fontSize: '13px', color: 'var(--text-light)' }}>
                            {language === 'jp' ? '希望のコーディネートスタイルを選んでください' : 'Select a styling mood'}
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {styles.map(style => (
                            <button
                                key={style.id}
                                onClick={() => handleSelectStyle(style.id)}
                                className="hover-scale"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    padding: '24px 16px',
                                    backgroundColor: 'white',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '2px solid transparent',
                                    boxShadow: 'var(--shadow-sm)',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-light)'}
                                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                            >
                                <span style={{ fontSize: '32px', marginBottom: '12px', display: 'block' }}>
                                    {style.icon}
                                </span>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
                                    {style.label}
                                </h3>
                                <p style={{ fontSize: '10px', color: 'var(--text-light)', textAlign: 'center', lineHeight: '1.4' }}>
                                    {style.description}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* STEP 3: Generating */}
            {step === 'generating' && (
                <div className="fade-in flex flex-col items-center justify-center min-h-[50vh]">
                    <div style={{
                        position: 'relative',
                        width: '120px',
                        height: '120px',
                        marginBottom: '32px'
                    }}>
                        <div className="pulse-ring" style={{
                            position: 'absolute',
                            inset: 0,
                            border: '3px solid var(--primary-light)',
                            borderRadius: '50%',
                            animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
                        }}></div>
                        <img
                            src={selectedPlushie.image}
                            alt=""
                            style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '4px solid white',
                                boxShadow: 'var(--shadow-md)',
                                position: 'relative',
                                zIndex: 2
                            }}
                        />
                        <div style={{
                            position: 'absolute',
                            bottom: '-10px',
                            right: '-10px',
                            width: '44px',
                            height: '44px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 'var(--shadow-md)',
                            zIndex: 3,
                            color: '#E8956A'
                        }}>
                            <Sparkles size={24} className="animate-spin-slow" />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary-dark)', marginBottom: '8px' }}>
                        {language === 'jp' ? '最高のコーデを考案中...' : 'Styling your plushie...'}
                    </h2>
                    <p style={{ fontSize: '12px', color: 'var(--text-light)', textAlign: 'center', maxWidth: '280px' }}>
                        {language === 'jp'
                            ? 'AIがぴったりサイズの素敵なアイテムを選んで、試着画像を作成しています。'
                            : 'AI is hand-picking items that fit perfectly and generating a try-on look.'}
                    </p>
                </div>
            )}

            {/* STEP 4: Result */}
            {step === 'result' && (
                <div className="fade-in">
                    {error && (
                        <div style={{
                            backgroundColor: '#FEF2F2',
                            color: '#ef4444',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            marginBottom: '16px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            fontSize: '12px',
                            lineHeight: '1.4'
                        }}>
                            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div>
                                <strong>{language === 'jp' ? 'AI画像生成に失敗しました' : 'AI Generation Failed'}</strong><br />
                                {error}<br />
                                <span style={{ opacity: 0.8 }}>{language === 'jp' ? '※代わりにプレビュー画像を表示しています。' : '* Displaying a placeholder image instead.'}</span>
                            </div>
                        </div>
                    )}

                    {/* Visual Result */}
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                        boxShadow: 'var(--shadow-md)',
                        marginBottom: '24px',
                        border: '1px solid var(--gray-200)'
                    }}>
                        <div style={{
                            position: 'relative',
                            width: '100%',
                            aspectRatio: '3/4',
                            backgroundColor: 'var(--gray-100)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden'
                        }}>
                            {generatedImageUrl ? (
                                <img
                                    src={generatedImageUrl}
                                    alt="AI Generated Styling"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                    }}
                                    onError={(e) => {
                                        console.error("Image failed to load:", generatedImageUrl);
                                        e.target.style.display = 'none';
                                    }}
                                />
                            ) : null}
                            <div style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                backdropFilter: 'blur(4px)',
                                padding: '6px 12px',
                                borderRadius: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: 'var(--shadow-sm)'
                            }}>
                                <Sparkles size={14} style={{ color: '#E8956A' }} />
                                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)' }}>
                                    AI Generated
                                </span>
                            </div>
                        </div>

                        <div style={{ padding: '16px', borderTop: '1px solid var(--gray-100)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>
                                        {styles.find(s => s.id === selectedStyle)?.label} {language === 'jp' ? 'スタイル' : 'Style'}
                                    </h3>
                                    <p style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                                        Model: <span style={{ fontWeight: 600 }}>{selectedPlushie?.name}</span>
                                    </p>
                                </div>
                                <button
                                    onClick={resetFlow}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 16px',
                                        backgroundColor: 'var(--primary-light)',
                                        color: 'var(--primary-dark)',
                                        borderRadius: '20px',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <RefreshCw size={14} />
                                    {language === 'jp' ? 'もう一度' : 'Retry'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Physical Items Links */}
                    <div className="mb-8">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <ShoppingBag size={20} style={{ color: 'var(--primary)' }} />
                            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                                {language === 'jp' ? '使用したアイテム' : 'Items Used'}
                            </h3>
                        </div>

                        <p style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '16px', lineHeight: '1.5' }}>
                            {language === 'jp'
                                ? 'この画像に使用された、今すぐ購入可能な実在の商品です。ぬいぐるみのサイズに合わせてAIが厳選しました。'
                                : 'Real items used in this look. AI carefully selected these to fit your plushie.'}
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {recommendations.length > 0 ? (
                                recommendations.map(item => (
                                    <a
                                        key={item.id}
                                        href={item.purchaseUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover-scale"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '12px',
                                            backgroundColor: 'white',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--gray-200)',
                                            textDecoration: 'none',
                                            color: 'inherit',
                                            boxShadow: 'var(--shadow-sm)'
                                        }}
                                    >
                                        <img
                                            src={item.imageUrl}
                                            alt={item.name}
                                            style={{
                                                width: '60px',
                                                height: '60px',
                                                objectFit: 'cover',
                                                borderRadius: '8px',
                                                border: '1px solid var(--gray-100)',
                                                marginRight: '16px'
                                            }}
                                        />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: '600', marginBottom: '2px' }}>
                                                {item.shopName}
                                            </p>
                                            <h4 style={{
                                                fontSize: '14px',
                                                fontWeight: '700',
                                                color: 'var(--text-main)',
                                                marginBottom: '6px',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>
                                                {item.name}
                                            </h4>
                                            <p style={{ fontSize: '13px', fontWeight: '800', color: '#E8956A' }}>
                                                {item.price}
                                            </p>
                                        </div>
                                        <div style={{
                                            padding: '8px',
                                            backgroundColor: '#f8f9fa',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'var(--gray-400)'
                                        }}>
                                            <ExternalLink size={16} />
                                        </div>
                                    </a>
                                ))
                            ) : (
                                <p style={{ fontSize: '13px', color: 'var(--text-light)', textAlign: 'center', padding: '24px 0' }}>
                                    {language === 'jp' ? 'アイテムが見つかりませんでした。' : 'No items found.'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIStylist;
