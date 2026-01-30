import React, { createContext, useState, useContext, useEffect } from 'react';
import { translations } from '../translations';

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

  // Load from localStorage or use defaults
  const [plushies, setPlushies] = useState(() => {
    const saved = localStorage.getItem('my_plushies_v2');
    const parsed = saved ? JSON.parse(saved) : [
      {
        id: 2,
        name: 'うなえさん',
        type: 'Unagi',
        image: 'https://placehold.co/600x600/FFB7CB/ffffff?text=Unae-san+(12cm)', // Placeholder
        measurements: {
          height: 12,
          waist: 15,
          head: 14,
          neck: 13,
          length: 8, // Derived/Est
          shoulder: 0,
          arm: 3,
          armGirth: 3,
          leg: 0,
        }
      }
    ];
    // Force remove Allan if he exists in storage
    return parsed.filter(p => p.name !== 'Allan');
  });

  useEffect(() => {
    try {
      localStorage.setItem('my_plushies_v2', JSON.stringify(plushies));
    } catch (e) {
      console.error("Failed to save plushies to localStorage", e);
      if (e.name === 'QuotaExceededError') {
        alert(t('storageQuotaExceeded') || "Storage full! Images might not be saved. please try smaller images.");
      }
    }
  }, [plushies]);

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

  const addPlushie = (plushie) => {
    if (!canAddPlushie) {
      return false; // Indicate limit reached
    }
    setPlushies([...plushies, { ...plushie, id: Date.now() }]);
    return true;
  };

  const updatePlushie = (updatedPlushie) => {
    setPlushies(plushies.map(p => p.id === updatedPlushie.id ? updatedPlushie : p));
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
