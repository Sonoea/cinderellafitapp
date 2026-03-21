import React, { useState, useEffect, useRef, useContext } from 'react';
import { Shirt, ShoppingBag, Plus, MousePointer2, Star, Ghost, Sparkles, HelpCircle, Heart, Camera, Check, Info, ArrowDownCircle, Zap, Box, Tag, Edit2 } from 'lucide-react';
import { AppContext } from '../context/AppContext';

/**
 * 夢見る看板 (v11.0 - シンプル化)
 */
const WardrobeLogo = ({ total, t }) => (
    <div style={{ position: 'relative', marginBottom: '35px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <div style={{
            backgroundColor: '#FFF', padding: '12px 35px', borderRadius: '24px', border: '2px solid #E0DCD8',
            boxShadow: '0 8px 16px rgba(0,0,0,0.03)', zIndex: 1, position: 'relative', display: 'flex', alignItems: 'center', gap: '15px'
        }}>
            <h1 style={{ fontSize: '18px', color: '#3D7A7F', letterSpacing: '0.05em', fontWeight: '900', textAlign: 'center', margin: 0 }}>
                CinderellaFit wardrobe
            </h1>
            <div style={{ height: '24px', width: '1px', backgroundColor: '#E0DCD8' }}></div>
            <div style={{
                display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#F8FAF9', px: '10px', borderRadius: '15px', padding: '4px 10px',
                border: '1px solid #3D7A7F'
            }}>
                <Tag size={12} color="#3D7A7F" fill="#3D7A7F" />
                <span style={{ fontSize: '10px', fontWeight: '900', color: '#3D7A7F' }}>COLLECTION: {total}</span>
            </div>
        </div>
    </div>
);

/**
 * マスコット
 */

const VisualCloset = ({ items = [], onSelectItem, updateClosetItem, t }) => {
    const { customCategoryNames, setCustomCategoryNames } = useContext(AppContext);

    // Universal Pointer Drag (v11.1 Omni-Directional)
    const [draggingItem, setDraggingItem] = useState(null);
    const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });
    const [dragOverZone, setDragOverZone] = useState(null);

    // UI States
    const [selectedPlacingItem, setSelectedPlacingItem] = useState(null);
    const [successZone, setSuccessZone] = useState(null);
    const [organizedData, setOrganizedData] = useState(null);
    const [isEditingNames, setIsEditingNames] = useState(false);
    const [openShelf, setOpenShelf] = useState(null); // { cats, label }

    // Refs
    const shelfRefs = useRef({});
    const boxRef = useRef(null);

    const sorted = items.reduce((acc, item) => {
        const cat = (item.category && item.category !== 'other') ? item.category : 'unorganized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    const totalCount = items.length;

    const triggerSuccess = (zone, itemName, shelfName) => {
        setSuccessZone(zone);
        setOrganizedData({ name: itemName, shelf: shelfName });
        const timer = setTimeout(() => {
            setSuccessZone(null);
            setOrganizedData(null);
        }, 3000);
        return () => clearTimeout(timer);
    };

    // --- Pointer Interaction Logic ---
    useEffect(() => {
        const handlePointerMove = (e) => {
            if (!draggingItem) return;
            setPointerPos({ x: e.clientX, y: e.clientY });

            let foundZone = null;
            Object.entries(shelfRefs.current).forEach(([zone, el]) => {
                if (el) {
                    const rect = el.getBoundingClientRect();
                    if (e.clientX >= rect.left && e.clientX <= rect.right &&
                        e.clientY >= rect.top && e.clientY <= rect.bottom) {
                        foundZone = zone;
                    }
                }
            });

            if (!foundZone && boxRef.current) {
                const rect = boxRef.current.getBoundingClientRect();
                if (e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    foundZone = 'unorganized-box';
                }
            }
            setDragOverZone(foundZone);
        };

        const handlePointerUp = (e) => {
            if (!draggingItem) return;
            if (dragOverZone && updateClosetItem) {
                if (dragOverZone === 'unorganized-box') {
                    updateClosetItem(draggingItem.id.replace(/^local-/, ''), { category: 'other' });
                    triggerSuccess('unorganized-box', draggingItem.itemName || 'お洋服', '未整理の箱');
                } else {
                    const targetShelf = shelfRefs.current[dragOverZone];
                    const targetCat = targetShelf.getAttribute('data-cats')?.split(',')[0];
                    const shelfLabel = targetShelf.getAttribute('data-label');
                    updateClosetItem(draggingItem.id.replace(/^local-/, ''), { category: targetCat });
                    triggerSuccess(dragOverZone, draggingItem.itemName || 'お洋服', shelfLabel);
                }
            }
            setDraggingItem(null);
            setDragOverZone(null);
        };

        if (draggingItem) {
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
        }
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [draggingItem, dragOverZone, updateClosetItem]);

    const handlePointerDown = (e, item) => {
        // Don't preventDefault yet, as it might block clicks
        // e.stopPropagation(); // REMOVED: allow bubbling to shelf onClick
        setDraggingItem(item);
        setPointerPos({ x: e.clientX, y: e.clientY });
    };

    const handlePlaceToShelf = (targetCat, zone, shelfLabel) => {
        if (selectedPlacingItem && updateClosetItem) {
            updateClosetItem(selectedPlacingItem.id.replace(/^local-/, ''), { category: targetCat });
            triggerSuccess(zone, selectedPlacingItem.itemName || 'お洋服', shelfLabel);
            setSelectedPlacingItem(null);
        }
    };

    const handleRename = (key) => {
        const newName = window.prompt(t('enterNewCategoryName') || '新しい名前を入力してください', customCategoryNames[key] || '');
        if (newName !== null) {
            setCustomCategoryNames(prev => ({ ...prev, [key]: newName }));
        }
    };

    const PhotoShelf = ({ label, zone, cats, isHanging = false, isSmall = false, customKey = null }) => {
        const myItems = cats.flatMap(c => sorted[c] || []);
        const displayItem = myItems.slice(-1)[0];
        const count = myItems.length;
        const isHover = dragOverZone === zone;
        const isSuccess = successZone === zone;
        const isSelectedMode = !!selectedPlacingItem;

        // Use custom name if provided
        const finalLabel = (customKey && customCategoryNames[customKey]) || label;

        return (
            <div
                ref={el => shelfRefs.current[zone] = el}
                data-zone={zone}
                data-cats={cats.join(',')}
                data-label={finalLabel}
                onClick={() => {
                    if (isSelectedMode) {
                        handlePlaceToShelf(cats[0], zone, finalLabel);
                    } else if (count > 0) {
                        setOpenShelf({ cats, label: finalLabel });
                    }
                }}
                style={{
                    position: 'relative', flex: 1, display: 'flex', flexDirection: 'column',
                    transition: 'all 0.2s ease-out',
                    transform: (isHover || (isSelectedMode && isHover)) ? 'scale(1.1) translateY(-10px)' : isSuccess ? 'scale(1.05)' : 'none',
                    zIndex: (isHover || isSuccess || isSelectedMode) ? 100 : 1,
                    cursor: (isSelectedMode || count > 0) ? 'pointer' : 'default'
                }}
            >
                <div style={{
                    position: 'relative', height: isHanging ? '300px' : isSmall ? '90px' : '160px',
                    backgroundColor: 'white',
                    borderRadius: '24px',
                    boxShadow: (isHover || (isSelectedMode && isHover)) ? '0 25px 50px rgba(61,122,127,0.2)' : isSuccess ? '0 0 60px rgba(61,122,127,0.5)' : 'inset 0 15px 35px rgba(0,0,0,0.05)',
                    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
                    background: isSuccess ? 'radial-gradient(circle at center, #F5FDFD 0%, #E8F4F5 100%)' : 'white',
                    border: '2px solid #E0DCD8'
                }}>

                    {/* Physical Shelf Board (The "Shelf" itself) */}
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, height: '15px',
                        backgroundColor: '#FAF3E0', borderTop: '2px solid #E8DCC2',
                        zIndex: 10, borderRadius: '0 0 35px 35px'
                    }}></div>

                    {/* Cavity Depth Shadows */}
                    <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 4px 15px rgba(0,0,0,0.05)', pointerEvents: 'none' }}></div>

                    {/* Category Specific 3D Details */}
                    {isHanging && (
                        <>
                            {/* 3D Hanging Rod */}
                            <div style={{ position: 'absolute', top: '30px', left: 0, right: 0, height: '10px', background: 'linear-gradient(to bottom, #B8B2AC, white 50%, #B8B2AC)', zIndex: 5, boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}></div>
                            {/* Hanger Silhouettes */}
                            {[25, 45, 65, 80].map(pos => (
                                <div key={pos} style={{ position: 'absolute', top: '38px', left: `${pos}%`, width: '30px', height: '20px', border: '1.5px solid #E0DCD8', borderBottom: 'none', borderRadius: '15px 15px 0 0', opacity: 0.4, zIndex: 4 }}></div>
                            ))}
                        </>
                    )}

                    {zone === 'shoes' && (
                        <div style={{ position: 'absolute', bottom: '15px', left: 0, right: 0, height: '35%', background: 'linear-gradient(to bottom, #FFF, #FDFCF9)', borderTop: '2px solid #E0DCD8', opacity: 0.9, zIndex: 5 }}>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #E0DCD8' }}></div>
                        </div>
                    )}

                    {count > 0 && !isSelectedMode && (
                        <div style={{
                            position: 'absolute', top: '8px', right: '8px', zIndex: 110,
                            backgroundColor: '#3D7A7F', color: 'white', padding: '2px 10px', borderRadius: '50px',
                            fontSize: '11px', fontWeight: '900', boxShadow: '0 4px 10px rgba(61,122,127,0.15)',
                            border: '1.5px solid white', display: 'flex', alignItems: 'center', gap: '3px'
                        }}>
                            <Tag size={10} /> {count}
                        </div>
                    )}

                    {isSelectedMode && (
                        <div style={{
                            position: 'absolute', inset: '10px', background: 'rgba(61, 122, 127, 0.9)',
                            borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            color: 'white', zIndex: 120, border: '2px solid white', animation: 'pulse-button 0.8s infinite alternate'
                        }}>
                            <Plus size={isSmall ? 18 : 32} strokeWidth={5} />
                            <div style={{ fontSize: isSmall ? '9px' : '12px', fontWeight: '900', marginTop: '4px', letterSpacing: '0.1em' }}>PLACE</div>
                        </div>
                    )}

                    {(isSelectedMode || isHover || isSuccess) && (
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(61,122,127,0.03)', zIndex: 1, animation: isSuccess ? 'none' : 'magnetic-glow 1s infinite' }}></div>
                    )}

                    {isSuccess && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150 }}>
                            <div style={{ animation: 'firework 1s ease-out forwards', opacity: 1, color: '#3D7A7F' }}>
                                <Sparkles size={72} fill="#3D7A7F" />
                            </div>
                        </div>
                    )}

                    <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '70px', background: 'radial-gradient(ellipse at top, rgba(255,255,255,1) 0%, transparent 80%)', zIndex: 2, pointerEvents: 'none' }}></div>

                    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, pointerEvents: 'none' }}>
                        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {displayItem ? (
                                <div
                                    onPointerDown={(e) => handlePointerDown(e, displayItem)}
                                    style={{
                                        position: 'relative', width: '85%', height: '85%', zIndex: 10, cursor: 'grab', pointerEvents: 'auto'
                                    }}
                                >
                                    {isHanging && (
                                        <div style={{ position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', width: '14px', height: '20px', borderLeft: '2.5px solid #AA771C', borderTop: '2.5px solid #AA771C', borderRadius: '10px 10px 0 0', zIndex: 5 }}></div>
                                    )}
                                    <img
                                        src={displayItem.imageUrl}
                                        draggable="false"
                                        onDragStart={(e) => e.preventDefault()}
                                        style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 15px 35px rgba(0,0,0,0.25))' }}
                                    />
                                </div>
                            ) : (
                                <div style={{ opacity: isSelectedMode ? 0 : 0.08 }}>
                                    <Heart size={isSmall ? 18 : 36} fill="#3D7A7F" color="#3D7A7F" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Integrated Label Tag */}
                <div style={{
                    marginTop: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px',
                    opacity: isSelectedMode ? 0.3 : 1, transition: 'all 0.3s'
                }}>
                    <div
                        onClick={(e) => {
                            if (!isSelectedMode && count > 0) {
                                e.stopPropagation();
                                setOpenShelf({ cats, label: finalLabel });
                            }
                        }}
                        style={{
                            backgroundColor: '#F5F5F3', border: '1px solid #E0DCD8', borderRadius: '6px',
                            padding: '4px 12px', fontSize: '10px', fontWeight: '800', color: '#6B7680',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.02)', letterSpacing: '0.02em', cursor: count > 0 ? 'pointer' : 'default',
                            display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.2s',
                            position: 'relative'
                        }}
                        onMouseEnter={e => { if (count > 0) { e.currentTarget.style.backgroundColor = '#3D7A7F'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#3D7A7F'; } }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F5F5F3'; e.currentTarget.style.color = '#6B7680'; e.currentTarget.style.borderColor = '#E0DCD8'; }}
                    >
                        {finalLabel}
                        {count > 0 && <span style={{ fontSize: '8px', opacity: 0.5 }}>▼</span>}
                    </div>

                    {customKey && (
                        <div onClick={(e) => { e.stopPropagation(); handleRename(customKey); }}
                            style={{
                                cursor: 'pointer', pointerEvents: 'auto', backgroundColor: 'white', border: '1px solid #E0DCD8',
                                width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                            <Edit2 size={9} color="#3D7A7F" />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div style={{ minHeight: '100vh', background: '#FDFBFA', padding: '40px 10px 220px', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden', touchAction: 'none' }}>

            <WardrobeLogo total={totalCount} t={t} />

            <div style={{ position: 'relative', width: '100%', maxWidth: '420px', margin: '0 auto', padding: '0 15px' }}>

                {/* --- The Closet Cabinet Structure (Soft & Dreamy v12.5) --- */}
                <div style={{ position: 'relative' }}>

                    {/* Solid Minimalist Furniture Top */}
                    <div style={{ height: '20px', width: '100%', backgroundColor: '#E0DCD8', borderRadius: '4px 4px 0 0', position: 'relative', zIndex: 10 }}>
                        <div style={{ position: 'absolute', top: '-10px', left: '10%', right: '10%', height: '10px', backgroundColor: '#B8B2AC', borderRadius: '8px 8px 0 0' }}></div>
                    </div>

                    {/* Sophisticated Wardrobe Body */}
                    <div style={{
                        backgroundColor: 'white',
                        padding: '30px 25px',
                        border: '12px solid #E0DCD8',
                        borderTop: 'none',
                        borderBottom: '16px solid #E0DCD8',
                        boxShadow: '0 30px 60px -10px rgba(0,0,0,0.05)',
                        borderRadius: '0 0 40px 40px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '40px',
                        position: 'relative',
                        zIndex: 2
                    }}>
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <div style={{ width: '40%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ fontSize: '10px', color: '#B8B2AC', textAlign: 'center', fontWeight: '900', letterSpacing: '0.2em' }}>ACCESSORIES</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <PhotoShelf label={t('catHat')} zone="hat" cats={['hat']} isSmall={true} />
                                    <PhotoShelf label={t('catJewelry')} zone="jewelry" cats={['jewelry']} isSmall={true} />
                                    <PhotoShelf label={t('catGlasses')} zone="glasses" cats={['glasses']} isSmall={true} />
                                    <PhotoShelf label={t('catScarf')} zone="scarf" cats={['scarf']} isSmall={true} />
                                    <PhotoShelf label={t('catBagHand')} zone="bagh" cats={['bag_hand']} isSmall={true} />
                                    <PhotoShelf label={t('catBagBack')} zone="bagb" cats={['bag_back']} isSmall={true} />
                                    <PhotoShelf label={"カメラ"} zone="camera" cats={['camera']} isSmall={true} />
                                    <PhotoShelf label={t('catShoes')} zone="shoes" cats={['shoes']} isSmall={true} />
                                </div>
                            </div>
                            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ fontSize: '10px', color: '#B8B2AC', textAlign: 'center', fontWeight: '900', letterSpacing: '0.2em' }}>WARDROBE</div>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <PhotoShelf label={t('catOnePiece')} zone="hang-1" cats={['onepiece', 'dress']} isHanging={true} />
                                    <PhotoShelf label={t('catCoat')} zone="hang-2" cats={['outer', 'coat']} isHanging={true} />
                                    <PhotoShelf label={t('catSport')} zone="hang-3" cats={['sport', 'sportswear', 'jersey']} isHanging={true} />
                                </div>
                                <div style={{ display: 'flex', gap: '15px', height: '105px' }}>
                                    <PhotoShelf label={t('catBottoms')} zone="bottoms" cats={['skirt', 'pants']} isSmall={true} />
                                    <PhotoShelf label={t('catTops')} zone="tops" cats={['knit', 'tshirt']} isSmall={true} />
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '5px' }}>
                            <div style={{ fontSize: '10px', color: '#B8B2AC', textAlign: 'center', fontWeight: '900', letterSpacing: '0.2em', marginBottom: '12px' }}>
                                CUSTOM COLLECTIONS
                            </div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <PhotoShelf label={t('catCustom1')} zone="custom1" cats={['custom1']} isSmall={true} customKey="custom1" />
                                <PhotoShelf label={t('catCustom2')} zone="custom2" cats={['custom2']} isSmall={true} customKey="custom2" />
                            </div>
                        </div>
                    </div>

                    {/* Elegant Minimalist Base */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 80px', marginTop: '-4px', position: 'relative', zIndex: 1 }}>
                        <div style={{ width: '40px', height: '12px', backgroundColor: '#B8B2AC', borderRadius: '0 0 4px 4px' }}></div>
                        <div style={{ width: '40px', height: '12px', backgroundColor: '#B8B2AC', borderRadius: '0 0 4px 4px' }}></div>
                    </div>

                    {/* Organized Popup (Sophisticated Edition) */}
                    {organizedData && (
                        <div style={{ position: 'absolute', top: '30%', left: '0', right: '0', zIndex: 999, textAlign: 'center', pointerEvents: 'none' }}>
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '8px', backgroundColor: '#3D7A7F', color: 'white', padding: '18px 45px', borderRadius: '16px', fontWeight: '900', fontSize: '16px', boxShadow: '0 25px 60px rgba(61,122,127,0.3)', border: '4px solid white', animation: 'success-pop 0.5s' }}>
                                <Check size={28} strokeWidth={4} /> {organizedData.name} を整理！
                            </div>
                        </div>
                    )}
                </div>

                {/* 箱エリア */}
                <div
                    ref={boxRef}
                    style={{
                        width: '100%', maxWidth: '360px', marginTop: '35px', zIndex: 100,
                        transition: 'all 0.3s',
                        transform: dragOverZone === 'unorganized-box' ? 'scale(1.05)' : 'none',
                        opacity: dragOverZone === 'unorganized-box' ? 0.9 : 1
                    }}
                >
                    {sorted['unorganized']?.length > 0 && (
                        <div style={{ textAlign: 'center', backgroundColor: (selectedPlacingItem || draggingItem) ? '#3D7A7F' : '#E0DCD8', color: 'white', padding: '16px', borderRadius: '16px', fontSize: '14px', fontWeight: '800', marginBottom: '25px', boxShadow: '0 12px 35px rgba(0,0,0,0.05)', animation: 'bounce 2s infinite' }}>
                            {draggingItem ? "移動中！離すとここへ戻ります ✨" : selectedPlacingItem ? "いま選択中！棚のボタンを押してね" : "お洋服を掴んで棚へ運ぼう！"}
                        </div>
                    )}
                    <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '30px', border: dragOverZone === 'unorganized-box' ? '4px solid #3D7A7F' : '2px dashed #E0DCD8', minHeight: '180px', display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
                        {sorted['unorganized']?.length > 0 ? sorted['unorganized'].map(item => {
                            const isSelected = selectedPlacingItem?.id === item.id;
                            const isDraggingNow = draggingItem?.id === item.id;
                            return (
                                <div key={item.id}
                                    onPointerDown={(e) => handlePointerDown(e, item)}
                                    onClick={() => setSelectedPlacingItem(isSelected ? null : item)}
                                    style={{
                                        cursor: 'grab', position: 'relative',
                                        opacity: isDraggingNow ? 0.3 : 1,
                                        transform: isSelected ? 'scale(1.15) translateY(-5px)' : 'none',
                                        transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                    }}
                                >
                                    <div style={{ width: '80px', height: '80px', borderRadius: '16px', overflow: 'hidden', border: isSelected ? '4px solid #3D7A7F' : '3px solid #F8F9FA', boxShadow: '0 8px 16px rgba(0,0,0,0.08)' }}>
                                        <img src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                </div>
                            );
                        }) : (
                            <div style={{ opacity: 0.3, textAlign: 'center', padding: '40px' }}><Heart size={50} fill="#3D7A7F" color="#3D7A7F" /><p style={{ fontWeight: '800', marginTop: '10px' }}>すべて整理されました！✨</p></div>
                        )}
                    </div>
                </div>

                {draggingItem && (
                    <div style={{
                        position: 'fixed', left: pointerPos.x, top: pointerPos.y, pointerEvents: 'none', zIndex: 9999,
                        width: '100px', height: '100px', transform: 'translate(-50%, -50%) scale(1.2) rotate(5deg)',
                        filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.4))', animation: 'float 0.3s ease-in-out'
                    }}>
                        <img src={draggingItem.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        <div style={{ position: 'absolute', top: '-10px', right: '-10px' }}><Sparkles color="#3D7A7F" fill="#3D7A7F" size={30} /></div>
                    </div>
                )}

                {/* Shelf Detail Modal (v12.0) */}
                {openShelf && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                        background: 'rgba(74, 53, 29, 0.4)', backdropFilter: 'blur(8px)', animation: 'fade-in 0.3s'
                    }} onClick={() => setOpenShelf(null)}>
                        <div style={{
                            width: '100%', maxWidth: '480px', backgroundColor: '#FFFEFB', borderTopLeftRadius: '40px', borderTopRightRadius: '40px',
                            padding: '30px', paddingBottom: '50px', boxShadow: '0 -20px 60px rgba(0,0,0,0.15)', position: 'relative',
                            maxHeight: '85vh', overflowY: 'auto', animation: 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                        }} onClick={e => e.stopPropagation()}>

                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                <div>
                                    <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#4A351D', margin: 0 }}>{openShelf.label}</h2>
                                    <p style={{ fontSize: '12px', color: '#3D7A7F', fontWeight: '800', margin: '4px 0 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {openShelf.cats.flatMap(c => sorted[c] || []).length} Items in Showcase
                                    </p>
                                </div>
                                <button
                                    onClick={() => setOpenShelf(null)}
                                    style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#F8F3E9', border: 'none', color: '#4A351D', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                >
                                    <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
                                </button>
                            </div>

                            {/* Showcase Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                                {openShelf.cats.flatMap(c => sorted[c] || []).map(item => (
                                    <div key={item.id}
                                        onClick={() => { onSelectItem(item); setOpenShelf(null); }}
                                        style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', animation: 'fade-in 0.5s' }}
                                    >
                                        <div style={{
                                            width: '100%', aspectRatio: '1/1', borderRadius: '20px', overflow: 'hidden', backgroundColor: 'white',
                                            boxShadow: '0 8px 20px rgba(0,0,0,0.06)', border: '2px solid #F0EEE9'
                                        }}>
                                            <img src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                        <span style={{ fontSize: '10px', fontWeight: '800', color: '#4A351D', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                                            {item.itemName || item.name}
                                        </span>
                                    </div>
                                ))}
                                {openShelf.cats.flatMap(c => sorted[c] || []).length === 0 && (
                                    <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '60px 0', opacity: 0.3 }}>
                                        <ShoppingBag size={48} style={{ margin: '0 auto 15px' }} />
                                        <p style={{ fontWeight: '900' }}>この棚はまだ空っぽです</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <style dangerouslySetInnerHTML={{
                    __html: `
                @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                @keyframes pulse-button { 0% { transform: scale(0.95); } 100% { transform: scale(1.05); } }
                @keyframes magnetic-glow { 0% { opacity: 0.1; box-shadow: 0 0 10px rgba(212,175,55,0.1); } 100% { opacity: 0.4; box-shadow: 0 0 40px rgba(212,175,55,0.4); } }
                @keyframes firework { 0% { transform: scale(0); opacity: 0; } 40% { transform: scale(3); opacity: 1; } 100% { transform: scale(5); opacity: 0; } }
                @keyframes success-pop { 0% { transform: translateY(20px) scale(0.8); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
                @keyframes float { 0% { transform: translate(-50%, -50%) scale(0.5); } 100% { transform: translate(-50%, -50%) scale(1.2) rotate(5deg); } }
                @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes pulse-empty { 0% { background-color: rgba(212,175,55,0); } 100% { background-color: rgba(212,175,55,0.05); } }
            `}} />
            </div> {/* END Wrapper (340) */}
        </div> // END Container (336)
    );
};

export default VisualCloset;
