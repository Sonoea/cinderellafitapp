import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { collectionGroup, query, where, getDocs, limit, orderBy, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Star, Heart, MessageCircle, Share2, ExternalLink, User, LayoutGrid, Camera, Image as ImageIcon } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { MOCK_GALLERY } from '../data/mockData';

const Lookbook = () => {
    const { patternId } = useParams();
    const { t, language } = useApp();
    const navigate = useNavigate();
    const [pattern, setPattern] = useState(null);
    const [derivedItems, setDerivedItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLookbookData = async () => {
            if (!patternId) return;
            setLoading(true);
            try {
                if (patternId && patternId.startsWith('mock-')) {
                    const mockPattern = MOCK_GALLERY.find(item => item.id === patternId);
                    if (mockPattern) setPattern(mockPattern);
                    const mockDerived = MOCK_GALLERY.filter(item => item.referencedPostId === patternId);
                    setDerivedItems(mockDerived);
                    setLoading(false);
                    return;
                }

                // 1. Setup ID matching (Full ID, Short ID, local- prefix)
                const searchIds = new Set();
                searchIds.add(String(patternId));
                const shortId = patternId.includes('_') ? patternId.split('_')[1] : patternId;
                if (patternId.includes('_')) {
                    searchIds.add(shortId);
                    searchIds.add(`local-${shortId}`);
                }
                const searchIdsList = Array.from(searchIds);

                // 2. Brute Force Fetch (Index Free)
                // We fetch EVERY item from both collections to bypass index requirements.
                // This is 100% reliable for smaller collections.
                const fetchEverything = async (collName) => {
                    const q = query(collectionGroup(db, collName)); 
                    const snap = await getDocs(q).catch(() => ({ docs: [] }));
                    return snap.docs.map(doc => ({
                        ...doc.data(),
                        id: doc.id,
                        ownerUid: doc.ref.parent.parent.id,
                        compositeId: `${doc.ref.parent.parent.id}_${doc.id}`
                    }));
                };

                const [items1, items2] = await Promise.all([
                    fetchEverything('closetItems'),
                    fetchEverything('クローゼットアイテム')
                ]);

                let patternDoc = null;
                const matches = [];

                [...items1, ...items2].forEach(item => {
                    // Normalize ID for comparison
                    const bareId = String(item.id).replace('local-', '');
                    
                    // A: Is this the main pattern?
                    if (!patternDoc) {
                        if (searchIds.has(item.id) || searchIds.has(bareId) || searchIds.has(item.compositeId)) {
                            patternDoc = item;
                        }
                    }

                    // B: Is this a derived work?
                    const isPublic = item.isPublic === true || item.public === true || String(item.isPublic) === 'true';
                    const refId = String(item.referencedPostId || '');
                    
                    if (isPublic && refId) {
                        const isMatch = searchIdsList.some(id => refId === id || refId.includes(id) || id.includes(refId));
                        if (isMatch && item.compositeId !== patternId) {
                            matches.push(item);
                        }
                    }
                });

                // C: Final fallback for the pattern if not found in everything
                if (!patternDoc && patternId.includes('_')) {
                    const [uid, itemId] = patternId.split('_');
                    try {
                        const snap = await getDoc(doc(db, 'users', uid, 'closetItems', itemId));
                        if (snap.exists()) patternDoc = { ...snap.data(), id: snap.id, ownerUid: uid };
                    } catch (e) {}
                }

                setPattern(patternDoc);
                setDerivedItems(matches.sort((a, b) => {
                    const timeA = new Date(a.createdAt).getTime() || 0;
                    const timeB = new Date(b.createdAt).getTime() || 0;
                    return timeB - timeA;
                }));

            } catch (error) {
                console.error("Lookbook critical error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLookbookData();
    }, [patternId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full"></div>
                    <div className="h-4 w-32 bg-gray-100 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white pb-24">
            <Helmet>
                <title>{pattern ? `${pattern.itemName} | ${t('lookbook')}` : t('lookbook')} - CinderellaFit</title>
            </Helmet>

            {/* Sticky Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-4">
                <div className="max-w-4xl mx-auto flex items-center gap-4">
                    <button 
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all"
                    >
                        <ArrowLeft size={20} className="text-gray-800" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-sm font-black text-gray-900 tracking-tight leading-none">
                            {pattern ? `${pattern.itemName || pattern.name || ''}：${t('lookbook')}` : t('lookbook')}
                        </h1>
                        <p className="text-[10px] font-bold text-primary uppercase mt-1 tracking-widest">
                            Creative Inspiration
                        </p>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 pt-8">
                {/* Hero: Original Pattern */}
                {pattern && (
                    <div className="mb-12">
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            <div className="w-full md:w-1/2 aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl relative group">
                                <img 
                                    src={pattern.imageUrl || pattern.image} 
                                    alt={pattern.itemName || pattern.name}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute top-6 left-6">
                                    <div className="bg-primary text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                                        {t('originalPattern')}
                                    </div>
                                </div>
                            </div>
                            <div className="w-full md:w-1/2 pt-4">
                                <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 leading-tight">
                                    {pattern.itemName || pattern.name}
                                </h2>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                        <User size={16} className="text-gray-400" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-600">
                                        {pattern.userName || pattern.ownerName || 'Designer'}
                                    </span>
                                </div>
                                <p className="text-gray-500 text-sm leading-relaxed mb-8 italic">
                                    {pattern.description || "一つの型紙から紡がれる、無限の個性と物語の記録。"}
                                </p>
                                <Link 
                                    to={`/gallery/post/${pattern.compositeId || pattern.id}`}
                                    className="inline-flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest hover:underline"
                                >
                                    View Original Details <ArrowLeft className="rotate-180" size={14} />
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                <div className="h-px bg-gray-100 mb-12" />

                {/* Derived Works Grid */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">
                            {t('derivedWorks') || 'Inspirations'}
                        </h3>
                        <p className="text-xs text-gray-400 font-bold mt-1">
                            {derivedItems.length} styles from the community
                        </p>
                    </div>
                    <ImageIcon size={20} className="text-gray-200" />
                </div>

                {derivedItems.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                        {derivedItems.map((item, index) => (
                            <div 
                                key={item.id} 
                                className={`overflow-hidden rounded-3xl bg-gray-50 group cursor-pointer transition-all duration-500 hover:shadow-xl ${index % 3 === 1 ? 'md:mt-8' : ''}`}
                                onClick={() => navigate(`/gallery/post/${item.compositeId || item.id}`)}
                            >
                                <div className="aspect-[3/4] overflow-hidden relative">
                                    <img 
                                        src={item.imageUrl || item.image} 
                                        alt={item.itemName || item.name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <div className="absolute bottom-4 left-4 right-4 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                        <div className="bg-white/90 backdrop-blur px-3 py-2 rounded-xl">
                                            <p className="text-[10px] font-black text-gray-900 truncate">
                                                {item.userName || 'Anonymous'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-100">
                        <Camera size={40} className="mx-auto text-gray-200 mb-4" />
                        <p className="text-gray-400 font-bold text-sm">
                            まだこの型紙からの閃きはありません。<br />
                            あなたが最初の一歩を刻みませんか？
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Lookbook;
