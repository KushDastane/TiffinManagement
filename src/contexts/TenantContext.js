import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../config/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

const TenantContext = createContext({});

export const useTenant = () => useContext(TenantContext);

export const TenantProvider = ({ children }) => {
    const { user, userProfile } = useAuth();
    const [tenant, setTenant] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let unsubscribe;

        const fetchTenant = async () => {
            // If no user or no scoped kitchen, clear tenant
            if (!user || !userProfile || !userProfile.currentKitchenId) {
                setTenant(null);
                return;
            }

            setLoading(true);
            try {
                const kitchenRef = doc(db, 'kitchens', userProfile.currentKitchenId);

                // Real-time listener for the kitchen doc
                unsubscribe = onSnapshot(kitchenRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setTenant({ id: docSnap.id, ...docSnap.data() });
                    } else {
                        setTenant(null);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching tenant:", error);
                    setLoading(false);
                });

            } catch (error) {
                console.error("Error setting up tenant listener:", error);
                setLoading(false);
            }
        };

        fetchTenant();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user, userProfile]);

    return (
        <TenantContext.Provider value={{ tenant, loading }}>
            {children}
        </TenantContext.Provider>
    );
};
