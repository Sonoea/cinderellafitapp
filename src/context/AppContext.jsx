import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { translations } from '../translations';
import { db } from '../firebase/config';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
const AppContext = createContext();

// Helper to track previous value
function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

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
  const prevUser = usePrevious(currentUser);

  // Load from localStorage (Guest) or Firestore (User)
  useEffect(() => {
    const loadPlushies = async () => {
      if (currentUser) {
        // Logged in: Load from Firestore
        try {
          const q1 = collection(db, "users", currentUser.uid, "plushies");
          const snap1 = await getDocs(q1);

          const loadedPlushies = [];
          snap1.forEach(doc => loadedPlushies.push(doc.data()));

          if (loadedPlushies.length > 0) {
            // Restore default plushie (ID 2) if missing — Unae-san is a shared default for all users
            if (!loadedPlushies.some(p => p.id === 2)) {
              loadedPlushies.push(DEFAULT_PLUSHIE);
            }
            setPlushies(loadedPlushies.sort((a, b) => a.id - b.id));
          } else {
            // Firestore is empty — check if there's local data to migrate
            const savedLocal = localStorage.getItem('my_plushies_v3');
            let localPlushies = [];
            try {
              localPlushies = savedLocal ? JSON.parse(savedLocal) : [];
            } catch (e) { localPlushies = []; }

            // Filter out default plushie for migration count check
            const userLocalPlushies = localPlushies.filter(p => p.id !== 2);

            if (userLocalPlushies.length > 0) {
              // Migrate local data to Firestore
              console.log(`Migrating ${userLocalPlushies.length} plushies from localStorage to Firestore...`);
              for (const p of localPlushies) {
                try {
                  await setDoc(doc(db, "users", currentUser.uid, "plushies", String(p.id)), p);
                } catch (e) {
                  console.error("Migration error (plushie):", e);
                }
              }
              setPlushies(localPlushies.sort((a, b) => a.id - b.id));
              // Clear local data after successful migration
              localStorage.removeItem('my_plushies_v3');
            } else {
              // Initial seed for new user if empty
              setPlushies([DEFAULT_PLUSHIE]);
            }
          }
        } catch (error) {
          console.error("[AppContext] Error loading plushies from Firestore:", error);
          if (error.code === 'permission-denied') {
            console.warn("[AppContext] Permission denied for plushies. Are rules deployed?");
          }
        }
      } else {
        // Guest: Load from localStorage
        const saved = localStorage.getItem('my_plushies_v3');
        let parsed;
        try {
          parsed = saved ? JSON.parse(saved) : [DEFAULT_PLUSHIE];
        } catch (e) {
          console.error("Failed to parse plushies from localStorage", e);
          parsed = [DEFAULT_PLUSHIE];
        }

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

        // Ensure default plushie (Unae-san) exists for guests too
        if (!parsed) parsed = [];
        if (!parsed.some(p => p.id === 2)) {
          parsed.push(DEFAULT_PLUSHIE);
        }

        parsed.sort((a, b) => a.id - b.id);

        setPlushies(parsed.filter(p => p.name !== 'Allan'));
      }
    };

    loadPlushies();
  }, [currentUser]);

  // Save to localStorage when plushies change (Backup/Guest mode)
  useEffect(() => {
    // SECURITY FIX: Do not save to localStorage if we just logged out (prevUser exists, currentUser null)
    // This prevents the previous user's private data from being written to guest storage before state clears.
    const isLoggingOut = prevUser && !currentUser;
    if (!currentUser && !isLoggingOut) {
      try {
        localStorage.setItem('my_plushies_v3', JSON.stringify(plushies));
      } catch (e) {
        console.error("Failed to save plushies to localStorage", e);
        if (e.name === 'QuotaExceededError') {
          alert(t('storageQuotaExceeded') || "Storage full! Images might not be saved. please try smaller images.");
        }
      }
    }
  }, [plushies, currentUser, prevUser, t]);

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


  const deletePlushie = async (id) => {
    // Optimistic Update
    const newPlushies = plushies.filter(p => p.id !== id);
    setPlushies(newPlushies);

    if (currentUser) {
      try {
        await deleteDoc(doc(db, "users", currentUser.uid, "plushies", String(id)));
      } catch (e) {
        console.error("Error deleting plushie from Firestore: ", e);
        alert("削除の同期に失敗しました。");
      }
    }
  };

  // Closet State
  const [closetItems, setClosetItems] = useState(() => {
    try {
      const saved = localStorage.getItem('my_closet_v2');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter(item => item && typeof item === 'object') : [];
    } catch (e) {
      console.error("Failed to parse closet items", e);
      return [];
    }
  });

  // Load Closet Items from Firestore
  useEffect(() => {
    const loadClosetItems = async () => {
      if (currentUser) {
        try {
          const q1 = collection(db, "users", currentUser.uid, "closetItems");
          const q2 = collection(db, "users", currentUser.uid, "クローゼットアイテム");
          const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

          const loadedItems = [];
          snap1.forEach(docSnap => loadedItems.push(docSnap.data()));
          snap2.forEach(docSnap => loadedItems.push(docSnap.data()));

          if (loadedItems.length > 0) {
            setClosetItems(loadedItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
          } else {
            // Firestore is empty — check if there's local data to migrate
            const savedLocal = localStorage.getItem('my_closet_v2');
            let localItems = [];
            try {
              localItems = savedLocal ? JSON.parse(savedLocal) : [];
              localItems = Array.isArray(localItems) ? localItems.filter(item => item && typeof item === 'object') : [];
            } catch (e) { localItems = []; }

            if (localItems.length > 0) {
              // Migrate local data to Firestore with userId attached
              console.log(`Migrating ${localItems.length} closet items from localStorage to Firestore...`);
              const migratedItems = [];
              for (const item of localItems) {
                const migratedItem = {
                  ...item,
                  userId: currentUser.uid,
                  userName: currentUser.displayName || '',
                  userIcon: currentUser.photoURL || '',
                };
                try {
                  await setDoc(doc(db, "users", currentUser.uid, "closetItems", String(migratedItem.id)), migratedItem);
                  migratedItems.push(migratedItem);
                } catch (e) {
                  console.error("Migration error (closet item):", e);
                }
              }
              setClosetItems(migratedItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
              // Clear local data after successful migration
              localStorage.removeItem('my_closet_v2');
            } else {
              setClosetItems([]);
            }
          }
        } catch (error) {
          console.error("[AppContext] Error loading closetItems from Firestore:", error);
          if (error.code === 'permission-denied') {
            console.warn("[AppContext] Permission denied for closetItems. Check collectionGroup rules.");
          }
        }
      } else {
        // Fallback to local storage for guest
        const saved = localStorage.getItem('my_closet_v2');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            // SECURITY FIX: Filter out items that have a userId (meaning they belong to a logged-in user)
            // This cleans up any data that might have leaked into localStorage during previous sessions.
            const guestItems = Array.isArray(parsed) ? parsed.filter(item => !item.userId) : [];

            setClosetItems(guestItems);

            // If we filtered out items, update localStorage immediately to clean up the leak
            if (Array.isArray(parsed) && guestItems.length !== parsed.length) {
              localStorage.setItem('my_closet_v2', JSON.stringify(guestItems));
            }
          } catch (e) {
            console.error("Failed to parse local closet items", e);
            setClosetItems([]);
          }
        }
      }
    };
    loadClosetItems();
  }, [currentUser]);

  // Sync to LocalStorage (Backup/Guest)
  useEffect(() => {
    // SECURITY FIX: Do not save to localStorage if we just logged out.
    const isLoggingOut = prevUser && !currentUser;
    if (!currentUser && !isLoggingOut) {
      try {
        localStorage.setItem('my_closet_v2', JSON.stringify(closetItems));
      } catch (e) {
        console.error("Failed to save closet to localStorage", e);
      }
    }
  }, [closetItems, currentUser, prevUser]);

  const addClosetItem = async (item) => {
    const newItem = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      ...item
    };

    // Attach user info so Gallery can display who posted the item
    if (currentUser) {
      newItem.userId = currentUser.uid;
      newItem.userName = currentUser.displayName || '';
      newItem.userIcon = currentUser.photoURL || '';
    }

    // Optimistic Update
    const newItems = [newItem, ...closetItems];
    setClosetItems(newItems);

    if (currentUser) {
      try {
        await setDoc(doc(db, "users", currentUser.uid, "closetItems", String(newItem.id)), newItem);
      } catch (e) {
        console.error("Error adding closet item to Firestore: ", e);
        // revert? or just alert
        alert("クラウドへの保存に失敗しました。");
      }
    }
  };

  const updateClosetItem = async (id, updates) => {
    // Optimistic Update
    const newItems = closetItems.map(item => String(item.id) === String(id) ? { ...item, ...updates } : item);
    setClosetItems(newItems);

    if (currentUser) {
      try {
        // Need to merge updates with existing item logic or just send updates?
        // setDoc with merge: true is safest if we just send the whole item again or specific fields
        // Let's find the full updated object to be safe
        const updatedItem = newItems.find(i => String(i.id) === String(id));
        if (updatedItem) {
          await setDoc(doc(db, "users", currentUser.uid, "closetItems", String(id)), updatedItem, { merge: true });
        }
      } catch (e) {
        console.error("Error updating closet item in Firestore: ", e);
        alert("クラウドへの保存に失敗しました。");
      }
    }
  };

  const deleteClosetItem = async (id) => {
    // Optimistic Update
    const newItems = closetItems.filter(item => String(item.id) !== String(id));
    setClosetItems(newItems);

    if (currentUser) {
      try {
        await deleteDoc(doc(db, "users", currentUser.uid, "closetItems", String(id)));
      } catch (e) {
        console.error("Error deleting closet item from Firestore: ", e);
        alert("削除の同期に失敗しました。");
      }
    }
  };

  return (
    <AppContext.Provider value={{
      plushies, addPlushie, updatePlushie, deletePlushie,
      closetItems, addClosetItem, updateClosetItem, deleteClosetItem,
      language, setLanguage, toggleLanguage, t,
      userPlan, setUserPlan, plushieLimit, canAddPlushie, userAddedPlushieCount
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
