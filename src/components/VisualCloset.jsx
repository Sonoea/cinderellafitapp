import React from 'react';
import { Shirt, ShoppingBag, Plus } from 'lucide-react';

const VisualCloset = ({ items, onSelectItem, t }) => {
    // Organize items by category
    const categorized = items.reduce((acc, item) => {
        const cat = item.category || 'other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    const ShelfSlot = ({ title, categories, icon: Icon, isHanging = false }) => {
        const slotItems = categories.flatMap(cat => categorized[cat] || []);

        return (
            <div className={`mb-8 ${isHanging ? 'flex-grow' : ''}`}>
                <div className="flex items-center gap-2 mb-2 px-2">
                    {Icon && <Icon size={14} className="text-gray-400" />}
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</span>
                    <div className="flex-grow h-[1px] bg-gray-100"></div>
                </div>

                <div className={`
                    relative bg-white rounded-3xl p-6 min-h-[140px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)]
                    ${isHanging ? 'border-t-8 border-[#f8f8f8] pt-10' : 'border-b-[12px] border-[#f4f4f4]'}
                    flex flex-wrap gap-4 items-start transition-all
                `}>
                    {/* Hanging Rod Illustration (Metallic/Chrome) */}
                    {isHanging && (
                        <div className="absolute top-3 left-6 right-6 h-1.5 bg-gradient-to-r from-[#ddd] via-[#eee] to-[#ddd] rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"></div>
                    )}

                    {slotItems.length > 0 ? (
                        slotItems.map(item => (
                            <div
                                key={item.id}
                                className="relative group cursor-pointer"
                                onClick={() => onSelectItem(item)}
                            >
                                {/* Hanger head for hanging items */}
                                {isHanging && (
                                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-5 h-8 border-2 border-[#ccc] border-b-0 rounded-t-full z-0"></div>
                                )}

                                <div className={`
                                    w-20 h-20 rounded-xl overflow-hidden border-4 border-white shadow-[0_8px_20px_-5px_rgba(0,0,0,0.15)] transition-all duration-300 active:scale-95 group-hover:scale-110 group-hover:-translate-y-1 z-10 relative
                                    ${isHanging ? 'mt-1 origin-top group-hover:rotate-1' : ''}
                                `}>
                                    <img src={item.imageUrl} alt={item.itemName} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex-grow flex items-center justify-center py-6 opacity-30 select-none pointer-events-none">
                            <div className="text-[10px] font-black text-gray-300 uppercase tracking-tighter italic">Vacant Slot</div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 bg-[#f8f9fa] min-h-screen pb-32">
            {/* Visual Header Decoration */}
            <div className="text-center mb-10 pt-4">
                <div className="inline-block px-4 py-1 border-y border-gray-200">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Signature Wardrobe</span>
                </div>
                <div className="mt-4 flex justify-center gap-1">
                    <div className="w-1 h-1 bg-primary rounded-full opacity-20"></div>
                    <div className="w-8 h-1 bg-primary rounded-full opacity-10"></div>
                    <div className="w-1 h-1 bg-primary rounded-full opacity-20"></div>
                </div>
            </div>

            <div className="max-w-md mx-auto space-y-4">
                {/* Top Shelf: Hats & Accessories */}
                <ShelfSlot
                    title="Top Shelf / Accessories"
                    categories={['hat', 'accessory', 'bag']}
                    icon={ShoppingBag}
                />

                {/* Hanging Area: Dresses & Tops */}
                <ShelfSlot
                    title="Wardrobe / Hanging"
                    categories={['dress', 'outer', 'tops']}
                    isHanging={true}
                />

                {/* Bottom Shelf: Bottoms & Shoes */}
                <ShelfSlot
                    title="Bottom Shelf / Shoes"
                    categories={['bottoms', 'shoes']}
                />

                {/* Other / Miscellaneous */}
                {categorized['other']?.length > 0 && (
                    <ShelfSlot
                        title="Others"
                        categories={['other']}
                    />
                )}
            </div>

            {/* Aesthetic Chandelier or Decoration could be added as an image/icon at the top */}
            <div className="mt-12 text-center opacity-20 filter grayscale">
                <Shirt size={48} className="mx-auto text-gray-300" />
            </div>
        </div>
    );
};

export default VisualCloset;
