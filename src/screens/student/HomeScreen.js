import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    Pressable,
    ScrollView,
    ActivityIndicator,
    Alert,
    RefreshControl,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useTenant } from "../../contexts/TenantContext";
import { getMenuDateId, subscribeToMenu } from "../../services/menuService";
import { placeOrder, subscribeToMyOrders } from "../../services/orderService";
import { getStudentBalance } from "../../services/paymentService";
import { useTheme } from "../../contexts/ThemeContext"; // Import ledger service

const WeekSummary = ({ orders }) => {
    const { primaryColor } = useTheme();
    // Generate last 7 days including today
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d);
    }

    const hasOrder = (date) => {
        const dateStr = date.toISOString().split("T")[0];
        return orders.some((o) => o.dateId === dateStr);
    };

    return (
        <View className="flex-row justify-between bg-white p-4 rounded-xl mb-4 border border-gray-100 shadow-sm">
            {days.map((date, index) => {
                const ordered = hasOrder(date);
                const isToday = index === 6;
                return (
                    <View key={index} className="items-center">
                        <Text className="text-xs text-gray-400 mb-1">{date.getDate()}</Text>
                        <View
                            style={{
                                backgroundColor: ordered ? primaryColor : '#f3f4f6',
                                borderColor: isToday ? primaryColor : 'transparent',
                                borderWidth: isToday ? 2 : 0
                            }}
                            className="w-8 h-8 rounded-full items-center justify-center"
                        >
                            <Text
                                className={`font-bold ${ordered ? "text-gray-900" : "text-gray-300"}`}
                            >
                                {date.toLocaleDateString("en-US", { weekday: "narrow" })}
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
                <Text
                    className={`text-4xl font-bold ${balance > 0 ? "text-red-400" : "text-green-400"}`}
                >
                    {balance > 0 ? "-" : ""}₹{Math.abs(balance)}
                </Text>
                <Text className="text-gray-500 mb-2 ml-2 font-medium">
                    {balance > 0 ? "Due" : "Advance"}
                </Text>
            </View>
        )}
        <Pressable
            style={{
                backgroundColor: '#1f2937', // bg-gray-800
                marginTop: 16, // mt-4
                paddingVertical: 12, // py-3
                borderRadius: 8, // rounded-lg
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#374151', // border-gray-700
            }}
        >
            <Text className="text-gray-300 font-bold">+ Add Money (Upload Slip)</Text>
        </Pressable>
    </View>
);

const SlotCard = ({ slotConfig, slotData, onOrder }) => {
    const { primaryColor } = useTheme();
    const { tenant } = useTenant();
    const { label, mode, startTime, endTime, allowCustomization } = slotConfig;

    // Config for FIXED mode
    const config = tenant?.fixedMealConfig || { global: { variants: [], optionalComponents: [] } };
    const variants = config.global?.variants || [];
    const globalComponents = (config.global?.optionalComponents || []).filter(c => c.enabled);

    // Local State
    const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id);
    const [compQtys, setCompQtys] = useState({}); // { compId: quantity }
    const [menuItemQtys, setMenuItemQtys] = useState({}); // { itemName: quantity } - For MENU mode
    const [dailyExtraQtys, setDailyExtraQtys] = useState({}); // { name: quantity }

    const isActive = slotData.status === "SET";

    // Time Logic
    const now = new Date();
    const [startH, startM] = (startTime || "00:00").split(":").map(Number);
    const [endH, endM] = (endTime || "23:59").split(":").map(Number);

    const startTimeDate = new Date();
    startTimeDate.setHours(startH, startM, 0);
    const endTimeDate = new Date();
    endTimeDate.setHours(endH, endM, 0);

    const isTimeValid = now >= startTimeDate && now <= endTimeDate;
    const canOrder = isActive && isTimeValid;

    if (!isActive) return null;

    const calculateTotal = () => {
        let total = 0;
        if (mode === "FIXED") {
            const selectedVariant = variants.find(v => v.id === selectedVariantId) || variants[0];
            total += selectedVariant?.basePrice || 0;

            if (allowCustomization) {
                globalComponents.forEach(c => {
                    const qty = compQtys[c.id] || 0;
                    total += qty * (c.price || 0);
                });
            }
        } else {
            // MENU Mode calculation
            const items = slotData.menuItems || [];
            items.forEach(item => {
                const qty = menuItemQtys[item.name] || 0;
                total += qty * (Number(item.price) || 0);
            });
        }

        // Daily Special Extras (Common to both)
        const extras = slotData.extras || [];
        extras.forEach(e => {
            const qty = dailyExtraQtys[e.name] || 0;
            total += qty * Number(e.price);
        });

        return total;
    };

    const handlePlaceOrder = () => {
        const total = calculateTotal();
        if (total === 0) {
            Alert.alert("Empty Order", "Please select at least one item.");
            return;
        }

        const selectedVariant = mode === "FIXED" ? (variants.find(v => v.id === selectedVariantId) || variants[0]) : null;

        const orderPayload = {
            slot: slotConfig.id,
            slotLabel: label,
            mode,
            mainItem: mode === "FIXED" ? slotData.mainDish : "Multi-item Order",

            variantSnapshot: mode === "FIXED" ? {
                id: selectedVariant.id,
                label: selectedVariant.label,
                basePrice: selectedVariant.basePrice,
                quantities: selectedVariant.quantities
            } : null,

            componentsSnapshot: [
                // Global components (only if FIXED and customizable)
                ...(mode === "FIXED" && allowCustomization ? globalComponents.filter(c => compQtys[c.id] > 0).map(c => ({
                    id: c.id,
                    name: c.name,
                    price: c.price,
                    quantity: compQtys[c.id]
                })) : []),

                // Menu items (if MENU mode)
                ...(mode === "MENU" ? (slotData.menuItems || []).filter(i => menuItemQtys[i.name] > 0).map(i => ({
                    name: i.name,
                    price: Number(i.price),
                    quantity: menuItemQtys[i.name]
                })) : []),

                // Daily extras (Always)
                ...(slotData.extras || []).filter(e => dailyExtraQtys[e.name] > 0).map(e => ({
                    name: e.name,
                    price: Number(e.price),
                    quantity: dailyExtraQtys[e.name],
                    isDailySpecial: true
                }))
            ],

            totalAmount: total,
            quantity: 1,
        };
        onOrder(orderPayload);
    };

    const updateQty = (state, setState, key, delta, allowMulti) => {
        const current = state[key] || 0;
        const next = allowMulti ? Math.max(0, current + delta) : (current === 0 ? 1 : 0);
        setState({ ...state, [key]: next });
    };

    return (
        <View className="bg-white p-5 rounded-3xl mb-6 shadow-sm border border-gray-100">
            <View className="flex-row justify-between mb-4 items-center">
                <View>
                    <Text className="text-xl font-black text-gray-900">{label}</Text>
                    <Text className="text-[10px] items-center font-black text-gray-400 uppercase tracking-widest">
                        {mode === 'FIXED' ? '🍱 Tiffin' : '🍔 Canteen'} • {startTime} - {endTime}
                    </Text>
                </View>
                {!isTimeValid && (
                    <View className="bg-red-50 px-3 py-1 rounded-full">
                        <Text className="text-red-500 font-black text-[10px] uppercase">Closed</Text>
                    </View>
                )}
            </View>

            {mode === "FIXED" ? (
                <View>
                    <Text style={{ color: primaryColor }} className="text-2xl font-black mb-4">
                        {slotData.mainDish}
                    </Text>

                    <View className="flex-row flex-wrap mb-4 bg-gray-50 p-1 rounded-2xl">
                        {variants.map((v) => (
                            <Pressable
                                key={v.id}
                                style={{
                                    flex: 1,
                                    paddingVertical: 12,
                                    borderRadius: 14,
                                    alignItems: 'center',
                                    backgroundColor: selectedVariantId === v.id ? "white" : "transparent",
                                    shadowColor: selectedVariantId === v.id ? "#000" : undefined,
                                    shadowOpacity: 0.05,
                                    shadowRadius: 5,
                                    minWidth: '45%',
                                    margin: 2
                                }}
                                onPress={() => setSelectedVariantId(v.id)}
                            >
                                <Text className="font-black text-gray-900">{v.label}</Text>
                                <Text className="text-gray-400 font-black text-[10px]">₹{v.basePrice}</Text>
                            </Pressable>
                        ))}
                    </View>

                    {allowCustomization && globalComponents.length > 0 && (
                        <View className="bg-gray-50/50 p-4 rounded-2xl mb-4">
                            <Text className="font-black text-[10px] text-gray-400 uppercase mb-3 tracking-widest">Customize your Tiffin</Text>
                            {globalComponents.map((c) => (
                                <View key={c.id} className="flex-row justify-between items-center mb-3">
                                    <View>
                                        <Text className="font-bold text-gray-800">{c.name}</Text>
                                        <Text className="text-gray-400 text-[10px] font-black">₹{c.price}</Text>
                                    </View>
                                    <View className="flex-row items-center bg-white rounded-xl shadow-sm overflow-hidden p-1">
                                        {c.allowQuantity ? (
                                            <>
                                                <Pressable
                                                    onPress={() => updateQty(compQtys, setCompQtys, c.id, -1, true)}
                                                    style={{ paddingHorizontal: 12, paddingVertical: 4 }}
                                                >
                                                    <Text className="text-xl font-black text-gray-400">-</Text>
                                                </Pressable>
                                                <Text className="font-black px-2">{compQtys[c.id] || 0}</Text>
                                                <Pressable
                                                    onPress={() => updateQty(compQtys, setCompQtys, c.id, 1, true)}
                                                    style={{ paddingHorizontal: 12, paddingVertical: 4 }}
                                                >
                                                    <Text className="text-xl font-black text-gray-900">+</Text>
                                                </Pressable>
                                            </>
                                        ) : (
                                            <Pressable
                                                onPress={() => updateQty(compQtys, setCompQtys, c.id, 1, false)}
                                                style={{
                                                    paddingHorizontal: 16, // px-4
                                                    paddingVertical: 6, // py-1.5
                                                    borderRadius: 8, // rounded-lg
                                                    backgroundColor: compQtys[c.id] ? '#111827' : '#f3f4f6' // bg-gray-900 or bg-gray-100
                                                }}
                                            >
                                                <Text className={`font-black text-[10px] uppercase ${compQtys[c.id] ? 'text-white' : 'text-gray-400'}`}>
                                                    {compQtys[c.id] ? "Added" : "Add"}
                                                </Text>
                                            </Pressable>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            ) : (
                <View className="mb-4">
                    <Text className="font-black text-[10px] text-gray-400 uppercase mb-3 tracking-widest">Available Today</Text>
                    {(slotData.menuItems || []).map((item, idx) => (
                        <View key={idx} className="flex-row justify-between items-center mb-4 bg-gray-50 p-3 rounded-2xl">
                            <View className="flex-1">
                                <Text className="text-lg font-black text-gray-800">{item.name}</Text>
                                <Text className="text-gray-400 font-bold">₹{item.price}</Text>
                            </View>
                            <View className="flex-row items-center bg-white rounded-xl shadow-sm p-1">
                                <Pressable
                                    onPress={() => updateQty(menuItemQtys, setMenuItemQtys, item.name, -1, true)}
                                    style={{ paddingHorizontal: 12, paddingVertical: 4 }}
                                >
                                    <Text className="text-xl font-black text-gray-400">-</Text>
                                </Pressable>
                                <Text className="font-black px-2">{menuItemQtys[item.name] || 0}</Text>
                                <Pressable
                                    onPress={() => updateQty(menuItemQtys, setMenuItemQtys, item.name, 1, true)}
                                    style={{ paddingHorizontal: 12, paddingVertical: 4 }}
                                >
                                    <Text className="text-xl font-black text-gray-900">+</Text>
                                </Pressable>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Daily Special Extras (Shows for both) */}
            {slotData.extras && slotData.extras.length > 0 && (
                <View className="mt-2 border-t border-gray-100 pt-4">
                    <Text className="font-black text-amber-600 mb-3 text-[10px] uppercase tracking-widest">Today's Special Extras</Text>
                    {slotData.extras.map((e, idx) => (
                        <View key={idx} className="flex-row justify-between items-center mb-3">
                            <View>
                                <Text className="font-bold text-gray-800">{e.name}</Text>
                                <Text className="text-gray-400 font-black text-[10px]">₹{e.price}</Text>
                            </View>
                            <View className="flex-row items-center bg-gray-100 rounded-xl p-1">
                                <Pressable
                                    onPress={() => updateQty(dailyExtraQtys, setDailyExtraQtys, e.name, -1, true)}
                                    style={{ paddingHorizontal: 12, paddingVertical: 4 }}
                                >
                                    <Text className="text-lg font-black text-gray-400">-</Text>
                                </Pressable>
                                <Text className="font-black px-2">{dailyExtraQtys[e.name] || 0}</Text>
                                <Pressable
                                    onPress={() => updateQty(dailyExtraQtys, setDailyExtraQtys, e.name, 1, true)}
                                    style={{ paddingHorizontal: 12, paddingVertical: 4 }}
                                >
                                    <Text className="text-lg font-black text-gray-900">+</Text>
                                </Pressable>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            <View className="mt-4 border-t-2 border-dashed border-gray-100 pt-5">
                <View className="flex-row justify-between items-end mb-4 px-1">
                    <Text className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Total Amount</Text>
                    <Text className="text-4xl font-black text-gray-900">₹{calculateTotal()}</Text>
                </View>

                <Pressable
                    style={{
                        width: '100%',
                        backgroundColor: !canOrder ? '#f3f4f6' : primaryColor,
                        borderRadius: 20,
                        padding: 20,
                        alignItems: 'center',
                        shadowColor: primaryColor,
                        shadowOpacity: canOrder ? 0.3 : 0,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 4 }
                    }}
                    onPress={handlePlaceOrder}
                    disabled={!canOrder}
                >
                    <Text className={`font-black text-lg ${canOrder ? 'text-black' : 'text-gray-300'}`}>
                        {canOrder ? "Confirm Order" : "Ordering Closed"}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
};

export const HomeScreen = () => {
    const { user, userProfile } = useAuth();
    const { tenant } = useTenant();
    const { primaryColor } = useTheme();
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
        const unsubMenu = subscribeToMenu(tenant.id, today, (data) =>
            setMenu(data),
        );

        // Subscribe to Orders (for Weekly Summary)
        const unsubOrders = subscribeToMyOrders(tenant.id, user.uid, (data) =>
            setMyOrders(data),
        );

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
                            ...orderPayload,
                        });
                        setLoading(false);
                        if (result.error) Alert.alert("Error", "Failed to place order.");
                        else {
                            Alert.alert("Success", "Order placed successfully!");
                            fetchData(); // Refresh balance
                        }
                    },
                },
            ],
        );
    };

    if (!tenant) return <View className="flex-1 bg-white" />;

    return (
        <ScrollView
            className="flex-1 bg-gray-50 p-4"
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            {/* Header */}
            <View className="mb-6">
                <Text className="text-gray-500 font-medium text-lg">
                    Hello,{" "}
                    {(userProfile?.phoneNumber || user?.email || "Student").split("@")[0]}
                </Text>
                <Text className="text-3xl font-extrabold text-gray-800">
                    {tenant.name}
                </Text>
            </View>

            {/* Wallet & Stats */}
            <WalletCard balance={balance} loading={loading} />
            <WeekSummary orders={myOrders} />

            <View className="mb-4">
                <Text
                    style={{ borderColor: primaryColor }}
                    className="text-lg font-black text-gray-900 border-l-4 pl-3 uppercase tracking-widest"
                >
                    Today's Menu
                </Text>
            </View>

            {(!tenant.mealTypes || tenant.mealTypes.length === 0) ? (
                <View className="bg-white p-10 rounded-3xl items-center justify-center border border-gray-100 mb-10">
                    <Text className="text-gray-400 font-black">No meal slots configured.</Text>
                </View>
            ) : (
                <>
                    {tenant.mealTypes.map((slot) => {
                        const slotData = menu?.[slot.id];
                        if (!slotData || slotData.status !== 'SET') return null;

                        return (
                            <SlotCard
                                key={slot.id}
                                slotConfig={slot}
                                slotData={slotData}
                                onOrder={handleConfirmOrder}
                            />
                        );
                    })}

                    {/* Fallback if no slots are active/SET */}
                    {Object.values(menu || {}).every(s => s.status !== 'SET') && (
                        <View className="bg-white p-10 rounded-3xl items-center justify-center border border-gray-100 mb-10">
                            <Text className="text-gray-400 font-bold">Kitchen is closed for today.</Text>
                        </View>
                    )}
                </>
            )}

            <View className="h-10" />
        </ScrollView>
    );
};
