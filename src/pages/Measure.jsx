import React, { useState, useEffect } from 'react';
import { Camera, Ruler, ArrowRight, ScanLine, ShoppingBag, CheckCircle, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

const Measure = () => {
    const { addPlushie, updatePlushie, plushies, t, plushieLimit, language } = useApp();
    const navigate = useNavigate();

    // Get URL query params to check for edit mode
    const queryParameters = new URLSearchParams(window.location.search);
    const editId = queryParameters.get("edit");
    const isEditMode = !!editId;

    // Plushie Manual Form State
    const [formData, setFormData] = useState({
        name: '',
        type: '',
        image: null,
        height: '',
        waist: '',
        head: '',
        neck: '',
        length: '',
        shoulder: '',
        arm: '',
        armGirth: '',
        leg: '',
    });

    // Load data for edit mode
    useEffect(() => {
        if (isEditMode && plushies.length > 0) {
            const targetPlushie = plushies.find(p => String(p.id) === String(editId));
            if (targetPlushie) {
                setFormData({
                    name: targetPlushie.name,
                    type: targetPlushie.type,
                    image: targetPlushie.image,
                    height: targetPlushie.measurements?.height || '',
                    waist: targetPlushie.measurements?.waist || '',
                    head: targetPlushie.measurements?.head || '',
                    neck: targetPlushie.measurements?.neck || '',
                    length: targetPlushie.measurements?.length || '',
                    shoulder: targetPlushie.measurements?.shoulder || '',
                    arm: targetPlushie.measurements?.arm || '',
                    armGirth: targetPlushie.measurements?.armGirth || '',
                    leg: targetPlushie.measurements?.leg || '',
                });
            }
        }
    }, [isEditMode, editId, plushies]);

    // Handle image upload
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, image: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (!formData.name) return;

        const measurements = {
            height: Number(formData.height),
            waist: Number(formData.waist),
            head: Number(formData.head),
            neck: Number(formData.neck),
            length: Number(formData.length),
            shoulder: Number(formData.shoulder),
            arm: Number(formData.arm),
            armGirth: Number(formData.armGirth),
            leg: Number(formData.leg),
        };

        if (isEditMode) {
            // Update existing
            updatePlushie({
                id: Number(editId),
                name: formData.name,
                type: formData.type || 'Unknown',
                image: formData.image || "https://images.unsplash.com/photo-1582234031754-526487e34ef6?auto=format&fit=crop&w=400&q=80",
                measurements
            });
            navigate('/');
        } else {
            // Add new
            const success = addPlushie({
                name: formData.name,
                type: formData.type || 'Unknown',
                image: formData.image || "https://images.unsplash.com/photo-1582234031754-526487e34ef6?auto=format&fit=crop&w=400&q=80",
                measurements
            });

            if (success) {
                navigate('/');
            } else {
                alert(t('plushieLimitReached') || `You've reached the limit of ${plushieLimit} plushies.`);
            }
        }
    };

    return (
        <div className="flex flex-col h-full fade-in pb-20">
            <h2 className="mb-4">{isEditMode ? (language === 'jp' ? 'ぬいぐるみを編集' : 'Edit Plushie') : t('newMeasurement')}</h2>
            <form onSubmit={handleManualSubmit} className="flex flex-col gap-4 bg-white p-6 rounded-2xl shadow-sm fade-in">
                {/* Image Upload UI */}
                <div className="flex flex-col items-center justify-center mb-4">
                    <div className="relative w-32 h-32 mb-2">
                        <div className={`w-full h-full rounded-full overflow-hidden border-4 border-gray-100 shadow-md ${!formData.image ? 'bg-gray-100 flex items-center justify-center' : ''}`}>
                            {formData.image ? (
                                <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <Camera size={32} className="text-gray-400" />
                            )}
                        </div>
                        <label htmlFor="image-upload" className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer shadow-lg hover:bg-primary-dark transition-colors">
                            <Camera size={16} />
                        </label>
                        <input
                            type="file"
                            id="image-upload"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
                        />
                    </div>
                    <span className="text-xs font-bold text-gray-400">{t('uploadPhoto') || '写真をアップロード'}</span>
                </div>
                <div>
                    <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t('nameLabel')}</label>
                    <input
                        required
                        className="w-full mt-1 p-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-secondary outline-none transition-all"
                        placeholder={t('namePlaceholder')}
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>
                <div>
                    <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t('typeLabel')}</label>
                    <input
                        className="w-full mt-1 p-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-secondary outline-none transition-all"
                        placeholder={t('typePlaceholder')}
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t('height')} (cm)</label>
                        <input
                            type="number"
                            className="w-full mt-1 p-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-secondary outline-none transition-all"
                            value={formData.height}
                            onChange={e => setFormData({ ...formData, height: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t('waist')} (cm)</label>
                        <input
                            type="number"
                            className="w-full mt-1 p-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-secondary outline-none transition-all"
                            value={formData.waist}
                            onChange={e => setFormData({ ...formData, waist: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t('head')} (cm)</label>
                        <input
                            type="number"
                            className="w-full mt-1 p-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-secondary outline-none transition-all"
                            value={formData.head}
                            onChange={e => setFormData({ ...formData, head: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t('neck')} (cm)</label>
                        <input
                            type="number"
                            className="w-full mt-1 p-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-secondary outline-none transition-all"
                            value={formData.neck}
                            onChange={e => setFormData({ ...formData, neck: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t('length')} (cm)</label>
                        <input
                            type="number"
                            className="w-full mt-1 p-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-secondary outline-none transition-all"
                            value={formData.length}
                            onChange={e => setFormData({ ...formData, length: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t('shoulder')} (cm)</label>
                        <input
                            type="number"
                            className="w-full mt-1 p-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-secondary outline-none transition-all"
                            value={formData.shoulder}
                            onChange={e => setFormData({ ...formData, shoulder: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t('arm')} (cm)</label>
                        <input
                            type="number"
                            className="w-full mt-1 p-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-secondary outline-none transition-all"
                            value={formData.arm}
                            onChange={e => setFormData({ ...formData, arm: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t('armGirth')} (cm)</label>
                        <input
                            type="number"
                            className="w-full mt-1 p-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-secondary outline-none transition-all"
                            value={formData.armGirth}
                            onChange={e => setFormData({ ...formData, armGirth: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t('leg')} (cm)</label>
                        <input
                            type="number"
                            className="w-full mt-1 p-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-secondary outline-none transition-all"
                            value={formData.leg}
                            onChange={e => setFormData({ ...formData, leg: e.target.value })}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    className="mt-4 w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg hover-scale"
                    style={{ backgroundColor: 'var(--primary)' }}
                >
                    {isEditMode ? (language === 'jp' ? '更新する' : 'Update') : t('saveProfile')}
                </button>

                {isEditMode && (
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="w-full py-2 rounded-xl text-gray-400 font-bold hover:bg-gray-100"
                    >
                        {language === 'jp' ? 'キャンセル' : 'Cancel'}
                    </button>
                )}
            </form>
        </div>
    );
};


export default Measure;
