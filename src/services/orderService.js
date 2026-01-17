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

export const placeOrder = async (kitchenId, orderData) => {
    try {
        const ordersRef = collection(db, 'kitchens', kitchenId, 'orders');
        await addDoc(ordersRef, {
            ...orderData,
            status: 'placed',
            createdAt: serverTimestamp(),
            // Store date string for easy filtering
            dateId: new Date().toISOString().split('T')[0]
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
