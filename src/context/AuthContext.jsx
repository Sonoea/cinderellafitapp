import React, { createContext, useState, useContext, useEffect } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase/config';
import { sendNewUserNotification } from '../utils/emailService';
import { generateUniqueSlug } from '../utils/profileSlug';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Sign up with email and password
    const signup = async (email, password) => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);

            const displayName = result.user.displayName || email.split('@')[0];
            const profileSlug = await generateUniqueSlug(displayName, result.user.uid);

            const userData = {
                email: result.user.email,
                displayName,
                profileSlug,
                createdAt: new Date().toISOString(),
                plan: 'free',
                plushieCount: 0,
                lastLoginAt: new Date().toISOString()
            };

            // Create user profile in Firestore
            await setDoc(doc(db, 'users', result.user.uid), userData);

            // Send notification to admin
            await sendNewUserNotification({ ...userData, uid: result.user.uid });

            return { success: true, user: result.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    // Login with email and password
    const login = async (email, password) => {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);

            // Check if profileSlug exists, if not generate it
            const userDocRef = doc(db, 'users', result.user.uid);
            const userDoc = await getDoc(userDocRef);

            const updates = {
                lastLoginAt: new Date().toISOString()
            };

            if (userDoc.exists() && !userDoc.data().profileSlug) {
                const displayName = userDoc.data().displayName || result.user.displayName || 'User';
                updates.profileSlug = await generateUniqueSlug(displayName, result.user.uid);
            }

            await setDoc(userDocRef, updates, { merge: true });

            return { success: true, user: result.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    // Login with Google
    const loginWithGoogle = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);

            // Check if user profile exists
            const userDoc = await getDoc(doc(db, 'users', result.user.uid));

            if (!userDoc.exists()) {
                const gDisplayName = result.user.displayName || 'User';
                const gProfileSlug = await generateUniqueSlug(gDisplayName, result.user.uid);

                const userData = {
                    email: result.user.email,
                    displayName: gDisplayName,
                    profileSlug: gProfileSlug,
                    photoURL: result.user.photoURL || null,
                    createdAt: new Date().toISOString(),
                    plan: 'free',
                    plushieCount: 0,
                    lastLoginAt: new Date().toISOString()
                };

                // Create new user profile
                await setDoc(doc(db, 'users', result.user.uid), userData);

                // Send notification to admin
                await sendNewUserNotification({ ...userData, uid: result.user.uid });
            } else {
                // Update last login time
                const updates = {
                    lastLoginAt: new Date().toISOString()
                };

                // Check if profileSlug exists (for existing users)
                if (!userDoc.data().profileSlug) {
                    const displayName = userDoc.data().displayName || result.user.displayName || 'User';
                    updates.profileSlug = await generateUniqueSlug(displayName, result.user.uid);
                }

                await setDoc(doc(db, 'users', result.user.uid), updates, { merge: true });
            }

            return { success: true, user: result.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    // Logout
    const logout = async () => {
        try {
            await signOut(auth);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    // Save user data to Firestore
    const saveUserData = async (userId, data) => {
        try {
            await setDoc(doc(db, 'users', userId), data, { merge: true });
            return { success: true };
        } catch (error) {
            console.error('Error saving user data:', error);
            return { success: false, error: error.message };
        }
    };

    // Get user data from Firestore
    const getUserData = async (userId) => {
        try {
            const docRef = doc(db, 'users', userId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return { success: true, data: docSnap.data() };
            } else {
                return { success: false, error: 'No data found' };
            }
        } catch (error) {
            console.error('Error getting user data:', error);
            return { success: false, error: error.message };
        }
    };

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        signup,
        login,
        loginWithGoogle,
        logout,
        saveUserData,
        getUserData,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
