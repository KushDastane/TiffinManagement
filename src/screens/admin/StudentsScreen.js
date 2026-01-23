import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import tw from 'twrnc';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Users, ChevronRight, Phone } from 'lucide-react-native';

export const StudentsScreen = ({ navigation }) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        const q = query(
            collection(db, 'users'),
            where('role', '==', 'student')
        );

        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setStudents(list);
            setLoading(false);
            setRefreshing(false);
        }, (error) => {
            console.error("StudentsScreen: users listener error:", error);
            setLoading(false);
            setRefreshing(false);
        });

        return unsub;
    }, []);

    const filteredStudents = useMemo(() => {
        return students.filter(s =>
            (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.phoneNumber || '').includes(searchTerm)
        );
    }, [students, searchTerm]);

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
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
                    <View style={tw`flex-row justify-between items-center mb-4`}>
                        <View>
                            <Text style={tw`text-2xl font-black text-gray-900`}>Student Directory</Text>
                            <View style={tw`flex-row items-center gap-2 bg-yellow-50 self-start px-2 py-0.5 rounded-lg border border-yellow-100 mt-1`}>
                                <Users size={10} color="#ca8a04" />
                                <Text style={tw`text-[9px] font-black text-yellow-800 uppercase`}>{students.length} Registered</Text>
                            </View>
                        </View>
                    </View>

                    {/* Search - Sticky in Header */}
                    <View style={tw`bg-white rounded-2xl flex-row items-center px-4 shadow-sm border border-gray-100`}>
                        <Search size={16} color="#9ca3af" strokeWidth={2.5} />
                        <TextInput
                            style={tw`flex-1 py-3 ml-2 font-bold text-gray-900 text-sm`}
                            placeholder="Search student identity..."
                            placeholderTextColor="#9ca3af"
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                        />
                    </View>
                </LinearGradient>
            </View>

            {/* 2. Full Screen Scroll */}
            <ScrollView
                style={tw`flex-1`}
                contentContainerStyle={tw`p-6 pt-58 pb-64`}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >

                {filteredStudents.map(s => (
                    <View key={s.id} style={tw`mb-2`}>
                        <Pressable
                            onPress={() => navigation.navigate('StudentDetails', { studentId: s.id })}
                            style={({ pressed }) => [
                                pressed && tw`opacity-70 scale-[0.98]`
                            ]}
                        >
                            <View style={tw`bg-white rounded-2xl p-4 flex-row items-center justify-between border border-gray-100 shadow-sm`}>
                                <View style={tw`flex-row items-center flex-1`}>
                                    <View style={tw`w-12 h-12 rounded-xl bg-yellow-100 items-center justify-center mr-4`}>
                                        <Text style={tw`text-lg font-black text-yellow-800 uppercase`}>{(s.name || 'S')[0]}</Text>
                                    </View>
                                    <View style={tw`flex-1`}>
                                        <Text style={tw`text-base font-bold text-gray-900`}>{s.name || 'Unnamed Student'}</Text>
                                        <View style={tw`flex-row items-center gap-1.5 mt-0.5`}>
                                            <View style={tw`w-1.5 h-1.5 rounded-full bg-yellow-400`} />
                                            <Text style={tw`text-[10px] font-bold text-gray-400 uppercase tracking-widest`}>{s.phoneNumber || 'NO PHONE'}</Text>
                                        </View>
                                    </View>
                                </View>
                                <ChevronRight size={18} color="#d1d5db" strokeWidth={2.5} />
                            </View>
                        </Pressable>
                    </View>
                ))}

                {filteredStudents.length === 0 && (
                    <View style={tw`items-center justify-center py-20`}>
                        <Users size={48} color="#e5e7eb" />
                        <Text style={tw`text-gray-400 font-bold mt-4`}>No students found</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};
