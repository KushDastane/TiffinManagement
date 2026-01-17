import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    onSnapshot,
    orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Places a detailed order.
 * orderData: {
 *   userId, userDisplayName,
 *   slot: "lunch" | "dinner",
 *   type: "ROTI_SABZI" | "OTHER",
 *   variant: "half" | "full" (if Roti-Sabzi),
 *   mainItem: String ("Gobi" or "Misal"),
 *   addons: Array,
 *   extras: Array of objects {name, quantity, price},
 *   quantity: Number (Main item qty),
 *   totalAmount: Number
 * }
 */
export const placeOrder = async (kitchenId, orderData) => {
    try {
        const ordersRef = collection(db, 'kitchens', kitchenId, 'orders');
        const dateId = new Date().toISOString().split('T')[0];

        await addDoc(ordersRef, {
            ...orderData,
            dateId,
            status: 'placed',
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

export const subscribeToMyOrders = (kitchenId, userId, callback) => {
    const ordersRef = collection(db, 'kitchens', kitchenId, 'orders');
    let q = query(ordersRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(orders);
    }, (error) => {
        console.error("Error fetching my orders:", error);
        callback([]);
    });
};
