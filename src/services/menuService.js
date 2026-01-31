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

// Robust helper to get YYYY-MM-DD in local time
export const formatDateToId = (dateObj) => {
    if (!dateObj) return "";
    const d = new Date(dateObj);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Return YYYY-MM-DD for the date provided (No automatic business day offset here)
export const getMenuDateId = (date) => {
    return formatDateToId(date);
};

export const getTodayKey = () => {
    const bizToday = getBusinessDate(new Date());
    return formatDateToId(bizToday);
};

export const getTomorrowKey = () => {
    const bizToday = getBusinessDate(new Date());
    bizToday.setDate(bizToday.getDate() + 1);
    return formatDateToId(bizToday);
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

    const activeSlots = Object.values(kitchenConfig.mealSlots).filter(s => s.active);
    if (activeSlots.length === 0) return false;

    // Find the absolute latest end time
    const lastSlot = activeSlots.reduce((latest, current) => {
        return (compareTimes(current.end || "00:00", latest.end || "00:00") > 0) ? current : latest;
    }, { end: "00:00" });

    // If current time is past the last slot's end time, it's "Pre-order" time for tomorrow
    return compareTimes(currentTime, lastSlot.end || "00:00") > 0;
};

/**
 * Gets all currently available meal slots for a student to order.
 */
export const getAvailableSlots = (kitchenConfig) => {
    if (!kitchenConfig?.mealSlots) return [];

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Return only slots that are active AND not yet ended for the current/approaching window.
    // This keeps "Place Order" visible for pre-orders but cleans up the tag list.
    return Object.entries(kitchenConfig.mealSlots)
        .filter(([id, slot]) => slot && slot.active)
        .map(([id, slot]) => ({ id, ...slot }))
        .filter(slot => getSlotStatus(slot, currentTime) !== 'ENDED')
        .sort((a, b) => compareTimes(a.start || "00:00", b.start || "00:00"));
};

export const getEffectiveMenuDateKey = (kitchenConfig) => {
    // Keep it on Today's business day until the 4 AM rollover.
    return getTodayKey();
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

// Generic slot date keys
export const getSlotDateKey = (slotId, kitchenConfig) => {
    if (!kitchenConfig?.mealSlots?.[slotId]) return getTodayKey();

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const slot = kitchenConfig.mealSlots[slotId];

    return compareTimes(currentTime, slot.end || "") <= 0 ? getTodayKey() : getTomorrowKey();
};

// Backward compatibility wrappers
export const getLunchDateKey = (kitchenConfig) => getSlotDateKey('lunch', kitchenConfig);
export const getDinnerDateKey = (kitchenConfig) => getSlotDateKey('dinner', kitchenConfig);

/**
 * Determines the status of a specific slot relative to current time.
 */
export const getSlotStatus = (slotObj, currentTime) => {
    if (!slotObj?.start || !slotObj?.end) return 'ENDED';

    const [h, m] = currentTime.split(':').map(Number);
    const [sh, sm] = slotObj.start.split(':').map(Number);
    const [eh, em] = slotObj.end.split(':').map(Number);

    const t = h * 60 + m;
    const s = sh * 60 + sm;
    const e = eh * 60 + em;

    if (s <= e) {
        // Normal slot (e.g., 12:00 to 14:00)
        if (t >= s && t <= e) return 'ACTIVE';
        if (t < s) return 'UPCOMING';
        return 'ENDED';
    } else {
        // Wrapping slot (e.g., 22:00 to 07:00)
        if (t >= s || t <= e) return 'ACTIVE';
        // Between end and start is the "dead zone" soon after it ends
        return 'UPCOMING';
    }
};

/**
 * Finds the next upcoming slot of the day.
 */
export const getNextUpcomingSlot = (kitchenConfig, currentTime) => {
    if (!kitchenConfig?.mealSlots) return null;
    const upcoming = Object.entries(kitchenConfig.mealSlots)
        .filter(([id, slot]) => slot && slot.active && compareTimes(currentTime, slot.start || "") < 0)
        .map(([id, slot]) => ({ id, ...slot }))
        .sort((a, b) => compareTimes(a.start || "00:00", b.start || "00:00"));

    return upcoming.length > 0 ? upcoming[0] : null;
};

/**
 * Tracks dish frequency for a specific kitchen.
 */
export const updateDishHistory = async (kitchenId, dishNames) => {
    if (!dishNames || dishNames.length === 0) return;
    try {
        for (const name of dishNames) {
            if (!name) continue;
            const normalized = name.trim().toLowerCase();
            const dishRef = doc(db, 'kitchens', kitchenId, 'dishLibrary', normalized);
            const snap = await getDoc(dishRef);

            await setDoc(dishRef, {
                name,
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
