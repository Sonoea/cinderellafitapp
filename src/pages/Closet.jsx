import React, { useState, useRef, useEffect, useMemo } from 'react';
import { collectionGroup, query, where, getDocs, doc, setDoc, deleteDoc, addDoc, serverTimestamp, collection, getDoc, orderBy, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Plus, Shirt, Users, User, Heart, Share2, MessageCircle, Lock, Unlock, X, Camera, Star, MapPin, Search, Ruler, EyeOff, Send, LogOut, ExternalLink, Library, LayoutGrid } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';
import Portal from '../components/Portal';
import { safeHostname, safeDate } from '../utils/formatting';

import AddItemModal from '../components/AddItemModal';
import EditProfileModal from '../components/EditProfileModal';
import VisualCloset from '../components/VisualCloset';

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

  const { plushies = [], updatePlushie, closetItems = [], addClosetItem, updateClosetItem, deleteClosetItem, t, language } = useApp();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // State for real user name from Firestore (to fix "You" issue)
  const [firestoreUserName, setFirestoreUserName] = useState(null);
  const [firestorePhotoURL, setFirestorePhotoURL] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'shelf'

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

  // Gallery State (kept for Modal interactions)
  const [itemLikes, setItemLikes] = useState({}); // { [itemId]: { count, isLiked } }
  const [itemCommentCounts, setItemCommentCounts] = useState({}); // { [compositeId]: number }
  const [itemComments, setItemComments] = useState({}); // { [itemId]: [comments] }
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [isUpdatingComment, setIsUpdatingComment] = useState(false);
  const [shouldScrollToComments, setShouldScrollToComments] = useState(false);
  const commentsRef = useRef(null);

  // Filters
  const [activePlushieId, setActivePlushieId] = useState('all');
  const [activeFitRating, setActiveFitRating] = useState('all');

  // --- URL PARAMS HANDLING ---
  const location = useLocation();

  // Modals / Selection
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  // Handle deeplink to specific item
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const itemId = params.get('itemId');

    if (itemId && closetItems.length > 0) {
      // Logic to find and open item if needed
      const found = closetItems.find(i => `local-${i.id}` === itemId || i.id === itemId);
      if (found) {
        // Transform to match selectedItem structure if needed, or just set it
        // But we wait for filtering?
      }
    }
  }, [location.search, closetItems]);

  // Fetch Likes & Comments for an item
  const fetchEngagement = async (itemId, ownerUid) => {
    if (!itemId || !ownerUid) return;
    const compositeId = `${ownerUid}_${itemId}`;
    try {
      // Fetch Likes Count
      const likesRef = collection(db, 'users', ownerUid, 'closetItems', itemId, 'likes');
      const likesSnap = await getDocs(likesRef);
      const likesCount = likesSnap.size;
      const isLiked = currentUser ? likesSnap.docs.some(doc => doc.id === currentUser.uid) : false;

      setItemLikes(prev => ({
        ...prev,
        [compositeId]: { count: likesCount, isLiked }
      }));

      // Fetch Comments
      const commentsRef = collection(db, 'users', ownerUid, 'closetItems', itemId, 'comments');
      const q = query(commentsRef, orderBy('createdAt', 'asc'));
      const commentsSnap = await getDocs(q);
      const comments = commentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setItemComments(prev => ({
        ...prev,
        [compositeId]: comments
      }));
    } catch (e) {
      console.error("Error fetching engagement:", e);
    }
  };

  const toggleLike = async (itemId, ownerUid, existingCompositeId) => {
    if (!currentUser) {
      alert("ログインが必要です");
      return;
    }
    if (!itemId || !ownerUid) return;

    const bareId = String(itemId).replace(/^local-/, '');
    const compositeId = `${ownerUid}_${bareId}`;

    const currentLike = itemLikes[compositeId] || { count: 0, isLiked: false };
    const newIsLiked = !currentLike.isLiked;
    const newCount = newIsLiked ? currentLike.count + 1 : Math.max(0, currentLike.count - 1);

    // Optimistic UI update
    setItemLikes(prev => ({
      ...prev,
      [compositeId]: { count: newCount, isLiked: newIsLiked }
    }));

    try {
      const likeRef = doc(db, 'users', ownerUid, 'closetItems', bareId, 'likes', currentUser.uid);
      const itemRef = doc(db, 'users', ownerUid, 'closetItems', bareId);

      if (newIsLiked) {
        await setDoc(likeRef, {
          likedBy: currentUser.uid,
          createdAt: serverTimestamp()
        });
        await updateDoc(itemRef, { likes: increment(1) });
      } else {
        await deleteDoc(likeRef);
        await updateDoc(itemRef, { likes: increment(-1) });
      }
    } catch (e) {
      console.error("Error toggling like:", e);
      // Revert optimistic update on error
      setItemLikes(prev => ({
        ...prev,
        [compositeId]: currentLike
      }));
    }
  };

  const submitComment = async (itemId, ownerUid) => {
    if (!currentUser || !commentText.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);

    try {
      const bareId = String(itemId).replace(/^local-/, '');
      const commentData = {
        userId: currentUser.uid,
        userName: firestoreUserName || currentUser.displayName || t('guest'),
        userIcon: firestorePhotoURL || currentUser.photoURL || '',
        text: commentText.trim(),
        createdAt: new Date().toISOString(),
      };

      const commentsRef = collection(db, 'users', ownerUid, 'closetItems', bareId, 'comments');
      await addDoc(commentsRef, {
        ...commentData,
        createdAt: serverTimestamp()
      });

      // Increment commentCount on the parent document
      const itemRef = doc(db, 'users', ownerUid, 'closetItems', bareId);
      await updateDoc(itemRef, { commentCount: increment(1) });

      // Update local state
      const compositeId = `${ownerUid}_${bareId}`;
      setItemComments(prev => ({
        ...prev,
        [compositeId]: [...(prev[compositeId] || []), { ...commentData, id: Date.now().toString() }]
      }));
      setItemCommentCounts(prev => ({
        ...prev,
        [compositeId]: (prev[compositeId] || 0) + 1
      }));
      setCommentText('');
    } catch (e) {
      console.error("Error submitting comment:", e);
      alert("コメントの送信に失敗しました");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const deleteComment = async (itemId, ownerUid, commentId) => {
    if (!currentUser) return;

    try {
      const bareId = String(itemId).replace(/^local-/, '');
      const commentDocRef = doc(db, 'users', ownerUid, 'closetItems', bareId, 'comments', commentId);
      await deleteDoc(commentDocRef);

      // Decrement commentCount on the parent document
      const itemRef = doc(db, 'users', ownerUid, 'closetItems', bareId);
      await updateDoc(itemRef, { commentCount: increment(-1) });

      // Update local state
      const compositeId = `${ownerUid}_${bareId}`;
      setItemComments(prev => ({
        ...prev,
        [compositeId]: (prev[compositeId] || []).filter(c => c.id !== commentId)
      }));
      setItemCommentCounts(prev => ({
        ...prev,
        [compositeId]: Math.max(0, (prev[compositeId] || 0) - 1)
      }));
    } catch (e) {
      console.error("Error deleting comment:", e);
      alert("コメントの削除に失敗しました");
    }
  };

  const updateComment = async (itemId, ownerUid, commentId) => {
    if (!currentUser || !editingCommentText.trim() || isUpdatingComment) return;
    setIsUpdatingComment(true);

    try {
      const bareId = String(itemId).replace(/^local-/, '');
      const commentDocRef = doc(db, 'users', ownerUid, 'closetItems', bareId, 'comments', commentId);
      await updateDoc(commentDocRef, {
        text: editingCommentText.trim(),
        updatedAt: serverTimestamp()
      });

      // Update local state
      const compositeId = `${ownerUid}_${bareId}`;
      setItemComments(prev => ({
        ...prev,
        [compositeId]: (prev[compositeId] || []).map(c =>
          c.id === commentId ? { ...c, text: editingCommentText.trim() } : c
        )
      }));
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch (e) {
      console.error("Error updating comment:", e);
      alert("コメントの更新に失敗しました");
    } finally {
      setIsUpdatingComment(false);
    }
  };

  // Toggle heart reaction on a comment
  const toggleCommentHeart = async (itemId, ownerUid, commentId) => {
    if (!currentUser) {
      alert("ログインが必要です");
      return;
    }
    const bareId = String(itemId).replace(/^local-/, '');
    const compositeId = `${ownerUid}_${bareId}`;
    const commentDocRef = doc(db, 'users', ownerUid, 'closetItems', bareId, 'comments', commentId);

    // Check current state from local comments
    const currentComments = itemComments[compositeId] || [];
    const comment = currentComments.find(c => c.id === commentId);
    const isHearted = (comment?.heartedBy || []).includes(currentUser.uid);

    // Optimistic UI update
    setItemComments(prev => ({
      ...prev,
      [compositeId]: (prev[compositeId] || []).map(c => {
        if (c.id !== commentId) return c;
        const currentHeartedBy = c.heartedBy || [];
        const newHeartedBy = isHearted
          ? currentHeartedBy.filter(uid => uid !== currentUser.uid)
          : [...currentHeartedBy, currentUser.uid];
        return {
          ...c,
          heartedBy: newHeartedBy,
          hearts: newHeartedBy.length
        };
      })
    }));

    try {
      if (isHearted) {
        await updateDoc(commentDocRef, {
          heartedBy: arrayRemove(currentUser.uid),
          hearts: increment(-1)
        });
      } else {
        await updateDoc(commentDocRef, {
          heartedBy: arrayUnion(currentUser.uid),
          hearts: increment(1)
        });
      }
    } catch (e) {
      console.error("Error toggling comment heart:", e);
      // Revert on error
      await fetchEngagement(bareId, ownerUid);
    }
  };

  useEffect(() => {
    if (selectedItem) {
      try {
        // Ensure we pass a string bare ID for the path, and the owner UID
        const bareId = String(selectedItem.id || '').replace(/^local-/, '');
        if (bareId && selectedItem.userId) {
          fetchEngagement(bareId, selectedItem.userId);
        }

        // Auto-scroll to comments if requested
        if (shouldScrollToComments) {
          setTimeout(() => {
            commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setShouldScrollToComments(false);
          }, 300);
        }
      } catch (err) {
        console.error("Error in selectedItem effect:", err);
      }
    }
  }, [selectedItem]);

  // --- FILTERED ITEMS LOGIC ---
  const filteredItems = useMemo(() => {
    // Prioritize: stored item userName > Firestore name > Auth name > Guest
    const effectiveDisplayName = firestoreUserName || (currentUser?.displayName === 'You' ? null : currentUser?.displayName) || t('guest');
    const userPhoto = currentUser?.photoURL || '/api/placeholder/40/40';
    const myUid = currentUser?.uid || null;

    // Simplified Filter Logic for My Items ONLY
    const myItems = closetItems.map(item => {
      const id = item.id;
      const bareId = String(id).replace(/^local-/, '');
      const compositeId = myUid ? `${myUid}_${bareId}` : `guest_${bareId}`;

      return {
        id: `local-${item.id}`,
        userId: myUid,
        userName: effectiveDisplayName,
        userIcon: userPhoto,
        plushieId: item.plushieId,
        plushieName: item.plushieName || 'My Plushie',
        plushieHeight: item.plushieHeight || 0,
        location: item.location,
        imageUrl: item.image,
        itemName: item.name,
        purchaseType: item.purchaseType || '',
        shopName: safeHostname(item.url),
        fitRating: item.fitRating || '',
        comment: item.comment,
        patternImage: item.patternImage || null,
        referenceUrl: item.referenceUrl || '',
        date: safeDate(item.createdAt),
        likes: item.likes || 0,
        isOwn: true,
        compositeId,
        isPublic: item.isPublic,
        galleryOnly: item.galleryOnly,
        createdAt: item.createdAt,
        category: item.category || 'other'
      };
    });

    return myItems.filter(item => {
      let matchesPlushie = true;
      if (activePlushieId !== 'all') {
        matchesPlushie = String(item.plushieId) === String(activePlushieId);
      }

      let matchesFit = true;
      if (activeFitRating !== 'all') {
        matchesFit = item.fitRating === activeFitRating;
      }

      // Filter out Gallery Only items from the Closet View?
      // Usually yes, unless we want to see them too. 
      // User said "remove gallery tab", so we focus on Closet.
      // Usually "Gallery Only" means "Hidden from Closet".
      if (item.galleryOnly) return false;

      return matchesPlushie && matchesFit;
    });
  }, [closetItems, activePlushieId, activeFitRating, currentUser, firestoreUserName, firestorePhotoURL, t]);

  const fitLabels = t('fitLabelsShort') || ['Tight', 'Snug', 'Good', 'Loose', 'Perf'];
  const fullFitLabels = t('fitLabels') || ['Too Tight', 'Tight', 'Good', 'Loose', 'Perfect'];

  return (
    <div className="pb-48">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur z-10 pt-4 pb-2 px-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black flex items-center gap-2">
            {t('myCloset')}
          </h2>
          <Link to="/gallery" className="flex items-center gap-1.5 text-xs font-bold bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all shadow-sm">
            <Users size={14} />
            <span>みんなのギャラリー</span>
          </Link>
        </div>
      </div>

      {/* Profile Header */}
      <div className="px-4 mt-2 mb-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentUser && (
                <UserAvatar
                  src={firestorePhotoURL || currentUser?.photoURL}
                  className="w-12 h-12 ring-2 ring-primary/20"
                  alt={firestoreUserName || currentUser?.displayName}
                />
              )}
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
          {/* Logout link */}
          {currentUser && (
            <button
              onClick={async () => {
                if (window.confirm(t('logoutConfirm') || 'ログアウトしますか？')) {
                  const result = await logout();
                  if (result.success) navigate('/login');
                }
              }}
              className="mt-3 pt-3 border-t border-gray-100 w-full flex items-center justify-end gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              <LogOut size={12} />
              <span>{t('logout') || 'ログアウト'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="px-4 mt-4">
        {/* === ITEMS LIST === */}
        <div className="fade-in">
          <div className="bg-blue-50/50 border border-blue-100 px-4 py-3 rounded-xl mb-4 text-[11px] text-blue-600 flex items-start gap-3 shadow-sm">
            <span className="text-base flex-shrink-0">💡</span>
            <div>
              <p className="font-bold mb-1 leading-tight">{currentUser ? t('closetTabHelp') : t('closetTabHelpGuest')}</p>
              {closetItems.some(i => i.galleryOnly) && (
                <p className="text-orange-500 font-bold flex items-center gap-1 mt-1">
                  <span>⚠️</span>
                  <span>ギャラリーのみに表示中のアイテムが {closetItems.filter(i => i.galleryOnly).length} 件あります</span>
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
              {t('myCloset')}
              <span className="text-[10px] font-normal text-gray-200">v1.2.7</span>
            </h1>

            {/* Local Development Only: Wardrobe Toggle */}
            {import.meta.env.DEV && (
              <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 px-3 rounded-lg flex items-center gap-2 transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary font-bold' : 'text-gray-400'}`}
                >
                  <LayoutGrid size={14} />
                  <span className="text-[10px]">{t('items') || 'リスト'}</span>
                </button>
                <button
                  onClick={() => setViewMode('shelf')}
                  className={`p-1.5 px-3 rounded-lg flex items-center gap-2 transition-all ${viewMode === 'shelf' ? 'bg-white shadow-sm text-primary font-bold' : 'text-gray-400'}`}
                >
                  <Library size={14} />
                  <span className="text-[10px]">ワードローブ</span>
                </button>
              </div>
            )}

            {/* --- Plushie Filter Chips --- */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar px-1">
              <button
                onClick={() => setActivePlushieId('all')}
                style={{
                  width: '74px',
                  minWidth: '74px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: activePlushieId === 'all' ? '#1f2937' : '#ffffff',
                  color: activePlushieId === 'all' ? '#ffffff' : '#1f2937',
                  borderRadius: '999px',
                  border: '1px solid #d1d5db',
                  fontSize: '12px',
                  fontWeight: '900'
                }}
              >
                <b>すべて</b>
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
                style={{
                  width: '74px',
                  minWidth: '74px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: activeFitRating === 'all' ? '#1f2937' : '#ffffff',
                  color: activeFitRating === 'all' ? '#ffffff' : '#1f2937',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '10px',
                  fontWeight: '900'
                }}
              >
                <b>すべて</b>
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
                    {(t('fitLabelsShort')?.[rating - 1] || ['Tight', 'Perfect', 'Loose'][rating - 1]).replace(/^[^\s]+\s/, '')}
                  </span>
                </button>
              ))}
            </div>

            {/* --- Timeline Grid --- */}
            {(() => {
              // Note: filteredItems is already filtered by activePlushieId and activeFitRating in useMemo
              const timelineItems = filteredItems;

              if (timelineItems.length === 0) {
                const isFiltered = activePlushieId !== 'all' || activeFitRating !== 'all';
                return (
                  <div className="flex flex-col items-center justify-center py-12 px-6 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100 space-y-4">
                    <div className="text-4xl">{isFiltered ? '🔍' : '👗'}</div>
                    <div className="text-center">
                      <p className="font-black text-gray-800">
                        {isFiltered ? t('noItemsResult') : t('noItemsYet')}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {isFiltered ? t('noItemsSub') : t('noItemsSub')}
                      </p>
                    </div>

                    {isFiltered ? (
                      <button
                        onClick={() => { setActivePlushieId('all'); setActiveFitRating('all'); }}
                        className="bg-white text-primary border border-primary/20 px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:bg-primary/5 transition-all flex items-center gap-2"
                      >
                        <X size={14} />
                        {t('categoryAll') || 'すべて'}を表示する
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-primary text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-primary/20 flex items-center gap-2"
                      >
                        <Plus size={16} />
                        {t('addNewOutfit')}
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <div className="pb-48">
                  {viewMode === 'shelf' ? (
                    <VisualCloset
                      items={timelineItems}
                      onSelectItem={setSelectedItem}
                      updateClosetItem={updateClosetItem}
                      t={t}
                    />
                  ) : (
                    Object.entries(timelineItems.reduce((acc, item) => {
                      let key = '----.--';
                      try {
                        // Group by YYYY.MM
                        const d = new Date(item.createdAt);
                        if (!isNaN(d.getTime())) {
                          key = `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                        } else if (item.date) {
                          const parts = item.date.split('-');
                          if (parts.length >= 2) key = `${parts[0]}.${parts[1]}`;
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
                            <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                              <button
                                onClick={() => setShowAddModal(true)}
                                className="absolute inset-0 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all group"
                              >
                                <div className="bg-white p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform mb-2">
                                  <Plus size={24} className="text-primary" />
                                </div>
                                <span className="text-xs font-bold">{t('addNewOutfit')}</span>
                              </button>
                            </div>
                          )}

                          {groupItems.map(item => (
                            <div
                              key={item.id}
                              onClick={() => setSelectedItem(item)}
                              className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 relative group cursor-pointer active:scale-95 transition-transform"
                            >
                              <div className="relative w-full bg-gray-100" style={{ paddingBottom: '100%' }}>
                                <img src={item.imageUrl} alt={item.itemName} className="absolute inset-0 w-full h-full object-cover" />
                                {item.isPublic ? (
                                  <div className="absolute top-2 right-2 flex gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm('この写真をマイコーデから非表示にし、ギャラリーのみに表示しますか？')) {
                                          updateClosetItem(item.id.replace('local-', ''), { galleryOnly: true });
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
                                ) : (
                                  <div className="absolute top-2 right-2 flex gap-1">
                                    <div className="bg-black/40 text-white p-1.5 rounded-full backdrop-blur-sm flex items-center gap-1">
                                      <Lock size={12} />
                                      <span className="text-[10px] font-bold pr-1">{t('privateOnly') || '非公開'}</span>
                                    </div>
                                  </div>
                                )}
                                <div className={`absolute bottom-3 left-2 px-1.5 py-0.5 rounded-full text-xs shadow-sm flex items-center justify-center ${item.fitRating === 2 ? 'bg-green-500' :
                                  item.fitRating === 1 ? 'bg-red-400' : 'bg-yellow-500'
                                  }`}>
                                  {(t('fitLabelsShort')?.[item.fitRating - 1] || '😊').split(' ')[0]}
                                </div>
                              </div>
                              <div className="p-2">
                                <h4 className="font-bold text-sm truncate">{item.itemName || 'Untitled'}</h4>
                                <p className="text-xs text-gray-400 truncate">
                                  {item.date}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )))}
                </div>
              );
            })()}
          </div>
        </div>
      </div >

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
      {
        showEditProfile && (
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
        )
      }

      {/* === ITEM DETAIL MODAL === */}
      {
        selectedItem && (
          <Portal>
            <div
              className="fixed inset-0 bg-black/60 z-modal flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200"
            >
              <div
                className="modal-responsive relative shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => { setSelectedItem(null); setIsEditing(false); }}
                  className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full z-10 hover:bg-black/70 backdrop-blur-sm"
                >
                  <X size={20} />
                </button>

                <div className="modal-content-wrapper bg-white">
                  <div className="modal-scroll-area">
                    <div className="relative">
                      <img src={selectedItem.imageUrl || selectedItem.image} alt="" className="w-full aspect-square object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-20 text-white">
                        <h2 className="text-xl font-bold">{selectedItem.itemName || selectedItem.name}</h2>
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
                              <span>{safeDate(selectedItem.createdAt)}</span>
                            </>
                          )}
                        </div>

                        {/* Live Like Button in Modal */}
                        {!isEditing && (
                          <button
                            onClick={() => toggleLike(selectedItem.id, selectedItem.userId, selectedItem.compositeId)}
                            className={`flex items-center gap-3 px-5 py-2.5 rounded-full font-black text-sm transition-all active:scale-90 ${(itemLikes[selectedItem.compositeId]?.isLiked)
                              ? 'bg-pink-500 text-white shadow-lg ring-4 ring-pink-100'
                              : 'bg-pink-50 text-pink-500 hover:bg-pink-100 border border-pink-200'
                              }`}
                          >
                            <Heart size={20} fill={(itemLikes[selectedItem.compositeId]?.isLiked) ? "currentColor" : "none"} strokeWidth={3} className="pointer-events-none" />
                            <span className="pointer-events-none">{itemLikes[selectedItem.compositeId]?.count ?? selectedItem.likes ?? 0}</span>
                          </button>
                        )}

                        {/* Edit / Delete Buttons - ONLY for the owner */}
                        {(currentUser?.uid === selectedItem.userId || (!currentUser && !selectedItem.userId)) && (
                          <div className="flex gap-2 z-20 relative">
                            {!isEditing && (
                              <button
                                onClick={() => {
                                  setIsEditing(true);
                                  setEditData({
                                    fitRating: selectedItem.fitRating,
                                    comment: selectedItem.comment || '',
                                    isPublic: selectedItem.isPublic,
                                    galleryOnly: selectedItem.galleryOnly || false,
                                    purchaseType: selectedItem.purchaseType || '',
                                    category: selectedItem.category || 'other',
                                    url: selectedItem.url || '',
                                    url2: selectedItem.url2 || '',
                                    url3: selectedItem.url3 || '',
                                    patternImage: selectedItem.patternImage || null,
                                    referenceUrl: selectedItem.referenceUrl || ''
                                  });
                                }}
                                className="bg-blue-50 text-blue-500 hover:bg-blue-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-bold text-xs border border-blue-200"
                              >
                                <Edit2 size={14} />
                                <span>編集する</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (window.confirm(t('deleteConfirm'))) {
                                  deleteClosetItem(selectedItem.id.replace('local-', ''));
                                  setSelectedItem(null);
                                  setIsEditing(false);
                                }
                              }}
                              className="bg-red-50 text-red-400 hover:bg-red-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-bold text-xs border border-red-200"
                            >
                              <Trash2 size={14} />
                              <span>削除</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* URL */}
                      {/* URL Section (View & Edit) */}
                      <div>
                        {isEditing ? (
                          <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <h4 className="text-sm font-bold text-gray-400 uppercase flex items-center gap-2">
                              <Link size={14} />
                              <span>商品URL（最大3つ）</span>
                            </h4>
                            <input
                              type="url"
                              className="w-full p-2 bg-white rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                              placeholder={t('urlPlaceholder1')}
                              value={editData.url}
                              onChange={(e) => setEditData({ ...editData, url: e.target.value })}
                            />
                            <input
                              type="url"
                              className="w-full p-2 bg-white rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                              placeholder={t('urlPlaceholder2')}
                              value={editData.url2}
                              onChange={(e) => setEditData({ ...editData, url2: e.target.value })}
                            />
                            <input
                              type="url"
                              className="w-full p-2 bg-white rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                              placeholder={t('urlPlaceholder3')}
                              value={editData.url3}
                              onChange={(e) => setEditData({ ...editData, url3: e.target.value })}
                            />
                          </div>
                        ) : (
                          (selectedItem.url || selectedItem.url2 || selectedItem.url3) && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold text-gray-400 uppercase ml-1">
                                {t('boughtFrom') || '購入先リンク'}
                              </h4>
                              <div className="flex flex-col gap-2">
                                {[
                                  { url: selectedItem.url, label: selectedItem.shopName || safeHostname(selectedItem.url) || '商品ページ 1' },
                                  { url: selectedItem.url2, label: safeHostname(selectedItem.url2) || '商品ページ 2' },
                                  { url: selectedItem.url3, label: safeHostname(selectedItem.url3) || '商品ページ 3' }
                                ].filter(link => link.url).map((link, index) => (
                                  <a
                                    key={index}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-gray-50 hover:bg-gray-100 p-3 rounded-xl flex items-center gap-3 border border-gray-100 transition-colors group"
                                  >
                                    <div className="bg-white p-2 rounded-lg shadow-sm text-blue-500 group-hover:scale-110 transition-transform">
                                      {index === 0 ? <Shirt size={18} /> : index === 1 ? <div className="text-lg leading-none">🧢</div> : <div className="text-lg leading-none">👞</div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-sm font-bold text-primary truncate block">
                                        {link.label}
                                      </span>
                                      <span className="text-[10px] text-gray-400 truncate block">
                                        {link.url}
                                      </span>
                                    </div>
                                    <div className="text-gray-300">
                                      <ExternalLink size={14} />
                                    </div>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )
                        )}
                      </div>

                      {/* Category */}
                      <div>
                        <h4 className="text-sm font-bold text-gray-400 uppercase mb-2">{t('selectCategory') || 'カテゴリー'}</h4>
                        {isEditing ? (
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: 'hat', label: t('catHat'), icon: '👒' },
                              { id: 'tops', label: t('catTops'), icon: '👕' },
                              { id: 'dress', label: t('catDress'), icon: '👗' },
                              { id: 'outer', label: t('catOuter'), icon: '🧥' },
                              { id: 'bottoms', label: t('catBottoms'), icon: '👖' },
                              { id: 'shoes', label: t('catShoes'), icon: '👟' },
                              { id: 'bag', label: t('catBag'), icon: '👜' },
                              { id: 'accessory', label: t('catAccessory'), icon: '🎀' },
                              { id: 'other', label: t('catOther'), icon: '✨' }
                            ].map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => setEditData({ ...editData, category: cat.id })}
                                className={`p-2 py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${editData.category === cat.id
                                  ? 'bg-primary/10 text-primary border-primary shadow-sm scale-105'
                                  : 'border-gray-100 bg-gray-50 text-gray-400 grayscale'
                                  }`}
                              >
                                <span className="text-xl">{cat.icon}</span>
                                <span className="text-[10px] font-bold leading-tight">{cat.label}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-sm font-bold bg-primary/10 text-primary px-3 py-1.5 rounded-xl">
                            {(() => {
                              const cat = [
                                { id: 'hat', label: t('catHat'), icon: '👒' },
                                { id: 'tops', label: t('catTops'), icon: '👕' },
                                { id: 'dress', label: t('catDress'), icon: '👗' },
                                { id: 'outer', label: t('catOuter'), icon: '🧥' },
                                { id: 'bottoms', label: t('catBottoms'), icon: '👖' },
                                { id: 'shoes', label: t('catShoes'), icon: '👟' },
                                { id: 'bag', label: t('catBag'), icon: '👜' },
                                { id: 'accessory', label: t('catAccessory'), icon: '🎀' },
                                { id: 'other', label: t('catOther'), icon: '✨' }
                              ].find(c => c.id === (selectedItem.category || 'other'));
                              return `${cat?.icon} ${cat?.label}`;
                            })()}
                          </span>
                        )}
                      </div>

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

                      {/* Purchase Type Section */}
                      <div>
                        <h4 className="text-sm font-bold text-gray-400 uppercase mb-2">{t('purchaseTypeLabel') || '入手方法'}</h4>
                        {isEditing ? (
                          <div className="flex gap-2">
                            {[
                              { id: '', label: t('notSet') || '未設定', icon: '➖' },
                              { id: 'online', label: t('categoryOnline'), icon: '🌐' },
                              { id: 'retail', label: t('categoryRetail'), icon: '🏪' },
                              { id: 'handmade', label: t('categoryHandmade'), icon: '🪡' }
                            ].map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => setEditData({ ...editData, purchaseType: cat.id })}
                                className={`flex-1 p-2 py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${editData.purchaseType === cat.id
                                  ? 'bg-primary text-white border-primary shadow-lg scale-105'
                                  : 'border-gray-100 bg-gray-50 text-gray-400 grayscale'
                                  }`}
                              >
                                <span className="text-xl">{cat.icon}</span>
                                <span className="text-[10px] font-bold leading-tight">{cat.label}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          selectedItem.purchaseType ? (
                            <span className="inline-flex items-center gap-1.5 text-sm font-bold bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl">
                              {selectedItem.purchaseType === 'online' ? `🌐 ${t('categoryOnline')}` :
                                selectedItem.purchaseType === 'retail' ? `🏪 ${t('categoryRetail')}` :
                                  `🪡 ${t('categoryHandmade')}`}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400 italic">{t('notSet') || '未設定'}</span>
                          )
                        )}
                      </div>
                    </div>

                    {/* Handmade Specific Fields (Edit Mode) */}
                    {isEditing && editData.purchaseType === 'handmade' && (
                      <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-orange-600 uppercase flex items-center gap-2">
                            <span>🪡</span> {language === 'jp' ? 'ハンドメイド資料' : 'Handmade Materials'}
                          </h4>
                          <span className="text-[9px] font-bold text-orange-400 bg-orange-100/50 px-2 py-0.5 rounded-full">{language === 'jp' ? '任意' : 'Optional'}</span>
                        </div>

                        {/* Pattern Upload */}
                        <div>
                          <label className="block text-[10px] font-bold text-orange-700/70 mb-2 uppercase tracking-wider">{language === 'jp' ? '型紙・製作図をアップ' : 'Upload Pattern'}</label>
                          {!editData.patternImage ? (
                            <div className="w-full h-16 bg-white/80 rounded-xl border-2 border-dashed border-orange-200 flex flex-col items-center justify-center relative overflow-hidden group hover:border-orange-400 transition-colors cursor-pointer">
                              <input
                                type="file"
                                onChange={async (e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    try {
                                      const compressed = await compressImage(file);
                                      setEditData({ ...editData, patternImage: compressed });
                                    } catch { alert('Failed to load image'); }
                                  }
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                accept="image/*"
                              />
                              <Camera size={16} className="text-orange-300 mb-1 group-hover:text-orange-500 transition-colors" />
                              <p className="text-orange-400 font-bold text-[9px]">{language === 'jp' ? 'タップして画像を選択' : 'Tap to select image'}</p>
                            </div>
                          ) : (
                            <div className="w-full h-24 bg-white rounded-xl overflow-hidden relative shadow-sm border border-orange-100">
                              <img src={editData.patternImage} alt="Pattern Preview" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <label className="bg-white/90 text-orange-600 p-1.5 rounded-lg text-[10px] font-bold backdrop-blur-sm cursor-pointer hover:bg-white transition-colors">
                                  {language === 'jp' ? '選び直す' : 'Change'}
                                  <input
                                    type="file"
                                    onChange={async (e) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        try {
                                          const compressed = await compressImage(file);
                                          setEditData({ ...editData, patternImage: compressed });
                                        } catch { alert('Failed to load image'); }
                                      }
                                    }}
                                    className="hidden"
                                    accept="image/*"
                                  />
                                </label>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditData({ ...editData, patternImage: null }); }}
                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-sm"
                              >
                                <span className="text-[10px] leading-none">✕</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Reference URL */}
                        <div>
                          <label className="block text-[10px] font-bold text-orange-700/70 mb-1 uppercase tracking-wider">{language === 'jp' ? '作り方の参考URL' : 'Reference URL'}</label>
                          <input
                            type="url"
                            className="w-full p-2.5 bg-white rounded-xl border border-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-200 text-sm"
                            placeholder="https://..."
                            value={editData.referenceUrl}
                            onChange={(e) => setEditData({ ...editData, referenceUrl: e.target.value })}
                          />
                        </div>
                      </div>
                    )}

                    {/* Handmade Specific Fields (View Mode) */}
                    {!isEditing && (selectedItem.patternImage || selectedItem.referenceUrl) && (
                      <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 space-y-4">
                        <h4 className="text-xs font-black text-orange-600 uppercase flex items-center gap-2">
                          <span>📖</span> {language === 'jp' ? 'ハンドメイド資料' : 'Handmade Materials'}
                        </h4>

                        {selectedItem.patternImage && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-orange-700/70 uppercase tracking-wider">{language === 'jp' ? '型紙・製作図' : 'Pattern Image'}</p>
                            <div className="relative group">
                              <img src={selectedItem.patternImage} className="w-full rounded-xl border border-orange-100 shadow-sm transition-transform hover:scale-[1.02] cursor-zoom-in" alt="Pattern" />
                            </div>
                          </div>
                        )}

                        {selectedItem.referenceUrl && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-orange-700/70 uppercase tracking-wider">{language === 'jp' ? '作り方の参考' : 'Reference Link'}</p>
                            <a
                              href={selectedItem.referenceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between w-full p-3 bg-white rounded-xl border border-orange-100 hover:border-orange-300 transition-all group shadow-sm"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-100 rounded-lg text-orange-600 group-hover:scale-110 transition-transform">
                                  <ExternalLink size={14} />
                                </div>
                                <span className="text-sm font-bold text-orange-700 truncate max-w-[200px]">{selectedItem.referenceUrl}</span>
                              </div>
                              <span className="text-orange-300 flex items-center group-hover:translate-x-1 transition-transform">→</span>
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Author's Note Section */}
                    <div>
                      <h4 className="text-sm font-black text-gray-400 uppercase mb-2 flex items-center gap-2">
                        <Star size={14} className="text-yellow-400 fill-yellow-400" />
                        <span>投稿者のひとこと（アイテム説明）</span>
                      </h4>
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

                    {/* Comments Section (Existing Logic kept for owned items) */}
                    {selectedItem.isPublic && !isEditing && (
                      <div ref={commentsRef} className="pt-8 border-t-2 border-dashed border-gray-100 mt-6 scroll-mt-6">
                        <h4 className="text-base font-black text-gray-800 uppercase mb-4 flex items-center justify-between bg-blue-500 text-white p-4 rounded-2xl shadow-md">
                          <div className="flex items-center gap-3">
                            <MessageCircle size={22} className="text-blue-500" />
                            <span className="tracking-widest">{t('commentsTitle') || 'コメントを読み書きする'}</span>
                            <span className="bg-white border-2 border-blue-200 px-2.5 py-0.5 rounded-full text-xs font-black text-blue-600 shadow-sm">
                              {itemComments[selectedItem.compositeId]?.length || 0}
                            </span>
                          </div>
                        </h4>

                        <div className="space-y-4 mb-8 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {(itemComments[selectedItem.compositeId] || []).length > 0 ? (
                            (itemComments[selectedItem.compositeId] || []).map((comment) => (
                              <div key={comment.id} className="flex gap-3 items-start animate-in slide-in-from-bottom-2 group/comment">
                                <UserAvatar src={comment.userIcon} className="w-9 h-9 flex-shrink-0 border-2 border-white shadow-sm" alt="" />
                                <div className="flex-1 bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-50">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-gray-900">{comment.userName}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-gray-400">
                                        {comment.createdAt?.seconds
                                          ? new Date(comment.createdAt.seconds * 1000).toLocaleDateString()
                                          : new Date(comment.createdAt).toLocaleDateString()}
                                      </span>
                                      {currentUser?.uid === comment.userId && !editingCommentId && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover/comment:opacity-100 transition-all">
                                          <button
                                            onClick={() => {
                                              setEditingCommentId(comment.id);
                                              setEditingCommentText(comment.text);
                                            }}
                                            className="p-1 text-gray-300 hover:text-blue-500 transition-all"
                                            title="編集"
                                          >
                                            <Edit2 size={12} />
                                          </button>
                                          <button
                                            onClick={() => {
                                              if (window.confirm("このコメントを削除しますか？")) {
                                                deleteComment(selectedItem.id, selectedItem.userId, comment.id);
                                              }
                                            }}
                                            className="p-1 text-gray-300 hover:text-red-400 transition-all"
                                            title="削除"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {editingCommentId === comment.id ? (
                                    <div className="space-y-2 mt-2">
                                      <textarea
                                        value={editingCommentText}
                                        onChange={(e) => setEditingCommentText(e.target.value)}
                                        className="w-full p-2 bg-gray-50 rounded-lg border border-blue-100 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm h-20 resize-none"
                                        placeholder="コメントを編集..."
                                      />
                                      <div className="flex justify-end gap-2">
                                        <button
                                          onClick={() => {
                                            setEditingCommentId(null);
                                            setEditingCommentText('');
                                          }}
                                          className="px-3 py-1 text-[10px] font-bold text-gray-400 hover:text-gray-600"
                                        >
                                          キャンセル
                                        </button>
                                        <button
                                          onClick={() => updateComment(selectedItem.id, selectedItem.userId, comment.id)}
                                          disabled={!editingCommentText.trim() || isUpdatingComment}
                                          className="px-3 py-1 bg-primary text-white rounded-lg text-[10px] font-bold shadow-sm hover:brightness-110 disabled:opacity-50"
                                        >
                                          {isUpdatingComment ? '保存中...' : '保存する'}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-700 leading-relaxed break-words">
                                      {comment.text}
                                    </p>
                                  )}

                                  {/* Heart reaction button */}
                                  <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-gray-50">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        toggleCommentHeart(selectedItem.id, selectedItem.userId, comment.id);
                                      }}
                                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold transition-all active:scale-90 ${(comment.heartedBy || []).includes(currentUser?.uid)
                                        ? 'bg-pink-50 text-pink-500 ring-1 ring-pink-200'
                                        : 'bg-gray-50 text-gray-400 hover:bg-pink-50 hover:text-pink-400'
                                        }`}
                                    >
                                      <Heart
                                        size={12}
                                        fill={(comment.heartedBy || []).includes(currentUser?.uid) ? 'currentColor' : 'none'}
                                        strokeWidth={2.5}
                                      />
                                      <span>{comment.hearts || (comment.heartedBy || []).length || ''}</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                              <p className="text-sm text-gray-400 font-medium italic">{t('noCommentsYet') || 'まだコメントがありません'}</p>
                            </div>
                          )}
                        </div>

                        {/* Comment Form */}
                        {currentUser ? (
                          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 shadow-inner">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                                <Plus size={14} /> {t('addCommentLabel') || 'コメントを投稿する'}
                              </span>
                            </div>
                            <div className="flex gap-2 items-end">
                              <div className="flex-1 relative group">
                                <textarea
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  placeholder={t('commentPlaceholder') || 'ここにコメントを入力...'}
                                  className="w-full p-3 bg-white rounded-xl border border-blue-100 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm h-24 shadow-sm transition-all resize-none"
                                  maxLength={200}
                                />
                                <div className="absolute bottom-2 right-2 flex items-center gap-2">
                                  <span className={`text-[9px] font-bold ${commentText.length >= 190 ? 'text-red-500' : 'text-blue-300'}`}>
                                    {commentText.length}/200
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => submitComment(selectedItem.id, selectedItem.userId)}
                                disabled={!commentText.trim() || isSubmittingComment}
                                className="bg-primary text-white p-4 rounded-xl shadow-lg hover:bg-primary/90 disabled:opacity-50 disabled:grayscale transition-all h-24 w-14 flex flex-col items-center justify-center gap-2 group active:scale-95"
                              >
                                {isSubmittingComment ? (
                                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    <span className="text-[10px] font-bold">送信</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-100">
                            <p className="text-sm text-gray-500 font-bold mb-3">{t('loginToComment') || 'コメントするにはログインが必要です'}</p>
                            <Link to="/settings" className="inline-block px-6 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                              {t('goToLogin') || 'ログイン・設定へ'}
                            </Link>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Save / Cancel Buttons */}
                    {isEditing && (
                      <div className="flex gap-3 mt-2">
                        <button
                          onClick={() => setIsEditing(false)}
                          className="flex-1 py-4 rounded-xl border-2 border-gray-200 text-gray-500 font-bold text-base hover:bg-gray-50 transition-colors"
                        >
                          {t('cancel') || 'キャンセル'}
                        </button>
                        <button
                          onClick={() => {
                            updateClosetItem(selectedItem.id.replace('local-', ''), editData);
                            setSelectedItem({ ...selectedItem, ...editData });
                            setIsEditing(false);
                          }}
                          className="flex-1 py-4 rounded-xl bg-primary text-white font-bold text-base shadow-md hover:opacity-90 transition-all active:scale-95"
                        >
                          ✓ {t('save') || '保存'}
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
