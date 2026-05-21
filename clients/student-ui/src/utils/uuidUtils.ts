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
export const formatUUID = (uuid: string): string => {
  if (!uuid) return '';
  
  // If it's already formatted, return as is
  if (uuid.includes('-')) {
    return uuid;
  }
  
  // Format UUID with dashes
  return `${uuid.substring(0, 8)}-${uuid.substring(8, 12)}-${uuid.substring(12, 16)}-${uuid.substring(16, 20)}-${uuid.substring(20)}`;
};

/**
 * Create a display ID with prefix
 * @param id - The ID (can be number, string, or UUID)
 * @param prefix - The prefix to add (e.g., 'user', 'interview')
 * @returns Formatted display ID (e.g., "USER-12345678")
 */
export const createDisplayID = (id: string | number | null | undefined, prefix: string = 'ID'): string => {
  if (!id) return '';
  
  const shortId = getShortUUID(id);
  return `${prefix.toUpperCase()}-${shortId}`;
};

/**
 * Validate if a string is a valid UUID
 * @param uuid - The string to validate
 * @returns boolean indicating if it's a valid UUID
 */
export const isValidUUID = (uuid: string): boolean => {
  if (!uuid) return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Generate a random UUID (for testing purposes)
 * @returns A random UUID string
 */
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}; 