import React, { useState, useContext, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Edit2, Trash2, Plus, Shirt, Users, Heart, Share2, Lock, Unlock, X, Camera, Star, MapPin, Search, Ruler } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';

// Helper for Portal
const Portal = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

// Mock Data for Community Gallery
const MOCK_GALLERY = [
  {
    id: 'g0',
    userName: 'うなえさん',
    userIcon: '/unae-san.png',
    plushieName: 'うなえさん',
    plushieHeight: 12,
    location: '東京',
    imageUrl: '/sample-outfit.jpg',
    itemName: 'パンダのドレス',
    shopName: 'ダイソー',
    fitRating: 2,
    comment: 'ダイソーの椅子の靴下です。ヒレを通す穴を開ければ、うなえさんにぴったりのドレスに変身！',
    date: '2026-02-07',
    likes: 42,
  }
];

// --- REUSABLE FORM COMPONENT ---
// Moved to top to avoid ReferenceError
const ClosetItemForm = ({ plushies, t, fitLabels, onSave, onCancel }) => {
  const [image, setImage] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    plushieId: plushies[0]?.id || '',
    fitRating: 2,
    comment: '',
    location: '',
    isPublic: true,
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setImage(compressed);
      } catch {
        alert('Failed to load image');
      }
    }
  };

  const handleSaveWrapper = () => {
    if (!image) return;

    // Get selected plushie data to snapshot
    // Ensure plushies is array
    const safePlushies = Array.isArray(plushies) ? plushies : [];
    const selectedPlushie = safePlushies.find(p => p.id === formData.plushieId);

    onSave({
      image,
      ...formData,
      plushieName: selectedPlushie ? selectedPlushie.name : 'Unknown',
      plushieHeight: selectedPlushie && selectedPlushie.measurements ? selectedPlushie.measurements.height : 0
    });
  };

  // Safe check for fitLabels
  const safeFitLabels = Array.isArray(fitLabels) ? fitLabels : ['Tight', 'Snug', 'Good', 'Loose', 'Perf'];

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 overflow-y-auto no-scrollbar min-h-0">
        <div className="p-4 space-y-6">

          {/* 1. Photo Section */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">{t('uploadPhoto')}</label>
            {!image ? (
              <div className="w-full aspect-video bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center relative overflow-hidden group hover:border-primary transition-colors cursor-pointer hover:bg-gray-100">
                <input type="file" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                <Camera size={32} className="text-gray-400 mb-2 group-hover:text-primary transition-colors" />
                <p className="text-gray-400 font-bold text-xs">{t('tapToTakePhoto')}</p>
              </div>
            ) : (
              <div className="w-full aspect-video bg-gray-100 rounded-xl overflow-hidden relative shadow-sm border border-gray-200">
                <img src={image} alt="Preview" className="w-full h-full object-cover" />
                <label className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full text-xs font-bold px-3 backdrop-blur-sm cursor-pointer hover:bg-black/70 transition-colors">
                  {t('retake')}
                  <input type="file" onChange={handleImageUpload} className="hidden" accept="image/*" />
                </label>
              </div>
            )}
          </div>

          {/* 2. Form Fields (Always Visible) */}
          <div className={`space-y-4 transition-opacity duration-300 ${!image ? '' : ''}`}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">{t('itemName')}</label>
                <input
                  type="text"
                  className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder={t('itemNamePlaceholder')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">{t('productUrl')}</label>
                <input
                  type="url"
                  className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="https://..."
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">{t('locationLabel')}</label>
                <div className="relative">
                  <div className="absolute top-3 left-3 text-gray-400">
                    <MapPin size={16} /> {/* MapPin is imported */}
                  </div>
                  <input
                    type="text"
                    className="w-full p-3 pl-10 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder={t('locationPlaceholder')}
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">{t('selectModelTitle')}</label>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {Array.isArray(plushies) && plushies.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setFormData({ ...formData, plushieId: p.id })}
                      className={`flex-shrink-0 p-1 pr-3 rounded-full border flex items-center gap-2 transition-all ${formData.plushieId === p.id
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                      <img src={p.image} className="w-8 h-8 rounded-full object-cover" alt="" />
                      <span className={`text-xs font-bold ${formData.plushieId === p.id ? 'text-primary' : 'text-gray-600'}`}>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">{t('fitRating')}</label>
                <div className="flex justify-between bg-gray-50 p-3 rounded-xl gap-2">
                  {[1, 2, 3].map((rating) => {
                    const colors = [
                      { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-600', selectedBg: 'bg-red-100' },
                      { bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-600', selectedBg: 'bg-green-100' },
                      { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-600', selectedBg: 'bg-yellow-100' },
                    ][rating - 1];
                    const emojis = ['😣', '😊', '😌'];
                    const isSelected = formData.fitRating === rating;

                    return (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setFormData({ ...formData, fitRating: rating })}
                        className={`
                          flex-1 p-3 rounded-xl transition-all duration-200 relative
                          ${isSelected
                            ? `${colors.selectedBg} scale-110 shadow-lg ring-4 ${colors.border.replace('border-', 'ring-')}`
                            : 'bg-white hover:bg-gray-100 opacity-60'}
                          active:scale-95
                          border-3 
                          ${isSelected ? colors.border : 'border-gray-200'}
                        `}
                      >
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md">
                            <span className="text-xs">✓</span>
                          </div>
                        )}
                        <span className={`text-3xl block text-center mb-1 ${isSelected ? '' : 'grayscale'}`}>{emojis[rating - 1]}</span>
                        <p className={`text-[10px] text-center font-bold ${isSelected ? colors.text : 'text-gray-400'}`}>
                          {safeFitLabels[rating - 1]?.replace(/^[^\s]+\s/, '') || ''}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">{t('commentLabel')}</label>
                <textarea
                  className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 h-20 text-sm"
                  placeholder={t('commentPlaceholder')}
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                ></textarea>
              </div>

              <div className="flex items-center justify-between bg-blue-50 p-3 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-full ${formData.isPublic ? 'bg-blue-500 text-white' : 'bg-gray-300 text-white'}`}>
                    {formData.isPublic ? <Unlock size={16} /> : <Lock size={16} />}
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-gray-800">{formData.isPublic ? t('publicGallery') : t('privateOnly')}</p>
                    <p className="text-gray-500">{formData.isPublic ? t('visibleToEveryone') : t('visibleToYou')}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={formData.isPublic} onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      {/* Footer - Pinned to bottom of container */}
      <div className="p-4 border-t border-gray-100 bg-white shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-10">
        <button
          onClick={handleSaveWrapper}
          disabled={!image}
          className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] ${image
            ? 'bg-[#FBBF24] text-black shadow-orange-100'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
        >
          <span className="text-2xl">✨</span>
          <span>{image ? t('saveToCloset') : t('choosePhotoFirst')}</span>
        </button>
      </div>
    </div>
  );
};

// Moved to top
const AddItemModal = ({ onClose, onSave, plushies, t, fitLabels }) => {
  return (
    <div className="fixed inset-0 bg-black/80 z-[20000] flex items-end justify-center sm:items-center sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm overflow-hidden shadow-2xl flex flex-col h-[80vh] supports-[height:100dvh]:h-[80dvh] sm:h-auto sm:max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-lg">{t('addNewOutfit')}</h3>
          <button onClick={onClose} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300">
            <X size={16} />
          </button>
        </div>

        {/* Reused Form - Wrapped to handle height correctly */}
        <div className="flex-1 w-full min-h-0 relative flex flex-col">
          <ClosetItemForm
            plushies={plushies}
            t={t}
            fitLabels={fitLabels}
            onSave={(item) => {
              onSave(item);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}

const Closet = () => {
  const { plushies, updatePlushie, closetItems, addClosetItem, updateClosetItem, deleteClosetItem, t } = useApp();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('items'); // 'items', 'gallery', 'plushies'
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); // For viewing details
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  // Get user display name and photo
  const userDisplayName = currentUser?.displayName || 'Me';
  const userPhoto = currentUser?.photoURL || 'https://placehold.co/100/purple/white?text=Me';

  // Advanced Gallery Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMySize, setFilterMySize] = useState(false);

  const getFilteredGallery = () => {
    // 1. Merge Local Public Items + Mock Gallery
    // Ensure closetItems is array
    const safeClosetItems = Array.isArray(closetItems) ? closetItems : [];

    const localPublicItems = safeClosetItems.filter(item => item.isPublic).map(item => ({
      id: `local-${item.id}`,
      userName: userDisplayName,
      userIcon: userPhoto, // Use actual profile photo for my items
      plushieName: item.plushieName || 'My Plushie',
      plushieHeight: item.plushieHeight || 0,
      location: item.location,
      imageUrl: item.image,
      itemName: item.name,
      shopName: item.url ? (() => { try { return new URL(item.url || 'http://b').hostname } catch { return '' } })() : '',
      fitRating: item.fitRating,
      comment: item.comment,
      date: new Date(item.createdAt).toISOString().split('T')[0],
      likes: 0
    }));

    const allItems = [...localPublicItems, ...MOCK_GALLERY];

    return allItems.filter(item => {
      // Text Filter
      const matchesSearch = searchTerm === '' ||
        (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.itemName && item.itemName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.plushieName && item.plushieName.toLowerCase().includes(searchTerm.toLowerCase()));

      // Size Filter (Filter items where height is within +/- 2cm of ANY of my plushies, or just the main one?)
      // Let's use "ANY of my plushies" for broader matching, or the first one.
      // Assuming user wants to find matches for *their* plushies.
      let matchesSize = true;
      if (filterMySize) {
        // Find if ANY of my plushies matches this item's plushieHeight (+/- 2cm)
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
  };

  const fitLabels = t('fitLabelsShort') || ['Tight', 'Snug', 'Good', 'Loose', 'Perf'];
  const fullFitLabels = t('fitLabels') || ['Too Tight', 'Tight', 'Good', 'Loose', 'Perfect'];

  return (
    <div className="pb-32">
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
        </div>
      </div>

      <div className="px-4 mt-4">
        {/* === ITEMS TAB === */}
        {activeTab === 'items' && (
          <>
            <div className="fade-in">
              <div className="bg-gray-50 px-4 py-2 rounded-lg mb-4 text-xs text-gray-500 flex items-start gap-2">
                <span className="text-lg">💡</span>
                <p>{t('closetTabHelp')}</p>
              </div>

              {(!closetItems || closetItems.length === 0) ? (
                <div className="mb-24">
                  <ClosetItemForm
                    plushies={plushies || []}
                    t={t}
                    fitLabels={fitLabels}
                    onSave={(item) => addClosetItem(item)}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 mb-20">
                  {closetItems.map(item => (
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

                        {/* Fit Rating Badge */}
                        <div className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black text-white ${item.fitRating === 2 ? 'bg-green-500' :
                          item.fitRating === 1 ? 'bg-red-400' : 'bg-yellow-500'
                          }`}>
                          {['😣', '😊', '😌'][item.fitRating - 1] || '😊'} {fitLabels[item.fitRating - 1]?.replace(/^[^\s]+\s/, '') || ''}
                        </div>
                      </div>
                      <div className="p-2">
                        <h4 className="font-bold text-sm truncate">{item.name || 'Untitled Item'}</h4>
                        <p className="text-xs text-gray-400 truncate">{new Date(item.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </>
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
                <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                <input
                  type="text"
                  className="w-full bg-gray-50 pl-10 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder={`${t('filterLocation')} / Item Name...`}
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

            <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3">
              <div className="bg-white p-2 rounded-full shadow-sm">
                <Users className="text-blue-500" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-blue-900 text-sm">{t('everyonesGallery')}</h3>
                <p className="text-xs text-blue-700 mt-1">
                  {t('galleryDesc')}
                </p>
              </div>
            </div>

            {getFilteredGallery().length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p>No items found matching your filters.</p>
              </div>
            ) : (
              getFilteredGallery().map(post => (
                <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                    <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm text-pink-500">
                      <Heart size={12} fill="currentColor" /> {post.likes}
                    </div>
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
              ))
            )}
          </div>
        )}


      </div>

      {/* === ADD ITEM MODAL === */}
      {showAddModal && (
        <Portal>
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
        </Portal>
      )}

      {/* === ITEM DETAIL MODAL === */}
      {selectedItem && (
        <Portal>
          <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto relative no-scrollbar shadow-2xl">
              <button
                onClick={() => { setSelectedItem(null); setIsEditing(false); }}
                className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full z-10 hover:bg-black/70 backdrop-blur-sm"
              >
                <X size={20} />
              </button>

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
                  <div className="flex gap-1">
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
        </Portal>
      )}
      {/* FAB - Global (Visible unless Inline Form is active) */}
      {(activeTab === 'gallery' || (closetItems && closetItems.length > 0)) && (
        <Portal>
          <div className="fixed bottom-0 left-0 right-0 z-[20000] mx-auto max-w-[480px] pointer-events-none flex justify-end px-6 pb-28">
            <button
              onClick={() => setShowAddModal(true)}
              className="pointer-events-auto bg-primary text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:bg-primary-dark transition-colors active:scale-95"
              style={{ touchAction: 'manipulation' }}
            >
              <Plus size={28} />
            </button>
          </div>
        </Portal>
      )}
    </div>
  );
};

export default Closet;
