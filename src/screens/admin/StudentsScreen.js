import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import tw from 'twrnc';
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
            {/* Header */}
            <View style={tw`px-6 pt-14 pb-6 bg-white border-b border-gray-100`}>
                <Text style={tw`text-2xl font-black text-gray-900`}>Students</Text>
                <View style={tw`flex-row items-center gap-2 mt-2 bg-yellow-50 self-start px-3 py-1 rounded-full border border-yellow-100`}>
                    <Users size={12} color="#ca8a04" />
                    <Text style={tw`text-[10px] font-black text-yellow-800 uppercase`}>{students.length} Registered</Text>
                </View>
            </View>

            <View style={tw`p-6`}>
                {/* Search */}
                <View style={tw`bg-white rounded-3xl flex-row items-center px-6 shadow-sm border border-gray-100 mb-6`}>
                    <Search size={20} color="#9ca3af" />
                    <TextInput
                        style={tw`flex-1 py-4 ml-3 font-bold text-gray-900`}
                        placeholder="Search student name or phone..."
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                </View>

                <ScrollView
                    contentContainerStyle={tw`pb-64`}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {filteredStudents.map(s => (
                        <Pressable
                            key={s.id}
                            onPress={() => navigation.navigate('StudentDetails', { studentId: s.id })}
                            style={({ pressed }) => [
                                tw`bg-white rounded-3xl p-4 mb-3 flex-row items-center justify-between border border-gray-100 shadow-sm`,
                                pressed && tw`opacity-70 scale-98`
                            ]}
                        >
                            <View style={tw`flex-row items-center gap-4`}>
                                <View style={tw`w-12 h-12 rounded-2xl bg-yellow-100 items-center justify-center`}>
                                    <Text style={tw`text-lg font-black text-yellow-800`}>{(s.name || 'S')[0]}</Text>
                                </View>
                                <View>
                                    <Text style={tw`text-base font-bold text-gray-900`}>{s.name || 'Unnamed Student'}</Text>
                                    <View style={tw`flex-row items-center gap-1 mt-0.5`}>
                                        <Phone size={10} color="#9ca3af" />
                                        <Text style={tw`text-[10px] font-bold text-gray-400`}>{s.phoneNumber || 'No phone'}</Text>
                                    </View>
                                </View>
                            </View>
                            <ChevronRight size={20} color="#d1d5db" />
                        </Pressable>
                    ))}

                    {filteredStudents.length === 0 && (
                        <View style={tw`items-center justify-center py-20`}>
                            <Users size={48} color="#e5e7eb" />
                            <Text style={tw`text-gray-400 font-bold mt-4`}>No students found</Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        </View>
    );
};
