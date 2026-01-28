import {
    doc,
    setDoc,
    getDoc,
    onSnapshot,
    collection,
    query,
    orderBy,
    getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Business Day starts at 4 AM. 
// This means 1 AM on Tuesday is still part of Monday's business cycle.
export const getBusinessDate = (date = new Date()) => {
    const d = new Date(date);
    if (d.getHours() < 4) {
        d.setDate(d.getDate() - 1);
    }
    return d;
};

// Use YYYY-MM-DD for IDs based on Business Day
export const getMenuDateId = (dateObj) => {
    const target = getBusinessDate(dateObj);
    return target.toISOString().split('T')[0];
};

export const getTodayKey = () => getMenuDateId(new Date());

export const getTomorrowKey = () => {
    const tomorrow = getBusinessDate();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
};

// Helper to compare times correctly including late night (00:00 - 04:00)
// Returns -1 if t1 < t2, 0 if t1 === t2, 1 if t1 > t2
export const compareTimes = (t1, t2) => {
    if (!t1 || !t2) return 0;

    const [h1, m1] = t1.split(':').map(Number);
    const [h2, m2] = t2.split(':').map(Number);

    // Normalize hours: 00-03 become 24-27 to handle late night
    const nh1 = h1 < 4 ? h1 + 24 : h1;
    const nh2 = h2 < 4 ? h2 + 24 : h2;

    const minutes1 = nh1 * 60 + m1;
    const minutes2 = nh2 * 60 + m2;

    if (minutes1 < minutes2) return -1;
    if (minutes1 > minutes2) return 1;
    return 0;
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
        return (compareTimes(current.end || "", latest.end || "") > 0) ? current : latest;
    }, { end: "" });

    // In a business day logic, "Reset" usually means we are past the last slot's window
    return compareTimes(currentTime, lastSlot.end || "") > 0;
};

/**
 * Gets all currently available meal slots for a student to order.
 */
export const getAvailableSlots = (kitchenConfig) => {
    if (!kitchenConfig?.mealSlots) return [];

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    return Object.entries(kitchenConfig.mealSlots)
        // Filter by end time using normalized compare
        .filter(([id, slot]) => slot && slot.active && compareTimes(currentTime, slot.end || "") <= 0)
        .map(([id, slot]) => ({ id, ...slot }))
        .sort((a, b) => compareTimes(a.start || "", b.start || ""));
};

export const getEffectiveMenuDateKey = (kitchenConfig) => {
    return isAfterResetTime(kitchenConfig) ? getTomorrowKey() : getTodayKey();
};

export const getEffectiveMealSlot = (kitchenConfig) => {
    if (!kitchenConfig?.mealSlots) return null;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const activeSlots = Object.entries(kitchenConfig.mealSlots)
        .filter(([id, slot]) => slot && slot.active)
        .map(([id, slot]) => ({ id, ...slot }))
        .sort((a, b) => compareTimes(a.start || "", b.start || ""));

    if (activeSlots.length === 0) return null;

    // 1. Find slots currently within their window
    const inWindow = activeSlots.filter(s => getSlotStatus(s, currentTime) === 'ACTIVE');
    if (inWindow.length > 0) return inWindow[inWindow.length - 1].id;

    // 2. Find next upcoming slot
    const upcoming = activeSlots.filter(s => getSlotStatus(s, currentTime) === 'UPCOMING');
    if (upcoming.length > 0) return upcoming[0].id;

    // 3. Fallback to first slot
    return activeSlots[0].id;
};

// Generic slot date keys - now generic
export const getSlotDateKey = (slotId, kitchenConfig) => {
    if (!kitchenConfig?.mealSlots?.[slotId]) return getTodayKey();

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const slot = kitchenConfig.mealSlots[slotId];

    return compareTimes(currentTime, slot.end || "") <= 0 ? getTodayKey() : getTomorrowKey();
};

// Keep these for backward compatibility if needed, but they are now thin wrappers
export const getLunchDateKey = (kitchenConfig) => getSlotDateKey('lunch', kitchenConfig);
export const getDinnerDateKey = (kitchenConfig) => getSlotDateKey('dinner', kitchenConfig);

/**
 * Determines the status of a specific slot relative to current time.
 */
export const getSlotStatus = (slotObj, currentTime) => {
    if (!slotObj || !slotObj.start || !slotObj.end) return 'ENDED';
    const starts = compareTimes(currentTime, slotObj.start);
    const ends = compareTimes(currentTime, slotObj.end);

    if (starts >= 0 && ends <= 0) return 'ACTIVE';
    if (starts < 0) return 'UPCOMING';
    return 'ENDED';
};

/**
 * Finds the next upcoming slot of the day.
 */
export const getNextUpcomingSlot = (kitchenConfig, currentTime) => {
    if (!kitchenConfig?.mealSlots) return null;
    const upcoming = Object.entries(kitchenConfig.mealSlots)
        .filter(([id, slot]) => slot && slot.active && currentTime < (slot.start || ""))
        .map(([id, slot]) => ({ id, ...slot }))
        .sort((a, b) => (a.start || "").localeCompare(b.start || ""));

    return upcoming.length > 0 ? upcoming[0] : null;
};

/**
 * Tracks dish frequency for a specific kitchen.
 */
export const updateDishHistory = async (kitchenId, dishNames) => {
    if (!dishNames || dishNames.length === 0) return;
    try {
        const batch = []; // Simulate batch or just loop for simplicity
        for (const name of dishNames) {
            if (!name) continue;
            const normalized = name.trim().toLowerCase();
            const dishRef = doc(db, 'kitchens', kitchenId, 'dishLibrary', normalized);
            const snap = await getDoc(dishRef);

            await setDoc(dishRef, {
                name, // Store original casing
                frequency: (snap.exists() ? (snap.data().frequency || 0) : 0) + 1,
                lastUsed: new Date().toISOString()
            }, { merge: true });
        }
    } catch (error) {
        console.error("Error updating dish history:", error);
    }
};

/**
 * Retrieves top dish suggestions based on prefix and frequency.
 */
export const getDishLibrary = async (kitchenId) => {
    try {
        const libraryRef = collection(db, 'kitchens', kitchenId, 'dishLibrary');
        const q = query(libraryRef, orderBy('frequency', 'desc'));
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data());
    } catch (error) {
        console.error("Error fetching dish library:", error);
        return [];
    }
};
