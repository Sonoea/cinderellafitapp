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
    const [selectedPlushieImage, setSelectedPlushieImage] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');

    // Select a plushie image as profile photo
    const selectPlushieImage = (imageUrl) => {
        setPreviewURL(imageUrl);
        setSelectedPlushieImage(imageUrl);
        setSelectedFile(null); // Clear file selection since we're using plushie image
    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        console.log("Image selected:", file);
        if (!file) return;
        setSelectedFile(file);
        setSelectedPlushieImage(null); // Clear plushie selection
        const reader = new FileReader();
        reader.onload = (ev) => {
            console.log("FileReader loaded preview");
            setPreviewURL(ev.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!currentUser) return;
        setIsUploading(true);
        setError('');

        try {
            let finalPhotoURL = previewURL;
            let fileToUpload = selectedFile;

            // Fallback: If no file selected but we have a base64 preview, convert it to a blob
            if (!fileToUpload && previewURL && previewURL.startsWith('data:')) {
                console.log("No file object found, but base64 preview exists. Converting to blob...");
                try {
                    const response = await fetch(previewURL);
                    const blob = await response.blob();
                    fileToUpload = blob;
                    console.log("Converted base64 to blob/file:", blob.size, blob.type);
                } catch (conversionErr) {
                    console.error("Failed to convert base64 to blob:", conversionErr);
                }
            }

            // If a file was selected (or recovered), upload to Firebase Storage
            if (fileToUpload) {
                try {
                    console.log("Starting upload for user:", currentUser.uid);
                    const storageRef = ref(storage, `profilePhotos/${currentUser.uid}`);
                    const uploadResult = await uploadBytes(storageRef, fileToUpload);
                    console.log("Upload success:", uploadResult);
                    finalPhotoURL = await getDownloadURL(storageRef);
                    console.log("Got download URL:", finalPhotoURL);
                } catch (storageErr) {
                    console.error("Storage upload failed DETAILS:", storageErr);
                    console.error("Error code:", storageErr.code);
                    console.error("Error message:", storageErr.message);
                    alert(`画像のアップロードに失敗しました: ${storageErr.message}`);
                    // Fall through - use previewURL (base64 from FileReader)
                    // But warn user that it might not persist well
                }
            } else if (selectedPlushieImage) {
                // Plushie image selected — convert relative path to absolute URL for cross-device compatibility
                if (selectedPlushieImage.startsWith('/') && !selectedPlushieImage.startsWith('//')) {
                    finalPhotoURL = `${window.location.origin}${selectedPlushieImage}`;
                }
            }

            console.log("Updating Auth profile with photoURL:", finalPhotoURL ? finalPhotoURL.substring(0, 50) + "..." : "null");

            // Update Auth Profile — only set photoURL if it's a short URL (not base64)
            // Base64 URLs are too long for Auth profile and will be ignored/cause errors
            const authUpdate = { displayName: displayName };
            if (finalPhotoURL && !finalPhotoURL.startsWith('data:') && finalPhotoURL.length < 2000) {
                authUpdate.photoURL = finalPhotoURL;
            } else if (finalPhotoURL && finalPhotoURL.startsWith('data:')) {
                console.warn("Skipping Auth photoURL update because it's base64 (too long). Use Firestore URL instead.");
            }

            try {
                await updateProfile(currentUser, authUpdate);
                console.log("Auth profile updated");
            } catch (authErr) {
                console.error("Auth update failed:", authErr);
            }

            // Update Firestore User Document
            const userRef = doc(db, 'users', currentUser.uid);
            await setDoc(userRef, {
                displayName: displayName,
                photoURL: finalPhotoURL || '',
                updatedAt: new Date().toISOString()
            }, { merge: true });
            console.log("Firestore user doc updated");

            onSave({ displayName, photoURL: finalPhotoURL });
            onClose();
        } catch (err) {
            console.error("Profile update CRITICAL error:", err);
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
                                            className={`relative flex-shrink-0 rounded-full overflow-hidden transition-all ${previewURL === p.image
                                                ? 'ring-3 ring-primary scale-110 shadow-lg'
                                                : 'ring-2 ring-gray-200 hover:ring-primary/50 opacity-70'
                                                }`}
                                            style={{ width: '56px', height: '56px' }}
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
                                📷写真をアップロード
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
                            {t('saveProfile') || '保存する'}
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
};

export default EditProfileModal;
