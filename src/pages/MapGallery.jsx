import React, { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useApp } from '../context/AppContext';
import { Globe as GlobeIcon, MapPin, X, ExternalLink, MessageCircle, Heart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Html, Sphere, MeshDistortMaterial, Float, Stars, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// Real geographic coordinates [latitude, longitude]
const GEOGRAPHIC_COORDINATES = {
    // 47 Japanese Prefectures (Capitals)
    '北海道': [43.0641, 141.3469], 'Hokkaido': [43.0641, 141.3469], 'Sapporo': [43.0641, 141.3469],
    '青森': [40.8244, 140.74], 'Aomori': [40.8244, 140.74],
    '岩手': [39.7036, 141.1525], 'Iwate': [39.7036, 141.1525],
    '宮城': [38.2688, 140.8719], 'Miyagi': [38.2688, 140.8719], 'Sendai': [38.2688, 140.8719],
    '秋田': [39.7186, 140.1025], 'Akita': [39.7186, 140.1025],
    '山形': [38.2404, 140.3633], 'Yamagata': [38.2404, 140.3633],
    '福島': [37.75, 140.4667], 'Fukushima': [37.75, 140.4667],
    '茨城': [36.3417, 140.4467], 'Ibaraki': [36.3417, 140.4467],
    '栃木': [36.5658, 139.8836], 'Tochigi': [36.5658, 139.8836],
    '群馬': [36.3911, 139.0608], 'Gunma': [36.3911, 139.0608],
    '埼玉': [35.8569, 139.6489], 'Saitama': [35.8569, 139.6489],
    '千葉': [35.6047, 140.1233], 'Chiba': [35.6047, 140.1233],
    '東京': [35.6895, 139.6917], 'Tokyo': [35.6895, 139.6917], '渋谷': [35.6580, 139.7016],
    '神奈川': [35.4478, 139.6425], 'Kanagawa': [35.4478, 139.6425], 'Yokohama': [35.4478, 139.6425],
    '新潟': [37.9022, 139.0236], 'Niigata': [37.9022, 139.0236],
    '富山': [36.6953, 137.2114], 'Toyama': [36.6953, 137.2114],
    '石川': [36.5944, 136.6256], 'Ishikawa': [36.5944, 136.6256], 'Kanazawa': [36.5944, 136.6256],
    '福井': [36.0653, 136.2217], 'Fukui': [36.0653, 136.2217],
    '山梨': [35.6639, 138.5683], 'Yamanashi': [35.6639, 138.5683],
    '長野': [36.6514, 138.1811], 'Nagano': [36.6514, 138.1811],
    '岐阜': [35.3911, 136.7222], 'Gifu': [35.3911, 136.7222],
    '静岡': [34.9769, 138.3831], 'Shizuoka': [34.9769, 138.3831],
    '愛知': [35.1803, 136.9067], 'Aichi': [35.1803, 136.9067], 'Nagoya': [35.1803, 136.9067],
    '三重': [34.7303, 136.5086], 'Mie': [34.7303, 136.5086],
    '滋賀': [35.0044, 135.8683], 'Shiga': [35.0044, 135.8683],
    '京都': [35.0214, 135.7556], 'Kyoto': [35.0214, 135.7556],
    '大阪': [34.6864, 135.52], 'Osaka': [34.6864, 135.52],
    '兵庫': [34.6913, 135.1831], 'Hyogo': [34.6913, 135.1831], 'Kobe': [34.6913, 135.1831],
    '奈良': [34.6853, 135.8328], 'Nara': [34.6853, 135.8328],
    '和歌山': [34.2261, 135.1675], 'Wakayama': [34.2261, 135.1675],
    '鳥取': [35.5036, 134.2383], 'Tottori': [35.5036, 134.2383],
    '島根': [35.4722, 133.0506], 'Shimane': [35.4722, 133.0506],
    '岡山': [34.6617, 133.935], 'Okayama': [34.6617, 133.935],
    '広島': [34.3964, 132.4594], 'Hiroshima': [34.3964, 132.4594],
    '山口': [34.1858, 131.4714], 'Yamaguchi': [34.1858, 131.4714],
    '徳島': [34.0658, 134.5594], 'Tokushima': [34.0658, 134.5594],
    '香川': [34.3403, 134.0433], 'Kagawa': [34.3403, 134.0433],
    '愛媛': [33.8417, 132.7661], 'Ehime': [33.8417, 132.7661],
    '高知': [33.5597, 133.5311], 'Kochi': [33.5597, 133.5311],
    '福岡': [33.6064, 130.4181], 'Fukuoka': [33.6064, 130.4181],
    '佐賀': [33.2494, 130.2989], 'Saga': [33.2494, 130.2989],
    '長崎': [32.7447, 129.8736], 'Nagasaki': [32.7447, 129.8736],
    '熊本': [32.7897, 130.7417], 'Kumamoto': [32.7897, 130.7417],
    '大分': [33.2381, 131.6125], 'Oita': [33.2381, 131.6125],
    '宮崎': [31.9111, 131.4239], 'Miyazaki': [31.9111, 131.4239],
    '鹿児島': [31.5603, 130.5581], 'Kagoshima': [31.5603, 130.5581],
    '沖縄': [26.2125, 127.6811], 'Okinawa': [26.2125, 127.6811],

    // Global Cities
    'New York': [40.7128, -74.0060], 'NYC': [40.7128, -74.0060],
    'Los Angeles': [34.0522, -118.2437], 'LA': [34.0522, -118.2437],
    'London': [51.5074, -0.1278], 'Paris': [48.8566, 2.3522],
    'Seoul': [37.5665, 126.9780], 'Singapore': [1.3521, 103.8198],
    'Sydney': [-33.8688, 151.2093], 'Dubai': [25.2048, 55.2708],
    'Bangkok': [13.7563, 100.5018], 'Myeongdong': [37.5594, 126.9839],
};

// Helper to convert Lat/Lng to Vector3 on a sphere
const latLngToVector3 = (lat, lng, radius) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));
    return new THREE.Vector3(x, y, z);
};

const GlobeScene = ({ posts, onSelect, selectedPost }) => {
    const groupRef = useRef();
    const texture = useLoader(THREE.TextureLoader, '/globe_texture_premium.png');
    texture.anisotropy = 16;

    // Jittered positions calculated once per post to avoid recalculation every frame
    const jitteredPosts = useMemo(() => {
        return posts.map(post => {
            // Robust Matching: Look for Keywords in the location string
            const locationStr = post.location || '';
            const sortedKeys = Object.keys(GEOGRAPHIC_COORDINATES).sort((a, b) => b.length - a.length);
            const matchingKey = sortedKeys.find(key =>
                locationStr.includes(key) || key.includes(locationStr)
            );

            const baseCoords = matchingKey ? GEOGRAPHIC_COORDINATES[matchingKey] : [35.6895, 139.6917];

            const jitterLat = baseCoords[0] + (Math.random() - 0.5) * 0.3;
            const jitterLng = baseCoords[1] + (Math.random() - 0.5) * 0.3;

            return {
                ...post,
                projectedPosition: latLngToVector3(jitterLat, jitterLng, 1.85)
            };
        });
    }, [posts]);

    useFrame((state, delta) => {
        if (groupRef.current && !selectedPost) {
            // Even slower rotation per user feedback
            groupRef.current.rotation.y += delta * 0.015;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Space Background */}
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

            {/* Ambient and Point Lights - Boosted for excitement */}
            <ambientLight intensity={1.5} />
            <pointLight position={[10, 10, 10]} intensity={3} color="#ffffff" />
            <pointLight position={[-10, -5, -10]} intensity={1.5} color="#4dabf7" />

            {/* The Globe - Reduced from 2.5 to 1.8 */}
            <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
                <Sphere args={[1.8, 64, 64]}>
                    <meshStandardMaterial
                        map={texture}
                        antialias={true}
                        metalness={0.4}
                        roughness={0.6}
                    />
                </Sphere>

                {/* Atmosphere/Glow - Multi-layered for premium feel */}
                <Sphere args={[1.82, 64, 64]}>
                    <meshPhongMaterial
                        color="#4dabf7"
                        transparent
                        opacity={0.2}
                        side={THREE.DoubleSide}
                        emissive="#4dabf7"
                        emissiveIntensity={0.5}
                    />
                </Sphere>
                <Sphere args={[1.85, 64, 64]}>
                    <meshPhongMaterial
                        color="#ffffff"
                        transparent
                        opacity={0.05}
                        side={THREE.DoubleSide}
                    />
                </Sphere>
            </Float>

            {/* Pins */}
            {jitteredPosts.map((post) => {
                const isSelected = selectedPost?.id === post.id;

                return (
                    <Html
                        key={post.id}
                        position={post.projectedPosition}
                        distanceFactor={4}
                        zIndexRange={[0, 100]}
                        occlude={true}
                    >
                        <div
                            className={`group cursor-pointer transition-all duration-500 ${isSelected ? 'scale-150 z-50' : 'hover:scale-125'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect(post);
                            }}
                        >
                            <div className="relative">
                                {/* Large interactive hit area */}
                                <div className="absolute -inset-4 rounded-full"></div>

                                {/* Pulse for selected */}
                                {isSelected && (
                                    <div className="absolute inset-0 bg-secondary/50 rounded-full animate-ping scale-[2] opacity-70"></div>
                                )}

                                {/* Avatar Pin - Reduced to 24px (w-6 equivalent) via inline style for stability */}
                                <div
                                    className={`rounded-full border-[2px] overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.4)] bg-white flex items-center justify-center transition-all ${isSelected ? 'border-secondary ring-4 ring-secondary/20' : 'border-white group-hover:border-secondary shadow-primary/20'}`}
                                    style={{ width: '24px', height: '24px' }}
                                >
                                    <img
                                        src={post.imageUrl || '/placeholder-plushie.png'}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                {/* Label */}
                                {isSelected && (
                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-secondary text-white text-[11px] font-black px-4 py-1.5 rounded-full shadow-[0_8px_16px_rgba(0,0,0,0.4)] whitespace-nowrap animate-bounce border border-white/20">
                                        {post.location}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Html>
                );
            })}
        </group>
    );
};

const MapGallery = () => {
    const { language, t } = useApp();
    const navigate = useNavigate();

    useEffect(() => {
        // Redirect if this page is accessed accidentally
        navigate('/');
    }, [navigate]);

    return null;
    const [selectedPost, setSelectedPost] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            setIsLoading(true);
            try {
                // Fetch public items
                const q1 = query(collectionGroup(db, 'closetItems'), where('isPublic', '==', true));
                const q2 = query(collectionGroup(db, 'クローゼットアイテム'), where('isPublic', '==', true));

                const [snap1, snap2] = await Promise.allSettled([getDocs(q1), getDocs(q2)]);

                const items = [];
                const processDoc = (docSnap) => {
                    const data = docSnap.data();
                    const img = data.imageUrl || data.image;
                    if (img) {
                        items.push({
                            id: docSnap.id,
                            ...data,
                            imageUrl: img,
                            location: data.location || data.venue || (language === 'jp' ? '世界のどこか' : 'Somewhere')
                        });
                    }
                };

                if (snap1.status === 'fulfilled') snap1.value.forEach(processDoc);
                if (snap2.status === 'fulfilled') snap2.value.forEach(processDoc);

                // Diversified Fallback Data for UI Verification
                const fallbackPosts = [
                    { id: 'm1', userName: 'うなえさん', itemName: 'Shibuya Style', location: '東京都渋谷区', imageUrl: '/unae-san.png', likes: 24 },
                    { id: 'm6', userName: 'Mochi', itemName: 'Iwate Mountain', location: '岩手県', imageUrl: 'https://images.unsplash.com/photo-1542640244-7e672d6cef21?q=80&w=200', likes: 35 },
                    { id: 'm7', userName: 'Aki', itemName: 'Osaka Dotonbori', location: '大阪', imageUrl: 'https://images.unsplash.com/photo-1590559899731-3972fca6fd3f?q=80&w=200', likes: 45 },
                    { id: 'm8', userName: 'Yuki', itemName: 'Sapporo Snow', location: '北海道札幌市', imageUrl: 'https://images.unsplash.com/photo-1578326260835-901469e88fb9?q=80&w=200', likes: 52 },
                    { id: 'm9', userName: 'Ren', itemName: 'Fukuoka Yatai', location: '福岡', imageUrl: 'https://images.unsplash.com/photo-1583090623326-8c081cd278ae?q=80&w=200', likes: 28 },
                    { id: 'm2', userName: 'Karin', itemName: 'Paris Adventure', location: 'Paris', imageUrl: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=200', likes: 18 },
                    { id: 'm3', userName: 'Punch-kun', itemName: 'NY Night Out', location: 'New York', imageUrl: 'https://images.unsplash.com/photo-1559449132-bf1573fb9d35?q=80&w=200', likes: 42 },
                ];

                setPosts(items.length > 0 ? items : fallbackPosts);
            } catch (error) {
                console.error("Error fetching map posts:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPosts();
    }, [language]);

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-24 overflow-hidden relative">
            <Helmet>
                <title>{language === 'jp' ? '3D世界地図 | CinderellaFit' : '3D World Globe | CinderellaFit'}</title>
            </Helmet>

            {/* Premium Background Gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1e293b,0%,#0f172a_100%)] opacity-100 z-0"></div>

            {/* Header - Floating minimalist style */}
            <div className="pt-10 px-6 relative z-30">
                <div className="flex items-center gap-3 mb-1">
                    <GlobeIcon className="text-secondary animate-pulse" size={36} />
                    <h1 className="text-4xl font-black tracking-tighter italic uppercase text-secondary">World Stage</h1>
                </div>
                <p className="text-slate-400 text-sm font-bold opacity-80 pl-1">
                    {language === 'jp' ? '3Dで巡る、ぬいぐるみの輝く舞台。' : 'Explore plushie stories on a 3D stage.'}
                </p>
            </div>

            {/* Globe Viewport - Breaking out of parent padding via negative margins */}
            <div
                className="relative z-10 -mx-4 -mt-16"
                style={{ height: '750px', width: 'calc(100% + 32px)' }}
            >
                <Canvas
                    camera={{ position: [0, 0, 3.8], fov: 45 }}
                    dpr={window.devicePixelRatio || [1, 2]}
                    gl={{ antialias: true, alpha: true }}
                    style={{ width: '100%', height: '100%' }}
                >
                    <Suspense fallback={null}>
                        <GlobeScene
                            posts={posts}
                            onSelect={setSelectedPost}
                            selectedPost={selectedPost}
                        />
                        <OrbitControls
                            enablePan={false}
                            enableZoom={true}
                            minDistance={3}
                            maxDistance={6}
                            autoRotate={false}
                        />
                    </Suspense>
                </Canvas>

                {/* HUD Navigation Help */}
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
                    <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 px-10 py-4 rounded-full shadow-[0_0_80px_rgba(0,0,0,0.6)] flex items-center gap-4 border-t-white/30">
                        <div className="w-3 h-3 rounded-full bg-secondary animate-pulse shadow-[0_0_15px_#fbbf24]"></div>
                        <span className="text-[12px] font-black tracking-[0.4em] uppercase text-white shadow-sm">
                            {language === 'jp' ? '地球儀を回して探検' : 'ROTATE TO DISCOVER'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Details Card - Ultra-premium Glassmorphism */}
            {selectedPost && (
                <div className="fixed bottom-24 left-4 right-4 bg-white/10 backdrop-blur-[40px] border border-white/20 rounded-[48px] p-7 shadow-[0_40px_100px_rgba(0,0,0,0.7)] animate-slide-up z-50 overflow-hidden group">
                    {/* Glossy lighting effect */}
                    <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none group-hover:bg-white/20 transition-all duration-1000"></div>

                    <button
                        onClick={() => setSelectedPost(null)}
                        className="absolute top-7 right-7 p-2.5 text-white/40 hover:text-white transition-all bg-white/5 hover:bg-white/10 rounded-full active:scale-90"
                    >
                        <X size={24} />
                    </button>

                    <div className="flex gap-7 relative z-10">
                        <div className="w-32 h-32 rounded-[32px] overflow-hidden flex-shrink-0 border-4 border-white/10 shadow-2xl relative group-child">
                            <img src={selectedPost.imageUrl} alt="" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className="flex items-center gap-2 text-secondary mb-2 drop-shadow-sm">
                                <MapPin size={16} fill="currentColor" fillOpacity={0.6} />
                                <span className="text-[11px] font-black uppercase tracking-[0.3em]">{selectedPost.location}</span>
                            </div>
                            <h3 className="font-black text-3xl leading-tight truncate text-white mb-1 drop-shadow-md">{selectedPost.itemName}</h3>
                            <p className="text-white/60 text-base font-bold mb-5 italic">{selectedPost.userName}</p>

                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2.5 bg-rose-500/10 px-4 py-2 rounded-full border border-rose-500/20">
                                    <Heart size={20} fill="#f43f5e" className="text-rose-500" />
                                    <span className="font-black text-white text-lg">{selectedPost.likes || 0}</span>
                                </div>
                                <button
                                    onClick={() => navigate('/gallery')}
                                    className="ml-auto bg-secondary text-slate-900 px-8 py-3 rounded-full font-black text-xs uppercase tracking-[0.2em] hover:bg-white hover:scale-110 active:scale-95 transition-all shadow-[0_15px_30px_rgba(251,191,36,0.3)]"
                                >
                                    {language === 'jp' ? '見る' : 'VIEW'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Full-screen Loading Overlay with Starfield pulse */}
            {isLoading && (
                <div className="absolute inset-0 bg-slate-950 z-[100] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-8">
                        <div className="relative">
                            <div className="w-24 h-24 border-2 border-secondary/10 rounded-full"></div>
                            <div className="absolute inset-0 w-24 h-24 border-t-2 border-secondary rounded-full animate-spin"></div>
                            <div className="absolute inset-3 border border-secondary/20 rounded-full animate-pulse"></div>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-secondary font-black text-[12px] animate-pulse uppercase tracking-[0.8em]">World Stage</span>
                            <span className="text-slate-600 font-bold text-[8px] mt-2 uppercase tracking-[0.4em]">Initializing Global Connection</span>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slide-up {
                    from { transform: translateY(120px); opacity: 0; filter: blur(10px); }
                    to { transform: translateY(0); opacity: 1; filter: blur(0); }
                }
                .animate-slide-up {
                    animation: slide-up 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards;
                }
            `}</style>
        </div>
    );
};

export default MapGallery;
