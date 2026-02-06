import React, { createContext, useState, useContext, useEffect } from 'react';
import { translations } from '../translations';
import { db } from '../firebase/config';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const AppContext = createContext();

const DEFAULT_PLUSHIE = {
  id: 2,
  name: 'うなえさん',
  type: 'ウナギ',
  image: '/unae-san.png',
  measurements: {
    height: 12,
    waist: 15,
    head: 14,
    neck: 13,
    length: 8,
    shoulder: 0,
    arm: 3,
    armGirth: 3,
    leg: 0,
  }
};

export const AppProvider = ({ children }) => {
  // Language State
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('app_language') || 'jp';
  });

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  const t = React.useCallback((key, ...args) => {
    const value = translations[language][key];
    if (typeof value === 'function') {
      return value(...args);
    }
    return value || key;
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'jp' : 'en');
  };

  // Plushie State
  const [plushies, setPlushies] = useState([]);
  const { currentUser } = useAuth(); // Get current user

  // Load from localStorage (Guest) or Firestore (User)
  useEffect(() => {
    const loadPlushies = async () => {
      if (currentUser) {
        // Logged in: Load from Firestore
        try {
          const q = collection(db, "users", currentUser.uid, "plushies");
          const querySnapshot = await getDocs(q);
          const loadedPlushies = [];
          querySnapshot.forEach((doc) => {
            loadedPlushies.push(doc.data());
          });

          if (loadedPlushies.length > 0) {
            setPlushies(loadedPlushies.sort((a, b) => a.id - b.id));
          } else {
            // Initial seed for new user if empty
            setPlushies([DEFAULT_PLUSHIE]);
            // Optional: Save this seed to Firestore immediately?
            // Better to let user save it manually or on first edit to avoid clutter/cost if they abandon.
          }
        } catch (error) {
          console.error("Error loading loadedPlushies from Firestore:", error);
        }
      } else {
        // Guest: Load from localStorage
        const saved = localStorage.getItem('my_plushies_v2');
        let parsed = saved ? JSON.parse(saved) : [DEFAULT_PLUSHIE];

        // MIGRATION: Fix old placeholder image and Unagi type in localStorage
        parsed = parsed.map(p => {
          let updated = { ...p };
          if (p.name === 'うなえさん' && p.image.includes('placehold.co')) {
            updated.image = '/unae-san.png';
          }
          // Fix Unagi -> ウナギ
          if (p.type === 'Unagi') {
            updated.type = 'ウナギ';
          }
          return updated;
        });

        setPlushies(parsed.filter(p => p.name !== 'Allan'));
      }
    };

    loadPlushies();
  }, [currentUser]);

  // Save to localStorage when plushies change (Backup/Guest mode)
  useEffect(() => {
    if (!currentUser) {
      try {
        localStorage.setItem('my_plushies_v2', JSON.stringify(plushies));
      } catch (e) {
        console.error("Failed to save plushies to localStorage", e);
        if (e.name === 'QuotaExceededError') {
          alert(t('storageQuotaExceeded') || "Storage full! Images might not be saved. please try smaller images.");
        }
      }
    }
  }, [plushies, currentUser, t]);

  // User Plan State (for future premium features)
  const [userPlan, setUserPlan] = useState(() => {
    return localStorage.getItem('user_plan') || 'free';
  });

  useEffect(() => {
    localStorage.setItem('user_plan', userPlan);
  }, [userPlan]);

  // Plan limits (these are the limits for ADDITIONAL plushies beyond the default)
  const PLAN_LIMITS = {
    free: 5,      // うなえさん + 5体 = 合計6体
    premium: 20,  // うなえさん + 20体 = 合計21体
    enterprise: Infinity
  };

  // Count only user-added plushies (exclude default うなえさん with id=2)
  const userAddedPlushieCount = plushies.filter(p => p.id !== 2).length;
  const plushieLimit = PLAN_LIMITS[userPlan];
  const canAddPlushie = userAddedPlushieCount < plushieLimit;

  const addPlushie = async (plushie) => {
    if (!canAddPlushie) {
      return false; // Indicate limit reached
    }
    const newPlushie = { ...plushie, id: Date.now() };
    const newPlushies = [...plushies, newPlushie];
    setPlushies(newPlushies);

    if (currentUser) {
      // Save to Firestore
      try {
        await setDoc(doc(db, "users", currentUser.uid, "plushies", String(newPlushie.id)), newPlushie);
      } catch (e) {
        console.error("Error adding document: ", e);
        alert("クラウドへの保存に失敗しました。画像のサイズが大きすぎる可能性があります。");
      }
    }
    return true;
  };

  const updatePlushie = async (updatedPlushie) => {
    const newPlushies = plushies.map(p => p.id === updatedPlushie.id ? updatedPlushie : p);
    setPlushies(newPlushies);

    if (currentUser) {
      // Update Firestore
      try {
        await setDoc(doc(db, "users", currentUser.uid, "plushies", String(updatedPlushie.id)), updatedPlushie);
      } catch (e) {
        console.error("Error updating document: ", e);
        alert("クラウドへの保存に失敗しました。");
      }
    }
  };

  // Closet State
  const [closetItems, setClosetItems] = useState(() => {
    const saved = localStorage.getItem('my_closet_v1');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('my_closet_v1', JSON.stringify(closetItems));
    } catch (e) {
      console.error("Failed to save closet to localStorage", e);
    }
  }, [closetItems]);

  const addClosetItem = (item) => {
    setClosetItems([
      {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        ...item
      },
      ...closetItems
    ]);
  };

  const updateClosetItem = (id, updates) => {
    setClosetItems(closetItems.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const deleteClosetItem = (id) => {
    setClosetItems(closetItems.filter(item => item.id !== id));
  };

  return (
    <AppContext.Provider value={{
      plushies, addPlushie, updatePlushie,
      closetItems, addClosetItem, updateClosetItem, deleteClosetItem,
      language, setLanguage, toggleLanguage, t,
      userPlan, setUserPlan, plushieLimit, canAddPlushie, userAddedPlushieCount
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
