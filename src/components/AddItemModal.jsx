import React, { useEffect } from 'react';
import Portal from './Portal';
import ClosetItemForm from './ClosetItemForm';
import { X } from 'lucide-react';

const AddItemModal = ({ onClose, onSave, plushies, initialPlushieId, t, fitLabels, initialRefCompositeId, initialTheme }) => {
    // Body Scroll Lock
    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, []);

    return (
        <Portal>
            <div
                className="fixed inset-0 bg-black/50 z-modal flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200"
            >
                <div
                    className="modal-responsive animate-in slide-in-from-bottom-10 fade-in duration-300"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white flex-shrink-0 z-10">
                        <h3 className="font-bold text-lg">{t('addNewOutfit')}</h3>
                        <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Reused Form */}
                    <ClosetItemForm
                        plushies={plushies}
                        initialPlushieId={initialPlushieId}
                        t={t}
                        fitLabels={fitLabels}
                        initialRefCompositeId={initialRefCompositeId}
                        initialTheme={initialTheme}
                        onSave={(item) => {
                            onSave(item);
                            onClose();
                        }}
                    />
                </div>
            </div>
        </Portal>
    );
};

export default AddItemModal;
