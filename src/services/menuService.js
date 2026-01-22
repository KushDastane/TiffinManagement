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

export const getTodayKey = () => getMenuDateId(new Date());

export const getTomorrowKey = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getMenuDateId(tomorrow);
};

export const isAfterResetTime = () => {
    const now = new Date();
    const currentHour = now.getHours();
    // After 9 PM (21:00) until 6 AM next day, show tomorrow's menu
    // This handles: 21, 22, 23, 0, 1, 2, 3, 4, 5
    return currentHour >= 21 || currentHour < 6;
};

/**
 * Saves a detailed menu for a specific date.
 */
export const saveMenu = async (kitchenId, date, menuData) => {
    try {
        const dateId = typeof date === 'string' ? date : getMenuDateId(date);
        const menuRef = doc(db, 'kitchens', kitchenId, 'menus', dateId);

        await setDoc(menuRef, {
            dateId,
            ...menuData,
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
export const getEffectiveMenuDateKey = () => {
    return isAfterResetTime() ? getTomorrowKey() : getTodayKey();
};

export const getEffectiveMealSlot = () => {
    const currentHour = new Date().getHours();
    // Use the same logic as the user's snippet
    if (currentHour < 15) return "lunch";
    if (currentHour >= 16 && currentHour < 21) return "dinner";
    // The user's snippet implies currentHour < 15 is lunch, else maybe dinner? 
    // Let's refine based on the user's canPlaceOrder logic:
    // lunch: currentHour < 15
    // dinner: currentHour < 20 (and presumably after lunch time)
    if (currentHour < 15) return "lunch";
    if (currentHour < 20) return "dinner";
    return null;
};
