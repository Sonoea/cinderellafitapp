import React, { useState, useRef, useEffect } from 'react';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore'; // Import Firestore functions
import { db } from '../firebase/config'; // Import db
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { Edit2, Trash2, Plus, Shirt, Users, User, Heart, Share2, Lock, Unlock, X, Camera, Star, MapPin, Search, Ruler, EyeOff } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';
import Portal from '../components/Portal';
import { safeHostname, safeDate } from '../utils/formatting';

import AddItemModal from '../components/AddItemModal';
import EditProfileModal from '../components/EditProfileModal';

const UserAvatar = ({ src, alt, className }) => {
  const [error, setError] = useState(!src || src.includes('placeholder'));

  useEffect(() => {
    setError(!src || src.includes('placeholder'));
  }, [src]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 text-gray-400 rounded-full ${className}`}>
        <User size={20} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`object-cover rounded-full ${className}`}
      onError={() => setError(true)}
    />
  );
};

const ExpandableText = ({ text, maxLength = 90 }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) return null;
  if (text.length <= maxLength) {
    return <p className="text-xs text-gray-600 mb-2 whitespace-pre-wrap">{text}</p>;
  }

  return (
    <div className="mb-2">
      <p className="text-xs text-gray-600 whitespace-pre-wrap">
        {isExpanded ? text : `${text.slice(0, maxLength)}...`}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="ml-1 text-blue-500 font-bold hover:underline inline-block"
        >
          {isExpanded ? ' 閉じる' : ' 続きを読む'}
        </button>
      </p>
    </div>
  );
};

// --- MAIN CLOSET COMPONENT ---
const Closet = () => {
  // Debugging log for production crash
  console.log("Closet component rendering...");

  const { plushies = [], updatePlushie, closetItems = [], addClosetItem, updateClosetItem, deleteClosetItem, t } = useApp();
  const { currentUser } = useAuth();

  // State for real user name from Firestore (to fix "You" issue)
  const [firestoreUserName, setFirestoreUserName] = useState(null);
  const [firestorePhotoURL, setFirestorePhotoURL] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (currentUser?.uid) {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setFirestoreUserName(data.displayName || null);
            setFirestorePhotoURL(data.photoURL || null);
          }
        } catch (e) {
          console.error("Error fetching user profile:", e);
        }
      }
    };
    fetchUserProfile();
  }, [currentUser]);

  // --- STATE DECLARATIONS ---
  const [activeTab, setActiveTab] = useState('items'); // 'items', 'gallery', 'plushies'

  // Gallery State
  const [publicItems, setPublicItems] = useState([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [galleryError, setGalleryError] = useState(null);
  const [userProfiles, setUserProfiles] = useState({}); // { [userId]: { displayName, photoURL } }
  const [itemLikes, setItemLikes] = useState({}); // { [itemId]: { count, isLiked } }
  const [itemComments, setItemComments] = useState({}); // { [itemId]: [comments] }
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentText, setCommentText] = useState('');

  // Filters (Items Tab)
  const [activePlushieId, setActivePlushieId] = useState('all');
  const [activeFitRating, setActiveFitRating] = useState('all');

  // Filters (Gallery Tab)
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMySize, setFilterMySize] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');

  // --- URL PARAMS HANDLING ---
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'gallery' || tabParam === 'plushies') {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  // Handle deeplink to specific gallery item
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const itemId = params.get('itemId');

    if (itemId && activeTab === 'gallery' && !isLoadingGallery && publicItems.length > 0) {
      const foundItem = publicItems.find(item => item.id === itemId);
      if (foundItem) {
        setSelectedItem(foundItem);
        // Clear params to avoid reopening on refresh? Maybe not needed for now.
      }
    }
  }, [location.search, activeTab, isLoadingGallery, publicItems]);

  // Modals / Selection
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  // Helper to resolve user profiles for gallery
  const resolveUserProfiles = async (uids) => {
    if (!uids || uids.length === 0) return;
    const { doc, getDoc } = await import('firebase/firestore');
    const newProfiles = { ...userProfiles };
    let changed = false;

    for (const uid of uids) {
      if (!newProfiles[uid]) {
        try {
          const uDoc = await getDoc(doc(db, 'users', uid));
          if (uDoc.exists()) {
            newProfiles[uid] = uDoc.data();
            changed = true;
          }
        } catch (e) {
          console.error("Error fetching extra profile:", uid, e);
        }
      }
    }

    if (changed) {
      setUserProfiles(newProfiles);
    }
  };

  // Fetch Likes & Comments for an item
  const fetchEngagement = async (itemId, ownerUid) => {
    if (!itemId || !ownerUid) return;
    try {
      const { collection, getDocs, query, orderBy } = await import('firebase/firestore');

      // Fetch Likes Count
      const likesRef = collection(db, 'users', ownerUid, 'closetItems', itemId, 'likes');
      const likesSnap = await getDocs(likesRef);
      const likesCount = likesSnap.size;
      const isLiked = currentUser ? likesSnap.docs.some(doc => doc.id === currentUser.uid) : false;

      setItemLikes(prev => ({
        ...prev,
        [itemId]: { count: likesCount, isLiked }
      }));

      // Fetch Comments
      const commentsRef = collection(db, 'users', ownerUid, 'closetItems', itemId, 'comments');
      const q = query(commentsRef, orderBy('createdAt', 'asc'));
      const commentsSnap = await getDocs(q);
      const comments = commentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setItemComments(prev => ({
        ...prev,
        [itemId]: comments
      }));
    } catch (e) {
      console.error("Error fetching engagement:", e);
    }
  };

  const toggleLike = async (itemId, ownerUid) => {
    if (!currentUser) {
      alert("ログインが必要です");
      return;
    }
    if (!itemId || !ownerUid) return;

    const currentLike = itemLikes[itemId] || { count: 0, isLiked: false };
    const newIsLiked = !currentLike.isLiked;
    const newCount = newIsLiked ? currentLike.count + 1 : Math.max(0, currentLike.count - 1);

    // Optimistic UI update
    setItemLikes(prev => ({
      ...prev,
      [itemId]: { count: newCount, isLiked: newIsLiked }
    }));

    try {
      // Use pre-imported or top-level functions if available, or just use the pre-resolved ones from previous import
      // To keep it simple, I'll assume they were imported in fetchEngagement or just import again if needed, 
      // but better to import once at start of engagement.
      const { doc, setDoc, deleteDoc, serverTimestamp } = await import('firebase/firestore');
      const likeRef = doc(db, 'users', ownerUid, 'closetItems', itemId, 'likes', currentUser.uid);

      if (newIsLiked) {
        await setDoc(likeRef, { createdAt: serverTimestamp() });
      } else {
        await deleteDoc(likeRef);
      }
    } catch (e) {
      console.error("Error toggling like:", e);
      // Revert optimistic update on error
      setItemLikes(prev => ({
        ...prev,
        [itemId]: currentLike
      }));
    }
  };

  const submitComment = async (itemId, ownerUid) => {
    if (!currentUser || !commentText.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);

    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const commentData = {
        userId: currentUser.uid,
        userName: firestoreUserName || currentUser.displayName || t('guest'),
        userIcon: firestorePhotoURL || currentUser.photoURL || '',
        text: commentText.trim(),
        createdAt: new Date().toISOString(),
      };

      const commentsRef = collection(db, 'users', ownerUid, 'closetItems', itemId, 'comments');
      await addDoc(commentsRef, {
        ...commentData,
        createdAt: serverTimestamp()
      });

      // Update local state
      setItemComments(prev => ({
        ...prev,
        [itemId]: [...(prev[itemId] || []), { ...commentData, id: Date.now().toString() }]
      }));
      setCommentText('');
    } catch (e) {
      console.error("Error submitting comment:", e);
      alert("コメントの送信に失敗しました");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  useEffect(() => {
    if (selectedItem) {
      fetchEngagement(selectedItem.id, selectedItem.userId);
    }
  }, [selectedItem]);

  useEffect(() => {
    if (activeTab === 'gallery') {
      const fetchGallery = async () => {
        setIsLoadingGallery(true);
        setGalleryError(null);
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

              // Filter out items without any identification (at least userId or userName should exist)
              if (!data.userName && !data.userIcon && !data.userId) return;

              items.push({
                id: doc.id,
                ...data,
                imageUrl: data.imageUrl || data.image,
                itemName: data.itemName || data.name,
                userName: data.userName || null,
                userIcon: data.userIcon || '/api/placeholder/40/40',
                purchaseType: data.purchaseType || '',
                shopName: safeHostname(data.url),
                date: safeDate(data.createdAt),
              });
            } catch (err) {
              console.warn("Skipping invalid gallery item:", doc.id, err);
            }
          });
          const allItems = [...items];

          // Sort by createdAt descending
          allItems.sort((a, b) => {
            const dateA = a.date === 'Recently' ? 0 : new Date(a.date).getTime();
            const dateB = b.date === 'Recently' ? 0 : new Date(b.date).getTime();
            return dateB - dateA;
          });

          // Deduplicate items
          const uniqueItems = [];
          const seen = new Set();

          allItems.forEach(item => {
            // If missing key fields, just include it to be safe (or filter out?)
            // Let's include for now, filter later if needed.
            if (!item.userId || !item.createdAt) {
              uniqueItems.push(item);
              return;
            }
            const key = `${item.userId}-${item.itemName}-${item.imageUrl}`;
            if (!seen.has(key)) {
              seen.add(key);
              uniqueItems.push(item);
            }
          });

          const validItems = uniqueItems;
          setPublicItems(validItems);

          // Resolve user profiles for these items
          const uniqueUserIds = [...new Set(validItems.map(item => item.userId).filter(Boolean))];
          resolveUserProfiles(uniqueUserIds);
        } catch (error) {
          console.error("Error fetching global gallery:", error);
          // Firestore Collection Group Index が未作成の場合、エラーメッセージにURLが含まれる
          if (error.message && error.message.includes('index')) {
            console.error(
              "\n🔥 Firestoreインデックスの作成が必要です。\n" +
              "上記エラーメッセージ内のURLをクリックしてインデックスを作成してください。\n"
            );
          }
          setGalleryError('データの取得に失敗しました。再読み込みしてください。');
          setPublicItems([]);
        } finally {
          setIsLoadingGallery(false);
        }
      };

      fetchGallery();
    }
  }, [activeTab]);

  // --- FILTERED ITEMS LOGIC ---
  const filteredItems = React.useMemo(() => {
    // Prioritize: stored item userName > Firestore name > Auth name > Guest
    const effectiveDisplayName = firestoreUserName || (currentUser?.displayName === 'You' ? null : currentUser?.displayName) || t('guest');
    const userPhoto = currentUser?.photoURL || '/api/placeholder/40/40';
    const myUid = currentUser?.uid || null;

    const localPublicItems = closetItems.filter(item => item.isPublic).map(item => ({
      id: `local-${item.id}`,
      userId: item.userId || myUid,
      userName: item.userName || effectiveDisplayName,
      userIcon: item.userIcon || userPhoto,
      plushieName: item.plushieName || 'My Plushie',
      plushieHeight: item.plushieHeight || 0,
      location: item.location,
      imageUrl: item.image,
      itemName: item.name,
      purchaseType: item.purchaseType || '',
      shopName: safeHostname(item.url),
      fitRating: item.fitRating,
      comment: item.comment,
      date: safeDate(item.createdAt),
      likes: 0,
      isOwn: true
    }));

    // Combine Public Global Items + Local Public Items
    // Mark items from collectionGroup that belong to current user
    const markedPublicItems = publicItems.map(item => {
      const isOwn = myUid && item.userId === myUid;
      const liveProfile = userProfiles[item.userId];

      return {
        ...item,
        isOwn,
        // Override with latest profile if available
        userName: isOwn ? (firestoreUserName || item.userName) : (liveProfile?.displayName || item.userName),
        userIcon: isOwn ? (firestorePhotoURL || item.userIcon) : (liveProfile?.photoURL || item.userIcon)
      };
    });
    const combinedItems = [...markedPublicItems, ...localPublicItems];

    // Deduplication by Content (to handle local-id prefix differences)
    const uniqueItems = [];
    const seenCombos = new Set();

    combinedItems.forEach(item => {
      // Content-based key
      const comboKey = `${item.userId}-${item.itemName}-${item.imageUrl}`;
      if (!seenCombos.has(comboKey)) {
        seenCombos.add(comboKey);
        uniqueItems.push(item);
      }
    });

    return uniqueItems.filter(item => {
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

      let matchesCategory = true;
      if (filterCategory !== 'all') {
        matchesCategory = item.purchaseType === filterCategory;
      }

      return matchesSearch && matchesSize && matchesCategory;
    });
  }, [closetItems, publicItems, searchTerm, filterMySize, filterCategory, plushies, currentUser, firestoreUserName, firestorePhotoURL, userProfiles, t]);



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
        </div>
      </div>

      {/* Profile Header (Added for editing) */}
      <div className="px-4 mt-2 mb-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserAvatar
              src={firestorePhotoURL || currentUser?.photoURL}
              className="w-12 h-12 ring-2 ring-primary/20"
              alt={firestoreUserName || currentUser?.displayName}
            />
            <div>
              <h3 className="font-bold text-gray-800">
                {firestoreUserName || (currentUser?.displayName === 'You' ? (t('guest') || 'Guest') : currentUser?.displayName) || (t('guest') || 'Guest')}
              </h3>
              <p className="text-xs text-gray-500">{currentUser?.email}</p>
            </div>
          </div>
          <button
            onClick={() => setShowEditProfile(true)}
            className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-xs font-bold border border-gray-200 transition-colors flex items-center gap-1"
          >
            <Edit2 size={12} />
            {t('editProfile') || '編集'}
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

              {/* --- Timeline Grid (Refactored) --- */}
              {(() => {
                const visiblePlushieIds = new Set(plushies.map(p => String(p.id)));
                const timelineItems = closetItems.filter(item => {
                  const matchPlushie = activePlushieId === 'all' || String(item.plushieId) === String(activePlushieId);
                  const matchFit = activeFitRating === 'all' || item.fitRating === activeFitRating;
                  // Exclude mock/admin items and gallery-only items from My Closet
                  const isMock = String(item.id).startsWith('mock-');
                  if (isMock) return false;
                  if (item.galleryOnly) return false;
                  const isPlushieVisible = visiblePlushieIds.has(String(item.plushieId));
                  return matchPlushie && matchFit && isPlushieVisible;
                });

                if (timelineItems.length === 0) {
                  return (
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="aspect-square bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all group"
                      >
                        <div className="bg-white p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform mb-2">
                          <Plus size={24} className="text-primary" />
                        </div>
                        <span className="text-xs font-bold">{t('addNewOutfit')}</span>
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="pb-48">
                    {Object.entries(timelineItems.reduce((acc, item) => {
                      let key = '----.--';
                      try {
                        const d = new Date(item.createdAt);
                        if (!isNaN(d.getTime())) {
                          key = `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                        }
                      } catch (e) { }
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(item);
                      return acc;
                    }, {})).sort((a, b) => b[0].localeCompare(a[0])).map(([key, groupItems], groupIndex) => (
                      <div key={key}>
                        <h3 className="text-xs font-black text-gray-400 mb-3 ml-1 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                          {key}
                        </h3>
                        <div className="grid grid-cols-2 gap-3 mb-6">
                          {/* Add Button only in the very first group */}
                          {groupIndex === 0 && (
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

                          {groupItems.map(item => (
                            <div
                              key={item.id}
                              onClick={() => setSelectedItem(item)}
                              className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 relative group cursor-pointer active:scale-95 transition-transform"
                            >
                              <div className="aspect-square bg-gray-100 relative">
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                {item.isPublic && (
                                  <div className="absolute top-2 right-2 flex gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm('この写真をマイコーデから非表示にし、ギャラリーのみに表示しますか？')) {
                                          updateClosetItem(item.id, { galleryOnly: true });
                                        }
                                      }}
                                      className="bg-black/50 text-white p-1.5 rounded-full backdrop-blur-sm hover:bg-red-500/70 transition-colors"
                                      title="マイコーデから非表示"
                                    >
                                      <EyeOff size={12} />
                                    </button>
                                    <div className="bg-black/50 text-white p-1 rounded-full backdrop-blur-sm">
                                      <Share2 size={12} />
                                    </div>
                                  </div>
                                )}
                                <div className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black text-white ${item.fitRating === 2 ? 'bg-green-500' :
                                  item.fitRating === 1 ? 'bg-red-400' : 'bg-yellow-500'
                                  }`}>
                                  {t('fitLabelsShort')?.[item.fitRating - 1] || '😊'}
                                </div>
                              </div>
                              <div className="p-2">
                                <h4 className="font-bold text-sm truncate">{item.name || 'Untitled'}</h4>
                                <p className="text-xs text-gray-400 truncate">
                                  {safeDate(item.createdAt)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
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
                <input
                  type="text"
                  className="w-full bg-gray-50 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border border-gray-200"
                  placeholder={`🔍 ${t('searchPlaceholder')}`}
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

              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {[
                  { id: 'all', label: t('categoryAll'), icon: '✨' },
                  { id: 'online', label: t('categoryOnline'), icon: '🌐' },
                  { id: 'retail', label: t('categoryRetail'), icon: '🏪' },
                  { id: 'handmade', label: t('categoryHandmade'), icon: '🪡' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setFilterCategory(cat.id)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all border ${filterCategory === cat.id
                      ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                      : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
                      }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl flex items-center gap-3">
              <div className="bg-white p-2 rounded-full shadow-sm">
                <Users className="text-blue-500" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-blue-900 text-sm">{t('everyonesGallery')}</h3>
              </div>
            </div>

            {galleryError && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl text-xs text-yellow-700 flex items-center gap-2">
                <span>⚠️</span>
                <span>{galleryError}</span>
              </div>
            )}

            {filteredItems.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p className="font-bold mb-1">{t('noItems')}</p>
                <p className="text-xs">{t('noItemsSub')}</p>
              </div>
            ) : (
              /* Gallery Grid */
              <div className="grid grid-cols-2 gap-3 mb-20 fade-in">
                {filteredItems.map((post) => (
                  <div key={post.id} className={`bg-white rounded-xl shadow-sm overflow-hidden break-inside-avoid ${post.isOwn ? 'border-2 border-primary/30 ring-1 ring-primary/10' : 'border border-gray-100'}`}>
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <UserAvatar src={post.userIcon} className="w-8 h-8" alt={post.userName} />
                          {post.isOwn && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-primary rounded-full flex items-center justify-center ring-2 ring-white"><Star size={8} className="text-white fill-white" /></div>}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800 truncate max-w-[100px]">{post.isOwn ? (firestoreUserName || post.userName) : post.userName}</p>
                          <div className="flex items-center gap-1 text-[10px] text-gray-400">
                            <span className="truncate max-w-[80px]">{post.plushieName}</span>
                            {post.plushieHeight && <span className="bg-gray-100 px-1 rounded text-gray-500 whitespace-nowrap">{post.plushieHeight}cm</span>}
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

                    <div className="aspect-square bg-gray-50 relative cursor-pointer" onClick={() => setSelectedItem(post)}>
                      <img src={post.imageUrl} className="w-full h-full object-cover" alt="" />

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(post.id, post.userId);
                        }}
                        className={`absolute bottom-3 right-3 backdrop-blur px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm transition-all active:scale-90 z-10 ${(itemLikes[post.id]?.isLiked)
                            ? 'bg-pink-500 text-white'
                            : 'bg-white/80 text-pink-500'
                          }`}
                      >
                        <Heart size={12} fill={(itemLikes[post.id]?.isLiked) ? "currentColor" : "none"} />
                        <span>{itemLikes[post.id]?.count ?? post.likes ?? 0}</span>
                      </button>
                    </div>

                    <div className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col gap-1">
                          <h3 className="font-bold text-sm text-gray-800">{post.itemName}</h3>
                          {post.purchaseType && (
                            <span className="text-[9px] font-bold bg-gray-100/80 text-gray-500 px-1.5 py-0.5 rounded-full w-fit">
                              {post.purchaseType === 'online' ? `🌐 ${t('categoryOnline')}` :
                                post.purchaseType === 'retail' ? `🏪 ${t('categoryRetail')}` :
                                  `🪡 ${t('categoryHandmade')}`}
                            </span>
                          )}
                        </div>
                        <span className="text-lg">
                          {['😣', '😊', '😌'][post.fitRating - 1] || '😊'}
                        </span>
                      </div>
                      <ExpandableText text={post.comment} />

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

      </div>

      {/* === ADD ITEM MODAL === */}
      {
        showAddModal && (
          <Portal>
            <AddItemModal
              onClose={() => setShowAddModal(false)}
              onSave={async (item) => {
                await addClosetItem(item);
                setShowAddModal(false);
              }}
              plushies={plushies}
              initialPlushieId={activePlushieId === 'all' ? undefined : activePlushieId}
              t={t}
              fitLabels={fitLabels}
            />
          </Portal>
        )
      }

      {/* === EDIT PROFILE MODAL === */}
      {showEditProfile && (
        <EditProfileModal
          onClose={() => setShowEditProfile(false)}
          onSave={(data) => {
            setFirestoreUserName(data.displayName);
            setFirestorePhotoURL(data.photoURL || null);
            setShowEditProfile(false);
          }}
          t={t}
          currentUser={currentUser}
          plushies={plushies}
        />
      )}

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
                          <>
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
                            {editData.isPublic && (
                              <button
                                onClick={() => setEditData({ ...editData, galleryOnly: !editData.galleryOnly })}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${editData.galleryOnly
                                  ? 'text-blue-600 bg-blue-100 border-2 border-blue-400'
                                  : 'text-gray-400 bg-gray-50 border-2 border-gray-200'
                                  }`}
                              >
                                <Users size={12} />
                                {editData.galleryOnly ? (t('galleryOnlyLabel') || 'ギャラリー専用') : (t('showInMyCloset') || 'マイコーデに表示')}
                              </button>
                            )}
                          </>
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

                      {/* Live Like Button in Modal */}
                      {!isEditing && (
                        <button
                          onClick={() => toggleLike(selectedItem.id, selectedItem.userId)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all active:scale-95 ${(itemLikes[selectedItem.id]?.isLiked)
                            ? 'bg-pink-500 text-white shadow-lg shadow-pink-200'
                            : 'bg-pink-50 text-pink-500 hover:bg-pink-100'
                            }`}
                        >
                          <Heart size={18} fill={(itemLikes[selectedItem.id]?.isLiked) ? "currentColor" : "none"} />
                          <span>{itemLikes[selectedItem.id]?.count ?? selectedItem.likes ?? 0}</span>
                        </button>
                      )}

                      {/* Edit / Delete Buttons */}
                      <div className="flex gap-1 z-20 relative">
                        {!isEditing && (
                          <button
                            onClick={() => {
                              setIsEditing(true);
                              setEditData({
                                fitRating: selectedItem.fitRating,
                                comment: selectedItem.comment || '',
                                isPublic: selectedItem.isPublic,
                                galleryOnly: selectedItem.galleryOnly || false
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
                            const emojis = ['😣', '😊', '😌'];
                            const labels = [t('fitLabelsShort')?.[0] || 'きつい', t('fitLabelsShort')?.[1] || 'ぴったり', t('fitLabelsShort')?.[2] || '大きめ'];
                            const isSelected = editData.fitRating === rating;
                            return (
                              <button
                                key={rating}
                                onClick={() => setEditData({ ...editData, fitRating: rating })}
                                className={`flex-1 p-3 rounded-xl transition-all border-2 ${isSelected
                                  ? 'bg-primary text-white border-primary scale-105 shadow-md'
                                  : 'bg-white border-gray-200 opacity-60'
                                  }`}
                              >
                                <span className={`text-2xl block text-center ${isSelected ? '' : 'grayscale'}`}>{emojis[rating - 1]}</span>
                                <p className={`text-[10px] text-center font-bold mt-1 ${isSelected ? 'text-white' : 'text-gray-400'}`}>
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
                        <div className="space-y-1">
                          <div className="flex justify-end">
                            <span className={`text-[10px] font-bold ${editData.comment.length >= 500 ? 'text-red-500' : 'text-gray-400'}`}>
                              {editData.comment.length} / 500
                            </span>
                          </div>
                          <textarea
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 h-20 text-sm"
                            placeholder={t('commentPlaceholder')}
                            value={editData.comment}
                            maxLength={500}
                            onChange={(e) => setEditData({ ...editData, comment: e.target.value })}
                          />
                        </div>
                      ) : (
                        selectedItem.comment && (
                          <p className="text-gray-700 bg-yellow-50/50 p-4 rounded-xl border border-yellow-100">
                            {selectedItem.comment}
                          </p>
                        )
                      )}
                    </div>

                    {/* Comments Section */}
                    {selectedItem.isPublic && !isEditing && (
                      <div className="pt-4 border-t border-gray-100">
                        <h4 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                          <Users size={16} />
                          Comments
                          <span className="bg-gray-100 px-2 py-0.5 rounded-full text-[10px]">{itemComments[selectedItem.id]?.length || 0}</span>
                        </h4>

                        <div className="space-y-4 mb-6">
                          {(itemComments[selectedItem.id] || []).map((comment) => (
                            <div key={comment.id} className="flex gap-3 animate-in slide-in-from-bottom-2">
                              <UserAvatar src={comment.userIcon} className="w-8 h-8 flex-shrink-0" alt="" />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-xs font-bold text-gray-800">{comment.userName}</span>
                                  <span className="text-[10px] text-gray-400">
                                    {comment.createdAt?.seconds
                                      ? new Date(comment.createdAt.seconds * 1000).toLocaleDateString()
                                      : new Date(comment.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-2 rounded-lg rounded-tl-none inline-block min-w-[50%]">
                                  {comment.text}
                                </p>
                              </div>
                            </div>
                          ))}

                          {(!itemComments[selectedItem.id] || itemComments[selectedItem.id].length === 0) && (
                            <div className="text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                              <p className="text-xs text-gray-400 font-bold italic">No comments yet. Be the first!</p>
                            </div>
                          )}
                        </div>

                        {/* Comment Form */}
                        {currentUser ? (
                          <div className="flex gap-2 items-end">
                            <div className="flex-1 relative">
                              <textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Add a comment..."
                                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm h-20"
                                maxLength={200}
                              />
                              <span className="absolute bottom-2 right-2 text-[8px] text-gray-400">
                                {commentText.length}/200
                              </span>
                            </div>
                            <button
                              onClick={() => submitComment(selectedItem.id, selectedItem.userId)}
                              disabled={!commentText.trim() || isSubmittingComment}
                              className="bg-primary text-white p-3 rounded-xl shadow-md hover:bg-primary/90 disabled:opacity-50 disabled:grayscale transition-all h-12 w-12 flex items-center justify-center"
                            >
                              {isSubmittingComment ? '...' : <Plus size={24} />}
                            </button>
                          </div>
                        ) : (
                          <div className="bg-blue-50 p-4 rounded-xl text-center">
                            <p className="text-xs text-blue-600 font-bold mb-2">Login to leave a comment!</p>
                          </div>
                        )}
                      </div>
                    )}

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
