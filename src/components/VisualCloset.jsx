import React, { useState, useEffect, useRef, useContext } from 'react';
import { Shirt, ShoppingBag, Plus, MousePointer2, Star, Ghost, Sparkles, HelpCircle, Heart, Camera, Check, Info, ArrowDownCircle, Zap, Box, Tag, Edit2 } from 'lucide-react';
import { AppContext } from '../context/AppContext';

/**
 * 夢見る看板 (v11.0 - シンプル化)
 */
const WardrobeLogo = ({ total, t }) => (
    <div style={{ position: 'relative', marginBottom: '35px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <div style={{ position: 'absolute', top: '-12px', display: 'flex', gap: '50px', zIndex: 0 }}>
            <div style={{ width: '22px', height: '22px', backgroundColor: '#FFF', border: '2px solid #D4AF37', borderRadius: '50%', opacity: 0.6 }}></div>
            <div style={{ width: '22px', height: '22px', backgroundColor: '#FFF', border: '2px solid #D4AF37', borderRadius: '50%', opacity: 0.6 }}></div>
        </div>

        <div style={{
            backgroundColor: '#FFF', padding: '12px 35px', borderRadius: '50px', border: '3px solid #FDFCF9',
            boxShadow: '0 12px 30px rgba(0,0,0,0.06)', zIndex: 1, position: 'relative', display: 'flex', alignItems: 'center', gap: '15px'
        }}>
            <h1 style={{ fontSize: '20px', color: '#4A351D', letterSpacing: '0.1em', fontWeight: '900', textAlign: 'center', margin: 0, fontFamily: 'serif' }}>
                CinderellaFit wardrobe
            </h1>
            <div style={{ height: '24px', width: '1px', backgroundColor: '#F0EEE9' }}></div>
            <div style={{
                display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#FFF9E6', px: '10px', borderRadius: '15px', padding: '4px 10px',
                border: '1px solid #D4AF37'
            }}>
                <Box size={14} color="#D4AF37" fill="#D4AF37" />
                <span style={{ fontSize: '11px', fontWeight: '900', color: '#4A351D' }}>Collection: {total}</span>
            </div>
        </div>
    </div>
);

/**
 * マスコット
 */
const PlushieMascot = ({ isActive }) => (
    <div style={{
        position: 'absolute', bottom: '15px', right: '-25px', zIndex: 60,
        transform: isActive ? 'rotate(-10deg) scale(1.15)' : 'rotate(-3deg)',
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        pointerEvents: 'none'
    }}>
        <div style={{ position: 'relative', width: '80px', height: '80px' }}>
            {isActive && (
                <div style={{ position: 'absolute', top: '-15px', left: '-15px', zIndex: 70, animation: 'fade-in 0.3s' }}>
                    <Sparkles size={40} color="#D4AF37" fill="#D4AF37" />
                </div>
            )}
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 15px 20px rgba(0,0,0,0.12))' }}>
                <circle cx="50" cy="50" r="45" fill="#F8F3E9" stroke="#E5E1D1" strokeWidth="2" />
                <circle cx="35" cy="20" r="14" fill="#F8F3E9" stroke="#E5E1D1" strokeWidth="2" />
                <circle cx="65" cy="20" r="14" fill="#F8F3E9" stroke="#E5E1D1" strokeWidth="2" />

                {/* Eyes - Dynamic */}
                {isActive ? (
                    <>
                        <path d="M30 42 Q35 32 40 42" stroke="#4A351D" strokeWidth="4" fill="none" strokeLinecap="round" />
                        <path d="M60 42 Q65 32 70 42" stroke="#4A351D" strokeWidth="4" fill="none" strokeLinecap="round" />
                    </>
                ) : (
                    <>
                        <circle cx="35" cy="42" r="6" fill="#4A351D" />
                        <circle cx="65" cy="42" r="6" fill="#4A351D" />
                    </>
                )}

                {/* Mouth - Sweeter expression when active */}
                <path d={isActive ? "M35 60 Q50 72 65 60" : "M40 58 Q50 65 60 58"} stroke="#4A351D" strokeWidth="4" fill="none" strokeLinecap="round" />
            </svg>
        </div>
    </div>
);

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
                    position: 'relative', height: isHanging ? '280px' : isSmall ? '82px' : '145px',
                    backgroundColor: isSuccess ? '#FFFDF5' : '#FFFEFB',
                    border: '1.5px solid',
                    borderColor: (isHover || (isSelectedMode && isHover)) ? '#D4AF37' : '#E8E4D9',
                    borderRadius: '16px',
                    boxShadow: (isHover || (isSelectedMode && isHover)) ? '0 20px 50px rgba(212,175,55,0.3)' : isSuccess ? '0 0 50px rgba(212,175,55,0.7)' : 'inset 0 4px 12px rgba(0,0,0,0.03)',
                    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s',
                    background: isSuccess ? 'radial-gradient(circle at center, #FFFDF5 0%, #FFF5E0 100%)' : 'white'
                }}>

                    {/* Shelf Background Texture & Thematic Overlays */}
                    <div style={{ position: 'absolute', inset: 0, opacity: 0.03, background: 'repeating-linear-gradient(45deg, #000, #000 1px, transparent 1px, transparent 10px)', pointerEvents: 'none' }}></div>

                    {/* Category Specific Decorations */}
                    {isHanging && (
                        <div style={{ position: 'absolute', top: '20px', left: '10%', right: '10%', height: '4px', background: 'linear-gradient(to bottom, #AA771C, #D4AF37)', borderRadius: '2px', zIndex: 5, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></div>
                    )}

                    {zone === 'shoes' && (
                        <div style={{ position: 'absolute', bottom: '10px', left: '10%', right: '10%', height: '40%', border: '1px solid #E8E4D9', borderTop: '2px solid #D4AF37', borderRadius: '4px', background: 'linear-gradient(to bottom, #FDFCF9, #F5F2E9)', opacity: 0.6, zIndex: 1 }}>
                            <div style={{ position: 'absolute', top: '5px', left: '5px', width: '20px', height: '8px', background: '#D4AF37', borderRadius: '1px', opacity: 0.4 }}></div>
                        </div>
                    )}

                    {cats.includes('jewelry') || cats.includes('glasses') || cats.includes('scarf') ? (
                        <div style={{ position: 'absolute', inset: '15%', border: '1px solid #D4AF37', borderRadius: '8px', background: 'rgba(212, 175, 55, 0.03)', zIndex: 1 }}>
                            <div style={{ position: 'absolute', inset: 0, opacity: 0.1, background: 'radial-gradient(circle, #D4AF37 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                        </div>
                    ) : null}

                    {count > 0 && !isSelectedMode && (
                        <div style={{
                            position: 'absolute', top: '8px', right: '8px', zIndex: 110,
                            backgroundColor: '#4A351D', color: '#D4AF37', padding: '2px 10px', borderRadius: '50px',
                            fontSize: '11px', fontWeight: '900', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            border: '1.5px solid #D4AF37', display: 'flex', alignItems: 'center', gap: '3px',
                            animation: isSuccess ? 'pulse-gold 0.5s repeat-3' : 'none'
                        }}>
                            <Tag size={10} /> {count}
                        </div>
                    )}

                    {isSelectedMode && (
                        <div style={{
                            position: 'absolute', inset: '10px', background: 'rgba(74, 53, 29, 0.9)',
                            borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            color: '#D4AF37', zIndex: 120, border: '2px solid #D4AF37', animation: 'pulse-button 0.8s infinite alternate'
                        }}>
                            <Plus size={isSmall ? 18 : 32} strokeWidth={5} />
                            <div style={{ fontSize: isSmall ? '9px' : '12px', fontWeight: '900', marginTop: '4px', letterSpacing: '0.1em' }}>PLACE</div>
                        </div>
                    )}

                    {(isSelectedMode || isHover || isSuccess) && (
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(212,175,55,0.08)', zIndex: 1, animation: isSuccess ? 'none' : 'magnetic-glow 1s infinite' }}></div>
                    )}

                    {isSuccess && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150 }}>
                            <div style={{ animation: 'firework 1s ease-out forwards', opacity: 1, color: '#D4AF37' }}>
                                <Sparkles size={72} fill="#D4AF37" />
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
                                    <Star size={isSmall ? 18 : 36} fill="#D4AF37" color="#D4AF37" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Unified Gold Name-plate (v12.0) */}
                <div style={{
                    marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px',
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
                            backgroundColor: '#FBF8F1', border: '1.5px solid #D4AF37', borderRadius: '4px',
                            padding: '3px 14px', fontSize: '11px', fontWeight: '900', color: '#4A351D',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.06)', letterSpacing: '0.05em', cursor: count > 0 ? 'pointer' : 'default',
                            display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s',
                            position: 'relative'
                        }}
                        onMouseEnter={e => { if (count > 0) { e.currentTarget.style.backgroundColor = '#D4AF37'; e.currentTarget.style.color = 'white'; } }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FBF8F1'; e.currentTarget.style.color = '#4A351D'; }}
                    >
                        {finalLabel}
                        {count > 0 && <span style={{ fontSize: '9px', opacity: 0.7 }}>▼</span>}
                    </div>

                    {customKey && (
                        <div onClick={(e) => { e.stopPropagation(); handleRename(customKey); }}
                            style={{
                                cursor: 'pointer', pointerEvents: 'auto', backgroundColor: 'white', border: '1px solid #E8E4D9',
                                width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                            <Edit2 size={10} color="#D4AF37" />
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
                <PlushieMascot isActive={!!draggingItem || !!selectedPlacingItem} />

                {/* --- The Closet Cabinet Structure (Architectural Wardrobe v12.2) --- */}
                <div style={{ position: 'relative', filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.15))' }}>

                    {/* Cabinet Top Crown (Bold architectural cornice) */}
                    <div style={{ height: '40px', width: '110%', marginLeft: '-5%', backgroundColor: '#FDFCF9', border: '3px solid #D4AF37', borderBottom: '8px solid #AA771C', borderRadius: '15px 15px 5px 5px', position: 'relative', zIndex: 10, overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', inset: '6px', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '10px' }}></div>
                    </div>

                    {/* Main Cabinet Body with Thick Pillars */}
                    <div style={{
                        backgroundColor: '#F7F4EB',
                        padding: '24px',
                        border: '18px solid #FDFCF9',
                        borderTop: 'none',
                        borderBottom: '20px solid #FDFCF9',
                        boxShadow: 'inset 0 10px 40px rgba(0,0,0,0.08)',
                        borderRadius: '0 0 40px 40px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '25px',
                        position: 'relative',
                        zIndex: 2,
                        backgroundImage: 'linear-gradient(90deg, #E5E1D1 0%, #FDFCF9 8%, #FDFCF9 92%, #E5E1D1 100%)' // Side pillars shadow effect
                    }}>
                        {/* Golden Inner Trim */}
                        <div style={{ position: 'absolute', inset: '-6px', border: '3px solid #D4AF37', borderRadius: '0 0 25px 25px', opacity: 0.15, pointerEvents: 'none' }}></div>
                        <div style={{ position: 'absolute', inset: '-12px', border: '1px solid #D4AF37', borderRadius: '0 0 35px 35px', opacity: 0.08, pointerEvents: 'none' }}></div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ width: '40%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ fontSize: '10px', color: '#888', textAlign: 'center', fontWeight: '900', letterSpacing: '0.2em' }}>ACCESSORIES</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
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
                            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ fontSize: '10px', color: '#888', textAlign: 'center', fontWeight: '900', letterSpacing: '0.2em' }}>WARDROBE</div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <PhotoShelf label={t('catOnePiece')} zone="hang-1" cats={['onepiece', 'dress']} isHanging={true} />
                                    <PhotoShelf label={t('catCoat')} zone="hang-2" cats={['outer', 'coat']} isHanging={true} />
                                    <PhotoShelf label={t('catSport')} zone="hang-3" cats={['sport', 'sportswear', 'jersey']} isHanging={true} />
                                </div>
                                <div style={{ display: 'flex', gap: '10px', height: '85px' }}>
                                    <PhotoShelf label={t('catBottoms')} zone="bottoms" cats={['skirt', 'pants']} isSmall={true} />
                                    <PhotoShelf label={t('catTops')} zone="tops" cats={['knit', 'tshirt']} isSmall={true} />
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '5px' }}>
                            <div style={{ fontSize: '10px', color: '#D4AF37', textAlign: 'center', fontWeight: '900', letterSpacing: '0.2em', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                CUSTOM COLLECTIONS
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <PhotoShelf label={t('catCustom1')} zone="custom1" cats={['custom1']} isSmall={true} customKey="custom1" />
                                <PhotoShelf label={t('catCustom2')} zone="custom2" cats={['custom2']} isSmall={true} customKey="custom2" />
                            </div>
                        </div>
                    </div>

                    {/* Cabinet Base / Legs */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 50px', marginTop: '-12px', position: 'relative', zIndex: 1 }}>
                        <div style={{ width: '30px', height: '24px', backgroundColor: '#E5E1D1', borderRadius: '0 0 15px 15px', border: '3px solid #D4AF37', borderTop: 'none', boxShadow: 'inset 0 -5px 10px rgba(0,0,0,0.1)' }}></div>
                        <div style={{ width: '30px', height: '24px', backgroundColor: '#E5E1D1', borderRadius: '0 0 15px 15px', border: '3px solid #D4AF37', borderTop: 'none', boxShadow: 'inset 0 -5px 10px rgba(0,0,0,0.1)' }}></div>
                    </div>

                    {/* Organized Popup (Wardrobe Edition) */}
                    {organizedData && (
                        <div style={{ position: 'absolute', top: '15%', left: '0', right: '0', zIndex: 999, textAlign: 'center', pointerEvents: 'none' }}>
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px', backgroundColor: '#4A351D', color: '#D4AF37', padding: '15px 35px', borderRadius: '25px', fontWeight: '900', fontSize: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '2.5px solid #D4AF37', animation: 'success-pop 0.5s' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Check size={24} strokeWidth={4} /> 「{organizedData.name}」を整理！
                                </div>
                                <div style={{ fontSize: '11px', color: '#FFF9E6', letterSpacing: '0.1em' }}>場所: {organizedData.shelf}</div>
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
                        <div style={{ textAlign: 'center', backgroundColor: (selectedPlacingItem || draggingItem) ? '#4A351D' : '#D4AF37', color: 'white', padding: '16px', borderRadius: '40px', fontSize: '15px', fontWeight: '900', marginBottom: '25px', boxShadow: '0 12px 35px rgba(0,0,0,0.2)', animation: 'bounce 2s infinite' }}>
                            {draggingItem ? "移動中！離すとここへ戻ります ✨" : selectedPlacingItem ? "いま選択中！棚のボタンを押してね" : "お洋服を掴んで棚へ運ぼう！"}
                        </div>
                    )}
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', borderRadius: '35px', padding: '30px', border: dragOverZone === 'unorganized-box' ? '4px solid #D4AF37' : '4px dashed #D1CDC0', minHeight: '180px', display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
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
                                        transform: isSelected ? 'scale(1.2) translateY(-10px)' : 'none',
                                        transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                    }}
                                >
                                    <div style={{ width: '85px', height: '85px', borderRadius: '24px', overflow: 'hidden', border: isSelected ? '6px solid #D4AF37' : '3px solid white', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
                                        <img src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                </div>
                            );
                        }) : (
                            <div style={{ opacity: 0.3, textAlign: 'center', padding: '40px' }}><Star size={50} fill="#D4AF37" color="#D4AF37" /><p style={{ fontWeight: '900' }}>すべて整理されました！✨</p></div>
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
                        <div style={{ position: 'absolute', top: '-10px', right: '-10px' }}><Sparkles color="#D4AF37" fill="#D4AF37" size={30} /></div>
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
                                    <p style={{ fontSize: '12px', color: '#D4AF37', fontWeight: '800', margin: '4px 0 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
