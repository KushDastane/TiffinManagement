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
    serverTimestamp,
    setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Helper to calculate service area range (+/- 1 pincode)
const calculateServicePincodes = (pincode) => {
    if (!pincode) return [];
    const pin = Number(pincode);
    if (isNaN(pin)) return [String(pincode)];
    return [
        String(pin - 1),
        String(pin),
        String(pin + 1)
    ];
};

// Helper to generate a unique random code (AAA-1234)
const generateJoinCode = async () => {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed I, O for clarity
    let isUnique = false;
    let code = '';

    while (!isUnique) {
        const l1 = letters[Math.floor(Math.random() * letters.length)];
        const l2 = letters[Math.floor(Math.random() * letters.length)];
        const l3 = letters[Math.floor(Math.random() * letters.length)];
        const n = Math.floor(1000 + Math.random() * 9000);
        code = `${l1}${l2}${l3}-${n}`;

        const q = query(collection(db, 'kitchens'), where('joinCode', '==', code));
        const existing = await getDocs(q);
        if (existing.empty) isUnique = true;
    }
    return code;
};

export const createKitchen = async (ownerId, kitchenData) => {
    try {
        const joinCode = await generateJoinCode();

        const { kitchenType, ...rest } = kitchenData;

        // Smart Defaults based on Type
        let mealTypes = [];
        let mealSlots = {};

        const SLOT_DEFAULTS = {
            breakfast: { active: false, start: '22:00', end: '07:00', pickupStart: '07:30', pickupEnd: '09:00', deliveryStart: '07:30', deliveryEnd: '09:00' },
            lunch: { active: false, start: '22:00', end: '14:00', pickupStart: '12:30', pickupEnd: '14:30', deliveryStart: '12:30', deliveryEnd: '14:30' },
            snacks: { active: false, start: '16:00', end: '18:00', pickupStart: '17:00', pickupEnd: '19:00', deliveryStart: '17:00', deliveryEnd: '19:00' },
            dinner: { active: false, start: '16:00', end: '20:00', pickupStart: '19:30', pickupEnd: '21:30', deliveryStart: '19:30', deliveryEnd: '21:30' }
        };

        if (kitchenType === 'DABBA') {
            mealTypes = [
                { id: 'lunch', label: 'Lunch', mode: 'FIXED', startTime: '22:00', endTime: '14:00', allowCustomization: true },
                { id: 'dinner', label: 'Dinner', mode: 'FIXED', startTime: '16:00', endTime: '20:00', allowCustomization: true }
            ];
            mealSlots = {
                lunch: SLOT_DEFAULTS.lunch,
                dinner: SLOT_DEFAULTS.dinner
            };
        } else {
            mealTypes = [
                { id: 'breakfast', label: 'Breakfast', mode: 'MENU', startTime: '22:00', endTime: '07:00' },
                { id: 'lunch', label: 'Lunch', mode: 'MENU', startTime: '22:00', endTime: '14:00' },
                { id: 'snacks', label: 'Snacks', mode: 'MENU', startTime: '16:00', endTime: '18:00' }
            ];
            mealSlots = {
                breakfast: SLOT_DEFAULTS.breakfast,
                lunch: SLOT_DEFAULTS.lunch,
                snacks: SLOT_DEFAULTS.snacks
            };
        }

        const newKitchen = {
            ownerId,
            joinCode,
            status: 'active',
            createdAt: serverTimestamp(),
            mealTypes,
            mealSlots,
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
            serviceMode: 'DELIVERY', // Default
            maxDueLimit: 300, // Default limit
            servicePincodes: calculateServicePincodes(rest.address?.pinCode),
            ...rest
        };

        const docRef = await addDoc(collection(db, 'kitchens'), newKitchen);


        // Update owner's profile: set activeKitchenId and track setup status
        await updateDoc(doc(db, 'users', ownerId), {
            activeKitchenId: docRef.id,
            adminSetupCompleted: false,
            updatedAt: serverTimestamp()
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

        // 2. Create/Check Membership
        const membershipId = `${userId}_${kitchenId}`;
        const membershipRef = doc(db, 'memberships', membershipId);
        const membershipSnap = await getDoc(membershipRef);

        if (!membershipSnap.exists()) {
            await setDoc(membershipRef, {
                studentId: userId,
                kitchenId: kitchenId,
                joinedAt: serverTimestamp(),
                status: "active"
            });
        }

        // 3. Update user's activeKitchenId and legacy joinedKitchens (optional but good for backwards compatibility)
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            activeKitchenId: kitchenId,
            joinedKitchens: arrayUnion(kitchenId) // Keep for legacy if needed, but we'll use memberships now
        });

        return { success: true, kitchenId };
    } catch (error) {
        console.error("Error joining kitchen:", error);
        return { error: error.message };
    }
};

export const switchKitchen = async (userId, kitchenId) => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { activeKitchenId: kitchenId });
        return { success: true };
    } catch (error) {
        console.error("Error switching kitchen:", error);
        return { error: error.message };
    }
};

export const getAllKitchens = async (filter = '', locationFilter = null) => {
    try {
        const kitchensRef = collection(db, 'kitchens');
        let q = query(kitchensRef, where('status', '==', 'active'));

        const querySnapshot = await getDocs(q);
        let kitchens = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Smart Location Filtering (Same City + Pincode +/- 1)
        if (locationFilter) {
            kitchens = kitchens.filter(k => {
                const sameCity = k.address?.city?.toLowerCase() === locationFilter.city?.toLowerCase();
                const studentPin = locationFilter.pincode;
                // Check if student pin is in kitchen's service area
                const inRange = k.servicePincodes?.includes(studentPin) || k.address?.pinCode === studentPin;
                return sameCity && inRange;
            });
        }

        if (filter) {
            const lowerFilter = filter.toLowerCase();
            kitchens = kitchens.filter(k =>
                (k.name && k.name.toLowerCase().includes(lowerFilter)) ||
                (k.address?.city && k.address.city.toLowerCase().includes(lowerFilter)) ||
                (k.address?.pinCode && k.address.pinCode.includes(lowerFilter)) ||
                (k.address?.line1 && k.address.line1.toLowerCase().includes(lowerFilter)) ||
                (k.address?.building && k.address.building.toLowerCase().includes(lowerFilter)) ||
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

        // Recalculate service area if pincode changes
        if (updates.address?.pinCode) {
            updates.servicePincodes = calculateServicePincodes(updates.address.pinCode);
        }

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
                holiday: data.holiday || { active: false, from: '', to: '', reason: '' },
                mealSlots: data.mealSlots || {},
                maxDueLimit: data.maxDueLimit || 300
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
