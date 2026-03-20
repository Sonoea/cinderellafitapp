import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, Unlock, Lock } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

const ClosetItemForm = ({ plushies, initialPlushieId, t, fitLabels, onSave, onCancel }) => {
    const { currentUser } = useAuth();
    const { language } = useApp();
    const scrollContainerRef = useRef(null);
    const [image, setImage] = useState(null);
    const [showUrl2, setShowUrl2] = useState(false);
    const [showUrl3, setShowUrl3] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        url: '',
        plushieId: initialPlushieId || plushies[0]?.id || '',
        fitRating: 2,
        comment: '',
        location: '',
        purchaseType: '',
        isPublic: false, // Default to private for better privacy
        url2: '',
        url3: '',
        patternImage: null,
        referenceUrl: '',
        category: 'other', // Default category
    });

    // Load initial item data if provided (for editing)
    useEffect(() => {
        if (initialPlushieId && !image && !formData.name) {
            // Logic to load existing item would go here if we were passing the full item object
            // But currently this component seems to rely on parent passing props or just being for "New" items?
            // Wait, looking at the code, it seems this form is used for NEW items mostly, 
            // but `initialPlushieId` suggests it might be used for edit too? 
            // Reviewing usage: AddItemModal uses it. EditItemModal probably uses it too?
            // Let's assume onSave handles the data. 
            // If this form is used for editing, we need to know where the initial data comes from. 
            // The props are `plushies, initialPlushieId, t, fitLabels, onSave, onCancel`.
            // It doesn't seem to take an `initialItem` prop. 
            // AH, I missed checking `EditItemModal` or similar usage. 
            // But the user request is about "Registering new coordinate".
            // So for now, just initializing state is enough.
        }
    }, []);

    // Ensure scroll area is focused for keyboard scroll
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.focus();
        }
    }, []);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressed = await compressImage(file);
                setImage(compressed);

                // Auto-scroll to form fields after photo upload
                setTimeout(() => {
                    if (scrollContainerRef.current) {
                        scrollContainerRef.current.scrollTo({
                            top: 200,
                            behavior: 'smooth'
                        });
                    }
                }, 100);
            } catch {
                alert('Failed to load image');
            }
        }
    };

    const handlePatternUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressed = await compressImage(file);
                setFormData({ ...formData, patternImage: compressed });
            } catch {
                alert('Failed to load pattern image');
            }
        }
    };

    const [isSaving, setIsSaving] = useState(false);

    const handleSaveWrapper = async () => {
        if (!image || isSaving) return;

        setIsSaving(true);
        try {
            // Get selected plushie data to snapshot
            const selectedPlushie = plushies.find(p => p.id === formData.plushieId);

            await onSave({
                image,
                ...formData,
                plushieName: selectedPlushie ? selectedPlushie.name : 'Unknown',
                plushieHeight: selectedPlushie && selectedPlushie.measurements ? selectedPlushie.measurements.height : 0
            });
        } catch (error) {
            console.error("Error during save:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-content-wrapper">
            <div
                ref={scrollContainerRef}
                className="modal-scroll-area"
                tabIndex="0"
                style={{ outline: 'none' }}
            >
                <div className="p-4 space-y-6">

                    {/* 1. Photo Section */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">{t('uploadPhoto')}</label>
                        {!image ? (
                            <div className="w-full aspect-video bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center relative overflow-hidden group hover:border-primary transition-colors cursor-pointer hover:bg-gray-100">
                                <input type="file" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                                <Camera size={32} className="text-gray-400 mb-2 group-hover:text-primary transition-colors" />
                                <p className="text-gray-400 font-bold text-xs">{t('tapToTakePhoto')}</p>
                            </div>
                        ) : (
                            <div className="w-full aspect-video bg-gray-100 rounded-xl overflow-hidden relative shadow-sm border border-gray-200">
                                <img src={image} alt="Preview" className="w-full h-full object-cover" />
                                <label className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full text-xs font-bold px-3 backdrop-blur-sm cursor-pointer hover:bg-black/70 transition-colors">
                                    {t('retake')}
                                    <input type="file" onChange={handleImageUpload} className="hidden" accept="image/*" />
                                </label>
                            </div>
                        )}
                    </div>

                    {/* 2. Form Fields (Always Visible) */}
                    <div className={`space-y-4 transition-opacity duration-300 ${!image ? '' : ''}`}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">{t('itemName')}</label>
                                <input
                                    type="text"
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder={t('itemNamePlaceholder')}
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">{t('productUrl')}</label>
                                <input
                                    type="url"
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder={t('urlPlaceholder1')}
                                    value={formData.url}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                />
                            </div>

                            {/* URL 2 */}
                            {(formData.url2 || showUrl2) && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                    <input
                                        type="url"
                                        className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        placeholder={t('urlPlaceholder2')}
                                        value={formData.url2}
                                        onChange={(e) => setFormData({ ...formData, url2: e.target.value })}
                                    />
                                </div>
                            )}

                            {/* URL 3 */}
                            {(formData.url3 || showUrl3) && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                    <input
                                        type="url"
                                        className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        placeholder={t('urlPlaceholder3')}
                                        value={formData.url3}
                                        onChange={(e) => setFormData({ ...formData, url3: e.target.value })}
                                    />
                                </div>
                            )}

                            {/* Add URL Button */}
                            {(!formData.url2 || !formData.url3) && !showUrl3 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!formData.url2 && !showUrl2) setShowUrl2(true);
                                        else setShowUrl3(true);
                                    }}
                                    className="text-xs font-bold text-primary flex items-center gap-1 hover:underline ml-1"
                                >
                                    {t('addUrl')}
                                </button>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">{t('locationLabel')}</label>
                                <div className="relative">
                                    <div className="absolute top-3 left-3 text-gray-400">
                                        <MapPin size={16} />
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full p-3 pl-10 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        placeholder={t('locationPlaceholder')}
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2">{t('selectCategory')}</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'hat', label: t('catHat'), icon: '👒' },
                                        { id: 'tops', label: t('catTops'), icon: '👕' },
                                        { id: 'dress', label: t('catDress'), icon: '👗' },
                                        { id: 'outer', label: t('catOuter'), icon: '🧥' },
                                        { id: 'bottoms', label: t('catBottoms'), icon: '👖' },
                                        { id: 'shoes', label: t('catShoes'), icon: '👟' },
                                        { id: 'bag', label: t('catBag'), icon: '👜' },
                                        { id: 'accessory', label: t('catAccessory'), icon: '🎀' },
                                        { id: 'other', label: t('catOther'), icon: '✨' }
                                    ].map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, category: cat.id })}
                                            className={`p-2 py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${formData.category === cat.id
                                                ? 'bg-primary/10 text-primary border-primary shadow-sm scale-105'
                                                : 'border-gray-100 bg-gray-50 text-gray-400 grayscale'
                                                }`}
                                        >
                                            <span className="text-xl">{cat.icon}</span>
                                            <span className="text-[10px] font-bold leading-tight">{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2">{t('purchaseTypeLabel')}</label>
                                <div className="flex gap-2">
                                    {[
                                        { id: 'online', label: t('categoryOnline'), icon: '🌐' },
                                        { id: 'retail', label: t('categoryRetail'), icon: '🏪' },
                                        { id: 'handmade', label: t('categoryHandmade'), icon: '🪡' }
                                    ].map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, purchaseType: cat.id })}
                                            className={`flex-1 p-2 py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${formData.purchaseType === cat.id
                                                ? 'bg-primary text-white border-primary shadow-lg scale-105'
                                                : 'border-gray-100 bg-gray-50 text-gray-400 grayscale'
                                                }`}
                                        >
                                            <span className="text-xl">{cat.icon}</span>
                                            <span className="text-[10px] font-bold leading-tight">{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2">{t('selectModelTitle')}</label>
                                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                    {plushies.map(p => {
                                        const isSelected = formData.plushieId === p.id;
                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => setFormData({ ...formData, plushieId: p.id })}
                                                className={`flex-shrink-0 p-1.5 pr-4 rounded-full flex items-center gap-2 transition-all duration-200 relative ${isSelected
                                                    ? 'bg-primary text-white border-2 border-primary shadow-lg scale-105'
                                                    : 'bg-white text-gray-500 border-2 border-gray-200 opacity-50 hover:opacity-80'
                                                    }`}
                                            >
                                                <div className="relative">
                                                    <img src={p.image} className={`w-9 h-9 rounded-full object-cover ${isSelected ? 'ring-2 ring-white' : ''}`} alt="" />
                                                    {isSelected && (
                                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow">
                                                            <span className="text-primary text-[10px] font-black">✓</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-500'}`}>{p.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2">{t('fitRating')}</label>
                                <div className="flex justify-between bg-gray-50 p-3 rounded-xl gap-2">
                                    {[1, 2, 3].map((rating) => {
                                        const emojis = ['😣', '😊', '😌'];
                                        const isSelected = formData.fitRating === rating;

                                        return (
                                            <button
                                                key={rating}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, fitRating: rating })}
                                                className={`
                                                  flex-1 p-3 rounded-xl transition-all duration-200 relative
                                                  ${isSelected
                                                        ? 'bg-primary text-white border-primary scale-110 shadow-lg ring-4 ring-primary/20'
                                                        : 'bg-white hover:bg-gray-100 opacity-60 border-gray-200'}
                                                  active:scale-95
                                                  border-2
                                                `}
                                            >
                                                <span className={`text-3xl block text-center mb-1 ${isSelected ? '' : 'grayscale'}`}>{emojis[rating - 1]}</span>
                                                <p className={`text-[10px] text-center font-bold ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                                                    {fitLabels[rating - 1]?.replace(/^[^\s]+\s/, '') || ''}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Handmade Specific Fields (Conditional) */}
                            {formData.purchaseType === 'handmade' && (
                                <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-black text-orange-600 uppercase flex items-center gap-2">
                                            <span>🪡</span> {language === 'jp' ? 'ハンドメイド資料' : 'Handmade Materials'}
                                        </h4>
                                        <span className="text-[9px] font-bold text-orange-400 bg-orange-100/50 px-2 py-0.5 rounded-full">{language === 'jp' ? '任意' : 'Optional'}</span>
                                    </div>

                                    {/* Pattern Upload */}
                                    <div>
                                        <label className="block text-[10px] font-bold text-orange-700/70 mb-2 uppercase tracking-wider">{language === 'jp' ? '型紙・製作図をアップ' : 'Upload Pattern'}</label>
                                        {!formData.patternImage ? (
                                            <div className="w-full h-16 bg-white/80 rounded-xl border-2 border-dashed border-orange-200 flex flex-col items-center justify-center relative overflow-hidden group hover:border-orange-400 transition-colors cursor-pointer">
                                                <input type="file" onChange={handlePatternUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                                                <Camera size={16} className="text-orange-300 mb-1 group-hover:text-orange-500 transition-colors" />
                                                <p className="text-orange-400 font-bold text-[9px]">{language === 'jp' ? 'タップして画像を選択' : 'Tap to select image'}</p>
                                            </div>
                                        ) : (
                                            <div className="w-full h-24 bg-white rounded-xl overflow-hidden relative shadow-sm border border-orange-100">
                                                <img src={formData.patternImage} alt="Pattern Preview" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                    <label className="bg-white/90 text-orange-600 p-1.5 rounded-lg text-[10px] font-bold backdrop-blur-sm cursor-pointer hover:bg-white transition-colors">
                                                        {language === 'jp' ? '選び直す' : 'Change'}
                                                        <input type="file" onChange={handlePatternUpload} className="hidden" accept="image/*" />
                                                    </label>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, patternImage: null }); }}
                                                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-sm"
                                                >
                                                    <span className="text-[10px] leading-none">✕</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Reference URL */}
                                    <div>
                                        <label className="block text-[10px] font-bold text-orange-700/70 mb-1 uppercase tracking-wider">{language === 'jp' ? '作り方の参考URL' : 'Reference URL'}</label>
                                        <input
                                            type="url"
                                            className="w-full p-2.5 bg-white rounded-xl border border-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-200 text-sm"
                                            placeholder="https://..."
                                            value={formData.referenceUrl}
                                            onChange={(e) => setFormData({ ...formData, referenceUrl: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-bold text-gray-700">{t('commentLabel')}</label>
                                    <span className={`text-[10px] font-bold ${formData.comment.length >= 500 ? 'text-red-500' : 'text-gray-400'}`}>
                                        {formData.comment.length} / 500
                                    </span>
                                </div>
                                <textarea
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 h-20 text-sm"
                                    placeholder={t('commentPlaceholder')}
                                    value={formData.comment}
                                    maxLength={500}
                                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                                ></textarea>
                            </div>

                            <div className={`flex items-center justify-between bg-blue-50 p-3 rounded-xl ${!currentUser ? 'opacity-60 grayscale' : ''}`}>
                                <div className="flex items-center gap-2">
                                    <div className={`p-2 rounded-full ${formData.isPublic ? 'bg-blue-500 text-white' : 'bg-gray-300 text-white'}`}>
                                        {formData.isPublic ? <Unlock size={16} /> : <Lock size={16} />}
                                    </div>
                                    <div className="text-xs">
                                        <p className="font-bold text-gray-800">{formData.isPublic ? t('publicGallery') : t('privateOnly')}</p>
                                        <p className="text-gray-500">{formData.isPublic ? t('visibleToEveryone') : t('visibleToYou')}</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.isPublic}
                                        disabled={!currentUser}
                                        onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            {!currentUser && (
                                <p className="text-[10px] text-red-500 font-bold text-center mt-1">
                                    ※ {t('loginToShare')}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="modal-footer-fixed p-4 pb-4" style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.05)' }}>
                <button
                    onClick={handleSaveWrapper}
                    disabled={!image || isSaving}
                    style={{
                        width: '100%',
                        backgroundColor: (image && !isSaving) ? '#FBBF24' : '#E5E7EB',
                        color: (image && !isSaving) ? '#000000' : '#9CA3AF',
                        fontWeight: 'bold',
                        padding: '16px',
                        borderRadius: '16px',
                        fontSize: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: (image && !isSaving) ? '0 4px 12px rgba(251, 191, 36, 0.4)' : 'none',
                        cursor: (image && !isSaving) ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s',
                        opacity: isSaving ? 0.7 : 1
                    }}
                >
                    <span style={{ fontSize: '24px' }}>{isSaving ? '⏳' : '✨'}</span>
                    <span>{isSaving ? '保存中...' : (image ? t('saveToCloset') : t('choosePhotoFirst'))}</span>
                </button>
            </div>
        </div>
    );
};

export default ClosetItemForm;
