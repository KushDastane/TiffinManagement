import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    getDoc,
    orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getTodayKey } from './menuService';

/**
 * Listens to various admin stats for the dashboard.
 * @param {string} kitchenId 
 * @param {string} slot - "lunch" | "dinner"
 * @param {function} callback 
 */
export const listenToAdminStats = (kitchenId, slot, callback) => {
    const today = getTodayKey();

    // Stats to track
    let stats = {
        pendingOrders: 0,
        totalOrders: 0,
        pendingPayments: 0,
        studentsToday: 0
    };

    const ordersQuery = query(
        collection(db, 'kitchens', kitchenId, 'orders'),
        where('dateId', '==', today)
    );

    const paymentsQuery = query(
        collection(db, 'kitchens', kitchenId, 'payments'),
        where('status', '==', 'pending')
    );

    // Composite listener (simplified)
    const unsubOrders = onSnapshot(ordersQuery, (snap) => {
        const orders = snap.docs.map(d => d.data());

        // Filter by slot if provided
        const filtered = slot ? orders.filter(o => o.slot === slot) : orders;

        stats.totalOrders = filtered.length;
        stats.pendingOrders = filtered.filter(o => o.status === 'PENDING').length;

        // Unique students (userId)
        const students = new Set(filtered.map(o => o.userId));
        stats.studentsToday = students.size;

        callback({ ...stats });
    }, (error) => {
        console.error("listenToAdminStats orders error:", error);
    });

    const unsubPayments = onSnapshot(paymentsQuery, (snap) => {
        stats.pendingPayments = snap.size;
        callback({ ...stats });
    }, (error) => {
        console.error("listenToAdminStats payments error:", error);
    });

    return () => {
        unsubOrders();
        unsubPayments();
    };
};

/**
 * Gets a cooking summary breakdown.
 */
export const getCookingSummary = (orders, menuSlotData) => {
    if (!orders || orders.length === 0) return null;

    // Only count confirmed orders for cooking
    const confirmedOrders = orders.filter(o => o.status === 'CONFIRMED');
    if (confirmedOrders.length === 0) return null;

    const summary = {
        halfDabba: 0,
        fullDabba: 0,
        other: 0,
        breakdown: {},
        extrasBreakdown: {}
    };

    confirmedOrders.forEach(o => {
        // Based on variant/type
        if (o.type === 'ROTI_SABZI') {
            if (o.mainItem?.includes('Half')) summary.halfDabba += o.quantity || 1;
            else if (o.mainItem?.includes('Full')) summary.fullDabba += o.quantity || 1;
            else summary.fullDabba += o.quantity || 1;
        } else {
            const itemName = o.mainItem || (o.slot?.charAt(0).toUpperCase() + o.slot?.slice(1)) || 'Other';
            summary.breakdown[itemName] = (summary.breakdown[itemName] || 0) + (o.quantity || 1);
            summary.other += o.quantity || 1;
        }

        // Detailed Extras Breakdown
        if (o.componentsSnapshot) {
            o.componentsSnapshot.forEach(c => {
                const qty = Number(c.quantity) || 0;
                if (qty > 0) {
                    summary.extrasBreakdown[c.name] = (summary.extrasBreakdown[c.name] || 0) + qty;
                }
            });
        }
    });

    return summary;
};
