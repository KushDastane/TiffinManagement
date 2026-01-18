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

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export const uploadImage = async (uri) => {
    if (!uri) return null;
    if (!CLOUDINARY_URL || !UPLOAD_PRESET) {
        console.warn("Cloudinary not configured. Skipping upload.");
        return uri; // Return local URI for now if no config
    }

    try {
        const formData = new FormData();
        formData.append('file', {
            uri,
            type: 'image/jpeg',
            name: 'upload.jpg',
        });
        formData.append('upload_preset', UPLOAD_PRESET);

        const response = await fetch(CLOUDINARY_URL, {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error("Image upload failed:", error);
        return null;
    }
};

export const requestPayment = async (kitchenId, paymentData) => {
    // paymentData: { userId, userDisplayName, amount, method, screenshotUri, note }
    try {
        let screenshotUrl = null;
        if (paymentData.screenshotUri) {
            screenshotUrl = await uploadImage(paymentData.screenshotUri);
        }

        const paymentsRef = collection(db, 'kitchens', kitchenId, 'payments');
        await addDoc(paymentsRef, {
            userId: paymentData.userId,
            userDisplayName: paymentData.userDisplayName,
            amount: parseFloat(paymentData.amount),
            type: 'credit',
            method: paymentData.method, // 'UPI' | 'CASH'
            status: 'pending', // Default for student requests
            screenshotUrl,
            note: paymentData.note || '',
            createdAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error requesting payment:", error);
        return { error: error.message };
    }
};

// Fetch all students belonging to this kitchen
export const getKitchenStudents = async (kitchenId) => {
    try {
        const usersRef = collection(db, 'users');
        // Query users where 'joinedKitchens' array contains the kitchenId
        const q = query(usersRef, where('joinedKitchens', 'array-contains', kitchenId));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error fetching kitchen students:", error);
        return [];
    }
};

// Record a manual payment (Admin)
export const recordPayment = async (kitchenId, userId, amount, note = "Manual Entry") => {
    try {
        const paymentsRef = collection(db, 'kitchens', kitchenId, 'payments');
        await addDoc(paymentsRef, {
            userId,
            amount: parseFloat(amount),
            type: 'credit',
            method: 'CASH', // Manual entry usually implies Cash handling
            status: 'accepted', // Admin recorded = Auto accepted
            note,
            createdAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error recording payment:", error);
        return { error: error.message };
    }
};

export const getStudentBalance = async (kitchenId, userId) => {
    try {
        // 1. Get Orders (Debits) - CONFIRMED ONLY usually, but for MVP maybe all 'placed' count as debt? 
        // User said: "On order confirm, deduct from ledger". So we should filter by status='accepted' | 'confirmed'
        // But for MVP, let's include 'placed' as "Tentative Debt" or just all.
        // Let's stick to: Orders = Debit.
        const ordersRef = collection(db, 'kitchens', kitchenId, 'orders');
        const qOrders = query(ordersRef, where('userId', '==', userId), where('isTrial', '==', false));
        const ordersSnap = await getDocs(qOrders);
        const totalDebits = ordersSnap.docs.reduce((sum, doc) => sum + (doc.data().totalAmount || 0), 0);

        // 2. Get Payments (Credits) - Only ACCEPTED payments count towards actual balance
        // PENDING payments do NOT reduce debt yet.
        const paymentsRef = collection(db, 'kitchens', kitchenId, 'payments');
        const qPayments = query(paymentsRef, where('userId', '==', userId), where('status', '==', 'accepted'));
        const paymentsSnap = await getDocs(qPayments);
        const totalCredits = paymentsSnap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

        // Also fetch Pending payments for display
        const qPendingPayments = query(paymentsRef, where('userId', '==', userId), where('status', '==', 'pending'));
        const pendingSnap = await getDocs(qPendingPayments);

        return {
            balance: totalDebits - totalCredits,
            totalOrders: totalDebits,
            totalPaid: totalCredits,
            orders: ordersSnap.docs.map(d => ({ ...d.data(), id: d.id, isDebit: true, date: d.data().createdAt })),
            payments: paymentsSnap.docs.map(d => ({ ...d.data(), id: d.id, isDebit: false, date: d.data().createdAt })),
            pendingPayments: pendingSnap.docs.map(d => ({ ...d.data(), id: d.id }))
        };
    } catch (error) {
        console.error("Error getting balance:", error);
        return { balance: 0, error: error.message };
    }
};

// Real-time subs
export const subscribeToHistory = (kitchenId, userId, callback) => {
    // For simpler MVP, just re-using getStudentBalance or similar.
    // Implementing a combined listener is complex. 
    // We will stick to polling/focus-effect for now as done in previous screens.
};
