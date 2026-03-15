// src/data/mockItems.js
// Mock data for physical plushie clothing items

export const STYLE_TYPES = {
    MODE: 'mode', // Haute Couture / Law Roach Style
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
    // --- MODE (Cool, Sophisticated) ---
    {
        id: 'mode-top-1',
        name: 'WEGO 10cm ぬいジャージセット（ボトムス単品）',
        aiPrompt: 'blue track pants with white stripes, sporty fashion',
        category: ITEM_CATEGORIES.BOTTOM,
        style: [STYLE_TYPES.MODE, STYLE_TYPES.CASUAL],
        sizeRange: { minHeight: 10, maxHeight: 15 },
        price: '¥1,599',
        imageUrl: 'https://wego.jp/cdn/shop/files/LG25SS06-G0070sub01.jpg',
        purchaseUrl: 'https://wego.jp/products/lg25ss06-g0070',
        shopName: 'WEGO ONLINE STORE',
    },
    {
        id: 'mode-set-black',
        name: 'Little Closet 10cm 執事ブラックセット',
        aiPrompt: 'elegant black butler suit, formal black vest and white shirt, black tie',
        category: ITEM_CATEGORIES.SET,
        style: [STYLE_TYPES.MODE, STYLE_TYPES.FORMAL],
        sizeRange: { minHeight: 10, maxHeight: 12 },
        price: '¥2,400',
        imageUrl: 'https://base-ec2if.akamaized.net/images/item/origin/881add3e6b0067863a545186e22b9ca2.jpg?width=500',
        purchaseUrl: 'https://littlecloset.shopselect.net/items/54784260',
        shopName: 'Little Closet',
    },
    {
        id: 'mode-hat-1',
        name: 'WEGO ぬいシアーバケットハット',
        aiPrompt: 'black sheer bucket hat, cool streetwear accessory',
        category: ITEM_CATEGORIES.HAT,
        style: [STYLE_TYPES.MODE],
        sizeRange: { minHeight: 8, maxHeight: 20 },
        price: '¥880',
        imageUrl: 'https://cdn.shopify.com/s/files/1/0578/9456/8136/files/LG24SS03-G0095sub03.JPG',
        purchaseUrl: 'https://wego.jp/products/lg25aw11-g0181',
        shopName: 'WEGO ONLINE STORE',
    },
    {
        id: 'mode-acc-chrome',
        name: 'WEGO ぬいチェーンネックレスシルバー',
        aiPrompt: 'chunky silver chain necklace, cool streetwear jewelry',
        category: ITEM_CATEGORIES.ACCESSORY,
        style: [STYLE_TYPES.MODE],
        sizeRange: { minHeight: 5, maxHeight: 30 },
        price: '¥550',
        imageUrl: 'https://wego.jp/cdn/shop/files/LG25AW10-G0173sub07.jpg',
        purchaseUrl: 'https://wego.jp/products/lg25aw10-g0240',
        shopName: 'WEGO ONLINE STORE',
    },
    {
        id: 'mode-top-vest',
        name: 'Little Closet 10cm用 フェイクレザーベスト',
        aiPrompt: 'cool black faux leather vest, high-fashion streetwear',
        category: ITEM_CATEGORIES.TOP,
        style: [STYLE_TYPES.MODE],
        sizeRange: { minHeight: 10, maxHeight: 15 },
        price: '¥1,400',
        imageUrl: 'https://base-ec2if.akamaized.net/images/item/origin/881add3e6b0067863a545186e22b9ca2.jpg?width=500',
        purchaseUrl: 'https://littlecloset.shopselect.net/items/54784260',
        shopName: 'Little Closet',
    },
    {
        id: 'couture-blazer-structural',
        name: 'Law Roach Inspired 10cm Structural Blazer',
        aiPrompt: 'architectural sharp-shouldered black blazer, high-fashion structural tailoring, avant-garde couture',
        category: ITEM_CATEGORIES.SET,
        style: [STYLE_TYPES.MODE],
        sizeRange: { minHeight: 10, maxHeight: 12 },
        price: '¥3,800',
        imageUrl: 'https://base-ec2if.akamaized.net/images/item/origin/881add3e6b0067863a545186e22b9ca2.jpg?width=500',
        purchaseUrl: 'https://littlecloset.shopselect.net/items/54784260',
        shopName: 'Couture Studio',
    },
    {
        id: 'couture-set-emerald',
        name: 'Law Roach Inspired 10cm Emerald Satin Set',
        aiPrompt: 'luxurious emerald green satin structural gown, bold color blocking, red carpet fashion',
        category: ITEM_CATEGORIES.SET,
        style: [STYLE_TYPES.MODE],
        sizeRange: { minHeight: 10, maxHeight: 15 },
        price: '¥4,500',
        imageUrl: 'https://base-ec2if.akamaized.net/images/item/origin/881add3e6b0067863a545186e22b9ca2.jpg?width=500',
        purchaseUrl: 'https://littlecloset.shopselect.net/items/54784260',
        shopName: 'Couture Studio',
    },
    {
        id: 'couture-hat-fascinator',
        name: 'Architectural Fascinator Hat',
        aiPrompt: 'bold architectural high-fashion headpiece, geometric fascinator, dramatic couture hat',
        category: ITEM_CATEGORIES.HAT,
        style: [STYLE_TYPES.MODE],
        sizeRange: { minHeight: 10, maxHeight: 15 },
        price: '¥2,200',
        imageUrl: 'https://base-ec2if.akamaized.net/images/item/origin/881add3e6b0067863a545186e22b9ca2.jpg?width=500',
        purchaseUrl: 'https://littlecloset.shopselect.net/items/54784260',
        shopName: 'Couture Studio',
    },

    // --- CASUAL (Relaxed, Everyday) ---
    {
        id: 'casual-set-1',
        name: 'WEGO 10cm ぬいデニムオーバーオールセット',
        aiPrompt: 'classic blue denim overalls, white t-shirt underneath, casual cute outfit',
        category: ITEM_CATEGORIES.SET,
        style: [STYLE_TYPES.CASUAL, STYLE_TYPES.CUTE],
        sizeRange: { minHeight: 10, maxHeight: 16 },
        price: '¥1,999',
        imageUrl: 'https://wego.jp/cdn/shop/files/LG25AW10-G0172sub02.jpg',
        purchaseUrl: 'https://wego.jp/products/lg25aw10-g0172',
        shopName: 'WEGO ONLINE STORE',
    },
    {
        id: 'casual-top-hoodie',
        name: 'Little Closet 10cm用 ゆるふわパーカー',
        aiPrompt: 'oversized cozy soft pink hoodie, casual relaxed streetwear',
        category: ITEM_CATEGORIES.SET,
        style: [STYLE_TYPES.CASUAL],
        sizeRange: { minHeight: 10, maxHeight: 15 },
        price: '¥1,540',
        imageUrl: 'https://base-ec2if.akamaized.net/images/item/origin/881add3e6b0067863a545186e22b9ca2.jpg?width=500',
        purchaseUrl: 'https://littlecloset.shopselect.net/items/63345864',
        shopName: 'Little Closet',
    },
    {
        id: 'casual-hat-2',
        name: 'WEGO ぬいニット帽',
        aiPrompt: 'cozy knitted beanie hat, casual winter accessory',
        category: ITEM_CATEGORIES.HAT,
        style: [STYLE_TYPES.CASUAL],
        sizeRange: { minHeight: 8, maxHeight: 15 },
        price: '¥770',
        imageUrl: 'https://cdn.shopify.com/s/files/1/0578/9456/8136/files/LG24SS03-G0095sub03.JPG',
        purchaseUrl: 'https://wego.jp/products/lg24ss03-g0095',
        shopName: 'WEGO ONLINE STORE',
    },
    {
        id: 'casual-acc-1',
        name: 'WEGO 10cm ぬいリュック',
        aiPrompt: 'small cute backpack accessory worn on the back',
        category: ITEM_CATEGORIES.ACCESSORY,
        style: [STYLE_TYPES.CASUAL],
        sizeRange: { minHeight: 10, maxHeight: 20 },
        price: '¥1,499',
        imageUrl: 'https://wego.jp/cdn/shop/files/LG25AW10-G0173sub07.jpg',
        purchaseUrl: 'https://wego.jp/products/lg25aw10-g0173',
        shopName: 'WEGO ONLINE STORE',
    },
    {
        id: 'casual-set-sporty',
        name: 'WEGO 10cm ぬいスポーティセットアップ',
        aiPrompt: 'red and white sporty track suit, casual athletic wear',
        category: ITEM_CATEGORIES.SET,
        style: [STYLE_TYPES.CASUAL],
        sizeRange: { minHeight: 10, maxHeight: 15 },
        price: '¥1,999',
        imageUrl: 'https://wego.jp/cdn/shop/files/LG25AW10-G0172sub02.jpg',
        purchaseUrl: 'https://wego.jp/products/lg25aw10-g0172',
        shopName: 'WEGO ONLINE STORE',
    },

    // --- FORMAL (Dressed up) ---
    {
        id: 'formal-set-1',
        name: 'WEGO 10cm ぬいリボンメイドセット',
        aiPrompt: 'cute black and white maid dress with white apron, formal cute outfit',
        category: ITEM_CATEGORIES.SET,
        style: [STYLE_TYPES.FORMAL, STYLE_TYPES.CUTE],
        sizeRange: { minHeight: 10, maxHeight: 18 },
        price: '¥1,599',
        imageUrl: 'https://wego.jp/cdn/shop/files/LG25AW10-G0174sub03.jpg',
        purchaseUrl: 'https://wego.jp/products/lg25aw10-g0174',
        shopName: 'WEGO ONLINE STORE',
    },
    {
        id: 'formal-dress-tux',
        name: 'Little Closet 10cm タキシードセット',
        aiPrompt: 'elegant luxury tuxedo suit, white shirt, black bow tie, formal gentleman attire',
        category: ITEM_CATEGORIES.SET,
        style: [STYLE_TYPES.FORMAL],
        sizeRange: { minHeight: 10, maxHeight: 12 },
        price: '¥2,800',
        imageUrl: 'https://base-ec2if.akamaized.net/images/item/origin/881add3e6b0067863a545186e22b9ca2.jpg?width=500',
        purchaseUrl: 'https://littlecloset.shopselect.net/items/54784260',
        shopName: 'Little Closet',
    },
    {
        id: 'formal-acc-shoe',
        name: 'Little Closet 10cm用 ローファー',
        aiPrompt: 'shiny black leather loafer shoes',
        category: ITEM_CATEGORIES.ACCESSORY,
        style: [STYLE_TYPES.FORMAL, STYLE_TYPES.MODE],
        sizeRange: { minHeight: 10, maxHeight: 15 },
        price: '¥1,650',
        imageUrl: 'https://base-ec2if.akamaized.net/images/item/origin/881add3e6b0067863a545186e22b9ca2.jpg?width=500',
        purchaseUrl: 'https://littlecloset.shopselect.net/items/63345864',
        shopName: 'Little Closet',
    },

    // --- CUTE (Adorable) ---
    {
        id: 'cute-set-bear',
        name: 'Little Closet ぬいくまさん着ぐるみ',
        aiPrompt: 'fluffy brown teddy bear onesie costume, cute fluffy hoodie suit',
        category: ITEM_CATEGORIES.SET,
        style: [STYLE_TYPES.CUTE],
        sizeRange: { minHeight: 9, maxHeight: 14 },
        price: '¥1,980',
        imageUrl: 'https://base-ec2if.akamaized.net/images/item/origin/881add3e6b0067863a545186e22b9ca2.jpg?width=500',
        purchaseUrl: 'https://littlecloset.shopselect.net/items/54784260',
        shopName: 'Little Closet',
    },
    {
        id: 'cute-hat-1',
        name: 'WEGO ぬいきぐるみ (トナカイ)',
        aiPrompt: 'cute reindeer costume hood with antlers, cozy cute hat',
        category: ITEM_CATEGORIES.HAT,
        style: [STYLE_TYPES.CUTE, STYLE_TYPES.CASUAL],
        sizeRange: { minHeight: 10, maxHeight: 15 },
        price: '¥1,099',
        imageUrl: 'https://wego.jp/cdn/shop/files/LG25AW11-G0227main021.jpg?v=1762912974&width=500',
        purchaseUrl: 'https://wego.jp/products/lg25aw11-g0227',
        shopName: 'WEGO ONLINE STORE',
    },
    {
        id: 'cute-acc-pouch',
        name: 'Little Closet 10cm用 くまさんポシェット',
        category: ITEM_CATEGORIES.ACCESSORY,
        style: [STYLE_TYPES.CUTE],
        sizeRange: { minHeight: 10, maxHeight: 18 },
        price: '¥1,320',
        imageUrl: 'https://base-ec2if.akamaized.net/images/item/origin/881add3e6b0067863a545186e22b9ca2.jpg?width=500',
        purchaseUrl: 'https://littlecloset.shopselect.net/items/54784260',
        shopName: 'Little Closet',
    },
    {
        id: 'cute-hat-bunny',
        name: 'Little Closet ぬい耳うさぎさんぼうし',
        aiPrompt: 'white fluffy bunny ear hat, cute soft headwear',
        category: ITEM_CATEGORIES.HAT,
        style: [STYLE_TYPES.CUTE],
        sizeRange: { minHeight: 10, maxHeight: 15 },
        price: '¥1,200',
        imageUrl: 'https://base-ec2if.akamaized.net/images/item/origin/881add3e6b0067863a545186e22b9ca2.jpg?width=500',
        purchaseUrl: 'https://littlecloset.shopselect.net/items/54784260',
        shopName: 'Little Closet',
    },
];

/**
 * Enhanced logic to get diverse and "optimal" recommendations:
 * 1. Filter by size and style.
 * 2. Group by category to ensure variety.
 * 3. Pick a "Main Item" (SET or TOP/BOTTOM) first.
 * 4. Fill remaining slots with unique accessory categories (HAT, ACCESSORY).
 */
export const getRecommendations = (plushieHeight, desiredStyle, count = 4) => {
    // 1. Filter valid items
    const matched = MOCK_ITEMS.filter(item => {
        if (item.sizeRange) {
            if (plushieHeight < item.sizeRange.minHeight || plushieHeight > item.sizeRange.maxHeight) {
                return false;
            }
        }
        return item.style.includes(desiredStyle);
    });

    // Shuffle pool
    const pool = matched.sort(() => 0.5 - Math.random());

    const selected = [];
    const usedCategories = new Set();

    // 2. Pick the "Main Item" (Set or Top/Bottom combination)
    // We prioritize SET because it's a complete look for AI rendering.
    const mainItem = pool.find(i => i.category === ITEM_CATEGORIES.SET) ||
        pool.find(i => i.category === ITEM_CATEGORIES.TOP) ||
        pool[0];

    if (mainItem) {
        selected.push(mainItem);
        usedCategories.add(mainItem.category);
    }

    // 3. Diversify remaining slots
    for (const item of pool) {
        if (selected.length >= count) break;
        if (selected.find(s => s.id === item.id)) continue;

        // Try to avoid duplicate categories for maximum style variety
        if (!usedCategories.has(item.category)) {
            selected.push(item);
            usedCategories.add(item.category);
        }
    }

    // 4. Fill if still empty (allow category repeat if pool is small)
    for (const item of pool) {
        if (selected.length >= count) break;
        if (selected.find(s => s.id === item.id)) continue;
        selected.push(item);
    }

    return selected;
};
