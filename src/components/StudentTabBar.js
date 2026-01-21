import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    Home,
    UtensilsCrossed, // For 'Order' - generic bowl/food icon
    History,
    CreditCard, // For 'Khata'
    User
} from 'lucide-react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
    withTiming,
    useSharedValue,
    FadeIn,
    FadeOut
} from 'react-native-reanimated';
import tw from 'twrnc';

const TabIcon = ({ icon: Icon, active, label, onPress }) => {
    // Simple spring animation for active state could be added here
    // keeping it simple first matching the structure

    return (
        <Pressable
            onPress={onPress}
            style={tw`flex-1 items-center justify-center py-2`}
        >
            <View style={tw`items-center`}>
                <Icon
                    size={24}
                    color={active ? '#1f2937' : '#9ca3af'} // gray-800 vs gray-400
                    strokeWidth={active ? 2.5 : 2}
                />

                {active && (
                    <Animated.Text
                        entering={FadeIn.duration(200)}
                        exiting={FadeOut.duration(200)}
                        style={tw`text-[10px] font-bold text-gray-800 mt-1`}
                    >
                        {label}
                    </Animated.Text>
                )}

                {active && (
                    <Animated.View
                        layout={withSpring}
                        style={tw`absolute -bottom-2 w-1 h-1 rounded-full bg-yellow-400`}
                    />
                )}
            </View>
        </Pressable>
    );
};

export const StudentTabBar = ({ state, descriptors, navigation }) => {
    const insets = useSafeAreaInsets();

    const icons = {
        Home: Home,
        Order: UtensilsCrossed,
        History: History,
        Khata: CreditCard,
        Profile: User
    };

    return (
        <View style={[
            tw`absolute left-4 right-4`,
            { bottom: insets.bottom + 10 } // Floating effect
        ]}>
            <View style={[
                tw`flex-row bg-white/95 rounded-2xl shadow-lg border border-gray-100 p-1`,
                { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 }
            ]}>
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

                    const IconComponent = icons[route.name] || Home;

                    return (
                        <TabIcon
                            key={route.key}
                            icon={IconComponent}
                            label={label}
                            active={isFocused}
                            onPress={onPress}
                        />
                    );
                })}
            </View>
        </View>
    );
};
