// src/data/mockItems.js
// Mock data for physical plushie clothing items

export const STYLE_TYPES = {
    MODE: 'mode',
    CASUAL: 'casual',
    FORMAL: 'formal',
    CUTE: 'cute',
};

export const ITEM_CATEGORIES = {
    HAT: 'hat',
    TOP: 'top',
    BOTTOM: 'bottom',
    ACCESSORY: 'accessory',
    SET: 'set',
};

export const MOCK_ITEMS = [
    // --- MODE ---
    {
        id: 'mode-top-1',
        name: 'オーバーサイズ モノトーンシャツ',
        category: ITEM_CATEGORIES.TOP,
        style: [STYLE_TYPES.MODE, STYLE_TYPES.CASUAL],
        sizeRange: { minHeight: 10, maxHeight: 15 },
        price: '¥2,500',
        imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e32f85e2c?q=80&w=400&h=400&auto=format&fit=crop',
        purchaseUrl: 'https://example.com/item/mode-top-1',
        shopName: 'Mode Nui Nui',
    },
    {
        id: 'mode-hat-1',
        name: 'レザー風 バケットハット',
        category: ITEM_CATEGORIES.HAT,
        style: [STYLE_TYPES.MODE],
        sizeRange: { minHeight: 8, maxHeight: 20 },
        price: '¥1,500',
        imageUrl: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?q=80&w=400&h=400&auto=format&fit=crop',
        purchaseUrl: 'https://example.com/item/mode-hat-1',
        shopName: 'Mode Nui Nui',
    },
    {
        id: 'mode-acc-1',
        name: 'シルバーチェーン ネックレス',
        category: ITEM_CATEGORIES.ACCESSORY,
        style: [STYLE_TYPES.MODE],
        sizeRange: { minHeight: 5, maxHeight: 30 },
        price: '¥800',
        imageUrl: 'https://images.unsplash.com/photo-1599643478524-fb66f7cefc11?q=80&w=400&h=400&auto=format&fit=crop',
        purchaseUrl: 'https://example.com/item/mode-acc-1',
        shopName: 'Nui Accessories',
    },

    // --- CASUAL ---
    {
        id: 'casual-set-1',
        name: 'デニムサロペット＆Tシャツセット',
        category: ITEM_CATEGORIES.SET,
        style: [STYLE_TYPES.CASUAL, STYLE_TYPES.CUTE],
        sizeRange: { minHeight: 10, maxHeight: 16 },
        price: '¥3,200',
        imageUrl: 'https://images.unsplash.com/photo-1516762689617-e1cffcef479d?q=80&w=400&h=400&auto=format&fit=crop',
        purchaseUrl: 'https://example.com/item/casual-set-1',
        shopName: 'Nui Casual',
    },
    {
        id: 'casual-acc-1',
        name: 'キャンバストートバッグ ミニ',
        category: ITEM_CATEGORIES.ACCESSORY,
        style: [STYLE_TYPES.CASUAL],
        sizeRange: { minHeight: 10, maxHeight: 20 },
        price: '¥1,200',
        imageUrl: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?q=80&w=400&h=400&auto=format&fit=crop',
        purchaseUrl: 'https://example.com/item/casual-acc-1',
        shopName: 'Nui Casual',
    },
    {
        id: 'casual-hat-1',
        name: 'コーデュロイ キャップ',
        category: ITEM_CATEGORIES.HAT,
        style: [STYLE_TYPES.CASUAL],
        sizeRange: { minHeight: 10, maxHeight: 15 },
        price: '¥1,800',
        imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=400&h=400&auto=format&fit=crop',
        purchaseUrl: 'https://example.com/item/casual-hat-1',
        shopName: 'Nui Casual',
    },

    // --- FORMAL ---
    {
        id: 'formal-set-1',
        name: 'クラシックタキシード 3点セット',
        category: ITEM_CATEGORIES.SET,
        style: [STYLE_TYPES.FORMAL],
        sizeRange: { minHeight: 13, maxHeight: 18 },
        price: '¥4,500',
        imageUrl: 'https://images.unsplash.com/photo-1593030103066-0093718efeb9?q=80&w=400&h=400&auto=format&fit=crop',
        purchaseUrl: 'https://example.com/item/formal-set-1',
        shopName: 'Nui Formal',
    },
    {
        id: 'formal-acc-1',
        name: '蝶ネクタイ (ワインレッド)',
        category: ITEM_CATEGORIES.ACCESSORY,
        style: [STYLE_TYPES.FORMAL],
        sizeRange: { minHeight: 8, maxHeight: 25 },
        price: '¥900',
        imageUrl: 'https://images.unsplash.com/photo-1582719471384-eb54e2230538?q=80&w=400&h=400&auto=format&fit=crop',
        purchaseUrl: 'https://example.com/item/formal-acc-1',
        shopName: 'Nui Formal',
    },
    {
        id: 'formal-acc-2',
        name: '本革風 ミニシューズ',
        category: ITEM_CATEGORIES.ACCESSORY,
        style: [STYLE_TYPES.FORMAL],
        sizeRange: { minHeight: 12, maxHeight: 18 },
        price: '¥2,200',
        imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=400&h=400&auto=format&fit=crop',
        purchaseUrl: 'https://example.com/item/formal-acc-2',
        shopName: 'Nui Shoes',
    },

    // --- CUTE ---
    {
        id: 'cute-top-1',
        name: 'フリルフラワー ワンピース',
        category: ITEM_CATEGORIES.TOP,
        style: [STYLE_TYPES.CUTE],
        sizeRange: { minHeight: 10, maxHeight: 15 },
        price: '¥2,800',
        imageUrl: 'https://images.unsplash.com/photo-1515347619252-7bfbaf9d1dc9?q=80&w=400&h=400&auto=format&fit=crop',
        purchaseUrl: 'https://example.com/item/cute-top-1',
        shopName: 'Cute Nui Nui',
    },
    {
        id: 'cute-hat-1',
        name: 'うさ耳 もこもこ帽子',
        category: ITEM_CATEGORIES.HAT,
        style: [STYLE_TYPES.CUTE],
        sizeRange: { minHeight: 9, maxHeight: 15 },
        price: '¥2,000',
        imageUrl: 'https://images.unsplash.com/photo-1533669145229-87360216b0a7?q=80&w=400&h=400&auto=format&fit=crop',
        purchaseUrl: 'https://example.com/item/cute-hat-1',
        shopName: 'Cute Nui Nui',
    },
    {
        id: 'cute-acc-1',
        name: 'いちごのポシェット',
        category: ITEM_CATEGORIES.ACCESSORY,
        style: [STYLE_TYPES.CUTE, STYLE_TYPES.CASUAL],
        sizeRange: { minHeight: 10, maxHeight: 18 },
        price: '¥1,500',
        imageUrl: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?q=80&w=400&h=400&auto=format&fit=crop',
        purchaseUrl: 'https://example.com/item/cute-acc-1',
        shopName: 'Cute Nui Nui',
    },
];

// Helper to get random items that match size and style
export const getRecommendations = (plushieHeight, desiredStyle, count = 3) => {
    const minH = plushieHeight * 0.8;
    const maxH = plushieHeight * 1.2;

    const matched = MOCK_ITEMS.filter(item => {
        // Basic size check (if item has strict size range)
        if (item.sizeRange) {
            if (plushieHeight < item.sizeRange.minHeight || plushieHeight > item.sizeRange.maxHeight) {
                return false;
            }
        }
        // Style check
        return item.style.includes(desiredStyle);
    });

    // Shuffle array
    const shuffled = matched.sort(() => 0.5 - Math.random());

    // Attempt to pick diverse categories if possible (e.g. 1 top/set, 1 hat, 1 accessory)
    // For simplicity right now, just return top 'count' items.
    return shuffled.slice(0, count);
};
