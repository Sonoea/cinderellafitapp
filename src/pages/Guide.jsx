import React from 'react';
import { ArrowLeft, BookOpen, Camera, Share2, Ruler, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const Guide = () => {
    const { t } = useApp();
    const navigate = useNavigate();

    return (
        <div className="pb-24">
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur z-10 p-4 shadow-sm flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <BookOpen size={24} className="text-primary" />
                    {t('guideTitle')}
                </h1>
            </div>

            <div className="p-4 space-y-8">
                {/* Intro */}
                <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 rounded-2xl text-center">
                    <h2 className="font-bold text-lg text-primary mb-2">CinderellaFit</h2>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        {t('guideIntro')}
                    </p>
                </div>

                {/* Steps */}
                <div className="space-y-6">
                    {/* Step 1: Measure (Ruler) */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
                        <div
                            style={{
                                position: 'absolute',
                                bottom: '-20px',
                                right: '-20px',
                                opacity: 0.05,
                                transform: 'rotate(12deg)',
                                pointerEvents: 'none'
                            }}
                        >
                            <Ruler size={150} />
                        </div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                                <Ruler size={24} />
                            </div>
                            <h3 className="font-bold text-lg mb-2">{t('guideStep1Title')}</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                {t('guideStep1Desc')}
                            </p>
                        </div>
                    </div>

                    {/* Step 2: Fit Check (Sparkles) */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
                        <div
                            style={{
                                position: 'absolute',
                                bottom: '-20px',
                                right: '-20px',
                                opacity: 0.05,
                                transform: 'rotate(12deg)',
                                pointerEvents: 'none'
                            }}
                        >
                            <Sparkles size={150} />
                        </div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4 text-yellow-600">
                                <Sparkles size={24} />
                            </div>
                            <h3 className="font-bold text-lg mb-2">{t('guideStep2Title')}</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                {t('guideStep2Desc')}
                            </p>
                        </div>
                    </div>

                    {/* Step 3: Closet (Camera) */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
                        <div
                            style={{
                                position: 'absolute',
                                bottom: '-20px',
                                right: '-20px',
                                opacity: 0.05,
                                transform: 'rotate(12deg)',
                                pointerEvents: 'none'
                            }}
                        >
                            <Camera size={150} />
                        </div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4 text-orange-600">
                                <Camera size={24} />
                            </div>
                            <h3 className="font-bold text-lg mb-2">{t('guideStep3Title')}</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                {t('guideStep3Desc')}
                            </p>
                        </div>
                    </div>

                    {/* Step 4: Gallery (Share) */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
                        <div
                            style={{
                                position: 'absolute',
                                bottom: '-20px',
                                right: '-20px',
                                opacity: 0.05,
                                transform: 'rotate(12deg)',
                                pointerEvents: 'none'
                            }}
                        >
                            <Share2 size={150} />
                        </div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mb-4 text-pink-600">
                                <Share2 size={24} />
                            </div>
                            <h3 className="font-bold text-lg mb-2">{t('guideStep4Title')}</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                {t('guideStep4Desc')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Guide;
