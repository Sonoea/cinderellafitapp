import React from 'react';
import { ArrowLeft, BookOpen, Camera, Share2, Ruler, Sparkles, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const Guide = () => {
    const { t } = useApp();
    const navigate = useNavigate();

    return (
        <div className="pb-24 bg-[#FCFBF7] min-h-screen">
            {/* Header */}
            <div className="sticky top-0 bg-[#FCFBF7]/80 backdrop-blur-md z-30 p-4 border-b border-[#F0EBE3] flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full bg-white shadow-sm border border-[#F0EBE3] flex items-center justify-center hover:bg-gray-50 transition-all hover:scale-105 active:scale-95"
                >
                    <ArrowLeft size={18} className="text-gray-600" />
                </button>
                <h1 className="text-xl font-black text-gray-800 tracking-tight flex items-center gap-2">
                    <span className="bg-primary/10 p-1.5 rounded-lg">
                        <BookOpen size={20} className="text-primary" />
                    </span>
                    {t('guideTitle')}
                </h1>
            </div>

            <div className="p-5 space-y-8 max-w-2xl mx-auto">
                {/* Intro Hero */}
                <div className="relative overflow-hidden bg-gradient-to-br from-[#F5F1E9] to-[#EAE4D8] p-8 rounded-[32px] border border-white/50 shadow-inner">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
                    <div className="relative z-10 text-center">
                        <div className="inline-block px-3 py-1 bg-white/50 backdrop-blur-sm rounded-full text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-3 border border-white/20">
                            Premium Experience
                        </div>
                        <h2 className="font-black text-2xl text-gray-800 mb-3 tracking-tight">CinderellaFit</h2>
                        <p className="text-sm text-gray-600 leading-relaxed font-medium">
                            {t('guideIntro')}
                        </p>
                    </div>
                </div>

                {/* Steps Stepper */}
                <div className="space-y-4 relative">
                    {/* Vertical connecting line */}
                    <div className="absolute left-[39px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-primary/20 via-primary/10 to-transparent z-0 hidden sm:block" />

                    {[
                        {
                            title: t('guideStep1Title'),
                            desc: t('guideStep1Desc'),
                            icon: <Ruler size={24} />,
                            gradient: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
                            num: 1
                        },
                        {
                            title: t('guideStep2Title'),
                            desc: t('guideStep2Desc'),
                            icon: <Tag size={24} />,
                            gradient: 'linear-gradient(135deg, #10B981, #14B8A6)',
                            num: 2
                        },
                        {
                            title: t('guideStep3Title'),
                            desc: t('guideStep3Desc'),
                            icon: <Sparkles size={24} />,
                            gradient: 'linear-gradient(135deg, #A855F7, #6366F1)',
                            num: 3
                        },
                        {
                            title: t('guideStep4Title'),
                            desc: t('guideStep4Desc'),
                            icon: <Share2 size={24} />,
                            gradient: 'linear-gradient(135deg, #EC4899, #F43F5E)',
                            num: 4
                        }
                    ].map((step, idx) => (
                        <div
                            key={idx}
                            className="group relative z-10 bg-white rounded-[28px] p-6 border border-[#F0EBE3] shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                        >
                            <div className="flex gap-4 relative z-10">
                                <div
                                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300"
                                    style={{ background: step.gradient }}
                                >
                                    {step.icon}
                                </div>
                                <div className="pt-1 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest opacity-60">Step {step.num}</span>
                                    </div>
                                    <h3 className="font-black text-lg text-gray-800 mb-2 leading-tight tracking-tight">
                                        {step.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 leading-relaxed">
                                        {step.desc}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Guide;
