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
                colors={['#1c1c1c', '#2b2b2b']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={tw`rounded-3xl p-8 shadow-lg`}
            >
                <View style={tw`flex-row items-center gap-2 mb-6`}>
                    <CreditCard size={20} color="#9ca3af" />
                    <Text style={tw`text-sm text-gray-400 font-medium`}>Your Wallet Balance</Text>
                </View>

                {loading ? <ActivityIndicator color="white" /> : (
                    <View>
                        <Text style={tw`text-4xl font-bold text-white mb-2`}>
                            ₹{balance?.toFixed(0) || 0}
                        </Text>
                        <Text style={tw`text-sm text-green-400 mb-8 font-medium`}>
                            Enough for approx. {Math.floor((balance || 0) / 50)} meals
                        </Text>
                    </View>
                )}

                <Pressable
                    onPress={() => navigation.navigate('Khata')}
                    style={tw`w-full bg-yellow-400 rounded-xl py-3 flex-row items-center justify-center gap-2 shadow-sm`}
                >
                    <Plus size={18} color="black" strokeWidth={2.5} />
                    <Text style={tw`text-black font-bold text-base`}>Add Money</Text>
                </Pressable>
            </LinearGradient>
        </View>
    );
};

const WeekSummary = ({ orders }) => {
    const navigation = useNavigation();
    const { primaryColor } = useTheme();

    // Generate last 7 days including today
    const days = useMemo(() => {
        const d = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i); // Showing COMING week or PAST week? Web app shows "This Week's Meals". Let's show next 7 days for planning. 
            // WAIT, logic from web app: creates dates. 
            // `weekDates` usually implies current week. 
            // Let's stick to "Next 7 Days" as it's more useful for planning.
            d.push(date);
        }
        return d;
    }, []);

    const hasOrder = (date) => {
        const dateStr = date.toISOString().split("T")[0];
        // naive check against orders list (assuming orders have dateId YYYY-MM-DD or similar)
        // Adjust based on actual data structure of 'orders'
        return orders.some((o) => o.dateId === dateStr || o.orderDate === dateStr);
    };

    return (
        <View style={tw`bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6`}>
            <View style={tw`flex-row justify-between items-center mb-6`}>
                <Text style={tw`font-bold text-gray-900 text-lg`}>This Week</Text>
                <Pressable onPress={() => navigation.navigate("History")}>
                    <Text style={tw`text-sm text-yellow-600 font-bold`}>Full Menu</Text>
                </Pressable>
            </View>

            <View style={tw`flex-row justify-between`}>
                {days.map((date, index) => {
                    const ordered = hasOrder(date);
                    const isToday = index === 0;

                    return (
                        <View key={index} style={tw`items-center gap-2`}>
                            <View style={[
                                tw`w-10 h-10 rounded-xl items-center justify-center`,
                                ordered ? tw`bg-green-100` : (isToday ? tw`bg-yellow-100 border border-yellow-200` : tw`bg-gray-100`)
                            ]}>
                                <Text style={[
                                    tw`text-xs font-bold`,
                                    ordered ? tw`text-green-700` : (isToday ? tw`text-yellow-700` : tw`text-gray-400`)
                                ]}>
                                    {date.toLocaleDateString("en-US", { weekday: "narrow" })}
                                </Text>
                            </View>
                            {ordered && <View style={tw`w-1.5 h-1.5 rounded-full bg-green-500`} />}
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
            // Find today's order
            const today = data.find(o => o.dateId === dateId && o.mealType === activeSlot?.toUpperCase());
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

    // Derived State
    const kitchenOpen = activeSlot && (
        (activeSlot === 'lunch' && new Date().getHours() < 15) ||
        (activeSlot === 'dinner' && new Date().getHours() < 21)
    );

    return (
        <View style={tw`flex-1 bg-[#fffaf2]`}>
            {/* Header / Gradient Background */}
            <LinearGradient
                colors={['#fef9c3', '#fffaf2']} // Yellow-100 to cream
                style={tw`pt-14 pb-8 px-6 rounded-b-3xl`}
            >
                <View style={tw`flex-row justify-between items-start mb-6`}>
                    <View>
                        <Text style={tw`text-xs uppercase tracking-wide text-gray-500 font-bold mb-1`}>
                            {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short" })}
                        </Text>
                        <Text style={tw`text-2xl font-bold text-gray-900`}>
                            {getGreeting()}, <Text style={tw`text-yellow-600`}>{userProfile?.name?.split(' ')[0] || 'User'}</Text>
                        </Text>
                        <Text style={tw`text-gray-600 text-sm font-medium mt-1`}>
                            Plan your {activeSlot ? activeSlot.charAt(0).toUpperCase() + activeSlot.slice(1) : 'Meal'}!
                        </Text>
                    </View>

                    <View style={[
                        tw`px-3 py-1 rounded-full border`,
                        kitchenOpen
                            ? tw`bg-green-100 border-green-200`
                            : tw`bg-gray-100 border-gray-200`
                    ]}>
                        <Text style={[
                            tw`text-xs font-bold`,
                            kitchenOpen ? tw`text-green-800` : tw`text-gray-600`
                        ]}>
                            {kitchenOpen ? 'Kitchen Open' : 'Closed'}
                        </Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                style={tw`flex-1 px-6 -mt-4`}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={tw`pb-32`}
            >
                {/* Today's Meal Status Card */}
                <View style={tw`bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6`}>
                    <View style={tw`flex-row justify-between items-start mb-4`}>
                        <View style={tw`flex-row items-center gap-3`}>
                            <View style={tw`w-10 h-10 rounded-xl bg-yellow-100 items-center justify-center`}>
                                <Text style={tw`text-lg`}>🥘</Text>
                            </View>
                            <View style={tw`bg-yellow-100 px-3 py-1 rounded-full`}>
                                <Text style={tw`text-[10px] font-bold text-yellow-800 uppercase`}>
                                    TODAY'S {activeSlot?.toUpperCase() || 'MEAL'}
                                </Text>
                            </View>
                        </View>
                        {todaysOrder ? (
                            <CheckCircle size={28} color="#16a34a" fill="#dcfce7" />
                        ) : (
                            <Clock size={28} color="#f97316" fill="#ffedd5" />
                        )}
                    </View>

                    <Text style={tw`text-xl font-bold text-gray-900 mb-2`}>
                        {todaysOrder
                            ? "Meal Confirmed"
                            : "No Order Placed"}
                    </Text>

                    <Text style={tw`text-gray-500 font-medium text-sm mb-6 leading-5`}>
                        {todaysOrder
                            ? "Your tiffin is being prepared with care."
                            : kitchenOpen
                                ? "Place your order before the cutoff time."
                                : "Ordering is currently closed."}
                    </Text>

                    {kitchenOpen && !todaysOrder && (
                        <Pressable
                            onPress={() => navigation.navigate("Order")}
                            style={tw`bg-yellow-400 rounded-xl py-3 flex-row items-center justify-center gap-2`}
                        >
                            <Text style={tw`text-black font-bold text-base`}>Place Order</Text>
                            <ArrowRight size={18} color="black" strokeWidth={2.5} />
                        </Pressable>
                    )}

                    {todaysOrder && (
                        <Pressable
                            onPress={() => navigation.navigate("Order")} // Or OrderDetails?
                            style={tw`bg-gray-100 rounded-xl py-3 flex-row items-center justify-center gap-2`}
                        >
                            <Text style={tw`text-gray-900 font-bold text-base`}>View Order</Text>
                            <ArrowRight size={18} color="#111827" strokeWidth={2.5} />
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
