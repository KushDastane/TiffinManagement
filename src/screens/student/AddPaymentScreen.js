import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../contexts/AuthContext";
import { useTenant } from "../../contexts/TenantContext";
import { requestPayment } from "../../services/paymentService";

export const AddPaymentScreen = ({ navigation }) => {
  const { user, userProfile } = useAuth();
  const { tenant } = useTenant();

  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("UPI"); // 'UPI' | 'CASH'
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount.");
      return;
    }

    if (mode === "UPI" && !image) {
      Alert.alert(
        "Screenshot Required",
        "Please upload the payment screenshot for UPI.",
      );
      return;
    }

    setLoading(true);
    const result = await requestPayment(tenant.id, {
      userId: user.uid,
      userDisplayName: userProfile?.phoneNumber || user.email,
      amount,
      method: mode,
      screenshotUri: image,
      note: "Student Entry",
    });
    setLoading(false);

    if (result.error) {
      Alert.alert("Error", "Failed to submit payment.");
    } else {
      Alert.alert("Success", "Payment Request Sent!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white p-6">
      <Text className="text-2xl font-bold text-gray-800 mb-6">
        Add Payment Entry
      </Text>

      {/* Mode Selection */}
      <Text className="text-gray-500 font-bold mb-2 uppercase text-xs tracking-wider">
        Payment Mode
      </Text>
      <View className="flex-row mb-6 bg-gray-100 p-1 rounded-lg">
        <Pressable
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 6,
            alignItems: 'center',
            backgroundColor: mode === "UPI" ? "white" : undefined,
            shadowColor: mode === "UPI" ? "#000" : undefined,
            shadowOffset: mode === "UPI" ? { width: 0, height: 1 } : undefined,
            shadowOpacity: mode === "UPI" ? 0.05 : undefined,
            shadowRadius: mode === "UPI" ? 2 : undefined,
          }}
          onPress={() => setMode("UPI")}
        >
          <Text
            className={`font-bold ${mode === "UPI" ? "text-blue-600" : "text-gray-400"}`}
          >
            UPI / Online
          </Text>
        </Pressable>
        <Pressable
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 6,
            alignItems: 'center',
            backgroundColor: mode === "CASH" ? "white" : undefined,
            shadowColor: mode === "CASH" ? "#000" : undefined,
            shadowOffset: mode === "CASH" ? { width: 0, height: 1 } : undefined,
            shadowOpacity: mode === "CASH" ? 0.05 : undefined,
            shadowRadius: mode === "CASH" ? 2 : undefined,
          }}
          onPress={() => setMode("CASH")}
        >
          <Text
            className={`font-bold ${mode === "CASH" ? "text-green-600" : "text-gray-400"}`}
          >
            Cash
          </Text>
        </Pressable>
      </View>

      {/* Amount */}
      <Text className="text-gray-500 font-bold mb-2 uppercase text-xs tracking-wider">
        Amount (₹)
      </Text>
      <TextInput
        className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-2xl font-bold text-gray-800 mb-6"
        placeholder="0"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      {/* Image (Only for UPI) */}
      {mode === "UPI" && (
        <View className="mb-6">
          <Text className="text-gray-500 font-bold mb-2 uppercase text-xs tracking-wider">
            Payment Screenshot
          </Text>
          <Pressable
            style={{
              backgroundColor: '#f9fafb', // bg-gray-50
              borderWidth: 2,
              borderColor: '#d1d5db', // border-gray-300
              borderStyle: 'dashed',
              borderRadius: 12, // rounded-xl
              padding: 24, // p-6
              alignItems: 'center',
              justifyContent: 'center',
              height: 192, // h-48
            }}
            onPress={pickImage}
          >
            {image ? (
              <Image
                source={{ uri: image }}
                className="w-full h-full rounded-lg"
                resizeMode="contain"
              />
            ) : (
              <View className="items-center">
                <Text className="text-4xl text-gray-300 mb-2">+</Text>
                <Text className="text-gray-400 font-medium">
                  Tap to Upload Slip
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      )}

      <Pressable
        style={{
          width: '100%',
          backgroundColor: '#facc15', // yellow-400
          borderRadius: 12, // rounded-xl
          padding: 16, // p-4
          alignItems: 'center',
          marginBottom: 40, // mb-10
          opacity: loading ? 0.7 : 1,
        }}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="black" />
        ) : (
          <Text className="text-black font-bold text-lg">Submit Entry</Text>
        )}
      </Pressable>
    </ScrollView>
  );
};
