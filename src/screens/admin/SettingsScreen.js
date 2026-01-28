import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, Switch, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { getKitchenConfig, updateKitchenConfig, updateKitchen } from '../../services/kitchenService';
import { logoutUser, updateUserProfile } from '../../services/authService';
import tw from 'twrnc';
import { LinearGradient } from 'expo-linear-gradient';
import { ChefHat, Clock, Calendar, LogOut, Save, ShieldCheck, Sun, Moon, Coffee, UtensilsCrossed, Edit2, Check, Copy } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

// Helper Component for Triggers
const InputTrigger = ({ label, value, onPress, placeholder, disabled }) => (
    <View style={tw`flex-1`}>
        <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2`}>{label}</Text>
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={[
                tw`bg-white rounded-2xl px-4 py-3 border border-gray-100`,
                disabled && tw`bg-gray-50 opacity-50`
            ]}
        >
            <Text style={tw`font-bold text-gray-900`}>{value || placeholder}</Text>
        </Pressable>
    </View>
);

export const SettingsScreen = () => {
    const { user, userProfile } = useAuth();
    const { tenant } = useTenant();

    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Kitchen Name Edit State
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedKitchenName, setEditedKitchenName] = useState(tenant?.name || '');

    useEffect(() => {
        setEditedKitchenName(tenant?.name || '');
    }, [tenant?.name]);

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

    const handleSave = async () => {
        setSaving(true);
        const result = await updateKitchenConfig(tenant.id, config);
        setSaving(false);
        if (result.success) Alert.alert("Success", "Settings updated");
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
                {/* Kitchen Brief */}
                <View style={tw`bg-white rounded-[30px] p-5 shadow-sm border border-gray-100 mb-5`}>
                    <View style={tw`flex-row items-center justify-between`}>
                        <View style={tw`flex-row items-center gap-4 flex-1`}>
                            <View style={tw`w-12 h-12 rounded-2xl bg-yellow-100 items-center justify-center`}>
                                <ChefHat size={22} color="#ca8a04" />
                            </View>
                            <View style={tw`flex-1`}>
                                <Text style={tw`text-[10px] text-gray-400 font-bold uppercase tracking-widest`}>Kitchen Administrator</Text>
                                {isEditingName ? (
                                    <View style={tw`flex-row items-center gap-2 mt-1`}>
                                        <TextInput
                                            style={tw`flex-1 text-lg font-black text-gray-900 border-b border-yellow-400 pb-0.5`}
                                            value={editedKitchenName}
                                            onChangeText={setEditedKitchenName}
                                            autoFocus
                                        />
                                        <Pressable
                                            onPress={async () => {
                                                if (!editedKitchenName.trim()) return;
                                                setSaving(true);
                                                await updateKitchen(tenant.id, { name: editedKitchenName.trim() });
                                                setSaving(false);
                                                setIsEditingName(false);
                                            }}
                                            style={tw`bg-gray-900 p-1.5 rounded-lg`}
                                            disabled={saving}
                                        >
                                            <Check size={14} color="white" />
                                        </Pressable>
                                    </View>
                                ) : (
                                    <Pressable onLongPress={() => setIsEditingName(true)} delayLongPress={500} style={tw`flex-row items-center gap-2`}>
                                        <Text style={tw`text-lg font-black text-gray-900`}>{tenant?.name}</Text>
                                        <Pressable onPress={() => setIsEditingName(true)} style={tw`bg-gray-50 p-1.5 rounded-md`}>
                                            <Edit2 size={12} color="#9ca3af" />
                                        </Pressable>
                                    </Pressable>
                                )}
                            </View>
                        </View>
                        <Pressable
                            onPress={handleLogout}
                            style={({ pressed }) => [
                                tw`w-10 h-10 rounded-xl bg-red-50 items-center justify-center border border-red-100 ml-2`,
                                pressed && tw`opacity-70 scale-90`
                            ]}
                        >
                            <LogOut size={18} color="#b91c1c" />
                        </Pressable>
                    </View>

                    {/* Join Code Section - No Overlap */}
                    <View style={tw`mt-5 pt-4 border-t border-gray-50 flex-row justify-between items-center`}>
                        <View>
                            <Text style={tw`text-[8px] font-black text-gray-300 uppercase tracking-widest`}>Invite Kitchen Joining Code</Text>
                            <Text style={tw`text-base font-black text-gray-900 tracking-tight mt-0.5`}>{tenant?.joinCode || '...'}</Text>
                        </View>
                        <Pressable
                            onPress={handleCopyCode}
                            style={({ pressed }) => [
                                tw`bg-yellow-100 items-center justify-center px-4 py-2 rounded-xl border border-yellow-200 flex-row gap-2`,
                                pressed && tw`opacity-70 scale-95`
                            ]}
                        >
                            <Text style={tw`text-[10px] font-black text-yellow-800 uppercase`}>Copy Code</Text>
                            <Copy size={12} color="#ca8a04" />
                        </Pressable>
                    </View>
                </View>

                {/* Meal Slots */}
                <View style={tw`bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 mb-5`}>
                    <View style={tw`flex-row items-center gap-2 mb-6`}>
                        <Clock size={16} color="#ca8a04" />
                        <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest`}>Meal Timings</Text>
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
                            <View key={m.id} style={tw`mb-6 last:mb-0`}>
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
                                    <View style={tw`flex-row gap-4 pl-11`}>
                                        <InputTrigger
                                            label="From"
                                            value={slot.start}
                                            onPress={() => openPicker('time', 'mealSlots', `${m.id}.start`, slot.start)}
                                            placeholder="00:00"
                                        />
                                        <InputTrigger
                                            label="To"
                                            value={slot.end}
                                            onPress={() => openPicker('time', 'mealSlots', `${m.id}.end`, slot.end)}
                                            placeholder="00:00"
                                        />
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
