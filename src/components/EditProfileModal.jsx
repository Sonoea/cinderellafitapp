import React, { useState } from 'react';
import Portal from './Portal';
import { X, Camera, User, Loader2 } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';
import { doc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db } from '../firebase/config';

const EditProfileModal = ({ onClose, onSave, t, currentUser }) => {
    const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
    const [photoURL, setPhotoURL] = useState(currentUser?.photoURL || null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        setError('');
        try {
            // Compress to 200x200 for profile icons
            const compressed = await compressImage(file, 200, 0.6);
            setPhotoURL(compressed);
        } catch (err) {
            console.error("Image compression error:", err);
            setError('画像の処理に失敗しました。別の画像をお試しください。');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        if (!currentUser) return;
        setIsUploading(true);
        setError('');

        try {
            // Update Auth Profile
            const authUpdate = { displayName: displayName };
            // Firebase Auth photoURL has a size limit, skip base64
            if (photoURL && !photoURL.startsWith('data:')) {
                authUpdate.photoURL = photoURL;
            }
            await updateProfile(currentUser, authUpdate);

            // Update Firestore User Document (setDoc with merge to create if not exists)
            const userRef = doc(db, 'users', currentUser.uid);
            await setDoc(userRef, {
                displayName: displayName,
                photoURL: photoURL || '',
                updatedAt: new Date().toISOString()
            }, { merge: true });

            onSave({ displayName, photoURL });
            onClose();
        } catch (err) {
            console.error("Profile update error:", err);
            setError('保存に失敗しました。もう一度お試しください。');
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

                    <div className="p-6 space-y-6">
                        {/* Icon Upload — using <label> for guaranteed iOS/mobile compatibility */}
                        <div className="flex flex-col items-center">
                            <label
                                htmlFor="profile-photo-input"
                                className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 ring-4 ring-white shadow-lg cursor-pointer block"
                            >
                                {photoURL ? (
                                    <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <User size={40} />
                                    </div>
                                )}
                                {/* Camera overlay — always visible */}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                                    <Camera className="text-white" size={24} />
                                </div>
                                {isUploading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-full">
                                        <Loader2 className="animate-spin text-primary" size={24} />
                                    </div>
                                )}
                                {/* Hidden file input INSIDE the label */}
                                <input
                                    id="profile-photo-input"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    style={{ position: 'absolute', width: 0, height: 0, opacity: 0, overflow: 'hidden' }}
                                />
                            </label>
                            <p className="text-xs text-gray-400 mt-2">{t('tapToChangeIcon') || 'タップしてアイコンを変更'}</p>
                        </div>

                        {/* Name Input */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
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
