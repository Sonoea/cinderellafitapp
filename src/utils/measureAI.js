/**
 * measureAI.js - AIベースのぬいぐるみ寸法推定ユーティリティ
 * 
 * 基準物（10円玉 = 直径23.5mm）を使用して、
 * カメラ画像からぬいぐるみの寸法を推定する。
 */

// 基準物の実寸（mm）
const REFERENCE_OBJECTS = {
    coin10: { name: '10円玉', diameterMM: 23.5, color: { r: 180, g: 120, b: 60 } },
    coin500: { name: '500円玉', diameterMM: 26.5, color: { r: 200, g: 200, b: 180 } },
    ruler: { name: '定規 (1cm)', lengthMM: 10 },
};

/**
 * 画像データからぬいぐるみの寸法を推定
 * @param {HTMLCanvasElement} canvas - キャプチャ画像のキャンバス
 * @param {string} referenceType - 基準物の種類
 * @returns {object} 推定寸法
 */
export function estimateMeasurements(canvas, referenceType = 'coin10') {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { width, height } = canvas;

    // Step 1: 基準物を検出
    const referenceResult = detectReferenceObject(imageData, width, height, referenceType);

    // Step 2: ピクセル→mm変換係数を計算
    let pixelsPerMM;
    if (referenceResult.detected) {
        const ref = REFERENCE_OBJECTS[referenceType];
        pixelsPerMM = referenceResult.diameterPx / ref.diameterMM;
    } else {
        // 基準物が見つからない場合、フォールバック推定
        // 一般的なスマホカメラで30cm離れて撮影した場合の概算
        pixelsPerMM = width / 120; // 画面幅 ≈ 12cm想定
    }

    // Step 3: ぬいぐるみの輪郭を検出
    const silhouette = detectMainObject(imageData, width, height, referenceResult);

    // Step 4: 各部位の寸法を推定
    const measurements = calculateMeasurements(silhouette, pixelsPerMM);

    return {
        ...measurements,
        referenceDetected: referenceResult.detected,
        confidence: referenceResult.detected ? 'high' : 'low',
        pixelsPerMM,
        silhouette,
        referenceResult,
    };
}

/**
 * 基準物（コイン）を検出
 */
function detectReferenceObject(imageData, width, height, type) {
    const { data } = imageData;
    const ref = REFERENCE_OBJECTS[type];

    if (!ref || !ref.color) {
        return { detected: false, x: 0, y: 0, diameterPx: 0 };
    }

    // コインの色に近いピクセルを探索
    const candidates = [];
    const step = 3; // パフォーマンス最適化: 3ピクセルおきにスキャン

    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // 10円玉の銅色を検出（HSV空間で大まかに判定）
            const hsl = rgbToHsl(r, g, b);
            if (type === 'coin10') {
                // 銅色: 色相20-40度、彩度30-80%、明度25-65%
                if (hsl.h >= 15 && hsl.h <= 45 &&
                    hsl.s >= 25 && hsl.s <= 85 &&
                    hsl.l >= 20 && hsl.l <= 65) {
                    candidates.push({ x, y });
                }
            }
        }
    }

    if (candidates.length < 10) {
        return { detected: false, x: 0, y: 0, diameterPx: 0 };
    }

    // クラスタリングで最大のかたまりを見つける
    const cluster = findLargestCluster(candidates, 10 * step);

    if (cluster.points.length < 5) {
        return { detected: false, x: 0, y: 0, diameterPx: 0 };
    }

    // クラスタの中心と直径を計算
    const centerX = cluster.points.reduce((s, p) => s + p.x, 0) / cluster.points.length;
    const centerY = cluster.points.reduce((s, p) => s + p.y, 0) / cluster.points.length;

    // 中心からの最大距離で直径推定
    let maxDist = 0;
    for (const p of cluster.points) {
        const dist = Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2);
        maxDist = Math.max(maxDist, dist);
    }

    const diameterPx = maxDist * 2;

    // 円形度チェック（コインは円に近い）
    const expectedArea = Math.PI * (diameterPx / 2) ** 2;
    const actualArea = cluster.points.length * step * step;
    const circularity = actualArea / expectedArea;

    if (circularity < 0.3 || circularity > 2.0) {
        return { detected: false, x: 0, y: 0, diameterPx: 0 };
    }

    return {
        detected: true,
        x: centerX,
        y: centerY,
        diameterPx,
        circularity,
    };
}

/**
 * メインオブジェクト（ぬいぐるみ）のシルエットを検出
 */
function detectMainObject(imageData, width, height, referenceResult) {
    const { data } = imageData;

    // 背景色を推定（四隅のピクセルの中央値）
    const cornerSamples = [];
    const sampleSize = 10;
    for (let i = 0; i < sampleSize; i++) {
        for (let j = 0; j < sampleSize; j++) {
            // 各コーナーから
            const corners = [
                { x: i, y: j },
                { x: width - 1 - i, y: j },
                { x: i, y: height - 1 - j },
                { x: width - 1 - i, y: height - 1 - j },
            ];
            for (const c of corners) {
                const idx = (c.y * width + c.x) * 4;
                cornerSamples.push({
                    r: data[idx], g: data[idx + 1], b: data[idx + 2]
                });
            }
        }
    }

    const bgColor = {
        r: median(cornerSamples.map(s => s.r)),
        g: median(cornerSamples.map(s => s.g)),
        b: median(cornerSamples.map(s => s.b)),
    };

    // 背景と十分に異なるピクセルを前景（ぬいぐるみ）とみなす
    const threshold = 40;
    const foreground = new Uint8Array(width * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const diff = Math.sqrt(
                (data[idx] - bgColor.r) ** 2 +
                (data[idx + 1] - bgColor.g) ** 2 +
                (data[idx + 2] - bgColor.b) ** 2
            );
            foreground[y * width + x] = diff > threshold ? 1 : 0;
        }
    }

    // 基準物の領域を除外
    if (referenceResult.detected) {
        const r = referenceResult.diameterPx / 2 + 10;
        for (let y = Math.max(0, Math.floor(referenceResult.y - r)); y < Math.min(height, Math.ceil(referenceResult.y + r)); y++) {
            for (let x = Math.max(0, Math.floor(referenceResult.x - r)); x < Math.min(width, Math.ceil(referenceResult.x + r)); x++) {
                const dist = Math.sqrt((x - referenceResult.x) ** 2 + (y - referenceResult.y) ** 2);
                if (dist < r) {
                    foreground[y * width + x] = 0;
                }
            }
        }
    }

    // バウンディングボックスを見つける
    let minX = width, maxX = 0, minY = height, maxY = 0;
    let pixelCount = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (foreground[y * width + x]) {
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
                pixelCount++;
            }
        }
    }

    // 水平スキャン（各行の前景ピクセル幅）で胴体の幅を推定
    const rowWidths = [];
    for (let y = minY; y <= maxY; y++) {
        let rowMinX = width, rowMaxX = 0;
        for (let x = minX; x <= maxX; x++) {
            if (foreground[y * width + x]) {
                rowMinX = Math.min(rowMinX, x);
                rowMaxX = Math.max(rowMaxX, x);
            }
        }
        rowWidths.push({
            y,
            width: rowMaxX > rowMinX ? rowMaxX - rowMinX : 0,
            minX: rowMinX,
            maxX: rowMaxX,
        });
    }

    return {
        bounds: { minX, maxX, minY, maxY },
        heightPx: maxY - minY,
        widthPx: maxX - minX,
        pixelCount,
        rowWidths,
        foreground,
        bgColor,
    };
}

/**
 * シルエットから各部位の寸法を計算
 */
function calculateMeasurements(silhouette, pixelsPerMM) {
    if (!silhouette || silhouette.heightPx < 10) {
        return {
            height: 0, waist: 0, head: 0, neck: 0,
            length: 0, shoulder: 0, arm: 0, armGirth: 0, leg: 0,
        };
    }

    const pxToMM = (px) => px / pixelsPerMM;
    const pxToCM = (px) => Math.round(pxToMM(px) / 10 * 10) / 10; // 0.1cm精度

    const totalHeightPx = silhouette.heightPx;
    const validWidths = silhouette.rowWidths.filter(r => r.width > 0);

    if (validWidths.length === 0) {
        return {
            height: pxToCM(totalHeightPx),
            waist: 0, head: 0, neck: 0,
            length: 0, shoulder: 0, arm: 0, armGirth: 0, leg: 0,
        };
    }

    // 頭部推定: 上位15%の領域
    const headRegion = validWidths.slice(0, Math.floor(validWidths.length * 0.15));
    const headMaxWidth = headRegion.length > 0 ? Math.max(...headRegion.map(r => r.width)) : 0;

    // 首推定: 頭の下のくびれ（上位15-25%で最小幅）
    const neckRegion = validWidths.slice(
        Math.floor(validWidths.length * 0.12),
        Math.floor(validWidths.length * 0.28)
    );
    const neckMinWidth = neckRegion.length > 0 ? Math.min(...neckRegion.map(r => r.width)) : 0;

    // 肩推定: 上位25-35%の最大幅
    const shoulderRegion = validWidths.slice(
        Math.floor(validWidths.length * 0.22),
        Math.floor(validWidths.length * 0.38)
    );
    const shoulderMaxWidth = shoulderRegion.length > 0 ? Math.max(...shoulderRegion.map(r => r.width)) : 0;

    // 胴回り推定: 中間30-60%の幅の平均（周囲 ≈ 幅 × π）
    const waistRegion = validWidths.slice(
        Math.floor(validWidths.length * 0.30),
        Math.floor(validWidths.length * 0.65)
    );
    const waistAvgWidth = waistRegion.length > 0
        ? waistRegion.reduce((s, r) => s + r.width, 0) / waistRegion.length
        : 0;

    // 腕推定: 体の両側に突出した部分（上部35%のはみ出し）
    const armRegion = validWidths.slice(
        Math.floor(validWidths.length * 0.25),
        Math.floor(validWidths.length * 0.50)
    );
    // 簡易的な腕の長さ推定（肩からの突出分）
    const bodyCenter = armRegion.length > 0
        ? armRegion.reduce((s, r) => s + (r.minX + r.maxX) / 2, 0) / armRegion.length
        : silhouette.widthPx / 2;

    const armLength = shoulderMaxWidth > waistAvgWidth
        ? (shoulderMaxWidth - waistAvgWidth) / 2
        : 0;

    // 脚推定: 下位30%
    const legRegion = validWidths.slice(Math.floor(validWidths.length * 0.70));
    const legLength = legRegion.length > 0
        ? legRegion.length
        : 0;

    // 周囲はπ × 直径で概算（楕円体を仮定）
    const circumference = (width) => width * Math.PI * 0.85; // 楕円補正係数

    return {
        height: pxToCM(totalHeightPx),
        waist: pxToCM(circumference(waistAvgWidth)),
        head: pxToCM(circumference(headMaxWidth)),
        neck: pxToCM(circumference(neckMinWidth)),
        length: pxToCM(totalHeightPx * 0.55), // 胴体長さ ≈ 全身の55%
        shoulder: pxToCM(shoulderMaxWidth),
        arm: pxToCM(armLength > 5 ? armLength : totalHeightPx * 0.15),
        armGirth: pxToCM(circumference(armLength > 5 ? armLength * 0.3 : headMaxWidth * 0.25)),
        leg: pxToCM(legLength > 0 ? legLength : totalHeightPx * 0.2),
    };
}

// --- ヘルパー関数 ---

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
}

function median(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function findLargestCluster(points, maxDist) {
    if (points.length === 0) return { points: [] };

    const visited = new Set();
    let largestCluster = { points: [] };

    for (let i = 0; i < points.length; i++) {
        if (visited.has(i)) continue;

        const cluster = [];
        const queue = [i];
        visited.add(i);

        while (queue.length > 0) {
            const current = queue.shift();
            cluster.push(points[current]);

            for (let j = 0; j < points.length; j++) {
                if (visited.has(j)) continue;
                const dist = Math.sqrt(
                    (points[current].x - points[j].x) ** 2 +
                    (points[current].y - points[j].y) ** 2
                );
                if (dist < maxDist) {
                    visited.add(j);
                    queue.push(j);
                }
            }
        }

        if (cluster.length > largestCluster.points.length) {
            largestCluster = { points: cluster };
        }
    }

    return largestCluster;
}

/**
 * CanvasにAI分析結果をビジュアライズ
 */
export function drawMeasurementOverlay(canvas, measurements, silhouette) {
    const ctx = canvas.getContext('2d');
    if (!silhouette || !silhouette.bounds) return;

    const { minX, maxX, minY, maxY } = silhouette.bounds;

    // 半透明のオーバーレイ
    ctx.fillStyle = 'rgba(99, 102, 241, 0.1)';
    ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

    // バウンディングボックス
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
    ctx.setLineDash([]);

    // 身長ライン
    const centerX = (minX + maxX) / 2;
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(maxX + 20, minY);
    ctx.lineTo(maxX + 20, maxY);
    ctx.stroke();

    // 矢印
    drawArrow(ctx, maxX + 20, minY, 'up');
    drawArrow(ctx, maxX + 20, maxY, 'down');

    // ラベル
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${measurements.height}cm`, maxX + 45, (minY + maxY) / 2);

    // 胴囲ライン
    const waistY = minY + (maxY - minY) * 0.45;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(minX, waistY);
    ctx.lineTo(maxX, waistY);
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`胴 ${measurements.waist}cm`, centerX, waistY - 8);
}

function drawArrow(ctx, x, y, direction) {
    const size = 6;
    ctx.beginPath();
    if (direction === 'up') {
        ctx.moveTo(x - size, y + size);
        ctx.lineTo(x, y);
        ctx.lineTo(x + size, y + size);
    } else {
        ctx.moveTo(x - size, y - size);
        ctx.lineTo(x, y);
        ctx.lineTo(x + size, y - size);
    }
    ctx.stroke();
}

export default { estimateMeasurements, drawMeasurementOverlay };
