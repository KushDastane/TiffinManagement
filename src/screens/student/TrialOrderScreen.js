import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { subscribeToMenu } from '../../services/menuService';
import { placeOrder } from '../../services/orderService';
import { uploadImage } from '../../services/paymentService';
import { useAuth } from '../../contexts/AuthContext';
import tw from 'twrnc';

// Simplified SlotCard for Trial (Decoupled from Ledger/Wallet)
const TrialSlotCard = ({ slotName, slotData, onOrder }) => {
    const [variant, setVariant] = useState("full");
    const isActive = slotData.status === "SET";

    if (!isActive) return null;

    const { type, rotiSabzi, other } = slotData;

    const calculateTotal = () => {
        if (type === "ROTI_SABZI") {
            return variant === "half" ? Number(rotiSabzi.halfPrice) : Number(rotiSabzi.fullPrice);
        }
        return Number(other.price);
    };

    return (
        <View style={tw`bg-white p-4 rounded-xl mb-6 border border-gray-100 shadow-sm`}>
            <Text style={tw`text-xl font-bold text-gray-800 mb-4`}>{slotName}</Text>

            {type === "ROTI_SABZI" ? (
                <View>
                    <Text style={tw`text-lg font-bold text-yellow-700 mb-2`}>{rotiSabzi.sabzi}</Text>
                    <View style={tw`flex-row mb-4 bg-gray-50 p-1 rounded-lg`}>
                        <TouchableOpacity
                            style={[
                                tw`flex-1 p-3 items-center rounded-lg`,
                                variant === 'half' ? tw`bg-white shadow-sm border border-gray-200` : null
                            ]}
                            onPress={() => setVariant('half')}
                        >
                            <Text style={tw`font-bold`}>Half - ₹{rotiSabzi.halfPrice}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                tw`flex-1 p-3 items-center rounded-lg`,
                                variant === 'full' ? tw`bg-white shadow-sm border border-gray-200` : null
                            ]}
                            onPress={() => setVariant('full')}
                        >
                            <Text style={tw`font-bold`}>Full - ₹{rotiSabzi.fullPrice}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View style={tw`flex-row justify-between mb-4`}>
                    <Text style={tw`text-lg font-bold text-gray-800`}>{other.itemName}</Text>
                    <Text style={tw`text-lg font-bold text-yellow-600`}>₹{other.price}</Text>
                </View>
            )}

            <TouchableOpacity
                style={tw`bg-yellow-400 p-4 rounded-xl items-center`}
                onPress={() => onOrder({
                    slot: slotName.toLowerCase(),
                    type,
                    variant: type === 'ROTI_SABZI' ? variant : null,
                    mainItem: type === 'ROTI_SABZI' ? rotiSabzi.sabzi : other.itemName,
                    totalAmount: calculateTotal(),
                })}
            >
                <Text style={tw`font-bold text-black text-lg`}>Order {slotName} - ₹{calculateTotal()}</Text>
            </TouchableOpacity>
        </View>
    );
};

export const TrialOrderScreen = ({ route, navigation }) => {
    const { kitchen } = route.params;
    const { user, userProfile } = useAuth();
    const [menu, setMenu] = useState(null);
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' or 'upi'
    const [screenshotUri, setScreenshotUri] = useState(null);

    useEffect(() => {
        const unsub = subscribeToMenu(kitchen.id, new Date(), (data) => setMenu(data));
        return () => unsub();
    }, [kitchen.id]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled) {
            setScreenshotUri(result.assets[0].uri);
        }
    };

    const handleOrder = async (orderPayload) => {
        if (paymentMethod === 'upi' && !screenshotUri) {
            Alert.alert("Required", "Please upload payment screenshot for UPI.");
            return;
        }

        Alert.alert(
            "Confirm Trial Order",
            `Place trial order for ${orderPayload.slot}?\nPayment: ${paymentMethod.toUpperCase()}`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: async () => {
                        setLoading(true);

                        let proofUrl = null;
                        if (screenshotUri) {
                            proofUrl = await uploadImage(screenshotUri);
                        }

                        const result = await placeOrder(kitchen.id, {
                            ...orderPayload,
                            userId: user.uid,
                            userDisplayName: userProfile?.phoneNumber || user.email,
                            isTrial: true,
                            paymentMethod: paymentMethod,
                            paymentStatus: 'pending',
                            paymentProofUrl: proofUrl
                        });
                        setLoading(false);

                        if (result.success) {
                            Alert.alert("Success", "Trial order placed! Please pay on pickup/delivery.", [
                                { text: "OK", onPress: () => navigation.popToTop() }
                            ]);
                        } else {
                            Alert.alert("Error", result.error);
                        }
                    }
                }
            ]
        );
    };

    return (
        <ScrollView style={tw`flex-1 bg-gray-50 p-4`}>
            <View style={tw`mb-6 pt-8`}>
                <Text style={tw`text-gray-500 font-medium`}>Ordering Trial from</Text>
                <Text style={tw`text-3xl font-extrabold text-gray-800`}>{kitchen.name}</Text>
                <Text style={tw`text-gray-500`}>{kitchen.area || kitchen.locality}</Text>
            </View>

            <View style={tw`bg-white p-4 rounded-xl mb-6 shadow-sm border border-gray-100`}>
                <Text style={tw`font-bold text-gray-800 mb-2`}>Payment Method</Text>
                <View style={tw`flex-row gap-2`}>
                    <TouchableOpacity
                        style={[
                            tw`flex-1 p-3 rounded-lg border`,
                            paymentMethod === 'cash' ? tw`bg-yellow-50 border-yellow-400` : tw`bg-gray-50 border-gray-200`
                        ]}
                        onPress={() => setPaymentMethod('cash')}
                    >
                        <Text style={[tw`text-center font-bold`, paymentMethod === 'cash' ? tw`text-yellow-800` : tw`text-gray-500`]}>Cash on Pickup</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            tw`flex-1 p-3 rounded-lg border`,
                            paymentMethod === 'upi' ? tw`bg-yellow-50 border-yellow-400` : tw`bg-gray-50 border-gray-200`
                        ]}
                        onPress={() => setPaymentMethod('upi')}
                    >
                        <Text style={[tw`text-center font-bold`, paymentMethod === 'upi' ? tw`text-yellow-800` : tw`text-gray-500`]}>Pay Online (UPI)</Text>
                    </TouchableOpacity>
                </View>
                {paymentMethod === 'upi' && (
                    <View style={tw`mt-4 p-4 bg-gray-50 rounded-lg items-center`}>
                        <Text style={tw`text-gray-600 mb-2 text-center`}>Scan QR at counter or upload screenshot after paying.</Text>

                        <TouchableOpacity
                            style={tw`bg-gray-200 p-3 rounded-lg w-full items-center mb-2`}
                            onPress={pickImage}
                        >
                            <Text style={tw`text-sm font-bold text-gray-700`}>
                                {screenshotUri ? "Change Screenshot" : "Upload Payment Proof"}
                            </Text>
                        </TouchableOpacity>

                        {screenshotUri && (
                            <Image
                                source={{ uri: screenshotUri }}
                                style={{ width: '100%', height: 200, borderRadius: 8 }}
                                resizeMode="contain"
                            />
                        )}
                    </View>
                )}
            </View>

            <Text style={tw`text-lg font-bold text-gray-800 mb-4 border-l-4 border-yellow-400 pl-3`}>Today's Menu</Text>

            {loading ? (
                <View style={tw`py-10 items-center`}>
                    <ActivityIndicator size="large" color="#EAB308" />
                </View>
            ) : !menu ? (
                <View style={tw`py-10 items-center`}>
                    <ActivityIndicator size="large" color="#EAB308" />
                </View>
            ) : (!menu.lunch && !menu.dinner) ? (
                <View style={tw`bg-white p-10 rounded-xl items-center`}>
                    <Text style={tw`text-gray-400`}>No menu available for today.</Text>
                </View>
            ) : (
                <>
                    {menu.lunch && <TrialSlotCard slotName="Lunch" slotData={menu.lunch} onOrder={handleOrder} />}
                    {menu.dinner && <TrialSlotCard slotName="Dinner" slotData={menu.dinner} onOrder={handleOrder} />}
                </>
            )}

            <View style={tw`h-10`} />
        </ScrollView>
    );
};
