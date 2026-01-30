import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Edit2, Trash2, Plus, Shirt, Users, Heart, Share2, Lock, Unlock, X, Camera, Star } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';

// Mock Data for Community Gallery
const MOCK_GALLERY = [
  {
    id: 'g1',
    userName: 'KumaLover',
    userIcon: 'https://placehold.co/100/orange/white?text=K',
    plushieName: 'Kumakichi',
    imageUrl: 'https://placehold.co/600x600/FFB7CB/ffffff?text=Cute+Dress',
    itemName: 'Floral Spring Dress',
    shopName: 'PlushieStyle',
    fitRating: 5,
    comment: 'Perfect fit for 15cm plushies! The fabric is so soft.',
    date: '2025-05-12',
    likes: 24,
  },
  {
    id: 'g2',
    userName: 'NuiLife',
    userIcon: 'https://placehold.co/100/blue/white?text=N',
    plushieName: 'Blue',
    imageUrl: 'https://placehold.co/600x600/AFEeee/ffffff?text=Denim+Set',
    itemName: 'Cool Denim Overalls',
    shopName: 'Rakuten Shop',
    fitRating: 4,
    comment: 'A bit tight around the tummy but looks adorable.',
    date: '2025-05-10',
    likes: 15,
  }
];

const Closet = () => {
  const { plushies, updatePlushie, closetItems, addClosetItem, deleteClosetItem, t } = useApp();
  const [activeTab, setActiveTab] = useState('items'); // 'items', 'gallery', 'plushies'
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); // For viewing details

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
    <div className="pb-24">
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
            {closetItems.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-2xl mb-4 border-2 border-dashed border-gray-100">
                <Shirt size={48} className="mx-auto mb-3 opacity-20" />
                <p className="font-bold">{t('noItems')}</p>
                <p className="text-xs">{t('noItemsSub')}</p>
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
                      <div className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black text-white ${item.fitRating === 5 ? 'bg-green-500' :
                        item.fitRating === 1 ? 'bg-red-500' : 'bg-orange-400'
                        }`}>
                        {fitLabels[item.fitRating - 1] || 'Good'}
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

            {/* Fab Button to Add Item */}
            <button
              onClick={() => setShowAddModal(true)}
              className="fixed bottom-24 right-6 bg-primary text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-primary-dark transition-colors z-20"
            >
              <Plus size={28} />
            </button>
          </div>
        )}

        {/* === GALLERY TAB === */}
        {activeTab === 'gallery' && (
          <div className="space-y-4 fade-in pb-20">
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

            {MOCK_GALLERY.map(post => (
              <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={post.userIcon} className="w-8 h-8 rounded-full bg-gray-200" alt="" />
                    <div>
                      <p className="text-xs font-bold text-gray-800">{post.userName}</p>
                      <p className="text-[10px] text-gray-400">Plushie: {post.plushieName}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400">{post.date}</span>
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
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={12} className={i < post.fitRating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"} />
                      ))}
                    </div>
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

        {/* === PLUSHIES TAB (Original Functionality) === */}
        {activeTab === 'plushies' && (
          <div className="fade-in pb-20">
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

              <div className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-300" style={{ minHeight: '200px' }}>
                <Plus size={32} className="mb-2" />
                <span className="text-xs font-bold">{t('addFriend')}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* === ADD ITEM MODAL === */}
      {showAddModal && (
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
      )}

      {/* === ITEM DETAIL MODAL === */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto relative no-scrollbar shadow-2xl">
            <button
              onClick={() => setSelectedItem(null)}
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
                  {selectedItem.isPublic ? (
                    <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-lg font-bold text-xs"><Share2 size={12} /> {t('publicGallery')}</span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-500 bg-gray-100 px-2 py-1 rounded-lg font-bold text-xs"><Lock size={12} /> {t('privateOnly')}</span>
                  )}
                  <span>•</span>
                  <span>{new Date(selectedItem.createdAt).toLocaleDateString()}</span>
                </div>
                {/* Delete Button */}
                <button
                  onClick={() => {
                    if (window.confirm(t('deleteConfirm'))) {
                      deleteClosetItem(selectedItem.id);
                      setSelectedItem(null);
                    }
                  }}
                  className="text-red-400 hover:text-red-500 p-2"
                >
                  <Trash2 size={18} />
                </button>
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
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={24}
                      className={star <= selectedItem.fitRating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}
                    />
                  ))}
                </div>
                <p className="text-sm font-bold mt-1 text-gray-700">
                  {fullFitLabels[selectedItem.fitRating - 1]}
                </p>
              </div>

              {/* Comment */}
              {selectedItem.comment && (
                <div>
                  <h4 className="text-sm font-bold text-gray-400 uppercase mb-2">{t('notesTitle')}</h4>
                  <p className="text-gray-700 bg-yellow-50/50 p-4 rounded-xl border border-yellow-100">
                    {selectedItem.comment}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- SUB COMPONENTS ---

const AddItemModal = ({ onClose, onSave, plushies, t, fitLabels }) => {
  const [step, setStep] = useState(1);
  const [image, setImage] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    plushieId: plushies[0]?.id || '',
    fitRating: 3,
    comment: '',
    isPublic: true,
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setImage(compressed);
        setStep(2);
      } catch (err) {
        alert('Failed to load image');
      }
    }
  };

  const handleSave = () => {
    if (!image) return;
    onSave({
      image,
      ...formData
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-lg">{t('addNewOutfit')}</h3>
          <button onClick={onClose} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto no-scrollbar">
          {step === 1 ? (
            <div className="p-8 flex flex-col items-center justify-center gap-4 min-h-[300px]">
              <div className="w-full aspect-video bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center relative overflow-hidden group hover:border-primary transition-colors cursor-pointer">
                <input type="file" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                <Camera size={48} className="text-gray-300 mb-2 group-hover:text-primary transition-colors" />
                <p className="text-gray-400 font-bold text-sm">{t('uploadPhoto')}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 text-xs">{t('takePhotoMessage')}</p>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-5">
              {/* Preview */}
              <div className="w-full h-48 bg-gray-100 rounded-xl overflow-hidden relative">
                <img src={image} alt="Preview" className="w-full h-full object-cover" />
                <button onClick={() => setStep(1)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full text-xs font-bold px-3 backdrop-blur-sm">{t('retake')}</button>
              </div>

              {/* Inputs */}
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
                  <label className="block text-xs font-bold text-gray-700 mb-2">{t('selectModel')}</label>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {plushies.map(p => (
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
                  <div className="flex justify-between bg-gray-50 p-3 rounded-xl gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData({ ...formData, fitRating: star })}
                        className={`
                          flex-1 p-2 rounded-lg transition-all duration-200
                          ${star <= formData.fitRating
                            ? 'bg-yellow-50 scale-105'
                            : 'bg-white hover:bg-gray-100'
                          }
                          active:scale-95 active:bg-yellow-100
                          border-2 
                          ${star <= formData.fitRating
                            ? 'border-yellow-300'
                            : 'border-transparent hover:border-gray-200'
                          }
                        `}
                      >
                        <Star
                          size={28}
                          className={`
                            mx-auto transition-all duration-200
                            ${star <= formData.fitRating
                              ? "fill-yellow-400 text-yellow-400 drop-shadow-md"
                              : "text-gray-300"
                            }
                          `}
                        />
                        <p className={`
                          text-[9px] text-center font-bold mt-1 transition-colors
                          ${star <= formData.fitRating ? 'text-yellow-600' : 'text-gray-400'}
                        `}>
                          {fitLabels[star - 1]}
                        </p>
                      </button>
                    ))}
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
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          {step === 2 && (
            <button
              onClick={handleSave}
              className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95"
            >
              {t('saveToCloset')}
            </button>
          )}
          {step === 1 && (
            <button disabled className="w-full bg-gray-200 text-gray-400 font-bold py-3 rounded-xl cursor-not-allowed">
              {t('choosePhotoFirst')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Closet;
