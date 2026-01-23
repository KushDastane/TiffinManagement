import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, Switch, Animated, Dimensions } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { saveMenu, subscribeToMenu, getTodayKey, getTomorrowKey, getLunchDateKey, getDinnerDateKey, getEffectiveMenuDateKey, getSlotDateKey } from '../../services/menuService';
import tw from 'twrnc';
import { ChevronLeft, Plus, X, List, PenTool, ExternalLink, Utensils, Moon, Sun } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const OTHER_SUGGESTIONS = ["Misal Pav", "Pav Bhaji", "Thalipeeth"];
const FULL_ADDON_SUGGESTIONS = ["Dal Rice", "Kadhi Rice", "Biryani"];
const FREE_ADDONS = ["Chatni", "Pickle", "Dahi", "Sweet"];

export const MenuScreen = () => {
    const { tenant } = useTenant();

    // UI State
    const [viewMode, setViewMode] = useState('summary'); // summary | edit
    const [editingSlot, setEditingSlot] = useState(null); // lunch | dinner
    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;

    // Data State
    const [menuCache, setMenuCache] = useState({});
    const [loading, setLoading] = useState(true);

    // Form State
    const [mealType, setMealType] = useState('ROTI_SABZI'); // ROTI_SABZI | OTHER
    const [sabzi, setSabzi] = useState("");
    const [halfPrice, setHalfPrice] = useState("50");
    const [fullPrice, setFullPrice] = useState("80");
    const [fullAddon, setFullAddon] = useState("Dal Rice");
    const [customFullAddon, setCustomFullAddon] = useState("");
    const [showCustomAddon, setShowCustomAddon] = useState(false);
    const [freeAddons, setFreeAddons] = useState([]);

    const [otherName, setOtherName] = useState("");
    const [otherPrice, setOtherPrice] = useState("");
    const [showOtherInput, setShowOtherInput] = useState(false);

    const [extras, setExtras] = useState([{ name: "Roti", price: "7" }]);
    const [isSaving, setIsSaving] = useState(false);

    const todayKey = useMemo(() => getTodayKey(), []);
    const tomorrowKey = useMemo(() => getTomorrowKey(), []);
    const effectiveDateKey = useMemo(() => getEffectiveMenuDateKey(tenant), [tenant]);

    // Get Active Slots
    const activeSlots = useMemo(() => {
        if (!tenant?.mealSlots) return [];
        return Object.entries(tenant.mealSlots)
            .filter(([_, s]) => s.active)
            .map(([id, s]) => ({ id, label: id.charAt(0).toUpperCase() + id.slice(1) }));
    }, [tenant?.mealSlots]);

    useEffect(() => {
        if (!tenant?.id) return;
        setLoading(true);

        const unsubToday = subscribeToMenu(tenant.id, todayKey, (data) => {
            setMenuCache(prev => ({ ...prev, [todayKey]: data }));
            setLoading(false);
        });

        const unsubTomorrow = subscribeToMenu(tenant.id, tomorrowKey, (data) => {
            setMenuCache(prev => ({ ...prev, [tomorrowKey]: data }));
        });

        return () => {
            unsubToday();
            unsubTomorrow();
        };
    }, [tenant?.id, todayKey, tomorrowKey]);

    const getSlotData = (slot) => {
        const key = getSlotDateKey(slot, tenant);
        return menuCache[key]?.[slot];
    };

    const startEditing = (slot) => {
        setEditingSlot(slot);
        const existing = getSlotData(slot);

        if (existing) {
            setMealType(existing.type || 'ROTI_SABZI');
            if (existing.type === 'ROTI_SABZI' && existing.rotiSabzi) {
                setSabzi(existing.rotiSabzi.sabzi || "");
                setHalfPrice(String(existing.rotiSabzi.half?.price || "50"));
                setFullPrice(String(existing.rotiSabzi.full?.price || "80"));
                setFreeAddons(existing.rotiSabzi.freeAddons || []);

                const fullAdd = existing.rotiSabzi.full?.items?.find(i => !i.includes("Chapati") && !i.includes("Sabzi")) || "";
                if (FULL_ADDON_SUGGESTIONS.includes(fullAdd)) {
                    setFullAddon(fullAdd);
                    setShowCustomAddon(false);
                } else if (fullAdd) {
                    setFullAddon("");
                    setCustomFullAddon(fullAdd);
                    setShowCustomAddon(true);
                }
            } else if (existing.type === 'OTHER' && existing.other) {
                setOtherName(existing.other.name || "");
                setOtherPrice(String(existing.other.price || ""));
                setShowOtherInput(!OTHER_SUGGESTIONS.includes(existing.other.name));
            }
            setExtras(existing.extras?.map(e => ({ name: e.name, price: String(e.price) })) || [{ name: "Roti", price: "7" }]);
        } else {
            // Defaults
            setMealType('ROTI_SABZI');
            setSabzi("");
            setHalfPrice("50");
            setFullPrice("80");
            setFullAddon("Dal Rice");
            setCustomFullAddon("");
            setShowCustomAddon(false);
            setFreeAddons([]);
            setOtherName("");
            setOtherPrice("");
            setExtras([{ name: "Roti", price: "7" }]);
        }

        // Start animation
        setViewMode('edit');
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 1, duration: 300, useNativeDriver: true })
        ]).start();
    };

    const handleSave = async () => {
        if (!mealType) return Alert.alert("Error", "Select meal type");
        setIsSaving(true);

        const payload = {
            type: mealType,
            status: 'SET',
            extras: extras.filter(e => e.name && e.price).map(e => ({ name: e.name, price: Number(e.price) })),
        };

        if (mealType === 'ROTI_SABZI') {
            payload.rotiSabzi = {
                sabzi,
                half: {
                    items: ["4 Chapati", sabzi && `${sabzi} Sabzi`].filter(Boolean),
                    price: Number(halfPrice)
                },
                full: {
                    items: ["4 Chapati", sabzi && `${sabzi} Sabzi`, fullAddon || customFullAddon].filter(Boolean),
                    price: Number(fullPrice)
                },
                freeAddons
            };
        } else {
            if (!otherName || !otherPrice) {
                setIsSaving(false);
                return Alert.alert("Error", "Enter item name and price");
            }
            payload.other = { name: otherName, price: Number(otherPrice) };
        }

        const targetDate = getSlotDateKey(editingSlot, tenant);
        const result = await saveMenu(tenant.id, targetDate, { [editingSlot]: payload });
        setIsSaving(false);
        if (result.success) {
            // Animate back to summary
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]).start(() => {
                setViewMode('summary');
            });
        } else {
            Alert.alert("Error", result.error);
        }
    };

    const toggleFreeAddon = (a) => {
        setFreeAddons(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
    };

    if (loading) return <View style={tw`flex-1 items-center justify-center bg-[#faf9f6]`}><ActivityIndicator color="#ca8a04" /></View>;

    const { width } = Dimensions.get('window');
    const summaryTranslate = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -width] });
    const editTranslate = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [width, 0] });

    return (
        <View style={tw`flex-1 bg-[#faf9f6]`}>
            {/* Summary View */}
            <Animated.View style={[tw`absolute top-0 bottom-0 left-0 w-full`, { transform: [{ translateX: summaryTranslate }] }]}>
                {/* Absolute Header - Summary View */}
                <View style={tw`absolute pb-3 top-0 left-0 right-0 z-10`}>
                    <LinearGradient
                        colors={['#fff', '#faf9f6']}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={tw`px-6 pt-16 pb-8 rounded-b-[45px] shadow-sm border-b border-gray-100/50`}
                    >
                        <Text style={tw`text-2xl font-black text-gray-900`}>Daily Menu</Text>
                        <Text style={tw`text-yellow-600 text-[10px] font-black uppercase tracking-widest mt-0.5`}>Meals for {effectiveDateKey}</Text>
                    </LinearGradient>
                </View>

                <ScrollView
                    contentContainerStyle={tw`p-6 pt-48 pb-32`}
                    style={tw`flex-1`}
                    showsVerticalScrollIndicator={false}
                >
                    {activeSlots.map(m => {
                        const slot = m.id;
                        const data = getSlotData(slot);
                        const accent = slot === 'lunch' || slot === 'breakfast' ? 'yellow-400' : 'amber-500';

                        return (
                            <View key={slot} style={tw`mb-8`}>
                                <View style={tw`flex-row items-center gap-2 mb-4`}>
                                    <View style={tw`w-1 h-4 bg-${accent} rounded-full`} />
                                    <Text style={tw`text-xs font-black text-gray-400 uppercase tracking-widest`}>{slot}</Text>
                                </View>

                                {data ? (
                                    <View style={tw`bg-white rounded-3xl p-6 shadow-sm border border-gray-100`}>
                                        <View style={tw`flex-row justify-between items-start mb-4`}>
                                            <View>
                                                <Text style={tw`text-base font-black text-gray-900`}>{data.type === 'ROTI_SABZI' ? `Roti - ${data.rotiSabzi?.sabzi || 'Sabzi'}` : data.other?.name}</Text>
                                                <Text style={tw`text-xs text-gray-400 font-bold uppercase`}>{data.type.replace('_', ' ')}</Text>
                                            </View>
                                            <Pressable
                                                onPress={() => startEditing(slot)}
                                                style={tw`w-10 h-10 rounded-2xl bg-gray-50 items-center justify-center border border-gray-100`}
                                            >
                                                <PenTool size={18} color="#4b5563" />
                                            </Pressable>
                                        </View>

                                        {data.type === 'ROTI_SABZI' ? (
                                            <View style={tw`gap-3`}>
                                                <View style={tw`flex-row justify-between items-center bg-gray-50 p-3 rounded-2xl`}>
                                                    <View>
                                                        <Text style={tw`text-xs font-bold text-gray-900`}>Half Dabba</Text>
                                                        <Text style={tw`text-[10px] text-gray-400`}>{data.rotiSabzi.half.items.join(', ')}</Text>
                                                    </View>
                                                    <Text style={tw`font-black text-gray-900`}>₹{data.rotiSabzi.half.price}</Text>
                                                </View>
                                                <View style={tw`flex-row justify-between items-center bg-gray-50 p-3 rounded-2xl`}>
                                                    <View>
                                                        <Text style={tw`text-xs font-bold text-gray-900`}>Full Dabba</Text>
                                                        <Text style={tw`text-[10px] text-gray-400`}>{data.rotiSabzi.full.items.join(', ')}</Text>
                                                    </View>
                                                    <Text style={tw`font-black text-gray-900`}>₹{data.rotiSabzi.full.price}</Text>
                                                </View>
                                            </View>
                                        ) : (
                                            <View style={tw`flex-row justify-between items-center bg-gray-50 p-3 rounded-2xl`}>
                                                <Text style={tw`text-xs font-bold text-gray-900`}>Standard Price</Text>
                                                <Text style={tw`font-black text-gray-900`}>₹{data.other?.price}</Text>
                                            </View>
                                        )}
                                    </View>
                                ) : (
                                    <Pressable
                                        onPress={() => startEditing(slot)}
                                        style={tw`bg-white rounded-3xl p-8 border-2 border-dashed border-gray-200 items-center justify-center`}
                                    >
                                        <Plus size={32} color="#9ca3af" />
                                        <Text style={tw`text-gray-400 font-bold mt-2 uppercase text-xs tracking-widest`}>Set {slot} Menu</Text>
                                    </Pressable>
                                )}
                            </View>
                        );
                    })}
                </ScrollView>
            </Animated.View>

            {/* Edit View */}
            <Animated.View style={[tw`absolute top-0 bottom-0 left-0 w-full bg-[#faf9f6]`, { transform: [{ translateX: editTranslate }] }]}>
                {/* Absolute Header - Edit Mode */}
                <View style={tw`absolute pb-3 top-0 left-0 right-0 z-10`}>
                    <LinearGradient
                        colors={['#fff', '#faf9f6']}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={tw`px-6 pt-16 pb-8 rounded-b-[45px] shadow-sm border-b border-gray-100/50`}
                    >
                        <View style={tw`flex-row items-center gap-4`}>
                            <Pressable
                                onPress={() => {
                                    Animated.parallel([
                                        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
                                    ]).start(() => setViewMode('summary'));
                                }}
                                style={tw`w-11 h-11 rounded-2xl bg-white items-center justify-center shadow-sm border border-gray-100`}
                            >
                                <ChevronLeft size={20} color="#111827" />
                            </Pressable>
                            <View>
                                <Text style={tw`text-2xl font-black text-gray-900 capitalize`}>Set {editingSlot}</Text>
                                <Text style={tw`text-yellow-600 text-[10px] font-black uppercase tracking-widest mt-0.5`}>Configuring Daily Meal</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                <ScrollView
                    contentContainerStyle={tw`p-6 pt-48 pb-32`}
                    style={tw`flex-1`}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Meal Type Toggle */}
                    <View style={tw`flex-row gap-3 mb-6`}>
                        {[{ label: "Roti-Sabzi", value: "ROTI_SABZI" }, { label: "Other", value: "OTHER" }].map(opt => (
                            <Pressable
                                key={opt.value}
                                onPress={() => setMealType(opt.value)}
                                style={[tw`flex-1 py-3.5 rounded-2xl items-center border`, mealType === opt.value ? tw`bg-yellow-100 border-yellow-400` : tw`bg-white border-gray-100`]}
                            >
                                <Text style={[tw`font-black text-xs uppercase tracking-wider`, mealType === opt.value ? tw`text-yellow-800` : tw`text-gray-400`]}>{opt.label}</Text>
                            </Pressable>
                        ))}
                    </View>

                    {mealType === 'ROTI_SABZI' ? (
                        <View>
                            <Text style={tw`text-xs font-semibold text-gray-500 uppercase mb-2 ml-1`}>Sabzi</Text>
                            <TextInput
                                style={tw`bg-white rounded-xl px-4 py-3 border border-gray-200 mb-4 font-bold text-gray-900 text-sm`}
                                placeholder="e.g. Gobi / Paneer"
                                placeholderTextColor="#9ca3af"
                                value={sabzi}
                                onChangeText={setSabzi}
                            />

                            <View style={tw`flex-row gap-3 mb-4`}>
                                <View style={tw`flex-1`}>
                                    <Text style={tw`text-xs font-semibold text-gray-500 uppercase mb-2 ml-1`}>Half Price</Text>
                                    <TextInput
                                        style={tw`bg-white rounded-xl px-4 py-3 border border-gray-200 font-bold text-gray-900 text-sm`}
                                        keyboardType="numeric"
                                        placeholder="₹50"
                                        placeholderTextColor="#9ca3af"
                                        value={halfPrice}
                                        onChangeText={setHalfPrice}
                                    />
                                </View>
                                <View style={tw`flex-1`}>
                                    <Text style={tw`text-xs font-semibold text-gray-500 uppercase mb-2 ml-1`}>Full Price</Text>
                                    <TextInput
                                        style={tw`bg-white rounded-xl px-4 py-3 border border-gray-200 font-bold text-gray-900 text-sm`}
                                        keyboardType="numeric"
                                        placeholder="₹80"
                                        placeholderTextColor="#9ca3af"
                                        value={fullPrice}
                                        onChangeText={setFullPrice}
                                    />
                                </View>
                            </View>

                            {/* Add-ons */}
                            <Text style={tw`text-xs font-semibold text-gray-500 uppercase mb-2 ml-1`}>Full Dabba Add-on</Text>
                            <View style={tw`flex-row flex-wrap gap-2 mb-4`}>
                                {FULL_ADDON_SUGGESTIONS.map(a => (
                                    <Pressable
                                        key={a}
                                        onPress={() => { setFullAddon(a); setShowCustomAddon(false); }}
                                        style={[tw`px-3.5 py-2 rounded-xl border`, fullAddon === a ? tw`bg-emerald-100 border-emerald-400` : tw`bg-white border-gray-200`]}
                                    >
                                        <Text style={[tw`text-[10px] font-black uppercase tracking-wide`, fullAddon === a ? tw`text-emerald-700` : tw`text-gray-500`]}>+ {a}</Text>
                                    </Pressable>
                                ))}
                                <Pressable
                                    onPress={() => { setFullAddon(""); setShowCustomAddon(true); }}
                                    style={[tw`px-3.5 py-2 rounded-xl border`, showCustomAddon ? tw`bg-gray-100 border-gray-400` : tw`bg-white border-gray-200`]}
                                >
                                    <Text style={tw`text-[10px] font-black uppercase tracking-wide text-gray-500`}>+ Other</Text>
                                </Pressable>
                            </View>

                            {showCustomAddon && (
                                <TextInput
                                    style={tw`bg-white rounded-xl px-4 py-3 border border-gray-200 mb-4 font-bold text-gray-900 text-sm`}
                                    placeholder="Custom Add-on"
                                    placeholderTextColor="#9ca3af"
                                    value={customFullAddon}
                                    onChangeText={setCustomFullAddon}
                                />
                            )}

                            {/* Free Add-ons */}
                            <Text style={tw`text-xs font-semibold text-gray-500 uppercase mb-2 ml-1`}>Free Add-ons</Text>
                            <View style={tw`flex-row flex-wrap gap-2 mb-6`}>
                                {FREE_ADDONS.map(a => (
                                    <Pressable
                                        key={a}
                                        onPress={() => toggleFreeAddon(a)}
                                        style={[tw`px-3.5 py-2 rounded-xl border`, freeAddons.includes(a) ? tw`bg-yellow-100 border-yellow-400` : tw`bg-white border-gray-200`]}
                                    >
                                        <Text style={[tw`text-[10px] font-black uppercase tracking-wide`, freeAddons.includes(a) ? tw`text-yellow-700` : tw`text-gray-500`]}>{a}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                    ) : (
                        <View>
                            <Text style={tw`text-xs font-semibold text-gray-500 uppercase mb-2 ml-1`}>Meal Name</Text>
                            <View style={tw`flex-row flex-wrap gap-2 mb-4`}>
                                {OTHER_SUGGESTIONS.map(o => (
                                    <Pressable
                                        key={o}
                                        onPress={() => { setOtherName(o); setShowOtherInput(false); }}
                                        style={[tw`px-3.5 py-2 rounded-xl border`, otherName === o ? tw`bg-yellow-100 border-yellow-400` : tw`bg-white border-gray-200`]}
                                    >
                                        <Text style={[tw`text-[10px] font-black uppercase tracking-wide`, otherName === o ? tw`text-yellow-700` : tw`text-gray-500`]}>{o}</Text>
                                    </Pressable>
                                ))}
                                <Pressable
                                    onPress={() => { setOtherName(""); setShowOtherInput(true); }}
                                    style={[tw`px-3.5 py-2 rounded-xl border`, showOtherInput ? tw`bg-gray-100 border-gray-400` : tw`bg-white border-gray-200`]}
                                >
                                    <Text style={tw`text-[10px] font-black uppercase tracking-wide text-gray-500`}>+ Other</Text>
                                </Pressable>
                            </View>

                            {showOtherInput && (
                                <TextInput
                                    style={tw`bg-white rounded-xl px-4 py-3 border border-gray-200 mb-4 font-bold text-gray-900`}
                                    placeholder="Custom Meal Name"
                                    value={otherName}
                                    onChangeText={setOtherName}
                                />
                            )}

                            <Text style={tw`text-xs font-semibold text-gray-500 uppercase mb-2 ml-1`}>Price</Text>
                            <TextInput
                                style={tw`bg-white rounded-xl px-4 py-3 border border-gray-200 mb-4 font-bold text-gray-900`}
                                keyboardType="numeric"
                                placeholder="₹"
                                value={otherPrice}
                                onChangeText={setOtherPrice}
                            />
                        </View>
                    )}

                    {/* Extras */}
                    <Text style={tw`text-xs font-semibold text-gray-500 uppercase mb-2 ml-1`}>Extras</Text>
                    {extras.map((e, i) => (
                        <View key={i} style={tw`flex-row gap-2 mb-2`}>
                            <TextInput
                                style={tw`flex-2 bg-white rounded-xl px-4 py-3 border border-gray-200 font-bold text-gray-900 text-xs`}
                                placeholder="Extra Item"
                                value={e.name}
                                onChangeText={(val) => {
                                    const copy = [...extras];
                                    copy[i].name = val;
                                    setExtras(copy);
                                }}
                            />
                            <TextInput
                                style={tw`flex-1 bg-white rounded-xl px-4 py-3 border border-gray-200 font-bold text-gray-900 text-xs`}
                                placeholder="Price"
                                keyboardType="numeric"
                                value={e.price}
                                onChangeText={(val) => {
                                    const copy = [...extras];
                                    copy[i].price = val;
                                    setExtras(copy);
                                }}
                            />
                            <Pressable
                                onPress={() => setExtras(extras.filter((_, idx) => idx !== i))}
                                style={tw`w-10 bg-red-50 rounded-2xl items-center justify-center border border-red-100`}
                            >
                                <X size={16} color="#b91c1c" />
                            </Pressable>
                        </View>
                    ))}
                    <Pressable
                        onPress={() => setExtras([...extras, { name: "", price: "" }])}
                        style={tw`bg-gray-50 rounded-xl py-3 items-center border border-gray-200 mt-2`}
                    >
                        <Text style={tw`text-xs font-bold text-gray-500 uppercase tracking-widest`}>+ Add Extra</Text>
                    </Pressable>

                    {/* Save Button */}
                    <Pressable
                        onPress={handleSave}
                        disabled={isSaving}
                        style={[tw`bg-yellow-600 rounded-3xl py-5 shadow-lg mt-10 items-center justify-center`, isSaving && tw`opacity-70`]}
                    >
                        {isSaving ? <ActivityIndicator color="white" /> : <Text style={tw`text-white font-black text-base uppercase tracking-widest`}>Save {editingSlot} Menu</Text>}
                    </Pressable>

                </ScrollView>
            </Animated.View>
        </View>
    );
};
