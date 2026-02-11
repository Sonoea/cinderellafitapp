import React, { useState } from 'react';
import Portal from './Portal';
import { X, Camera, User, Loader2, Check } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';

const EditProfileModal = ({ onClose, onSave, t, currentUser, plushies = [] }) => {
    const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
    const [previewURL, setPreviewURL] = useState(currentUser?.photoURL || null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');

    // Select a plushie image as profile photo
    const selectPlushieImage = (imageUrl) => {
        setPreviewURL(imageUrl);
        setSelectedFile(null); // Clear file selection since we're using plushie image
    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setPreviewURL(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!currentUser) return;
        setIsUploading(true);
        setError('');

        try {
            let finalPhotoURL = previewURL;

            // If a file was selected, upload to Firebase Storage
            if (selectedFile) {
                try {
                    const storageRef = ref(storage, `profilePhotos/${currentUser.uid}`);
                    await uploadBytes(storageRef, selectedFile);
                    finalPhotoURL = await getDownloadURL(storageRef);
                } catch (storageErr) {
                    console.warn("Storage upload failed, using inline:", storageErr);
                    // Fall through - use previewURL (base64 from FileReader)
                }
            }

            // Update Auth Profile — only set photoURL if it's a short URL (not base64)
            const authUpdate = { displayName: displayName };
            if (finalPhotoURL && !finalPhotoURL.startsWith('data:') && finalPhotoURL.length < 500) {
                authUpdate.photoURL = finalPhotoURL;
            }
            await updateProfile(currentUser, authUpdate);

            // Update Firestore User Document
            const userRef = doc(db, 'users', currentUser.uid);
            await setDoc(userRef, {
                displayName: displayName,
                photoURL: finalPhotoURL || '',
                updatedAt: new Date().toISOString()
            }, { merge: true });

            onSave({ displayName, photoURL: finalPhotoURL });
            onClose();
        } catch (err) {
            console.error("Profile update error:", err);
            setError(`保存に失敗しました: ${err.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Portal>
            <div
                className="fixed inset-0 bg-black/60 z-modal flex items-center justify-center p-4 backdrop-blur-sm"
                style={{ touchAction: 'none' }}
                onClick={onClose}
            >
                <div
                    className="modal-responsive relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                        <h3 className="font-bold text-lg">{t('editProfile') || 'プロフィール編集'}</h3>
                        <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 space-y-5" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        {/* Current Profile Photo */}
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 ring-4 ring-white shadow-lg">
                                {previewURL ? (
                                    <img src={previewURL} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <User size={36} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Plushie Image Selector */}
                        {plushies.length > 0 && (
                            <div>
                                <p className="text-xs font-bold text-gray-600 mb-2">ぬいぐるみから選択</p>
                                <div className="flex gap-3 justify-center flex-wrap">
                                    {plushies.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => selectPlushieImage(p.image)}
                                            className={`relative w-14 h-14 rounded-full overflow-hidden border-3 transition-all ${previewURL === p.image
                                                ? 'ring-2 ring-primary border-primary scale-110'
                                                : 'border-gray-200 hover:border-primary/50'
                                                }`}
                                        >
                                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                            {previewURL === p.image && (
                                                <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                                                    <Check size={16} className="text-white" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Or upload custom photo */}
                        <div className="text-center">
                            <label
                                htmlFor="profile-photo-upload"
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-xs font-bold border border-gray-200 cursor-pointer transition-colors"
                            >
                                <Camera size={14} />
                                写真をアップロード
                            </label>
                            <input
                                id="profile-photo-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                style={{ position: 'absolute', left: '-9999px' }}
                            />
                            {selectedFile && (
                                <p className="text-[10px] text-green-500 mt-1">✅ {selectedFile.name}</p>
                            )}
                        </div>

                        {/* Name Input */}
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">
                                {t('displayName') || '表示名'}
                            </label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder={t('namePlaceholder') || '名前を入力'}
                                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        {error && (
                            <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg text-center">
                                {error}
                            </p>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={isUploading}
                            className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isUploading && <Loader2 className="animate-spin" size={18} />}
                            {t('save') || '保存'}
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
};

export default EditProfileModal;
