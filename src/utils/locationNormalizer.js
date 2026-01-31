/**
 * Location Normalization Utility
 * 
 * Ensures consistent location data storage and comparison across the app.
 * Handles inconsistencies like "Maharashtra" vs "maharashtra" vs "Thane ".
 */

/**
 * Normalizes a location string for consistent storage and comparison
 * @param {string} location - The location string to normalize (state, city, etc.)
 * @returns {string} - Normalized location string (lowercase, trimmed, no special chars)
 */
export const normalizeLocation = (location) => {
    if (!location || typeof location !== 'string') return '';

    return location
        .trim()                           // Remove leading/trailing spaces
        .toLowerCase()                    // Convert to lowercase
        .normalize('NFD')                 // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^\w\s]/g, '')         // Remove special characters except spaces
        .replace(/\s+/g, ' ')            // Collapse multiple spaces to single space
        .trim();                          // Final trim
};

/**
 * Creates a location object with both normalized and display values
 * @param {string} location - The original location string
 * @returns {object} - Object with normalized and display values
 */
export const createLocationData = (location) => {
    return {
        normalized: normalizeLocation(location),
        display: location ? location.trim() : ''
    };
};

/**
 * Normalizes an entire address object
 * @param {object} address - Address object with city, state, etc.
 * @returns {object} - Address object with normalized and display values
 */
export const normalizeAddress = (address) => {
    if (!address) return {};

    const normalized = {};

    // Normalize state
    if (address.state) {
        normalized.state = normalizeLocation(address.state);
        normalized.stateDisplay = address.state.trim();
    }

    // Normalize city
    if (address.city) {
        normalized.city = normalizeLocation(address.city);
        normalized.cityDisplay = address.city.trim();
    }

    // Keep other fields as-is
    if (address.building) normalized.building = address.building;
    if (address.locality) normalized.locality = address.locality;
    if (address.line1) normalized.line1 = address.line1;
    if (address.pinCode) normalized.pinCode = address.pinCode;

    return normalized;
};
