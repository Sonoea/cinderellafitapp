import React, { useState, useEffect } from 'react';
import { X, Sparkles, Download, Share2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

/**
 * Loading Messages to keep the user entertained during the ~15s wait.
 */
const LOADING_MESSAGES_JP = [
    "レッドカーペットの準備中...",
    "カメラマンを手配しています...",
    "スポットライトの調整中...",
    "衣装をスタイリングしています...",
    "もう少しで準備が整います..."
];

const LOADING_MESSAGES_EN = [
    "Rolling out the red carpet...",
    "Gathering the paparazzi...",
    "Adjusting the spotlights...",
    "Styling the outfit...",
    "Almost ready..."
];

const RedCarpetModal = ({ isOpen, onClose, plushieImage, plushieName }) => {
    const { language = 'jp' } = useApp();
    const [status, setStatus] = useState('idle'); // idle, generating, success, error
    const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
    const [selectedStyle, setSelectedStyle] = useState('glamorous');

    const loadingMessages = language === 'jp' ? LOADING_MESSAGES_JP : LOADING_MESSAGES_EN;

    // Cycle through loading messages
    useEffect(() => {
        let interval;
        if (status === 'generating') {
            interval = setInterval(() => {
                setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
            }, 3000);
        } else {
            setLoadingMessageIndex(0);
        }
        return () => clearInterval(interval);
    }, [status, loadingMessages.length]);

    // Cleanup on close
    useEffect(() => {
        if (!isOpen) {
            setStatus('idle');
            setGeneratedImageUrl(null);
            setErrorMsg('');
        }
    }, [isOpen]);

    const handleGenerate = async () => {
        if (!plushieImage) return;

        setStatus('generating');
        setErrorMsg('');
        setGeneratedImageUrl(null);

        try {
            // Determine API URL based on environment
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

            const response = await fetch(`${apiUrl}/api/red-carpet-gen`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    imageUrl: plushieImage,
                    style: selectedStyle
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.imageUrl) {
                setGeneratedImageUrl(data.imageUrl);
                setStatus('success');
            } else {
                throw new Error(data.error || 'Failed to generate image');
            }

        } catch (error) {
            console.error('Red Carpet AI Error:', error);
            setErrorMsg(
                language === 'jp'
                    ? `生成に失敗しました: ${error.message}`
                    : `Generation failed: ${error.message}`
            );
            setStatus('error');
        }
    };

    const handleDownload = async () => {
        if (!generatedImageUrl) return;
        try {
            // If it's a base64 string, we can download directly
            const a = document.createElement('a');
            a.href = generatedImageUrl;
            a.download = `red-carpet-${plushieName || 'plushie'}-${Date.now()}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download failed', error);
        }
    };

    const handleShare = async () => {
        if (!generatedImageUrl) return;
        if (navigator.share) {
            try {
                // To share an image file, we convert base64 to blob
                const res = await fetch(generatedImageUrl);
                const blob = await res.blob();
                const file = new File([blob], 'red-carpet.jpg', { type: 'image/jpeg' });

                await navigator.share({
                    title: language === 'jp' ? 'レッドカーペットデビュー！' : 'Red Carpet Debut!',
                    text: language === 'jp'
                        ? `${plushieName || 'お気に入りのぬいぐるみ'}がレッドカーペットを歩きました✨ #CinderellaFit`
                        : `${plushieName || 'My plushie'} walked the red carpet! ✨ #CinderellaFit`,
                    files: [file]
                });
            } catch (error) {
                console.log('Share failed or was cancelled', error);
                // Fallback to simple link share if file share fails
                try {
                    await navigator.share({
                        title: language === 'jp' ? 'レッドカーペットデビュー！' : 'Red Carpet Debut!',
                        text: language === 'jp'
                            ? `${plushieName || 'お気に入りのぬいぐるみ'}がレッドカーペットを歩きました✨ #CinderellaFit`
                            : `${plushieName || 'My plushie'} walked the red carpet! ✨ #CinderellaFit`,
                    })
                } catch (e) { }
            }
        } else {
            alert(language === 'jp' ? 'お使いのブラウザは共有機能に対応していません。画像を長押しして保存してください。' : 'Sharing is not supported on this browser. Long press to save.');
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 fade-in">
            <div
                className="bg-white rounded-3xl w-full max-w-md overflow-hidden relative shadow-2xl flex flex-col"
                style={{ maxHeight: '90vh' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 relative z-10 bg-white">
                    <h2 className="text-xl font-black flex items-center gap-2 text-gray-800">
                        <Sparkles size={22} className="text-yellow-500" />
                        {language === 'jp' ? 'AI レッドカーペット' : 'Red Carpet AI'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
                        disabled={status === 'generating'}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6 flex flex-col items-center">

                    {/* Setup State */}
                    {status === 'idle' && (
                        <div className="w-full flex justify-center flex-col">
                            <div className="text-center mb-6">
                                <p className="text-gray-600 font-bold mb-2">
                                    {language === 'jp'
                                        ? 'あなたの子をハリウッドのレッドカーペットにご招待します。'
                                        : 'Invite your plushie to the Hollywood red carpet.'}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {language === 'jp'
                                        ? '※AIが元の写真の魅力を活かしながら、ドレスアップした映画のような一枚を生成します。（約10〜20秒かかります）'
                                        : 'The AI will generate a cinematic dress-up portrait based on the original photo. (~10-20 seconds)'}
                                </p>
                            </div>

                            <div className="flex justify-center mb-6">
                                <div className="w-40 h-40 rounded-2xl overflow-hidden shadow-lg border-4 border-gray-100 relative">
                                    <img src={plushieImage} alt="Original" className="w-full h-full object-cover" />
                                    <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full font-bold backdrop-blur">Original</div>
                                </div>
                            </div>

                            <div className="space-y-4 mb-6">
                                <label className="text-sm font-bold text-gray-700 block text-center">
                                    {language === 'jp' ? '衣装のスタイルを選ぶ' : 'Choose a Outfit Style'}
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'glamorous', emoji: '✨', label: language === 'jp' ? 'エレガント' : 'Elegant' },
                                        { id: 'cute', emoji: '🎀', label: language === 'jp' ? 'キュート' : 'Cute' },
                                        { id: 'cool', emoji: '🕶️', label: language === 'jp' ? 'クール' : 'Cool' }
                                    ].map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => setSelectedStyle(s.id)}
                                            className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${selectedStyle === s.id
                                                    ? 'border-yellow-500 bg-yellow-50 shadow-md'
                                                    : 'border-gray-100 bg-white hover:border-gray-200'
                                                }`}
                                        >
                                            <span className="text-2xl">{s.emoji}</span>
                                            <span className="text-xs font-bold text-gray-700">{s.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleGenerate}
                                className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-yellow-500/30 text-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform active:scale-95"
                            >
                                <Sparkles size={24} />
                                {language === 'jp' ? '生成スタート✨' : 'Start Generation ✨'}
                            </button>
                        </div>
                    )}

                    {/* Generating State */}
                    {status === 'generating' && (
                        <div className="flex flex-col items-center justify-center h-full w-full py-10 space-y-6">
                            <div className="relative">
                                {/* Original image pulsing */}
                                <div className="w-32 h-32 rounded-2xl overflow-hidden shadow-lg border-2 border-primary/30 relative z-10 animate-pulse">
                                    <img src={plushieImage} alt="Original" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-primary/20 mix-blend-overlay"></div>
                                </div>
                                <div className="absolute -inset-4 bg-yellow-400/20 rounded-full blur-2xl z-0 animate-pulse" style={{ animationDuration: '2s' }}></div>
                                <div className="absolute -inset-8 bg-pink-400/20 rounded-full blur-2xl z-0 animate-pulse" style={{ animationDuration: '3s' }}></div>
                            </div>

                            <div className="text-center space-y-3">
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="font-black text-lg text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-pink-500">
                                        Generating Magic...
                                    </p>
                                </div>
                                <p className="text-gray-500 font-bold min-h-[24px] animate-fade-in">
                                    {loadingMessages[loadingMessageIndex]}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Success State */}
                    {status === 'success' && generatedImageUrl && (
                        <div className="w-full flex flex-col items-center animate-fade-in-up">
                            <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-white mb-6 relative group">
                                <img src={generatedImageUrl} alt="Generated" className="w-full h-full object-cover" />

                                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 border border-white/20 shadow-lg">
                                    <Sparkles size={12} className="text-yellow-400" />
                                    <span className="text-[10px] font-black text-white tracking-wider">AI GENERATED</span>
                                </div>
                            </div>

                            <p className="font-black text-xl text-gray-800 mb-6 flex items-center gap-2">
                                <CheckCircle2 className="text-green-500" />
                                {language === 'jp' ? '完成しました！' : 'Masterpiece Ready!'}
                            </p>

                            <div className="grid grid-cols-2 gap-3 w-full">
                                <button
                                    onClick={handleDownload}
                                    className="px-4 py-3 bg-gray-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shadow-lg active:scale-95"
                                >
                                    <Download size={20} />
                                    {language === 'jp' ? '保存する' : 'Save'}
                                </button>
                                <button
                                    onClick={handleShare}
                                    className="px-4 py-3 bg-white border-2 border-gray-200 text-gray-800 rounded-xl font-bold flex items-center justify-center gap-2 hover:border-gray-300 transition-colors shadow-sm active:scale-95"
                                >
                                    <Share2 size={20} />
                                    {language === 'jp' ? '共有する' : 'Share'}
                                </button>
                            </div>

                            <button
                                onClick={onClose}
                                className="mt-4 text-sm font-bold text-gray-400 hover:text-gray-600 underline"
                            >
                                {language === 'jp' ? 'ギャラリーに戻る' : 'Back to Gallery'}
                            </button>
                        </div>
                    )}

                    {/* Error State */}
                    {status === 'error' && (
                        <div className="w-full flex flex-col items-center justify-center py-10 space-y-4 text-center">
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                                <AlertCircle size={32} />
                            </div>
                            <h3 className="font-black text-lg text-gray-800">
                                {language === 'jp' ? 'エラーが発生しました' : 'Something went wrong'}
                            </h3>
                            <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg w-full break-words">
                                {errorMsg}
                            </p>
                            <button
                                onClick={() => setStatus('idle')}
                                className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
                            >
                                {language === 'jp' ? 'もう一度試す' : 'Try Again'}
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default RedCarpetModal;
