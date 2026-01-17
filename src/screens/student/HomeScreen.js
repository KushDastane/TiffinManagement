import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { getMenuDateId, subscribeToMenu } from '../../services/menuService';
import { placeOrder, subscribeToMyOrders } from '../../services/orderService';
import { getStudentBalance } from '../../services/paymentService'; // Import ledger service

const WeekSummary = ({ orders }) => {
    // Generate last 7 days including today
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d);
    }

    const hasOrder = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        return orders.some(o => o.dateId === dateStr);
    };

    return (
        <View className="flex-row justify-between bg-white p-4 rounded-xl mb-4 border border-gray-100 shadow-sm">
            {days.map((date, index) => {
                const ordered = hasOrder(date);
                const isToday = index === 6;
                return (
                    <View key={index} className="items-center">
                        <Text className="text-xs text-gray-400 mb-1">{date.getDate()}</Text>
                        <View className={`w-8 h-8 rounded-full items-center justify-center ${ordered ? 'bg-green-500' : 'bg-gray-100'} ${isToday ? 'border-2 border-yellow-400' : ''}`}>
                            <Text className={`font-bold ${ordered ? 'text-white' : 'text-gray-300'}`}>
                                {date.toLocaleDateString('en-US', { weekday: 'narrow' })}
                            </Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );
};

const WalletCard = ({ balance, loading }) => (
    <View className="bg-gray-900 p-6 rounded-2xl mb-6 shadow-md">
        <Text className="text-gray-400 font-medium mb-1">Your Wallet Balance</Text>
        {loading ? (
            <ActivityIndicator color="white" />
        ) : (
            <View className="flex-row items-end">
                <Text className={`text-4xl font-bold ${balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {balance > 0 ? '-' : ''}₹{Math.abs(balance)}
                </Text>
                <Text className="text-gray-500 mb-2 ml-2 font-medium">
                    {balance > 0 ? 'Due' : 'Advance'}
                </Text>
            </View>
        )}
        <TouchableOpacity className="bg-gray-800 mt-4 py-3 rounded-lg items-center border border-gray-700">
            <Text className="text-gray-300 font-bold">+ Add Money (Upload Slip)</Text>
        </TouchableOpacity>
    </View>
);

// ... SlotCard Component (Same as before) ...
const SlotCard = ({ slotName, slotData, onOrder }) => {
    const [variant, setVariant] = useState('full');
    const [extras, setExtras] = useState({});
    const isActive = slotData.status === 'SET';

    // Time Check Logic (Same as before)
    const now = new Date();
    const currentHour = now.getHours();
    const isLunch = slotName === 'Lunch';
    const isTimeValid = isLunch ? currentHour < 14 : currentHour < 22; // Extended slightly for testing
    const canOrder = isActive && isTimeValid;

    if (!isActive) return null;

    const { type, rotiSabzi, other, extras: menuExtras } = slotData;

    const calculateTotal = () => {
        let total = 0;
        if (type === 'ROTI_SABZI') {
            total += variant === 'half' ? Number(rotiSabzi.halfPrice) : Number(rotiSabzi.fullPrice);
        } else {
            total += Number(other.price);
        }

        if (menuExtras) {
            menuExtras.forEach(e => {
                const qty = extras[e.name] || 0;
                total += qty * Number(e.price);
            });
        }
        return total;
    };

    const handlePlaceOrder = () => {
        const orderPayload = {
            slot: isLunch ? 'lunch' : 'dinner',
            type,
            variant: type === 'ROTI_SABZI' ? variant : null,
            mainItem: type === 'ROTI_SABZI' ? rotiSabzi.sabzi : other.itemName,
            addons: type === 'ROTI_SABZI' && variant === 'full' ? rotiSabzi.addons : [],
            extras: menuExtras ? menuExtras.filter(e => extras[e.name] > 0).map(e => ({
                name: e.name,
                price: e.price,
                quantity: extras[e.name]
            })) : [],
            quantity: 1,
            totalAmount: calculateTotal()
        };
        onOrder(orderPayload);
    };

    const updateExtraQty = (name, delta) => {
        const current = extras[name] || 0;
        const next = Math.max(0, current + delta);
        setExtras({ ...extras, [name]: next });
    };

    return (
        <View className="bg-white p-4 rounded-xl mb-6 border border-gray-100 shadow-sm">
            <View className="flex-row justify-between mb-4">
                <Text className="text-xl font-bold text-gray-800">{slotName}</Text>
                {!isTimeValid && <Text className="text-red-500 font-bold">Closed</Text>}
            </View>

            {type === 'ROTI_SABZI' ? (
                <View>
                    <Text className="text-lg font-bold text-yellow-700 mb-2">{rotiSabzi.sabzi}</Text>
                    <View className="flex-row mb-4 bg-gray-50 p-1 rounded-lg">
                        <TouchableOpacity
                            className={`flex-1 p-3 rounded-md items-center ${variant === 'half' ? 'bg-white shadow-sm border border-gray-200' : ''}`}
                            onPress={() => setVariant('half')}
                        >
                            <Text className="font-bold">Half</Text>
                            <Text className="text-gray-500">₹{rotiSabzi.halfPrice}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`flex-1 p-3 rounded-md items-center ${variant === 'full' ? 'bg-white shadow-sm border border-gray-200' : ''}`}
                            onPress={() => setVariant('full')}
                        >
                            <Text className="font-bold">Full</Text>
                            <Text className="text-gray-500">₹{rotiSabzi.fullPrice}</Text>
                        </TouchableOpacity>
                    </View>
                    <Text className="text-gray-500 text-sm mb-2">Includes: 4 Roti, Sabzi{variant === 'full' ? ', ' + (rotiSabzi.addons || []).join(', ') : ''}</Text>
                </View>
            ) : (
                <View className="mb-4">
                    <View className="flex-row justify-between">
                        <Text className="text-lg font-bold text-gray-800">{other.itemName}</Text>
                        <Text className="text-lg font-bold text-yellow-600">₹{other.price}</Text>
                    </View>
                </View>
            )}

            {menuExtras && menuExtras.length > 0 && (
                <View className="mt-2 border-t border-gray-100 pt-3">
                    <Text className="font-bold text-gray-600 mb-2">Add Extras</Text>
                    {menuExtras.map((extra, idx) => (
                        <View key={idx} className="flex-row justify-between items-center mb-3">
                            <View>
                                <Text className="font-medium">{extra.name}</Text>
                                <Text className="text-gray-400 text-xs">₹{extra.price}</Text>
                            </View>
                            <View className="flex-row items-center bg-gray-100 rounded-lg">
                                <TouchableOpacity onPress={() => updateExtraQty(extra.name, -1)} className="px-3 py-1">
                                    <Text className="text-xl font-bold text-gray-600">-</Text>
                                </TouchableOpacity>
                                <Text className="font-bold px-2">{extras[extra.name] || 0}</Text>
                                <TouchableOpacity onPress={() => updateExtraQty(extra.name, 1)} className="px-3 py-1">
                                    <Text className="text-xl font-bold text-gray-600">+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            <View className="mt-4 border-t border-dashed border-gray-300 pt-4">
                <View className="flex-row justify-between items-end mb-4">
                    <Text className="text-gray-500">Total Amount</Text>
                    <Text className="text-2xl font-bold text-gray-800">₹{calculateTotal()}</Text>
                </View>

                <TouchableOpacity
                    className={`w-full bg-yellow-400 rounded-lg p-4 items-center ${!canOrder ? 'opacity-50 bg-gray-300' : ''}`}
                    onPress={handlePlaceOrder}
                    disabled={!canOrder}
                >
                    <Text className="text-black font-bold text-lg">
                        {canOrder ? "Place Order" : "Ordering Closed"}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export const HomeScreen = () => {
    const { user, userProfile } = useAuth();
    const { tenant } = useTenant();
    const [menu, setMenu] = useState(null);
    const [balance, setBalance] = useState(0);
    const [myOrders, setMyOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const today = new Date();

    const fetchData = async () => {
        if (!tenant?.id || !user?.uid) return;

        // Fetch Balance
        const ledger = await getStudentBalance(tenant.id, user.uid);
        setBalance(ledger.balance);
    };

    useEffect(() => {
        if (!tenant?.id) return;

        // Subscribe to Menu
        const unsubMenu = subscribeToMenu(tenant.id, today, (data) => setMenu(data));

        // Subscribe to Orders (for Weekly Summary)
        const unsubOrders = subscribeToMyOrders(tenant.id, user.uid, (data) => setMyOrders(data));

        fetchData();

        return () => {
            unsubMenu();
            unsubOrders();
        };
    }, [tenant?.id, user?.uid]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const handleConfirmOrder = async (orderPayload) => {
        Alert.alert(
            "Confirm Order",
            `Total: ₹${orderPayload.totalAmount}\nConfirm placement?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: async () => {
                        setLoading(true);
                        const result = await placeOrder(tenant.id, {
                            userId: user.uid,
                            userDisplayName: userProfile?.phoneNumber || user.email,
                            ...orderPayload
                        });
                        setLoading(false);
                        if (result.error) Alert.alert("Error", "Failed to place order.");
                        else {
                            Alert.alert("Success", "Order placed successfully!");
                            fetchData(); // Refresh balance
                        }
                    }
                }
            ]
        );
    };

    if (!tenant) return <View className="flex-1 bg-white" />;

    return (
        <ScrollView
            className="flex-1 bg-gray-50 p-4"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {/* Header */}
            <View className="mb-6">
                <Text className="text-gray-500 font-medium text-lg">Hello, {(userProfile?.phoneNumber || user?.email || 'Student').split('@')[0]}</Text>
                <Text className="text-3xl font-extrabold text-gray-800">{tenant.name}</Text>
            </View>

            {/* Wallet & Stats */}
            <WalletCard balance={balance} loading={loading} />
            <WeekSummary orders={myOrders} />

            <View className="mb-4">
                <Text className="text-lg font-bold text-gray-800 border-l-4 border-yellow-400 pl-3">Today's Menu</Text>
            </View>

            {(!menu || (!menu.lunch && !menu.dinner)) ? (
                <View className="bg-white p-10 rounded-xl items-center justify-center border border-gray-200 mb-10">
                    <Text className="text-gray-400 text-lg">Menu not updated yet.</Text>
                </View>
            ) : (
                <>
                    {menu.lunch && <SlotCard slotName="Lunch" slotData={menu.lunch} onOrder={handleConfirmOrder} />}
                    {menu.dinner && <SlotCard slotName="Dinner" slotData={menu.dinner} onOrder={handleConfirmOrder} />}
                </>
            )}

            <View className="h-10" />
        </ScrollView>
    );
};
