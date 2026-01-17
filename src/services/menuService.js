import {
    collection,
    doc,
    setDoc,
    getDoc,
    query,
    where,
    getDocs,
    onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Use YYYY-MM-DD for IDs to make looking up specific dates easy
export const getMenuDateId = (dateObj) => {
    return dateObj.toISOString().split('T')[0];
};

export const saveMenu = async (kitchenId, date, menuItems) => {
    try {
        const dateId = typeof date === 'string' ? date : getMenuDateId(date);
        const menuRef = doc(db, 'kitchens', kitchenId, 'menus', dateId);

        await setDoc(menuRef, {
            dateId,
            items: menuItems,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        return { success: true };
    } catch (error) {
        console.error("Error saving menu:", error);
        return { error: error.message };
    }
};

export const getMenu = async (kitchenId, date) => {
    try {
        const dateId = typeof date === 'string' ? date : getMenuDateId(date);
        const menuRef = doc(db, 'kitchens', kitchenId, 'menus', dateId);
        const docSnap = await getDoc(menuRef);

        if (docSnap.exists()) {
            return { data: docSnap.data(), exists: true };
        } else {
            return { data: null, exists: false };
        }
    } catch (error) {
        console.error("Error fetching menu:", error);
        return { error: error.message };
    }
};

// Real-time listener for a specific date's menu
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
