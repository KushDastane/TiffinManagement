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

/**
 * Checks if current time is past the end of the last active meal slot.
 */
export const isAfterResetTime = (kitchenConfig) => {
    if (!kitchenConfig?.mealSlots) return false;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Find the latest end time among active slots
    const activeSlots = Object.values(kitchenConfig.mealSlots).filter(s => s.active);
    if (activeSlots.length === 0) return false;

    const lastSlot = activeSlots.reduce((latest, current) => {
        return (current.end > latest.end) ? current : latest;
    });

    return currentTime > lastSlot.end;
};

/**
 * Gets all currently available meal slots for a student to order.
 */
export const getAvailableSlots = (kitchenConfig) => {
    if (!kitchenConfig?.mealSlots) return [];

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    return Object.entries(kitchenConfig.mealSlots)
        .filter(([id, slot]) => slot.active && currentTime <= slot.end)
        .map(([id, slot]) => ({ id, ...slot }))
        .sort((a, b) => a.start.localeCompare(b.start));
};

export const getEffectiveMenuDateKey = (kitchenConfig) => {
    return isAfterResetTime(kitchenConfig) ? getTomorrowKey() : getTodayKey();
};

export const getEffectiveMealSlot = (kitchenConfig) => {
    if (!kitchenConfig?.mealSlots) return null;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const activeSlots = Object.entries(kitchenConfig.mealSlots)
        .filter(([id, slot]) => slot.active)
        .map(([id, slot]) => ({ id, ...slot }))
        .sort((a, b) => a.start.localeCompare(b.start));

    if (activeSlots.length === 0) return null;

    // 1. Check for current slots (now <= end)
    const current = activeSlots.filter(s => currentTime <= s.end);
    if (current.length > 0) return current[0].id;

    // 2. If nothing is "Current", return the very first slot of the day (for the next cycle)
    return activeSlots[0].id;
};

// Generic slot date keys - now generic
export const getSlotDateKey = (slotId, kitchenConfig) => {
    if (!kitchenConfig?.mealSlots?.[slotId]) return getTodayKey();

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const slot = kitchenConfig.mealSlots[slotId];

    return currentTime <= slot.end ? getTodayKey() : getTomorrowKey();
};

// Keep these for backward compatibility if needed, but they are now thin wrappers
export const getLunchDateKey = (kitchenConfig) => getSlotDateKey('lunch', kitchenConfig);
export const getDinnerDateKey = (kitchenConfig) => getSlotDateKey('dinner', kitchenConfig);
