import {
    collection,
    addDoc,
    doc,
    updateDoc,
    getDoc,
    query,
    where,
    getDocs,
    arrayUnion,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Helper to generate a random 6-character code
const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const createKitchen = async (ownerId, kitchenData) => {
    try {
        const joinCode = generateJoinCode();
        const { kitchenType, ...rest } = kitchenData;

        // Smart Defaults based on Type
        let mealTypes = [];
        if (kitchenType === 'DABBA') {
            mealTypes = [
                { id: 'lunch', label: 'Lunch', mode: 'FIXED', startTime: '07:00', endTime: '13:00', allowCustomization: true },
                { id: 'dinner', label: 'Dinner', mode: 'FIXED', startTime: '16:00', endTime: '21:00', allowCustomization: true }
            ];
        } else {
            mealTypes = [
                { id: 'breakfast', label: 'Breakfast', mode: 'MENU', startTime: '07:00', endTime: '11:00' },
                { id: 'lunch', label: 'Lunch', mode: 'MENU', startTime: '11:00', endTime: '15:00' },
                { id: 'snacks', label: 'Snacks', mode: 'MENU', startTime: '15:00', endTime: '19:00' }
            ];
        }

        const newKitchen = {
            ownerId,
            joinCode,
            status: 'active',
            createdAt: serverTimestamp(),
            mealTypes,
            fixedMealConfig: {
                global: {
                    variants: [
                        { id: 'v1', label: 'Half Dabba', quantities: { roti: 4 }, basePrice: 50 },
                        { id: 'v2', label: 'Full Dabba', quantities: { roti: 6 }, basePrice: 80 }
                    ],
                    optionalComponents: [
                        { id: 'c1', name: 'Dal Rice', price: 20, enabled: true, allowQuantity: false },
                        { id: 'c2', name: 'Extra Roti', price: 5, enabled: true, allowQuantity: true }
                    ]
                },
                overrides: {}
            },
            kitchenType,
            ...rest
        };

        const docRef = await addDoc(collection(db, 'kitchens'), newKitchen);

        // Update owner's profile to set currentKitchenId
        await updateDoc(doc(db, 'users', ownerId), {
            currentKitchenId: docRef.id
        });

        return { id: docRef.id, ...newKitchen, error: null };
    } catch (error) {
        console.error("Error creating kitchen:", error);
        return { error: error.message };
    }
};

export const joinKitchen = async (userId, joinCode) => {
    try {
        // 1. Find kitchen by joinCode
        const q = query(collection(db, 'kitchens'), where('joinCode', '==', joinCode));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { error: "Invalid kitchen code" };
        }

        const kitchenDoc = querySnapshot.docs[0];
        const kitchenId = kitchenDoc.id;

        // 2. Add kitchen to user's joinedKitchens and set as current
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            joinedKitchens: arrayUnion(kitchenId),
            currentKitchenId: kitchenId
        });

        return { success: true, kitchenId };
    } catch (error) {
        console.error("Error joining kitchen:", error);
        return { error: error.message };
    }
};
export const getAllKitchens = async (filter = '') => {
    try {
        const kitchensRef = collection(db, 'kitchens');
        let q = query(kitchensRef, where('status', '==', 'active'));

        const querySnapshot = await getDocs(q);
        let kitchens = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (filter) {
            const lowerFilter = filter.toLowerCase();
            kitchens = kitchens.filter(k =>
                (k.name && k.name.toLowerCase().includes(lowerFilter)) ||
                (k.address?.city && k.address.city.toLowerCase().includes(lowerFilter)) ||
                (k.address?.pinCode && k.address.pinCode.includes(lowerFilter)) ||
                (k.address?.line1 && k.address.line1.toLowerCase().includes(lowerFilter)) ||
                (k.area && k.area.toLowerCase().includes(lowerFilter)) ||
                (k.locality && k.locality.toLowerCase().includes(lowerFilter))
            );
        }

        return kitchens;
    } catch (error) {
        console.error("Error fetching kitchens:", error);
        return [];
    }
};

export const updateKitchen = async (kitchenId, updates) => {
    try {
        const kitchenRef = doc(db, 'kitchens', kitchenId);
        await updateDoc(kitchenRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error updating kitchen:", error);
        return { error: error.message };
    }
};

export const getKitchenConfig = async (kitchenId) => {
    try {
        if (!kitchenId) return null;
        const docRef = doc(db, 'kitchens', kitchenId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            return {
                openTime: data.openTime || '07:00',
                closeTime: data.closeTime || '21:00',
                holiday: data.holiday || { active: false, from: '', to: '', reason: '' }
            };
        }
        return null;
    } catch (error) {
        console.error("Error getting kitchen config:", error);
        return null;
    }
};

export const updateKitchenConfig = async (kitchenId, config) => {
    try {
        if (!kitchenId) throw new Error("Missing kitchen ID");
        const kitchenRef = doc(db, 'kitchens', kitchenId);
        await updateDoc(kitchenRef, {
            ...config,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error updating kitchen config:", error);
        return { success: false, error: error.message };
    }
};
