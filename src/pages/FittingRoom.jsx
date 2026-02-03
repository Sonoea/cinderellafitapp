import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Move, RotateCw, ZoomIn, ZoomOut, Save, X, RotateCcw, ExternalLink, Box } from 'lucide-react';
import ThreeDView from '../components/ThreeDView';
import { CLOTHING_OVERLAYS } from '../components/ClothingOverlays';

const FittingRoom = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const { t } = useApp();
    const { plushie, product } = state || {};

    // View Mode: '2d' or '3d'
    const [viewMode, setViewMode] = useState('2d');

    // Simple transform state for the clothing item layer
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.7, rotate: 0 });
    const [blendMode, setBlendMode] = useState(() =>
        product?.id?.toString().startsWith('custom-url-') ? 'multiply' : 'normal'
    );
    const [opacity, setOpacity] = useState(0.95);

    const containerRef = useRef(null);
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (!plushie || !product) {
            navigate('/shop');
        }
    }, [plushie, product, navigate]);

    if (!plushie || !product) return null;

    // Touch/Mouse Handlers for Dragging
    const handlePointerDown = (e) => {
        if (viewMode === '3d') return; // Disable 2D drag in 3D mode
        isDragging.current = true;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        dragStart.current = { x: clientX - transform.x, y: clientY - transform.y };
    };

    const handlePointerMove = (e) => {
        if (!isDragging.current || viewMode === '3d') return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        setTransform(prev => ({
            ...prev,
            x: clientX - dragStart.current.x,
            y: clientY - dragStart.current.y
        }));
    };

    const handlePointerUp = () => {
        isDragging.current = false;
    };

    // Adjustments
    const adjust = (type, val) => {
        setTransform(prev => {
            if (type === 'scale') return { ...prev, scale: Math.max(0.2, prev.scale + val) };
            if (type === 'rotate') return { ...prev, rotate: prev.rotate + val };
            return prev;
        });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] fade-in bg-gray-900 absolute inset-0 z-50">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 text-white bg-gradient-to-b from-black/50 to-transparent">
                <button onClick={() => navigate(-1)} className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                    <X size={20} />
                </button>

                {/* View Switcher */}
                <div className="flex bg-black/30 rounded-full p-1 backdrop-blur-md">
                    <button
                        onClick={() => setViewMode('2d')}
                        className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${viewMode === '2d' ? 'bg-white text-black shadow-sm' : 'text-white/70'}`}
                    >
                        2D
                    </button>
                    <button
                        onClick={() => setViewMode('3d')}
                        className={`px-4 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${viewMode === '3d' ? 'bg-primary text-white shadow-sm' : 'text-white/70'}`}
                    >
                        <Box size={12} /> 3D
                    </button>
                </div>

                <button className="p-2 bg-primary rounded-full shadow-lg text-white">
                    <Save size={20} />
                </button>
            </div>

            {/* Size Fit Indicator Panel */}
            {(() => {
                const plushieHeight = plushie?.measurements?.height || 0;
                const productMinH = product?.minH || 0;
                const productMaxH = product?.maxH || 50;
                const productWidth = product?.width || null;
                const productLength = product?.length || null;


                let fitColor = 'gray';
                let fitLabel = 'サイズ不明';
                let fitIcon = '❓';

                if (plushieHeight > 0) {
                    if (plushieHeight >= productMinH && plushieHeight <= productMaxH) {
                        fitColor = 'green';
                        fitLabel = 'ぴったり！';
                        fitIcon = '✓';
                    } else if (plushieHeight >= productMinH - 3 && plushieHeight <= productMaxH + 3) {
                        fitColor = 'yellow';
                        fitLabel = 'ギリギリ';
                        fitIcon = '△';
                    } else if (plushieHeight < productMinH) {
                        fitColor = 'red';
                        fitLabel = 'ブカブカ';
                        fitIcon = '↓';
                    } else {
                        fitColor = 'red';
                        fitLabel = 'キツイ';
                        fitIcon = '↑';
                    }
                }

                const colorClasses = {
                    green: 'bg-green-500 border-green-400 text-white',
                    yellow: 'bg-yellow-500 border-yellow-400 text-black',
                    red: 'bg-red-500 border-red-400 text-white',
                    gray: 'bg-gray-500 border-gray-400 text-white'
                };

                return (
                    <div className="absolute top-16 left-4 right-4 z-20 pointer-events-none">
                        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-white/50 pointer-events-auto">
                            <div className="flex items-center justify-between gap-4">
                                {/* Plushie Size */}
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">ぬいぐるみ</span>
                                    <span className="text-2xl font-black text-gray-800">{plushieHeight}<span className="text-sm font-bold text-gray-500">cm</span></span>
                                </div>

                                {/* Fit Status Badge */}
                                <div className={`px-4 py-2 rounded-full border-2 ${colorClasses[fitColor]} font-bold text-sm shadow-lg flex items-center gap-1`}>
                                    <span className="text-lg">{fitIcon}</span>
                                    <span>{fitLabel}</span>
                                </div>

                                {/* Product Size */}
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">商品目安</span>
                                    {productWidth && productLength ? (
                                        <span className="text-lg font-bold text-gray-700">W{productWidth} × L{productLength}<span className="text-xs">cm</span></span>
                                    ) : (
                                        <span className="text-lg font-bold text-gray-700">{productMinH}〜{productMaxH}<span className="text-xs">cm</span></span>
                                    )}
                                </div>
                            </div>

                            {/* Visual Size Bar */}
                            <div className="mt-3 relative h-3 bg-gray-200 rounded-full overflow-hidden">
                                {/* Product Range */}
                                <div
                                    className="absolute h-full bg-blue-200 rounded-full"
                                    style={{
                                        left: `${(productMinH / 50) * 100}%`,
                                        width: `${((productMaxH - productMinH) / 50) * 100}%`
                                    }}
                                />
                                {/* Plushie Position Marker */}
                                <div
                                    className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md ${fitColor === 'green' ? 'bg-green-500' : fitColor === 'yellow' ? 'bg-yellow-500' : fitColor === 'red' ? 'bg-red-500' : 'bg-gray-500'}`}
                                    style={{
                                        left: `calc(${Math.min(100, Math.max(0, (plushieHeight / 50) * 100))}% - 8px)`
                                    }}
                                />
                            </div>
                            <div className="flex justify-between text-[9px] text-gray-400 mt-1 px-1">
                                <span>0cm</span>
                                <span>25cm</span>
                                <span>50cm</span>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Canvas Area */}
            <div
                className="flex-1 relative overflow-hidden flex items-center justify-center bg-gray-800"
                ref={containerRef}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
            >
                {viewMode === '2d' ? (
                    <>
                        {/* Base Plushie Image - Centered */}
                        <div
                            className="absolute inset-0 pointer-events-none flex items-center justify-center"
                            style={{ zIndex: 10 }}
                        >
                            <img
                                src={plushie.image}
                                className="h-[80%] w-auto object-contain opacity-90 drop-shadow-xl"
                                alt="Base"
                            />
                        </div>

                        {/* Draggable Clothing Layer */}
                        {(() => {
                            const ClothingComponent = product.overlayType && CLOTHING_OVERLAYS[product.overlayType]?.component;
                            return (
                                <div
                                    className="absolute cursor-move touch-none flex items-center justify-center group"
                                    style={{
                                        left: '50%',
                                        top: '45%',
                                        // Combine centering (-50%) with user movement (x, y)
                                        transform: `translate(calc(-50% + ${transform.x}px), calc(-50% + ${transform.y}px)) rotate(${transform.rotate}deg) scale(${transform.scale})`,
                                        zIndex: 30,
                                    }}
                                    onMouseDown={handlePointerDown}
                                    onTouchStart={handlePointerDown}
                                >
                                    {/* SVG Clothing - Proper Try-On */}
                                    <div className="relative" style={{ opacity: opacity }}>
                                        {ClothingComponent ? (
                                            <ClothingComponent
                                                color={product.overlayColor || '#E53935'}
                                                size={180}
                                            />
                                        ) : product.image ? (
                                            // Fallback to image for URL-analyzed items
                                            <img
                                                src={product.image}
                                                className="w-48 h-48 object-contain drop-shadow-2xl"
                                                style={{
                                                    filter: 'brightness(1.05) contrast(1.1)',
                                                    mixBlendMode: blendMode,
                                                }}
                                                alt={product.name}
                                            />
                                        ) : (
                                            <div className="w-48 h-48 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400">
                                                No Overlay
                                            </div>
                                        )}

                                        {/* Active Selection Border */}
                                        <div className="absolute inset-[-15px] border-2 border-blue-400 border-dashed rounded-2xl pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity"></div>

                                        {/* Resize Handle */}
                                        <div className="absolute -bottom-3 -right-3 w-7 h-7 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center pointer-events-none">
                                            <Move size={14} className="text-white" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Instruction Overlay */}
                        <div className="absolute bottom-24 left-0 right-0 text-center pointer-events-none z-50">
                            <span className="text-xs text-white font-bold bg-black/60 px-4 py-2 rounded-full backdrop-blur-md border border-white/20 shadow-lg">
                                {t('guide2D') || "Drag to move • Pinch to resize"}
                            </span>
                        </div>
                    </>
                ) : (
                    /* 3D View */
                    <div className="w-full h-full relative">
                        <ThreeDView plushie={plushie} product={product} />

                        {/* 3D Guide Overlay */}
                        <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none z-40">
                            <span className="text-xs text-white font-bold bg-black/50 px-4 py-2 rounded-full backdrop-blur-md border border-white/20 shadow-lg">
                                {t('guide3D') || "Green=Good • Red=Tight"}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls (Only show in 2D mode for now, or adapt) */}
            {viewMode === '2d' && (
                <div className="bg-white p-6 pb-8 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.2)]">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-sm font-bold">{product.name}</h3>
                            <p className="text-xs text-gray-500">¥{product.price}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <a
                                href={`https://www.google.com/search?q=${encodeURIComponent(product.name + ' ぬいぐるみ 服')}&tbm=shop`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-black text-white px-3 py-2 rounded-lg flex items-center gap-1 shadow-md active:scale-95 transition-transform"
                            >
                                {t('buyNow')} <ExternalLink size={12} />
                            </a>
                            <button
                                onClick={() => {
                                    setTransform({ x: 0, y: 0, scale: 1, rotate: 0 });
                                    setOpacity(1);
                                    setBlendMode('normal');
                                }}
                                className="text-xs text-primary font-bold px-2"
                            >
                                {t('reset')}
                            </button>
                        </div>
                    </div>

                    {/* Blending & Opacity Tools */}
                    <div className="mb-4 flex flex-col gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div className="flex justify-between items-center w-full mb-1">
                            <span className="text-xs font-bold text-gray-500">Image Mode</span>
                            <button
                                onClick={() => setBlendMode(blendMode === 'normal' ? 'multiply' : 'normal')}
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${blendMode === 'multiply' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-300'}`}
                            >
                                {blendMode === 'multiply' ? '✓ White BG Removed' : 'Remove White BG'}
                            </button>
                        </div>

                        <div className="flex items-center gap-3 w-full">
                            <span className="text-xs text-gray-400 font-bold w-12">Opacity</span>
                            <input
                                type="range"
                                min="0.3"
                                max="1"
                                step="0.05"
                                value={opacity}
                                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>
                    </div>

                    <div className="flex justify-around items-center gap-4">
                        <button onClick={() => adjust('rotate', -15)} className="p-3 bg-gray-100 rounded-full active:bg-gray-200"><RotateCcw size={20} /></button>
                        <button onClick={() => adjust('scale', -0.1)} className="p-3 bg-gray-100 rounded-full active:bg-gray-200"><ZoomOut size={20} /></button>

                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300">
                            <Move size={20} className="text-gray-400" />
                        </div>

                        <button onClick={() => adjust('scale', 0.1)} className="p-3 bg-gray-100 rounded-full active:bg-gray-200"><ZoomIn size={20} /></button>
                        <button onClick={() => adjust('rotate', 15)} className="p-3 bg-gray-100 rounded-full active:bg-gray-200"><RotateCw size={20} /></button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FittingRoom;
