import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, Switch, Platform, TouchableOpacity } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { getKitchenConfig, updateKitchenConfig, updateKitchen } from '../../services/kitchenService';
import { logoutUser, updateUserProfile } from '../../services/authService';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import tw from 'twrnc';
import { LinearGradient } from 'expo-linear-gradient';
import { ChefHat, CheckCircle, Clock, IndianRupee, Calendar, LogOut, Save, ShieldCheck, Sun, Moon, Coffee, UtensilsCrossed, Edit2, Check, Copy, MapPin, CreditCard, Info, Phone } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

const SLOT_DEFAULTS = {
    breakfast: { active: false, start: '22:00', end: '07:00', pickupStart: '07:30', pickupEnd: '09:00', deliveryStart: '07:30', deliveryEnd: '09:00' },
    lunch: { active: false, start: '22:00', end: '14:00', pickupStart: '12:30', pickupEnd: '14:30', deliveryStart: '12:30', deliveryEnd: '14:30' },
    snacks: { active: false, start: '16:00', end: '18:00', pickupStart: '17:00', pickupEnd: '19:00', deliveryStart: '17:00', deliveryEnd: '19:00' },
    dinner: { active: false, start: '16:00', end: '20:00', pickupStart: '19:30', pickupEnd: '21:30', deliveryStart: '19:30', deliveryEnd: '21:30' }
};

// Helper to format 24h string to 12h display
const formatTime12h = (time24) => {
    if (!time24) return '';
    try {
        const [hours, minutes] = time24.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    } catch (e) {
        return time24;
    }
};

// Helper Component for Triggers
const InputTrigger = ({ label, value, onPress, placeholder, disabled }) => (
    <View style={tw`flex-1 items-center`}>
        <Text style={tw`text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 text-center`}>{label}</Text>
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [
                tw`bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100 flex-row items-center justify-center w-full`,
                pressed && tw`bg-gray-100`,
                disabled && tw`opacity-50`
            ]}
        >
            <Clock size={12} color="#9ca3af" style={tw`mr-2`} />
            <Text style={tw`text-sm font-black text-gray-900 text-center`}>
                {value?.includes(':') ? formatTime12h(value) : (value || placeholder)}
            </Text>
        </Pressable>
    </View>
);

export const SettingsScreen = () => {
    const { user, userProfile } = useAuth();
    const { tenant } = useTenant();

    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [savingBasic, setSavingBasic] = useState(false);
    const [savingPartner, setSavingPartner] = useState(false);
    const [savingConfig, setSavingConfig] = useState(false);
    const [isEditingBasic, setIsEditingBasic] = useState(false);
    const [isEditingDueLimit, setIsEditingDueLimit] = useState(false);
    const [isEditingService, setIsEditingService] = useState(false);
    const [activeEditingSlot, setActiveEditingSlot] = useState(null);
    const [isEditingHoliday, setIsEditingHoliday] = useState(false);

    // Local Edit State
    const [localKitchen, setLocalKitchen] = useState({
        name: '',
        address: { building: '', locality: '', city: '', pinCode: '' },
        phone: '',
        whatsapp: '',
        deliveryBoyName: '',
        deliveryBoyPhone: ''
    });

    useEffect(() => {
        if (tenant) {
            setLocalKitchen({
                name: tenant.name || '',
                address: tenant.address || { building: '', locality: '', city: '', pinCode: '' },
                phone: tenant.phone || '',
                whatsapp: tenant.whatsapp || '',
                deliveryBoyName: tenant.deliveryBoyName || '',
                deliveryBoyPhone: tenant.deliveryBoyPhone || ''
            });
        }
    }, [tenant]);

    useEffect(() => {
        const load = async () => {
            const data = await getKitchenConfig(tenant?.id);
            console.log('[SettingsScreen] Loaded Config:', data);
            setConfig(data);
            setLoading(false);
        };
        load();
    }, [tenant?.id]);

    // Picker State
    const [picker, setPicker] = useState({ show: false, mode: 'time', field: null, subField: null, value: new Date() });

    useEffect(() => {
        if (userProfile && userProfile.hasSeenOnboarding !== true) {
            updateUserProfile(user.uid, { hasSeenOnboarding: true });
        }
    }, [userProfile]);

    const openPicker = (mode, field, subField, currentValue) => {
        let date = new Date();
        if (mode === 'time') {
            let timeStr = currentValue;
            // If no current value, try to find a default for this slot/field
            if (!timeStr && field === 'mealSlots' && subField) {
                const [slotId, timeField] = subField.split('.');
                timeStr = SLOT_DEFAULTS[slotId]?.[timeField];
            }

            if (timeStr) {
                const [h, m] = timeStr.split(':');
                date.setHours(parseInt(h) || 0, parseInt(m) || 0, 0, 0);
            }
        } else if (mode === 'date' && currentValue) {
            const parts = currentValue.split('-');
            if (parts.length === 3) date = new Date(parts[0], parts[1] - 1, parts[2]);
        }
        setPicker({ show: true, mode, field, subField, value: date });
    };

    const handlePickerConfirm = (selectedDate) => {
        if (selectedDate) {
            let newValue;
            if (picker.mode === 'time') {
                const h = selectedDate.getHours().toString().padStart(2, '0');
                const m = selectedDate.getMinutes().toString().padStart(2, '0');
                newValue = `${h}:${m}`;
            } else {
                const y = selectedDate.getFullYear();
                const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
                const d = String(selectedDate.getDate()).padStart(2, '0');
                newValue = `${y}-${m}-${d}`;
            }

            // Update Config & Persist if needed
            if (picker.field === 'holiday') {
                setConfig(prev => ({ ...prev, holiday: { ...prev.holiday, [picker.subField]: newValue } }));
            } else if (picker.field === 'mealSlots' && picker.subField) {
                const [slotId, timeField] = picker.subField.split('.');
                const updatedMealSlots = {
                    ...config.mealSlots,
                    [slotId]: {
                        ...(config.mealSlots?.[slotId] || {}),
                        [timeField]: newValue
                    }
                };

                // Real-time update for timings
                setConfig(prev => ({ ...prev, mealSlots: updatedMealSlots }));
                updateKitchenConfig(tenant.id, { ...config, mealSlots: updatedMealSlots });
            } else {
                setConfig(prev => {
                    const next = { ...prev, [picker.field]: newValue };
                    // Persist other fields real-time if they aren't holiday
                    updateKitchenConfig(tenant.id, next);
                    return next;
                });
            }

            // Update picker val
            setPicker(prev => ({ ...prev, show: false, value: selectedDate }));
        }
    };

    const handlePickerCancel = () => {
        setPicker(prev => ({ ...prev, show: false }));
    };

    const handleSaveBasic = async () => {
        // Validation
        if (!localKitchen.name?.trim()) return Alert.alert("Required", "Kitchen name is required");
        if (!localKitchen.address?.building?.trim()) return Alert.alert("Required", "Building/Shop number is required");
        if (!localKitchen.address?.locality?.trim()) return Alert.alert("Required", "Area/Locality is required");
        if (!localKitchen.address?.city?.trim()) return Alert.alert("Required", "City is required");
        if (!localKitchen.address?.pinCode?.trim() || localKitchen.address.pinCode.length !== 6) {
            return Alert.alert("Invalid", "Please enter a valid 6-digit Pincode");
        }
        if (!localKitchen.phone?.trim() || localKitchen.phone.length < 10) {
            return Alert.alert("Invalid", "Please enter a valid 10-digit Phone connection");
        }

        setSavingBasic(true);
        const result = await updateKitchen(tenant.id, {
            name: localKitchen.name,
            address: localKitchen.address,
            phone: localKitchen.phone,
            whatsapp: localKitchen.whatsapp
        });
        setSavingBasic(false);
        if (result.success) {
            setSavingBasic(false);
            setIsEditingBasic(false); // Return to card view
            Alert.alert("Success", "Kitchen details updated");
        } else {
            setSavingBasic(false);
            Alert.alert("Error", result.error);
        }
    };

    const handleSavePartner = async () => {
        // Validation
        if (!localKitchen.deliveryBoyName?.trim()) return Alert.alert("Required", "Delivery partner name is required");
        if (!localKitchen.deliveryBoyPhone?.trim() || localKitchen.deliveryBoyPhone.length < 10) {
            return Alert.alert("Invalid", "Please enter a valid 10-digit Phone for delivery partner");
        }

        setSavingPartner(true);
        const result = await updateKitchen(tenant.id, {
            deliveryBoyName: localKitchen.deliveryBoyName,
            deliveryBoyPhone: localKitchen.deliveryBoyPhone
        });
        setSavingPartner(false);
        if (result.success) {
            setIsEditingService(false);
            Alert.alert("Success", "Delivery partner details updated");
        } else Alert.alert("Error", result.error);
    };

    const handleSave = async () => {
        // Validation for Holiday Mode
        if (config?.holiday?.active) {
            if (!config.holiday.from || !config.holiday.to || !config.holiday.reason?.trim()) {
                return Alert.alert("Required", "Please fill 'From', 'To', and 'Reason' for Holiday Mode");
            }
        }

        setSavingConfig(true);
        const result = await updateKitchenConfig(tenant.id, config);
        setSavingConfig(false);
        if (result.success) {
            setIsEditingDueLimit(false);
            Alert.alert("Success", "Meal settings updated");
        } else {
            setSavingConfig(false);
            Alert.alert("Error", result.error);
        }
    };

    const handleCopyCode = async () => {
        if (tenant?.joinCode) {
            await Clipboard.setStringAsync(tenant.joinCode);
            Alert.alert("Copied", "Kitchen code copied to clipboard");
        }
    };

    const handleLogout = async () => {
        Alert.alert("Logout", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Logout", style: "destructive", onPress: logoutUser }
        ]);
    };

    if (loading || !tenant || !user) {
        return (
            <View style={tw`flex-1 bg-[#faf9f6] items-center justify-center`}>
                <ActivityIndicator color="#ca8a04" />
            </View>
        );
    }

    const holiday = config?.holiday || { active: false };

    return (
        <View style={tw`flex-1 bg-[#faf9f6]`}>
            {/* Creative Header - Continuity */}
            {/* Absolute Header - Summary View */}
            <View style={tw`absolute top-0 left-0 right-0 z-10`}>
                <LinearGradient
                    colors={['#fff', '#faf9f6']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={tw`px-6 pt-16 pb-8 rounded-b-[45px] shadow-sm border-b border-gray-100/50`}
                >
                    <Text style={tw`text-2xl font-black text-gray-900`}>Admin Settings</Text>
                    <Text style={tw`text-yellow-600 text-[10px] font-black uppercase tracking-widest mt-0.5`}>Kitchen & Account preferences</Text>
                </LinearGradient>
            </View>

            <ScrollView
                contentContainerStyle={tw`p-6 pt-48 pb-32`}
                style={tw`flex-1`}
                showsVerticalScrollIndicator={false}
            >
                {/* Kitchen Detail & Address */}
                <View style={tw`bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 mb-5`}>
                    {!isEditingBasic ? (
                        /* Symmetrical & Organized ID Card View */
                        <View style={tw`items-center`}>
                            {/* Central Badge Section with Integrated Edit */}
                            <View style={tw`flex-row items-center w-full gap-5`}>
                                <View style={tw`items-center justify-center`}>
                                    <LinearGradient
                                        colors={['#fffbeb', '#fef08a']}
                                        style={tw`w-20 h-20 rounded-full items-center justify-center border-4 border-white shadow-md`}
                                    >
                                        <ChefHat size={32} color="#ca8a04" />
                                    </LinearGradient>
                                    <View style={tw`absolute -bottom-1 bg-yellow-600 px-2.5 py-0.5 rounded-full border-2 border-white`}>
                                        <Text style={tw`text-[7px] font-black text-white uppercase tracking-tighter`}>Verified Kitchen</Text>
                                    </View>
                                </View>

                                <View style={tw`flex-1`}>
                                    <View style={tw`flex-row items-center justify-between`}>
                                        <View>
                                            <Text style={tw`text-xl font-black text-slate-900 mb-1`}>{tenant.name}</Text>
                                            <View style={tw`flex-row items-center gap-2`}>

                                                <Text style={tw`text-[10px] font-black text-yellow-700 uppercase tracking-widest`}>Join ID: {tenant.joinCode}</Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => setIsEditingBasic(true)}
                                            style={tw`p-2.5 bg-gray-50 rounded-xl border border-gray-100`}
                                        >
                                            <Edit2 size={16} color="#ca8a04" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            {/* Info Grid - Symmetrical Layout */}
                            <View style={tw`w-full mt-6 pt-5 border-t border-slate-50 flex-row justify-between items-center`}>
                                <View style={tw`flex-1 items-center border-r border-slate-50`}>
                                    <View style={tw`w-8 h-8 rounded-xl bg-emerald-50 items-center justify-center mb-1.5`}>
                                        <Phone size={14} color="#059669" />
                                    </View>
                                    <Text style={tw`text-[10px] font-black text-slate-900`}>{tenant.phone}</Text>
                                    <Text style={tw`text-[8px] text-slate-400 font-bold uppercase`}>WhatsApp</Text>
                                </View>

                                <View style={tw`flex-1 items-center border-r border-slate-50`}>
                                    <View style={tw`w-8 h-8 rounded-xl bg-blue-50 items-center justify-center mb-1.5`}>
                                        <MapPin size={14} color="#2563eb" />
                                    </View>
                                    <Text style={tw`text-[10px] font-black text-slate-900`} numberOfLines={1}>{tenant.address?.locality}</Text>
                                    <Text style={tw`text-[8px] text-slate-400 font-bold uppercase`}>Location</Text>
                                </View>

                                <View style={tw`flex-1 items-center`}>
                                    <View style={tw`w-8 h-8 rounded-xl bg-orange-50 items-center justify-center mb-1.5`}>
                                        <ShieldCheck size={14} color="#ea580c" />
                                    </View>
                                    <Text style={tw`text-[10px] font-black text-slate-900`}>{tenant.address?.city}</Text>
                                    <Text style={tw`text-[8px] text-slate-400 font-bold uppercase`}>City</Text>
                                </View>
                            </View>
                        </View>
                    ) : (
                        /* Full Edit Form */
                        <View style={tw`gap-4`}>
                            <View>
                                <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2`}>Shop / Kitchen Name</Text>
                                <TextInput
                                    style={tw`bg-gray-50 rounded-2xl px-5 py-3 border border-gray-100 font-bold text-gray-900`}
                                    value={localKitchen.name}
                                    onChangeText={(v) => setLocalKitchen({ ...localKitchen, name: v })}
                                    placeholder="e.g. Grandma's Kitchen"
                                />
                            </View>

                            <View style={tw`flex-row gap-3`}>
                                <View style={tw`flex-1`}>
                                    <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2`}>Flat / Shop / Building</Text>
                                    <TextInput
                                        style={tw`bg-gray-50 rounded-2xl px-5 py-3 border border-gray-100 font-bold text-gray-900`}
                                        value={localKitchen.address.building}
                                        onChangeText={(v) => setLocalKitchen({ ...localKitchen, address: { ...localKitchen.address, building: v } })}
                                        placeholder="Shop No. 5"
                                    />
                                </View>
                            </View>

                            <View>
                                <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2`}>Area / Locality</Text>
                                <TextInput
                                    style={tw`bg-gray-50 rounded-2xl px-5 py-3 border border-gray-100 font-bold text-gray-900`}
                                    value={localKitchen.address.locality}
                                    onChangeText={(v) => setLocalKitchen({ ...localKitchen, address: { ...localKitchen.address, locality: v } })}
                                    placeholder="Sector 12, HSR Layout"
                                />
                            </View>

                            <View style={tw`flex-row gap-3`}>
                                <View style={tw`flex-1`}>
                                    <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2`}>City</Text>
                                    <TextInput
                                        style={tw`bg-gray-50 rounded-2xl px-5 py-3 border border-gray-100 font-bold text-gray-900`}
                                        value={localKitchen.address.city}
                                        onChangeText={(v) => setLocalKitchen({ ...localKitchen, address: { ...localKitchen.address, city: v } })}
                                        placeholder="Mumbai"
                                    />
                                </View>
                                <View style={tw`flex-1`}>
                                    <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2`}>Pincode</Text>
                                    <TextInput
                                        style={tw`bg-gray-50 rounded-2xl px-5 py-3 border border-gray-100 font-bold text-gray-900`}
                                        value={localKitchen.address.pinCode}
                                        onChangeText={(v) => setLocalKitchen({ ...localKitchen, address: { ...localKitchen.address, pinCode: v } })}
                                        placeholder="400001"
                                        keyboardType="numeric"
                                        maxLength={6}
                                    />
                                </View>
                            </View>

                            <View>
                                <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2`}>Contact Number (WhatsApp)</Text>
                                <TextInput
                                    style={tw`bg-gray-50 rounded-2xl px-5 py-3 border border-gray-100 font-bold text-gray-900`}
                                    value={localKitchen.phone}
                                    onChangeText={(v) => setLocalKitchen({ ...localKitchen, phone: v, whatsapp: v })}
                                    placeholder="9876543210"
                                    keyboardType="phone-pad"
                                />
                            </View>

                            <View style={tw`flex-row gap-3 mt-2`}>
                                <TouchableOpacity
                                    onPress={() => setIsEditingBasic(false)}
                                    style={tw`flex-1 bg-gray-100 rounded-2xl py-3 items-center justify-center`}
                                >
                                    <Text style={tw`text-gray-500 font-black text-[10px] uppercase tracking-widest`}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleSaveBasic}
                                    disabled={savingBasic}
                                    style={tw`flex-2 bg-gray-900 rounded-2xl py-3 items-center justify-center flex-row gap-2`}
                                >
                                    {savingBasic ? <ActivityIndicator color="white" /> : (
                                        <>
                                            <Save size={14} color="white" />
                                            <Text style={tw`text-white font-black text-[10px] uppercase tracking-widest`}>Save Changes</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                {/* Service Mode */}
                <View style={tw`bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 mb-5`}>
                    {!isEditingService ? (
                        /* Compact Display Card with Integrated Edit */
                        <View style={tw`gap-4`}>
                            <View style={tw`flex-row items-center justify-between bg-gray-50/50 p-4 rounded-3xl border border-gray-100`}>
                                <View style={tw`flex-row items-center gap-4`}>
                                    <View style={tw`w-10 h-10 rounded-xl bg-orange-50 items-center justify-center`}>
                                        <UtensilsCrossed size={18} color="#ea580c" />
                                    </View>
                                    <View>
                                        <Text style={tw`text-lg font-black text-slate-900`}>
                                            {tenant?.serviceMode === 'DELIVERY' ? 'Delivery Only' : 'Pickup Only'}
                                        </Text>
                                        <Text style={tw`text-[9px] font-black text-orange-600 uppercase tracking-tighter`}>Service Mode</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setIsEditingService(true)}
                                    style={tw`p-2.5 bg-gray-50 rounded-xl border border-gray-100`}
                                >
                                    <Edit2 size={16} color="#ca8a04" />
                                </TouchableOpacity>
                            </View>

                            {tenant?.serviceMode === 'DELIVERY' && (tenant.deliveryBoyName || tenant.deliveryBoyPhone) && (
                                <View style={tw`flex-row items-center gap-3 mt-1`}>
                                    <View style={tw`flex-1 bg-gray-50 p-3 rounded-2xl border border-gray-100 items-center`}>
                                        <Text style={tw`text-[10px] font-black text-slate-900`}>{tenant.deliveryBoyName || 'N/A'}</Text>
                                        <Text style={tw`text-[8px] text-slate-400 font-bold uppercase`}>Partner</Text>
                                    </View>
                                    <View style={tw`flex-1 bg-gray-50 p-3 rounded-2xl border border-gray-100 items-center`}>
                                        <Text style={tw`text-[10px] font-black text-slate-900`}>{tenant.deliveryBoyPhone || 'N/A'}</Text>
                                        <Text style={tw`text-[8px] text-slate-400 font-bold uppercase`}>Phone</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    ) : (
                        /* Edit Form */
                        <View style={tw`gap-4`}>
                            <View style={tw`flex-row gap-2 mb-2`}>
                                {[
                                    { id: 'DELIVERY', label: 'Delivery' },
                                    { id: 'PICKUP', label: 'Pickup Only' }
                                ].map((m) => (
                                    <Pressable
                                        key={m.id}
                                        onPress={() => updateKitchen(tenant.id, { serviceMode: m.id })}
                                        style={[
                                            tw`flex-1 py-3 rounded-2xl border items-center justify-center`,
                                            tenant?.serviceMode === m.id ? tw`bg-gray-900 border-gray-900` : tw`bg-gray-50 border-gray-100`
                                        ]}
                                    >
                                        <Text style={[
                                            tw`text-[10px] font-black uppercase tracking-widest`,
                                            tenant?.serviceMode === m.id ? tw`text-white` : tw`text-gray-400`
                                        ]}>{m.label}</Text>
                                    </Pressable>
                                ))}
                            </View>

                            {tenant?.serviceMode === 'DELIVERY' && (
                                <View style={tw`pt-4 border-t border-gray-50 gap-4 items-center`}>
                                    <Text style={tw`text-[9px] font-black text-yellow-600 uppercase tracking-widest mb-1 text-center`}>Delivery Partner Information</Text>
                                    <View style={tw`flex-row gap-3`}>
                                        <View style={tw`flex-1`}>
                                            <Text style={tw`text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 text-center`}>Name</Text>
                                            <TextInput
                                                style={tw`bg-gray-50 rounded-2xl px-5 h-12 border border-gray-100 font-black text-sm text-gray-900 text-center`}
                                                value={localKitchen.deliveryBoyName}
                                                onChangeText={(v) => setLocalKitchen({ ...localKitchen, deliveryBoyName: v })}
                                                placeholder="Name"
                                                placeholderTextColor="#9ca3af"
                                            />
                                        </View>
                                        <View style={tw`flex-1`}>
                                            <Text style={tw`text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 text-center`}>Phone</Text>
                                            <TextInput
                                                style={tw`bg-gray-50 rounded-2xl px-5 h-12 border border-gray-100 font-black text-sm text-gray-900 text-center`}
                                                value={localKitchen.deliveryBoyPhone}
                                                onChangeText={(v) => setLocalKitchen({ ...localKitchen, deliveryBoyPhone: v })}
                                                placeholder="Phone"
                                                placeholderTextColor="#9ca3af"
                                                keyboardType="phone-pad"
                                            />
                                        </View>
                                    </View>
                                </View>
                            )}

                            <View style={tw`flex-row gap-3 mt-2`}>
                                <TouchableOpacity
                                    onPress={() => setIsEditingService(false)}
                                    style={tw`flex-1 bg-gray-100 rounded-2xl py-3 items-center justify-center`}
                                >
                                    <Text style={tw`text-gray-500 font-black text-[10px] uppercase tracking-widest`}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleSavePartner}
                                    disabled={savingPartner}
                                    style={tw`flex-2 bg-gray-900 rounded-2xl py-3 items-center justify-center flex-row gap-2`}
                                >
                                    {savingPartner ? <ActivityIndicator color="white" /> : (
                                        <>
                                            <Save size={14} color="white" />
                                            <Text style={tw`text-white font-black text-[10px] uppercase tracking-widest`}>Update Service</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                {/* Meal Slots */}
                <View style={tw`bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 mb-5`}>
                    {/* Header - No Edit Icon */}
                    <View style={tw`flex-row items-center gap-2 mb-6`}>
                        <Clock size={16} color="#ca8a04" />
                        <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest`}>Meal Timings & Windows</Text>
                    </View>

                    {[
                        { id: 'breakfast', label: 'Breakfast', icon: Coffee },
                        { id: 'lunch', label: 'Lunch', icon: Sun },
                        { id: 'snacks', label: 'Snacks', icon: UtensilsCrossed },
                        { id: 'dinner', label: 'Dinner', icon: Moon }
                    ].map((m) => {
                        const slot = config?.mealSlots?.[m.id] || SLOT_DEFAULTS[m.id];
                        const Icon = m.icon;

                        return (
                            <View key={m.id} style={tw`mb-8 last:mb-0`}>
                                {/* Outer Row - Always Visible Toggle */}
                                <View style={tw`flex-row items-center justify-between mb-3`}>
                                    <View style={tw`flex-row items-center gap-3`}>
                                        <View style={tw`w-8 h-8 rounded-lg ${slot.active ? 'bg-yellow-50' : 'bg-gray-50'} items-center justify-center`}>
                                            <Icon size={16} color={slot.active ? "#ca8a04" : "#9ca3af"} />
                                        </View>
                                        <Text style={tw`font-bold ${slot.active ? 'text-gray-900' : 'text-gray-400'}`}>{m.label}</Text>
                                    </View>
                                    <Switch
                                        value={slot.active}
                                        onValueChange={(v) => {
                                            const updatedSlots = {
                                                ...config.mealSlots,
                                                [m.id]: { ...slot, active: v }
                                            };
                                            setConfig({ ...config, mealSlots: updatedSlots });
                                            updateKitchenConfig(tenant.id, { ...config, mealSlots: updatedSlots });
                                        }}
                                        trackColor={{ false: "#e5e7eb", true: "#fde68a" }}
                                        thumbColor={slot.active ? "#ca8a04" : "#f4f3f4"}
                                    />
                                </View>

                                {slot.active && (
                                    <View style={tw`px-1`}>
                                        {activeEditingSlot !== m.id ? (
                                            /* Professional Text Summary with Edit Icon */
                                            <View style={tw`flex-row items-center justify-between`}>
                                                <View style={tw`gap-1`}>
                                                    <View style={tw`flex-row items-center gap-2`}>
                                                        <View style={tw`w-1.5 h-1.5 rounded-full bg-emerald-400`} />
                                                        <Text style={tw`text-[11px] font-black text-slate-500 uppercase tracking-tighter`}>
                                                            Ordering: <Text style={tw`text-slate-900`}>{formatTime12h(slot.start)} - {formatTime12h(slot.end)}</Text>
                                                        </Text>
                                                    </View>
                                                    {(slot.deliveryStart || slot.pickupStart) && (
                                                        <View style={tw`flex-row items-center gap-2`}>
                                                            <View style={tw`w-1.5 h-1.5 rounded-full bg-amber-400`} />
                                                            <Text style={tw`text-[11px] font-black text-slate-500 uppercase tracking-tighter`}>
                                                                {tenant?.serviceMode === 'DELIVERY' ? 'Delivery' : 'Pickup'}: <Text style={tw`text-slate-900`}>{tenant?.serviceMode === 'DELIVERY' ? formatTime12h(slot.deliveryStart || slot.start) : formatTime12h(slot.pickupStart || slot.start)} - {tenant?.serviceMode === 'DELIVERY' ? formatTime12h(slot.deliveryEnd || slot.end) : formatTime12h(slot.pickupEnd || slot.end)}</Text>
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <TouchableOpacity
                                                    onPress={() => setActiveEditingSlot(m.id)}
                                                    style={tw`p-2 bg-gray-50 rounded-lg border border-gray-100/50`}
                                                >
                                                    <Edit2 size={12} color="#ca8a04" />
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            /* Active Editor Inputs */
                                            <View style={tw`mt-2 gap-4 items-center`}>
                                                <View style={tw`flex-row gap-4 w-full px-4`}>
                                                    <InputTrigger
                                                        label="Ordering Start"
                                                        value={slot.start}
                                                        onPress={() => openPicker('time', 'mealSlots', `${m.id}.start`, slot.start)}
                                                        placeholder="00:00"
                                                    />
                                                    <InputTrigger
                                                        label="Ordering End"
                                                        value={slot.end}
                                                        onPress={() => openPicker('time', 'mealSlots', `${m.id}.end`, slot.end)}
                                                        placeholder="00:00"
                                                    />
                                                </View>

                                                {tenant?.serviceMode === 'PICKUP' && (
                                                    <View style={tw`bg-gray-50/50 p-4 rounded-3xl border border-gray-100 w-full items-center`}>
                                                        <Text style={tw`text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4 text-center`}>Pickup Window</Text>
                                                        <View style={tw`flex-row gap-4 w-full`}>
                                                            <InputTrigger
                                                                label="From"
                                                                value={slot.pickupStart || slot.start}
                                                                onPress={() => openPicker('time', 'mealSlots', `${m.id}.pickupStart`, slot.pickupStart || slot.start)}
                                                                placeholder="00:00"
                                                            />
                                                            <InputTrigger
                                                                label="To"
                                                                value={slot.pickupEnd || slot.end}
                                                                onPress={() => openPicker('time', 'mealSlots', `${m.id}.pickupEnd`, slot.pickupEnd || slot.end)}
                                                                placeholder="00:00"
                                                            />
                                                        </View>
                                                    </View>
                                                )}

                                                {tenant?.serviceMode === 'DELIVERY' && (
                                                    <View style={tw`bg-gray-50/50 p-4 rounded-3xl border border-gray-100 w-full items-center`}>
                                                        <Text style={tw`text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4 text-center`}>Delivery Window</Text>
                                                        <View style={tw`flex-row gap-4 w-full`}>
                                                            <InputTrigger
                                                                label="From"
                                                                value={slot.deliveryStart || slot.start}
                                                                onPress={() => openPicker('time', 'mealSlots', `${m.id}.deliveryStart`, slot.deliveryStart || slot.start)}
                                                                placeholder="00:00"
                                                            />
                                                            <InputTrigger
                                                                label="To"
                                                                value={slot.deliveryEnd || slot.end}
                                                                onPress={() => openPicker('time', 'mealSlots', `${m.id}.deliveryEnd`, slot.deliveryEnd || slot.end)}
                                                                placeholder="00:00"
                                                            />
                                                        </View>
                                                    </View>
                                                )}

                                                {/* Inline Save for the slot */}
                                                <TouchableOpacity
                                                    onPress={() => setActiveEditingSlot(null)}
                                                    style={tw`w-full py-3 bg-gray-900 rounded-2xl items-center justify-center mt-2 shadow-sm`}
                                                >
                                                    <Text style={tw`text-white font-black text-[10px] uppercase tracking-widest`}>Save {m.label} Timing</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        );
                    })}

                </View>

                {/* Holiday */}
                <View style={tw`bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 mb-5`}>
                    <View style={tw`flex-row items-center justify-between mb-4`}>
                        <View style={tw`flex-row items-center gap-2`}>
                            <Calendar size={16} color="#ca8a04" />
                            <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest`}>Holiday Mode</Text>
                        </View>
                        <Switch
                            value={holiday.active}
                            onValueChange={(v) => {
                                const updatedHoliday = { ...holiday, active: v };
                                setConfig({ ...config, holiday: updatedHoliday });
                                // Keep real-time update for the switch itself
                                updateKitchenConfig(tenant.id, { ...config, holiday: updatedHoliday });
                            }}
                            trackColor={{ false: "#e5e7eb", true: "#fde68a" }}
                            thumbColor={holiday.active ? "#ca8a04" : "#f4f3f4"}
                        />
                    </View>

                    {holiday.active && (
                        <View style={tw`px-1`}>
                            {!isEditingHoliday ? (
                                /* Professional Text Summary with Edit Icon */
                                <View style={tw`flex-row items-center justify-between`}>
                                    <View style={tw`gap-1`}>
                                        <View style={tw`flex-row items-center gap-2`}>
                                            <View style={tw`w-1.5 h-1.5 rounded-full bg-emerald-400`} />
                                            <Text style={tw`text-[11px] font-black text-slate-500 uppercase tracking-tighter`}>
                                                From: <Text style={tw`text-slate-900`}>{holiday.from || 'Not Set'}</Text>
                                            </Text>
                                        </View>
                                        <View style={tw`flex-row items-center gap-2`}>
                                            <View style={tw`w-1.5 h-1.5 rounded-full bg-amber-400`} />
                                            <Text style={tw`text-[11px] font-black text-slate-500 uppercase tracking-tighter`}>
                                                To: <Text style={tw`text-slate-900`}>{holiday.to || 'Not Set'}</Text>
                                            </Text>
                                        </View>
                                        {holiday.reason && (
                                            <Text style={tw`text-[10px] font-bold text-gray-400 mt-1 italic`}>"{holiday.reason}"</Text>
                                        )}
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setIsEditingHoliday(true)}
                                        style={tw`p-2 bg-gray-50 rounded-lg border border-gray-100/50`}
                                    >
                                        <Edit2 size={12} color="#ca8a04" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                /* Active Editor View */
                                <View style={tw`gap-4 mt-2`}>
                                    <View style={tw`flex-row gap-4`}>
                                        <InputTrigger
                                            label="From"
                                            value={holiday.from}
                                            onPress={() => openPicker('date', 'holiday', 'from', holiday.from)}
                                            placeholder="YYYY-MM-DD"
                                        />
                                        <InputTrigger
                                            label="To"
                                            value={holiday.to}
                                            onPress={() => openPicker('date', 'holiday', 'to', holiday.to)}
                                            placeholder="YYYY-MM-DD"
                                        />
                                    </View>
                                    <TextInput
                                        style={tw`bg-gray-50 rounded-2xl px-6 py-4 border border-gray-100 font-bold text-gray-900`}
                                        value={holiday.reason}
                                        onChangeText={(v) => setConfig({ ...config, holiday: { ...holiday, reason: v } })}
                                        placeholder="Reason (e.g. Festival / Break)"
                                    />
                                    <TouchableOpacity
                                        onPress={async () => {
                                            setSavingConfig(true);
                                            await handleSave();
                                            setIsEditingHoliday(false);
                                            setSavingConfig(false);
                                        }}
                                        disabled={savingConfig}
                                        style={tw`bg-gray-900 rounded-2xl py-3 items-center justify-center flex-row gap-2 shadow-sm`}
                                    >
                                        {savingConfig ? <ActivityIndicator size="small" color="white" /> : (
                                            <>
                                                <CheckCircle size={14} color="white" />
                                                <Text style={tw`text-white font-black text-[10px] uppercase tracking-widest`}>Save Holiday Details</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* Payments & Credit Control */}
                <View style={tw`bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 mb-5`}>
                    {!isEditingDueLimit ? (
                        /* Compact Display Card with Integrated Edit */
                        <View style={tw`flex-row items-center justify-between bg-gray-50/50 p-4 rounded-3xl border border-gray-100`}>
                            <View style={tw`flex-row items-center gap-4`}>
                                <View style={tw`w-12 h-12 rounded-2xl bg-amber-50 items-center justify-center shadow-sm`}>
                                    <IndianRupee size={20} color="#ca8a04" />
                                </View>
                                <View>
                                    <Text style={tw`text-2xl font-black text-slate-900`}>₹{config?.maxDueLimit || 0}</Text>
                                    <Text style={tw`text-[9px] font-black text-amber-600 uppercase tracking-tighter`}>Max Due Limit</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => setIsEditingDueLimit(true)}
                                style={tw`p-2.5 bg-gray-50 rounded-xl border border-gray-100`}
                            >
                                <Edit2 size={16} color="#ca8a04" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        /* Edit Form */
                        <View style={tw`gap-4`}>
                            <View>
                                <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2`}>Maximum Due Limit per Student (₹)</Text>
                                <TextInput
                                    style={tw`bg-gray-50 rounded-2xl px-5 py-3 border border-gray-100 font-bold text-gray-900`}
                                    value={config?.maxDueLimit?.toString()}
                                    onChangeText={(v) => setConfig({ ...config, maxDueLimit: parseInt(v) || 0 })}
                                    placeholder="e.g. 300"
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={tw`bg-amber-50 rounded-2xl p-4 flex-row gap-3 border border-amber-100`}>
                                <Info size={16} color="#ca8a04" style={tw`mt-0.5`} />
                                <Text style={tw`flex-1 text-[11px] font-bold text-amber-800 leading-4`}>
                                    Kitchens control how much unpaid balance a student can accumulate before ordering is restricted.
                                </Text>
                            </View>

                            <View style={tw`flex-row gap-3 mt-2`}>
                                <TouchableOpacity
                                    onPress={() => setIsEditingDueLimit(false)}
                                    style={tw`flex-1 bg-gray-100 rounded-2xl py-3 items-center justify-center`}
                                >
                                    <Text style={tw`text-gray-500 font-black text-[10px] uppercase tracking-widest`}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleSave}
                                    disabled={savingConfig}
                                    style={tw`flex-2 bg-gray-900 rounded-2xl py-3 items-center justify-center flex-row gap-2`}
                                >
                                    {savingConfig ? <ActivityIndicator color="white" /> : (
                                        <>
                                            <Save size={14} color="white" />
                                            <Text style={tw`text-white font-black text-[10px] uppercase tracking-widest`}>Update Credit Policy</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                {/* Sign Out Button */}
                <Pressable
                    onPress={handleLogout}
                    style={({ pressed }) => [
                        tw`bg-red-50 rounded-[24px] p-6 mb-5 flex-row items-center justify-center gap-3 border border-red-100`,
                        pressed && tw`bg-red-100`
                    ]}
                >
                    <LogOut size={20} color="#dc2626" />
                    <Text style={tw`text-red-600 font-black text-sm uppercase tracking-widest`}>Sign Out</Text>
                </Pressable>

                <Text style={tw`text-center text-xs text-gray-300 mt-2 uppercase font-bold tracking-widest`}>DabbaMe v1.0.0 • Production</Text>
            </ScrollView>

            <DateTimePickerModal
                isVisible={picker.show}
                mode={picker.mode}
                date={picker.value}
                onConfirm={handlePickerConfirm}
                onCancel={handlePickerCancel}
                is24Hour={false}
                minimumDate={picker.mode === 'date' ? new Date() : undefined}
            />
        </View>
    );
};
