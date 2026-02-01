import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Camera, Shirt, ShoppingBag } from 'lucide-react';

import { useApp } from '../context/AppContext';

const BottomNav = () => {
    const { t } = useApp();
    const location = useLocation();

    // Hide on fitting room
    if (location.pathname === '/fitting-room') return null;

    const navItems = [
        { to: '/', icon: Home, label: t('navHome') },
        { to: '/shop', icon: ShoppingBag, label: t('navShop') },
        { to: '/closet', icon: Shirt, label: t('navCloset') },
    ];

    return (
        <nav style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            maxWidth: '480px', // Match container
            margin: '0 auto',
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid rgba(0,0,0,0.05)',
            display: 'flex',
            justifyContent: 'space-around',
            padding: '12px 0 20px', // Extra padding for safe area
            zIndex: 100,
            borderRadius: '24px 24px 0 0',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.03)'
        }}>
            {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                    key={to}
                    to={to}
                    style={({ isActive }) => ({
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        color: isActive ? 'var(--primary-dark)' : 'var(--text-light)',
                        gap: '4px',
                        fontSize: '10px',
                        fontWeight: 600,
                        transition: 'color 0.2s'
                    })}
                >
                    <Icon size={24} strokeWidth={2} />
                    <span>{label}</span>
                </NavLink>
            ))}
        </nav>
    );
};

export default BottomNav;
