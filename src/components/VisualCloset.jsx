/* eslint-disable react/no-unstable-nested-components, react-hooks/static-components */
import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { Shirt, ShoppingBag, Plus, MousePointer2, Star, Ghost, Sparkles, HelpCircle, Heart, Camera, Check, Info, ArrowDownCircle, Zap, Box, Tag, Edit2 } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

/**
 * 夢見る看板 (v11.0 - シンプル化)
 */
/**
 * Luxury Wardrobe Logo & Drawer Utility
 */
const WardrobeLogo = ({ total, t, userName }) => (
    <div style={{ position: 'relative', marginBottom: '-5px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', zIndex: 60 }}>
        <div style={{
            backgroundColor: '#FDFBF7', padding: '12px 35px', borderRadius: '4px', border: '1px solid #D4AF37',
            boxShadow: '0 10px 20px rgba(0,0,0,0.1), inset 0 0 10px rgba(212,175,55,0.05)', display: 'flex', alignItems: 'center', gap: '15px'
        }}>
            <h1 style={{ fontSize: '18px', color: '#B8860B', letterSpacing: '0.15em', fontWeight: '400', fontFamily: 'serif', margin: 0 }}>
                {t('wardrobeHeader', userName || 'Admin')}
            </h1>
            <div style={{ height: '24px', width: '1px', backgroundColor: '#EAE3D9' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#A07855', letterSpacing: '0.1em' }}>{t('plushieItemsCount', total)}</span>
            </div>
        </div>
    </div>
);



/**
 * マスコット
 */

const VisualCloset = ({ items = [], onSelectItem, updateClosetItem, t }) => {
    const { customCategoryNames, setCustomCategoryNames } = useContext(AppContext);
    const { currentUser } = useAuth();

    // Universal Pointer Drag (v11.1 Omni-Directional)
    const [draggingItem, setDraggingItem] = useState(null);
    const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });
    const [dragOverZone, setDragOverZone] = useState(null);
    const dragIntentRef = useRef(null);

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
            if (dragIntentRef.current && !draggingItem) {
                const dx = Math.abs(e.clientX - dragIntentRef.current.startX);
                const dy = Math.abs(e.clientY - dragIntentRef.current.startY);
                if (dx > 5 || dy > 5) {
                    setDraggingItem(dragIntentRef.current.item);
                    setPointerPos({ x: e.clientX, y: e.clientY });
                    dragIntentRef.current = null;
                } else {
                    return;
                }
            }
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
            dragIntentRef.current = null;
            if (!draggingItem) return;
            if (dragOverZone && updateClosetItem) { // Original condition was `dragOverZone && updateClosetItem`
                if (dragOverZone === 'unorganized-box') {
                    updateClosetItem(draggingItem.id.replace(/^local-/, ''), { category: 'other' });
                    triggerSuccess('unorganized-box', draggingItem.itemName || t('clothing'), t('unorganizedBox'));
                } else {
                    const targetShelf = shelfRefs.current[dragOverZone];
                    const targetCat = targetShelf.getAttribute('data-cats')?.split(',')[0];
                    const shelfLabel = targetShelf.getAttribute('data-label');
                    updateClosetItem(draggingItem.id.replace(/^local-/, ''), { category: targetCat });
                    triggerSuccess(dragOverZone, draggingItem.itemName || t('clothing'), shelfLabel);
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
        if (e.button !== 0) return; // Only left click
        e.preventDefault();
        dragIntentRef.current = { item, startX: e.clientX, startY: e.clientY };
    };

    const handlePlaceToShelf = (targetCat, zone, shelfLabel) => {
        if (selectedPlacingItem && updateClosetItem) {
            updateClosetItem(selectedPlacingItem.id.replace(/^local-/, ''), { category: targetCat });
            triggerSuccess(zone, selectedPlacingItem.itemName || t('clothing'), shelfLabel);
            setSelectedPlacingItem(null);
        }
    };

    const handleRename = (key) => {
        const newName = window.prompt(t('enterNewCategoryName'), customCategoryNames[key] || '');
        if (newName !== null) {
            setCustomCategoryNames(prev => ({ ...prev, [key]: newName }));
        }
    };

    const getZoneIcon = (zone) => {
        const icons = {
            'hat': '👒',
            'jewelry': '💎',
            'glasses': '👓',
            'scarf': '🧣',
            'camera': '📷',
            'shoes': '👠',
            'bagh': '👜',
            'bagb': '🎒',
            'custom1': '✨',
            'custom2': '🌟',
            'tops': '👚',
            'bottoms': '👖',
            'hang-1': '👗',
            'hang-2': '🧥',
            'ethnic': '👘',
            'hang-3': '🎽'
        };
        return icons[zone] || '';
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
                    backgroundColor: '#FAF5EE',
                    borderRadius: '2px', // Square luxury look
                    boxShadow: (isHover || (isSelectedMode && isHover)) ? '0 10px 30px rgba(212,175,55,0.3)' : isSuccess ? '0 0 40px rgba(212,175,55,0.5)' : 'inset 0 10px 40px rgba(139,69,19,0.05), inset 0 -5px 10px rgba(0,0,0,0.02)',
                    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.5s',
                    background: isSuccess ? 'radial-gradient(circle at center, #FFFDEB 0%, #FAF5EE 100%)' : '#FAF5EE',
                    border: '1px solid #E8E0D5'
                }}>
                    {/* Spotlight Base Glow */}
                    <div style={{ position: 'absolute', top: 0, left: '-20%', right: '-20%', height: '140px', background: 'radial-gradient(ellipse at top center, rgba(255, 240, 200, 0.9) 0%, rgba(255, 235, 180, 0.3) 50%, transparent 80%)', zIndex: 1, pointerEvents: 'none' }}></div>
                    {/* Spotlight Hardware */}
                    <div style={{ position: 'absolute', top: '-2px', left: '50%', transform: 'translateX(-50%)', width: '20px', height: '8px', background: '#FFF8D6', borderRadius: '0 0 10px 10px', boxShadow: '0 2px 10px #FFD700, 0 5px 20px #FFF', zIndex: 11 }}></div>

                    {/* Cavity Depth Shadows */}
                    <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 4px 15px rgba(0,0,0,0.05)', pointerEvents: 'none' }}></div>

                    {/* Faint Background Illustration (Physical Placement) */}
                    <div style={{
                        position: 'absolute', 
                        top: isHanging ? '50px' : 'auto', 
                        bottom: isHanging ? 'auto' : '5px',
                        left: '0', right: '0',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: isHanging ? 'flex-start' : 'flex-end',
                        zIndex: 2, pointerEvents: 'none', 
                        opacity: displayItem ? 0.02 : 0.30, 
                        mixBlendMode: 'multiply',
                        filter: 'grayscale(15%) sepia(35%) hue-rotate(345deg) drop-shadow(0 15px 10px rgba(100,50,20,0.25))',
                        fontSize: isHanging ? '135px' : isSmall ? '50px' : '90px',
                        userSelect: 'none', transition: 'all 0.5s ease-out',
                        lineHeight: 1
                    }}>
                        {isHanging && !displayItem && (
                            <div style={{ position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', width: '30px', height: '22px', border: '3px solid rgba(139,69,19,0.3)', borderBottom: 'none', borderRadius: '15px 15px 0 0', zIndex: -1 }}></div>
                        )}
                        <div style={{ transform: isHanging ? 'translateY(0)' : 'translateY(12px)' }}>
                            {getZoneIcon(zone)}
                        </div>
                    </div>

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
                            position: 'absolute', inset: '5px', background: 'rgba(61, 122, 127, 0.15)', backdropFilter: 'blur(3px)',
                            borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            color: '#3D7A7F', zIndex: 120, border: '2px dashed rgba(61, 122, 127, 0.5)'
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

                    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'initial', zIndex: 10, pointerEvents: 'auto' }}>
                        <div className="no-scrollbar" style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: myItems.length > 1 ? 'flex-start' : 'center', overflowX: 'auto', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
                            {myItems.length > 0 ? myItems.slice().reverse().map((item) => (
                                <div key={item.id} style={{ flex: '0 0 100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', scrollSnapAlign: 'start', position: 'relative' }}>
                                    <div
                                        onPointerDown={(e) => {
                                            const startX = e.clientX;
                                            const startY = e.clientY;
                                            
                                            const onPointerUp = (upEvent) => {
                                                const dx = Math.abs(upEvent.clientX - startX);
                                                const dy = Math.abs(upEvent.clientY - startY);
                                                if (dx < 5 && dy < 5) {
                                                    upEvent.stopPropagation();
                                                    if (!isSelectedMode) setOpenShelf({ cats, label: finalLabel });
                                                }
                                                document.removeEventListener('pointerup', onPointerUp);
                                            };
                                            document.addEventListener('pointerup', onPointerUp);
                                            
                                            handlePointerDown(e, item);
                                        }}
                                        style={{
                                            position: 'relative', width: '85%', height: '85%', zIndex: 10, cursor: 'pointer'
                                        }}
                                    >
                                        {isHanging && (
                                            <div style={{ position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', width: '14px', height: '20px', borderLeft: '2.5px solid #AA771C', borderTop: '2.5px solid #AA771C', borderRadius: '10px 10px 0 0', zIndex: 5 }}></div>
                                        )}
                                        <img
                                            src={item.imageUrl}
                                            draggable="false"
                                            onDragStart={(e) => e.preventDefault()}
                                            style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 15px 35px rgba(0,0,0,0.25))' }}
                                        />
                                    </div>
                                </div>
                            )) : (
                                <div style={{ flex: '0 0 100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isSelectedMode ? 0 : 0.08 }}>
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
                            backgroundColor: 'white', border: '1.5px solid #DCD8D4', borderRadius: '6px',
                            padding: '5px 12px', fontSize: '11px', fontWeight: '900', color: '#4A4C4A',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.04)', letterSpacing: '0.02em', cursor: count > 0 ? 'pointer' : 'default',
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

    // --- Interactive Drawer Component ---
    const InteractiveDrawer = ({ label, zone, cats }) => {
        const myItems = cats.flatMap(c => sorted[c] || []);
        const finalLabel = label;
        const isHover = dragOverZone === zone;
        const isEmpty = myItems.length === 0;
        const isSelectedMode = !!selectedPlacingItem;
        const isSuccess = successZone === zone;

        return (
            <div
                ref={el => shelfRefs.current[zone] = el}
                onClick={() => {
                    if (isSelectedMode) {
                        handlePlaceToShelf(cats[0], zone, finalLabel);
                    } else {
                        setOpenShelf({ cats, label: finalLabel });
                    }
                }}
                style={{
                    flex: '0 0 50px',
                    backgroundColor: isHover || (isSelectedMode && isHover) ? '#FDF8ED' : '#FDFBF7',
                    border: isHover || (isSelectedMode && isHover) ? '2px solid #D4AF37' : '1px solid #EAE3D9',
                    borderRadius: '4px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isHover || (isSelectedMode && isHover) ? 'inset 0 0 15px rgba(212,175,55,0.1), 0 5px 15px rgba(212,175,55,0.2)' : 'inset 0 -5px 10px rgba(0,0,0,0.03), 0 5px 10px rgba(0,0,0,0.05)',
                    position: 'relative', overflow: 'hidden', height: '60px', marginTop: 'auto', cursor: 'pointer',
                    transition: 'all 0.2s', filter: isHover ? 'brightness(1.02)' : 'none'
                }}>
                <div style={{ position: 'absolute', inset: '4px', border: '1px solid rgba(212,175,55,0.3)', backgroundColor: '#FAF7F2', borderRadius: '2px' }}></div>
                
                {isSelectedMode && (
                    <div style={{
                        position: 'absolute', inset: '2px', background: 'rgba(61, 122, 127, 0.15)', backdropFilter: 'blur(3px)',
                        borderRadius: '2px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        color: '#3D7A7F', zIndex: 120, border: '2px dashed rgba(61, 122, 127, 0.5)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Plus size={16} strokeWidth={5} />
                            <div style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '0.1em' }}>PLACE</div>
                        </div>
                    </div>
                )}
                
                {isSuccess && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150 }}>
                        <div style={{ animation: 'firework 1s ease-out forwards', opacity: 1, color: '#3D7A7F' }}>
                            <Sparkles size={48} fill="#3D7A7F" />
                        </div>
                    </div>
                )}

                {/* Horizontal Drawer Handle */}
                <div style={{ width: '40px', height: '5px', background: 'linear-gradient(to bottom, #FFDF73, #D4AF37, #AA8C2C)', borderRadius: '3px', zIndex: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></div>
                
                {/* Label and Count Badge */}
                <div style={{ zIndex: 2, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                    <span style={{ fontSize: '10px', color: '#8B6A47', fontWeight: 'bold', letterSpacing: '0.15em' }}>{finalLabel}</span>
                    <span style={{ 
                        fontSize: '9px', color: isEmpty ? 'transparent' : '#FFF', 
                        fontWeight: '900', background: isEmpty ? 'transparent' : '#D4AF37', 
                        padding: '1px 6px', borderRadius: '10px', 
                        boxShadow: isEmpty ? 'none' : '0 2px 4px rgba(212,175,55,0.4)',
                        transition: 'all 0.3s'
                    }}>
                        {myItems.length}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom, #F9F6F0, #EAE3D9)', padding: '50px 10px 300px', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden', touchAction: 'none', position: 'relative' }}>

            {/* Floor and Rug */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '400px', background: 'repeating-linear-gradient(90deg, #9C6F44, #9C6F44 40px, #8B5A2B 40px, #8B5A2B 42px)', filter: 'perspective(500px) rotateX(60deg)', transformOrigin: 'bottom', opacity: 0.9, zIndex: 0, pointerEvents: 'none' }}></div>
            {/* Added a subtle shadow below the wardrobe instead of the glowing rug */}
            <div style={{ position: 'absolute', bottom: '180px', left: '15%', right: '15%', height: '40px', background: 'black', borderRadius: '50px', filter: 'blur(15px)', opacity: 0.3, zIndex: 1, pointerEvents: 'none' }}></div>

            <WardrobeLogo total={totalCount} t={t} userName={currentUser?.displayName} />

            <div style={{ position: 'relative', width: '100%', maxWidth: '800px', margin: '0 auto', padding: '0 5px', zIndex: 10 }}>

                {/* 箱エリア (操作性を上げるため上部に移設) */}
                <div
                    ref={boxRef}
                    style={{
                        position: 'sticky', top: '10px',
                        width: '100%', zIndex: 999,
                        transition: 'all 0.3s',
                        transform: dragOverZone === 'unorganized-box' ? 'scale(1.02)' : 'none',
                        marginBottom: '15px'
                    }}
                >
                    {sorted['unorganized']?.length > 0 && (
                        <div style={{ textAlign: 'center', backgroundColor: (selectedPlacingItem || draggingItem) ? '#3D7A7F' : 'rgba(255,255,255,0.9)', color: (selectedPlacingItem || draggingItem) ? 'white' : '#555', padding: '10px', borderRadius: '16px 16px 0 0', fontSize: '13px', fontWeight: '800', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.5)', borderBottom: 'none', boxShadow: '0 -5px 20px rgba(0,0,0,0.05)' }}>
                            {draggingItem ? t('closetHintMoving') : selectedPlacingItem ? t('closetHintSelected') : t('closetHintDefault')}
                        </div>
                    )}
                    <div className="unorganized-scroll-tray" style={{ backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', borderRadius: sorted['unorganized']?.length > 0 ? '0 0 24px 24px' : '24px', padding: '15px 20px 25px 20px', border: dragOverZone === 'unorganized-box' ? '4px solid #3D7A7F' : '1px solid rgba(255,255,255,0.5)', display: 'flex', overflowX: 'auto', gap: '15px', alignItems: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', minHeight: '110px' }}>
                        {sorted['unorganized']?.length > 0 ? sorted['unorganized'].map(item => {
                            const isSelected = selectedPlacingItem?.id === item.id;
                            const isDraggingNow = draggingItem?.id === item.id;
                            return (
                                <div key={item.id}
                                    onPointerDown={(e) => handlePointerDown(e, item)}
                                    onClick={() => setSelectedPlacingItem(isSelected ? null : item)}
                                    style={{
                                        cursor: 'grab', position: 'relative', flexShrink: 0,
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
                            <div style={{ opacity: 0.3, width: '100%', textAlign: 'center', padding: '20px' }}>
                                <Heart size={40} fill="#3D7A7F" color="#3D7A7F" style={{ margin: '0 auto' }} />
                                <p style={{ fontWeight: '800', marginTop: '10px', fontSize: '14px' }}>{t('allSorted')}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- The Clear Glass Chandelier (Reverted to Original) --- */}
                <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', zIndex: 50, marginBottom: '-55px', marginTop: '5px' }}>
                    <div style={{ width: '140px', height: '110px', background: 'radial-gradient(circle at 50% 10%, rgba(255,255,255,0.9) 0%, rgba(240,248,255,0.4) 40%, transparent 70%)', display: 'flex', flexDirection: 'column', alignItems: 'center', filter: 'drop-shadow(0 10px 20px rgba(255,255,255,0.6))' }}>
                        {/* Silver Chain */}
                        <div style={{ width: '3px', height: '18px', background: 'linear-gradient(to right, #B0BEC5, #FFFFFF, #B0BEC5)', boxShadow: '0 0 5px rgba(255,255,255,0.8)' }}></div>
                        {/* Clear Glass Crystals */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', filter: 'grayscale(100%) brightness(1.5) contrast(1.2) drop-shadow(0 5px 15px rgba(255,255,255,0.9))' }}>
                            <div style={{ fontSize: '45px', lineHeight: '30px', letterSpacing: '-8px', zIndex: 2 }}>✨💎✨</div>
                            <div style={{ fontSize: '20px', lineHeight: '20px', marginTop: '2px', opacity: 0.9 }}>💎</div>
                        </div>
                    </div>
                </div>

                {/* --- The Closet Cabinet Structure (Luxury 2-Pillar Edition) --- */}
                {/* --- The Closet Cabinet Structure (Luxury 2-Pillar Edition) --- */}
                <div style={{ position: 'relative', backgroundColor: '#FDFBF7', borderTop: '20px solid #F0EEE9', borderBottom: '20px solid #F0EEE9', borderLeft: '12px solid #F0EEE9', borderRight: '12px solid #F0EEE9', boxShadow: '0 40px 80px rgba(0,0,0,0.2), inset 0 10px 20px rgba(0,0,0,0.05)', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', padding: '15px 10px', zIndex: 10, minHeight: '600px', borderRadius: '4px' }}>
                    
                    {/* (Absolute Elements are at the bottom of this div to prevent grid auto-placement issues) */}

                    {/* Left Pillar: Accessories & Bags & Active */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 10, minWidth: 0 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                            <PhotoShelf label={t('catHat')} zone="hat" cats={['hat']} isSmall={true} />
                            <PhotoShelf label={t('catJewelry')} zone="jewelry" cats={['jewelry']} isSmall={true} />
                            <PhotoShelf label={t('catGlasses')} zone="glasses" cats={['glasses']} isSmall={true} />
                            <PhotoShelf label={t('catScarf')} zone="scarf" cats={['scarf']} isSmall={true} />
                            <PhotoShelf label={t('catCamera')} zone="camera" cats={['camera']} isSmall={true} />
                            <PhotoShelf label={t('catShoes')} zone="shoes" cats={['shoes']} isSmall={true} />
                            <PhotoShelf label={t('catCustom1')} zone="custom1" cats={['custom1']} isSmall={true} customKey="custom1" />
                            <PhotoShelf label={t('catCustom2')} zone="custom2" cats={['custom2']} isSmall={true} customKey="custom2" />
                        </div>
                        <PhotoShelf label={t('catBag')} zone="bagh" cats={['bag_hand', 'bag_back', 'bag']} isSmall={false} />
                        <PhotoShelf label={t('catSport')} zone="hang-3" cats={['sport', 'sportswear', 'jersey']} isSmall={false} />
                        <InteractiveDrawer label={t('catArchive')} zone="archive" cats={['archive']} />
                    </div>

                    {/* Right Pillar: Wardrobe & Clothing */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 10, minWidth: 0 }}>
                        <PhotoShelf label={t('catOnePiece')} zone="hang-1" cats={['onepiece', 'dress']} isHanging={true} />
                        <PhotoShelf label={t('catCoat')} zone="hang-2" cats={['outer', 'coat']} isHanging={true} />
                        <PhotoShelf label={t('catEthnic')} zone="ethnic" cats={['ethnic', 'folk']} isSmall={false} />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <PhotoShelf label={t('catTops')} zone="tops" cats={['tops', 'knit', 'tshirt']} isSmall={false} />
                            <PhotoShelf label={t('catBottoms')} zone="bottoms" cats={['skirt', 'pants']} isSmall={false} />
                        </div>
                        <InteractiveDrawer label={t('catPattern')} zone="pattern" cats={['pattern']} />
                    </div>

                    {/* --- Absolute Elements (Placed at the bottom to avoid grid interference) --- */}
                    {/* Background Central Pillar */}
                    <div style={{ position: 'absolute', top: '10px', bottom: '10px', left: '50%', width: '12px', transform: 'translateX(-50%)', background: 'linear-gradient(90deg, #F0EEE9, #Fdfbf7, #EAE3D9)', borderRadius: '2px', boxShadow: 'inset 1px 0 3px rgba(255,255,255,0.8), inset -1px 0 3px rgba(0,0,0,0.05)', zIndex: 5 }}></div>
                    
                    {/* Crown Molding Detail */}
                    <div style={{ position: 'absolute', top: '-30px', left: '-15px', right: '-15px', height: '10px', background: 'linear-gradient(to bottom, #FFFFFF, #EBE6DF)', borderRadius: '4px 4px 0 0', boxShadow: '0 5px 10px rgba(0,0,0,0.1)', zIndex: 5 }}></div>
                    
                    {/* --- Sitting Unae-san (Pink Dress Edition - Sitting on Top Shelf) --- */}
                    <div style={{ 
                        position: 'absolute', top: '-68px', right: '25px', zIndex: 60, 
                        width: '70px', height: '58px', overflow: 'hidden', 
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                        pointerEvents: 'none'
                    }}>
                        <img 
                            src="/avatars/unae_pink_sitting.png" 
                            onError={(e) => { e.target.onerror = null; e.target.src = '/avatars/unae_pink_dress.jpg'; }}
                            alt="Unae-san Pink Sitting" 
                            style={{ 
                                width: '100%', height: 'auto', 
                                filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))',
                                transform: 'translateY(1px)' 
                            }} 
                        />
                    </div>

                </div>

                    {/* Organized Popup removed based on user feedback (redundant) */}
                {/* 箱エリア (移設済) */}

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
                        position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(74, 53, 29, 0.4)', backdropFilter: 'blur(8px)', animation: 'fade-in 0.3s'
                    }} onClick={() => setOpenShelf(null)}>
                        <div style={{
                            width: '90%', maxWidth: '480px', backgroundColor: '#FFFEFB', borderRadius: '30px',
                            padding: '30px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', position: 'relative',
                            maxHeight: '85vh', overflowY: 'auto', animation: 'success-pop 0.3s ease-out'
                        }} onClick={e => e.stopPropagation()}>

                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                <div>
                                    <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#4A351D', margin: 0 }}>{openShelf.label}</h2>
                                    <p style={{ fontSize: '12px', color: '#3D7A7F', fontWeight: '800', margin: '4px 0 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {t('plushieItemsCount', openShelf.cats.flatMap(c => sorted[c] || []).length)}
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
                                        style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', animation: 'fade-in 0.5s' }}
                                    >
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                updateClosetItem(String(item.id).replace(/^local-/, ''), { category: 'unorganized' });
                                                if (openShelf.cats.flatMap(c => sorted[c] || []).length <= 1) setOpenShelf(null);
                                            }}
                                            style={{ 
                                                position: 'absolute', top: '5px', right: '5px', 
                                                backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(4px)',
                                                border: '1px solid rgba(61,122,127,0.3)', borderRadius: '12px', padding: '4px 8px',
                                                display: 'flex', alignItems: 'center', gap: '4px', zIndex: 10, cursor: 'pointer',
                                                boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
                                            }}
                                        >
                                            <ArrowDownCircle size={12} color="#3D7A7F" />
                                            <span style={{ fontSize: '10px', fontWeight: '800', color: '#3D7A7F' }}>{t('returnToBox')}</span>
                                        </button>
                                        <div onClick={() => { onSelectItem(item); setOpenShelf(null); }} style={{
                                            width: '100%', aspectRatio: '1/1', borderRadius: '20px', overflow: 'hidden', backgroundColor: 'white',
                                            boxShadow: '0 8px 20px rgba(0,0,0,0.06)', border: '2px solid #F0EEE9', cursor: 'pointer'
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
                                        <p style={{ fontWeight: '900' }}>{t('shelfEmpty')}</p>
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
                @keyframes twinkle { 0% { opacity: 0.4; transform: scale(0.8); } 100% { opacity: 1; transform: scale(1.2); } }
                @keyframes swing-legs { 0% { transform: rotate(-15deg); } 100% { transform: rotate(15deg); } }
                .unorganized-scroll-tray::-webkit-scrollbar { height: 10px; }
                .unorganized-scroll-tray::-webkit-scrollbar-track { background: rgba(0,0,0,0.03); border-radius: 5px; margin: 0 20px; }
                .unorganized-scroll-tray::-webkit-scrollbar-thumb { background: rgba(61,122,127,0.3); border-radius: 5px; border: 2px solid rgba(255,255,255,0.85); background-clip: padding-box; }
                .unorganized-scroll-tray::-webkit-scrollbar-thumb:hover { background: rgba(61,122,127,0.6); border: 2px solid rgba(255,255,255,0.85); background-clip: padding-box; }
            `}} />
            </div> {/* END Wrapper (340) */}
        </div> // END Container (336)
    );
};

export default VisualCloset;
