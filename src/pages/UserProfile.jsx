import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, addDoc, serverTimestamp, orderBy, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Heart, MessageCircle, User, Share2, Shirt, ArrowLeft, Send, X, Trash2, LogIn, MapPin, Star } from 'lucide-react';
import { safeHostname, safeDate } from '../utils/formatting';

const UserAvatar = ({ src, alt, className }) => {
    const [error, setError] = useState(!src || src.includes('placeholder'));
    useEffect(() => { setError(!src || src.includes('placeholder')); }, [src]);
    if (error) {
        return (
            <div className={`flex items-center justify-center bg-gray-100 text-gray-400 rounded-full ${className}`}>
                <User size={20} />
            </div>
        );
    }
    return <img src={src} alt={alt} className={`object-cover rounded-full ${className}`} onError={() => setError(true)} />;
};

const ExpandableText = ({ text, maxLength = 90 }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    if (!text) return null;
    if (text.length <= maxLength) return <p className="text-xs text-gray-600 mb-2 whitespace-pre-wrap">{text}</p>;
    return (
        <div className="mb-2">
            <p className="text-xs text-gray-600 whitespace-pre-wrap">
                {isExpanded ? text : `${text.slice(0, maxLength)}...`}
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsExpanded(!isExpanded); }} className="ml-1 text-blue-500 font-bold hover:underline inline-block">
                    {isExpanded ? ' 閉じる' : ' 続きを読む'}
                </button>
            </p>
        </div>
    );
};

const UserProfile = () => {
    const { profileSlug } = useParams();
    const { currentUser } = useAuth();
    const { language } = useApp();
    const navigate = useNavigate();

    // User profile data
    const [profileUser, setProfileUser] = useState(null);
    const [profileUserId, setProfileUserId] = useState(null);
    const [userItems, setUserItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [copied, setCopied] = useState(false);

    // Social state
    const [itemLikes, setItemLikes] = useState({});
    const [likingInProgress, setLikingInProgress] = useState(new Set());
    const [itemCommentCounts, setItemCommentCounts] = useState({});
    const [itemComments, setItemComments] = useState({});
    const [commentText, setCommentText] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const commentsRef = useRef(null);

    // Detail modal
    const [selectedItem, setSelectedItem] = useState(null);

    // Fetch user by profileSlug
    useEffect(() => {
        const fetchUserProfile = async () => {
            setIsLoading(true);
            setNotFound(false);
            try {
                const q = query(collection(db, 'users'), where('profileSlug', '==', profileSlug));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    setNotFound(true);
                    setIsLoading(false);
                    return;
                }

                const userDoc = snapshot.docs[0];
                const userData = userDoc.data();
                setProfileUser(userData);
                setProfileUserId(userDoc.id);

                // Fetch user's public items
                const itemsRef = collection(db, 'users', userDoc.id, 'closetItems');
                const itemsQuery = query(itemsRef, where('isPublic', '==', true));
                const itemsSnap = await getDocs(itemsQuery);
                const items = [];
                itemsSnap.forEach(d => {
                    const data = d.data();
                    const imageUrl = data.imageUrl || data.image;
                    if (!imageUrl) return;
                    items.push({
                        id: d.id,
                        compositeId: `${userDoc.id}_${d.id}`.replace(/local-/g, ''),
                        ...data,
                        userId: userDoc.id,
                        imageUrl,
                        itemName: data.itemName || data.name || 'Untitled',
                        plushieName: data.plushieName || data.plushie || '',
                        purchaseType: data.purchaseType || '',
                        shopName: safeHostname(data.url || data.shopUrl),
                        date: safeDate(data.createdAt),
                        userName: userData.displayName,
                        userIcon: userData.photoURL || '',
                    });
                });

                items.sort((a, b) => {
                    const dateA = new Date(a.createdAt || 0).getTime();
                    const dateB = new Date(b.createdAt || 0).getTime();
                    return dateB - dateA;
                });

                setUserItems(items);

                // Sync likes/comments
                const newLikes = {};
                const newCounts = {};
                items.forEach(item => {
                    if (item.likes !== undefined) newLikes[item.compositeId] = { count: item.likes || 0, isLiked: false };
                    if (item.commentCount !== undefined) newCounts[item.compositeId] = item.commentCount || 0;
                });
                setItemLikes(prev => ({ ...prev, ...newLikes }));
                setItemCommentCounts(prev => ({ ...prev, ...newCounts }));

                // Fetch current user's likes
                if (currentUser) {
                    try {
                        const myLikesRef = collection(db, 'users', userDoc.id, 'closetItems');
                        const allItemsSnap = await getDocs(query(myLikesRef, where('isPublic', '==', true)));
                        for (const itemDoc of allItemsSnap.docs) {
                            try {
                                const likeDoc = await getDoc(doc(db, 'users', userDoc.id, 'closetItems', itemDoc.id, 'likes', currentUser.uid));
                                if (likeDoc.exists()) {
                                    const cid = `${userDoc.id}_${itemDoc.id}`;
                                    setItemLikes(prev => ({ ...prev, [cid]: { ...(prev[cid] || { count: 0 }), isLiked: true } }));
                                }
                            } catch (e) { /* ignore */ }
                        }
                    } catch (e) { console.warn("Failed to check likes:", e); }
                }
            } catch (error) {
                console.error("Error fetching user profile:", error);
                setNotFound(true);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUserProfile();
    }, [profileSlug, currentUser]);

    // Engagement functions - auto-repair counts
    const fetchEngagement = async (itemId, ownerUid) => {
        if (!itemId || !ownerUid) return;
        const compositeId = `${ownerUid}_${itemId}`;
        try {
            const itemRef = doc(db, 'users', ownerUid, 'closetItems', itemId);
            const likesSnap = await getDocs(collection(db, 'users', ownerUid, 'closetItems', itemId, 'likes'));
            const isLiked = currentUser ? likesSnap.docs.some(d => d.id === currentUser.uid) : false;
            setItemLikes(prev => ({ ...prev, [compositeId]: { count: likesSnap.size, isLiked } }));

            const cq = query(collection(db, 'users', ownerUid, 'closetItems', itemId, 'comments'), orderBy('createdAt', 'asc'));
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

    const toggleLike = async (itemId, ownerUid) => {
        if (!currentUser) {
            if (window.confirm(language === 'jp' ? 'いいねするにはログインが必要です。ログインしますか？' : 'Login required. Go to login?')) navigate('/login');
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

            // Always sync from actual subcollection count
            const likesSnap = await getDocs(collection(db, 'users', ownerUid, 'closetItems', bareId, 'likes'));
            const actualCount = likesSnap.size;
            await updateDoc(itemRef, { likes: actualCount });
            const stillLiked = likesSnap.docs.some(d => d.id === currentUser.uid);
            setItemLikes(prev => ({
                ...prev,
                [compositeId]: { count: actualCount, isLiked: stillLiked }
            }));
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

    const submitComment = async (itemId, ownerUid) => {
        if (!currentUser) {
            if (window.confirm(language === 'jp' ? 'コメントするにはログインが必要です。ログインしますか？' : 'Login required. Go to login?')) navigate('/login');
            return;
        }
        if (!commentText.trim() || isSubmittingComment) return;
        setIsSubmittingComment(true);
        try {
            const bareId = String(itemId).replace(/^local-/, '');
            let userName = currentUser.displayName || 'Guest';
            let userIcon = currentUser.photoURL || '';
            try {
                const uDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (uDoc.exists()) { userName = uDoc.data().displayName || userName; userIcon = uDoc.data().photoURL || userIcon; }
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
        } finally {
            setIsSubmittingComment(false);
        }
    };

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
        } catch (e) { console.error("Error:", e); }
    };

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
            const ref = doc(db, 'users', ownerUid, 'closetItems', bareId, 'comments', commentId);
            if (isHearted) await updateDoc(ref, { heartedBy: arrayRemove(currentUser.uid), hearts: increment(-1) });
            else await updateDoc(ref, { heartedBy: arrayUnion(currentUser.uid), hearts: increment(1) });
        } catch (e) { await fetchEngagement(bareId, ownerUid); }
    };

    useEffect(() => {
        if (selectedItem) {
            const bareId = String(selectedItem.id || '').replace(/^local-/, '');
            if (bareId && selectedItem.userId) fetchEngagement(bareId, selectedItem.userId);
        }
    }, [selectedItem]);

    const handleShare = async () => {
        const url = `${window.location.origin}/gallery/${profileSlug}`;
        try {
            if (navigator.share) {
                await navigator.share({ title: `${profileUser?.displayName} - CinderellaFit`, url });
            } else {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        } catch (e) {
            try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (e2) { /* ignore */ }
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
                    <p className="text-sm text-gray-400">{language === 'jp' ? '読み込み中...' : 'Loading...'}</p>
                </div>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                    <div className="text-5xl">😢</div>
                    <h2 className="text-xl font-bold text-gray-800">{language === 'jp' ? 'ユーザーが見つかりません' : 'User not found'}</h2>
                    <p className="text-sm text-gray-400">{language === 'jp' ? 'このプロフィールは存在しないか、削除されました。' : 'This profile does not exist or has been removed.'}</p>
                    <Link to="/gallery" className="inline-block px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors">
                        {language === 'jp' ? 'ギャラリーに戻る' : 'Back to Gallery'}
                    </Link>
                </div>
            </div>
        );
    }

    const isOwnProfile = currentUser?.uid === profileUserId;

    return (
        <div className="pb-48">
            <Helmet>
                <title>{profileUser ? `${profileUser.displayName}さんのギャラリー | CinderellaFit` : 'ユーザープロフィール | CinderellaFit'}</title>
                <meta name="description" content={profileUser ? `${profileUser.displayName}さんの公開コーディネートをチェックしよう！` : 'CinderellaFit ユーザープロフィール'} />
                <meta property="og:title" content={profileUser ? `${profileUser.displayName}さんのギャラリー | CinderellaFit` : 'CinderellaFit'} />
                <meta property="og:description" content={profileUser ? `${profileUser.displayName}さんの公開コーディネートをチェックしよう！` : 'CinderellaFit ユーザープロフィール'} />
                <meta property="og:image" content={profileUser?.photoURL || 'https://cinderellafitapp.vercel.app/ogp-default.png'} />
                <meta property="og:url" content={window.location.href} />
                <meta name="twitter:title" content={profileUser ? `${profileUser.displayName}さんのギャラリー | CinderellaFit` : 'CinderellaFit'} />
                <meta name="twitter:description" content={profileUser ? `${profileUser.displayName}さんの公開コーディネートをチェックしよう！` : 'CinderellaFit ユーザープロフィール'} />
                <meta name="twitter:image" content={profileUser?.photoURL || 'https://cinderellafitapp.vercel.app/ogp-default.png'} />
            </Helmet>

            {/* Back button */}
            <div className="sticky top-0 bg-background/95 backdrop-blur z-10 pt-4 pb-2 px-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                        <ArrowLeft size={18} />
                    </button>
                    <h2 className="text-lg font-bold truncate">{profileUser?.displayName}</h2>
                </div>
            </div>

            {/* Profile Header */}
            <div className="px-4 mt-4 mb-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                    <UserAvatar src={profileUser?.photoURL} className="w-20 h-20 mx-auto ring-4 ring-primary/10 mb-3" alt={profileUser?.displayName} />
                    <h2 className="text-xl font-black text-gray-800 mb-1">{profileUser?.displayName}</h2>
                    {isOwnProfile && (
                        <span className="inline-block text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full mb-2">
                            {language === 'jp' ? 'あなたのプロフィール' : 'Your Profile'}
                        </span>
                    )}
                    <p className="text-sm text-gray-400 mb-4">
                        {userItems.length} {language === 'jp' ? '件の公開コーデ' : 'public outfits'}
                    </p>

                    <button
                        onClick={handleShare}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${copied
                            ? 'bg-green-100 text-green-600 border border-green-200'
                            : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                    >
                        <Share2 size={14} />
                        {copied
                            ? (language === 'jp' ? 'コピーしました！' : 'Copied!')
                            : (language === 'jp' ? 'プロフィールをシェア' : 'Share Profile')}
                    </button>
                </div>
            </div>

            {/* Items Grid */}
            <div className="px-4">
                {userItems.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                        <div className="text-4xl mb-3">📭</div>
                        <p className="font-bold text-gray-600">{language === 'jp' ? 'まだ公開コーデはありません' : 'No public outfits yet'}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 mb-20">
                        {userItems.map(post => (
                            <div key={post.compositeId} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                                {/* Image */}
                                <div className="aspect-square bg-gray-50 relative cursor-pointer group overflow-hidden" onClick={() => setSelectedItem(post)}>
                                    <img src={post.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                                    <div className="absolute" style={{ top: 6, right: 6, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px' }}>
                                        {post.date}
                                    </div>
                                </div>

                                {/* Social bar */}
                                <div className="flex items-center justify-between bg-white" style={{ padding: '8px 12px', borderBottom: '1px solid #f5f5f5' }}>
                                    <button type="button" onClick={(e) => { e.preventDefault(); toggleLike(post.id, post.userId); }}
                                        className="flex items-center gap-1"
                                        style={{ color: (itemLikes[post.compositeId]?.isLiked) ? '#ec4899' : '#9ca3af', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                                        <Heart size={18} fill={(itemLikes[post.compositeId]?.isLiked) ? "currentColor" : "none"} strokeWidth={2.5} />
                                        <span className="font-bold" style={{ fontSize: '12px' }}>{itemLikes[post.compositeId]?.count ?? post.likes ?? 0}</span>
                                    </button>
                                    <button type="button" onClick={() => setSelectedItem(post)}
                                        className="flex items-center gap-1 text-gray-400"
                                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                                        <MessageCircle size={18} strokeWidth={2.5} />
                                        <span className="font-bold" style={{ fontSize: '12px' }}>{Math.max(0, itemCommentCounts[post.compositeId] || 0)}</span>
                                    </button>
                                    <span style={{ fontSize: '18px', lineHeight: 1 }}>{['😣', '😊', '😌'][post.fitRating - 1] || '😊'}</span>
                                </div>

                                {/* Content */}
                                <div className="p-2">
                                    <h3 className="font-bold text-sm text-gray-800 mb-1">{post.itemName}</h3>
                                    {post.plushieName && (
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-1">
                                            <span>{post.plushieName}</span>
                                            {post.plushieHeight && <span className="bg-gray-100 px-1 rounded">{post.plushieHeight}cm</span>}
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
                    <div className="relative shadow-2xl overflow-hidden bg-white rounded-2xl" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '100%', maxHeight: '90vh' }}>
                        <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full z-10">
                            <X size={20} />
                        </button>

                        <div style={{ overflowY: 'auto', maxHeight: '90vh' }}>
                            <img src={selectedItem.imageUrl} alt="" className="w-full aspect-square object-cover" />

                            <div className="p-6 space-y-4">
                                <h2 className="text-lg font-bold">{selectedItem.itemName}</h2>

                                {/* Like */}
                                <div className="flex items-center gap-3">
                                    <button onClick={() => toggleLike(selectedItem.id, selectedItem.userId)}
                                        className={`flex items-center gap-3 px-5 py-2.5 rounded-full font-black text-sm transition-all active:scale-90 ${(itemLikes[selectedItem.compositeId]?.isLiked)
                                            ? 'bg-pink-500 text-white shadow-lg ring-4 ring-pink-100'
                                            : 'bg-pink-50 text-pink-500 border border-pink-200'}`}>
                                        <Heart size={20} fill={(itemLikes[selectedItem.compositeId]?.isLiked) ? "currentColor" : "none"} strokeWidth={3} />
                                        <span>{itemLikes[selectedItem.compositeId]?.count ?? 0}</span>
                                    </button>
                                    <span style={{ fontSize: '28px' }}>{['😣', '😊', '😌'][selectedItem.fitRating - 1] || '😊'}</span>
                                </div>

                                {selectedItem.comment && <ExpandableText text={selectedItem.comment} maxLength={200} />}

                                {selectedItem.shopName && (
                                    <div className="bg-gray-50 p-3 rounded-xl flex items-center gap-2 text-sm text-gray-500">
                                        <Shirt size={16} />
                                        <span>{language === 'jp' ? '購入元' : 'From'}: <strong>{selectedItem.shopName}</strong></span>
                                    </div>
                                )}

                                {/* Comments */}
                                <div ref={commentsRef}>
                                    <h4 className="font-bold text-sm text-gray-600 mb-3 flex items-center gap-2">
                                        <MessageCircle size={16} />
                                        {language === 'jp' ? 'コメント' : 'Comments'}
                                        <span className="text-xs text-gray-400">({itemComments[selectedItem.compositeId]?.length || 0})</span>
                                    </h4>

                                    <div className="space-y-3 mb-4">
                                        {(itemComments[selectedItem.compositeId] || []).map(comment => (
                                            <div key={comment.id} className="flex gap-2">
                                                <UserAvatar src={comment.userIcon} className="w-7 h-7 flex-shrink-0" alt={comment.userName} />
                                                <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-gray-700">{comment.userName}</span>
                                                        <div className="flex items-center gap-2">
                                                            {currentUser && (
                                                                <button onClick={() => toggleCommentHeart(selectedItem.id, selectedItem.userId, comment.id)} className="text-gray-300 hover:text-pink-500">
                                                                    <Heart size={12} fill={(comment.heartedBy || []).includes(currentUser?.uid) ? "currentColor" : "none"} className={(comment.heartedBy || []).includes(currentUser?.uid) ? "text-pink-500" : ""} />
                                                                </button>
                                                            )}
                                                            {comment.hearts > 0 && <span className="text-[10px] text-pink-500 font-bold">{comment.hearts}</span>}
                                                            {currentUser?.uid === comment.userId && (
                                                                <button onClick={() => deleteComment(selectedItem.id, selectedItem.userId, comment.id)} className="text-gray-300 hover:text-red-500">
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

                                    {currentUser ? (
                                        <div className="flex gap-2">
                                            <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)}
                                                placeholder={language === 'jp' ? 'コメントを入力...' : 'Write a comment...'}
                                                className="flex-1 bg-gray-50 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border border-gray-200"
                                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(selectedItem.id, selectedItem.userId); } }} />
                                            <button onClick={() => submitComment(selectedItem.id, selectedItem.userId)}
                                                disabled={!commentText.trim() || isSubmittingComment}
                                                className="bg-primary text-white p-2.5 rounded-xl disabled:opacity-50">
                                                <Send size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <Link to="/login" className="block text-center text-xs text-primary font-bold bg-primary/5 py-3 rounded-xl">
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

export default UserProfile;
