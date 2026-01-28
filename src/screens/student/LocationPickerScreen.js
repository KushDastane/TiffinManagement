import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserProfile } from '../../services/authService';
import tw from 'twrnc';
import { MapPin, ArrowRight } from 'lucide-react-native';

export const LocationPickerScreen = ({ navigation }) => {
    const { user, userProfile } = useAuth();
    const [city, setCity] = useState('');
    const [pincode, setPincode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!city.trim() || !pincode.trim()) {
            Alert.alert("Required", "Please enter both City and Pincode to continue.");
            return;
        }

        if (pincode.length !== 6) {
            Alert.alert("Invalid Pincode", "Please enter a valid 6-digit Pincode.");
            return;
        }

        setLoading(true);
        const result = await updateUserProfile(user.uid, {
            city: city.trim(),
            pincode: pincode.trim(),
            locationSet: true
        });
        setLoading(false);

        if (result.error) {
            Alert.alert("Error", result.error);
        } else {
            // Navigation will be handled by RootNavigator reacting to userProfile change
        }
    };

    return (
        <ScrollView contentContainerStyle={tw`flex-grow bg-white p-6 items-center justify-center`}>
            <View style={tw`w-full max-w-sm`}>
                <View style={tw`mb-10 items-center`}>
                    <View style={tw`w-16 h-16 bg-yellow-50 rounded-3xl items-center justify-center mb-4`}>
                        <MapPin size={32} color="#ca8a04" />
                    </View>
                    <Text style={tw`text-3xl font-black text-gray-900 text-center`}>Where are you?</Text>
                    <Text style={tw`text-gray-500 text-center mt-2 font-medium`}>
                        Enter your location to see home-cooked{'\n'}kitchens delivering to you.
                    </Text>
                </View>

                <View style={tw`space-y-4`}>
                    <View style={tw`bg-gray-50 border border-gray-100 rounded-2xl p-4`}>
                        <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1`}>City</Text>
                        <TextInput
                            style={tw`text-base font-bold text-gray-900`}
                            placeholder="e.g. Mumbai, Pune"
                            value={city}
                            onChangeText={setCity}
                            placeholderTextColor="#9ca3af"
                        />
                    </View>

                    <View style={tw`bg-gray-50 border border-gray-100 rounded-2xl p-4 mt-4`}>
                        <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1`}>Pincode</Text>
                        <TextInput
                            style={tw`text-base font-bold text-gray-900`}
                            placeholder="e.g. 400001"
                            value={pincode}
                            onChangeText={setPincode}
                            maxLength={6}
                            keyboardType="numeric"
                            placeholderTextColor="#9ca3af"
                        />
                    </View>
                </View>

                <TouchableOpacity
                    onPress={handleSave}
                    disabled={loading}
                    style={tw`bg-gray-900 rounded-2xl py-4 mt-8 flex-row items-center justify-center shadow-lg shadow-gray-200`}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Text style={tw`text-white font-black text-sm uppercase tracking-widest mr-2`}>Find Kitchens</Text>
                            <ArrowRight size={18} color="white" />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};
