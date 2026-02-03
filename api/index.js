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

// Extract size information from text
function extractSizeInfo(text, title = '') {
    const results = {
        dimensions: [],
        sizeRanges: [],
        rawMatches: [],
        targetPlushieSize: null,
        measurements: {
            neck: null, chest: null, bodyWidth: null, length: null, armhole: null, head: null,
        },
        bodyType: { detected: null, keywords: [] },
        clothingType: null,
        missingInfo: [],
    };

    const usedValues = new Set();
    const cleanText = text.replace(/\s+/g, ' ').trim();
    const cleanTitle = title.replace(/\s+/g, ' ').trim();

    if (/ドレス|ワンピース|メイド服/.test(cleanText)) results.clothingType = 'dress';
    else if (/トップス|シャツ|Tシャツ|セーター|スモック|ベスト/.test(cleanText)) results.clothingType = 'tops';
    else if (/帽子|ハット|ベレー|キャップ|ヘッドドレス/.test(cleanText)) results.clothingType = 'hat';
    else if (/マフラー|スカーフ|ネクタイ|蝶ネクタイ|リボン/.test(cleanText)) results.clothingType = 'accessories';
    else if (/コート|ジャケット|パーカー|アウター|ポンチョ|ケープ/.test(cleanText)) results.clothingType = 'outerwear';
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
    const unit = '\\s*(?:cm|センチ|mm)?'; // Added mm just in case, though we assume cm usually

    // 1. Head / Hood
    const headRegex = new RegExp(`(頭|フード|カチューシャ)(?:囲|周り|まわり)?${sep}${num}${range}${unit}`, 'i');
    const headMatch = cleanText.match(headRegex);
    if (headMatch) {
        const min = parseFloat(headMatch[3]);
        const max = headMatch[4] ? parseFloat(headMatch[4]) : min;
        results.measurements.head = { min, max };
        usedValues.add(Math.floor(min));
    }

    // 2. Neck
    const neckRegex = new RegExp(`(首)(?:周り|まわり|囲)?${sep}${num}${range}${unit}`, 'i');
    const neckMatch = cleanText.match(neckRegex);
    if (neckMatch) {
        results.measurements.neck = parseFloat(neckMatch[3]);
        usedValues.add(Math.floor(results.measurements.neck));
    }

    // 3. Chest / Bust
    const chestRegex = new RegExp(`(胴囲|胴回り|胴周り|バスト|胸囲)${sep}${num}${unit}`, 'i');
    const chestMatch = cleanText.match(chestRegex);
    if (chestMatch) {
        results.measurements.chest = parseFloat(chestMatch[2]);
        usedValues.add(Math.floor(results.measurements.chest));
    }

    // 4. Width / Hem
    const widthRegex = new RegExp(`(身幅|裾幅|横幅|幅)${sep}${num}${unit}`, 'i');
    const widthMatch = cleanText.match(widthRegex);
    if (widthMatch) {
        results.measurements.bodyWidth = parseFloat(widthMatch[2]);
        usedValues.add(Math.floor(results.measurements.bodyWidth));
    }

    // 5. Length / Height (Item dimensions)
    const lengthRegex = new RegExp(`(着丈|身丈|丈|全長|高さ|タテ|縦|H)${sep}${num}${unit}`, 'i');
    const lengthMatch = cleanText.match(lengthRegex);
    if (lengthMatch) {
        const val = parseFloat(lengthMatch[2]);
        // Only treat as clothing length if it's likely a measurement, not the target plushie size
        // If the value is very specific (e.g. 19) and context suggests item size.
        results.measurements.length = val;
        usedValues.add(Math.floor(val));
    }

    // 6. Target Plushie Size (Nui Size)
    // Supports: "15cm, 20cm", "10cm～12cm", "15cm-20cm用"
    // Prioritize range/multiple match over simple single match
    const targetMatch = cleanText.match(/(\d{1,2})(?:\s*cm)?\s*(?:[～~,\-]|\s+と\s+|\s*,\s*)\s*(\d{1,2})\s*cm\s*(?:サイズ|用|対応|ぬいぐるみ|ぬい|ドール)/i) ||
        cleanTitle.match(/【?(\d{1,2})(?:\s*cm)?(?:[～~,\-](\d{1,2})\s*cm)?】?/i);


    if (targetMatch) {
        const v1 = parseInt(targetMatch[1]);
        const v2 = targetMatch[2] ? parseInt(targetMatch[2]) : null;

        if (v2) {
            // Treat as range or multiple options
            const min = Math.min(v1, v2);
            const max = Math.max(v1, v2);
            results.sizeRanges.push({ min, max });
            // Do NOT set targetPlushieSize so that frontend falls back to displaying the range
        } else {
            results.targetPlushieSize = v1;
        }
    }

    if (!results.targetPlushieSize && results.sizeRanges.length === 0) {
        // Fallback lookups
        const rangeMatch = cleanText.match(/(\d{1,2})[～~](\d{1,2})\s*cm\s*(?:用|対応|サイズ|ぬい)/i);
        if (rangeMatch) {
            results.sizeRanges.push({ min: parseInt(rangeMatch[1]), max: parseInt(rangeMatch[2]) });
            // Do not set targetPlushieSize for ranges
        } else {
            const singleMatch = cleanText.match(/(\d{1,2})\s*cm\s*(?:用|対応|向け|サイズ|ぬいぐるみ|ぬい|着せ替え)/i);
            if (singleMatch) results.targetPlushieSize = parseInt(singleMatch[1]);
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
    if (sizeLabels && !results.targetPlushieSize) {
        const label = sizeLabels[0].toUpperCase();
        if (label.includes('S')) results.estimatedTarget = { size: 12, range: [10, 15] };
        if (label.includes('M')) results.estimatedTarget = { size: 20, range: [15, 25] };
        if (label.includes('L')) results.estimatedTarget = { size: 30, range: [25, 40] };
    }

    return results;
}

// Estimate fit logic
function estimateFit(sizeInfo, plushieHeight, plushieInfo = {}) {
    let status = 'unknown';
    let reason = 'サイズ情報が見つかりませんでした';
    let confidence = 'low';

    // Check target plushie size first
    if (sizeInfo.targetPlushieSize) {
        const diff = plushieHeight - sizeInfo.targetPlushieSize;
        if (Math.abs(diff) <= 2) {
            status = 'perfect';
            reason = `${sizeInfo.targetPlushieSize}cm用です。ぴったりです！`;
            confidence = 'high';
        } else if (diff > 5) {
            status = 'tooSmall';
            reason = `対象サイズ(${sizeInfo.targetPlushieSize}cm)よりかなり大きいです。着られない可能性が高いです。`;
        } else if (diff < -5) {
            status = 'tooBig';
            reason = `対象サイズ(${sizeInfo.targetPlushieSize}cm)よりかなり小さいです。ブカブカです。`;
        } else if (diff > 2) {
            status = 'tight';
            reason = `対象サイズ(${sizeInfo.targetPlushieSize}cm)より少し大きいです。キツい・入らない可能性があります。`;
        } else if (diff < -2) {
            status = 'loose';
            reason = `対象サイズ(${sizeInfo.targetPlushieSize}cm)より少し小さいです。少しブカブカかもしれません。`;
            // For 12cm plushie vs 15cm target: diff = -3 -> loose.
        }
    }
    // Check size ranges
    else if (sizeInfo.sizeRanges.length > 0) {
        const { min, max } = sizeInfo.sizeRanges[0];
        if (plushieHeight >= min && plushieHeight <= max) {
            status = 'perfect';
            reason = `${min}〜${max}cm対応です。範囲内です！`;
            confidence = 'high';
        } else if (plushieHeight < min) {
            status = 'loose';
            reason = `${min}〜${max}cm対応です。ブカブカの可能性があります。`;
        } else {
            status = 'tight';
            reason = `${min}〜${max}cm対応です。キツい可能性があります。`;
        }
    }
    // Check estimated target from S/M/L labels
    else if (sizeInfo.estimatedTarget) {
        const { size, range } = sizeInfo.estimatedTarget;
        if (plushieHeight >= range[0] && plushieHeight <= range[1]) {
            status = 'perfect';
            reason = `サイズ表記から推測（${range[0]}〜${range[1]}cm程度）。合いそうです。`;
            confidence = 'low';
        } else if (plushieHeight < range[0]) {
            status = 'loose'; // Should be 'loose' if plushie is smaller than target
            reason = `サイズ表記から推測（${size}cm前後）。ブカブカの可能性があります。`;
            // Wait, if plushie is 12cm and target is 20cm (M), plushie is smaller -> loose/tooBig.
            // Correct logic: If plushieHeight < min -> loose.
        } else {
            status = 'tight';
            reason = `サイズ表記から推測（${size}cm前後）。キツい可能性があります。`;
        }
    }
    // Check specific measurements (length proxy)
    else if (sizeInfo.measurements.length) {
        const diff = Math.abs(plushieHeight - sizeInfo.measurements.length);
        if (diff < 3) {
            status = 'perfect';
            reason = `着丈(${sizeInfo.measurements.length}cm)が身長に近いため、全身が入る可能性があります。`;
            confidence = 'low';
        } else if (sizeInfo.measurements.length > plushieHeight) {
            status = 'loose';
            reason = `着丈(${sizeInfo.measurements.length}cm)が身長より長いです。`;
            confidence = 'low';
        }
    }
    // Check raw matches
    else if (sizeInfo.rawMatches.length) {
        const bestMatch = sizeInfo.rawMatches.reduce((prev, curr) => Math.abs(curr - plushieHeight) < Math.abs(prev - plushieHeight) ? curr : prev);
        if (Math.abs(bestMatch - plushieHeight) <= 3) {
            status = 'perfect';
            reason = `ページ内に${bestMatch}cmという表記があり、身長に近いです。`;
            confidence = 'low';
        }
    }

    return {
        status, confidence, reason,
        details: { targetSize: sizeInfo.targetPlushieSize || (sizeInfo.estimatedTarget?.size), measurements: sizeInfo.measurements },
        warnings: [],
        checkPoints: []
    };
}

// API Routes
app.post('/api/analyze-url', async (req, res) => {
    const { url, plushieHeight } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    // Specific check for Mercari Shops (SPA)
    if (url.includes('mercari.com/shops/')) {
        return res.status(422).json({
            success: false,
            error: 'MERCARI_SHOPS_NOT_SUPPORTED',
            message: 'メルカリShopsは自動分析に対応していません。'
        });
    }

    try {
        const response = await fetchWithRetry(url);
        const $ = cheerio.load(response.data);

        const title = $('title').text() || '';
        const description = $('meta[name="description"]').attr('content') || '';
        const ogTitle = $('meta[property="og:title"]').attr('content') || '';
        const ogImage = $('meta[property="og:image"]').attr('content') || '';
        // Increase body text limit to catch tables lower down
        const bodyText = $('body').text().replace(/\s+/g, ' ').substring(0, 20000);

        const allText = [title, description, ogTitle, bodyText].join(' ');
        const sizeInfo = extractSizeInfo(allText, ogTitle || title);

        let fit = null;
        if (plushieHeight) fit = estimateFit(sizeInfo, plushieHeight);

        res.json({
            success: true,
            product: { title: ogTitle || title, description, image: ogImage, url },
            sizeInfo,
            fit
        });
    } catch (error) {
        console.error(error);
        res.json({ success: false, error: 'ページ情報を取得できませんでした（タイムアウトまたはアクセス制限）', suggestion: 'manual_input' });
    }
});

app.post('/api/analyze-text', async (req, res) => {
    const { text, productName, plushieHeight } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });

    try {
        const sizeInfo = extractSizeInfo(text, productName || '');
        let fit = null;
        if (plushieHeight) fit = estimateFit(sizeInfo, plushieHeight);

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

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Export as default for Vercel
export default app;
