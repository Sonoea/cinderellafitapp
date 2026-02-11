import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA-hIlsgRwJm_RIfwN9adXOzAxi1cqIPMY",
    authDomain: "cinderellafit-bb7b7.firebaseapp.com",
    projectId: "cinderellafit-bb7b7",
    storageBucket: "cinderellafit-bb7b7.firebasestorage.app",
    messagingSenderId: "698769589749",
    appId: "1:698769589749:web:921017e4008be8eefa0cbc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Storage
export const storage = getStorage(app);

export default app;
