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
            paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 20px))', // Robust safe area padding with fallback
            paddingTop: '12px',
            zIndex: 9999, // Ensure it's on top
            borderRadius: '24px 24px 0 0',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.05)'
        }}>
            {navItems.map(({ to, icon, label }) => (
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
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        {React.createElement(icon, { size: 24, strokeWidth: 2 })}
                        <span>{label}</span>
                    </div>
                </NavLink>
            ))}
        </nav>
    );
};

export default BottomNav;
