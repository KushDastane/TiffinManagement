import {
    collection,
    addDoc,
    doc,
    updateDoc,
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

        // TODO: Ensure uniqueness of joinCode in a loop if needed, 
        // but for MVP collision probability is low enough.

        const newKitchen = {
            ownerId,
            joinCode,
            status: 'active',
            createdAt: serverTimestamp(),
            ...kitchenData
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
