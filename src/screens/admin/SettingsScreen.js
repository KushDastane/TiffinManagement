import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, Switch, Platform } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { getKitchenConfig, updateKitchenConfig } from '../../services/kitchenService';
import { logoutUser } from '../../services/authService';
import tw from 'twrnc';
import { ChefHat, Clock, Calendar, LogOut, Save, ShieldCheck } from 'lucide-react-native';

const TimeInput = ({ label, value, onChange }) => (
    <View style={tw`flex-1`}>
        <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2`}>{label}</Text>
        <TextInput
            style={tw`bg-white rounded-2xl px-4 py-3 border border-gray-100 font-bold text-gray-900`}
            value={value}
            onChangeText={onChange}
            placeholder="00:00"
        />
    </View>
);

export const SettingsScreen = () => {
    const { userProfile } = useAuth();
    const { tenant } = useTenant();

    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            const data = await getKitchenConfig(tenant?.id);
            setConfig(data);
            setLoading(false);
        };
        load();
    }, [tenant?.id]);

    const handleSave = async () => {
        setSaving(true);
        const result = await updateKitchenConfig(tenant.id, config);
        setSaving(false);
        if (result.success) Alert.alert("Success", "Settings updated");
        else Alert.alert("Error", result.error);
    };

    const handleLogout = async () => {
        Alert.alert("Logout", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Logout", style: "destructive", onPress: logoutUser }
        ]);
    };

    if (loading) return <View style={tw`flex-1 items-center justify-center bg-[#faf9f6]`}><ActivityIndicator color="#ca8a04" /></View>;

    const holiday = config?.holiday || { active: false };

    return (
        <View style={tw`flex-1 bg-[#faf9f6]`}>
            {/* Header */}
            <View style={tw`px-6 pt-14 pb-6 bg-white border-b border-gray-100`}>
                <Text style={tw`text-2xl font-black text-gray-900`}>Settings</Text>
                <Text style={tw`text-sm text-gray-500`}>Kitchen & Account preferences</Text>
            </View>

            <ScrollView contentContainerStyle={tw`p-6 pb-32`}>
                {/* Kitchen Brief */}
                <View style={tw`bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6`}>
                    <View style={tw`flex-row items-center gap-4`}>
                        <View style={tw`w-12 h-12 rounded-2xl bg-yellow-100 items-center justify-center`}>
                            <ChefHat size={24} color="#ca8a04" />
                        </View>
                        <View>
                            <Text style={tw`text-xl font-black text-gray-900`}>{tenant?.name}</Text>
                            <Text style={tw`text-xs text-gray-400 font-bold uppercase tracking-widest`}>Kitchen Administrator</Text>
                        </View>
                    </View>
                </View>

                {/* Timings */}
                <View style={tw`bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6`}>
                    <View style={tw`flex-row items-center gap-2 mb-4`}>
                        <Clock size={16} color="#ca8a04" />
                        <Text style={tw`text-xs font-black text-gray-400 uppercase tracking-widest`}>Operational Hours</Text>
                    </View>
                    <View style={tw`flex-row gap-4`}>
                        <TimeInput label="Opens At" value={config?.openTime} onChange={(v) => setConfig({ ...config, openTime: v })} />
                        <TimeInput label="Closes At" value={config?.closeTime} onChange={(v) => setConfig({ ...config, closeTime: v })} />
                    </View>
                </View>

                {/* Holiday */}
                <View style={tw`bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6`}>
                    <View style={tw`flex-row items-center justify-between mb-4`}>
                        <View style={tw`flex-row items-center gap-2`}>
                            <Calendar size={16} color="#ca8a04" />
                            <Text style={tw`text-xs font-black text-gray-400 uppercase tracking-widest`}>Holiday Mode</Text>
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
                                <View style={tw`flex-1`}>
                                    <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2`}>From</Text>
                                    <TextInput
                                        style={tw`bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100 font-bold text-gray-900`}
                                        value={holiday.from}
                                        onChangeText={(v) => setConfig({ ...config, holiday: { ...holiday, from: v } })}
                                        placeholder="YYYY-MM-DD"
                                    />
                                </View>
                                <View style={tw`flex-1`}>
                                    <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2`}>To</Text>
                                    <TextInput
                                        style={tw`bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100 font-bold text-gray-900`}
                                        value={holiday.to}
                                        onChangeText={(v) => setConfig({ ...config, holiday: { ...holiday, to: v } })}
                                        placeholder="YYYY-MM-DD"
                                    />
                                </View>
                            </View>
                            <TextInput
                                style={tw`bg-gray-50 rounded-2xl px-6 py-4 border border-gray-100 font-bold text-gray-900`}
                                value={holiday.reason}
                                onChangeText={(v) => setConfig({ ...config, holiday: { ...holiday, reason: v } })}
                                placeholder="Reason (e.g. Festival / Break)"
                            />
                        </View>
                    )}
                </View>

                {/* Actions */}
                <Pressable
                    onPress={handleSave}
                    disabled={saving}
                    style={tw`bg-yellow-600 rounded-3xl py-5 shadow-lg items-center justify-center flex-row gap-2 mb-4`}
                >
                    {saving ? <ActivityIndicator color="white" /> : (
                        <>
                            <Save size={20} color="white" />
                            <Text style={tw`text-white font-black text-base uppercase tracking-widest`}>Save All Settings</Text>
                        </>
                    )}
                </Pressable>

                <Pressable
                    onPress={handleLogout}
                    style={tw`bg-red-50 rounded-3xl py-5 items-center justify-center flex-row gap-2 border border-red-100`}
                >
                    <LogOut size={20} color="#b91c1c" />
                    <Text style={tw`text-red-700 font-black text-base uppercase tracking-widest`}>Logout Account</Text>
                </Pressable>

                <Text style={tw`text-center text-xs text-gray-300 mt-10 uppercase font-bold tracking-widest`}>TiffinCRM v1.0.0 • Production</Text>
            </ScrollView>
        </View>
    );
};
