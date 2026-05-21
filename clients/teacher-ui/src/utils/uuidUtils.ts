/**
 * Utility functions for handling UUIDs and IDs in the frontend
 */

/**
 * Generate a short ID for display purposes
 * @param id - The ID (can be number, string, or UUID)
 * @returns Short ID string
 */
export const getShortUUID = (id: string | number | null | undefined): string => {
  if (!id) return '';
  
  const idString = String(id);
  
  // If it's a UUID, return first 8 characters
  if (idString.length >= 32) {
    return idString.substring(0, 8);
  }
  
  // If it's a shorter string or number, return as is
  return idString;
};

/**
 * Generate a display-friendly UUID format
 * @param uuid - The full UUID string
 * @returns Formatted UUID string (e.g., "12345678-1234-1234-1234-123456789abc")
 */
export const formatUUID = (uuid: string | number | null | undefined): string => {
  if (!uuid) return '';
  
  const uuidString = String(uuid);
  
  // If it's already formatted, return as is
  if (uuidString.includes('-')) return uuidString;
  
  // If it's not a UUID (too short), return as is
  if (uuidString.length < 32) return uuidString;
  
  // Format as UUID: 8-4-4-4-12
  return `${uuidString.substring(0, 8)}-${uuidString.substring(8, 12)}-${uuidString.substring(12, 16)}-${uuidString.substring(16, 20)}-${uuidString.substring(20, 32)}`;
};

/**
 * Validate if a string is a valid UUID
 * @param uuid - The UUID string to validate
 * @returns Boolean indicating if UUID is valid
 */
export const isValidUUID = (uuid: string | number | null | undefined): boolean => {
  if (!uuid) return false;
  
  const uuidString = String(uuid);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuidString);
};

/**
 * Generate a new UUID (for client-side use only)
 * @returns New UUID string
 */
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Create a user-friendly ID display
 * @param id - The ID (can be number, string, or UUID)
 * @param type - The type of ID (e.g., 'user', 'interview', 'resume')
 * @returns Formatted display string
 */
export const createDisplayID = (id: string | number | null | undefined, type: string = 'item'): string => {
  if (!id) return '';
  
  const shortID = getShortUUID(id);
  const typeUpper = type.toUpperCase();
  
  return `${typeUpper}-${shortID}`;
};

/**
 * Extract ID from a display ID
 * @param displayID - The display ID string (e.g., "USER-12345678")
 * @returns The short ID part
 */
export const extractIDFromDisplay = (displayID: string): string => {
  if (!displayID) return '';
  
  const parts = displayID.split('-');
  if (parts.length >= 2) {
    return parts.slice(1).join('-');
  }
  
  return displayID;
}; 