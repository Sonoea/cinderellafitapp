import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Bell, Heart, MessageCircle, CheckCircle2 } from 'lucide-react';
import UserAvatar from '../components/UserAvatar';

const Notifications = () => {
    const { t } = useApp();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) {
            navigate('/login');
            return;
        }

        const q = query(
            collection(db, 'users', currentUser.uid, 'notifications'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            }));
            setNotifications(notifs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser, navigate]);

    const handleNotificationClick = async (notification) => {
        // Mark as read
        if (!notification.read) {
            try {
                const notifRef = doc(db, 'users', currentUser.uid, 'notifications', notification.id);
                await updateDoc(notifRef, { read: true });
            } catch (error) {
                console.error("Error marking notification as read:", error);
            }
        }
        
        // Navigate to the post
        if (notification.postId) {
            // Remove ownerUid from compositeId if needed, or pass as is
            // App route is /gallery/post/:postId
            navigate(`/gallery/post/${notification.postId}`);
        }
    };

    const markAllAsRead = async () => {
        const unreadNotifs = notifications.filter(n => !n.read);
        if (unreadNotifs.length === 0) return;

        try {
            const batch = writeBatch(db);
            unreadNotifs.forEach(n => {
                const notifRef = doc(db, 'users', currentUser.uid, 'notifications', n.id);
                batch.update(notifRef, { read: true });
            });
            await batch.commit();
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    // Helper to format date
    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return t('justNow') || 'just now';
        if (diffMins < 60) return t('timeAgo', diffMins, t('unitMinute') || 'm');
        if (diffHours < 24) return t('timeAgo', diffHours, t('unitHour') || 'h');
        return t('timeAgo', diffDays, t('unitDay') || 'd');
    };

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const hasUnread = notifications.some(n => !n.read);

    return (
        <div className="max-w-md mx-auto pb-24">
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md pt-6 pb-4 px-4 border-b border-gray-100 flex items-center justify-between shadow-sm">
                <h1 className="text-xl font-black text-gray-800 flex items-center gap-2 tracking-tight">
                    <Bell size={24} className="text-primary" />
                    {t('navNotifications')}
                </h1>
                {hasUnread && (
                    <button 
                        onClick={markAllAsRead}
                        className="text-xs font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
                    >
                        <CheckCircle2 size={14} />
                        {t('markAllAsRead')}
                    </button>
                )}
            </div>

            <div className="p-2 space-y-1">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center text-gray-400">
                        <div className="bg-gray-50 p-4 rounded-full mb-4 ring-8 ring-gray-50/50">
                            <Bell size={32} className="text-gray-300" />
                        </div>
                        <p className="font-bold text-sm tracking-wide">
                            {t('noNotifications')}
                        </p>
                    </div>
                ) : (
                    notifications.map((notif) => (
                        <div 
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`flex gap-3 p-4 rounded-xl cursor-pointer transition-all active:scale-[0.98] ${
                                notif.read 
                                ? 'bg-white hover:bg-gray-50' 
                                : 'bg-primary/5 hover:bg-primary/10 border border-primary/20'
                            }`}
                        >
                            <div className="relative flex-shrink-0 mt-0.5">
                                <UserAvatar
                                    src={notif.senderIcon}
                                    alt={notif.senderName}
                                    className="w-10 h-10 shadow-sm"
                                />
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                    {notif.type === 'like' ? (
                                        <div className="bg-pink-500 rounded-full p-1 border border-white">
                                            <Heart size={10} fill="white" className="text-white" />
                                        </div>
                                    ) : (
                                        <div className="bg-blue-500 rounded-full p-1 border border-white">
                                            <MessageCircle size={10} fill="white" className="text-white" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <p className="text-sm text-gray-800 leading-snug break-words">
                                    <span className="font-bold mr-1">{notif.senderName || t('guest')}</span>
                                    <span className="text-gray-600">
                                        {notif.type === 'like' 
                                            ? t('notificationLike')
                                            : t('notificationComment')
                                        }
                                    </span>
                                </p>
                                {notif.type === 'comment' && notif.message && (
                                    <p className="mt-1 text-xs text-gray-500 line-clamp-2 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-100">
                                        {notif.message}
                                    </p>
                                )}
                                <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">
                                    {formatDate(notif.createdAt)}
                                </p>
                            </div>

                            {notif.postImage && (
                                <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 ml-2 shadow-sm">
                                    <img src={notif.postImage} alt="" className="w-full h-full object-cover" />
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Notifications;
