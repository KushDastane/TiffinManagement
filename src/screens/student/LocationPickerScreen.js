import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserProfile } from '../../services/authService';
import tw from 'twrnc';
import { MapPin, ArrowRight, Navigation } from 'lucide-react-native';

export const LocationPickerScreen = ({ navigation }) => {
    const { user, userProfile } = useAuth();
    const [city, setCity] = useState('');
    const [pincode, setPincode] = useState('');
    const [area, setArea] = useState('');
    const [loading, setLoading] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const [autoDetected, setAutoDetected] = useState(false);

  const detectLocation = async () => {
    try {
        setDetecting(true);

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission Denied", "Please allow location access.");
            return;
        }

        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.BestForNavigation
        });

        const { latitude, longitude } = location.coords;

        // 1️⃣ Reverse geocode from Expo (often more accurate)
        const expoReverse = await Location.reverseGeocodeAsync({ latitude, longitude });

        let detectedCity = '';
        let detectedPin = '';
        let detectedArea = '';

        if (expoReverse?.length) {
            const expoAddr = expoReverse[0];
            detectedCity = expoAddr.city || expoAddr.subregion || '';
            detectedPin = expoAddr.postalCode || '';
            detectedArea = expoAddr.district || expoAddr.street || '';
        }

        // 2️⃣ Nominatim fallback for locality precision
        const nominatim = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            { headers: { 'User-Agent': 'DabbaMe-App' } }
        );
        const nomData = await nominatim.json();

        if (nomData?.address) {
            detectedCity = detectedCity || nomData.address.city || nomData.address.town || '';
            detectedArea = detectedArea || nomData.address.suburb || nomData.address.neighbourhood || '';
        }

        // 3️⃣ Extra postal verification (best accuracy)
        let postalPin = detectedPin;

        try {
            const postalRes = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            const postalData = await postalRes.json();
            postalPin = postalData.postcode || postalPin;
        } catch {}

        setCity(detectedCity);
        setArea(detectedArea);
        setPincode(postalPin);
        setAutoDetected(true);

        // Smart warnings
        if (!postalPin) {
            Alert.alert("Verify Pincode", "City detected. Please enter exact pincode.");
        } else {
            Alert.alert("Location Detected", "Please verify pincode accuracy.");
        }

    } catch (err) {
        console.error("Location error:", err);
        Alert.alert("Error", "Could not detect location.");
    } finally {
        setDetecting(false);
    }
};


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
            area: area.trim(),
            locationSet: true
        });
        setLoading(false);

        if (result.error) {
            Alert.alert("Error", result.error);
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
                    <TouchableOpacity
                        onPress={detectLocation}
                        disabled={detecting}
                        style={tw`bg-blue-50 border border-blue-100 rounded-2xl p-4 flex-row items-center justify-center mb-4`}
                    >
                        {detecting ? (
                            <ActivityIndicator color="#2563eb" />
                        ) : (
                            <>
                                <Navigation size={16} color="#2563eb" style={tw`mr-2`} />
                                <Text style={tw`text-blue-600 font-black text-xs uppercase tracking-widest`}>Detect My Location</Text>
                            </>
                        )}
                    </TouchableOpacity>

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
                        <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1`}>Locality / Area</Text>
                        <TextInput
                            style={tw`text-base font-bold text-gray-900`}
                            placeholder="e.g. HSR Layout, Sector 7"
                            value={area}
                            onChangeText={setArea}
                            placeholderTextColor="#9ca3af"
                        />
                    </View>

                    <View style={tw`bg-gray-50 border ${autoDetected ? 'border-yellow-300' : 'border-gray-100'} rounded-2xl p-4 mt-4`}>
                        <View style={tw`flex-row items-center justify-between mb-1`}>
                            <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1`}>Pincode</Text>
                            {autoDetected && (
                                <Text style={tw`text-[8px] font-black text-yellow-600 uppercase tracking-widest`}>Double-check once</Text>
                            )}
                        </View>
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
                    disabled={loading || detecting}
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
