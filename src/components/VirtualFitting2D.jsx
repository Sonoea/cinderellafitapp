import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, RotateCw, Move } from 'lucide-react';

const VirtualFitting2D = ({
    plushieImage,
    productImage,
    productName,
    language = 'ja'
}) => {
    // 衣服の配置状態
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);

    // ドラッグ状態
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const containerRef = useRef(null);
    const clothRef = useRef(null);

    // 翻訳ヘルパー
    const t = useCallback((key) => {
        const texts = {
            jp: {
                size: 'サイズ・拡大縮小',
                angle: '傾き・角度',
                hint: '服をドラッグして位置を調整できます',
            },
            en: {
                size: 'Size / Scale',
                angle: 'Tilt / Rotation',
                hint: 'Drag the clothing to adjust position',
            }
        };
        // languageがjpかjaかenなどをよしなに処理
        const langKey = language === 'en' ? 'en' : 'jp';
        return texts[langKey]?.[key] || texts.jp[key];
    }, [language]);

    // リセット用
    const resetTransform = () => {
        setPosition({ x: 0, y: 0 });
        setScale(1.0);
        setRotation(0);
    };

    // 初期化時のリセット（画像が変わった時）
    useEffect(() => {
        resetTransform();
    }, [productImage, plushieImage]);

    // マウス/タッチドラッグのハンドラ
    const handlePointerDown = (e) => {
        setIsDragging(true);
        // クライアント座標を取得（タッチとマウス両対応）
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        setDragStart({
            x: clientX - position.x,
            y: clientY - position.y
        });

        // デフォルトのドラッグ挙動をキャンセル（スマホスクロール防止）
        if (e.cancelable) e.preventDefault();
    };

    const handlePointerMove = (e) => {
        if (!isDragging) return;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        setPosition({
            x: clientX - dragStart.x,
            y: clientY - dragStart.y
        });
    };

    const handlePointerUp = () => {
        setIsDragging(false);
    };

    return (
        <div className="flex flex-col gap-4">
            {/* プレビュー枠 */}
            <div
                ref={containerRef}
                className="relative w-full bg-gray-50 rounded-xl overflow-hidden shadow-inner border border-gray-200"
                style={{ aspectRatio: '4/5', minHeight: '350px', touchAction: 'none' }} // インラインスタイルで強制的に高さを確保する
            >
                {/* ぬいぐるみのベース画像 */}
                {plushieImage ? (
                    <img
                        src={plushieImage}
                        alt="Plushie Base"
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        {language === 'ja' ? 'ぬいぐるみの画像がありません' : 'No plushie image'}
                    </div>
                )}

                {/* 操作ヒントのオーバーレイ */}
                <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none z-20">
                    <div className="bg-black/50 backdrop-blur-sm text-white text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5">
                        <Move size={12} />
                        {t('hint')}
                    </div>
                </div>

                {/* 商品（服）の画像（オーバーレイ合成） */}
                {productImage && (
                    <div
                        className="absolute inset-0 w-full h-full flex items-center justify-center overflow-visible"
                        onMouseDown={handlePointerDown}
                        onMouseMove={handlePointerMove}
                        onMouseUp={handlePointerUp}
                        onMouseLeave={handlePointerUp}
                        onTouchStart={handlePointerDown}
                        onTouchMove={handlePointerMove}
                        onTouchEnd={handlePointerUp}
                    >
                        <img
                            ref={clothRef}
                            src={productImage}
                            alt={productName || "Clothing"}
                            className="w-[60%] object-contain" // 初期サイズを少し小さく
                            style={{
                                transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                                transformOrigin: 'center center',
                                cursor: isDragging ? 'grabbing' : 'grab',
                                // 背景をそのまま不透明なシールとして表示し、常に最上位にする
                                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                                position: 'relative',
                                zIndex: 10
                            }}
                            draggable="false" // ブラウザデフォルトの画像ドラッグを無効化
                        />
                    </div>
                )}
            </div>

            {/* 操作コントローラー */}
            <div className="bg-gray-50 p-4 rounded-xl space-y-4 text-sm mt-2 border border-gray-100">
                {/* スケールスライダー */}
                <div className="flex items-center gap-3">
                    <div className="text-gray-500 w-6 flex justify-center">
                        <ZoomIn size={16} />
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>縮小</span>
                            <span className="font-bold text-gray-600">{t('size')}</span>
                            <span>拡大</span>
                        </div>
                        <input
                            type="range"
                            min="0.3"
                            max="2.5"
                            step="0.05"
                            value={scale}
                            onChange={(e) => setScale(parseFloat(e.target.value))}
                            className="w-full accent-indigo-500"
                        />
                    </div>
                </div>

                {/* 回転スライダー */}
                <div className="flex items-center gap-3">
                    <div className="text-gray-500 w-6 flex justify-center">
                        <RotateCw size={16} />
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>左回転</span>
                            <span className="font-bold text-gray-600">{t('angle')}</span>
                            <span>右回転</span>
                        </div>
                        <input
                            type="range"
                            min="-45"
                            max="45"
                            step="1"
                            value={rotation}
                            onChange={(e) => setRotation(parseFloat(e.target.value))}
                            className="w-full accent-indigo-500"
                        />
                    </div>
                </div>

                {/* リセットボタン（変更がある場合のみ表示） */}
                {(position.x !== 0 || position.y !== 0 || scale !== 1 || rotation !== 0) && (
                    <div className="flex justify-end pt-2">
                        <button
                            onClick={resetTransform}
                            className="text-xs text-indigo-500 hover:text-indigo-700 font-medium px-3 py-1 bg-indigo-50 rounded-full transition-colors"
                        >
                            {language === 'ja' ? '初期位置に戻す' : 'Reset Position'}
                        </button>
                    </div>
                )}
            </div>

            <div className="text-[10px] text-gray-400 text-center px-4 leading-relaxed">
                ※画像は平面合成のため、服飾本来の立体感とは見え方が異なる場合があります。
            </div>
        </div>
    );
};

export default VirtualFitting2D;
