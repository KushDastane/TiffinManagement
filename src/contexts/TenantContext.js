import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../config/firebase';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';

const TenantContext = createContext({});

export const useTenant = () => useContext(TenantContext);

export const TenantProvider = ({ children }) => {
    const { user, userProfile } = useAuth();
    const [tenant, setTenant] = useState(null);
    const [joinedKitchens, setJoinedKitchens] = useState([]);
    const [loading, setLoading] = useState(!!user);

    useEffect(() => {
        let unsubscribe;

        const fetchTenant = async () => {
            // If no user or no scoped kitchen, clear tenant
            if (!user || !userProfile || !userProfile.currentKitchenId) {
                setTenant(null);
                setJoinedKitchens([]);
                setLoading(false);
                return;
            }

            // ONLY set loading if we don't already have the right tenant loaded
            if (!tenant || tenant.id !== userProfile.currentKitchenId) {
                setLoading(true);
            }
            try {
                // 1. Fetch current kitchen details
                const kitchenRef = doc(db, 'kitchens', userProfile.currentKitchenId);
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

                // 2. Fetch all joined kitchens for the selector
                if (userProfile.joinedKitchens && userProfile.joinedKitchens.length > 0) {
                    const kitchensRef = collection(db, 'kitchens');
                    const q = query(kitchensRef, where('__name__', 'in', userProfile.joinedKitchens));
                    const snap = await getDocs(q);
                    const list = snap.docs.map(d => ({ id: d.id, name: d.data().name }));
                    setJoinedKitchens(list);
                }

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
        <TenantContext.Provider value={{ tenant, joinedKitchens, loading }}>
            {children}
        </TenantContext.Provider>
    );
};
