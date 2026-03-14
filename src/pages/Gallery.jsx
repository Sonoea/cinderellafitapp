import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { collectionGroup, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, addDoc, serverTimestamp, collection, orderBy, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Share2, Heart, MessageCircle, MoreHorizontal, X, MapPin, Star, Filter, Search, Shirt, ArrowRight, ExternalLink, Trash2, Users, User, LogIn, Send } from 'lucide-react';
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
    if (loc.includes('taiwan')) return '🇹🇼';
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

const ExpandableText = ({ text, maxLength = 90, onHashtagClick }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    if (!text) return null;
    if (text.length <= maxLength) return <p className="text-xs text-gray-600 mb-2 whitespace-pre-wrap">{renderTextWithHashtags(text, onHashtagClick)}</p>;
    return (
        <div className="mb-2">
            <p className="text-xs text-gray-600 whitespace-pre-wrap">
                {renderTextWithHashtags(isExpanded ? text : `${text.slice(0, maxLength)}...`, onHashtagClick)}
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsExpanded(!isExpanded); }} className="ml-1 text-blue-500 font-bold hover:underline inline-block">
                    {isExpanded ? ' 閉じる' : ' 続きを読む'}
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
                const q = query(collectionGroup(db, 'closetItems'), where('isPublic', '==', true));
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
                console.error("Error fetching gallery:", error);
                setGalleryError(language === 'jp' ? 'データの取得に失敗しました。再読み込みしてください。' : 'Failed to load gallery. Please refresh.');
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
                const myLikesQuery = query(collectionGroup(db, 'likes'), where('likedBy', '==', currentUser.uid));
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
            if (window.confirm(language === 'jp' ? 'いいねするにはログインが必要です。ログインしますか？' : 'Login required to like. Go to login?')) {
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
            if (window.confirm(language === 'jp' ? 'コメントするにはログインが必要です。ログインしますか？' : 'Login required to comment. Go to login?')) {
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
            alert(language === 'jp' ? "コメントの送信に失敗しました" : "Failed to submit comment");
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
    }, [selectedItem]);

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
                if (!item.plushieHeight) matchesSize = false;
                else if (sizeFilterPlushieId === 'all') {
                    matchesSize = plushies.some(myPlushie => {
                        const myHeight = myPlushie.measurements?.height || 0;
                        return Math.abs(myHeight - item.plushieHeight) <= 2;
                    });
                } else {
                    const selectedPlushie = plushies.find(p => String(p.id) === String(sizeFilterPlushieId));
                    if (selectedPlushie) matchesSize = Math.abs((selectedPlushie.measurements?.height || 0) - item.plushieHeight) <= 2;
                    else matchesSize = false;
                }
            }

            let matchesCategory = true;
            if (filterCategory !== 'all') matchesCategory = item.purchaseType === filterCategory;

            return matchesSearch && matchesSize && matchesCategory;
        });
    }, [processedItems, searchTerm, filterMySize, sizeFilterPlushieId, filterCategory, plushies]);

    // Hashtag click handler: close modal + search by tag
    const handleHashtagClick = (tag) => {
        setSelectedItem(null);
        setSearchTerm(tag);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="pb-48">
            <Helmet>
                <title>{language === 'jp' ? 'みんなのギャラリー | CinderellaFit' : "Everyone's Gallery | CinderellaFit"}</title>
                <meta name="description" content={language === 'jp' ? 'ユーザーのみなさんが投稿したぬいぐるみのお洋服コーディネートをチェック！' : 'Check out plushie outfit coordinates posted by users!'} />
                <meta property="og:title" content={language === 'jp' ? 'みんなのギャラリー | CinderellaFit' : "Everyone's Gallery | CinderellaFit"} />
                <meta property="og:description" content={language === 'jp' ? 'ユーザーのみなさんが投稿したぬいぐるみのお洋服コーディネートをチェック！' : 'Check out plushie outfit coordinates posted by users!'} />
                <meta property="og:url" content={window.location.href} />
            </Helmet>
            {/* Header */}
            <div className="sticky top-0 bg-background/95 backdrop-blur z-10 pt-4 pb-3 px-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-2xl font-black flex items-center gap-2">
                        <Users size={22} className="text-primary" />
                        {language === 'jp' ? 'みんなのギャラリー' : "Everyone's Gallery"}
                    </h2>
                    {!currentUser && (
                        <Link to="/login" className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold shadow-sm hover:bg-primary/90 transition-colors">
                            <LogIn size={14} />
                            {language === 'jp' ? 'ログイン' : 'Login'}
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
                            placeholder={language === 'jp' ? 'アイテム・ユーザー名で検索' : 'Search items or users'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
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
                                {language === 'jp' ? 'すべて' : 'All'}
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
                                    <span className="whitespace-nowrap">{p.name} {language === 'jp' ? 'サイズ' : 'Size'}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Category Filter */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {[
                            { id: 'all', label: language === 'jp' ? '全カテゴリー' : 'All Cats', icon: '✨' },
                            { id: 'online', label: language === 'jp' ? 'オンライン' : 'Online', icon: '🌐' },
                            { id: 'retail', label: language === 'jp' ? '店舗' : 'Retail', icon: '🏪' },
                            { id: 'handmade', label: language === 'jp' ? 'ハンドメイド' : 'Handmade', icon: '🪡' }
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
                    </div>
                </div>
            </div>

            <div className="px-4 mt-4">
                {isLoading ? (
                    <div className="text-center py-16">
                        <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
                        <p className="text-sm text-gray-400">{language === 'jp' ? '読み込み中...' : 'Loading...'}</p>
                    </div>
                ) : galleryError ? (
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl text-xs text-yellow-700 flex items-center gap-2">
                        <span>⚠️</span><span>{galleryError}</span>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center space-y-3">
                        <div className="text-4xl">🔍</div>
                        <p className="font-black text-gray-800">{language === 'jp' ? 'お探しのアイテムは見つかりません' : 'No items found'}</p>
                        <p className="text-xs text-gray-400 mt-1">
                            {(searchTerm || filterMySize || filterCategory !== 'all')
                                ? (language === 'jp' ? 'フィルター条件を変更して試してみてください' : 'Try changing filter conditions')
                                : (language === 'jp' ? 'まだ投稿がありません' : 'No posts yet')}
                        </p>
                        {(searchTerm || filterMySize || filterCategory !== 'all') && (
                            <button
                                onClick={() => { setSearchTerm(''); setFilterMySize(false); setSizeFilterPlushieId('all'); setFilterCategory('all'); }}
                                className="text-xs font-bold text-primary bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 mt-2"
                            >
                                {language === 'jp' ? '全てのフィルターをリセット' : 'Reset all filters'}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 mb-20 fade-in">
                        {filteredItems.map((post) => (
                            <div key={post.compositeId} className={`bg-white rounded-xl shadow-sm overflow-hidden break-inside-avoid ${post.isOwn ? 'border-2 border-primary/30 ring-1 ring-primary/10' : 'border border-gray-100'}`}>
                                {/* Header */}
                                <div className="p-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <UserAvatar
                                                src={post.userIcon}
                                                className="w-8 h-8"
                                                alt={post.userName}
                                                onClick={post.profileSlug ? () => navigate(`/gallery/${post.profileSlug}`) : undefined}
                                            />
                                            {post.isOwn && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-primary rounded-full flex items-center justify-center ring-2 ring-white"><Star size={8} className="text-white fill-white" /></div>}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-800 truncate max-w-[100px]">
                                                {post.profileSlug ? (
                                                    <Link to={`/gallery/${post.profileSlug}`} className="hover:text-primary transition-colors">{post.userName}</Link>
                                                ) : post.userName}
                                            </p>
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

                                {/* Image */}
                                <div className="aspect-square bg-gray-50 relative cursor-pointer group overflow-hidden" onClick={() => setSelectedItem(post)}>
                                    <img src={post.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                                    <div className="absolute" style={{ top: 6, right: 6, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px' }}>
                                        {post.date}
                                    </div>
                                </div>

                                {/* Social bar */}
                                <div className="flex items-center justify-between bg-white" style={{ padding: '8px 12px', borderBottom: '1px solid #f5f5f5' }}>
                                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleLike(post.id, post.userId, post.compositeId); }}
                                        className="flex items-center gap-1 transition-all"
                                        style={{ color: (itemLikes[post.compositeId]?.isLiked) ? '#ec4899' : '#9ca3af', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                                        <Heart size={18} fill={(itemLikes[post.compositeId]?.isLiked) ? "currentColor" : "none"} strokeWidth={2.5} />
                                        <span className="font-bold" style={{ fontSize: '12px' }}>{itemLikes[post.compositeId]?.count ?? post.likes ?? 0}</span>
                                    </button>
                                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShouldScrollToComments(true); setSelectedItem(post); }}
                                        className="flex items-center gap-1 text-gray-400 transition-all"
                                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                                        <MessageCircle size={18} strokeWidth={2.5} />
                                        <span className="font-bold" style={{ fontSize: '12px' }}>{Math.max(0, itemComments[post.compositeId]?.length || itemCommentCounts[post.compositeId] || 0)}</span>
                                    </button>
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
                                                {post.purchaseType === 'online' ? `🌐 ${language === 'jp' ? 'オンライン' : 'Online'}` :
                                                    post.purchaseType === 'retail' ? `🏪 ${language === 'jp' ? '店舗' : 'Retail'}` :
                                                        `🪡 ${language === 'jp' ? 'ハンドメイド' : 'Handmade'}`}
                                            </span>
                                            {(post.patternImage || post.referenceUrl) && (
                                                <span className="ml-1 text-[9px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full w-fit border border-orange-200 shadow-sm animate-pulse">
                                                    📖 {language === 'jp' ? '型紙あり' : 'Pattern'}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <ExpandableText text={post.comment} onHashtagClick={handleHashtagClick} />
                                    {post.shopName && (
                                        <div className="bg-gray-50 px-2 py-1 rounded-lg inline-flex items-center gap-1 text-[10px] text-gray-500" style={{ marginTop: '4px' }}>
                                            <Shirt size={10} />
                                            {language === 'jp' ? '購入元' : 'From'}: <span className="font-bold">{post.shopName}</span>
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
                                    <span style={{ fontSize: '28px' }}>{['😣', '😊', '😌'][selectedItem.fitRating - 1] || '😊'}</span>
                                </div>

                                {/* Comment */}
                                {selectedItem.comment && <ExpandableText text={selectedItem.comment} maxLength={200} onHashtagClick={handleHashtagClick} />}

                                {/* Shop info */}
                                {/* Shop info */}
                                {(selectedItem.url || selectedItem.url2 || selectedItem.url3) && (
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase ml-1">
                                            {language === 'jp' ? '購入先リンク' : 'Bought From'}
                                        </h4>
                                        <div className="flex flex-col gap-2">
                                            {[
                                                { url: selectedItem.url, label: selectedItem.shopName || safeHostname(selectedItem.url) || (language === 'jp' ? '商品ページ 1' : 'Link 1') },
                                                { url: selectedItem.url2, label: safeHostname(selectedItem.url2) || (language === 'jp' ? '商品ページ 2' : 'Link 2') },
                                                { url: selectedItem.url3, label: safeHostname(selectedItem.url3) || (language === 'jp' ? '商品ページ 3' : 'Link 3') }
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
                                        {language === 'jp' ? 'コメント' : 'Comments'}
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
                                                placeholder={language === 'jp' ? 'コメントを入力...' : 'Write a comment...'}
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
                                            {language === 'jp' ? 'ログインしてコメントする' : 'Login to comment'}
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
