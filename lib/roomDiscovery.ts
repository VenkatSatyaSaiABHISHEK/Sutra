/**
 * Room discovery utilities for filtering and sorting rooms
 */

import { Room } from './firestore';
import { Timestamp } from 'firebase/firestore';

/**
 * Filter recently created rooms (last 10 minutes)
 * @param rooms Array of rooms
 * @param minutesThreshold Minutes to consider as "recent" (default: 10)
 * @returns Filtered array of recent rooms
 */
export const getRecentRooms = (rooms: Room[], minutesThreshold: number = 10): Room[] => {
  const now = new Date();
  return rooms.filter((room) => {
    if (!room.createdAt) return false;
    const roomTime = room.createdAt instanceof Timestamp 
      ? room.createdAt.toDate() 
      : new Date(room.createdAt);
    const diffMinutes = (now.getTime() - roomTime.getTime()) / (1000 * 60);
    return diffMinutes <= minutesThreshold;
  });
};

/**
 * Sort rooms by creation time (newest first)
 * @param rooms Array of rooms
 * @returns Sorted array
 */
export const sortRoomsByNewest = (rooms: Room[]): Room[] => {
  return [...rooms].sort((a, b) => {
    const timeA = a.createdAt instanceof Timestamp 
      ? a.createdAt.toDate().getTime() 
      : new Date(a.createdAt).getTime();
    const timeB = b.createdAt instanceof Timestamp 
      ? b.createdAt.toDate().getTime() 
      : new Date(b.createdAt).getTime();
    return timeB - timeA;
  });
};

/**
 * Search rooms by name
 * @param rooms Array of rooms
 * @param query Search query
 * @returns Filtered array
 */
export const searchRoomsByName = (rooms: Room[], query: string): Room[] => {
  const lowerQuery = query.toLowerCase();
  return rooms.filter((room) =>
    room.name.toLowerCase().includes(lowerQuery)
  );
};

/**
 * Get top trending rooms (most popular)
 * @param rooms Array of rooms
 * @param limit Number of rooms to return
 * @returns Limited array of rooms
 */
export const getTrendingRooms = (rooms: Room[], limit: number = 5): Room[] => {
  return sortRoomsByNewest(rooms).slice(0, limit);
};

/**
 * Calculate room age in readable format
 * @param createdAt Timestamp
 * @returns Human-readable age (e.g., "2 minutes ago")
 */
export const getRoomAge = (createdAt: Timestamp | any): string => {
  const roomTime = createdAt instanceof Timestamp 
    ? createdAt.toDate() 
    : new Date(createdAt);
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - roomTime.getTime()) / 1000);

  if (diffSeconds < 60) return 'Just now';
  if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60);
    return `${minutes}m ago`;
  }
  if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours}h ago`;
  }

  const days = Math.floor(diffSeconds / 86400);
  return `${days}d ago`;
};
