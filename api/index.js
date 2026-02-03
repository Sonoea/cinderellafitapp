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
function extractSizeInfo(text, title = '', extraData = {}) {
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

    // 2. Neck
    const neckRegex = new RegExp(`(首)(?:周り|まわり|囲)?${sep}${num}${range}${unit}`, 'i');
    const neckMatch = cleanText.match(neckRegex);
    if (neckMatch) {
        const raw = parseFloat(neckMatch[3]);
        const val = toCm(raw, neckMatch[0]);
        results.measurements.neck = val;
        usedValues.add(Math.floor(val));
    }

    // 3. Chest / Bust
    const chestRegex = new RegExp(`(胴囲|胴回り|胴周り|バスト|胸囲)${sep}${num}${unit}`, 'i');
    const chestMatch = cleanText.match(chestRegex);
    if (chestMatch) {
        const raw = parseFloat(chestMatch[2]);
        const val = toCm(raw, chestMatch[0]);
        results.measurements.chest = val;
        usedValues.add(Math.floor(val));
    }

    // 4. Width / Hem
    const widthRegex = new RegExp(`(身幅|裾幅|横幅|幅)${sep}${num}${unit}`, 'i');
    const widthMatch = cleanText.match(widthRegex);
    if (widthMatch) {
        const raw = parseFloat(widthMatch[2]);
        const val = toCm(raw, widthMatch[0]);
        results.measurements.bodyWidth = val;
        usedValues.add(Math.floor(val));
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
        const lengthRegexEN = new RegExp(`(H)${sep}${num}\\s*(?:cm|センチ|mm|inch|インチ|in|"|”)`, 'i'); // Mandatory unit
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

    // 6. Target Plushie Size (Nui Size)
    // Supports: "15cm, 20cm", "10cm～12cm", "15cm-20cm用", "身長17cm", "12-16 Inch"
    // Regex updated to allow unit variations in capture groups
    // Regex 6 needs careful update since structure was (\d)(cm)? ... (\d)cm
    // We generalize "cm" to non-capturing unit group
    const u = '(?:\\s*(?:cm|センチ|mm|inch|インチ|in|"|”))?';
    // Simplified Target Regex: (num)(unit)? ... (num)(unit) (keywords)
    const targetRegex = new RegExp(`(\\d{1,2})${u}\\s*(?:[～~,\\-−ー]|\\s+と\\s+|\\s*,\\s*)\\s*(\\d{1,2})(${u})\\s*(?:サイズ|用|対応|ぬいぐるみ|ぬい|ドール|身長|Bears|Bear|Plush|Stuffed|Toy)`, 'i');

    const targetMatch = cleanText.match(targetRegex) ||
        cleanTitle.match(/【\s*(\d{1,2})(?:\s*cm)?(?:[～~,\-−ー]\s*(\d{1,2})\s*cm)?\s*】/i); // Keep Title regex strict for now (Minne etc)


    if (targetMatch) {
        // targetMatch[1] = num1, targetMatch[2] = num2, targetMatch[3] = unit2 (captured from new regex)
        // Note: New regex groups: 1=num1, 2=num2, 3=unit2
        // Wait, 'u' is non-capturing `(?:...)`.
        // My manual targetRegex above needs adjusting to capture unit if needed for conversion.
        // Or check match string.

        let v1 = parseFloat(targetMatch[1]);
        let v2 = targetMatch[2] ? parseFloat(targetMatch[2]) : null;

        // Auto-convert if "inch" in full match or unit group.
        // Since my constructed regex is simple, I'll use `toCm`.
        // But `toCm` relies on the string having the unit.
        // `targetMatch[0]` has the unit.
        // If range "12-16 Inch", `12` is v1, `16` is v2. Match has "Inch".
        // Both v1 and v2 should be converted.

        v1 = toCm(v1, targetMatch[0]);
        if (v2) v2 = toCm(v2, targetMatch[0]);

        if (v2) {
            const min = Math.min(v1, v2);
            const max = Math.max(v1, v2);
            results.sizeRanges.push({ min, max });
            // For target size, use average or min? Usually Max for "fits up to".
            // But usually range means "Fits 12 to 16".
            // If user has 15cm -> Perfect.
            // Logic handled later using sizeRanges.
        } else {
            results.targetPlushieSize = v1;
        }
    } else {
        // Fallback logic
    }

    if (!results.targetPlushieSize && results.sizeRanges.length === 0) {
        // Fallback lookups
        const rangeMatch = cleanText.match(/(\d{1,2})[～~](\d{1,2})\s*(?:cm|センチ|mm|inch|インチ|in|"|”)\s*(?:用|対応|サイズ|ぬい)/i);
        if (rangeMatch) {
            const val1 = toCm(parseFloat(rangeMatch[1]), rangeMatch[0]);
            const val2 = toCm(parseFloat(rangeMatch[2]), rangeMatch[0]);
            results.sizeRanges.push({ min: Math.min(val1, val2), max: Math.max(val1, val2) });
        } else {
            // 1. Keyword AFTER number
            const singleMatch = cleanText.match(/(\d{1,2})\s*(?:cm|センチ|mm|inch|インチ|in|"|”)\s*(?:用|対応|向け|サイズ|ぬいぐるみ|ぬい|着せ替え|身長)/i); // Added keywords
            if (singleMatch) {
                results.targetPlushieSize = toCm(parseFloat(singleMatch[1]), singleMatch[0]);
            } else {
                // 2. Keyword BEFORE number
                const preMatch = cleanTitle.match(/(?:ぬいぐるみ|ぬい|ドール|サイズ|身長).{0,30}(\d{1,2})\s*(?:cm|センチ|mm|inch|インチ|in|"|”)/i);
                if (preMatch) {
                    results.targetPlushieSize = toCm(parseFloat(preMatch[1]), preMatch[0]);
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
            heightReason = `${sizeInfo.targetPlushieSize}cm用です。身長はぴったりです！`;
            confidence = 'high';
        } else if (diff > 5) {
            heightStatus = 'tooSmall';
            heightReason = `対象サイズ(${sizeInfo.targetPlushieSize}cm)よりかなり大きいです。身長が入りません。`;
        } else if (diff < -5) {
            heightStatus = 'tooBig';
            heightReason = `対象サイズ(${sizeInfo.targetPlushieSize}cm)よりかなり小さいです。身長に対しブカブカです。`;
        } else if (diff > tolerance) {
            heightStatus = 'tight';
            heightReason = `対象サイズ(${sizeInfo.targetPlushieSize}cm)より身長が${diff.toFixed(1)}cm大きいです。少しキツいかもしれません。`;
        } else if (diff < -tolerance) {
            heightStatus = 'loose';
            heightReason = `対象サイズ(${sizeInfo.targetPlushieSize}cm)より身長が${Math.abs(diff).toFixed(1)}cm小さいです。少し余裕があります。`;
        }
    }
    // Check size ranges
    else if (sizeInfo.sizeRanges.length > 0) {
        const { min, max } = sizeInfo.sizeRanges[0];
        if (plushieHeight >= min && plushieHeight <= max) {
            heightStatus = 'perfect';
            heightReason = `${min}〜${max}cm対応です。身長は範囲内です！`;
            confidence = 'high';
        } else if (plushieHeight < min) {
            heightStatus = 'loose';
            heightReason = `${min}〜${max}cm対応です。身長に対しブカブカの可能性があります。`;
        } else {
            heightStatus = 'tight';
            heightReason = `${min}〜${max}cm対応です。身長がキツい可能性があります。`;
        }
    }
    // Check estimated target from S/M/L labels
    else if (sizeInfo.estimatedTarget) {
        const { size, range } = sizeInfo.estimatedTarget;
        if (plushieHeight >= range[0] && plushieHeight <= range[1]) {
            heightStatus = 'perfect';
            heightReason = `サイズ表記から推測（${range[0]}〜${range[1]}cm程度）。身長は合いそうです。`;
            confidence = 'low';
        } else if (plushieHeight < range[0]) {
            heightStatus = 'loose';
            heightReason = `サイズ表記から推測（${size}cm前後）。身長に対しブカブカの可能性があります。`;
        } else {
            heightStatus = 'tight';
            heightReason = `サイズ表記から推測（${size}cm前後）。身長がキツい可能性があります。`;
        }
    }
    // Check specific measurements (length proxy)
    else if (sizeInfo.measurements.length) {
        const diff = Math.abs(plushieHeight - sizeInfo.measurements.length);
        if (diff < 3) {
            heightStatus = 'perfect';
            heightReason = `着丈(${sizeInfo.measurements.length}cm)が身長に近いため、全身が入る可能性があります。`;
            confidence = 'low';
        } else if (sizeInfo.measurements.length > plushieHeight) {
            heightStatus = 'loose';
            heightReason = `着丈(${sizeInfo.measurements.length}cm)が身長より長いです。`;
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
        // We assume 'head' measurement extracted is circumference.
        if (pHead > mMax) {
            st = 'tight';
            msg = `頭囲(${pHead}cm)が商品サイズ(${mMax}cm)より大きいです。フードや帽子が入らない可能性が高いです。`;
            if (status === 'perfect') status = 'tight'; // Downgrade perfect status
        } else if (pHead < mMin - 5) {
            st = 'loose';
            msg = `頭囲(${pHead}cm)が商品サイズ(${mMin}cm)よりかなり小さいです。帽子がブカブカかもしれません。`;
        } else {
            msg = `頭囲は範囲内(${mMin}〜${mMax}cm)です。`;
        }
        checkPoints.push({ part: 'Head', status: st, msg });
        if (st !== 'ok') reasons.push(msg);
    }

    // Chest/Waist Check
    // Plushie 'waist' (usually girth) vs Item 'chest' (girth) OR Item 'bodyWidth' (flat width * 2)
    if (plushieInfo.waist) {
        const pWaist = parseFloat(plushieInfo.waist);
        let itemGirth = null;
        let source = '';

        if (sizeInfo.measurements.chest) {
            itemGirth = sizeInfo.measurements.chest;
            source = '胸囲';
        } else if (sizeInfo.measurements.bodyWidth) {
            itemGirth = sizeInfo.measurements.bodyWidth * 2;
            source = '身幅(x2)';
        }

        if (itemGirth) {
            let msg = '';
            let st = 'ok';
            // Allow 2cm slack usually?
            if (pWaist > itemGirth) {
                st = 'tight';
                msg = `胴囲(${pWaist}cm)が服の${source}(${itemGirth}cm)より大きいです。チャックが閉まらない可能性があります。`;
                if (status === 'perfect') status = 'tight';
            } else if (pWaist < itemGirth - 8) { // >8cm diff is quite loose
                st = 'loose';
                msg = `胴囲(${pWaist}cm)が服の${source}(${itemGirth}cm)より細いです。お腹周りがブカブカかもしれません。`;
            } else {
                msg = `胴囲は${source}に対して適正範囲です。`;
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
            msg = `首周り(${pNeck}cm)が商品(${mNeck}cm)より太いです。ボタンが留まらない可能性があります。`;
            if (status === 'perfect') status = 'tight';
        } else {
            msg = `首周りはOKです。`;
        }
        checkPoints.push({ part: 'Neck', status: st, msg });
        if (st !== 'ok') reasons.push(msg);
    }

    // Final cleanup
    if (status === 'unknown' && reasons.length === 0) {
        reasons.push('サイズ情報が見つかりませんでした');
    }

    return {
        status,
        confidence,
        reason: reasons.join('\n'), // Join with newlines for display
        details: { targetSize: sizeInfo.targetPlushieSize || (sizeInfo.estimatedTarget?.size), measurements: sizeInfo.measurements },
        warnings: reasons.filter(r => r.includes('キツい') || r.includes('大きい') || r.includes('小さい') || r.includes('ブカブカ')), // Heuristic for warnings
        checkPoints
    };
}

// API Routes
app.post('/api/analyze-url', async (req, res) => {
    const { url, plushieHeight, plushieInfo } = req.body;
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
        if (plushieHeight) fit = estimateFit(sizeInfo, plushieHeight, plushieInfo);

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
    const { text, productName, plushieHeight, plushieInfo } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });

    try {
        const sizeInfo = extractSizeInfo(text, productName || '');
        let fit = null;
        if (plushieHeight) fit = estimateFit(sizeInfo, plushieHeight, plushieInfo);

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
