import React from 'react';

// Cute hoodie SVG overlay
export const HoodieSVG = ({ color = '#E53935', size = 150 }) => (
    <svg width={size} height={size * 0.9} viewBox="0 0 150 135" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Main body */}
        <path d="M30 45 L45 30 L105 30 L120 45 L125 120 L25 120 Z" fill={color} />
        {/* Hood */}
        <ellipse cx="75" cy="25" rx="35" ry="20" fill={color} />
        <ellipse cx="75" cy="22" rx="25" ry="12" fill="#FFEBEE" />
        {/* Left sleeve */}
        <path d="M25 50 L5 70 L15 85 L35 65 Z" fill={color} />
        {/* Right sleeve */}
        <path d="M125 50 L145 70 L135 85 L115 65 Z" fill={color} />
        {/* Pocket */}
        <rect x="50" y="85" width="50" height="25" rx="5" fill="#C62828" opacity="0.3" />
        {/* Front zipper line */}
        <line x1="75" y1="35" x2="75" y2="115" stroke="#C62828" strokeWidth="2" />
        {/* Strings */}
        <line x1="65" y1="35" x2="60" y2="55" stroke="#FFEBEE" strokeWidth="2" />
        <line x1="85" y1="35" x2="90" y2="55" stroke="#FFEBEE" strokeWidth="2" />
    </svg>
);

// Cute overall/jumpsuit SVG
export const OverallSVG = ({ color = '#1976D2', size = 150 }) => (
    <svg width={size} height={size * 1.1} viewBox="0 0 150 165" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Straps */}
        <rect x="40" y="5" width="12" height="45" rx="3" fill={color} />
        <rect x="98" y="5" width="12" height="45" rx="3" fill={color} />
        {/* Buttons on straps */}
        <circle cx="46" cy="12" r="4" fill="#FFC107" />
        <circle cx="104" cy="12" r="4" fill="#FFC107" />
        {/* Main body */}
        <path d="M25 45 L125 45 L130 95 L120 160 L80 160 L75 110 L70 160 L30 160 L20 95 Z" fill={color} />
        {/* Front pocket */}
        <rect x="45" y="55" width="60" height="35" rx="8" fill="#1565C0" />
        {/* Pocket stitching */}
        <path d="M50 60 L50 85 M100 60 L100 85" stroke="#0D47A1" strokeWidth="1" strokeDasharray="3 2" />
        {/* Center seam */}
        <line x1="75" y1="95" x2="75" y2="110" stroke="#0D47A1" strokeWidth="1" />
    </svg>
);

// Cute dress SVG
export const DressSVG = ({ color = '#EC407A', size = 150 }) => (
    <svg width={size} height={size * 1.2} viewBox="0 0 150 180" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Top/bodice */}
        <path d="M45 15 L55 5 L95 5 L105 15 L110 55 L40 55 Z" fill={color} />
        {/* Skirt */}
        <path d="M35 55 L115 55 L135 170 L15 170 Z" fill={color} />
        {/* Collar/neckline */}
        <ellipse cx="75" cy="8" rx="20" ry="8" fill="#FCE4EC" />
        {/* Bow */}
        <ellipse cx="75" cy="20" rx="12" ry="6" fill="#F8BBD9" />
        <circle cx="75" cy="20" r="4" fill="#AD1457" />
        {/* Sleeves - puff style */}
        <ellipse cx="38" cy="25" rx="15" ry="18" fill={color} />
        <ellipse cx="112" cy="25" rx="15" ry="18" fill={color} />
        {/* Waist ribbon */}
        <rect x="35" y="50" width="80" height="8" rx="4" fill="#AD1457" />
        {/* Skirt frills */}
        <path d="M20 165 Q35 155 50 165 Q65 155 80 165 Q95 155 110 165 Q125 155 135 165" stroke="#F8BBD9" strokeWidth="6" fill="none" />
    </svg>
);

// Cute raincoat SVG
export const RaincoatSVG = ({ color = '#FDD835', size = 150 }) => (
    <svg width={size} height={size * 1.0} viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Main body */}
        <path d="M30 40 L40 25 L110 25 L120 40 L130 140 L20 140 Z" fill={color} />
        {/* Hood */}
        <path d="M40 25 Q75 -5 110 25" fill={color} />
        <ellipse cx="75" cy="22" rx="22" ry="12" fill="#FFF9C4" />
        {/* Left sleeve */}
        <path d="M20 50 L0 80 L10 95 L35 70 Z" fill={color} />
        {/* Right sleeve */}
        <path d="M130 50 L150 80 L140 95 L115 70 Z" fill={color} />
        {/* Buttons */}
        <circle cx="75" cy="50" r="5" fill="#F57F17" />
        <circle cx="75" cy="75" r="5" fill="#F57F17" />
        <circle cx="75" cy="100" r="5" fill="#F57F17" />
        <circle cx="75" cy="125" r="5" fill="#F57F17" />
        {/* Pockets */}
        <rect x="35" y="90" width="25" height="20" rx="5" fill="#FBC02D" />
        <rect x="90" y="90" width="25" height="20" rx="5" fill="#FBC02D" />
        {/* Rain drops decoration */}
        <circle cx="45" cy="60" r="3" fill="#E3F2FD" opacity="0.7" />
        <circle cx="105" cy="70" r="2" fill="#E3F2FD" opacity="0.7" />
    </svg>
);

// Cape/poncho SVG
export const CapeSVG = ({ color = '#7B1FA2', size = 150 }) => (
    <svg width={size} height={size * 0.9} viewBox="0 0 150 135" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Main cape body */}
        <path d="M75 15 L15 130 L135 130 Z" fill={color} />
        {/* Collar */}
        <ellipse cx="75" cy="20" rx="25" ry="12" fill="#9C27B0" />
        <ellipse cx="75" cy="18" rx="18" ry="8" fill="#E1BEE7" />
        {/* Clasp/button */}
        <circle cx="75" cy="30" r="6" fill="#FFC107" />
        <circle cx="75" cy="30" r="3" fill="#FF8F00" />
        {/* Cape pattern - stars */}
        <polygon points="45,60 47,66 53,66 48,70 50,76 45,72 40,76 42,70 37,66 43,66" fill="#E1BEE7" opacity="0.5" />
        <polygon points="100,80 102,86 108,86 103,90 105,96 100,92 95,96 97,90 92,86 98,86" fill="#E1BEE7" opacity="0.5" />
        <polygon points="70,95 72,101 78,101 73,105 75,111 70,107 65,111 67,105 62,101 68,101" fill="#E1BEE7" opacity="0.5" />
    </svg>
);

// T-shirt SVG
export const TshirtSVG = ({ color = '#4CAF50', size = 150 }) => (
    <svg width={size} height={size * 0.85} viewBox="0 0 150 127" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Main body */}
        <path d="M40 35 L110 35 L115 120 L35 120 Z" fill={color} />
        {/* Left sleeve */}
        <path d="M40 35 L15 45 L10 70 L35 60 Z" fill={color} />
        {/* Right sleeve */}
        <path d="M110 35 L135 45 L140 70 L115 60 Z" fill={color} />
        {/* Neckline */}
        <ellipse cx="75" cy="32" rx="22" ry="10" fill="#E8F5E9" />
        {/* Cute print - heart */}
        <path d="M65 65 Q65 55 75 60 Q85 55 85 65 L75 85 Z" fill="#C8E6C9" />
        {/* Sleeve cuffs */}
        <path d="M10 68 L35 58 L35 63 L12 72 Z" fill="#388E3C" />
        <path d="M140 68 L115 58 L115 63 L138 72 Z" fill="#388E3C" />
        {/* Bottom hem */}
        <rect x="35" y="115" width="80" height="5" rx="2" fill="#388E3C" />
    </svg>
);

// Map of clothing components
export const CLOTHING_OVERLAYS = {
    hoodie: { component: HoodieSVG, name: 'フード付きパーカー', defaultColor: '#E53935' },
    overall: { component: OverallSVG, name: 'オーバーオール', defaultColor: '#1976D2' },
    dress: { component: DressSVG, name: 'ワンピース', defaultColor: '#EC407A' },
    raincoat: { component: RaincoatSVG, name: 'レインコート', defaultColor: '#FDD835' },
    cape: { component: CapeSVG, name: 'ケープ', defaultColor: '#7B1FA2' },
    tshirt: { component: TshirtSVG, name: 'Tシャツ', defaultColor: '#4CAF50' },
};

export default CLOTHING_OVERLAYS;
