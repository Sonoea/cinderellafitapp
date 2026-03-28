import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { collectionGroup, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, addDoc, serverTimestamp, collection, orderBy, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { Share2, Heart, MessageCircle, MoreHorizontal, X, MapPin, Star, Filter, Search, Shirt, ArrowRight, ExternalLink, Trash2, Users, User, LogIn, Send, Tag, Ruler } from 'lucide-react';
import { safeHostname, safeDate } from '../utils/formatting';

const UserAvatar = ({ src, alt, className, onClick, style }) => {
    const [error, setError] = useState(!src || src.includes('placeholder'));
    useEffect(() => { setError(!src || src.includes('placeholder')); }, [src]);
    if (error) {
        return (
            <div onClick={onClick} className={`flex items-center justify-center bg-gray-100 text-gray-400 rounded-full ${className}`} style={{ ...(onClick ? { cursor: 'pointer' } : {}), ...style }}>
                <User size={20} />
            </div>
        );
    }
    return <img src={src} alt={alt} className={`object-cover rounded-full ${className}`} onError={() => setError(true)} onClick={onClick} style={{ ...(onClick ? { cursor: 'pointer' } : {}), ...style }} />;
};

// Helper to get country flag from location string
const getLocationFlag = (location) => {
    if (!location) return '🌐';
    const loc = location.toLowerCase();
    if (loc.includes('日本') || loc.includes('japan') || loc.includes('tokyo') || loc.includes('osaka') || loc.includes('kyoto') || loc.includes('shibuya') || loc.includes('iwate') || loc.includes('hokkaido') ||
        loc.includes('東京') || loc.includes('大阪') || loc.includes('京都') || loc.includes('渋谷') || loc.includes('岩手') || loc.includes('北海道') || loc.includes('札幌') || loc.includes('福岡') || loc.includes('横浜') ||
        loc.includes('神奈川') || loc.includes('兵库') || loc.includes('兵庫') || loc.includes('愛知') || loc.includes('千葉') || loc.includes('埼玉') || loc.includes('広島') || loc.includes('仙台') || loc.includes('名古屋')) return '🇯🇵';
    if (loc.includes('usa') || loc.includes('america') || loc.includes('new york') || loc.includes('ny') || loc.includes('la') || loc.includes('los angeles')) return '🇺🇸';
    if (loc.includes('france') || loc.includes('paris')) return '🇫🇷';
    if (loc.includes('uk') || loc.includes('london') || loc.includes('england') || loc.includes('united kingdom')) return '🇬🇧';
    if (loc.includes('korea') || loc.includes('seoul')) return '🇰🇷';
    if (loc.includes('china') || loc.includes('shanghai') || loc.includes('beijing')) return '🇨🇳';
    if (loc.includes('taiwan') || loc.includes('台湾')) return '🇹🇼';
    if (loc.includes('germany') || loc.includes('berlin')) return '🇩🇪';
    if (loc.includes('italy') || loc.includes('rome')) return '🇮🇹';
    if (loc.includes('spain') || loc.includes('madrid')) return '🇪🇸';
    if (loc.includes('canada')) return '🇨🇦';
    if (loc.includes('australia') || loc.includes('sydney')) return '🇦🇺';
    if (loc.includes('singapore')) return '🇸🇬';
    if (loc.includes('thailand') || loc.includes('bangkok')) return '🇹🇭';
    if (loc.includes('vietnam')) return '🇻🇳';
    return '🌐';
};

// Render text with clickable hashtags
const renderTextWithHashtags = (text, onHashtagClick) => {
    if (!text) return null;
    // Match hashtags: # followed by word characters (including Japanese/CJK)
    const parts = text.split(/(#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF00-\uFFEF]+)/g);
    return parts.map((part, i) => {
        if (/^#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF00-\uFFEF]+$/.test(part)) {
            return (
                <button key={i} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onHashtagClick?.(part); }}
                    className="text-primary font-bold hover:underline" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 'inherit' }}>
                    {part}
                </button>
            );
        }
        return <span key={i}>{part}</span>;
    });
};

const ExpandableText = ({ text, maxLength = 90, onHashtagClick, showOnlyFirstSentence = false, t }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    if (!text) return null;

    if (showOnlyFirstSentence) {
        // Find the first occurrence of Japanese or English sentence ending punctuation
        const sentenceEndMatch = text.match(/([。！？.!?\n])/);
        let firstSentence = text;
        if (sentenceEndMatch) {
            firstSentence = text.slice(0, sentenceEndMatch.index + 1);
        }
        // If it's still too long, truncate it
        const displayedText = firstSentence.length > 80 ? `${firstSentence.slice(0, 80)}...` : firstSentence;
        return <p className="text-xs text-gray-600 mb-1 line-clamp-2" style={{ minHeight: '32px' }}>{renderTextWithHashtags(displayedText, onHashtagClick)}</p>;
    }

    if (text.length <= maxLength) return <p className="text-xs text-gray-600 mb-2 whitespace-pre-wrap">{renderTextWithHashtags(text, onHashtagClick)}</p>;
    return (
        <div className="mb-2">
            <p className="text-xs text-gray-600 whitespace-pre-wrap">
                {renderTextWithHashtags(isExpanded ? text : `${text.slice(0, maxLength)}...`, onHashtagClick)}
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsExpanded(!isExpanded); }} className="ml-1 text-blue-500 font-bold hover:underline inline-block">
                    {isExpanded ? t('readLess') : t('readMore')}
                </button>
            </p>
        </div>
    );
};

const Gallery = () => {
    const { currentUser } = useAuth();
    const { t, language, plushies = [] } = useApp();
    const navigate = useNavigate();

    // Gallery data
    const [publicItems, setPublicItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [galleryError, setGalleryError] = useState(null);
    const [userProfiles, setUserProfiles] = useState({});

    // Social state
    const [itemLikes, setItemLikes] = useState({});
    const [likingInProgress, setLikingInProgress] = useState(new Set());
    const [itemCommentCounts, setItemCommentCounts] = useState({});
    const [itemComments, setItemComments] = useState({});
    const [commentText, setCommentText] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingCommentText, setEditingCommentText] = useState('');
    const [isUpdatingComment, setIsUpdatingComment] = useState(false);
    const commentsRef = useRef(null);

    // Filter state
    const [searchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [filterMySize, setFilterMySize] = useState(false);
    const [sizeFilterPlushieId, setSizeFilterPlushieId] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterHasPattern, setFilterHasPattern] = useState(false);
    const { postId } = useParams();
    const [isCopying, setIsCopying] = useState(false);

    // Detail modal
    const [selectedItem, setSelectedItem] = useState(null);
    const [shouldScrollToComments, setShouldScrollToComments] = useState(false);

    // Resolve user profiles
    const resolveUserProfiles = async (uids) => {
        if (!uids || uids.length === 0) return;
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
                } catch (e) { console.error("Error fetching profile:", uid, e); }
            }
        }
        if (changed) setUserProfiles(newProfiles);
    };

    // Fetch gallery
    useEffect(() => {
        const fetchGallery = async () => {
            setIsLoading(true);
            setGalleryError(null);
            try {
                const q = query(
                    collectionGroup(db, 'closetItems'),
                    where('isPublic', '==', true),
                    orderBy('createdAt', 'desc'),
                    limit(150)
                );
                const querySnapshot = await getDocs(q);
                const items = [];
                querySnapshot.forEach((docSnap) => {
                    try {
                        const data = docSnap.data();
                        if (!data) return;
                        const ownerUid = docSnap.ref.parent.parent.id;
                        const imageUrl = data.imageUrl || data.image;
                        if (!imageUrl) return;
                        items.push({
                            id: docSnap.id,
                            compositeId: `${ownerUid}_${docSnap.id}`.replace(/local-/g, ''),
                            ...data, userId: ownerUid, imageUrl,
                            itemName: data.itemName || data.name || 'Untitled',
                            plushieName: data.plushieName || data.plushie || '',
                            userName: data.userName || null,
                            userIcon: data.userIcon || '',
                            purchaseType: data.purchaseType || '',
                            patternImage: data.patternImage || null,
                            referenceUrl: data.referenceUrl || '',
                            shopName: safeHostname(data.url || data.shopUrl),
                            date: safeDate(data.createdAt),
                        });
                    } catch (err) { console.warn("Skipping invalid gallery item:", docSnap.id, err); }
                });

                items.sort((a, b) => {
                    const dateA = a.date === 'Recently' ? 0 : new Date(a.date).getTime();
                    const dateB = b.date === 'Recently' ? 0 : new Date(b.date).getTime();
                    return dateB - dateA;
                });

                // Deduplicate
                const uniqueItems = [];
                const seen = new Set();
                items.forEach(item => {
                    if (!item.userId || !item.createdAt) { uniqueItems.push(item); return; }
                    const key = `${item.userId}-${item.itemName}-${item.imageUrl}`;
                    if (!seen.has(key)) { seen.add(key); uniqueItems.push(item); }
                });

                setPublicItems(uniqueItems);

                // Sync likes/comments counts (isLiked は別のeffectで取得)
                const newLikesState = {};
                const newCommentCounts = {};
                uniqueItems.forEach(item => {
                    const compositeId = item.compositeId || `${item.userId}_${item.id}`.replace(/local-/g, '');
                    newLikesState[compositeId] = { count: item.likes || 0, isLiked: false };
                    if (item.commentCount !== undefined) newCommentCounts[compositeId] = item.commentCount || 0;
                });
                setItemLikes(newLikesState);
                setItemCommentCounts(prev => ({ ...prev, ...newCommentCounts }));

                const uniqueUserIds = [...new Set(uniqueItems.map(item => item.userId).filter(Boolean))];
                resolveUserProfiles(uniqueUserIds);
            } catch (error) {
                setGalleryError(t('loadErrorGallery'));
                setPublicItems([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchGallery();
    }, [currentUser?.uid]);

    // ログインユーザーのいいね済み状態を取得（publicItemsまたはcurrentUserが変わった時）
    useEffect(() => {
        if (!currentUser || publicItems.length === 0) {
            // 未ログインの場合、全てisLiked: false にリセット
            if (!currentUser) {
                setItemLikes(prev => {
                    const reset = {};
                    Object.keys(prev).forEach(k => { reset[k] = { ...prev[k], isLiked: false }; });
                    return reset;
                });
            }
            return;
        }
        const loadUserLikes = async () => {
            try {
                const myLikesQuery = query(
                    collectionGroup(db, 'likes'),
                    where('likedBy', '==', currentUser.uid),
                    limit(200)
                );
                const myLikesSnap = await getDocs(myLikesQuery);
                const myLikedSet = new Set();
                myLikesSnap.forEach(d => {
                    const itemDocId = d.ref.parent.parent.id;
                    const ownerUid = d.ref.parent.parent.parent.parent.id;
                    myLikedSet.add(`${ownerUid}_${itemDocId}`);
                });
                setItemLikes(prev => {
                    const newState = {};
                    Object.keys(prev).forEach(key => {
                        newState[key] = { ...prev[key], isLiked: myLikedSet.has(key) };
                    });
                    return newState;
                });
            } catch (e) { console.warn("Failed to load user likes:", e); }
        };
        loadUserLikes();
    }, [currentUser?.uid, publicItems]);

    // Fetch engagement (likes/comments) for a specific item and auto-repair counts
    const fetchEngagement = async (itemId, ownerUid) => {
        if (!itemId || !ownerUid) return;
        const compositeId = `${ownerUid}_${itemId}`;
        try {
            const itemRef = doc(db, 'users', ownerUid, 'closetItems', itemId);
            const likesRef = collection(db, 'users', ownerUid, 'closetItems', itemId, 'likes');
            const likesSnap = await getDocs(likesRef);
            const isLiked = currentUser ? likesSnap.docs.some(d => d.id === currentUser.uid) : false;
            setItemLikes(prev => ({ ...prev, [compositeId]: { count: likesSnap.size, isLiked } }));

            const commentsRef2 = collection(db, 'users', ownerUid, 'closetItems', itemId, 'comments');
            const cq = query(commentsRef2, orderBy('createdAt', 'asc'));
            const commentsSnap = await getDocs(cq);
            const actualCommentCount = commentsSnap.size;
            setItemComments(prev => ({ ...prev, [compositeId]: commentsSnap.docs.map(d => ({ id: d.id, ...d.data() })) }));
            setItemCommentCounts(prev => ({ ...prev, [compositeId]: actualCommentCount }));

            // Auto-repair Firestore counts if they differ from actual
            try {
                const itemSnap = await getDoc(itemRef);
                if (itemSnap.exists()) {
                    const data = itemSnap.data();
                    const updates = {};
                    if ((data.likes || 0) !== likesSnap.size) updates.likes = likesSnap.size;
                    if ((data.commentCount || 0) !== actualCommentCount) updates.commentCount = actualCommentCount;
                    if (Object.keys(updates).length > 0) await updateDoc(itemRef, updates);
                }
            } catch (repairErr) { /* silent - repair is best-effort */ }
        } catch (e) { console.error("Error fetching engagement:", e); }
    };

    // Toggle like - uses actual subcollection count instead of increment
    const toggleLike = async (itemId, ownerUid, existingCompositeId) => {
        if (!currentUser) {
            if (window.confirm(t('loginRequiredLike'))) {
                navigate('/login');
            }
            return;
        }
        const bareId = String(itemId).replace(/^local-/, '');
        const compositeId = `${ownerUid}_${bareId}`;
        if (likingInProgress.has(compositeId)) return;
        setLikingInProgress(prev => new Set(prev).add(compositeId));

        try {
            const likeRef = doc(db, 'users', ownerUid, 'closetItems', bareId, 'likes', currentUser.uid);
            const itemRef = doc(db, 'users', ownerUid, 'closetItems', bareId);
            const likeSnap = await getDoc(likeRef);
            const alreadyLiked = likeSnap.exists();

            if (alreadyLiked) {
                await deleteDoc(likeRef);
            } else {
                await setDoc(likeRef, { likedBy: currentUser.uid, createdAt: serverTimestamp() });
            }

            // 実際のいいね数をサブコレクションから取得してUI更新
            const likesSnap = await getDocs(collection(db, 'users', ownerUid, 'closetItems', bareId, 'likes'));
            const actualCount = likesSnap.size;
            const stillLiked = likesSnap.docs.some(d => d.id === currentUser.uid);

            // UIを先に更新（投稿者以外でも反映される）
            setItemLikes(prev => ({
                ...prev,
                [compositeId]: { count: actualCount, isLiked: stillLiked }
            }));

            // Firestoreのlikesフィールドを更新（権限エラーはUIに影響させない）
            try {
                await updateDoc(itemRef, { likes: actualCount });
            } catch (updateErr) {
                // 投稿者以外はlikesフィールドを書き込めない場合があるが、UIは正常に動作
                console.warn("Could not update likes count on item doc:", updateErr.code);
            }
        } catch (e) {
            console.error("Error toggling like:", e);
            try {
                const likesSnap = await getDocs(collection(db, 'users', ownerUid, 'closetItems', bareId, 'likes'));
                const likeSnap = await getDoc(doc(db, 'users', ownerUid, 'closetItems', bareId, 'likes', currentUser.uid));
                setItemLikes(prev => ({
                    ...prev,
                    [compositeId]: { count: likesSnap.size, isLiked: likeSnap.exists() }
                }));
            } catch (e2) { console.error("Error recovering like state:", e2); }
        } finally {
            setLikingInProgress(prev => { const s = new Set(prev); s.delete(compositeId); return s; });
        }
    };

    // Submit comment - syncs commentCount from actual subcollection count
    const submitComment = async (itemId, ownerUid) => {
        if (!currentUser) {
            if (window.confirm(t('loginRequiredComment'))) {
                navigate('/login');
            }
            return;
        }
        if (!commentText.trim() || isSubmittingComment) return;
        setIsSubmittingComment(true);
        try {
            const bareId = String(itemId).replace(/^local-/, '');
            let userName = currentUser.displayName || t('guest');
            let userIcon = currentUser.photoURL || '';
            try {
                const uDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (uDoc.exists()) {
                    userName = uDoc.data().displayName || userName;
                    userIcon = uDoc.data().photoURL || userIcon;
                }
            } catch (e) { /* use default */ }

            const commentData = { userId: currentUser.uid, userName, userIcon, text: commentText.trim(), createdAt: new Date().toISOString() };
            const commentsColRef = collection(db, 'users', ownerUid, 'closetItems', bareId, 'comments');
            await addDoc(commentsColRef, { ...commentData, createdAt: serverTimestamp() });

            // Sync commentCount from actual subcollection count
            const allComments = await getDocs(commentsColRef);
            await updateDoc(doc(db, 'users', ownerUid, 'closetItems', bareId), { commentCount: allComments.size });

            const compositeId = `${ownerUid}_${bareId}`;
            setItemComments(prev => ({ ...prev, [compositeId]: [...(prev[compositeId] || []), { ...commentData, id: Date.now().toString() }] }));
            setItemCommentCounts(prev => ({ ...prev, [compositeId]: allComments.size }));
            setCommentText('');
        } catch (e) {
            console.error("Error submitting comment:", e);
            alert(t('commentSendError'));
        } finally {
            setIsSubmittingComment(false);
        }
    };

    // Delete comment - syncs commentCount from actual subcollection count
    const deleteComment = async (itemId, ownerUid, commentId) => {
        if (!currentUser) return;
        try {
            const bareId = String(itemId).replace(/^local-/, '');
            await deleteDoc(doc(db, 'users', ownerUid, 'closetItems', bareId, 'comments', commentId));

            // Sync commentCount from actual subcollection count
            const commentsColRef = collection(db, 'users', ownerUid, 'closetItems', bareId, 'comments');
            const allComments = await getDocs(commentsColRef);
            await updateDoc(doc(db, 'users', ownerUid, 'closetItems', bareId), { commentCount: allComments.size });

            const compositeId = `${ownerUid}_${bareId}`;
            setItemComments(prev => ({ ...prev, [compositeId]: (prev[compositeId] || []).filter(c => c.id !== commentId) }));
            setItemCommentCounts(prev => ({ ...prev, [compositeId]: allComments.size }));
        } catch (e) {
            console.error("Error deleting comment:", e);
        }
    };

    // Toggle comment heart
    const toggleCommentHeart = async (itemId, ownerUid, commentId) => {
        if (!currentUser) return;
        const bareId = String(itemId).replace(/^local-/, '');
        const compositeId = `${ownerUid}_${bareId}`;
        const comment = (itemComments[compositeId] || []).find(c => c.id === commentId);
        const isHearted = (comment?.heartedBy || []).includes(currentUser.uid);

        setItemComments(prev => ({
            ...prev,
            [compositeId]: (prev[compositeId] || []).map(c => {
                if (c.id !== commentId) return c;
                const newHeartedBy = isHearted ? (c.heartedBy || []).filter(uid => uid !== currentUser.uid) : [...(c.heartedBy || []), currentUser.uid];
                return { ...c, heartedBy: newHeartedBy, hearts: newHeartedBy.length };
            })
        }));

        try {
            const commentDocRef = doc(db, 'users', ownerUid, 'closetItems', bareId, 'comments', commentId);
            if (isHearted) {
                await updateDoc(commentDocRef, { heartedBy: arrayRemove(currentUser.uid), hearts: increment(-1) });
            } else {
                await updateDoc(commentDocRef, { heartedBy: arrayUnion(currentUser.uid), hearts: increment(1) });
            }
        } catch (e) {
            console.error("Error toggling comment heart:", e);
            await fetchEngagement(bareId, ownerUid);
        }
    };

    // Load engagement when item selected
    useEffect(() => {
        if (selectedItem) {
            const bareId = String(selectedItem.id || '').replace(/^local-/, '');
            if (bareId && selectedItem.userId) fetchEngagement(bareId, selectedItem.userId);
            if (shouldScrollToComments) {
                setTimeout(() => { commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setShouldScrollToComments(false); }, 300);
            }
        }
    }, [selectedItem, shouldScrollToComments]);

    // Deep link handling: Open specific post if postId is in URL
    useEffect(() => {
        if (postId && !selectedItem && publicItems.length > 0) {
            const item = publicItems.find(i => i.id === postId || i.compositeId === postId);
            if (item) {
                setSelectedItem(item);
            } else {
                // If not in publicItems, try fetching directly
                const fetchSinglePost = async () => {
                    try {
                        // Extract ownerUid if it's a compositeId (e.g. uid_id)
                        let targetId = postId;
                        let ownerUid = null;
                        if (postId.includes('_')) {
                            [ownerUid, targetId] = postId.split('_');
                        }

                        if (ownerUid) {
                            const docRef = doc(db, 'users', ownerUid, 'closetItems', targetId);
                            const docSnap = await getDoc(docRef);
                            if (docSnap.exists()) {
                                const data = docSnap.data();
                                const uDoc = await getDoc(doc(db, 'users', ownerUid));
                                const userData = uDoc.data() || {};
                                setSelectedItem({
                                    id: docSnap.id,
                                    compositeId: postId,
                                    ...data,
                                    userId: ownerUid,
                                    imageUrl: data.imageUrl || data.image,
                                    userName: userData.displayName || data.userName,
                                    userIcon: userData.photoURL || data.userIcon,
                                    profileSlug: userData.profileSlug,
                                    date: safeDate(data.createdAt),
                                });
                            }
                        }
                    } catch (e) {
                        console.error("Error fetching single post for deep link:", e);
                    }
                };
                fetchSinglePost();
            }
        }
    }, [postId, publicItems]);

    const handleCopyLink = (item) => {
        const url = `${window.location.origin}/gallery/post/${item.compositeId || item.id}`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => {
                setIsCopying(true);
                setTimeout(() => setIsCopying(false), 2000);
            });
        }
    };

    // Process items with profiles
    const processedItems = React.useMemo(() => {
        const myUid = currentUser?.uid || null;
        return publicItems.map(item => {
            const itemUid = item.userId;
            const isOwn = myUid && itemUid === myUid;
            const liveProfile = userProfiles[itemUid];
            const bareId = String(item.id).replace(/^local-/, '');
            const compositeId = `${itemUid}_${bareId}`;
            return {
                ...item, userId: itemUid, compositeId, isOwn,
                userName: liveProfile?.displayName || item.userName,
                userIcon: liveProfile?.photoURL || item.userIcon,
                profileSlug: liveProfile?.profileSlug || null,
            };
        });
    }, [publicItems, currentUser, userProfiles]);

    // Filter items
    const filteredItems = React.useMemo(() => {
        return processedItems.filter(item => {
            const matchesSearch = searchTerm === '' ||
                (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.itemName && item.itemName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.plushieName && item.plushieName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.userName && item.userName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.comment && item.comment.toLowerCase().includes(searchTerm.toLowerCase()));

            let matchesSize = true;
            if (filterMySize && plushies.length > 0) {
                const checkSizeMatch = (myPlushie) => {
                    // 1. If clothes have specific measurements, use them (+/- 1cm)
                    const hasSpecificSizes = item.waistFlat || item.clothesLength || item.cuffWidth;
                    if (hasSpecificSizes) {
                        let match = true;
                        if (item.waistFlat && myPlushie.measurements?.waist) {
                            if (Math.abs(Number(item.waistFlat) * 2 - Number(myPlushie.measurements.waist)) > 1) match = false;
                        }
                        if (item.clothesLength && myPlushie.measurements?.length) {
                            if (Math.abs(Number(item.clothesLength) - Number(myPlushie.measurements.length)) > 1) match = false;
                        }
                        if (item.cuffWidth && myPlushie.measurements?.armGirth) {
                            if (Math.abs(Number(item.cuffWidth) * 2 - Number(myPlushie.measurements.armGirth)) > 1) match = false;
                        }
                        return match;
                    }
                    
                    // 2. Fallback to plushieHeight (+/- 2cm) if no specific clothes sizes
                    if (item.plushieHeight) {
                        return Math.abs(Number(myPlushie.measurements?.height || 0) - Number(item.plushieHeight)) <= 2;
                    }
                    
                    return false;
                };

                if (sizeFilterPlushieId === 'all') {
                    matchesSize = plushies.some(checkSizeMatch);
                } else {
                    const selectedPlushie = plushies.find(p => String(p.id) === String(sizeFilterPlushieId));
                    matchesSize = selectedPlushie ? checkSizeMatch(selectedPlushie) : false;
                }
            }

            let matchesCategory = true;
            if (filterCategory !== 'all') matchesCategory = item.purchaseType === filterCategory;

            let matchesPatternFilter = true;
            if (filterHasPattern) matchesPatternFilter = !!(item.patternImage || item.referenceUrl);

            return matchesSearch && matchesSize && matchesCategory && matchesPatternFilter;
        });
    }, [processedItems, searchTerm, filterMySize, sizeFilterPlushieId, filterCategory, filterHasPattern, plushies]);

    // Hashtag click handler: close modal + search by tag
    const handleHashtagClick = (tag) => {
        setSelectedItem(null);
        setSearchTerm(tag);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="pb-48">
            <Helmet>
                <title>{t('everyonesGallery')} | CinderellaFit</title>
                <meta name="description" content={t('galleryMetaDesc')} />
                <meta property="og:title" content={t('everyonesGallery')} />
                <meta property="og:description" content={t('galleryMetaDesc')} />
                <meta property="og:url" content={window.location.href} />
            </Helmet>
            {/* Header */}
            <div className="sticky top-0 bg-background/95 backdrop-blur z-10 pt-4 pb-3 px-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-2xl font-black flex items-center gap-2">
                        <Users size={22} className="text-primary" />
                        {t('everyonesGallery')}
                    </h2>
                    {!currentUser && (
                        <Link to="/login" className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold shadow-sm hover:bg-primary/90 transition-colors">
                            <LogIn size={14} />
                            {t('login')}
                        </Link>
                    )}
                </div>

                {/* Search & Filters */}
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            className="w-full bg-gray-50 pl-12 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border border-gray-200"
                            style={{ paddingLeft: '48px' }}
                            placeholder={t('gallerySearchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {sizeFilterPlushieId !== 'all' && (
                            <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-primary bg-primary/5 px-3 py-1.5 rounded-lg w-fit">
                                <Search size={12} />
                                <span>{t('sizeSearchRangeHint')}</span>
                            </div>
                        )}
                    </div>

                    {/* Plushie Filter (My Size) */}
                    {plushies.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            <button
                                onClick={() => setSizeFilterPlushieId('all')}
                                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[11px] font-bold transition-all border ${sizeFilterPlushieId === 'all'
                                    ? 'bg-gray-800 text-white border-gray-800'
                                    : 'bg-white text-gray-500 border-gray-200'}`}
                            >
                                {t('all')}
                            </button>
                            {plushies.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setSizeFilterPlushieId(String(p.id))}
                                    className={`flex-shrink-0 pl-1 pr-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all border ${String(sizeFilterPlushieId) === String(p.id)
                                        ? 'bg-primary text-white border-primary shadow-sm'
                                        : 'bg-white text-gray-500 border-gray-200'}`}
                                >
                                    <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-100">
                                        {p.image ? (
                                            <img src={p.image} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[10px]">🧸</div>
                                        )}
                                    </div>
                                    <span className="whitespace-nowrap">{p.name} {t('size')}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Category Filter */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {[
                            { id: 'all', label: t('allCategories'), icon: '✨' },
                            { id: 'online', label: t('onlineShop'), icon: '🌐' },
                            { id: 'retail', label: t('retailShop'), icon: '🏪' },
                            { id: 'handmade', label: t('handmade'), icon: '🪡' }
                        ].map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setFilterCategory(cat.id)}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all border ${filterCategory === cat.id
                                    ? 'bg-primary text-white border-primary shadow-sm'
                                    : 'bg-white text-gray-400 border-gray-200'}`}
                            >
                                <span>{cat.icon}</span>
                                <span className="whitespace-nowrap">{cat.label}</span>
                            </button>
                        ))}
                        <button
                            onClick={() => setFilterHasPattern(!filterHasPattern)}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all border ${filterHasPattern
                                ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                                : 'bg-white text-orange-400 border-orange-200'}`}
                        >
                            <span className="whitespace-nowrap">{t('hasPatternFilter')}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-4 mt-4">
                {isLoading ? (
                    <div className="text-center py-16">
                        <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
                        <p className="text-sm text-gray-400">{t('loading')}</p>
                    </div>
                ) : galleryError ? (
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl text-xs text-yellow-700 flex items-center gap-2">
                        <span>⚠️</span><span>{galleryError}</span>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center space-y-3">
                        <div className="text-4xl">🔍</div>
                        <p className="font-black text-gray-800">{t('noItemsFound')}</p>
                        <p className="text-xs text-gray-400 mt-1">
                            {(searchTerm || filterMySize || filterCategory !== 'all' || filterHasPattern)
                                ? t('changeFilterHint')
                                : t('noPostsYet')}
                        </p>
                        {(searchTerm || filterMySize || filterCategory !== 'all' || filterHasPattern) && (
                            <button
                                onClick={() => { setSearchTerm(''); setFilterMySize(false); setSizeFilterPlushieId('all'); setFilterCategory('all'); setFilterHasPattern(false); }}
                                className="text-xs font-bold text-primary bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 mt-2"
                            >
                                {t('resetFiltersBtn')}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 mb-20 fade-in">
                        {filteredItems.map((post) => (
                            <div key={post.compositeId} className={`bg-white rounded-xl shadow-sm overflow-hidden ${post.isOwn ? 'border-2 border-primary/30 ring-1 ring-primary/10' : 'border border-gray-100'}`}>
                                {/* Header - Strict fixed height and tiny fonts for uniformity */}
                                <div className="p-2 flex items-center justify-between h-[52px] overflow-hidden">
                                    <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                                        <div className="relative flex-shrink-0">
                                            <UserAvatar
                                                src={post.userIcon}
                                                className="w-7 h-7"
                                                alt={post.userName}
                                                onClick={post.profileSlug ? () => navigate(`/gallery/${post.profileSlug}`) : undefined}
                                            />
                                            {post.isOwn && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full flex items-center justify-center ring-1 ring-white shadow-sm"><Star size={7} className="text-white fill-white" /></div>}
                                        </div>
                                        <div className="overflow-hidden min-w-0">
                                            <p className="text-[10px] font-bold text-gray-800 truncate leading-tight">
                                                {post.profileSlug ? (
                                                    <Link to={`/gallery/${post.profileSlug}`} className="hover:text-primary transition-colors">{post.userName}</Link>
                                                ) : post.userName}
                                            </p>
                                            <div className="flex items-center gap-1 text-[9px] text-gray-400 leading-none mt-0.5">
                                                <span className="truncate inline-block max-w-full">{post.plushieName}</span>
                                                {post.plushieHeight && <span className="flex-shrink-0 opacity-70">| {post.plushieHeight}cm</span>}
                                            </div>
                                        </div>
                                    </div>
                                    {post.location && (
                                        <div className="flex items-center gap-0.5 text-[9px] text-blue-400 flex-shrink-0 ml-1 bg-blue-50/50 px-1.5 py-0.5 rounded-full border border-blue-100/50">
                                            <MapPin size={8} />
                                            <span className="truncate max-w-[42px] font-medium inline-block align-middle">{post.location}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Image */}
                                <div className="aspect-square bg-gray-50 relative cursor-pointer group overflow-hidden" onClick={() => setSelectedItem(post)}>
                                    <img src={post.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                                    <div className="absolute" style={{ top: 6, left: 6, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px' }}>
                                        {post.date}
                                    </div>
                                    {(post.patternImage || post.referenceUrl) && (
                                        <div className="absolute animate-bounce-subtle" style={{ top: 6, right: 6, background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.4)', color: '#fff', fontSize: '9px', fontBasis: 'bold', padding: '3px 8px', borderRadius: '8px', zIndex: 10, border: '1px solid rgba(255,255,255,0.3)' }}>
                                            {t('hasPattern')}
                                        </div>
                                    )}
                                </div>

                                {/* Social bar - Explicit height for row alignment */}
                                <div className="flex items-center justify-between bg-white h-[40px] px-3 border-b border-gray-50">
                                    <div className="flex items-center gap-3">
                                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleLike(post.id, post.userId, post.compositeId); }}
                                            className="flex items-center gap-1 transition-all"
                                            style={{ color: (itemLikes[post.compositeId]?.isLiked) ? '#ec4899' : '#9ca3af', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                                            <Heart size={16} fill={(itemLikes[post.compositeId]?.isLiked) ? "currentColor" : "none"} strokeWidth={2.5} />
                                            <span className="font-bold text-[11px]">{itemLikes[post.compositeId]?.count ?? post.likes ?? 0}</span>
                                        </button>
                                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShouldScrollToComments(true); setSelectedItem(post); }}
                                            className="flex items-center gap-1 text-gray-400 transition-all"
                                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                                            <MessageCircle size={16} strokeWidth={2.5} />
                                            <span className="font-bold text-[11px]">{Math.max(0, itemComments[post.compositeId]?.length || itemCommentCounts[post.compositeId] || 0)}</span>
                                        </button>
                                    </div>
                                    <span className="text-base" style={{ lineHeight: 1 }}>
                                        {['😣', '😊', '😌'][post.fitRating - 1] || '😊'}
                                    </span>
                                </div>

                                {/* Content - Fixed height for uniform grid */}
                                <div className="p-2 h-[94px] flex flex-col justify-between">
                                    <div className="overflow-hidden">
                                        <h3 className="font-bold text-sm text-gray-800 mb-1 truncate">{post.itemName}</h3>
                                        {post.purchaseType && (
                                            <div className="flex items-center gap-1 mb-1.5 overflow-hidden">
                                                <span className="text-[9px] font-bold bg-gray-100/80 text-gray-500 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                                                    {post.purchaseType === 'online' ? `🌐 ${t('onlineShop')}` :
                                                        post.purchaseType === 'retail' ? `🏪 ${t('retailShop')}` :
                                                            `🪡 ${t('handmade')}`}
                                                </span>
                                                {(post.patternImage || post.referenceUrl) && (
                                                    <span className="text-[9px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full whitespace-nowrap border border-orange-200 shadow-sm flex-shrink-0">
                                                        {t('hasPattern')}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <ExpandableText text={post.comment} t={t} onHashtagClick={handleHashtagClick} showOnlyFirstSentence={true} />
                                    </div>
                                    {post.shopName && (
                                        <div className="bg-gray-50 px-2 py-0.5 rounded flex items-center gap-1 text-[9px] text-gray-500 overflow-hidden truncate">
                                            <Shirt size={9} className="flex-shrink-0" />
                                            <span className="truncate">{post.shopName}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedItem && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
                    <div className="modal-responsive relative shadow-2xl overflow-hidden bg-white rounded-2xl" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '100%', maxHeight: '90vh' }}>
                        <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full z-10 hover:bg-black/70 backdrop-blur-sm">
                            <X size={20} />
                        </button>

                        <div style={{ overflowY: 'auto', maxHeight: '90vh' }}>
                            <div className="relative">
                                <img src={selectedItem.imageUrl || selectedItem.image} alt="" className="w-full aspect-square object-cover" />
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-20 text-white">
                                    <h2 className="text-xl font-bold">{selectedItem.itemName || selectedItem.name}</h2>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* User info */}
                                <div className="flex items-center gap-3">
                                    <UserAvatar src={selectedItem.userIcon} className="w-10 h-10" alt={selectedItem.userName} />
                                    <div>
                                        <p className="font-bold text-gray-800">
                                            {selectedItem.profileSlug ? (
                                                <Link to={`/gallery/${selectedItem.profileSlug}`} className="hover:text-primary" onClick={() => setSelectedItem(null)}>{selectedItem.userName}</Link>
                                            ) : selectedItem.userName}
                                        </p>
                                        <p className="text-xs text-gray-400">{selectedItem.date}</p>
                                    </div>
                                </div>

                                {/* Like button */}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => toggleLike(selectedItem.id, selectedItem.userId, selectedItem.compositeId)}
                                        className={`flex items-center gap-3 px-5 py-2.5 rounded-full font-black text-sm transition-all active:scale-90 ${(itemLikes[selectedItem.compositeId]?.isLiked)
                                            ? 'bg-pink-500 text-white shadow-lg ring-4 ring-pink-100'
                                            : 'bg-pink-50 text-pink-500 hover:bg-pink-100 border border-pink-200'}`}
                                    >
                                        <Heart size={20} fill={(itemLikes[selectedItem.compositeId]?.isLiked) ? "currentColor" : "none"} strokeWidth={3} />
                                        <span>{itemLikes[selectedItem.compositeId]?.count ?? selectedItem.likes ?? 0}</span>
                                    </button>
                                    
                                    <button
                                        onClick={() => handleCopyLink(selectedItem)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-xs transition-all ${isCopying
                                            ? 'bg-green-500 text-white shadow-md'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'}`}
                                    >
                                        <Share2 size={16} />
                                        <span>{isCopying ? t('linkCopied') : t('copyLink')}</span>
                                    </button>

                                    <div className="flex-1"></div>
                                    <span style={{ fontSize: '28px' }}>{['😣', '😊', '😌'][selectedItem.fitRating - 1] || '😊'}</span>
                                </div>

                                {/* Reference / Inspired By */}
                                {(selectedItem.referencedPostId || selectedItem.referencePostUrl) && (
                                    <div className="bg-orange-50/50 border border-orange-100 p-3 rounded-xl flex items-center gap-3">
                                        <div className="bg-orange-100 p-2 rounded-lg">
                                            <Star size={16} className="text-orange-500 fill-orange-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">{t('inspiredBy')}</p>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                {selectedItem.referencedPostId ? (
                                                    <Link 
                                                        to={`/gallery/post/${selectedItem.referencedPostId}`} 
                                                        className="text-sm font-bold text-orange-600 hover:underline truncate"
                                                        onClick={() => {
                                                            // For deep link to work within the same page, we might need to close and let useEffect handle it
                                                            // But simpler is to just navigate or manually set
                                                            setSelectedItem(null);
                                                            navigate(`/gallery/post/${selectedItem.referencedPostId}`);
                                                        }}
                                                    >
                                                        {selectedItem.referencedUserName ? `@${selectedItem.referencedUserName}` : t('originalPost')}
                                                    </Link>
                                                ) : (
                                                    <a href={selectedItem.referencePostUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-orange-600 hover:underline truncate flex items-center gap-1">
                                                        {selectedItem.referencePostUrl}
                                                        <ExternalLink size={12} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {/* Size Measurements */}
                                {(selectedItem.waistFlat || selectedItem.clothesLength || selectedItem.cuffWidth) && (
                                    <div className="bg-gray-50/80 border border-gray-100 p-4 rounded-2xl">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Tag size={16} className="text-primary" />
                                            <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">{t('measurementDetails')}</h4>
                                        </div>
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
                                    </div>
                                )}
                                {/* Comment */}
                                {selectedItem.comment && <ExpandableText text={selectedItem.comment} maxLength={200} t={t} onHashtagClick={handleHashtagClick} />}

                                {/* Shop info */}
                                {/* Shop info */}
                                {(selectedItem.url || selectedItem.url2 || selectedItem.url3) && (
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase ml-1">
                                            {t('boughtFromLinks')}
                                        </h4>
                                        <div className="flex flex-col gap-2">
                                            {[
                                                { url: selectedItem.url, label: selectedItem.shopName || safeHostname(selectedItem.url) || t('linkFallback', 1) },
                                                { url: selectedItem.url2, label: safeHostname(selectedItem.url2) || t('linkFallback', 2) },
                                                { url: selectedItem.url3, label: safeHostname(selectedItem.url3) || t('linkFallback', 3) }
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
                                )}

                                {/* Handmade Details */}
                                {(selectedItem.patternImage || selectedItem.referenceUrl) && (
                                    <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 space-y-4">
                                        <h4 className="text-xs font-black text-orange-600 uppercase flex items-center gap-2">
                                            <span>📖</span> {t('handmadeMaterials')}
                                        </h4>

                                        {selectedItem.patternImage && (
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-bold text-orange-700/70 uppercase tracking-wider">{t('patternImageLabel')}</p>
                                                <div className="relative group">
                                                    <img src={selectedItem.patternImage} className="w-full rounded-xl border border-orange-100 shadow-sm transition-transform hover:scale-[1.02] cursor-zoom-in" alt="Pattern" />
                                                </div>
                                            </div>
                                        )}

                                        {selectedItem.referenceUrl && (
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-bold text-orange-700/70 uppercase tracking-wider">{t('referenceLinkLabel')}</p>
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
                                                    <ArrowRight size={14} className="text-orange-300 group-hover:translate-x-1 transition-transform" />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Comments Section */}
                                <div ref={commentsRef}>
                                    <h4 className="font-bold text-sm text-gray-600 mb-3 flex items-center gap-2">
                                        <MessageCircle size={16} />
                                        {t('commentsTitle')}
                                        <span className="text-xs text-gray-400">({itemComments[selectedItem.compositeId]?.length || 0})</span>
                                    </h4>

                                    {/* Comment list */}
                                    <div className="space-y-3 mb-4">
                                        {(itemComments[selectedItem.compositeId] || []).map(comment => (
                                            <div key={comment.id} className="flex gap-2">
                                                <UserAvatar src={comment.userIcon} className="w-7 h-7 flex-shrink-0" alt={comment.userName} style={{ width: '28px', height: '28px', minWidth: '28px' }} />
                                                <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-gray-700">{comment.userName}</span>
                                                        <div className="flex items-center gap-2">
                                                            {currentUser && (
                                                                <button onClick={() => toggleCommentHeart(selectedItem.id, selectedItem.userId, comment.id)}
                                                                    className="text-gray-300 hover:text-pink-500 transition-colors">
                                                                    <Heart size={12} fill={(comment.heartedBy || []).includes(currentUser?.uid) ? "currentColor" : "none"}
                                                                        className={(comment.heartedBy || []).includes(currentUser?.uid) ? "text-pink-500" : ""} />
                                                                </button>
                                                            )}
                                                            {comment.hearts > 0 && <span className="text-[10px] text-pink-500 font-bold">{comment.hearts}</span>}
                                                            {currentUser?.uid === comment.userId && (
                                                                <button onClick={() => deleteComment(selectedItem.id, selectedItem.userId, comment.id)}
                                                                    className="text-gray-300 hover:text-red-500 transition-colors">
                                                                    <Trash2 size={11} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-600 mt-0.5">{comment.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Comment input */}
                                    {currentUser ? (
                                        <div className="flex gap-2">
                                            <textarea
                                                value={commentText}
                                                onChange={(e) => setCommentText(e.target.value)}
                                                placeholder={t('commentPlaceholder')}
                                                className="flex-1 bg-gray-50 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border border-gray-200 resize-none"
                                                rows={2}
                                            />
                                            <button
                                                onClick={() => submitComment(selectedItem.id, selectedItem.userId)}
                                                disabled={!commentText.trim() || isSubmittingComment}
                                                className="bg-primary text-white p-2.5 rounded-xl disabled:opacity-50 hover:bg-primary/90 transition-colors"
                                            >
                                                <Send size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <Link to="/login" className="block text-center text-xs text-primary font-bold bg-primary/5 py-3 rounded-xl hover:bg-primary/10 transition-colors">
                                            {t('loginToComment')}
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Gallery;
