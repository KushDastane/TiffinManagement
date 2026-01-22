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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CustomTabBar = ({ state, descriptors, navigation }) => {
    const insets = useSafeAreaInsets();

    // Each tab gets equal width of the screen
    const tabWidth = SCREEN_WIDTH / state.routes.length;

    // Animated value for the yellow indicator's position
    const translateX = useSharedValue(state.index * tabWidth);

    useEffect(() => {
        translateX.value = withSpring(state.index * tabWidth, {
            damping: 20,
            stiffness: 150,
        });
    }, [state.index, tabWidth]);

    const slidingIndicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

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
