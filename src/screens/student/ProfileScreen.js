import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { logoutUser, updateUserProfile } from '../../services/authService';
import { switchKitchen } from '../../services/kitchenService';
import tw from 'twrnc';
import { LinearGradient } from 'expo-linear-gradient';
import {
    User, Phone, LogOut, ChefHat, Edit2, Check, Search, ArrowRight,
    MapPin, ShieldCheck, Sparkles, Plus, Compass
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

export const ProfileScreen = () => {
    const { user, userProfile } = useAuth();
    const { joinedKitchens } = useTenant();
    const navigation = useNavigation();

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(userProfile?.name || '');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setEditedName(userProfile?.name || '');
    }, [userProfile]);

    const handleSaveProfile = async () => {
        if (!editedName.trim()) return;
        setSaving(true);
        await updateUserProfile(user.uid, { name: editedName.trim() });
        setSaving(false);
        setIsEditing(false);
    };

    const handleLogout = async () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to logout?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Logout",
                    style: 'destructive',
                    onPress: async () => {
                        const result = await logoutUser();
                        if (result.error) {
                            Alert.alert("Error", result.error);
                        }
                    }
                }
            ]
        );
    };

    const getInitials = (name) => {
        if (!name) return "C";
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    // Derived State
    const activeKitchen = joinedKitchens.find(k => k.id === userProfile?.activeKitchenId);
    const otherKitchens = joinedKitchens.filter(k => k.id !== userProfile?.activeKitchenId);

    return (
        <View style={tw`flex-1 bg-[#faf9f6]`}>
            {/* Absolute Header - Summary View */}
            <View style={tw`absolute top-0 left-0 right-0 z-10`}>
                <LinearGradient
                    colors={['#fff', '#faf9f6']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={tw`px-6 pt-16 pb-8 rounded-b-[45px] shadow-sm border-b border-gray-100/50`}
                >
                    <Text style={tw`text-2xl font-black text-gray-900`}>My Profile</Text>
                    <Text style={tw`text-yellow-600 text-[10px] font-black uppercase tracking-widest mt-0.5`}>
                        Account & Kitchen Settings
                    </Text>
                </LinearGradient>
            </View>

            <ScrollView
                contentContainerStyle={tw`p-6 pt-48 pb-32`}
                style={tw`flex-1`}
                showsVerticalScrollIndicator={false}
            >
                {/* 1. IDENTITY CARD */}
                <View style={tw`bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 mb-8`}>
                    <View style={tw`items-center`}>
                        {/* Avatar Section */}
                        <View style={tw`flex-row items-center w-full gap-5`}>
                            <View style={tw`items-center justify-center`}>
                                <LinearGradient
                                    colors={['#fffbeb', '#fef08a']}
                                    style={tw`w-20 h-20 rounded-full items-center justify-center border-4 border-white shadow-md`}
                                >
                                    <Text style={tw`text-2xl font-black text-yellow-600`}>
                                        {getInitials(userProfile?.name)}
                                    </Text>
                                </LinearGradient>
                                <View style={tw`absolute -bottom-1 bg-yellow-400 px-2.5 py-0.5 rounded-full border-2 border-white`}>
                                    <View style={tw`flex-row items-center gap-1`}>
                                        <Sparkles size={8} color="black" />
                                        <Text style={tw`text-[7px] font-black text-black uppercase tracking-tighter`}>
                                            Foodie
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={tw`flex-1`}>
                                {isEditing ? (
                                    <View style={tw`gap-2`}>
                                        <Text style={tw`text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1`}>
                                            Edit Name
                                        </Text>
                                        <View style={tw`flex-row items-center gap-2`}>
                                            <TextInput
                                                style={tw`flex-1 bg-gray-50 rounded-xl px-3 py-2 text-base font-black text-gray-900 border border-gray-100`}
                                                value={editedName}
                                                onChangeText={setEditedName}
                                                autoFocus
                                            />
                                            <TouchableOpacity
                                                onPress={handleSaveProfile}
                                                disabled={saving}
                                                style={tw`bg-gray-900 p-2.5 rounded-xl`}
                                            >
                                                {saving ? <ActivityIndicator size="small" color="white" /> : <Check size={16} color="white" />}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={tw`flex-row items-center justify-between`}>
                                        <View>
                                            <Text style={tw`text-xl font-black text-slate-900 mb-1`} numberOfLines={1}>
                                                {userProfile?.name || 'Customer'}
                                            </Text>
                                            <View style={tw`flex-row items-center gap-2`}>
                                                <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest`}>
                                                    {userProfile?.role === 'student' ? 'Customer Account' : 'User'}
                                                </Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => setIsEditing(true)}
                                            style={tw`p-2.5 bg-gray-50 rounded-xl border border-gray-100`}
                                        >
                                            <Edit2 size={16} color="#ca8a04" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Info Grid */}
                        <View style={tw`w-full mt-6 pt-5 border-t border-slate-50 flex-row justify-between items-center`}>
                            <View style={tw`flex-1 items-center border-r border-slate-50`}>
                                <View style={tw`w-8 h-8 rounded-xl bg-emerald-50 items-center justify-center mb-1.5`}>
                                    <Phone size={14} color="#059669" />
                                </View>
                                <Text style={tw`text-[10px] font-black text-slate-900`}>
                                    {userProfile?.phoneNumber || '-'}
                                </Text>
                                <Text style={tw`text-[8px] text-slate-400 font-bold uppercase`}>Mobile</Text>
                            </View>

                            <View style={tw`flex-1 items-center border-r border-slate-50`}>
                                <View style={tw`w-8 h-8 rounded-xl bg-blue-50 items-center justify-center mb-1.5`}>
                                    <MapPin size={14} color="#2563eb" />
                                </View>
                                <Text style={tw`text-[10px] font-black text-slate-900`} numberOfLines={1}>
                                    {userProfile?.cityDisplay || userProfile?.city || 'Not Set'}
                                </Text>
                                <Text style={tw`text-[8px] text-slate-400 font-bold uppercase`}>City</Text>
                            </View>

                            <View style={tw`flex-1 items-center`}>
                                <View style={tw`w-8 h-8 rounded-xl bg-orange-50 items-center justify-center mb-1.5`}>
                                    <ShieldCheck size={14} color="#ea580c" />
                                </View>
                                <Text style={tw`text-[10px] font-black text-slate-900`}>
                                    {userProfile?.pincode || '-'}
                                </Text>
                                <Text style={tw`text-[8px] text-slate-400 font-bold uppercase`}>Pincode</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* 2. ACTIVE KITCHEN (Hero Card) */}
                <View style={tw`mb-8`}>
                    <Text style={tw`text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2`}>
                        Current Kitchen
                    </Text>
                    {activeKitchen ? (
                        <View style={tw`bg-white rounded-[28px] p-5 shadow-sm border border-yellow-200 relative overflow-hidden`}>
                            <LinearGradient
                                colors={['rgba(254, 240, 138, 0.3)', 'rgba(255, 255, 255, 0)']}
                                style={tw`absolute inset-0`}
                            />
                            <View style={tw`flex-row items-center gap-4`}>
                                <View style={tw`w-14 h-14 rounded-2xl bg-yellow-400 items-center justify-center shadow-sm`}>
                                    <ChefHat size={28} color="black" />
                                </View>
                                <View style={tw`flex-1`}>
                                    <Text style={tw`text-lg font-black text-gray-900`} numberOfLines={1}>
                                        {activeKitchen.name}
                                    </Text>
                                    <View style={tw`flex-row items-center gap-1.5 mt-0.5`}>
                                        <View style={tw`w-1.5 h-1.5 rounded-full bg-emerald-500`} />
                                        <Text style={tw`text-xs font-bold text-gray-500`}>
                                            Active Subscription
                                        </Text>
                                    </View>
                                </View>
                                <View style={tw`bg-yellow-100 p-2 rounded-full`}>
                                    <Check size={16} color="#854d0e" />
                                </View>
                            </View>
                        </View>
                    ) : (
                        <View style={tw`bg-gray-100/50 rounded-[24px] p-6 items-center justify-center border border-dashed border-gray-300`}>
                            <Text style={tw`text-gray-400 font-bold text-xs`}>No active kitchen selected</Text>
                        </View>
                    )}
                </View>

                {/* 3. SWITCH & MANAGE ACTIONS (Grid) */}
                <Text style={tw`text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2`}>
                    Kitchen Management
                </Text>

                {/* Switch List (if any other kitchens) */}
                {otherKitchens.length > 0 && (
                    <View style={tw`bg-white rounded-[28px] p-4 shadow-sm border border-gray-100 mb-6`}>
                        {otherKitchens.map((k, i) => (
                            <TouchableOpacity
                                key={k.id}
                                onPress={() => switchKitchen(user.uid, k.id)}
                                style={[
                                    tw`flex-row items-center justify-between p-3 rounded-2xl bg-gray-50`,
                                    i !== otherKitchens.length - 1 && tw`mb-2`
                                ]}
                            >
                                <View style={tw`flex-row items-center gap-3`}>
                                    <View style={tw`w-10 h-10 rounded-xl bg-white border border-gray-100 items-center justify-center`}>
                                        <ChefHat size={18} color="#9ca3af" />
                                    </View>
                                    <View>
                                        <Text style={tw`font-black text-gray-700 text-sm`}>{k.name}</Text>
                                        <Text style={tw`text-[9px] font-bold text-gray-400`}>Tap to switch</Text>
                                    </View>
                                </View>
                                <ArrowRight size={14} color="#d1d5db" />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Action Grid (Join / Discover) */}
                <View style={tw`flex-row gap-3 mb-8`}>
                    {/* Discover Card */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Discovery')}
                        style={tw`flex-1 h-32 bg-white rounded-[24px] border border-gray-100 p-4 justify-between items-start shadow-sm`}
                    >
                        <LinearGradient
                            colors={['#1f2937', '#111827']}
                            style={tw`p-2.5 rounded-xl`}
                        >
                            <Compass size={20} color="white" />
                        </LinearGradient>
                        <View>
                            <Text style={tw`text-gray-900 font-black text-sm leading-tight mb-0.5`}>
                                Find Nearby
                            </Text>
                            <Text style={tw`text-gray-400 font-bold text-[9px]`}>
                                Browse Kitchens
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Join Code Card */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate('JoinKitchen')}
                        style={tw`flex-1 h-32 bg-white rounded-[24px] border border-gray-100 p-4 justify-between items-start shadow-sm`}
                    >
                        <View style={tw`bg-yellow-50 p-2.5 rounded-xl`}>
                            <Plus size={20} color="#ca8a04" />
                        </View>
                        <View>
                            <Text style={tw`text-gray-900 font-black text-sm leading-tight mb-0.5`}>
                                Enter Code
                            </Text>
                            <Text style={tw`text-gray-400 font-bold text-[9px]`}>
                                Join by ID
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Logout Action */}
                <Pressable
                    onPress={handleLogout}
                    style={tw`flex-row items-center justify-center gap-2 p-4 opacity-80`}
                >
                    <LogOut size={16} color="#ef4444" />
                    <Text style={tw`text-red-500 font-black text-xs uppercase tracking-widest`}>
                        Sign Out
                    </Text>
                </Pressable>

                <Text style={tw`text-center text-[10px] font-bold text-gray-200 uppercase tracking-widest mb-4`}>
                    v1.0.0 • DabbaMe
                </Text>
            </ScrollView>
        </View>
    );
};
