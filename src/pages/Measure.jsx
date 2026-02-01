import React, { useState, useEffect } from 'react';
import { Camera, Ruler, ArrowRight, ScanLine, ShoppingBag, CheckCircle, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

const Measure = () => {
    const navigate = useNavigate();
    const { addPlushie, updatePlushie, plushies, t, plushieLimit, canAddPlushie, language } = useApp();

    // Get URL query params to check for edit mode
    const queryParameters = new URLSearchParams(window.location.search);
    const editId = queryParameters.get("edit");
    const isEditMode = !!editId;

    const [mainMode, setMainMode] = useState('plushie'); // 'plushie' (Friend) | 'item' (Store Item)

    // Item Scan State
    const [selectedPlushieId, setSelectedPlushieId] = useState(plushies[0]?.id);
    const [isScanningItem, setIsScanningItem] = useState(false);
    const [scanResult, setScanResult] = useState(null);

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
                setMainMode('plushie');
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

    const handleItemScan = () => {
        setIsScanningItem(true);
        setScanResult(null);

        // Simulate analysis delay
        setTimeout(() => {
            setIsScanningItem(false);
            // Mock result logic
            const randomResult = Math.random();
            if (randomResult > 0.6) {
                setScanResult({ status: 'perfect', label: t('matchPerfect'), color: 'text-green-600', bg: 'bg-green-50' });
            } else if (randomResult > 0.3) {
                setScanResult({ status: 'good', label: t('matchGood'), color: 'text-yellow-600', bg: 'bg-yellow-50' });
            } else {
                setScanResult({ status: 'bad', label: t('matchBad'), color: 'text-red-500', bg: 'bg-red-50' });
            }
        }, 2500);
    };

    // Camera Logic
    const videoRef = React.useRef(null);
    const [stream, setStream] = React.useState(null);

    React.useEffect(() => {
        let currentStream = null;
        if (mainMode === 'item') {
            navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            }).then(s => {
                currentStream = s;
                setStream(s);
                if (videoRef.current) {
                    videoRef.current.srcObject = s;
                }
            }).catch(err => {
                console.error("Camera access error:", err);
                alert("Camera access failed. Please ensure you are on HTTPS or localhost, and have granted permissions.");
            });
        }

        return () => {
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [mainMode]);

    return (
        <div className="flex flex-col h-full fade-in pb-20">
            {/* Top Switcher: Plushie vs Item */}
            <div className="flex bg-gray-100 p-1 rounded-2xl mb-4">
                <button
                    onClick={() => setMainMode('plushie')}
                    className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${mainMode === 'plushie' ? 'bg-white shadow-sm text-primary' : 'text-gray-400'}`}
                >
                    {t('targetPlushie')}
                </button>
                <button
                    onClick={() => setMainMode('item')}
                    className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${mainMode === 'item' ? 'bg-white shadow-sm text-primary' : 'text-gray-400'}`}
                >
                    {t('targetItem')}
                </button>
            </div>

            {mainMode === 'plushie' ? (
                /* PLUSHIE MEASUREMENT MODE - MANUAL ONLY */
                <>
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
                </>
            ) : (
                /* ITEM SCAN MODE */
                <div className="flex flex-col h-full">
                    <h2 className="mb-4">{t('resultTitle')}</h2>

                    {/* Plushie Select */}
                    <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                        <span className="text-sm font-bold whitespace-nowrap">{t('selectModel')}</span>
                        {plushies.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setSelectedPlushieId(p.id)}
                                className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all ${selectedPlushieId === p.id ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200'}`}
                            >
                                <img src={p.image} className="w-5 h-5 rounded-full object-cover" />
                                <span className="text-xs font-bold">{p.name}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 bg-black rounded-2xl relative overflow-hidden text-white p-4 flex flex-col items-center justify-center">
                        {/* Real Camera View */}
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        {!stream && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                                <p className="text-gray-400">Camera Loading...</p>
                            </div>
                        )}

                        {isScanningItem && (
                            <div className="absolute inset-0 bg-black/50 z-10 flex flex-col items-center justify-center fade-in">
                                <div className="w-16 h-16 border-4 border-t-primary border-white/50 rounded-full animate-spin mb-4"></div>
                                <p className="font-bold">{t('scanningItem')}</p>
                            </div>
                        )}

                        {!scanResult && !isScanningItem && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                                <div className="w-64 h-64 border-2 border-white/50 rounded-lg flex items-center justify-center mb-8">
                                    <span className="text-white/70 text-sm bg-black/30 px-2 py-1 rounded">Place item inside box</span>
                                </div>
                                <button
                                    onClick={handleItemScan}
                                    className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center hover-scale bg-white/20 backdrop-blur-md"
                                >
                                    <div className="w-12 h-12 bg-white rounded-full"></div>
                                </button>
                            </div>
                        )}

                        {/* Result Overlay */}
                        {scanResult && (
                            <div className="absolute bottom-0 left-0 right-0 bg-white text-black p-6 rounded-t-3xl shadow-lg fade-in z-20">
                                <div className={`flex items-center gap-3 mb-2 font-bold text-lg ${scanResult.color}`}>
                                    {scanResult.status === 'perfect' && <CheckCircle />}
                                    {scanResult.status === 'good' && <AlertTriangle />}
                                    {scanResult.status === 'bad' && <AlertTriangle />}
                                    {scanResult.label}
                                </div>
                                <p className="text-sm text-gray-500 mb-4">{t('estimatedSize')}: Width 15cm</p>

                                <button
                                    onClick={() => setScanResult(null)}
                                    className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold"
                                >
                                    Scan Next
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes scan {
                  0% { top: 10%; opacity: 0; }
                  50% { opacity: 1; }
                  100% { top: 90%; opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default Measure;
