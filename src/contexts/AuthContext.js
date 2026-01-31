import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let profileUnsubscribe;

        const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                setLoading(true);
                setUserProfile(null);

                // Session flag to distinguish between new users and deleted accounts
                let profileWasFound = false;

                // Real-time listener for user profile
                const userRef = doc(db, 'users', firebaseUser.uid);
                profileUnsubscribe = onSnapshot(userRef, (docSnap) => {
                    if (docSnap.exists()) {
                        profileWasFound = true;
                        setUserProfile(docSnap.data());
                        setLoading(false);
                    } else {
                        // Profile was deleted or doesn't exist
                        setUserProfile(null);

                        if (profileWasFound) {
                            // If it existed before and now it's gone, it was deleted.
                            // Sign out to force redirect to login screen.
                            auth.signOut();
                        } else {
                            // It's a brand new user, let them complete registration.
                            setLoading(false);
                        }
                    }
                }, (error) => {
                    console.error("Error fetching user profile:", error);
                    setLoading(false);
                });
            } else {
                // Cleanup profile listener if logged out
                if (profileUnsubscribe) {
                    profileUnsubscribe();
                    profileUnsubscribe = null;
                }
                setUserProfile(null);
                setLoading(false);
            }
        });

        return () => {
            authUnsubscribe();
            if (profileUnsubscribe) profileUnsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, userProfile, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
