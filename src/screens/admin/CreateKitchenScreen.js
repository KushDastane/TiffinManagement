import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useAuth } from '../../contexts/AuthContext';
import { createKitchen } from '../../services/kitchenService';
import { updateUserProfile } from '../../services/authService';
import tw from 'twrnc';
import { ChefHat, ArrowRight, ChevronLeft, Navigation } from 'lucide-react-native';

export const CreateKitchenScreen = () => {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [building, setBuilding] = useState('');
    const [locality, setLocality] = useState('');
    const [city, setCity] = useState('');
    const [pincode, setPincode] = useState('');
    const [phone, setPhone] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [serviceMode, setServiceMode] = useState('DELIVERY');
    const [kitchenType, setKitchenType] = useState('DABBA'); // Default Type
    const [loading, setLoading] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const [autoDetected, setAutoDetected] = useState(false);

    const types = [
        { id: 'DABBA', label: 'Tiffin Service', icon: '🍱', desc: 'Fixed meals (Lunch/Dinner)' }
    ];

    const serviceModes = [
        { id: 'DELIVERY', label: 'Delivery', icon: '🚚' },
        { id: 'PICKUP', label: 'Pickup', icon: '🏃' }
    ];

    const handleBack = async () => {
        setResetting(true);
        await updateUserProfile(user.uid, { role: null });
        setResetting(false);
    };

    useEffect(() => {
        const onBackPress = () => {
            handleBack();
            return true;
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, []);

    const detectLocation = async () => {
        try {
            setDetecting(true);
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert("Permission Denied", "Please allow location access to auto-fill your address.");
                setDetecting(false);
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High
            });
            const { latitude, longitude } = location.coords;

            // Reverse Geocode using Nominatim (Free)
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
                {
                    headers: {
                        'User-Agent': 'DabbaMe-App'
                    }
                }
            );
            const data = await response.json();

            if (data && data.address) {
                const addr = data.address;
                const detectedCity = addr.city || addr.town || addr.village || addr.suburb || '';
                const detectedPin = addr.postcode || '';
                const detectedLocality = addr.neighbourhood || addr.suburb || addr.road || '';
                const detectedBuilding = addr.house_number || '';

                setCity(detectedCity);
                setPincode(detectedPin);
                setLocality(detectedLocality);
                if (detectedBuilding) setBuilding(detectedBuilding);
                setAutoDetected(true);

                if (!detectedCity || !detectedPin) {
                    Alert.alert("Partial Detection", "We found your location but please verify the address details.");
                } else {
                    Alert.alert("Location Detected", "Please verify your Pincode and address are correct.");
                }
            }
        } catch (error) {
            console.error("Location detection error:", error);
            Alert.alert("Error", "Could not detect location. Please enter manually.");
        } finally {
            setDetecting(false);
        }
    };

    const handleCreate = async () => {
        if (!name.trim()) {
            Alert.alert("Error", "Please enter a kitchen name");
            return;
        }

        if (!building.trim()) {
            Alert.alert("Error", "Building/Shop number is required");
            return;
        }

        if (!city.trim() || !pincode.trim() || !locality.trim()) {
            Alert.alert("Error", "Locality, City and Pincode are required");
            return;
        }

        if (pincode.length !== 6) {
            Alert.alert("Error", "Please enter a valid 6-digit Pincode");
            return;
        }

        if (!phone.trim() || phone.length < 10) {
            Alert.alert("Error", "Please enter a valid 10-digit phone number");
            return;
        }

        setLoading(true);
        const result = await createKitchen(user.uid, {
            name: name.trim(),
            address: {
                building: building.trim(),
                locality: locality.trim(),
                city: city.trim(),
                pinCode: pincode.trim()
            },
            phone: phone.trim(),
            whatsapp: whatsapp.trim() || phone.trim(),
            serviceMode,
            kitchenType,
            theme: {
                primaryColor: '#FACC15' // Default
            }
        });
        setLoading(false);

        if (result.error) Alert.alert("Error", result.error);
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-white`}>
            <View style={tw`flex-1`}>
                {/* Back Button */}
                <TouchableOpacity
                    onPress={handleBack}
                    style={tw`absolute top-4 left-3 p-2 bg-gray-50 rounded-full z-10`}
                    disabled={resetting || loading}
                >
                    {resetting ? <ActivityIndicator size="small" color="#9ca3af" /> : <ChevronLeft size={20} color="#374151" />}
                </TouchableOpacity>

                <ScrollView style={tw`flex-1 bg-white px-6`} showsVerticalScrollIndicator={false} contentContainerStyle={tw`items-center justify-center flex-grow pt-12 pb-10`}>
                    <View style={tw`w-full max-w-[90%]`}>
                        <View style={tw`mb-10 items-center`}>
                            <View style={tw`w-14 h-14 bg-yellow-100 rounded-2xl items-center justify-center mb-3`}>
                                <ChefHat size={24} color="#ca8a04" />
                            </View>
                            <Text style={tw`text-2xl font-black text-gray-900 tracking-tight text-center`}>Kitchen Setup</Text>
                            <Text style={tw`text-xs text-gray-400 mt-1 font-bold uppercase tracking-wide text-center`}>Culinary Empire Starts Here</Text>
                        </View>

                        {/* Kitchen Name */}
                        <View style={tw`bg-gray-50 rounded-2xl p-4 mb-4`}>
                            <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1`}>Kitchen Name</Text>
                            <TextInput
                                style={tw`w-full text-base font-bold text-gray-900 py-1`}
                                placeholder="e.g. Grandma's Tiffin"
                                value={name}
                                onChangeText={setName}
                                placeholderTextColor="#9ca3af"
                                selectionColor="#ca8a04"
                            />
                        </View>

                        {/* Address Group */}
                        <View style={tw`bg-white rounded-2xl p-1 mb-4`}>
                            <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-1`}>Kitchen Location</Text>

                            <TouchableOpacity
                                onPress={detectLocation}
                                disabled={detecting}
                                style={tw`bg-blue-50 rounded-2xl p-4 flex-row items-center justify-center mb-4`}
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

                            <View style={tw`bg-gray-50 rounded-2xl p-4 mb-3`}>
                                <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1`}>Flat / Shop / Building</Text>
                                <TextInput
                                    style={tw`w-full text-base font-bold text-gray-900 py-1`}
                                    placeholder="e.g. Shop 5, Crystal Plaza"
                                    value={building}
                                    onChangeText={setBuilding}
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>

                            <View style={tw`bg-gray-50 rounded-2xl p-4 mb-3`}>
                                <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1`}>Locality / Area</Text>
                                <TextInput
                                    style={tw`w-full text-base font-bold text-gray-900 py-1`}
                                    placeholder="e.g. Sector 12, HSR Layout"
                                    value={locality}
                                    onChangeText={setLocality}
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>

                            <View style={tw`flex-row gap-3`}>
                                <View style={tw`flex-1 bg-gray-50 rounded-2xl p-4`}>
                                    <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1`}>City</Text>
                                    <TextInput
                                        style={tw`w-full text-base font-bold text-gray-900 py-1`}
                                        placeholder="Mumbai"
                                        value={city}
                                        onChangeText={setCity}
                                        placeholderTextColor="#9ca3af"
                                    />
                                </View>
                                <View style={tw`flex-1 bg-gray-50 rounded-2xl p-4 border border-transparent ${autoDetected ? 'border-yellow-400/50' : ''}`}>
                                    <View style={tw`flex-row items-center justify-between`}>
                                        <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1`}>Pincode</Text>
                                    </View>
                                    <TextInput
                                        style={tw`w-full text-base font-bold text-gray-900 py-1`}
                                        placeholder="6 Digits"
                                        value={pincode}
                                        onChangeText={setPincode}
                                        placeholderTextColor="#9ca3af"
                                        keyboardType="numeric"
                                        maxLength={6}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Contact Group */}
                        <View style={tw`bg-gray-50 rounded-2xl p-4 mb-8`}>
                            <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1`}>Contact Number (WhatsApp)</Text>
                            <TextInput
                                style={tw`w-full text-base font-bold text-gray-900 py-1`}
                                placeholder="9876543210"
                                value={phone}
                                onChangeText={(v) => {
                                    setPhone(v);
                                    setWhatsapp(v);
                                }}
                                placeholderTextColor="#9ca3af"
                                keyboardType="phone-pad"
                            />
                        </View>

                        {/* Service Mode Selection */}
                        <View style={tw`mb-6 w-full`}>
                            <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1 text-center`}>Service Mode</Text>
                            <View style={tw`flex-row gap-3`}>
                                {serviceModes.map((m) => (
                                    <TouchableOpacity
                                        key={m.id}
                                        onPress={() => setServiceMode(m.id)}
                                        style={[
                                            tw`flex-1 p-4 rounded-2xl items-center`,
                                            serviceMode === m.id ? tw`bg-gray-900` : tw`bg-gray-50`
                                        ]}
                                    >
                                        <Text style={tw`text-2xl mb-2`}>{m.icon}</Text>
                                        <Text style={[tw`font-black text-[9px] uppercase text-center`, { color: serviceMode === m.id ? 'white' : '#9ca3af' }]}>{m.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Kitchen Type Selection - Compact */}
                        <View style={tw`mb-10`}>
                            <View style={tw`flex-row gap-3`}>
                                {types.map((t) => (
                                    <TouchableOpacity
                                        key={t.id}
                                        onPress={() => setKitchenType(t.id)}
                                        style={[
                                            tw`flex-1 p-4 rounded-2xl items-center`,
                                            kitchenType === t.id && tw`bg-gray-900`
                                        ]}
                                    >
                                        <Text style={tw`text-2xl mb-2`}>{t.icon}</Text>
                                        <Text style={[tw`font-black text-[10px] uppercase text-center`, { color: kitchenType === t.id ? 'white' : '#111827' }]}>{t.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleCreate}
                            disabled={loading}
                            style={tw`w-full bg-[#FACC15] rounded-2xl py-4 shadow-sm items-center flex-row justify-center gap-2`}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="black" />
                            ) : (
                                <>
                                    <Text style={tw`text-black font-black text-xs uppercase tracking-widest`}>Launch Kitchen</Text>
                                    <ArrowRight size={16} color="black" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
};
