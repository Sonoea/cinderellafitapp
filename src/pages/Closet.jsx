import React, { useState, useRef, useEffect } from 'react';
import { collectionGroup, query, where, getDocs, doc, setDoc, deleteDoc, addDoc, serverTimestamp, collection, getDoc, orderBy, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { Edit2, Trash2, Plus, Shirt, Users, User, Heart, Share2, MessageCircle, Lock, Unlock, X, Camera, Star, MapPin, Search, Ruler, EyeOff, Send } from 'lucide-react';
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
  const [itemCommentCounts, setItemCommentCounts] = useState({}); // { [compositeId]: number }
  const [itemComments, setItemComments] = useState({}); // { [itemId]: [comments] }
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [isUpdatingComment, setIsUpdatingComment] = useState(false);
  const [shouldScrollToComments, setShouldScrollToComments] = useState(false);
  const commentsRef = useRef(null);

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
              if (!data) return;

              const ownerUid = doc.ref.parent.parent.id;
              const imageUrl = data.imageUrl || data.image;

              // Lenient check: must have at least an image to be in the gallery
              if (!imageUrl) return;

              items.push({
                id: doc.id,
                compositeId: `${ownerUid}_${doc.id}`.replace(/local-/g, ''),
                ...data,
                userId: ownerUid,
                imageUrl,
                itemName: data.itemName || data.name || 'Untitled',
                plushieName: data.plushieName || data.plushie || '',
                userName: data.userName || null,
                userIcon: data.userIcon || '/api/placeholder/40/40',
                purchaseType: data.purchaseType || '',
                shopName: safeHostname(data.url || data.shopUrl),
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

          // NEW: Sync the 'likes' count and 'commentCount' from the document into state
          const newLikesState = {};
          const newCommentCounts = {};
          validItems.forEach(item => {
            const compositeId = item.compositeId || `${item.userId}_${item.id}`.replace(/local-/g, '');
            if (item.likes !== undefined) {
              newLikesState[compositeId] = {
                count: item.likes || 0,
                isLiked: false // Will be updated by the myLikes fetch below
              };
            }
            if (item.commentCount !== undefined) {
              newCommentCounts[compositeId] = item.commentCount || 0;
            }
          });
          setItemLikes(prev => ({ ...prev, ...newLikesState }));
          setItemCommentCounts(prev => ({ ...prev, ...newCommentCounts }));

          const uniqueUserIds = [...new Set(validItems.map(item => item.userId).filter(Boolean))];
          resolveUserProfiles(uniqueUserIds);

          // NEW: Also fetch current user's likes to show red hearts on reload
          if (currentUser) {
            try {
              const myLikesQuery = query(collectionGroup(db, 'likes'), where('likedBy', '==', currentUser.uid));
              const myLikesSnap = await getDocs(myLikesQuery);
              const myLikesMap = {};
              myLikesSnap.forEach(doc => {
                const itemDocId = doc.ref.parent.parent.id;
                const ownerUid = doc.ref.parent.parent.parent.parent.id;
                const compositeId = `${ownerUid}_${itemDocId}`;
                myLikesMap[compositeId] = { isLiked: true };
              });

              setItemLikes(prev => {
                const newState = { ...prev };
                Object.keys(myLikesMap).forEach(key => {
                  newState[key] = { ...(newState[key] || { count: 0 }), isLiked: true };
                });
                return newState;
              });
            } catch (likeErr) {
              console.warn("Failed to fetch user likes:", likeErr);
            }
          }
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
    const finalItems = [...publicItems];

    // Add local public items if not already in publicItems
    localPublicItems.forEach(localItem => {
      const exists = finalItems.some(pi => pi.id === localItem.id);
      if (!exists) {
        finalItems.push(localItem);
      }
    });

    const processedItems = finalItems.map(item => {
      // For items from Firestore, userId is already correctly set to the ownerUid.
      // We only fallback to myUid for local-created items that might be missing it.
      const itemUid = item.userId || (item.id.toString().startsWith('local-') ? myUid : null);
      const isOwn = myUid && itemUid === myUid;
      const liveProfile = userProfiles[itemUid];

      // Ensure every item has a compositeId and the correct owner uid
      // Always use the bare ID for the composite key to match social stats
      const bareId = String(item.id).replace(/^local-/, '');
      const compositeId = `${itemUid}_${bareId}`;

      return {
        ...item,
        userId: itemUid,
        compositeId,
        isOwn,
        // Override with latest profile if available
        userName: isOwn ? (firestoreUserName || item.userName) : (liveProfile?.displayName || item.userName),
        userIcon: isOwn ? (firestorePhotoURL || item.userIcon) : (liveProfile?.photoURL || item.userIcon),
        likes: item.likes || 0
      };
    });

    // Deduplication by Content (to handle local-id prefix differences)
    const uniqueItems = [];
    const seenCombos = new Set();

    processedItems.forEach(item => {
      // Content-based key for deduplication
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
                                <div className={`absolute bottom-3 left-2 px-1.5 py-0.5 rounded-full text-xs shadow-sm flex items-center justify-center ${item.fitRating === 2 ? 'bg-green-500' :
                                  item.fitRating === 1 ? 'bg-red-400' : 'bg-yellow-500'
                                  }`}>
                                  {/* 絵文字のみを表示してコンパクトにする */}
                                  {(t('fitLabelsShort')?.[item.fitRating - 1] || '😊').split(' ')[0]}
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
              <div className="text-center py-16 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center space-y-3">
                <div className="text-4xl">🔍</div>
                <div>
                  <p className="font-black text-gray-800">{t('noItems') || 'お探しのアイテムは見つかりません'}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {(searchTerm || filterMySize || filterCategory !== 'all')
                      ? 'フィルター条件を変更して試してみてください'
                      : (t('noItemsSub') || 'まだ投稿がありません。最初の投稿をしてみませんか？')}
                  </p>
                </div>
                {(searchTerm || filterMySize || filterCategory !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterMySize(false);
                      setFilterCategory('all');
                    }}
                    className="text-xs font-bold text-primary bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 mt-2"
                  >
                    全てのフィルターをリセット
                  </button>
                )}
              </div>
            ) : (
              /* Gallery Grid */
              <div className="grid grid-cols-2 gap-3 mb-20 fade-in">
                {filteredItems.map((post) => (
                  <div key={post.compositeId} className={`bg-white rounded-xl shadow-sm overflow-hidden break-inside-avoid ${post.isOwn ? 'border-2 border-primary/30 ring-1 ring-primary/10' : 'border border-gray-100'}`}>
                    {/* Header - compact */}
                    <div className="p-2 flex items-center justify-between">
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
                      {post.location && (
                        <div className="flex items-center gap-1 text-[10px] text-blue-400">
                          <MapPin size={10} />
                          <span className="truncate max-w-[50px]">{post.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Image with date badge */}
                    <div className="aspect-square bg-gray-50 relative cursor-pointer group overflow-hidden" onClick={() => setSelectedItem(post)}>
                      <img src={post.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                      <div className="absolute" style={{ top: 6, right: 6, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px' }}>
                        {post.date}
                      </div>
                    </div>

                    {/* Social bar - compact inline */}
                    <div className="flex items-center justify-between bg-white" style={{ padding: '8px 12px', borderBottom: '1px solid #f5f5f5' }}>
                      {/* Like */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleLike(post.id, post.userId, post.compositeId);
                        }}
                        className="flex items-center gap-1 transition-all"
                        style={{ pointerEvents: 'auto', color: (itemLikes[post.compositeId]?.isLiked) ? '#ec4899' : '#9ca3af', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                      >
                        <Heart
                          size={18}
                          fill={(itemLikes[post.compositeId]?.isLiked) ? "currentColor" : "none"}
                          strokeWidth={2.5}
                        />
                        <span className="font-bold" style={{ fontSize: '12px' }}>{itemLikes[post.compositeId]?.count ?? post.likes ?? 0}</span>
                      </button>

                      {/* Comment */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShouldScrollToComments(true);
                          setSelectedItem(post);
                        }}
                        className="flex items-center gap-1 text-gray-400 transition-all"
                        style={{ pointerEvents: 'auto', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                      >
                        <MessageCircle size={18} strokeWidth={2.5} />
                        <span className="font-bold" style={{ fontSize: '12px' }}>{itemComments[post.compositeId]?.length || itemCommentCounts[post.compositeId] || 0}</span>
                      </button>

                      {/* Fit emoji */}
                      <span style={{ fontSize: '18px', lineHeight: 1 }}>
                        {['😣', '😊', '😌'][post.fitRating - 1] || '😊'}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-2">
                      <h3 className="font-bold text-sm text-gray-800 mb-1">{post.itemName}</h3>
                      {post.purchaseType && (
                        <div style={{ marginBottom: '4px' }}>
                          <span className="text-[9px] font-bold bg-gray-100/80 text-gray-500 px-1.5 py-0.5 rounded-full w-fit">
                            {post.purchaseType === 'online' ? `🌐 ${t('categoryOnline')}` :
                              post.purchaseType === 'retail' ? `🏪 ${t('categoryRetail')}` :
                                `🪡 ${t('categoryHandmade')}`}
                          </span>
                        </div>
                      )}
                      <ExpandableText text={post.comment} />

                      {post.shopName && (
                        <div className="bg-gray-50 px-2 py-1 rounded-lg inline-flex items-center gap-1 text-[10px] text-gray-500" style={{ marginTop: '4px' }}>
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
                        {currentUser?.uid === selectedItem.userId && (
                          <div className="flex gap-2 z-20 relative">
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
                                className="bg-blue-50 text-blue-500 hover:bg-blue-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-bold text-xs border border-blue-200"
                              >
                                <Edit2 size={14} />
                                <span>編集する</span>
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
                              className="bg-red-50 text-red-400 hover:bg-red-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-bold text-xs border border-red-200"
                            >
                              <Trash2 size={14} />
                              <span>削除</span>
                            </button>
                          </div>
                        )}
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

                      {/* Comments Section */}
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
            </div>
          </Portal>
        )
      }
    </div >
  );
};

export default Closet;
