
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ExternalLink, Search, CheckCircle, AlertTriangle, XCircle, ChevronDown, Ruler, ShoppingBag, FileText, Copy, HelpCircle, X } from 'lucide-react';

import { translations } from '../translations';
import VirtualFitting3D from '../components/VirtualFitting3D';

// 開発環境ではVercel本番APIに直接リクエスト、本番では相対パス
const API_BASE = import.meta.env.DEV ? 'https://cinderellafitapp.vercel.app' : '';

const Shop = () => {
    const { plushies, language, t } = useApp();

    const [selectedId, setSelectedId] = useState(plushies[0]?.id || null);
    const [url, setUrl] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isEditingSize, setIsEditingSize] = useState(false); // Toggle to show manual input when result is present

    // Analyzed product state
    const [product, setProduct] = useState(null);
    const [productTargetSize, setProductTargetSize] = useState(''); // e.g., "15" or "10-20"
    const [productSizeMin, setProductSizeMin] = useState(0);
    const [productSizeMax, setProductSizeMax] = useState(0);

    // Manual input state
    const [showManualInput, setShowManualInput] = useState(false);
    const [manualText, setManualText] = useState('');
    const [manualProductName, setManualProductName] = useState('');
    const [showUrlHint, setShowUrlHint] = useState(false);
    const [inputMode, setInputMode] = useState('url');
    const [photoImage, setPhotoImage] = useState(null);
    const [photoProductName, setPhotoProductName] = useState('');
    const [photoSizeNeck, setPhotoSizeNeck] = useState('');
    const [photoSizeWaist, setPhotoSizeWaist] = useState('');
    const [photoSizeLength, setPhotoSizeLength] = useState('');


    const selectedPlushie = plushies.find(p => p.id === selectedId);
    const plushieHeight = selectedPlushie?.measurements?.height || 0;

    // Calculate fit status — 「服がぬいぐるみに対してどうか」の視点で統一
    const getFitStatus = () => {
        if (!product || (productSizeMin === 0 && productSizeMax === 0)) {
            return { status: 'unknown', label: t('fitStatus.unknown'), color: 'gray', icon: AlertTriangle };
        }

        const min = productSizeMin || productSizeMax;
        const max = productSizeMax || productSizeMin;
        const diff = plushieHeight - max; // positive = plushie bigger than product

        if (plushieHeight >= min && plushieHeight <= max) {
            return { status: 'perfect', label: t('fitStatus.perfect'), color: 'green', icon: CheckCircle };
        } else if (plushieHeight > max) {
            // ぬいぐるみが大きい → 服が小さい/キツい
            if (diff > 5) {
                return { status: 'tooSmall', label: t('fitStatus.tooSmall'), color: 'red', icon: XCircle };
            }
            return { status: 'tight', label: t('fitStatus.tight'), color: 'orange', icon: AlertTriangle };
        } else {
            // ぬいぐるみが小さい → 服が大きい/ブカブカ
            const gap = min - plushieHeight;
            if (gap > 5) {
                return { status: 'tooBig', label: t('fitStatus.tooBig'), color: 'red', icon: XCircle };
            }
            return { status: 'loose', label: t('fitStatus.loose'), color: 'yellow', icon: AlertTriangle };
        }
    };

    const fitStatus = getFitStatus();

    const handleAnalyzeUrl = async () => {
        if (!url.trim()) return;

        setIsAnalyzing(true);
        setProduct(null);
        setProductSizeMin(0);
        setProductSizeMax(0);
        setProductTargetSize('');
        setIsEditingSize(false);

        try {
            const response = await fetch(`${API_BASE}/api/analyze-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url,
                    plushieHeight,
                    plushieInfo: selectedPlushie?.measurements || {}, // Send full plushie details
                    lang: language
                }),
            });

            if (!response.ok) {
                console.error(`API Error: ${response.status} ${response.statusText} `);

                if (response.status === 422) {
                    const errData = await response.json();
                    if (errData.error === 'MERCARI_SHOPS_NOT_SUPPORTED') {
                        throw new Error(errData.message + t('mercariNotSupported'));
                    }
                }

                if (response.status === 504) {
                    throw new Error('タイムアウトしました（Amazonの応答が遅いため中断されました）');
                }
                throw new Error(`サーバーエラー: ${response.status} `);
            }

            const data = await response.json();
            setIsAnalyzing(false);

            if (data.success) {
                // Extract size info
                const sizeInfo = data.sizeInfo;
                let detectedMin = 0;
                let detectedMax = 0;
                let sizeText = '';

                if (sizeInfo.targetPlushieSize) {
                    detectedMin = sizeInfo.targetPlushieSize;
                    detectedMax = sizeInfo.targetPlushieSize;
                    sizeText = `${sizeInfo.targetPlushieSize} cm用`;
                } else if (sizeInfo.sizeRanges.length > 0) {
                    detectedMin = sizeInfo.sizeRanges[0].min;
                    detectedMax = sizeInfo.sizeRanges[0].max;
                    sizeText = `${detectedMin}〜${detectedMax} cm`;
                } else if (sizeInfo.dimensions.length > 0) {
                    const dim = sizeInfo.dimensions[0];
                    sizeText = `縦${dim.length} cm × 横${dim.width} cm`;
                } else if (sizeInfo.measurements) {
                    // Fallback to specific measurements if available
                    const parts = [];
                    // Helper to format measurement values safely
                    const fmt = (v) => {
                        if (!v) return null;
                        if (typeof v === 'object' && (v.min !== undefined || v.max !== undefined)) {
                            const min = v.min || v.max;
                            const max = v.max || v.min;
                            return min === max ? `${min} cm` : `${min}〜${max} cm`;
                        }
                        return `${v} cm`;
                    };

                    if (sizeInfo.measurements.length) parts.push(`着丈${fmt(sizeInfo.measurements.length)} `);
                    if (sizeInfo.measurements.head) parts.push(`頭囲${fmt(sizeInfo.measurements.head)} `);
                    if (sizeInfo.measurements.neck) parts.push(`首まわり${fmt(sizeInfo.measurements.neck)} `);

                    if (parts.length > 0) {
                        sizeText = parts.join(', ');
                        // If length is available, we might use it as a rough proxy for min size if nothing else exists
                        if (sizeInfo.measurements.length && !detectedMin) {
                            // detectedMin = sizeInfo.measurements.length; // Optional: don't auto-set min/max from dimensions alone to avoid confusion
                        }
                    }
                }

                if (!sizeText && sizeInfo.rawMatches.length > 0) {
                    // Use the most common size found
                    const sizes = sizeInfo.rawMatches.filter(s => s >= 5 && s <= 50);
                    if (sizes.length > 0) {
                        detectedMin = Math.min(...sizes);
                        detectedMax = Math.max(...sizes);
                        sizeText = sizes.length > 1 ? `${detectedMin}〜${detectedMax} cm` : `${detectedMin} cm`;
                    }
                }

                setProductSizeMin(detectedMin);
                setProductSizeMax(detectedMax);
                setProductTargetSize(sizeText);

                setProduct({
                    url: url,
                    name: data.product?.title || t('productPlaceholder'),
                    description: data.product?.description,
                    image: data.product?.image,
                    originalImageUrl: data.product?.image,
                    detectedSize: sizeText,
                    fit: data.fit,
                    rawSizeInfo: sizeInfo,
                });

                // Proxy external image for VirtualFitting (bypass CORS)
                if (data.product?.image) {
                    try {
                        const proxyRes = await fetch(`${API_BASE}/api/proxy-image?url=${encodeURIComponent(data.product.image)}`);
                        const proxyData = await proxyRes.json();
                        if (proxyData.success && proxyData.dataUri) {
                            setProduct(prev => ({ ...prev, image: proxyData.dataUri }));
                        }
                    } catch (e) {
                        console.log('Image proxy failed, using original URL:', e.message);
                    }
                }

            } else {
                // API failed but might have URL analysis
                if (data.urlAnalysis && data.urlAnalysis.rawMatches.length > 0) {
                    const sizes = data.urlAnalysis.rawMatches;
                    setProductSizeMin(Math.min(...sizes));
                    setProductSizeMax(Math.max(...sizes));
                    setProductTargetSize(`${sizes[0]} cm(URLから推定)`);
                }

                setProduct({
                    url: url,
                    name: '商品',
                    detectedSize: '',
                    error: data.error,
                });
            }

        } catch (error) {
            setIsAnalyzing(false);
            console.error('API Error:', error);

            // Fallback to URL-only analysis
            const lowerUrl = url.toLowerCase();
            const singleSizeMatch = lowerUrl.match(/(\d{1,2})\s*cm/);

            if (singleSizeMatch) {
                const size = parseInt(singleSizeMatch[1]);
                setProductSizeMin(size);
                setProductSizeMax(size);
                setProductTargetSize(`${size} cm(URLから推定)`);
            }

            setProduct({
                url: url,
                name: t('productPlaceholder'),
                detectedSize: '',
                error: error.message || t('serverError'),
            });
        }
    };

    const handleSizeInput = (value) => {
        setProductTargetSize(value);

        // Parse input - support formats like "15", "15cm", "10-20", "10〜20cm"
        const rangeMatch = value.match(/(\d{1,2})\s*(?:cm)?[-〜~]?\s*(\d{1,2})?/);
        if (rangeMatch) {
            const min = parseInt(rangeMatch[1]) || 0;
            const max = parseInt(rangeMatch[2]) || min;
            setProductSizeMin(min);
            setProductSizeMax(max);
        }
    };

    // Handle manual text analysis (when URL fetch fails)
    const handleManualTextAnalysis = async () => {
        if (!manualText.trim()) return;

        setIsAnalyzing(true);
        setProduct(null);
        setProductSizeMin(0);
        setProductSizeMax(0);
        setProductTargetSize('');

        try {
            const response = await fetch(`${API_BASE}/api/analyze-text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: manualText,
                    productName: manualProductName,
                    plushieHeight,
                    lang: language
                }),
            });

            const data = await response.json();
            setIsAnalyzing(false);

            if (data.success) {
                const sizeInfo = data.sizeInfo;
                let detectedMin = 0;
                let detectedMax = 0;
                let sizeText = '';

                if (sizeInfo.targetPlushieSize) {
                    detectedMin = sizeInfo.targetPlushieSize;
                    detectedMax = sizeInfo.targetPlushieSize;
                    sizeText = `${sizeInfo.targetPlushieSize} cm用`;
                } else if (sizeInfo.sizeRanges.length > 0) {
                    detectedMin = sizeInfo.sizeRanges[0].min;
                    detectedMax = sizeInfo.sizeRanges[0].max;
                    sizeText = `${detectedMin}〜${detectedMax} cm`;
                } else if (sizeInfo.rawMatches.length > 0) {
                    const sizes = sizeInfo.rawMatches.filter(s => s >= 5 && s <= 50);
                    if (sizes.length > 0) {
                        detectedMin = Math.min(...sizes);
                        detectedMax = Math.max(...sizes);
                        sizeText = sizes.length > 1 ? `${detectedMin}〜${detectedMax} cm` : `${detectedMin} cm`;
                    }
                }

                setProductSizeMin(detectedMin);
                setProductSizeMax(detectedMax);
                setProductTargetSize(sizeText);

                setProduct({
                    url: url || null,
                    name: manualProductName || t('productPlaceholder'),
                    description: manualText.substring(0, 200),
                    image: null,
                    detectedSize: sizeText,
                    fit: data.fit,
                    rawSizeInfo: sizeInfo,
                    source: 'manual',
                });

                // Reset manual input form
                setShowManualInput(false);
            } else {
                setProduct({
                    url: null,
                    name: manualProductName || t('productPlaceholder'),
                    error: data.error || t('aiTryonGenericError'),
                });
            }
        } catch (error) {
            setIsAnalyzing(false);
            console.error('API Error:', error);
            setProduct({
                url: null,
                name: '商品',
                error: 'サーバーに接続できませんでした。',
            });
        }
    };

    const colorClasses = {
        green: 'bg-green-100 border-green-500 text-green-700',
        yellow: 'bg-yellow-100 border-yellow-500 text-yellow-700',
        orange: 'bg-orange-100 border-orange-500 text-orange-700',
        red: 'bg-red-100 border-red-500 text-red-700',
        gray: 'bg-gray-100 border-gray-400 text-gray-600'
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white" style={{ paddingBottom: '120px' }}>
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-10 py-4 px-4 shadow-sm border-b border-gray-100">
                <h1 className="text-xl font-black text-gray-800 flex items-center gap-2">
                    <ShoppingBag size={24} className="text-primary" />
                    {t('boutique')}
                </h1>
                <p className="text-xs text-gray-500 mt-1">{t('shopSubtitle')}</p>
            </div>

            <div className="p-4 flex flex-col gap-6">

                {/* Step 1: Select Plushie */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">1</div>
                        <h2 className="font-bold text-gray-800">{t('step1Title')}</h2>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                        {plushies.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setSelectedId(p.id)}
                                className={`flex flex - col items - center gap - 1 p - 3 rounded - xl border - 2 transition - all min - w - [80px] ${selectedId === p.id
                                    ? 'bg-primary text-white border-primary shadow-md scale-105'
                                    : 'bg-gray-50 border-transparent hover:border-gray-200 text-gray-700'
                                    } `}
                            >
                                <div className="w-12 h-12 rounded-full bg-white overflow-hidden border border-gray-200">
                                    <img src={p.image} className="w-full h-full object-cover" alt="" />
                                </div>
                                <span className={`text - xs font - bold ${selectedId === p.id ? 'text-white' : 'text-gray-700'} `}>{p.name}</span>
                                <span className={`text - [10px] ${selectedId === p.id ? 'text-white/80' : 'text-gray-500'} `}>{p.measurements?.height}cm</span>
                            </button>
                        ))}
                    </div>

                    {selectedPlushie && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-xl flex items-center gap-3">
                            <Ruler size={18} className="text-gray-400" />
                            <div>
                                <span className="text-sm font-bold text-gray-700">{selectedPlushie.name}</span>
                                <span className="text-sm text-gray-500"> {t('height')}: </span>
                                <span className="text-lg font-black text-primary">{plushieHeight}cm</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Step 2: Enter Product URL */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">2</div>
                        <h2 className="font-bold text-gray-800">{t('step2Title')}</h2>
                        <button
                            onClick={() => setShowUrlHint(!showUrlHint)}
                            className="ml-auto p-1 text-gray-400 hover:text-primary transition"
                            title={t('urlHintButton')}
                        >
                            <HelpCircle size={18} />
                        </button>
                    </div>

                    {/* 入力モードタブ */}
                    <div className="flex gap-1 mb-3 bg-gray-100 rounded-xl p-1">
                        <button
                            onClick={() => setInputMode('url')}
                            className={`flex - 1 py - 2 px - 3 rounded - lg text - xs font - bold transition ${inputMode === 'url' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'} `}
                        >
                            🔗 {t('urlInputMode')}
                        </button>
                        <button
                            onClick={() => setInputMode('photo')}
                            className={`flex - 1 py - 2 px - 3 rounded - lg text - xs font - bold transition ${inputMode === 'photo' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'} `}
                        >
                            📷 {t('photoInputMode')}
                        </button>
                    </div>

                    {/* --- URL入力モード --- */}
                    {inputMode === 'url' && (
                        <div>
                            {/* URL Hint Tooltip */}
                            {showUrlHint && (
                                <div className="mb-3 p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs relative fade-in">
                                    <button
                                        onClick={() => setShowUrlHint(false)}
                                        className="absolute top-2 right-2 text-blue-400 hover:text-blue-600"
                                    >
                                        <X size={14} />
                                    </button>
                                    <p className="font-bold text-blue-700 mb-2">{t('urlHintTitle')}</p>
                                    <ul className="text-blue-600 space-y-1">
                                        {(t('urlHintList') || []).map((hint, i) => (
                                            <li key={i}>{hint}</li>
                                        ))}
                                    </ul>
                                    <p className="mt-2 text-blue-500">
                                        {t('urlHintSupported')}
                                    </p>
                                    <p className="text-blue-400">
                                        {t('urlHintCaution')}
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder={t('urlInputPlaceholder')}
                                    className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                />
                                <button
                                    onClick={handleAnalyzeUrl}
                                    disabled={isAnalyzing || !url.trim()}
                                    className="px-4 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isAnalyzing ? (
                                        <span className="animate-spin">⏳</span>
                                    ) : (
                                        <Search size={18} />
                                    )}
                                </button>
                            </div>

                            <p className="text-[10px] text-gray-400 mt-2">
                                {t('plushieClothesPageUrl')}
                            </p>


                            {/* Manual Input Toggle Button */}
                            <button
                                onClick={() => setShowManualInput(!showManualInput)}
                                className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 py-2 border border-primary/30 rounded-xl hover:bg-primary/5 transition"
                            >
                                <FileText size={16} />
                                {showManualInput ? t('manualInputButtonOpen') : t('manualInputButtonClosed')}
                            </button>

                            {/* Manual Input Section (Collapsible) */}
                            {showManualInput && (
                                <div className="mt-3 p-3 bg-yellow-50 rounded-xl border border-yellow-200 fade-in">
                                    <p className="text-xs text-yellow-700 mb-2 font-bold flex items-center gap-1">
                                        <Copy size={12} />
                                        {t('manualInputTitle')}
                                    </p>
                                    <p className="text-[10px] text-yellow-600 mb-3">
                                        {t('manualInputDesc')}
                                    </p>

                                    <input
                                        type="text"
                                        value={manualProductName}
                                        onChange={(e) => setManualProductName(e.target.value)}
                                        placeholder={t('manualProductNamePlaceholder')}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    />

                                    <textarea
                                        value={manualText}
                                        onChange={(e) => setManualText(e.target.value)}
                                        placeholder={t('manualTextPlaceholder')}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg h-32 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    />

                                    <button
                                        onClick={handleManualTextAnalysis}
                                        disabled={isAnalyzing || !manualText.trim()}
                                        className="mt-2 w-full px-4 py-3 bg-yellow-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isAnalyzing ? (
                                            <span className="animate-spin">⏳</span>
                                        ) : (
                                            <>
                                                <Search size={16} />
                                                {t('analyzeTextBtn')}
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- 写真入力モード --- */}
                    {inputMode === 'photo' && (
                        <div className="space-y-3">
                            {/* 商品写真アップロード */}
                            <div className="border-2 border-dashed border-purple-300 rounded-xl p-4 text-center bg-purple-50/50">
                                {photoImage ? (
                                    <div className="relative">
                                        <img src={photoImage} alt={t('productPlaceholder')} className="max-h-48 mx-auto rounded-lg object-contain" />
                                        <button onClick={() => setPhotoImage(null)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">✕</button>
                                        <p className="text-[10px] text-green-600 mt-1 font-bold">✅ {t('photoSelected')}</p>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="text-3xl mb-2">📷</div>
                                        <p className="text-xs text-purple-700 font-bold mb-2">{t('uploadProductPhoto')}</p>
                                        <div className="flex gap-2 justify-center">
                                            <label className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-purple-700 transition">
                                                {t('takePhoto')}
                                                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const img = new Image();
                                                        img.onload = () => {
                                                            const canvas = document.createElement('canvas');
                                                            const maxSize = 800;
                                                            let w = img.width, h = img.height;
                                                            if (w > maxSize || h > maxSize) { if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; } else { w = Math.round(w * maxSize / h); h = maxSize; } }
                                                            canvas.width = w; canvas.height = h;
                                                            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                                                            setPhotoImage(canvas.toDataURL('image/jpeg', 0.8));
                                                        };
                                                        img.src = URL.createObjectURL(file);
                                                    }
                                                }} />
                                            </label>
                                            <label className="px-4 py-2 bg-white text-purple-600 border border-purple-300 rounded-lg text-xs font-bold cursor-pointer hover:bg-purple-50 transition">
                                                {t('selectFromAlbum')}
                                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const img = new Image();
                                                        img.onload = () => {
                                                            const canvas = document.createElement('canvas');
                                                            const maxSize = 800;
                                                            let w = img.width, h = img.height;
                                                            if (w > maxSize || h > maxSize) { if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; } else { w = Math.round(w * maxSize / h); h = maxSize; } }
                                                            canvas.width = w; canvas.height = h;
                                                            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                                                            setPhotoImage(canvas.toDataURL('image/jpeg', 0.8));
                                                        };
                                                        img.src = URL.createObjectURL(file);
                                                    }
                                                }} />
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 商品名 */}
                            <input type="text" value={photoProductName} onChange={(e) => setPhotoProductName(e.target.value)} placeholder={t('productNamePlaceholder')} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300" />

                            {/* サイズ入力 */}
                            <div className="bg-gray-50 rounded-xl p-3">
                                <p className="text-xs font-bold text-gray-700 mb-2">📏 {t('sizeInfoTitleRaw')}</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="text-[10px] text-gray-500 block mb-1">{t('neckLabel')}(cm)</label>
                                        <input type="number" value={photoSizeNeck} onChange={(e) => setPhotoSizeNeck(e.target.value)} placeholder="例: 11" className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 block mb-1">{t('waistLabel')}(cm)</label>
                                        <input type="number" value={photoSizeWaist} onChange={(e) => setPhotoSizeWaist(e.target.value)} placeholder="例: 13" className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 block mb-1">{t('lengthLabel')}(cm)</label>
                                        <input type="number" value={photoSizeLength} onChange={(e) => setPhotoSizeLength(e.target.value)} placeholder="例: 10" className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300" />
                                    </div>
                                </div>
                            </div>

                            {/* 分析ボタン */}
                            <button
                                onClick={() => {
                                    if (!photoImage) return;
                                    const neck = parseFloat(photoSizeNeck) || 0;
                                    const waist = parseFloat(photoSizeWaist) || 0;
                                    const length = parseFloat(photoSizeLength) || 0;
                                    const sizeInfo = { targetPlushieSize: 0, sizeRanges: [], dimensions: neck || waist || length ? [{ neck, width: waist, length, itemLength: length }] : [], measurements: { neck, waist, length }, clothingType: 'tops' };
                                    if (waist > 0) { const estimated = Math.round(waist / Math.PI * 2 * 3); setProductSizeMin(Math.max(estimated - 3, 5)); setProductSizeMax(estimated + 3); setProductTargetSize(`${estimated} cm ${t('estimatedLabel')}`); }
                                    setProduct({ url: null, name: photoProductName || t('productPlaceholder'), description: `${t('neck')}:${neck || '不明'}cm ${t('waist')}:${waist || '不明'}cm ${t('length')}:${length || '不明'} cm`, image: photoImage, originalImageUrl: null, detectedSize: waist ? `${t('waist')}${waist} cm` : '', rawSizeInfo: sizeInfo });
                                    setAiTryonResult(null); setAiTryonError(null);
                                }}
                                disabled={!photoImage}
                                className="w-full py-3 rounded-xl font-bold text-white text-sm"
                                style={{ background: photoImage ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' : '#d1d5db', cursor: photoImage ? 'pointer' : 'not-allowed' }}
                            >
                                {photoImage ? '✨ この写真で分析する' : '📷 先に写真をアップしてください'}
                            </button>
                        </div>
                    )}

                </div>

                {/* Step 3: Enter/Confirm Size */}
                {product && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 fade-in">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">3</div>
                            <h2 className="font-bold text-gray-800">{t('step3Title')}</h2>
                        </div>

                        {/* Product Info (if available) */}
                        {(product.name !== '商品' || product.image) && (
                            <div className="flex gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
                                {product.image && (
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                                        onError={(e) => e.target.style.display = 'none'}
                                    />
                                )}
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-800 text-sm line-clamp-2">{product.name}</h3>
                                    {product.description && (
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {product.error && (
                            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                                <p className="text-sm text-yellow-700">⚠️ {product.error}</p>
                            </div>
                        )}

                        {/* AI Fit Analysis (from backend) */}
                        {product.fit && (
                            <div className={`mb - 4 p - 4 rounded - xl border - 2 ${product.fit.status === 'perfect' ? 'bg-green-50 border-green-400' :
                                product.fit.status === 'caution' ? 'bg-yellow-50 border-yellow-400' :
                                    product.fit.status === 'tight' || product.fit.status === 'tooSmall' ? 'bg-red-50 border-red-400' :
                                        product.fit.status === 'loose' || product.fit.status === 'tooBig' ? 'bg-orange-50 border-orange-400' :
                                            'bg-gray-50 border-gray-300'
                                } `}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl">
                                        {product.fit.status === 'perfect' ? '✅' :
                                            product.fit.status === 'caution' ? '⚠️' :
                                                product.fit.status === 'tight' || product.fit.status === 'tooSmall' ? '❌' :
                                                    product.fit.status === 'loose' || product.fit.status === 'tooBig' ? '⚠️' : '❓'}
                                    </span>
                                    <span className={`font - bold ${product.fit.status === 'perfect' ? 'text-green-700' :
                                        product.fit.status === 'caution' ? 'text-yellow-700' :
                                            product.fit.status === 'tight' || product.fit.status === 'tooSmall' ? 'text-red-700' :
                                                product.fit.status === 'loose' || product.fit.status === 'tooBig' ? 'text-orange-700' :
                                                    'text-gray-700'
                                        } `}>
                                        {product.fit.status === 'perfect' ? t('fitStatus.perfect') :
                                            product.fit.status === 'caution' ? t('fitStatus.marginal') :
                                                product.fit.status === 'tight' ? t('fitStatus.tooSmall') :
                                                    product.fit.status === 'tooSmall' ? t('fitStatus.tooSmall') :
                                                        product.fit.status === 'loose' ? t('fitStatus.tooLarge') :
                                                            product.fit.status === 'tooBig' ? t('fitStatus.tooLarge') : t('fitStatus.unknown')}
                                    </span>
                                    <span className={`text - xs px - 2 py - 0.5 rounded - full ${product.fit.confidence === 'high' ? 'bg-green-200 text-green-800' :
                                        product.fit.confidence === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                                            'bg-gray-200 text-gray-600'
                                        } `}>
                                        {product.fit.confidence === 'high' ? t('confidenceHigh') :
                                            product.fit.confidence === 'medium' ? t('confidenceMedium') : t('confidenceLow')}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600">{product.fit.reason}</p>

                                {/* Warnings Section */}
                                {product.fit.warnings && product.fit.warnings.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                        <p className="text-xs font-bold text-orange-700 mb-1 flex items-center gap-1">
                                            <AlertTriangle size={12} /> {t('warnings')}
                                        </p>
                                        <ul className="text-xs text-gray-600 space-y-1">
                                            {product.fit.warnings.map((warning, i) => (
                                                <li key={i} className="flex items-start gap-1">
                                                    <span className="text-orange-500">•</span>
                                                    <span>{warning}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Detailed Part Checks */}
                                {product.fit.checkPoints && product.fit.checkPoints.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                        <p className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                                            <Search size={12} /> {t('checkPoints')}
                                        </p>
                                        <ul className="text-xs text-gray-600 space-y-1">
                                            {product.fit.checkPoints.map((point, i) => (
                                                <li key={i} className="flex items-start gap-1">
                                                    <span>{point.status === 'ok' ? '✅' : '⚠️'}</span>
                                                    <span className={point.status === 'ok' ? 'text-green-700' : 'text-orange-700 font-bold'}>
                                                        {point.msg}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Detailed Measurements (if available) */}
                                {product.fit.details?.measurements && (
                                    Object.values(product.fit.details.measurements).some(v => v !== null) && (
                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                            <p className="text-xs font-bold text-gray-700 mb-1">📐 {t('detectedDimensions')}</p>
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                {/* Helper for rendering measurements safely */}
                                                {(() => {
                                                    const formatVal = (v) => {
                                                        if (typeof v === 'object' && v !== null && (v.min !== undefined || v.max !== undefined)) {
                                                            const min = v.min || v.max;
                                                            const max = v.max || v.min;
                                                            return min === max ? `${min} ` : `${min}〜${max} `;
                                                        }
                                                        return v;
                                                    };

                                                    return (
                                                        <>
                                                            {product.fit.details.measurements.neck && (
                                                                <span className="px-2 py-1 bg-white rounded border">{t('neck')}: {formatVal(product.fit.details.measurements.neck)}cm</span>
                                                            )}
                                                            {product.fit.details.measurements.chest && (
                                                                <span className="px-2 py-1 bg-white rounded border">{t('waist')}: {formatVal(product.fit.details.measurements.chest)}cm</span>
                                                            )}
                                                            {product.fit.details.measurements.bodyWidth && (
                                                                <span className="px-2 py-1 bg-white rounded border">{t('bodyWidth')}: {formatVal(product.fit.details.measurements.bodyWidth)}cm</span>
                                                            )}
                                                            {product.fit.details.measurements.length && (
                                                                <span className="px-2 py-1 bg-white rounded border">{t('length')}: {formatVal(product.fit.details.measurements.length)}cm</span>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    )
                                )}

                                <button
                                    onClick={() => setIsEditingSize(!isEditingSize)}
                                    className="text-xs text-gray-400 underline mt-4 hover:text-gray-600 w-full text-right"
                                >
                                    {isEditingSize ? t('cancelEdit') : t('editSize')}
                                </button>
                            </div>
                        )}

                        {/* Manual Size Input (Hidden if perfect fit found, unless editing) */}
                        {(!product.fit || isEditingSize) && (
                            <>
                                <div className="mb-4 fade-in">
                                    <label className="text-xs text-gray-500 mb-1 block">
                                        {product.detectedSize ? t('editSizeInputLabel') : t('manualSizeInputLabel')}
                                    </label>
                                    <div className="flex gap-2 items-center">
                                        <input
                                            type="text"
                                            value={productTargetSize}
                                            onChange={(e) => handleSizeInput(e.target.value)}
                                            placeholder="ぬいぐるみの身長 例: 15 または 10-20"
                                            className="flex-1 px-4 py-3 text-lg font-bold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                        />
                                        <span className="text-gray-500 font-bold">cm</span>
                                    </div>

                                    {/* Input Feedback */}
                                    {productSizeMin > 0 ? (
                                        <div className="mt-2 flex items-center justify-between bg-blue-50 px-3 py-2 rounded-lg fade-in">
                                            <p className="text-xs text-blue-700 font-bold flex items-center gap-1">
                                                <CheckCircle size={14} className="fill-blue-200" />
                                                {t('sizeReflected')}
                                            </p>
                                            <span className={`text - xs font - black px - 2 py - 0.5 rounded ${fitStatus.color === 'green' ? 'bg-green-100 text-green-700' :
                                                fitStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                                                    fitStatus.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                                                        fitStatus.color === 'red' ? 'bg-red-100 text-red-700' :
                                                            'bg-gray-100 text-gray-700'
                                                } `}>
                                                {t('currentFit')} {fitStatus.label}
                                            </span>
                                        </div>
                                    ) : (
                                        product.detectedSize && (
                                            <p className="text-xs text-green-600 mt-1">
                                                ✓ {t('autoDetected')} {product.detectedSize}
                                            </p>
                                        )
                                    )}
                                </div>

                                {/* Size Comparison Visual */}
                                <div className={`p - 4 rounded - xl border - 2 transition - colors duration - 500 ${colorClasses[fitStatus.color]} `}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <fitStatus.icon size={24} />
                                            <span className="text-xl font-black">{fitStatus.label}</span>
                                        </div>
                                    </div>

                                    {/* Visual Size Bar */}
                                    <div className="bg-white/80 rounded-lg p-3">
                                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                                            <span>0cm</span>
                                            <span>25cm</span>
                                            <span>50cm</span>
                                        </div>
                                        <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
                                            {/* Product Range */}
                                            {productSizeMin > 0 && (
                                                <div
                                                    className="absolute h-full bg-blue-300 rounded-full"
                                                    style={{
                                                        left: `${(productSizeMin / 50) * 100}% `,
                                                        width: `${((productSizeMax - productSizeMin + 1) / 50) * 100}% `
                                                    }}
                                                />
                                            )}
                                            {/* Plushie Marker */}
                                            <div
                                                className={`absolute top - 1 / 2 - translate - y - 1 / 2 w - 5 h - 5 rounded - full border - 2 border - white shadow - lg ${fitStatus.color === 'green' ? 'bg-green-500' :
                                                    fitStatus.color === 'yellow' ? 'bg-yellow-500' :
                                                        fitStatus.color === 'orange' ? 'bg-orange-500' :
                                                            fitStatus.color === 'red' ? 'bg-red-500' : 'bg-gray-500'
                                                    } `}
                                                style={{
                                                    left: `calc(${Math.min(100, Math.max(0, (plushieHeight / 50) * 100))} % - 10px)`
                                                }}
                                            />
                                        </div>
                                        <div className="flex justify-between items-center mt-2 text-sm">
                                            <div className="flex items-center gap-1">
                                                <div className="w-3 h-3 rounded bg-blue-300"></div>
                                                <span className="text-gray-600">{t('productTarget')} {productSizeMin}〜{productSizeMax}cm</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className={`w - 3 h - 3 rounded ${fitStatus.color === 'green' ? 'bg-green-500' :
                                                    fitStatus.color === 'yellow' ? 'bg-yellow-500' :
                                                        fitStatus.color === 'orange' ? 'bg-orange-500' :
                                                            fitStatus.color === 'red' ? 'bg-red-500' : 'bg-gray-500'
                                                    } `}></div>
                                                <span className="text-gray-600">{selectedPlushie?.name}: {plushieHeight}cm</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Judgment Criteria Guide */}
                        <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <details className="text-xs text-gray-500">
                                <summary className="cursor-pointer font-bold flex items-center gap-1 hover:text-gray-700">
                                    <AlertTriangle size={12} />
                                    {t('fitCriteriaTitle')}
                                </summary>
                                <div className="mt-2 space-y-1 pl-4 border-l-2 border-gray-200">
                                    <p>{t('fitCriteria.perfect')}</p>
                                    <p>{t('fitCriteria.marginal')}</p>
                                    <p>{t('fitCriteria.ng')}</p>
                                    <p className="mt-1 text-[10px] text-gray-400">{t('fitCriteria.note')}</p>
                                </div>
                            </details>
                        </div>
                    </div>
                )}

                {/* 3D着せ替えプレビュー (商品カラー抽出シミュレーション) */}
                {product && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 fade-in">
                        <VirtualFitting3D
                            plushie={selectedPlushie}
                            product={product}
                            isInteractive={true}
                        />
                    </div>
                )}

                {/* Step 4: Action Buttons */}
                {product && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 fade-in">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">4</div>
                            <h2 className="font-bold text-gray-800">{t('step4Title')}</h2>
                        </div>

                        <div className="flex flex-col gap-3">

                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 bg-black text-white px-6 py-4 rounded-xl font-bold text-base shadow-lg hover:bg-gray-800 transition"
                            >
                                <ShoppingBag size={20} />
                                {t('openProductPage')}
                                <ExternalLink size={16} />
                            </a>

                            <button
                                onClick={() => {
                                    setProduct(null);
                                    setUrl('');
                                    setProductTargetSize('');
                                    setProductSizeMin(0);
                                    setProductSizeMax(0);
                                }}
                                className="text-sm text-gray-500 underline"
                            >
                                {t('checkAnotherItem')}
                            </button>
                        </div>
                    </div>
                )}




                {/* Tips Section */}
                {!product && (
                    <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                        <h3 className="font-bold text-blue-800 mb-2">{t('usageHintsTitle')}</h3>
                        <ul className="text-sm text-blue-700 space-y-1">
                            {(t('usageHintsList') || []).map((hint, i) => (
                                <li key={i}>{hint}</li>
                            ))}
                        </ul>
                    </div>
                )}

            </div>
        </div>
    );
};

export default Shop;
