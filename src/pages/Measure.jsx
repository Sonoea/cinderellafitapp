import React, { useState, useEffect } from 'react';
import { Camera, Ruler, ArrowRight, ScanLine, ShoppingBag, CheckCircle, AlertTriangle, Trash2, Sparkles, Scan } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { compressImage } from '../utils/imageUtils';
import CameraScanner from '../components/CameraScanner';

const Measure = () => {
    const { addPlushie, updatePlushie, deletePlushie, plushies, t, plushieLimit, language } = useApp();
    const [showScanner, setShowScanner] = useState(false);
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

    const hasLoaded = React.useRef(false);

    // Load data for edit mode
    useEffect(() => {
        if (isEditMode && plushies.length > 0 && !hasLoaded.current) {
            const targetPlushie = plushies.find(p => String(p.id) === String(editId));
            if (targetPlushie) {
                // Wrap in timeout to avoid synchronous state update warning (though ref prevents loop)
                // or just accept that we need to update state based on props/context
                const dataToLoad = {
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
                };

                // Use functional update or just set it. 
                // The warning is strict about effects triggering re-renders immediately.
                // But this is necessary for initialization.
                setFormData(dataToLoad);
                hasLoaded.current = true;
            }
        }

    }, [isEditMode, editId, plushies]);

    // Handle image upload
    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // 10MB Limit
            if (file.size > 10 * 1024 * 1024) {
                alert(t('imageTooLarge'));
                return;
            }

            try {
                const compressedDataUrl = await compressImage(file);
                setFormData({ ...formData, image: compressedDataUrl });
            } catch (error) {
                console.error("Image processing failed", error);
                alert(t('imageProcessError'));
            }
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

    // Handle AI scan results
    const handleScanResults = (scanData) => {
        setFormData(prev => ({
            ...prev,
            image: scanData.image || prev.image,
            height: scanData.height || prev.height,
            waist: scanData.waist || prev.waist,
            head: scanData.head || prev.head,
            neck: scanData.neck || prev.neck,
            length: scanData.length || prev.length,
            shoulder: scanData.shoulder || prev.shoulder,
            arm: scanData.arm || prev.arm,
            armGirth: scanData.armGirth || prev.armGirth,
            leg: scanData.leg || prev.leg,
        }));
        setShowScanner(false);
    };

    return (
        <div className="flex flex-col h-full fade-in pb-20">
            <h2 className="mb-4">{isEditMode ? t('editPlushie') : t('newMeasurement')}</h2>

            {/* AI Scan Button - 目立つ位置 */}
            {!isEditMode && (
                <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="ai-scan-btn mb-4 w-full py-5 rounded-2xl text-white font-bold text-lg shadow-lg hover-scale flex items-center justify-center gap-3 relative overflow-hidden"
                    style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
                        boxShadow: '0 8px 32px rgba(99, 102, 241, 0.35)',
                    }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" style={{ animation: 'shimmer 3s ease infinite', backgroundSize: '200% 100%' }} />
                    <Sparkles size={24} className="relative z-10" />
                    <span className="relative z-10">
                        {t('aiAutoMeasure')}
                    </span>
                    <Scan size={20} className="relative z-10 opacity-60" />
                </button>
            )}

            <form onSubmit={handleManualSubmit} className="flex flex-col gap-4 bg-white p-6 rounded-2xl shadow-sm fade-in">
                {/* Image Upload UI */}
                <div className="flex flex-col items-center justify-center mb-4">
                    <label htmlFor="image-upload" className="relative w-32 h-32 mb-2 cursor-pointer group">
                        <div className={`w-full h-full rounded-full overflow-hidden border-4 border-gray-100 shadow-md flex items-center justify-center ${!formData.image ? 'bg-gray-100' : 'bg-white'}`}>
                            {formData.image ? (
                                <img src={formData.image} alt="Preview" className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                            ) : (
                                <Camera size={40} className="text-gray-300 group-hover:text-gray-400 transition-colors" />
                            )}
                        </div>
                        <input
                            type="file"
                            id="image-upload"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleImageChange}
                        />
                    </label>
                    <span className="text-xs font-bold text-gray-400 mt-1">{t('uploadPhoto')}</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">(Max 10MB)</span>
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
                    {isEditMode ? t('updateBtn') : t('saveProfile')}
                </button>

                {isEditMode && (
                    <>
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="w-full py-2 rounded-xl text-gray-400 font-bold hover:bg-gray-100"
                        >
                            {t('cancelBtn')}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                if (window.confirm(t('deleteConfirmPlushie'))) {
                                    deletePlushie(Number(editId));
                                    navigate('/');
                                }
                            }}
                            className="w-full py-3 rounded-xl text-red-500 font-bold hover:bg-red-50 flex items-center justify-center gap-2 mt-2"
                        >
                            <Trash2 size={18} />
                            {t('deletePlushieBtn')}
                        </button>
                    </>
                )}
            </form>

            {/* Camera Scanner Modal */}
            {showScanner && (
                <CameraScanner
                    language={language}
                    t={t}
                    onMeasurementsDetected={handleScanResults}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </div>
    );
};


export default Measure;
