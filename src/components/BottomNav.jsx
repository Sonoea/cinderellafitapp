import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Camera, Shirt, ShoppingBag, Users, Globe, Bell } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

const BottomNav = () => {
    const { t } = useApp();
    const location = useLocation();

    const { currentUser } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!currentUser) {
            setUnreadCount(0);
            return;
        }

        const q = query(
            collection(db, 'users', currentUser.uid, 'notifications'),
            where('read', '==', false)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setUnreadCount(snapshot.size);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Hide on fitting room
    if (location.pathname === '/fitting-room') return null;

    const navItems = [
        { to: '/', icon: Home, label: t('navHome') },
        { to: '/closet?add=true', icon: Camera, label: t('addNewOutfit') || '登録' },
        { to: '/closet', icon: Shirt, label: t('navCloset') },
        { to: '/gallery', icon: Users, label: t('navGallery') || (t('language') === 'jp' ? 'ギャラリー' : 'Gallery') },
        { to: '/notifications', icon: Bell, label: t('navNotifications') || 'お知らせ' },
    ];

    return (
        <nav style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            maxWidth: '640px',
            margin: '0 auto',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            justifyContent: 'space-around',
            paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 20px))',
            paddingTop: '10px',
            zIndex: 100,
            boxShadow: '0 -2px 16px rgba(0,0,0,0.04)'
        }}>
            {navItems.map(({ to, icon, label }) => (
                <NavLink
                    key={to}
                    to={to}
                    style={({ isActive }) => ({
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        color: isActive ? 'var(--primary)' : 'var(--gray-300)',
                        gap: '3px',
                        fontSize: '10px',
                        fontWeight: isActive ? 700 : 500,
                        transition: 'color 0.2s, transform 0.2s',
                        letterSpacing: '0.01em',
                        position: 'relative'
                    })}
                >
                    {({ isActive }) => (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                            {/* Active indicator dot */}
                            <div style={{
                                width: '4px',
                                height: '4px',
                                borderRadius: '50%',
                                background: isActive ? 'var(--primary)' : 'transparent',
                                marginBottom: '1px',
                                transition: 'background 0.2s'
                            }} />
                            <div style={{ position: 'relative' }}>
                                {React.createElement(icon, {
                                    size: 22,
                                    strokeWidth: isActive ? 2.5 : 1.8
                                })}
                                {to === '/notifications' && unreadCount > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '-2px',
                                        right: '-2px',
                                        width: '8px',
                                        height: '8px',
                                        backgroundColor: '#ef4444',
                                        borderRadius: '50%',
                                        border: '1.5px solid white'
                                    }} />
                                )}
                            </div>
                            <span style={{
                                color: isActive ? 'var(--primary)' : 'var(--gray-300)',
                                fontWeight: isActive ? 700 : 500
                            }}>{label}</span>
                        </div>
                    )}
                </NavLink>
            ))}
        </nav>
    );
};

export default BottomNav;
