import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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
        <TouchableOpacity
          className={`native flex-1 p-3 rounded-md items-center ${mode === "UPI" ? "bg-white shadow-sm" : ""}`}
          onPress={() => setMode("UPI")}
        >
          <Text
            className={`font-bold ${mode === "UPI" ? "text-blue-600" : "text-gray-400"}`}
          >
            UPI / Online
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 p-3 rounded-md items-center ${mode === "CASH" ? "bg-white shadow-sm" : ""}`}
          onPress={() => setMode("CASH")}
        >
          <Text
            className={`font-bold ${mode === "CASH" ? "text-green-600" : "text-gray-400"}`}
          >
            Cash
          </Text>
        </TouchableOpacity>
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
          <TouchableOpacity
            className="native bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6 items-center justify-center h-48"
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
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        className={`native w-full bg-yellow-400 rounded-xl p-4 items-center mb-10 ${loading ? "opacity-70" : ""}`}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="black" />
        ) : (
          <Text className="text-black font-bold text-lg">Submit Entry</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};
