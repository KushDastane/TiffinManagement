import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, Switch, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { getKitchenConfig, updateKitchenConfig, updateKitchen } from '../../services/kitchenService';
import { logoutUser, updateUserProfile } from '../../services/authService';
import tw from 'twrnc';
import { LinearGradient } from 'expo-linear-gradient';
import { ChefHat, Clock, Calendar, LogOut, Save, ShieldCheck, Sun, Moon, Coffee, UtensilsCrossed, Edit2, Check, Copy, MapPin } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

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
            <Text style={tw`text-sm font-black text-gray-900 text-center`}>{value || placeholder}</Text>
        </Pressable>
    </View>
);

export const SettingsScreen = () => {
    const { user, userProfile } = useAuth();
    const { tenant } = useTenant();

    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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
            setConfig(data);
            setLoading(false);
        };
        load();
    }, [tenant?.id]);

    // Picker State
    const [picker, setPicker] = useState({ show: false, mode: 'time', field: null, subField: null, value: new Date() });

    useEffect(() => {
        if (userProfile && userProfile.hasSeenOnboarding === false) {
            updateUserProfile(user.uid, { hasSeenOnboarding: true });
        }
    }, [userProfile]);

    const openPicker = (mode, field, subField, currentValue) => {
        let date = new Date();
        if (mode === 'time' && currentValue) {
            const [h, m] = currentValue.split(':');
            date.setHours(parseInt(h) || 0, parseInt(m) || 0, 0, 0);
        } else if (mode === 'date' && currentValue) {
            const parts = currentValue.split('-');
            if (parts.length === 3) date = new Date(parts[0], parts[1] - 1, parts[2]);
        }
        setPicker({ show: true, mode, field, subField, value: date });
    };

    const handlePickerChange = (event, selectedDate) => {
        if (event.type === 'dismissed') {
            setPicker(prev => ({ ...prev, show: false }));
            return;
        }

        const currentDate = selectedDate || picker.value;
        if (Platform.OS === 'android') {
            setPicker(prev => ({ ...prev, show: false }));
        }

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
            setPicker(prev => ({ ...prev, value: selectedDate }));
        }
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

        setSaving(true);
        const result = await updateKitchen(tenant.id, {
            name: localKitchen.name,
            address: localKitchen.address,
            phone: localKitchen.phone,
            whatsapp: localKitchen.whatsapp
        });
        setSaving(false);
        if (result.success) Alert.alert("Success", "Kitchen details updated");
        else Alert.alert("Error", result.error);
    };

    const handleSavePartner = async () => {
        // Validation
        if (!localKitchen.deliveryBoyName?.trim()) return Alert.alert("Required", "Delivery partner name is required");
        if (!localKitchen.deliveryBoyPhone?.trim() || localKitchen.deliveryBoyPhone.length < 10) {
            return Alert.alert("Invalid", "Please enter a valid 10-digit Phone for delivery partner");
        }

        setSaving(true);
        const result = await updateKitchen(tenant.id, {
            deliveryBoyName: localKitchen.deliveryBoyName,
            deliveryBoyPhone: localKitchen.deliveryBoyPhone
        });
        setSaving(false);
        if (result.success) Alert.alert("Success", "Delivery partner details updated");
        else Alert.alert("Error", result.error);
    };

    const handleSave = async () => {
        setSaving(true);
        const result = await updateKitchenConfig(tenant.id, config);
        setSaving(false);
        if (result.success) Alert.alert("Success", "Meal settings updated");
        else Alert.alert("Error", result.error);
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
                    <View style={tw`flex-row items-center gap-2 mb-6`}>
                        <MapPin size={16} color="#ca8a04" />
                        <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest`}>Kitchen Details & Address</Text>
                    </View>

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

                        <Pressable
                            onPress={handleSaveBasic}
                            disabled={saving}
                            style={tw`bg-gray-900 rounded-2xl py-3 items-center justify-center flex-row gap-2 mt-2`}
                        >
                            {saving ? <ActivityIndicator color="white" /> : (
                                <>
                                    <Save size={14} color="white" />
                                    <Text style={tw`text-white font-black text-[10px] uppercase tracking-widest`}>Update Kitchen Details</Text>
                                </>
                            )}
                        </Pressable>
                    </View>
                </View>

                {/* Service Mode */}
                <View style={tw`bg-white rounded-[30px] p-6 shadow-sm border border-gray-100 mb-5`}>
                    <View style={tw`flex-row items-center gap-2 mb-6`}>
                        <ShieldCheck size={16} color="#ca8a04" />
                        <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest`}>Service Mode</Text>
                    </View>

                    <View style={tw`flex-row gap-2 mb-6`}>
                        {[
                            { id: 'DELIVERY', label: 'Delivery' },
                            { id: 'PICKUP', label: 'Pickup Only' },
                            { id: 'BOTH', label: 'Both' }
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

                    {/* Delivery Partner Details */}
                    {(tenant?.serviceMode === 'DELIVERY' || tenant?.serviceMode === 'BOTH') && (
                        <View style={tw`pt-4 border-t border-gray-50 gap-4 items-center`}>
                            <Text style={tw`text-[9px] font-black text-yellow-600 uppercase tracking-widest mb-1 text-center`}>Delivery Partner Information</Text>
                            <View style={tw`flex-row gap-3`}>
                                <View style={tw`flex-1`}>
                                    <Text style={tw`text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 text-center`}>Name</Text>
                                    <TextInput
                                        style={tw`bg-gray-50 rounded-2xl px-5 py-3 border border-gray-100 font-black text-sm text-gray-900 text-center`}
                                        value={localKitchen.deliveryBoyName}
                                        onChangeText={(v) => setLocalKitchen({ ...localKitchen, deliveryBoyName: v })}
                                        placeholder="Name"
                                        placeholderTextColor="#9ca3af"
                                    />
                                </View>
                                <View style={tw`flex-1`}>
                                    <Text style={tw`text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 text-center`}>Phone</Text>
                                    <TextInput
                                        style={tw`bg-gray-50 rounded-2xl px-5 py-3 border border-gray-100 font-black text-sm text-gray-900 text-center`}
                                        value={localKitchen.deliveryBoyPhone}
                                        onChangeText={(v) => setLocalKitchen({ ...localKitchen, deliveryBoyPhone: v })}
                                        placeholder="Phone"
                                        placeholderTextColor="#9ca3af"
                                        keyboardType="phone-pad"
                                    />
                                </View>
                            </View>
                            <Pressable
                                onPress={handleSavePartner}
                                disabled={saving}
                                style={tw`bg-gray-900 rounded-2xl py-3 px-8 items-center justify-center flex-row gap-2 mt-2 w-full`}
                            >
                                {saving ? <ActivityIndicator color="white" /> : (
                                    <>
                                        <Save size={14} color="white" />
                                        <Text style={tw`text-white font-black text-[10px] uppercase tracking-widest`}>Update Partner Details</Text>
                                    </>
                                )}
                            </Pressable>
                        </View>
                    )}
                </View>

                {/* Meal Slots */}
                <View style={tw`bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 mb-5`}>
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
                        const slot = config?.mealSlots?.[m.id] || { active: false, start: '08:00', end: '10:00' };
                        const Icon = m.icon;

                        return (
                            <View key={m.id} style={tw`mb-8 last:mb-0`}>
                                <View style={tw`flex-row items-center justify-between mb-4`}>
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

                                        {(tenant?.serviceMode === 'PICKUP' || tenant?.serviceMode === 'BOTH') && (
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

                                        {(tenant?.serviceMode === 'DELIVERY' || tenant?.serviceMode === 'BOTH') && (
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
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* Holiday */}
                <View style={tw`bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 mb-5`}>
                    <View style={tw`flex-row items-center justify-between mb-4`}>
                        <View style={tw`flex-row items-center gap-2`}>
                            <Calendar size={16} color="#ca8a04" />
                            <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest`}>Holiday Mode</Text>
                        </View>
                        <Switch
                            value={holiday.active}
                            onValueChange={(v) => setConfig({ ...config, holiday: { ...holiday, active: v } })}
                            trackColor={{ false: "#e5e7eb", true: "#fde68a" }}
                            thumbColor={holiday.active ? "#ca8a04" : "#f4f3f4"}
                        />
                    </View>

                    {holiday.active && (
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
                            <Pressable
                                onPress={handleSave}
                                disabled={saving}
                                style={tw`bg-gray-900 rounded-2xl py-3 items-center justify-center flex-row gap-2`}
                            >
                                {saving ? <ActivityIndicator color="white" /> : (
                                    <>
                                        <Save size={14} color="white" />
                                        <Text style={tw`text-white font-black text-[10px] uppercase tracking-widest`}>Update Holiday Settings</Text>
                                    </>
                                )}
                            </Pressable>
                        </View>
                    )}
                </View>



                <Text style={tw`text-center text-xs text-gray-300 mt-10 uppercase font-bold tracking-widest`}>DabbaMe v1.0.0 • Production</Text>
            </ScrollView>

            {picker.show && (
                <DateTimePicker
                    value={picker.value}
                    mode={picker.mode}
                    is24Hour={picker.mode === 'time'}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handlePickerChange}
                    style={Platform.OS === 'ios' ? { backgroundColor: 'white', position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 } : {}}
                    minimumDate={picker.mode === 'date' ? new Date() : undefined}
                />
            )}

            {/* iOS Done Button */}
            {Platform.OS === 'ios' && picker.show && (
                <View style={tw`absolute bottom-[200px] left-0 right-0 bg-gray-100 p-2 z-50 flex-row justify-end border-t border-gray-200`}>
                    <Pressable onPress={() => setPicker(prev => ({ ...prev, show: false }))} style={tw`bg-blue-500 px-4 py-2 rounded-lg`}>
                        <Text style={tw`text-white font-bold`}>Done</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
};
