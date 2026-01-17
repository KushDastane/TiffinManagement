import {
    doc,
    setDoc,
    getDoc,
    onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Use YYYY-MM-DD for IDs
export const getMenuDateId = (dateObj) => {
    return dateObj.toISOString().split('T')[0];
};

/**
 * Saves a detailed menu for a specific date.
 * Structure:
 * {
 *   dateId: "2024-01-20",
 *   lunch: { type, status, rotiSabzi: {...}, other: {...}, extras: [] },
 *   dinner: { ... }
 * }
 */
export const saveMenu = async (kitchenId, date, menuData) => {
    try {
        const dateId = typeof date === 'string' ? date : getMenuDateId(date);
        const menuRef = doc(db, 'kitchens', kitchenId, 'menus', dateId);

        await setDoc(menuRef, {
            dateId,
            ...menuData, // Expects { lunch: {...}, dinner: {...} }
            updatedAt: new Date().toISOString()
        }, { merge: true });

        return { success: true };
    } catch (error) {
        console.error("Error saving menu:", error);
        return { error: error.message };
    }
};

export const subscribeToMenu = (kitchenId, date, callback) => {
    const dateId = typeof date === 'string' ? date : getMenuDateId(date);
    const menuRef = doc(db, 'kitchens', kitchenId, 'menus', dateId);

    return onSnapshot(menuRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data());
        } else {
            callback(null);
        }
    }, (error) => {
        console.error("Menu subscription error:", error);
    });
};
