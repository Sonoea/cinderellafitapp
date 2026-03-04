import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Move, ZoomIn, ZoomOut, RotateCw, Download, Eye } from 'lucide-react';

/**
 * VirtualFitting - ぬいぐるみに服のサイズ感をプレビューするコンポーネント
 * 
 * 機能:
 * - 商品画像をぬいぐるみに重ねて表示（サイズ感の参考）
 * - ドラッグで位置調整、サイズ・回転変更
 * - 透過度調整で重なり具合を確認
 * - 画像保存
 */
const VirtualFitting = ({ plushieImage, productImage, productName, fitStatus, plushieHeight, language = 'jp' }) => {
    const containerRef = useRef(null);
    const [clothingPos, setClothingPos] = useState({ x: 0, y: -10 });
    const [clothingScale, setClothingScale] = useState(0.55);
    const [clothingRotation, setClothingRotation] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [showReaction, setShowReaction] = useState(true);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [opacity, setOpacity] = useState(0.85);

    const t = useCallback((jp, en) => language === 'jp' ? jp : en, [language]);

    // フィットステータスに応じたリアクション — サイズチェッカーと統一（服の視点）
    const reactions = {
        perfect: { emoji: '✨', text: t('ぴったり！', 'Perfect fit!'), color: '#10b981', bg: '#ecfdf5' },
        caution: { emoji: '🤔', text: t('ギリギリかも', 'Might be marginal'), color: '#f59e0b', bg: '#fffbeb' },
        tight: { emoji: '😣', text: t('キツいかも', 'Might be tight'), color: '#ef4444', bg: '#fef2f2' },
        tooSmall: { emoji: '❌', text: t('入らないかも', "Won't fit (too small)"), color: '#dc2626', bg: '#fef2f2' },
        loose: { emoji: '😊', text: t('ブカブカかも', 'Might be loose'), color: '#f97316', bg: '#fff7ed' },
        tooBig: { emoji: '📏', text: t('大きすぎるかも', 'Way too big'), color: '#3b82f6', bg: '#eff6ff' },
        unknown: { emoji: '👀', text: t('サイズ感を確認してね', 'Check the sizing'), color: '#6b7280', bg: '#f9fafb' },
    };

    const reaction = reactions[fitStatus] || reactions.unknown;

    // ===== ドラッグ操作 =====
    const handlePointerDown = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
        setDragStart({
            x: clientX - clothingPos.x,
            y: clientY - clothingPos.y,
        });
    }, [clothingPos]);

    const handlePointerMove = useCallback((e) => {
        if (!isDragging) return;
        e.preventDefault();
        const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
        setClothingPos({
            x: clientX - dragStart.x,
            y: clientY - dragStart.y,
        });
    }, [isDragging, dragStart]);

    const handlePointerUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
            window.addEventListener('touchmove', handlePointerMove, { passive: false });
            window.addEventListener('touchend', handlePointerUp);
            return () => {
                window.removeEventListener('pointermove', handlePointerMove);
                window.removeEventListener('pointerup', handlePointerUp);
                window.removeEventListener('touchmove', handlePointerMove);
                window.removeEventListener('touchend', handlePointerUp);
            };
        }
    }, [isDragging, handlePointerMove, handlePointerUp]);

    // リアクションのアニメーション
    useEffect(() => {
        setShowReaction(true);
        const timeout = setTimeout(() => setShowReaction(false), 4000);
        return () => clearTimeout(timeout);
    }, [fitStatus]);

    // 画像リセット（商品画像が変わったら）
    useEffect(() => {
        setImageLoaded(false);
        setImageError(false);
    }, [productImage]);

    // ===== 画像の保存 =====
    const saveImage = useCallback(async () => {
        if (!containerRef.current) return;
        try {
            // html2canvas的なアプローチではなく、DOMをキャプチャ
            const canvas = document.createElement('canvas');
            const rect = containerRef.current.getBoundingClientRect();
            const scale = 2;
            canvas.width = rect.width * scale;
            canvas.height = rect.height * scale;
            const ctx = canvas.getContext('2d');
            ctx.scale(scale, scale);
            ctx.fillStyle = '#f3f4f6';
            ctx.fillRect(0, 0, rect.width, rect.height);

            // ぬいぐるみ画像
            const plushieImg = new Image();
            plushieImg.crossOrigin = 'anonymous';
            plushieImg.src = plushieImage;
            await new Promise(r => { plushieImg.onload = r; plushieImg.onerror = r; });

            const padding = 16;
            const availW = rect.width - padding * 2;
            const availH = rect.height - padding * 2;
            const pRatio = plushieImg.naturalWidth / plushieImg.naturalHeight;
            let pW, pH;
            if (pRatio > availW / availH) {
                pW = availW; pH = pW / pRatio;
            } else {
                pH = availH; pW = pH * pRatio;
            }
            ctx.drawImage(plushieImg, (rect.width - pW) / 2, (rect.height - pH) / 2, pW, pH);

            // ウォーターマーク
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('CinderellaFit ✨', rect.width - 8, rect.height - 8);

            const link = document.createElement('a');
            link.download = `fitting_${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Save failed:', err);
        }
    }, [plushieImage]);

    // リセット
    const resetPosition = useCallback(() => {
        setClothingPos({ x: 0, y: -10 });
        setClothingScale(0.55);
        setClothingRotation(0);
        setOpacity(0.85);
    }, []);

    // ===== 商品画像なし =====
    if (!productImage) {
        return (
            <div className="virtual-fitting-container">
                <div style={{
                    position: 'relative',
                    background: 'linear-gradient(to bottom, #f3f4f6, #ffffff)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: '2px solid #e5e7eb',
                    aspectRatio: '3/4',
                }}>
                    <img src={plushieImage} alt="plushie" style={{
                        width: '100%', height: '100%', objectFit: 'contain'
                    }} />
                    <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        pointerEvents: 'none'
                    }}>
                        <div style={{
                            background: 'rgba(255,255,255,0.92)', borderRadius: '12px',
                            padding: '16px 20px', textAlign: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxWidth: '80%'
                        }}>
                            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📷</div>
                            <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#374151', margin: 0 }}>
                                {t('商品画像が取得できませんでした', 'Product image not available')}
                            </p>
                            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0' }}>
                                {t('商品ページの画像形式によっては取得できない場合があります', 'Some product pages may not provide accessible images')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ===== メインUI =====
    return (
        <div className="virtual-fitting-container">
            {/* リアクションバナー */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 14px', borderRadius: '12px', marginBottom: '10px',
                background: reaction.bg,
                transition: 'all 0.5s',
                opacity: showReaction ? 1 : 0.7,
                transform: showReaction ? 'scale(1)' : 'scale(0.98)',
            }}>
                <span style={{ fontSize: '22px', animation: showReaction ? 'bounce 0.6s' : 'none' }}>{reaction.emoji}</span>
                <span style={{ fontWeight: 'bold', fontSize: '14px', color: reaction.color }}>
                    {reaction.text}
                </span>
                {productName && (
                    <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: 'auto', maxWidth: '40%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {productName}
                    </span>
                )}
            </div>

            {/* 試着プレビューエリア */}
            <div
                ref={containerRef}
                style={{
                    position: 'relative',
                    background: 'linear-gradient(to bottom, #f3f4f6, #ffffff)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: '2px solid #e5e7eb',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)',
                    aspectRatio: '3/4',
                    touchAction: 'none',
                    cursor: isDragging ? 'grabbing' : 'default',
                }}
            >
                {/* ぬいぐるみベース画像 */}
                <img
                    src={plushieImage}
                    alt="plushie"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />

                {/* 商品画像オーバーレイ — 通常の img タグで表示（CORSを回避）*/}
                {!imageError && (
                    <div
                        style={{
                            position: 'absolute',
                            left: '50%',
                            top: '42%',
                            transform: `translate(calc(-50% + ${clothingPos.x}px), calc(-50% + ${clothingPos.y}px)) scale(${clothingScale}) rotate(${clothingRotation}deg)`,
                            width: '70%',
                            zIndex: 10,
                            opacity: isDragging ? opacity * 0.7 : opacity,
                            cursor: 'grab',
                            transition: isDragging ? 'none' : 'opacity 0.2s',
                            filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.15))',
                        }}
                        onPointerDown={handlePointerDown}
                        onTouchStart={handlePointerDown}
                    >
                        <img
                            src={productImage}
                            alt={productName || 'clothing'}
                            style={{
                                width: '100%',
                                height: 'auto',
                                borderRadius: '10px',
                                display: imageLoaded ? 'block' : 'none',
                            }}
                            onLoad={() => setImageLoaded(true)}
                            onError={() => setImageError(true)}
                        />
                        {/* ローディング */}
                        {!imageLoaded && !imageError && (
                            <div style={{
                                width: '100%', aspectRatio: '1', borderRadius: '10px',
                                background: '#f3f4f6', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                            }}>
                                <div style={{
                                    width: '24px', height: '24px',
                                    border: '3px solid #6366f1',
                                    borderTopColor: 'transparent',
                                    borderRadius: '50%',
                                    animation: 'spin 0.8s linear infinite',
                                }} />
                            </div>
                        )}
                        {/* ドラッグハンドル */}
                        {imageLoaded && (
                            <div style={{
                                position: 'absolute', top: '-8px', right: '-8px',
                                width: '28px', height: '28px', borderRadius: '50%',
                                background: '#6366f1', color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                                border: '2px solid white',
                            }}>
                                <Move size={12} />
                            </div>
                        )}
                    </div>
                )}

                {/* 商品画像がロードエラー */}
                {imageError && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        pointerEvents: 'none',
                    }}>
                        <div style={{
                            background: 'rgba(255,255,255,0.92)', borderRadius: '12px',
                            padding: '16px', textAlign: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}>
                            <div style={{ fontSize: '20px', marginBottom: '6px' }}>🖼️</div>
                            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, fontWeight: 'bold' }}>
                                {t('外部サイトの画像を読み込めませんでした', 'Could not load external image')}
                            </p>
                        </div>
                    </div>
                )}

                {/* ドラッグヒント */}
                {imageLoaded && !isDragging && (
                    <div style={{
                        position: 'absolute', bottom: '10px', left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(0,0,0,0.55)', color: 'white',
                        fontSize: '11px', padding: '5px 12px', borderRadius: '20px',
                        backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        pointerEvents: 'none', zIndex: 15,
                    }}>
                        <Move size={12} />
                        {t('服をドラッグして位置調整', 'Drag clothing to adjust')}
                    </div>
                )}

                {/* グリッドオーバーレイ（ドラッグ中） */}
                {isDragging && (
                    <div style={{
                        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5,
                    }}>
                        <div style={{
                            width: '100%', height: '100%',
                            backgroundImage: 'linear-gradient(rgba(99,102,241,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.08) 1px, transparent 1px)',
                            backgroundSize: '25% 25%',
                        }} />
                        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'rgba(99,102,241,0.2)' }} />
                        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: 'rgba(99,102,241,0.2)' }} />
                    </div>
                )}
            </div>

            {/* コントロールパネル */}
            <div style={{
                marginTop: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px',
            }}>
                {/* スケール */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '3px',
                    background: '#f3f4f6', borderRadius: '12px', padding: '3px',
                }}>
                    <button onClick={() => setClothingScale(s => Math.max(0.2, s - 0.05))} style={controlBtnStyle}>
                        <ZoomOut size={14} />
                    </button>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', width: '36px', textAlign: 'center' }}>
                        {Math.round(clothingScale * 100)}%
                    </span>
                    <button onClick={() => setClothingScale(s => Math.min(1.5, s + 0.05))} style={controlBtnStyle}>
                        <ZoomIn size={14} />
                    </button>
                </div>

                {/* 回転 */}
                <button onClick={() => setClothingRotation(r => (r + 15) % 360)} style={{ ...controlBtnStyle, background: '#f3f4f6' }}>
                    <RotateCw size={15} />
                </button>

                {/* リセット */}
                <button onClick={resetPosition} style={{
                    ...controlBtnStyle, background: '#f3f4f6', width: 'auto', padding: '0 12px',
                    fontSize: '11px', fontWeight: 'bold', color: '#6b7280',
                }}>
                    {t('リセット', 'Reset')}
                </button>

                {/* 保存 */}
                <button onClick={saveImage} style={{
                    height: '34px', padding: '0 14px', borderRadius: '10px',
                    background: '#6366f1', color: 'white', border: 'none',
                    fontSize: '12px', fontWeight: 'bold', cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(99,102,241,0.3)',
                    display: 'flex', alignItems: 'center', gap: '5px',
                }}>
                    <Download size={13} />
                    {t('保存', 'Save')}
                </button>
            </div>

            {/* 透過度コントロール */}
            <div style={{
                marginTop: '8px', padding: '8px 12px',
                background: '#f9fafb', borderRadius: '10px',
                border: '1px solid #f3f4f6',
                display: 'flex', alignItems: 'center', gap: '8px',
            }}>
                <Eye size={13} style={{ color: '#9ca3af', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: '#9ca3af', flexShrink: 0 }}>
                    {t('透過度', 'Opacity')}
                </span>
                <input
                    type="range" min="0.2" max="1" step="0.05"
                    value={opacity}
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    style={{ flex: 1, height: '4px', accentColor: '#6366f1' }}
                />
                <span style={{ fontSize: '10px', color: '#9ca3af', width: '28px', textAlign: 'right' }}>
                    {Math.round(opacity * 100)}%
                </span>
            </div>

            {/* 注意書き */}
            <p style={{
                fontSize: '10px', color: '#b0b0b0', textAlign: 'center',
                marginTop: '8px', lineHeight: 1.4
            }}>
                {t(
                    '※ 商品画像の重ね合わせによるサイズ感のイメージです。実際の着用感とは異なる場合があります。',
                    '※ This is a size reference overlay. Actual fit may differ.'
                )}
            </p>

            {/* CSS animations */}
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
            `}</style>
        </div>
    );
};

// ボタン共通スタイル
const controlBtnStyle = {
    width: '34px', height: '34px', borderRadius: '10px',
    background: 'white', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    color: '#374151',
};

export default VirtualFitting;
