import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    Pressable,
    ScrollView,
    ActivityIndicator,
    ImageBackground,
    RefreshControl,
    Alert
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useTenant } from "../../contexts/TenantContext";
import {
    subscribeToMenu,
    getEffectiveMenuDateKey,
    getEffectiveMealSlot,
    getAvailableSlots,
    getBusinessDate,
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
    Coffee,
    Sun,
    UtensilsCrossed,
    Moon,
    ChevronDown,
    ChefHat
} from 'lucide-react-native';
import { switchKitchen } from "../../services/kitchenService";

const KitchenSelector = ({ joinedKitchens, currentKitchen, onSwitch }) => {
    const [showOptions, setShowOptions] = useState(false);

    if (joinedKitchens.length <= 1) return null;

    return (
        <View style={tw`z-50`}>
            <Pressable
                onPress={() => setShowOptions(!showOptions)}
                style={tw`flex-row items-center bg-white/40 px-3 py-1.5 rounded-full border border-white/20`}
            >
                <ChefHat size={14} color="#ca8a04" style={tw`mr-2`} />
                <Text style={tw`text-[10px] font-black text-gray-700 uppercase tracking-widest mr-1`}>
                    {currentKitchen?.name || 'Kitchen'}
                </Text>
                <ChevronDown size={12} color="#ca8a04" />
            </Pressable>

            {showOptions && (
                <View style={tw`absolute top-10 right-0 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 w-48`}>
                    <Text style={tw`text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2 mt-1`}>
                        Switch Kitchen
                    </Text>
                    {joinedKitchens.map((k) => (
                        <Pressable
                            key={k.id}
                            onPress={() => {
                                onSwitch(k.id);
                                setShowOptions(false);
                            }}
                            style={[
                                tw`p-3 rounded-xl mb-1 flex-row items-center justify-between`,
                                k.id === currentKitchen?.id ? tw`bg-yellow-50` : tw`bg-transparent`
                            ]}
                        >
                            <Text style={[
                                tw`text-xs font-bold`,
                                k.id === currentKitchen?.id ? tw`text-yellow-700` : tw`text-gray-600`
                            ]}>
                                {k.name}
                            </Text>
                            {k.id === currentKitchen?.id && <View style={tw`w-1.5 h-1.5 rounded-full bg-yellow-400`} />}
                        </Pressable>
                    ))}
                </View>
            )}
        </View>
    );
};

const WalletCard = ({ balance, loading }) => {
    const navigation = useNavigation();
    return (
        <View style={tw`mb-8`}>
            <LinearGradient
                colors={['#0f172a', '#1e293b', '#020617']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={tw`rounded-[40px] p-8 shadow-2xl relative overflow-hidden border border-white/5`}
            >
                {/* Decorative Background Elements */}
                <View style={[tw`absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full`, { transform: [{ scale: 1.5 }] }]} />
                <View style={[tw`absolute -bottom-20 -left-10 w-32 h-32 bg-yellow-500/5 rounded-full`, { transform: [{ scale: 2 }] }]} />

                <View style={tw`flex-row justify-between items-center mb-12`}>
                    <View style={tw`gap-1`}>
                        <View style={tw`w-12 h-9 rounded-lg bg-yellow-400/20 border border-yellow-400/30 items-center justify-center overflow-hidden`}>
                            <LinearGradient
                                colors={['#fbbf24', '#f59e0b']}
                                style={tw`w-full h-full opacity-30`}
                            />
                            <View style={tw`absolute w-full h-[1px] bg-yellow-400/20 top-3`} />
                            <View style={tw`absolute w-full h-[1px] bg-yellow-400/20 top-6`} />
                            <View style={tw`absolute h-full w-[1px] bg-yellow-400/20 left-4`} />
                            <View style={tw`absolute h-full w-[1px] bg-yellow-400/20 left-8`} />
                        </View>
                    </View>
                    <View style={tw`bg-white/5 px-4 py-1.5 rounded-full border border-white/10`}>
                        <Text style={tw`text-[8px] font-black text-white/60 uppercase tracking-widest`}>E-Wallet</Text>
                    </View>
                </View>

                {loading ? (
                    <View style={tw`mb-12 items-start`}>
                        <ActivityIndicator color="#fbbf24" />
                    </View>
                ) : (
                    <View style={tw`mb-12`}>
                        <Text style={tw`text-[10px] font-black text-white/40 uppercase tracking-widest mb-2`}>Current Balance</Text>
                        <View style={tw`flex-row items-baseline`}>
                            <Text style={tw`text-5xl font-black ${balance < 0 ? 'text-red-400' : 'text-white'} tracking-tighter`}>
                                ₹{balance?.toFixed(0) || 0}
                            </Text>
                            <Text style={tw`text-lg font-black ${balance < 0 ? 'text-red-400/60' : 'text-white/40'} ml-1 mb-1`}>.00</Text>
                        </View>
                        <View style={tw`flex-row items-center gap-2 mt-4`}>
                            <View style={[tw`w-2 h-2 rounded-full`, balance < 0 ? tw`bg-red-500` : tw`bg-emerald-400 shadow-lg shadow-emerald-500/50`]} />
                            <Text style={tw`text-[9px] font-black uppercase tracking-widest ${balance < 0 ? 'text-red-400' : 'text-emerald-400/80'}`}>
                                {balance < 0 ? "Dues Alert" : "Sufficient Balance"}
                            </Text>
                        </View>
                    </View>
                )}
                <Pressable
                    onPress={() => navigation.navigate('Khata')}
                    style={({ pressed }) => [
                        tw`w-full bg-black rounded-2xl py-4.5 flex-row items-center justify-center gap-3 shadow-xl`,
                        pressed && tw`opacity-90 scale-[0.98]`
                    ]}
                >
                    <View style={tw`bg-yellow-400/60 w-6 h-6 rounded-lg items-center justify-center`}>
                        <Plus size={12} color="white" strokeWidth={4} />
                    </View>
                    <Text style={tw`text-gray-100 font-black text-[11px] uppercase tracking-widest`}>Add Funds</Text>
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
        const businessNow = getBusinessDate(new Date());

        // Get the Monday of the current business week
        const currentDay = businessNow.getDay(); // 0 is Sunday, 1 is Monday ...
        const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay; // Adjust if Sunday

        const monday = new Date(businessNow);
        monday.setDate(businessNow.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);

        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            d.push(date);
        }
        return d;
    }, []);

    const hasOrder = (date) => {
        const dateStr = date.toISOString().split("T")[0];
        return orders.some((o) => o.dateId === dateStr || o.orderDate === dateStr);
    };

    const businessTodayStr = getBusinessDate(new Date()).toISOString().split("T")[0];

    return (
        <View style={tw`bg-white rounded-[35px] px-5 py-7 shadow-sm border border-gray-100 mb-6`}>
            <View style={tw`flex-row justify-between items-center mb-10 px-2`}>
                <View>
                    <Text style={tw`text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-1`}>Meal Schedule</Text>
                    <Text style={tw`font-black text-gray-900 text-xl`}>Weekly History</Text>
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
                    const dateStr = date.toISOString().split("T")[0];
                    const isToday = dateStr === businessTodayStr;

                    return (
                        <View key={index} style={tw`items-center gap-3`}>
                            <View style={[
                                tw`w-10 h-10 rounded-2xl items-center justify-center border relative`,
                                ordered
                                    ? tw`bg-emerald-50 border-emerald-100`
                                    : (isToday ? tw`bg-yellow-400 border-yellow-400 shadow-lg shadow-yellow-100` : tw`bg-gray-50 border-gray-50`)
                            ]}>
                                <Text style={[
                                    tw`text-[10px] font-black uppercase`,
                                    ordered ? tw`text-emerald-700` : (isToday ? tw`text-gray-900` : tw`text-gray-400`)
                                ]}>
                                    {date.toLocaleDateString("en-US", { weekday: "narrow" })}
                                </Text>

                                {ordered && (
                                    <View style={tw`absolute -top-1.5 -right-1.5 bg-emerald-500 rounded-full w-5 h-5 items-center justify-center border-2 border-white`}>
                                        <CheckCircle size={8} color="white" strokeWidth={4} />
                                    </View>
                                )}
                            </View>
                            <View style={[
                                tw`w-1.5 h-1.5 rounded-full`,
                                ordered ? tw`bg-emerald-400` : (isToday ? tw`bg-gray-200` : tw`bg-transparent`)
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
    const { tenant, joinedKitchens } = useTenant();
    const navigation = useNavigation();

    // Data State
    const [balance, setBalance] = useState(0);
    const [balanceLoading, setBalanceLoading] = useState(true);
    const [myOrders, setMyOrders] = useState([]);
    const [todaysOrder, setTodaysOrder] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const activeSlot = getEffectiveMealSlot(tenant);
    const dateId = getEffectiveMenuDateKey(tenant);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 17) return "Good Afternoon";
        return "Good Evening";
    };

    const fetchBalance = async () => {
        if (!tenant?.id || !user?.uid) return;
        setBalanceLoading(true);
        try {
            const ledger = await getStudentBalance(tenant.id, user.uid, userProfile?.phoneNumber);
            setBalance(ledger.balance);
        } catch (e) { console.log(e) }
        setBalanceLoading(false);
    };

    // Separate effect for balance - only runs when kitchen or user changes
    useEffect(() => {
        fetchBalance();
    }, [tenant?.id, user?.uid]);

    // Separate effect for orders - runs when dateId or activeSlot changes
    useEffect(() => {
        if (!tenant?.id || !user?.uid) return;

        const unsubOrders = subscribeToMyOrders(tenant.id, user.uid, userProfile?.phoneNumber, (data) => {
            setMyOrders(data);
            // 1. Try to find order for the SPECIFIC active slot
            let today = data.find(o => o.dateId === dateId && o.slot === activeSlot);

            // 2. Fallback: If no order for active slot, check for any COMPLETED order from today
            // (This handles case where Lunch slot ends but student hasn't collected Lunch yet)
            if (!today) {
                today = data.find(o => o.dateId === dateId && o.status === 'COMPLETED');
            }

            setTodaysOrder(today);
        });

        setLoading(false);
        return () => unsubOrders();
    }, [tenant?.id, user?.uid, dateId, activeSlot]);


    const onRefresh = async () => {
        setRefreshing(true);
        await fetchBalance();
        setRefreshing(false);
    };

    // Kitchen is considered open if there is an active slot currently available for ordering
    const kitchenOpen = getAvailableSlots(tenant).length > 0;

    // Menu State
    const [todaysMenu, setTodaysMenu] = useState(null);

    useEffect(() => {
        if (!tenant?.id) return;
        const unsubMenu = subscribeToMenu(tenant.id, dateId, (menu) => {
            setTodaysMenu(menu);
        });
        return () => unsubMenu();
    }, [tenant?.id, dateId]);

    // Derived Status for UI
    const orderStatus = todaysOrder ? todaysOrder.status : 'NO_ORDER';
    // Statuses: NO_ORDER, PENDING, CONFIRMED, COMPLETED

    const getStatusConfig = () => {
        switch (orderStatus) {
            case 'PENDING':
                return {
                    // Creative: Subtle Red/Orange Gradient
                    gradient: ['#fff1f2', '#fff'],
                    border: 'border-red-100',
                    iconBg: tw`bg-red-100`,
                    icon: <Clock size={24} color="#dc2626" />,
                    title: 'Waiting for Verification',
                    subtitle: 'Your order is awaiting admin confirmation.',
                    titleColor: tw`text-gray-900`,
                    subtitleColor: tw`text-gray-500`,
                    accentColor: '#fca5a5'
                };
            case 'CONFIRMED':
                return {
                    // Creative: Warm Yellow/Amber Gradient - INTENSIFIED
                    gradient: ['#fef9c3', '#fefce8'], // yellow-100 to yellow-50
                    border: 'border-yellow-300',
                    iconBg: tw`bg-yellow-200`,
                    icon: <UtensilsCrossed size={24} color="#b45309" />, // amber-700
                    title: 'Meal Being Prepared',
                    subtitle: 'Chefs are working their magic!',
                    titleColor: tw`text-gray-900`,
                    subtitleColor: tw`text-yellow-800`,
                    accentColor: '#fcd34d' // yellow-300
                };
            case 'COMPLETED':
                return {
                    // Creative: Fresh Emerald/Teal Gradient
                    gradient: ['#ecfdf5', '#fff'],
                    border: 'border-emerald-100',
                    iconBg: tw`bg-emerald-100`,
                    icon: <CheckCircle size={24} color="#059669" />,
                    title: 'Ready to Collect',
                    subtitle: 'Head to the counter to pick up your meal.',
                    titleColor: tw`text-gray-900`,
                    subtitleColor: tw`text-gray-500`,
                    accentColor: '#6ee7b7'
                };
            default: // NO_ORDER
                return {
                    // Creative: Clean Gray/Slate Gradient
                    gradient: ['#ffffff', '#f8fafc'],
                    border: 'border-gray-100',
                    iconBg: tw`bg-gray-50`,
                    icon: <UtensilsCrossed size={24} color="#94a3b8" />,
                    title: "You haven't ordered yet!",
                    subtitle: "Check out today's menu below.",
                    titleColor: tw`text-gray-900`,
                    subtitleColor: tw`text-gray-500`,
                    accentColor: '#e2e8f0'
                };
        }
    };

    const config = getStatusConfig();
    const activeMenu = todaysMenu?.mealSlots?.[activeSlot];

    const handleSwitchKitchen = async (kitchenId) => {
        if (kitchenId === tenant?.id) return;
        setLoading(true);
        const result = await switchKitchen(user.uid, kitchenId);
        if (result.error) Alert.alert("Error", result.error);
    };

    if (!tenant || !user) {
        return (
            <View style={tw`flex-1 bg-[#faf9f6] items-center justify-center`}>
                <ActivityIndicator color="#ca8a04" />
            </View>
        );
    }

    return (
        <View style={tw`flex-1  bg-[#faf9f6]`}>
            {/* Absolute Creative Header - Premium Hook */}
            <View style={tw`absolute top-0 left-0 right-0 z-10`}>
                <LinearGradient
                    colors={['#fef9c3', '#faf9f6']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={tw`pt-14 pb-12 mb-2 px-6 rounded-b-[45px] shadow-sm`}
                >
                    <View style={tw`flex-row  justify-between items-start`}>
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

                        <View style={tw`items-end gap-3`}>
                            <KitchenSelector
                                joinedKitchens={joinedKitchens}
                                currentKitchen={tenant}
                                onSwitch={handleSwitchKitchen}
                            />
                            <View style={[
                                tw`px-3 py-1.5 rounded-xl border border-white bg-white/60`,
                            ]}>
                                <Text style={[tw`text-[9px] font-black uppercase tracking-widest`, kitchenOpen ? tw`text-green-600` : tw`text-gray-400`]}>
                                    {kitchenOpen ? 'Kitchen Open' : 'Closed'}
                                </Text>
                            </View>
                            <View style={tw`w-14 h-14 rounded-[20px] bg-white items-center justify-center shadow-lg shadow-yellow-100 border border-white`}>
                                {activeSlot === 'breakfast' ? <Coffee size={24} color="#ca8a04" /> : (activeSlot === 'lunch' ? <Sun size={24} color="#ca8a04" /> : (activeSlot === 'snacks' ? <UtensilsCrossed size={24} color="#ca8a04" /> : <Moon size={24} color="#ca8a04" />))}
                            </View>
                        </View>
                    </View>
                </LinearGradient>
            </View>

            <ScrollView
                style={tw`flex-1`}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={tw`p-6 pt-56 pb-32`}
            >
                {/* Dynamic Status Card */}
                <View style={[tw`rounded-[32px] mb-6 mt-7 shadow-xl shadow-gray-200/50`, { backgroundColor: 'white' }]}>
                    <LinearGradient
                        colors={config.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[tw`p-7 rounded-[32px] overflow-hidden border`, tw`${config.border}`]}
                    >
                        {/* Creative Background Decor */}
                        <View style={[tw`absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-20`, { backgroundColor: config.accentColor }]} />
                        <View style={[tw`absolute top-10 -right-4 w-12 h-12 rounded-full opacity-10`, { backgroundColor: config.accentColor }]} />

                        <View style={tw`flex-row justify-between items-start mb-6`}>
                            <View style={tw`flex-1 mr-4`}>
                                {/* !Important: Exclamation Logic for Empty State */}
                                {orderStatus === 'NO_ORDER' && (
                                    <View style={tw`bg-white self-start px-2.5 py-1 rounded-full mb-3 border border-red-50 shadow-sm`}>
                                        <Text style={tw`text-red-500 text-[9px] font-black uppercase tracking-widest`}>Order Now</Text>
                                    </View>
                                )}

                                <Text style={tw`text-[9px] font-black uppercase tracking-widest mb-1 text-gray-400`}>
                                    {activeSlot?.toUpperCase() || 'MEAL'}
                                </Text>
                                <Text style={[tw`text-2xl font-black`, config.titleColor]}>
                                    {config.title}
                                </Text>
                                <Text style={[tw`text-xs font-medium mt-1`, config.subtitleColor]}>
                                    {config.subtitle}
                                </Text>
                            </View>
                            <View style={[
                                tw`w-14 h-14 rounded-2xl items-center justify-center shadow-sm bg-white`,
                            ]}>
                                {config.icon}
                            </View>
                        </View>

                        {/* Menu Preview Section (Only show if NO_ORDER and Kitchen is Open) */}
                        {orderStatus === 'NO_ORDER' && kitchenOpen && activeMenu && (
                            <View style={tw`bg-white/60 rounded-2xl p-4 border border-white/50 mb-6`}>
                                <Text style={tw`text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3`}>On the Menu Today</Text>
                                <View style={tw`gap-2`}>
                                    <View style={tw`flex-row items-center gap-2`}>
                                        <View style={tw`w-1.5 h-1.5 rounded-full bg-gray-900`} />
                                        <Text style={tw`text-sm font-bold text-gray-700`}>{activeMenu.mainItem}</Text>
                                    </View>
                                    {activeMenu.sabzi && (
                                        <View style={tw`flex-row items-center gap-2`}>
                                            <View style={tw`w-1.5 h-1.5 rounded-full bg-gray-900`} />
                                            <Text style={tw`text-sm font-bold text-gray-700`}>{activeMenu.sabzi}</Text>
                                        </View>
                                    )}
                                    {activeMenu.dal && (
                                        <View style={tw`flex-row items-center gap-2`}>
                                            <View style={tw`w-1.5 h-1.5 rounded-full bg-gray-900`} />
                                            <Text style={tw`text-sm font-bold text-gray-700`}>{activeMenu.dal}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* Order Details (For Pending/Confirmed/Completed) */}
                        {orderStatus !== 'NO_ORDER' && todaysOrder && (
                            <View style={tw`bg-white/60 rounded-2xl p-4 border border-white/50 mb-2`}>
                                <Text style={tw`text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1`}>Your Order</Text>
                                <Text style={tw`text-base font-bold text-gray-800`}>
                                    {todaysOrder.quantity} × {todaysOrder.mainItem}
                                </Text>
                                {todaysOrder.componentsSnapshot?.length > 0 && (
                                    <Text style={tw`text-xs text-gray-500 mt-1`}>
                                        With: {todaysOrder.componentsSnapshot.map(c => c.name).join(', ')}
                                    </Text>
                                )}
                            </View>
                        )}

                        {/* Actions - Only for Ordering */}
                        {orderStatus === 'NO_ORDER' && (
                            kitchenOpen ? (
                                <Pressable
                                    onPress={() => navigation.navigate("Order")}
                                    style={tw`bg-gray-900 rounded-2xl py-4 flex-row items-center justify-center gap-2 shadow-xl shadow-gray-300`}
                                >
                                    <Text style={tw`text-white font-bold text-xs uppercase tracking-widest`}>Place Order</Text>
                                    <ArrowRight size={14} color="white" />
                                </Pressable>
                            ) : (
                                <View style={tw`bg-gray-100 rounded-2xl py-3 items-center justify-center`}>
                                    <Text style={tw`text-gray-400 font-bold text-xs uppercase tracking-widest`}>Kitchen Closed</Text>
                                </View>
                            )
                        )}
                    </LinearGradient>
                </View>

                {/* Weekly Summary */}
                <WeekSummary orders={myOrders} />

                {/* Wallet Balance */}
                <WalletCard balance={balance} loading={balanceLoading} />

            </ScrollView>
        </View>
    );
};
