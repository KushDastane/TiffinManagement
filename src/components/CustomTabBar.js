import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';

import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

export const CustomTabBar = ({ state, descriptors, navigation }) => {
    const { primaryColor } = useTheme();

    return (
        <View className="absolute bottom-6 left-4 right-4 bg-white/90 rounded-2xl flex-row h-16 shadow-lg items-center px-2"
            style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
                elevation: 5
            }}
        >
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
                    <TouchableOpacity
                        key={index}
                        onPress={onPress}
                        className={`flex-1 items-center justify-center h-full ${isFocused ? '' : ''}`}
                    >
                        {/* 
                           Icon Logic would go here. For now using Text/Unicode as placeholder if no icons available.
                           Ideally, we pass icons via options.
                        */}
                        <Text
                            style={{ color: isFocused ? primaryColor : '#9ca3af' }}
                            className="text-2xl"
                        >
                            {options.tabBarIcon ? options.tabBarIcon({ focused: isFocused }) : '•'}
                        </Text>

                        {isFocused && (
                            <Text
                                style={{ color: primaryColor }}
                                className="text-[10px] font-bold mt-1 capitalize"
                            >
                                {label}
                            </Text>
                        )}

                        {/* Active Indicator Dot */}
                        {isFocused && (
                            <View
                                style={{ backgroundColor: primaryColor }}
                                className="absolute -bottom-1 w-1.5 h-1.5 rounded-full"
                            />
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};
