import React, { useState, useEffect } from 'react';

const VirtualFitting2D = ({
    plushieImage,
    productImage,
    productName,
    language = 'ja'
}) => {
    // Canvas処理後の背景透過画像URL
    const [processedProductUrl, setProcessedProductUrl] = useState(null);

    // Canvasによる高精度な白背景透過処理 (ルマキー合成アルゴリズム)
    useEffect(() => {
        if (!productImage) return;

        const img = new Image();
        img.crossOrigin = 'Anonymous'; // CORS対策
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // RGBの各値がすべて閾値以上の「明るいピクセル（白・薄いグレー系背景）」を対象とする
            // Tighter threshold to catch off-white backgrounds
            const threshold = 200;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];

                if (a > 0) {
                    if (r > threshold && g > threshold && b > threshold) {
                        const luma = (r + g + b) / 3;
                        // Background pixels: make them fully transparent
                        data[i + 3] = 0;
                    }
                }
            }

            ctx.putImageData(imageData, 0, 0);
            setProcessedProductUrl(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
            console.error("Failed to load product image for processing, falling back to original");
            setProcessedProductUrl(productImage);
        };
        img.src = productImage;

    }, [productImage]);

    return (
        <div className="flex flex-col gap-4">
            {/* プレビュー枠 */}
            <div
                className="relative w-full bg-white rounded-xl overflow-hidden shadow-inner flex items-center justify-center p-4"
                style={{ aspectRatio: '1/1', maxHeight: '400px', touchAction: 'none' }}
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

                {/* 自動調整された商品（服）の画像（オーバーレイ合成） */}
                {processedProductUrl && (
                    <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center pointer-events-none">
                        {/* 服を少し下げて顔を隠さないようにする */}
                        <div style={{ transform: 'translateY(15%)' }}>
                            <img
                                src={processedProductUrl}
                                alt={productName || "Clothing"}
                                className="object-contain"
                                style={{
                                    width: '240px', // ぬいぐるみのサイズに合わせて固定
                                    height: 'auto',
                                    position: 'relative',
                                    zIndex: 10,
                                    // Canvasで抜けきらなかった薄いグレー等を強制的に飛ばすための安全弁
                                    mixBlendMode: 'darken',
                                    filter: 'drop-shadow(0px 8px 12px rgba(0,0,0,0.15)) brightness(1.05)', // 立体感と明るさ補正
                                }}
                                draggable="false"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="text-[10px] text-gray-400 text-center px-4 leading-relaxed bg-gray-50 py-3 rounded-lg border border-gray-100">
                ※システムがサイズに合わせて自動フィッティングを行いました。<br />
                平面合成のため、本来の立体感とは見え方が異なります。
            </div>
        </div>
    );
};

export default VirtualFitting2D;
