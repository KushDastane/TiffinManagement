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

// Helper to normalize phone numbers (standardize to last 10 digits for Indian numbers)
export const normalizePhone = (phone) => {
    if (!phone) return null;
    let clean = phone.toString().replace(/\D/g, '');
    // Ensure we handle cases where users might input +91 or 0 prefix
    if (clean.length > 10) {
        clean = clean.slice(-10);
    }
    return clean;
};


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
            phoneNumber: normalizePhone(paymentData.phoneNumber),
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
export const recordPayment = async (kitchenId, userId, phoneNumber, amount, adminId, note = "Manual Entry") => {
    try {
        const paymentsRef = collection(db, 'kitchens', kitchenId, 'payments');
        await addDoc(paymentsRef, {
            userId,
            phoneNumber: normalizePhone(phoneNumber),
            amount: parseFloat(amount),
            type: 'credit',
            method: 'CASH', // Manual entry usually implies Cash handling
            status: 'accepted', // Admin recorded = Auto accepted
            note,
            recordedBy: adminId,
            timestamp: serverTimestamp(),
            createdAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error recording payment:", error);
        return { error: error.message };
    }
};

export const getStudentBalance = async (kitchenId, userId, phoneNumber) => {
    try {
        // 1. Get Orders (Debits) - SCOPED TO KITCHEN
        const ordersRef = collection(db, 'kitchens', kitchenId, 'orders');

        let ordersList = [];

        // Query by userId
        const qOrdersById = query(ordersRef, where('userId', '==', userId));
        const idOrdersSnap = await getDocs(qOrdersById);
        idOrdersSnap.docs.forEach(d => ordersList.push({ ...d.data(), id: d.id }));

        // Query by phoneNumber if available
        const normalized = normalizePhone(phoneNumber);
        if (normalized) {
            const phoneFormats = [normalized, `+91${normalized}`];
            const qOrdersByPhone = query(ordersRef, where('phoneNumber', 'in', phoneFormats));
            const phoneOrdersSnap = await getDocs(qOrdersByPhone);
            phoneOrdersSnap.docs.forEach(d => {
                if (!ordersList.find(o => o.id === d.id)) {
                    ordersList.push({ ...d.data(), id: d.id });
                }
            });
        }

        const totalDebits = ordersList.reduce((sum, data) => {
            const isNoTrial = data.isTrial !== true;
            const isDebtStatus = ['CONFIRMED', 'COMPLETED', 'DELIVERED'].includes(data.status) || data.isManual;

            if (isNoTrial && isDebtStatus) {
                return sum + (data.totalAmount || 0);
            }
            return sum;
        }, 0);

        // 2. Get Payments (Credits) - SCOPED TO KITCHEN
        const paymentsRef = collection(db, 'kitchens', kitchenId, 'payments');
        let paymentsList = [];

        // Query by userId
        const qPaymentsById = query(paymentsRef, where('userId', '==', userId));
        const idPaymentsSnap = await getDocs(qPaymentsById);
        idPaymentsSnap.docs.forEach(d => paymentsList.push({ ...d.data(), id: d.id }));

        // Query by phoneNumber
        const normalizedPhone = normalizePhone(phoneNumber);
        if (normalizedPhone) {
            const phoneFormats = [normalizedPhone, `+91${normalizedPhone}`];
            const qPaymentsByPhone = query(paymentsRef, where('phoneNumber', 'in', phoneFormats));
            const phonePaymentsSnap = await getDocs(qPaymentsByPhone);
            phonePaymentsSnap.docs.forEach(d => {
                if (!paymentsList.find(p => p.id === d.id)) {
                    paymentsList.push({ ...d.data(), id: d.id });
                }
            });
        }

        const acceptedPayments = paymentsList.filter(p => p.status === 'accepted');
        const totalCredits = acceptedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const pendingPayments = paymentsList.filter(p => p.status === 'pending');

        return {
            balance: totalCredits - totalDebits,
            totalOrders: totalDebits,
            totalPaid: totalCredits,
            orders: ordersList
                .filter(data => (data.isTrial !== true) && (['CONFIRMED', 'COMPLETED', 'DELIVERED'].includes(data.status) || data.isManual))
                .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                .map(d => ({ ...d, isDebit: true, date: d.createdAt })),
            payments: acceptedPayments
                .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                .map(d => ({ ...d, isDebit: false, date: d.createdAt })),
            pendingPayments: pendingPayments
        };
    } catch (error) {
        console.error("Error getting balance:", error);
        return { balance: 0, error: error.message };
    }
};

export const getKitchenOutstandingSummary = async (kitchenId) => {
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('joinedKitchens', 'array-contains', kitchenId));
        const studentsSnap = await getDocs(q);

        let summary = [];
        let totalKitchenOutstanding = 0;
        const processedPhones = new Set();

        for (const studentDoc of studentsSnap.docs) {
            const userId = studentDoc.id;
            const userData = studentDoc.data();
            const normalized = normalizePhone(userData.phoneNumber);

            if (normalized && processedPhones.has(normalized)) continue;
            if (normalized) processedPhones.add(normalized);

            const { balance } = await getStudentBalance(kitchenId, userId, userData.phoneNumber);

            if (balance < 0) {
                const outstanding = Math.abs(balance);
                summary.push({
                    userId,
                    name: userData.name || 'Unnamed Student',
                    phoneNumber: userData.phoneNumber,
                    outstanding
                });
                totalKitchenOutstanding += outstanding;
            }
        }

        return {
            students: summary.sort((a, b) => b.outstanding - a.outstanding),
            totalKitchenOutstanding
        };
    } catch (error) {
        console.error("Error getting kitchen outstanding summary:", error);
        return { students: [], totalKitchenOutstanding: 0 };
    }
};

// Real-time subs
export const subscribeToMyPayments = (kitchenId, userId, phoneNumber, callback) => {
    const paymentsRef = collection(db, 'kitchens', kitchenId, 'payments');
    const normalized = normalizePhone(phoneNumber);

    let paymentsById = [];
    let paymentsByPhone = [];

    const mergeAndEmit = () => {
        const combined = [...paymentsById];
        paymentsByPhone.forEach(p => {
            if (!combined.find(prev => prev.id === p.id)) {
                combined.push(p);
            }
        });
        combined.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        callback(combined);
    };

    const unsubId = onSnapshot(
        query(paymentsRef, where('userId', '==', userId), orderBy('createdAt', 'desc')),
        (snapshot) => {
            paymentsById = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            mergeAndEmit();
        },
        (error) => {
            console.error("Error fetching my payments by ID:", error);
            mergeAndEmit();
        }
    );

    let unsubPhone = () => { };
    if (normalized) {
        const phoneFormats = [normalized, `+91${normalized}`];
        unsubPhone = onSnapshot(
            query(paymentsRef, where('phoneNumber', 'in', phoneFormats)),
            (snapshot) => {
                paymentsByPhone = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                mergeAndEmit();
            },
            (error) => {
                console.error("Error fetching my payments by Phone:", error);
                mergeAndEmit();
            }
        );
    }

    return () => {
        unsubId();
        unsubPhone();
    };
};
