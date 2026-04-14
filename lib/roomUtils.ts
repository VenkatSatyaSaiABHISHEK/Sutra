/**
 * Generate a random 4-digit room ID
 * @returns 4-digit string room ID
 */
export const generateRoomId = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Format room ID for display (e.g., "1234" -> "1-2-3-4")
 * @param roomId Room ID string
 * @returns Formatted room ID
 */
export const formatRoomId = (roomId: string): string => {
  return roomId.split('').join('-');
};
