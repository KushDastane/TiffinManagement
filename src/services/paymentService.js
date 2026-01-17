import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    getDocs,
    onSnapshot,
    orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Fetch all students joined to this kitchen
export const getKitchenStudents = async (kitchenId) => {
    try {
        const q = query(collection(db, 'users'), where('joinedKitchens', 'array-contains', kitchenId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching students:", error);
        return [];
    }
};

export const recordPayment = async (kitchenId, userId, amount, note = '') => {
    try {
        await addDoc(collection(db, 'kitchens', kitchenId, 'payments'), {
            userId,
            amount: parseFloat(amount),
            type: 'credit', // Credit means student paid money
            note,
            createdAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error recording payment:", error);
        return { error: error.message };
    }
};

// Calculate balance: Total Orders cost - Total Payments
export const subscribeToStudentLedger = (kitchenId, userId, callback) => {
    const ordersQuery = query(
        collection(db, 'kitchens', kitchenId, 'orders'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
    );

    const paymentsQuery = query(
        collection(db, 'kitchens', kitchenId, 'payments'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
    );

    // Combine both streams? Or just fetch once for MVP?
    // Real-time calculation is complex with two streams. 
    // Let's do a simplified approach: Listen to both collection changes?
    // OR just one big callback after fetching both.

    // Better simpler approach for MVP:
    // Just fetch all data initially or on refresh. 
    // But "Multi-tenant" usually implies real-time data.

    // Let's rely on callback firing when we get fresh data.
    // For now, let's just export simple getters and handle composition in UI or a hook.
    // Actually, let's make a function that fetches both and computes.
};

export const getStudentBalance = async (kitchenId, userId) => {
    try {
        // 1. Get Orders (Debits)
        const ordersRef = collection(db, 'kitchens', kitchenId, 'orders');
        const qOrders = query(ordersRef, where('userId', '==', userId));
        const ordersSnap = await getDocs(qOrders);
        const totalDebits = ordersSnap.docs.reduce((sum, doc) => sum + (doc.data().price || 0), 0);

        // 2. Get Payments (Credits)
        const paymentsRef = collection(db, 'kitchens', kitchenId, 'payments');
        const qPayments = query(paymentsRef, where('userId', '==', userId));
        const paymentsSnap = await getDocs(qPayments);
        const totalCredits = paymentsSnap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

        return {
            balance: totalDebits - totalCredits, // Positive means Student OWES money
            totalOrders: totalDebits,
            totalPaid: totalCredits,
            orders: ordersSnap.docs.map(d => ({ ...d.data(), id: d.id, type: 'order' })),
            payments: paymentsSnap.docs.map(d => ({ ...d.data(), id: d.id, type: 'payment' }))
        };
    } catch (error) {
        console.error("Error getting balance:", error);
        return { balance: 0, error: error.message };
    }
};
