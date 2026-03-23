import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw, Scan, CheckCircle, AlertTriangle, Sparkles, CircleDot, ZoomIn } from 'lucide-react';
import { estimateMeasurements, drawMeasurementOverlay } from '../utils/measureAI';

const CameraScanner = ({ onMeasurementsDetected, onClose, t, language = 'jp' }) => {
    const [phase, setPhase] = useState('guide'); // guide, camera, scanning, result
    const [cameraStream, setCameraStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [measurements, setMeasurements] = useState(null);
    const [referenceDetected, setReferenceDetected] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [error, setError] = useState(null);
    const [facingMode, setFacingMode] = useState('environment');

    // カメラの起動
    const startCamera = useCallback(async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 960 },
                },
            });
            setCameraStream(stream);
            setPhase('camera');

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error('Camera error:', err);
            setError(t('cameraAccessError'));
        }
    }, [facingMode, t]);

    // カメラの切り替え
    const switchCamera = useCallback(async () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    }, [cameraStream]);

    useEffect(() => {
        if (phase === 'camera' || phase === 'guide') {
            // facingModeが変わったら再起動
        }
    }, [facingMode]);

    // カメラストリームのクリーンアップ
    useEffect(() => {
        return () => {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [cameraStream]);

    // Video要素にストリームを設定
    useEffect(() => {
        if (videoRef.current && cameraStream) {
            videoRef.current.srcObject = cameraStream;
        }
    }, [cameraStream]);

    // 写真をキャプチャ
    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(imageDataUrl);

        // カメラを停止
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }

        // スキャン開始
        setPhase('scanning');
        runScan(canvas);
    }, [cameraStream]);

    // ファイルからの画像アップロード
    const handleFileUpload = useCallback(async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const img = new Image();
        img.onload = () => {
            const canvas = canvasRef.current;
            // Max resolution for performance
            const maxDim = 1280;
            let w = img.width, h = img.height;
            if (w > maxDim || h > maxDim) {
                const ratio = maxDim / Math.max(w, h);
                w *= ratio;
                h *= ratio;
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);

            setCapturedImage(canvas.toDataURL('image/jpeg', 0.9));
            setPhase('scanning');
            runScan(canvas);
        };
        img.src = URL.createObjectURL(file);
    }, []);

    // AIスキャン実行
    const runScan = useCallback((canvas) => {
        setScanProgress(0);

        // プログレスアニメーション
        const progressInterval = setInterval(() => {
            setScanProgress(prev => {
                if (prev >= 90) {
                    clearInterval(progressInterval);
                    return 90;
                }
                return prev + Math.random() * 15 + 5;
            });
        }, 200);

        // 実際の分析は次のフレームで（UIブロッキングを避ける）
        requestAnimationFrame(() => {
            setTimeout(() => {
                try {
                    const result = estimateMeasurements(canvas);
                    clearInterval(progressInterval);
                    setScanProgress(100);

                    // オーバーレイ描画
                    if (overlayCanvasRef.current) {
                        overlayCanvasRef.current.width = canvas.width;
                        overlayCanvasRef.current.height = canvas.height;
                        const overlayCtx = overlayCanvasRef.current.getContext('2d');
                        overlayCtx.drawImage(canvas, 0, 0);
                        drawMeasurementOverlay(overlayCanvasRef.current, result, result.silhouette);
                    }

                    setMeasurements(result);
                    setReferenceDetected(result.referenceDetected);

                    setTimeout(() => setPhase('result'), 500);
                } catch (err) {
                    clearInterval(progressInterval);
                    console.error('Scan error:', err);
                    setError(t('scanFailError'));
                    setPhase('camera');
                }
            }, 500);
        });
    }, [t]);

    // 結果を確定して親に渡す
    const confirmMeasurements = useCallback(() => {
        if (measurements) {
            onMeasurementsDetected({
                height: measurements.height,
                waist: measurements.waist,
                head: measurements.head,
                neck: measurements.neck,
                length: measurements.length,
                shoulder: measurements.shoulder,
                arm: measurements.arm,
                armGirth: measurements.armGirth,
                leg: measurements.leg,
                image: capturedImage,
                confidence: measurements.confidence,
            });
        }
    }, [measurements, capturedImage, onMeasurementsDetected]);

    // やり直し
    const retake = useCallback(() => {
        setCapturedImage(null);
        setMeasurements(null);
        setScanProgress(0);
        setPhase('guide');
    }, []);

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-md">
                <h2 className="text-white font-bold text-lg flex items-center gap-2">
                    <Sparkles size={20} className="text-yellow-400" />
                    {t('aiScan')}
                </h2>
                <button onClick={onClose} className="text-white/80 hover:text-white p-2">
                    <X size={24} />
                </button>
            </div>

            {/* メインコンテンツ */}
            <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">

                {/* === ガイドフェーズ === */}
                {phase === 'guide' && (
                    <div className="p-6 max-w-sm w-full space-y-6 fade-in">
                        <div className="text-center">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                <Scan size={36} className="text-white" />
                            </div>
                            <h3 className="text-white text-xl font-bold mb-2">
                                {t('scanPlushieTitle')}
                            </h3>
                            <p className="text-white/60 text-sm">
                                {t('scanPlushieDesc')}
                            </p>
                        </div>

                        {/* ガイド手順 */}
                        <div className="space-y-3">
                            <div className="flex items-start gap-3 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                                <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0 text-sm font-bold">1</div>
                                <div>
                                    <p className="text-white text-sm font-bold">
                                        {t('step1RefTitle')}
                                    </p>
                                    <p className="text-white/50 text-xs">
                                        {t('step1RefDesc')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 text-sm font-bold">2</div>
                                <div>
                                    <p className="text-white text-sm font-bold">
                                        {t('step2FrontTitle')}
                                    </p>
                                    <p className="text-white/50 text-xs">
                                        {t('step2FrontDesc')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-sm font-bold">3</div>
                                <div>
                                    <p className="text-white text-sm font-bold">
                                        {t('step3LightTitle')}
                                    </p>
                                    <p className="text-white/50 text-xs">
                                        {t('step3LightDesc')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* アクションボタン */}
                        <div className="space-y-3">
                            <button
                                onClick={startCamera}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-lg shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Camera size={22} />
                                {t('openCameraBtn')}
                            </button>

                            <label className="w-full py-3 rounded-2xl bg-white/10 text-white/80 font-bold text-sm hover:bg-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer">
                                <ZoomIn size={18} />
                                {t('selectFromAlbum')}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </label>
                        </div>

                        {error && (
                            <div className="bg-red-500/20 text-red-300 rounded-xl p-3 text-sm text-center">
                                {error}
                            </div>
                        )}
                    </div>
                )}

                {/* === カメラフェーズ === */}
                {phase === 'camera' && (
                    <div className="relative w-full h-full">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />

                        {/* カメラオーバーレイ（ガイドライン） */}
                        <div className="absolute inset-0 pointer-events-none">
                            {/* 中央ガイド枠 */}
                            <div className="absolute inset-8 border-2 border-white/30 rounded-3xl">
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                                    {t('insideFrameHint')}
                                </div>
                            </div>

                            {/* コイン配置ガイド */}
                            <div className="absolute bottom-28 left-8 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full border-2 border-yellow-400 border-dashed flex items-center justify-center">
                                    <CircleDot size={16} className="text-yellow-400" />
                                </div>
                                <span className="text-yellow-400 text-xs font-bold bg-black/60 px-2 py-1 rounded-lg backdrop-blur-sm">
                                    {t('tenYenMarker')}
                                </span>
                            </div>

                            {/* スキャンラインアニメーション */}
                            <div className="camera-scan-line" />
                        </div>

                        {/* カメラコントロール */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-20">
                            <div className="flex items-center justify-center gap-8">
                                <button
                                    onClick={switchCamera}
                                    className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition"
                                >
                                    <RotateCcw size={20} />
                                </button>

                                <button
                                    onClick={capturePhoto}
                                    className="w-20 h-20 rounded-full bg-white shadow-lg shadow-white/20 flex items-center justify-center hover:scale-95 active:scale-90 transition-transform"
                                >
                                    <div className="w-16 h-16 rounded-full border-4 border-indigo-500" />
                                </button>

                                <button
                                    onClick={onClose}
                                    className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* === スキャン中フェーズ === */}
                {phase === 'scanning' && (
                    <div className="relative w-full h-full flex flex-col items-center justify-center">
                        {capturedImage && (
                            <img
                                src={capturedImage}
                                alt="captured"
                                className="absolute inset-0 w-full h-full object-contain opacity-50"
                            />
                        )}

                        {/* スキャンオーバーレイ */}
                        <div className="absolute inset-0 scan-overlay" />

                        <div className="relative z-10 text-center p-6">
                            <div className="w-24 h-24 mx-auto mb-6 relative">
                                <div className="absolute inset-0 rounded-full border-4 border-indigo-400/50 animate-ping" />
                                <div className="absolute inset-2 rounded-full border-4 border-indigo-400 animate-pulse flex items-center justify-center">
                                    <Scan size={32} className="text-indigo-400" />
                                </div>
                            </div>

                            <h3 className="text-white text-xl font-bold mb-2">
                                {t('aiAnalyzing')}
                            </h3>
                            <p className="text-white/60 text-sm mb-6">
                                {t('measuringMsg')}
                            </p>

                            {/* プログレスバー */}
                            <div className="w-64 mx-auto h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                                    style={{ width: `${scanProgress}%` }}
                                />
                            </div>
                            <p className="text-white/40 text-xs mt-2">{Math.round(scanProgress)}%</p>
                        </div>
                    </div>
                )}

                {/* === 結果フェーズ === */}
                {phase === 'result' && measurements && (
                    <div className="w-full h-full overflow-y-auto pb-32">
                        {/* 分析結果画像 */}
                        <div className="relative">
                            <canvas
                                ref={overlayCanvasRef}
                                className="w-full"
                                style={{ maxHeight: '40vh', objectFit: 'contain' }}
                            />

                            {/* 信頼度バッジ */}
                            <div className={`absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm ${referenceDetected
                                    ? 'bg-green-500/90 text-white'
                                    : 'bg-yellow-500/90 text-white'
                                }`}>
                                {referenceDetected ? (
                                    <>
                                        <CheckCircle size={14} />
                                        {t('highAccuracy')}
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle size={14} />
                                        {t('estimatedValue')}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 測定結果テーブル */}
                        <div className="p-4 space-y-4">
                            <h3 className="text-white text-lg font-bold flex items-center gap-2">
                                <Sparkles size={18} className="text-yellow-400" />
                                {t('detectedMeasurementsTitle')}
                            </h3>

                            {!referenceDetected && (
                                <div className="bg-yellow-500/20 text-yellow-300 rounded-xl p-3 text-xs">
                                    ⚠️ {t('scanApproxWarning')}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { key: 'height', label: t('height'), icon: '📏' },
                                    { key: 'waist', label: t('waist'), icon: '⭕' },
                                    { key: 'head', label: t('head'), icon: '🧠' },
                                    { key: 'neck', label: t('neck'), icon: '🔗' },
                                    { key: 'shoulder', label: t('shoulder'), icon: '↔️' },
                                    { key: 'arm', label: t('armLabel'), icon: '💪' },
                                    { key: 'armGirth', label: t('armGirthLabel'), icon: '🔄' },
                                    { key: 'leg', label: t('legLabel'), icon: '🦵' },
                                ].map(({ key, label, icon }) => (
                                    <div key={key} className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className="text-sm">{icon}</span>
                                            <span className="text-white/60 text-xs font-bold">{label}</span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <input
                                                type="number"
                                                value={measurements[key] || 0}
                                                onChange={(e) => {
                                                    setMeasurements(prev => ({
                                                        ...prev,
                                                        [key]: parseFloat(e.target.value) || 0,
                                                    }));
                                                }}
                                                className="bg-transparent text-white text-2xl font-black w-16 focus:outline-none focus:border-b-2 focus:border-indigo-400"
                                                step="0.1"
                                            />
                                            <span className="text-white/40 text-sm">cm</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* フッターボタン (結果フェーズ) */}
            {phase === 'result' && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-4 pt-12 flex gap-3">
                    <button
                        onClick={retake}
                        className="flex-1 py-4 rounded-2xl bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                    >
                        <RotateCcw size={18} />
                        {t('retake')}
                    </button>
                    <button
                        onClick={confirmMeasurements}
                        className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-lg shadow-lg shadow-indigo-500/30 hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <CheckCircle size={20} />
                        {t('useTheseBtn')}
                    </button>
                </div>
            )}

            {/* Hidden canvas for processing */}
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
};

export default CameraScanner;
