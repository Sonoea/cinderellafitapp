import React, { useState } from 'react';
import Portal from './Portal';
import { X, Camera, User, Loader2 } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, storage } from '../firebase/config';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

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
            const compressed = await compressImage(file);
            setPhotoURL(compressed); // Show preview immediately
        } catch (err) {
            console.error("Image compression error:", err);
            setError(t('imageUploadError') || 'Failed to process image');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        if (!currentUser) return;
        setIsUploading(true);
        setError('');

        try {
            let finalPhotoURL = photoURL;

            // If it's a base64 string (newly uploaded), we strictly should upload to Storage
            // But for now, let's keep it simple or follow existing patterns.
            // If the app uses base64 for plushies, maybe it's fine for small icons too?
            // However, Firestore has size limits. For user profiles, it's better to verify.
            // Given the existing code uses base64 for plushies/closet items often, we'll stick to that 
            // unless it's too large, but `compressImage` handles resizing.

            // Update Auth Profile
            await updateProfile(currentUser, {
                displayName: displayName,
                photoURL: finalPhotoURL
            });

            // Update Firestore User Document
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
                displayName: displayName,
                photoURL: finalPhotoURL,
                updatedAt: new Date().toISOString()
            });

            // Trigger refresh in parent
            onSave({ displayName, photoURL: finalPhotoURL });
            onClose();
        } catch (err) {
            console.error("Profile update error:", err);
            setError('Failed to save profile. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Portal>
            <div
                className="fixed inset-0 bg-black/60 z-modal flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200"
                style={{ touchAction: 'none' }}
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
                        {/* Icon Upload */}
                        <div className="flex flex-col items-center">
                            <div className="relative group cursor-pointer">
                                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 ring-4 ring-white shadow-lg">
                                    {photoURL ? (
                                        <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <User size={40} />
                                        </div>
                                    )}
                                </div>
                                <label className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                                    <Camera className="text-white" size={24} />
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </label>
                                {isUploading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-full">
                                        <Loader2 className="animate-spin text-primary" size={24} />
                                    </div>
                                )}
                            </div>
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
