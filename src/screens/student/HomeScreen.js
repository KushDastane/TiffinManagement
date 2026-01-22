import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    Pressable,
    ScrollView,
    ActivityIndicator,
    ImageBackground,
    RefreshControl
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useTenant } from "../../contexts/TenantContext";
import {
    subscribeToMenu,
    getEffectiveMenuDateKey,
    getEffectiveMealSlot,
} from "../../services/menuService";
import {
    subscribeToMyOrders,
} from "../../services/orderService";
import { getStudentBalance } from "../../services/paymentService";
import { useTheme } from "../../contexts/ThemeContext";
import tw from 'twrnc';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from "@react-navigation/native";
import {
    CheckCircle,
    Clock,
    ArrowRight,
    CreditCard,
    Plus,
} from 'lucide-react-native';

const WalletCard = ({ balance, loading }) => {
    const navigation = useNavigation();
    return (
        <View style={tw`mb-6`}>
            <LinearGradient
                colors={['#111827', '#1f2937']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={tw`rounded-[35px] p-8 shadow-2xl border border-gray-800`}
            >
                <View style={tw`flex-row justify-between items-center mb-10`}>
                    <View style={tw`w-10 h-10 rounded-xl bg-white/5 items-center justify-center border border-white/10`}>
                        <CreditCard size={18} color="#9ca3af" />
                    </View>
                    <View style={tw`bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/20`}>
                        <Text style={tw`text-[8px] font-black text-yellow-500 uppercase tracking-widest`}>Premium Wallet</Text>
                    </View>
                </View>

                {loading ? <ActivityIndicator color="white" /> : (
                    <View style={tw`mb-10`}>
                        <Text style={tw`text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1`}>Available Balance</Text>
                        <Text style={tw`text-5xl font-black text-white tracking-tighter`}>
                            ₹{balance?.toFixed(0) || 0}
                        </Text>
                        <View style={tw`flex-row items-center gap-2 mt-3`}>
                            <View style={[tw`w-1.5 h-1.5 rounded-full`, balance < 0 ? tw`bg-red-500` : tw`bg-yellow-400`]} />
                            <Text style={tw`text-[9px] font-black uppercase tracking-widest ${balance < 0 ? 'text-red-400' : 'text-yellow-400/80'}`}>
                                {balance < 0 ? "Action Required" : "Credit Status: Good"}
                            </Text>
                        </View>
                    </View>
                )}

                <Pressable
                    onPress={() => navigation.navigate('Khata')}
                    style={({ pressed }) => [
                        tw`w-full bg-yellow-400 rounded-2xl py-4 flex-row items-center justify-center gap-2 shadow-lg`,
                        pressed && tw`opacity-90 scale-[0.98]`
                    ]}
                >
                    <Plus size={16} color="black" strokeWidth={3} />
                    <Text style={tw`text-black font-black text-[11px] uppercase tracking-widest`}>Add Money</Text>
                </Pressable>
            </LinearGradient>
        </View>
    );
};

const WeekSummary = ({ orders }) => {
    const navigation = useNavigation();
    const { primaryColor } = useTheme();

    const days = useMemo(() => {
        const d = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            d.push(date);
        }
        return d;
    }, []);

    const hasOrder = (date) => {
        const dateStr = date.toISOString().split("T")[0];
        return orders.some((o) => o.dateId === dateStr || o.orderDate === dateStr);
    };

    return (
        <View style={tw`bg-white rounded-[35px] p-7 shadow-sm border border-gray-100 mb-6`}>
            <View style={tw`flex-row justify-between items-center mb-10`}>
                <View>
                    <Text style={tw`text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-1`}>Meal Schedule</Text>
                    <Text style={tw`font-black text-gray-900 text-xl`}>Weekly Planner</Text>
                </View>
                <Pressable
                    onPress={() => navigation.navigate("History")}
                    style={tw`w-10 h-10 rounded-xl bg-gray-50 items-center justify-center border border-gray-100`}
                >
                    <ArrowRight size={14} color="#9ca3af" />
                </Pressable>
            </View>

            <View style={tw`flex-row justify-between px-1`}>
                {days.map((date, index) => {
                    const ordered = hasOrder(date);
                    const isToday = index === 0;

                    return (
                        <View key={index} style={tw`items-center gap-3`}>
                            <View style={[
                                tw`w-11 h-11 rounded-2xl items-center justify-center border`,
                                ordered
                                    ? tw`bg-gray-900 border-gray-900 shadow-lg shadow-gray-200`
                                    : (isToday ? tw`bg-yellow-400 border-yellow-400 shadow-lg shadow-yellow-100` : tw`bg-gray-50 border-gray-50`)
                            ]}>
                                <Text style={[
                                    tw`text-[11px] font-black uppercase`,
                                    ordered ? tw`text-white` : (isToday ? tw`text-gray-900` : tw`text-gray-400`)
                                ]}>
                                    {date.toLocaleDateString("en-US", { weekday: "narrow" })}
                                </Text>
                            </View>
                            <View style={[
                                tw`w-1.5 h-1.5 rounded-full`,
                                ordered ? tw`bg-yellow-400` : (isToday ? tw`bg-gray-200` : tw`bg-transparent`)
                            ]} />
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

export const HomeScreen = () => {
    const { user, userProfile } = useAuth();
    const { tenant } = useTenant();
    const navigation = useNavigation();

    // Data State
    const [balance, setBalance] = useState(0);
    const [myOrders, setMyOrders] = useState([]);
    const [todaysOrder, setTodaysOrder] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const activeSlot = getEffectiveMealSlot(); // 'lunch' or 'dinner'
    const dateId = getEffectiveMenuDateKey();

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 17) return "Good Afternoon";
        return "Good Evening";
    };

    const fetchData = async () => {
        if (!tenant?.id || !user?.uid) return;
        setLoading(true);
        try {
            const ledger = await getStudentBalance(tenant.id, user.uid);
            setBalance(ledger.balance);
        } catch (e) { console.log(e) }
        setLoading(false);
    };

    useEffect(() => {
        if (!tenant?.id || !user?.uid) return;

        const unsubOrders = subscribeToMyOrders(tenant.id, user.uid, (data) => {
            setMyOrders(data);
            const today = data.find(o => o.dateId === dateId && o.slot === activeSlot);
            setTodaysOrder(today);
        });

        fetchData();
        return () => unsubOrders();
    }, [tenant?.id, user?.uid, dateId, activeSlot]);


    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const kitchenOpen = activeSlot && (
        (activeSlot === 'lunch' && new Date().getHours() < 15) ||
        (activeSlot === 'dinner' && new Date().getHours() < 21)
    );

    return (
        <View style={tw`flex-1 bg-[#faf9f6]`}>
            {/* Creative Header - Soft Hook */}
            <LinearGradient
                colors={['#fef9c3', '#faf9f6']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={tw`pt-14 pb-12 px-6 rounded-b-[45px] shadow-sm`}
            >
                <View style={tw`flex-row justify-between items-start`}>
                    <View>
                        <View style={tw`flex-row items-center gap-2 mb-2`}>
                            <View style={tw`w-2 h-2 rounded-full bg-yellow-400`} />
                            <Text style={tw`text-[9px] font-black text-gray-500 uppercase tracking-widest`}>
                                {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short" })}
                            </Text>
                        </View>
                        <Text style={tw`text-3xl font-black text-gray-900 leading-tight`}>
                            {getGreeting()},{"\n"}
                            <Text style={tw`text-yellow-600 font-black`}>{userProfile?.name?.split(' ')[0] || 'User'}</Text>
                        </Text>
                    </View>

                    <View style={tw`items-end gap-4`}>
                        <View style={[
                            tw`px-3 py-1.5 rounded-xl border border-white bg-white/60`,
                        ]}>
                            <Text style={[tw`text-[9px] font-black uppercase tracking-widest`, kitchenOpen ? tw`text-green-600` : tw`text-gray-400`]}>
                                {kitchenOpen ? 'Kitchen Open' : 'Closed'}
                            </Text>
                        </View>
                        <View style={tw`w-14 h-14 rounded-[20px] bg-white items-center justify-center shadow-lg shadow-yellow-100 border border-white`}>
                            <Text style={tw`text-2xl`}>🍛</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                style={tw`flex-1 px-6 -mt-6`}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={tw`pb-32`}
            >
                {/* Today's Meal Status Card - Creative Refresh */}
                <View style={tw`bg-white rounded-[35px] p-7 shadow-sm border border-gray-100 mb-6 overflow-hidden`}>
                    <View style={tw`absolute -top-10 -right-10 w-32 h-32 bg-yellow-50 rounded-full opacity-40`} />

                    <View style={tw`flex-row justify-between items-center mb-8`}>
                        <View style={tw`flex-row items-center gap-4`}>
                            <View style={tw`w-14 h-14 rounded-2xl bg-gray-900 items-center justify-center shadow-lg shadow-gray-200`}>
                                <Text style={tw`text-2xl`}>
                                    {!todaysOrder ? "🍱" : (todaysOrder.status === 'CONFIRMED' ? "�" : "⏳")}
                                </Text>
                            </View>
                            <View>
                                <Text style={tw`text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-1`}>
                                    Dashboard • {activeSlot?.toUpperCase() || 'Meal'}
                                </Text>
                                <Text style={tw`text-xl font-black text-gray-900`}>
                                    {!todaysOrder ? "Thali Empty" : (todaysOrder.status === 'CONFIRMED' ? "Order Ready" : "Verifying...")}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={tw`bg-gray-50 p-5 rounded-2xl mb-8 border border-gray-100/50`}>
                        <Text style={tw`text-[12px] font-bold text-gray-500 leading-5 uppercase tracking-tighter`}>
                            {!todaysOrder ? (
                                kitchenOpen ? "The kitchen is buzzing! Secure your homemade meal before the doors close." : "Kitchen shifts have ended. Make sure to check back tomorrow morning!"
                            ) : (
                                todaysOrder.status === 'CONFIRMED' ?
                                    "Your meal is being crafted by our best chefs. Standard delivery protocols active." :
                                    "Patience is a virtue! We are currently synchronizing your order with the kitchen."
                            )}
                        </Text>
                    </View>

                    {kitchenOpen && !todaysOrder && (
                        <Pressable
                            onPress={() => navigation.navigate("Order")}
                            style={tw`bg-gray-900 rounded-2xl py-5 flex-row items-center justify-center gap-3 shadow-xl shadow-gray-300`}
                        >
                            <Text style={tw`text-white font-black text-[11px] uppercase tracking-widest`}>Craft My Thali</Text>
                            <ArrowRight size={16} color="white" />
                        </Pressable>
                    )}

                    {todaysOrder && (
                        <Pressable
                            onPress={() => navigation.navigate("History")}
                            style={tw`bg-white rounded-2xl py-5 flex-row items-center justify-center gap-3 border border-gray-200 shadow-sm`}
                        >
                            <Text style={tw`text-gray-900 font-black text-[11px] uppercase tracking-widest`}>View Details</Text>
                            <ArrowRight size={16} color="#111827" />
                        </Pressable>
                    )}
                </View>

                {/* Weekly Summary */}
                <WeekSummary orders={myOrders} />

                {/* Wallet Balance */}
                <WalletCard balance={balance} loading={loading} />

            </ScrollView>
        </View>
    );
};
