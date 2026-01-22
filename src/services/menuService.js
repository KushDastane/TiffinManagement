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
    // After 9 PM (21:00), show tomorrow's menu. 
    // Midnight to morning (0-6) is considered "Today" so strict >= 21.
    return currentHour >= 21;
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

    // Logic:
    // < 15 (3 PM) -> Lunch
    // < 21 (9 PM) -> Dinner
    // >= 21 (9 PM) -> Lunch (Cycle resets to next day via Date Key)

    if (currentHour < 15) return "lunch";
    if (currentHour < 21) return "dinner";
    return "lunch";
};

export const getLunchDateKey = () => {
    const currentHour = new Date().getHours();
    return currentHour < 15 ? getTodayKey() : getTomorrowKey();
};

export const getDinnerDateKey = () => {
    const currentHour = new Date().getHours();
    return currentHour < 21 ? getTodayKey() : getTomorrowKey();
};
