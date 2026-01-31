import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, orderBy, limit, startAfter } from 'firebase/firestore';
import { useTenant } from '../../contexts/TenantContext';
import tw from 'twrnc';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Users, ChevronRight, Phone, IndianRupee } from 'lucide-react-native';

export const StudentsScreen = ({ navigation }) => {
    const { tenant } = useTenant();
    const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'DUES'
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [duesSummary, setDuesSummary] = useState({ students: [], totalKitchenOutstanding: 0 });
    const [duesLoading, setDuesLoading] = useState(false);

    const fetchStudents = async (getNext = false) => {
        if (!tenant?.id) return;
        if (getNext && !hasMore) return;

        setLoading(true);
        try {
            const usersRef = collection(db, 'users');
            let q = query(
                usersRef,
                where('role', '==', 'student'),
                where('joinedKitchens', 'array-contains', tenant.id),
                orderBy('name'),
                limit(20)
            );

            if (getNext && lastDoc) {
                q = query(q, startAfter(lastDoc));
            }

            const snap = await getDocs(q);
            let newList = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Deduplicate local state
            const { normalizePhone } = require('../../services/paymentService');
            const seen = new Map();
            newList.forEach(s => {
                const norm = normalizePhone(s.phoneNumber);
                if (!norm) {
                    seen.set(s.id, s);
                    return;
                }
                const existing = seen.get(norm);
                if (!existing || (existing.isBasic && !s.isBasic)) {
                    seen.set(norm, s);
                }
            });
            newList = Array.from(seen.values());

            if (getNext) {
                setStudents(prev => {
                    const combined = [...prev, ...newList];
                    const finalSeen = new Map();
                    combined.forEach(c => {
                        const n = normalizePhone(c.phoneNumber);
                        if (!n) { finalSeen.set(c.id, c); return; }
                        const e = finalSeen.get(n);
                        if (!e || (e.isBasic && !c.isBasic)) finalSeen.set(n, c);
                    });
                    return Array.from(finalSeen.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                });
            } else {
                setStudents(newList);
            }

            setLastDoc(snap.docs[snap.docs.length - 1] || null);
            setHasMore(snap.docs.length === 20);
        } catch (error) {
            console.error("StudentsScreen fetch error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchDues = async () => {
        if (!tenant?.id) return;
        setDuesLoading(true);
        const { getKitchenOutstandingSummary } = require('../../services/paymentService');
        const data = await getKitchenOutstandingSummary(tenant.id);
        setDuesSummary(data);
        setDuesLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        if (activeTab === 'ALL') fetchStudents();
        else fetchDues();
    }, [tenant?.id, activeTab]);

    const filteredStudents = useMemo(() => {
        if (!searchTerm) return students;
        return students.filter(s =>
            (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.phoneNumber || '').includes(searchTerm)
        );
    }, [students, searchTerm]);

    const onRefresh = () => {
        setRefreshing(true);
        if (activeTab === 'ALL') fetchStudents();
        else fetchDues();
    };

    if (loading) return <View style={tw`flex-1 items-center justify-center bg-[#faf9f6]`}><ActivityIndicator color="#ca8a04" /></View>;

    return (
        <View style={tw`flex-1 bg-[#faf9f6]`}>
            {/* 1. Absolute Creative Header - Fixed & Sticky */}
            <View style={tw`absolute top-0 left-0 right-0 z-10`}>
                <LinearGradient
                    colors={['#fff', '#faf9f6']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={tw`px-6 pt-16 pb-6 rounded-b-[45px] shadow-sm border-b border-gray-100/50`}
                >
                    <View style={tw`mb-4`}>
                        <View style={tw`flex-row justify-between items-center mb-4`}>
                            <View>
                                <Text style={tw`text-2xl font-black text-gray-900`}>Customers</Text>
                                <View style={tw`flex-row items-center gap-2 bg-yellow-50 self-start px-2 py-0.5 rounded-lg border border-yellow-100 mt-1`}>
                                    <Users size={10} color="#ca8a04" />
                                    <Text style={tw`text-[9px] font-black text-yellow-800 uppercase`}>
                                        {activeTab === 'ALL' ? `${students.length} Registered` : `${duesSummary.students.length} with Dues`}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {activeTab === 'DUES' && (
                            <View style={tw`bg-red-50 p-4 rounded-3xl border border-red-100 flex-row justify-between items-center mb-4`}>
                                <View>
                                    <Text style={tw`text-red-400 text-[8px] font-black uppercase tracking-widest mb-1`}>Total Kitchen Outstanding</Text>
                                    <Text style={tw`text-2xl font-black text-red-700`}>₹{duesSummary.totalKitchenOutstanding}</Text>
                                </View>
                                <View style={tw`w-12 h-12 rounded-2xl bg-red-100 items-center justify-center`}>
                                    <View style={tw`w-2 h-2 rounded-full bg-red-500 absolute top-2 right-2`} />
                                    <IndianRupee size={24} color="#b91c1c" />
                                </View>
                            </View>
                        )}

                        {/* Search - Only in Directory View */}
                        {activeTab === 'ALL' && (
                            <View style={tw`bg-white rounded-2xl flex-row items-center px-4 shadow-sm border border-gray-100 mb-4`}>
                                <Search size={16} color="#9ca3af" strokeWidth={2.5} />
                                <TextInput
                                    style={tw`flex-1 py-3 ml-2 font-bold text-gray-900 text-sm`}
                                    placeholder="Search customer identity..."
                                    placeholderTextColor="#9ca3af"
                                    value={searchTerm}
                                    onChangeText={setSearchTerm}
                                />
                            </View>
                        )}

                        {/* Filter Toggle - Below Search */}
                        <View style={tw`flex-row gap-2`}>
                            {[
                                { id: 'ALL', label: 'Directory' },
                                { id: 'DUES', label: 'Dues' }
                            ].map(t => (
                                <Pressable
                                    key={t.id}
                                    onPress={() => setActiveTab(t.id)}
                                    style={[tw`px-5 py-2.5 rounded-2xl border`, activeTab === t.id ? tw`bg-gray-900 border-gray-900` : tw`bg-white border-gray-100`]}
                                >
                                    <Text style={[tw`text-[9px] font-black uppercase tracking-widest`, activeTab === t.id ? tw`text-white` : tw`text-gray-400`]}>{t.label}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                </LinearGradient>
            </View>

            {/* 2. Full Screen Scroll */}
            <ScrollView
                style={tw`flex-1`}
                contentContainerStyle={[tw`p-6 pb-64`, { paddingTop: activeTab === 'ALL' ? 300 : 340 }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >

                {activeTab === 'ALL' ? (
                    filteredStudents.map(s => (
                        <Pressable
                            key={s.id}
                            onPress={() => navigation.navigate('StudentDetails', { studentId: s.id })}
                            style={tw`bg-white rounded-2xl p-4 mb-2 border border-gray-100 shadow-sm`}
                            android_ripple={{ color: '#f3f4f6' }}
                        >
                            <View style={tw`flex-row items-center justify-between`}>
                                <View style={tw`flex-row items-center flex-1`}>
                                    <View style={tw`w-12 h-12 rounded-xl bg-yellow-100 items-center justify-center mr-4`}>
                                        <Text style={tw`text-lg font-black text-yellow-800 uppercase`}>{(s.name || 'S')[0]}</Text>
                                    </View>
                                    <View style={tw`flex-1`}>
                                        <Text style={tw`text-base font-bold text-gray-900`}>{s.name || 'Unnamed Customer'}</Text>
                                        <View style={tw`flex-row items-center gap-1.5 mt-0.5`}>
                                            <View style={tw`w-1.5 h-1.5 rounded-full bg-yellow-400`} />
                                            <Text style={tw`text-[10px] font-bold text-gray-400 uppercase tracking-widest`}>{s.phoneNumber || 'NO PHONE'}</Text>
                                        </View>
                                    </View>
                                </View>
                                <ChevronRight size={18} color="#d1d5db" strokeWidth={2.5} />
                            </View>
                        </Pressable>
                    ))
                ) : (
                    duesSummary.students.map(s => (
                        <Pressable
                            key={s.userId}
                            onPress={() => navigation.navigate('StudentDetails', { studentId: s.userId })}
                            style={tw`bg-white rounded-[26px] p-5 mb-3 border border-red-50 shadow-sm`}
                            android_ripple={{ color: '#fef2f2' }}
                        >
                            <View style={tw`flex-row items-center justify-between`}>
                                <View style={tw`flex-row items-center flex-1`}>
                                    <View style={tw`w-12 h-12 rounded-2xl bg-red-50 items-center justify-center mr-4`}>
                                        <Text style={tw`text-lg font-black text-red-700 uppercase`}>{(s.name || 'S')[0]}</Text>
                                    </View>
                                    <View style={tw`flex-1`}>
                                        <Text style={tw`text-base font-black text-gray-900`}>{s.name}</Text>
                                        <Text style={tw`text-[9px] font-bold text-gray-400 uppercase tracking-tighter`}>{s.phoneNumber}</Text>
                                    </View>
                                </View>
                                <View style={tw`items-end`}>
                                    <Text style={tw`text-lg font-black text-red-600`}>₹{s.outstanding}</Text>
                                    <View style={tw`bg-red-50 px-2 py-0.5 rounded-full mt-1`}>
                                        <Text style={tw`text-[8px] font-black text-red-500 uppercase`}>DUE AMOUNT</Text>
                                    </View>
                                </View>
                            </View>
                        </Pressable>
                    ))
                )}

                {(activeTab === 'ALL' ? filteredStudents : duesSummary.students).length === 0 && (
                    <View style={tw`items-center justify-center py-20`}>
                        <Users size={48} color="#e5e7eb" />
                        <Text style={tw`text-gray-400 font-bold mt-4`}>No customers found</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};
