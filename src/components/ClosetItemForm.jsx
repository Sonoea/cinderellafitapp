import React, { useState } from 'react';
import { Camera, MapPin, Unlock, Lock } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';

const ClosetItemForm = ({ plushies, initialPlushieId, t, fitLabels, onSave, onCancel }) => {
    const [image, setImage] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        url: '',
        plushieId: initialPlushieId || plushies[0]?.id || '',
        fitRating: 2,
        comment: '',
        location: '',
        purchaseType: '',
        isPublic: true,
    });

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressed = await compressImage(file);
                setImage(compressed);
            } catch {
                alert('Failed to load image');
            }
        }
    };

    const handleSaveWrapper = () => {
        if (!image) return;

        // Get selected plushie data to snapshot
        const selectedPlushie = plushies.find(p => p.id === formData.plushieId);

        onSave({
            image,
            ...formData,
            plushieName: selectedPlushie ? selectedPlushie.name : 'Unknown',
            plushieHeight: selectedPlushie && selectedPlushie.measurements ? selectedPlushie.measurements.height : 0
        });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto no-scrollbar min-h-0">
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
                                    placeholder="https://..."
                                    value={formData.url}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                />
                            </div>

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
                                                ? 'border-primary bg-primary/5 text-primary shadow-sm scale-105'
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
                                        const colors = [
                                            { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-600', selectedBg: 'bg-red-100' },
                                            { bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-600', selectedBg: 'bg-green-100' },
                                            { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-600', selectedBg: 'bg-yellow-100' },
                                        ][rating - 1];
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
                                                        ? `${colors.selectedBg} scale-110 shadow-lg ring-4 ${colors.border.replace('border-', 'ring-')}`
                                                        : 'bg-white hover:bg-gray-100 opacity-60'}
                          active:scale-95
                          border-3 
                          ${isSelected ? colors.border : 'border-gray-200'}
                        `}
                                            >
                                                {isSelected && (
                                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md">
                                                        <span className="text-xs">✓</span>
                                                    </div>
                                                )}
                                                <span className={`text-3xl block text-center mb-1 ${isSelected ? '' : 'grayscale'}`}>{emojis[rating - 1]}</span>
                                                <p className={`text-[10px] text-center font-bold ${isSelected ? colors.text : 'text-gray-400'}`}>
                                                    {fitLabels[rating - 1]?.replace(/^[^\s]+\s/, '') || ''}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

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

                            <div className="flex items-center justify-between bg-blue-50 p-3 rounded-xl">
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
                                    <input type="checkbox" className="sr-only peer" checked={formData.isPublic} onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })} />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 pb-10 border-t border-gray-100 bg-white" style={{ position: 'relative', zIndex: 120, boxShadow: '0 -4px 20px rgba(0,0,0,0.05)' }}>
                <button
                    onClick={handleSaveWrapper}
                    disabled={!image}
                    style={{
                        width: '100%',
                        backgroundColor: image ? '#FBBF24' : '#E5E7EB',
                        color: image ? '#000000' : '#9CA3AF',
                        fontWeight: 'bold',
                        padding: '16px',
                        borderRadius: '16px',
                        fontSize: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: image ? '0 4px 12px rgba(251, 191, 36, 0.4)' : 'none',
                        cursor: image ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s'
                    }}
                >
                    <span style={{ fontSize: '24px' }}>✨</span>
                    <span>{image ? t('saveToCloset') : t('choosePhotoFirst')}</span>
                </button>
            </div>
        </div>
    );
};

export default ClosetItemForm;
