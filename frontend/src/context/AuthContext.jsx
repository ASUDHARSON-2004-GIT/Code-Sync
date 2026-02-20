import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '../firebase/config';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut, updateProfile } from 'firebase/auth';
import axiosInstance from '../api/axiosInstance';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Background sync - don't set global loading to true as it can unmount UI components
                try {
                    console.log("Starting backend sync for:", firebaseUser.email);
                    const response = await axiosInstance.post('/api/auth/firebase-sync', {
                        email: firebaseUser.email,
                        name: firebaseUser.displayName,
                        photoURL: firebaseUser.photoURL,
                        uid: firebaseUser.uid
                    });
                    console.log("Backend sync successful:", response.data.user);
                    setUser({ ...firebaseUser, ...response.data.user, token: response.data.token });
                } catch (err) {
                    console.error("Auth Sync Error Details:", err.response?.data || err.message);
                    setUser(firebaseUser);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
    const signup = async (email, password, name) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        // Manually trigger sync to ensure name is updated in DB
        const response = await axiosInstance.post('/api/auth/firebase-sync', {
            email: userCredential.user.email,
            name: name,
            photoURL: userCredential.user.photoURL,
            uid: userCredential.user.uid
        });
        setUser({ ...userCredential.user, ...response.data.user, token: response.data.token });
        return userCredential;
    };
    const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
    const logout = () => signOut(auth);

    const value = { user, login, signup, loginWithGoogle, logout, loading };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
