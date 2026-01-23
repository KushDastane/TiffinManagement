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
    isAfterResetTime,
    getAvailableSlots,
    getSlotDateKey
} from "../../services/menuService";
import {
    placeStudentOrder,
} from "../../services/orderService";
import { useTheme } from "../../contexts/ThemeContext";
import tw from 'twrnc';
import { LinearGradient } from 'expo-linear-gradient';
import {
    ArrowLeft,
    Plus,
    Minus,
    Coffee,
    Sun,
    UtensilsCrossed,
    Moon,
    Clock,
    CheckCircle
} from 'lucide-react-native';

const MenuCard = ({ title, description, price, selected, quantity, onSelect, onQtyChange }) => {
    return (
        <Pressable
            onPress={onSelect}
            style={[
                tw`relative rounded-3xl p-6 mb-4 border`,
                selected
                    ? tw`bg-white border-yellow-400 shadow-xl shadow-yellow-100`
                    : tw`bg-white border-gray-100 shadow-sm`
            ]}
        >
            <View style={tw`flex-row justify-between items-start mb-4`}>
                <View style={tw`flex-1 pr-10`}>
                    <Text style={tw`text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1`}>Selection</Text>
                    <Text style={tw`font-black text-gray-900 text-xl`}>{title}</Text>
                </View>
                <View style={[
                    tw`w-10 h-10 rounded-xl items-center justify-center border`,
                    selected ? tw`bg-yellow-400 border-yellow-400` : tw`bg-gray-50 border-gray-100`
                ]}>
                    <Text style={tw`text-base font-black text-gray-900`}>₹{price}</Text>
                </View>
            </View>

            {description && (
                <Text style={tw`text-[10px] font-bold text-gray-400 leading-4 mb-4 uppercase tracking-tighter`}>
                    {description}
                </Text>
            )}

            {selected && (
                <View style={tw`flex-row justify-between items-center bg-gray-50 p-2 rounded-2xl`}>
                    <Text style={tw`ml-3 text-[9px] font-black text-gray-400 uppercase tracking-widest`}>Qty: {quantity}</Text>
                    <View style={tw`flex-row items-center`}>
                        <Pressable
                            onPress={() => onQtyChange(Math.max(1, quantity - 1))}
                            style={tw`w-10 h-10 rounded-xl bg-white border border-gray-100 items-center justify-center`}
                        >
                            <Text style={tw`text-lg font-black text-gray-400`}>−</Text>
                        </Pressable>
                        <View style={tw`w-12 items-center`}>
                            <Text style={tw`font-black text-lg text-gray-900`}>{quantity}</Text>
                        </View>
                        <Pressable
                            onPress={() => onQtyChange(quantity + 1)}
                            style={tw`w-10 h-10 rounded-xl bg-gray-900 items-center justify-center`}
                        >
                            <Text style={tw`text-lg font-black text-white`}>+</Text>
                        </Pressable>
                    </View>
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

    const [selectedSlot, setSelectedSlot] = useState(null);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [activeDateKey, setActiveDateKey] = useState(null);

    // Selection State
    const [selectedItem, setSelectedItem] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [extrasQty, setExtrasQty] = useState({});
    const [isPriority, setIsPriority] = useState(false);

    useEffect(() => {
        if (!tenant) return;
        const slots = getAvailableSlots(tenant);
        setAvailableSlots(slots);
        if (slots.length > 0 && !selectedSlot) {
            setSelectedSlot(slots[0].id);
        }
        setActiveDateKey(getEffectiveMenuDateKey(tenant));
    }, [tenant]);

    useEffect(() => {
        if (!tenant?.id || !user?.uid || !selectedSlot) return;

        setLoading(true);
        const dateId = getSlotDateKey(selectedSlot, tenant);
        const unsubMenu = subscribeToMenu(tenant.id, dateId, (data) => {
            if (data && data[selectedSlot]) {
                const sData = data[selectedSlot];
                setMenu(sData);
                // Auto-select if type is OTHER
                if (sData.type === 'OTHER' && sData.other) {
                    setSelectedItem({
                        key: 'other',
                        label: sData.other.name || "Special Meal",
                        price: sData.other.price || 0
                    });
                }
            } else {
                setMenu(null);
                setSelectedItem(null);
            }
            setLoading(false);
        });

        return () => {
            unsubMenu();
        };
    }, [tenant?.id, user?.uid, selectedSlot]);

    // Always allow placing order if menu is present
    const canPlaceOrder = true;

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
            mealType: selectedSlot.toUpperCase(),
            slot: selectedSlot,
            isPriority: selectedSlot === 'lunch' ? isPriority : false,
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
            setIsPriority(false);
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

    if (availableSlots.length === 0 || !selectedSlot) {
        return (
            <View style={tw`flex-1 bg-white items-center justify-center p-10`}>
                <Text style={tw`text-6xl mb-6`}>👨‍🍳</Text>
                <Text style={tw`text-2xl font-black text-gray-900 text-center mb-2`}>
                    Kitchen Resting
                </Text>
                <Text style={tw`text-gray-400 text-center font-bold uppercase tracking-widest text-[10px]`}>
                    No active meal slots available right now.
                </Text>
                <Pressable onPress={() => navigation.goBack()} style={tw`mt-8 bg-gray-900 px-8 py-4 rounded-2xl`}>
                    <Text style={tw`text-white font-black text-xs uppercase tracking-widest`}>Go Back</Text>
                </Pressable>
            </View>
        );
    }

    if (!menu || menu.status !== 'SET') {
        const SlotIcon = selectedSlot === 'breakfast' ? Coffee : (selectedSlot === 'lunch' ? Sun : (selectedSlot === 'snacks' ? UtensilsCrossed : Moon));
        return (
            <View style={tw`flex-1 bg-white`}>
                <View style={tw`px-6 pt-14 flex-row items-center gap-4`}>
                    <Pressable onPress={() => navigation.goBack()} style={tw`w-10 h-10 rounded-xl bg-gray-50 items-center justify-center border border-gray-100`}>
                        <ArrowLeft size={20} color="#111827" />
                    </Pressable>
                    <Text style={tw`text-xl font-black text-gray-900`}>Build Meal</Text>
                </View>

                {/* Slot Selector also here */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`px-6 py-6 gap-3`}>
                    {availableSlots.map(s => {
                        const Icon = s.id === 'breakfast' ? Coffee : (s.id === 'lunch' ? Sun : (s.id === 'snacks' ? UtensilsCrossed : Moon));
                        const isSelected = selectedSlot === s.id;
                        return (
                            <Pressable
                                key={s.id}
                                onPress={() => setSelectedSlot(s.id)}
                                style={[tw`flex-row items-center gap-2 px-5 py-3 rounded-2xl border`, isSelected ? tw`bg-yellow-400 border-yellow-400` : tw`bg-white border-gray-100 shadow-sm`]}
                            >
                                <Icon size={14} color={isSelected ? "#111827" : "#9ca3af"} />
                                <Text style={[tw`text-[10px] font-black uppercase tracking-widest`, isSelected ? tw`text-gray-900` : tw`text-gray-400`]}>{s.id}</Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>

                <View style={tw`flex-1 items-center justify-center p-10`}>
                    <View style={tw`w-20 h-20 rounded-3xl bg-gray-50 items-center justify-center mb-6`}>
                        <SlotIcon size={32} color="#9ca3af" />
                    </View>
                    <Text style={tw`text-2xl font-black text-gray-900 text-center mb-2`}>
                        Menu Updating...
                    </Text>
                    <Text style={tw`text-gray-400 text-center font-bold uppercase tracking-widest text-[9px]`}>
                        The kitchen is deciding the menu for {selectedSlot}.{'\n'}Please check back shortly!
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={tw`flex-1 bg-[#faf9f6]`}>
            {/* Header - Continuity with Dashboard */}
            <LinearGradient
                colors={['#fff', '#faf9f6']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={tw`px-6 pt-14 pb-8 rounded-b-[40px] shadow-sm flex-row items-center border-b border-gray-100/50`}
            >

                <View>
                    <Text style={tw`text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-0.5`}>
                        {activeDateKey} • AVAILABLE MEALS
                    </Text>
                    <Text style={tw`text-2xl font-black text-gray-900`}>Build Meal</Text>
                </View>
            </LinearGradient>

            {/* Slot Selector Carousel */}
            <View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`px-6 py-4 gap-3`}>
                    {availableSlots.map(s => {
                        const Icon = s.id === 'breakfast' ? Coffee : (s.id === 'lunch' ? Sun : (s.id === 'snacks' ? UtensilsCrossed : Moon));
                        const isSelected = selectedSlot === s.id;
                        return (
                            <Pressable
                                key={s.id}
                                onPress={() => setSelectedSlot(s.id)}
                                style={[tw`flex-row items-center gap-2 px-5 py-3 rounded-2xl border`, isSelected ? tw`bg-yellow-400 border-yellow-400` : tw`bg-white border-gray-100 shadow-sm`]}
                            >
                                <Icon size={14} color={isSelected ? "#111827" : "#9ca3af"} />
                                <Text style={[tw`text-[10px] font-black uppercase tracking-widest`, isSelected ? tw`text-gray-900` : tw`text-gray-400`]}>{s.id}</Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>

            <ScrollView style={tw`flex-1 p-6 -mt-4`} contentContainerStyle={tw`pb-40`} showsVerticalScrollIndicator={false}>

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

                {selectedSlot === 'lunch' && selectedItem && (
                    <View style={tw`mt-8`}>
                        <View style={tw`flex-row items-center gap-2 mb-4`}>
                            <Text style={tw`text-[9px] font-black text-gray-400 uppercase tracking-widest`}>Priority Preparation</Text>
                            <View style={tw`h-[1px] flex-1 bg-gray-100`} />
                        </View>
                        <Pressable
                            onPress={() => setIsPriority(!isPriority)}
                            style={[
                                tw`flex-row items-center justify-between p-4 rounded-2xl border`,
                                isPriority ? tw`bg-orange-50 border-orange-200 shadow-sm shadow-orange-100` : tw`bg-white border-gray-100 shadow-sm`
                            ]}
                        >
                            <View style={tw`flex-row items-center gap-3`}>
                                <View style={[tw`w-10 h-10 rounded-xl items-center justify-center`, isPriority ? tw`bg-orange-100` : tw`bg-gray-50`]}>
                                    <Clock size={20} color={isPriority ? "#ea580c" : "#9ca3af"} />
                                </View>
                                <View>
                                    <Text style={[tw`text-sm font-black`, isPriority ? tw`text-orange-900` : tw`text-gray-900`]}>Early Collection</Text>
                                    <Text style={tw`text-[9px] font-bold text-gray-400 uppercase`}>Before College / Early Lunch</Text>
                                </View>
                            </View>
                            <View style={[tw`w-6 h-6 rounded-full border-2 items-center justify-center`, isPriority ? tw`bg-orange-500 border-orange-500` : tw`border-gray-200`]}>
                                {isPriority && <CheckCircle size={14} color="white" />}
                            </View>
                        </Pressable>
                    </View>
                )}

                {/* Extras Section */}
                {selectedItem && menu?.extras && menu.extras.length > 0 && (
                    <View style={tw`mt-8`}>
                        <View style={tw`flex-row items-center gap-2 mb-4`}>
                            <Text style={tw`text-[9px] font-black text-gray-400 uppercase tracking-widest`}>Add-ons & Extras</Text>
                            <View style={tw`h-[1px] flex-1 bg-gray-100`} />
                        </View>
                        <View style={tw`gap-3`}>
                            {menu.extras.map((extra, idx) => (
                                <View key={idx} style={tw`flex-row justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm`}>
                                    <View>
                                        <Text style={tw`font-black text-gray-900`}>{extra.name}</Text>
                                        <View style={tw`bg-yellow-100 px-2 py-0.5 rounded-md self-start mt-1`}>
                                            <Text style={tw`text-[9px] font-black text-yellow-800`}>+₹{extra.price}</Text>
                                        </View>
                                    </View>
                                    <View style={tw`flex-row items-center gap-3`}>
                                        <Pressable
                                            onPress={() => updateExtraQty(extra.name, -1)}
                                            style={tw`w-8 h-8 rounded-lg bg-gray-50 items-center justify-center border border-gray-100`}
                                        >
                                            <Minus size={14} color="#9ca3af" />
                                        </Pressable>
                                        <Text style={tw`font-black text-gray-900 w-4 text-center`}>{extrasQty[extra.name] || 0}</Text>
                                        <Pressable
                                            onPress={() => updateExtraQty(extra.name, 1)}
                                            style={tw`w-8 h-8 rounded-lg bg-gray-900 items-center justify-center`}
                                        >
                                            <Plus size={14} color="white" />
                                        </Pressable>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Bottom Bar - High Impact */}
            <View style={tw`absolute bottom-10 left-6 right-6`}>

                <Pressable
                    disabled={!selectedItem || !canPlaceOrder || saving}
                    onPress={handlePlaceOrder}
                    style={[
                        tw`flex-row mb-10 justify-between items-center p-5 rounded-2xl shadow-xl border border-gray-800`,
                        {
                            backgroundColor: '#111827',
                            opacity: (!selectedItem || !canPlaceOrder || saving) ? 0.6 : 1
                        }
                    ]}
                >
                    <View style={tw`flex-row items-center`}>
                        {saving ? <ActivityIndicator color="#fff" style={tw`mr-3`} /> : null}
                        <Text style={tw`text-white font-black text-[11px] uppercase tracking-widest`}>
                            {canPlaceOrder ? "Confirm Order" : "Orders Closed"}
                        </Text>
                    </View>
                    <View style={tw`bg-yellow-400 px-3 py-1 rounded-lg`}>
                        <Text style={tw`text-gray-900 text-sm font-black`}>₹{total}</Text>
                    </View>
                </Pressable>
                {!canPlaceOrder && <Text style={tw`text-center text-[9px] text-red-500 font-bold mt-3 uppercase tracking-widest`}>Slot is currently filled or closed</Text>}
            </View>
        </View>
    );
};
