import React from 'react';
import { Shirt, ShoppingBag, Plus, MousePointer2, Star } from 'lucide-react';

const VisualCloset = ({ items, onSelectItem, updateClosetItem, t }) => {
    // Organize items by category
    const categorized = items.reduce((acc, item) => {
        const cat = item.category || 'other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    const ShelfSlot = ({ title, subtitle, categories, icon: Icon, isHanging = false, isOther = false, className = "" }) => {
        const slotItems = categories.flatMap(cat => categorized[cat] || []);
        const count = slotItems.length;

        return (
            <div className={`flex flex-col ${className}`}>
                <div className="flex items-end justify-between mb-2 px-2">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                        {Icon && <Icon size={12} className="text-primary opacity-40 flex-shrink-0" />}
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{title}</span>
                        {count > 0 && (
                            <span className="bg-primary/10 text-primary text-[8px] font-black px-1.5 py-0.5 rounded-full ml-1 pulse-subtle">
                                {count}
                            </span>
                        )}
                    </div>
                </div>

                <div className={`
                    relative bg-white rounded-[1.5rem] p-4 min-h-[140px] 
                    shadow-[0_15px_35px_-12px_rgba(0,0,0,0.06)] border border-white/50
                    ${isHanging ? 'border-t-[10px] border-[#f8f8f8] pt-10 shadow-inner' : 'border-b-[12px] border-[#f0f0f0]'}
                    flex flex-wrap gap-4 items-start transition-all overflow-hidden
                `}>
                    {/* Spotlight Effect */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.8)_0%,transparent_70%)] pointer-events-none opacity-50"></div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-transparent via-primary/5 to-transparent rounded-full shadow-[0_4px_12px_rgba(255,255,255,1)]"></div>

                    {/* Hanging Rod Illustration */}
                    {isHanging && (
                        <>
                            <div className="absolute top-3 left-6 right-6 h-1.5 bg-gradient-to-r from-[#ccc] via-[#eeeeee] to-[#ccc] rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]"></div>
                            <div className="absolute top-[17px] left-8 right-8 h-[1px] bg-white/40 rounded-full"></div>
                        </>
                    )}

                    {count > 0 ? (
                        slotItems.map(item => (
                            <div key={item.id} className="relative group">
                                {isOther && (
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md rounded-full px-2 py-1 shadow-xl border border-gray-100 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all pointer-events-none group-hover:pointer-events-auto z-30 scale-90 group-hover:scale-100">
                                        <button onClick={(e) => { e.stopPropagation(); updateClosetItem(item.id.replace('local-', ''), { category: 'hat' }); }} className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center hover:bg-blue-50 transition-colors text-sm">👒</button>
                                        <button onClick={(e) => { e.stopPropagation(); updateClosetItem(item.id.replace('local-', ''), { category: 'dress' }); }} className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center hover:bg-pink-50 transition-colors text-sm">👗</button>
                                        <button onClick={(e) => { e.stopPropagation(); updateClosetItem(item.id.replace('local-', ''), { category: 'shoes' }); }} className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center hover:bg-orange-50 transition-colors text-sm">👟</button>
                                    </div>
                                )}
                                {isHanging && (
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-5 h-9 border-2 border-[#bbb] border-b-0 rounded-t-full z-0 opacity-40 group-hover:opacity-100 transition-opacity"></div>
                                )}
                                <div onClick={() => onSelectItem(item)} className={`w-20 h-20 rounded-xl overflow-hidden border-[3px] border-white shadow-[0_10px_20px_-8px_rgba(0,0,0,0.25)] transition-all duration-500 active:scale-95 group-hover:scale-110 group-hover:-translate-y-1.5 z-10 relative cursor-pointer ${isHanging ? 'mt-1 origin-top group-hover:rotate-1' : ''}`}>
                                    <img src={item.imageUrl} alt={item.itemName} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-white/0 group-hover:bg-black/5 transition-colors"></div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex-grow flex flex-col items-center justify-center py-6 opacity-10 select-none pointer-events-none">
                            <Plus size={18} className="mb-1.5 text-gray-400" />
                            <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{t('vacantSpace') || 'EMPTY'}</div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 bg-[#f2f4f6] min-h-screen pb-40 overflow-x-hidden">
            {/* Chandelier & Header */}
            <div className="relative text-center mb-6 pt-2">
                {/* Chandelier Ornament SVG */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-4 opacity-70">
                    <svg width="120" height="80" viewBox="0 0 120 80">
                        <line x1="60" y1="0" x2="60" y2="20" stroke="#d1d5db" strokeWidth="1" />
                        <path d="M40 30 Q60 50 80 30" fill="none" stroke="#d1d5db" strokeWidth="1" />
                        <circle cx="60" cy="30" r="1.5" fill="#f59e0b" className="animate-pulse" />
                        <circle cx="45" cy="35" r="1.2" fill="#fbbf24" />
                        <circle cx="75" cy="35" r="1.2" fill="#fbbf24" />
                        <path d="M20 30 Q60 80 100 30" fill="none" stroke="#e5e7eb" strokeWidth="0.5" opacity="0.5" />
                        <circle cx="60" cy="55" r="2" fill="#fbbf24" className="animate-pulse" style={{ animationDelay: '0.5s' }} />
                    </svg>
                </div>

                <div className="pt-20">
                    <div className="inline-block px-10 py-1.5 border-y border-gray-200 bg-white/30 backdrop-blur-sm rounded-full">
                        <span className="text-[12px] font-black text-gray-800 uppercase tracking-[0.4em] drop-shadow-sm">
                            {t('wardrobeTitle') || 'Signature Wardrobe'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Quick Tutorial Banner */}
            {categorized['other']?.length > 0 && (
                <div className="bg-white/80 backdrop-blur-md border border-white/50 p-4 rounded-[1.8rem] mb-6 shadow-sm flex items-center justify-between gap-4 fade-in">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2.5 rounded-xl text-primary">
                            <MousePointer2 size={16} className="animate-bounce" />
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-gray-800 tracking-tight">コレクションを並べて完成させましょう</p>
                            <p className="text-[9px] text-gray-400 font-bold">アイテムをタップしてカテゴリーを選択</p>
                        </div>
                    </div>
                    {/* Collection Progress */}
                    <div className="text-right">
                        <p className="text-[10px] font-black text-primary">{(items.length - (categorized['other']?.length || 0))} / {items.length}</p>
                        <div className="w-16 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                            <div
                                className="bg-primary h-full transition-all duration-1000"
                                style={{ width: `${((items.length - (categorized['other']?.length || 0)) / items.length) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-md mx-auto">
                <div className="grid grid-cols-12 gap-4 items-stretch">
                    {/* Left Column: Small square shelves */}
                    <div className="col-span-5 flex flex-col gap-4">
                        <ShelfSlot
                            title={t('topShelf') || 'ACCESSORIES'}
                            categories={['hat', 'accessory', 'bag']}
                            icon={ShoppingBag}
                            className="flex-grow"
                        />
                        <ShelfSlot
                            title={t('bottomShelf') || 'SHOES / BAGS'}
                            categories={['bottoms', 'shoes']}
                            className="flex-grow"
                        />
                    </div>

                    {/* Right Column: Tall hanging area */}
                    <div className="col-span-7 flex flex-col h-full">
                        <ShelfSlot
                            title={t('hangingShelf') || 'MAIN WARDROBE'}
                            categories={['dress', 'outer', 'tops']}
                            isHanging={true}
                            className="h-full"
                        />
                    </div>

                    {/* Bottom Row: Drawer Style Storage */}
                    <div className="col-span-12 mt-2">
                        <ShelfSlot
                            title={t('otherShelf') || 'STORAGE / NEW ITEMS'}
                            subtitle="Sort these items to fill shelves"
                            categories={['other']}
                            isOther={true}
                        />
                    </div>
                </div>
            </div>

            {/* Footer Aesthetic */}
            <div className="mt-12 text-center opacity-30 flex flex-col items-center">
                <div className="w-8 h-[1px] bg-gray-400 mb-4"></div>
                <Star size={24} className="text-gray-400 fill-gray-100" />
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-2">{t('appTitle') || 'CinderellaFit'}</p>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes pulse-subtle {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.8; transform: scale(1.05); }
                }
                .pulse-subtle { animation: pulse-subtle 2s infinite ease-in-out; }
                .shadow-inner { box-shadow: inset 0 2px 8px rgba(0,0,0,0.06); }
            `}} />
        </div>
    );
};

export default VisualCloset;
