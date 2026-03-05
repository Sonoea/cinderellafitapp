import express from 'express';
import cors from 'cors';
import * as cheerio from 'cheerio';
import axios from 'axios';
import iconv from 'iconv-lite';

const app = express();

app.use(cors());
app.use(express.json());

// Ensure UTF-8 encoding for all JSON responses
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

// Multiple User-Agent strings for rotation
const USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
];

// Robust fetch with retry and User-Agent rotation
async function fetchWithRetry(url, maxRetries = 3) {
    let lastError = null;

    for (let i = 0; i < maxRetries; i++) {
        const userAgent = USER_AGENTS[i % USER_AGENTS.length];

        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1',
                    'Referer': new URL(url).origin + '/',
                },
                timeout: 8000, // Reduced to 8s to avoid Vercel Hobby 10s timeout
                maxRedirects: 5,
                validateStatus: (status) => status < 500,
                responseType: 'arraybuffer', // Get raw bytes to handle encoding
                maxContentLength: 5 * 1024 * 1024, // Limit to 5MB
            });

            if (response.status === 200) {
                const buffer = Buffer.from(response.data);
                let encoding = 'utf-8';

                const contentType = response.headers['content-type'] || '';
                const charsetMatch = contentType.match(/charset=([^;]+)/i);
                if (charsetMatch) {
                    encoding = charsetMatch[1].trim().toLowerCase();
                }

                if (encoding === 'utf-8') {
                    const preview = buffer.toString('ascii', 0, Math.min(buffer.length, 2000));
                    const metaMatch = preview.match(/<meta[^>]+charset=["']?([^"'>\s]+)/i) ||
                        preview.match(/<meta[^>]+content=["'][^"']*charset=([^"';\s]+)/i);
                    if (metaMatch) {
                        encoding = metaMatch[1].toLowerCase();
                    }
                }

                const encodingMap = {
                    'shift_jis': 'Shift_JIS',
                    'shift-jis': 'Shift_JIS',
                    'shiftjis': 'Shift_JIS',
                    'sjis': 'Shift_JIS',
                    's-jis': 'Shift_JIS',
                    'x-sjis': 'Shift_JIS',
                    'euc-jp': 'EUC-JP',
                    'eucjp': 'EUC-JP',
                    'x-euc-jp': 'EUC-JP',
                    'iso-2022-jp': 'ISO-2022-JP',
                };
                encoding = encodingMap[encoding] || encoding;

                let html;
                if (iconv.encodingExists(encoding)) {
                    html = iconv.decode(buffer, encoding);
                } else {
                    html = buffer.toString('utf-8');
                }

                console.log(`Decoded ${url} with encoding: ${encoding}`);
                return { ...response, data: html };
            }

            console.log(`Attempt ${i + 1} returned status ${response.status}, trying different approach...`);
            lastError = new Error(`HTTP ${response.status}`);

        } catch (error) {
            console.log(`Attempt ${i + 1} failed: ${error.message}, retrying...`);
            lastError = error;
            await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
        }
    }

    throw lastError || new Error('All fetch attempts failed');
}

// Localization
const MESSAGES = {
    jp: {
        TARGET_PERFECT: (v) => `${v}cm用です。身長はぴったりです！`,
        TARGET_TOO_SMALL: (v) => `対象サイズ(${v}cm)よりかなり大きいです。身長が入りません。`,
        TARGET_TOO_BIG: (v) => `対象サイズ(${v}cm)よりかなり小さいです。身長に対しブカブカです。`,
        TARGET_TIGHT: (v, diff) => `対象サイズ(${v}cm)より身長が${diff}cm大きいです。少しキツいかもしれません。`,
        TARGET_LOOSE: (v, diff) => `対象サイズ(${v}cm)より身長が${diff}cm小さいです。少し余裕があります。`,
        RANGE_PERFECT: (min, max) => `${min}〜${max}cm対応です。身長は範囲内です！`,
        RANGE_LOOSE: (min, max) => `${min}〜${max}cm対応です。身長に対しブカブカの可能性があります。`,
        RANGE_TIGHT: (min, max) => `${min}〜${max}cm対応です。身長がキツい可能性があります。`,
        EST_PERFECT: (min, max) => `サイズ表記から推測（${min}〜${max}cm程度）。身長は合いそうです。`,
        EST_LOOSE: (v) => `サイズ表記から推測（${v}cm前後）。身長に対しブカブカの可能性があります。`,
        EST_TIGHT: (v) => `サイズ表記から推測（${v}cm前後）。身長がキツい可能性があります。`,
        LEN_PERFECT: (v) => `着丈(${v}cm)が身長に近いため、全身が入る可能性があります。`,
        LEN_SHORT: (v) => `着丈(${v}cm)は身長より短いです。`,
        LEN_LOOSE: (v) => `着丈(${v}cm)が身長より長いです。`,
        HEAD_TIGHT: (p, m) => `頭囲(${p}cm)が帽子/フード(${m}cm)より大きいです。入りません。`,
        HEAD_WARN_TIGHT: (p, m) => `頭囲(${p}cm)が帽子/フード(${m}cm)ギリギリです。`,
        HEAD_LOOSE: (p, m) => `頭囲(${p}cm)が帽子/フード(${m}cm)よりかなり小さいです。帽子がブカブカかもしれません。`,
        HEAD_OK: (p, m) => `頭囲(${p}cm)は帽子/フード(${m}cm)に入ります。`,
        CHEST_TIGHT: (p, m) => `胴囲(${p}cm)が服の身幅(${m}cm)より大きいです。ジッパーが閉まらないかも。`,
        CHEST_LOOSE: (p, m) => `胴囲(${p}cm)が服の身幅(${m}cm)より細いです。お腹周りがブカブカかもしれません。`,
        CHEST_OK: (p, m) => `胴囲(${p}cm)は身幅(${m}cm)に収まります。`,
        NECK_TIGHT: (p, m) => `首周り(${p}cm)が襟(${m}cm)より太いです。`,
        NECK_LOOSE: (p, m) => `首周り(${p}cm)が襟(${m}cm)に対し細すぎます。`,
        NECK_OK: (p, m) => `首周りOK。`,
    },
    en: {
        TARGET_PERFECT: (v) => `Made for ${v}cm. Perfect height match!`,
        TARGET_TOO_SMALL: (v) => `Your plushie is much larger than target size (${v}cm). Won't fit.`,
        TARGET_TOO_BIG: (v) => `Your plushie is much smaller than target size (${v}cm). Too loose.`,
        TARGET_TIGHT: (v, diff) => `Plushie is ${diff}cm taller than target (${v}cm). Might be tight.`,
        TARGET_LOOSE: (v, diff) => `Plushie is ${diff}cm shorter than target (${v}cm). Might be loose.`,
        RANGE_PERFECT: (min, max) => `Fits ${min}-${max}cm. Height is within range!`,
        RANGE_LOOSE: (min, max) => `Fits ${min}-${max}cm. Might be loose for your plushie.`,
        RANGE_TIGHT: (min, max) => `Fits ${min}-${max}cm. Might be tight for your plushie.`,
        EST_PERFECT: (min, max) => `Inferred size (${min}-${max}cm). Seems to fit.`,
        EST_LOOSE: (v) => `Inferred size (~${v}cm). Likely too loose.`,
        EST_TIGHT: (v) => `Inferred size (~${v}cm). Likely too tight.`,
        LEN_PERFECT: (v) => `Item length (${v}cm) is close to plushie height. Likely fits.`,
        LEN_SHORT: (v) => `Item length (${v}cm) is shorter than plushie height.`,
        LEN_LOOSE: (v) => `Item length (${v}cm) is longer than plushie.`,
        HEAD_TIGHT: (p, m) => `Head girth (${p}cm) > Hood/Hat (${m}cm). Won't fit.`,
        HEAD_WARN_TIGHT: (p, m) => `Head girth (${p}cm) is very close to Hood/Hat (${m}cm).`,
        HEAD_LOOSE: (p, m) => `Head girth (${p}cm) is much smaller than Hood/Hat (${m}cm).`,
        HEAD_OK: (p, m) => `Head girth (${p}cm) fits locally in Hood/Hat (${m}cm).`,
        CHEST_TIGHT: (p, m) => `Waist (${p}cm) > Item Width (${m}cm). Zipper might not close.`,
        CHEST_LOOSE: (p, m) => `Waist (${p}cm) < Item Width (${m}cm). Might be baggy.`,
        CHEST_OK: (p, m) => `Waist (${p}cm) fits within Item Width (${m}cm).`,
        NECK_TIGHT: (p, m) => `Neck (${p}cm) is thicker than Item Neck (${m}cm).`,
        NECK_LOOSE: (p, m) => `Neck (${p}cm) is much thinner than Item Neck (${m}cm).`,
        NECK_OK: (p, m) => `Neck fits OK.`,
    }
};

// Extract size information from text
function extractSizeInfo(text, title = '', extraData = {}) {
    const results = {
        dimensions: [],
        sizeRanges: [],
        rawMatches: [],
        targetPlushieSize: null,
        measurements: {
            neck: null, chest: null, bodyWidth: null, length: null, armhole: null, head: null,
            sleeveLength: null, shoulderWidth: null, hemWidth: null, inseam: null, hip: null,
        },
        bodyType: { detected: null, keywords: [] },
        clothingType: null,
        missingInfo: [],
    };

    // Process Extra Data (e.g. WEGO/Shopify Metafields)
    if (extraData.metafields && Array.isArray(extraData.metafields)) {
        for (const meta of extraData.metafields) {
            if (!meta) continue;
            // Iterate all size values (F, S, M, etc.)
            Object.values(meta).forEach(parts => {
                if (Array.isArray(parts)) {
                    parts.forEach(p => {
                        if (p.partName && p.measuring) {
                            const val = parseFloat(p.measuring);
                            if (!isNaN(val)) {
                                if (p.partName.includes('首周り')) results.measurements.neck = val;
                                if (p.partName.includes('顔周り')) results.measurements.head = val; // Face girth or Hood opening
                                if (p.partName.includes('胸囲') || p.partName.includes('バスト')) results.measurements.chest = val;
                                if (p.partName.includes('身幅')) results.measurements.bodyWidth = val;
                                if (p.partName.includes('着丈') || p.partName.includes('全長')) results.measurements.length = val;
                                if (p.partName.includes('そで周り') || p.partName.includes('袖周り')) results.measurements.armhole = val; // Rough approx
                            }
                        }
                    });
                }
            });
        }
    }

    const usedValues = new Set();
    const cleanText = text.replace(/\s+/g, ' ').trim();
    const cleanTitle = title.replace(/\s+/g, ' ').trim();

    if (/ドレス|ワンピース|メイド服|チャイナ服|チャイナドレス|浴衣|甚平|着物|袴/.test(cleanText)) results.clothingType = 'dress';
    else if (/トップス|シャツ|Tシャツ|セーター|スモック|ベスト/.test(cleanText)) results.clothingType = 'tops';
    else if (/帽子|ハット|ベレー|キャップ|ヘッドドレス|ヘアバンド|カチューシャ/.test(cleanText)) results.clothingType = 'hat';
    else if (/マフラー|スカーフ|ネクタイ|蝶ネクタイ|リボン/.test(cleanText)) results.clothingType = 'accessories';
    else if (/コート|ジャケット|パーカー|アウター|ポンチョ|ケープ|着ぐるみ/.test(cleanText)) results.clothingType = 'outerwear';
    else if (/パンツ|ズボン|スカート/.test(cleanText)) results.clothingType = 'bottoms';

    const bodyTypeKeywords = {
        slim: ['細身', 'スリム', 'すらっと', 'スレンダー', '細め'],
        round: ['ぽっちゃり', 'ふっくら', 'むちむち', '丸い', 'まるっと', 'コロン'],
        normal: ['標準', 'ノーマル', '普通体型'],
    };

    for (const [type, keywords] of Object.entries(bodyTypeKeywords)) {
        for (const kw of keywords) {
            if (cleanText.includes(kw)) {
                results.bodyType.keywords.push(kw);
                if (!results.bodyType.detected) results.bodyType.detected = type;
            }
        }
    }

    // Flexible regex components
    const sep = '[：:\\-→\\s]*約?\\s*'; // Added arrow and hyphen, allow space
    const num = '(\\d+\\.?\\d*)';
    const range = '(?:[～~\\-](\\d+\\.?\\d*))?';
    // Unit: Added inch variants. 'in' requires strict boundary to avoid substring matches.
    const unit = '\\s*(?:cm|センチ|mm|inch|インチ|in|"|”)?';

    const toCm = (val, matchStr) => {
        if (!val) return null;
        // Check if the MATCHED STRING contains inch keywords
        if (/inch|インチ|in\b|"|”/i.test(matchStr)) {
            return parseFloat((val * 2.54).toFixed(1));
        }
        if (/mm/i.test(matchStr)) {
            return parseFloat((val * 0.1).toFixed(1));
        }
        // Default to cm if no unit (or explicit cm)
        return val;
    };

    // 1. Head / Hood
    const headRegex = new RegExp(`(頭|フード|カチューシャ)(?:囲|周り|まわり)?${sep}${num}${range}${unit}`, 'i');
    const headMatch = cleanText.match(headRegex);
    if (headMatch) {
        const minRaw = parseFloat(headMatch[3]);
        const maxRaw = headMatch[4] ? parseFloat(headMatch[4]) : minRaw;
        const min = toCm(minRaw, headMatch[0]);
        const max = toCm(maxRaw, headMatch[0]);
        results.measurements.head = { min, max };
        usedValues.add(Math.floor(min));
    }

    // 2. Neck - handles (首周り)約10～12cm format
    const neckRegex = new RegExp(`[（(]?首(?:周り|まわり|囲)?[）)]?${sep}${num}${range}${unit}`, 'i');
    const neckMatch = cleanText.match(neckRegex);
    if (neckMatch) {
        const minRaw = parseFloat(neckMatch[1]);
        const maxRaw = neckMatch[2] ? parseFloat(neckMatch[2]) : minRaw;
        const min = toCm(minRaw, neckMatch[0]);
        const max = toCm(maxRaw, neckMatch[0]);
        results.measurements.neck = { min, max };
        usedValues.add(Math.floor(min));
    }

    // 3. Chest / Bust / Waist - handles (ウエスト)約11～14cm format
    const chestRegex = new RegExp(`[（(]?(胴囲|胴回り|胴周り|バスト|胸囲|ウエスト|ウェスト|腹囲|おなか周り)[）)]?${sep}${num}${range}${unit}`, 'i');
    const chestMatch = cleanText.match(chestRegex);
    if (chestMatch) {
        const minRaw = parseFloat(chestMatch[2]);
        const maxRaw = chestMatch[3] ? parseFloat(chestMatch[3]) : minRaw;
        const min = toCm(minRaw, chestMatch[0]);
        const max = toCm(maxRaw, chestMatch[0]);
        results.measurements.chest = { min, max };
        usedValues.add(Math.floor(min));
    }

    // 4. Width / Hem
    const widthRegex = new RegExp(`[（(]?(身幅|横幅)[）)]?${sep}${num}${range}${unit}`, 'i');
    const widthMatch = cleanText.match(widthRegex);
    if (widthMatch) {
        const minRaw = parseFloat(widthMatch[2]);
        const maxRaw = widthMatch[3] ? parseFloat(widthMatch[3]) : minRaw;
        const min = toCm(minRaw, widthMatch[0]);
        const max = toCm(maxRaw, widthMatch[0]);
        results.measurements.bodyWidth = { min, max };
        usedValues.add(Math.floor(min));
    }

    // 4b. Hem Width (裾幅)
    const hemRegex = new RegExp(`[（(]?(裾幅|裾周り)[）)]?${sep}${num}${range}${unit}`, 'i');
    const hemMatch = cleanText.match(hemRegex);
    if (hemMatch) {
        const minRaw = parseFloat(hemMatch[2]);
        const maxRaw = hemMatch[3] ? parseFloat(hemMatch[3]) : minRaw;
        const min = toCm(minRaw, hemMatch[0]);
        const max = toCm(maxRaw, hemMatch[0]);
        results.measurements.hemWidth = { min, max };
    }

    // 4c. Shoulder Width (肩幅)
    const shoulderRegex = new RegExp(`[（(]?(肩幅|肩巾)[）)]?${sep}${num}${range}${unit}`, 'i');
    const shoulderMatch = cleanText.match(shoulderRegex);
    if (shoulderMatch) {
        const minRaw = parseFloat(shoulderMatch[2]);
        const maxRaw = shoulderMatch[3] ? parseFloat(shoulderMatch[3]) : minRaw;
        const min = toCm(minRaw, shoulderMatch[0]);
        const max = toCm(maxRaw, shoulderMatch[0]);
        results.measurements.shoulderWidth = { min, max };
    }

    // 4d. Sleeve Length (袖丈)
    const sleeveRegex = new RegExp(`[（(]?(袖丈|そで丈)[）)]?${sep}${num}${range}${unit}`, 'i');
    const sleeveMatch = cleanText.match(sleeveRegex);
    if (sleeveMatch) {
        const minRaw = parseFloat(sleeveMatch[2]);
        const maxRaw = sleeveMatch[3] ? parseFloat(sleeveMatch[3]) : minRaw;
        const min = toCm(minRaw, sleeveMatch[0]);
        const max = toCm(maxRaw, sleeveMatch[0]);
        results.measurements.sleeveLength = { min, max };
    }

    // 4e. Armhole / Sleeve Opening (袖口・そで周り)
    const armholeRegex = new RegExp(`[（(]?(袖口|そで周り|袖周り|アームホール)[）)]?${sep}${num}${range}${unit}`, 'i');
    const armholeMatch = cleanText.match(armholeRegex);
    if (armholeMatch) {
        const minRaw = parseFloat(armholeMatch[2]);
        const maxRaw = armholeMatch[3] ? parseFloat(armholeMatch[3]) : minRaw;
        const min = toCm(minRaw, armholeMatch[0]);
        const max = toCm(maxRaw, armholeMatch[0]);
        results.measurements.armhole = { min, max };
    }

    // 4f. Hip (ヒップ)
    const hipRegex = new RegExp(`[（(]?(ヒップ|おしり周り|お尻周り)[）)]?${sep}${num}${range}${unit}`, 'i');
    const hipMatch = cleanText.match(hipRegex);
    if (hipMatch) {
        const minRaw = parseFloat(hipMatch[2]);
        const maxRaw = hipMatch[3] ? parseFloat(hipMatch[3]) : minRaw;
        const min = toCm(minRaw, hipMatch[0]);
        const max = toCm(maxRaw, hipMatch[0]);
        results.measurements.hip = { min, max };
    }

    // 4g. Inseam (股下)
    const inseamRegex = new RegExp(`[（(]?(股下|股上|またした)[）)]?${sep}${num}${range}${unit}`, 'i');
    const inseamMatch = cleanText.match(inseamRegex);
    if (inseamMatch) {
        const minRaw = parseFloat(inseamMatch[2]);
        const maxRaw = inseamMatch[3] ? parseFloat(inseamMatch[3]) : minRaw;
        const min = toCm(minRaw, inseamMatch[0]);
        const max = toCm(maxRaw, inseamMatch[0]);
        results.measurements.inseam = { min, max };
    }

    // 5. Length / Height (Item dimensions)
    // Japanese keys: optional unit
    const lengthRegexJP = new RegExp(`(着丈|身丈|丈|全長|高さ|タテ|縦)${sep}${num}${unit}`, 'i');
    const lengthMatchJP = cleanText.match(lengthRegexJP);
    if (lengthMatchJP) {
        const raw = parseFloat(lengthMatchJP[2]);
        const val = toCm(raw, lengthMatchJP[0]);
        if (val < 100) { // Safety cap (100cm covers big plushies)
            results.measurements.length = val;
            usedValues.add(Math.floor(val));
        }
    }

    // English keys (H): mandatory unit to avoid "height: 100%"
    if (!results.measurements.length) {
        const lengthRegexEN = new RegExp(`(H|Height)${sep}${num}\\s*(?:cm|センチ|mm|inch|インチ|in|"|")`, 'i'); // Mandatory unit
        const lengthMatchEN = cleanText.match(lengthRegexEN);
        if (lengthMatchEN) {
            const raw = parseFloat(lengthMatchEN[2]);
            const val = toCm(raw, lengthMatchEN[0]);
            if (val < 100) {
                results.measurements.length = val;
                usedValues.add(Math.floor(val));
            }
        }
    }

    // 5b. 本体サイズ format: "本体サイズ(約)：トップス/55×100mm" or "本体サイズ：40×65mm"
    // Extract the larger dimension as approximate length/height
    if (!results.measurements.length) {
        const bodySize = cleanText.match(/本体サイズ[^:：]*[：:]\s*(?:[^/／]*[/／])?\s*(\d+)\s*[×xX]\s*(\d+)\s*mm/i);
        if (bodySize) {
            const dim1 = parseFloat(bodySize[1]) * 0.1; // mm to cm
            const dim2 = parseFloat(bodySize[2]) * 0.1; // mm to cm
            const maxDim = Math.max(dim1, dim2);
            if (maxDim >= 5 && maxDim <= 30) { // Reasonable plushie clothing size
                results.measurements.length = parseFloat(maxDim.toFixed(1));
                console.log(`[SIZE] 本体サイズ detected: ${dim1}×${dim2}cm -> length ${maxDim}cm`);
            }
        }
    }

    // 6. Target Plushie Size (Nui Size) - IMPROVED PATTERNS
    // Supports many Japanese patterns:
    // - "20cmぬい服", "15cmぬいぐるみ用", "12cm用"
    // - "10/12cmぬい", "15,20cmぬい"
    // - "10cm～12cm対応", "15~20cm用"
    // - "【15cm】", "【10-20cm】" in titles
    // - "身長17cmのぬいぐるみ用"
    // - "12-16 Inch Bears"

    const unitPattern = '(?:\\s*(?:cm|センチ|ｃｍ|mm|inch|インチ|in|"|"))?';

    // Pattern 1: Range with separator (10～20cm, 10-20cm, 10~20cm用, etc.)
    const rangePatterns = [
        // "10cm～20cm用" or "10～20cm用"
        new RegExp(`(\\d{1,2})${unitPattern}\\s*[～~\\-−ー]\\s*(\\d{1,2})\\s*(?:cm|センチ|ｃｍ)\\s*(?:ぬい(?:ぐるみ)?|用|対応|サイズ|服)`, 'i'),
        // "10cm,20cm ぬい" or "10/20cm ぬい"
        new RegExp(`(\\d{1,2})\\s*(?:cm|センチ|ｃｍ)?\\s*[/,、]\\s*(\\d{1,2})\\s*(?:cm|センチ|ｃｍ)\\s*(?:ぬい(?:ぐるみ)?|用|対応|サイズ|服)`, 'i'),
        // Title pattern 【10-20cm】
        new RegExp(`【\\s*(\\d{1,2})\\s*(?:cm)?\\s*[～~\\-−ー/,]?\\s*(\\d{1,2})?\\s*(?:cm)?\\s*】`, 'i'),
        // "12-16 Inch Bears/Plush"
        new RegExp(`(\\d{1,2})\\s*[～~\\-−ー]\\s*(\\d{1,2})\\s*(?:inch|インチ|in|"|")\\s*(?:Bears?|Plush(?:ies?)?|Stuffed|Dolls?|Toys?)`, 'i'),
    ];

    // Pattern 2: Single size with keywords
    const singlePatterns = [
        // "20cmぬい服", "15cmぬい", "12cmぬいぐるみ用"
        new RegExp(`(\\d{1,2})\\s*(?:cm|センチ|ｃｍ)\\s*(?:ぬい(?:ぐるみ)?(?:服|用)?|用|対応|サイズ|向け)`, 'i'),
        // "身長15cmぬいぐるみ" or "ぬい身長15cm"
        new RegExp(`身長\\s*(\\d{1,2})\\s*(?:cm|センチ|ｃｍ)`, 'i'),
        // "ぬい 15cm" or "ぬいぐるみ 20cm"
        new RegExp(`(?:ぬい(?:ぐるみ)?|ドール)\\s*(?:用)?\\s*(\\d{1,2})\\s*(?:cm|センチ|ｃｍ)`, 'i'),
        // Title pattern 【15cm】 single size
        new RegExp(`【\\s*(\\d{1,2})\\s*(?:cm|センチ)?\\s*】`, 'i'),
        // "8 inch plush" or "8\" Bear"
        new RegExp(`(\\d{1,2})\\s*(?:inch|インチ|in|"|")\\s*(?:Bears?|Plush(?:ies?)?|Stuffed|Dolls?|Toys?|ぬい)`, 'i'),
        // "for 15cm plushie" pattern
        new RegExp(`(?:for|fits?)\\s*(\\d{1,2})\\s*(?:cm|inch|in|"|")`, 'i'),
    ];

    // Try range patterns first
    let matched = false;
    for (const regex of rangePatterns) {
        const match = cleanText.match(regex) || cleanTitle.match(regex);
        if (match) {
            let v1 = parseFloat(match[1]);
            let v2 = match[2] ? parseFloat(match[2]) : null;

            v1 = toCm(v1, match[0]);
            if (v2) v2 = toCm(v2, match[0]);

            if (v2 && v2 !== v1) {
                const min = Math.min(v1, v2);
                const max = Math.max(v1, v2);
                results.sizeRanges.push({ min, max });
            } else {
                results.targetPlushieSize = v1;
            }
            matched = true;
            console.log(`[SIZE] Matched range pattern: "${match[0]}" -> ${v1}${v2 ? `-${v2}` : ''}cm`);
            break;
        }
    }

    // Try single patterns if no range found
    if (!matched) {
        for (const regex of singlePatterns) {
            const match = cleanText.match(regex) || cleanTitle.match(regex);
            if (match) {
                let v = toCm(parseFloat(match[1]), match[0]);
                results.targetPlushieSize = v;
                matched = true;
                console.log(`[SIZE] Matched single pattern: "${match[0]}" -> ${v}cm`);
                break;
            }
        }
    }

    // Additional fallback patterns if still not matched
    if (!results.targetPlushieSize && results.sizeRanges.length === 0) {
        // Try to find any "XXcm用" or "XXcmぬい" pattern
        const fallbackMatch = cleanText.match(/(\\d{1,2})\\s*(?:cm|センチ|ｃｍ)\\s*(?:用|対応|向け|着せ替え|ぬい)/i);
        if (fallbackMatch) {
            results.targetPlushieSize = toCm(parseFloat(fallbackMatch[1]), fallbackMatch[0]);
            console.log(`[SIZE] Fallback match: "${fallbackMatch[0]}" -> ${results.targetPlushieSize}cm`);
        } else {
            // Last resort: Look for prominent cm values in title
            const titleCmMatch = cleanTitle.match(/(\d{1,2})\s*(?:cm|センチ|ｃｍ)/i);
            if (titleCmMatch) {
                const val = parseFloat(titleCmMatch[1]);
                if (val >= 8 && val <= 40) { // Reasonable plushie size range
                    results.targetPlushieSize = val;
                    console.log(`[SIZE] Title fallback: "${titleCmMatch[0]}" -> ${val}cm`);
                }
            }
        }
    }

    // Collect all other numbers for fallback analysis
    const cmMatches = cleanText.matchAll(/(\d{1,3})\s*cm/gi);
    for (const match of cmMatches) {
        const val = parseInt(match[1]);
        if (val >= 5 && val <= 50 && !usedValues.has(val) && !results.rawMatches.includes(val)) results.rawMatches.push(val);
    }

    // S/M/L Estimations
    const sizeLabels = cleanText.match(/[SMLsml]サイズ/g);
    if (sizeLabels && !results.targetPlushieSize && results.sizeRanges.length === 0) {
        const label = sizeLabels[0].toUpperCase();
        if (label.includes('S')) results.estimatedTarget = { size: 12, range: [10, 15] };
        if (label.includes('M')) results.estimatedTarget = { size: 20, range: [15, 25] };
        if (label.includes('L')) results.estimatedTarget = { size: 30, range: [25, 40] };
    }

    return results;
}

// Estimate fit logic
function estimateFit(sizeInfo, plushieHeight, plushieInfo = {}, lang = 'jp') {
    // Default to JP if invalid lang
    const T = MESSAGES[lang] || MESSAGES['jp'];

    let status = 'unknown';
    let reasons = [];
    let confidence = 'low';
    let checkPoints = []; // List of specific checks { part: 'Head', status: 'ok'|'tight', msg: '' }

    // --- 1. Height / Main Size Check ---
    let heightStatus = 'unknown';
    let heightReason = '';

    // Check target plushie size first
    if (sizeInfo.targetPlushieSize) {
        const diff = plushieHeight - sizeInfo.targetPlushieSize;
        // Stricter tolerance for small plushies (< 15cm) to prevent "perfect" finding for 12cm plushie -> 10cm item
        const tolerance = sizeInfo.targetPlushieSize < 15 ? 1 : 2;

        if (Math.abs(diff) <= tolerance) {
            heightStatus = 'perfect';
            heightReason = T.TARGET_PERFECT(sizeInfo.targetPlushieSize);
            confidence = 'high';
        } else if (diff > 5) {
            heightStatus = 'tooSmall';
            heightReason = T.TARGET_TOO_SMALL(sizeInfo.targetPlushieSize);
        } else if (diff < -5) {
            heightStatus = 'tooBig';
            heightReason = T.TARGET_TOO_BIG(sizeInfo.targetPlushieSize);
        } else if (diff > tolerance) {
            heightStatus = 'tight';
            heightReason = T.TARGET_TIGHT(sizeInfo.targetPlushieSize, diff.toFixed(1));
        } else if (diff < -tolerance) {
            heightStatus = 'loose';
            heightReason = T.TARGET_LOOSE(sizeInfo.targetPlushieSize, Math.abs(diff).toFixed(1));
        }
    }
    // Check size ranges
    else if (sizeInfo.sizeRanges.length > 0) {
        const { min, max } = sizeInfo.sizeRanges[0];
        if (plushieHeight >= min && plushieHeight <= max) {
            heightStatus = 'perfect';
            heightReason = T.RANGE_PERFECT(min, max);
            confidence = 'high';
        } else if (plushieHeight < min) {
            heightStatus = 'loose';
            heightReason = T.RANGE_LOOSE(min, max);
        } else {
            heightStatus = 'tight';
            heightReason = T.RANGE_TIGHT(min, max);
        }
    }
    // Check estimated target from S/M/L labels
    else if (sizeInfo.estimatedTarget) {
        const { size, range } = sizeInfo.estimatedTarget;
        if (plushieHeight >= range[0] && plushieHeight <= range[1]) {
            heightStatus = 'perfect';
            heightReason = T.EST_PERFECT(range[0], range[1]);
            confidence = 'low';
        } else if (plushieHeight < range[0]) {
            heightStatus = 'loose';
            heightReason = T.EST_LOOSE(size);
        } else {
            heightStatus = 'tight';
            heightReason = T.EST_TIGHT(size);
        }
    }
    // Check specific measurements (length proxy)
    else if (sizeInfo.measurements.length) {
        const diff = Math.abs(plushieHeight - sizeInfo.measurements.length);
        if (diff < 3) {
            heightStatus = 'perfect';
            heightReason = T.LEN_PERFECT(sizeInfo.measurements.length);
            confidence = 'low';
        } else if (sizeInfo.measurements.length > plushieHeight) {
            heightStatus = 'loose';
            heightReason = T.LEN_LOOSE(sizeInfo.measurements.length);
            confidence = 'low';
        } else {
            heightStatus = 'perfect'; // Short length (e.g. shirt) is acceptable
            heightReason = T.LEN_SHORT(sizeInfo.measurements.length);
            confidence = 'low';
        }
    }

    if (heightReason) reasons.push(heightReason);
    status = heightStatus; // Base status often depends on height mainly

    // --- 2. Detailed Body Part Checks ---

    // Head Check (Essential for hoods/hats)
    if (plushieInfo.headGirth && sizeInfo.measurements.head) {
        const pHead = parseFloat(plushieInfo.headGirth);
        const { min: mMin, max: mMax } = sizeInfo.measurements.head;

        let msg = '';
        let st = 'ok';
        // Logic: Plushie Head must be <= Max Hat Size
        if (pHead > mMax) {
            st = 'tight';
            msg = T.HEAD_TIGHT(pHead, mMax);
            if (status === 'perfect') status = 'tight'; // Downgrade perfect status
        } else if (pHead < mMin - 5) {
            st = 'loose';
            msg = T.HEAD_LOOSE(pHead, mMin);
        } else {
            if (Math.abs(pHead - mMax) < 2) msg = T.HEAD_WARN_TIGHT(pHead, mMax);
            else msg = T.HEAD_OK(pHead, mMax);
        }
        checkPoints.push({ part: 'Head', status: st, msg });
        if (st !== 'ok') reasons.push(msg);
    }

    // Chest/Waist Check
    // Plushie 'waist' (usually girth) vs Item 'chest' (girth) OR Item 'bodyWidth' (flat width * 2)
    if (plushieInfo.waist) {
        const pWaist = parseFloat(plushieInfo.waist);
        let itemGirth = null;

        if (sizeInfo.measurements.chest) {
            itemGirth = sizeInfo.measurements.chest;
        } else if (sizeInfo.measurements.bodyWidth) {
            itemGirth = sizeInfo.measurements.bodyWidth * 2;
        }

        if (itemGirth) {
            let msg = '';
            let st = 'ok';
            // Allow 2cm slack usually?
            if (pWaist > itemGirth) {
                st = 'tight';
                msg = T.CHEST_TIGHT(pWaist, itemGirth);
                if (status === 'perfect') status = 'tight';
            } else if (pWaist < itemGirth - 8) { // >8cm diff is quite loose
                st = 'loose';
                msg = T.CHEST_LOOSE(pWaist, itemGirth);
            } else {
                msg = T.CHEST_OK(pWaist, itemGirth);
            }
            checkPoints.push({ part: 'Chest/Waist', status: st, msg });
            if (st !== 'ok') reasons.push(msg);
        }
    }

    // Neck Check
    if (plushieInfo.neck && sizeInfo.measurements.neck) {
        const pNeck = parseFloat(plushieInfo.neck);
        const mNeck = sizeInfo.measurements.neck;

        let msg = '';
        let st = 'ok';
        if (pNeck > mNeck) {
            st = 'tight';
            msg = T.NECK_TIGHT(pNeck, mNeck);
            if (status === 'perfect') status = 'tight';
        } else {
            msg = T.NECK_OK(pNeck, mNeck);
        }
        checkPoints.push({ part: 'Neck', status: st, msg });
        if (st !== 'ok') reasons.push(msg);
    }

    // Final cleanup
    if (status === 'unknown' && reasons.length === 0) {
        reasons.push(lang === 'en' ? 'Could not find size info.' : 'サイズ情報が見つかりませんでした');
    }

    return {
        status,
        confidence,
        reason: reasons.join('\n'), // Join with newlines for display
        details: { targetSize: sizeInfo.targetPlushieSize || (sizeInfo.estimatedTarget?.size), measurements: sizeInfo.measurements },
        warnings: reasons.filter(r => /tight|small|big|loose|won't fit|キツい|大きい|小さい|ブカブカ/i.test(r)), // Heuristic for warnings
        checkPoints
    };
}

// API Routes
app.post('/api/analyze-url', async (req, res) => {
    const { url, plushieHeight, plushieInfo, lang = 'jp' } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    // Specific check for Mercari Shops (SPA)
    if (url.includes('mercari.com/shops/')) {
        return res.status(422).json({
            success: false,
            error: 'MERCARI_SHOPS_NOT_SUPPORTED',
            message: lang === 'en' ? 'Mercari Shops is not supported yet.' : 'メルカリShopsは自動分析に対応していません。'
        });
    }

    try {
        const response = await fetchWithRetry(url);
        const $ = cheerio.load(response.data);

        const title = $('title').text() || '';
        const description = $('meta[name="description"]').attr('content') || '';
        const ogTitle = $('meta[property="og:title"]').attr('content') || '';
        let ogImage = $('meta[property="og:image"]').attr('content') || '';

        // OG imageが無い場合のフォールバック画像取得
        if (!ogImage) {
            // twitter:image
            ogImage = $('meta[name="twitter:image"]').attr('content') || '';
        }
        if (!ogImage) {
            // 商品画像の一般的なセレクタ（優先順位順）
            const imgSelectors = [
                '#slider img', '#slider .swiper-slide img',
                '.item-image img', '.product-image img', '#itemImg img',
                '.main-image img', '.item_image img', '.product_image img',
                '.itemImg img', '.p-goods__image img', '.goods-image img',
                '[class*="product"] img', '[class*="item"] img',
                '.slick-slide img', '.swiper-slide img', '.swiper-container img',
                'img[src*="itemimage"]', 'img[src*="shopimage"]',
                'img[src*="makeshop"]', 'img[data-src*="itemimage"]',
                'img[data-src*="makeshop"]',
            ];
            for (const sel of imgSelectors) {
                const el = $(sel).first();
                const src = el.attr('src') || el.attr('data-src') || el.attr('data-lazy') || el.attr('data-original');
                if (src && src.length > 10 && !src.includes('logo') && !src.includes('icon') && !src.includes('banner') && !src.includes('spacer') && !src.includes('1x1')) {
                    ogImage = src.startsWith('http') ? src : new URL(src, url).href;
                    console.log(`[Image] Found via selector "${sel}":`, ogImage.substring(0, 100));
                    break;
                }
            }
        }
        if (!ogImage) {
            // ページ内のすべてのimgを走査して商品画像を探す
            $('img').each((i, el) => {
                if (ogImage) return;
                const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy') || $(el).attr('data-original') || '';
                // 商品画像っぽいURLをチェック
                const isProductImg = src.includes('itemimage') || src.includes('shopimage') || src.includes('makeshop') || src.includes('product') || src.includes('/item/');
                const w = parseInt($(el).attr('width') || '0');
                const h = parseInt($(el).attr('height') || '0');
                if (src && src.length > 10 && (isProductImg || w >= 200 || h >= 200 || (!w && !h && i < 15))) {
                    if (!src.includes('logo') && !src.includes('icon') && !src.includes('banner') && !src.includes('cart') && !src.includes('spacer') && !src.includes('1x1')) {
                        ogImage = src.startsWith('http') ? src : new URL(src, url).href;
                        console.log(`[Image] Found via img scan (index ${i}):`, ogImage.substring(0, 100));
                    }
                }
            });
        }
        // Increase body text limit to catch tables lower down
        const bodyText = $('body').text().replace(/\s+/g, ' ').substring(0, 20000);

        // Extract JSON Metafields (WEGO etc.)
        let metafields = [];
        $('[data-metafield]').each((i, el) => {
            try {
                const attr = $(el).attr('data-metafield');
                if (attr) {
                    const json = JSON.parse(attr);
                    metafields.push(json);
                }
            } catch (e) { }
        });

        const allText = [title, description, ogTitle, bodyText].join(' ');
        const sizeInfo = extractSizeInfo(allText, ogTitle || title, { metafields });

        let fit = null;
        if (plushieHeight) fit = estimateFit(sizeInfo, plushieHeight, plushieInfo, lang);

        res.json({
            success: true,
            product: { title: ogTitle || title, description, image: ogImage, url },
            sizeInfo,
            fit
        });
    } catch (error) {
        console.error(error);
        res.json({ success: false, error: lang === 'en' ? 'Could not fetch page info (Limit/Timeout).' : 'ページ情報を取得できませんでした（タイムアウトまたはアクセス制限）', suggestion: 'manual_input' });
    }
});

app.post('/api/analyze-text', async (req, res) => {
    const { text, productName, plushieHeight, plushieInfo, lang = 'jp' } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });

    try {
        const sizeInfo = extractSizeInfo(text, productName || '');
        let fit = null;
        if (plushieHeight) fit = estimateFit(sizeInfo, plushieHeight, plushieInfo, lang);

        res.json({
            success: true,
            product: { title: productName || 'Manual Entry', description: text.substring(0, 100), image: null, url: null },
            sizeInfo,
            fit
        });
    } catch (error) {
        res.json({ success: false, error: 'Failed to analyze text' });
    }
});

// Image proxy endpoint — fetches external images server-side to bypass CORS
app.get('/api/proxy-image', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
        const imageUrl = decodeURIComponent(url);
        const response = await axios.get(imageUrl, {
            headers: {
                'User-Agent': USER_AGENTS[0],
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Referer': new URL(imageUrl).origin + '/',
            },
            timeout: 5000,
            responseType: 'arraybuffer',
            maxContentLength: 5 * 1024 * 1024, // 5MB limit
        });

        const contentType = response.headers['content-type'] || 'image/jpeg';
        const base64 = Buffer.from(response.data).toString('base64');
        const dataUri = `data:${contentType};base64,${base64}`;

        res.json({ success: true, dataUri });
    } catch (error) {
        console.error('Image proxy error:', error.message);
        res.json({ success: false, error: 'Failed to fetch image' });
    }
});

// ==== AI試着 — Replicate API (idm-vton) ====
app.post('/api/ai-tryon', async (req, res) => {
    const { plushieImage, garmentImage, garmentDescription, category } = req.body;

    if (!plushieImage || !garmentImage) {
        return res.status(400).json({
            error: 'ぬいぐるみ画像と商品画像が必要です',
        });
    }

    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
        return res.status(500).json({
            error: 'REPLICATE_API_TOKEN が設定されていません。Vercelの環境変数に設定してください。',
        });
    }

    try {
        console.log('[AI Try-On] Starting prediction...');
        console.log('[AI Try-On] plushieImage length:', plushieImage?.length, 'starts with:', plushieImage?.substring(0, 30));
        console.log('[AI Try-On] garmentImage length:', garmentImage?.length, 'starts with:', garmentImage?.substring(0, 30));

        // Replicate API を直接呼び出す（HTTP）
        const createResponse = await axios.post(
            'https://api.replicate.com/v1/models/cuuupid/idm-vton/predictions',
            {
                input: {
                    human_img: plushieImage,
                    garm_img: garmentImage,
                    garment_des: garmentDescription || 'cute plushie clothing',
                    category: category || 'upper_body',
                    crop: false,
                },
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'wait',
                },
                timeout: 120000, // 2分タイムアウト
            }
        );

        // "Prefer: wait" で同期的に結果を待つ
        let prediction = createResponse.data;

        // もし完了していなければポーリング
        if (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
            const predictionId = prediction.id;
            let attempts = 0;
            const maxAttempts = 60; // 最大60回（2分）

            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                attempts++;

                const pollResponse = await axios.get(
                    `https://api.replicate.com/v1/predictions/${predictionId}`,
                    {
                        headers: { 'Authorization': `Bearer ${apiToken}` },
                        timeout: 10000,
                    }
                );

                prediction = pollResponse.data;

                if (prediction.status === 'succeeded' || prediction.status === 'failed') {
                    break;
                }

                console.log(`[AI Try-On] Polling... attempt ${attempts}, status: ${prediction.status}`);
            }
        }

        if (prediction.status === 'succeeded') {
            const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
            console.log('[AI Try-On] Success! Output URL:', outputUrl);

            // 結果画像をdata URIに変換
            try {
                const imageResponse = await axios.get(outputUrl, {
                    responseType: 'arraybuffer',
                    timeout: 15000,
                });
                const contentType = imageResponse.headers['content-type'] || 'image/png';
                const base64 = Buffer.from(imageResponse.data).toString('base64');
                const dataUri = `data:${contentType};base64,${base64}`;

                res.json({
                    success: true,
                    resultImage: dataUri,
                    message: 'AI試着が完了しました！',
                });
            } catch (imgErr) {
                // 画像取得失敗の場合はURLを返す
                res.json({
                    success: true,
                    resultImage: outputUrl,
                    message: 'AI試着が完了しました！',
                });
            }
        } else {
            console.error('[AI Try-On] Failed:', prediction.error);
            res.json({
                success: false,
                error: prediction.error || 'AI試着に失敗しました。別の画像でお試しください。',
            });
        }
    } catch (error) {
        console.error('[AI Try-On] Error:', error.response?.data || error.message);
        const replicateError = error.response?.data?.detail || error.response?.data?.title || '';
        const message = error.response?.status === 401
            ? 'APIキーが無効です。REPLICATE_API_TOKENを確認してください。'
            : error.response?.status === 422
                ? `画像形式エラー: ${replicateError || '画像のサイズや形式を変更してお試しください。'}`
                : `AI試着エラー: ${error.message}`;
        res.json({ success: false, error: message });
    }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Export as default for Vercel
export default app;
