import {
    collection,
    addDoc,
    doc,
    updateDoc,
    serverTimestamp,
    query,
    where,
    onSnapshot,
    orderBy,
    getDocs,
    arrayUnion,
    limit
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getKitchenConfig } from './kitchenService';
import { getStudentBalance } from './paymentService';

// Helper to normalize phone numbers (standardize to last 10 digits for Indian numbers)
export const normalizePhone = (phone) => {
    if (!phone) return null;
    let clean = phone.toString().replace(/\D/g, '');
    if (clean.length > 10) {
        clean = clean.slice(-10);
    }
    return clean;
};


/**
 * Places a detailed order.
 * orderData: {
 *   userId, userDisplayName,
 *   slot: "lunch" | "dinner",
 *   type: "ROTI_SABZI" | "OTHER",
 *   mainItem: String ("Gobi" or "Misal"),
 *   variantSnapshot: { id, label, basePrice, quantities: { roti } },
 *   componentsSnapshot: Array of { id, name, price, quantity, isDailySpecial },
 *   quantity: Number (Main item qty),
 *   totalAmount: Number
 * }
 */
export const placeOrder = async (kitchenId, orderData) => {
    try {
        if (!kitchenId) throw new Error("kitchenId is mandatory for all orders");

        // Safety Due Limit Check for non-manual orders
        if (!orderData.isManual) {
            const config = await getKitchenConfig(kitchenId);
            const { balance } = await getStudentBalance(kitchenId, orderData.userId, orderData.phoneNumber);
            const maxDue = config?.maxDueLimit || 300;
            const total = orderData.totalAmount || 0;

            if (balance - total < -maxDue) {
                return { error: `Order restricted. Due limit of ₹${maxDue} exceeded.` };
            }
        }

        const ordersRef = collection(db, 'kitchens', kitchenId, 'orders');
        const dateId = new Date().toISOString().split('T')[0];

        await addDoc(ordersRef, {
            ...orderData,
            phoneNumber: normalizePhone(orderData.phoneNumber),
            kitchenId,
            dateId,
            status: orderData.status || 'PENDING',
            isTrial: orderData.isTrial || false,
            paymentStatus: orderData.paymentStatus || 'pending',
            paymentMethod: orderData.paymentMethod || 'wallet', // Default to wallet for regular students
            paymentProofUrl: orderData.paymentProofUrl || null,
            createdAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error placing order:", error);
        return { error: error.message };
    }
};

export const subscribeToOrders = (kitchenId, dateId, callback) => {
    const ordersRef = collection(db, 'kitchens', kitchenId, 'orders');
    // Filter by date if provided
    let q = query(ordersRef, where('dateId', '==', dateId), orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(orders);
    }, (error) => {
        console.error("Error fetching orders:", error);
        callback([]);
    });
};

export const subscribeToMyOrders = (kitchenId, userId, phoneNumber, callback) => {
    const ordersRef = collection(db, 'kitchens', kitchenId, 'orders');
    const normalized = normalizePhone(phoneNumber);

    let ordersById = [];
    let ordersByPhone = [];

    const mergeAndEmit = () => {
        const combined = [...ordersById];
        ordersByPhone.forEach(o => {
            if (!combined.find(prev => prev.id === o.id)) {
                combined.push(o);
            }
        });
        combined.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        callback(combined);
    };

    const unsubId = onSnapshot(
        query(ordersRef, where('userId', '==', userId), orderBy('createdAt', 'desc')),
        (snapshot) => {
            ordersById = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            mergeAndEmit();
        },
        (error) => {
            console.error("Error fetching my orders by ID:", error);
            mergeAndEmit();
        }
    );

    let unsubPhone = () => { };
    if (normalized) {
        const phoneFormats = [normalized, `+91${normalized}`];
        unsubPhone = onSnapshot(
            query(ordersRef, where('phoneNumber', 'in', phoneFormats)),
            (snapshot) => {
                ordersByPhone = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                mergeAndEmit();
            },
            (error) => {
                console.error("Error fetching my orders by Phone:", error);
                mergeAndEmit();
            }
        );
    }

    return () => {
        unsubId();
        unsubPhone();
    };
};
export const updateOrder = async (kitchenId, orderId, updates) => {
    try {
        const orderRef = doc(db, 'kitchens', kitchenId, 'orders', orderId);
        await updateDoc(orderRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error updating order:", error);
        return { error: error.message };
    }
};
export const placeManualOrder = async (kitchenId, orderData, adminId) => {
    try {
        if (!kitchenId) throw new Error("kitchenId is mandatory");

        const { phoneNumber, name, ...rest } = orderData;
        const normalizedPhone = normalizePhone(phoneNumber);

        // 1. Find or Create User by Phone
        const usersRef = collection(db, 'users');
        // We need to find by normalized phone. 
        // Note: The users collection should also be updated/queried carefully.
        const q = query(usersRef, where('phoneNumber', 'in', [normalizedPhone, `+91${normalizedPhone}`]));
        const userSnap = await getDocs(q);

        let userId;
        let displayName = name || 'Unnamed Customer';

        if (userSnap.empty) {
            // Create a basic "Hidden" account
            const newUserDoc = await addDoc(usersRef, {
                phoneNumber: normalizedPhone,
                name: displayName,
                role: 'student',
                isBasic: true, // Marker for manual-entry accounts
                joinedKitchens: [kitchenId],
                activeKitchenId: kitchenId,
                createdAt: serverTimestamp()
            });
            userId = newUserDoc.id;
        } else {
            // Prioritize non-basic account
            const allMatches = userSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const bestMatch = allMatches.find(u => !u.isBasic) || allMatches[0];

            userId = bestMatch.id;
            displayName = bestMatch.name || displayName;

            // Ensure this kitchen is in their list
            if (!(bestMatch.joinedKitchens || []).includes(kitchenId)) {
                await updateDoc(doc(db, 'users', userId), {
                    joinedKitchens: arrayUnion(kitchenId)
                });
            }
        }

        // 2. Place Order
        const ordersRef = collection(db, 'kitchens', kitchenId, 'orders');
        const dateId = new Date().toISOString().split('T')[0];

        await addDoc(ordersRef, {
            ...rest,
            userId,
            userDisplayName: displayName,
            phoneNumber: normalizePhone(phoneNumber),
            kitchenId,
            dateId,
            status: 'CONFIRMED', // Manual orders are usually confirmed immediately
            isTrial: false, // Manual entries are not trials
            paymentStatus: rest.paymentStatus || 'due',
            paymentMethod: rest.paymentMethod || 'CASH',
            recordedBy: adminId,
            isManual: true,
            createdAt: serverTimestamp()
        });

        return { success: true, userId };
    } catch (error) {
        console.error("Error placing manual order:", error);
        return { error: error.message };
    }
};

export const getLastOrderForUser = async (kitchenId, userId) => {
    try {
        const ordersRef = collection(db, 'kitchens', kitchenId, 'orders');
        const q = query(
            ordersRef,
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(1)
        );
        const snap = await getDocs(q);
        if (snap.empty) return null;
        return snap.docs[0].data();
    } catch (error) {
        console.error("Error getting last order:", error);
        return null;
    }
};

export const placeStudentOrder = async (kitchenId, orderData) => {
    const { studentId, phoneNumber, mealType, items } = orderData;

    // Map simplified structure to our existing placeOrder schema
    const legacyPayload = {
        userId: studentId,
        phoneNumber: phoneNumber,
        slot: mealType.toLowerCase(),
        isPriority: orderData.isPriority || false,
        type: items.itemType || 'ROTI_SABZI',
        mainItem: items.item,
        quantity: items.quantity,
        totalAmount: items.totalAmount || 0,
        componentsSnapshot: Object.entries(items.extras || {}).filter(([_, q]) => q > 0).map(([name, quantity]) => ({
            name,
            quantity,
            price: 0,
            isDailySpecial: true
        }))
    };

    return placeOrder(kitchenId, legacyPayload);
};
