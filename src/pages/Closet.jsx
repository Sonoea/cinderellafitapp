import React, { useState, useRef, useEffect, Suspense, lazy } from 'react';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore'; // Import Firestore functions
import { db } from '../firebase/config'; // Import db
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Edit2, Trash2, Plus, Shirt, Users, Heart, Share2, Lock, Unlock, X, Camera, Star, MapPin, Search, Ruler } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';
// import AddItemModal from '../components/AddItemModal';
import Portal from '../components/Portal';
// import { MOCK_GALLERY } from '../constants/mockData';

const AddItemModal = lazy(() => import('../components/AddItemModal'));

// MOCK_GALLERY removed to prevent data leak confusion

// --- HELPER FUNCTIONS (Defined outside component to avoid TDZ) ---
const safeHostname = (url) => {
  try {
    if (!url || typeof url !== 'string') return '';
    const urlToCheck = url.startsWith('http') ? url : `https://${url}`;
    return new URL(urlToCheck).hostname;
  } catch (e) {
    return '';
  }
};

const safeDate = (dateVal) => {
  try {
    if (!dateVal) return 'Recently';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toISOString().split('T')[0];
  } catch (e) {
    return 'Recently';
  }
};

// --- MAIN CLOSET COMPONENT ---
const Closet = () => {
  // Debugging log for production crash
  console.log("Closet component rendering...");

  const { plushies = [], updatePlushie, closetItems = [], addClosetItem, updateClosetItem, deleteClosetItem, t } = useApp();
  const { currentUser } = useAuth();

  // --- STATE DECLARATIONS ---
  const [activeTab, setActiveTab] = useState('items'); // 'items', 'gallery', 'plushies'

  // Gallery State
  const [publicItems, setPublicItems] = useState([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);

  // Filters (Items Tab)
  const [activePlushieId, setActivePlushieId] = useState('all');
  const [activeFitRating, setActiveFitRating] = useState('all');

  // Filters (Gallery Tab)
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMySize, setFilterMySize] = useState(false);

  // Modals / Selection
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  useEffect(() => {
    if (activeTab === 'gallery') {
      const fetchGallery = async () => {
        setIsLoadingGallery(true);
        try {
          // Use Collection Group Query to search ALL 'closetItems' collections for isPublic == true
          const q = query(collectionGroup(db, 'closetItems'), where('isPublic', '==', true));
          const querySnapshot = await getDocs(q);
          const items = [];
          querySnapshot.forEach((doc) => {
            try {
              const data = doc.data();
              // Safety checks
              if (!data) return;

              items.push({
                id: doc.id,
                ...data,
                userName: data.userName || 'Unknown User',
                userIcon: data.userIcon || '/api/placeholder/40/40',
                shopName: safeHostname(data.url),
                date: safeDate(data.createdAt),
              });
            } catch (err) {
              console.warn("Skipping invalid gallery item:", doc.id, err);
            }
          });
          // Sort by createdAt descending
          items.sort((a, b) => {
            const dateA = a.date === 'Recently' ? 0 : new Date(a.date).getTime();
            const dateB = b.date === 'Recently' ? 0 : new Date(b.date).getTime();
            return dateB - dateA;
          });
          setPublicItems(items);
        } catch (error) {
          console.error("Error fetching global gallery:", error);
        } finally {
          setIsLoadingGallery(false);
        }
      };

      fetchGallery();
    }
  }, [activeTab]);

  // --- FILTERED ITEMS LOGIC ---
  const filteredItems = React.useMemo(() => {
    // 1. Merge Local Public Items
    const userDisplayName = currentUser?.displayName || 'You';
    const userPhoto = currentUser?.photoURL || '/api/placeholder/40/40';

    const localPublicItems = closetItems.filter(item => item.isPublic).map(item => ({
      id: `local-${item.id}`,
      userName: userDisplayName,
      userIcon: userPhoto,
      plushieName: item.plushieName || 'My Plushie',
      plushieHeight: item.plushieHeight || 0,
      location: item.location,
      imageUrl: item.image,
      itemName: item.name,
      shopName: safeHostname(item.url),
      fitRating: item.fitRating,
      comment: item.comment,
      date: safeDate(item.createdAt),
      likes: 0
    }));

    // Combine Public Global Items + Local Public Items (No Mock Data)
    const allItems = [...publicItems, ...localPublicItems];

    // Remove duplicates based on ID if necessary (Firestore IDs should be unique from Local IDs)
    // local IDs are prefixed with 'local-' so no collision with Firestore auto-ids

    return allItems.filter(item => {
      // Text Filter
      const matchesSearch = searchTerm === '' ||
        (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.itemName && item.itemName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.plushieName && item.plushieName.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesSize = true;
      if (filterMySize) {
        if (!item.plushieHeight) matchesSize = false;
        else {
          matchesSize = plushies.some(myPlushie => {
            const myHeight = myPlushie.measurements?.height || 0;
            return Math.abs(myHeight - item.plushieHeight) <= 2;
          });
        }
      }

      return matchesSearch && matchesSize;
    });
  }, [closetItems, publicItems, searchTerm, filterMySize, currentUser, plushies]);

  // Plushie Edit Logic
  const fileInputRef = useRef(null);
  const [editingId, setEditingId] = useState(null);

  const handleEditPlushieClick = (id) => {
    setEditingId(id);
    fileInputRef.current.click();
  };

  const handlePlushieFileChange = async (e) => {
    const file = e.target.files[0];
    if (file && editingId) {
      try {
        const compressedImage = await compressImage(file);
        const plushieToUpdate = plushies.find(p => p.id === editingId);
        if (plushieToUpdate) {
          updatePlushie({ ...plushieToUpdate, image: compressedImage });
        }
      } catch (error) {
        console.error("Image compression failed", error);
        alert(t('imageUploadError') || "Failed to upload image.");
      }
      setEditingId(null);
    }
  };

  const fitLabels = t('fitLabelsShort') || ['Tight', 'Snug', 'Good', 'Loose', 'Perf'];
  const fullFitLabels = t('fitLabels') || ['Too Tight', 'Tight', 'Good', 'Loose', 'Perfect'];

  return (
    <div className="pb-48">
      {/* Header & Tabs */}
      <div className="sticky top-0 bg-background/95 backdrop-blur z-10 pt-4 pb-2 px-4 shadow-sm">
        <h2 className="text-2xl font-black mb-4 flex items-center gap-2">
          {t('myCloset')}
        </h2>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('items')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'items' ? 'bg-white shadow text-primary' : 'text-gray-500'
              }`}
          >
            <Shirt size={16} /> {t('items')}
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'gallery' ? 'bg-white shadow text-primary' : 'text-gray-500'
              }`}
          >
            <Users size={16} /> {t('gallery')}
          </button>
          <button
            onClick={() => setActiveTab('plushies')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'plushies' ? 'bg-white shadow text-primary' : 'text-gray-500'
              }`}
          >
            <Camera size={16} /> {t('plushies')}
          </button>
        </div>
      </div>

      <div className="px-4 mt-4">
        {/* === ITEMS TAB === */}
        {activeTab === 'items' && (
          <div className="fade-in">
            <div className="bg-gray-50 px-4 py-2 rounded-lg mb-4 text-xs text-gray-500 flex items-start gap-2">
              <span className="text-lg">💡</span>
              <p>{t('closetTabHelp')}</p>
            </div>

            <div className="space-y-4">
              {/* --- Plushie Filter Chips --- */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar px-1">
                <button
                  onClick={() => setActivePlushieId('all')}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${activePlushieId === 'all'
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'bg-white text-gray-500 border-gray-200'
                    }`}
                >
                  All
                </button>
                {plushies.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setActivePlushieId(p.id)}
                    className={`flex-shrink-0 px-1 pr-3 py-1 rounded-full border flex items-center gap-2 transition-all ${activePlushieId === p.id
                      ? 'bg-white text-gray-800 border-gray-300 ring-2 ring-gray-100'
                      : 'bg-white text-gray-500 border-gray-200 opacity-60'
                      }`}
                  >
                    <div className="rounded-full overflow-hidden flex-shrink-0 bg-gray-200" style={{ width: '24px', height: '24px' }}>
                      <img src={p.image} className="w-full h-full object-cover" alt="" />
                    </div>
                    <span className="text-[10px] font-bold">{p.name}</span>
                  </button>
                ))}
              </div>

              {/* --- Fit Rating Filter Chips --- */}
              <div className="flex gap-2 mb-2 overflow-x-auto pb-2 no-scrollbar px-1">
                <button
                  onClick={() => setActiveFitRating('all')}
                  className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-bold transition-all border ${activeFitRating === 'all'
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'bg-white text-gray-500 border-gray-200'
                    }`}
                >
                  All
                </button>
                {[1, 2, 3].map(rating => (
                  <button
                    key={rating}
                    onClick={() => setActiveFitRating(rating)}
                    className={`flex-shrink-0 px-3 py-1 rounded-lg border flex items-center gap-1 transition-all ${activeFitRating === rating
                      ? 'bg-white text-gray-800 border-gray-300 ring-2 ring-gray-100 shadow-sm'
                      : 'bg-white text-gray-500 border-gray-200 opacity-60'
                      }`}
                  >
                    <span>{['😣', '😊', '😌'][rating - 1]}</span>
                    <span className="text-[10px] font-bold">
                      {/* Robustly get the label, removing emoji if present in the string to avoid duplication */}
                      {(t('fitLabelsShort')?.[rating - 1] || ['Tight', 'Perfect', 'Loose'][rating - 1]).replace(/^[^\s]+\s/, '')}
                    </span>
                  </button>
                ))}
              </div>

              {/* --- Timeline Grid --- */}
              {(() => {
                // Filter Items based on Active Plushie AND Fit Rating
                const filteredClosetItems = closetItems.filter(item => {
                  // Robust comparison: Convert both to strings to handle mixed types (number vs string)
                  const matchPlushie = activePlushieId === 'all' || String(item.plushieId) === String(activePlushieId);
                  const matchFit = activeFitRating === 'all' || item.fitRating === activeFitRating;
                  return matchPlushie && matchFit;
                });

                if (filteredClosetItems.length === 0) {
                  // Even if no items match, show the Add button
                  return renderGrid([], true);
                }

                // Group items by Year-Month
                const groupedItems = filteredClosetItems.reduce((acc, item) => {
                  let yearStr, monthStr;
                  try {
                    const date = item.createdAt ? new Date(item.createdAt) : new Date();
                    if (isNaN(date.getTime())) throw new Error('Invalid Date');
                    yearStr = date.getFullYear();
                    monthStr = (date.getMonth() + 1).toString().padStart(2, '0');
                  } catch (e) {
                    yearStr = '----';
                    monthStr = '--';
                  }

                  const key = `${yearStr}.${monthStr}`; // e.g., 2026.02
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(item);
                  return acc;
                }, {});

                // Sort keys descending (newest first)
                const sortedKeys = Object.keys(groupedItems).sort((a, b) => b.localeCompare(a));

                // Helper: Render Grid for a group
                const renderGrid = (items, isFirstGroup) => (
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {isFirstGroup && (
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="aspect-square bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all group"
                      >
                        <div className="bg-white p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform mb-2">
                          <Plus size={24} className="text-primary" />
                        </div>
                        <span className="text-xs font-bold">{t('addNewOutfit')}</span>
                      </button>
                    )}
                    {items.map(item => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 relative group cursor-pointer active:scale-95 transition-transform"
                      >
                        <div className="aspect-square bg-gray-100 relative">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          {item.isPublic && (
                            <div className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full backdrop-blur-sm">
                              <Share2 size={12} />
                            </div>
                          )}
                          <div className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black text-white ${item.fitRating === 2 ? 'bg-green-500' :
                            item.fitRating === 1 ? 'bg-red-400' : 'bg-yellow-500'
                            }`}>
                            {['😣', '😊', '😌'][item.fitRating - 1] || '😊'} {fitLabels[item.fitRating - 1]?.replace(/^[^\s]+\s/, '') || ''}
                          </div>
                        </div>
                        <div className="p-2">
                          <h4 className="font-bold text-sm truncate">{item.name || 'Untitled Item'}</h4>
                          <p className="text-xs text-gray-400 truncate">
                            {(() => {
                              try {
                                return item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '---';
                              } catch (e) {
                                return '---';
                              }
                            })()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                );

                // If no items, show just the Add button in a grid
                if (closetItems.length === 0) return renderGrid([], true);

                return (
                  <div className="pb-32">
                    {sortedKeys.map((key, index) => (
                      <div key={key}>
                        <h3 className="text-xs font-black text-gray-400 mb-3 ml-1 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                          {key}
                        </h3>
                        {renderGrid(groupedItems[key], index === 0)}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* === GALLERY TAB === */}
        {activeTab === 'gallery' && (
          <div className="space-y-4 fade-in pb-20">
            <div className="bg-gray-50 px-4 py-2 rounded-lg text-xs text-gray-500 flex items-start gap-2">
              <span className="text-lg">💡</span>
              <p>{t('galleryTabHelp')}</p>
            </div>

            {/* Filter Controls */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  className="w-full bg-gray-50 pl-16 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                onClick={() => setFilterMySize(!filterMySize)}
                className={`w-full py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all border ${filterMySize
                  ? 'bg-primary text-white border-primary shadow-md'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
              >
                <Ruler size={16} />
                {t('filterSize')} {filterMySize && <span className="text-[10px] bg-white/20 px-2 rounded-full ml-1">±2cm</span>}
              </button>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl flex items-center gap-3">
              <div className="bg-white p-2 rounded-full shadow-sm">
                <Users className="text-blue-500" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-blue-900 text-sm">{t('everyonesGallery')}</h3>
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p>No items found matching your filters.</p>
              </div>
            ) : (
              /* Gallery Grid */
              <div className="grid grid-cols-2 gap-3 mb-20 fade-in">
                {filteredItems.map((post) => (
                  <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden break-inside-avoid">
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={post.userIcon} className="w-8 h-8 rounded-full bg-gray-200 object-cover" alt="" />
                        <div>
                          <p className="text-xs font-bold text-gray-800">{post.userName}</p>
                          <div className="flex items-center gap-1 text-[10px] text-gray-400">
                            <span>{post.plushieName}</span>
                            {post.plushieHeight && <span className="bg-gray-100 px-1 rounded text-gray-500">{post.plushieHeight}cm</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 block">{post.date}</span>
                        {post.location && (
                          <div className="flex items-center justify-end gap-0.5 text-[10px] text-blue-400 mt-0.5">
                            <MapPin size={10} />
                            <span className="truncate max-w-[80px]">{post.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="aspect-square bg-gray-50 relative">
                      <img src={post.imageUrl} className="w-full h-full object-cover" alt="" />
                      {post.likes > 0 && (
                        <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm text-pink-500">
                          <Heart size={12} fill="currentColor" /> {post.likes}
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-sm text-gray-800">{post.itemName}</h3>
                        <span className="text-lg">
                          {['😣', '😊', '😌'][post.fitRating - 1] || '😊'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{post.comment}</p>

                      {post.shopName && (
                        <div className="bg-gray-50 px-2 py-1.5 rounded-lg inline-flex items-center gap-1 text-[10px] text-gray-500">
                          <Shirt size={10} />
                          {t('boughtFrom')}: <span className="font-bold">{post.shopName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === PLUSHIES TAB (Original Functionality) === */}
        {activeTab === 'plushies' && (
          <div className="fade-in pb-20">
            <div className="bg-gray-50 px-4 py-2 rounded-lg mb-4 text-xs text-gray-500 flex items-start gap-2">
              <span className="text-lg">💡</span>
              <p>{t('plushiesTabHelp')}</p>
            </div>

            {/* Hidden File Input for Image Update */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePlushieFileChange}
              className="hidden"
              accept="image/*"
            />

            <div className="grid grid-cols-2 gap-4">
              {plushies.map(plushie => (
                <div key={plushie.id} className="bg-white p-4 rounded-2xl shadow-sm flex flex-col items-center gap-3 relative border border-gray-100">
                  <button
                    onClick={() => handleEditPlushieClick(plushie.id)}
                    className="absolute top-2 right-2 p-2 text-gray-400 hover:text-primary bg-gray-50 rounded-full"
                    title="Change Photo"
                  >
                    <Edit2 size={16} />
                  </button>

                  <div className="w-20 h-20 rounded-full p-1 border-2 border-dashed border-gray-200">
                    <img
                      src={plushie.image}
                      className="w-full h-full rounded-full object-cover"
                      alt={plushie.name}
                    />
                  </div>

                  <div className="text-center">
                    <h3 className="text-lg font-bold">{plushie.name}</h3>
                    <span className="text-[10px] text-white bg-secondary px-2 py-0.5 rounded-full">
                      {plushie.type}
                    </span>
                  </div>

                  <div className="w-full bg-gray-50 rounded-lg p-3 text-xs text-gray-500 mt-2">
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                      <div className="flex justify-between"><span>{t('height')}</span> <b>{plushie.measurements.height}</b></div>
                      <div className="flex justify-between"><span>{t('waist')}</span> <b>{plushie.measurements.waist}</b></div>
                    </div>
                  </div>
                </div>
              ))}

              <Link
                to="/measure"
                className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-300 hover:border-primary hover:text-primary hover:bg-gray-50 transition-colors"
                style={{ minHeight: '200px' }}
              >
                <Plus size={32} className="mb-2" />
                <span className="text-xs font-bold">{t('addFriend')}</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* === ADD ITEM MODAL === */}
      {
        showAddModal && (
          <Portal>
            <Suspense fallback={null}>
              <AddItemModal
                onClose={() => setShowAddModal(false)}
                onSave={(item) => {
                  addClosetItem(item);
                  setShowAddModal(false);
                }}
                plushies={plushies}
                t={t}
                fitLabels={fitLabels}
              />
            </Suspense>
          </Portal>
        )
      }

      {/* === ITEM DETAIL MODAL (Also Portaled for safety) === */}
      {
        selectedItem && (
          <Portal>
            <div
              className="fixed inset-0 bg-black/60 z-modal flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200"
              style={{ touchAction: 'none' }}
            >
              <div
                className="modal-responsive relative no-scrollbar shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => { setSelectedItem(null); setIsEditing(false); }}
                  className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full z-10 hover:bg-black/70 backdrop-blur-sm"
                >
                  <X size={20} />
                </button>

                <div className="flex-1 overflow-y-auto min-h-0 bg-white">
                  <div className="relative">
                    <img src={selectedItem.image} alt="" className="w-full aspect-square object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-20 text-white">
                      <h2 className="text-xl font-bold">{selectedItem.name}</h2>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Status Section */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        {isEditing ? (
                          <button
                            onClick={() => setEditData({ ...editData, isPublic: !editData.isPublic })}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${editData.isPublic
                              ? 'text-green-600 bg-green-100 border-2 border-green-400'
                              : 'text-gray-500 bg-gray-100 border-2 border-gray-300'
                              }`}
                          >
                            {editData.isPublic ? <Share2 size={12} /> : <Lock size={12} />}
                            {editData.isPublic ? t('publicGallery') : t('privateOnly')}
                          </button>
                        ) : (
                          <>
                            {selectedItem.isPublic ? (
                              <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-lg font-bold text-xs"><Share2 size={12} /> {t('publicGallery')}</span>
                            ) : (
                              <span className="flex items-center gap-1 text-gray-500 bg-gray-100 px-2 py-1 rounded-lg font-bold text-xs"><Lock size={12} /> {t('privateOnly')}</span>
                            )}
                            <span>•</span>
                            <span>{new Date(selectedItem.createdAt).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                      {/* Edit / Delete Buttons */}
                      <div className="flex gap-1 z-20 relative">
                        {!isEditing && (
                          <button
                            onClick={() => {
                              setIsEditing(true);
                              setEditData({
                                fitRating: selectedItem.fitRating,
                                comment: selectedItem.comment || '',
                                isPublic: selectedItem.isPublic
                              });
                            }}
                            className="text-blue-400 hover:text-blue-500 p-2"
                          >
                            <Edit2 size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (window.confirm(t('deleteConfirm'))) {
                              deleteClosetItem(selectedItem.id);
                              setSelectedItem(null);
                              setIsEditing(false);
                            }
                          }}
                          className="text-red-400 hover:text-red-500 p-2"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* URL */}
                    {selectedItem.url && (
                      <div className="bg-gray-50 p-4 rounded-xl flex items-center gap-3">
                        <div className="bg-white p-2 rounded-lg shadow-sm text-blue-500">
                          <Shirt size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-400 font-bold uppercase">{t('boughtFrom')}</p>
                          <a href={selectedItem.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-primary truncate block hover:underline">

                            {selectedItem.url}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Fit Rating */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-400 uppercase mb-2">{t('fitRatingTitle')}</h4>
                      {isEditing ? (
                        <div className="flex justify-between gap-2">
                          {[1, 2, 3].map((rating) => {
                            const colors = [
                              { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-600' },
                              { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-600' },
                              { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-600' },
                            ][rating - 1];
                            const emojis = ['😣', '😊', '😌'];
                            const labels = [t('fitLabelsShort')?.[0] || 'きつい', t('fitLabelsShort')?.[1] || 'ぴったり', t('fitLabelsShort')?.[2] || '大きめ'];
                            const isSelected = editData.fitRating === rating;
                            return (
                              <button
                                key={rating}
                                onClick={() => setEditData({ ...editData, fitRating: rating })}
                                className={`flex-1 p-3 rounded-xl transition-all border-2 ${isSelected ? `${colors.bg} ${colors.border} scale-105 shadow-md` : 'bg-white border-gray-200 opacity-60'
                                  }`}
                              >
                                <span className={`text-2xl block text-center ${isSelected ? '' : 'grayscale'}`}>{emojis[rating - 1]}</span>
                                <p className={`text-[10px] text-center font-bold mt-1 ${isSelected ? colors.text : 'text-gray-400'}`}>
                                  {labels[rating - 1]?.replace(/^[^\s]+\s/, '') || ''}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex gap-3 items-center">
                          <span className="text-4xl">
                            {['😣', '😊', '😌'][selectedItem.fitRating - 1] || '😊'}
                          </span>
                          <p className="text-lg font-bold text-gray-700">
                            {fullFitLabels[selectedItem.fitRating - 1]}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Comment */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-400 uppercase mb-2">{t('notesTitle')}</h4>
                      {isEditing ? (
                        <textarea
                          className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 h-20 text-sm"
                          placeholder={t('commentPlaceholder')}
                          value={editData.comment}
                          onChange={(e) => setEditData({ ...editData, comment: e.target.value })}
                        />
                      ) : (
                        selectedItem.comment && (
                          <p className="text-gray-700 bg-yellow-50/50 p-4 rounded-xl border border-yellow-100">
                            {selectedItem.comment}
                          </p>
                        )
                      )}
                    </div>

                    {/* Save / Cancel Buttons */}
                    {isEditing && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsEditing(false)}
                          className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-bold"
                        >
                          {t('cancel') || 'キャンセル'}
                        </button>
                        <button
                          onClick={() => {
                            updateClosetItem(selectedItem.id, editData);
                            setSelectedItem({ ...selectedItem, ...editData });
                            setIsEditing(false);
                          }}
                          className="flex-1 py-3 rounded-xl bg-primary text-white font-bold shadow-md"
                        >
                          {t('save') || '保存'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Portal>
        )
      }
    </div >
  );
};

export default Closet;
