import React, { createContext, useState, useContext, useEffect } from 'react';
import { translations } from '../translations';
import { db } from '../firebase/config';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Language State
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('app_language') || 'jp';
  });

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  const t = (key, ...args) => {
    const value = translations[language][key];
    if (typeof value === 'function') {
      return value(...args);
    }
    return value || key;
  };

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
            setPlushies([]);
          }
        } catch (error) {
          console.error("Error loading loadedPlushies from Firestore:", error);
        }
      } else {
        // Guest: Load from localStorage
        const saved = localStorage.getItem('my_plushies_v2');
        const parsed = saved ? JSON.parse(saved) : [
          {
            id: 2,
            name: 'うなえさん',
            type: 'ウナギ',
            image: 'https://placehold.co/600x600/FFB7CB/ffffff?text=Unae-san+(12cm)',
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
          }
        ];
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
  }, [plushies, currentUser]);

  // User Plan State (for future premium features)
  const [userPlan, setUserPlan] = useState(() => {
    return localStorage.getItem('user_plan') || 'free';
  });

  useEffect(() => {
    localStorage.setItem('user_plan', userPlan);
  }, [userPlan]);

  // Plan limits
  const PLAN_LIMITS = {
    free: 5,
    premium: 20,
    enterprise: Infinity
  };

  const plushieLimit = PLAN_LIMITS[userPlan];
  const canAddPlushie = plushies.length < plushieLimit;

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
      userPlan, setUserPlan, plushieLimit, canAddPlushie
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
