import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    Pressable,
    ScrollView,
    ActivityIndicator,
    Alert,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useTenant } from "../../contexts/TenantContext";
import {
    subscribeToMenu,
    getEffectiveMenuDateKey,
    getEffectiveMealSlot,
    isAfterResetTime
} from "../../services/menuService";
import {
    placeStudentOrder,
} from "../../services/orderService";
import { useTheme } from "../../contexts/ThemeContext";
import tw from 'twrnc';

// Simplified Order Components
const MenuCard = ({ title, description, price, selected, quantity, onSelect, onQtyChange }) => {
    const { primaryColor } = useTheme();
    return (
        <Pressable
            onPress={onSelect}
            style={[
                tw`relative rounded-3xl p-5 mb-4 border`,
                {
                    backgroundColor: selected ? `${primaryColor}10` : 'rgba(255,255,255,0.7)',
                    borderColor: selected ? primaryColor : 'rgba(0,0,0,0.05)',
                }
            ]}
        >
            <View style={tw`absolute top-4 right-4`}>
                <View style={[
                    tw`w-5 h-5 rounded-full border-2 items-center justify-center`,
                    { borderColor: selected ? primaryColor : '#D1D5DB', backgroundColor: selected ? primaryColor : 'transparent' }
                ]}>
                    {selected && <View style={tw`w-2 h-2 bg-white rounded-full`} />}
                </View>
            </View>

            <View style={tw`pr-10`}>
                <Text style={tw`font-bold text-gray-900 text-lg`}>{title}</Text>
                {description && <Text style={tw`text-sm text-gray-400 mt-1`}>{description}</Text>}
                <Text style={tw`mt-3 text-xl font-black text-gray-900`}>₹{price}</Text>
            </View>

            {selected && (
                <View style={tw`flex-row justify-end items-center mt-5`}>
                    <Pressable
                        onPress={() => onQtyChange(Math.max(1, quantity - 1))}
                        style={tw`w-10 h-10 rounded-full bg-gray-100 items-center justify-center`}
                    >
                        <Text style={tw`text-xl font-bold text-gray-500`}>−</Text>
                    </Pressable>
                    <Text style={tw`mx-4 font-black text-lg text-gray-900`}>{quantity}</Text>
                    <Pressable
                        onPress={() => onQtyChange(quantity + 1)}
                        style={tw`w-10 h-10 rounded-full bg-gray-100 items-center justify-center`}
                    >
                        <Text style={tw`text-xl font-bold text-gray-900`}>+</Text>
                    </Pressable>
                </View>
            )}
        </Pressable>
    );
};

export const OrderScreen = () => {
    const { user } = useAuth();
    const { tenant } = useTenant();
    const { primaryColor } = useTheme();

    // Core State
    const [menu, setMenu] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Selection State
    const [selectedItem, setSelectedItem] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [extrasQty, setExtrasQty] = useState({});

    const dateId = getEffectiveMenuDateKey();
    const activeSlot = getEffectiveMealSlot();

    useEffect(() => {
        if (!tenant?.id || !user?.uid) return;

        setLoading(true);
        const unsubMenu = subscribeToMenu(tenant.id, dateId, (data) => {
            if (data && activeSlot) {
                setMenu(data[activeSlot]);
            } else {
                setMenu(null);
            }
            setLoading(false);
        });

        return () => {
            unsubMenu();
        };
    }, [tenant?.id, user?.uid, dateId, activeSlot]);

    const canPlaceOrder = useMemo(() => {
        const hour = new Date().getHours();
        if (activeSlot === 'lunch') return hour < 15;
        if (activeSlot === 'dinner') return hour < 20;
        return false;
    }, [activeSlot]);

    const total = useMemo(() => {
        if (!selectedItem) return 0;
        let sum = selectedItem.price * quantity;
        if (menu?.extras) {
            menu.extras.forEach(e => {
                sum += (extrasQty[e.name] || 0) * (Number(e.price) || 0);
            });
        }
        return sum;
    }, [selectedItem, quantity, extrasQty, menu]);

    const handlePlaceOrder = async () => {
        if (!selectedItem || !canPlaceOrder) return;

        setSaving(true);
        const orderData = {
            studentId: user.uid,
            mealType: activeSlot.toUpperCase(),
            items: {
                item: selectedItem.label,
                unitPrice: selectedItem.price,
                quantity,
                extras: extrasQty,
                itemType: selectedItem.key === 'other' ? 'OTHER' : 'ROTI_SABZI',
                totalAmount: total
            }
        };

        const result = await placeStudentOrder(tenant.id, orderData);
        setSaving(false);

        if (result.success) {
            Alert.alert("Success", "Order placed successfully!");
            // Reset selection?
            setSelectedItem(null);
            setQuantity(1);
            setExtrasQty({});
        } else {
            Alert.alert("Error", result.error || "Failed to place order.");
        }
    };

    const updateExtraQty = (name, delta) => {
        setExtrasQty(prev => ({
            ...prev,
            [name]: Math.max(0, (prev[name] || 0) + delta)
        }));
    };

    if (loading) return <View style={tw`flex-1 items-center justify-center bg-gray-50`}><ActivityIndicator color={primaryColor} /></View>;
    if (!tenant) return null;

    if (!activeSlot || !menu || menu.status !== 'SET') {
        return (
            <View style={tw`flex-1 bg-white items-center justify-center p-10`}>
                <Text style={tw`text-6xl mb-6`}>🍱</Text>
                <Text style={tw`text-2xl font-black text-gray-900 text-center mb-2`}>
                    Oops, kitchen is closed
                </Text>
                <Text style={tw`text-gray-400 text-center font-bold`}>
                    Timings:{"\n"}7:00 AM – 1:00 PM{"\n"}4:00 PM – 9:00 PM
                </Text>
            </View>
        );
    }

    return (
        <View style={tw`flex-1 bg-gray-50 pt-12`}>
            <ScrollView style={tw`flex-1 p-6`} showsVerticalScrollIndicator={false}>
                <View style={tw`mb-8`}>
                    <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest`}>
                        {isAfterResetTime() ? "TOMORROW" : "TODAY"} • {activeSlot.toUpperCase()}
                    </Text>
                    <Text style={tw`text-3xl font-black text-gray-900 mt-1`}>Build Your Thali</Text>
                    {!canPlaceOrder && <Text style={tw`text-xs font-bold text-red-500 mt-2`}>Orders closed for this slot</Text>}
                </View>

                {menu.type === "ROTI_SABZI" && menu.rotiSabzi ? (
                    <View style={tw`gap-4`}>
                        <MenuCard
                            title="Half Dabba"
                            description={menu.rotiSabzi.half?.items?.join(" • ") || ""}
                            price={menu.rotiSabzi.half?.price || 0}
                            selected={selectedItem?.key === "half"}
                            quantity={quantity}
                            onSelect={() => setSelectedItem({ key: 'half', label: 'Half Dabba', price: menu.rotiSabzi.half?.price || 0 })}
                            onQtyChange={setQuantity}
                        />
                        <MenuCard
                            title="Full Dabba"
                            description={menu.rotiSabzi.full?.items?.join(" • ") || ""}
                            price={menu.rotiSabzi.full?.price || 0}
                            selected={selectedItem?.key === "full"}
                            quantity={quantity}
                            onSelect={() => setSelectedItem({ key: 'full', label: 'Full Dabba', price: menu.rotiSabzi.full?.price || 0 })}
                            onQtyChange={setQuantity}
                        />
                    </View>
                ) : (menu.type === "OTHER" && menu.other) ? (
                    <MenuCard
                        title={menu.other?.name || "Special Meal"}
                        price={menu.other?.price || 0}
                        selected={selectedItem?.key === "other"}
                        quantity={quantity}
                        onSelect={() => setSelectedItem({ key: 'other', label: menu.other?.name || "Special Meal", price: menu.other?.price || 0 })}
                        onQtyChange={setQuantity}
                    />
                ) : (
                    <View style={tw`bg-white p-10 rounded-3xl items-center`}>
                        <Text style={tw`text-gray-400 font-bold`}>Meal details not available.</Text>
                    </View>
                )}

                {menu.extras?.length > 0 && selectedItem && (
                    <View style={tw`mt-8 mb-40`}>
                        <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4`}>Add-ons (Optional)</Text>
                        {menu.extras.map((e, idx) => (
                            e && (
                                <View key={e.name || idx} style={tw`flex-row justify-between items-center bg-white p-4 rounded-3xl mb-3 shadow-sm border border-gray-100`}>
                                    <View>
                                        <Text style={tw`font-bold text-gray-900`}>{e.name}</Text>
                                        <Text style={tw`text-[10px] font-black text-gray-400`}>₹{e.price}</Text>
                                    </View>
                                    <View style={tw`flex-row items-center bg-gray-50 rounded-2xl p-1`}>
                                        <Pressable onPress={() => updateExtraQty(e.name, -1)} style={tw`w-8 h-8 rounded-full items-center justify-center`}>
                                            <Text style={tw`text-lg font-bold text-gray-400`}>−</Text>
                                        </Pressable>
                                        <Text style={tw`mx-3 font-black text-gray-900`}>{extrasQty[e.name] || 0}</Text>
                                        <Pressable onPress={() => updateExtraQty(e.name, 1)} style={tw`w-8 h-8 rounded-full items-center justify-center`}>
                                            <Text style={tw`text-lg font-bold text-gray-400`}>+</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            )
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Bottom Bar */}
            <View style={tw`absolute bottom-24 left-6 right-6`}>
                <Pressable
                    disabled={!selectedItem || !canPlaceOrder || saving}
                    onPress={handlePlaceOrder}
                    style={[
                        tw`flex-row justify-between items-center p-5 rounded-3xl shadow-lg`,
                        { backgroundColor: '#111827', opacity: (!selectedItem || !canPlaceOrder || saving) ? 0.7 : 1 }
                    ]}
                >
                    <View style={tw`flex-row items-center`}>
                        {saving ? <ActivityIndicator color="#fff" style={tw`mr-3`} /> : null}
                        <Text style={tw`text-white font-black text-lg`}>{canPlaceOrder ? "Place Order" : "Orders Closed"}</Text>
                    </View>
                    <Text style={[tw`text-xl font-black`, { color: primaryColor }]}>₹{total}</Text>
                </Pressable>
                {!canPlaceOrder && <Text style={tw`text-center text-[10px] text-red-500 font-bold mt-2 uppercase`}>Try calling kitchen for urgent requests</Text>}
            </View>
        </View>
    );
};
