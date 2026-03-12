import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Eye, EyeOff } from 'lucide-react';

/**
 * 3Dバーチャル試着コンポーネント
 * 
 * ぬいぐるみの実測値から3Dモデルを生成し、
 * 商品画像をテクスチャとして服メッシュに貼り付けて
 * 実際に着ている見た目を再現。
 */

// ==== ユーティリティ ====
const circumToRadius = (circumference, scale = 10) => {
    if (!circumference || circumference <= 0) return 0.3;
    return circumference / (2 * Math.PI) / scale;
};
const cmToUnit = (cm, scale = 10) => (cm || 0) / scale;

// ==== ぬいぐるみの各パーツ ====
// うなえさんの実写に合わせたフォルム
const PlushieHead = ({ headCircum, neckY, color }) => {
    const radius = Math.max(circumToRadius(headCircum), 0.4);
    return (
        <mesh position={[0, neckY + radius * 0.75, 0]} castShadow>
            <sphereGeometry args={[radius, 32, 32]} />
            <meshStandardMaterial color={color} roughness={0.95} />
        </mesh>
    );
};

// 丸い小さな耳（うなえさんの特徴的な耳）
const PlushieEars = ({ headY, headRadius, color }) => {
    const earR = headRadius * 0.18;
    const earSpread = headRadius * 0.55;
    const earHeight = headY + headRadius * 0.65;
    return (
        <>
            <mesh position={[-earSpread, earHeight, 0]} castShadow>
                <sphereGeometry args={[earR, 16, 16]} />
                <meshStandardMaterial color={color} roughness={0.95} />
            </mesh>
            <mesh position={[earSpread, earHeight, 0]} castShadow>
                <sphereGeometry args={[earR, 16, 16]} />
                <meshStandardMaterial color={color} roughness={0.95} />
            </mesh>
        </>
    );
};

const PlushieBody = ({ waistCircum, bodyLength, neckCircum, color }) => {
    const waistR = circumToRadius(waistCircum);
    const neckR = circumToRadius(neckCircum);
    const height = cmToUnit(bodyLength) || 0.6;
    // 丸い雪だるま型のシルエット（うなえさんに合わせる）
    const points = useMemo(() => {
        const pts = [];
        const maxR = Math.max(waistR, neckR) * 1.1; // より丸く
        for (let i = 0; i <= 32; i++) {
            const t = i / 32;
            let r;
            if (t < 0.1) {
                // 首からの滑らかな移行
                r = neckR + (maxR - neckR) * (t / 0.1) * 0.5;
            } else if (t < 0.5) {
                // 膨らんだお腹（サインカーブで丸みを表現）
                const bulge = Math.sin(((t - 0.1) / 0.4) * Math.PI);
                r = maxR * (0.85 + 0.2 * bulge);
            } else if (t < 0.85) {
                // 下半身も丸い（急に細くならない）
                const taper = Math.cos(((t - 0.5) / 0.35) * Math.PI * 0.4);
                r = maxR * (0.85 + 0.1 * taper);
            } else {
                // 底部は丸く閉じる
                const close = (t - 0.85) / 0.15;
                r = maxR * 0.85 * (1 - close * close);
            }
            pts.push(new THREE.Vector2(Math.max(r, 0.05), -t * height));
        }
        return pts;
    }, [waistR, neckR, height]);

    return (
        <mesh position={[0, 0, 0]} castShadow>
            <latheGeometry args={[points, 32]} />
            <meshStandardMaterial color={color} roughness={0.95} side={THREE.DoubleSide} />
        </mesh>
    );
};

const PlushieArm = ({ armLength, armGirth, bodyWaistR, side, color }) => {
    const length = cmToUnit(armLength) || 0.2;
    const radius = circumToRadius(armGirth) || 0.08;
    // 短くて丸い手（うなえさんの特徴）
    return (
        <mesh position={[side * (bodyWaistR * 0.85 + radius * 0.5), -0.05, 0.05]} rotation={[0.1, 0, side * 0.5]} castShadow>
            <capsuleGeometry args={[radius * 1.1, length * 0.7, 8, 16]} />
            <meshStandardMaterial color={color} roughness={0.95} />
        </mesh>
    );
};

const PlushieLeg = ({ legLength, bodyBottom, side, color }) => {
    const length = cmToUnit(legLength) || 0.2;
    return (
        <mesh position={[side * 0.12, bodyBottom - length * 0.4, 0]} castShadow>
            <capsuleGeometry args={[0.1, length * 0.8, 8, 16]} />
            <meshStandardMaterial color={color} roughness={0.95} />
        </mesh>
    );
};

// 目は極小（うなえさんは目がほぼ見えない）
const PlushieEyes = ({ headY, headRadius }) => {
    const er = headRadius * 0.035;
    const ez = headRadius * 0.93;
    const sp = headRadius * 0.22;
    return (
        <>
            <mesh position={[-sp, headY - headRadius * 0.05, ez]}><sphereGeometry args={[er, 12, 12]} /><meshStandardMaterial color="#0a0a0a" roughness={0.1} /></mesh>
            <mesh position={[sp, headY - headRadius * 0.05, ez]}><sphereGeometry args={[er, 12, 12]} /><meshStandardMaterial color="#0a0a0a" roughness={0.1} /></mesh>
        </>
    );
};

// ピンクの口（うなえさんの笑顔）
const PlushieMouth = ({ headY, headRadius }) => {
    const mouthY = headY - headRadius * 0.2;
    const mouthZ = headRadius * 0.94;
    const mouthWidth = headRadius * 0.2;

    // 曲線の口をラインで表現
    const points = useMemo(() => {
        const pts = [];
        for (let i = 0; i <= 12; i++) {
            const t = (i / 12) * Math.PI;
            const x = Math.cos(t) * mouthWidth;
            const y = Math.sin(t) * mouthWidth * 0.3; // 浅いカーブ
            pts.push(new THREE.Vector3(x, mouthY - y, mouthZ));
        }
        return pts;
    }, [mouthY, mouthZ, mouthWidth]);

    const lineGeo = useMemo(() => {
        return new THREE.BufferGeometry().setFromPoints(points);
    }, [points]);

    return (
        <line geometry={lineGeo}>
            <lineBasicMaterial color="#d4a0c8" linewidth={2} />
        </line>
    );
};

// ==== 商品画像からカラー抽出 ====

// 商品画像のドミナントカラーを抽出するフック
const useProductColor = (imageUrl) => {
    const [extractedColor, setExtractedColor] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setExtractedColor(null);

        if (!imageUrl) return;

        // CORS回避のためにプロキシAPIを経由する
        let urlToLoad = imageUrl;
        if (!imageUrl.startsWith('data:') && !imageUrl.startsWith('/')) {
            const API_BASE = import.meta.env.DEV ? 'https://cinderellafitapp.vercel.app' : '';
            // /api/proxy-imageエンドポイントを使用してCORS制限を回避
            urlToLoad = `${API_BASE}/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
        }

        console.log('[3D Color] Extracting dominant color from:', urlToLoad);
        setLoading(true);

        const img = new window.Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            try {
                // Canvasに描画して色を抽出
                const canvas = document.createElement('canvas');
                const size = 64; // サンプリング用の小さいサイズ
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, size, size);
                const imageData = ctx.getImageData(0, 0, size, size).data;

                // 色の出現頻度を集計（背景を除外）
                const colorCounts = {};
                let totalPixels = 0;

                for (let i = 0; i < imageData.length; i += 4) {
                    const r = imageData[i];
                    const g = imageData[i + 1];
                    const b = imageData[i + 2];
                    const a = imageData[i + 3];

                    // 透明ピクセルを除外
                    if (a < 128) continue;

                    // 白・薄グレー背景を除外（r,g,b全て220以上）
                    if (r > 220 && g > 220 && b > 220) continue;
                    // 黒・暗い背景を除外（r,g,b全て30以下）
                    if (r < 30 && g < 30 && b < 30) continue;
                    // 灰色を除外（彩度が非常に低い）
                    const max = Math.max(r, g, b);
                    const min = Math.min(r, g, b);
                    const saturation = max === 0 ? 0 : (max - min) / max;
                    // 灰色系（彩度<0.08かつ明度が中間）は除外
                    if (saturation < 0.08 && max > 50 && max < 210) continue;

                    // 色を量子化（16段階に丸める → 4096色に圧縮）
                    const qr = Math.round(r / 16) * 16;
                    const qg = Math.round(g / 16) * 16;
                    const qb = Math.round(b / 16) * 16;
                    const key = `${qr},${qg},${qb}`;

                    colorCounts[key] = (colorCounts[key] || 0) + 1;
                    totalPixels++;
                }

                if (totalPixels === 0) {
                    console.log('[3D Color] No valid pixels found');
                    setLoading(false);
                    return;
                }

                // 最も多い色を取得
                let dominantKey = null;
                let maxCount = 0;
                for (const [key, count] of Object.entries(colorCounts)) {
                    if (count > maxCount) {
                        maxCount = count;
                        dominantKey = key;
                    }
                }

                if (dominantKey) {
                    const [dr, dg, db] = dominantKey.split(',').map(Number);
                    const hex = `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
                    console.log('[3D Color] Dominant color:', hex, `(${maxCount}/${totalPixels} pixels, ${Math.round(maxCount / totalPixels * 100)}%)`);
                    setExtractedColor(hex);
                }

                setLoading(false);
            } catch (err) {
                console.error('[3D Color] Extraction error:', err);
                setLoading(false);
            }
        };

        img.onerror = () => {
            console.error('[3D Color] Image load error');
            setLoading(false);
        };

        img.src = urlToLoad;
    }, [imageUrl]);

    return { extractedColor, loading };
};

// 商品画像をテクスチャとして読み込むフック
const useProductTexture = (imageUrl) => {
    const [texture, setTexture] = useState(null);

    useEffect(() => {
        setTexture(null);
        if (!imageUrl) return;

        // data: URI または外部URL
        let urlToLoad = imageUrl;
        if (!imageUrl.startsWith('data:') && !imageUrl.startsWith('/')) {
            // CORS回避のためにプロキシAPIを経由する
            const API_BASE = import.meta.env.DEV ? 'https://cinderellafitapp.vercel.app' : '';
            urlToLoad = `${API_BASE}/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
        }

        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');

        loader.load(
            urlToLoad,
            (tex) => {
                // 商品の画像を3Dモデル（LatheGeometry）の前面に中心が来るように配置する
                // u方向（円周）: 1周で1.0なので、前面にだけテクスチャが広がるようにrepeatとoffsetを調整
                tex.wrapS = THREE.ClampToEdgeWrapping;
                tex.wrapT = THREE.ClampToEdgeWrapping;
                tex.repeat.set(2.5, 1.2);
                tex.offset.set(-0.75, -0.1); // フロントに合わせて位置調整
                tex.minFilter = THREE.LinearFilter;
                tex.magFilter = THREE.LinearFilter;
                tex.colorSpace = "srgb"; // より自然な色にするため
                tex.needsUpdate = true;
                setTexture(tex);
                console.log('[3D Texture] Product texture loaded and mapped');
            },
            undefined,
            (err) => {
                console.log('[3D Texture] Failed to load, falling back to color:', err?.message);
            }
        );

        return () => {
            if (texture) texture.dispose();
        };
    }, [imageUrl]);

    return texture;
};

// 商品名からカラーキーワードを検出
const detectColorFromName = (name) => {
    if (!name) return null;
    const colorMap = {
        // 日本語色名
        '赤': '#c0392b', '紅': '#c0392b', 'レッド': '#c0392b',
        '青': '#2980b9', 'ブルー': '#2980b9',
        '緑': '#27ae60', 'グリーン': '#27ae60',
        '黄': '#f1c40f', 'イエロー': '#f1c40f',
        '黒': '#2c3e50', 'ブラック': '#2c3e50',
        '白': '#ecf0f1', 'ホワイト': '#ecf0f1',
        'ピンク': '#e84393', '桃': '#e84393',
        '紫': '#8e44ad', 'パープル': '#8e44ad',
        '茶': '#8B4513', 'ブラウン': '#8B4513',
        'グレー': '#7f8c8d', '灰': '#7f8c8d',
        'ベージュ': '#d2b48c',
        'ネイビー': '#2c3e50', '紺': '#2c3e50',
        'オレンジ': '#e67e22', '橙': '#e67e22',
        // 英語略称（商品名でよく使われる）
        'RD': '#c0392b', 'RED': '#c0392b',
        'BK': '#2c3e50', 'BLK': '#2c3e50', 'BLACK': '#2c3e50',
        'WH': '#ecf0f1', 'WHT': '#ecf0f1', 'WHITE': '#ecf0f1',
        'BL': '#2980b9', 'BLU': '#2980b9', 'BLUE': '#2980b9',
        'GR': '#27ae60', 'GRN': '#27ae60', 'GREEN': '#27ae60',
        'PK': '#e84393', 'PINK': '#e84393',
        'NV': '#2c3e50', 'NAVY': '#2c3e50',
        'YE': '#f1c40f', 'YEL': '#f1c40f',
        'PP': '#8e44ad', 'PUR': '#8e44ad',
        'BR': '#8B4513', 'BRN': '#8B4513',
        'GY': '#7f8c8d', 'GRAY': '#7f8c8d', 'GREY': '#7f8c8d',
    };
    // 英語略称は単語境界で検索（全角スペース・半角スペース・記号区切り）
    for (const [key, color] of Object.entries(colorMap)) {
        if (/^[A-Z]+$/.test(key)) {
            // 英語略称: 単語として独立している場合のみマッチ
            const regex = new RegExp(`(?:^|[\\s　/／・])${key}(?:$|[\\s　/／・])`, 'i');
            if (regex.test(name)) return color;
        } else {
            if (name.includes(key)) return color;
        }
    }
    return null;
};

// 服の本体メッシュ（商品カラー＋形状バリエーション対応）
const ClothingMesh = ({ measurements, sizeInfo, fitStatus, productImageUrl, clothingType, productName }) => {
    const { extractedColor } = useProductColor(productImageUrl);
    const nameColor = useMemo(() => detectColorFromName(productName), [productName]);

    const fitColor = useMemo(() => {
        switch (fitStatus) {
            case 'perfect': return '#22c55e';
            case 'tight': case 'tooSmall': return '#ef4444';
            case 'loose': case 'tooBig': return '#3b82f6';
            default: return '#a78bfa';
        }
    }, [fitStatus]);

    const clothingParams = useMemo(() => {
        const dims = sizeInfo?.dimensions || {};
        const targetSize = sizeInfo?.targetPlushieSize || 0;
        let itemLength = dims.itemLength || dims.length || 0;
        let itemWidth = dims.width || dims.bodyWidth || 0;
        let itemNeck = dims.neck || 0;
        if (!itemLength && targetSize > 0) {
            itemLength = targetSize * 0.65;
        }
        return { itemLength, itemWidth, itemNeck, targetSize };
    }, [sizeInfo]);

    const { itemLength, itemWidth, itemNeck, targetSize } = clothingParams;
    const neckR = circumToRadius(measurements?.neck || 13);
    const waistR = circumToRadius(measurements?.waist || 15);
    const bodyLength = cmToUnit(measurements?.length || 8);

    // clothingTypeに応じた服のシルエット（ジャストフィット・モード）
    const clothingGeometry = useMemo(() => {
        const type = clothingType || 'tops';
        let clothLen, clothWidthR, clothNeckR;

        // 商品の実測サイズを無視し、常にぬいぐるみのサイズに合わせてジャストフィットさせる
        clothWidthR = waistR * 1.05; // 胴回りに合わせて少し余裕を持たせる
        clothNeckR = neckR * 1.12;   // 首回りに合わせて少し余裕を持たせる

        const pts = [];

        if (type === 'dress') {
            // ドレス・チャイナ服: 長めのストレートボディ＋裾が少し広がる
            clothLen = bodyLength * 1.1;
            for (let i = 0; i <= 32; i++) {
                const t = i / 32;
                let radius;
                if (t < 0.03) radius = clothNeckR * 1.05;
                else if (t < 0.12) radius = clothNeckR + (clothWidthR * 1.05 - clothNeckR) * ((t - 0.03) / 0.09);
                else if (t < 0.6) {
                    // ストレートなボディライン（チャイナ服風）
                    radius = clothWidthR * 1.05 + Math.sin(((t - 0.12) / 0.48) * Math.PI) * clothWidthR * 0.05;
                } else if (t < 0.85) {
                    // 腰から裾にかけて少し広がる
                    const flare = ((t - 0.6) / 0.25);
                    radius = clothWidthR * 1.05 + flare * clothWidthR * 0.2;
                } else {
                    // 裾
                    radius = clothWidthR * 1.25;
                }
                pts.push(new THREE.Vector2(Math.max(radius, 0.12), -t * clothLen));
            }
        } else if (type === 'outerwear') {
            // アウター（今回のジャケット等）: 厚めで余裕のあるシルエット
            clothLen = bodyLength * 0.95;
            const extra = 1.18; // 厚さ倍率
            for (let i = 0; i <= 28; i++) {
                const t = i / 28;
                let radius;
                if (t < 0.05) radius = clothNeckR * 1.15;
                else if (t < 0.15) radius = clothNeckR * 1.15 + (clothWidthR * extra - clothNeckR * 1.15) * ((t - 0.05) / 0.1);
                else if (t < 0.7) radius = clothWidthR * extra + Math.sin(((t - 0.15) / 0.55) * Math.PI) * clothWidthR * 0.1;
                else if (t < 0.95) radius = clothWidthR * extra;
                else radius = clothWidthR * extra * 0.95;
                pts.push(new THREE.Vector2(Math.max(radius, 0.12), -t * clothLen));
            }
        } else {
            // トップス（デフォルト）: 短め、ゆるいシルエット
            clothLen = bodyLength * 0.85;
            for (let i = 0; i <= 28; i++) {
                const t = i / 28;
                let radius;
                if (t < 0.05) radius = clothNeckR * 1.05;
                else if (t < 0.15) radius = clothNeckR + (clothWidthR * 1.1 - clothNeckR) * ((t - 0.05) / 0.1);
                else if (t < 0.7) radius = clothWidthR * 1.1 + Math.sin(((t - 0.15) / 0.55) * Math.PI) * clothWidthR * 0.08;
                else if (t < 0.95) radius = clothWidthR * 1.1 + ((t - 0.7) / 0.25) * clothWidthR * 0.15;
                else radius = clothWidthR * 1.25;
                pts.push(new THREE.Vector2(Math.max(radius, 0.12), -t * clothLen));
            }
        }
        return pts;
    }, [bodyLength, waistR, neckR, clothingType]);

    // 袖パラメータ（ジャストフィット・モード）
    const sleeveParams = useMemo(() => {
        const type = clothingType || 'tops';
        const armR = circumToRadius(measurements?.armGirth || 3);
        const clothWidthR = waistR * 1.05;

        // ぬいぐるみの腕の長さにピッタリ合わせる
        let sleeveLen = cmToUnit(measurements?.arm || 3) * 0.8;
        let sleeveR = armR * 1.4;

        if (type === 'outerwear') {
            sleeveR = armR * 1.7; // アウターは袖が太い
            sleeveLen *= 1.1;     // アウターは少し袖長め
        } else if (type === 'dress') {
            sleeveR = armR * 1.3; // ドレスは袖が細め
            sleeveLen *= 0.8;
        }

        return { sleeveLen, sleeveR, bodyR: clothWidthR * 1.1 };
    }, [measurements, waistR, clothingType]);

    // 服の色: 画像抽出 → 商品名色 → フィット状態色 の優先順
    const clothingColor = extractedColor || nameColor || fitColor;
    const hasRealColor = !!(extractedColor || nameColor);

    const materialProps = useMemo(() => ({
        color: clothingColor,
        roughness: 0.8,
        metalness: 0.1,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: hasRealColor ? 0.95 : 0.85,
    }), [clothingColor, hasRealColor]);

    const sleeveMaterialProps = useMemo(() => ({
        color: clothingColor,
        roughness: 0.6,
        metalness: 0.05,
        transparent: true,
        opacity: hasRealColor ? 0.88 : 0.75,
    }), [clothingColor, hasRealColor]);

    // 襟のタイプ（clothingTypeで変更）
    const collarType = clothingType || 'tops';

    // ドレス型の服の長さ（装飾ディテール配置に使用）
    const dressLength = useMemo(() => {
        if (clothingType !== 'dress') return 0;
        return bodyLength * 1.1; // 実測サイズ無視
    }, [clothingType, bodyLength]);

    // チャイナ服の装飾ディテール用ジオメトリ
    const dressDetails = useMemo(() => {
        if (clothingType !== 'dress') return null;

        const clothWidthR = waistR * 1.08;
        const frontR = clothWidthR * 1.06;

        // 前合わせライン（中心から少しずれた位置の縦ライン）
        const frontLinePts = [];
        for (let i = 0; i <= 16; i++) {
            const t = i / 16;
            frontLinePts.push(new THREE.Vector3(
                frontR * 0.15,
                0.02 - t * dressLength * 0.85,
                frontR * 0.99
            ));
        }

        // チャイナボタン（盘扣）の位置
        const buttonPositions = [0.08, 0.22, 0.36, 0.50].map(t => ({
            x: frontR * 0.15,
            y: 0.02 - t * dressLength,
            z: frontR * 0.995,
        }));

        // トリムライン（裾の装飾）
        const trimPts = [];
        const trimY = 0.02 - dressLength * 0.88;
        for (let i = 0; i <= 32; i++) {
            const angle = (i / 32) * Math.PI * 2;
            const r = clothWidthR * 1.22;
            trimPts.push(new THREE.Vector3(
                Math.sin(angle) * r,
                trimY,
                Math.cos(angle) * r,
            ));
        }

        return { frontLinePts, buttonPositions, trimPts, frontR };
    }, [clothingType, dressLength, waistR]);

    return (
        <group>
            {/* 服の本体 */}
            <mesh position={[0, 0.02, 0]}>
                <latheGeometry args={[clothingGeometry, 32]} />
                <meshStandardMaterial {...materialProps} />
            </mesh>

            {/* テクスチャマッピングは破棄（ペーパークラフト化防止のため色抽出のみ適用） */}

            {/* ドレス型の装飾ディテール */}
            {dressDetails && (
                <>
                    {/* 前合わせライン */}
                    <line geometry={new THREE.BufferGeometry().setFromPoints(dressDetails.frontLinePts)}>
                        <lineBasicMaterial color={extractedColor ? '#000000' : '#ffffff'} transparent={true} opacity={extractedColor ? 0.38 : 0.5} linewidth={1} />
                    </line>

                    {/* チャイナボタン（盘扣） */}
                    {dressDetails.buttonPositions.map((pos, i) => (
                        <group key={`btn-${i}`} position={[pos.x, pos.y, pos.z]}>
                            {/* ボタンの結び目 */}
                            <mesh>
                                <sphereGeometry args={[0.012, 8, 8]} />
                                <meshStandardMaterial
                                    color={extractedColor ? '#d4af37' : '#ffd700'}
                                    metalness={0.3}
                                    roughness={0.4}
                                />
                            </mesh>
                            {/* ボタンのループ */}
                            <mesh rotation={[0, 0, Math.PI / 2]}>
                                <torusGeometry args={[0.015, 0.003, 6, 12]} />
                                <meshStandardMaterial
                                    color={extractedColor ? '#d4af37' : '#ffd700'}
                                    metalness={0.3}
                                    roughness={0.4}
                                />
                            </mesh>
                        </group>
                    ))}

                    {/* 裾のトリムライン */}
                    <line geometry={new THREE.BufferGeometry().setFromPoints(dressDetails.trimPts)}>
                        <lineBasicMaterial color={extractedColor ? '#d4af37' : '#ffd700'} transparent={true} opacity={0.5} linewidth={1} />
                    </line>
                </>
            )}

            {/* 左袖 */}
            {sleeveParams.sleeveLen > 0.05 && (
                <mesh position={[-(sleeveParams.bodyR + sleeveParams.sleeveLen * 0.3), -0.05, 0]} rotation={[0, 0, Math.PI / 2 + 0.3]}>
                    <capsuleGeometry args={[sleeveParams.sleeveR, sleeveParams.sleeveLen, 8, 16]} />
                    <meshStandardMaterial {...sleeveMaterialProps} />
                </mesh>
            )}

            {/* 右袖 */}
            {sleeveParams.sleeveLen > 0.05 && (
                <mesh position={[(sleeveParams.bodyR + sleeveParams.sleeveLen * 0.3), -0.05, 0]} rotation={[0, 0, -(Math.PI / 2 + 0.3)]}>
                    <capsuleGeometry args={[sleeveParams.sleeveR, sleeveParams.sleeveLen, 8, 16]} />
                    <meshStandardMaterial {...sleeveMaterialProps} />
                </mesh>
            )}

            {/* 襟 — clothingTypeで形を変える */}
            {collarType === 'dress' ? (
                // 立ち襟（チャイナ服風）
                <mesh position={[0, 0.05, 0]}>
                    <cylinderGeometry args={[neckR * 1.18, neckR * 1.22, 0.06, 16, 1, true]} />
                    <meshStandardMaterial
                        color={clothingColor}
                        roughness={0.4}
                        transparent opacity={0.9}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            ) : collarType === 'outerwear' ? (
                // フード風の厚い襟
                <mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[neckR * 1.25, 0.04, 8, 32]} />
                    <meshStandardMaterial
                        color={clothingColor}
                        roughness={0.5}
                        transparent opacity={0.9}
                    />
                </mesh>
            ) : (
                // 通常の丸襟
                <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[neckR * 1.2, 0.02, 8, 32]} />
                    <meshStandardMaterial
                        color={clothingColor}
                        roughness={0.4}
                        transparent opacity={0.9}
                    />
                </mesh>
            )}

            {/* フィットインジケーター（キツい場合） */}
            {(fitStatus === 'tight' || fitStatus === 'tooSmall') && (
                <>
                    {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, i) => (
                        <mesh key={`p-${i}`} position={[
                            Math.sin(angle) * waistR * 0.95,
                            -cmToUnit(measurements?.length || 8) * 0.4,
                            Math.cos(angle) * waistR * 0.95,
                        ]}>
                            <sphereGeometry args={[0.03, 8, 8]} />
                            <meshStandardMaterial color="#ff0000" emissive="#ff3333" emissiveIntensity={0.5} />
                        </mesh>
                    ))}
                </>
            )}

            {/* 商品カラー適用ラベル */}
            {hasRealColor && (
                <Html position={[0, -bodyLength * 0.5, waistR * 1.4]} center>
                    <div style={{
                        background: 'rgba(34,197,94,0.9)',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '8px',
                        fontSize: '8px',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}>
                        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: clothingColor, border: '1px solid rgba(255,255,255,0.8)' }} />
                        🎨 商品カラー
                    </div>
                </Html>
            )}
        </group>
    );
};

// デフォルトのデモ服（分析前）
const DefaultClothing = ({ measurements }) => {
    const neckR = circumToRadius(measurements?.neck || 13);
    const waistR = circumToRadius(measurements?.waist || 15);
    const bodyLength = cmToUnit(measurements?.length || 8);

    const clothingShape = useMemo(() => {
        const pts = [];
        const clothLen = bodyLength * 0.8;
        for (let i = 0; i <= 24; i++) {
            const t = i / 24;
            let radius;
            if (t < 0.05) radius = neckR * 1.1;
            else if (t < 0.15) radius = neckR * 1.1 + (waistR * 1.15 - neckR * 1.1) * ((t - 0.05) / 0.1);
            else if (t < 0.85) radius = waistR * 1.15 + Math.sin(((t - 0.15) / 0.7) * Math.PI) * 0.03;
            else radius = waistR * 1.15 + ((t - 0.85) / 0.15) * waistR * 0.2;
            pts.push(new THREE.Vector2(Math.max(radius, 0.12), -t * clothLen));
        }
        return pts;
    }, [neckR, waistR, bodyLength]);

    const armR = circumToRadius(measurements?.armGirth || 3);
    const sleeveLen = cmToUnit(measurements?.arm || 3) * 0.6;
    const sleeveR = armR * 1.3;

    return (
        <group>
            <mesh position={[0, 0.02, 0]}>
                <latheGeometry args={[clothingShape, 32]} />
                <meshStandardMaterial color="#e8b4d8" roughness={0.5} side={THREE.DoubleSide} transparent opacity={0.65} />
            </mesh>
            {sleeveLen > 0.05 && (
                <>
                    <mesh position={[-(waistR * 1.15 + sleeveLen * 0.3), -0.05, 0]} rotation={[0, 0, Math.PI / 2 + 0.3]}>
                        <capsuleGeometry args={[sleeveR, sleeveLen, 8, 16]} />
                        <meshStandardMaterial color="#e8b4d8" roughness={0.5} transparent opacity={0.65} />
                    </mesh>
                    <mesh position={[(waistR * 1.15 + sleeveLen * 0.3), -0.05, 0]} rotation={[0, 0, -(Math.PI / 2 + 0.3)]}>
                        <capsuleGeometry args={[sleeveR, sleeveLen, 8, 16]} />
                        <meshStandardMaterial color="#e8b4d8" roughness={0.5} transparent opacity={0.65} />
                    </mesh>
                </>
            )}
            <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[neckR * 1.15, 0.02, 8, 32]} />
                <meshStandardMaterial color="#d4a0c8" roughness={0.4} transparent opacity={0.8} />
            </mesh>
            <Html position={[0, -bodyLength * 0.4, waistR * 1.3]} center>
                <div style={{
                    background: 'rgba(232,180,216,0.9)', color: '#7c2d6e',
                    padding: '2px 8px', borderRadius: '8px',
                    fontSize: '8px', fontWeight: 800,
                    whiteSpace: 'nowrap', pointerEvents: 'none',
                    border: '1px solid rgba(232,180,216,0.5)',
                }}>
                    👗 デモ
                </div>
            </Html>
        </group>
    );
};

// ==== 帽子メッシュ ====
const HatMesh = ({ measurements, sizeInfo, fitStatus, productImageUrl }) => {
    const { extractedColor } = useProductColor(productImageUrl);

    const fitColor = useMemo(() => {
        switch (fitStatus) {
            case 'perfect': return '#22c55e';
            case 'tight': case 'tooSmall': return '#ef4444';
            case 'loose': case 'tooBig': return '#3b82f6';
            default: return '#a78bfa';
        }
    }, [fitStatus]);

    const hatColor = extractedColor || fitColor;

    const headR = Math.max(circumToRadius(measurements?.head || 14), 0.4);
    const neckY = 0;
    const headY = neckY + headR * 0.8;

    // 帽子のサイズ（商品の頭囲データがあればそれを使用）
    const hatParams = useMemo(() => {
        const dims = sizeInfo?.dimensions || {};
        const mHead = sizeInfo?.measurements?.head;
        let hatRadius;
        if (mHead) {
            const headVal = typeof mHead === 'object' ? (mHead.max || mHead.min) : mHead;
            hatRadius = circumToRadius(headVal);
        } else {
            hatRadius = headR * 1.08; // デフォルト: 頭より少し大きめ
        }
        return {
            radius: Math.max(hatRadius, 0.2),
            crownHeight: hatRadius * 0.6,
            brimWidth: hatRadius * 0.3,
        };
    }, [sizeInfo, headR]);

    return (
        <group position={[0, headY + headR * 0.35, 0]}>
            {/* 帽子のクラウン（ドーム部分） */}
            <mesh position={[0, hatParams.crownHeight * 0.3, 0]}>
                <sphereGeometry args={[hatParams.radius, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                <meshStandardMaterial
                    color={hatColor}
                    roughness={0.5}
                    metalness={0.05}
                    side={THREE.DoubleSide}
                    transparent
                    opacity={extractedColor ? 0.9 : 0.8}
                />
            </mesh>

            {/* 帽子のツバ（brim） */}
            <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[hatParams.radius, hatParams.brimWidth * 0.4, 8, 32]} />
                <meshStandardMaterial
                    color={hatColor}
                    roughness={0.5}
                    metalness={0.05}
                    transparent
                    opacity={extractedColor ? 0.9 : 0.8}
                />
            </mesh>

            {/* 帽子のバンド（装飾ライン） */}
            <mesh position={[0, hatParams.crownHeight * 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[hatParams.radius * 0.99, 0.015, 8, 32]} />
                <meshStandardMaterial
                    color={extractedColor ? '#000000' : '#ffffff'}
                    roughness={0.3}
                    transparent
                    opacity={extractedColor ? 0.25 : 0.38}
                />
            </mesh>

            {/* フィットインジケーター（キツい場合） */}
            {(fitStatus === 'tight' || fitStatus === 'tooSmall') && (
                <>
                    {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, i) => (
                        <mesh key={`hp-${i}`} position={[
                            Math.sin(angle) * hatParams.radius * 0.95,
                            0,
                            Math.cos(angle) * hatParams.radius * 0.95,
                        ]}>
                            <sphereGeometry args={[0.025, 8, 8]} />
                            <meshStandardMaterial color="#ff0000" emissive="#ff3333" emissiveIntensity={0.5} />
                        </mesh>
                    ))}
                </>
            )}

            {/* 商品カラーラベル */}
            {extractedColor && (
                <Html position={[hatParams.radius * 1.3, hatParams.crownHeight * 0.3, 0]} center>
                    <div style={{
                        background: 'rgba(34,197,94,0.9)',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '8px',
                        fontSize: '8px',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}>
                        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: extractedColor, border: '1px solid rgba(255,255,255,0.8)' }} />
                        🎩 商品カラー
                    </div>
                </Html>
            )}
        </group>
    );
};

// ==== cmグリッド背景 ====
const CmGrid = ({ measurements }) => {
    const SCALE = 10;
    const height = measurements?.height || 12;
    // グリッド範囲を計測値ベースで決定（余白込み）
    const gridH = Math.ceil(height * 1.2);  // 縦cm
    const gridW = Math.ceil(gridH * 0.8);   // 横cm
    const unitH = gridH / SCALE;
    const unitW = gridW / SCALE;
    const step = 1 / SCALE; // 1cm = 0.1 units

    const gridElements = useMemo(() => {
        const lines = [];
        const labels = [];

        // === 横線（1cm間隔）===
        for (let i = 0; i <= gridH; i++) {
            const y = -i * step + unitH * 0.45;
            const isMajor = i % 5 === 0;
            const points = [
                new THREE.Vector3(-unitW / 2, y, -0.6),
                new THREE.Vector3(unitW / 2, y, -0.6),
            ];
            const geo = new THREE.BufferGeometry().setFromPoints(points);
            lines.push(
                <lineSegments key={`h-${i}`} geometry={geo}>
                    <lineBasicMaterial
                        color={isMajor ? '#b0b4c0' : '#d8dae2'}
                        transparent
                        opacity={isMajor ? 0.7 : 0.35}
                    />
                </lineSegments>
            );
            // 5cm刻みでラベル
            if (isMajor && i > 0) {
                labels.push(
                    <Html key={`lh-${i}`} position={[-unitW / 2 - 0.06, y, -0.6]} center>
                        <div style={{
                            fontSize: '7px', fontWeight: 700, color: '#9ca3af',
                            pointerEvents: 'none', userSelect: 'none',
                            fontFamily: 'system-ui, sans-serif',
                        }}>
                            {i}cm
                        </div>
                    </Html>
                );
            }
        }

        // === 縦線（1cm間隔）===
        for (let i = -Math.floor(gridW / 2); i <= Math.floor(gridW / 2); i++) {
            const x = i * step;
            const isMajor = i % 5 === 0;
            const isCenter = i === 0;
            const points = [
                new THREE.Vector3(x, unitH * 0.45, -0.6),
                new THREE.Vector3(x, unitH * 0.45 - gridH * step, -0.6),
            ];
            const geo = new THREE.BufferGeometry().setFromPoints(points);
            lines.push(
                <lineSegments key={`v-${i}`} geometry={geo}>
                    <lineBasicMaterial
                        color={isCenter ? '#a78bfa' : isMajor ? '#b0b4c0' : '#d8dae2'}
                        transparent
                        opacity={isCenter ? 0.5 : isMajor ? 0.7 : 0.35}
                    />
                </lineSegments>
            );
            // 5cm刻みで下ラベル
            if (isMajor && i !== 0) {
                labels.push(
                    <Html key={`lv-${i}`} position={[x, unitH * 0.45 - gridH * step - 0.06, -0.6]} center>
                        <div style={{
                            fontSize: '7px', fontWeight: 700, color: '#9ca3af',
                            pointerEvents: 'none', userSelect: 'none',
                            fontFamily: 'system-ui, sans-serif',
                        }}>
                            {Math.abs(i)}cm
                        </div>
                    </Html>
                );
            }
        }

        return { lines, labels };
    }, [gridH, gridW, unitH, unitW, step]);

    return (
        <group>
            {/* 背景パネル */}
            <mesh position={[0, unitH * 0.45 - (gridH * step) / 2, -0.62]}>
                <planeGeometry args={[unitW + 0.15, gridH * step + 0.15]} />
                <meshBasicMaterial color="#f8f9fc" transparent opacity={0.5} side={THREE.DoubleSide} />
            </mesh>
            {gridElements.lines}
            {gridElements.labels}
        </group>
    );
};

// ==== アニメーション付きモデル ====
const PlushieModel = ({ measurements, showClothing, sizeInfo, fitStatus, hasProduct, productImageUrl, clothingType, productName }) => {
    const groupRef = useRef();

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
        }
    });

    const params = useMemo(() => {
        const m = measurements || {};
        const headR = Math.max(circumToRadius(m.head || 14), 0.4);
        const waistR = circumToRadius(m.waist || 15);
        const bodyLen = cmToUnit(m.length || 8);
        const neckY = 0;
        const headY = neckY + headR * 0.75;
        const bodyBottom = -bodyLen;
        return { headR, waistR, bodyLen, neckY, headY, bodyBottom, height: m.height || 12 };
    }, [measurements]);

    const bodyColor = '#1a1a1a';

    return (
        <group ref={groupRef} position={[0, cmToUnit(params.height) * 0.15, 0]}>
            <PlushieHead headCircum={measurements?.head} neckY={params.neckY} color={bodyColor} />
            <PlushieEars headY={params.headY} headRadius={params.headR} color={bodyColor} />
            <PlushieEyes headY={params.headY} headRadius={params.headR} />
            <PlushieMouth headY={params.headY} headRadius={params.headR} />
            <PlushieBody waistCircum={measurements?.waist} bodyLength={measurements?.length} neckCircum={measurements?.neck} color={bodyColor} />
            {(measurements?.arm || 0) > 0 && (
                <>
                    <PlushieArm armLength={measurements.arm} armGirth={measurements.armGirth} bodyWaistR={params.waistR} side={-1} color={bodyColor} />
                    <PlushieArm armLength={measurements.arm} armGirth={measurements.armGirth} bodyWaistR={params.waistR} side={1} color={bodyColor} />
                </>
            )}
            {(measurements?.leg || 0) > 0 && (
                <>
                    <PlushieLeg legLength={measurements.leg} bodyBottom={params.bodyBottom} side={-1} color={bodyColor} />
                    <PlushieLeg legLength={measurements.leg} bodyBottom={params.bodyBottom} side={1} color={bodyColor} />
                </>
            )}

            {showClothing && hasProduct && clothingType === 'hat' && (
                <HatMesh
                    measurements={measurements}
                    sizeInfo={sizeInfo}
                    fitStatus={fitStatus}
                    productImageUrl={productImageUrl}
                />
            )}
            {showClothing && hasProduct && clothingType !== 'hat' && (
                <ClothingMesh
                    measurements={measurements}
                    sizeInfo={sizeInfo}
                    fitStatus={fitStatus}
                    productImageUrl={productImageUrl}
                    clothingType={clothingType}
                    productName={productName}
                />
            )}
            {showClothing && !hasProduct && (
                <DefaultClothing measurements={measurements} />
            )}
        </group>
    );
};


// ==== メインコンポーネント ====
const VirtualFitting3D = ({
    measurements,
    sizeInfo,
    fitStatus,
    productName,
    productImage,
    plushieName,
    language = 'jp',
    clothingType,
}) => {
    const [showClothing, setShowClothing] = useState(true);
    const isHat = clothingType === 'hat';
    const hasProduct = !!(sizeInfo?.dimensions || sizeInfo?.targetPlushieSize || (isHat && sizeInfo?.measurements?.head));
    const t = useCallback((jp, en) => language === 'jp' ? jp : en, [language]);

    const statusConfig = useMemo(() => {
        const configs = {
            perfect: { emoji: '✨', text: t('ぴったり！', 'Perfect!'), color: '#22c55e', bg: '#f0fdf4' },
            tight: { emoji: '😣', text: t('キツいかも', 'Might be tight'), color: '#ef4444', bg: '#fef2f2' },
            tooSmall: { emoji: '❌', text: t('入らないかも', "Won't fit"), color: '#dc2626', bg: '#fef2f2' },
            loose: { emoji: '😊', text: t('ブカブカかも', 'Might be loose'), color: '#f97316', bg: '#fff7ed' },
            tooBig: { emoji: '📏', text: t('大きすぎるかも', 'Way too big'), color: '#3b82f6', bg: '#eff6ff' },
            unknown: { emoji: '👀', text: t('サイズ感を確認', 'Check sizing'), color: '#6b7280', bg: '#f9fafb' },
        };
        return configs[fitStatus] || configs.unknown;
    }, [fitStatus, t]);

    const detectedDims = useMemo(() => {
        if (!sizeInfo?.dimensions) return [];
        const dims = [];
        const d = sizeInfo.dimensions;
        if (d.itemLength || d.length) dims.push({ label: t('着丈', 'Len'), value: d.itemLength || d.length });
        if (d.width || d.bodyWidth) dims.push({ label: t('身幅', 'Width'), value: d.width || d.bodyWidth });
        if (d.chest) dims.push({ label: t('胸囲', 'Chest'), value: d.chest });
        if (d.neck) dims.push({ label: t('首周', 'Neck'), value: d.neck });
        return dims;
    }, [sizeInfo, t]);

    return (
        <div style={{
            background: 'linear-gradient(160deg, #fafafa 0%, #f5f0ff 50%, #f0f5ff 100%)',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid #e5e7eb',
        }}>
            {/* ヘッダー */}
            <div style={{
                padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid #f3f4f6',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 900 }}>{t('3D試着', '3D Try-On')}</span>
                    <span style={{
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: 'white', fontSize: '9px', fontWeight: 800,
                        padding: '2px 6px', borderRadius: '4px',
                    }}>3D</span>
                </div>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: statusConfig.bg,
                    border: `1px solid ${statusConfig.color}30`,
                    padding: '4px 10px', borderRadius: '20px',
                }}>
                    <span style={{ fontSize: '14px' }}>{statusConfig.emoji}</span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: statusConfig.color }}>
                        {statusConfig.text}
                    </span>
                </div>
            </div>

            {/* 商品名 */}
            {productName && (
                <div style={{
                    padding: '6px 16px',
                    background: '#fafafa',
                    borderBottom: '1px solid #f3f4f6',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#6b7280',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}>
                    {isHat ? '🎩' : '👗'} {productName}
                </div>
            )}

            {/* 3Dキャンバス */}
            <div style={{ height: '360px', position: 'relative' }}>
                <Canvas
                    camera={{ position: [0, 0.2, 2.8], fov: 40 }}
                    style={{ background: 'transparent' }}
                    gl={{ antialias: true, alpha: true }}
                >
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[3, 5, 3]} intensity={0.9} castShadow />
                    <directionalLight position={[-2, 3, -1]} intensity={0.3} />
                    <pointLight position={[0, -1, 3]} intensity={0.3} color="#fef3c7" />

                    <CmGrid measurements={measurements} />

                    <PlushieModel
                        measurements={measurements}
                        showClothing={showClothing}
                        sizeInfo={sizeInfo}
                        fitStatus={fitStatus}
                        hasProduct={hasProduct}
                        productImageUrl={productImage}
                        clothingType={clothingType}
                        productName={productName}
                    />

                    <OrbitControls
                        enablePan={false}
                        minDistance={1.5}
                        maxDistance={5}
                        minPolarAngle={Math.PI * 0.15}
                        maxPolarAngle={Math.PI * 0.85}
                        enableDamping dampingFactor={0.05}
                    />
                </Canvas>

                <div style={{
                    position: 'absolute', bottom: '8px', left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.5)', color: 'white',
                    padding: '3px 10px', borderRadius: '12px',
                    fontSize: '9px', fontWeight: 700,
                    backdropFilter: 'blur(4px)', pointerEvents: 'none',
                }}>
                    {t('ドラッグで回転 • ピンチで拡大', 'Drag to rotate • Pinch to zoom')}
                </div>

                {/* 凡例 */}
                {hasProduct && !productImage && (
                    <div style={{
                        position: 'absolute', top: '8px', right: '8px',
                        background: 'rgba(255,255,255,0.9)',
                        padding: '6px 10px', borderRadius: '10px',
                        fontSize: '9px', fontWeight: 700,
                        backdropFilter: 'blur(4px)', border: '1px solid #e5e7eb',
                        display: 'flex', flexDirection: 'column', gap: '3px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                            <span>{t('ぴったり', 'Fits')}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                            <span>{t('キツい', 'Tight')}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
                            <span>{t('ゆるい', 'Loose')}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* コントロールバー */}
            <div style={{
                padding: '8px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderTop: '1px solid #f3f4f6', background: 'white',
            }}>
                <button
                    onClick={() => setShowClothing(!showClothing)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '4px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        fontSize: '10px', fontWeight: 700,
                        background: showClothing ? '#ede9fe' : '#f3f4f6',
                        color: showClothing ? '#7c3aed' : '#9ca3af',
                        transition: 'all 0.2s',
                    }}
                >
                    {showClothing ? <Eye size={12} /> : <EyeOff size={12} />}
                    {t('服を表示', 'Clothing')}
                </button>

                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {detectedDims.map((dim, i) => (
                        <span key={i} style={{
                            background: `${statusConfig.color}15`,
                            border: `1px solid ${statusConfig.color}30`,
                            padding: '2px 8px', borderRadius: '6px',
                            fontSize: '9px', fontWeight: 700, color: statusConfig.color,
                        }}>
                            {dim.label} {dim.value}cm
                        </span>
                    ))}
                </div>
            </div>

            {/* ぬいぐるみ計測値 */}
            <div style={{
                padding: '8px 16px 12px', background: 'white',
                borderTop: '1px solid #f9fafb',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px' }}>🧸</span>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#374151' }}>
                        {plushieName || t('ぬいぐるみ', 'Plushie')} — {t('計測値', 'Measurements')}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {measurements && Object.entries({
                        [t('身長', 'H')]: measurements.height,
                        [t('胴囲', 'W')]: measurements.waist,
                        [t('頭', 'Head')]: measurements.head,
                        [t('首', 'Neck')]: measurements.neck,
                        [t('着丈', 'Len')]: measurements.length,
                    }).filter(([, v]) => v > 0).map(([label, value]) => (
                        <span key={label} style={{
                            background: '#fef3c7', padding: '2px 6px',
                            borderRadius: '4px', fontSize: '9px', fontWeight: 700, color: '#92400e',
                        }}>
                            {label} {value}cm
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default VirtualFitting3D;
