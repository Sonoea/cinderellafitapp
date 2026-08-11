import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';

// Renders a person-icon placeholder instead of a broken <img> whenever src
// is missing or fails to load — state-driven, so a failed load never leaves
// a native "broken image" glyph sitting in the DOM.
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

export default UserAvatar;
