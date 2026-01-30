const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const axios = require('axios');
const iconv = require('iconv-lite');

const app = express();
const PORT = 3001;

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
                    // Add referer for some sites
                    'Referer': new URL(url).origin + '/',
                },
                timeout: 15000,
                maxRedirects: 5,
                validateStatus: (status) => status < 500,
                responseType: 'arraybuffer', // Get raw bytes to handle encoding
            });

            if (response.status === 200) {
                // Detect encoding from Content-Type header or HTML meta tag
                const buffer = Buffer.from(response.data);
                let encoding = 'utf-8';

                // Check Content-Type header
                const contentType = response.headers['content-type'] || '';
                const charsetMatch = contentType.match(/charset=([^;]+)/i);
                if (charsetMatch) {
                    encoding = charsetMatch[1].trim().toLowerCase();
                }

                // If no charset in header, try to detect from HTML meta
                if (encoding === 'utf-8') {
                    // Quick decode as ASCII to find charset meta
                    const preview = buffer.toString('ascii', 0, Math.min(buffer.length, 2000));
                    const metaMatch = preview.match(/<meta[^>]+charset=["']?([^"'>\s]+)/i) ||
                        preview.match(/<meta[^>]+content=["'][^"']*charset=([^"';\s]+)/i);
                    if (metaMatch) {
                        encoding = metaMatch[1].toLowerCase();
                    }
                }

                // Normalize encoding names
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

                // Decode the buffer with the detected encoding
                let html;
                if (iconv.encodingExists(encoding)) {
                    html = iconv.decode(buffer, encoding);
                } else {
                    html = buffer.toString('utf-8');
                }

                console.log(`Decoded ${url} with encoding: ${encoding}`);

                // Return in format compatible with original code
                return { ...response, data: html };
            }

            // If 403/404, try next User-Agent
            console.log(`Attempt ${i + 1} returned status ${response.status}, trying different approach...`);
            lastError = new Error(`HTTP ${response.status}`);

        } catch (error) {
            console.log(`Attempt ${i + 1} failed: ${error.message}, retrying...`);
            lastError = error;

            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
        }
    }

    throw lastError || new Error('All fetch attempts failed');
}


// Size-related keywords in Japanese and English
const SIZE_KEYWORDS = [
    /(\d{1,3})\s*cm/gi,
    /(\d{1,3})\s*センチ/gi,
    /サイズ[：:]\s*([^\n,]+)/gi,
    /着丈[：:]\s*(\d+)/gi,
    /身丈[：:]\s*(\d+)/gi,
    /横[：:]\s*(\d+)/gi,
    /縦[：:]\s*(\d+)/gi,
    /幅[：:]\s*(\d+)/gi,
    /width[：:]\s*(\d+)/gi,
    /length[：:]\s*(\d+)/gi,
    /(\d{1,2})[~〜-](\d{1,2})\s*cm/gi,
    /Sサイズ|Mサイズ|Lサイズ/gi,
];

// Extract size information from text (comprehensive)
function extractSizeInfo(text, title = '') {
    const results = {
        dimensions: [],
        sizeRanges: [],
        rawMatches: [],
        targetPlushieSize: null,
        // NEW: Detailed measurements
        measurements: {
            neck: null,        // 首周り (cm)
            chest: null,       // 胴囲/胴回り (cm)
            bodyWidth: null,   // 身幅 (cm)
            length: null,      // 着丈/身丈/全長 (cm)
            armhole: null,     // 袖ぐり (cm)
            head: null,        // 頭囲 (cm)
        },
        // NEW: Body type indicators
        bodyType: {
            detected: null,    // 'slim', 'normal', 'round'
            keywords: [],      // キーワードリスト
        },
        // NEW: Clothing type
        clothingType: null,    // 'tops', 'dress', 'accessories', 'hat', etc.
        // NEW: Missing info warnings
        missingInfo: [],
    };

    // Track which values have been assigned to specific measurements
    // to avoid treating them as generic plushie size ranges
    const usedValues = new Set();

    // Clean up text
    const cleanText = text.replace(/\s+/g, ' ').trim();
    const cleanTitle = title.replace(/\s+/g, ' ').trim();

    // === DETECT CLOTHING TYPE ===
    if (/ドレス|ワンピース|メイド服/.test(cleanText)) results.clothingType = 'dress';
    else if (/トップス|シャツ|Tシャツ|セーター|スモック|ベスト/.test(cleanText)) results.clothingType = 'tops';
    else if (/帽子|ハット|ベレー|キャップ|ヘッドドレス/.test(cleanText)) results.clothingType = 'hat';
    else if (/マフラー|スカーフ|ネクタイ|蝶ネクタイ|リボン/.test(cleanText)) results.clothingType = 'accessories';
    else if (/コート|ジャケット|パーカー|アウター/.test(cleanText)) results.clothingType = 'outerwear';
    else if (/パンツ|ズボン|スカート/.test(cleanText)) results.clothingType = 'bottoms';

    // === DETECT BODY TYPE KEYWORDS ===
    const bodyTypeKeywords = {
        slim: ['細身', 'スリム', 'すらっと', 'スレンダー', '細め'],
        round: ['ぽっちゃり', 'ふっくら', 'むちむち', '丸い', 'まるっと', 'コロン'],
        normal: ['標準', 'ノーマル', '普通体型'],
    };

    for (const [type, keywords] of Object.entries(bodyTypeKeywords)) {
        for (const kw of keywords) {
            if (cleanText.includes(kw)) {
                results.bodyType.keywords.push(kw);
                if (!results.bodyType.detected) {
                    results.bodyType.detected = type;
                }
            }
        }
    }

    // === EXTRACT DETAILED MEASUREMENTS ===

    // 頭囲 (head circumference)
    const headMatch = cleanText.match(/頭(囲|周り|まわり)[：:]\s*約?\s*(\d+\.?\d*)[～~]?(\d+\.?\d*)?\s*(cm|センチ)?/i) ||
        cleanText.match(/頭(囲|周り|まわり)\s*約?\s*(\d+\.?\d*)[～~]?(\d+\.?\d*)?\s*(cm|センチ)/i);
    if (headMatch) {
        // If a range is provided (e.g. 29~32), take the average or max, but store it specific to head
        const minHead = parseFloat(headMatch[2]);
        const maxHead = headMatch[3] ? parseFloat(headMatch[3]) : minHead;
        results.measurements.head = { min: minHead, max: maxHead };
        usedValues.add(Math.floor(minHead));
        usedValues.add(Math.floor(maxHead));
    }

    // 首周り (neck circumference)
    const neckMatch = cleanText.match(/首(周り|まわり|囲)[：:]\s*約?\s*(\d+\.?\d*)\s*(cm|センチ)?/i) ||
        cleanText.match(/首(周り|まわり|囲)\s*約?\s*(\d+\.?\d*)\s*(cm|センチ)/i);
    if (neckMatch) {
        const val = parseFloat(neckMatch[2]);
        results.measurements.neck = val;
        usedValues.add(Math.floor(val));
    }

    // 胴囲/胴回り (chest/body circumference)
    const chestMatch = cleanText.match(/(胴囲|胴回り|胴周り|バスト)[：:]\s*約?\s*(\d+\.?\d*)\s*(cm|センチ)?/i) ||
        cleanText.match(/(胴囲|胴回り|胴周り|バスト)\s*約?\s*(\d+\.?\d*)\s*(cm|センチ)/i);
    if (chestMatch) {
        const val = parseFloat(chestMatch[2]);
        results.measurements.chest = val;
        usedValues.add(Math.floor(val));
    }

    // 身幅 (body width)
    const widthMatch = cleanText.match(/身幅[：:]\s*約?\s*(\d+\.?\d*)\s*(cm|センチ)?/i) ||
        cleanText.match(/身幅\s*約?\s*(\d+\.?\d*)\s*(cm|センチ)/i);
    if (widthMatch) {
        const val = parseFloat(widthMatch[1]);
        results.measurements.bodyWidth = val;
        usedValues.add(Math.floor(val));
    }

    // 着丈/身丈/全長 (length)
    const lengthMatch = cleanText.match(/(着丈|身丈|丈|全長)[：:]\s*約?\s*(\d+\.?\d*)\s*(cm|センチ)?/i) ||
        cleanText.match(/(着丈|身丈|全長)\s*約?\s*(\d+\.?\d*)\s*(cm|センチ)/i);
    if (lengthMatch) {
        const val = parseFloat(lengthMatch[2]);
        results.measurements.length = val;
        usedValues.add(Math.floor(val));
    }

    // 袖ぐり (armhole)
    const armholeMatch = cleanText.match(/袖(ぐり|口)[：:]\s*約?\s*(\d+\.?\d*)\s*(cm|センチ)?/i);
    if (armholeMatch) {
        const val = parseFloat(armholeMatch[2]);
        results.measurements.armhole = val;
        usedValues.add(Math.floor(val));
    }

    // === PRIORITY 1: Look for 【○cm】pattern in title ===
    const bracketMatch = cleanTitle.match(/【(\d{1,2})(?:\s*cm)?】/i);
    if (bracketMatch) {
        results.targetPlushieSize = parseInt(bracketMatch[1]);
    }

    // === PRIORITY 2: Look for "○cm用" or "○cm対応" patterns ===
    if (!results.targetPlushieSize) {
        const targetMatch = cleanText.match(/(\d{1,2})\s*cm\s*(用|対応|向け|ぬいぐるみ)/i);
        if (targetMatch) {
            results.targetPlushieSize = parseInt(targetMatch[1]);
        }
    }

    // === PRIORITY 3: Look for "10cm着せ替えぬいぐるみ用" ===
    if (!results.targetPlushieSize) {
        const clothingMatch = cleanText.match(/(\d{1,2})\s*cm\s*(着せ替え|ぬい|服)/i);
        if (clothingMatch) {
            results.targetPlushieSize = parseInt(clothingMatch[1]);
        }
    }

    // === NEW: Detect "10×12cm" or "10x12cm" dimension patterns ===
    // Pattern: "首回り" "首周り" followed by dimensions like "約10×12cm"
    const neckDimMatch = cleanText.match(/首(回り|周り|まわり)[^\d]*約?\s*(\d+\.?\d*)\s*[x×]\s*(\d+\.?\d*)\s*(cm|センチ)/i);
    if (neckDimMatch) {
        const dim1 = parseFloat(neckDimMatch[2]);
        const dim2 = parseFloat(neckDimMatch[3]);
        results.measurements.neck = Math.min(dim1, dim2);
        results.dimensions.push({
            type: 'neck',
            width: Math.min(dim1, dim2),
            height: Math.max(dim1, dim2),
        });
        // Estimate target plushie size from neck opening (larger dimension is roughly the plushie size)
        if (!results.targetPlushieSize) {
            results.targetPlushieSize = Math.round(Math.max(dim1, dim2));
            results.estimatedFromDimensions = true;
        }
    }

    // Pattern: "サイズ(約)・50×100mm" - with mm unit
    const mmSizeMatch = cleanText.match(/サイズ[（(]?約?[）)]?[・:：]?\s*(\d+)\s*[x×]\s*(\d+)\s*mm/i);
    if (mmSizeMatch) {
        const dim1 = parseFloat(mmSizeMatch[1]) / 10; // Convert mm to cm
        const dim2 = parseFloat(mmSizeMatch[2]) / 10;
        results.dimensions.push({
            type: 'product',
            width: Math.min(dim1, dim2),
            height: Math.max(dim1, dim2),
            unit: 'mm (converted)',
        });
        // For clothing, the height is close to plushie size
        if (!results.targetPlushieSize) {
            const estimatedSize = Math.round(Math.max(dim1, dim2));
            if (estimatedSize >= 8 && estimatedSize <= 25) {
                results.targetPlushieSize = estimatedSize;
                results.estimatedFromDimensions = true;
            }
        }
    }

    // Pattern: General "10×12cm" or "10x12" pattern anywhere
    const generalDimMatch = cleanText.match(/(\d{1,2}\.?\d*)\s*[x×]\s*(\d{1,2}\.?\d*)\s*(cm|センチ)/i);
    if (generalDimMatch && !neckDimMatch) {
        const dim1 = parseFloat(generalDimMatch[1]);
        const dim2 = parseFloat(generalDimMatch[2]);
        if (dim1 >= 5 && dim1 <= 30 && dim2 >= 5 && dim2 <= 30) {
            results.dimensions.push({
                type: 'general',
                width: Math.min(dim1, dim2),
                height: Math.max(dim1, dim2),
            });
            if (!results.targetPlushieSize) {
                results.targetPlushieSize = Math.round(Math.max(dim1, dim2));
                results.estimatedFromDimensions = true;
            }
        }
    }

    // Look for dimension patterns like "縦6cm x 横7cm"
    const dimMatch = cleanText.match(/縦\s*(\d+\.?\d*)\s*cm\s*[x×]\s*横\s*(\d+\.?\d*)\s*cm/i);
    if (dimMatch) {
        results.dimensions.push({
            length: parseFloat(dimMatch[1]),
            width: parseFloat(dimMatch[2]),
        });
    }

    // Look for size ranges like "10-20cm" or "10〜20cm"
    const rangeMatches = cleanText.matchAll(/(\d{1,2})[~〜\-](\d{1,2})\s*cm/gi);
    for (const match of rangeMatches) {
        results.sizeRanges.push({
            min: parseInt(match[1]),
            max: parseInt(match[2]),
        });
    }

    // Look for "○cm/○cm" pattern (dual size)
    const dualMatch = cleanText.match(/(\d{1,2})\s*cm\s*[\/／]\s*(\d{1,2})\s*cm/i);
    if (dualMatch) {
        results.sizeRanges.push({
            min: Math.min(parseInt(dualMatch[1]), parseInt(dualMatch[2])),
            max: Math.max(parseInt(dualMatch[1]), parseInt(dualMatch[2])),
        });
    }

    // Look for single cm values (filtered for plushie-relevant sizes 5-50cm)
    const cmMatches = cleanText.matchAll(/(\d{1,3})\s*cm/gi);
    for (const match of cmMatches) {
        const value = parseInt(match[1]);
        // Only include if value hasn't been used for a specific measurement (neck, chest, length, etc.)
        if (value >= 5 && value <= 50 && !usedValues.has(value)) {
            if (!results.rawMatches.includes(value)) {
                results.rawMatches.push(value);
            }
        }
    }

    // Look for specific size labels
    const sizeLabels = cleanText.match(/[SMLsml]サイズ/g);
    if (sizeLabels) {
        results.sizeLabels = sizeLabels;
    }

    // === IDENTIFY MISSING INFO ===
    // For tops/dress, check if we have body measurements
    if (['tops', 'dress', 'outerwear'].includes(results.clothingType)) {
        if (!results.measurements.chest && !results.measurements.bodyWidth) {
            results.missingInfo.push('胴囲・身幅');
        }
        if (!results.measurements.neck) {
            results.missingInfo.push('首周り');
        }
    }

    // Check if body type info is missing
    if (!results.bodyType.detected) {
        results.missingInfo.push('対応体型');
    }

    return results;
}

// Estimate fit based on extracted info and plushie info (comprehensive)
function estimateFit(sizeInfo, plushieHeight, plushieInfo = {}) {
    const { bodyType: plushieBodyType, chest: plushieChest, neck: plushieNeck } = plushieInfo;

    let fit = {
        status: 'unknown',
        confidence: 'low',
        reason: 'サイズ情報が見つかりませんでした',
        details: null,
        // NEW: Comprehensive evaluation
        heightMatch: null,      // 身長の適合性
        bodyMatch: null,        // 体型の適合性
        measurementMatch: null, // 寸法の適合性
        // NEW: Warnings and recommendations
        warnings: [],
        checkPoints: [],        // 手動で確認すべきポイント
    };

    // === HEIGHT EVALUATION ===
    let heightStatus = 'unknown';
    let heightReason = '';

    // Check target plushie size first
    if (sizeInfo.targetPlushieSize) {
        const target = sizeInfo.targetPlushieSize;
        const diff = plushieHeight - target;
        const estimatedNote = sizeInfo.estimatedFromDimensions ? '（寸法から推測）' : '';

        if (Math.abs(diff) <= 2) {
            heightStatus = 'perfect';
            heightReason = `${target}cm用の商品です${estimatedNote}。あなたのぬいぐるみは${plushieHeight}cmなのでぴったりです！`;
        } else if (diff > 2 && diff <= 5) {
            heightStatus = 'tight';
            heightReason = `${target}cm用の商品です${estimatedNote}が、あなたのぬいぐるみは${plushieHeight}cmなので少しキツいかもしれません。`;
        } else if (diff < -2 && diff >= -5) {
            heightStatus = 'loose';
            heightReason = `${target}cm用の商品です${estimatedNote}が、あなたのぬいぐるみは${plushieHeight}cmなので少しブカブカかもしれません。`;
        } else if (diff > 5) {
            heightStatus = 'tooSmall';
            heightReason = `${target}cm用の商品です${estimatedNote}。あなたのぬいぐるみは${plushieHeight}cmなので着られない可能性が高いです。`;
        } else {
            heightStatus = 'tooBig';
            heightReason = `${target}cm用の商品です${estimatedNote}。あなたのぬいぐるみは${plushieHeight}cmなので大きすぎるかもしれません。`;
        }
        fit.heightMatch = { status: heightStatus, targetSize: target, estimated: sizeInfo.estimatedFromDimensions };
    }
    // Check size ranges
    else if (sizeInfo.sizeRanges.length > 0) {
        const range = sizeInfo.sizeRanges[0];
        if (plushieHeight >= range.min && plushieHeight <= range.max) {
            heightStatus = 'perfect';
            heightReason = `${range.min}〜${range.max}cm対応です。あなたのぬいぐるみは${plushieHeight}cmなので範囲内です！`;
        } else if (plushieHeight < range.min) {
            heightStatus = 'loose';
            heightReason = `${range.min}〜${range.max}cm対応です。あなたのぬいぐるみは${plushieHeight}cmなのでブカブカかもしれません。`;
        } else {
            heightStatus = 'tight';
            heightReason = `${range.min}〜${range.max}cm対応です。あなたのぬいぐるみは${plushieHeight}cmなのでキツいかもしれません。`;
        }
        fit.heightMatch = { status: heightStatus, range };
    }

    // === BODY TYPE EVALUATION ===
    let bodyStatus = 'unknown';
    if (sizeInfo.bodyType.detected && plushieBodyType) {
        // Check compatibility
        if (sizeInfo.bodyType.detected === plushieBodyType) {
            bodyStatus = 'perfect';
            fit.bodyMatch = { status: 'perfect', clothingType: sizeInfo.bodyType.detected };
        } else if (sizeInfo.bodyType.detected === 'slim' && plushieBodyType === 'round') {
            bodyStatus = 'tight';
            fit.warnings.push(`この服は細身向けですが、お持ちのぬいぐるみはぽっちゃり体型です。キツい可能性があります。`);
            fit.bodyMatch = { status: 'tight', clothingType: sizeInfo.bodyType.detected };
        } else if (sizeInfo.bodyType.detected === 'round' && plushieBodyType === 'slim') {
            bodyStatus = 'loose';
            fit.warnings.push(`この服はぽっちゃり向けですが、お持ちのぬいぐるみは細身体型です。ブカブカの可能性があります。`);
            fit.bodyMatch = { status: 'loose', clothingType: sizeInfo.bodyType.detected };
        }
    } else if (!sizeInfo.bodyType.detected) {
        fit.checkPoints.push('商品ページに体型情報がありません。商品画像で着用例を確認してください。');
    }

    // === MEASUREMENT EVALUATION ===
    const measurements = sizeInfo.measurements;
    if (measurements.chest && plushieChest) {
        const chestDiff = measurements.chest - plushieChest;
        if (chestDiff >= 0 && chestDiff <= 2) {
            fit.measurementMatch = { ...fit.measurementMatch, chest: 'perfect' };
        } else if (chestDiff < 0) {
            fit.measurementMatch = { ...fit.measurementMatch, chest: 'tight' };
            fit.warnings.push(`胴囲：服は${measurements.chest}cm、ぬいぐるみは${plushieChest}cm。キツい可能性があります。`);
        } else {
            fit.measurementMatch = { ...fit.measurementMatch, chest: 'loose' };
        }
    }

    if (measurements.neck && plushieNeck) {
        const neckDiff = measurements.neck - plushieNeck;
        if (neckDiff >= 0 && neckDiff <= 1) {
            fit.measurementMatch = { ...fit.measurementMatch, neck: 'perfect' };
        } else if (neckDiff < 0) {
            fit.measurementMatch = { ...fit.measurementMatch, neck: 'tight' };
            fit.warnings.push(`首周り：服は${measurements.neck}cm、ぬいぐるみは${plushieNeck}cm。首が通らない可能性があります。`);
        }
    }

    // === ADD CHECK POINTS FOR MISSING INFO ===
    if (sizeInfo.missingInfo.length > 0) {
        for (const missing of sizeInfo.missingInfo) {
            if (missing === '胴囲・身幅') {
                fit.checkPoints.push('胴囲・身幅の情報がありません。商品ページの詳細やレビューを確認してください。');
            } else if (missing === '首周り') {
                fit.checkPoints.push('首周りの情報がありません。被せるタイプの場合は特に注意してください。');
            } else if (missing === '対応体型') {
                fit.checkPoints.push('対応する体型（細身/普通/ぽっちゃり）の記載がありません。商品画像で確認してください。');
            }
        }
    }

    // === DETERMINE FINAL STATUS & CONFIDENCE ===
    let finalStatus = heightStatus;
    let confidence = 'low';

    // If height matches, but we're missing body info, reduce confidence
    if (heightStatus === 'perfect') {
        if (sizeInfo.missingInfo.length === 0 && bodyStatus === 'perfect') {
            confidence = 'high';
        } else if (sizeInfo.missingInfo.length <= 1) {
            confidence = 'medium';
            fit.warnings.push('身長は適合していますが、他の寸法情報が不足しているため完全な判断はできません。');
        } else {
            confidence = 'low';
            fit.warnings.push('身長のみで判断しています。体の厚みや首周りは別途確認が必要です。');
        }
    } else if (heightStatus !== 'unknown') {
        // Height doesn't match perfectly
        if (bodyStatus !== 'unknown' || measurements.chest || measurements.neck) {
            confidence = 'medium';
        } else {
            confidence = 'medium';
        }
    }

    // If body type mismatch overrides height match
    if (heightStatus === 'perfect' && bodyStatus === 'tight') {
        finalStatus = 'caution';
        fit.warnings.unshift('身長は適合していますが、体型の相性に注意してください。');
    }

    fit.status = finalStatus;
    fit.confidence = confidence;
    fit.reason = heightReason || 'サイズ情報が見つかりませんでした';
    fit.details = {
        targetSize: sizeInfo.targetPlushieSize,
        clothingType: sizeInfo.clothingType,
        measurements: sizeInfo.measurements,
        bodyType: sizeInfo.bodyType,
    };

    return fit;
}

// Main API endpoint
app.post('/api/analyze-url', async (req, res) => {
    const { url, plushieHeight } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        // Fetch the page with retry and User-Agent rotation
        const response = await fetchWithRetry(url);

        const html = response.data;
        const $ = cheerio.load(html);

        // Extract relevant text
        const title = $('title').text() || '';
        const description = $('meta[name="description"]').attr('content') || '';
        const ogTitle = $('meta[property="og:title"]').attr('content') || '';
        const ogDescription = $('meta[property="og:description"]').attr('content') || '';
        const ogImage = $('meta[property="og:image"]').attr('content') || '';

        // Get main content text
        const bodyText = $('body').text().replace(/\s+/g, ' ').substring(0, 5000);

        // Combine all text
        const allText = [title, description, ogTitle, ogDescription, bodyText].join(' ');

        // Use title (prefer og:title) for pattern matching
        const productTitle = ogTitle || title;

        // Extract size information (pass title separately for priority matching)
        const sizeInfo = extractSizeInfo(allText, productTitle);

        // Estimate fit if plushie height is provided
        let fitResult = null;
        if (plushieHeight) {
            fitResult = estimateFit(sizeInfo, plushieHeight);
        }

        res.json({
            success: true,
            product: {
                title: ogTitle || title,
                description: ogDescription || description,
                image: ogImage,
                url: url,
            },
            sizeInfo: sizeInfo,
            fit: fitResult,
        });

    } catch (error) {
        console.error('Error fetching URL:', error.message);

        // Try to at least analyze the URL itself for size hints
        const sizeInfo = extractSizeInfo(url);

        res.json({
            success: false,
            error: 'ページの取得に失敗しました。下の「商品説明を手動入力」をお試しください。',
            urlAnalysis: sizeInfo.rawMatches.length > 0 ? sizeInfo : null,
            suggestion: 'manual_input',
        });
    }
});

// NEW: Endpoint for manual text analysis (when URL fetch fails)
app.post('/api/analyze-text', async (req, res) => {
    const { text, productName, plushieHeight } = req.body;

    if (!text || text.trim().length < 5) {
        return res.status(400).json({ error: '商品説明テキストを入力してください' });
    }

    try {
        // Extract size information from the provided text
        const sizeInfo = extractSizeInfo(text, productName || '');

        // Estimate fit if plushie height is provided
        let fitResult = null;
        if (plushieHeight) {
            fitResult = estimateFit(sizeInfo, plushieHeight);
        }

        res.json({
            success: true,
            product: {
                title: productName || '手動入力した商品',
                description: text.substring(0, 200),
                image: null,
                url: null,
            },
            sizeInfo: sizeInfo,
            fit: fitResult,
            source: 'manual',
        });

    } catch (error) {
        console.error('Error analyzing text:', error.message);
        res.json({
            success: false,
            error: 'テキストの分析に失敗しました。',
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`🚀 PlushFit API Server running on http://localhost:${PORT}`);
});
