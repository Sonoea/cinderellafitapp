import React, { useState, useRef, useEffect, useMemo } from 'react';
import { collectionGroup, query, where, getDocs, doc, setDoc, deleteDoc, addDoc, serverTimestamp, collection, getDoc, orderBy, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Plus, Shirt, Users, User, Heart, Share2, MessageCircle, Lock, Unlock, X, Camera, Star, MapPin, Search, Ruler, EyeOff, Send, LogOut, ExternalLink, Library, LayoutGrid, Tag, Package, PartyPopper } from 'lucide-react';
import { compressImage, openPdfFromDataUrl } from '../utils/imageUtils';
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
  const [viewMode, setViewMode] = useState('shelf'); // 'list' or 'shelf'

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
  const [showPostComplete, setShowPostComplete] = useState(false);
  const [refCompositeId, setRefCompositeId] = useState(null);
  const [initialTheme, setInitialTheme] = useState(null);
 
   // Handle external "edit" request from Gallery
   useEffect(() => {
     const urlParams = new URLSearchParams(location.search);
     const editId = urlParams.get('edit');
     if (editId && closetItems.length > 0) {
       const itemToEdit = closetItems.find(i => String(i.id) === String(editId));
       if (itemToEdit) {
         setSelectedItem(itemToEdit);
         setIsEditing(true);
         setEditData({
           name: itemToEdit.name || itemToEdit.itemName || '',
           location: itemToEdit.location || '',
           fitRating: itemToEdit.fitRating,
           comment: itemToEdit.comment || '',
           isPublic: itemToEdit.isPublic,
           galleryOnly: itemToEdit.galleryOnly || false,
           purchaseType: itemToEdit.purchaseType || (itemToEdit.patternImage || itemToEdit.referenceUrl ? 'handmade' : 'bought'),
           category: itemToEdit.category || 'other',
           url: itemToEdit.url || '',
           url2: itemToEdit.url2 || '',
           url3: itemToEdit.url3 || '',
           patternImage: itemToEdit.patternImage || null,
           referenceUrl: itemToEdit.referenceUrl || '',
           referencePostUrl: itemToEdit.referencePostUrl || '',
           referencedPostId: itemToEdit.referencedPostId || '',
           referencedUserName: itemToEdit.referencedUserName || '',
           waistFlat: itemToEdit.waistFlat || '',
           clothesLength: itemToEdit.clothesLength || '',
           cuffWidth: itemToEdit.cuffWidth || '',
           isPattern: itemToEdit.isPattern || false,
           patternSource: itemToEdit.patternSource || (itemToEdit.referencedPostId ? 'cinderellafit' : (itemToEdit.referenceUrl ? 'external' : 'original'))
         });
         // Clean up URL
         navigate('/closet', { replace: true });
       }
     }
   }, [closetItems, location.search]);

  // Handle deeplink to specific item or add modal
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const itemId = params.get('itemId');
    const shouldAdd = params.get('add') === 'true';

    if (shouldAdd) {
      setShowAddModal(true);
      // Check for ref parameter (from "try making with this pattern" button)
      const refParam = params.get('ref');
      if (refParam) {
        setRefCompositeId(refParam);
      }
      
      // Check for theme parameter (from "Theme Challenge" button)
      const themeParam = params.get('theme');
      if (themeParam) {
        setInitialTheme(themeParam);
      }

      // Clean up URL
      navigate('/closet', { replace: true });
    }

    if (itemId && closetItems.length > 0) {
      const found = closetItems.find(i => `local-${i.id}` === itemId || i.id === itemId);
      if (found) {
        setSelectedItem(found);
      }
    }
  }, [location.search, closetItems, navigate]);

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
      alert(t('errLoginRequired'));
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
      alert(t('errCommentSend'));
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
      alert(t('errCommentDelete'));
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
      alert(t('errCommentUpdate'));
    } finally {
      setIsUpdatingComment(false);
    }
  };

  // Toggle heart reaction on a comment
  const toggleCommentHeart = async (itemId, ownerUid, commentId) => {
    if (!currentUser) {
      alert(t('errLoginRequired'));
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
        category: item.category || 'other',
        waistFlat: item.waistFlat || '',
        clothesLength: item.clothesLength || '',
        cuffWidth: item.cuffWidth || '',
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

      // Exclude gallery-only items from the main closet view
      // They will be shown in a separate section below
      if (item.galleryOnly) return false;

      return matchesPlushie && matchesFit;
    });
  }, [closetItems, activePlushieId, activeFitRating, currentUser, firestoreUserName, firestorePhotoURL, t]);

  // Separate list of gallery-only items (always unfiltered by plushie/fit)
  const galleryOnlyItems = useMemo(() => {
    if (!currentUser) return [];
    const userPhoto = firestorePhotoURL || currentUser?.photoURL || '';
    return closetItems
      .filter(item => item.galleryOnly)
      .map(item => {
        const compositeId = `${currentUser.uid}_${String(item.id).replace('local-', '')}`;
        return {
          id: item.id,
          userName: firestoreUserName || currentUser?.displayName || t('guest'),
          userIcon: userPhoto,
          imageUrl: item.image,
          itemName: item.name,
          isPublic: item.isPublic,
          galleryOnly: item.galleryOnly,
          createdAt: item.createdAt,
          date: safeDate(item.createdAt),
          compositeId,
        };
      });
  }, [closetItems, currentUser, firestoreUserName, firestorePhotoURL, t]);

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
            <span>{t('everyonesGallery')}</span>
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
                  <span>{t('galleryOnlyCount', closetItems.filter(i => i.galleryOnly).length)}</span>
                  <span className="text-[10px] font-normal ml-1">({t('restoreToCloset')}↓)</span>
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
              {t('myCloset')}
              <span className="text-[10px] font-normal text-gray-200">v1.2.7</span>
            </h1>

            <div className="bg-gray-100/80 p-1.5 rounded-2xl flex gap-1.5 w-fit border border-gray-200/40 shadow-inner overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`py-2.5 px-6 rounded-xl flex items-center gap-3 transition-all duration-300 ${viewMode === 'list' 
                  ? 'bg-white shadow-md text-primary font-black scale-[1.02] border-b-2 border-primary/20' 
                  : 'text-gray-400 hover:text-gray-500 hover:bg-white/50'}`}
              >
                <LayoutGrid size={20} strokeWidth={2.5} />
                <div className="flex flex-col items-start leading-none gap-0.5">
                  <span className="text-xs font-black tracking-tight">{t('items') || '一覧'}</span>
                  <span className="text-[9px] opacity-60 font-bold uppercase tracking-widest pt-0.5">{t('viewAlbum')}</span>
                </div>
              </button>
              <button
                onClick={() => setViewMode('shelf')}
                className={`py-2.5 px-6 rounded-xl flex items-center gap-3 transition-all duration-300 ${viewMode === 'shelf' 
                  ? 'bg-white shadow-md text-amber-800 font-black scale-[1.02] border-b-2 border-amber-800/20' 
                  : 'text-gray-400 hover:text-gray-500 hover:bg-white/50'}`}
              >
                <Package size={20} strokeWidth={2.5} />
                <div className="flex flex-col items-start leading-none gap-0.5">
                  <span className="text-xs font-black tracking-tight">{t('wardrobeTitle') || 'クローゼット'}</span>
                  <span className="text-[9px] opacity-60 font-bold uppercase tracking-widest pt-0.5">{t('viewShelf')}</span>
                </div>
              </button>
            </div>

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
                <b>{t('categoryAll')}</b>
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
                <b>{t('categoryAll')}</b>
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
                        {t('showAllCategory', t('categoryAll') || 'すべて')}
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
                                        if (window.confirm(t('hideFromClosetConfirm'))) {
                                          updateClosetItem(item.id.replace('local-', ''), { galleryOnly: true });
                                        }
                                      }}
                                      className="bg-black/50 text-white p-1.5 rounded-full backdrop-blur-sm hover:bg-red-500/70 transition-colors"
                                      title={t('hideFromClosetTitle')}
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
      </div>

      {/* === GALLERY-ONLY ITEMS SECTION === */}
        {galleryOnlyItems.length > 0 && (
          <div className="px-4 mt-6 mb-8">
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200/60 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">📦</span>
                <h3 className="font-black text-sm text-orange-800">{t('galleryOnlyItemsSection')}</h3>
                <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold">{galleryOnlyItems.length}</span>
              </div>
              <p className="text-[11px] text-orange-600/80 mb-3">{t('galleryOnlyItemsDesc')}</p>
              <div className="grid grid-cols-3 gap-2">
                {galleryOnlyItems.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => setSelectedItem(item)}
                    className="relative bg-white rounded-xl overflow-hidden shadow-sm border border-orange-100 group cursor-pointer active:scale-95 transition-transform"
                  >
                    <div className="relative w-full bg-gray-100" style={{ paddingBottom: '100%' }}>
                      <img src={item.imageUrl} alt={item.itemName} className="absolute inset-0 w-full h-full object-cover opacity-70" />
                      <div className="absolute inset-0 bg-orange-900/10"></div>
                      <div className="absolute top-1.5 left-1.5 bg-orange-500 text-white px-1.5 py-0.5 rounded-full text-[8px] font-bold flex items-center gap-0.5">
                        <Users size={8} />
                        {t('galleryOnlyLabel')}
                      </div>
                    </div>
                    <div className="p-1.5">
                      <h4 className="font-bold text-[10px] truncate text-gray-700">{item.itemName || 'Untitled'}</h4>
                      <button
                        onClick={() => {
                          if (window.confirm(t('restoreToClosetConfirm'))) {
                            updateClosetItem(String(item.id).replace('local-', ''), { galleryOnly: false });
                          }
                        }}
                        className="w-full mt-1 bg-orange-500 hover:bg-orange-600 text-white text-[9px] font-bold py-1 px-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <Shirt size={10} />
                        {t('restoreToCloset')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      {/* === ADD ITEM MODAL === */}
      {
        showAddModal && (
          <Portal>
            <AddItemModal
              onClose={() => { setShowAddModal(false); setRefCompositeId(null); setInitialTheme(null); }}
              onSave={async (item) => {
                await addClosetItem(item);
                setShowAddModal(false);
                setRefCompositeId(null);
                setInitialTheme(null);
                // Show post completion modal
                if (item.isPublic) {
                  setShowPostComplete(true);
                }
              }}
              plushies={plushies}
              initialPlushieId={activePlushieId === 'all' ? undefined : activePlushieId}
              t={t}
              fitLabels={fitLabels}
              initialRefCompositeId={refCompositeId}
              initialTheme={initialTheme}
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
                    <div className="relative overflow-hidden">
                      <img src={selectedItem.imageUrl || selectedItem.image} alt="" className="w-full aspect-square object-cover" />
                    </div>

                    <div className="p-6 sm:p-8 space-y-6">
                      {/* Item Title */}
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-snug mb-1.5 break-words pr-8">{selectedItem.itemName || selectedItem.name}</h2>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5 text-blue-500 font-bold text-[11px] bg-blue-50 px-2 py-0.5 rounded-md">
                            <span>🌐</span>
                            <span>{selectedItem.location || t('myLocation') || 'My Place'}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider bg-gray-50 px-2 py-0.5 rounded-md">
                            {safeDate(selectedItem.createdAt)}
                          </div>
                        </div>
                      </div>

                      {/* Status Section */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => {
                                  const newIsPublic = !editData.isPublic;
                                  setEditData({ 
                                    ...editData, 
                                    isPublic: newIsPublic,
                                    isPattern: newIsPublic ? editData.isPattern : false
                                  });
                                }}
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
                                  {editData.galleryOnly ? t('galleryOnlyLabel') : t('showInMyCloset')}
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
                                    name: selectedItem.name || selectedItem.itemName || '',
                                    location: selectedItem.location || '',
                                    fitRating: selectedItem.fitRating,
                                    comment: selectedItem.comment || '',
                                    isPublic: selectedItem.isPublic,
                                    galleryOnly: selectedItem.galleryOnly || false,
                                    purchaseType: selectedItem.purchaseType || (selectedItem.patternImage || selectedItem.referenceUrl ? 'handmade' : 'bought'),
                                    category: selectedItem.category || 'other',
                                    url: selectedItem.url || '',
                                    url2: selectedItem.url2 || '',
                                    url3: selectedItem.url3 || '',
                                    patternImage: selectedItem.patternImage || null,
                                    referenceUrl: selectedItem.referenceUrl || '',
                                    referencePostUrl: selectedItem.referencePostUrl || '',
                                    referencedPostId: selectedItem.referencedPostId || '',
                                    referencedUserName: selectedItem.referencedUserName || '',
                                    waistFlat: selectedItem.waistFlat || '',
                                    clothesLength: selectedItem.clothesLength || '',
                                    cuffWidth: selectedItem.cuffWidth || '',
                                    isPattern: selectedItem.isPattern || false,
                                    patternSource: selectedItem.patternSource || (selectedItem.referencedPostId ? 'cinderellafit' : (selectedItem.referenceUrl ? 'external' : 'original'))
                                  });
                                }}
                                className="bg-blue-50 text-blue-500 hover:bg-blue-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-bold text-xs border border-blue-200"
                              >
                                <Edit2 size={14} />
                                <span>{t('editItemLabel')}</span>
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
                              <span>{t('deleteLabel')}</span>
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
                              <span>{t('productUrlsMax')}</span>
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

                       {/* Item Name & Location */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-2">{t('itemName')}</label>
                          {isEditing ? (
                            <input
                              type="text"
                              className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold text-gray-700"
                              placeholder={t('itemNamePlaceholder')}
                              value={editData.name}
                              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            />
                          ) : (
                            <p className="text-lg font-black text-gray-800">{selectedItem.itemName || selectedItem.name}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-2">{t('placeShop')}</label>
                          {isEditing ? (
                            <input
                              type="text"
                              className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold text-gray-700"
                              placeholder={t('locationPlaceholder') || (language === 'jp' ? '購入店など' : 'e.g. Shop name')}
                              value={editData.location}
                              onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                            />
                          ) : (
                            <p className="text-sm font-bold text-gray-600">{selectedItem.location || '-'}</p>
                          )}
                        </div>
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
                              { id: 'pattern', label: t('catPattern'), icon: '📖' },
                              { id: 'archive', label: t('catArchive'), icon: '💼' },
                              { id: 'ethnic', label: t('catEthnic'), icon: '👘' },
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
                                { id: 'pattern', label: t('catPattern'), icon: '📖' },
                                { id: 'archive', label: t('catArchive'), icon: '💼' },
                                { id: 'ethnic', label: t('catEthnic'), icon: '👘' },
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

                      {/* Size Measurements Section */}
                      <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wider">
                            <Tag size={14} className="text-primary" />
                            <span>{t('sizeInfoTitleRaw')}</span>
                          </h4>
                        </div>
                        
                        {isEditing ? (
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 mb-1">{t('waistFlatLabel')}</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.1"
                                  className="w-full p-2 bg-white rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                  placeholder="0.0"
                                  value={editData.waistFlat}
                                  onChange={(e) => setEditData({ ...editData, waistFlat: e.target.value })}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-300 pointer-events-none">cm</span>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 mb-1">{t('clothesLengthLabel')}</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.1"
                                  className="w-full p-2 bg-white rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                  placeholder="0.0"
                                  value={editData.clothesLength}
                                  onChange={(e) => setEditData({ ...editData, clothesLength: e.target.value })}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-300 pointer-events-none">cm</span>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 mb-1">{t('cuffWidthLabel')}</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.1"
                                  className="w-full p-2 bg-white rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                  placeholder="0.0"
                                  value={editData.cuffWidth}
                                  onChange={(e) => setEditData({ ...editData, cuffWidth: e.target.value })}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-300 pointer-events-none">cm</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          (selectedItem.waistFlat || selectedItem.clothesLength || selectedItem.cuffWidth) ? (
                            <div className="grid grid-cols-3 gap-4">
                              {selectedItem.waistFlat && (
                                <div className="text-center">
                                  <p className="text-[10px] font-bold text-gray-400 mb-1">{t('waistFlatLabel')}</p>
                                  <p className="text-lg font-black text-primary leading-none">{selectedItem.waistFlat}<span className="text-[10px] ml-0.5 font-normal">cm</span></p>
                                </div>
                              )}
                              {selectedItem.clothesLength && (
                                <div className="text-center">
                                  <p className="text-[10px] font-bold text-gray-400 mb-1">{t('clothesLengthLabel')}</p>
                                  <p className="text-lg font-black text-primary leading-none">{selectedItem.clothesLength}<span className="text-[10px] ml-0.5 font-normal">cm</span></p>
                                </div>
                              )}
                              {selectedItem.cuffWidth && (
                                <div className="text-center">
                                  <p className="text-[10px] font-bold text-gray-400 mb-1">{t('cuffWidthLabel')}</p>
                                  <p className="text-lg font-black text-primary leading-none">{selectedItem.cuffWidth}<span className="text-[10px] ml-0.5 font-normal">cm</span></p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-[10px] text-gray-400 italic text-center py-1">{t('noMeasurementsRecorded') || '記録されたサイズはありません'}</p>
                          )
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

                    {/* Handmade / Pattern Specific Fields (Edit Mode) */}
                    {isEditing && (
                      <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-orange-600 uppercase flex items-center gap-2">
                             <span>📖</span> {t('patternAndRef')}
                           </h4>
                           <span className="text-[9px] font-bold text-orange-400 bg-orange-100/50 px-2 py-0.5 rounded-full">{language === 'jp' ? '任意' : 'Optional'}</span>
                         </div>
 
                         {/* Pattern Source Choice */}
                         <div className="space-y-3">
                           <label className="block text-[10px] font-bold text-orange-700/70 mb-2 uppercase tracking-wider">{t('patternSourceLabel')}</label>
                           <div className="grid grid-cols-3 gap-2">
                             {[
                               { id: 'original', label: t('patternSourceOriginal'), icon: '🎨' },
                               { id: 'cinderellafit', label: t('patternSourceCF'), icon: '🎀' },
                               { id: 'external', label: t('patternSourceExternal'), icon: '🌐' }
                             ].map((src) => (
                               <button
                                 key={src.id}
                                 type="button"
                                 onClick={() => setEditData({ ...editData, patternSource: src.id })}
                                 className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${editData.patternSource === src.id
                                   ? 'bg-orange-500 text-white border-orange-500 shadow-md scale-105'
                                   : 'bg-white border-orange-100 text-orange-300 grayscale'
                                   }`}
                               >
                                 <span className="text-lg">{src.icon}</span>
                                 <span className="text-[9px] font-bold leading-tight">{src.label}</span>
                               </button>
                             ))}
                           </div>
                         </div>
 
                         {/* Conditional Inputs based on Source */}
                         {editData.patternSource === 'original' && (
                           <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                             <label className="block text-[10px] font-bold text-orange-700/70 mb-2 uppercase tracking-wider">{t('patternImagePdf')}</label>
                             {!editData.patternImage ? (
                               <div className="w-full h-16 bg-white/80 rounded-xl border-2 border-dashed border-orange-200 flex flex-col items-center justify-center relative overflow-hidden group hover:border-orange-400 transition-colors cursor-pointer">
                                 <input
                                   type="file"
                                   onChange={async (e) => {
                                     const file = e.target.files[0];
                                     if (file) {
                                       if (file.size > 1024 * 1024) {
                                         alert(t('fileSizeError'));
                                         return;
                                       }
                                       try {
                                         const compressed = await compressImage(file);
                                         setEditData({ ...editData, patternImage: compressed });
                                       } catch { alert('Failed to load file'); }
                                     }
                                   }}
                                   className="absolute inset-0 opacity-0 cursor-pointer"
                                   accept="image/*,application/pdf"
                                 />
                                 <Camera size={16} className="text-orange-300 mb-1 group-hover:text-orange-500 transition-colors" />
                                 <p className="text-orange-400 font-bold text-[9px]">{t('tapToSelect')}</p>
                               </div>
                             ) : (
                               <div className="w-full h-24 bg-white rounded-xl overflow-hidden relative shadow-sm border border-orange-100">
                                 {editData.patternImage.startsWith('data:application/pdf') ? (
                                   <div className="w-full h-full flex flex-col items-center justify-center bg-orange-50 gap-1">
                                     <Library size={24} className="text-orange-400" />
                                     <span className="text-[9px] font-bold text-orange-600">{editData.patternFileName || t('pdfPattern')}</span>
                                   </div>
                                 ) : (
                                   <img src={editData.patternImage} alt="Pattern Preview" className="w-full h-full object-cover" />
                                 )}
                                 <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                   <label className="bg-white/90 text-orange-600 p-1.5 rounded-lg text-[10px] font-bold backdrop-blur-sm cursor-pointer hover:bg-white transition-colors">
                                     {t('change')}
                                     <input
                                       type="file"
                                       onChange={async (e) => {
                                         const file = e.target.files[0];
                                         if (file) {
                                           if (file.size > 400 * 1024) {
                                             alert(t('errFileSizeCloud'));
                                             return;
                                           }
                                           try {
                                             if (file.type === 'application/pdf') {
                                               const reader = new FileReader();
                                               reader.onloadend = () => setEditData({ ...editData, patternImage: reader.result, patternFileName: file.name });
                                               reader.readAsDataURL(file);
                                             } else {
                                               const compressed = await compressImage(file);
                                               setEditData({ ...editData, patternImage: compressed });
                                             }
                                           } catch { alert('Failed to load file'); }
                                         }
                                       }}
                                       className="hidden"
                                       accept="image/*,.pdf,application/pdf"
                                     />
                                   </label>
                                 </div>
                                 <button
                                   onClick={(e) => { e.stopPropagation(); setEditData({ ...editData, patternImage: null, patternFileName: '' }); }}
                                   className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-sm"
                                 >
                                   <span className="text-[10px] leading-none">✕</span>
                                 </button>
                               </div>
                             )}
                           </div>
                         )}
 
                         {editData.patternSource === 'cinderellafit' && (
                           <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                             <label className="block text-[10px] font-bold text-orange-700/70 mb-1 uppercase tracking-wider">{t('referenceUrlLabel')}</label>
                             <input
                               type="url"
                               className="w-full p-2.5 bg-white rounded-xl border border-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-200 text-sm"
                               placeholder={t('referenceUrlPlaceholder')}
                               value={editData.referencePostUrl}
                               onChange={async (e) => {
                                 const url = e.target.value;
                                 const match = url.match(/\/gallery\/post\/([^/?#]+)/);
                                 const postId = match ? match[1] : '';
 
                                 let userName = '';
                                 if (postId && postId.includes('_')) {
                                   try {
                                     const ownerUid = postId.split('_')[0];
                                     const userDoc = await getDoc(doc(db, 'users', ownerUid));
                                     if (userDoc.exists()) {
                                       userName = userDoc.data().displayName || '';
                                     }
                                   } catch (err) {
                                     console.error("Error fetching referenced user:", err);
                                   }
                                 }
 
                                 setEditData({
                                   ...editData,
                                   referencePostUrl: url,
                                   referencedPostId: postId,
                                   referencedUserName: userName
                                 });
                               }}
                             />
                             {editData.referencedPostId && (
                               <div className="flex items-center justify-between mt-1 px-1">
                                 <p className="text-[9px] text-green-600 font-bold flex items-center gap-1">
                                   <span>✅</span> {t('postDetected')}
                                 </p>
                                 {editData.referencedUserName && (
                                   <p className="text-[9px] text-orange-500 font-bold">
                                     @{editData.referencedUserName}
                                   </p>
                                 )}
                               </div>
                             )}
                           </div>
                         )}
 
                         {editData.patternSource === 'external' && (
                           <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                             <label className="block text-[10px] font-bold text-orange-700/70 mb-1 uppercase tracking-wider">{t('referenceUrlExternal')}</label>
                             <input
                               type="url"
                               className="w-full p-2.5 bg-white rounded-xl border border-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-200 text-sm"
                               placeholder="https://..."
                               value={editData.referenceUrl}
                               onChange={(e) => setEditData({ ...editData, referenceUrl: e.target.value })}
                             />
                           </div>
                         )}
 
                         {/* === Making Instructions === */}
                         <div className="space-y-2 pt-2 border-t border-orange-100/50">
                           <label className="block text-[10px] font-bold text-orange-700/70 mb-1 uppercase tracking-wider">
                             {t('makingInstructionsLabel') || '作り方の解説（任意）'}
                           </label>
                           <textarea
                             className="w-full p-3 bg-white rounded-xl border border-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-200 h-48 text-sm resize-none"
                             placeholder={t('makingInstructionsPlaceholder') || '作り方の手順やコツなどを自由に書いてください...'}
                             value={editData.makingInstructions || ''}
                             maxLength={1000}
                             onChange={(e) => setEditData({ ...editData, makingInstructions: e.target.value })}
                           />
                           <div className="flex justify-end">
                             <span className={`text-[9px] font-bold ${(editData.makingInstructions || '').length >= 1000 ? 'text-red-500' : 'text-orange-300'}`}>
                               {(editData.makingInstructions || '').length}/1000
                             </span>
                           </div>
                         </div>

                         {/* isPattern Toggle in Edit Mode */}
                         <div className="flex items-center justify-between bg-white/50 p-2.5 rounded-xl border border-orange-100">
                           <div className="flex items-center gap-2">
                             <div className={`p-1.5 rounded-full ${editData.isPattern ? 'bg-orange-500 text-white' : 'bg-orange-200 text-white'}`}>
                               <Star size={12} fill={editData.isPattern ? "currentColor" : "none"} />
                             </div>
                             <div className="text-[10px]">
                               <p className="font-bold text-orange-900">{t('isPatternLabel') || 'この投稿を「型紙」として公開'}</p>
                             </div>
                           </div>
                            <label className={`relative inline-flex items-center ${!editData.isPublic ? "cursor-not-allowed" : "cursor-pointer"}`}>
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={editData.isPattern}
                                disabled={!editData.isPublic}
                                onChange={(e) => setEditData({ ...editData, isPattern: e.target.checked })}
                              />
                              <div className={`w-9 h-5 ${!editData.isPublic ? "bg-gray-100" : "bg-orange-200"} peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[""] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-orange-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600`}></div>
                            </label>
                         </div>
                       </div>
                     )}

                    {/* Pattern / Reference Specific Fields (View Mode) */}
                    {!isEditing && (selectedItem.patternImage || selectedItem.referenceUrl || selectedItem.referencedPostId || selectedItem.makingInstructions) && (
                      <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 space-y-4">
                        <h4 className="text-xs font-black text-orange-600 uppercase flex items-center gap-2">
                          <span>📖</span> {t('patternAndRef')}
                        </h4>

                        {selectedItem.patternImage && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-orange-700/70 uppercase tracking-wider">{t('patternImagePdf')}</p>
                            <div className="relative group">
                              {selectedItem.patternImage.startsWith('data:application/pdf') ? (
                                <a
                                  href={selectedItem.patternImage}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full h-32 flex flex-col items-center justify-center bg-white rounded-xl border-2 border-dashed border-orange-200 hover:border-orange-400 transition-colors group/pdf no-underline"
                                >
                                  <Library size={32} className="text-orange-400 mb-2 group-hover/pdf:scale-110 transition-transform" />
                                  <span className="text-sm font-black text-orange-600 truncate max-w-full px-4" title={selectedItem.patternFileName}>{selectedItem.patternFileName || t('pdfPattern')}</span>
                                  <span className="text-[10px] text-orange-400 mt-1 font-bold">{t('clickToOpen')}</span>
                                </a>
                              ) : (
                                <img src={selectedItem.patternImage} className="w-full rounded-xl border border-orange-100 shadow-sm transition-transform hover:scale-[1.02] cursor-zoom-in" alt="Pattern" />
                              )}
                            </div>
                          </div>
                        )}

                        {selectedItem.referenceUrl && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-orange-700/70 uppercase tracking-wider">{t('referenceUrlExternal')}</p>
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

                        {/* Making Instructions Text */}
                        {selectedItem.makingInstructions && (
                          <div className="space-y-2 mt-4">
                            <p className="text-[10px] font-bold text-orange-700/70 uppercase tracking-wider flex items-center gap-1">
                              <span>📝</span> {t('makingInstructionsLabel') || '作り方の解説'}
                            </p>
                            <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-orange-300"></div>
                                <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed pl-2 font-medium">
                                  {selectedItem.makingInstructions}
                                </p>
                            </div>
                          </div>
                        )}

                        {/* Reference Gallery Post Link (Inspired By) */}
                        {selectedItem.referencedPostId && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-orange-700/70 uppercase tracking-wider">{t('inspiredBy') || '参考元'}</p>
                            <Link
                              to={`/gallery/post/${selectedItem.referencedPostId}`}
                              className="bg-white border border-orange-100 p-3 rounded-xl flex items-center gap-3 transition-colors hover:bg-orange-100/50 group"
                            >
                              <div className="bg-orange-500 text-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                                <Star size={18} fill="currentColor" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-bold text-orange-700 truncate block">
                                  {t('originalPost') || '元の投稿'}
                                </span>
                                {selectedItem.referencedUserName && (
                                  <span className="text-[10px] text-orange-400 font-bold block">
                                    @{selectedItem.referencedUserName}
                                  </span>
                                )}
                              </div>
                              <div className="text-orange-300 group-hover:translate-x-1 transition-transform">
                                <Plus size={14} />
                              </div>
                            </Link>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Author's Note Section */}
                    <div>
                      <h4 className="text-sm font-black text-gray-400 uppercase mb-2 flex items-center gap-2">
                        <Star size={14} className="text-yellow-400 fill-yellow-400" />
                        <span>{t('authorComment')}</span>
                      </h4>
                      {isEditing ? (
                        <div className="space-y-1">
                          <div className="flex justify-end">
                            <span className={`text-[10px] font-bold ${editData.comment.length >= 500 ? 'text-red-500' : 'text-gray-400'}`}>
                              {editData.comment.length} / 500
                            </span>
                          </div>
                          <textarea
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 h-48 text-sm resize-none"
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
                            <div className="flex flex-col gap-3">
                              <div className="relative group">
                                <textarea
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                      e.preventDefault();
                                      if (commentText.trim()) submitComment(selectedItem.id, selectedItem.userId);
                                    }
                                  }}
                                  placeholder={t('commentPlaceholder') || 'ここにコメントを入力...'}
                                  className="w-full p-4 bg-white rounded-2xl border border-blue-100 focus:outline-none focus:ring-2 focus:ring-primary/20 text-base h-32 shadow-sm transition-all resize-none"
                                  maxLength={200}
                                />
                                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                                  <span className={`text-[10px] font-bold ${commentText.length >= 190 ? 'text-red-500' : 'text-blue-300'}`}>
                                    {commentText.length}/200
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => submitComment(selectedItem.id, selectedItem.userId)}
                                disabled={!commentText.trim() || isSubmittingComment}
                                className="bg-primary text-white p-4 rounded-2xl shadow-lg hover:bg-primary/90 disabled:opacity-50 disabled:grayscale transition-all h-14 w-full flex items-center justify-center gap-3 group active:scale-[0.98]"
                              >
                                {isSubmittingComment ? (
                                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    <span className="text-base font-black">送信</span>
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
                            const finalEditData = { ...editData };
                            // Force clear old shopUrl to allow deleting urls
                            finalEditData.shopUrl = '';
                            
                            if (finalEditData.purchaseType !== 'handmade') {
                                finalEditData.patternImage = null;
                                finalEditData.referenceUrl = '';
                                finalEditData.referencePostUrl = '';
                                finalEditData.referencedPostId = '';
                            }
                            updateClosetItem(selectedItem.id.replace('local-', ''), finalEditData);
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
            </div>
          </Portal>
        )
      }
      {/* === POST COMPLETE MODAL === */}
      {showPostComplete && (
        <Portal>
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              animation: 'fadeIn 0.3s ease-out'
            }}
            onClick={() => setShowPostComplete(false)}
          >
            <div
              style={{
                background: 'white',
                borderRadius: '28px',
                padding: '40px 32px 32px',
                maxWidth: '320px',
                width: '90%',
                textAlign: 'center',
                boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
                animation: 'celebrateIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Confetti-like decorations */}
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: '56px', marginBottom: '16px', animation: 'bounceEmoji 0.6s ease-out' }}>🎉</div>
                {/* Floating confetti dots */}
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      width: `${4 + Math.random() * 6}px`,
                      height: `${4 + Math.random() * 6}px`,
                      borderRadius: '50%',
                      background: ['#f97316', '#3D7A7F', '#ec4899', '#eab308', '#8b5cf6', '#22c55e'][i % 6],
                      top: `${-20 + Math.random() * 80}px`,
                      left: `${Math.random() * 100}%`,
                      opacity: 0,
                      animation: `confettiFall 1.5s ease-out ${i * 0.08}s forwards`
                    }}
                  />
                ))}
              </div>

              <h3 style={{ fontSize: '22px', fontWeight: '900', color: '#1f2937', marginBottom: '8px' }}>
                {t('postCompleteTitle')}
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '28px', lineHeight: 1.5 }}>
                {t('postCompleteMessage')}
              </p>

              <button
                onClick={() => {
                  setShowPostComplete(false);
                  navigate('/gallery');
                }}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #3D7A7F 0%, #509291 50%, #E8956A 100%)',
                  color: 'white',
                  fontWeight: '800',
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(61, 122, 127, 0.3)',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Users size={18} />
                {t('postCompleteViewGallery')}
              </button>

              <button
                onClick={() => setShowPostComplete(false)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'transparent',
                  color: '#9ca3af',
                  fontWeight: '600',
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {t('postCompleteContinue')}
              </button>
            </div>
          </div>

          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes celebrateIn {
              from { transform: scale(0.5) translateY(40px); opacity: 0; }
              to { transform: scale(1) translateY(0); opacity: 1; }
            }
            @keyframes bounceEmoji {
              0% { transform: scale(0); }
              50% { transform: scale(1.3); }
              100% { transform: scale(1); }
            }
            @keyframes confettiFall {
              0% { opacity: 1; transform: translateY(-30px) rotate(0deg); }
              100% { opacity: 0; transform: translateY(60px) rotate(360deg); }
            }
          `}</style>
        </Portal>
      )}
    </div >
  );
};

export default Closet;
