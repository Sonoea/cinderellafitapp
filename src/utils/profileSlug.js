import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Convert a display name to a URL-safe slug.
 * e.g. "うなえさん" → "unaesan" (romanized)
 * e.g. "John Doe" → "john-doe"
 * For Japanese text, we use a simple transliteration approach.
 */
export function generateSlugFromName(name) {
    if (!name) return '';

    // Hiragana → Romaji mapping
    const hiraganaMap = {
        'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
        'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
        'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
        'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
        'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
        'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
        'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
        'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
        'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
        'わ': 'wa', 'を': 'wo', 'ん': 'n',
        'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
        'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
        'だ': 'da', 'ぢ': 'di', 'づ': 'du', 'で': 'de', 'ど': 'do',
        'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
        'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
        'きゃ': 'kya', 'きゅ': 'kyu', 'きょ': 'kyo',
        'しゃ': 'sha', 'しゅ': 'shu', 'しょ': 'sho',
        'ちゃ': 'cha', 'ちゅ': 'chu', 'ちょ': 'cho',
        'にゃ': 'nya', 'にゅ': 'nyu', 'にょ': 'nyo',
        'ひゃ': 'hya', 'ひゅ': 'hyu', 'ひょ': 'hyo',
        'みゃ': 'mya', 'みゅ': 'myu', 'みょ': 'myo',
        'りゃ': 'rya', 'りゅ': 'ryu', 'りょ': 'ryo',
        'ぎゃ': 'gya', 'ぎゅ': 'gyu', 'ぎょ': 'gyo',
        'じゃ': 'ja', 'じゅ': 'ju', 'じょ': 'jo',
        'びゃ': 'bya', 'びゅ': 'byu', 'びょ': 'byo',
        'ぴゃ': 'pya', 'ぴゅ': 'pyu', 'ぴょ': 'pyo',
        'っ': '', // handled contextually below
    };

    // Katakana → Hiragana conversion (offset = 0x60)
    const katakanaToHiragana = (str) => {
        return str.replace(/[\u30A1-\u30F6]/g, (ch) =>
            String.fromCharCode(ch.charCodeAt(0) - 0x60)
        ).replace(/ー/g, '');
    };

    // Convert katakana to hiragana first
    let processed = katakanaToHiragana(name);

    // Romanize: try two-char combos first (for きゃ etc.), then single chars
    let result = '';
    let i = 0;
    while (i < processed.length) {
        // Check for っ (geminate consonant)
        if (processed[i] === 'っ' && i + 1 < processed.length) {
            const nextChar = processed[i + 1];
            const twoChar = processed.substring(i + 1, i + 3);
            const romaji = hiraganaMap[twoChar] || hiraganaMap[nextChar];
            if (romaji) {
                result += romaji[0]; // double the first consonant
            }
            i++;
            continue;
        }

        // Try two-char combo
        if (i + 1 < processed.length) {
            const twoChar = processed.substring(i, i + 2);
            if (hiraganaMap[twoChar]) {
                result += hiraganaMap[twoChar];
                i += 2;
                continue;
            }
        }

        // Single char
        if (hiraganaMap[processed[i]]) {
            result += hiraganaMap[processed[i]];
            i++;
            continue;
        }

        // Keep ASCII characters
        result += processed[i];
        i++;
    }

    // Clean up: lowercase, replace spaces/special chars with hyphens, remove non-alphanumeric
    return result
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        || 'user';
}

/**
 * Generate a unique profileSlug for a user.
 * If the slug already exists in Firestore, append a number.
 */
export async function generateUniqueSlug(displayName, currentUserId = null) {
    const baseSlug = generateSlugFromName(displayName);
    if (!baseSlug) return `user-${Date.now()}`;

    // Check if the slug is already taken
    let slug = baseSlug;
    let counter = 1;

    while (true) {
        const q = query(collection(db, 'users'), where('profileSlug', '==', slug));
        const snapshot = await getDocs(q);

        // If no docs found, or the only doc is the current user, it's available
        if (snapshot.empty) break;
        if (currentUserId && snapshot.size === 1 && snapshot.docs[0].id === currentUserId) break;

        counter++;
        slug = `${baseSlug}-${counter}`;

        // Safety limit
        if (counter > 100) {
            slug = `${baseSlug}-${Date.now()}`;
            break;
        }
    }

    return slug;
}
