import React, { useEffect } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    useAnimatedStyle,
    withSpring,
    useSharedValue,
    FadeIn,
    FadeOut
} from 'react-native-reanimated';
import tw from 'twrnc';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CustomTabBar = ({ state, descriptors, navigation }) => {
    const insets = useSafeAreaInsets();

    // Each tab gets equal width of the screen
    const tabWidth = SCREEN_WIDTH / state.routes.length;

    // Animated value for the yellow indicator's position
    const translateX = useSharedValue(state.index * tabWidth);

    const [pendingCount, setPendingCount] = React.useState(0);
    const [paymentPendingCount, setPaymentPendingCount] = React.useState(0);
    const { user } = useAuth();
    const { tenant } = useTenant();

    useEffect(() => {
        if (!tenant?.id) return;

        // 1. Listen for ALL Pending Orders (Any date)
        const ordersRef = collection(db, 'kitchens', tenant.id, 'orders');
        const qOrders = query(
            ordersRef,
            where('status', 'in', ['PENDING', 'placed', 'pending', 'PLACED'])
        );

        const unsubOrders = onSnapshot(qOrders, (snapshot) => {
            setPendingCount(snapshot.size);
        }, (error) => {
            console.error("CustomTabBar: Error listening to orders:", error);
        });

        // 2. Listen for Pending Payments
        const paymentsRef = collection(db, 'kitchens', tenant.id, 'payments');
        const qPayments = query(
            paymentsRef,
            where('status', '==', 'pending')
        );

        const unsubPayments = onSnapshot(qPayments, (snapshot) => {
            setPaymentPendingCount(snapshot.size);
        }, (error) => {
            console.error("CustomTabBar: Error listening to payments:", error);
        });

        return () => {
            unsubOrders();
            unsubPayments();
        };
    }, [tenant?.id]);

    useEffect(() => {
        translateX.value = withSpring(state.index * tabWidth, {
            damping: 20,
            stiffness: 150,
        });
    }, [state.index, tabWidth]);

    const slidingIndicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const renderBadge = (count) => {
        if (count <= 0) return null;
        return (
            <View style={tw`absolute -top-1 -right-1 bg-red-600 min-w-[16px] h-4 rounded-full px-1 items-center justify-center border-2 border-white`}>
                <Text style={tw`text-[8px] font-black text-white`}>
                    {count > 9 ? '9+' : count}
                </Text>
            </View>
        );
    };

    return (
        <View style={[
            tw`absolute bottom-0 left-0 right-0 bg-white flex-row border-t border-gray-100 items-center`,
            { height: 65 + insets.bottom, paddingBottom: insets.bottom }
        ]}>
            {/* Smooth Sliding Background Indicator */}
            <Animated.View
                style={[
                    slidingIndicatorStyle,
                    tw`absolute top-2 items-center justify-center`,
                    { width: tabWidth, height: 42 }
                ]}
            >
                <View style={tw`w-12 h-10 bg-yellow-400 rounded-xl shadow-sm`} />
            </Animated.View>

            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const label =
                    options.tabBarLabel !== undefined
                        ? options.tabBarLabel
                        : options.title !== undefined
                            ? options.title
                            : route.name;

                const isFocused = state.index === index;

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name);
                    }
                };

                return (
                    <Pressable
                        key={index}
                        onPress={onPress}
                        style={tw`flex-1 items-center justify-center h-full pt-1`}
                    >
                        <View style={tw`w-10 h-10 items-center justify-center mb-0.5`}>
                            {options.tabBarIcon ? options.tabBarIcon({ focused: isFocused }) : (
                                <Text style={tw`${isFocused ? 'text-black font-black' : 'text-gray-400'}`}>•</Text>
                            )}

                            {/* Signal Badges */}
                            {route.name === 'Orders' && renderBadge(pendingCount)}
                            {route.name === 'Payments' && renderBadge(paymentPendingCount)}
                        </View>

                        <View style={tw`h-3 justify-center`}>
                            {isFocused && (
                                <Animated.Text
                                    entering={FadeIn.duration(200)}
                                    exiting={FadeOut.duration(200)}
                                    style={tw`text-[7px] font-black uppercase tracking-widest text-gray-900 text-center`}
                                >
                                    {label}
                                </Animated.Text>
                            )}
                        </View>
                    </Pressable>
                );
            })}
        </View>
    );
};
