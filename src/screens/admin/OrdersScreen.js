import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, RefreshControl, Modal } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { subscribeToOrders, updateOrder, placeManualOrder } from '../../services/orderService';
import { getTodayKey, subscribeToMenu, getEffectiveMealSlot, getSlotDateKey } from '../../services/menuService';
import tw from 'twrnc';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Clock, Check, ChevronRight, User, Package, Filter, Plus, ChevronLeft, Phone, Info, UserPlus, X, Wallet } from 'lucide-react-native';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { getLastOrderForUser } from '../../services/orderService';

export const OrdersScreen = () => {
    const { tenant } = useTenant();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | PENDING | CONFIRMED
    const [refreshing, setRefreshing] = useState(false);
    const [confirmingId, setConfirmingId] = useState(null);

    // Manual Order State
    const [showManualModal, setShowManualModal] = useState(false);
    const [todaysMenu, setTodaysMenu] = useState(null);
    const [manualForm, setManualForm] = useState({
        phoneNumber: "",
        name: "", // Set only when an existing customer is selected
        orderDescription: "",
        totalPrice: "",
        type: "ONE_TIME"
    });
    const [submittingManual, setSubmittingManual] = useState(false);
    const [customerSearch, setCustomerSearch] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [lastOrderSuggestion, setLastOrderSuggestion] = useState(null);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const today = getTodayKey();
    const activeSlot = getEffectiveMealSlot(tenant);

    useEffect(() => {
        if (!tenant?.id) return;
        const unsubMenu = subscribeToMenu(tenant.id, today, (menu) => {
            setTodaysMenu(menu);
        });
        return unsubMenu;
    }, [tenant?.id, today]);

    const handleCustomerSearch = async (text) => {
        setCustomerSearch(text);
        if (text.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        try {
            const usersRef = collection(db, 'users');
            // Simplified search: fetching students in this kitchen
            // In a real app, this should be a more robust search or pre-fetched index
            const q = query(
                usersRef,
                where('role', '==', 'student'),
                where('joinedKitchens', 'array-contains', tenant.id)
            );
            const snap = await getDocs(q);
            const clients = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            const filtered = clients.filter(c =>
                (c.name || '').toLowerCase().includes(text.toLowerCase()) ||
                (c.phoneNumber || '').includes(text)
            ).slice(0, 5);

            setSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
        } catch (err) {
            console.error("Search error:", err);
        }
    };

    const selectCustomer = async (customer) => {
        setManualForm(prev => ({
            ...prev,
            phoneNumber: customer.phoneNumber,
            name: customer.name
        }));
        setCustomerSearch(`${customer.name} — ${customer.phoneNumber}`);
        setShowSuggestions(false);
        setSuggestions([]);

        // Smart Autofill: Get last order
        const lastOrder = await getLastOrderForUser(tenant.id, customer.id);
        if (lastOrder) {
            setLastOrderSuggestion(lastOrder.orderDescription || lastOrder.mainItem);
        } else {
            setLastOrderSuggestion(null);
        }
    };

    useEffect(() => {
        if (!tenant?.id) return;
        setLoading(true);

        const currentSlotDate = getSlotDateKey(activeSlot, tenant);
        const unsub = subscribeToOrders(tenant.id, currentSlotDate, (list) => {
            setOrders(list);
            setLoading(false);
            setRefreshing(false);
        });
        return unsub;
    }, [tenant?.id, activeSlot]);

    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            const matchesSearch = !searchTerm || (o.userDisplayName || 'Student').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' ||
                (statusFilter === 'PENDING' && o.status === 'PENDING') ||
                (statusFilter === 'CONFIRMED' && o.status === 'CONFIRMED') ||
                (statusFilter === 'COMPLETED' && o.status === 'COMPLETED');
            return matchesSearch && matchesStatus;
        });
    }, [orders, searchTerm, statusFilter]);

    const { user } = useAuth();
    const handleManualSubmit = async () => {
        const { orderDescription, totalPrice } = manualForm;
        const nameToRecord = manualForm.name || customerSearch;
        const phoneToRecord = manualForm.phoneNumber;

        if (!nameToRecord || !phoneToRecord || !orderDescription || !totalPrice) {
            let missing = [];
            if (!nameToRecord) missing.push("Customer Name");
            if (!phoneToRecord) missing.push("Mobile Number");
            if (!orderDescription) missing.push("Order Description");
            if (!totalPrice) missing.push("Price");

            Alert.alert("Missing Fields", `Please enter: ${missing.join(", ")}`);
            return;
        }

        if (phoneToRecord.length < 10) {
            Alert.alert("Invalid Phone", "Please enter a valid 10-digit mobile number.");
            return;
        }

        setSubmittingManual(true);
        const result = await placeManualOrder(tenant.id, {
            phoneNumber: phoneToRecord,
            name: nameToRecord,
            quantity: 1,
            mainItem: orderDescription,
            orderDescription: orderDescription,
            totalAmount: parseFloat(totalPrice),
            type: manualForm.type,
            status: 'CONFIRMED',
            paymentStatus: 'due',
            componentsSnapshot: []
        }, user.uid);

        setSubmittingManual(false);
        if (result.success) {
            setShowManualModal(false);
            setManualForm({
                phoneNumber: "",
                name: "",
                orderDescription: "",
                totalPrice: "",
                type: "ONE_TIME"
            });
            setCustomerSearch("");
            setLastOrderSuggestion(null);
            Alert.alert("Success", "Manual order recorded.");
        } else {
            Alert.alert("Error", result.error);
        }
    };

    const handleConfirm = async (orderId) => {
        setConfirmingId(orderId);
        const result = await updateOrder(tenant.id, orderId, { status: 'CONFIRMED' });
        setConfirmingId(null);
        if (result.error) Alert.alert("Error", result.error);
    };

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    };

    if (loading) return <View style={tw`flex-1 items-center justify-center bg-[#faf9f6]`}><ActivityIndicator color="#ca8a04" /></View>;

    if (!tenant) {
        return (
            <View style={tw`flex-1 bg-[#faf9f6] items-center justify-center`}>
                <ActivityIndicator color="#ca8a04" />
            </View>
        );
    }

    return (
        <View style={tw`flex-1 bg-[#faf9f6]`}>
            {/* Absolute Creative Header - Fixed & Sticky */}
            <View style={tw`absolute pb-3 top-0 left-0 right-0 z-10`}>
                <LinearGradient
                    colors={['#fff', '#faf9f6']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={tw`px-6 pt-16 pb-6 rounded-b-[45px] shadow-sm border-b border-gray-100/50`}
                >
                    <View style={tw`mb-4 flex-row justify-between items-end`}>
                        <View>
                            <Text style={tw`text-2xl font-black text-gray-900`}>Daily Orders</Text>
                            <Text style={tw`text-yellow-600 text-[9px] font-black uppercase tracking-widest mt-0.5`}>Confirm & Batch Production</Text>
                        </View>
                        <Pressable
                            onPress={() => setShowManualModal(true)}
                            style={tw`bg-gray-900 w-12 h-12 rounded-[20px] items-center justify-center shadow-lg shadow-gray-200`}
                        >
                            <Plus size={24} color="white" />
                        </Pressable>
                    </View>

                    {/* Sticky Controls */}
                    <View style={tw`gap-4`}>
                        {/* Search */}
                        <View style={tw`bg-white rounded-2xl flex-row items-center px-4 shadow-sm border border-gray-100`}>
                            <Search size={16} color="#9ca3af" strokeWidth={2.5} />
                            <TextInput
                                style={tw`flex-1 py-3 ml-2 font-bold text-gray-900 text-sm`}
                                placeholder="Search customer identity..."
                                placeholderTextColor="#9ca3af"
                                value={searchTerm}
                                onChangeText={setSearchTerm}
                            />
                        </View>

                        {/* Filters */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`flex-row`}>
                            {['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED'].map(f => (
                                <Pressable
                                    key={f}
                                    onPress={() => setStatusFilter(f)}
                                    style={[tw`px-5 py-2 rounded-xl border mr-2`, statusFilter === f ? tw`bg-gray-900 border-gray-900` : tw`bg-white border-gray-100`]}
                                >
                                    <Text style={[tw`text-[9px] font-black uppercase tracking-widest`, statusFilter === f ? tw`text-white` : tw`text-gray-400`]}>{f}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </LinearGradient>
            </View>

            <ScrollView
                style={tw`flex-1`}
                contentContainerStyle={tw`p-6 pt-68 pb-64`}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >

                <View style={tw`gap-4`}>
                    {filteredOrders.map(o => {
                        const isConfirmed = o.status === 'CONFIRMED';
                        const isPriority = o.isPriority === true;

                        return (
                            <View
                                key={o.id}
                                style={[
                                    tw`bg-white rounded-[30px] p-6 shadow-sm border mb-4`,
                                    // Simplified border logic: Removed opaque background overlays that cause weird outlines
                                    o.status === 'COMPLETED' ? tw`border-emerald-200` : (isConfirmed ? tw`border-gray-50` : (isPriority ? tw`border-orange-200` : tw`border-yellow-200`))
                                ]}
                            >
                                {isPriority && (
                                    <View style={tw`absolute -top-3 -right-2 bg-orange-500 px-3 py-1 rounded-full shadow-lg z-20 flex-row items-center gap-1.5`}>
                                        <Clock size={10} color="white" />
                                        <Text style={tw`text-white text-[8px] font-black uppercase tracking-widest`}>Early Collection</Text>
                                    </View>
                                )}
                                <View style={tw`flex-row justify-between items-start mb-6`}>
                                    <View style={tw`flex-row items-center gap-3`}>
                                        <View style={[tw`w-10 h-10 rounded-2xl items-center justify-center`, o.status === 'COMPLETED' ? tw`bg-emerald-100` : (isConfirmed ? tw`bg-gray-100` : (isPriority ? tw`bg-orange-100` : tw`bg-yellow-100`))]}>
                                            {o.status === 'COMPLETED' ? <Check size={18} color="#059669" /> : (isConfirmed ? <Check size={18} color="#4b5563" /> : (isPriority ? <Clock size={18} color="#ea580c" /> : <Clock size={18} color="#ca8a04" />))}
                                        </View>
                                        <View>
                                            <Text style={tw`text-base font-black text-gray-900`}>{o.userDisplayName || 'Student'}</Text>
                                            <View style={tw`flex-row items-center gap-1`}>
                                                <User size={10} color="#9ca3af" />
                                                <Text style={tw`text-[10px] font-bold text-gray-400 uppercase`}>{o.slot} • {o.type?.replace('_', ' ')}</Text>
                                            </View>
                                        </View>
                                    </View>
                                    <View style={tw`flex-row gap-2`}>
                                        {isPriority && <View style={tw`bg-orange-100 px-2 py-1 rounded-full`}><Text style={tw`text-[8px] font-black text-orange-700 uppercase`}>Priority</Text></View>}
                                        {!isConfirmed && o.status !== 'COMPLETED' && <View style={tw`bg-yellow-100 px-3 py-1 rounded-full`}><Text style={tw`text-[10px] font-black text-yellow-800 uppercase`}>Pending</Text></View>}
                                        {o.status === 'COMPLETED' && <View style={tw`bg-emerald-100 px-3 py-1 rounded-full`}><Text style={tw`text-[10px] font-black text-emerald-800 uppercase`}>Done</Text></View>}
                                    </View>
                                </View>

                                <View style={tw`bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-4`}>
                                    <Text style={tw`text-xs font-black text-gray-900`}>{o.quantity} × {o.mainItem}</Text>
                                    {o.componentsSnapshot && o.componentsSnapshot.length > 0 && (
                                        <Text style={tw`text-[10px] text-gray-400 mt-1`}>Extras: {o.componentsSnapshot.map(c => `${c.name} x${c.quantity}`).join(', ')}</Text>
                                    )}
                                </View>

                                {!isConfirmed && o.status !== 'COMPLETED' ? (
                                    <Pressable
                                        onPress={() => handleConfirm(o.id)}
                                        disabled={confirmingId === o.id}
                                        style={[
                                            tw`rounded-2xl py-3 items-center justify-center flex-row gap-2`,
                                            isPriority ? tw`bg-orange-500` : tw`bg-yellow-400`
                                        ]}
                                    >
                                        {confirmingId === o.id ? <ActivityIndicator color={isPriority ? "#fff" : "#111827"} size="small" /> : (
                                            <>
                                                <Text style={[tw`font-black text-sm uppercase`, isPriority ? tw`text-white` : tw`text-gray-900`]}>Confirm Order</Text>
                                                <ChevronRight size={18} color={isPriority ? "white" : "#111827"} />
                                            </>
                                        )}
                                    </Pressable>
                                ) : (
                                    o.status !== 'COMPLETED' ? (
                                        <Pressable
                                            onPress={async () => {
                                                setConfirmingId(o.id);
                                                await updateOrder(tenant.id, o.id, { status: 'COMPLETED' });
                                                setConfirmingId(null);
                                            }}
                                            disabled={confirmingId === o.id}
                                            style={tw`bg-emerald-500 rounded-2xl py-3 items-center justify-center flex-row gap-2 shadow-sm`}
                                        >
                                            {confirmingId === o.id ? <ActivityIndicator color="white" size="small" /> : (
                                                <>
                                                    <Check size={16} color="white" />
                                                    <Text style={tw`font-black text-sm uppercase text-white`}>Mark as Ready</Text>
                                                </>
                                            )}
                                        </Pressable>
                                    ) : (
                                        <View style={tw`flex-row items-center gap-2 mt-2 w-full justify-center`}>
                                            <Check size={14} color="#059669" />
                                            <Text style={tw`text-[10px] font-bold text-emerald-600 uppercase`}>Ready for Collection</Text>
                                        </View>
                                    )
                                )}
                            </View>
                        );
                    })}

                    {filteredOrders.length === 0 && (
                        <View style={tw`items-center justify-center py-20`}>
                            <Package size={48} color="#e5e7eb" />
                            <Text style={tw`text-gray-400 font-black mt-4`}>No orders found</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
            {/* Manual Order Modal */}
            <Modal
                visible={showManualModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowManualModal(false)}
            >
                <View style={tw`flex-1 bg-black/60 justify-end`}>
                    <View style={tw`bg-white rounded-t-[40px] p-8 pb-12`}>
                        <View style={tw`flex-row justify-between items-center mb-8`}>
                            <View>
                                <Text style={tw`text-2xl font-black text-gray-900`}>Manual Entry</Text>
                                <Text style={tw`text-yellow-600 text-[9px] font-black uppercase tracking-widest mt-0.5`}>Record external order</Text>
                            </View>
                            <Pressable
                                onPress={() => setShowManualModal(false)}
                                style={tw`w-10 h-10 rounded-full bg-gray-50 items-center justify-center`}
                            >
                                <Plus size={20} color="#9ca3af" style={{ transform: [{ rotate: '45deg' }] }} />
                            </Pressable>
                        </View>

                        <ScrollView style={tw`max-h-[70%]`} showsVerticalScrollIndicator={false}>
                            <View style={tw`gap-6`}>
                                {/* Customer Selection */}
                                <View style={tw`z-50`}>
                                    <View style={tw`flex-row justify-between mb-2 ml-1`}>
                                        <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest`}>Search Customer *</Text>
                                        {!manualForm.phoneNumber && <Text style={tw`text-[8px] font-bold text-yellow-600 uppercase`}>Name or Phone</Text>}
                                    </View>

                                    <View style={tw`bg-gray-50 rounded-2xl flex-row items-center px-4 border ${showSuggestions ? 'border-yellow-400' : 'border-gray-100'}`}>
                                        <Search size={16} color="#9ca3af" />
                                        <TextInput
                                            style={tw`flex-1 py-4 ml-3 font-bold text-gray-900`}
                                            placeholder="Amit or 91234..."
                                            value={customerSearch}
                                            onChangeText={handleCustomerSearch}
                                            placeholderTextColor="#9ca3af"
                                        />
                                        {customerSearch.length > 0 && (
                                            <Pressable onPress={() => { setCustomerSearch(""); setManualForm(prev => ({ ...prev, phoneNumber: "", name: "" })); setLastOrderSuggestion(null); }}>
                                                <X size={16} color="#9ca3af" />
                                            </Pressable>
                                        )}
                                    </View>

                                    {/* Suggestions Table */}
                                    {showSuggestions && (
                                        <View style={tw`absolute top-[75px] left-0 right-0 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden`}>
                                            {suggestions.map((s) => (
                                                <Pressable
                                                    key={s.id}
                                                    onPress={() => selectCustomer(s)}
                                                    style={tw`p-4 border-b border-gray-50 flex-row items-center justify-between active:bg-gray-50`}
                                                >
                                                    <View style={tw`flex-row items-center gap-3`}>
                                                        <View style={tw`w-8 h-8 rounded-full bg-yellow-100 items-center justify-center`}>
                                                            <User size={14} color="#ca8a04" />
                                                        </View>
                                                        <View>
                                                            <Text style={tw`font-bold text-gray-900`}>{s.name || 'Unnamed'}</Text>
                                                            <Text style={tw`text-[10px] text-gray-400 font-bold`}>{s.phoneNumber}</Text>
                                                        </View>
                                                    </View>
                                                    <ChevronRight size={14} color="#d1d5db" />
                                                </Pressable>
                                            ))}
                                        </View>
                                    )}
                                </View>

                                {/* Conditional Mobile Input (Only for new users) */}
                                {!manualForm.name && customerSearch.length > 0 && !showSuggestions && (
                                    <View>
                                        <View style={tw`flex-row items-center gap-2 mb-2 ml-1`}>
                                            <UserPlus size={12} color="#ca8a04" />
                                            <Text style={tw`text-[10px] font-black text-yellow-600 uppercase tracking-widest`}>New Customer: Mobile *</Text>
                                        </View>
                                        <View style={tw`bg-gray-50 rounded-2xl px-4 border border-yellow-200`}>
                                            <TextInput
                                                style={tw`py-4 font-bold text-gray-900`}
                                                placeholder="9123456789"
                                                keyboardType="phone-pad"
                                                maxLength={10}
                                                value={manualForm.phoneNumber}
                                                onChangeText={(t) => setManualForm(prev => ({ ...prev, phoneNumber: t }))}
                                                placeholderTextColor="#9ca3af"
                                            />
                                        </View>
                                        <Text style={tw`text-[8px] text-gray-400 mt-2 ml-1`}>Record "{customerSearch}" as a new customer with this mobile number.</Text>
                                    </View>
                                )}

                                {/* Selected Customer Card */}
                                {manualForm.name && (
                                    <View style={tw`bg-emerald-50 p-4 rounded-3xl border border-emerald-100 flex-row items-center justify-between`}>
                                        <View style={tw`flex-row items-center gap-3`}>
                                            <View style={tw`w-10 h-10 rounded-2xl bg-emerald-500 items-center justify-center shadow-sm shadow-emerald-200`}>
                                                <User size={18} color="white" />
                                            </View>
                                            <View>
                                                <Text style={tw`font-black text-gray-900`}>{manualForm.name}</Text>
                                                <Text style={tw`text-[10px] text-emerald-600 font-bold tracking-tight`}>{manualForm.phoneNumber}</Text>
                                            </View>
                                        </View>
                                        <Pressable
                                            onPress={() => {
                                                setManualForm(prev => ({ ...prev, name: "", phoneNumber: "" }));
                                                setCustomerSearch("");
                                            }}
                                            style={tw`w-8 h-8 rounded-full bg-white items-center justify-center border border-emerald-100`}
                                        >
                                            <X size={14} color="#059669" />
                                        </Pressable>
                                    </View>
                                )}

                                {/* Order Description */}
                                <View>
                                    <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1`}>Order Description *</Text>
                                    <View style={tw`bg-gray-50 rounded-2xl px-4 border border-gray-100`}>
                                        <TextInput
                                            style={tw`py-4 font-bold text-gray-900`}
                                            placeholder="e.g. 2 Thali + Rice"
                                            value={manualForm.orderDescription}
                                            onChangeText={(t) => setManualForm(prev => ({ ...prev, orderDescription: t }))}
                                            placeholderTextColor="#9ca3af"
                                        />
                                    </View>

                                    {/* Smart Suggestion Tag */}
                                    {lastOrderSuggestion && (
                                        <Pressable
                                            onPress={() => setManualForm(prev => ({ ...prev, orderDescription: lastOrderSuggestion }))}
                                            style={tw`mt-2 self-start bg-gray-100 px-3 py-1.5 rounded-full flex-row items-center gap-2`}
                                        >
                                            <Clock size={10} color="#6b7280" />
                                            <Text style={tw`text-[10px] font-black text-gray-500 uppercase`}>Latest: {lastOrderSuggestion}</Text>
                                        </Pressable>
                                    )}
                                </View>

                                {/* Total Price */}
                                <View>
                                    <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1`}>Order Value *</Text>
                                    <View style={tw`bg-gray-50 rounded-2xl flex-row items-center px-4 border border-gray-100`}>
                                        <Text style={tw`font-bold text-gray-400 mr-1`}>₹</Text>
                                        <TextInput
                                            style={tw`flex-1 py-4 font-black text-gray-900 text-lg`}
                                            placeholder="0.00"
                                            keyboardType="numeric"
                                            value={manualForm.totalPrice}
                                            onChangeText={(t) => setManualForm(prev => ({ ...prev, totalPrice: t }))}
                                            placeholderTextColor="#9ca3af"
                                        />
                                    </View>
                                </View>

                                {/* Info Box */}
                                <View style={tw`bg-yellow-50 p-4 rounded-2xl border border-yellow-100 flex-row gap-3`}>
                                    <Wallet size={16} color="#ca8a04" />
                                    <Text style={tw`flex-1 text-[10px] font-medium text-yellow-800 leading-4`}>
                                        Manual order will be recorded as "DUE" for this customer. Total Amount: ₹{manualForm.totalPrice || '0'}
                                    </Text>
                                </View>
                            </View>
                        </ScrollView>

                        <Pressable
                            onPress={handleManualSubmit}
                            disabled={submittingManual}
                            style={[tw`bg-gray-900 rounded-[20px] py-4.5 mt-8 items-center justify-center shadow-xl shadow-gray-200`, submittingManual && tw`opacity-50`]}
                        >
                            {submittingManual ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={tw`text-white font-black text-sm uppercase tracking-widest`}>Record Order</Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
};
