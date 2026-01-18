import React, { createContext, useContext, useMemo } from 'react';
import { useTenant } from './TenantContext';

const ThemeContext = createContext({});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const { tenant } = useTenant();

    const theme = useMemo(() => {
        // Default brand color: Yellow
        const primaryColor = tenant?.theme?.primaryColor || '#FACC15';

        return {
            primaryColor,
            // You can add more derived colors here (e.g., light version, dark version)
            primaryLight: `${primaryColor}20`, // 12% opacity
            primaryDark: primaryColor, // For now keeping same, could be adjusted
        };
    }, [tenant?.theme?.primaryColor]);

    return (
        <ThemeContext.Provider value={theme}>
            {children}
        </ThemeContext.Provider>
    );
};
